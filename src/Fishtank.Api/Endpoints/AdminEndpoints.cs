using Fishtank.Api.Exceptions;
using Fishtank.Api.Services;
using System.Security.Claims;
using Fishtank.Api.Data;
using Fishtank.Api.Models;
using Microsoft.EntityFrameworkCore;
using Fishtank.Api.Engine;
using System.Diagnostics;
using System.Text.Json;

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
        group.MapGet("health", GetHealthAsync);
        group.MapGet("audit", GetAuditAsync);
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
        HttpContext httpContext,
        IFeatureToggleService toggleService,
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
            var toggle = await toggleService.SetToggleAsync(name, request.Enabled, actorId, ct);
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

    /// <summary>
    /// AC-2: GET /api/admin/health returns structured health data
    /// </summary>
    private static async Task<IResult> GetHealthAsync(
        FishtankDbContext db,
        IActivityStore activityStore,
        CancellationToken ct)
    {
        // Count active services (Status == Live)
        var activeServicesCount = await db.Services
            .Where(s => s.Status == Data.Entities.ServiceStatus.Live && s.DeletedAt == null)
            .CountAsync(ct);

        // Total request count from activity store
        var totalRequestCount = activityStore.GetAll(null).Count;

        // Database status check
        string databaseStatus;
        try
        {
            await db.Database.CanConnectAsync(ct);
            databaseStatus = "accessible";
        }
        catch
        {
            databaseStatus = "inaccessible";
        }

        // Calculate uptime in seconds
        var uptimeSeconds = (int)(DateTime.UtcNow - Process.GetCurrentProcess().StartTime.ToUniversalTime()).TotalSeconds;

        var health = new HealthDto(
            ActiveServicesCount: activeServicesCount,
            TotalRequestCount: totalRequestCount,
            DatabaseStatus: databaseStatus,
            UptimeSeconds: uptimeSeconds);

        return Results.Ok(ApiResponse.Ok(health));
    }

    /// <summary>
    /// AC-5: GET /api/admin/audit returns paginated audit entries
    /// </summary>
    private static async Task<IResult> GetAuditAsync(
        FishtankDbContext db,
        HttpContext httpContext,
        CancellationToken ct)
    {
        // Parse pagination parameters
        var page = int.TryParse(httpContext.Request.Query["page"], out var p) ? p : 1;
        var pageSize = 20;

        // Total count (separate query — efficient)
        var total = await db.AuditLogs.CountAsync(ct);

        // Fetch only the requested page with a bounded in-memory sort.
        // SQLite's EF Core provider cannot sort DateTimeOffset columns in SQL;
        // loading the full table is safe for v1 (expected < 10k entries per instance).
        // TODO v2: change AuditLog.CreatedAt to DateTime(UTC) to enable SQL-level ORDER BY.
        var allEntries = await db.AuditLogs
            .Include(a => a.Actor)
            .AsNoTracking()
            .ToListAsync(ct);

        var entries = allEntries
            .OrderByDescending(a => a.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new AuditEntryDto(
                a.Id,
                a.Action,
                a.Actor != null ? a.Actor.Username : "system",
                a.ResourceType,
                a.ResourceId,
                a.Details != null ? JsonSerializer.Deserialize<object>(a.Details) : null,
                a.CreatedAt))
            .ToList();

        var auditPage = new AuditPageDto(
            Items: entries,
            Total: total,
            Page: page,
            PageSize: pageSize);

        return Results.Ok(ApiResponse.Ok(auditPage));
    }
}
