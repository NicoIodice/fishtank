using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.Extensions.DependencyInjection;
using Fishtank.Api.IntegrationTests.Support;
using Fishtank.Api.Services;

namespace Fishtank.Api.IntegrationTests.Api;

/// <summary>
/// Acceptance tests for Story 3-2:
/// Network Activity Page — Real-Time Log Display.
///
/// Covers:
///   AC-1 — GET /api/activity returns rows newest-first.
///   AC-2 — ActivityHub registered at /hubs/activity; accepts authenticated negotiate.
///           Full SignalR push latency (NFR-3) is validated in Playwright E2E
///           (story-3-2-activity-page.spec.ts) where a real container is required.
/// </summary>
[Collection("Integration")]
public class Story3_2_ActivityHubTests : IntegrationTestBase
{
    public Story3_2_ActivityHubTests(FishtankWebApplicationFactory factory)
        : base(factory) { }

    private async Task<HttpClient> GetAuthenticatedClientAsync()
    {
        await Client.PostAsJsonAsync(
            "/api/auth/setup",
            new { username = "admin", password = "adminpassword123" });

        return await TestAuthHelper.CreateAuthenticatedClientAsync(
            Factory, "admin", "adminpassword123");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AC-2: ActivityHub registered and accepts authenticated negotiate
    // Pattern follows Story 2.3 (ServicesHub / EventsHub negotiate tests).
    // Full end-to-end SignalR push latency is tested in Playwright E2E.
    // ─────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-2: GET /hubs/activity without auth → 401")]
    public async Task ActivityHub_UnauthenticatedRequest_Returns401()
    {
        var response = await Client.GetAsync("/hubs/activity");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact(DisplayName = "AC-2: POST /hubs/activity/negotiate (authenticated) → 200 with connectionId")]
    public async Task ActivityHub_AuthenticatedNegotiate_Returns200WithConnectionId()
    {
        var client = await GetAuthenticatedClientAsync();

        var response = await client.PostAsync(
            "/hubs/activity/negotiate?negotiateVersion=1",
            new StringContent(string.Empty));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var content = await response.Content.ReadAsStringAsync();
        content.Should().Contain("connectionId");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AC-1: GET /api/activity returns rows in newest-first order
    // ─────────────────────────────────────────────────────────────────────────

    private async Task SeedActivityRowAsync(DateTimeOffset timestamp)
    {
        using var scope = Factory.Services.CreateScope();
        var svc = scope.ServiceProvider.GetRequiredService<IActivityService>();
        await svc.CaptureAsync(new Fishtank.Api.Models.ActivityRow
        {
            Timestamp = timestamp,
            Method = "GET",
            UrlPath = "/test",
            StatusCode = 200,
            Type = Fishtank.Api.Models.ActivityType.Mocked,
            ServiceId = Guid.NewGuid(),
            ServiceName = "Test",
            ServicePort = 30100,
            DurationMs = 10,
        });
    }

    [Fact(DisplayName = "AC-1: GET /api/activity returns rows in newest-first order")]
    public async Task GetActivity_ReturnsNewestFirst()
    {
        var client = await GetAuthenticatedClientAsync();

        // Seed three rows with distinct timestamps (oldest → newest)
        var t1 = DateTimeOffset.UtcNow.AddMinutes(-10);
        var t2 = DateTimeOffset.UtcNow.AddMinutes(-5);
        var t3 = DateTimeOffset.UtcNow;
        await SeedActivityRowAsync(t1);
        await SeedActivityRowAsync(t2);
        await SeedActivityRowAsync(t3);

        var response = await client.GetAsync("/api/activity?take=10");
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        var data = body.GetProperty("data");

        data.GetArrayLength().Should().BeGreaterThanOrEqualTo(3,
            "we just seeded 3 rows so at least 3 must be returned");

        // Verify rows are ordered newest-first (descending timestamp)
        var timestamps = data.EnumerateArray()
            .Select(item => DateTimeOffset.Parse(item.GetProperty("timestamp").GetString()!))
            .ToList();

        for (int i = 0; i < timestamps.Count - 1; i++)
        {
            timestamps[i].Should().BeOnOrAfter(
                timestamps[i + 1],
                $"Row {i} timestamp should be >= row {i + 1} timestamp (newest-first order)"
            );
        }
    }
}

