using Fishtank.Api.Models;

namespace Fishtank.Api.Services;

public interface IServiceManager
{
    Task<ServiceDto> CreateAsync(CreateServiceRequest request, CancellationToken ct = default);
    Task<IReadOnlyList<ServiceDto>> ListAsync(CancellationToken ct = default);
    Task<ServiceDto> UpdateAsync(Guid id, UpdateServiceRequest request, CancellationToken ct = default);
    Task<ServiceDto> StopAsync(Guid id, CancellationToken ct = default);
    Task<ServiceDto> StartAsync(Guid id, CancellationToken ct = default);
    Task<int> GetNextPortAsync(CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
}
