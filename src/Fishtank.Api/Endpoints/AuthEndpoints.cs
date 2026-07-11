using System.Security.Claims;
using Fishtank.Api.Data;
using Fishtank.Api.Models;
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
        // No RequireAuthorization() — the handler checks ctx.User manually so it
        // can return our standard JSON envelope on 401 (bare framework 401 has no body)
        group.MapGet("/me", MeHandler);

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

        // GET /api/auth/registration-status — PUBLIC, no auth required (AC-11)
        group.MapGet("/registration-status", GetRegistrationStatusHandler);

        // POST /api/auth/register — PUBLIC, gated by auto_registration toggle (AC-10)
        group.MapPost("/register", RegisterHandler);
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

        if (result.Status == LoginStatus.InvalidCredentials)
            return Results.Json(
                ApiResponse.Fail("AUTH_INVALID_CREDENTIALS",
                    "Invalid credentials."),  // Generic — does not reveal which field failed (AC-5)
                statusCode: StatusCodes.Status401Unauthorized);

        // AC-8: Deactivated account
        if (result.Status == LoginStatus.AccountDeactivated)
            return Results.Json(
                ApiResponse.Fail("AUTH_ACCOUNT_DEACTIVATED",
                    "This account has been deactivated."),
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

    // ─── handlers for registration ────────────────────────────────────────────────────

    /// <summary>
    /// AC-11: GET /api/auth/registration-status (PUBLIC)
    /// Returns whether auto-registration is enabled
    /// </summary>
    private static async Task<IResult> GetRegistrationStatusHandler(
        IFeatureToggleService toggleService,
        CancellationToken ct)
    {
        var toggles = await toggleService.GetAllTogglesAsync(ct);
        var autoRegToggle = toggles.FirstOrDefault(t => t.Name == "auto_registration");
        var enabled = autoRegToggle?.Enabled ?? false;

        var response = new RegistrationStatusDto(Enabled: enabled);
        return Results.Ok(ApiResponse.Ok(response));
    }

    /// <summary>
    /// AC-10: POST /api/auth/register (PUBLIC)
    /// Creates a Standard User account if auto_registration toggle is enabled
    /// </summary>
    private static async Task<IResult> RegisterHandler(
        RegisterRequest req,
        IFeatureToggleService toggleService,
        IUserManagementService userService,
        IAuthService auth,
        IServerConfigService configService,
        FishtankDbContext db,
        HttpContext ctx,
        CancellationToken ct)
    {
        // Check auto_registration toggle
        var toggles = await toggleService.GetAllTogglesAsync(ct);
        var autoRegToggle = toggles.FirstOrDefault(t => t.Name == "auto_registration");
        if (autoRegToggle?.Enabled != true)
        {
            return Results.Json(
                ApiResponse.Fail("AUTH_REGISTRATION_DISABLED", "User registration is currently disabled."),
                statusCode: StatusCodes.Status403Forbidden);
        }

        // Validate password length (≥12 chars)
        if (string.IsNullOrWhiteSpace(req.Password) || req.Password.Length < 12)
        {
            return Results.Json(
                ApiResponse.Fail("AUTH_PASSWORD_TOO_SHORT", "Password must be at least 12 characters."),
                statusCode: StatusCodes.Status400BadRequest);
        }

        // Validate username
        if (string.IsNullOrWhiteSpace(req.Username))
        {
            return Results.Json(
                ApiResponse.Fail("VALIDATION_ERROR", "Username is required."),
                statusCode: StatusCodes.Status400BadRequest);
        }

        try
        {
            // AC-10: actorId is null + forcePasswordChange=false for self-registration
            var userDto = await userService.CreateUserAsync(
                req.Username, req.Password, actorId: null, ct,
                forcePasswordChange: false);

            // Issue JWT and set cookie
            var bootEpoch = await configService.GetBootEpochAsync();
            var user = await db.Users.FindAsync(new object[] { userDto.Id }, ct);
            var token = auth.IssueJwt(user!, bootEpoch);
            SetJwtCookie(ctx.Response, token, IsProduction(ctx));

            return Results.Json(ApiResponse.Ok(new
            {
                username = userDto.Username,
                role = userDto.Role
            }));
        }
        catch (Exceptions.ValidationException ex)
        {
            return Results.Json(
                ApiResponse.Fail(ex.ErrorCode, ex.Message),
                statusCode: StatusCodes.Status400BadRequest);
        }
        catch (Exceptions.ConflictException ex)
        {
            return Results.Json(
                ApiResponse.Fail(ex.ErrorCode, ex.Message),
                statusCode: StatusCodes.Status409Conflict);
        }
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
public record RegisterRequest(string? Username, string? Password);
