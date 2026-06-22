using Fishtank.Api.Data.Entities;

namespace Fishtank.Api.Services;

public interface ISystemEventService
{
    Task AddAsync(
        SystemEventSeverity severity,
        string message,
        Guid? serviceId = null,
        CancellationToken ct = default);
}
