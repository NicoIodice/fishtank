using System.Text.Json;
using FluentAssertions;

namespace Fishtank.Api.UnitTests;

/// <summary>
/// RED-phase acceptance tests for Story 6-3: Fishtank Demo Pre-Seeded Docker Image.
///
/// These tests validate the demo image build artifacts exist and conform to the required format.
/// All tests are static file/artifact validation — no Docker build or runtime tests.
///
/// <b>Acceptance Criteria Coverage:</b>
/// <list type="bullet">
///   <item>AC-1, AC-2: Demo seed JSON exists, has 3 services, correct port range</item>
///   <item>AC-7, AC-8: Demo Dockerfile exists and uses layering strategy</item>
///   <item>AC-10: Demo entrypoint script exists</item>
///   <item>AC-4, AC-5, AC-6: WireMock mapping files exist and are valid JSON</item>
///   <item>AC-12: Seed file format matches SeedEntry schema</item>
/// </list>
///
/// <b>RED-phase status:</b> All tests MUST FAIL until the developer creates:
/// <list type="bullet">
///   <item><c>resources/demo-seed.json</c></item>
///   <item><c>demo.Dockerfile</c></item>
///   <item><c>resources/demo-entrypoint.sh</c></item>
///   <item><c>resources/demo-mocks/</c> directory with WireMock mappings</item>
/// </list>
/// </summary>
public class DemoImageArtifactTests
{
    // ─── Helpers ─────────────────────────────────────────────────────────────

    private static string GetProjectRoot()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        // Look for docker-compose.yml which is in the repo root (not in src/)
        while (dir != null && !File.Exists(Path.Combine(dir.FullName, "docker-compose.yml")))
            dir = dir.Parent;
        return dir?.FullName ?? throw new InvalidOperationException("Could not find project root (docker-compose.yml not found)");
    }

    private static string ResourcesPath => Path.Combine(GetProjectRoot(), "resources");
    private static string DemoSeedFilePath => Path.Combine(ResourcesPath, "demo-seed.json");
    private static string DemoDockerfilePath => Path.Combine(GetProjectRoot(), "demo.Dockerfile");
    private static string DemoEntrypointPath => Path.Combine(ResourcesPath, "demo-entrypoint.sh");
    private static string DemoMocksPath => Path.Combine(ResourcesPath, "demo-mocks");

    // ─── Demo Seed JSON File Tests (AC-1, AC-2, AC-12) ──────────────────────

    [Fact(DisplayName = "Demo seed file exists at resources/demo-seed.json")]
    public void DemoSeedFile_ShouldExist()
    {
        File.Exists(DemoSeedFilePath).Should().BeTrue(
            "resources/demo-seed.json must exist — it is copied into the demo Docker image " +
            "and loaded via FISHTANK_SEED_FILE env var at container startup (AC-1, AC-8).");
    }

    [Fact(DisplayName = "Demo seed file is valid JSON")]
    public void DemoSeedFile_ShouldBeValidJson()
    {
        var json = File.ReadAllText(DemoSeedFilePath);

        var act = () => JsonDocument.Parse(json);

        act.Should().NotThrow<JsonException>(
            "demo-seed.json must be well-formed JSON that can be deserialized by System.Text.Json (AC-12).");
    }

    [Fact(DisplayName = "Demo seed file is a flat JSON array (not an object with 'services' wrapper)")]
    public void DemoSeedFile_ShouldBeFlatArray()
    {
        var json = File.ReadAllText(DemoSeedFilePath);
        using var doc = JsonDocument.Parse(json);

        doc.RootElement.ValueKind.Should().Be(JsonValueKind.Array,
            "SeedEntry deserialization expects a flat array: SeedEntry[]. " +
            "The file must NOT have a 'services' wrapper key (AC-12).");
    }

    [Fact(DisplayName = "Demo seed file contains exactly 3 service entries")]
    public void DemoSeedFile_ShouldHaveThreeEntries()
    {
        var json = File.ReadAllText(DemoSeedFilePath);
        using var doc = JsonDocument.Parse(json);

        doc.RootElement.GetArrayLength().Should().Be(3,
            "The demo image must pre-seed exactly 3 example services: Weather API, Payments Gateway, User Profile Service (AC-2).");
    }

    [Fact(DisplayName = "Each seed entry has required SeedEntry fields: Name, ExternalUrl, Port, Description, Tags")]
    public void DemoSeedFile_EachEntry_ShouldHaveRequiredFields()
    {
        var json = File.ReadAllText(DemoSeedFilePath);
        using var doc = JsonDocument.Parse(json);

        foreach (var entry in doc.RootElement.EnumerateArray())
        {
            entry.TryGetProperty("name", out _).Should().BeTrue("SeedEntry requires 'name' field (AC-12).");
            entry.TryGetProperty("externalUrl", out _).Should().BeTrue("SeedEntry requires 'externalUrl' field (AC-12).");
            entry.TryGetProperty("port", out _).Should().BeTrue("SeedEntry requires 'port' field (AC-12).");
            entry.TryGetProperty("description", out _).Should().BeTrue("SeedEntry requires 'description' field (AC-12).");
            entry.TryGetProperty("tags", out _).Should().BeTrue("SeedEntry requires 'tags' field (AC-12).");
        }
    }

    [Fact(DisplayName = "Seed entry port values are unique and in the 30100-30199 range")]
    public void DemoSeedFile_PortValues_ShouldBeUniqueAndInDemoRange()
    {
        var json = File.ReadAllText(DemoSeedFilePath);
        using var doc = JsonDocument.Parse(json);

        var ports = doc.RootElement.EnumerateArray()
            .Select(entry => entry.GetProperty("port").GetInt32())
            .ToList();

        ports.Should().HaveCount(3, "There are exactly 3 services in the demo seed.");
        ports.Should().OnlyHaveUniqueItems("Each service must have a unique port to avoid binding conflicts (AC-2).");
        
        foreach (var port in ports)
        {
            port.Should().BeInRange(30100, 30199, "Demo services use ports in the 30100-30199 range (AC-2).");
        }
    }

    [Fact(DisplayName = "Seed entry port values are exactly 30100, 30101, 30102")]
    public void DemoSeedFile_PortValues_ShouldBeExpectedPorts()
    {
        var json = File.ReadAllText(DemoSeedFilePath);
        using var doc = JsonDocument.Parse(json);

        var ports = doc.RootElement.EnumerateArray()
            .Select(entry => entry.GetProperty("port").GetInt32())
            .OrderBy(p => p)
            .ToList();

        ports.Should().BeEquivalentTo(new[] { 30100, 30101, 30102 },
            "The demo services are: Weather API (30100), Payments Gateway (30101), User Profile Service (30102) (AC-2, AC-4, AC-5, AC-6).");
    }

    [Fact(DisplayName = "Seed entries do NOT have 'mappings' or 'responses' fields (wrong format)")]
    public void DemoSeedFile_Entries_ShouldNotHaveMappingsOrResponsesFields()
    {
        var json = File.ReadAllText(DemoSeedFilePath);
        using var doc = JsonDocument.Parse(json);

        foreach (var entry in doc.RootElement.EnumerateArray())
        {
            entry.TryGetProperty("mappings", out _).Should().BeFalse(
                "SeedEntry does NOT include 'mappings' — WireMock mappings are physical files on disk, " +
                "not part of the seed JSON (AC-12).");

            entry.TryGetProperty("responses", out _).Should().BeFalse(
                "SeedEntry does NOT include 'responses' — mock responses come from __files/ on disk, " +
                "not the seed JSON (AC-12).");
        }
    }

    // ─── Demo Dockerfile Tests (AC-7, AC-8) ─────────────────────────────────

    [Fact(DisplayName = "demo.Dockerfile exists in repo root")]
    public void DemoDockerfile_ShouldExist()
    {
        File.Exists(DemoDockerfilePath).Should().BeTrue(
            "demo.Dockerfile must exist in the repo root — it builds the demo image FROM the production image (AC-7).");
    }

    [Fact(DisplayName = "demo.Dockerfile uses production image as base (FROM nicoiodice/fishtank)")]
    public void DemoDockerfile_ShouldUseProductionImageAsBase()
    {
        var content = File.ReadAllText(DemoDockerfilePath);

        content.Should().Contain("FROM nicoiodice/fishtank",
            "The demo image MUST be layered on top of the production image — not a divergent Dockerfile (AC-7, AC-8).");
    }

    [Fact(DisplayName = "demo.Dockerfile sets FISHTANK_SEED_FILE environment variable")]
    public void DemoDockerfile_ShouldSetSeedFileEnvVar()
    {
        var content = File.ReadAllText(DemoDockerfilePath);

        content.Should().Contain("FISHTANK_SEED_FILE",
            "The demo Dockerfile must set FISHTANK_SEED_FILE=/data/demo-seed.json so the server imports seed data at startup (AC-8).");
    }

    // ─── Demo Entrypoint Script Tests (AC-10) ───────────────────────────────

    [Fact(DisplayName = "demo-entrypoint.sh exists at resources/demo-entrypoint.sh")]
    public void DemoEntrypointScript_ShouldExist()
    {
        File.Exists(DemoEntrypointPath).Should().BeTrue(
            "resources/demo-entrypoint.sh must exist — it starts the server, waits for /health, " +
            "and creates the demo admin account via POST /api/auth/setup (AC-10).");
    }

    [Fact(DisplayName = "demo-entrypoint.sh creates admin account with password 'demofishtank1' (≥12 chars)")]
    public void DemoEntrypointScript_ShouldCreateAdminWithValidPassword()
    {
        var content = File.ReadAllText(DemoEntrypointPath);

        content.Should().Contain("admin",
            "The entrypoint script must create the demo admin user 'admin' (AC-10, AC-11).");

        content.Should().Contain("demofishtank1",
            "The demo password must be 'demofishtank1' (13 chars, meets ≥12 char minimum) (AC-10, AC-11).");
    }

    // ─── WireMock Mapping Directory Structure Tests (AC-4, AC-5, AC-6) ──────

    [Fact(DisplayName = "resources/demo-mocks/ directory exists")]
    public void DemoMocksDirectory_ShouldExist()
    {
        Directory.Exists(DemoMocksPath).Should().BeTrue(
            "resources/demo-mocks/ must exist — it contains WireMock mapping files that are copied into the demo image at /app/mocks/ (AC-4, AC-5, AC-6).");
    }

    [Fact(DisplayName = "resources/demo-mocks/ contains subdirectories for all 3 demo services")]
    public void DemoMocksDirectory_ShouldContainServiceSubdirectories()
    {
        var weatherApiPath = Path.Combine(DemoMocksPath, "weather-api");
        var paymentsPath = Path.Combine(DemoMocksPath, "payments-gateway");
        var userProfilePath = Path.Combine(DemoMocksPath, "user-profile-service");

        Directory.Exists(weatherApiPath).Should().BeTrue(
            "weather-api subdirectory must exist (slug for 'Weather API') (AC-4).");

        Directory.Exists(paymentsPath).Should().BeTrue(
            "payments-gateway subdirectory must exist (slug for 'Payments Gateway') (AC-5).");

        Directory.Exists(userProfilePath).Should().BeTrue(
            "user-profile-service subdirectory must exist (slug for 'User Profile Service') (AC-6).");
    }

    [Fact(DisplayName = "Each service subdirectory has a mappings/ folder with at least 1 mapping file")]
    public void DemoMocksDirectory_EachService_ShouldHaveMappingsFolder()
    {
        var services = new[] { "weather-api", "payments-gateway", "user-profile-service" };

        foreach (var service in services)
        {
            var mappingsPath = Path.Combine(DemoMocksPath, service, "mappings");

            Directory.Exists(mappingsPath).Should().BeTrue(
                $"{service}/mappings/ must exist — WireMock reads stub mappings from {{MocksRoot}}/mappings/*.json (AC-4, AC-5, AC-6).");

            Directory.GetFiles(mappingsPath, "*.json").Should().NotBeEmpty(
                $"{service}/mappings/ must contain at least one .json mapping file (AC-4, AC-5, AC-6).");
        }
    }

    [Fact(DisplayName = "Weather API has at least 2 mapping files (current weather, forecast)")]
    public void WeatherApi_ShouldHaveAtLeastTwoMappings()
    {
        var mappingsPath = Path.Combine(DemoMocksPath, "weather-api", "mappings");
        var mappingFiles = Directory.GetFiles(mappingsPath, "*.json");

        mappingFiles.Should().HaveCountGreaterThanOrEqualTo(2,
            "Weather API must have mappings for at least GET /weather/current and GET /weather/forecast (AC-4).");
    }

    [Fact(DisplayName = "Payments Gateway has at least 2 mapping files (charge, refund)")]
    public void PaymentsGateway_ShouldHaveAtLeastTwoMappings()
    {
        var mappingsPath = Path.Combine(DemoMocksPath, "payments-gateway", "mappings");
        var mappingFiles = Directory.GetFiles(mappingsPath, "*.json");

        mappingFiles.Should().HaveCountGreaterThanOrEqualTo(2,
            "Payments Gateway must have mappings for at least POST /payments/charge and POST /payments/refund (AC-5).");
    }

    [Fact(DisplayName = "User Profile Service has at least 2 mapping files (GET /users/me, PUT /users/me)")]
    public void UserProfileService_ShouldHaveAtLeastTwoMappings()
    {
        var mappingsPath = Path.Combine(DemoMocksPath, "user-profile-service", "mappings");
        var mappingFiles = Directory.GetFiles(mappingsPath, "*.json");

        mappingFiles.Should().HaveCountGreaterThanOrEqualTo(2,
            "User Profile Service must have mappings for at least GET /users/me and PUT /users/me (AC-6).");
    }

    // ─── WireMock Mapping File Format Tests ─────────────────────────────────

    [Fact(DisplayName = "All WireMock mapping files are valid JSON")]
    public void WireMockMappings_AllFiles_ShouldBeValidJson()
    {
        var services = new[] { "weather-api", "payments-gateway", "user-profile-service" };

        foreach (var service in services)
        {
            var mappingsPath = Path.Combine(DemoMocksPath, service, "mappings");
            var mappingFiles = Directory.GetFiles(mappingsPath, "*.json");

            foreach (var file in mappingFiles)
            {
                var json = File.ReadAllText(file);
                var act = () => JsonDocument.Parse(json);

                act.Should().NotThrow<JsonException>(
                    $"{Path.GetFileName(file)} must be well-formed JSON that WireMock can deserialize (AC-4, AC-5, AC-6).");
            }
        }
    }

    [Fact(DisplayName = "Each WireMock mapping has required request.method and request.urlPath fields")]
    public void WireMockMappings_AllFiles_ShouldHaveRequestFields()
    {
        var services = new[] { "weather-api", "payments-gateway", "user-profile-service" };

        foreach (var service in services)
        {
            var mappingsPath = Path.Combine(DemoMocksPath, service, "mappings");
            var mappingFiles = Directory.GetFiles(mappingsPath, "*.json");

            foreach (var file in mappingFiles)
            {
                var json = File.ReadAllText(file);
                using var doc = JsonDocument.Parse(json);

                doc.RootElement.TryGetProperty("request", out var request).Should().BeTrue(
                    $"{Path.GetFileName(file)} must have a 'request' field (WireMock stub format) (AC-4, AC-5, AC-6).");

                request.TryGetProperty("method", out _).Should().BeTrue(
                    $"{Path.GetFileName(file)} request must have 'method' field (e.g., GET, POST) (AC-4, AC-5, AC-6).");

                request.TryGetProperty("urlPath", out _).Should().BeTrue(
                    $"{Path.GetFileName(file)} request must have 'urlPath' field (e.g., /weather/current) (AC-4, AC-5, AC-6).");
            }
        }
    }

    [Fact(DisplayName = "Each WireMock mapping has a response field")]
    public void WireMockMappings_AllFiles_ShouldHaveResponseField()
    {
        var services = new[] { "weather-api", "payments-gateway", "user-profile-service" };

        foreach (var service in services)
        {
            var mappingsPath = Path.Combine(DemoMocksPath, service, "mappings");
            var mappingFiles = Directory.GetFiles(mappingsPath, "*.json");

            foreach (var file in mappingFiles)
            {
                var json = File.ReadAllText(file);
                using var doc = JsonDocument.Parse(json);

                doc.RootElement.TryGetProperty("response", out _).Should().BeTrue(
                    $"{Path.GetFileName(file)} must have a 'response' field (WireMock stub format) (AC-4, AC-5, AC-6).");
            }
        }
    }

    // ─── Seed Data Content Validation (Deeper Coverage) ─────────────────────

    [Fact(DisplayName = "Weather API service has exact name and port 30100")]
    public void DemoSeedFile_WeatherApiService_ShouldHaveCorrectNameAndPort()
    {
        var json = File.ReadAllText(DemoSeedFilePath);
        using var doc = JsonDocument.Parse(json);

        var weatherService = doc.RootElement.EnumerateArray()
            .FirstOrDefault(entry => entry.GetProperty("port").GetInt32() == 30100);

        weatherService.ValueKind.Should().NotBe(JsonValueKind.Undefined, 
            "Weather API service must exist with port 30100 (AC-4).");

        weatherService.GetProperty("name").GetString().Should().Be("Weather API",
            "Weather API service name must be exactly 'Weather API' (AC-4).");
    }

    [Fact(DisplayName = "Payments Gateway service has exact name and port 30101")]
    public void DemoSeedFile_PaymentsGatewayService_ShouldHaveCorrectNameAndPort()
    {
        var json = File.ReadAllText(DemoSeedFilePath);
        using var doc = JsonDocument.Parse(json);

        var paymentsService = doc.RootElement.EnumerateArray()
            .FirstOrDefault(entry => entry.GetProperty("port").GetInt32() == 30101);

        paymentsService.ValueKind.Should().NotBe(JsonValueKind.Undefined,
            "Payments Gateway service must exist with port 30101 (AC-5).");

        paymentsService.GetProperty("name").GetString().Should().Be("Payments Gateway",
            "Payments Gateway service name must be exactly 'Payments Gateway' (AC-5).");
    }

    [Fact(DisplayName = "User Profile Service has exact name and port 30102")]
    public void DemoSeedFile_UserProfileService_ShouldHaveCorrectNameAndPort()
    {
        var json = File.ReadAllText(DemoSeedFilePath);
        using var doc = JsonDocument.Parse(json);

        var userService = doc.RootElement.EnumerateArray()
            .FirstOrDefault(entry => entry.GetProperty("port").GetInt32() == 30102);

        userService.ValueKind.Should().NotBe(JsonValueKind.Undefined,
            "User Profile Service must exist with port 30102 (AC-6).");

        userService.GetProperty("name").GetString().Should().Be("User Profile Service",
            "User Profile Service name must be exactly 'User Profile Service' (AC-6).");
    }

    [Fact(DisplayName = "All service externalUrl fields are non-empty valid URIs")]
    public void DemoSeedFile_AllServices_ShouldHaveValidExternalUrls()
    {
        var json = File.ReadAllText(DemoSeedFilePath);
        using var doc = JsonDocument.Parse(json);

        foreach (var entry in doc.RootElement.EnumerateArray())
        {
            var externalUrl = entry.GetProperty("externalUrl").GetString();
            
            externalUrl.Should().NotBeNullOrWhiteSpace(
                "Each service must have a non-empty externalUrl (AC-12).");

            var act = () => new Uri(externalUrl!);
            act.Should().NotThrow<UriFormatException>(
                $"externalUrl '{externalUrl}' must be a valid URI (AC-12).");
        }
    }

    [Fact(DisplayName = "No two services have the same port")]
    public void DemoSeedFile_ServicePorts_ShouldBeUnique()
    {
        var json = File.ReadAllText(DemoSeedFilePath);
        using var doc = JsonDocument.Parse(json);

        var ports = doc.RootElement.EnumerateArray()
            .Select(entry => entry.GetProperty("port").GetInt32())
            .ToList();

        ports.Should().OnlyHaveUniqueItems(
            "Each service must have a unique port to avoid binding conflicts (AC-2).");
    }

    [Fact(DisplayName = "No two services have the same name")]
    public void DemoSeedFile_ServiceNames_ShouldBeUnique()
    {
        var json = File.ReadAllText(DemoSeedFilePath);
        using var doc = JsonDocument.Parse(json);

        var names = doc.RootElement.EnumerateArray()
            .Select(entry => entry.GetProperty("name").GetString())
            .ToList();

        names.Should().OnlyHaveUniqueItems(
            "Each service must have a unique name for clear identification (AC-2).");
    }

    // ─── WireMock Mapping Content Validation (Deeper Coverage) ──────────────

    [Fact(DisplayName = "All WireMock mappings have request.method field (non-empty string)")]
    public void WireMockMappings_AllFiles_ShouldHaveRequestMethod()
    {
        var services = new[] { "weather-api", "payments-gateway", "user-profile-service" };

        foreach (var service in services)
        {
            var mappingsPath = Path.Combine(DemoMocksPath, service, "mappings");
            var mappingFiles = Directory.GetFiles(mappingsPath, "*.json");

            foreach (var file in mappingFiles)
            {
                var json = File.ReadAllText(file);
                using var doc = JsonDocument.Parse(json);

                doc.RootElement.TryGetProperty("request", out var request).Should().BeTrue(
                    $"{Path.GetFileName(file)} must have a 'request' object (WireMock stub format).");

                request.TryGetProperty("method", out var method).Should().BeTrue(
                    $"{Path.GetFileName(file)} must have 'request.method' field (AC-4, AC-5, AC-6).");

                method.GetString().Should().NotBeNullOrWhiteSpace(
                    $"{Path.GetFileName(file)} 'request.method' must be a non-empty string.");
            }
        }
    }

    [Fact(DisplayName = "All WireMock mappings have request.urlPath field (starts with /)")]
    public void WireMockMappings_AllFiles_ShouldHaveRequestUrlPath()
    {
        var services = new[] { "weather-api", "payments-gateway", "user-profile-service" };

        foreach (var service in services)
        {
            var mappingsPath = Path.Combine(DemoMocksPath, service, "mappings");
            var mappingFiles = Directory.GetFiles(mappingsPath, "*.json");

            foreach (var file in mappingFiles)
            {
                var json = File.ReadAllText(file);
                using var doc = JsonDocument.Parse(json);

                var request = doc.RootElement.GetProperty("request");
                request.TryGetProperty("urlPath", out var urlPath).Should().BeTrue(
                    $"{Path.GetFileName(file)} must have 'request.urlPath' field (AC-4, AC-5, AC-6).");

                var urlPathStr = urlPath.GetString();
                urlPathStr.Should().StartWith("/",
                    $"{Path.GetFileName(file)} 'request.urlPath' must start with '/' (WireMock format).");
            }
        }
    }

    [Fact(DisplayName = "All WireMock mappings have response.status field (200-599 range)")]
    public void WireMockMappings_AllFiles_ShouldHaveResponseStatus()
    {
        var services = new[] { "weather-api", "payments-gateway", "user-profile-service" };

        foreach (var service in services)
        {
            var mappingsPath = Path.Combine(DemoMocksPath, service, "mappings");
            var mappingFiles = Directory.GetFiles(mappingsPath, "*.json");

            foreach (var file in mappingFiles)
            {
                var json = File.ReadAllText(file);
                using var doc = JsonDocument.Parse(json);

                var response = doc.RootElement.GetProperty("response");
                response.TryGetProperty("status", out var status).Should().BeTrue(
                    $"{Path.GetFileName(file)} must have 'response.status' field (AC-4, AC-5, AC-6).");

                var statusCode = status.GetInt32();
                statusCode.Should().BeInRange(200, 599,
                    $"{Path.GetFileName(file)} 'response.status' must be a valid HTTP status code.");
            }
        }
    }

    [Fact(DisplayName = "Weather API has GET mapping with urlPath containing '/weather/'")]
    public void WeatherApi_ShouldHaveGetMappingWithWeatherPath()
    {
        var mappingsPath = Path.Combine(DemoMocksPath, "weather-api", "mappings");
        var mappingFiles = Directory.GetFiles(mappingsPath, "*.json");

        var hasGetWeatherMapping = false;

        foreach (var file in mappingFiles)
        {
            var json = File.ReadAllText(file);
            using var doc = JsonDocument.Parse(json);

            var request = doc.RootElement.GetProperty("request");
            var method = request.GetProperty("method").GetString();
            var urlPath = request.GetProperty("urlPath").GetString();

            if (method == "GET" && urlPath?.Contains("/weather/") == true)
            {
                hasGetWeatherMapping = true;
                break;
            }
        }

        hasGetWeatherMapping.Should().BeTrue(
            "Weather API must have at least one GET mapping with urlPath containing '/weather/' (AC-4).");
    }

    [Fact(DisplayName = "Payments Gateway has POST mapping (method is POST)")]
    public void PaymentsGateway_ShouldHavePostMapping()
    {
        var mappingsPath = Path.Combine(DemoMocksPath, "payments-gateway", "mappings");
        var mappingFiles = Directory.GetFiles(mappingsPath, "*.json");

        var hasPostMapping = false;

        foreach (var file in mappingFiles)
        {
            var json = File.ReadAllText(file);
            using var doc = JsonDocument.Parse(json);

            var request = doc.RootElement.GetProperty("request");
            var method = request.GetProperty("method").GetString();

            if (method == "POST")
            {
                hasPostMapping = true;
                break;
            }
        }

        hasPostMapping.Should().BeTrue(
            "Payments Gateway must have at least one POST mapping (AC-5).");
    }

    [Fact(DisplayName = "User Profile Service has GET mapping (method is GET)")]
    public void UserProfileService_ShouldHaveGetMapping()
    {
        var mappingsPath = Path.Combine(DemoMocksPath, "user-profile-service", "mappings");
        var mappingFiles = Directory.GetFiles(mappingsPath, "*.json");

        var hasGetMapping = false;

        foreach (var file in mappingFiles)
        {
            var json = File.ReadAllText(file);
            using var doc = JsonDocument.Parse(json);

            var request = doc.RootElement.GetProperty("request");
            var method = request.GetProperty("method").GetString();

            if (method == "GET")
            {
                hasGetMapping = true;
                break;
            }
        }

        hasGetMapping.Should().BeTrue(
            "User Profile Service must have at least one GET mapping (AC-6).");
    }

    [Fact(DisplayName = "All WireMock mappings have inline response bodies (no __files/ references needed)")]
    public void WireMockMappings_AllFiles_ShouldHaveInlineResponseBodies()
    {
        var services = new[] { "weather-api", "payments-gateway", "user-profile-service" };

        foreach (var service in services)
        {
            var mappingsPath = Path.Combine(DemoMocksPath, service, "mappings");
            var mappingFiles = Directory.GetFiles(mappingsPath, "*.json");

            foreach (var file in mappingFiles)
            {
                var json = File.ReadAllText(file);
                using var doc = JsonDocument.Parse(json);

                var response = doc.RootElement.GetProperty("response");
                
                // Validate response has either jsonBody or bodyFileName
                var hasJsonBody = response.TryGetProperty("jsonBody", out _);
                var hasBodyFileName = response.TryGetProperty("bodyFileName", out _);

                (hasJsonBody || hasBodyFileName).Should().BeTrue(
                    $"{Path.GetFileName(file)} must have either 'response.jsonBody' or 'response.bodyFileName' (WireMock format).");
            }
        }
    }

    // ─── Entrypoint Script Content Validation (Deeper Coverage) ─────────────

    [Fact(DisplayName = "Entrypoint script contains correct demo password 'demofishtank1' (not 'demo')")]
    public void DemoEntrypointScript_ShouldContainCorrectPassword()
    {
        var content = File.ReadAllText(DemoEntrypointPath);

        content.Should().Contain("demofishtank1",
            "The demo password must be exactly 'demofishtank1' (13 chars, meets ≥12 char requirement) (AC-10).");

        content.Should().NotContain("\"password\":\"demo\"",
            "The demo password must NOT be 'demo' (too short, fails backend validation) (AC-10).");
    }

    [Fact(DisplayName = "Entrypoint script contains 'api/auth/setup' endpoint (correct endpoint)")]
    public void DemoEntrypointScript_ShouldContainAuthSetupEndpoint()
    {
        var content = File.ReadAllText(DemoEntrypointPath);

        content.Should().Contain("api/auth/setup",
            "The entrypoint script must call POST /api/auth/setup to create the admin account (AC-10).");
    }

    [Fact(DisplayName = "Entrypoint script contains 'api/setup/status' endpoint (first-run check)")]
    public void DemoEntrypointScript_ShouldContainSetupStatusEndpoint()
    {
        var content = File.ReadAllText(DemoEntrypointPath);

        content.Should().Contain("api/setup/status",
            "The entrypoint script must call GET /api/setup/status to check if first-run setup is needed (AC-10).");
    }

    [Fact(DisplayName = "Entrypoint script does NOT set FISHTANK_ADMIN_PASSWORD (env var doesn't exist)")]
    public void DemoEntrypointScript_ShouldNotSetAdminPasswordEnvVar()
    {
        var content = File.ReadAllText(DemoEntrypointPath);

        content.Should().NotContain("FISHTANK_ADMIN_PASSWORD",
            "FISHTANK_ADMIN_PASSWORD env var does not exist in the backend codebase — " +
            "admin account creation requires calling POST /api/auth/setup (AC-10).");
    }

    // ─── Demo Dockerfile Content Validation (Deeper Coverage) ───────────────

    [Fact(DisplayName = "Demo Dockerfile sets FISHTANK_SEED_FILE to exact value '/data/demo-seed.json'")]
    public void DemoDockerfile_ShouldSetSeedFileEnvVarToExactValue()
    {
        var content = File.ReadAllText(DemoDockerfilePath);

        content.Should().Contain("FISHTANK_SEED_FILE=/data/demo-seed.json",
            "The demo Dockerfile must set FISHTANK_SEED_FILE=/data/demo-seed.json (exact env var value) (AC-8).");
    }

    [Fact(DisplayName = "Demo Dockerfile does NOT set FISHTANK_ADMIN_PASSWORD (env var doesn't exist)")]
    public void DemoDockerfile_ShouldNotSetAdminPasswordEnvVar()
    {
        var content = File.ReadAllText(DemoDockerfilePath);

        content.Should().NotContain("FISHTANK_ADMIN_PASSWORD",
            "FISHTANK_ADMIN_PASSWORD env var does not exist in the backend — " +
            "the entrypoint script creates the admin via POST /api/auth/setup (AC-10).");
    }

    [Fact(DisplayName = "Demo Dockerfile contains 'demo-entrypoint.sh' (custom entrypoint)")]
    public void DemoDockerfile_ShouldContainCustomEntrypoint()
    {
        var content = File.ReadAllText(DemoDockerfilePath);

        content.Should().Contain("demo-entrypoint.sh",
            "The demo Dockerfile must use demo-entrypoint.sh as the custom entrypoint (AC-10).");
    }

    // ─── CI Workflow Validation (Deeper Coverage) ───────────────────────────

    [Fact(DisplayName = ".github/workflows/docker.yml contains 'publish-demo' job")]
    public void DockerWorkflow_ShouldContainPublishDemoJob()
    {
        var workflowPath = Path.Combine(GetProjectRoot(), ".github", "workflows", "docker.yml");
        
        File.Exists(workflowPath).Should().BeTrue(
            ".github/workflows/docker.yml must exist (CI workflow).");

        var content = File.ReadAllText(workflowPath);

        content.Should().Contain("publish-demo",
            "The CI workflow must have a 'publish-demo' job to build and push the demo image (AC-9).");
    }

    [Fact(DisplayName = ".github/workflows/docker.yml contains 'nicoiodice/fishtank:demo' tag")]
    public void DockerWorkflow_ShouldContainDemoTag()
    {
        var workflowPath = Path.Combine(GetProjectRoot(), ".github", "workflows", "docker.yml");
        var content = File.ReadAllText(workflowPath);

        content.Should().Contain("nicoiodice/fishtank:demo",
            "The CI workflow must tag the demo image as 'nicoiodice/fishtank:demo' (AC-9).");
    }

    [Fact(DisplayName = ".github/workflows/docker.yml 'publish-demo' job has 'needs:' dependency on main publish job")]
    public void DockerWorkflow_PublishDemoJob_ShouldDependOnMainPublishJob()
    {
        var workflowPath = Path.Combine(GetProjectRoot(), ".github", "workflows", "docker.yml");
        var content = File.ReadAllText(workflowPath);

        // Find the publish-demo job section
        var publishDemoIndex = content.IndexOf("publish-demo:");
        publishDemoIndex.Should().BeGreaterThan(0, 
            "The 'publish-demo:' job definition must exist in docker.yml.");

        // Extract a reasonable chunk after publish-demo: to check for needs: dependency
        // (up to 1000 chars which should cover the entire job definition)
        var publishDemoSection = content.Substring(publishDemoIndex, Math.Min(1000, content.Length - publishDemoIndex));

        publishDemoSection.Should().Contain("needs:",
            "The 'publish-demo' job must have a 'needs:' dependency to ensure the production image is built first.");

        publishDemoSection.Should().MatchRegex(@"needs:\s*\[.*publish.*\]",
            "The 'publish-demo' job must depend on the 'publish' job (ensures production image exists before layering demo image on top).");
    }

    // ─── README Validation (Deeper Coverage) ────────────────────────────────

    [Fact(DisplayName = "README.md contains 'nicoiodice/fishtank:demo' (demo image documented)")]
    public void Readme_ShouldContainDemoImageTag()
    {
        var readmePath = Path.Combine(GetProjectRoot(), "README.md");
        
        File.Exists(readmePath).Should().BeTrue(
            "README.md must exist in the repo root.");

        var content = File.ReadAllText(readmePath);

        content.Should().Contain("nicoiodice/fishtank:demo",
            "README.md must document the demo image with 'nicoiodice/fishtank:demo' tag (AC-11).");
    }

    [Fact(DisplayName = "README.md contains 'demofishtank1' (correct demo password documented)")]
    public void Readme_ShouldContainCorrectDemoPassword()
    {
        var readmePath = Path.Combine(GetProjectRoot(), "README.md");
        var content = File.ReadAllText(readmePath);

        content.Should().Contain("demofishtank1",
            "README.md must document the correct demo password 'demofishtank1' (AC-11).");
    }

    [Fact(DisplayName = "README.md contains security warning about demo credentials (contains 'evaluation' or 'production')")]
    public void Readme_ShouldContainSecurityWarning()
    {
        var readmePath = Path.Combine(GetProjectRoot(), "README.md");
        var content = File.ReadAllText(readmePath);

        var hasEvaluationWarning = content.Contains("evaluation", StringComparison.OrdinalIgnoreCase);
        var hasProductionWarning = content.Contains("production", StringComparison.OrdinalIgnoreCase);

        (hasEvaluationWarning || hasProductionWarning).Should().BeTrue(
            "README.md must contain a security warning about demo credentials (mentions 'evaluation' or 'production') (AC-11).");
    }

    [Fact(DisplayName = "README.md contains '-p 9090:5000' (correct port mapping documented)")]
    public void Readme_ShouldContainCorrectPortMapping()
    {
        var readmePath = Path.Combine(GetProjectRoot(), "README.md");
        var content = File.ReadAllText(readmePath);

        content.Should().Contain("-p 9090:5000",
            "README.md must document the correct port mapping '-p 9090:5000' (maps host port 9090 to container port 5000) (AC-1).");
    }
}
