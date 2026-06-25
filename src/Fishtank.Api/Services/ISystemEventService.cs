using Fishtank.Api.Data.Entities;
using Fishtank.Api.Models;

namespace Fishtank.Api.Services;

public enum SystemEventGroup { WarningsErrors, Info }

public interface ISystemEventService
{
    Task AddAsync(
        SystemEventSeverity severity,
        string message,
        Guid? serviceId = null,
        CancellationToken ct = default);

    Task<SystemEventPageDto> ListAsync(
        SystemEventGroup group,
        int skip,
        int take,
        CancellationToken ct = default);

    Task<bool> MarkReadAsync(Guid id, CancellationToken ct = default);
    Task<int> MarkAllReadAsync(CancellationToken ct = default);   // warnings+errors only
    Task<int> GetUnreadCountAsync(CancellationToken ct = default); // warnings+errors only
    Task ClearAllAsync(SystemEventGroup group, CancellationToken ct = default);
}
