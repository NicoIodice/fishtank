using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Policy;

namespace Fishtank.Api.Middleware;

/// <summary>
/// Custom authorization middleware result handler that returns JSON responses
/// for authorization failures (403 Forbidden) instead of empty responses.
/// Required for Story 5.1 Admin Console API tests.
/// </summary>
public class JsonAuthorizationMiddlewareResultHandler : IAuthorizationMiddlewareResultHandler
{
    private readonly AuthorizationMiddlewareResultHandler _defaultHandler = new();

    public async Task HandleAsync(
        RequestDelegate next,
        HttpContext context,
        AuthorizationPolicy policy,
        PolicyAuthorizationResult authorizeResult)
    {
        // If authorization succeeded or failed with non-403, use default behavior
        if (authorizeResult.Succeeded || authorizeResult.Forbidden == false)
        {
            await _defaultHandler.HandleAsync(next, context, policy, authorizeResult);
            return;
        }

        // Authorization failed (403 Forbidden) — return JSON response
        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsJsonAsync(new
        {
            success = false,
            error = new
            {
                code = "ADMIN_FORBIDDEN",
                message = "Forbidden"
            }
        });
    }
}
