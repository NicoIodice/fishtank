using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Fishtank.Api.IntegrationTests.Support;

namespace Fishtank.Api.IntegrationTests.Api;

/// <summary>
/// RED-PHASE ATDD acceptance test scaffolds for Story 2.3:
/// Enable/Disable Service Toggle, ServicesHub &amp; Real-Time Status.
///
/// Tests marked "RED:" fail against the current codebase.
/// Tests marked "GREEN-ALREADY:" pass already (regression guards).
///
/// ACs covered:
/// AC-2:  POST /api/services/{id}/stop → service status "stopped" in response
///        (SignalR broadcast validated end-to-end in Playwright E2E)
/// AC-3:  /hubs/events registered and accepts authenticated negotiate (RED)
/// AC-4a: /hubs/services unauthenticated → 401 (regression guard)
/// AC-4b: /hubs/events unauthenticated → 401 (RED: hub not registered yet)
/// </summary>
[Collection("Integration")]
public class Story2_3_ServicesHubTests : IntegrationTestBase
{
    // Port range: avoid collision with Story 2.1 (30190–30192) and 2.2 (30193–30195)
    private const int TestPort = 30185;

    public Story2_3_ServicesHubTests(FishtankWebApplicationFactory factory)
        : base(factory) { }

    private async Task<HttpClient> GetAuthenticatedClientAsync()
    {
        await Client.PostAsJsonAsync("/api/auth/setup",
            new { username = "admin", password = "adminpassword123" });
        return await TestAuthHelper.CreateAuthenticatedClientAsync(
            Factory, "admin", "adminpassword123");
    }

    private async Task<string> CreateServiceAsync(HttpClient client, int port = TestPort)
    {
        var response = await client.PostAsJsonAsync("/api/services", new
        {
            name = $"Hub Test Service {port}",
            externalUrl = "https://hub.test.example.com",
            port,
        });
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        return body.GetProperty("data").GetProperty("id").GetString()!;
    }

    // ─────────────────────────────────────────────────────────────────────
    // AC-4a (GREEN-ALREADY): ServicesHub rejects unauthenticated requests
    // ─────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-4a: GET /hubs/services without auth → 401 (regression guard)")]
    public async Task ServicesHub_UnauthenticatedRequest_Returns401()
    {
        var response = await Client.GetAsync("/hubs/services");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ─────────────────────────────────────────────────────────────────────
    // AC-3 / AC-4b (RED): EventsHub registered at /hubs/events
    // RED:   EventsHub.cs does not exist → /hubs/events falls through to 404.
    // GREEN: EventsHub.cs created + [Authorize] + mapped in Program.cs → 401.
    // ─────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-4b: GET /hubs/events without auth → 401 (hub must be registered)")]
    public async Task EventsHub_UnauthenticatedRequest_Returns401_WhenRegistered()
    {
        // RED: EventsHub not registered → falls through to SPA fallback → 200 or 404
        // GREEN: EventsHub registered + [Authorize] → 401
        var response = await Client.GetAsync("/hubs/events");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ─────────────────────────────────────────────────────────────────────
    // AC-3 (RED): EventsHub skeleton accepts authenticated negotiate
    // ─────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-3: POST /hubs/events/negotiate (authenticated) → 200 with connectionId")]
    public async Task EventsHub_AuthenticatedNegotiate_Returns200()
    {
        // Arrange
        var client = await GetAuthenticatedClientAsync();

        // Act — SignalR auto-generates /negotiate for each mapped hub
        var response = await client.PostAsync(
            "/hubs/events/negotiate?negotiateVersion=1",
            new StringContent(string.Empty));

        // Assert — RED: /hubs/events not mapped → 404
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var content = await response.Content.ReadAsStringAsync();
        content.Should().Contain("connectionId");
    }

    // ─────────────────────────────────────────────────────────────────────
    // AC-2 (GREEN-ALREADY): ServicesHub negotiate succeeds when authenticated
    // (broadcast correctness is tested in Playwright E2E; this guards the
    //  hub plumbing after Story 2.3 wires IHubContext into ServiceManager)
    // ─────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-2: POST /hubs/services/negotiate (authenticated) → 200")]
    public async Task ServicesHub_AuthenticatedNegotiate_Returns200()
    {
        var client = await GetAuthenticatedClientAsync();
        var response = await client.PostAsync(
            "/hubs/services/negotiate?negotiateVersion=1",
            new StringContent(string.Empty));
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var content = await response.Content.ReadAsStringAsync();
        content.Should().Contain("connectionId");
    }

    // ─────────────────────────────────────────────────────────────────────
    // AC-2: Stop/start API returns correct status values
    // (Underpins the broadcast contract: broadcast payload must match API values)
    // ─────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-2: POST /api/services/{id}/stop → status='stopped', isActive=false")]
    public async Task StopService_ReturnsStoppedStatus()
    {
        var client = await GetAuthenticatedClientAsync();
        var serviceId = await CreateServiceAsync(client);

        var response = await client.PostAsync($"/api/services/{serviceId}/stop", null);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("success").GetBoolean().Should().BeTrue();
        body.GetProperty("data").GetProperty("status").GetString().Should().Be("stopped");
        body.GetProperty("data").GetProperty("isActive").GetBoolean().Should().BeFalse();
    }

    [Fact(DisplayName = "AC-2: POST /api/services/{id}/start → status='live', isActive=true")]
    public async Task StartService_ReturnsLiveStatus()
    {
        var client = await GetAuthenticatedClientAsync();
        var serviceId = await CreateServiceAsync(client);

        // Stop first
        await client.PostAsync($"/api/services/{serviceId}/stop", null);

        // Restart
        var response = await client.PostAsync($"/api/services/{serviceId}/start", null);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("success").GetBoolean().Should().BeTrue();
        body.GetProperty("data").GetProperty("status").GetString().Should().Be("live");
        body.GetProperty("data").GetProperty("isActive").GetBoolean().Should().BeTrue();
    }
}
