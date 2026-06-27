using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Fishtank.Api.IntegrationTests.Support;

namespace Fishtank.Api.IntegrationTests.Api;

/// <summary>
/// Acceptance tests for Story 3-1:
/// Activity Log Backend — Request Capture &amp; Header Redaction.
///
/// ACs covered:
///   AC-7 — GET /api/activity requires authentication; returns 200 + data array; supports filters.
///   AC-8 — DELETE /api/activity clears all logs; returns {success:true,data:null}.
///   AC-10 — Settings endpoint exposes and persists captureFullHeaders toggle.
/// </summary>
[Collection("Integration")]
public class Story3_1_ActivityTests : IntegrationTestBase
{
    public Story3_1_ActivityTests(FishtankWebApplicationFactory factory)
        : base(factory) { }

    /// <summary>
    /// Ensure the admin account exists (idempotent) and return an authenticated client.
    /// Mirrors the helper pattern used in Story2_4_SystemEventsTests and Story2_5_CacheTests.
    /// </summary>
    private async Task<HttpClient> GetAuthenticatedClientAsync()
    {
        await Client.PostAsJsonAsync(
            "/api/auth/setup",
            new { username = "admin", password = "adminpassword123" });

        return await TestAuthHelper.CreateAuthenticatedClientAsync(
            Factory, "admin", "adminpassword123");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AC-7: auth guard — unauthenticated requests must be rejected
    // ─────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-7: GET /api/activity without auth → 401")]
    public async Task GetActivity_Unauthenticated_Returns401()
    {
        var response = await Client.GetAsync("/api/activity");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AC-7: authenticated request returns 200 with empty array when no activity
    // ─────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-7: GET /api/activity authenticated with no activity → 200 with empty data array")]
    public async Task GetActivity_Authenticated_NoActivity_Returns200WithEmptyArray()
    {
        var client = await GetAuthenticatedClientAsync();

        var response = await client.GetAsync("/api/activity");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        body.GetProperty("success").GetBoolean().Should().BeTrue();

        var data = body.GetProperty("data");
        data.ValueKind.Should().Be(JsonValueKind.Array);
        data.GetArrayLength().Should().Be(0);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AC-8: DELETE /api/activity clears all logs
    // ─────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-8: DELETE /api/activity authenticated → 200 with {success:true, data:null}")]
    public async Task DeleteActivity_Authenticated_Returns200WithSuccess()
    {
        var client = await GetAuthenticatedClientAsync();

        var response = await client.DeleteAsync("/api/activity");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        body.GetProperty("success").GetBoolean().Should().BeTrue();

        // data must be null (not an array — clear returns no payload)
        body.TryGetProperty("data", out var data).Should().BeTrue();
        data.ValueKind.Should().Be(JsonValueKind.Null);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AC-8: DELETE /api/activity without auth must also be rejected
    // ─────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-8: DELETE /api/activity without auth → 401")]
    public async Task DeleteActivity_Unauthenticated_Returns401()
    {
        var response = await Client.DeleteAsync("/api/activity");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AC-7: invalid type filter returns 400 with ACTIVITY_INVALID_TYPE
    // ─────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-7: GET /api/activity?type=BadType → 400 with ACTIVITY_INVALID_TYPE")]
    public async Task GetActivity_TypeInvalid_Returns400WithActivityInvalidType()
    {
        var client = await GetAuthenticatedClientAsync();

        var response = await client.GetAsync("/api/activity?type=BadType");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        body.GetProperty("success").GetBoolean().Should().BeFalse();
        body.GetProperty("error").GetProperty("code").GetString()
            .Should().Be("ACTIVITY_INVALID_TYPE");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AC-7: serviceId filter for non-existent service returns 404
    // ─────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-7: GET /api/activity?serviceId={nonExistent} → 404 with ACTIVITY_SERVICE_NOT_FOUND")]
    public async Task GetActivity_ServiceIdNotFound_Returns404WithActivityServiceNotFound()
    {
        var client = await GetAuthenticatedClientAsync();
        var nonExistentId = Guid.NewGuid();

        var response = await client.GetAsync($"/api/activity?serviceId={nonExistentId}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        body.GetProperty("success").GetBoolean().Should().BeFalse();
        body.GetProperty("error").GetProperty("code").GetString()
            .Should().Be("ACTIVITY_SERVICE_NOT_FOUND");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AC-10: PUT /api/settings/capture-headers persists setting
    // ─────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-10: PUT /api/settings/capture-headers {enabled:true} → 200 with captureFullHeaders:true")]
    public async Task PutSettings_CaptureHeaders_UpdatesSetting()
    {
        var client = await GetAuthenticatedClientAsync();

        var response = await client.PutAsJsonAsync(
            "/api/settings/capture-headers",
            new { enabled = true });

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        body.GetProperty("success").GetBoolean().Should().BeTrue();
        body.GetProperty("data").GetProperty("captureFullHeaders").GetBoolean().Should().BeTrue();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AC-10: GET /api/settings includes captureFullHeaders field
    // ─────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-10: GET /api/settings → response includes captureFullHeaders field")]
    public async Task GetSettings_IncludesCaptureFullHeaders()
    {
        var client = await GetAuthenticatedClientAsync();

        var response = await client.GetAsync("/api/settings");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        body.GetProperty("success").GetBoolean().Should().BeTrue();
        body.GetProperty("data").TryGetProperty("captureFullHeaders", out _).Should().BeTrue();
    }

    // ───────────────────────────────────────────────────────────────────────────
    // AC-7: pagination boundary — take > 200 capped server-side
    // ───────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-7: GET /api/activity?take=500 → 200 (server caps take at 200)")]
    public async Task GetActivity_TakeExceedsMax_Returns200()
    {
        var client = await GetAuthenticatedClientAsync();

        var response = await client.GetAsync("/api/activity?take=500");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        body.GetProperty("success").GetBoolean().Should().BeTrue();
    }

    // ───────────────────────────────────────────────────────────────────────────
    // AC-7: pagination boundary — negative skip clamped to 0 server-side
    // ───────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-7: GET /api/activity?skip=-5 → 200 (server clamps skip to 0)")]
    public async Task GetActivity_NegativeSkip_Returns200()
    {
        var client = await GetAuthenticatedClientAsync();

        var response = await client.GetAsync("/api/activity?skip=-5");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        body.GetProperty("success").GetBoolean().Should().BeTrue();
    }

    // ───────────────────────────────────────────────────────────────────────────
    // AC-7: combined filters — type + search accepted together in one request
    // ───────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-7: GET /api/activity?type=Mocked&search=api → 200 with combined filters")]
    public async Task GetActivity_CombinedFilters_Returns200WithEmptyArray()
    {
        var client = await GetAuthenticatedClientAsync();

        var response = await client.GetAsync("/api/activity?type=Mocked&search=api");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        body.GetProperty("success").GetBoolean().Should().BeTrue();
        body.GetProperty("data").ValueKind.Should().Be(JsonValueKind.Array);
    }
}
