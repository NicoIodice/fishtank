using Fishtank.Api.Data;
using Fishtank.Api.Data.Entities;
using Fishtank.Api.Engine;
using Fishtank.Api.Exceptions;
using Fishtank.Api.Hubs;
using Fishtank.Api.Models;
using Fishtank.Api.Services;
using FluentAssertions;
using Microsoft.AspNetCore.SignalR;
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
    private readonly IHubContext<ServicesHub> _servicesHub;

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
        _servicesHub = Substitute.For<IHubContext<ServicesHub>>();
    }

    private ServiceManager BuildSut() =>
        new(_db, _registry, _events, _config, _wireMockFactory, _servicesHub);

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

    // ─── ListAsync ────────────────────────────────────────────────────────────

    [Fact(DisplayName = "ListAsync returns only non-deleted services ordered by CreatedAt")]
    public async Task ListAsync_ReturnsNonDeletedServicesInOrder()
    {
        var sut = BuildSut();
        var earlier = DateTimeOffset.UtcNow.AddHours(-1);
        var later = DateTimeOffset.UtcNow;

        _db.Services.Add(new Service { Name = "B", Slug = "b", ExternalUrl = "https://b.example.com", Port = 30101, MocksRoot = "/mocks/b", CreatedAt = later });
        _db.Services.Add(new Service { Name = "A", Slug = "a", ExternalUrl = "https://a.example.com", Port = 30100, MocksRoot = "/mocks/a", CreatedAt = earlier });
        _db.Services.Add(new Service { Name = "Deleted", Slug = "del", ExternalUrl = "https://del.example.com", Port = 30102, MocksRoot = "/mocks/del", DeletedAt = DateTimeOffset.UtcNow });
        await _db.SaveChangesAsync();

        var result = await sut.ListAsync();

        result.Should().HaveCount(2);
        result[0].Name.Should().Be("A");
        result[1].Name.Should().Be("B");
    }

    [Fact(DisplayName = "ListAsync returns empty list when no services exist")]
    public async Task ListAsync_NoServices_ReturnsEmpty()
    {
        var sut = BuildSut();

        var result = await sut.ListAsync();

        result.Should().BeEmpty();
    }

    // ─── UpdateAsync ──────────────────────────────────────────────────────────

    [Fact(DisplayName = "UpdateAsync throws NotFoundException for unknown service id")]
    public async Task UpdateAsync_UnknownId_ThrowsNotFound()
    {
        var sut = BuildSut();

        var act = async () => await sut.UpdateAsync(Guid.NewGuid(),
            new UpdateServiceRequest("New Name", null, "https://api.example.com", 30100, null));

        (await act.Should().ThrowAsync<NotFoundException>())
            .Which.ErrorCode.Should().Be("SERVICE_NOT_FOUND");
    }

    [Fact(DisplayName = "UpdateAsync updates name, description, and tags")]
    public async Task UpdateAsync_ValidRequest_UpdatesFields()
    {
        var service = new Service
        {
            Name = "Old Name",
            Slug = "old-name",
            ExternalUrl = "https://api.example.com",
            Port = 30100,
            MocksRoot = "/mocks/old-name"
        };
        _db.Services.Add(service);
        await _db.SaveChangesAsync();

        var sut = BuildSut();

        var result = await sut.UpdateAsync(service.Id,
            new UpdateServiceRequest("New Name", "desc", "https://api.example.com", 30100, ["tag1"]));

        result.Name.Should().Be("New Name");
        result.Slug.Should().Be("new-name");
        result.Tags.Should().BeEquivalentTo(["tag1"]);
    }

    [Fact(DisplayName = "UpdateAsync throws SERVICE_SLUG_CONFLICT when new slug already exists")]
    public async Task UpdateAsync_SlugConflict_ThrowsSlugConflict()
    {
        _db.Services.Add(new Service { Name = "Service A", Slug = "service-a", ExternalUrl = "https://a.example.com", Port = 30100, MocksRoot = "/mocks/a" });
        var serviceB = new Service { Name = "Service B", Slug = "service-b", ExternalUrl = "https://b.example.com", Port = 30101, MocksRoot = "/mocks/b" };
        _db.Services.Add(serviceB);
        await _db.SaveChangesAsync();

        var sut = BuildSut();

        var act = async () => await sut.UpdateAsync(serviceB.Id,
            new UpdateServiceRequest("Service A", null, "https://b.example.com", 30101, null));

        (await act.Should().ThrowAsync<ValidationException>())
            .Which.ErrorCode.Should().Be("SERVICE_SLUG_CONFLICT");
    }

    [Fact(DisplayName = "UpdateAsync throws SERVICE_PORT_CONFLICT when new port already used")]
    public async Task UpdateAsync_PortConflict_ThrowsPortConflict()
    {
        _db.Services.Add(new Service { Name = "Alpha API", Slug = "alpha-api", ExternalUrl = "https://a.example.com", Port = 30100, MocksRoot = "/mocks/alpha-api" });
        var serviceBeta = new Service { Name = "Beta API", Slug = "beta-api", ExternalUrl = "https://b.example.com", Port = 30101, MocksRoot = "/mocks/beta-api" };
        _db.Services.Add(serviceBeta);
        await _db.SaveChangesAsync();

        var sut = BuildSut();

        var act = async () => await sut.UpdateAsync(serviceBeta.Id,
            new UpdateServiceRequest("Beta API", null, "https://b.example.com", 30100, null));

        (await act.Should().ThrowAsync<ValidationException>())
            .Which.ErrorCode.Should().Be("SERVICE_PORT_CONFLICT");
    }

    // ─── StopAsync ────────────────────────────────────────────────────────────

    [Fact(DisplayName = "StopAsync throws NotFoundException for unknown service id")]
    public async Task StopAsync_UnknownId_ThrowsNotFound()
    {
        var sut = BuildSut();

        var act = async () => await sut.StopAsync(Guid.NewGuid());

        (await act.Should().ThrowAsync<NotFoundException>())
            .Which.ErrorCode.Should().Be("SERVICE_NOT_FOUND");
    }

    [Fact(DisplayName = "StopAsync sets service status to Stopped and IsActive to false")]
    public async Task StopAsync_RunningService_SetsStatusStopped()
    {
        var service = new Service
        {
            Name = "My Service",
            Slug = "my-service",
            ExternalUrl = "https://api.example.com",
            Port = 30100,
            MocksRoot = "/mocks/my-service",
            Status = ServiceStatus.Live,
            IsActive = true
        };
        _db.Services.Add(service);
        await _db.SaveChangesAsync();

        _registry.TryRemove(service.Id, out _).Returns(false);

        var sut = BuildSut();
        var result = await sut.StopAsync(service.Id);

        result.Status.Should().Be("stopped");
        result.IsActive.Should().BeFalse();
    }

    // ─── StartAsync ───────────────────────────────────────────────────────────

    [Fact(DisplayName = "StartAsync throws NotFoundException for unknown service id")]
    public async Task StartAsync_UnknownId_ThrowsNotFound()
    {
        var sut = BuildSut();

        var act = async () => await sut.StartAsync(Guid.NewGuid());

        (await act.Should().ThrowAsync<NotFoundException>())
            .Which.ErrorCode.Should().Be("SERVICE_NOT_FOUND");
    }

    [Fact(DisplayName = "StartAsync sets status to Stopped when WireMock fails to start")]
    public async Task StartAsync_WireMockFails_SetsStatusStopped()
    {
        var service = new Service
        {
            Name = "My Service",
            Slug = "my-service",
            ExternalUrl = "https://api.example.com",
            Port = 30100,
            MocksRoot = "/mocks/my-service",
            Status = ServiceStatus.Stopped,
            IsActive = false
        };
        _db.Services.Add(service);
        await _db.SaveChangesAsync();

        _registry.TryRemove(service.Id, out _).Returns(false);

        // Default factory throws — already configured in constructor
        var sut = BuildSut();
        var result = await sut.StartAsync(service.Id);

        // Factory throws → status stays Stopped
        result.Status.Should().Be("stopped");
        result.IsActive.Should().BeFalse();
        await _events.Received(1).AddAsync(
            SystemEventSeverity.Error,
            Arg.Any<string>(),
            service.Id,
            Arg.Any<CancellationToken>());
    }
}
