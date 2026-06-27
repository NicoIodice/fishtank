using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Fishtank.Api.Data.Entities;
using Fishtank.Api.IntegrationTests.Support;
using Fishtank.Api.Services;
using Microsoft.Extensions.DependencyInjection;

namespace Fishtank.Api.IntegrationTests.Api;

/// <summary>
/// ATDD acceptance regression tests for Story 2.4:
/// System Events Screen &amp; Notification Panel.
///
/// These exercise the implemented HTTP surface on
/// <see cref="Fishtank.Api.Endpoints.SystemEventsEndpoints"/>: the paginated
/// list + severity filter + mark-read / read-all / unread-count endpoints, plus
/// the <c>SystemEventCreated</c> hub broadcast wiring (auth regression guards).
///
/// ACs covered (HTTP surface + hub auth; the SignalR push/badge real-time path
/// is validated end-to-end in Playwright, mirroring the Story 2.3 split):
///   AC-1: GET /api/system-events paginated, severity-filtered, newest-first.
///   AC-3: /hubs/events authenticated negotiate (broadcast wiring regression).
///   AC-3/8: GET /api/system-events/unread-count counts only unread warn+err.
///   AC-5: POST /api/system-events/{id}/read marks one read; unread-count drops.
///   AC-6: POST /api/system-events/read-all zeroes unread warn+err.
///
/// Seeding strategy: to create warning/error events deterministically without a
/// live WireMock failure, resolve <see cref="ISystemEventService"/> from a DI
/// scope and call <c>AddAsync</c> directly. The in-memory SQLite connection is
/// shared for the factory lifetime, so seeded rows are visible to the API.
/// </summary>
[Collection("Integration")]
public class Story2_4_SystemEventsTests : IntegrationTestBase
{
    public Story2_4_SystemEventsTests(FishtankWebApplicationFactory factory)
        : base(factory) { }

    private async Task<HttpClient> GetAuthenticatedClientAsync()
    {
        await Client.PostAsJsonAsync("/api/auth/setup",
            new { username = "admin", password = "adminpassword123" });
        return await TestAuthHelper.CreateAuthenticatedClientAsync(
            Factory, "admin", "adminpassword123");
    }

    /// <summary>
    /// Seed a System Event directly via the service layer. Calling AddAsync
    /// exercises the same code path the engine-crash sites use
    /// (ServiceManager lines 73/175), and — once Story 2.4 wires the broadcast —
    /// raises SystemEventCreated/UnreadCountChanged for warning/error severities.
    /// </summary>
    private async Task SeedEventAsync(SystemEventSeverity severity, string message)
    {
        using var scope = Factory.Services.CreateScope();
        var svc = scope.ServiceProvider.GetRequiredService<ISystemEventService>();
        await svc.AddAsync(severity, message);
    }

    /// <summary>
    /// Seed an event with an explicit <paramref name="createdAt"/> so ordering
    /// assertions are deterministic without wall-clock spacing. Writes the entity
    /// directly via the DbContext because AddAsync stamps CreatedAt = UtcNow.
    /// </summary>
    private async Task SeedEventAtAsync(
        SystemEventSeverity severity, string message, DateTimeOffset createdAt)
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider
            .GetRequiredService<Fishtank.Api.Data.FishtankDbContext>();
        db.SystemEvents.Add(new SystemEvent
        {
            Severity = severity,
            Message = message,
            CreatedAt = createdAt,
        });
        await db.SaveChangesAsync();
    }

    // ─────────────────────────────────────────────────────────────────────
    // AC-3 / hub auth (regression after Story 2.3): /hubs/events
    // ─────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-3: GET /hubs/events without auth → 401 (regression guard)")]
    public async Task EventsHub_Unauthenticated_Returns401()
    {
        var response = await Client.GetAsync("/hubs/events");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact(DisplayName = "AC-3: POST /hubs/events/negotiate (authenticated) → 200 with connectionId")]
    public async Task EventsHub_AuthenticatedNegotiate_Returns200()
    {
        var client = await GetAuthenticatedClientAsync();
        var response = await client.PostAsync(
            "/hubs/events/negotiate?negotiateVersion=1",
            new StringContent(string.Empty));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var content = await response.Content.ReadAsStringAsync();
        content.Should().Contain("connectionId");
    }

    // ─────────────────────────────────────────────────────────────────────
    // AC-1: paginated list, severity filter, newest-first
    // GET returns an {items,total,hasMore} envelope with ?severity/?skip/?take.
    // ─────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-1: GET list (warnings-errors) returns 20 of 25, info excluded, hasMore=true")]
    public async Task List_WarningsErrors_PagedAndFiltered()
    {
        var client = await GetAuthenticatedClientAsync();
        for (var i = 0; i < 25; i++)
            await SeedEventAsync(SystemEventSeverity.Error, $"err-{i}");
        await SeedEventAsync(SystemEventSeverity.Info, "info-should-be-excluded");

        var res = await client.GetAsync(
            "/api/system-events?severity=warnings-errors&skip=0&take=20");

        res.StatusCode.Should().Be(HttpStatusCode.OK);
        var data = (await res.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("data");

        data.GetProperty("items").GetArrayLength().Should().Be(20);
        data.GetProperty("total").GetInt32().Should().Be(25); // info excluded
        data.GetProperty("hasMore").GetBoolean().Should().BeTrue();
    }

    [Fact(DisplayName = "AC-1: GET list (info) returns only info events")]
    public async Task List_Info_ReturnsOnlyInfo()
    {
        var client = await GetAuthenticatedClientAsync();
        await SeedEventAsync(SystemEventSeverity.Info, "i1");
        await SeedEventAsync(SystemEventSeverity.Warning, "w1");
        await SeedEventAsync(SystemEventSeverity.Error, "e1");

        var res = await client.GetAsync(
            "/api/system-events?severity=info&skip=0&take=20");

        res.StatusCode.Should().Be(HttpStatusCode.OK);
        var data = (await res.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("data");

        data.GetProperty("total").GetInt32().Should().Be(1);
        var items = data.GetProperty("items");
        items.GetArrayLength().Should().Be(1);
        items[0].GetProperty("severity").GetString().Should().Be("info");
    }

    [Fact(DisplayName = "AC-1: GET list is ordered newest-first by CreatedAt")]
    public async Task List_OrderedNewestFirst()
    {
        var client = await GetAuthenticatedClientAsync();
        // Explicit, distinct CreatedAt values make newest-first deterministic with
        // no wall-clock sleep (CreatedAt is the primary sort key in ListAsync).
        var baseTime = DateTimeOffset.UtcNow;
        await SeedEventAtAsync(
            SystemEventSeverity.Warning, "oldest", baseTime.AddSeconds(-10));
        await SeedEventAtAsync(
            SystemEventSeverity.Warning, "newest", baseTime);

        var res = await client.GetAsync(
            "/api/system-events?severity=warnings-errors&skip=0&take=20");

        res.StatusCode.Should().Be(HttpStatusCode.OK);
        var items = (await res.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("data").GetProperty("items");

        items[0].GetProperty("message").GetString().Should().Be("newest");
    }

    // ─────────────────────────────────────────────────────────────────────
    // AC-3/8: unread-count counts only unread warnings+errors
    // ─────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-3/8: GET unread-count counts only unread warnings+errors")]
    public async Task UnreadCount_OnlyWarningsAndErrors()
    {
        var client = await GetAuthenticatedClientAsync();
        await SeedEventAsync(SystemEventSeverity.Warning, "w1");
        await SeedEventAsync(SystemEventSeverity.Error, "e1");
        await SeedEventAsync(SystemEventSeverity.Info, "i1"); // excluded

        var res = await client.GetAsync("/api/system-events/unread-count");

        res.StatusCode.Should().Be(HttpStatusCode.OK);
        var data = (await res.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("data");
        data.GetProperty("count").GetInt32().Should().Be(2);
    }

    // ─────────────────────────────────────────────────────────────────────
    // AC-5: POST {id}/read marks a single event read → unread-count drops
    // ─────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-5: POST {id}/read marks one event read; unread-count drops by 1")]
    public async Task MarkRead_DecrementsUnreadCount()
    {
        var client = await GetAuthenticatedClientAsync();
        await SeedEventAsync(SystemEventSeverity.Warning, "w1");
        await SeedEventAsync(SystemEventSeverity.Error, "e1");

        // Find an id via the list endpoint.
        var listRes = await client.GetAsync(
            "/api/system-events?severity=warnings-errors&skip=0&take=20");
        listRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var items = (await listRes.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("data").GetProperty("items");
        var id = items[0].GetProperty("id").GetString();

        var readRes = await client.PostAsync($"/api/system-events/{id}/read", null);
        readRes.StatusCode.Should().Be(HttpStatusCode.OK);

        var countData = (await (await client.GetAsync("/api/system-events/unread-count"))
            .Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        countData.GetProperty("count").GetInt32().Should().Be(1);
    }

    [Fact(DisplayName = "AC-5: POST {id}/read for unknown id → 404 SYSTEM_EVENT_NOT_FOUND")]
    public async Task MarkRead_UnknownId_Returns404()
    {
        var client = await GetAuthenticatedClientAsync();

        var res = await client.PostAsync(
            $"/api/system-events/{Guid.NewGuid()}/read", null);

        // Returns a 404 with ApiResponse.Fail(SYSTEM_EVENT_NOT_FOUND).
        res.StatusCode.Should().Be(HttpStatusCode.NotFound);
        var body = await res.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("error").GetProperty("code").GetString()
            .Should().Be("SYSTEM_EVENT_NOT_FOUND");
    }

    // ─────────────────────────────────────────────────────────────────────
    // AC-6: POST read-all marks all unread warnings+errors read
    // ─────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-6: POST read-all zeroes the unread warnings+errors count")]
    public async Task MarkAllRead_ZeroesUnreadCount()
    {
        var client = await GetAuthenticatedClientAsync();
        await SeedEventAsync(SystemEventSeverity.Warning, "w1");
        await SeedEventAsync(SystemEventSeverity.Error, "e1");
        await SeedEventAsync(SystemEventSeverity.Error, "e2");

        var readAll = await client.PostAsync("/api/system-events/read-all", null);
        readAll.StatusCode.Should().Be(HttpStatusCode.OK);

        var countData = (await (await client.GetAsync("/api/system-events/unread-count"))
            .Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        countData.GetProperty("count").GetInt32().Should().Be(0);
    }

    [Fact(DisplayName = "AC-6: read-all does not affect info events (still queryable on info tab)")]
    public async Task MarkAllRead_LeavesInfoEvents()
    {
        var client = await GetAuthenticatedClientAsync();
        await SeedEventAsync(SystemEventSeverity.Warning, "w1");
        await SeedEventAsync(SystemEventSeverity.Info, "i1");

        (await client.PostAsync("/api/system-events/read-all", null))
            .StatusCode.Should().Be(HttpStatusCode.OK);

        var infoRes = await client.GetAsync(
            "/api/system-events?severity=info&skip=0&take=20");
        var infoData = (await infoRes.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("data");
        infoData.GetProperty("total").GetInt32().Should().Be(1);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Auth regression: the list endpoint requires authentication
    // (GET /api/system-events already RequireAuthorization).
    // ─────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "GET /api/system-events without auth → 401 (regression guard)")]
    public async Task List_Unauthenticated_Returns401()
    {
        var res = await Client.GetAsync(
            "/api/system-events?severity=warnings-errors&skip=0&take=20");
        res.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
