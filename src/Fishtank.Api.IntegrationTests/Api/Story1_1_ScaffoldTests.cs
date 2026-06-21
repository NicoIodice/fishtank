using System.Net;
using FluentAssertions;
using Fishtank.Api.IntegrationTests.Support;

namespace Fishtank.Api.IntegrationTests.Api;

/// <summary>
/// ATDD acceptance test scaffolds for Story 1.1:
/// Project Scaffold, Docker Image &amp; CI Pipeline.
///
/// RED PHASE — these tests define the expected end-state behaviour.
/// They FAIL before implementation and PASS once all ACs are complete.
///
/// AC1:  WeatherForecast placeholder removed → GET /weatherforecast no longer returns JSON weather data
/// AC3b: SPA static files served → GET / returns HTML (index.html)
/// AC3c: SPA fallback → GET /not-an-api-route returns index.html (not 404)
/// AC2:  Health endpoint reachable without auth → GET /health returns 200
/// </summary>
[Collection("Integration")]
public class Story1_1_ScaffoldTests : IntegrationTestBase
{
    public Story1_1_ScaffoldTests(FishtankWebApplicationFactory factory) : base(factory) { }

    // ─────────────────────────────────────────────────────────────────────────
    // AC1 — Placeholder endpoint removed
    // RED:  Currently returns HTTP 200 with application/json (WeatherForecast in Program.cs)
    // GREEN: WeatherForecast endpoint removed; /weatherforecast is now handled by SPA fallback
    //        (returns text/html, not application/json weather data)
    // ─────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC1: GET /weatherforecast returns HTML not JSON (placeholder removed, SPA fallback active)")]
    public async Task GET_weatherforecast_Returns_Html_After_Placeholder_Removed()
    {
        // Given: the API has no placeholder endpoints and SPA fallback is configured

        // When
        var response = await Client.GetAsync("/weatherforecast");

        // Then: the placeholder weather API is gone; SPA fallback serves index.html
        response.StatusCode.Should().Be(
            HttpStatusCode.OK,
            "SPA fallback serves index.html for non-API routes");
        response.Content.Headers.ContentType?.MediaType.Should().Be(
            "text/html",
            "the WeatherForecast placeholder must be removed — SPA fallback returns HTML, not JSON");
        var body = await response.Content.ReadAsStringAsync();
        body.Should().NotContain(
            "temperatureC",
            "no weather data must be returned; the placeholder endpoint is gone");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AC2 — Health endpoint accessible
    // Note: GET /health already passes in HealthTests.cs.
    //       This test verifies it remains accessible after scaffold cleanup.
    // ─────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC2: GET /health returns 200 (health endpoint operational)")]
    public async Task GET_health_Returns_200_After_Scaffold_Cleanup()
    {
        // Given: the API is running with health checks configured

        // When
        var response = await Client.GetAsync("/health");

        // Then
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AC3b — SPA static files: GET / returns HTML
    // RED:  Currently returns 204/200 with no HTML body (no wwwroot in test env
    //       until UseStaticFiles() + UseDefaultFiles() are configured)
    // GREEN: Returns 200 with Content-Type: text/html after Task 3 (SPA serving)
    //
    // Note: In WebApplicationFactory tests, wwwroot files are not served
    //       unless explicitly configured. This test uses a minimal wwwroot
    //       setup via ConfigureWebHost in FishtankWebApplicationFactory.
    //       If wwwroot is not present in test env, this will return 404 → RED.
    // ─────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC3b: GET / returns HTML content-type (SPA static files served)")]
    public async Task GET_root_Returns_Html_ContentType()
    {
        // Given: SPA static files are configured (UseDefaultFiles + UseStaticFiles)

        // When
        var response = await Client.GetAsync("/");

        // Then: root serves index.html
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        response.Content.Headers.ContentType?.MediaType.Should()
            .Be("text/html", "the root path must serve index.html from wwwroot");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AC3c — SPA fallback: unknown client routes return index.html (not 404)
    // RED:  Returns 404 before MapFallbackToFile is configured
    // GREEN: Returns 200 with index.html after Task 3 (MapFallbackToFile)
    // ─────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC3c: GET /services returns HTML (SPA fallback serves index.html)")]
    public async Task GET_spaRoute_Returns_Html_Via_Fallback()
    {
        // Given: MapFallbackToFile("index.html") is configured

        // When: a React Router client-side route is accessed directly
        var response = await Client.GetAsync("/services");

        // Then: the SPA shell is served (not a 404)
        response.StatusCode.Should().Be(
            HttpStatusCode.OK,
            "client-side routes must be served by index.html via MapFallbackToFile — not a 404");
        response.Content.Headers.ContentType?.MediaType.Should()
            .Be("text/html", "the fallback must return HTML (index.html), not JSON or plain text");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AC3c (negative) — API routes are NOT swallowed by SPA fallback
    // RED:  N/A — this should pass even before implementation (future guard test)
    // GREEN: Passes once SPA fallback excludes /api/* routes
    // ─────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC3c-neg: GET /api/unknown returns 404 (API routes not caught by SPA fallback)")]
    public async Task GET_apiRoute_NotCaught_By_SpaFallback()
    {
        // Given: SPA fallback is configured to exclude /api/* paths

        // When: an unknown API route is requested
        var response = await Client.GetAsync("/api/this-route-does-not-exist");

        // Then: the SPA fallback does NOT serve index.html for API routes
        response.StatusCode.Should().Be(
            HttpStatusCode.NotFound,
            "the SPA fallback must not intercept /api/* routes — only client-side navigation paths");
        response.Content.Headers.ContentType?.MediaType.Should()
            .NotBe("text/html", "API 404 responses must be JSON or empty, not HTML");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SPA exclusion edge cases — guard tests for exact-path and prefix variants
    // ─────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "SPA exclusion: GET /api (no trailing slash) returns 404, not HTML")]
    public async Task GET_api_ExactPath_NotCaught_By_SpaFallback()
    {
        // When: /api with no trailing slash is requested
        var response = await Client.GetAsync("/api");

        // Then: exclusion covers exact /api path as well as /api/*
        response.StatusCode.Should().Be(
            HttpStatusCode.NotFound,
            "SPA fallback must exclude /api (no slash) as well as /api/* paths");
        response.Content.Headers.ContentType?.MediaType.Should()
            .NotBe("text/html", "/api should not return HTML");
    }

    [Fact(DisplayName = "SPA exclusion: GET /hubs/signalr returns 404, not HTML")]
    public async Task GET_hubsRoute_NotCaught_By_SpaFallback()
    {
        // When: a SignalR hub route is requested (not yet registered)
        var response = await Client.GetAsync("/hubs/signalr");

        // Then: SPA fallback must not intercept /hubs/* routes
        response.StatusCode.Should().Be(
            HttpStatusCode.NotFound,
            "SPA fallback must not intercept /hubs/* routes — these are SignalR hub paths");
        response.Content.Headers.ContentType?.MediaType.Should()
            .NotBe("text/html", "/hubs routes should not return HTML");
    }

    [Fact(DisplayName = "SPA exclusion: GET /openapi returns 404 outside Development environment")]
    public async Task GET_openapi_Returns_NotFound_Outside_Dev()
    {
        // Given: the test environment is "Testing" (not Development), so MapOpenApi is NOT registered

        // When: OpenAPI endpoint is requested
        var response = await Client.GetAsync("/openapi");

        // Then: SPA fallback excludes /openapi; no HTML fallback
        response.StatusCode.Should().Be(
            HttpStatusCode.NotFound,
            "SPA fallback must exclude /openapi; in Testing environment, MapOpenApi is not registered");
    }
}
