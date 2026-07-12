using Fishtank.Api.Exceptions;
using Fishtank.Api.Models;
using Fishtank.Api.Services;
using System.Security.Claims;

namespace Fishtank.Api.Endpoints;

public static class UsersEndpoints
{
    public static void MapUsersEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users")
            .RequireAuthorization(policy => policy.RequireRole("Admin"))
            .WithTags("Users");

        group.MapGet("/", GetAllUsersAsync)
            .WithSummary("List all users (Admin only)");
        group.MapPost("/", CreateUserAsync)
            .WithSummary("Create a new user (Admin only)");
        group.MapPut("/{id:guid}/deactivate", DeactivateUserAsync)
            .WithSummary("Deactivate a user account (Admin only)");
    }

    private static async Task<IResult> GetAllUsersAsync(
        IUserManagementService userService,
        CancellationToken ct)
    {
        var users = await userService.GetAllUsersAsync(ct);
        return Results.Ok(ApiResponse.Ok(users));
    }

    private static async Task<IResult> CreateUserAsync(
        CreateUserRequest request,
        HttpContext httpContext,
        IUserManagementService userService,
        CancellationToken ct)
    {
        // Extract actorId from JWT claims
        var userIdClaim = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdClaim, out var actorId))
        {
            return Results.Json(
                ApiResponse.Fail("AUTH_UNAUTHORIZED", "Not authenticated."),
                statusCode: StatusCodes.Status401Unauthorized);
        }

        try
        {
            var user = await userService.CreateUserAsync(request.Username, request.Password, actorId, ct);
            return Results.Ok(ApiResponse.Ok(user));
        }
        catch (ValidationException ex)
        {
            return Results.BadRequest(ApiResponse.Fail(ex.ErrorCode, ex.Message));
        }
        catch (ConflictException ex)
        {
            return Results.Conflict(ApiResponse.Fail(ex.ErrorCode, ex.Message));
        }
    }

    private static async Task<IResult> DeactivateUserAsync(
        Guid id,
        HttpContext httpContext,
        IUserManagementService userService,
        CancellationToken ct)
    {
        // Extract actorId from JWT claims
        var userIdClaim = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdClaim, out var actorId))
        {
            return Results.Json(
                ApiResponse.Fail("AUTH_UNAUTHORIZED", "Not authenticated."),
                statusCode: StatusCodes.Status401Unauthorized);
        }

        try
        {
            var user = await userService.DeactivateUserAsync(id, actorId, ct);
            return Results.Ok(ApiResponse.Ok(user));
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
