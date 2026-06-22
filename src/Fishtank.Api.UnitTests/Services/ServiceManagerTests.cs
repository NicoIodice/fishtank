using Fishtank.Api.Data;
using Fishtank.Api.Data.Entities;
using Fishtank.Api.Engine;
using Fishtank.Api.Exceptions;
using Fishtank.Api.Models;
using Fishtank.Api.Services;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using NSubstitute;
using WireMock.Server;
using WireMock.Settings;

namespace Fishtank.Api.UnitTests.Services;

/// <summary>
/// Unit tests for ServiceManager slug generation, port allocation, and SSRF guard.
/// Uses EF Core InMemory provider — does NOT start WireMock servers.
/// </summary>
public class ServiceManagerTests : IDisposable
{
    private readonly FishtankDbContext _db;
    private readonly IServicesRegistry _registry;
    private readonly ISystemEventService _events;
    private readonly IConfiguration _config;
    private readonly IWireMockServerFactory _wireMockFactory;

    public ServiceManagerTests()
    {
        _db = new FishtankDbContext(
            new DbContextOptionsBuilder<FishtankDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options);
        _registry = Substitute.For<IServicesRegistry>();
        _events = Substitute.For<ISystemEventService>();
        _config = new ConfigurationBuilder()
            .AddInMemoryCollection([new KeyValuePair<string, string?>(
                "FISHTANK_MOCKS_ROOT", "/app/mocks")])
            .Build();
        // Default factory: always throws — prevents any test from accidentally starting WireMock
        _wireMockFactory = Substitute.For<IWireMockServerFactory>();
        _wireMockFactory.Start(Arg.Any<WireMockServerSettings>())
            .Returns(_ => throw new IOException("WireMock intentionally blocked in unit tests"));
    }

    private ServiceManager BuildSut() =>
        new(_db, _registry, _events, _config, _wireMockFactory);

    public void Dispose() => _db.Dispose();

    // ─── Slug generation ─────────────────────────────────────────────────────

    [Theory(DisplayName = "Slug is generated correctly from service name")]
    [InlineData("Weather API", "weather-api")]
    [InlineData("My  Service!!", "my--service")]
    [InlineData("ABC123", "abc123")]
    [InlineData("  Spaces  ", "spaces")]
    public async Task CreateAsync_GeneratesCorrectSlug(string name, string expectedSlug)
    {
        var sut = BuildSut();

        var result = await sut.CreateAsync(new CreateServiceRequest(
            name, null, "https://api.example.com", 30100, null));

        result.Slug.Should().Be(expectedSlug);
    }

    [Fact(DisplayName = "Name that produces too-short slug returns SERVICE_NAME_INVALID")]
    public async Task CreateAsync_ShortSlugName_ThrowsServiceNameInvalid()
    {
        var sut = BuildSut();

        var act = async () => await sut.CreateAsync(
            new CreateServiceRequest("!", null, "https://api.example.com", 30100, null));

        await act.Should().ThrowAsync<ValidationException>()
            .WithMessage("*slug*");
    }

    // ─── Port range validation ────────────────────────────────────────────────

    [Theory(DisplayName = "Port outside 30100-30199 returns SERVICE_PORT_OUT_OF_RANGE")]
    [InlineData(80)]
    [InlineData(30099)]
    [InlineData(30200)]
    [InlineData(65535)]
    public async Task CreateAsync_PortOutOfRange_ThrowsPortOutOfRange(int port)
    {
        var sut = BuildSut();

        var act = async () => await sut.CreateAsync(
            new CreateServiceRequest("My Service", null, "https://api.example.com", port, null));

        (await act.Should().ThrowAsync<ValidationException>())
            .Which.ErrorCode.Should().Be("SERVICE_PORT_OUT_OF_RANGE");
    }

    // ─── Port exhaustion ──────────────────────────────────────────────────────

    [Fact(DisplayName = "GetNextPortAsync throws SERVICE_PORT_RANGE_EXHAUSTED when all ports assigned")]
    public async Task GetNextPortAsync_AllPortsAssigned_ThrowsExhausted()
    {
        var sut = BuildSut();

        // Seed all 100 ports (30100–30199)
        for (var port = 30100; port <= 30199; port++)
        {
            _db.Services.Add(new Service
            {
                Name = $"Service {port}",
                Slug = $"service-{port}",
                ExternalUrl = "https://api.example.com",
                Port = port,
                MocksRoot = $"/app/mocks/service-{port}",
            });
        }
        await _db.SaveChangesAsync();

        var act = async () => await sut.GetNextPortAsync();

        (await act.Should().ThrowAsync<ValidationException>())
            .Which.ErrorCode.Should().Be("SERVICE_PORT_RANGE_EXHAUSTED");
    }

    [Fact(DisplayName = "GetNextPortAsync skips ports of soft-deleted services")]
    public async Task GetNextPortAsync_ReclaimsPortFromDeletedService()
    {
        var sut = BuildSut();

        // Seed 30100–30150 as active, 30151–30199 as deleted
        for (var port = 30100; port <= 30199; port++)
        {
            _db.Services.Add(new Service
            {
                Name = $"Service {port}",
                Slug = $"service-{port}",
                ExternalUrl = "https://api.example.com",
                Port = port,
                MocksRoot = $"/app/mocks/service-{port}",
                DeletedAt = port <= 30150 ? null : DateTimeOffset.UtcNow.AddDays(-1),
            });
        }
        await _db.SaveChangesAsync();

        var result = await sut.GetNextPortAsync();

        // 30151 is the first soft-deleted port → should be reclaimed
        result.Should().Be(30151);
    }

    // ─── SSRF guard ───────────────────────────────────────────────────────────

    [Theory(DisplayName = "ExternalUrl targeting loopback returns SERVICE_URL_INVALID")]
    [InlineData("http://127.0.0.1/")]
    [InlineData("http://localhost/")]
    [InlineData("https://169.254.169.254/latest/meta-data")]
    [InlineData("http://100.100.100.200/")]
    public async Task CreateAsync_LoopbackUrl_ThrowsUrlInvalid(string url)
    {
        var sut = BuildSut();

        var act = async () => await sut.CreateAsync(
            new CreateServiceRequest("My API", null, url, 30100, null));

        (await act.Should().ThrowAsync<ValidationException>())
            .Which.ErrorCode.Should().Be("SERVICE_URL_INVALID");
    }

    [Theory(DisplayName = "ExternalUrl targeting private range is allowed (legitimate proxy target)")]
    [InlineData("http://10.0.0.1/api")]
    [InlineData("http://192.168.1.1/api")]
    [InlineData("http://172.20.0.5/api")]
    public async Task CreateAsync_PrivateRangeUrl_Allowed(string url)
    {
        var sut = BuildSut();

        // WireMock factory throws → service will be created in stopped state (correct)
        var result = await sut.CreateAsync(
            new CreateServiceRequest("Internal API", null, url, 30100, null));

        // Should succeed (not throw ValidationException for the URL)
        result.Should().NotBeNull();
        result.ExternalUrl.Should().Be(url);
    }

    // ─── Tags JsonException guard ─────────────────────────────────────────────

    [Fact(DisplayName = "Service.Tags getter returns empty array on malformed TagsJson")]
    public void Tags_MalformedJson_ReturnsEmptyArray()
    {
        var service = new Service { TagsJson = "not-valid-json" };
        service.Tags.Should().BeEmpty("malformed TagsJson must return empty array, not throw");
    }

    [Fact(DisplayName = "Service.Tags getter returns empty array on empty TagsJson")]
    public void Tags_EmptyJson_ReturnsEmptyArray()
    {
        var service = new Service { TagsJson = "" };
        service.Tags.Should().BeEmpty();
    }
}
