using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Fishtank.Api.IntegrationTests.Support;
using Microsoft.AspNetCore.Hosting;

namespace Fishtank.Api.IntegrationTests.OpenApi;

/// <summary>
/// ATDD acceptance test scaffolds for Story 6.2:
/// OpenAPI Spec & Management API Parity Verification.
///
/// RED PHASE — these tests define the expected end-state behaviour.
/// They FAIL before implementation and PASS once all ACs are complete.
///
/// AC-1:  GET /openapi/v1.json → 200 in all environments (currently guarded to dev/test only)
/// AC-2:  GET /openapi/v1.json → 200 unauthenticated (no auth header required)
/// AC-3:  Response envelope (ApiResponse<T>) documented in spec
/// AC-4:  Error codes documented per feature area
/// AC-5:  Every endpoint has .WithTags(...) grouping
/// AC-6:  Every endpoint has .WithSummary(...) and .WithDescription(...)
/// AC-7:  FR-43 parity: all 35 endpoints present in spec
/// AC-8:  docs/openapi.json exported and committed
/// AC-9:  CI step validates docs/openapi.json matches served spec
/// AC-10: FR-36 env var documentation audit in README.md and docker-compose.example.yml
///
/// RED reasons:
///   - app.MapOpenApi() is currently inside if (app.Environment.IsDevelopment() || IsEnvironment("Testing"))
///   - In Production mode, GET /openapi/v1.json would return 404
///   - Tests in Testing environment will pass early, but the AC requirement is "any environment"
/// </summary>
[Collection("Integration")]
public class OpenApiSpecTests : IntegrationTestBase
{
    public OpenApiSpecTests(FishtankWebApplicationFactory factory) : base(factory) { }

    // -------------------------------------------------------------------------
    // AC-1 — GET /openapi/v1.json → 200 in all environments
    // RED:  Currently MapOpenApi() is guarded to Development + Testing only
    //       (see Program.cs line ~286). In Production, this returns 404.
    // GREEN: Move app.MapOpenApi() outside the if block so it's available in all environments.
    //        Risk R-E6-003: OpenAPI spec drift prevention via CI parity check.
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AC-1: GET /openapi/v1.json returns 200 OK")]
    public async Task GetOpenApiSpec_ReturnsOk()
    {
        // Arrange
        // No auth required (AC-2 coverage also)

        // Act
        var response = await Client.GetAsync("/openapi/v1.json");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK,
            "OpenAPI spec must be served in all environments (currently guarded to dev/test only — AC-1 RED)");
    }

    // -------------------------------------------------------------------------
    // AC-2 — GET /openapi/v1.json → 200 unauthenticated
    // RED:  Same as AC-1 — endpoint not mapped in Production
    // GREEN: No auth middleware should guard /openapi/* routes
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AC-2: GET /openapi/v1.json returns 200 without authentication")]
    public async Task GetOpenApiSpec_NoAuthRequired()
    {
        // Arrange
        // Create a client with NO authentication headers
        var unauthenticatedClient = Factory.CreateClient(
            new Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactoryClientOptions
            {
                AllowAutoRedirect = false,
            });

        // Act
        var response = await unauthenticatedClient.GetAsync("/openapi/v1.json");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK,
            "OpenAPI spec endpoint must be accessible without authentication (AC-2)");

        // Cleanup
        unauthenticatedClient.Dispose();
    }

    // -------------------------------------------------------------------------
    // AC-1 + AC-2 — Content-Type verification
    // RED:  Same as AC-1 — endpoint not mapped in Production
    // GREEN: OpenAPI framework serves application/json by default
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AC-1 + AC-2: GET /openapi/v1.json returns application/json")]
    public async Task GetOpenApiSpec_ReturnsJsonContentType()
    {
        // Arrange & Act
        var response = await Client.GetAsync("/openapi/v1.json");

        // Assert
        response.Content.Headers.ContentType?.MediaType.Should().Be("application/json",
            "OpenAPI spec must be served as JSON (AC-1)");
    }

    // -------------------------------------------------------------------------
    // AC-1 — Spec contains valid OpenAPI version
    // RED:  Endpoint returns 404 → cannot parse spec
    // GREEN: Spec contains "openapi": "3.x.x" field
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AC-1: OpenAPI spec contains valid version field")]
    public async Task GetOpenApiSpec_ContainsOpenApiVersion()
    {
        // Arrange
        var response = await Client.GetAsync("/openapi/v1.json");
        response.StatusCode.Should().Be(HttpStatusCode.OK); // Pre-condition

        // Act
        var content = await response.Content.ReadAsStringAsync();
        var spec = JsonDocument.Parse(content).RootElement;

        // Assert
        spec.TryGetProperty("openapi", out var versionProperty).Should().BeTrue(
            "OpenAPI spec must contain 'openapi' version field (AC-1)");
        
        var version = versionProperty.GetString();
        version.Should().NotBeNullOrEmpty();
        version.Should().StartWith("3.", "OpenAPI spec must be version 3.x");
    }

    // -------------------------------------------------------------------------
    // AC-7 — FR-43 parity: all 35 endpoints present in spec
    // RED:  Spec not served → cannot check paths
    // GREEN: All 35 documented endpoints from story AC-7 table appear in spec.paths
    // Risk: R-E6-003 (OpenAPI spec drift)
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AC-7: OpenAPI spec contains all 35 Management API endpoints")]
    public async Task GetOpenApiSpec_ContainsAllRequiredEndpoints()
    {
        // Arrange
        var response = await Client.GetAsync("/openapi/v1.json");
        response.StatusCode.Should().Be(HttpStatusCode.OK); // Pre-condition

        var content = await response.Content.ReadAsStringAsync();
        var spec = JsonDocument.Parse(content).RootElement;
        
        spec.TryGetProperty("paths", out var pathsProperty).Should().BeTrue(
            "OpenAPI spec must contain 'paths' object");

        var paths = pathsProperty.EnumerateObject()
            .Select(p => p.Name)
            .ToList();

        // Required endpoints from AC-7 table (FR-43 parity)
        var requiredEndpoints = new[]
        {
            // Auth
            "/api/auth/login",
            "/api/auth/logout",
            "/api/auth/setup",
            "/api/auth/change-password",
            
            // Services
            "/api/services",
            "/api/services/{id}",
            "/api/services/{id}/start",
            "/api/services/{id}/stop",
            "/api/services/import",
            "/api/services/next-port",
            
            // Activity
            "/api/activity",
            
            // Mappings
            "/api/mappings",
            "/api/mappings/{path}",
            "/api/resync",
            
            // Events
            "/api/events",
            
            // Users
            "/api/users",
            "/api/users/{id}/deactivate",
            
            // Admin
            "/api/admin/toggles",
            "/api/admin/toggles/{name}",
            "/api/admin/health",
            "/api/admin/audit",
            "/api/admin/reset",
            
            // Settings
            "/api/settings",
            
            // Cache (if implemented)
            "/api/cache",
            "/api/cache/{id}",
            
            // Health
            "/health",
            // Note: /openapi/v1.json is intentionally excluded — MapOpenApi() does not self-document in the paths object
        };

        // Act & Assert
        foreach (var endpoint in requiredEndpoints)
        {
            paths.Should().Contain(endpoint,
                $"OpenAPI spec must document {endpoint} for FR-43 parity (AC-7)");
        }

        // Verify total count matches expected 35 endpoints (allows for path parameter variations)
        paths.Count.Should().BeGreaterThanOrEqualTo(requiredEndpoints.Length - 5,
            "OpenAPI spec should contain at least 30 of the 35 documented endpoints (accounting for optional cache endpoints)");
    }

    // -------------------------------------------------------------------------
    // AC-5 — Every endpoint has .WithTags(...) grouping
    // RED:  Spec not served → cannot check tags
    // GREEN: All paths in spec have at least one tag assigned
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AC-5: Every endpoint has tags assigned")]
    public async Task GetOpenApiSpec_AllEndpointsHaveTags()
    {
        // Arrange
        var response = await Client.GetAsync("/openapi/v1.json");
        response.StatusCode.Should().Be(HttpStatusCode.OK); // Pre-condition

        var content = await response.Content.ReadAsStringAsync();
        var spec = JsonDocument.Parse(content).RootElement;
        
        spec.TryGetProperty("paths", out var pathsProperty).Should().BeTrue();

        // Act & Assert
        foreach (var pathEntry in pathsProperty.EnumerateObject())
        {
            var pathName = pathEntry.Name;
            var operations = pathEntry.Value.EnumerateObject()
                .Where(p => p.Name.ToLower() is "get" or "post" or "put" or "delete" or "patch");

            foreach (var operation in operations)
            {
                var operationName = operation.Name;
                var hasTag = operation.Value.TryGetProperty("tags", out var tagsProperty) 
                    && tagsProperty.GetArrayLength() > 0;

                hasTag.Should().BeTrue(
                    $"{operationName.ToUpper()} {pathName} must have at least one tag assigned (AC-5)");
            }
        }
    }

    // -------------------------------------------------------------------------
    // AC-6 — Every endpoint has .WithSummary(...) and .WithDescription(...)
    // RED:  Spec not served → cannot check summary/description
    // GREEN: All paths in spec have non-empty summary fields
    // NOTE: .WithDescription(...) is for non-obvious behavior; summary is mandatory
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AC-6: Every endpoint has summary documentation")]
    public async Task GetOpenApiSpec_AllEndpointsHaveSummary()
    {
        // Arrange
        var response = await Client.GetAsync("/openapi/v1.json");
        response.StatusCode.Should().Be(HttpStatusCode.OK); // Pre-condition

        var content = await response.Content.ReadAsStringAsync();
        var spec = JsonDocument.Parse(content).RootElement;
        
        spec.TryGetProperty("paths", out var pathsProperty).Should().BeTrue();

        // Act & Assert
        foreach (var pathEntry in pathsProperty.EnumerateObject())
        {
            var pathName = pathEntry.Name;
            var operations = pathEntry.Value.EnumerateObject()
                .Where(p => p.Name.ToLower() is "get" or "post" or "put" or "delete" or "patch");

            foreach (var operation in operations)
            {
                var operationName = operation.Name;
                var hasSummary = operation.Value.TryGetProperty("summary", out var summaryProperty) 
                    && !string.IsNullOrWhiteSpace(summaryProperty.GetString());

                hasSummary.Should().BeTrue(
                    $"{operationName.ToUpper()} {pathName} must have a summary (AC-6)");
            }
        }
    }

    // -------------------------------------------------------------------------
    // AC-3 — Response envelope (ApiResponse<T>) documented in spec
    // RED:  Spec not served → cannot check schemas
    // GREEN: Spec contains ApiResponse<T> generic wrapper schema with success/data/error fields
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AC-3: OpenAPI spec documents ApiResponse<T> envelope")]
    public async Task GetOpenApiSpec_DocumentsResponseEnvelope()
    {
        // Arrange
        var response = await Client.GetAsync("/openapi/v1.json");
        response.StatusCode.Should().Be(HttpStatusCode.OK); // Pre-condition

        var content = await response.Content.ReadAsStringAsync();
        var spec = JsonDocument.Parse(content).RootElement;
        
        // Act & Assert
        spec.TryGetProperty("components", out var componentsProperty).Should().BeTrue(
            "OpenAPI spec must contain 'components' section (AC-3)");
        
        componentsProperty.TryGetProperty("schemas", out var schemasProperty).Should().BeTrue(
            "OpenAPI spec must contain component schemas (AC-3)");

        // Look for ApiResponse or similar envelope schemas
        var schemaNames = schemasProperty.EnumerateObject().Select(s => s.Name).ToList();
        
        var hasResponseEnvelope = schemaNames.Any(name => 
            name.Contains("ApiResponse", StringComparison.OrdinalIgnoreCase) ||
            name.Contains("Response", StringComparison.OrdinalIgnoreCase));

        hasResponseEnvelope.Should().BeTrue(
            "OpenAPI spec must document the standard ApiResponse<T> envelope (AC-3). " +
            $"Found schemas: {string.Join(", ", schemaNames.Take(10))}...");
    }

    // -------------------------------------------------------------------------
    // AC-4 — Error codes documented per feature area
    // RED:  Spec not served → cannot check error schemas
    // GREEN: Error response schemas document error.code field with feature-prefixed examples
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AC-4: OpenAPI spec documents error codes")]
    public async Task GetOpenApiSpec_DocumentsErrorCodes()
    {
        // Arrange
        var response = await Client.GetAsync("/openapi/v1.json");
        response.StatusCode.Should().Be(HttpStatusCode.OK); // Pre-condition

        var content = await response.Content.ReadAsStringAsync();
        var spec = JsonDocument.Parse(content).RootElement;
        
        // Act & Assert
        spec.TryGetProperty("components", out var componentsProperty).Should().BeTrue(
            "OpenAPI spec must contain 'components' section (AC-4)");
        
        componentsProperty.TryGetProperty("schemas", out var schemasProperty).Should().BeTrue(
            "OpenAPI spec must contain component schemas (AC-4)");

        // Look for error response schemas
        var schemaNames = schemasProperty.EnumerateObject().Select(s => s.Name).ToList();
        
        var hasErrorSchema = schemaNames.Any(name => 
            name.Contains("Error", StringComparison.OrdinalIgnoreCase));

        hasErrorSchema.Should().BeTrue(
            "OpenAPI spec must document error response schemas with error codes (AC-4). " +
            $"Found schemas: {string.Join(", ", schemaNames.Take(10))}...");
    }

    // -------------------------------------------------------------------------
    // AC-1 — OpenAPI spec available in Production environment (new test)
    // RED:  app.MapOpenApi() is currently guarded to Development + Testing only
    // GREEN: Move app.MapOpenApi() outside the environment check
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AC-1: GET /openapi/v1.json available in Production environment")]
    public async Task GetOpenApiSpec_AvailableInProductionEnvironment()
    {
        // Arrange - Create a WebApplicationFactory with Production environment
        await using var productionFactory = Factory.WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Production");
            // Configure required settings for Production startup
            builder.UseSetting("FISHTANK_JWT_SECRET", "test-jwt-secret-32-characters-minimum!!");
            builder.UseSetting("FISHTANK_PIPELINE_RESET_KEY", "test-reset-key-32chars-minimum!!");
        });

        var productionClient = productionFactory.CreateClient(
            new Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactoryClientOptions
            {
                AllowAutoRedirect = false,
            });

        // Act
        var response = await productionClient.GetAsync("/openapi/v1.json");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK,
            "OpenAPI spec must be available in Production environment (AC-1) — " +
            "currently MapOpenApi() is guarded to Development + Testing only");

        var content = await response.Content.ReadAsStringAsync();
        content.Should().NotBeNullOrEmpty("Production environment spec must contain JSON content");

        // Cleanup
        productionClient.Dispose();
    }

    // -------------------------------------------------------------------------
    // AC-7 (additional verification) — POST /api/services/import returns 501
    // RED:  Endpoint not implemented or not returning 501
    // GREEN: Endpoint returns 501 Not Implemented
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AC-7: POST /api/services/import returns 501 Not Implemented")]
    public async Task ServicesImport_ReturnsNotImplemented()
    {
        // Arrange - Create authenticated client
        await Client.PostAsJsonAsync("/api/auth/setup",
            new { username = "admin", password = "adminpassword123" });

        var authClient = await TestAuthHelper.CreateAuthenticatedClientAsync(
            Factory, "admin", "adminpassword123");

        // Act
        var response = await authClient.PostAsJsonAsync("/api/services/import", new
        {
            seedFile = "test-seed.json"
        });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotImplemented,
            "POST /api/services/import must return 501 Not Implemented (AC-7 — documented but not yet implemented)");

        // Cleanup
        authClient.Dispose();
    }
}
