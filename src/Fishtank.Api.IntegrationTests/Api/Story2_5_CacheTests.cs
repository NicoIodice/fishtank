using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Fishtank.Api.Data;
using Fishtank.Api.Data.Entities;
using Fishtank.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Fishtank.Api.IntegrationTests.Support;

namespace Fishtank.Api.IntegrationTests.Api;

/// <summary>
/// ATDD acceptance regression tests for Story 2.5:
/// Settings — Service Cache Management.
///
/// These exercise the HTTP surface of the not-yet-implemented
/// <see cref="Fishtank.Api.Endpoints.CacheEndpoints"/>:
///   - GET    /api/cache        → list all service cache stats
///   - DELETE /api/cache/{id}  → clear one service's WireMock in-memory cache
///   - DELETE /api/cache        → clear all running services' caches
///
/// All four tests are RED-phase scaffolds — they compile against the current
/// codebase but FAIL at runtime because CacheEndpoints.cs has not been created
/// and registered in Program.cs yet.
///
/// RED reasons per test:
///   GetCache_Unauthenticated_Returns401:
///     Endpoint not mapped → ASP.NET Core routing returns 404; test asserts 401.
///   GetCache_Authenticated_NoServices_Returns200WithEmptyArray:
///     Endpoint not mapped → 404; test asserts 200 OK.
///   DeleteCache_NonExistentId_Returns404WithServiceNotFound:
///     Endpoint not mapped → routing 404 with plain-text body; test calls
///     ReadFromJsonAsync which throws because the body is not a valid ApiEnvelope.
///   DeleteAllCaches_Authenticated_Returns200WithSuccess:
///     Endpoint not mapped → 404; test asserts 200 OK.
///
/// ACs covered: AC-1, AC-2, AC-3, AC-5.
/// </summary>
[Collection("Integration")]
public class Story2_5_CacheTests : IntegrationTestBase
{
    public Story2_5_CacheTests(FishtankWebApplicationFactory factory)
        : base(factory) { }

    /// <summary>
    /// Ensure the admin account exists (idempotent) and return an authenticated client.
    /// Mirrors the helper pattern used in Story2_4_SystemEventsTests.
    /// </summary>
    private async Task<HttpClient> GetAuthenticatedClientAsync()
    {
        await Client.PostAsJsonAsync(
            "/api/auth/setup",
            new { username = "admin", password = "adminpassword123" });

        return await TestAuthHelper.CreateAuthenticatedClientAsync(
            Factory, "admin", "adminpassword123");
    }

    // ─────────────────────────────────────────────────────────────────────
    // AC-5: auth guard — unauthenticated requests must be rejected
    // ─────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-5: GET /api/cache without auth → 401")]
    public async Task GetCache_Unauthenticated_Returns401()
    {
        // RED: /api/cache endpoint not mapped yet.
        // Routing returns 404; test asserts Unauthorized (401).
        var response = await Client.GetAsync("/api/cache");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ─────────────────────────────────────────────────────────────────────
    // AC-1: GET /api/cache returns cache list (empty array when no services)
    // ─────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-1: GET /api/cache authenticated with no services → 200 with empty array")]
    public async Task GetCache_Authenticated_NoServices_Returns200WithEmptyArray()
    {
        var client = await GetAuthenticatedClientAsync();

        // RED: /api/cache not mapped → 404 instead of 200.
        var response = await client.GetAsync("/api/cache");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("success").GetBoolean().Should().BeTrue();

        var data = body.GetProperty("data");
        data.ValueKind.Should().Be(JsonValueKind.Array);
        data.GetArrayLength().Should().Be(0);
    }

    // ─────────────────────────────────────────────────────────────────────
    // AC-2: DELETE /api/cache/{id} for non-existent service → 404 + SERVICE_NOT_FOUND
    // ─────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-2: DELETE /api/cache/{id} for non-existent service → 404 SERVICE_NOT_FOUND")]
    public async Task DeleteCache_NonExistentId_Returns404WithServiceNotFound()
    {
        var client = await GetAuthenticatedClientAsync();
        var nonExistentId = Guid.NewGuid();

        // RED: /api/cache/{id} not mapped → routing returns a plain-text 404.
        // The test asserts status 404 (passes) then calls ReadFromJsonAsync which
        // throws because the body is not a valid ApiEnvelope JSON object.
        var response = await client.DeleteAsync($"/api/cache/{nonExistentId}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("success").GetBoolean().Should().BeFalse();
        body.GetProperty("error")
            .GetProperty("code")
            .GetString()
            .Should().Be("SERVICE_NOT_FOUND");
    }

    // ─────────────────────────────────────────────────────────────────────
    // AC-3: DELETE /api/cache clears all service caches → 200 + null data
    // ─────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-3: DELETE /api/cache authenticated → 200 {\"success\":true,\"data\":null}")]
    public async Task DeleteAllCaches_Authenticated_Returns200WithSuccess()
    {
        var client = await GetAuthenticatedClientAsync();

        // RED: DELETE /api/cache not mapped → 404 instead of 200.
        var response = await client.DeleteAsync("/api/cache");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("success").GetBoolean().Should().BeTrue();
        body.GetProperty("data").ValueKind.Should().Be(JsonValueKind.Null);
    }

    // ─────────────────────────────────────────────────────────────────────
    // AC-5: Standard User (non-Admin) can access cache endpoints
    // ─────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-5: GET /api/cache with Standard User (non-Admin) auth → 200")]
    public async Task GetCache_StandardUser_Returns200()
    {
        // Ensure admin account exists (idempotent — setup is a no-op if DB already has a user)
        await Client.PostAsJsonAsync(
            "/api/auth/setup",
            new { username = "admin", password = "adminpassword123" });

        // Insert a StandardUser directly into the DB (no public register endpoint exists)
        const string stdUsername = "standarduser";
        const string stdPassword = "standardpassword123";

        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<FishtankDbContext>();
            var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();

            if (!await db.Users.AnyAsync(u => u.Username == stdUsername))
            {
                db.Users.Add(new User
                {
                    Username = stdUsername,
                    PasswordHash = hasher.Hash(stdPassword),
                    Role = UserRole.StandardUser,
                    IsActive = true,
                    ForcePasswordChange = false,
                });
                await db.SaveChangesAsync();
            }
        }

        // Log in as the standard user (non-Admin)
        var stdClient = await TestAuthHelper.CreateAuthenticatedClientAsync(
            Factory, stdUsername, stdPassword);

        // GET /api/cache with a non-Admin user must return 200 (no Admin-role policy on endpoint)
        var response = await stdClient.GetAsync("/api/cache");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("success").GetBoolean().Should().BeTrue();
        // data is an array (may be empty — no services configured in this test)
        body.GetProperty("data").ValueKind.Should().Be(JsonValueKind.Array);
    }
}
