using Fishtank.Api.Data;
using Fishtank.Api.Data.Entities;

namespace Fishtank.Api.Services;

public class SystemEventService(FishtankDbContext db) : ISystemEventService
{
    public async Task AddAsync(
        SystemEventSeverity severity,
        string message,
        Guid? serviceId = null,
        CancellationToken ct = default)
    {
        db.SystemEvents.Add(new SystemEvent
        {
            Severity = severity,
            Message = message,
            ServiceId = serviceId,
        });
        await db.SaveChangesAsync(ct);
    }
}
