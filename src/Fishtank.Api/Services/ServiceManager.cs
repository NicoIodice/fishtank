using System.Text.RegularExpressions;
using Fishtank.Api.Data;
using Fishtank.Api.Data.Entities;
using Fishtank.Api.Engine;
using Fishtank.Api.Exceptions;
using Fishtank.Api.Hubs;
using Fishtank.Api.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Serilog;
using WireMock.Handlers;
using WireMock.Server;
using WireMock.Settings;

namespace Fishtank.Api.Services;

public partial class ServiceManager(
    FishtankDbContext db,
    IServicesRegistry registry,
    ISystemEventService systemEvents,
    IConfiguration configuration,
    IWireMockServerFactory wireMockFactory,
    IHubContext<ServicesHub> servicesHub) : IServiceManager
{
    private const int PortMin = 30100;
    private const int PortMax = 30199;

    public async Task<ServiceDto> CreateAsync(CreateServiceRequest request, CancellationToken ct = default)
    {
        ValidateRequest(request.Name, request.ExternalUrl, request.Port);

        var slug = GenerateSlug(request.Name);
        if (slug.Length < 2)
            throw new ValidationException("SERVICE_NAME_INVALID", "Service name produces an invalid slug (too short after sanitization).");

        if (await db.Services.AnyAsync(s => s.Slug == slug && s.DeletedAt == null, ct))
            throw new ValidationException("SERVICE_SLUG_CONFLICT", $"A service with slug '{slug}' already exists.");

        if (await db.Services.AnyAsync(s => s.Port == request.Port && s.DeletedAt == null, ct))
            throw new ValidationException("SERVICE_PORT_CONFLICT", $"Port {request.Port} is already assigned to another service.");

        var mocksRoot = GetMocksRoot(slug);

        var service = new Service
        {
            Name = request.Name,
            Slug = slug,
            Description = request.Description,
            ExternalUrl = request.ExternalUrl,
            Port = request.Port,
            MocksRoot = mocksRoot,
            Tags = request.Tags ?? [],
            Status = ServiceStatus.Live,
        };
        db.Services.Add(service);
        await db.SaveChangesAsync(ct);

        try
        {
            var server = StartWireMock(service);
            if (!registry.TryAdd(service.Id, server))
            {
                // Slot already taken (concurrent request race) — stop the orphaned server
                server.Stop();
                server.Dispose();
            }
        }
        catch (Exception ex)
        {
            Log.Warning(ex, "WireMock failed to start for service {ServiceName} on port {Port}", service.Name, service.Port);
            service.Status = ServiceStatus.Stopped;
            await db.SaveChangesAsync(ct);
            await systemEvents.AddAsync(
                SystemEventSeverity.Error,
                $"Failed to start engine for service '{service.Name}' on port {service.Port}: {ex.Message}",
                service.Id, ct);
        }

        return ToDto(service);
    }

    public async Task<IReadOnlyList<ServiceDto>> ListAsync(CancellationToken ct = default)
    {
        // SQLite doesn't support DateTimeOffset in ORDER BY — sort client-side
        var services = await db.Services
            .Where(s => s.DeletedAt == null)
            .ToListAsync(ct);
        return services.OrderBy(s => s.CreatedAt).Select(s => ToDto(s)).ToList();
    }

    public async Task<ServiceDto> UpdateAsync(Guid id, UpdateServiceRequest request, CancellationToken ct = default)
    {
        var service = await FindActiveServiceAsync(id, ct);

        ValidateRequest(request.Name, request.ExternalUrl, request.Port);

        var newSlug = GenerateSlug(request.Name);
        if (newSlug.Length < 2)
            throw new ValidationException("SERVICE_NAME_INVALID", "Service name produces an invalid slug.");

        var slugChanged = !string.Equals(service.Slug, newSlug, StringComparison.Ordinal);

        if (slugChanged && await db.Services.AnyAsync(
                s => s.Slug == newSlug && s.DeletedAt == null && s.Id != id, ct))
            throw new ValidationException("SERVICE_SLUG_CONFLICT", $"A service with slug '{newSlug}' already exists.");

        if (request.Port != service.Port && await db.Services.AnyAsync(
                s => s.Port == request.Port && s.DeletedAt == null && s.Id != id, ct))
            throw new ValidationException("SERVICE_PORT_CONFLICT", $"Port {request.Port} is already assigned to another service.");

        var oldSlug = service.Slug;
        service.Name = request.Name;
        service.Slug = newSlug;
        service.Description = request.Description;
        service.ExternalUrl = request.ExternalUrl;
        service.Port = request.Port;
        service.Tags = request.Tags ?? [];

        if (slugChanged)
            service.MocksRoot = GetMocksRoot(newSlug);

        await db.SaveChangesAsync(ct);

        return ToDto(service, mocksRootChanged: slugChanged ? true : null);
    }

    public async Task<ServiceDto> StopAsync(Guid id, CancellationToken ct = default)
    {
        var service = await FindActiveServiceAsync(id, ct);

        if (registry.TryRemove(service.Id, out var server) && server is not null)
        {
            try { server.Stop(); server.Dispose(); }
            catch (Exception ex) { Log.Warning(ex, "Error disposing WireMock server for {ServiceId}", id); }
        }

        service.Status = ServiceStatus.Stopped;
        service.IsActive = false;
        await db.SaveChangesAsync(ct);

        await servicesHub.Clients.All.SendAsync(
            "ServiceStatusChanged",
            new { id = service.Id.ToString(), status = "stopped" },
            ct);

        return ToDto(service);
    }

    public async Task<ServiceDto> StartAsync(Guid id, CancellationToken ct = default)
    {
        var service = await FindActiveServiceAsync(id, ct);

        // Stop existing instance if running
        if (registry.TryRemove(service.Id, out var existing) && existing is not null)
        {
            try { existing.Stop(); existing.Dispose(); }
            catch (Exception ex) { Log.Warning(ex, "Error stopping existing WireMock for {ServiceId} before restart", id); }
        }

        try
        {
            var server = StartWireMock(service);
            if (!registry.TryAdd(service.Id, server))
            {
                // Slot already taken — stop the orphaned server
                server.Stop();
                server.Dispose();
            }
            service.Status = ServiceStatus.Live;
        }
        catch (Exception ex)
        {
            Log.Warning(ex, "WireMock failed to start for {ServiceName} on port {Port}", service.Name, service.Port);
            service.Status = ServiceStatus.Stopped;
            await systemEvents.AddAsync(
                SystemEventSeverity.Error,
                $"Failed to restart engine for service '{service.Name}' on port {service.Port}: {ex.Message}",
                service.Id, ct);
        }

        service.IsActive = service.Status == ServiceStatus.Live;
        await db.SaveChangesAsync(ct);

        var broadcastStatus = service.Status == ServiceStatus.Live ? "live" : "stopped";
        await servicesHub.Clients.All.SendAsync(
            "ServiceStatusChanged",
            new { id = service.Id.ToString(), status = broadcastStatus },
            ct);

        return ToDto(service);
    }

    public async Task<int> GetNextPortAsync(CancellationToken ct = default)
    {
        var usedPorts = await db.Services
            .Where(s => s.DeletedAt == null)
            .Select(s => s.Port)
            .ToListAsync(ct);

        for (var port = PortMin; port <= PortMax; port++)
        {
            if (!usedPorts.Contains(port))
                return port;
        }

        throw new ValidationException("SERVICE_PORT_RANGE_EXHAUSTED",
            "All 100 ports in the 30100–30199 range are assigned.");
    }

    // ─── Helpers ───────────────────────────────────────────────────────────────

    private async Task<Service> FindActiveServiceAsync(Guid id, CancellationToken ct)
    {
        var service = await db.Services
            .FirstOrDefaultAsync(s => s.Id == id && s.DeletedAt == null, ct);
        if (service is null)
            throw new NotFoundException("SERVICE_NOT_FOUND", $"Service '{id}' not found.");
        return service;
    }

    private static void ValidateRequest(string name, string externalUrl, int port)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ValidationException("SERVICE_NAME_REQUIRED", "Service name is required.");

        if (name.Length > 64)
            throw new ValidationException("SERVICE_NAME_TOO_LONG", "Service name must not exceed 64 characters.");

        if (HasEmoji(name))
            throw new ValidationException("SERVICE_NAME_INVALID", "Service name must not contain emoji.");

        if (port < PortMin || port > PortMax)
            throw new ValidationException("SERVICE_PORT_OUT_OF_RANGE",
                $"Port must be between {PortMin} and {PortMax}. Received: {port}.");

        if (!externalUrl.StartsWith("http://", StringComparison.OrdinalIgnoreCase)
            && !externalUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            throw new ValidationException("SERVICE_URL_INVALID",
                "ExternalUrl must start with http:// or https://.");

        // Guard against loopback and cloud-metadata SSRF targets.
        // Private/internal networks (10.x, 192.168.x, 172.16-31.x) are intentionally
        // allowed because operators legitimately proxy to internal services.
        if (Uri.TryCreate(externalUrl, UriKind.Absolute, out var uri))
        {
            var host = uri.Host;
            if (host.Equals("localhost", StringComparison.OrdinalIgnoreCase)
                || host == "127.0.0.1"
                || host == "::1"
                || host == "169.254.169.254"    // AWS/Azure/GCP metadata
                || host == "100.100.100.200")   // Alibaba metadata
                throw new ValidationException("SERVICE_URL_INVALID",
                    "ExternalUrl must not target loopback or cloud-metadata addresses.");
        }
    }

    private static bool HasEmoji(string text)
    {
        // Detect emoji via Unicode categories covering Emoticons and Supplemental Symbols blocks
        return text.EnumerateRunes().Any(r =>
            r.Value >= 0x1F300 && r.Value <= 0x1FAFF ||
            r.Value >= 0x2600 && r.Value <= 0x27BF ||
            r.Value >= 0xFE00 && r.Value <= 0xFE0F);
    }

    private static string GenerateSlug(string name)
    {
        var slug = name.ToLowerInvariant().Replace(" ", "-");
        slug = SlugCleanupRegex().Replace(slug, "");
        return slug.Trim('-');
    }

    private string GetMocksRoot(string slug)
    {
        var mocksRootBase = configuration["FISHTANK_MOCKS_ROOT"] ?? "/app/mocks";
        return Path.Combine(mocksRootBase, slug);
    }

    private WireMockServer StartWireMock(Service service) =>
        wireMockFactory.Start(new WireMockServerSettings
        {
            Port = service.Port,
            ReadStaticMappings = true,
            WatchStaticMappings = false,
            WatchStaticMappingsInSubdirectories = false,
            FileSystemHandler = new LocalFileSystemHandler(service.MocksRoot),
            ProxyAndRecordSettings = new ProxyAndRecordSettings
            {
                Url = service.ExternalUrl,
                SaveMapping = false,
                SaveMappingToFile = false,
            },
        });

    private static ServiceDto ToDto(Service s, bool? mocksRootChanged = null) =>
        new(s.Id, s.Name, s.Slug, s.Description, s.ExternalUrl, s.Port,
            s.MocksRoot, s.Status == ServiceStatus.Live ? "live" : "stopped",
            s.IsActive, s.Tags, s.CreatedAt,
            CountMockFiles(s.MocksRoot), mocksRootChanged);

    private static int CountMockFiles(string mocksRoot)
    {
        try
        {
            if (!Directory.Exists(mocksRoot)) return 0;
            return Directory.GetFiles(mocksRoot, "*.json", SearchOption.TopDirectoryOnly).Length;
        }
        catch
        {
            return 0;
        }
    }

    [GeneratedRegex("[^a-z0-9-]")]
    private static partial Regex SlugCleanupRegex();
}
