using Fishtank.Api.Engine;
using Fishtank.Api.Hubs;
using Fishtank.Api.Models;
using Microsoft.AspNetCore.SignalR;

namespace Fishtank.Api.Services;

/// <summary>
/// Scoped service that stores activity rows and broadcasts them to SignalR clients.
/// </summary>
public class ActivityService(
    IActivityStore store,
    IHubContext<ActivityHub> hub) : IActivityService
{
    public async Task CaptureAsync(ActivityRow row)
    {
        store.Add(row.ServiceId, row);
        var dto = MapToDto(row);
        await hub.Clients.All.SendAsync("ActivityRowAdded", dto);
    }

    public Task<IReadOnlyList<ActivityRowDto>> QueryAsync(
        Guid? serviceId, string? type, string? search, int skip, int take)
    {
        IEnumerable<ActivityRow> rows = store.GetAll(serviceId);

        if (type is not null && Enum.TryParse<ActivityType>(type, ignoreCase: true, out var activityType))
            rows = rows.Where(r => r.Type == activityType);

        if (search is not null)
            rows = rows.Where(r =>
                r.UrlPath.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                r.Method.Contains(search, StringComparison.OrdinalIgnoreCase));

        IReadOnlyList<ActivityRowDto> result = rows
            .Skip(skip)
            .Take(take)
            .Select(MapToDto)
            .ToList()
            .AsReadOnly();

        return Task.FromResult(result);
    }

    public Task ClearAsync()
    {
        store.Clear();
        return Task.CompletedTask;
    }

    private static ActivityRowDto MapToDto(ActivityRow row) => new()
    {
        Id = row.Id,
        Timestamp = row.Timestamp,
        Method = row.Method,
        UrlPath = row.UrlPath,
        StatusCode = row.StatusCode,
        Type = row.Type.ToString(),
        ServiceId = row.ServiceId,
        ServiceName = row.ServiceName,
        ServicePort = row.ServicePort,
        DurationMs = row.DurationMs,
        RequestHeaders = row.RequestHeaders,
        RequestBody = row.RequestBody,
        ResponseHeaders = row.ResponseHeaders,
        ResponseBody = row.ResponseBody,
    };
}
