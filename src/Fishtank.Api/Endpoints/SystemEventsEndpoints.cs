using Fishtank.Api.Data;
using Fishtank.Api.Endpoints;
using Microsoft.EntityFrameworkCore;

namespace Fishtank.Api.Endpoints;

public static class SystemEventsEndpoints
{
    public static void MapSystemEventsEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/system-events", ListSystemEventsAsync).RequireAuthorization();
    }

    private static async Task<IResult> ListSystemEventsAsync(
        FishtankDbContext db,
        CancellationToken ct)
    {
        // SQLite doesn't support DateTimeOffset in ORDER BY — sort client-side
        var events = (await db.SystemEvents.ToListAsync(ct))
            .OrderByDescending(e => e.CreatedAt)
            .Select(e => new
            {
                e.Id,
                Severity = e.Severity.ToString().ToLowerInvariant(),
                e.Message,
                e.ServiceId,
                e.CreatedAt,
                e.IsRead,
            })
            .ToList();

        return Results.Ok(ApiResponse.Ok(events));
    }
}
