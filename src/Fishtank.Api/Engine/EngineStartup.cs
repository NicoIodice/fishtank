using Fishtank.Api.Data;
using Fishtank.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Serilog;
using WireMock.Handlers;
using WireMock.Server;
using WireMock.Settings;

namespace Fishtank.Api.Engine;

public class EngineStartup(
    IServicesRegistry registry,
    IServiceScopeFactory scopeFactory,
    IConfiguration configuration,
    IWireMockServerFactory wireMockFactory) : IHostedService
{
    public async Task StartAsync(CancellationToken cancellationToken)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<FishtankDbContext>();

        await db.Database.MigrateAsync(cancellationToken);

        var services = await db.Services
            .Where(s => s.Status == ServiceStatus.Live && s.DeletedAt == null)
            .ToListAsync(cancellationToken);

        foreach (var service in services)
        {
            await StartServiceInstanceAsync(db, service, cancellationToken);
        }

        await TryLoadSeedFileAsync(db, cancellationToken);
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        foreach (var (_, server) in registry.GetAll())
        {
            try
            {
                server.Stop();
                server.Dispose();
            }
            catch (Exception ex)
            {
                Log.Warning(ex, "Error stopping WireMock server during shutdown");
            }
        }
        return Task.CompletedTask;
    }

    internal async Task StartServiceInstanceAsync(
        FishtankDbContext db,
        Service service,
        CancellationToken cancellationToken)
    {
        try
        {
            var server = wireMockFactory.Start(new WireMockServerSettings
            {
                Port = service.Port,
                ReadStaticMappings = true,
                WatchStaticMappings = false,
                WatchStaticMappingsInSubdirectories = false,
                FileSystemHandler = new LocalFileSystemHandler(service.MocksRoot),
                ProxyAndRecordSettings = new WireMock.Settings.ProxyAndRecordSettings
                {
                    Url = service.ExternalUrl,
                    SaveMapping = false,
                    SaveMappingToFile = false,
                },
            });

            registry.TryAdd(service.Id, server);
            Log.Information("WireMock started for service {ServiceName} on port {Port}", service.Name, service.Port);
        }
        catch (Exception ex)
        {
            Log.Warning(ex, "Failed to start WireMock for service {ServiceName} on port {Port}", service.Name, service.Port);

            service.Status = ServiceStatus.Stopped;
            db.SystemEvents.Add(new SystemEvent
            {
                Severity = SystemEventSeverity.Error,
                Message = $"Failed to start engine for service '{service.Name}' on port {service.Port}: {ex.Message}",
                ServiceId = service.Id,
            });

            await db.SaveChangesAsync(cancellationToken);
        }
    }

    private async Task TryLoadSeedFileAsync(FishtankDbContext db, CancellationToken cancellationToken)
    {
        var seedFilePath = configuration["FISHTANK_SEED_FILE"];
        if (string.IsNullOrEmpty(seedFilePath))
            return;

        if (!File.Exists(seedFilePath))
        {
            db.SystemEvents.Add(new SystemEvent
            {
                Severity = SystemEventSeverity.Info,
                Message = $"Seed file path configured ({seedFilePath}) but file not found. Startup continues.",
            });
            await db.SaveChangesAsync(cancellationToken);
            Log.Information("Seed file not found at {SeedFilePath}; skipping import", seedFilePath);
            return;
        }

        try
        {
            var json = await File.ReadAllTextAsync(seedFilePath, cancellationToken);
            var entries = System.Text.Json.JsonSerializer.Deserialize<SeedEntry[]>(json,
                new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (entries is null || entries.Length == 0)
                return;

            var mocksRootBase = configuration["FISHTANK_MOCKS_ROOT"] ?? "/app/mocks";

            foreach (var entry in entries)
            {
                var slug = GenerateSlug(entry.Name);
                if (await db.Services.AnyAsync(s => s.Slug == slug, cancellationToken))
                {
                    db.SystemEvents.Add(new SystemEvent
                    {
                        Severity = SystemEventSeverity.Info,
                        Message = $"Seed import: service '{entry.Name}' (slug '{slug}') already exists — skipped.",
                    });
                    continue;
                }

                var service = new Service
                {
                    Name = entry.Name,
                    Slug = slug,
                    Description = entry.Description,
                    ExternalUrl = entry.ExternalUrl,
                    Port = entry.Port,
                    MocksRoot = Path.Combine(mocksRootBase, slug),
                    Tags = entry.Tags ?? [],
                    Status = ServiceStatus.Live,
                };
                db.Services.Add(service);
                await db.SaveChangesAsync(cancellationToken);

                await StartServiceInstanceAsync(db, service, cancellationToken);

                // Only emit a "created" info event if the engine actually started.
                // StartServiceInstanceAsync writes its own error event on failure.
                if (service.Status == ServiceStatus.Live)
                {
                    db.SystemEvents.Add(new SystemEvent
                    {
                        Severity = SystemEventSeverity.Info,
                        Message = $"Seed import: service '{entry.Name}' created on port {entry.Port}.",
                        ServiceId = service.Id,
                    });
                }
            }

            await db.SaveChangesAsync(cancellationToken);
            Log.Information("Seed file import complete from {SeedFilePath}", seedFilePath);
        }
        catch (Exception ex)
        {
            Log.Error(ex, "Failed to process seed file {SeedFilePath}", seedFilePath);
            db.SystemEvents.Add(new SystemEvent
            {
                Severity = SystemEventSeverity.Error,
                Message = $"Failed to process seed file '{seedFilePath}': {ex.Message}",
            });
            await db.SaveChangesAsync(cancellationToken);
        }
    }

    private static string GenerateSlug(string name)
    {
        var slug = name.ToLowerInvariant().Replace(" ", "-");
        slug = System.Text.RegularExpressions.Regex.Replace(slug, "[^a-z0-9-]", "");
        return slug.Trim('-');
    }

    private sealed record SeedEntry(
        string Name,
        string ExternalUrl,
        int Port,
        string? Description,
        string[]? Tags);
}
