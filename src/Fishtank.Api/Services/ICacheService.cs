using Fishtank.Api.Models;

namespace Fishtank.Api.Services;

public interface ICacheService
{
    Task<IReadOnlyList<ServiceCacheDto>> GetAllAsync(CancellationToken ct = default);
    Task ClearAsync(Guid serviceId, CancellationToken ct = default);
    Task ClearAllAsync(CancellationToken ct = default);
}
