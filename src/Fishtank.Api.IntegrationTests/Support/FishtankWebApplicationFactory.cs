using Fishtank.Api.Data;
using Fishtank.Api.Data.Entities;
using Fishtank.Api.Engine;
using Fishtank.Api.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Fishtank.Api.IntegrationTests.Support;

/// <summary>
/// Configures the Fishtank API host for integration testing.
/// A single instance is shared across all tests in the "Integration" collection
/// via IClassFixture, preventing redundant app startups.
///
/// Uses an in-memory SQLite connection kept open for the factory lifetime.
/// Call ResetDatabaseAsync() before each test to wipe all data and re-seed
/// the BootEpoch, giving every test a clean isolated database state.
/// </summary>
public class FishtankWebApplicationFactory : WebApplicationFactory<Program>
{
    private SqliteConnection? _connection;
    private string? _testWebRoot;
    private string? _testMocksRoot;

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        // Create a minimal wwwroot so UseStaticFiles and MapFallback can serve
        // index.html during integration tests (no real client build required).
        _testWebRoot = Path.Combine(Path.GetTempPath(), $"fishtank-test-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_testWebRoot);
        File.WriteAllText(
            Path.Combine(_testWebRoot, "index.html"),
            "<!DOCTYPE html><html><head><title>Fishtank</title></head><body><div id=\"root\"></div></body></html>");
        builder.UseWebRoot(_testWebRoot);

        // Create a temp directory for FISHTANK_MOCKS_ROOT (Story 4.1)
        _testMocksRoot = Path.Combine(Path.GetTempPath(), $"fishtank-mocks-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_testMocksRoot);
        builder.UseSetting("FISHTANK_MOCKS_ROOT", _testMocksRoot);

        builder.ConfigureServices(services =>
        {
            // Replace real SQLite with in-memory SQLite.
            // CRITICAL: conn.Open() MUST happen before services.AddDbContext,
            // otherwise each DbContext gets a different :memory: connection and
            // migrations end up on a temporary DB that's immediately discarded.
            _connection ??= new SqliteConnection("DataSource=:memory:");
            if (_connection.State != System.Data.ConnectionState.Open)
                _connection.Open();

            var descriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<FishtankDbContext>));
            if (descriptor != null) services.Remove(descriptor);

            services.AddDbContext<FishtankDbContext>(options =>
                options.UseSqlite(_connection));
        });
    }

    /// <summary>
    /// Wipes all data from the in-memory DB and re-seeds the BootEpoch.
    /// Called by IntegrationTestBase.InitializeAsync() before each test.
    /// </summary>
    public async Task ResetDatabaseAsync()
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<FishtankDbContext>();

        // Apply migrations if not already applied (idempotent)
        await db.Database.MigrateAsync();

        // Clear all data (order matters: dependents before principals)
        db.SystemEvents.RemoveRange(await db.SystemEvents.ToListAsync());
        db.Services.RemoveRange(await db.Services.ToListAsync());
        db.Users.RemoveRange(await db.Users.ToListAsync());
        db.ServerConfigs.RemoveRange(await db.ServerConfigs.ToListAsync());
        await db.SaveChangesAsync();

        // Stop all running WireMock servers so ports are freed between test runs,
        // then clear the registry so stale disposed entries don't accumulate.
        var registry = Services.GetService<IServicesRegistry>();
        if (registry is not null)
        {
            foreach (var (id, server) in registry.GetAll())
            {
                try { server.Stop(); server.Dispose(); } catch { /* best-effort */ }
                registry.TryRemove(id, out _);
            }
        }

        // Re-seed BootEpoch (required by IServerConfigService singleton)
        db.ServerConfigs.Add(new ServerConfig { Id = 1, BootEpoch = Guid.NewGuid() });
        await db.SaveChangesAsync();

        // Clear the singleton BootEpoch cache so the new value is picked up
        var configService = Services.GetRequiredService<IServerConfigService>();
        configService.ClearCache();

        // Clear activity store singleton so tests start with empty logs
        var activityStore = Services.GetService<IActivityStore>();
        activityStore?.Clear();
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing); // Dispose host first
        if (disposing)
        {
            _connection?.Dispose(); // Then release the in-memory connection
            if (_testWebRoot is not null && Directory.Exists(_testWebRoot))
                Directory.Delete(_testWebRoot, recursive: true);
            if (_testMocksRoot is not null && Directory.Exists(_testMocksRoot))
                Directory.Delete(_testMocksRoot, recursive: true);
        }
    }
}

