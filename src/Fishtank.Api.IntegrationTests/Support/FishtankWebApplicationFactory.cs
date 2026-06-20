using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Fishtank.Api.IntegrationTests.Support;

/// <summary>
/// Configures the Fishtank API host for integration testing.
/// A single instance is shared across all tests in the "Integration" collection
/// via IClassFixture, preventing redundant app startups.
/// </summary>
public class FishtankWebApplicationFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureServices(services =>
        {
            // TODO: Replace real SQLite with :memory: once DbContext is wired up.
            //
            // var descriptor = services.SingleOrDefault(
            //     d => d.ServiceType == typeof(DbContextOptions<FishtankDbContext>));
            // if (descriptor != null) services.Remove(descriptor);
            //
            // services.AddDbContext<FishtankDbContext>(options =>
            //     options.UseSqlite("DataSource=:memory:"));
        });
    }
}
