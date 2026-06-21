using System.Security.Claims;
using Fishtank.Api.Data;
using Fishtank.Api.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Fishtank.Api.Endpoints;

public static class AuthEndpoints
{
    private const string CookieName = "fishtank_auth";

    public static void MapAuthEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/auth");

        // POST /api/auth/setup — creates the one-and-only admin account
        group.MapPost("/setup", SetupHandler);

        // GET /api/auth/me — returns current user info; used by ProtectedRoute
        group.MapGet("/me", MeHandler)
             .RequireAuthorization();

        // POST /api/auth/login — rate limited (AC-7)
        group.MapPost("/login", LoginHandler)
             .RequireRateLimiting("login");

        // POST /api/auth/logout — requires authentication
        group.MapPost("/logout", LogoutHandler)
             .RequireAuthorization();

        // PUT /api/auth/change-password — requires authentication
        group.MapPut("/change-password", ChangePasswordHandler)
             .RequireAuthorization();

        // GET /api/setup/status — returns needsSetup flag; permitted before first-run
        app.MapGet("/api/setup/status", async (FishtankDbContext db) =>
        {
            var needsSetup = !await db.Users.AnyAsync();
            return Results.Json(new { success = true, data = new { needsSetup } });
        });
    }

    private static async Task<IResult> SetupHandler(
        SetupRequest req,
        IAuthService auth,
        IServerConfigService configService,
        HttpContext ctx)
    {
        if (req.Password?.Length < 12)
            return Results.Json(
                ApiResponse.Fail("AUTH_PASSWORD_TOO_SHORT",
                    "Password must be at least 12 characters."),
                statusCode: StatusCodes.Status400BadRequest);

        if (string.IsNullOrWhiteSpace(req.Username) || string.IsNullOrWhiteSpace(req.Password))
            return Results.Json(
                ApiResponse.Fail("VALIDATION_ERROR", "Username and password are required."),
                statusCode: StatusCodes.Status400BadRequest);

        var result = await auth.SetupAsync(req.Username, req.Password);

        return result.Status switch
        {
            SetupStatus.AlreadySetup => Results.Json(
                ApiResponse.Fail("AUTH_ALREADY_SETUP",
                    "Admin account already exists. Setup is a one-time operation."),
                statusCode: StatusCodes.Status409Conflict),

            SetupStatus.PasswordTooShort => Results.Json(
                ApiResponse.Fail("AUTH_PASSWORD_TOO_SHORT",
                    "Password must be at least 12 characters."),
                statusCode: StatusCodes.Status400BadRequest),

            SetupStatus.Success => await IssueTokenAndRespond(
                result.User!, auth, configService, ctx,
                new { username = result.User!.Username, role = result.User.Role.ToString() }),

            _ => Results.StatusCode(StatusCodes.Status500InternalServerError),
        };
    }

    private static async Task<IResult> MeHandler(HttpContext ctx, FishtankDbContext db)
    {
        var userIdClaim = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdClaim, out var userId))
            return Results.Json(
                ApiResponse.Fail("AUTH_UNAUTHORIZED", "Not authenticated."),
                statusCode: StatusCodes.Status401Unauthorized);

        var user = await db.Users.FindAsync(userId);
        if (user is null || !user.IsActive)
            return Results.Json(
                ApiResponse.Fail("AUTH_UNAUTHORIZED", "Not authenticated."),
                statusCode: StatusCodes.Status401Unauthorized);

        return Results.Json(ApiResponse.Ok(new
        {
            userId = user.Id,
            username = user.Username,
            role = user.Role.ToString(),
            forcePasswordChange = user.ForcePasswordChange,
        }));
    }

    private static async Task<IResult> LoginHandler(
        LoginRequest req,
        IAuthService auth,
        IServerConfigService configService,
        HttpContext ctx)
    {
        if (string.IsNullOrWhiteSpace(req.Username) || string.IsNullOrWhiteSpace(req.Password))
            return Results.Json(
                ApiResponse.Fail("VALIDATION_ERROR", "Invalid credentials."),
                statusCode: StatusCodes.Status401Unauthorized);

        var result = await auth.LoginAsync(req.Username, req.Password);

        if (result.Status != LoginStatus.Success)
            return Results.Json(
                ApiResponse.Fail("AUTH_INVALID_CREDENTIALS",
                    "Invalid credentials."),  // Generic — does not reveal which field failed (AC-5)
                statusCode: StatusCodes.Status401Unauthorized);

        return await IssueTokenAndRespond(
            result.User!, auth, configService, ctx,
            new
            {
                username = result.User!.Username,
                role = result.User.Role.ToString(),
                forcePasswordChange = result.User.ForcePasswordChange,
            });
    }

    private static async Task<IResult> LogoutHandler(
        IAuthService auth,
        ClaimsPrincipal principal,
        HttpContext ctx)
    {
        var userIdClaim = principal.FindFirstValue(ClaimTypes.NameIdentifier);
        if (Guid.TryParse(userIdClaim, out var userId))
            await auth.LogoutAsync(userId);

        // Clear the JWT cookie (Max-Age=0)
        ctx.Response.Cookies.Delete(CookieName, new CookieOptions
        {
            HttpOnly = true,
            SameSite = SameSiteMode.Strict,
            Secure = IsProduction(ctx),
            Path = "/",
        });

        return Results.Json(ApiResponse.Ok<object?>(null));
    }

    private static async Task<IResult> ChangePasswordHandler(
        ChangePasswordRequest req,
        IAuthService auth,
        ClaimsPrincipal principal,
        HttpContext ctx)
    {
        if (string.IsNullOrWhiteSpace(req.NewPassword) || req.NewPassword.Length < 12)
            return Results.Json(
                ApiResponse.Fail("AUTH_PASSWORD_TOO_SHORT",
                    "Password must be at least 12 characters."),
                statusCode: StatusCodes.Status400BadRequest);

        var userIdClaim = principal.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdClaim, out var userId))
            return Results.Json(
                ApiResponse.Fail("AUTH_INVALID_TOKEN", "Invalid token claims."),
                statusCode: StatusCodes.Status401Unauthorized);

        var result = await auth.ChangePasswordAsync(userId, req.NewPassword);

        return result.Status switch
        {
            ChangePasswordStatus.Success => Results.Json(ApiResponse.Ok<object?>(null)),
            _ => Results.Json(
                ApiResponse.Fail("AUTH_PASSWORD_TOO_SHORT",
                    "Password must be at least 12 characters."),
                statusCode: StatusCodes.Status400BadRequest),
        };
    }

    // ─── helpers ──────────────────────────────────────────────────────────────

    private static async Task<IResult> IssueTokenAndRespond<T>(
        Data.Entities.User user,
        IAuthService auth,
        IServerConfigService configService,
        HttpContext ctx,
        T responseData)
    {
        var bootEpoch = await configService.GetBootEpochAsync();
        var token = auth.IssueJwt(user, bootEpoch);
        SetJwtCookie(ctx.Response, token, IsProduction(ctx));
        return Results.Json(ApiResponse.Ok(responseData));
    }

    private static void SetJwtCookie(HttpResponse response, string token, bool isProduction)
    {
        response.Cookies.Append(CookieName, token, new CookieOptions
        {
            HttpOnly = true,
            SameSite = SameSiteMode.Strict,
            Secure = isProduction, // false in dev/test (plain HTTP)
            Path = "/",
        });
    }

    private static bool IsProduction(HttpContext ctx) =>
        ctx.RequestServices
            .GetRequiredService<Microsoft.AspNetCore.Hosting.IWebHostEnvironment>()
            .IsProduction();
}

// ─── request DTOs ─────────────────────────────────────────────────────────────

public record SetupRequest(string? Username, string? Password);
public record LoginRequest(string? Username, string? Password);
public record ChangePasswordRequest(string? NewPassword);
