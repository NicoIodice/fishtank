using Fishtank.Api.Exceptions;
using Fishtank.Api.Services;

namespace Fishtank.Api.Endpoints;

public static class CacheEndpoints
{
    public static void MapCacheEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/cache", GetCachesAsync)
            .RequireAuthorization()
            .WithTags("Cache")
            .WithSummary("List all service caches");
        app.MapDelete("/api/cache/{id:guid}", ClearCacheAsync)
            .RequireAuthorization()
            .WithTags("Cache")
            .WithSummary("Clear cache for a specific service");
        app.MapDelete("/api/cache", ClearAllCachesAsync)
            .RequireAuthorization()
            .WithTags("Cache")
            .WithSummary("Clear all service caches");
    }

    private static async Task<IResult> GetCachesAsync(ICacheService cacheService, CancellationToken ct)
    {
        var list = await cacheService.GetAllAsync(ct);
        return Results.Ok(ApiResponse.Ok(list));
    }

    private static async Task<IResult> ClearCacheAsync(Guid id, ICacheService cacheService, CancellationToken ct)
    {
        try
        {
            await cacheService.ClearAsync(id, ct);
            return Results.Ok(ApiResponse.Ok<object?>(null));
        }
        catch (NotFoundException ex)
        {
            return Results.NotFound(ApiResponse.Fail(ex.ErrorCode, ex.Message));
        }
    }

    private static async Task<IResult> ClearAllCachesAsync(ICacheService cacheService, CancellationToken ct)
    {
        await cacheService.ClearAllAsync(ct);
        return Results.Ok(ApiResponse.Ok<object?>(null));
    }
}
