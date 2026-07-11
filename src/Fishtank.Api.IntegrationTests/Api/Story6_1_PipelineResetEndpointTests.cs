using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Fishtank.Api.Data;
using Fishtank.Api.Data.Entities;
using Fishtank.Api.IntegrationTests.Support;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Fishtank.Api.IntegrationTests.Api;

/// <summary>
/// ATDD acceptance test scaffolds for Story 6.1:
/// Pipeline Reset Endpoint — POST /api/admin/reset.
///
/// RED PHASE — these tests define the expected end-state behaviour.
/// They FAIL before implementation and PASS once all ACs are complete.
///
/// AC-1:  Valid API key → 200 with correct envelope
/// AC-2:  Invalid API key → 401 with ADMIN_RESET_INVALID_KEY
/// AC-3:  Missing X-Pipeline-Key header → 401 with ADMIN_RESET_KEY_MISSING
/// AC-4:  Env var not set → 403 with ADMIN_RESET_DISABLED
/// AC-5:  JWT auth alone not sufficient → 401
/// AC-6:  Activity log cleared
/// AC-7:  Proxy counters reset
/// AC-8:  Mappings reloaded from disk
/// AC-9:  Running services unaffected
/// AC-10: Health endpoint unaffected
/// AC-11: Response envelope format
/// AC-12: Error envelope format
/// AC-13: Idempotency (multiple calls)
///
/// RED reasons:
///   POST /api/admin/reset is not mapped → all requests return 404
/// </summary>
[Collection("Integration")]
public class Story6_1_PipelineResetEndpointTests : IntegrationTestBase
{
    private const string ValidApiKey = "test-reset-key-32chars-minimum!!";
    private const string InvalidApiKey = "wrong-key-value";
    private const string AdminUsername = "admin";
    private const string AdminPassword = "adminpassword123";

    public Story6_1_PipelineResetEndpointTests(FishtankWebApplicationFactory factory) : base(factory) { }

    /// <summary>Creates a test client with X-Pipeline-Key header set.</summary>
    private HttpClient CreateClientWithApiKey(string? apiKey = null)
    {
        var client = Factory.CreateClient(new Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false,
        });
        if (apiKey != null)
        {
            client.DefaultRequestHeaders.Add("X-Pipeline-Key", apiKey);
        }
        return client;
    }

    /// <summary>Ensures admin account exists and returns an authenticated admin HttpClient.</summary>
    private async Task<HttpClient> GetAdminClientAsync()
    {
        await Client.PostAsJsonAsync("/api/auth/setup", new { username = AdminUsername, password = AdminPassword });
        return await TestAuthHelper.CreateAuthenticatedClientAsync(Factory, AdminUsername, AdminPassword);
    }

    /// <summary>Seeds activity log entries for testing clear operation.</summary>
    private async Task SeedActivityLogEntriesAsync(int count = 5)
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<FishtankDbContext>();

        for (int i = 0; i < count; i++)
        {
            db.Add(new SystemEvent
            {
                CreatedAt = DateTimeOffset.UtcNow.AddMinutes(-i),
                Message = $"Test entry {i}",
                Severity = SystemEventSeverity.Info
            });
        }
        await db.SaveChangesAsync();
    }

    // -------------------------------------------------------------------------
    // AC-1 — Valid API key → 200 with correct envelope
    // RED:  Returns 404 (endpoint not mapped yet)
    // GREEN: HTTP 200 with {"success":true,"data":{"entriesCleared":N,"mappingsReloaded":M}}
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AC-1: Valid API key → HTTP 200 with success envelope")]
    public async Task PostReset_ValidApiKey_Returns200WithEnvelope()
    {
        // Arrange
        await SeedActivityLogEntriesAsync(3);
        var client = CreateClientWithApiKey(ValidApiKey);

        // Act
        var response = await client.PostAsync("/api/admin/reset", null);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK,
            "Valid API key should grant access to pipeline reset endpoint");

        var body = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(body).RootElement;
        json.GetProperty("success").GetBoolean().Should().BeTrue();
        json.GetProperty("data").GetProperty("entriesCleared").GetInt32().Should().BeGreaterThanOrEqualTo(0);
        json.GetProperty("data").GetProperty("mappingsReloaded").GetInt32().Should().BeGreaterThanOrEqualTo(0);
    }

    // -------------------------------------------------------------------------
    // AC-2 — Invalid API key → 401 with ADMIN_RESET_INVALID_KEY
    // RED:  Returns 404 (endpoint not mapped yet)
    // GREEN: HTTP 401 with error code ADMIN_RESET_INVALID_KEY
    // Risk: R-E6-001 (API key brute force)
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AC-2: Invalid API key → HTTP 401 ADMIN_RESET_INVALID_KEY")]
    public async Task PostReset_InvalidApiKey_Returns401()
    {
        // Arrange
        var client = CreateClientWithApiKey(InvalidApiKey);

        // Act
        var response = await client.PostAsync("/api/admin/reset", null);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized,
            "Invalid API key should be rejected");

        var body = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(body).RootElement;
        json.GetProperty("success").GetBoolean().Should().BeFalse();
        json.GetProperty("error").GetProperty("code").GetString()
            .Should().Be("ADMIN_RESET_INVALID_KEY");
    }

    [Fact(DisplayName = "AC-2: Error response does NOT leak API key value")]
    public async Task PostReset_InvalidApiKey_DoesNotLeakKeyInResponse()
    {
        // Arrange
        var client = CreateClientWithApiKey(InvalidApiKey);

        // Act
        var response = await client.PostAsync("/api/admin/reset", null);

        // Assert
        var body = await response.Content.ReadAsStringAsync();
        body.Should().NotContain(InvalidApiKey, "Error response must not leak attempted key value");
        body.Should().NotContain(ValidApiKey, "Error response must not leak configured key value");
    }

    // -------------------------------------------------------------------------
    // AC-3 — Missing X-Pipeline-Key header → 401 with ADMIN_RESET_KEY_MISSING
    // RED:  Returns 404 (endpoint not mapped yet)
    // GREEN: HTTP 401 with error code ADMIN_RESET_KEY_MISSING
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AC-3: Missing X-Pipeline-Key header → HTTP 401 ADMIN_RESET_KEY_MISSING")]
    public async Task PostReset_MissingApiKeyHeader_Returns401()
    {
        // Arrange — no API key header set
        var client = CreateClientWithApiKey(null);

        // Act
        var response = await client.PostAsync("/api/admin/reset", null);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized,
            "Missing API key header should be rejected");

        var body = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(body).RootElement;
        json.GetProperty("success").GetBoolean().Should().BeFalse();
        json.GetProperty("error").GetProperty("code").GetString()
            .Should().Be("ADMIN_RESET_KEY_MISSING");
    }

    // -------------------------------------------------------------------------
    // AC-4 — Env var not set → 403 with ADMIN_RESET_DISABLED
    // RED:  Returns 404 (endpoint not mapped yet)
    // GREEN: HTTP 403 with error code ADMIN_RESET_DISABLED and explicit message
    // Risk: R-E6-002 (Pipeline reset without API key configured)
    // NOTE: This test requires a separate factory configuration with FISHTANK_PIPELINE_RESET_KEY unset.
    //       For now, we assume the test factory HAS the key configured (default).
    //       A separate test collection would be needed to test the "key not configured" scenario.
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AC-4: Env var not set → HTTP 403 ADMIN_RESET_DISABLED (SKIP: requires separate test fixture)")]
    public async Task PostReset_EnvVarNotSet_Returns403()
    {
        // TODO: This test requires a WebApplicationFactory without FISHTANK_PIPELINE_RESET_KEY configured.
        // Current factory setup always includes the key for other tests.
        // Implementation approach:
        // 1. Create a separate collection fixture with key disabled
        // 2. Move this test to that collection
        // 3. Assert HTTP 403 with message: "Pipeline reset is disabled — configure FISHTANK_PIPELINE_RESET_KEY to enable this endpoint."

        // For RED phase, we skip with explanation — implementation will create proper fixture.
        await Task.CompletedTask;
        Assert.True(false, "Test requires separate fixture configuration — implement during GREEN phase");
    }

    // -------------------------------------------------------------------------
    // AC-5 — JWT auth alone not sufficient → 401
    // RED:  Returns 404 (endpoint not mapped yet)
    // GREEN: HTTP 401 — JWT cookie present but no X-Pipeline-Key header → rejected
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AC-5: JWT auth alone (no X-Pipeline-Key) → HTTP 401")]
    public async Task PostReset_JwtAuthWithoutApiKey_Returns401()
    {
        // Arrange — authenticated admin client but NO X-Pipeline-Key header
        var adminClient = await GetAdminClientAsync();
        // Do NOT add X-Pipeline-Key header

        // Act
        var response = await adminClient.PostAsync("/api/admin/reset", null);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized,
            "JWT auth alone should not be sufficient — API key is required");

        var body = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(body).RootElement;
        json.GetProperty("success").GetBoolean().Should().BeFalse();
        json.GetProperty("error").GetProperty("code").GetString()
            .Should().Be("ADMIN_RESET_KEY_MISSING");
    }

    // -------------------------------------------------------------------------
    // AC-6 — Activity log cleared
    // RED:  Returns 404 (endpoint not mapped yet)
    // GREEN: Activity log entries are cleared; subsequent GET /api/activity returns empty
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AC-6: Activity log cleared after reset")]
    public async Task PostReset_ClearsActivityLog()
    {
        // Arrange
        await SeedActivityLogEntriesAsync(5);
        var client = CreateClientWithApiKey(ValidApiKey);

        // Verify entries exist before reset
        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<FishtankDbContext>();
            var count = await db.SystemEvents.CountAsync();
            count.Should().BeGreaterThanOrEqualTo(5, "Test data should be seeded");
        }

        // Act
        var resetResponse = await client.PostAsync("/api/admin/reset", null);
        resetResponse.EnsureSuccessStatusCode();

        // Assert
        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<FishtankDbContext>();
            var count = await db.SystemEvents.CountAsync();
            count.Should().Be(0, "All activity log entries should be cleared after reset");
        }
    }

    // -------------------------------------------------------------------------
    // AC-7 — Proxy counters reset
    // RED:  Returns 404 (endpoint not mapped yet)
    // GREEN: In-memory proxy counters for all services are reset to zero
    // NOTE: This requires services to be running and counter state to be inspectable.
    //       For RED phase, we document the expectation — implementation TBD.
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AC-7: Proxy counters reset (SKIP: requires service counter inspection)")]
    public async Task PostReset_ResetsProxyCounters()
    {
        // TODO: Implementation requires:
        // 1. Start a service
        // 2. Send requests through the proxy to increment counters
        // 3. Call POST /api/admin/reset
        // 4. Verify counters are back to zero (requires service stats endpoint or inspection API)

        await Task.CompletedTask;
        Assert.True(false, "Test requires service counter inspection API — implement during GREEN phase");
    }

    // -------------------------------------------------------------------------
    // AC-8 — Mappings reloaded from disk
    // RED:  Returns 404 (endpoint not mapped yet)
    // GREEN: WireMock mappings for all services are reloaded from disk
    // NOTE: This requires:
    //       1. A service with mappings on disk
    //       2. Modify mapping file
    //       3. Call reset
    //       4. Verify new mapping is active
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AC-8: Mappings reloaded from disk (SKIP: requires mapping file modification)")]
    public async Task PostReset_ReloadsMappingsFromDisk()
    {
        // TODO: Implementation requires:
        // 1. Create a service with mapping file on disk
        // 2. Modify mapping file content
        // 3. Call POST /api/admin/reset
        // 4. Verify updated mapping is active in WireMock engine

        await Task.CompletedTask;
        Assert.True(false, "Test requires mapping file modification and verification — implement during GREEN phase");
    }

    // -------------------------------------------------------------------------
    // AC-9 — Running services unaffected
    // RED:  Returns 404 (endpoint not mapped yet)
    // GREEN: Services continue running after reset — no restart, no port rebinding
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AC-9: Running services unaffected by reset (SKIP: requires service lifecycle inspection)")]
    public async Task PostReset_DoesNotRestartServices()
    {
        // TODO: Implementation requires:
        // 1. Start a service
        // 2. Record service process ID or connection state
        // 3. Call POST /api/admin/reset
        // 4. Verify service still running with same process ID / connection state

        await Task.CompletedTask;
        Assert.True(false, "Test requires service lifecycle inspection — implement during GREEN phase");
    }

    // -------------------------------------------------------------------------
    // AC-10 — Health endpoint unaffected
    // RED:  Returns 404 (endpoint not mapped yet)
    // GREEN: GET /health returns 200 immediately after reset
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AC-10: Health endpoint unaffected after reset")]
    public async Task PostReset_HealthEndpointStillWorks()
    {
        // Arrange
        var client = CreateClientWithApiKey(ValidApiKey);

        // Act
        var resetResponse = await client.PostAsync("/api/admin/reset", null);
        resetResponse.EnsureSuccessStatusCode();

        var healthResponse = await client.GetAsync("/health");

        // Assert
        healthResponse.StatusCode.Should().Be(HttpStatusCode.OK,
            "Health endpoint should remain operational after pipeline reset");
    }

    // -------------------------------------------------------------------------
    // AC-11 — Response envelope format
    // RED:  Returns 404 (endpoint not mapped yet)
    // GREEN: Success response contains {"success":true,"data":{"entriesCleared":<int>,"mappingsReloaded":<int>}}
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AC-11: Response envelope format correct")]
    public async Task PostReset_ResponseEnvelopeFormat()
    {
        // Arrange
        await SeedActivityLogEntriesAsync(3);
        var client = CreateClientWithApiKey(ValidApiKey);

        // Act
        var response = await client.PostAsync("/api/admin/reset", null);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(body).RootElement;

        // Verify envelope structure
        json.TryGetProperty("success", out var successProp).Should().BeTrue();
        successProp.GetBoolean().Should().BeTrue();

        json.TryGetProperty("data", out var dataProp).Should().BeTrue();
        dataProp.TryGetProperty("entriesCleared", out var entriesProp).Should().BeTrue();
        dataProp.TryGetProperty("mappingsReloaded", out var mappingsProp).Should().BeTrue();

        // Verify types are integers
        entriesProp.ValueKind.Should().Be(JsonValueKind.Number);
        mappingsProp.ValueKind.Should().Be(JsonValueKind.Number);
    }

    // -------------------------------------------------------------------------
    // AC-12 — Error envelope format
    // RED:  Returns 404 (endpoint not mapped yet)
    // GREEN: Error response contains {"success":false,"error":{"code":"ADMIN_*","message":"..."}}
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AC-12: Error envelope format correct")]
    public async Task PostReset_ErrorEnvelopeFormat()
    {
        // Arrange
        var client = CreateClientWithApiKey(InvalidApiKey);

        // Act
        var response = await client.PostAsync("/api/admin/reset", null);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);

        var body = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(body).RootElement;

        // Verify error envelope structure
        json.TryGetProperty("success", out var successProp).Should().BeTrue();
        successProp.GetBoolean().Should().BeFalse();

        json.TryGetProperty("error", out var errorProp).Should().BeTrue();
        errorProp.TryGetProperty("code", out var codeProp).Should().BeTrue();
        errorProp.TryGetProperty("message", out var messageProp).Should().BeTrue();

        codeProp.GetString().Should().StartWith("ADMIN_", "Error codes should use ADMIN_* prefix");
    }

    // -------------------------------------------------------------------------
    // AC-13 — Idempotency (multiple calls)
    // RED:  Returns 404 (endpoint not mapped yet)
    // GREEN: Multiple consecutive resets succeed with HTTP 200
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AC-13: Multiple consecutive resets succeed (idempotency)")]
    public async Task PostReset_MultipleConsecutiveCalls_AllSucceed()
    {
        // Arrange
        var client = CreateClientWithApiKey(ValidApiKey);

        // Act — call reset 3 times
        var response1 = await client.PostAsync("/api/admin/reset", null);
        var response2 = await client.PostAsync("/api/admin/reset", null);
        var response3 = await client.PostAsync("/api/admin/reset", null);

        // Assert — all should succeed
        response1.StatusCode.Should().Be(HttpStatusCode.OK, "First reset should succeed");
        response2.StatusCode.Should().Be(HttpStatusCode.OK, "Second reset should succeed (idempotent)");
        response3.StatusCode.Should().Be(HttpStatusCode.OK, "Third reset should succeed (idempotent)");
    }
}
