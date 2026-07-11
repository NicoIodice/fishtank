using Fishtank.Api.Services;

namespace Fishtank.Api.Endpoints;

public static class SystemEventsEndpoints
{
    public static void MapSystemEventsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/events")
            .RequireAuthorization()
            .WithTags("Events");

        group.MapGet("", ListAsync)
            .WithSummary("List system events with optional severity filter");
        group.MapGet("unread-count", UnreadCountAsync)
            .WithSummary("Get count of unread system events");
        group.MapPost("{id:guid}/read", MarkReadAsync)
            .WithSummary("Mark a system event as read");
        group.MapPost("read-all", MarkAllReadAsync)
            .WithSummary("Mark all system events as read");
        group.MapDelete("", ClearAllAsync)
            .WithSummary("Clear all system events with optional severity filter");
    }

    private static SystemEventGroup ParseGroup(string? severity) =>
        string.Equals(severity, "info", StringComparison.OrdinalIgnoreCase)
            ? SystemEventGroup.Info
            : SystemEventGroup.WarningsErrors; // default = warnings-errors

    private static async Task<IResult> ListAsync(
        ISystemEventService svc, string? severity, int? skip, int? take, CancellationToken ct)
    {
        var page = await svc.ListAsync(
            ParseGroup(severity), Math.Max(0, skip ?? 0), Math.Clamp(take ?? 20, 1, 100), ct);
        return Results.Ok(ApiResponse.Ok(page));
    }

    private static async Task<IResult> UnreadCountAsync(ISystemEventService svc, CancellationToken ct)
        => Results.Ok(ApiResponse.Ok(new { count = await svc.GetUnreadCountAsync(ct) }));

    private static async Task<IResult> MarkReadAsync(ISystemEventService svc, Guid id, CancellationToken ct)
        => await svc.MarkReadAsync(id, ct)
            ? Results.Ok(ApiResponse.Ok(new { id }))
            : Results.NotFound(ApiResponse.Fail("SYSTEM_EVENT_NOT_FOUND", $"System event '{id}' not found."));

    private static async Task<IResult> MarkAllReadAsync(ISystemEventService svc, CancellationToken ct)
        => Results.Ok(ApiResponse.Ok(new { marked = await svc.MarkAllReadAsync(ct) }));

    private static async Task<IResult> ClearAllAsync(ISystemEventService svc, string? severity, CancellationToken ct)
    {
        await svc.ClearAllAsync(ParseGroup(severity), ct);
        return Results.Ok(ApiResponse.Ok(new { cleared = true }));
    }
}
