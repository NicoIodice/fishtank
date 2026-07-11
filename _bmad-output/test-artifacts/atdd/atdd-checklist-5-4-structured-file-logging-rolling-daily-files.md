---
story_id: "5.4"
story_key: "5-4-structured-file-logging-rolling-daily-files"
skill: bmad-testarch-atdd
phase: RED
created: 2026-07-11
scaffold_file: src/Fishtank.Api.IntegrationTests/FileLoggingTests.cs
---

# ATDD Checklist — Story 5.4: Structured File Logging — Rolling Daily Files

## Phase Gate Status

| Gate | Status | Notes |
|------|--------|-------|
| Test file created | ✅ PASS | `src/Fishtank.Api.IntegrationTests/FileLoggingTests.cs` |
| All ACs referenced (1–9) | ✅ PASS | AC-10 and AC-11 are doc ACs — no automated tests needed |
| Compile clean | ✅ PASS | `dotnet build` succeeded — 0 errors, pre-existing warnings only |
| Tests RED (fail before implementation) | ✅ PASS | 11 failed / 1 trivially passed (AC-5a — see notes) |

**Build command:** `dotnet build src/Fishtank.Api.IntegrationTests/Fishtank.Api.IntegrationTests.csproj`
**Test command:** `dotnet test src/Fishtank.Api.IntegrationTests --filter "FullyQualifiedName~Story5_4_FileLoggingTests"`

---

## Scaffold File

```
src/Fishtank.Api.IntegrationTests/FileLoggingTests.cs
```

**Namespace:** `Fishtank.Api.IntegrationTests`  
**Test collection:** `"FileLogging"` (isolated from shared `"Integration"` collection)  
**Fixture:** `FileLoggingTestFixture` — extends `FishtankWebApplicationFactory`, sets `FISHTANK_LOG_PATH` to a per-run temp directory.

---

## Generated Tests with AC Mapping

| # | Test Method | DisplayName | AC | Priority | RED Reason |
|---|-------------|-------------|-----|----------|-----------|
| 1 | `SerilogSinksFile_Package_ReferencedIn_Csproj` | AC-1: Fishtank.Api.csproj contains PackageReference for Serilog.Sinks.File | AC-1 | P1 | `Serilog.Sinks.File` absent from .csproj → assertion fails |
| 2 | `LogFile_IsCreated_InConfiguredLogPath_WithDailyFilenamePattern` | AC-2: Daily rolling log file created in FISHTANK_LOG_PATH after app startup | AC-2 | P0 | No file sink in Program.cs → no log file created |
| 3 | `LogFile_Uses_Expected_DailyFilenamePattern` | AC-2b: Log file naming pattern is fishtank-{yyyyMMdd}.log | AC-2 | P0 | No file sink → log directory empty |
| 4 | `DefaultLogPath_IsDataLogs_WhenEnvVarNotSet` | AC-3: Default log path /data/logs used when FISHTANK_LOG_PATH is not set | AC-3 | P1 | No file sink → no file at `/data/logs`; also requires writable mount for GREEN |
| 5 | `CustomRetentionDays_LogFileCreated_With14DayRetention` | AC-4a: Custom FISHTANK_LOG_RETENTION_DAYS=14 accepted — log file created | AC-4 | P1 | No file sink → no log file created |
| 6 | `DefaultRetentionDays_Is7_AndLogFileCreated` | AC-4b: Default retention 7 days — log file created when env var absent | AC-4 | P1 | No file sink → no log file created |
| 7 | `UnwritableLogPath_HealthEndpoint_Returns200` | AC-5a: Unwritable log path — /health returns HTTP 200 (app continues) | AC-5 | P1 | **Passes trivially** — no file sink → no crash → `/health` already returns 200. Primary signal is AC-5b. |
| 8 | `UnwritableLogPath_StdoutWarning_ContainsFileLoggingDisabledMessage` | AC-5b: Unwritable log path — stdout warning message emitted | AC-5 | P0 | No graceful degradation code → warning message absent from captured stdout |
| 9 | `LogEntries_AreValidCompactJson_WithTimestampAndMessageTemplate` | AC-6: Each log entry is valid CompactJson with @t and @mt fields (NFR-17) | AC-6 | P0 | No file sink → file does not exist → first assertion fails |
| 10 | `ServiceLifecycleEvent_WrittenTo_LogFile` | AC-7: Service lifecycle events are written to the rolling log file (NFR-17) | AC-7 | P1 | No file sink → file does not exist |
| 11 | `SystemEvents_WrittenTo_LogFile` | AC-8: System Events are written to the rolling log file (NFR-18) | AC-8 | P1 | No file sink → file does not exist |
| 12 | `ResyncOutcome_WrittenTo_LogFile` | AC-9: Resync outcomes (counts, duration) are written to the rolling log file (NFR-17) | AC-9 | P1 | No file sink → file does not exist |

**Total:** 12 test methods covering 9 acceptance criteria (AC-10, AC-11 excluded — documentation only).

---

## Test Run Results (RED Phase — 2026-07-11)

```
Total tests: 12
     Passed: 1   ← AC-5a (trivially passes — see note below)
     Failed: 11  ✅ RED
```

### Failure Reasons (all correct)

| Test | Failure Message |
|------|-----------------|
| AC-1 | `Serilog.Sinks.File` string not found in Fishtank.Api.csproj |
| AC-2, AC-2b | `File.Exists(...fishtank-20260711.log)` = False |
| AC-3 | `File.Exists(/data/logs/fishtank-20260711.log)` = False |
| AC-4a, AC-4b | `File.Exists(...fishtank-20260711.log)` = False |
| AC-5b | `stdout.Should().Contain("file logging disabled")` fails — no warning emitted |
| AC-6 | `File.Exists(logFile)` = False (pre-check before JSON parsing) |
| AC-7 | `File.Exists(logFile)` = False |
| AC-8 | `content.Should().NotBeEmpty()` — file does not exist |
| AC-9 | `File.Exists(logFile)` = False |

### Notes

**AC-5a trivially passes** (`/health` returns 200 even without implementation). This is expected: without a file sink, nothing attempts to write to the unwritable path, so no crash occurs. The primary RED assertion for AC-5 is **AC-5b** (the stdout warning message), which correctly fails.

**AC-3 (default path `/data/logs`)** will remain RED on bare Windows hosts even after implementation, because `/data/logs` requires a Docker volume mount to be writable. This AC is validated via Docker E2E testing; the test documents the requirement and is GREEN in the containerised environment.

---

## Infrastructure

### Custom Fixtures

**`FileLoggingTestFixture`** (`FileLoggingTests.cs`)
- Extends `FishtankWebApplicationFactory`
- Creates a unique temp directory per test run as `FISHTANK_LOG_PATH`
- Automatically cleans up the temp directory on dispose
- Isolated from the shared `"Integration"` collection to avoid log pollution

**Collection:** `"FileLogging"` — creates one `FileLoggingTestFixture` instance shared across all tests in this class.

### Key Test Patterns

- **AC-1**: Reads `.csproj` as text, asserts `Serilog.Sinks.File` substring present
- **AC-2/4/6/7/8/9**: Makes HTTP requests, waits 2 seconds for Serilog flush, asserts file existence
- **AC-5a**: Creates derived factory via `WithWebHostBuilder` with unwritable path; checks `/health` → 200
- **AC-5b**: Captures `Console.Out` before creating the derived factory; asserts warning text present
- **AC-3**: Uses plain `FishtankWebApplicationFactory` (no log path override) to exercise production default

---

## ACs Deferred (Documentation Only)

| AC | Reason |
|----|--------|
| AC-10 | `docker-compose.example.yml` documentation — verified by human review |
| AC-11 | `README.md` documentation — verified by human review |

---

## Next Steps

1. **Implement Story 5.4** — developer follows story file tasks (add package, update Program.cs, graceful degradation)
2. **Run tests again** — verify they turn GREEN
3. **AC-3 GREEN validation** — run in Docker with `./logs:/data/logs` volume mount
4. **Manual E2E** — verify log file appears in mounted volume after container start
