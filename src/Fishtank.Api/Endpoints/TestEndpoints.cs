using Fishtank.Api.Data;
using Fishtank.Api.Data.Entities;
using Fishtank.Api.Engine;
using Fishtank.Api.Models;
using Fishtank.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace Fishtank.Api.Endpoints;

public static class TestEndpoints
{
    /// <summary>
    /// Registers test-only helper endpoints.
    /// Must only be called in Development / Testing environments — never Production.
    /// </summary>
    public static void MapTestEndpoints(this IEndpointRouteBuilder app)
    {
        // POST /api/test/seed-event
        // Directly inserts a SystemEvent and broadcasts via SignalR so E2E tests
        // can seed warning/error events without relying on the WireMock crash path.
        // Body: { "severity": "error"|"warning"|"info", "message": "<text>" }
        app.MapPost("/api/test/seed-event",
            async (SeedEventRequest body, ISystemEventService svc, CancellationToken ct) =>
            {
                var severity = body.Severity?.ToLowerInvariant() switch
                {
                    "warning" => SystemEventSeverity.Warning,
                    "info" => SystemEventSeverity.Info,
                    _ => SystemEventSeverity.Error,
                };
                await svc.AddAsync(severity, body.Message ?? "Test event", ct: ct);
                return Results.Json(new { success = true });
            });

        // POST /api/test/reset-db
        // Deletes all user-generated data so each E2E run starts from a clean slate.
        // Deletion order respects FK constraints: events → services → users.
        // ServerConfigs is intentionally preserved — it is infrastructure state
        // seeded at startup (BootEpoch) and must not be deleted.
        // Also stops all in-memory WireMock servers so ports are freed between runs.
        app.MapPost("/api/test/reset-db", async (FishtankDbContext db, IServicesRegistry registry) =>
        {
            StopAllWireMock(registry);
            await db.SystemEvents.ExecuteDeleteAsync();
            await db.Services.ExecuteDeleteAsync();
            await db.Users.ExecuteDeleteAsync();
            return Results.Json(new { success = true });
        });

        // POST /api/test/reset-services
        // Deletes only services and events — preserves Users and ServerConfigs.
        // Also stops all in-memory WireMock servers so ports are freed.
        // Use before tests that require an empty services list (e.g. P0-1 empty state)
        // without invalidating the authenticated session.
        app.MapPost("/api/test/reset-services", async (FishtankDbContext db, IServicesRegistry registry) =>
        {
            StopAllWireMock(registry);
            await db.SystemEvents.ExecuteDeleteAsync();
            await db.Services.ExecuteDeleteAsync();
            return Results.Json(new { success = true });
        });

        // POST /api/activity/test-seed
        // Injects an activity row directly into the in-memory store and broadcasts via
        // SignalR. Allows E2E tests to seed activity rows without real WireMock traffic.
        // Body: { serviceId, urlPath, method, statusCode, type, durationMs }
        app.MapPost("/api/activity/test-seed",
            async (SeedActivityRowRequest body, IActivityService activityService,
                FishtankDbContext db, CancellationToken ct) =>
            {
                var service = await db.Services
                    .Where(s => s.Id == body.ServiceId && s.DeletedAt == null)
                    .FirstOrDefaultAsync(ct);
                if (service is null)
                    return Results.NotFound(ApiResponse.Fail(
                        "SERVICE_NOT_FOUND", $"Service '{body.ServiceId}' not found."));

                var row = new ActivityRow
                {
                    Timestamp = DateTimeOffset.UtcNow,
                    Method = body.Method ?? "GET",
                    UrlPath = body.UrlPath ?? "/",
                    StatusCode = body.StatusCode,
                    Type = Enum.TryParse<ActivityType>(body.Type, ignoreCase: true, out var t)
                        ? t : ActivityType.Mocked,
                    ServiceId = body.ServiceId,
                    ServiceName = service.Name,
                    ServicePort = service.Port,
                    DurationMs = body.DurationMs,
                };
                await activityService.CaptureAsync(row);
                return Results.Json(new { success = true, data = (object?)null });
            }).RequireAuthorization();
    }

    /// <summary>Stops and disposes every WireMock server held in the registry.</summary>
    private static void StopAllWireMock(IServicesRegistry registry)
    {
        foreach (var (id, server) in registry.GetAll())
        {
            try { server.Stop(); } catch { /* best-effort */ }
            try { server.Dispose(); } catch { /* best-effort */ }
            registry.TryRemove(id, out _);
        }
    }
}

/// <param name="Severity">"error" | "warning" | "info" — defaults to "error" when omitted or unrecognised.</param>
/// <param name="Message">Free-text event message inserted verbatim.</param>
public record SeedEventRequest(string? Severity, string? Message);

/// <summary>Request body for POST /api/activity/test-seed.</summary>
public record SeedActivityRowRequest(
    Guid ServiceId,
    string? UrlPath,
    string? Method,
    int StatusCode,
    string? Type,
    int DurationMs);
