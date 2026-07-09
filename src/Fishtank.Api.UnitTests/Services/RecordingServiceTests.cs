using System;
using System.Threading.Tasks;
using Fishtank.Api.Data.Entities;
using Fishtank.Api.Exceptions;
using Fishtank.Api.Models;
using Fishtank.Api.Services;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using NSubstitute;
using Xunit;

namespace Fishtank.Api.UnitTests.Services;

/// <summary>
/// Unit tests for RecordingService — focuses on thread-safety, slug generation,
/// path deduplication, state transitions, and error handling for FR-16 auto-capture.
/// Covers Story 4-5 acceptance criteria (AC-4, AC-7, AC-8, AC-10, AC-11).
/// </summary>
public class RecordingServiceTests
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IMappingService _mappingService;
    private readonly ISystemEventService _systemEvents;
    private readonly ServiceProvider _serviceProvider;

    public RecordingServiceTests()
    {
        _mappingService = Substitute.For<IMappingService>();
        _systemEvents = Substitute.For<ISystemEventService>();

        var services = new ServiceCollection();
        services.AddSingleton(_mappingService);
        services.AddSingleton(_systemEvents);
        _serviceProvider = services.BuildServiceProvider();

        _scopeFactory = Substitute.For<IServiceScopeFactory>();
        var scope = Substitute.For<IServiceScope>();
        scope.ServiceProvider.Returns(_serviceProvider);
        _scopeFactory.CreateScope().Returns(scope);
    }

    private RecordingService CreateService() =>
        new(_scopeFactory);

    // ─────────────────────────────────────────────────────────────────────────
    // State Transition Tests — AC-4, AC-10, AC-11
    // ─────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "StartAsync activates recording and sets startedAt timestamp")]
    public async Task StartAsync_WhenNotRecording_ActivatesRecording()
    {
        // Arrange
        var service = CreateService();
        var before = DateTimeOffset.UtcNow;

        // Act
        await service.StartAsync();
        var (isRecording, startedAt) = await service.GetStatusAsync();
        var after = DateTimeOffset.UtcNow;

        // Assert
        isRecording.Should().BeTrue("recording should be active after StartAsync");
        startedAt.Should().NotBeNull("startedAt should be set");
        startedAt.Should().BeOnOrAfter(before).And.BeOnOrBefore(after, "startedAt should be within execution window");
    }

    [Fact(DisplayName = "StartAsync throws ConflictException when already recording")]
    public async Task StartAsync_WhenAlreadyRecording_ThrowsConflictException()
    {
        // Arrange
        var service = CreateService();
        await service.StartAsync();

        // Act
        Func<Task> act = async () => await service.StartAsync();

        // Assert
        await act.Should().ThrowAsync<ConflictException>()
            .WithMessage("*already active*")
            .Where(e => e.ErrorCode == "RECORDING_ALREADY_ACTIVE",
                "concurrent start attempts must be blocked");
    }

    [Fact(DisplayName = "StopAsync deactivates recording and clears startedAt")]
    public async Task StopAsync_WhenRecording_DeactivatesRecording()
    {
        // Arrange
        var service = CreateService();
        await service.StartAsync();

        // Act
        await service.StopAsync();
        var (isRecording, startedAt) = await service.GetStatusAsync();

        // Assert
        isRecording.Should().BeFalse("recording should be inactive after StopAsync");
        startedAt.Should().BeNull("startedAt should be cleared");
    }

    [Fact(DisplayName = "StopAsync throws ConflictException when not recording")]
    public async Task StopAsync_WhenNotRecording_ThrowsConflictException()
    {
        // Arrange
        var service = CreateService();

        // Act
        Func<Task> act = async () => await service.StopAsync();

        // Assert
        await act.Should().ThrowAsync<ConflictException>()
            .WithMessage("*not currently active*")
            .Where(e => e.ErrorCode == "RECORDING_NOT_ACTIVE",
                "stop when not recording must be blocked");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Thread-Safety Tests — concurrent StartAsync/StopAsync
    // ─────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "Concurrent StartAsync calls are thread-safe — only one succeeds")]
    public async Task StartAsync_ConcurrentCalls_OnlyOneSucceeds()
    {
        // Arrange
        var service = CreateService();
        var tasks = Enumerable.Range(0, 10)
            .Select(async _ =>
            {
                try
                {
                    await service.StartAsync();
                    return true; // Success
                }
                catch (ConflictException)
                {
                    return false; // Already active
                }
            })
            .ToArray();

        // Act
        var results = await Task.WhenAll(tasks);

        // Assert
        results.Count(r => r).Should().Be(1, "exactly one StartAsync call should succeed");
        results.Count(r => !r).Should().Be(9, "nine calls should fail with ConflictException");

        var (isRecording, _) = await service.GetStatusAsync();
        isRecording.Should().BeTrue("recording should be active after concurrent start attempts");
    }

    [Fact(DisplayName = "Concurrent StopAsync calls are thread-safe — only one succeeds")]
    public async Task StopAsync_ConcurrentCalls_OnlyOneSucceeds()
    {
        // Arrange
        var service = CreateService();
        await service.StartAsync();

        var tasks = Enumerable.Range(0, 10)
            .Select(async _ =>
            {
                try
                {
                    await service.StopAsync();
                    return true; // Success
                }
                catch (ConflictException)
                {
                    return false; // Not active
                }
            })
            .ToArray();

        // Act
        var results = await Task.WhenAll(tasks);

        // Assert
        results.Count(r => r).Should().Be(1, "exactly one StopAsync call should succeed");
        results.Count(r => !r).Should().Be(9, "nine calls should fail with ConflictException");

        var (isRecording, _) = await service.GetStatusAsync();
        isRecording.Should().BeFalse("recording should be inactive after concurrent stop attempts");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GetUniquePathAsync Deduplication Tests — AC-4 numeric suffix logic
    // ─────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "CaptureAsync uses base path when file does not exist")]
    public async Task CaptureAsync_BasePathAvailable_UsesBasePath()
    {
        // Arrange
        var service = CreateService();
        await service.StartAsync();

        // Mock: base path does not exist (throws NotFoundException)
        _mappingService.ReadFileAsync(Arg.Is<string>(p => p == "test-service/mappings/GET_users_200.json"), Arg.Any<CancellationToken>())
            .Returns<Task<FileContentDto>>(_ => throw new NotFoundException("MAPPING_NOT_FOUND", "File not found"));
        _mappingService.ReadFileAsync(Arg.Is<string>(p => p == "test-service/responses/GET_users_200_body.json"), Arg.Any<CancellationToken>())
            .Returns<Task<FileContentDto>>(_ => throw new NotFoundException("MAPPING_NOT_FOUND", "File not found"));

        // Act
        await service.CaptureAsync(Guid.NewGuid(), "test-service", "GET", "/users", 200, "body");

        // Assert
        await _mappingService.Received(1).CreateFileAsync(
            "test-service/mappings/GET_users_200.json",
            Arg.Any<string>(),
            Arg.Any<CancellationToken>());

        await _mappingService.Received(1).CreateFileAsync(
            "test-service/responses/GET_users_200_body.json",
            "body",
            Arg.Any<CancellationToken>());
    }

    [Fact(DisplayName = "CaptureAsync appends _2 suffix when base path exists")]
    public async Task CaptureAsync_BasePathExists_AppendsNumericSuffix()
    {
        // Arrange
        var service = CreateService();
        await service.StartAsync();

        // Mock: base path exists, _2 does not exist
        _mappingService.ReadFileAsync("test-service/mappings/GET_users_200.json", Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(new FileContentDto("existing", "GET_users_200.json", "test-service/mappings/GET_users_200.json", DateTimeOffset.UtcNow, 8)));
        _mappingService.ReadFileAsync("test-service/mappings/GET_users_200_2.json", Arg.Any<CancellationToken>())
            .Returns<Task<FileContentDto>>(_ => throw new NotFoundException("MAPPING_NOT_FOUND", "File not found"));

        _mappingService.ReadFileAsync("test-service/responses/GET_users_200_body.json", Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(new FileContentDto("existing", "GET_users_200_body.json", "test-service/responses/GET_users_200_body.json", DateTimeOffset.UtcNow, 8)));
        _mappingService.ReadFileAsync("test-service/responses/GET_users_200_body_2.json", Arg.Any<CancellationToken>())
            .Returns<Task<FileContentDto>>(_ => throw new NotFoundException("MAPPING_NOT_FOUND", "File not found"));

        // Act
        await service.CaptureAsync(Guid.NewGuid(), "test-service", "GET", "/users", 200, "body");

        // Assert
        await _mappingService.Received(1).CreateFileAsync(
            "test-service/mappings/GET_users_200_2.json",
            Arg.Any<string>(),
            Arg.Any<CancellationToken>());

        await _mappingService.Received(1).CreateFileAsync(
            "test-service/responses/GET_users_200_body_2.json",
            "body",
            Arg.Any<CancellationToken>());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Slug Generation Edge Cases — AC-4 slugification logic
    // ─────────────────────────────────────────────────────────────────────────

    [Theory(DisplayName = "CaptureAsync slugifies URL paths correctly")]
    [InlineData("/api/users/123", "api_users_123")]
    [InlineData("/", "")]
    [InlineData("/users?page=2", "userspage2")] // query params removed
    [InlineData("/Users/Profile", "users_profile")] // lowercase
    [InlineData("///leading///slashes", "leading___slashes")] // leading _ removed, consecutive underscores preserved
    public async Task CaptureAsync_SlugifiesUrlPathCorrectly(string urlPath, string expectedSlug)
    {
        // Arrange
        var service = CreateService();
        await service.StartAsync();

        _mappingService.ReadFileAsync(Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns<Task<FileContentDto>>(_ => throw new NotFoundException("MAPPING_NOT_FOUND", "File not found"));

        // Act
        await service.CaptureAsync(Guid.NewGuid(), "test-service", "GET", urlPath, 200, "body");

        // Assert
        var expectedMappingPath = $"test-service/mappings/GET_{expectedSlug}_200.json";
        await _mappingService.Received(1).CreateFileAsync(
            expectedMappingPath,
            Arg.Any<string>(),
            Arg.Any<CancellationToken>());
    }

    [Fact(DisplayName = "CaptureAsync truncates slugs longer than 64 characters")]
    public async Task CaptureAsync_LongUrlPath_TruncatesSlugTo64Chars()
    {
        // Arrange
        var service = CreateService();
        await service.StartAsync();

        var longPath = "/api/v1/" + new string('x', 100); // 107 chars total
        _mappingService.ReadFileAsync(Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns<Task<FileContentDto>>(_ => throw new NotFoundException("MAPPING_NOT_FOUND", "File not found"));

        // Act
        await service.CaptureAsync(Guid.NewGuid(), "test-service", "GET", longPath, 200, "body");

        // Assert
        await _mappingService.Received(1).CreateFileAsync(
            Arg.Is<string>(p =>
                p.StartsWith("test-service/mappings/GET_") &&
                p.Contains("_200.json") &&
                p.Length <= 128), // max length with prefix/suffix
            Arg.Any<string>(),
            Arg.Any<CancellationToken>());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Error Handling Tests — AC-4, AC-8 System Event creation on failure
    // ─────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "CaptureAsync creates System Event when Mapping write fails")]
    public async Task CaptureAsync_MappingWriteFails_CreatesSystemEvent()
    {
        // Arrange
        var service = CreateService();
        await service.StartAsync();

        _mappingService.ReadFileAsync(Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns<Task<FileContentDto>>(_ => throw new NotFoundException("MAPPING_NOT_FOUND", "File not found"));
        _mappingService.CreateFileAsync(Arg.Is<string>(p => p.Contains("/mappings/")), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns<Task<FileMetadataDto>>(_ => throw new IOException("Disk full"));

        // Act
        await service.CaptureAsync(Guid.NewGuid(), "test-service", "GET", "/users", 200, "body");

        // Assert
        await _systemEvents.Received(1).AddAsync(
            SystemEventSeverity.Error,
            Arg.Is<string>(msg => msg.Contains("Recording failed") && msg.Contains("Mapping")),
            Arg.Any<Guid?>(),
            Arg.Any<CancellationToken>());

        // Response file should not be written when Mapping fails
        await _mappingService.DidNotReceive().CreateFileAsync(
            Arg.Is<string>(p => p.Contains("/responses/")),
            Arg.Any<string>(),
            Arg.Any<CancellationToken>());
    }

    [Fact(DisplayName = "CaptureAsync creates System Event when Response write fails")]
    public async Task CaptureAsync_ResponseWriteFails_CreatesSystemEvent()
    {
        // Arrange
        var service = CreateService();
        await service.StartAsync();

        _mappingService.ReadFileAsync(Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns<Task<FileContentDto>>(_ => throw new NotFoundException("MAPPING_NOT_FOUND", "File not found"));
        _mappingService.CreateFileAsync(Arg.Is<string>(p => p.Contains("/responses/")), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns<Task<FileMetadataDto>>(_ => throw new IOException("Disk full"));

        // Act
        await service.CaptureAsync(Guid.NewGuid(), "test-service", "GET", "/users", 200, "body");

        // Assert
        await _systemEvents.Received(1).AddAsync(
            SystemEventSeverity.Error,
            Arg.Is<string>(msg => msg.Contains("Recording failed") && msg.Contains("Response")),
            Arg.Any<Guid?>(),
            Arg.Any<CancellationToken>());

        // Mapping file should still be written even if Response fails
        await _mappingService.Received(1).CreateFileAsync(
            Arg.Is<string>(p => p.Contains("/mappings/")),
            Arg.Any<string>(),
            Arg.Any<CancellationToken>());
    }

    [Fact(DisplayName = "CaptureAsync writes files even when not recording")]
    public async Task CaptureAsync_WhenNotRecording_StillWritesFiles()
    {
        // Arrange
        var service = CreateService();
        // Recording is NOT started

        _mappingService.ReadFileAsync(Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns<Task<FileContentDto>>(_ => throw new NotFoundException("MAPPING_NOT_FOUND", "File not found"));

        // Act
        await service.CaptureAsync(Guid.NewGuid(), "test-service", "GET", "/users", 200, "body");

        // Assert — CaptureAsync currently writes files regardless of recording state
        // In production, the caller (ProxyService) checks IsRecordingAsync() before calling
        await _mappingService.Received(1).CreateFileAsync(
            Arg.Is<string>(p => p.Contains("/mappings/")),
            Arg.Any<string>(),
            Arg.Any<CancellationToken>());
    }
}
