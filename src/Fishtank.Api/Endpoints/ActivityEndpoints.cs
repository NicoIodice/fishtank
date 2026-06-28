using Fishtank.Api.Data;
using Fishtank.Api.Engine;
using Fishtank.Api.Models;
using Fishtank.Api.Services;

namespace Fishtank.Api.Endpoints;

public static class ActivityEndpoints
{
    public static void MapActivityEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/activity", GetActivityAsync).RequireAuthorization();
        app.MapDelete("/api/activity", DeleteActivityAsync).RequireAuthorization();
    }

    private static async Task<IResult> GetActivityAsync(
        IActivityService activityService,
        IActivityStore activityStore,
        FishtankDbContext db,
        Guid? serviceId = null,
        string? type = null,
        string? search = null,
        int skip = 0,
        int take = 50)
    {
        if (type is not null && !Enum.TryParse<ActivityType>(type, ignoreCase: true, out _))
            return Results.BadRequest(ApiResponse.Fail(
                "ACTIVITY_INVALID_TYPE",
                $"Invalid type '{type}'. Must be 'Mocked' or 'Proxied'."));

        // Validate serviceId: 404 only if neither the service exists in the DB
        // nor any captured activity rows exist for that serviceId in the store.
        // This allows filtering by serviceIds that have rows but whose service
        // entries may have been removed (or seeded directly via the store).
        if (serviceId.HasValue)
        {
            var serviceExists = await db.Services.FindAsync(serviceId.Value) is not null;
            if (!serviceExists)
            {
                var hasRows = activityStore.GetAll(serviceId.Value).Count > 0;
                if (!hasRows)
                    return Results.NotFound(ApiResponse.Fail(
                        "ACTIVITY_SERVICE_NOT_FOUND",
                        $"Service '{serviceId}' not found."));
            }
        }

        skip = Math.Max(skip, 0);
        take = Math.Min(Math.Max(take, 1), 200);

        var rows = await activityService.QueryAsync(serviceId, type, search, skip, take);
        return Results.Ok(ApiResponse.Ok(rows));
    }

    private static async Task<IResult> DeleteActivityAsync(IActivityService activityService)
    {
        await activityService.ClearAsync();
        return Results.Ok(ApiResponse.Ok<object?>(null));
    }
}
