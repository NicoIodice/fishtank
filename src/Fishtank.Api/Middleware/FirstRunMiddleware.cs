using Fishtank.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Fishtank.Api.Middleware;

/// <summary>
/// Blocks all routes except /health, /api/auth/setup, and /openapi/* when
/// no admin account exists (fresh-instance first-run gate). Returns 401 with
/// AUTH_SETUP_REQUIRED until setup completes. (AC-1)
/// </summary>
public class FirstRunMiddleware(RequestDelegate next)
{
    private static readonly HashSet<string> _permittedPaths =
        new(StringComparer.OrdinalIgnoreCase)
        {
            "/api/auth/setup",
            "/health",
        };

    public async Task InvokeAsync(HttpContext context, FishtankDbContext db)
    {
        var path = context.Request.Path.Value ?? string.Empty;

        var isPermitted = _permittedPaths.Contains(path)
            || path.StartsWith("/openapi", StringComparison.OrdinalIgnoreCase);

        if (!isPermitted && !await db.Users.AnyAsync())
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsJsonAsync(new
            {
                success = false,
                error = new
                {
                    code = "AUTH_SETUP_REQUIRED",
                    message = "No admin account exists. POST /api/auth/setup to create one.",
                },
            });
            return;
        }

        await next(context);
    }
}
