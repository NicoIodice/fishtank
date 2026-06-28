using Fishtank.Api.Data;
using Fishtank.Api.Data.Entities;
using Fishtank.Api.Engine;
using Fishtank.Api.Exceptions;
using Fishtank.Api.Services;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using NSubstitute;
using WireMock.Server;

namespace Fishtank.Api.UnitTests.Services;

/// <summary>
/// Unit tests for <see cref="CacheService"/> — covers GetAll, Clear (per-service), and ClearAll.
/// Uses EF Core InMemory provider; WireMock servers are substituted via NSubstitute.
/// </summary>
public class CacheServiceTests : IDisposable
{
    private readonly FishtankDbContext _db;
    private readonly IServicesRegistry _registry;

    public CacheServiceTests()
    {
        _db = new FishtankDbContext(
            new DbContextOptionsBuilder<FishtankDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options);
        _registry = Substitute.For<IServicesRegistry>();
    }

    private CacheService BuildSut() => new(_db, _registry);

    public void Dispose() => _db.Dispose();

    // ─── GetAllAsync ──────────────────────────────────────────────────────────

    [Fact(DisplayName = "GetAllAsync returns empty list when no services exist")]
    public async Task GetAllAsync_NoServices_ReturnsEmpty()
    {
        var sut = BuildSut();

        var result = await sut.GetAllAsync();

        result.Should().BeEmpty();
    }

    [Fact(DisplayName = "GetAllAsync returns service with zero counts when not in registry")]
    public async Task GetAllAsync_ServiceNotInRegistry_ReturnsZeroCounts()
    {
        var service = new Service { Name = "My API", Slug = "my-api", ExternalUrl = "https://api.example.com", Port = 30100, MocksRoot = "/tmp/mocks" };
        _db.Services.Add(service);
        await _db.SaveChangesAsync();

        _registry.TryGet(service.Id, out _).Returns(false);

        var sut = BuildSut();
        var result = await sut.GetAllAsync();

        result.Should().HaveCount(1);
        result[0].EntryCount.Should().Be(0);
        result[0].EstimatedBytes.Should().Be(0);
    }

    [Fact(DisplayName = "GetAllAsync returns service with all metadata when registry returns true but null server")]
    public async Task GetAllAsync_ServiceInRegistryNullServer_ReturnsZeroCounts()
    {
        var service = new Service { Name = "My API", Slug = "my-api", ExternalUrl = "https://api.example.com", Port = 30100, MocksRoot = "/tmp/mocks" };
        _db.Services.Add(service);
        await _db.SaveChangesAsync();

        // Simulate: TryGet returns true but server is null (edge case when GC collected the server ref)
        _registry.TryGet(service.Id, out Arg.Any<WireMockServer?>()!)
            .Returns(x => { x[1] = null; return true; });

        var sut = BuildSut();
        var result = await sut.GetAllAsync();

        result.Should().HaveCount(1);
        result[0].ServiceName.Should().Be("My API");
        result[0].Slug.Should().Be("my-api");
        result[0].EntryCount.Should().Be(0);
        result[0].EstimatedBytes.Should().Be(0);
    }

    [Fact(DisplayName = "GetAllAsync excludes soft-deleted services")]
    public async Task GetAllAsync_SoftDeletedService_ExcludesFromResult()
    {
        _db.Services.Add(new Service { Name = "Active", Slug = "active", ExternalUrl = "https://api.example.com", Port = 30100, MocksRoot = "/tmp/a" });
        _db.Services.Add(new Service { Name = "Deleted", Slug = "deleted", ExternalUrl = "https://api.example.com", Port = 30101, MocksRoot = "/tmp/d", DeletedAt = DateTimeOffset.UtcNow });
        await _db.SaveChangesAsync();

        var sut = BuildSut();
        var result = await sut.GetAllAsync();

        result.Should().HaveCount(1);
        result[0].ServiceName.Should().Be("Active");
    }

    // ─── ClearAsync ───────────────────────────────────────────────────────────

    [Fact(DisplayName = "ClearAsync throws NotFoundException for unknown service id")]
    public async Task ClearAsync_UnknownServiceId_ThrowsNotFound()
    {
        var sut = BuildSut();

        var act = async () => await sut.ClearAsync(Guid.NewGuid());

        (await act.Should().ThrowAsync<NotFoundException>())
            .Which.ErrorCode.Should().Be("SERVICE_NOT_FOUND");
    }

    [Fact(DisplayName = "ClearAsync throws NotFoundException for soft-deleted service")]
    public async Task ClearAsync_SoftDeletedService_ThrowsNotFound()
    {
        var service = new Service { Name = "Deleted", Slug = "deleted", ExternalUrl = "https://api.example.com", Port = 30100, MocksRoot = "/tmp", DeletedAt = DateTimeOffset.UtcNow };
        _db.Services.Add(service);
        await _db.SaveChangesAsync();

        var sut = BuildSut();

        var act = async () => await sut.ClearAsync(service.Id);

        await act.Should().ThrowAsync<NotFoundException>();
    }

    [Fact(DisplayName = "ClearAsync is a no-op when TryGet returns true but server is null")]
    public async Task ClearAsync_ServiceInRegistryNullServer_NoOp()
    {
        var service = new Service { Name = "My API", Slug = "my-api", ExternalUrl = "https://api.example.com", Port = 30100, MocksRoot = "/tmp/mocks" };
        _db.Services.Add(service);
        await _db.SaveChangesAsync();

        _registry.TryGet(service.Id, out Arg.Any<WireMockServer?>()!)
            .Returns(x => { x[1] = null; return true; });

        var sut = BuildSut();

        await sut.Invoking(s => s.ClearAsync(service.Id)).Should().NotThrowAsync();
    }

    [Fact(DisplayName = "ClearAsync is a no-op when service is not in registry (stopped)")]
    public async Task ClearAsync_ServiceNotInRegistry_NoOp()
    {
        var service = new Service { Name = "Stopped", Slug = "stopped", ExternalUrl = "https://api.example.com", Port = 30100, MocksRoot = "/tmp/mocks" };
        _db.Services.Add(service);
        await _db.SaveChangesAsync();

        _registry.TryGet(service.Id, out _).Returns(false);

        var sut = BuildSut();

        // Should not throw
        await sut.Invoking(s => s.ClearAsync(service.Id)).Should().NotThrowAsync();
    }

    // ─── ClearAllAsync ────────────────────────────────────────────────────────

    [Fact(DisplayName = "ClearAllAsync calls GetAll on the registry")]
    public async Task ClearAllAsync_EmptyRegistry_CallsGetAll()
    {
        _registry.GetAll().Returns(new Dictionary<Guid, WireMockServer>());

        var sut = BuildSut();
        await sut.ClearAllAsync();

        _registry.Received(1).GetAll();
    }

    [Fact(DisplayName = "ClearAllAsync does nothing when registry is empty")]
    public async Task ClearAllAsync_EmptyRegistry_NoOp()
    {
        _registry.GetAll().Returns(new Dictionary<Guid, WireMockServer>());

        var sut = BuildSut();

        await sut.Invoking(s => s.ClearAllAsync()).Should().NotThrowAsync();
    }
}
