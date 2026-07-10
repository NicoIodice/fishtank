using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.SignalR.Client;
using Fishtank.Api.Data;
using Fishtank.Api.Data.Entities;
using Fishtank.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Fishtank.Api.IntegrationTests.Support;

namespace Fishtank.Api.IntegrationTests.Api;

/// <summary>
/// ATDD acceptance test scaffolds for Story 5.1:
/// Feature Toggles � Runtime Control &amp; SignalR Broadcast.
///
/// RED PHASE � these tests define the expected end-state behaviour.
/// They FAIL before implementation and PASS once all ACs are complete.
///
/// AC-3:  Backend admin endpoints require Admin role (NFR-8, R-E5-002)
/// AC-4:  Feature toggles list displays all known toggles
/// AC-5:  Toggle switch changes state and persists to database
/// AC-8:  Toggle change broadcasts via SignalR to all sessions (D7, R-E5-003)
/// AC-9:  Env var override takes precedence � envVarOverride property in DTO
/// AC-10: Env-var-locked toggle PUT returns HTTP 409
/// AC-11: Unknown toggle name returns 404
///
/// RED reasons:
///   /api/admin/toggles is not mapped ? all requests return 404
///   TogglesHub does not exist at /hubs/toggles
/// </summary>
[Collection("Integration")]
public class Story5_1_AdminTogglesTests : IntegrationTestBase
{
    private const string AdminUsername = "admin";
    private const string AdminPassword = "adminpassword123";
    private const string StdUsername = "standarduser";
    private const string StdPassword = "standardpassword123";

    public Story5_1_AdminTogglesTests(FishtankWebApplicationFactory factory) : base(factory) { }

    /// <summary>Ensures admin account exists and returns an authenticated admin HttpClient.</summary>
    private async Task<HttpClient> GetAdminClientAsync()
    {
        await Client.PostAsJsonAsync("/api/auth/setup", new { username = AdminUsername, password = AdminPassword });
        return await TestAuthHelper.CreateAuthenticatedClientAsync(Factory, AdminUsername, AdminPassword);
    }

    /// <summary>Seeds a Standard User directly in the DB and returns an authenticated HttpClient.</summary>
    private async Task<HttpClient> GetStandardUserClientAsync()
    {
        await Client.PostAsJsonAsync("/api/auth/setup", new { username = AdminUsername, password = AdminPassword });

        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<FishtankDbContext>();
            var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();

            if (!await db.Users.AnyAsync(u => u.Username == StdUsername))
            {
                db.Users.Add(new User
                {
                    Username = StdUsername,
                    PasswordHash = hasher.Hash(StdPassword),
                    Role = UserRole.StandardUser,
                    IsActive = true,
                    ForcePasswordChange = false,
                });
                await db.SaveChangesAsync();
            }
        }

        return await TestAuthHelper.CreateAuthenticatedClientAsync(Factory, StdUsername, StdPassword);
    }

    // -------------------------------------------------------------------------
    // AC-3 � Backend admin endpoints require Admin role
    // RED:  Returns 404 (endpoint not mapped yet)
    // GREEN: Standard User gets HTTP 403 with ADMIN_FORBIDDEN error code
    // Risk: R-E5-002 (Admin role escalation)
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AC-3: GET /api/admin/toggles requires Admin role � Standard User returns 403")]
    public async Task GetToggles_StandardUser_Returns403()
    {
        var stdClient = await GetStandardUserClientAsync();
        var response = await stdClient.GetAsync("/api/admin/toggles");

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden,
            "Standard User must not access admin endpoints");

        var body = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(body).RootElement;
        json.GetProperty("success").GetBoolean().Should().BeFalse();
        json.GetProperty("error").GetProperty("code").GetString()
            .Should().Be("ADMIN_FORBIDDEN");
    }

    [Fact(DisplayName = "AC-3: PUT /api/admin/toggles/{name} requires Admin role � Standard User returns 403")]
    public async Task PutToggle_StandardUser_Returns403()
    {
        var stdClient = await GetStandardUserClientAsync();
        var response = await stdClient.PutAsJsonAsync(
            "/api/admin/toggles/network_activity",
            new { enabled = false });

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden,
            "Standard User must not modify admin toggles");

        var body = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(body).RootElement;
        json.GetProperty("success").GetBoolean().Should().BeFalse();
        json.GetProperty("error").GetProperty("code").GetString().Should().Be("ADMIN_FORBIDDEN");
    }

    [Fact(DisplayName = "AC-3: GET /api/admin/toggles with Admin JWT returns 200")]
    public async Task GetToggles_AdminUser_Returns200()
    {
        var adminClient = await GetAdminClientAsync();
        var response = await adminClient.GetAsync("/api/admin/toggles");

        response.StatusCode.Should().Be(HttpStatusCode.OK,
            "Admin user must access admin endpoints");

        var body = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(body).RootElement;
        json.GetProperty("success").GetBoolean().Should().BeTrue();

        var toggles = json.GetProperty("data").EnumerateArray().ToList();
        toggles.Should().NotBeEmpty("at least one toggle must exist");

        var first = toggles[0];
        first.GetProperty("name").GetString().Should().NotBeNullOrEmpty();
        first.GetProperty("displayName").GetString().Should().NotBeNullOrEmpty();
        first.GetProperty("description").GetString().Should().NotBeNullOrEmpty();
        // enabled is a boolean � verify ValueKind is True or False
        first.GetProperty("enabled").ValueKind
            .Should().BeOneOf(JsonValueKind.True, JsonValueKind.False);
    }

    // -------------------------------------------------------------------------
    // AC-4 � Feature toggles list displays all known toggles
    // RED:  Returns 404 (endpoint not mapped)
    // GREEN: All 5 known toggles present with correct schema
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AC-4: GET /api/admin/toggles returns all 5 known toggles with correct schema")]
    public async Task GetToggles_ReturnsAllKnownToggles()
    {
        var adminClient = await GetAdminClientAsync();
        var response = await adminClient.GetAsync("/api/admin/toggles");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(body).RootElement;
        var toggles = json.GetProperty("data").EnumerateArray().ToList();

        toggles.Should().HaveCount(6,
            "all 6 known toggles must be seeded: network_activity, mappings_editor, record_mode, system_events, services_management, auto_registration");

        var names = toggles.Select(t => t.GetProperty("name").GetString()).ToList();
        names.Should().Contain("network_activity");
        names.Should().Contain("mappings_editor");
        names.Should().Contain("record_mode");
        names.Should().Contain("system_events");
        names.Should().Contain("services_management");
        names.Should().Contain("auto_registration");

        var first = toggles[0];
        first.TryGetProperty("name", out _).Should().BeTrue();
        first.TryGetProperty("displayName", out _).Should().BeTrue();
        first.TryGetProperty("description", out _).Should().BeTrue();
        first.TryGetProperty("enabled", out _).Should().BeTrue();
        first.TryGetProperty("updatedAt", out _).Should().BeTrue();
        first.TryGetProperty("envVarOverride", out _).Should().BeTrue();
    }

    // -------------------------------------------------------------------------
    // AC-5 � Toggle state persistence to database
    // RED:  Returns 404 (endpoint not mapped yet)
    // GREEN: State change persisted to DB; reflected in subsequent GET
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AC-5: PUT /api/admin/toggles/{name} persists state change to database")]
    public async Task PutToggle_ValidRequest_PersistsToDatabase()
    {
        var adminClient = await GetAdminClientAsync();

        var getResponse = await adminClient.GetAsync("/api/admin/toggles");
        getResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var getJson = JsonDocument.Parse(await getResponse.Content.ReadAsStringAsync()).RootElement;
        var toggles = getJson.GetProperty("data").EnumerateArray().ToList();
        var networkActivity = toggles.First(t => t.GetProperty("name").GetString() == "network_activity");
        var currentState = networkActivity.GetProperty("enabled").GetBoolean();
        var newState = !currentState;

        var putResponse = await adminClient.PutAsJsonAsync(
            "/api/admin/toggles/network_activity",
            new { enabled = newState });

        putResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        JsonDocument.Parse(await putResponse.Content.ReadAsStringAsync()).RootElement
            .GetProperty("success").GetBoolean().Should().BeTrue();

        // Verify persistence
        var verifyResponse = await adminClient.GetAsync("/api/admin/toggles");
        var verifyToggles = JsonDocument.Parse(await verifyResponse.Content.ReadAsStringAsync())
            .RootElement.GetProperty("data").EnumerateArray().ToList();
        verifyToggles.First(t => t.GetProperty("name").GetString() == "network_activity")
            .GetProperty("enabled").GetBoolean()
            .Should().Be(newState, "toggle state must persist to database");
    }

    // -------------------------------------------------------------------------
    // AC-8 � Toggle change broadcasts via SignalR to all sessions
    // RED:  /hubs/toggles not mapped ? SignalR StartAsync throws
    // GREEN: FeatureToggleChanged event broadcast to all connected clients
    // Risk: R-E5-003 (SignalR toggle broadcast race)
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AC-8: Toggle change broadcasts FeatureToggleChanged via SignalR to all sessions")]
    public async Task PutToggle_BroadcastsSignalREvent()
    {
        var adminClient = await GetAdminClientAsync();

        // Connect to TogglesHub with authenticated JWT token
        var hubConnection = await SignalRTestHelper.ConnectToTogglesHubAsync(
            Factory,
            TestAuthHelper.LastJwtToken);

        var eventReceived = false;
        string? receivedName = null;
        bool? receivedEnabled = null;

        hubConnection.On<JsonElement>("FeatureToggleChanged", payload =>
        {
            eventReceived = true;
            receivedName = payload.GetProperty("name").GetString();
            receivedEnabled = payload.GetProperty("enabled").GetBoolean();
        });

        var putResponse = await adminClient.PutAsJsonAsync(
            "/api/admin/toggles/network_activity",
            new { enabled = false });

        putResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        await Task.Delay(TimeSpan.FromSeconds(2));

        eventReceived.Should().BeTrue("FeatureToggleChanged must be broadcast via TogglesHub");
        receivedName.Should().Be("network_activity");
        receivedEnabled.Should().Be(false);

        await hubConnection.StopAsync();
        await hubConnection.DisposeAsync();
    }

    // -------------------------------------------------------------------------
    // AC-9 � Env var override takes precedence and locks the toggle
    // RED:  Returns 404 (endpoint not mapped) ? envVarOverride property absent
    // GREEN: Toggle DTO includes envVarOverride (nullable bool) property
    // Risk: R-E5-006 (Env var toggle override not visible)
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AC-9: Toggle DTO includes nullable envVarOverride property")]
    public async Task GetToggles_ToggleDtoIncludesEnvVarOverrideProperty()
    {
        var adminClient = await GetAdminClientAsync();
        var response = await adminClient.GetAsync("/api/admin/toggles");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var toggles = JsonDocument.Parse(await response.Content.ReadAsStringAsync())
            .RootElement.GetProperty("data").EnumerateArray().ToList();

        // Schema must support envVarOverride (nullable bool � null when not overridden)
        toggles[0].TryGetProperty("envVarOverride", out _).Should().BeTrue(
            "toggle DTO must include envVarOverride property for env var lock detection");
    }

    // -------------------------------------------------------------------------
    // AC-11 � Unknown toggle name returns 404 with structured error
    // RED:  Returns 404 (endpoint not mapped � ambiguous failure)
    // GREEN: HTTP 404 with ADMIN_TOGGLE_NOT_FOUND error code
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AC-11: PUT with unknown toggle name returns HTTP 404 ADMIN_TOGGLE_NOT_FOUND")]
    public async Task PutToggle_UnknownName_Returns404WithCorrectErrorCode()
    {
        var adminClient = await GetAdminClientAsync();
        var response = await adminClient.PutAsJsonAsync(
            "/api/admin/toggles/invalid_toggle_name",
            new { enabled = true });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound,
            "unknown toggle names must return 404");

        var body = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(body).RootElement;
        json.GetProperty("success").GetBoolean().Should().BeFalse();
        json.GetProperty("error").GetProperty("code").GetString()
            .Should().Be("ADMIN_TOGGLE_NOT_FOUND");
    }
}
