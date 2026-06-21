using Fishtank.Api.Data;
using Fishtank.Api.Data.Entities;
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

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

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

        // Clear all data
        db.Users.RemoveRange(await db.Users.ToListAsync());
        db.ServerConfigs.RemoveRange(await db.ServerConfigs.ToListAsync());
        await db.SaveChangesAsync();

        // Re-seed BootEpoch (required by IServerConfigService singleton)
        db.ServerConfigs.Add(new ServerConfig { Id = 1, BootEpoch = Guid.NewGuid() });
        await db.SaveChangesAsync();

        // Clear the singleton BootEpoch cache so the new value is picked up
        var configService = Services.GetRequiredService<IServerConfigService>();
        configService.ClearCache();
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing); // Dispose host first
        if (disposing)
        {
            _connection?.Dispose(); // Then release the in-memory connection
        }
    }
}

