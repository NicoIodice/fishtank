using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Fishtank.Api.IntegrationTests.Support;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;

namespace Fishtank.Api.IntegrationTests.Api;

/// <summary>
/// Integration tests for Story 2.2: MockFileCount on ServiceDto.
///
/// AC-10: GET /api/services returns mockFileCount: int per service.
///   - Returns 0 when MocksRoot directory does not exist (default case in tests)
///   - Returns correct count when .json files are present in MocksRoot
/// </summary>
[Collection("Integration")]
public class Story2_2_ServicesPageTests : IntegrationTestBase
{
    private const int TestPort1 = 30185;
    private const int TestPort2 = 30186;

    public Story2_2_ServicesPageTests(FishtankWebApplicationFactory factory) : base(factory) { }

    private async Task<HttpClient> GetAuthenticatedClientAsync()
    {
        await Client.PostAsJsonAsync("/api/auth/setup",
            new { username = "admin", password = "adminpassword123" });

        return await TestAuthHelper.CreateAuthenticatedClientAsync(
            Factory, "admin", "adminpassword123");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AC-10a: mockFileCount = 0 when MocksRoot does not exist
    // ─────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-10a: mockFileCount is 0 when MocksRoot directory does not exist")]
    public async Task GetServices_MocksRootMissing_MockFileCountIsZero()
    {
        // Arrange
        var client = await GetAuthenticatedClientAsync();

        await client.PostAsJsonAsync("/api/services", new
        {
            name = "Mock Count Zero",
            externalUrl = "https://api.example.com",
            port = TestPort1,
        });

        // Act
        var response = await client.GetAsync("/api/services");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("success").GetBoolean().Should().BeTrue();

        var services = body.GetProperty("data").EnumerateArray().ToList();
        services.Should().ContainSingle(s =>
            s.GetProperty("name").GetString() == "Mock Count Zero");

        var svc = services.First(s => s.GetProperty("name").GetString() == "Mock Count Zero");
        svc.GetProperty("mockFileCount").GetInt32().Should().Be(0,
            "MocksRoot directory does not exist in tests — mockFileCount must return 0 gracefully");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AC-10b: mockFileCount counts .json files in MocksRoot when directory exists
    // ─────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-10b: mockFileCount counts .json files in MocksRoot when directory exists")]
    public async Task GetServices_MocksRootWithJsonFiles_MockFileCountMatchesFileCount()
    {
        // Arrange: create a temp directory with .json files and configure the host
        // to use it as FISHTANK_MOCKS_ROOT
        var tempDir = Path.Combine(Path.GetTempPath(), $"fishtank-test-{Guid.NewGuid():N}");
        Directory.CreateDirectory(tempDir);

        try
        {
            await using var customHost = Factory.WithWebHostBuilder(b =>
            {
                b.UseSetting("FISHTANK_MOCKS_ROOT", tempDir);
                b.ConfigureAppConfiguration((_, config) =>
                {
                    config.AddInMemoryCollection(new Dictionary<string, string?>
                    {
                        ["FISHTANK_MOCKS_ROOT"] = tempDir,
                    });
                });
            });

            var client = customHost.CreateClient(new() { AllowAutoRedirect = false });

            // Set up admin on isolated host
            await client.PostAsJsonAsync("/api/auth/setup",
                new { username = "admin", password = "adminpassword123" });
            var loginResp = await client.PostAsJsonAsync("/api/auth/login",
                new { username = "admin", password = "adminpassword123" });
            loginResp.EnsureSuccessStatusCode();

            // Create service — slug will be "file-count-test"
            var createResp = await client.PostAsJsonAsync("/api/services", new
            {
                name = "File Count Test",
                externalUrl = "https://api.example.com",
                port = TestPort2,
            });
            createResp.StatusCode.Should().Be(HttpStatusCode.Created,
                "service creation should succeed");

            var createBody = await createResp.Content.ReadFromJsonAsync<JsonElement>();
            var mocksRoot = createBody.GetProperty("data").GetProperty("mocksRoot").GetString()!;

            // Create the MocksRoot directory and populate it with 3 .json files
            // (and 1 non-json file that should NOT be counted)
            Directory.CreateDirectory(mocksRoot);
            await File.WriteAllTextAsync(Path.Combine(mocksRoot, "mapping1.json"), "{}");
            await File.WriteAllTextAsync(Path.Combine(mocksRoot, "mapping2.json"), "{}");
            await File.WriteAllTextAsync(Path.Combine(mocksRoot, "mapping3.json"), "{}");
            await File.WriteAllTextAsync(Path.Combine(mocksRoot, "readme.txt"), "not counted");

            // Act: call GET /api/services — ServiceManager.CountMockFiles reads from disk
            var listResp = await client.GetAsync("/api/services");
            listResp.StatusCode.Should().Be(HttpStatusCode.OK);

            var listBody = await listResp.Content.ReadFromJsonAsync<JsonElement>();
            var services = listBody.GetProperty("data").EnumerateArray().ToList();
            var svc = services.First(s =>
                s.GetProperty("name").GetString() == "File Count Test");

            // Assert
            svc.GetProperty("mockFileCount").GetInt32().Should().Be(3,
                "exactly 3 .json files were created in MocksRoot — .txt file must not be counted");
        }
        finally
        {
            // Cleanup: remove the temp directory
            try { Directory.Delete(tempDir, recursive: true); } catch { /* best-effort */ }
        }
    }
}
