using Fishtank.Api.Data;
using Fishtank.Api.Data.Entities;
using Fishtank.Api.Hubs;
using Fishtank.Api.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace Fishtank.Api.Services;

public class SystemEventService(
    FishtankDbContext db,
    IHubContext<EventsHub> eventsHub) : ISystemEventService
{
    private static readonly SystemEventSeverity[] WarnErr =
        [SystemEventSeverity.Warning, SystemEventSeverity.Error];

    public async Task AddAsync(
        SystemEventSeverity severity,
        string message,
        Guid? serviceId = null,
        CancellationToken ct = default)
    {
        var entity = new SystemEvent
        {
            Severity = severity,
            Message = message,
            ServiceId = serviceId,
        };
        db.SystemEvents.Add(entity);
        await db.SaveChangesAsync(ct);

        // Bell only reacts to warnings + errors (DESIGN.md line 462)
        if (severity is SystemEventSeverity.Warning or SystemEventSeverity.Error)
        {
            var serviceName = serviceId is null
                ? null
                : await db.Services.Where(s => s.Id == serviceId)
                    .Select(s => s.Name).FirstOrDefaultAsync(ct);

            var dto = new SystemEventDto(
                entity.Id,
                severity.ToString().ToLowerInvariant(),
                message,
                serviceId,
                serviceName,
                entity.CreatedAt,
                entity.IsRead);

            await eventsHub.Clients.All.SendAsync("SystemEventCreated", dto, ct);
            await BroadcastUnreadCountAsync(ct);
        }
    }

    public async Task<SystemEventPageDto> ListAsync(
        SystemEventGroup group,
        int skip,
        int take,
        CancellationToken ct = default)
    {
        var severities = SeveritiesFor(group);

        // SQLite can't ORDER BY DateTimeOffset — materialise then sort/page in memory.
        // CreatedAt (DateTimeOffset.UtcNow) has coarse resolution, so two events created
        // in the same tick can otherwise sort nondeterministically. Id is a random Guid
        // (not monotonic), so it cannot restore chronological order, but it IS a stable,
        // deterministic tiebreaker — which is the property pagination/ordering require so
        // the same row never appears on two pages or flips order between calls.
        var all = (await db.SystemEvents
                .Where(e => severities.Contains(e.Severity))
                .Include(e => e.Service)
                .ToListAsync(ct))
            .OrderByDescending(e => e.CreatedAt)
            .ThenByDescending(e => e.Id)
            .ToList();

        var page = all.Skip(skip).Take(take)
            .Select(e => new SystemEventDto(
                e.Id,
                e.Severity.ToString().ToLowerInvariant(),
                e.Message,
                e.ServiceId,
                e.Service?.Name,
                e.CreatedAt,
                e.IsRead))
            .ToList();

        return new SystemEventPageDto(page, all.Count, skip + page.Count < all.Count);
    }

    public async Task<bool> MarkReadAsync(Guid id, CancellationToken ct = default)
    {
        var e = await db.SystemEvents.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (e is null) return false;
        if (!e.IsRead)
        {
            e.IsRead = true;
            await db.SaveChangesAsync(ct);
            await BroadcastUnreadCountAsync(ct);
        }
        return true;
    }

    public async Task<int> MarkAllReadAsync(CancellationToken ct = default)
    {
        var unread = await db.SystemEvents
            .Where(e => WarnErr.Contains(e.Severity) && !e.IsRead).ToListAsync(ct);
        foreach (var e in unread) e.IsRead = true;
        if (unread.Count > 0)
        {
            await db.SaveChangesAsync(ct);
            await BroadcastUnreadCountAsync(ct);
        }
        return unread.Count;
    }

    public Task<int> GetUnreadCountAsync(CancellationToken ct = default) =>
        db.SystemEvents.CountAsync(e => WarnErr.Contains(e.Severity) && !e.IsRead, ct);

    public async Task ClearAllAsync(SystemEventGroup group, CancellationToken ct = default)
    {
        var severities = SeveritiesFor(group);
        var toRemove = await db.SystemEvents
            .Where(e => severities.Contains(e.Severity)).ToListAsync(ct);
        db.SystemEvents.RemoveRange(toRemove);
        await db.SaveChangesAsync(ct);
        if (group == SystemEventGroup.WarningsErrors) await BroadcastUnreadCountAsync(ct);
    }

    private async Task BroadcastUnreadCountAsync(CancellationToken ct)
    {
        var count = await GetUnreadCountAsync(ct);
        await eventsHub.Clients.All.SendAsync("UnreadCountChanged", new { count }, ct);
    }

    private static SystemEventSeverity[] SeveritiesFor(SystemEventGroup g) =>
        g == SystemEventGroup.WarningsErrors ? WarnErr : [SystemEventSeverity.Info];
}
