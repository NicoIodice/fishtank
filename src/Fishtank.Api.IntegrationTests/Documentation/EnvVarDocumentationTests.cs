using System.IO;
using FluentAssertions;
using Xunit;

namespace Fishtank.Api.IntegrationTests.Documentation;

/// <summary>
/// AC-10 verification for Story 6.2: FR-36 Environment Variable Documentation Audit.
///
/// These tests ensure that all required environment variables from FR-36 are documented
/// in docker-compose.example.yml. This enforces documentation parity between the runtime
/// configuration and the example compose file.
/// </summary>
public class EnvVarDocumentationTests
{
    // -------------------------------------------------------------------------
    // AC-10 — FR-36 env var documentation audit
    // All required env vars must appear in docker-compose.example.yml
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AC-10: docker-compose.example.yml contains all required FR-36 env vars")]
    public void DockerComposeExample_ContainsAllRequiredEnvVars()
    {
        // Arrange - Read docker-compose.example.yml from project root
        var projectRoot = FindProjectRoot();
        var dockerComposePath = Path.Combine(projectRoot, "docker-compose.example.yml");

        File.Exists(dockerComposePath).Should().BeTrue(
            $"docker-compose.example.yml must exist at {dockerComposePath}");

        var content = File.ReadAllText(dockerComposePath);

        // Required env vars from FR-36 that were added as part of Story 6.2
        // (Story 6.2 AC-10 focuses on the 5 newly added vars from FR-36)
        var requiredEnvVars = new[]
        {
            "FISHTANK_AUTO_REGISTER",
            "FISHTANK_CAPTURE_FULL_HEADERS",
            "FISHTANK_PIPELINE_RESET_KEY",
            "FISHTANK_TOGGLE_", // Prefix for feature toggle env vars (e.g., FISHTANK_TOGGLE_NETWORK_ACTIVITY)
            "FISHTANK_DEBUG_ERRORS"
        };

        // Act & Assert - Verify each env var appears in the file
        foreach (var envVar in requiredEnvVars)
        {
            content.Should().Contain(envVar,
                $"{envVar} must be documented in docker-compose.example.yml (AC-10 FR-36 audit)");
        }
    }

    /// <summary>
    /// Finds the project root directory by walking up from the test assembly location
    /// until we find the directory containing docker-compose.example.yml.
    /// </summary>
    private static string FindProjectRoot()
    {
        var currentDir = Directory.GetCurrentDirectory();

        // Walk up the directory tree looking for docker-compose.example.yml
        while (currentDir != null)
        {
            var candidatePath = Path.Combine(currentDir, "docker-compose.example.yml");
            if (File.Exists(candidatePath))
            {
                return currentDir;
            }

            var parent = Directory.GetParent(currentDir);
            currentDir = parent?.FullName;
        }

        throw new FileNotFoundException(
            "Could not find project root containing docker-compose.example.yml. " +
            "Search started from: " + Directory.GetCurrentDirectory());
    }
}
