using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Fishtank.Api.IntegrationTests.Support;

namespace Fishtank.Api.IntegrationTests.Api;

/// <summary>
/// RED-PHASE ATDD acceptance test scaffolds for Story 4.2 — backend scope only:
/// Single-file content read endpoint: GET /api/mappings/{**path}.
///
/// These tests define the expected end-state behaviour for the new content
/// endpoint and are designed to FAIL until the endpoint is implemented (Task 2).
///
/// ACs covered:
///   AC-5 (backend portion):
///     - GET /api/mappings/{path} returns 200 with file content + metadata
///       (content, name, path, lastModified, sizeBytes)
///     - GET /api/mappings/{path} for a non-existent file returns 404 MAPPING_FILE_NOT_FOUND
///     - GET /api/mappings/{path} with path traversal returns 400 MAPPING_PATH_INVALID
///     - GET /api/mappings/{path} unauthenticated returns 401
///     - GET /api/mappings (tree route) still returns 200 — not shadowed by the new catch-all
///
/// Implementation note (from story context):
///   - Endpoint: GET /api/mappings/{**path} in MappingsEndpoints.cs
///   - Service method: IMappingService.ReadFileAsync(path, ct)
///   - New DTO: FileContentDto(string Content, string Name, string Path,
///              DateTimeOffset LastModified, long SizeBytes)
///   - Reuse PathSanitizer / SanitizePath logic from existing endpoints
///   - Route must not shadow the existing GET "" tree route
/// </summary>
[Collection("Integration")]
public class Story4_2_MappingsContentEndpointTests : IntegrationTestBase
{
    public Story4_2_MappingsContentEndpointTests(FishtankWebApplicationFactory factory)
        : base(factory) { }

    /// <summary>Seed admin and return an authenticated HttpClient.</summary>
    private async Task<HttpClient> GetAuthenticatedClientAsync()
    {
        await Client.PostAsJsonAsync("/api/auth/setup",
            new { username = "admin", password = "adminpassword123" });

        return await TestAuthHelper.CreateAuthenticatedClientAsync(
            Factory, "admin", "adminpassword123");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Regression guard: GET /api/mappings (tree) still works after new endpoint
    // RED: passes only if the tree endpoint is already working (from 4.1).
    //      If both routes exist but the new one shadows the old, this fails.
    // GREEN: new endpoint must not intercept the tree route.
    // ─────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-5 (regression): GET /api/mappings still returns tree — not shadowed by GET /api/mappings/{**path}")]
    public async Task GetMappingsTree_NotShadowedByContentRoute_Returns200WithTree()
    {
        // Arrange
        var client = await GetAuthenticatedClientAsync();

        // Act
        var response = await client.GetAsync("/api/mappings");

        // Assert
        response.StatusCode.Should().Be(
            HttpStatusCode.OK,
            "GET /api/mappings (no path segment) must continue to return the folder tree " +
            "and must NOT be shadowed by the new GET /api/mappings/{**path} content route");

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("success").GetBoolean().Should().BeTrue();

        var data = body.GetProperty("data");
        data.TryGetProperty("mocksRoot", out _).Should().BeTrue(
            "tree endpoint must still return mocksRoot — it was not replaced by the content endpoint");
        data.TryGetProperty("children", out _).Should().BeTrue(
            "tree endpoint must still return children array");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AC-5: GET /api/mappings/{path} — returns file content + metadata
    // RED: 404 (endpoint not registered yet)
    // GREEN: 200 with { success:true, data: { content, name, path, lastModified, sizeBytes } }
    // ─────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-5: GET /api/mappings/{path} — returns 200 with file content and metadata")]
    public async Task GetMappingContent_ExistingFile_Returns200WithContentAndMetadata()
    {
        // Arrange
        var client = await GetAuthenticatedClientAsync();
        const string filePath = "test-service/mappings/read-test.json";
        const string fileContent = """
        {
          "request": { "method": "GET", "url": "/api/test" },
          "response": { "status": 200, "body": "read test response" }
        }
        """;

        // Pre-create the file via POST
        var createResponse = await client.PostAsJsonAsync("/api/mappings", new
        {
            path = filePath,
            content = fileContent,
        });
        createResponse.StatusCode.Should().Be(
            HttpStatusCode.Created,
            "prerequisite: file must be created successfully before the read test");

        // Act
        var response = await client.GetAsync($"/api/mappings/{filePath}");

        // Assert
        response.StatusCode.Should().Be(
            HttpStatusCode.OK,
            "GET /api/mappings/{path} must return 200 for an existing file (AC-5)");

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("success").GetBoolean().Should().BeTrue(
            "all API responses must use standard success envelope");

        var data = body.GetProperty("data");

        // Content field
        data.TryGetProperty("content", out var contentEl).Should().BeTrue(
            "FileContentDto must include the file's raw content");
        contentEl.GetString().Should().NotBeNullOrEmpty(
            "content must be the file's text content");
        contentEl.GetString().Should().Contain("\"method\": \"GET\"",
            "content must match what was written");

        // Name field
        data.TryGetProperty("name", out var nameEl).Should().BeTrue(
            "FileContentDto must include the filename");
        nameEl.GetString().Should().Be("read-test.json",
            "name must be the leaf filename, not the full path");

        // Path field
        data.TryGetProperty("path", out var pathEl).Should().BeTrue(
            "FileContentDto must include the relative path");
        pathEl.GetString().Should().Be(filePath,
            "path must match the requested relative path");

        // LastModified field
        data.TryGetProperty("lastModified", out var lastModEl).Should().BeTrue(
            "FileContentDto must include lastModified for the editor's lastKnownModified (AC-5)");
        lastModEl.ValueKind.Should().Be(JsonValueKind.String,
            "lastModified must be an ISO-8601 string");

        // SizeBytes field
        data.TryGetProperty("sizeBytes", out var sizeEl).Should().BeTrue(
            "FileContentDto must include sizeBytes");
        sizeEl.GetInt64().Should().BeGreaterThan(0,
            "sizeBytes must be the actual file size");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AC-5: GET /api/mappings/{path} — nested path (multi-segment catch-all)
    // Verifies the {**path} catch-all routing works for nested paths.
    // RED: 404 (endpoint not registered)
    // GREEN: 200 with correct content
    // ─────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-5: GET /api/mappings/{**path} — nested path correctly routed by catch-all")]
    public async Task GetMappingContent_NestedPath_RoutedCorrectlyByCatchAll()
    {
        // Arrange
        var client = await GetAuthenticatedClientAsync();
        const string filePath = "service-a/mappings/deep/nested/path-file.json";
        const string fileContent = """{"request":{"method":"POST","url":"/deep"},"response":{"status":201}}""";

        var createResponse = await client.PostAsJsonAsync("/api/mappings", new
        {
            path = filePath,
            content = fileContent,
        });
        createResponse.StatusCode.Should().Be(HttpStatusCode.Created,
            "prerequisite: nested file must be created successfully");

        // Act
        var response = await client.GetAsync($"/api/mappings/{filePath}");

        // Assert
        response.StatusCode.Should().Be(
            HttpStatusCode.OK,
            "catch-all route {**path} must handle multi-segment paths");

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("success").GetBoolean().Should().BeTrue();
        body.GetProperty("data").GetProperty("path").GetString()
            .Should().Be(filePath, "path must be the full relative path");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AC-5: GET /api/mappings/{path} — non-existent file returns 404
    // RED: 404 for wrong reason (endpoint not registered vs file not found)
    //      After endpoint registration: GREEN = 404 MAPPING_FILE_NOT_FOUND
    // ─────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-5: GET /api/mappings/{path} for non-existent file — returns 404 MAPPING_FILE_NOT_FOUND")]
    public async Task GetMappingContent_NonExistentFile_Returns404()
    {
        // Arrange
        var client = await GetAuthenticatedClientAsync();
        const string ghostPath = "ghost-service/mappings/does-not-exist.json";

        // Act
        var response = await client.GetAsync($"/api/mappings/{ghostPath}");

        // Assert
        response.StatusCode.Should().Be(
            HttpStatusCode.NotFound,
            "GET /api/mappings/{path} for a non-existent file must return 404");

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("success").GetBoolean().Should().BeFalse();
        body.GetProperty("error").GetProperty("code").GetString()
            .Should().Be("MAPPING_FILE_NOT_FOUND",
                "not-found error must use the MAPPING_FILE_NOT_FOUND error code (consistent with PUT/DELETE)");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AC-5: GET /api/mappings/{path} — path traversal returns 400
    // RED: endpoint not registered → 404 (wrong status)
    // GREEN: PathSanitizer rejects traversal → 400 MAPPING_PATH_INVALID
    // ─────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-5: GET /api/mappings/{**path} with path traversal — returns 400 MAPPING_PATH_INVALID")]
    public async Task GetMappingContent_PathTraversal_Returns400()
    {
        // Arrange
        var client = await GetAuthenticatedClientAsync();
        // ASP.NET's routing encodes '..' before it reaches the endpoint handler;
        // we use a pre-encoded traversal segment to ensure it reaches the handler.
        var traversalPath = Uri.EscapeDataString("../../etc/passwd");

        // Act
        var response = await client.GetAsync($"/api/mappings/{traversalPath}");

        // Assert
        response.StatusCode.Should().Be(
            HttpStatusCode.BadRequest,
            "path traversal in GET /api/mappings/{path} must be rejected with 400 " +
            "(reuse PathSanitizer from existing endpoints — AC-5 Task 2.2)");

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("success").GetBoolean().Should().BeFalse();
        body.GetProperty("error").GetProperty("code").GetString()
            .Should().Be("MAPPING_PATH_INVALID",
                "traversal must use MAPPING_PATH_INVALID error code");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AC-5 / NFR-8: Unauthenticated GET /api/mappings/{path} returns 401
    // RED: 404 (endpoint not registered vs 401 auth rejection)
    // GREEN: 401 Unauthorized (RequireAuthorization applied to the route group)
    // ─────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-5 / NFR-8: GET /api/mappings/{path} unauthenticated — returns 401")]
    public async Task GetMappingContent_Unauthenticated_Returns401()
    {
        // Arrange: use the unauthenticated client from IntegrationTestBase
        const string filePath = "any-service/mappings/any-file.json";

        // Act
        var response = await Client.GetAsync($"/api/mappings/{filePath}");

        // Assert
        response.StatusCode.Should().Be(
            HttpStatusCode.Unauthorized,
            "GET /api/mappings/{path} must be protected by RequireAuthorization (NFR-8)");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AC-5: Response shape — FileContentDto property names are camelCase
    // Verifies System.Text.Json camelCase serialization on the new DTO.
    // RED: endpoint not registered
    // GREEN: JSON keys are camelCase (mocksRoot pattern from FolderTreeDto)
    // ─────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-5: GET /api/mappings/{path} response — FileContentDto uses camelCase JSON properties")]
    public async Task GetMappingContent_ResponseShape_UsesJsonCamelCase()
    {
        // Arrange
        var client = await GetAuthenticatedClientAsync();
        const string filePath = "camel-svc/mappings/camel-test.json";
        await client.PostAsJsonAsync("/api/mappings", new
        {
            path = filePath,
            content = "{\"camel\":\"test\"}",
        });

        // Act
        var response = await client.GetAsync($"/api/mappings/{filePath}");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        // Assert: parse as raw string and check property names directly
        var rawJson = await response.Content.ReadAsStringAsync();
        rawJson.Should().Contain("\"content\"",
            "FileContentDto.Content must serialize as 'content' (camelCase)");
        rawJson.Should().Contain("\"name\"",
            "FileContentDto.Name must serialize as 'name' (camelCase)");
        rawJson.Should().Contain("\"path\"",
            "FileContentDto.Path must serialize as 'path' (camelCase)");
        rawJson.Should().Contain("\"lastModified\"",
            "FileContentDto.LastModified must serialize as 'lastModified' (camelCase)");
        rawJson.Should().Contain("\"sizeBytes\"",
            "FileContentDto.SizeBytes must serialize as 'sizeBytes' (camelCase)");

        // Must NOT contain PascalCase property names (that would break the frontend)
        rawJson.Should().NotContain("\"Content\":",
            "PascalCase 'Content' would break the TypeScript frontend DTO");
        rawJson.Should().NotContain("\"LastModified\":",
            "PascalCase 'LastModified' would break the TypeScript frontend DTO");
    }
}
