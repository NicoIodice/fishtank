using Fishtank.Api.Exceptions;
using Fishtank.Api.Services;

namespace Fishtank.Api.Endpoints;

public static class AdminEndpoints
{
    public static void MapAdminEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/admin")
            .RequireAuthorization(policy => policy.RequireRole("Admin"))
            .WithTags("Admin");

        group.MapGet("toggles", GetTogglesAsync);
        group.MapPut("toggles/{name}", SetToggleAsync);
    }

    private static async Task<IResult> GetTogglesAsync(
        IFeatureToggleService toggleService,
        CancellationToken ct)
    {
        var toggles = await toggleService.GetAllTogglesAsync(ct);
        return Results.Ok(ApiResponse.Ok(toggles));
    }

    private record SetToggleRequest(bool Enabled);

    private static async Task<IResult> SetToggleAsync(
        string name,
        SetToggleRequest request,
        IFeatureToggleService toggleService,
        CancellationToken ct)
    {
        try
        {
            var toggle = await toggleService.SetToggleAsync(name, request.Enabled, ct);
            return Results.Ok(ApiResponse.Ok(toggle));
        }
        catch (NotFoundException ex)
        {
            return Results.NotFound(ApiResponse.Fail(ex.ErrorCode, ex.Message));
        }
        catch (ConflictException ex)
        {
            return Results.Conflict(ApiResponse.Fail(ex.ErrorCode, ex.Message));
        }
    }
}
