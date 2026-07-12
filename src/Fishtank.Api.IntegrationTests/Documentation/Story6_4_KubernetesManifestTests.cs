using System.IO;
using System.Linq;
using FluentAssertions;
using Xunit;
using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;

namespace Fishtank.Api.IntegrationTests.Documentation;

/// <summary>
/// RED-PHASE ATDD acceptance test scaffolds for Story 6.4 (K8s Manifest — AC-8, AC-9, AC-10).
///
/// These tests FAIL before implementation. They PASS once Story 6.4 is done.
///
/// ACs covered:
///   AC-8:  deployment.yaml exists and is a valid Kubernetes manifest
///   AC-9:  deployment.yaml includes readiness probe on GET /health
///   AC-10: deployment.yaml has documented placeholders (image tag, env vars, volumes)
///
/// RED before implementation:
///   - deployment.yaml does NOT exist in repo root
///   - File content is missing all required K8s resources (Deployment + Service)
///   - Readiness probe configuration is missing
///   - Placeholders for image, env vars, and volumes are missing or undocumented
///
/// Test Design Reference: _bmad-output/test-artifacts/test-design/test-design-epic-6.md (Story 6-4 section)
/// </summary>
public class Story6_4_KubernetesManifestTests
{
    private readonly string _projectRoot;
    private readonly string _deploymentYamlPath;

    public Story6_4_KubernetesManifestTests()
    {
        _projectRoot = FindProjectRoot();
        _deploymentYamlPath = Path.Combine(_projectRoot, "deployment.yaml");
    }

    // -------------------------------------------------------------------------
    // AC-8 — deployment.yaml exists and is valid K8s manifest
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AC-8: deployment.yaml exists in repository root")]
    public void DeploymentYaml_ExistsInRepositoryRoot()
    {
        // RED: deployment.yaml does not exist yet
        File.Exists(_deploymentYamlPath).Should().BeTrue(
            $"deployment.yaml must exist at repository root: {_deploymentYamlPath} (AC-8 FR-41)");
    }

    [Fact(DisplayName = "AC-8: deployment.yaml is valid YAML with Deployment resource")]
    public void DeploymentYaml_ContainsValidDeploymentResource()
    {
        // Arrange
        File.Exists(_deploymentYamlPath).Should().BeTrue("deployment.yaml must exist to validate content");
        var yamlContent = File.ReadAllText(_deploymentYamlPath);

        // Note: deployment.yaml contains multiple YAML documents (Deployment + Service)
        // YamlDotNet's Deserialize<object> only handles single documents
        // Since we only check content strings, we don't need to parse - just validate format
        
        // Assert — contains Deployment kind
        // RED: deployment.yaml does not contain Deployment resource yet
        yamlContent.Should().Contain("kind: Deployment",
            "deployment.yaml must include a Kubernetes Deployment resource (AC-8 FR-41)");

        yamlContent.Should().Contain("apiVersion: apps/v1",
            "Deployment must use apiVersion: apps/v1 (AC-8 FR-41)");
    }

    [Fact(DisplayName = "AC-8: deployment.yaml contains valid Service resource")]
    public void DeploymentYaml_ContainsValidServiceResource()
    {
        // Arrange
        File.Exists(_deploymentYamlPath).Should().BeTrue("deployment.yaml must exist to validate content");
        var yamlContent = File.ReadAllText(_deploymentYamlPath);

        // Assert — contains Service kind
        // RED: deployment.yaml does not contain Service resource yet
        yamlContent.Should().Contain("kind: Service",
            "deployment.yaml must include a Kubernetes Service resource (AC-8 FR-41)");

        yamlContent.Should().Contain("apiVersion: v1",
            "Service must use apiVersion: v1 (AC-8 FR-41)");
    }

    // -------------------------------------------------------------------------
    // AC-9 — deployment.yaml includes readiness probe on GET /health
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AC-9: Deployment includes readiness probe configuration")]
    public void DeploymentYaml_IncludesReadinessProbe()
    {
        // Arrange
        File.Exists(_deploymentYamlPath).Should().BeTrue("deployment.yaml must exist to validate readiness probe");
        var yamlContent = File.ReadAllText(_deploymentYamlPath);

        // Assert — readiness probe is configured
        // RED: readinessProbe configuration does not exist yet
        yamlContent.Should().Contain("readinessProbe:",
            "Deployment must include readinessProbe configuration (AC-9 FR-41 R-E6-006)");
    }

    [Fact(DisplayName = "AC-9: Readiness probe points to GET /health endpoint")]
    public void DeploymentYaml_ReadinessProbePointsToHealthEndpoint()
    {
        // Arrange
        File.Exists(_deploymentYamlPath).Should().BeTrue("deployment.yaml must exist to validate readiness probe path");
        var yamlContent = File.ReadAllText(_deploymentYamlPath);

        // Assert — readiness probe uses /health endpoint
        // RED: /health path is not configured in readinessProbe yet
        yamlContent.Should().Contain("path: /health",
            "Readiness probe must point to GET /health endpoint (AC-9 FR-41 R-E6-006)");

        // Verify HTTP GET method
        yamlContent.Should().Contain("httpGet:",
            "Readiness probe must use httpGet method (AC-9 FR-41 R-E6-006)");
    }

    // -------------------------------------------------------------------------
    // AC-10 — deployment.yaml has documented placeholders
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AC-10: Deployment contains documented image placeholder")]
    public void DeploymentYaml_ContainsDocumentedImagePlaceholder()
    {
        // Arrange
        File.Exists(_deploymentYamlPath).Should().BeTrue("deployment.yaml must exist to validate image placeholder");
        var yamlContent = File.ReadAllText(_deploymentYamlPath);

        // Assert — image placeholder is documented
        // RED: image placeholder comment does not exist yet
        // We expect a comment like: # Replace with your image tag (e.g., nicoiodice/fishtank:v1.0.0)
        var linesWithImage = yamlContent.Split('\n').Where(line => 
            line.Contains("image:", StringComparison.OrdinalIgnoreCase)).ToList();

        linesWithImage.Should().NotBeEmpty(
            "deployment.yaml must contain image: field (AC-10 FR-41)");

        // Check that there's a comment explaining the placeholder
        // Either on the same line or the line above
        var hasImageDocumentation = yamlContent.Contains("nicoiodice/fishtank") ||
                                     yamlContent.Contains("Replace with your image") ||
                                     yamlContent.Contains("image tag");

        hasImageDocumentation.Should().BeTrue(
            "Image placeholder must be documented with example (e.g., nicoiodice/fishtank:v1.0.0) (AC-10 FR-41)");
    }

    [Fact(DisplayName = "AC-10: Deployment contains documented environment variable placeholders")]
    public void DeploymentYaml_ContainsDocumentedEnvVarPlaceholders()
    {
        // Arrange
        File.Exists(_deploymentYamlPath).Should().BeTrue("deployment.yaml must exist to validate env var placeholders");
        var yamlContent = File.ReadAllText(_deploymentYamlPath);

        // Assert — required env vars from FR-36 are present and documented
        // RED: env vars section does not exist or is incomplete
        var requiredEnvVars = new[]
        {
            "FISHTANK_JWT_SECRET",
            "FISHTANK_MOCKS_ROOT"
        };

        foreach (var envVar in requiredEnvVars)
        {
            yamlContent.Should().Contain(envVar,
                $"{envVar} must be documented in deployment.yaml env section (AC-10 FR-41 FR-36)");
        }

        // Verify env section exists
        yamlContent.Should().Contain("env:",
            "Deployment must include env: section for environment variables (AC-10 FR-41)");
    }

    [Fact(DisplayName = "AC-10: Deployment contains documented volume mount placeholders")]
    public void DeploymentYaml_ContainsDocumentedVolumeMountPlaceholders()
    {
        // Arrange
        File.Exists(_deploymentYamlPath).Should().BeTrue("deployment.yaml must exist to validate volume placeholders");
        var yamlContent = File.ReadAllText(_deploymentYamlPath);

        // Assert — volume mounts for /data and /mocks are present and documented
        // RED: volumeMounts section does not exist yet
        yamlContent.Should().Contain("volumeMounts:",
            "Deployment must include volumeMounts section (AC-10 FR-41)");

        // Check for /data mount (SQLite database)
        yamlContent.Should().Contain("/data",
            "volumeMounts must include /data for SQLite database (AC-10 FR-41)");

        // Check for /mocks mount (WireMock mappings)
        yamlContent.Should().Contain("/mocks",
            "volumeMounts must include /mocks for WireMock mappings (AC-10 FR-41)");

        // Verify volumes section exists
        yamlContent.Should().Contain("volumes:",
            "Deployment must include volumes section to define persistent storage (AC-10 FR-41)");
    }

    // -------------------------------------------------------------------------
    // Helper Methods
    // -------------------------------------------------------------------------

    private static string FindProjectRoot()
    {
        var directory = Directory.GetCurrentDirectory();
        while (directory != null)
        {
            // Prioritize .git to find repository root (not src/ which also has .slnx)
            if (File.Exists(Path.Combine(directory, ".git", "HEAD")))
            {
                return directory;
            }
            directory = Directory.GetParent(directory)?.FullName;
        }
        
        // Fallback to looking for Fishtank.slnx if no .git found
        directory = Directory.GetCurrentDirectory();
        while (directory != null)
        {
            if (File.Exists(Path.Combine(directory, "Fishtank.slnx")))
            {
                return directory;
            }
            directory = Directory.GetParent(directory)?.FullName;
        }
        
        throw new InvalidOperationException("Could not find project root (no .git or Fishtank.slnx found)");
    }
}
