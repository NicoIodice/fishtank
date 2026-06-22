using Fishtank.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Fishtank.Api.Middleware;

/// <summary>
/// Blocks API routes (except /api/auth/setup, /api/setup/status, /health, /openapi/*) when
/// no admin account exists (fresh-instance first-run gate). Returns 401 with
/// AUTH_SETUP_REQUIRED until setup completes. (AC-1)
/// Non-API paths (static files, SPA routes) are always allowed through so the
/// React SPA can load and display the first-run setup screen.
/// </summary>
public class FirstRunMiddleware(RequestDelegate next)
{
    private static readonly HashSet<string> _permittedApiPaths =
        new(StringComparer.OrdinalIgnoreCase)
        {
            "/api/auth/setup",
            "/api/setup/status",
            "/health",
        };

    public async Task InvokeAsync(HttpContext context, FishtankDbContext db)
    {
        var path = context.Request.Path.Value ?? string.Empty;

        // Only gate /api/* paths — let static files and SPA routes through
        // so the React SPA can load and show the first-run setup screen.
        var isApiPath = path.StartsWith("/api/", StringComparison.OrdinalIgnoreCase)
            || path.Equals("/api", StringComparison.OrdinalIgnoreCase);

        if (!isApiPath)
        {
            await next(context);
            return;
        }

        var isPermitted = _permittedApiPaths.Contains(path)
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
