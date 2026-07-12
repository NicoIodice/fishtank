using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using FluentAssertions;
using Xunit;

namespace Fishtank.Api.IntegrationTests.Documentation;

/// <summary>
/// RED-PHASE ATDD acceptance test scaffolds for Story 6.4 (Good First Issues Template — AC-13).
///
/// These tests FAIL before implementation. They PASS once Story 6.4 is done.
///
/// ACs covered:
///   AC-13: Good First Issues template file contains at least 5 issue templates with title, scope, labels
///
/// NOTE: This validates the TEMPLATE file that documents what issues should be created in GitHub.
/// It does NOT create or verify actual GitHub Issues (that's a manual step at v1 launch).
/// The template serves as a checklist and provides structured content for creating the real issues.
///
/// RED before implementation:
///   - good-first-issues-6-4.md does NOT exist
///   - Template has fewer than 5 issue templates
///   - Issue templates are missing required fields (title, scope, labels)
///
/// Test Design Reference: _bmad-output/test-artifacts/test-design/test-design-epic-6.md (Story 6-4 section)
/// </summary>
public class Story6_4_GoodFirstIssuesTests
{
    private readonly string _projectRoot;
    private readonly string _goodFirstIssuesPath;

    public Story6_4_GoodFirstIssuesTests()
    {
        _projectRoot = FindProjectRoot();
        _goodFirstIssuesPath = Path.Combine(_projectRoot, "_bmad-output", "implementation-artifacts", "good-first-issues-6-4.md");
    }

    // -------------------------------------------------------------------------
    // AC-13 — Good First Issues template validation
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AC-13: good-first-issues-6-4.md exists")]
    public void GoodFirstIssues_TemplateFileExists()
    {
        // RED: Template file does not exist yet
        File.Exists(_goodFirstIssuesPath).Should().BeTrue(
            $"good-first-issues-6-4.md must exist at _bmad-output/implementation-artifacts: {_goodFirstIssuesPath} (AC-13 FR-34)");
    }

    [Fact(DisplayName = "AC-13: Template contains at least 5 issue templates")]
    public void GoodFirstIssues_ContainsAtLeastFiveIssues()
    {
        // Arrange
        File.Exists(_goodFirstIssuesPath).Should().BeTrue("good-first-issues-6-4.md must exist");
        var content = File.ReadAllText(_goodFirstIssuesPath);

        // Count issue templates by looking for markdown section headings (## Issue or ### Issue patterns)
        // Each issue template should have a heading that identifies it
        var issueHeadingPattern = new Regex(@"^##\s+Issue\s+\d+|^###\s+Issue\s+\d+", RegexOptions.Multiline | RegexOptions.IgnoreCase);
        var issueMatches = issueHeadingPattern.Matches(content);

        // Also check for alternative patterns like "## 1. Issue Title" or "## GFI-1"
        var alternativePattern = new Regex(@"^##\s+\d+\.|^##\s+GFI-\d+", RegexOptions.Multiline);
        var alternativeMatches = alternativePattern.Matches(content);

        var totalIssueCount = Math.Max(issueMatches.Count, alternativeMatches.Count);

        // If neither pattern found issues, count by looking for "Title:" fields
        if (totalIssueCount == 0)
        {
            var titlePattern = new Regex(@"^\*?\*?Title\*?\*?:", RegexOptions.Multiline | RegexOptions.IgnoreCase);
            var titleMatches = titlePattern.Matches(content);
            totalIssueCount = titleMatches.Count;
        }

        // Assert — at least 5 issue templates present
        // RED: File has fewer than 5 issue templates
        totalIssueCount.Should().BeGreaterThanOrEqualTo(5,
            "good-first-issues-6-4.md must contain at least 5 issue templates (AC-13 FR-34)");
    }

    [Fact(DisplayName = "AC-13: Each issue template has a title")]
    public void GoodFirstIssues_EachIssueHasTitle()
    {
        // Arrange
        File.Exists(_goodFirstIssuesPath).Should().BeTrue("good-first-issues-6-4.md must exist");
        var content = File.ReadAllText(_goodFirstIssuesPath);

        // Assert — Title field is present multiple times (once per issue)
        // RED: Title field is missing for some issues
        var titlePattern = new Regex(@"(^\*?\*?Title\*?\*?:|^##\s+.+|^###\s+.+)", RegexOptions.Multiline | RegexOptions.IgnoreCase);
        var titleMatches = titlePattern.Matches(content);

        titleMatches.Count.Should().BeGreaterThanOrEqualTo(5,
            "Each issue template must have a Title field or heading (AC-13 FR-34)");
    }

    [Fact(DisplayName = "AC-13: Each issue template has a scope/description")]
    public void GoodFirstIssues_EachIssueHasScope()
    {
        // Arrange
        File.Exists(_goodFirstIssuesPath).Should().BeTrue("good-first-issues-6-4.md must exist");
        var content = File.ReadAllText(_goodFirstIssuesPath);

        // Assert — Scope or Description field is present
        // RED: Scope/description field is missing for some issues
        var scopePattern = new Regex(@"(^\*?\*?Scope\*?\*?:|^\*?\*?Description\*?\*?:|^\*?\*?Summary\*?\*?:)", 
                                     RegexOptions.Multiline | RegexOptions.IgnoreCase);
        var scopeMatches = scopePattern.Matches(content);

        scopeMatches.Count.Should().BeGreaterThanOrEqualTo(5,
            "Each issue template must have a Scope, Description, or Summary field defining the work (AC-13 FR-34)");
    }

    [Fact(DisplayName = "AC-13: Each issue template has labels")]
    public void GoodFirstIssues_EachIssueHasLabels()
    {
        // Arrange
        File.Exists(_goodFirstIssuesPath).Should().BeTrue("good-first-issues-6-4.md must exist");
        var content = File.ReadAllText(_goodFirstIssuesPath);

        // Assert — Labels field is present
        // RED: Labels field is missing for some issues
        var labelsPattern = new Regex(@"^\*?\*?Labels?\*?\*?:", RegexOptions.Multiline | RegexOptions.IgnoreCase);
        var labelsMatches = labelsPattern.Matches(content);

        labelsMatches.Count.Should().BeGreaterThanOrEqualTo(5,
            "Each issue template must have a Labels field (AC-13 FR-34)");

        // Verify 'good first issue' label is mentioned
        var hasGoodFirstIssueLabel = content.Contains("good first issue", StringComparison.OrdinalIgnoreCase) ||
                                      content.Contains("good-first-issue", StringComparison.OrdinalIgnoreCase);

        hasGoodFirstIssueLabel.Should().BeTrue(
            "At least one issue template must include 'good first issue' label (AC-13 FR-34)");
    }

    [Fact(DisplayName = "AC-13: Issue templates include area labels (frontend/backend/docs)")]
    public void GoodFirstIssues_IncludesAreaLabels()
    {
        // Arrange
        File.Exists(_goodFirstIssuesPath).Should().BeTrue("good-first-issues-6-4.md must exist");
        var content = File.ReadAllText(_goodFirstIssuesPath);

        // Assert — Area labels are present (at least one of frontend, backend, docs)
        // RED: No area labels are mentioned
        var hasFrontendLabel = content.Contains("frontend", StringComparison.OrdinalIgnoreCase);
        var hasBackendLabel = content.Contains("backend", StringComparison.OrdinalIgnoreCase);
        var hasDocsLabel = content.Contains("docs", StringComparison.OrdinalIgnoreCase) ||
                            content.Contains("documentation", StringComparison.OrdinalIgnoreCase);

        var hasAreaLabels = hasFrontendLabel || hasBackendLabel || hasDocsLabel;

        hasAreaLabels.Should().BeTrue(
            "Issue templates must include relevant area labels: frontend, backend, or docs (AC-13 FR-34)");
    }

    [Fact(DisplayName = "AC-13: Issue templates define acceptance criteria or scope boundaries")]
    public void GoodFirstIssues_DefinesAcceptanceCriteria()
    {
        // Arrange
        File.Exists(_goodFirstIssuesPath).Should().BeTrue("good-first-issues-6-4.md must exist");
        var content = File.ReadAllText(_goodFirstIssuesPath);

        // Assert — Acceptance criteria are defined
        // RED: No acceptance criteria sections found
        var acPattern = new Regex(@"(^\*?\*?Acceptance Criteria\*?\*?:|^\*?\*?AC\*?\*?:|^\*?\*?Definition of Done\*?\*?:)", 
                                   RegexOptions.Multiline | RegexOptions.IgnoreCase);
        var acMatches = acPattern.Matches(content);

        acMatches.Count.Should().BeGreaterThanOrEqualTo(3,
            "Most issue templates should define Acceptance Criteria or Definition of Done to clarify scope (AC-13 FR-34)");
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
