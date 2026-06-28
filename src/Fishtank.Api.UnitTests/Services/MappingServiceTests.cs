using System;
using System.Threading.Tasks;
using FluentAssertions;
using Fishtank.Api.Exceptions;
using Fishtank.Api.Services;
using Microsoft.Extensions.Configuration;
using NSubstitute;
using Xunit;

namespace Fishtank.Api.UnitTests.Services;

/// <summary>
/// Unit tests for MappingService — focuses on path sanitization edge cases.
/// Covers AC-13 (path traversal protection) and security requirement R-E4-005.
/// </summary>
public class MappingServiceTests
{
    private readonly ISystemEventService _systemEvents;
    private readonly IConfiguration _configuration;
    private readonly string _testMocksRoot;

    public MappingServiceTests()
    {
        _systemEvents = Substitute.For<ISystemEventService>();
        _testMocksRoot = Path.Combine(Path.GetTempPath(), "fishtank-unit-tests", Guid.NewGuid().ToString());
        Directory.CreateDirectory(_testMocksRoot);

        var configDict = new Dictionary<string, string?>
        {
            ["FISHTANK_MOCKS_ROOT"] = _testMocksRoot
        };
        _configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(configDict)
            .Build();
    }

    private MappingService CreateService() =>
        new(_configuration, _systemEvents);

    // ─────────────────────────────────────────────────────────────────────────
    // Path Sanitization Tests — AC-13: Path traversal protection
    // ─────────────────────────────────────────────────────────────────────────

    [Theory(DisplayName = "SanitizePath rejects direct ../ sequences")]
    [InlineData("../etc/passwd")]
    [InlineData("service/../../../etc/passwd")]
    [InlineData("service/mappings/../../secrets.txt")]
    [InlineData("service/mappings/../../../outside.json")]
    public async Task CreateFileAsync_DirectPathTraversal_ThrowsValidationException(string maliciousPath)
    {
        // Arrange
        var service = CreateService();

        // Act
        Func<Task> act = async () => await service.CreateFileAsync(maliciousPath, "content");

        // Assert
        await act.Should().ThrowAsync<ValidationException>()
            .WithMessage("*path traversal*")
            .Where(e => e.ErrorCode == "MAPPING_PATH_INVALID",
                "direct path traversal sequences must be blocked");
    }

    [Theory(DisplayName = "SanitizePath rejects encoded ../ sequences")]
    [InlineData("service%2F..%2F..%2Fetc%2Fpasswd")] // URL-encoded
    [InlineData("service/..%2Fsecrets.txt")] // Partially encoded
    public async Task CreateFileAsync_EncodedPathTraversal_ThrowsValidationException(string maliciousPath)
    {
        // Arrange
        var service = CreateService();
        // Note: URL decoding should happen before path sanitization in production
        // This test verifies raw encoded strings are also blocked

        // Act
        Func<Task> act = async () => await service.CreateFileAsync(maliciousPath, "content");

        // Assert
        // Encoded sequences might pass through if not decoded first,
        // but the final resolved path check should catch them
        await act.Should().ThrowAsync<ValidationException>()
            .Where(e => e.ErrorCode == "MAPPING_PATH_INVALID",
                "encoded path traversal sequences must be blocked");
    }

    [Theory(DisplayName = "SanitizePath rejects repeated ../ sequences")]
    [InlineData("service/mappings/../../../../etc/passwd")]
    [InlineData("../../../../../../../etc/passwd")]
    [InlineData("service/../../service/../../outside.json")]
    public async Task CreateFileAsync_RepeatedPathTraversal_ThrowsValidationException(string maliciousPath)
    {
        // Arrange
        var service = CreateService();

        // Act
        Func<Task> act = async () => await service.CreateFileAsync(maliciousPath, "content");

        // Assert
        await act.Should().ThrowAsync<ValidationException>()
            .WithMessage("*path traversal*")
            .Where(e => e.ErrorCode == "MAPPING_PATH_INVALID",
                "repeated path traversal sequences must be blocked");
    }

    [Theory(DisplayName = "SanitizePath rejects absolute paths")]
    [InlineData("/etc/passwd")]
    [InlineData("/var/log/secrets.txt")]
    [InlineData("C:\\Windows\\System32\\config")]
    [InlineData("\\\\network\\share\\file.txt")]
    public async Task CreateFileAsync_AbsolutePath_ThrowsValidationException(string absolutePath)
    {
        // Arrange
        var service = CreateService();

        // Act
        Func<Task> act = async () => await service.CreateFileAsync(absolutePath, "content");

        // Assert
        await act.Should().ThrowAsync<ValidationException>()
            .WithMessage("*absolute path*")
            .Where(e => e.ErrorCode == "MAPPING_PATH_INVALID",
                "absolute paths must be blocked");
    }

    [Theory(DisplayName = "SanitizePath rejects paths resolving outside Mocks Root")]
    [InlineData("service/../outside-sibling.json")]
    [InlineData("service/../../outside-parent.json")]
    public async Task CreateFileAsync_PathResolvingOutsideRoot_ThrowsValidationException(string relativePath)
    {
        // Arrange
        var service = CreateService();

        // Act
        Func<Task> act = async () => await service.CreateFileAsync(relativePath, "content");

        // Assert — use .Which instead of chained .Where() to avoid FluentAssertions v8
        // converting the second Message.Contains predicate to a WithMessage wildcard call
        var thrown = await act.Should().ThrowAsync<ValidationException>();
        thrown.Which.ErrorCode.Should().Be("MAPPING_PATH_INVALID",
            "paths resolving outside Mocks Root must be blocked");
        (thrown.Which.Message.Contains("outside", StringComparison.OrdinalIgnoreCase) ||
         thrown.Which.Message.Contains("traversal", StringComparison.OrdinalIgnoreCase))
            .Should().BeTrue("error message must indicate path traversal or outside-root violation");
    }

    [Theory(DisplayName = "SanitizePath allows valid relative paths")]
    [InlineData("service-slug/mappings/test.json")]
    [InlineData("service-slug/responses/response-200.json")]
    [InlineData("another-service/mappings/nested/deep/file.json")]
    [InlineData("simple.json")]
    public async Task CreateFileAsync_ValidRelativePath_Succeeds(string validPath)
    {
        // Arrange
        var service = CreateService();
        var content = "{\"test\":\"valid\"}";

        // Act
        var result = await service.CreateFileAsync(validPath, content);

        // Assert
        result.Should().NotBeNull();
        result.Path.Should().Be(validPath);
        result.Name.Should().Be(Path.GetFileName(validPath));
        result.LastModified.Should().BeCloseTo(DateTimeOffset.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact(DisplayName = "SanitizePath handles backslash vs forward slash normalization")]
    public async Task CreateFileAsync_BackslashPath_NormalizedAndCreated()
    {
        // Arrange
        var service = CreateService();
        var windowsStylePath = "service-slug\\mappings\\test.json";

        // Act
        var result = await service.CreateFileAsync(windowsStylePath, "{\"test\":\"valid\"}");

        // Assert
        result.Should().NotBeNull();
        result.Path.Should().Be(windowsStylePath);
        File.Exists(Path.Combine(_testMocksRoot, "service-slug", "mappings", "test.json"))
            .Should().BeTrue("backslash separators should be normalized to forward slashes internally");
    }

    [Fact(DisplayName = "CreateFileAsync with existing file throws MAPPING_FILE_EXISTS")]
    public async Task CreateFileAsync_FileExists_ThrowsValidationException()
    {
        // Arrange
        var service = CreateService();
        var path = "service/test.json";
        await service.CreateFileAsync(path, "first");

        // Act
        Func<Task> act = async () => await service.CreateFileAsync(path, "second");

        // Assert
        await act.Should().ThrowAsync<ValidationException>()
            .Where(e => e.ErrorCode == "MAPPING_FILE_EXISTS",
                "creating an existing file must throw MAPPING_FILE_EXISTS");
    }

    [Fact(DisplayName = "UpdateFileAsync with non-existent file throws MAPPING_FILE_NOT_FOUND")]
    public async Task UpdateFileAsync_FileNotFound_ThrowsNotFoundException()
    {
        // Arrange
        var service = CreateService();
        var path = "service/nonexistent.json";

        // Act
        Func<Task> act = async () => await service.UpdateFileAsync(path, "content");

        // Assert
        await act.Should().ThrowAsync<NotFoundException>()
            .Where(e => e.ErrorCode == "MAPPING_FILE_NOT_FOUND",
                "updating a non-existent file must throw MAPPING_FILE_NOT_FOUND");
    }

    [Fact(DisplayName = "DeleteFileAsync with non-existent file throws MAPPING_FILE_NOT_FOUND")]
    public async Task DeleteFileAsync_FileNotFound_ThrowsNotFoundException()
    {
        // Arrange
        var service = CreateService();
        var path = "service/nonexistent.json";

        // Act
        Func<Task> act = async () => await service.DeleteFileAsync(path);

        // Assert
        await act.Should().ThrowAsync<NotFoundException>()
            .Where(e => e.ErrorCode == "MAPPING_FILE_NOT_FOUND",
                "deleting a non-existent file must throw MAPPING_FILE_NOT_FOUND");
    }
}
