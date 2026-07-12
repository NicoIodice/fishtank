using System.IO;
using System.Linq;
using FluentAssertions;
using Xunit;

namespace Fishtank.Api.IntegrationTests.Documentation;

/// <summary>
/// RED-PHASE ATDD acceptance test scaffolds for Story 6.4 (Community Documentation — AC-11, AC-12, AC-14).
///
/// These tests FAIL before implementation. They PASS once Story 6.4 is done.
///
/// ACs covered:
///   AC-11: CONTRIBUTING.md contains architecture overview, tech stack, dev setup, PR workflow
///   AC-12: SECURITY.md contains vulnerability reporting, disclosure policy, supported versions
///   AC-14: README.md contains animated demo, quick-start command, env vars table, inotify note
///
/// RED before implementation:
///   - CONTRIBUTING.md exists but does NOT contain new required sections
///   - SECURITY.md exists but does NOT contain required sections
///   - README.md exists but does NOT contain updated content (quick-start, env vars, inotify)
///
/// Test Design Reference: _bmad-output/test-artifacts/test-design/test-design-epic-6.md (Story 6-4 section)
/// </summary>
public class Story6_4_CommunityDocumentationTests
{
    private readonly string _projectRoot;
    private readonly string _contributingPath;
    private readonly string _securityPath;
    private readonly string _readmePath;

    public Story6_4_CommunityDocumentationTests()
    {
        _projectRoot = FindProjectRoot();
        _contributingPath = Path.Combine(_projectRoot, "CONTRIBUTING.md");
        _securityPath = Path.Combine(_projectRoot, "SECURITY.md");
        _readmePath = Path.Combine(_projectRoot, "README.md");
    }

    // -------------------------------------------------------------------------
    // AC-11 — CONTRIBUTING.md content
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AC-11: CONTRIBUTING.md exists in repository root")]
    public void ContributingMd_ExistsInRepositoryRoot()
    {
        // RED: CONTRIBUTING.md may exist but we verify it first
        File.Exists(_contributingPath).Should().BeTrue(
            $"CONTRIBUTING.md must exist at repository root: {_contributingPath} (AC-11 FR-34)");
    }

    [Fact(DisplayName = "AC-11: CONTRIBUTING.md contains architecture overview section")]
    public void ContributingMd_ContainsArchitectureOverview()
    {
        // Arrange
        File.Exists(_contributingPath).Should().BeTrue("CONTRIBUTING.md must exist");
        var content = File.ReadAllText(_contributingPath);

        // Assert — architecture overview is present and readable in ≤10 minutes
        // RED: Architecture overview section does not exist yet
        var hasArchitectureSection = content.Contains("## Architecture", StringComparison.OrdinalIgnoreCase) ||
                                       content.Contains("# Architecture", StringComparison.OrdinalIgnoreCase) ||
                                       content.Contains("Architecture Overview", StringComparison.OrdinalIgnoreCase);

        hasArchitectureSection.Should().BeTrue(
            "CONTRIBUTING.md must contain Architecture Overview section readable in ≤10 minutes (AC-11 FR-34)");
    }

    [Fact(DisplayName = "AC-11: CONTRIBUTING.md contains tech stack description")]
    public void ContributingMd_ContainsTechStackDescription()
    {
        // Arrange
        File.Exists(_contributingPath).Should().BeTrue("CONTRIBUTING.md must exist");
        var content = File.ReadAllText(_contributingPath);

        // Assert — tech stack section describes key technologies
        // RED: Tech stack section does not exist yet
        var expectedTechnologies = new[]
        {
            ".NET 10",      // Backend framework
            "React 19",     // Frontend framework
            "TypeScript",   // Frontend language
            "Vite",         // Build tool
            "Tailwind",     // CSS framework
            "WireMock"      // Mock service
        };

        // Check for tech stack section
        var hasTechStackSection = content.Contains("## Tech Stack", StringComparison.OrdinalIgnoreCase) ||
                                   content.Contains("# Tech Stack", StringComparison.OrdinalIgnoreCase) ||
                                   content.Contains("Technology Stack", StringComparison.OrdinalIgnoreCase);

        hasTechStackSection.Should().BeTrue(
            "CONTRIBUTING.md must contain Tech Stack section (AC-11 FR-34)");

        // Verify key technologies are mentioned
        foreach (var tech in expectedTechnologies)
        {
            content.Should().Contain(tech,
                $"Tech stack section must mention {tech} (AC-11 FR-34)");
        }
    }

    [Fact(DisplayName = "AC-11: CONTRIBUTING.md contains project structure walkthrough")]
    public void ContributingMd_ContainsProjectStructure()
    {
        // Arrange
        File.Exists(_contributingPath).Should().BeTrue("CONTRIBUTING.md must exist");
        var content = File.ReadAllText(_contributingPath);

        // Assert — project structure is documented
        // RED: Project structure section does not exist yet
        var hasStructureSection = content.Contains("## Project Structure", StringComparison.OrdinalIgnoreCase) ||
                                   content.Contains("# Project Structure", StringComparison.OrdinalIgnoreCase) ||
                                   content.Contains("Directory Structure", StringComparison.OrdinalIgnoreCase);

        hasStructureSection.Should().BeTrue(
            "CONTRIBUTING.md must contain Project Structure walkthrough section (AC-11 FR-34)");

        // Verify key directories are mentioned
        var keyDirectories = new[] { "src/", "client/", "Fishtank.Api" };
        foreach (var dir in keyDirectories)
        {
            content.Should().Contain(dir,
                $"Project structure must mention {dir} directory (AC-11 FR-34)");
        }
    }

    [Fact(DisplayName = "AC-11: CONTRIBUTING.md contains local dev setup instructions")]
    public void ContributingMd_ContainsLocalDevSetup()
    {
        // Arrange
        File.Exists(_contributingPath).Should().BeTrue("CONTRIBUTING.md must exist");
        var content = File.ReadAllText(_contributingPath);

        // Assert — local dev setup instructions are present
        // RED: Dev setup section does not exist yet
        var hasDevSetupSection = content.Contains("## Development Setup", StringComparison.OrdinalIgnoreCase) ||
                                  content.Contains("# Getting Started", StringComparison.OrdinalIgnoreCase) ||
                                  content.Contains("Local Development", StringComparison.OrdinalIgnoreCase);

        hasDevSetupSection.Should().BeTrue(
            "CONTRIBUTING.md must contain local dev setup instructions (manual and devcontainer option) (AC-11 FR-34)");

        // Verify devcontainer is mentioned as an option
        var mentionsDevcontainer = content.Contains("devcontainer", StringComparison.OrdinalIgnoreCase) ||
                                    content.Contains("Dev Container", StringComparison.OrdinalIgnoreCase) ||
                                    content.Contains(".devcontainer", StringComparison.OrdinalIgnoreCase);

        mentionsDevcontainer.Should().BeTrue(
            "CONTRIBUTING.md must mention devcontainer as an alternative setup option (AC-11 FR-34)");
    }

    [Fact(DisplayName = "AC-11: CONTRIBUTING.md contains PR workflow documentation")]
    public void ContributingMd_ContainsPRWorkflow()
    {
        // Arrange
        File.Exists(_contributingPath).Should().BeTrue("CONTRIBUTING.md must exist");
        var content = File.ReadAllText(_contributingPath);

        // Assert — PR workflow is documented (feature branches → release branch → main)
        // RED: PR workflow section does not exist yet
        var hasPRWorkflowSection = content.Contains("## Pull Request", StringComparison.OrdinalIgnoreCase) ||
                                    content.Contains("# Pull Request", StringComparison.OrdinalIgnoreCase) ||
                                    content.Contains("PR Workflow", StringComparison.OrdinalIgnoreCase) ||
                                    content.Contains("Contributing Code", StringComparison.OrdinalIgnoreCase);

        hasPRWorkflowSection.Should().BeTrue(
            "CONTRIBUTING.md must contain PR workflow documentation (AC-11 FR-34)");

        // Verify workflow mentions branching strategy
        var mentionsBranching = content.Contains("feature branch", StringComparison.OrdinalIgnoreCase) ||
                                 content.Contains("release branch", StringComparison.OrdinalIgnoreCase) ||
                                 content.Contains("main branch", StringComparison.OrdinalIgnoreCase);

        mentionsBranching.Should().BeTrue(
            "PR workflow must document feature branches → release branch → main strategy (AC-11 FR-34)");
    }

    [Fact(DisplayName = "AC-11: CONTRIBUTING.md links to SECURITY.md")]
    public void ContributingMd_LinksToSecurityMd()
    {
        // Arrange
        File.Exists(_contributingPath).Should().BeTrue("CONTRIBUTING.md must exist");
        var content = File.ReadAllText(_contributingPath);

        // Assert — link to SECURITY.md is present
        // RED: Link to SECURITY.md does not exist yet
        content.Should().Contain("SECURITY.md",
            "CONTRIBUTING.md must link to SECURITY.md for vulnerability reporting (AC-11 FR-34)");
    }

    // -------------------------------------------------------------------------
    // AC-12 — SECURITY.md content
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AC-12: SECURITY.md exists in repository root")]
    public void SecurityMd_ExistsInRepositoryRoot()
    {
        // RED: SECURITY.md may exist but we verify it first
        File.Exists(_securityPath).Should().BeTrue(
            $"SECURITY.md must exist at repository root: {_securityPath} (AC-12 FR-34)");
    }

    [Fact(DisplayName = "AC-12: SECURITY.md contains vulnerability reporting process")]
    public void SecurityMd_ContainsVulnerabilityReporting()
    {
        // Arrange
        File.Exists(_securityPath).Should().BeTrue("SECURITY.md must exist");
        var content = File.ReadAllText(_securityPath);

        // Assert — vulnerability reporting process is documented
        // RED: Reporting process section does not exist yet
        var hasReportingSection = content.Contains("## Reporting", StringComparison.OrdinalIgnoreCase) ||
                                   content.Contains("# Reporting", StringComparison.OrdinalIgnoreCase) ||
                                   content.Contains("Report a Vulnerability", StringComparison.OrdinalIgnoreCase);

        hasReportingSection.Should().BeTrue(
            "SECURITY.md must contain vulnerability reporting process (email or GitHub Security Advisories) (AC-12 FR-34)");

        // Verify either email or GitHub Security Advisories are mentioned
        var mentionsReportingChannel = content.Contains("email", StringComparison.OrdinalIgnoreCase) ||
                                        content.Contains("Security Advisories", StringComparison.OrdinalIgnoreCase) ||
                                        content.Contains("security@", StringComparison.OrdinalIgnoreCase);

        mentionsReportingChannel.Should().BeTrue(
            "SECURITY.md must document reporting channel (email or GitHub Security Advisories) (AC-12 FR-34)");
    }

    [Fact(DisplayName = "AC-12: SECURITY.md contains responsible disclosure policy")]
    public void SecurityMd_ContainsResponsibleDisclosurePolicy()
    {
        // Arrange
        File.Exists(_securityPath).Should().BeTrue("SECURITY.md must exist");
        var content = File.ReadAllText(_securityPath);

        // Assert — responsible disclosure policy with timeline expectations
        // RED: Disclosure policy section does not exist yet
        var hasDisclosureSection = content.Contains("## Disclosure", StringComparison.OrdinalIgnoreCase) ||
                                    content.Contains("# Disclosure", StringComparison.OrdinalIgnoreCase) ||
                                    content.Contains("Responsible Disclosure", StringComparison.OrdinalIgnoreCase);

        hasDisclosureSection.Should().BeTrue(
            "SECURITY.md must contain responsible disclosure policy (AC-12 FR-34)");

        // Verify timeline expectations are mentioned
        var mentionsTimeline = content.Contains("timeline", StringComparison.OrdinalIgnoreCase) ||
                                content.Contains("days", StringComparison.OrdinalIgnoreCase) ||
                                content.Contains("response time", StringComparison.OrdinalIgnoreCase);

        mentionsTimeline.Should().BeTrue(
            "Responsible disclosure policy must include timeline expectations (AC-12 FR-34)");
    }

    [Fact(DisplayName = "AC-12: SECURITY.md contains supported versions table")]
    public void SecurityMd_ContainsSupportedVersionsTable()
    {
        // Arrange
        File.Exists(_securityPath).Should().BeTrue("SECURITY.md must exist");
        var content = File.ReadAllText(_securityPath);

        // Assert — supported versions table is present
        // RED: Supported versions table does not exist yet
        var hasVersionsSection = content.Contains("## Supported Versions", StringComparison.OrdinalIgnoreCase) ||
                                  content.Contains("# Supported Versions", StringComparison.OrdinalIgnoreCase);

        hasVersionsSection.Should().BeTrue(
            "SECURITY.md must contain Supported Versions table (AC-12 FR-34)");

        // Verify table structure (markdown table with Version and Supported columns)
        var hasTableStructure = content.Contains("| Version", StringComparison.OrdinalIgnoreCase) &&
                                 content.Contains("| Supported", StringComparison.OrdinalIgnoreCase);

        hasTableStructure.Should().BeTrue(
            "Supported Versions section must contain a markdown table with Version and Supported columns (AC-12 FR-34)");
    }

    // -------------------------------------------------------------------------
    // AC-14 — README.md updates
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AC-14: README.md exists in repository root")]
    public void ReadmeMd_ExistsInRepositoryRoot()
    {
        // Arrange
        File.Exists(_readmePath).Should().BeTrue(
            $"README.md must exist at repository root: {_readmePath} (AC-14 FR-34)");
    }

    [Fact(DisplayName = "AC-14: README.md contains animated demo (GIF or video)")]
    public void ReadmeMd_ContainsAnimatedDemo()
    {
        // Arrange
        File.Exists(_readmePath).Should().BeTrue("README.md must exist");
        var content = File.ReadAllText(_readmePath);

        // Assert — animated demo (GIF or video) is present at the top
        // RED: Animated demo reference does not exist yet
        var hasAnimatedDemo = content.Contains(".gif", StringComparison.OrdinalIgnoreCase) ||
                               content.Contains(".mp4", StringComparison.OrdinalIgnoreCase) ||
                               content.Contains(".webm", StringComparison.OrdinalIgnoreCase) ||
                               content.Contains("![demo", StringComparison.OrdinalIgnoreCase);

        hasAnimatedDemo.Should().BeTrue(
            "README.md must contain animated GIF or screen recording at the top (AC-14 FR-34)");
    }

    [Fact(DisplayName = "AC-14: README.md contains quick-start command")]
    public void ReadmeMd_ContainsQuickStartCommand()
    {
        // Arrange
        File.Exists(_readmePath).Should().BeTrue("README.md must exist");
        var content = File.ReadAllText(_readmePath);

        // Assert — quick-start Docker command is present
        // RED: Quick-start command does not exist yet
        var expectedCommand = "docker run -p 9090:5000 -v fishtank-data:/data nicoiodice/fishtank";

        content.Should().Contain(expectedCommand,
            "README.md must contain quick-start command: docker run -p 9090:5000 -v fishtank-data:/data nicoiodice/fishtank (AC-14 FR-34)");
    }

    [Fact(DisplayName = "AC-14: README.md contains environment variable reference table")]
    public void ReadmeMd_ContainsEnvVarTable()
    {
        // Arrange
        File.Exists(_readmePath).Should().BeTrue("README.md must exist");
        var content = File.ReadAllText(_readmePath);

        // Assert — environment variable table is present
        // RED: Env var table does not exist yet
        var hasEnvVarSection = content.Contains("## Environment Variables", StringComparison.OrdinalIgnoreCase) ||
                                content.Contains("# Environment Variables", StringComparison.OrdinalIgnoreCase) ||
                                content.Contains("### Environment Variables", StringComparison.OrdinalIgnoreCase);

        hasEnvVarSection.Should().BeTrue(
            "README.md must contain Environment Variable reference table (AC-14 FR-34)");

        // Verify table includes key FR-36 variables
        var requiredEnvVars = new[]
        {
            "FISHTANK_JWT_SECRET",
            "FISHTANK_MOCKS_ROOT"
        };

        foreach (var envVar in requiredEnvVars)
        {
            content.Should().Contain(envVar,
                $"Environment variable table must include {envVar} (AC-14 FR-34 FR-36)");
        }
    }

    [Fact(DisplayName = "AC-14: README.md contains links to CONTRIBUTING.md and SECURITY.md")]
    public void ReadmeMd_ContainsLinksToDocumentation()
    {
        // Arrange
        File.Exists(_readmePath).Should().BeTrue("README.md must exist");
        var content = File.ReadAllText(_readmePath);

        // Assert — links to documentation files are present
        // RED: Links do not exist yet
        content.Should().Contain("CONTRIBUTING.md",
            "README.md must link to CONTRIBUTING.md (AC-14 FR-34)");

        content.Should().Contain("SECURITY.md",
            "README.md must link to SECURITY.md (AC-14 FR-34)");

        content.Should().Contain("/openapi/v1.json",
            "README.md must link to /openapi/v1.json endpoint (AC-14 FR-34)");
    }

    [Fact(DisplayName = "AC-14: README.md contains Linux inotify note with sysctl command")]
    public void ReadmeMd_ContainsLinuxInotifyNote()
    {
        // Arrange
        File.Exists(_readmePath).Should().BeTrue("README.md must exist");
        var content = File.ReadAllText(_readmePath);

        // Assert — Linux inotify note is present
        // RED: Inotify note does not exist yet
        content.Should().Contain("fs.inotify.max_user_watches",
            "README.md must contain Linux fs.inotify.max_user_watches note (AC-14 FR-34)");

        content.Should().Contain("sysctl",
            "Inotify note must include sysctl command to increase watch limit (AC-14 FR-34)");
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
