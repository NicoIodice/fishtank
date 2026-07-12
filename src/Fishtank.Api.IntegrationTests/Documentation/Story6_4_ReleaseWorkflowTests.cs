using System.IO;
using System.Linq;
using FluentAssertions;
using Xunit;
using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;

namespace Fishtank.Api.IntegrationTests.Documentation;

/// <summary>
/// RED-PHASE ATDD acceptance test scaffolds for Story 6.4 (Release Workflow — AC-1 to AC-7).
///
/// These tests FAIL before implementation. They PASS once Story 6.4 is done.
///
/// ACs covered:
///   AC-1: Release workflow triggers on git tag matching v*.*.*
///   AC-2: Release workflow pipeline steps (checkout, build, test, docker, smoke, publish)
///   AC-3 to AC-6: Cross-platform smoke tests (Linux, macOS ARM, macOS Intel, Windows)
///   AC-7: Docker Hub publish with version tags and latest
///
/// NOTE: These are STATIC validation tests. They verify the workflow file exists and contains
/// the correct configuration. They CANNOT test actual GitHub Actions execution without GitHub infra.
/// The real CI runs on GitHub Actions runners and validates behavior at runtime.
///
/// RED before implementation:
///   - .github/workflows/release.yml does NOT exist or is incomplete
///   - Workflow trigger is missing or incorrect
///   - Required steps (build, test, docker, smoke tests, publish) are missing
///   - Secrets (DOCKERHUB_USERNAME, DOCKERHUB_TOKEN) are hardcoded instead of referenced
///
/// Test Design Reference: _bmad-output/test-artifacts/test-design/test-design-epic-6.md (Story 6-4 section)
/// </summary>
public class Story6_4_ReleaseWorkflowTests
{
    private readonly string _projectRoot;
    private readonly string _releaseWorkflowPath;

    public Story6_4_ReleaseWorkflowTests()
    {
        _projectRoot = FindProjectRoot();
        _releaseWorkflowPath = Path.Combine(_projectRoot, ".github", "workflows", "release.yml");
    }

    // -------------------------------------------------------------------------
    // AC-1 — Release workflow trigger on git tag v*.*.*
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AC-1: release.yml exists in .github/workflows")]
    public void ReleaseWorkflow_ExistsInWorkflowsDirectory()
    {
        // RED: release.yml does not exist yet
        File.Exists(_releaseWorkflowPath).Should().BeTrue(
            $"release.yml must exist at .github/workflows/release.yml: {_releaseWorkflowPath} (AC-1 FR-34)");
    }

    [Fact(DisplayName = "AC-1: release.yml is valid YAML")]
    public void ReleaseWorkflow_IsValidYaml()
    {
        // Arrange
        File.Exists(_releaseWorkflowPath).Should().BeTrue("release.yml must exist");
        var yamlContent = File.ReadAllText(_releaseWorkflowPath);

        // Act — attempt to parse YAML
        var deserializer = new DeserializerBuilder()
            .WithNamingConvention(UnderscoredNamingConvention.Instance)
            .Build();

        // Assert — parsing should not throw
        // RED: YAML structure is invalid
        var exception = Record.Exception(() => deserializer.Deserialize<object>(yamlContent));
        exception.Should().BeNull("release.yml must be valid YAML (AC-1 FR-34)");
    }

    [Fact(DisplayName = "AC-1: release.yml triggers on push with tag matching v*.*.*")]
    public void ReleaseWorkflow_TriggersOnVersionTag()
    {
        // Arrange
        File.Exists(_releaseWorkflowPath).Should().BeTrue("release.yml must exist");
        var yamlContent = File.ReadAllText(_releaseWorkflowPath);

        // Assert — workflow trigger configuration
        // RED: Trigger on tag v*.*.* is missing
        yamlContent.Should().Contain("on:", "release.yml must define workflow triggers (AC-1 FR-34)");
        yamlContent.Should().Contain("push:", "release.yml must trigger on push events (AC-1 FR-34)");
        yamlContent.Should().Contain("tags:", "release.yml must trigger on tag pushes (AC-1 FR-34)");

        // Verify version tag pattern v*.*.*
        var hasSemverTagPattern = yamlContent.Contains("'v*.*.*'") ||
                                   yamlContent.Contains("\"v*.*.*\"") ||
                                   yamlContent.Contains("- v*.*.*");

        hasSemverTagPattern.Should().BeTrue(
            "release.yml must trigger on semantic version tags matching v*.*.* (e.g., v1.0.0) (AC-1 FR-34)");
    }

    // -------------------------------------------------------------------------
    // AC-2 — Release workflow pipeline steps
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AC-2: release.yml contains checkout step")]
    public void ReleaseWorkflow_ContainsCheckoutStep()
    {
        // Arrange
        File.Exists(_releaseWorkflowPath).Should().BeTrue("release.yml must exist");
        var yamlContent = File.ReadAllText(_releaseWorkflowPath);

        // Assert — checkout action is present
        // RED: Checkout step is missing
        var hasCheckoutAction = yamlContent.Contains("actions/checkout@") ||
                                 yamlContent.Contains("uses: actions/checkout");

        hasCheckoutAction.Should().BeTrue(
            "release.yml must include actions/checkout step to clone code (AC-2 FR-34)");
    }

    [Fact(DisplayName = "AC-2: release.yml contains dotnet build step")]
    public void ReleaseWorkflow_ContainsDotnetBuildStep()
    {
        // Arrange
        File.Exists(_releaseWorkflowPath).Should().BeTrue("release.yml must exist");
        var yamlContent = File.ReadAllText(_releaseWorkflowPath);

        // Assert — dotnet build command is present
        // RED: dotnet build step is missing
        yamlContent.Should().Contain("dotnet build",
            "release.yml must include 'dotnet build' step to build backend (AC-2 FR-34)");
    }

    [Fact(DisplayName = "AC-2: release.yml contains backend unit tests step")]
    public void ReleaseWorkflow_ContainsBackendUnitTestsStep()
    {
        // Arrange
        File.Exists(_releaseWorkflowPath).Should().BeTrue("release.yml must exist");
        var yamlContent = File.ReadAllText(_releaseWorkflowPath);

        // Assert — backend unit tests are executed
        // RED: Backend unit tests step is missing
        var hasUnitTests = yamlContent.Contains("dotnet test") &&
                            (yamlContent.Contains("Fishtank.Api.UnitTests") ||
                             yamlContent.Contains("UnitTests"));

        hasUnitTests.Should().BeTrue(
            "release.yml must include 'dotnet test Fishtank.Api.UnitTests' step (AC-2 FR-34)");
    }

    [Fact(DisplayName = "AC-2: release.yml contains backend integration tests step")]
    public void ReleaseWorkflow_ContainsBackendIntegrationTestsStep()
    {
        // Arrange
        File.Exists(_releaseWorkflowPath).Should().BeTrue("release.yml must exist");
        var yamlContent = File.ReadAllText(_releaseWorkflowPath);

        // Assert — backend integration tests are executed
        // RED: Backend integration tests step is missing
        var hasIntegrationTests = yamlContent.Contains("dotnet test") &&
                                   (yamlContent.Contains("Fishtank.Api.IntegrationTests") ||
                                    yamlContent.Contains("IntegrationTests"));

        hasIntegrationTests.Should().BeTrue(
            "release.yml must include 'dotnet test Fishtank.Api.IntegrationTests' step (AC-2 FR-34)");
    }

    [Fact(DisplayName = "AC-2: release.yml contains frontend build step")]
    public void ReleaseWorkflow_ContainsFrontendBuildStep()
    {
        // Arrange
        File.Exists(_releaseWorkflowPath).Should().BeTrue("release.yml must exist");
        var yamlContent = File.ReadAllText(_releaseWorkflowPath);

        // Assert — frontend build command is present
        // RED: Frontend build step is missing
        var hasFrontendBuild = (yamlContent.Contains("npm run build") || yamlContent.Contains("npm build")) &&
                                yamlContent.Contains("client");

        hasFrontendBuild.Should().BeTrue(
            "release.yml must include 'npm run build' step in src/client to build frontend (AC-2 FR-34)");
    }

    [Fact(DisplayName = "AC-2: release.yml contains frontend unit tests step")]
    public void ReleaseWorkflow_ContainsFrontendTestsStep()
    {
        // Arrange
        File.Exists(_releaseWorkflowPath).Should().BeTrue("release.yml must exist");
        var yamlContent = File.ReadAllText(_releaseWorkflowPath);

        // Assert — frontend tests command is present
        // RED: Frontend tests step is missing
        var hasFrontendTests = yamlContent.Contains("npm test") ||
                                yamlContent.Contains("npm run test");

        hasFrontendTests.Should().BeTrue(
            "release.yml must include 'npm test' step to run frontend unit tests (AC-2 FR-34)");
    }

    [Fact(DisplayName = "AC-2: release.yml contains Docker build step")]
    public void ReleaseWorkflow_ContainsDockerBuildStep()
    {
        // Arrange
        File.Exists(_releaseWorkflowPath).Should().BeTrue("release.yml must exist");
        var yamlContent = File.ReadAllText(_releaseWorkflowPath);

        // Assert — Docker build command is present
        // RED: Docker build step is missing
        var hasDockerBuild = yamlContent.Contains("docker build") ||
                              yamlContent.Contains("docker/build-push-action") ||
                              yamlContent.Contains("docker buildx");

        hasDockerBuild.Should().BeTrue(
            "release.yml must include Docker build step with version tag from git tag (AC-2 FR-34)");
    }

    // -------------------------------------------------------------------------
    // AC-3 to AC-6 — Cross-platform smoke tests
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AC-3: release.yml contains Linux smoke test")]
    public void ReleaseWorkflow_ContainsLinuxSmokeTest()
    {
        // Arrange
        File.Exists(_releaseWorkflowPath).Should().BeTrue("release.yml must exist");
        var yamlContent = File.ReadAllText(_releaseWorkflowPath);

        // Assert — Linux runner job is present
        // RED: Linux smoke test is missing
        var hasLinuxRunner = yamlContent.Contains("ubuntu-") ||
                              yamlContent.Contains("runs-on: ubuntu");

        hasLinuxRunner.Should().BeTrue(
            "release.yml must include Linux runner (ubuntu-latest) for smoke test (AC-3 FR-40 R-E6-004)");

        // Verify docker run and health check
        var hasHealthCheck = yamlContent.Contains("docker run") && yamlContent.Contains("/health");

        hasHealthCheck.Should().BeTrue(
            "Linux smoke test must run 'docker run' and verify GET /health returns 200 (AC-3 FR-40 R-E6-004)");
    }

    [Fact(DisplayName = "AC-4: release.yml contains macOS Apple Silicon (arm64) smoke test")]
    public void ReleaseWorkflow_ContainsMacOsArm64SmokeTest()
    {
        // Arrange
        File.Exists(_releaseWorkflowPath).Should().BeTrue("release.yml must exist");
        var yamlContent = File.ReadAllText(_releaseWorkflowPath);

        // Assert — macOS ARM runner job is present
        // RED: macOS ARM smoke test is missing
        var hasMacOsArmRunner = yamlContent.Contains("macos-") &&
                                 (yamlContent.Contains("arm64") ||
                                  yamlContent.Contains("macos-14") ||
                                  yamlContent.Contains("macos-latest")); // GitHub uses ARM by default on macos-latest

        hasMacOsArmRunner.Should().BeTrue(
            "release.yml must include macOS Apple Silicon runner (macos-latest or macos-14) for smoke test (AC-4 FR-40 R-E6-004)");
    }

    [Fact(DisplayName = "AC-5: release.yml contains macOS Intel (x64) smoke test")]
    public void ReleaseWorkflow_ContainsMacOsIntelSmokeTest()
    {
        // Arrange
        File.Exists(_releaseWorkflowPath).Should().BeTrue("release.yml must exist");
        var yamlContent = File.ReadAllText(_releaseWorkflowPath);

        // Assert — macOS Intel runner job is present
        // RED: macOS Intel smoke test is missing
        var hasMacOsIntelRunner = yamlContent.Contains("macos-13") ||
                                   (yamlContent.Contains("macos-") && yamlContent.Contains("intel"));

        hasMacOsIntelRunner.Should().BeTrue(
            "release.yml must include macOS Intel runner (macos-13) for smoke test (AC-5 FR-40 R-E6-004)");
    }

    [Fact(DisplayName = "AC-6: release.yml contains Windows smoke test")]
    public void ReleaseWorkflow_ContainsWindowsSmokeTest()
    {
        // Arrange
        File.Exists(_releaseWorkflowPath).Should().BeTrue("release.yml must exist");
        var yamlContent = File.ReadAllText(_releaseWorkflowPath);

        // Assert — Windows runner job is present
        // RED: Windows smoke test is missing
        var hasWindowsRunner = yamlContent.Contains("windows-") ||
                                yamlContent.Contains("runs-on: windows");

        hasWindowsRunner.Should().BeTrue(
            "release.yml must include Windows runner (windows-latest) for smoke test (AC-6 FR-40 R-E6-004)");
    }

    // -------------------------------------------------------------------------
    // AC-7 — Docker Hub publish
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AC-7: release.yml contains Docker Hub publish step")]
    public void ReleaseWorkflow_ContainsDockerHubPublishStep()
    {
        // Arrange
        File.Exists(_releaseWorkflowPath).Should().BeTrue("release.yml must exist");
        var yamlContent = File.ReadAllText(_releaseWorkflowPath);

        // Assert — Docker push/publish is present
        // RED: Docker Hub publish step is missing
        var hasDockerPush = yamlContent.Contains("docker push") ||
                             yamlContent.Contains("docker/build-push-action");

        hasDockerPush.Should().BeTrue(
            "release.yml must include Docker Hub publish step (AC-7 FR-34)");
    }

    [Fact(DisplayName = "AC-7: release.yml publishes to nicoiodice/fishtank with version tag")]
    public void ReleaseWorkflow_PublishesVersionTag()
    {
        // Arrange
        File.Exists(_releaseWorkflowPath).Should().BeTrue("release.yml must exist");
        var yamlContent = File.ReadAllText(_releaseWorkflowPath);

        // Assert — nicoiodice/fishtank image name is present
        // RED: Image name or versioned tag is missing
        yamlContent.Should().Contain("nicoiodice/fishtank",
            "release.yml must publish to nicoiodice/fishtank repository on Docker Hub (AC-7 FR-34)");

        // Verify version tag is derived from git tag
        var hasVersionTag = yamlContent.Contains("${{ github.ref_name }}") ||
                             yamlContent.Contains("${GITHUB_REF#refs/tags/}") ||
                             yamlContent.Contains("tags:") && yamlContent.Contains("v*.*.*");

        hasVersionTag.Should().BeTrue(
            "release.yml must publish versioned tag matching git tag (e.g., nicoiodice/fishtank:v1.0.0) (AC-7 FR-34)");
    }

    [Fact(DisplayName = "AC-7: release.yml publishes latest tag")]
    public void ReleaseWorkflow_PublishesLatestTag()
    {
        // Arrange
        File.Exists(_releaseWorkflowPath).Should().BeTrue("release.yml must exist");
        var yamlContent = File.ReadAllText(_releaseWorkflowPath);

        // Assert — latest tag is published
        // RED: latest tag reference is missing
        yamlContent.Should().Contain("latest",
            "release.yml must publish latest tag (nicoiodice/fishtank:latest) (AC-7 FR-34)");
    }

    [Fact(DisplayName = "AC-7: release.yml uses secrets for Docker Hub credentials")]
    public void ReleaseWorkflow_UsesDockerHubSecrets()
    {
        // Arrange
        File.Exists(_releaseWorkflowPath).Should().BeTrue("release.yml must exist");
        var yamlContent = File.ReadAllText(_releaseWorkflowPath);

        // Assert — Docker Hub credentials are referenced as secrets (not hardcoded)
        // RED: Secrets are hardcoded or missing
        var usesDockerHubUsernameSecret = yamlContent.Contains("secrets.DOCKERHUB_USERNAME") ||
                                           yamlContent.Contains("${{ secrets.DOCKERHUB_USERNAME }}");

        usesDockerHubUsernameSecret.Should().BeTrue(
            "release.yml must reference secrets.DOCKERHUB_USERNAME (not hardcoded) (AC-7 FR-34)");

        var usesDockerHubTokenSecret = yamlContent.Contains("secrets.DOCKERHUB_TOKEN") ||
                                         yamlContent.Contains("${{ secrets.DOCKERHUB_TOKEN }}");

        usesDockerHubTokenSecret.Should().BeTrue(
            "release.yml must reference secrets.DOCKERHUB_TOKEN (not hardcoded) (AC-7 FR-34)");

        // Ensure credentials are NOT hardcoded (specific patterns only — not "password:" alone, which is a valid YAML key)
        var hasHardcodedCredentials = yamlContent.Contains("username: nicoiodice") ||
                                       System.Text.RegularExpressions.Regex.IsMatch(
                                           yamlContent, @"password:\s+[A-Za-z0-9+/=_-]{8,}");

        hasHardcodedCredentials.Should().BeFalse(
            "release.yml must NOT contain hardcoded Docker Hub credentials (AC-7 FR-34)");
    }

    private static string FindProjectRoot()
    {
        var directory = Directory.GetCurrentDirectory();
        while (directory != null)
        {
            if (File.Exists(Path.Combine(directory, ".git", "HEAD")))
                return directory;
            directory = Directory.GetParent(directory)?.FullName;
        }
        // Fallback
        directory = Directory.GetCurrentDirectory();
        while (directory != null)
        {
            if (File.Exists(Path.Combine(directory, "Fishtank.slnx")))
                return Directory.GetParent(directory)?.FullName ?? directory;
            directory = Directory.GetParent(directory)?.FullName;
        }
        throw new InvalidOperationException("Could not find project root");
    }
}
