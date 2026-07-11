using FluentAssertions;
using Serilog.Events;
using Serilog.Formatting.Compact;
using Serilog.Parsing;

namespace Fishtank.Api.UnitTests;

/// <summary>
/// Unit tests for <see cref="AppendOnlyRollingFileSink"/>.
///
/// <c>AppendOnlyRollingFileSink</c> is an <c>internal sealed</c> class defined in
/// <c>Program.cs</c> and exposed to this project via <c>InternalsVisibleTo</c>.
///
/// Coverage targets:
///   - Emit: formatted entry written to today's log file
///   - Emit: multiple events appended to same daily file
///   - Edge case: retainedFileCount = 0 (boundary — keep only today)
///   - Edge case: retainedFileCount &lt; 0 (negative — no crash)
///   - Cleanup: files older than retention window are deleted
///   - Cleanup: files within retention window are preserved
/// </summary>
public class AppendOnlyRollingFileSinkTests : IDisposable
{
    private readonly string _tempDir;
    private static readonly MessageTemplateParser Parser = new();

    public AppendOnlyRollingFileSinkTests()
    {
        _tempDir = Path.Combine(Path.GetTempPath(), $"sink-test-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_tempDir);
    }

    public void Dispose()
    {
        if (Directory.Exists(_tempDir))
            Directory.Delete(_tempDir, recursive: true);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private static LogEvent MakeLogEvent(DateTimeOffset? timestamp = null) =>
        new(
            timestamp ?? DateTimeOffset.UtcNow,
            LogEventLevel.Information,
            exception: null,
            Parser.Parse("Unit test entry {Id}"),
            new[] { new LogEventProperty("Id", new ScalarValue(Guid.NewGuid())) });

    private AppendOnlyRollingFileSink MakeSut(int retainedFileCount = 7) =>
        new(_tempDir, new CompactJsonFormatter(), retainedFileCount);

    private string ExpectedFilePath(DateTimeOffset? at = null)
    {
        var date = DateOnly.FromDateTime((at ?? DateTimeOffset.UtcNow).UtcDateTime);
        return Path.Combine(_tempDir, $"fishtank-{date:yyyyMMdd}.log");
    }

    // ─── Basic emit ──────────────────────────────────────────────────────────

    [Fact(DisplayName = "Emit writes a CompactJson entry to today's fishtank-{yyyyMMdd}.log file")]
    public void Emit_WritesFormattedEntry_ToTodaysLogFile()
    {
        var sut = MakeSut();
        var evt = MakeLogEvent();
        var expectedFile = ExpectedFilePath(evt.Timestamp);

        sut.Emit(evt);

        File.Exists(expectedFile).Should().BeTrue(
            $"Emit must create fishtank-{DateOnly.FromDateTime(evt.Timestamp.UtcDateTime):yyyyMMdd}.log " +
            "in the configured log directory.");

        var content = File.ReadAllText(expectedFile);
        content.Should().Contain("Unit test entry",
            "The emitted message template must appear in the log file content.");
    }

    [Fact(DisplayName = "Emit appends multiple events — each produces one line in the same daily file")]
    public void Emit_MultipleEvents_SameDay_AppendToSameFile()
    {
        var sut = MakeSut();
        var now = DateTimeOffset.UtcNow;
        var expectedFile = ExpectedFilePath(now);

        sut.Emit(MakeLogEvent(now));
        sut.Emit(MakeLogEvent(now));
        sut.Emit(MakeLogEvent(now));

        var lines = File.ReadAllLines(expectedFile)
            .Where(l => !string.IsNullOrWhiteSpace(l))
            .ToArray();

        lines.Should().HaveCount(3,
            "Each Emit call must append exactly one CompactJson line to the daily log file.");
    }

    // ─── Edge cases: boundary retainedFileCount values ───────────────────────

    [Fact(DisplayName = "Emit with retainedFileCount=0 does not throw (zero retention boundary)")]
    public void Emit_WithRetainedFileCount0_DoesNotThrow()
    {
        // FISHTANK_LOG_RETENTION_DAYS=0 → int.TryParse succeeds → retainedFileCount=0
        // cutoffDate = today + 0 = today → only files with fileDate < today are deleted
        var sut = MakeSut(retainedFileCount: 0);

        var act = () => sut.Emit(MakeLogEvent());

        act.Should().NotThrow(
            "retainedFileCount=0 must not throw — the sink must handle this boundary value gracefully.");
    }

    [Fact(DisplayName = "Emit with retainedFileCount=-1 does not throw (negative retention boundary)")]
    public void Emit_WithRetainedFileCountNegative_DoesNotThrow()
    {
        // FISHTANK_LOG_RETENTION_DAYS=-1 → int.TryParse succeeds → retainedFileCount=-1
        // cutoffDate = today - (-1) = tomorrow → cleanup catch-all prevents any exception
        var sut = MakeSut(retainedFileCount: -1);

        var act = () => sut.Emit(MakeLogEvent());

        act.Should().NotThrow(
            "retainedFileCount=-1 must not throw — CleanupOldFiles has a catch-all that prevents crashes.");
    }

    // ─── Retention cleanup logic ──────────────────────────────────────────────

    [Fact(DisplayName = "Emit deletes log files older than the configured retention window")]
    public void Emit_DeletesFilesOlderThanRetentionWindow()
    {
        // Arrange: create a stale file (30 days old) that is outside the 7-day window
        var staleDate = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(-30);
        var staleFile = Path.Combine(_tempDir, $"fishtank-{staleDate:yyyyMMdd}.log");
        File.WriteAllText(staleFile, "stale log content");

        var sut = MakeSut(retainedFileCount: 7);

        // Act: first Emit triggers cleanup (lastCleanupDate starts at DateOnly.MinValue)
        sut.Emit(MakeLogEvent());

        // Assert: stale file removed
        File.Exists(staleFile).Should().BeFalse(
            $"A log file from {staleDate:yyyyMMdd} (30 days ago) must be deleted " +
            "when retainedFileCount=7. cutoff = today − 7 days; the stale file is before the cutoff.");
    }

    [Fact(DisplayName = "Emit preserves log files within the retention window")]
    public void Emit_PreservesFilesWithinRetentionWindow()
    {
        // Arrange: create a recent file (yesterday — within 7-day window)
        var recentDate = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(-1);
        var recentFile = Path.Combine(_tempDir, $"fishtank-{recentDate:yyyyMMdd}.log");
        File.WriteAllText(recentFile, "recent log content");

        var sut = MakeSut(retainedFileCount: 7);

        // Act
        sut.Emit(MakeLogEvent());

        // Assert: recent file untouched
        File.Exists(recentFile).Should().BeTrue(
            $"A log file from {recentDate:yyyyMMdd} (yesterday) must NOT be deleted " +
            "when retainedFileCount=7. cutoff = today − 7 days; yesterday is after the cutoff.");
    }
}
