---
story_key: "5-4-structured-file-logging-rolling-daily-files"
story_id: "5.4"
generated: 2026-07-11
phase: automate
layer_breakdown:
  unit: 6
  integration: 16
  e2e: 0
total_tests_this_story: 22
atdd_green: true
suite_green_excluding_preexisting: true
---

# Automation Summary — Story 5.4: Structured File Logging — Rolling Daily Files

## Overview

| Layer       | Tests Added This Phase | Total for Story |
|-------------|----------------------|-----------------|
| Unit        | 6 (new file)          | 6               |
| Integration | 4 edge-case additions | 16 (12 ATDD + 4 new) |
| E2E         | 0 (not applicable)    | 0               |
| **Total**   | **10**                | **22**          |

---

## Coverage Table — AC → Test → Layer → Status

| AC | Description | Test Name | File | Layer | Status |
|----|-------------|-----------|------|-------|--------|
| AC-1 | Serilog.Sinks.File in .csproj | `SerilogSinksFile_Package_ReferencedIn_Csproj` | FileLoggingTests.cs | Integration | ✅ GREEN |
| AC-2 | Log file created in FISHTANK_LOG_PATH | `LogFile_IsCreated_InConfiguredLogPath_WithDailyFilenamePattern` | FileLoggingTests.cs | Integration | ✅ GREEN |
| AC-2 | Daily filename pattern `fishtank-{yyyyMMdd}.log` | `LogFile_Uses_Expected_DailyFilenamePattern` | FileLoggingTests.cs | Integration | ✅ GREEN |
| AC-2 Boundary | Trailing directory separator on log path | `LogPath_WithTrailingDirectorySeparator_LogFileCreated` | FileLoggingTests.cs | Integration | ✅ GREEN |
| AC-3 | Default path `/data/logs` when env var absent | `DefaultLogPath_IsDataLogs_WhenEnvVarNotSet` | FileLoggingTests.cs | Integration | ✅ GREEN |
| AC-4 | Custom retention `FISHTANK_LOG_RETENTION_DAYS=14` | `CustomRetentionDays_LogFileCreated_With14DayRetention` | FileLoggingTests.cs | Integration | ✅ GREEN |
| AC-4 | Default 7-day retention when env var absent | `DefaultRetentionDays_Is7_AndLogFileCreated` | FileLoggingTests.cs | Integration | ✅ GREEN |
| AC-4 Edge | Non-numeric retention falls back to default | `RetentionDays_NonNumericValue_FallsBackToDefault_LogFileCreated` | FileLoggingTests.cs | Integration | ✅ GREEN |
| AC-4 Edge | Zero retention — app starts, log file written | `RetentionDays_Zero_AppStartsAndLogFileCreated` | FileLoggingTests.cs | Integration | ✅ GREEN |
| AC-4 Edge | Negative retention — no crash | `RetentionDays_Negative_AppStartsWithoutCrashing` | FileLoggingTests.cs | Integration | ✅ GREEN |
| AC-5 | Unwritable path — `/health` returns 200 | `UnwritableLogPath_HealthEndpoint_Returns200` | FileLoggingTests.cs | Integration | ✅ GREEN |
| AC-5 | Unwritable path — stdout warning emitted | `UnwritableLogPath_StdoutWarning_ContainsFileLoggingDisabledMessage` | FileLoggingTests.cs | Integration | ✅ GREEN |
| AC-6 | Each log line is valid CompactJson (`@t`, `@mt`) | `LogEntries_AreValidCompactJson_WithTimestampAndMessageTemplate` | FileLoggingTests.cs | Integration | ✅ GREEN |
| AC-7 | Service lifecycle events in log file | `ServiceLifecycleEvent_WrittenTo_LogFile` | FileLoggingTests.cs | Integration | ✅ GREEN |
| AC-8 | System Events in log file | `SystemEvents_WrittenTo_LogFile` | FileLoggingTests.cs | Integration | ✅ GREEN |
| AC-9 | Resync outcomes in log file | `ResyncOutcome_WrittenTo_LogFile` | FileLoggingTests.cs | Integration | ✅ GREEN |
| Internal | Emit writes CompactJson to today's log file | `Emit_WritesFormattedEntry_ToTodaysLogFile` | AppendOnlyRollingFileSinkTests.cs | Unit | ✅ GREEN |
| Internal | Multiple emits append to same daily file | `Emit_MultipleEvents_SameDay_AppendToSameFile` | AppendOnlyRollingFileSinkTests.cs | Unit | ✅ GREEN |
| Internal | retainedFileCount=0 does not throw | `Emit_WithRetainedFileCount0_DoesNotThrow` | AppendOnlyRollingFileSinkTests.cs | Unit | ✅ GREEN |
| Internal | retainedFileCount=-1 does not throw | `Emit_WithRetainedFileCountNegative_DoesNotThrow` | AppendOnlyRollingFileSinkTests.cs | Unit | ✅ GREEN |
| Internal | Cleanup deletes files older than retention window | `Emit_DeletesFilesOlderThanRetentionWindow` | AppendOnlyRollingFileSinkTests.cs | Unit | ✅ GREEN |
| Internal | Cleanup preserves files within retention window | `Emit_PreservesFilesWithinRetentionWindow` | AppendOnlyRollingFileSinkTests.cs | Unit | ✅ GREEN |

---

## Tests Added This Phase

### Unit Tests — `src/Fishtank.Api.UnitTests/AppendOnlyRollingFileSinkTests.cs` (new file)

Direct unit tests for `AppendOnlyRollingFileSink` (internal class in `Program.cs`, accessible via `InternalsVisibleTo`).

| # | Test Name | Purpose |
|---|-----------|---------|
| 1 | `Emit_WritesFormattedEntry_ToTodaysLogFile` | Happy path: entry written to `fishtank-{yyyyMMdd}.log` |
| 2 | `Emit_MultipleEvents_SameDay_AppendToSameFile` | Three emits produce three CompactJson lines in the same file |
| 3 | `Emit_WithRetainedFileCount0_DoesNotThrow` | Zero boundary — `cutoffDate = today`, no exception |
| 4 | `Emit_WithRetainedFileCountNegative_DoesNotThrow` | Negative boundary — catch-all in `CleanupOldFiles` prevents crash |
| 5 | `Emit_DeletesFilesOlderThanRetentionWindow` | 30-day-old file deleted with 7-day retention |
| 6 | `Emit_PreservesFilesWithinRetentionWindow` | Yesterday's file survives 7-day retention |

### Integration Tests — Added to `src/Fishtank.Api.IntegrationTests/FileLoggingTests.cs`

Edge cases for env var parsing and log path boundary conditions (4 tests):

| # | Test Name | Purpose |
|---|-----------|---------|
| 1 | `RetentionDays_NonNumericValue_FallsBackToDefault_LogFileCreated` | `FISHTANK_LOG_RETENTION_DAYS="notanumber"` → `int.TryParse` returns false → default 7 → app starts |
| 2 | `RetentionDays_Zero_AppStartsAndLogFileCreated` | `FISHTANK_LOG_RETENTION_DAYS=0` → accepted, today's file written |
| 3 | `RetentionDays_Negative_AppStartsWithoutCrashing` | `FISHTANK_LOG_RETENTION_DAYS=-5` → catch-all prevents crash, app healthy |
| 4 | `LogPath_WithTrailingDirectorySeparator_LogFileCreated` | `FISHTANK_LOG_PATH` with trailing `\` or `/` → `Path.Combine` normalises it |

---

## Bug Fixed During Automation Phase

**Bug discovered by test `Emit_DeletesFilesOlderThanRetentionWindow`:**

In `AppendOnlyRollingFileSink.CleanupOldFiles()` (`Program.cs`), the filename length check and span offset were incorrect:

```csharp
// BEFORE (broken — "fishtank-yyyyMMdd" is 17 chars, not 16; '-' is at index 8, date starts at index 9)
if (name.Length == 16
    && DateOnly.TryParseExact(name.AsSpan(8), "yyyyMMdd", ...

// AFTER (correct)
if (name.Length == 17
    && DateOnly.TryParseExact(name.AsSpan(9), "yyyyMMdd", ...
```

**Impact:** Log file retention cleanup never ran — old log files accumulated indefinitely.  
**Fix:** Changed length check from `16` to `17` and span start from `8` to `9`.  
**Status:** Fixed in `Program.cs` as part of this automation phase.

---

## Intentional Coverage Gaps

| Gap | Rationale |
|-----|-----------|
| **E2E tests** | Story is infrastructure-only (no UI entry point). No E2E spec exists and none was created. |
| **AC-10 / AC-11 (docs)** | `docker-compose.example.yml` and `README.md` documentation ACs are verified by code review, not automated tests. Doc assertions would be fragile and provide low value. |
| **Multi-day rollover** | Testing actual midnight rollover requires mocking `DateTimeOffset.UtcNow` which the current sink does not support via injection. The daily filename logic is verified via the unit test's `MakeLogEvent(timestamp)` overload. |
| **Log retention over N days of real files** | Would require creating files with dates spanning the retention window in real time; the unit test covers the cutoff logic with a controlled stale file (30 days old). |

---

## Total Test Counts After This Phase

| Suite | Before | Added | After |
|-------|--------|-------|-------|
| `Fishtank.Api.UnitTests` | 84 | 6 | 90 |
| `Fishtank.Api.IntegrationTests` (story 5.4) | 12 | 4 | 16 |
| **Story 5.4 total** | **12** | **10** | **22** |

---

## Run Commands

```bash
# Story 5.4 tests only
dotnet test src/Fishtank.slnx --filter "FullyQualifiedName~FileLogging|FullyQualifiedName~Story5_4|FullyQualifiedName~AppendOnlyRollingFileSink"

# Full suite
dotnet test src/Fishtank.slnx
```

**All 22 story-5.4 tests: GREEN ✅**
