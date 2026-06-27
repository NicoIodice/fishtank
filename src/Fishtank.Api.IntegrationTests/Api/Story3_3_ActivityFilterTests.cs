using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Fishtank.Api.IntegrationTests.Support;
using Fishtank.Api.Services;
using Microsoft.Extensions.DependencyInjection;

namespace Fishtank.Api.IntegrationTests.Api;

/// <summary>
/// Acceptance tests for Story 3-3:
/// Activity Log Filtering, Sorting, Auto-refresh and Log Controls.
///
/// Tests cover the backend contract for filter + clear operations.
/// These validate that the API query params work correctly so that
/// the Story 3-3 frontend (client-side filtering) can trust the API contract.
///
/// ACs covered (via integration test):
///   T1 — GET /api/activity?serviceId={id} returns only rows for that service (P1)
///   T2 — GET /api/activity?type=Mocked / type=Proxied returns only matching rows (P1)
///   T3 — GET /api/activity?search={q} matches URL path + method (case-insensitive, OR) (P1)
///   T4 — DELETE /api/activity clears all rows and GET returns empty array (P0 — AC-10)
/// </summary>
[Collection("Integration")]
public class Story3_3_ActivityFilterTests : IntegrationTestBase
{
    public Story3_3_ActivityFilterTests(FishtankWebApplicationFactory factory)
        : base(factory) { }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    private async Task<HttpClient> GetAuthenticatedClientAsync()
    {
        await Client.PostAsJsonAsync(
            "/api/auth/setup",
            new { username = "admin", password = "adminpassword123" });

        return await TestAuthHelper.CreateAuthenticatedClientAsync(
            Factory, "admin", "adminpassword123");
    }

    /// <summary>Seed an activity row directly via the service layer (bypasses HTTP).</summary>
    private async Task SeedRowAsync(
        Guid? serviceId = null,
        Fishtank.Api.Models.ActivityType type = Fishtank.Api.Models.ActivityType.Mocked,
        string urlPath = "/test",
        string method = "GET",
        int statusCode = 200)
    {
        using var scope = Factory.Services.CreateScope();
        var svc = scope.ServiceProvider.GetRequiredService<IActivityService>();
        await svc.CaptureAsync(new Fishtank.Api.Models.ActivityRow
        {
            Id = Guid.NewGuid(),
            Timestamp = DateTimeOffset.UtcNow,
            Method = method,
            UrlPath = urlPath,
            StatusCode = statusCode,
            Type = type,
            ServiceId = serviceId ?? Guid.NewGuid(),
            ServiceName = "Test Service",
            ServicePort = 30100,
            DurationMs = 10,
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // T1: Filter by serviceId
    // ─────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "T1: GET /api/activity?serviceId={id} returns only rows for that service (P1)")]
    public async Task GetActivity_FilterByServiceId_ReturnsOnlyMatchingRows()
    {
        var targetServiceId = Guid.NewGuid();
        var otherServiceId = Guid.NewGuid();

        await SeedRowAsync(serviceId: targetServiceId, urlPath: "/target-path");
        await SeedRowAsync(serviceId: otherServiceId, urlPath: "/other-path");

        var client = await GetAuthenticatedClientAsync();
        var response = await client.GetAsync($"/api/activity?serviceId={targetServiceId}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        body.GetProperty("success").GetBoolean().Should().BeTrue();

        var data = body.GetProperty("data");
        data.GetArrayLength().Should().Be(1,
            because: "only one row was seeded for the target serviceId");
        data[0].GetProperty("urlPath").GetString().Should().Be("/target-path");
        data[0].GetProperty("serviceId").GetString().Should()
            .Be(targetServiceId.ToString());
    }

    [Fact(DisplayName = "T1: GET /api/activity without serviceId filter returns all rows")]
    public async Task GetActivity_NoServiceIdFilter_ReturnsAllRows()
    {
        var serviceA = Guid.NewGuid();
        var serviceB = Guid.NewGuid();

        await SeedRowAsync(serviceId: serviceA, urlPath: "/service-a");
        await SeedRowAsync(serviceId: serviceB, urlPath: "/service-b");

        var client = await GetAuthenticatedClientAsync();
        var response = await client.GetAsync("/api/activity");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        var data = body.GetProperty("data");
        data.GetArrayLength().Should().Be(2,
            because: "both rows from different services should be returned");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // T2: Filter by type=Mocked / type=Proxied
    // ─────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "T2: GET /api/activity?type=Mocked returns only Mocked rows (P1)")]
    public async Task GetActivity_FilterByTypeMocked_ReturnsOnlyMockedRows()
    {
        await SeedRowAsync(
            type: Fishtank.Api.Models.ActivityType.Mocked,
            urlPath: "/mocked-path");
        await SeedRowAsync(
            type: Fishtank.Api.Models.ActivityType.Proxied,
            urlPath: "/proxied-path");

        var client = await GetAuthenticatedClientAsync();
        var response = await client.GetAsync("/api/activity?type=Mocked");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        var data = body.GetProperty("data");

        data.GetArrayLength().Should().Be(1,
            because: "only one Mocked row was seeded");
        data[0].GetProperty("type").GetString().Should().Be("Mocked");
        data[0].GetProperty("urlPath").GetString().Should().Be("/mocked-path");
    }

    [Fact(DisplayName = "T2: GET /api/activity?type=Proxied returns only Proxied rows (P1)")]
    public async Task GetActivity_FilterByTypeProxied_ReturnsOnlyProxiedRows()
    {
        await SeedRowAsync(
            type: Fishtank.Api.Models.ActivityType.Mocked,
            urlPath: "/mocked-path");
        await SeedRowAsync(
            type: Fishtank.Api.Models.ActivityType.Proxied,
            urlPath: "/proxied-path");

        var client = await GetAuthenticatedClientAsync();
        var response = await client.GetAsync("/api/activity?type=Proxied");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        var data = body.GetProperty("data");

        data.GetArrayLength().Should().Be(1,
            because: "only one Proxied row was seeded");
        data[0].GetProperty("type").GetString().Should().Be("Proxied");
        data[0].GetProperty("urlPath").GetString().Should().Be("/proxied-path");
    }

    [Fact(DisplayName = "T2: GET /api/activity?type=mocked (lowercase) returns only Mocked rows (case-insensitive)")]
    public async Task GetActivity_FilterByTypeLowercase_IsCaseInsensitive()
    {
        await SeedRowAsync(
            type: Fishtank.Api.Models.ActivityType.Mocked,
            urlPath: "/mocked-path");
        await SeedRowAsync(
            type: Fishtank.Api.Models.ActivityType.Proxied,
            urlPath: "/proxied-path");

        var client = await GetAuthenticatedClientAsync();
        // Lowercase type value must still match
        var response = await client.GetAsync("/api/activity?type=mocked");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        var data = body.GetProperty("data");
        data.GetArrayLength().Should().Be(1);
        data[0].GetProperty("type").GetString().Should().Be("Mocked");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // T3: Filter by search (URL path + method, case-insensitive OR logic)
    // ─────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "T3: GET /api/activity?search=payment matches URL path (case-insensitive) (P1)")]
    public async Task GetActivity_FilterBySearch_MatchesUrlPath_CaseInsensitive()
    {
        await SeedRowAsync(urlPath: "/api/PAYMENT/create", method: "POST");
        await SeedRowAsync(urlPath: "/api/orders/list", method: "GET");

        var client = await GetAuthenticatedClientAsync();
        var response = await client.GetAsync("/api/activity?search=payment");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        var data = body.GetProperty("data");

        data.GetArrayLength().Should().Be(1,
            because: "only the path containing 'PAYMENT' (case-insensitive) should match");
        data[0].GetProperty("urlPath").GetString().Should().Be("/api/PAYMENT/create");
    }

    [Fact(DisplayName = "T3: GET /api/activity?search=post matches HTTP method (case-insensitive) (P1)")]
    public async Task GetActivity_FilterBySearch_MatchesMethod_CaseInsensitive()
    {
        await SeedRowAsync(method: "POST", urlPath: "/api/something");
        await SeedRowAsync(method: "GET", urlPath: "/api/other");

        var client = await GetAuthenticatedClientAsync();
        var response = await client.GetAsync("/api/activity?search=post");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        var data = body.GetProperty("data");

        data.GetArrayLength().Should().Be(1,
            because: "only the POST-method row should match search=post");
        data[0].GetProperty("method").GetString().Should().Be("POST");
    }

    [Fact(DisplayName = "T3: GET /api/activity?search=post matches both method AND path rows (OR logic) (P1)")]
    public async Task GetActivity_FilterBySearch_AppliesOrLogicAcrossMethodAndPath()
    {
        // Row 1: method matches
        await SeedRowAsync(method: "POST", urlPath: "/api/orders");
        // Row 2: path matches
        await SeedRowAsync(method: "GET", urlPath: "/api/post-office");
        // Row 3: neither matches
        await SeedRowAsync(method: "GET", urlPath: "/api/other");

        var client = await GetAuthenticatedClientAsync();
        var response = await client.GetAsync("/api/activity?search=post");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        var data = body.GetProperty("data");

        data.GetArrayLength().Should().Be(2,
            because: "both the POST method row and the /api/post-office path row should match (OR logic)");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // T4: DELETE /api/activity clears all rows (P0 — AC-10)
    // ─────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "T4: DELETE /api/activity after seeding rows → GET returns empty array (P0 — AC-10)")]
    public async Task DeleteActivity_AfterSeedingRows_GetReturnsEmptyArray()
    {
        // Seed two rows so we have meaningful data to clear
        await SeedRowAsync(urlPath: "/row-1");
        await SeedRowAsync(urlPath: "/row-2");

        var client = await GetAuthenticatedClientAsync();

        // Verify rows are present before delete
        var beforeResponse = await client.GetAsync("/api/activity");
        var beforeBody = await beforeResponse.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        beforeBody.GetProperty("data").GetArrayLength().Should().Be(2,
            because: "two rows were seeded");

        // Clear all rows
        var deleteResponse = await client.DeleteAsync("/api/activity");
        deleteResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var deleteBody = await deleteResponse.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        deleteBody.GetProperty("success").GetBoolean().Should().BeTrue();

        // Verify all rows are gone
        var afterResponse = await client.GetAsync("/api/activity");
        var afterBody = await afterResponse.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);

        afterBody.GetProperty("success").GetBoolean().Should().BeTrue();
        afterBody.GetProperty("data").GetArrayLength().Should().Be(0,
            because: "DELETE /api/activity must clear all rows");
    }

    [Fact(DisplayName = "T4: DELETE /api/activity on empty store → still returns 200 OK (P0 — AC-10)")]
    public async Task DeleteActivity_WhenAlreadyEmpty_Returns200OK()
    {
        var client = await GetAuthenticatedClientAsync();

        // First clear (empty store)
        var response = await client.DeleteAsync("/api/activity");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        body.GetProperty("success").GetBoolean().Should().BeTrue();
    }

    [Fact(DisplayName = "T4: DELETE /api/activity without auth → 401 (P0 — AC-10)")]
    public async Task DeleteActivity_Unauthenticated_Returns401()
    {
        var response = await Client.DeleteAsync("/api/activity");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // T5: AND logic — serviceId + type combined filter (AC-4)
    // ─────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "T5: GET /api/activity?serviceId={A}&type=Mocked uses AND logic, not OR (AC-4)")]
    public async Task GetActivity_FilterByServiceIdAndType_UsesAndLogic()
    {
        var serviceA = Guid.NewGuid();
        var serviceB = Guid.NewGuid();

        // Row matches BOTH filters (serviceA + Mocked) — should be returned
        await SeedRowAsync(serviceId: serviceA,
            type: Fishtank.Api.Models.ActivityType.Mocked,
            urlPath: "/a-mocked");

        // Row matches serviceA but NOT Mocked — should NOT be returned
        await SeedRowAsync(serviceId: serviceA,
            type: Fishtank.Api.Models.ActivityType.Proxied,
            urlPath: "/a-proxied");

        // Row matches Mocked but NOT serviceA — should NOT be returned
        await SeedRowAsync(serviceId: serviceB,
            type: Fishtank.Api.Models.ActivityType.Mocked,
            urlPath: "/b-mocked");

        var client = await GetAuthenticatedClientAsync();
        var response = await client.GetAsync(
            $"/api/activity?serviceId={serviceA}&type=Mocked");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        body.GetProperty("success").GetBoolean().Should().BeTrue();

        var data = body.GetProperty("data");
        data.GetArrayLength().Should().Be(1,
            because: "only the row matching BOTH serviceId AND type=Mocked should be returned (AND logic)");

        data[0].GetProperty("urlPath").GetString().Should().Be("/a-mocked");
        data[0].GetProperty("serviceId").GetString().Should().Be(serviceA.ToString());
        data[0].GetProperty("type").GetString().Should().Be("Mocked");
    }
}
