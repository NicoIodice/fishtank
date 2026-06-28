using Fishtank.Api.Data;
using Fishtank.Api.Data.Entities;
using Fishtank.Api.Services;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Fishtank.Api.UnitTests.Services;

/// <summary>
/// Unit tests for <see cref="ServerConfigService"/> — covers boot-epoch caching,
/// capture-headers flag caching, set, and cache clearing.
/// Uses a real ServiceProvider with an in-memory DB to provide <see cref="IServiceScopeFactory"/>.
/// </summary>
public class ServerConfigServiceTests : IDisposable
{
    private readonly ServiceProvider _provider;
    private readonly FishtankDbContext _db;

    public ServerConfigServiceTests()
    {
        var dbName = Guid.NewGuid().ToString();
        var services = new ServiceCollection();
        services.AddDbContext<FishtankDbContext>(opts =>
            opts.UseInMemoryDatabase(dbName));
        _provider = services.BuildServiceProvider();
        _db = _provider.GetRequiredService<FishtankDbContext>();
    }

    private ServerConfigService BuildSut() =>
        new(_provider.GetRequiredService<IServiceScopeFactory>());

    private async Task SeedConfigAsync(Guid? epoch = null, bool captureFullHeaders = false)
    {
        _db.ServerConfigs.Add(new ServerConfig
        {
            Id = 1,
            BootEpoch = epoch ?? Guid.NewGuid(),
            CaptureFullHeaders = captureFullHeaders,
        });
        await _db.SaveChangesAsync();
    }

    public void Dispose() => _provider.Dispose();

    // ─── GetBootEpochAsync ────────────────────────────────────────────────────

    [Fact(DisplayName = "GetBootEpochAsync returns epoch from DB on first call (cold)")]
    public async Task GetBootEpochAsync_Cold_ReturnsEpochFromDb()
    {
        var expected = Guid.NewGuid();
        await SeedConfigAsync(epoch: expected);

        var sut = BuildSut();
        var result = await sut.GetBootEpochAsync();

        result.Should().Be(expected);
    }

    [Fact(DisplayName = "GetBootEpochAsync returns cached value on second call (warm)")]
    public async Task GetBootEpochAsync_Warm_ReturnsCachedValue()
    {
        var expected = Guid.NewGuid();
        await SeedConfigAsync(epoch: expected);

        var sut = BuildSut();
        var first = await sut.GetBootEpochAsync();

        // Delete from DB to verify second call uses cache
        _db.ServerConfigs.RemoveRange(_db.ServerConfigs);
        await _db.SaveChangesAsync();

        var second = await sut.GetBootEpochAsync();

        second.Should().Be(first);
        second.Should().Be(expected);
    }

    [Fact(DisplayName = "GetBootEpochAsync throws InvalidOperationException when ServerConfig not seeded")]
    public async Task GetBootEpochAsync_NotSeeded_ThrowsInvalidOperation()
    {
        var sut = BuildSut();

        var act = sut.GetBootEpochAsync;

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*ServerConfig not seeded*");
    }

    // ─── GetCaptureFullHeadersAsync ───────────────────────────────────────────

    [Fact(DisplayName = "GetCaptureFullHeadersAsync returns value from DB on first call (cold)")]
    public async Task GetCaptureFullHeadersAsync_Cold_ReturnsFromDb()
    {
        await SeedConfigAsync(captureFullHeaders: true);

        var sut = BuildSut();
        var result = await sut.GetCaptureFullHeadersAsync();

        result.Should().BeTrue();
    }

    [Fact(DisplayName = "GetCaptureFullHeadersAsync returns cached value on second call (warm)")]
    public async Task GetCaptureFullHeadersAsync_Warm_ReturnsCachedValue()
    {
        await SeedConfigAsync(captureFullHeaders: true);

        var sut = BuildSut();
        var first = await sut.GetCaptureFullHeadersAsync();

        // Delete from DB — second call must hit cache
        _db.ServerConfigs.RemoveRange(_db.ServerConfigs);
        await _db.SaveChangesAsync();

        var second = await sut.GetCaptureFullHeadersAsync();

        second.Should().Be(first).And.BeTrue();
    }

    [Fact(DisplayName = "GetCaptureFullHeadersAsync throws when ServerConfig not seeded")]
    public async Task GetCaptureFullHeadersAsync_NotSeeded_Throws()
    {
        var sut = BuildSut();

        var act = sut.GetCaptureFullHeadersAsync;

        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    // ─── GetCaptureFullHeadersCached ─────────────────────────────────────────

    [Fact(DisplayName = "GetCaptureFullHeadersCached returns false before any async call")]
    public async Task GetCaptureFullHeadersCached_BeforeAsyncCall_ReturnsFalse()
    {
        await SeedConfigAsync(captureFullHeaders: true);

        var sut = BuildSut();

        // Cache not populated yet
        sut.GetCaptureFullHeadersCached().Should().BeFalse();
    }

    [Fact(DisplayName = "GetCaptureFullHeadersCached returns true after GetCaptureFullHeadersAsync")]
    public async Task GetCaptureFullHeadersCached_AfterAsyncCall_ReturnsCurrentValue()
    {
        await SeedConfigAsync(captureFullHeaders: true);

        var sut = BuildSut();
        await sut.GetCaptureFullHeadersAsync();

        sut.GetCaptureFullHeadersCached().Should().BeTrue();
    }

    // ─── SetCaptureFullHeadersAsync ───────────────────────────────────────────

    [Fact(DisplayName = "SetCaptureFullHeadersAsync updates DB and populates cache")]
    public async Task SetCaptureFullHeadersAsync_UpdatesDbAndCache()
    {
        await SeedConfigAsync(captureFullHeaders: false);

        var sut = BuildSut();
        await sut.SetCaptureFullHeadersAsync(true);

        // Cache should be updated
        sut.GetCaptureFullHeadersCached().Should().BeTrue();

        // DB should reflect the change — clear the tracker so FindAsync re-fetches
        _db.ChangeTracker.Clear();
        var config = await _db.ServerConfigs.FindAsync(1);
        config!.CaptureFullHeaders.Should().BeTrue();
    }

    [Fact(DisplayName = "SetCaptureFullHeadersAsync throws when ServerConfig not seeded")]
    public async Task SetCaptureFullHeadersAsync_NotSeeded_Throws()
    {
        var sut = BuildSut();

        var act = () => sut.SetCaptureFullHeadersAsync(true);

        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    // ─── ClearCache ───────────────────────────────────────────────────────────

    [Fact(DisplayName = "ClearCache resets both cached values so next async call hits DB")]
    public async Task ClearCache_ResetsAllCachedValues()
    {
        var epoch = Guid.NewGuid();
        await SeedConfigAsync(epoch: epoch, captureFullHeaders: true);

        var sut = BuildSut();
        await sut.GetBootEpochAsync();
        await sut.GetCaptureFullHeadersAsync();

        sut.ClearCache();

        // Update DB values
        var config = await _db.ServerConfigs.FindAsync(1);
        var newEpoch = Guid.NewGuid();
        config!.BootEpoch = newEpoch;
        config.CaptureFullHeaders = false;
        await _db.SaveChangesAsync();

        // After ClearCache, re-fetches from DB
        var freshEpoch = await sut.GetBootEpochAsync();
        var freshHeaders = await sut.GetCaptureFullHeadersAsync();

        freshEpoch.Should().Be(newEpoch).And.NotBe(epoch);
        freshHeaders.Should().BeFalse();
    }
}
