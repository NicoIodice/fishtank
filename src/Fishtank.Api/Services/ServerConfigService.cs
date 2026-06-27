using Fishtank.Api.Data;
using Microsoft.Extensions.DependencyInjection;

namespace Fishtank.Api.Services;

/// <summary>
/// Singleton that caches the BootEpoch GUID to avoid a DB hit on every
/// authenticated request. ClearCache() is called by the test infrastructure
/// when the in-memory DB is reset between tests.
/// </summary>
public class ServerConfigService(IServiceScopeFactory scopeFactory) : IServerConfigService
{
    private Guid? _cachedEpoch;
    private bool? _cachedCaptureFullHeaders;

    public async Task<Guid> GetBootEpochAsync()
    {
        if (_cachedEpoch.HasValue)
            return _cachedEpoch.Value;

        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<FishtankDbContext>();
        var config = await db.ServerConfigs.FindAsync(1)
            ?? throw new InvalidOperationException("ServerConfig not seeded.");
        _cachedEpoch = config.BootEpoch;
        return _cachedEpoch.Value;
    }

    public bool GetCaptureFullHeadersCached() => _cachedCaptureFullHeaders ?? false;

    public async Task<bool> GetCaptureFullHeadersAsync()
    {
        if (_cachedCaptureFullHeaders.HasValue)
            return _cachedCaptureFullHeaders.Value;

        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<FishtankDbContext>();
        var config = await db.ServerConfigs.FindAsync(1)
            ?? throw new InvalidOperationException("ServerConfig not seeded.");
        _cachedCaptureFullHeaders = config.CaptureFullHeaders;
        return _cachedCaptureFullHeaders.Value;
    }

    public async Task SetCaptureFullHeadersAsync(bool value)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<FishtankDbContext>();
        var config = await db.ServerConfigs.FindAsync(1)
            ?? throw new InvalidOperationException("ServerConfig not seeded.");
        config.CaptureFullHeaders = value;
        await db.SaveChangesAsync();
        _cachedCaptureFullHeaders = value;
    }

    public void ClearCache()
    {
        _cachedEpoch = null;
        _cachedCaptureFullHeaders = null;
    }
}
