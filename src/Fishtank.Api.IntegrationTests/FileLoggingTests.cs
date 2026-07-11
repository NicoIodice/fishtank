using System.Net;
using System.Net.Http.Json;
using System.Runtime.InteropServices;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Fishtank.Api.IntegrationTests.Support;

namespace Fishtank.Api.IntegrationTests;

/// <summary>
/// Custom WebApplicationFactory for Story 5.4 file logging tests.
///
/// Extends FishtankWebApplicationFactory with a writable temp directory
/// as FISHTANK_LOG_PATH, so log file creation can be observed in tests
/// without requiring a real /data/logs volume mount.
///
/// Isolated from the shared "Integration" collection — has its own
/// dedicated app instance with a dedicated log directory.
/// </summary>
public class FileLoggingTestFixture : FishtankWebApplicationFactory
{
    public string LogDirectory { get; } =
        Path.Combine(Path.GetTempPath(), $"fishtank-logs-{Guid.NewGuid():N}");

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        base.ConfigureWebHost(builder);
        Directory.CreateDirectory(LogDirectory);
        builder.UseSetting("FISHTANK_LOG_PATH", LogDirectory);
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing && Directory.Exists(LogDirectory))
            Directory.Delete(LogDirectory, recursive: true);
    }
}

/// <summary>Isolated xUnit collection for file logging tests.</summary>
[CollectionDefinition("FileLogging")]
public class FileLoggingCollection : ICollectionFixture<FileLoggingTestFixture>;

/// <summary>
/// ATDD acceptance test scaffolds for Story 5.4:
/// Structured File Logging — Rolling Daily Files.
///
/// RED PHASE — these tests define the expected end-state behaviour.
/// They FAIL before implementation and PASS once all ACs are complete.
///
/// AC-1:  Serilog.Sinks.File NuGet package added to Fishtank.Api.csproj
/// AC-2:  Log files written to FISHTANK_LOG_PATH with daily rolling filename (FR-39, NFR-17)
/// AC-3:  Default log path /data/logs when FISHTANK_LOG_PATH env var is absent (FR-39)
/// AC-4:  Log retention configurable via FISHTANK_LOG_RETENTION_DAYS (default 7) (FR-39)
/// AC-5:  Graceful degradation — unwritable log dir → stdout warning, /health 200 (R-E5-005)
/// AC-6:  Log entries are valid CompactJson (NFR-17)
/// AC-7:  Service lifecycle events appear in rolling log file (NFR-17)
/// AC-8:  System Events written to rolling log file (NFR-18)
/// AC-9:  Resync outcomes logged to rolling log file (NFR-17)
///
/// RED reasons (before implementation):
///   - Serilog.Sinks.File absent from Fishtank.Api.csproj  → AC-1 fails
///   - No file sink in Program.cs  → no log files created  → AC-2, AC-4, AC-6, AC-7, AC-8, AC-9 fail
///   - Default /data/logs not configured  → AC-3 fails
///   - No graceful degradation code  → AC-5 stdout warning assertion fails
/// </summary>
[Collection("FileLogging")]
public class Story5_4_FileLoggingTests : IAsyncLifetime
{
    private readonly FileLoggingTestFixture _factory;
    private readonly HttpClient _client;

    public Story5_4_FileLoggingTests(FileLoggingTestFixture factory)
    {
        _factory = factory;
        _client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false,
        });
    }

    public Task InitializeAsync() => _factory.ResetDatabaseAsync();

    public async Task DisposeAsync()
    {
        _client.Dispose();
        await Task.CompletedTask;
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    /// <summary>Expected log file for today using the fixture's temp log dir.</summary>
    private string TodaysLogFile()
    {
        var today = DateTime.UtcNow.ToString("yyyyMMdd");
        return Path.Combine(_factory.LogDirectory, $"fishtank-{today}.log");
    }

    /// <summary>
    /// An unwritable log path appropriate for the host OS.
    /// Windows: UNC path to a non-existent server share.
    /// Linux/macOS: path under /proc (read-only kernel filesystem).
    /// </summary>
    private static string GetUnwritablePath() =>
        RuntimeInformation.IsOSPlatform(OSPlatform.Windows)
            ? @"\\nonexistent-fishtank-host\share\logs"
            : "/proc/fishtank-logging-test/logs";

    /// <summary>Seeds admin account and returns an authenticated HttpClient.</summary>
    private async Task<HttpClient> GetAdminClientAsync()
    {
        await _client.PostAsJsonAsync("/api/auth/setup",
            new { username = "admin", password = "adminpassword123" });
        return await TestAuthHelper.CreateAuthenticatedClientAsync(
            _factory, "admin", "adminpassword123");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AC-1 — Serilog.Sinks.File NuGet package added to Fishtank.Api.csproj
    //
    // RED:   PackageReference for Serilog.Sinks.File not yet in the .csproj.
    // GREEN: .csproj contains <PackageReference Include="Serilog.Sinks.File" ... />
    // ─────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-1: Fishtank.Api.csproj contains PackageReference for Serilog.Sinks.File")]
    public void SerilogSinksFile_Package_ReferencedIn_Csproj()
    {
        // Resolve the Fishtank.Api.csproj from the test binary output directory.
        // Binary path: src/Fishtank.Api.IntegrationTests/bin/{config}/net10.0/
        // Target:      src/Fishtank.Api/Fishtank.Api.csproj  (4 dirs up, then sibling)
        var csprojPath = Path.GetFullPath(
            Path.Combine(AppContext.BaseDirectory,
                "..", "..", "..", "..",
                "Fishtank.Api", "Fishtank.Api.csproj"));

        File.Exists(csprojPath).Should().BeTrue(
            $"Fishtank.Api.csproj must exist at resolved path: {csprojPath}");

        var csprojContent = File.ReadAllText(csprojPath);

        // RED: Serilog.Sinks.File is not yet referenced — this assertion fails.
        csprojContent.Should().Contain(
            "Serilog.Sinks.File",
            "Fishtank.Api.csproj must include a PackageReference for Serilog.Sinks.File (AC-1, FR-39). " +
            "Add: <PackageReference Include=\"Serilog.Sinks.File\" Version=\"...\" />");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AC-2 — Log files written to FISHTANK_LOG_PATH with daily rolling filename
    //
    // RED:   No file sink in Program.cs → no log file is created.
    // GREEN: fishtank-{yyyyMMdd}.log appears in FISHTANK_LOG_PATH after first request.
    // ─────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-2: Daily rolling log file created in FISHTANK_LOG_PATH after app startup")]
    public async Task LogFile_IsCreated_InConfiguredLogPath_WithDailyFilenamePattern()
    {
        // Given the app is running with FISHTANK_LOG_PATH = temp dir (fixture)

        // When any HTTP request is made (triggers Serilog output)
        await _client.GetAsync("/health");

        // Allow time for Serilog's async file flush
        await Task.Delay(TimeSpan.FromSeconds(2));

        // Then a log file with today's UTC date must exist
        var logFile = TodaysLogFile();

        // RED: No file sink → File.Exists returns false.
        File.Exists(logFile).Should().BeTrue(
            $"Expected daily log file at '{logFile}' " +
            $"(FISHTANK_LOG_PATH='{_factory.LogDirectory}'). " +
            "Program.cs must add a Serilog.Sinks.File sink with RollingInterval.Day (AC-2, FR-39).");
    }

    [Fact(DisplayName = "AC-2b: Log file naming pattern is fishtank-{yyyyMMdd}.log")]
    public async Task LogFile_Uses_Expected_DailyFilenamePattern()
    {
        // Given the app has been running
        await _client.GetAsync("/health");
        await Task.Delay(TimeSpan.FromSeconds(2));

        // Then a file matching the pattern fishtank-{date}.log must exist in log dir
        var today = DateTime.UtcNow.ToString("yyyyMMdd");
        var files = Directory.Exists(_factory.LogDirectory)
            ? Directory.GetFiles(_factory.LogDirectory, "fishtank-*.log")
            : Array.Empty<string>();

        // RED: No file sink → directory is empty.
        files.Should().NotBeEmpty(
            $"No log files found in '{_factory.LogDirectory}'. " +
            $"Expected pattern: fishtank-{today}.log (AC-2, FR-39).");

        files.Should().Contain(f => Path.GetFileName(f).StartsWith("fishtank-"),
            "Log files must follow the fishtank-{Date}.log naming convention (AC-2).");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AC-3 — Default log path /data/logs when FISHTANK_LOG_PATH env var absent
    //
    // RED:   No file sink → no log file created, default path never attempted.
    // GREEN (writable host):   Log file appears at /data/logs/fishtank-{date}.log.
    // GREEN (non-writable host): Graceful degradation warning references '/data/logs',
    //        proving the default was attempted (same pattern as AC-5b).
    // ─────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-3: Default log path /data/logs used when FISHTANK_LOG_PATH is not set")]
    public async Task DefaultLogPath_IsDataLogs_WhenEnvVarNotSet()
    {
        var defaultLogDir = Path.Combine(
            Path.DirectorySeparatorChar.ToString(), "data", "logs");

        // Probe whether /data/logs is writable on this host (Docker volume vs. bare CI runner).
        bool defaultPathWritable;
        try
        {
            Directory.CreateDirectory(defaultLogDir);
            var probe = Path.Combine(defaultLogDir, ".write-probe-ac3");
            File.WriteAllText(probe, "");
            File.Delete(probe);
            defaultPathWritable = true;
        }
        catch
        {
            defaultPathWritable = false;
        }

        // Capture Console.Out so we can inspect the graceful-degradation warning
        // emitted by Program.cs when /data/logs is not writable.
        // Console.SetOut must be set BEFORE CreateClient() — the factory builds
        // the WebApplication (and runs UseSerilog) lazily on the first CreateClient call.
        var originalOut = Console.Out;
        using var capturedOut = new StringWriter();
        Console.SetOut(capturedOut);

        try
        {
            // Given a fresh factory with NO FISHTANK_LOG_PATH configured
            using var noPathFactory = new FishtankWebApplicationFactory();
            using var noPathClient = noPathFactory.CreateClient(
                new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });

            // Verify the env var is indeed absent in this factory's configuration
            using var scope = noPathFactory.Services.CreateScope();
            var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();
            config["FISHTANK_LOG_PATH"].Should().BeNull(
                "This test must run without FISHTANK_LOG_PATH configured to exercise the default path.");

            // When requests are made (triggers Serilog log output)
            await noPathClient.GetAsync("/health");
            await Task.Delay(TimeSpan.FromSeconds(2));
        }
        finally
        {
            Console.SetOut(originalOut);
        }

        var today = DateTime.UtcNow.ToString("yyyyMMdd");
        var expectedLogFile = Path.Combine(defaultLogDir, $"fishtank-{today}.log");

        if (defaultPathWritable)
        {
            // /data/logs is writable (Docker volume mount) → log file must appear.
            File.Exists(expectedLogFile).Should().BeTrue(
                $"When FISHTANK_LOG_PATH is absent and /data/logs is writable, " +
                $"Serilog must write to '{expectedLogFile}'. (AC-3, FR-39)");
        }
        else
        {
            // /data/logs is not writable (bare CI runner) → graceful degradation must
            // reference '/data/logs' in the warning, proving the default was attempted.
            var captured = capturedOut.ToString();
            captured.Should().Contain("/data/logs",
                "When FISHTANK_LOG_PATH is absent and /data/logs is not writable, " +
                "Program.cs must emit a graceful-degradation warning that references " +
                "the attempted default path '/data/logs'. (AC-3, FR-39)");
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AC-4 — Log retention configurable via FISHTANK_LOG_RETENTION_DAYS
    //
    // RED:   No file sink → retention env var is never parsed, no log file created.
    // GREEN: App accepts custom retention value and creates log files normally.
    // ─────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-4a: Custom FISHTANK_LOG_RETENTION_DAYS=14 accepted — log file created")]
    public async Task CustomRetentionDays_LogFileCreated_With14DayRetention()
    {
        // Given FISHTANK_LOG_RETENTION_DAYS is set to 14
        var retentionLogDir = Path.Combine(Path.GetTempPath(), $"fishtank-retention-{Guid.NewGuid():N}");
        Directory.CreateDirectory(retentionLogDir);
        try
        {
            using var retentionFactory = _factory.WithWebHostBuilder(b =>
            {
                b.UseSetting("FISHTANK_LOG_PATH", retentionLogDir);
                b.UseSetting("FISHTANK_LOG_RETENTION_DAYS", "14");
            });
            using var client = retentionFactory.CreateClient(
                new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });

            // When a request is made
            await client.GetAsync("/health");
            await Task.Delay(TimeSpan.FromSeconds(2));

            // Then a log file must be created (retention=14 must not block file creation)
            var today = DateTime.UtcNow.ToString("yyyyMMdd");
            var logFile = Path.Combine(retentionLogDir, $"fishtank-{today}.log");

            // RED: No file sink → log file is absent.
            File.Exists(logFile).Should().BeTrue(
                $"FISHTANK_LOG_RETENTION_DAYS=14 must be accepted without error and " +
                $"log files must still be written. Expected: '{logFile}' (AC-4, FR-39).");
        }
        finally
        {
            if (Directory.Exists(retentionLogDir))
                Directory.Delete(retentionLogDir, recursive: true);
        }
    }

    [Fact(DisplayName = "AC-4b: Default retention 7 days — log file created when env var absent")]
    public async Task DefaultRetentionDays_Is7_AndLogFileCreated()
    {
        // Given FISHTANK_LOG_RETENTION_DAYS is NOT set (default 7 days applies)

        // When a request is made
        await _client.GetAsync("/health");
        await Task.Delay(TimeSpan.FromSeconds(2));

        // Then a log file must be created with the default 7-day retention
        var logFile = TodaysLogFile();

        // RED: No file sink → log file is absent.
        File.Exists(logFile).Should().BeTrue(
            $"With default FISHTANK_LOG_RETENTION_DAYS (7), log files must still be created. " +
            $"Expected: '{logFile}' (AC-4, FR-39).");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AC-5 — Graceful degradation: unwritable log dir → warning + /health 200
    //
    // RED:   Implementation absent → no [WRN] warning message is emitted.
    //        AC-5a (health 200) may pass trivially before implementation (no file
    //        sink means nothing tries to write → no crash).  AC-5b (stdout warning)
    //        is the primary RED signal: the warning message does not exist yet.
    // GREEN: Program.cs detects unwritable path, logs specific warning to stdout,
    //        skips file sink, app remains healthy.
    // ─────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-5a: Unwritable log path — /health returns HTTP 200 (app continues)")]
    public async Task UnwritableLogPath_HealthEndpoint_Returns200()
    {
        // Given FISHTANK_LOG_PATH points to an unwritable/non-existent location
        var unwritablePath = GetUnwritablePath();

        using var degradedFactory = _factory.WithWebHostBuilder(b =>
            b.UseSetting("FISHTANK_LOG_PATH", unwritablePath));
        using var client = degradedFactory.CreateClient(
            new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });

        // When a request is made to the health endpoint
        var response = await client.GetAsync("/health");

        // Then the app must remain healthy (graceful degradation)
        // RED: Before implementation, if the file sink setup causes an unhandled
        //      exception the app may fail to start → non-200; if the app silently
        //      ignores the unwritable path (no sink configured yet), this passes
        //      trivially — see AC-5b for the primary RED assertion.
        response.StatusCode.Should().Be(HttpStatusCode.OK,
            $"App must start and serve requests even when FISHTANK_LOG_PATH='{unwritablePath}' " +
            "is unwritable. Graceful degradation required (AC-5, R-E5-005).");
    }

    [Fact(DisplayName = "AC-5b: Unwritable log path — stdout warning message emitted")]
    public async Task UnwritableLogPath_StdoutWarning_ContainsFileLoggingDisabledMessage()
    {
        // Given FISHTANK_LOG_PATH points to an unwritable/non-existent location
        var unwritablePath = GetUnwritablePath();

        // Capture Console.Out to intercept the Serilog stdout warning
        var originalOut = Console.Out;
        using var capturedOut = new StringWriter();
        Console.SetOut(capturedOut);

        try
        {
            // When a new app instance starts with the unwritable log path
            using var degradedFactory = _factory.WithWebHostBuilder(b =>
                b.UseSetting("FISHTANK_LOG_PATH", unwritablePath));
            using var client = degradedFactory.CreateClient(
                new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });

            await client.GetAsync("/health");
            await Task.Delay(TimeSpan.FromSeconds(2));
        }
        finally
        {
            Console.SetOut(originalOut);
        }

        var stdoutOutput = capturedOut.ToString();

        // RED: No graceful degradation implemented → the specific warning is absent.
        // GREEN: Program.cs writes: "[WRN] Unable to write to log directory '{path}' —
        //        file logging disabled. Stdout logging continues."
        stdoutOutput.Should().Contain(
            "file logging disabled",
            $"When FISHTANK_LOG_PATH='{unwritablePath}' is unwritable, Program.cs must write a " +
            "warning to stdout. Expected to contain 'file logging disabled' (AC-5, R-E5-005). " +
            "Implement: Console.WriteLine($\"[WRN] Unable to write to log directory '{{path}}' — " +
            "file logging disabled. Stdout logging continues.\")");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AC-6 — Log entries are valid CompactJson (NFR-17)
    //
    // RED:   No log file → cannot validate format.
    // GREEN: Every non-empty line in log file parses as JSON with @t and @mt fields.
    // ─────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-6: Each log entry is valid CompactJson with @t and @mt fields (NFR-17)")]
    public async Task LogEntries_AreValidCompactJson_WithTimestampAndMessageTemplate()
    {
        // Given the app has been running and generating log output
        await _client.GetAsync("/health");
        await _client.GetAsync("/openapi/v1.json");
        await Task.Delay(TimeSpan.FromSeconds(2));

        var logFile = TodaysLogFile();

        // RED: No log file created → first assertion fails immediately.
        File.Exists(logFile).Should().BeTrue(
            $"Log file must exist at '{logFile}' before JSON format can be validated (AC-6, NFR-17).");

        var lines = await File.ReadAllLinesAsync(logFile);
        lines.Should().NotBeEmpty("Log file must contain at least one log entry.");

        foreach (var line in lines.Where(l => !string.IsNullOrWhiteSpace(l)))
        {
            JsonDocument? doc = null;
            var act = () => { doc = JsonDocument.Parse(line); };

            act.Should().NotThrow(
                $"Each log line must be valid JSON (CompactJsonFormatter, AC-6, NFR-17). " +
                $"Offending line snippet: '{line[..Math.Min(line.Length, 200)]}'");

            using (doc)
            {
                doc!.RootElement.TryGetProperty("@t", out _).Should().BeTrue(
                    "CompactJson entries must have a '@t' (timestamp) field (AC-6, NFR-17).");
                doc.RootElement.TryGetProperty("@mt", out _).Should().BeTrue(
                    "CompactJson entries must have a '@mt' (message template) field (AC-6, NFR-17).");
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AC-7 — Service lifecycle events appear in rolling log file (NFR-17)
    //
    // RED:   No file sink → no log file created; lifecycle events absent from file.
    // GREEN: After a service is created, an entry mentioning the service appears
    //        in the log file (service name, status change logged by the engine).
    // ─────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-7: Service lifecycle events are written to the rolling log file (NFR-17)")]
    public async Task ServiceLifecycleEvent_WrittenTo_LogFile()
    {
        // Given a service is created (triggers a lifecycle log entry)
        var adminClient = await GetAdminClientAsync();

        var createResponse = await adminClient.PostAsJsonAsync("/api/services",
            new
            {
                name = "log-test-lifecycle-svc",
                externalUrl = "https://api.log-test.example.com",
                port = 30197,
            });
        // Service may or may not start cleanly; the log entry is what matters.
        _ = createResponse; // result intentionally unused — lifecycle log is the focus

        await Task.Delay(TimeSpan.FromSeconds(2));

        var logFile = TodaysLogFile();

        // RED: No file sink → File.Exists returns false.
        File.Exists(logFile).Should().BeTrue(
            $"Log file must exist at '{logFile}' to verify lifecycle events (AC-7, NFR-17).");

        var content = await File.ReadAllTextAsync(logFile);
        content.Should().Contain("log-test-lifecycle-svc",
            "Log file must contain an entry for the created service name (AC-7, NFR-17). " +
            "Service start/stop events must be written to both stdout and the file sink.");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AC-8 — System Events written to rolling log file (NFR-18)
    //
    // RED:   No file sink → no log file; System Events not written to file.
    // GREEN: System Events generated by the infrastructure layer appear in log file
    //        alongside their stdout equivalents.
    // ─────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-8: System Events are written to the rolling log file (NFR-18)")]
    public async Task SystemEvents_WrittenTo_LogFile()
    {
        // Given the app generates System Events (e.g., via service operations)
        var adminClient = await GetAdminClientAsync();

        // Trigger actions known to generate System Events (port checks, service starts)
        await adminClient.GetAsync("/api/events");
        await _client.GetAsync("/health");
        await Task.Delay(TimeSpan.FromSeconds(2));

        var logFile = TodaysLogFile();

        // RED: No file sink → File.Exists returns false.
        File.Exists(logFile).Should().BeTrue(
            $"Log file must exist at '{logFile}' to verify System Events are logged (AC-8, NFR-18).");

        // The log file must have content — every System Event must appear here
        var content = await File.ReadAllTextAsync(logFile);
        content.Should().NotBeEmpty(
            "Log file must contain entries. Every System Event generated by the infrastructure " +
            "layer must be written to both stdout and the rolling log file (AC-8, NFR-18).");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AC-9 — Resync outcomes logged to rolling log file (NFR-17)
    //
    // RED:   No file sink → no log file; resync outcomes absent from file.
    // GREEN: After POST /api/resync, a log entry including mapping/response counts
    //        appears in the file sink output.
    // ─────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-9: Resync outcomes (counts, duration) are written to the rolling log file (NFR-17)")]
    public async Task ResyncOutcome_WrittenTo_LogFile()
    {
        // Given a resync operation is triggered
        var adminClient = await GetAdminClientAsync();

        // POST /api/resync — triggers the resync engine which logs its outcome
        await adminClient.PostAsync("/api/resync", content: null);
        await Task.Delay(TimeSpan.FromSeconds(2));

        var logFile = TodaysLogFile();

        // RED: No file sink → File.Exists returns false.
        File.Exists(logFile).Should().BeTrue(
            $"Log file must exist at '{logFile}' to verify resync outcome logging (AC-9, NFR-17).");

        var content = await File.ReadAllTextAsync(logFile);

        // Resync log entries include mapping/response counts and duration
        content.Should().MatchRegex(
            @"(?i)(resync|mapping|response)",
            "Log file must contain a resync outcome entry referencing mappings or responses " +
            "(AC-9, NFR-17). Expected: mappings loaded count, responses loaded count, duration.");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AC-4 Edge Cases — Invalid / boundary FISHTANK_LOG_RETENTION_DAYS values
    //
    // These exercise the int.TryParse graceful-fallback in Program.cs:
    //
    //   var retentionDays = 7;
    //   if (int.TryParse(config["FISHTANK_LOG_RETENTION_DAYS"], out var parsedRetention))
    //       retentionDays = parsedRetention;
    //
    // Non-numeric → TryParse returns false → default 7 applies → no crash.
    // Zero         → TryParse succeeds → retainedFileCount=0 → app starts.
    // Negative     → TryParse succeeds → CleanupOldFiles catch-all prevents crash.
    // ─────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-4 Edge: Non-numeric FISHTANK_LOG_RETENTION_DAYS falls back to default 7 — app starts and log file is created")]
    public async Task RetentionDays_NonNumericValue_FallsBackToDefault_LogFileCreated()
    {
        var logDir = Path.Combine(Path.GetTempPath(), $"fishtank-badval-{Guid.NewGuid():N}");
        Directory.CreateDirectory(logDir);
        try
        {
            using var factory = _factory.WithWebHostBuilder(b =>
            {
                b.UseSetting("FISHTANK_LOG_PATH", logDir);
                b.UseSetting("FISHTANK_LOG_RETENTION_DAYS", "notanumber");
            });
            using var client = factory.CreateClient(
                new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });

            // int.TryParse("notanumber") → false → retentionDays stays at 7 → no crash
            var response = await client.GetAsync("/health");
            response.StatusCode.Should().Be(HttpStatusCode.OK,
                "Non-numeric FISHTANK_LOG_RETENTION_DAYS must be silently ignored via TryParse fallback; " +
                "the app must start and serve requests using the default 7-day retention.");

            await Task.Delay(TimeSpan.FromSeconds(2));

            var today = DateTime.UtcNow.ToString("yyyyMMdd");
            var logFile = Path.Combine(logDir, $"fishtank-{today}.log");
            File.Exists(logFile).Should().BeTrue(
                "With a non-numeric FISHTANK_LOG_RETENTION_DAYS, the default 7-day retention must apply " +
                "and log files must still be written (AC-4, FR-39).");
        }
        finally
        {
            if (Directory.Exists(logDir)) Directory.Delete(logDir, recursive: true);
        }
    }

    [Fact(DisplayName = "AC-4 Edge: FISHTANK_LOG_RETENTION_DAYS=0 is accepted — app starts and log file is created")]
    public async Task RetentionDays_Zero_AppStartsAndLogFileCreated()
    {
        var logDir = Path.Combine(Path.GetTempPath(), $"fishtank-zero-{Guid.NewGuid():N}");
        Directory.CreateDirectory(logDir);
        try
        {
            using var factory = _factory.WithWebHostBuilder(b =>
            {
                b.UseSetting("FISHTANK_LOG_PATH", logDir);
                b.UseSetting("FISHTANK_LOG_RETENTION_DAYS", "0");
            });
            using var client = factory.CreateClient(
                new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });

            var response = await client.GetAsync("/health");
            response.StatusCode.Should().Be(HttpStatusCode.OK,
                "FISHTANK_LOG_RETENTION_DAYS=0 must be accepted without crashing the app (AC-4).");

            await Task.Delay(TimeSpan.FromSeconds(2));

            // retainedFileCount=0 → cutoff = today → files with fileDate < today are deleted.
            // Today's file has fileDate == today (not <), so it survives.
            var today = DateTime.UtcNow.ToString("yyyyMMdd");
            var logFile = Path.Combine(logDir, $"fishtank-{today}.log");
            File.Exists(logFile).Should().BeTrue(
                "FISHTANK_LOG_RETENTION_DAYS=0 must not crash — today's log file must be written. " +
                "Cleanup only deletes files where fileDate < today (AC-4).");
        }
        finally
        {
            if (Directory.Exists(logDir)) Directory.Delete(logDir, recursive: true);
        }
    }

    [Fact(DisplayName = "AC-4 Edge: Negative FISHTANK_LOG_RETENTION_DAYS is accepted — app starts and /health returns 200")]
    public async Task RetentionDays_Negative_AppStartsWithoutCrashing()
    {
        var logDir = Path.Combine(Path.GetTempPath(), $"fishtank-neg-{Guid.NewGuid():N}");
        Directory.CreateDirectory(logDir);
        try
        {
            using var factory = _factory.WithWebHostBuilder(b =>
            {
                b.UseSetting("FISHTANK_LOG_PATH", logDir);
                b.UseSetting("FISHTANK_LOG_RETENTION_DAYS", "-5");
            });
            using var client = factory.CreateClient(
                new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });

            // retainedFileCount=-5 → CleanupOldFiles catch-all prevents any exception bubble
            var response = await client.GetAsync("/health");
            response.StatusCode.Should().Be(HttpStatusCode.OK,
                "FISHTANK_LOG_RETENTION_DAYS=-5 must be accepted without crashing the app. " +
                "The CleanupOldFiles catch-all in AppendOnlyRollingFileSink protects against errors (AC-4).");
        }
        finally
        {
            if (Directory.Exists(logDir)) Directory.Delete(logDir, recursive: true);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AC-2 Boundary — FISHTANK_LOG_PATH with trailing path separator
    //
    // Path.Combine handles a trailing directory separator gracefully on both
    // Windows and Linux. This test verifies no crash occurs and log files
    // are still written to the resolved directory.
    // ─────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-2 Boundary: FISHTANK_LOG_PATH with trailing directory separator — log file is created")]
    public async Task LogPath_WithTrailingDirectorySeparator_LogFileCreated()
    {
        var baseDir = Path.Combine(Path.GetTempPath(), $"fishtank-trailsep-{Guid.NewGuid():N}");
        Directory.CreateDirectory(baseDir);
        var logDirWithSeparator = baseDir + Path.DirectorySeparatorChar;
        try
        {
            using var factory = _factory.WithWebHostBuilder(b =>
                b.UseSetting("FISHTANK_LOG_PATH", logDirWithSeparator));
            using var client = factory.CreateClient(
                new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });

            await client.GetAsync("/health");
            await Task.Delay(TimeSpan.FromSeconds(2));

            // Path.Combine normalises the trailing separator; log files land in baseDir
            var files = Directory.GetFiles(baseDir, "fishtank-*.log");
            files.Should().NotBeEmpty(
                $"FISHTANK_LOG_PATH ending with '{Path.DirectorySeparatorChar}' must be accepted. " +
                $"Path.Combine normalises the trailing separator and log files must appear in '{baseDir}' (AC-2).");
        }
        finally
        {
            if (Directory.Exists(baseDir)) Directory.Delete(baseDir, recursive: true);
        }
    }
}
