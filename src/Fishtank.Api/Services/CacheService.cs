using Fishtank.Api.Data;
using Fishtank.Api.Engine;
using Fishtank.Api.Exceptions;
using Fishtank.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Fishtank.Api.Services;

public class CacheService(FishtankDbContext db, IServicesRegistry registry) : ICacheService
{
    public async Task<IReadOnlyList<ServiceCacheDto>> GetAllAsync(CancellationToken ct = default)
    {
        // SQLite doesn't support DateTimeOffset in ORDER BY — sort client-side (same as ServiceManager.ListAsync)
        var services = await db.Services
            .Where(s => s.DeletedAt == null)
            .ToListAsync(ct);

        return services
            .OrderBy(s => s.CreatedAt)
            .Select(s =>
            {
                var entryCount = 0;
                var estimatedBytes = 0L;

                if (registry.TryGet(s.Id, out var server) && server is not null)
                {
                    entryCount = server.Mappings.Count();
                    estimatedBytes = EstimateSize(s.MocksRoot);
                }

                return new ServiceCacheDto(s.Id, s.Name, s.Slug, entryCount, estimatedBytes);
            })
            .ToList();
    }

    public async Task ClearAsync(Guid serviceId, CancellationToken ct = default)
    {
        var service = await db.Services
            .FirstOrDefaultAsync(s => s.Id == serviceId && s.DeletedAt == null, ct)
            ?? throw new NotFoundException("SERVICE_NOT_FOUND", $"Service '{serviceId}' not found.");

        if (registry.TryGet(service.Id, out var server) && server is not null)
        {
            server.ResetMappings();
            server.ReadStaticMappings();
        }
        // If service is not in the registry (stopped), no in-memory cache to clear — no-op
    }

    public Task ClearAllAsync(CancellationToken ct = default)
    {
        foreach (var server in registry.GetAll().Values)
        {
            server.ResetMappings();
            server.ReadStaticMappings();
        }

        return Task.CompletedTask;
    }

    private static long EstimateSize(string mocksRoot)
    {
        try
        {
            return Directory
                .EnumerateFiles(mocksRoot, "*.json", SearchOption.TopDirectoryOnly)
                .Sum(f => new FileInfo(f).Length);
        }
        catch
        {
            return 0;
        }
    }
}
