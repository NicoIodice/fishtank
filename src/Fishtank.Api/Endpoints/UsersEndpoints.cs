using Fishtank.Api.Exceptions;
using Fishtank.Api.Models;
using Fishtank.Api.Services;

namespace Fishtank.Api.Endpoints;

public static class UsersEndpoints
{
    public static void MapUsersEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users")
            .RequireAuthorization(policy => policy.RequireRole("Admin"))
            .WithTags("Users");

        group.MapGet("/", GetAllUsersAsync);
        group.MapPost("/", CreateUserAsync);
        group.MapPut("/{id:guid}/deactivate", DeactivateUserAsync);
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
        IUserManagementService userService,
        CancellationToken ct)
    {
        try
        {
            var user = await userService.CreateUserAsync(request.Username, request.Password, ct);
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
        IUserManagementService userService,
        CancellationToken ct)
    {
        try
        {
            var user = await userService.DeactivateUserAsync(id, ct);
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
