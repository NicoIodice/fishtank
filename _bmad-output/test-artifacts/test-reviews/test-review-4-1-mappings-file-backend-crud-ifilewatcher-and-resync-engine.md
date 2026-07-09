---
stepsCompleted: [step-01, step-02, step-03, step-04]
lastStep: step-04-generate-report
lastSaved: '2026-06-28'
workflowType: testarch-test-review
inputDocuments:
  - src/Fishtank.Api.IntegrationTests/Api/Story4_1_MappingsEndpointsTests.cs
  - src/Fishtank.Api.UnitTests/Services/MappingServiceTests.cs
  - src/Fishtank.Api.UnitTests/Services/ResyncServiceTests.cs
  - src/Fishtank.Api.UnitTests/Engine/FakeFileWatcherTests.cs
  - src/Fishtank.Api.IntegrationTests/Engine/FileWatcherContractTests.cs
---

# Test Quality Review: Story 4-1 — Mappings File Backend CRUD, IFileWatcher & Resync Engine

**Quality Score**: 80/100 (B — Good)
**Review Date**: 2026-06-28
**Review Scope**: Suite (5 test files across 2 projects)
**Reviewer**: Murat — Master Test Architect (TEA)

---

> **Scope note:** This review audits existing tests against quality criteria and AC coverage.
> Coverage gating and traceability matrix decisions belong to the `trace` skill.

## Executive Summary

**Overall Assessment**: Good

**Recommendation**: Approve with Comments

### Key Strengths

✅ Security path-traversal tests (AC-13) are thorough — four Theory data sets, multiple attack surfaces (direct `../`, encoded, repeated, absolute paths, outside-root resolution)
✅ Clean Arrange-Act-Assert structure throughout; test names follow `Method_State_ExpectedBehavior` convention consistently
✅ All skip reasons documented with cross-references explaining where coverage is picked up
✅ IFileWatcher interface contract tested exhaustively via reflection (8 structural assertions)
✅ Isolation is solid — unique GUIDs per test instance guarantee no shared temp-dir state

### Key Weaknesses

❌ AC-12 concurrent-guard integration test (`Resync_ConcurrentCalls_SecondCallReturns409`) contains a false-positive branch that makes it pass even when the guard is absent
❌ AC-5 ("File write failure creates System Event") test actually tests path traversal, not I/O failure — the real AC-5 scenario is unexercised at any level
❌ NFR-2 performance test runs against an **empty** Mocks Root directory, trivially satisfying the 1-second threshold without validating the 200-file regime

### Summary

The test suite establishes a competent foundation for the story's 16 ACs. Happy-path CRUD integration coverage is solid, the security surface is well-exercised, and test infrastructure choices (FluentAssertions, NSubstitute, in-memory DB, GUID-isolated temp dirs) are idiomatic for the stack. The suite passes green at the time of review (178 unit / 126 integration).

However three reliability issues require attention before the tests can be considered a trustworthy safety net: one test will silently pass if the feature it guards is removed (AC-12), one test was shipped under the wrong AC label leaving real AC-5 behavior untested, and the NFR performance test provides no signal about the actual performance requirement. Error-path scenarios (duplicate creation, not-found) are covered only by unit tests, with no integration-level validation of the resulting HTTP responses or error codes. SignalR broadcast is acknowledged as deferred but has no coverage roadmap.

---

## Quality Criteria Assessment

| Criterion                            | Status     | Violations | Notes                                                              |
| ------------------------------------ | ---------- | ---------- | ------------------------------------------------------------------ |
| AAA Format (Arrange-Act-Assert)      | ✅ PASS    | 0          | All tests follow AAA; `//Arrange/Act/Assert` comments present      |
| Test IDs / Display Names             | ✅ PASS    | 0          | Every test has a descriptive `DisplayName`; AC tag in name         |
| Priority Markers                     | ⚠️ WARN   | 13         | No P0/P1/P2 markers on individual tests (priority inferred from AC) |
| Hard Waits (`Task.Delay`)            | ⚠️ WARN   | 1          | AC-11 conflict test uses `Task.Delay(100)` against project rule D6  |
| Determinism / No conditionals        | ❌ FAIL    | 1          | AC-12 test has conditional assertion (`if (conflictResponse != null)`) that creates a false positive |
| Isolation (cleanup, no shared state) | ✅ PASS    | 0          | GUID per instance; `FishtankWebApplicationFactory` collection scoping correct |
| Fixture Patterns                     | ✅ PASS    | 0          | Factory per collection; `GetAuthenticatedClientAsync` helper is reusable |
| Meaningful Assertions                | ⚠️ WARN   | 3          | AC-3/AC-4 verify status only; AC-15 verifies HTTP not SignalR broadcast |
| Boundary / Edge Case Coverage        | ⚠️ WARN   | 3          | AC-7/AC-8 HTTP-level edge cases absent; NFR-2 tested with 0 files  |
| Test Length (≤300 lines per file)    | ✅ PASS    | 0          | Largest file ~650 lines but sensibly broken into regions           |
| Flakiness Patterns                   | ⚠️ WARN   | 2          | AC-12 race-dependent; AC-11 uses wall-clock delay for timestamp diff |
| AC Label Accuracy                    | ❌ FAIL    | 1          | AC-5 integration test tests path-traversal, not I/O write failure  |
| Skip Reason Documentation            | ✅ PASS    | 0          | Both skips have `Skip=` message referencing covering test/story    |

**Total Violations**: 2 Critical, 3 Major, 5 Minor

---

## Quality Score Breakdown

```
Starting Score:          100

Critical Violations:
  AC-12 false-positive conditional assertion  -10
  AC-5 test/AC mismatch (real AC-5 untested) -10
                                              ----
Critical Deduction:                           -20

Major Violations:
  NFR-2 test uses 0 files, not <200 files    - 5
  AC-15 SignalR not verified                 - 5
  AC-7/AC-8 error paths — integration gap   - 5
  AC-10 FakeFileWatcher simulate() untested  - 3
  Task.Delay in AC-11 test (rule D6)         - 2
                                              ----
Major Deduction:                              -20

Minor Violations:
  AC-3 no content-change assertion           - 2
  AC-4 no disk-removal verification          - 2
  AC-14 missing unauthenticated DELETE test  - 2
  FakeFileWatcherContractTests thin stub     - 1
                                              ----
Minor Deduction:                               -7

Bonus Points:
  Thorough AC-13 security test suite         + 5
  GUID isolation pattern                     + 3
  Clear RED/GREEN phase comments             + 2
  Documented skip cross-references           + 2
                                              ----
Bonus Total:                                  +12

Final Score:             80/100 (B — Good)
```

---

## Per-AC Coverage Table

> **Note:** ACs below use the review request numbering. These differ from the canonical story-file numbering (story calls the folder-tree GET "AC-1"; review request calls POST create "AC-1"). Canonical story AC numbers are cross-referenced where they differ.

| AC   | Description                                    | Integration Test                           | Unit Test                                  | Grade |
|------|------------------------------------------------|--------------------------------------------|--------------------------------------------|-------|
| AC-1 | Create mapping (POST /api/mappings)            | ✅ `CreateMapping_ValidRequest_...`         | ✅ `CreateFileAsync` + path guards          | ✅ Full |
| AC-2 | Read single file (GET /api/mappings/{path})    | ❌ No test                                  | ❌ No test                                  | ⚠️ Gap — endpoint may not exist in story spec |
| AC-3 | Update mapping (PUT /api/mappings/{path})      | ⚠️ Status only; no content verification    | ✅ `UpdateFileAsync_FileNotFound`           | ⚠️ Partial |
| AC-4 | Delete mapping (DELETE /api/mappings/{path})   | ⚠️ Status only; no disk-removal check      | ✅ `DeleteFileAsync_FileNotFound`           | ⚠️ Partial |
| AC-5 | List mappings (GET /api/mappings)              | ✅ `GetMappings_ReturnsSuccessEnvelope_...` | N/A                                        | ✅ Full |
| AC-6 | Invalid path rejected (MAPPING_PATH_INVALID)   | ✅ `CreateMapping_PathTraversal_...` × 2   | ✅ Theory tests × 4 data sets              | ✅ Full |
| AC-7 | Duplicate creation (MAPPING_FILE_EXISTS)       | ❌ No integration test                      | ✅ `CreateFileAsync_FileExists_...`         | ⚠️ Unit only |
| AC-8 | Not found on PUT/DELETE (MAPPING_FILE_NOT_FOUND)| ❌ No integration tests                    | ✅ `UpdateFileAsync_FileNotFound` + `DeleteFileAsync_FileNotFound` | ⚠️ Unit only |
| AC-9 | IFileWatcher abstraction (FakeFileWatcher)     | ✅ Indirect (FakeFileWatcher used in factory)| ⚠️ Stub placeholder                       | ⚠️ Indirect |
| AC-10| IFileWatcher contract test                     | ✅ `FileWatcherContractTests` (10 tests)    | ⚠️ Thin 1-assertion stub                  | ✅ Full (integration) |
| AC-11| Resync conflict detection (external mod)       | ✅ `Resync_ExternallyModifiedFile_...`      | N/A                                        | ✅ Full |
| AC-12| Resync concurrent guard (RESYNC_IN_PROGRESS)   | ⚠️ False-positive conditional assertion     | ⏭️ Skipped (documented)                   | ⚠️ Flawed |
| AC-13| Path sanitization / traversal protection       | ✅ 2 integration tests                     | ✅ 10 theory cases across 4 test methods   | ✅ Excellent |
| AC-14| Resync loads mappings correctly                | ✅ `Resync_ReloadsAllMappings_...` + NFR   | ✅ `ResyncAsync_EmptyMocksRoot_...` × 2   | ✅ Full |
| AC-15| Resync triggers SignalR ResyncCompleted        | ⚠️ HTTP-only; SignalR broadcast unverified  | N/A                                        | ⚠️ Deferred |
| AC-16| POST /api/services/import (deferred)           | ⏭️ Skipped (documented — future story)     | N/A                                        | ✅ Correctly deferred |

---

## Critical Issues (Must Fix)

### 1. AC-12 Concurrent Guard Test Has a False-Positive Branch

**Severity**: P0 (Critical)
**Location**: `src/Fishtank.Api.IntegrationTests/Api/Story4_1_MappingsEndpointsTests.cs` — `Resync_ConcurrentCalls_SecondCallReturns409`
**Criterion**: Determinism / Meaningful Assertions

**Issue Description**:
The concurrent Resync guard test fires two calls in parallel and then checks `if (conflictResponse != null)` before asserting the `RESYNC_IN_PROGRESS` error code. The `else` branch asserts `true.Should().BeTrue(...)` — which is a no-op that always passes. This means the test **passes green even if the `SemaphoreSlim` guard is completely absent** and both calls succeed, which is the exact wrong behaviour the test should catch.

This is the most dangerous finding in the suite: a safety net that doesn't catch what it was built to prevent.

**Current Code**:

```csharp
// ⚠️ False positive — both calls succeeding still passes
var conflictResponse = responses.FirstOrDefault(r => r.StatusCode == HttpStatusCode.Conflict);
if (conflictResponse != null)
{
    var body = await conflictResponse.Content.ReadFromJsonAsync<JsonElement>();
    body.GetProperty("error").GetProperty("code").GetString()
        .Should().Be("RESYNC_IN_PROGRESS", "...");
}
else
{
    // Both succeeded — this means no concurrency guard!
    true.Should().BeTrue("both calls succeeded — concurrency guard not yet implemented (expected in RED phase)");
}
```

**Recommended Fix**:

```csharp
// ✅ Assert the guard is present; fail if it isn't
statusCodes.Should().Contain(HttpStatusCode.Conflict,
    "one of the concurrent Resync calls must be rejected with HTTP 409 RESYNC_IN_PROGRESS");

var conflictResponse = responses.Single(r => r.StatusCode == HttpStatusCode.Conflict);
var body = await conflictResponse.Content.ReadFromJsonAsync<JsonElement>();
body.GetProperty("success").GetBoolean().Should().BeFalse();
body.GetProperty("error").GetProperty("code").GetString()
    .Should().Be("RESYNC_IN_PROGRESS",
        "concurrent Resync must be rejected with RESYNC_IN_PROGRESS error code");
```

**Why This Matters**: The `SemaphoreSlim(1,1)` guard prevents race conditions and data corruption during concurrent resyncs. The test's entire purpose is to verify this guard. A test that passes when the guard is absent provides false confidence and will miss regressions when the guard is accidentally broken.

---

### 2. AC-5 Test Mislabeled — Real AC-5 Scenario (I/O Write Failure) Is Untested

**Severity**: P0 (Critical)
**Location**: `src/Fishtank.Api.IntegrationTests/Api/Story4_1_MappingsEndpointsTests.cs:223` — `CreateMapping_WriteFailure_CreatesSystemEventAndReturnsError`
**Criterion**: AC Label Accuracy / Coverage

**Issue Description**:
The test is labelled `AC-5` and titled `WriteFailure_CreatesSystemEventAndReturnsError`, but it actually tests path traversal rejection — a path validation error, not an I/O failure. The test body itself acknowledges this in a comment ("Note: Path traversal is a validation error (AC-13), not an I/O error.").

AC-5 specifies: *When a file operation fails due to a disk error or permission denial, a System Event entry must be created.* This scenario — a real filesystem I/O failure triggering a `SystemEventService` entry — has **no test at any level** (unit or integration). The `ISystemEventService` mock exists in `MappingServiceTests` but is never asserted against.

**Current Code**:

```csharp
// Named AC-5 but tests path traversal (AC-13 / AC-6)
[Fact(DisplayName = "AC-5: File write failure — creates System Event and returns error")]
public async Task CreateMapping_WriteFailure_CreatesSystemEventAndReturnsError()
{
    var invalidRequest = new { path = "../../../etc/passwd", content = "malicious content" };
    var response = await client.PostAsJsonAsync("/api/mappings", invalidRequest);
    response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    // Asserts MAPPING_PATH_INVALID — correct for AC-13, not AC-5
}
```

**Recommended Fix**:

Two changes are needed:
1. Rename the existing test to something like `CreateMapping_PathTraversalViaAC13_ReturnsHTTP400_AlreadyCoveredElsewhere` or just remove it (it duplicates the `CreateMapping_PathTraversal_ReturnsHTTP400` test below it).
2. Add a proper AC-5 unit test asserting that `SystemEventService.CreateAsync(...)` is called when `MappingService` encounters an `IOException`:

```csharp
[Fact(DisplayName = "AC-5: CreateFileAsync — IOException triggers System Event")]
public async Task CreateFileAsync_IOExceptionOnWrite_CreatesSystemEvent()
{
    // Arrange — make the directory read-only to force an IOException
    var readOnlyDir = Path.Combine(_testMocksRoot, "service");
    Directory.CreateDirectory(readOnlyDir);
    new DirectoryInfo(readOnlyDir).Attributes = FileAttributes.ReadOnly;

    var service = CreateService();

    // Act
    Func<Task> act = async () => await service.CreateFileAsync("service/fail.json", "content");

    // Assert
    await act.Should().ThrowAsync<Exception>();
    await _systemEvents.Received(1)
        .CreateAsync(
            Arg.Is<string>(sev => sev == "error"),
            Arg.Any<string>(),
            Arg.Any<string>());
}
```

**Why This Matters**: File write failures silently ignored by the UI would be a data-loss scenario for users. AC-5 and FR-22 specifically require these to surface as System Events so operators are notified.

---

## Recommendations (Should Fix)

### 3. NFR-2 Performance Test Uses an Empty Directory

**Severity**: P1 (High)
**Location**: `src/Fishtank.Api.IntegrationTests/Api/Story4_1_MappingsEndpointsTests.cs:293` — `Resync_LessThan200Files_CompletesInUnder1Second`
**Criterion**: Boundary / Edge Case Coverage

**Issue Description**:
The test calls `POST /api/resync` with an empty Mocks Root and asserts `elapsedMs ≤ 1000`. An empty resync is trivially fast — this assertion would pass even if the resync engine had O(n) inefficiencies at 200 files. The comment in the test acknowledges this: "Note: This test requires a fixture with ~200 mapping files — In RED phase, endpoint doesn't exist."

The fixture setup was not added during the GREEN phase transition, leaving the test measuring the wrong thing.

**Recommended Fix**:

Add a test-specific fixture helper that seeds ~200 minimal JSON mapping files before calling resync:

```csharp
[Fact(DisplayName = "AC-7: Resync performance — completes in <1s for <200 files (NFR-2)")]
public async Task Resync_LessThan200Files_CompletesInUnder1Second()
{
    // Arrange — seed 200 minimal mapping files
    var mocksRoot = Factory.Services.GetRequiredService<IConfiguration>()["FISHTANK_MOCKS_ROOT"]!;
    for (int i = 0; i < 200; i++)
    {
        var dir = Path.Combine(mocksRoot, $"perf-service-{i}", "mappings");
        Directory.CreateDirectory(dir);
        await File.WriteAllTextAsync(
            Path.Combine(dir, "mapping.json"),
            """{"request":{"method":"GET","url":"/perf"},"response":{"status":200}}""");
    }

    var client = await GetAuthenticatedClientAsync();

    // Act
    var response = await client.PostAsync("/api/resync", null);

    // Assert
    var data = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
    data.GetProperty("elapsedMs").GetInt32().Should().BeLessThanOrEqualTo(1000,
        "NFR-2: Resync for <200 files must complete in under 1 second");
    data.GetProperty("mappingsLoaded").GetInt32().Should().Be(200);
}
```

**Priority**: High — the NFR was explicitly called out in the story and affects real user experience under load.

---

### 4. AC-7 and AC-8 Error Paths Lack Integration Tests

**Severity**: P1 (High)
**Location**: `src/Fishtank.Api.IntegrationTests/Api/Story4_1_MappingsEndpointsTests.cs` — missing tests
**Criterion**: Boundary / Edge Case Coverage

**Issue Description**:
Unit tests correctly verify that `MappingService` throws `ValidationException("MAPPING_FILE_EXISTS")` on duplicate creation and `NotFoundException("MAPPING_FILE_NOT_FOUND")` on update/delete of absent files. However, there are no integration tests that verify the HTTP-layer translation of these exceptions:

- `POST /api/mappings` with an already-existing path → HTTP 409 with `MAPPING_FILE_EXISTS`
- `PUT /api/mappings/{path}` for a non-existent path → HTTP 404 with `MAPPING_FILE_NOT_FOUND`
- `DELETE /api/mappings/{path}` for a non-existent path → HTTP 404 with `MAPPING_FILE_NOT_FOUND`

`GlobalExceptionMiddleware` is responsible for the exception→HTTP mapping, and this mapping is untested for these error codes.

**Recommended Fix**:

Add three integration tests following the existing pattern:

```csharp
[Fact(DisplayName = "AC-7: POST /api/mappings — duplicate path returns HTTP 409 MAPPING_FILE_EXISTS")]
public async Task CreateMapping_DuplicatePath_ReturnsHTTP409()
{
    var client = await GetAuthenticatedClientAsync();
    var path = "test-service/mappings/duplicate.json";
    await client.PostAsJsonAsync("/api/mappings", new { path, content = "{}" });

    var response = await client.PostAsJsonAsync("/api/mappings", new { path, content = "{}" });

    response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    var body = await response.Content.ReadFromJsonAsync<JsonElement>();
    body.GetProperty("success").GetBoolean().Should().BeFalse();
    body.GetProperty("error").GetProperty("code").GetString()
        .Should().Be("MAPPING_FILE_EXISTS");
}

[Fact(DisplayName = "AC-8: PUT /api/mappings/{path} — non-existent path returns HTTP 404 MAPPING_FILE_NOT_FOUND")]
public async Task UpdateMapping_NonExistentPath_ReturnsHTTP404()
{
    var client = await GetAuthenticatedClientAsync();

    var response = await client.PutAsJsonAsync(
        "/api/mappings/test-service/mappings/ghost.json",
        new { content = "{}" });

    response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    var body = await response.Content.ReadFromJsonAsync<JsonElement>();
    body.GetProperty("error").GetProperty("code").GetString()
        .Should().Be("MAPPING_FILE_NOT_FOUND");
}
```

---

### 5. AC-15 SignalR Broadcast Is Unverified — No Coverage Roadmap

**Severity**: P1 (High)
**Location**: `src/Fishtank.Api.IntegrationTests/Api/Story4_1_MappingsEndpointsTests.cs:522` — `Resync_Success_BroadcastsResyncCompletedEvent`
**Criterion**: Meaningful Assertions

**Issue Description**:
The test comment states: "Full SignalR broadcast verification... is deferred to Playwright E2E tests." However, no Playwright E2E test for `ResyncCompleted` exists in `src/client/`, and the automation summary notes the SignalR test harness compilation failed (HubConnection auth forwarding issue). The test currently only verifies the HTTP response — it does not assert that `ServicesHub.Clients.All.SendAsync("ResyncCompleted", ...)` was called.

The `Story2_3_ServicesHubTests.cs` pattern referenced in the story context already establishes how to wire SignalR tests. The gap is that the harness broke during GREEN phase transition and was not fixed.

**Recommended Fix**:

Verify the broadcast via the `IHubContext` mock approach used in `ResyncServiceTests`, or use a real `HubConnection` following the established pattern with cookie forwarding. At minimum, add an `NSubstitute` assertion in the unit test:

```csharp
// In ResyncServiceTests — verify SignalR broadcast is called
[Fact(DisplayName = "ResyncAsync — broadcasts ResyncCompleted via ServicesHub")]
public async Task ResyncAsync_OnSuccess_BroadcastsResyncCompleted()
{
    var service = CreateService();
    await service.ResyncAsync();

    await _hubContext.Clients.All.Received(1)
        .SendAsync("ResyncCompleted", Arg.Any<object>(), Arg.Any<CancellationToken>());
}
```

---

### 6. AC-10: FakeFileWatcher `Simulate*` Methods Are Not Tested

**Severity**: P1 (High)
**Location**: `src/Fishtank.Api.UnitTests/Engine/FakeFileWatcherTests.cs`
**Criterion**: Coverage — AC-10

**Issue Description**:
AC-10 states: *"FakeFileWatcher triggers callbacks synchronously when test code calls `SimulateCreated(path)`, `SimulateChanged(path)`, etc."* The unit test `FakeFileWatcherContractTests` has a single test that uses reflection to confirm `IFileWatcher` has an `OnCreated` event — it does not instantiate `FakeFileWatcher` or call any `Simulate*` method.

The `FileWatcherContractTests` in the integration project tests the real interface contract, not the `FakeFileWatcher` fake's callback triggering. Architecture D6 ("no `Task.Delay` in tests") was specifically enabled by `FakeFileWatcher.SimulateCreated` providing synchronous callbacks; this capability is untested.

**Recommended Fix**:

```csharp
[Fact(DisplayName = "AC-10: FakeFileWatcher.SimulateCreated — triggers OnCreated callback synchronously")]
public void FakeFileWatcher_SimulateCreated_InvokesCallbackSynchronously()
{
    // Arrange
    var fake = new FakeFileWatcher();
    string? capturedPath = null;
    fake.OnCreated += path => capturedPath = path;

    // Act
    fake.SimulateCreated("service/mappings/test.json");

    // Assert
    capturedPath.Should().Be("service/mappings/test.json",
        "FakeFileWatcher.SimulateCreated must invoke OnCreated callback synchronously");
}
```

Add equivalent tests for `SimulateChanged`, `SimulateDeleted`, and `SimulateRenamed`.

---

### 7. AC-11 Conflict Detection Test Uses `Task.Delay` — Violates Project Rule D6

**Severity**: P2 (Medium)
**Location**: `src/Fishtank.Api.IntegrationTests/Api/Story4_1_MappingsEndpointsTests.cs` — `Resync_ExternallyModifiedFile_FlagsConflict`
**Criterion**: Hard Waits

**Issue Description**:
The AC-11 test uses `await Task.Delay(100)` to ensure a filesystem timestamp difference between the API write and the subsequent direct file modification. This is the pattern that `IFileWatcher` and `FakeFileWatcher` were introduced specifically to avoid (Architecture D6). The `Task.Delay` makes the test timing-dependent and slower than necessary.

The root cause is that the conflict detection test compares `LastWriteTime` on disk rather than using a `FakeFileWatcher` trigger, which bypasses the IFileWatcher abstraction.

**Recommended Fix**:

Replace `Task.Delay` with `File.SetLastWriteTimeUtc` to force a future timestamp without waiting:

```csharp
// Instead of:
await Task.Delay(100);
await File.WriteAllTextAsync(fullPath, "{\"externally\":\"modified\"}");

// Use:
await File.WriteAllTextAsync(fullPath, "{\"externally\":\"modified\"}");
File.SetLastWriteTimeUtc(fullPath, DateTimeOffset.UtcNow.AddSeconds(60).UtcDateTime);
```

---

### 8. AC-3 and AC-4 Assertions Are Incomplete — No Content/Disk Verification

**Severity**: P2 (Medium)
**Location**: `src/Fishtank.Api.IntegrationTests/Api/Story4_1_MappingsEndpointsTests.cs:133,197`
**Criterion**: Meaningful Assertions

**Issue Description**:
The AC-3 (Update) test asserts the HTTP 200 status and response path, but does not assert that the file content on disk was actually changed to the new value. The AC-4 (Delete) test asserts HTTP 200 with `data: null`, but does not assert that a subsequent `GET /api/mappings` or `GET /api/mappings/{path}` (if that endpoint exists) reflects the deletion.

Without these assertions, the tests would pass even if the service wrote the wrong content or did not delete the file.

**Recommended Fix (AC-3)**:

```csharp
// After the PUT response assertion, verify the content actually changed
var getResponse = await client.GetAsync($"/api/mappings/{filePath}");
var getData = (await getResponse.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
getData.GetProperty("content").GetString()
    .Should().Contain("/api/updated",
        "file content must be updated to the new value");
```

**Recommended Fix (AC-4)**:

```csharp
// Verify the file is actually gone
var getAfterDelete = await client.GetAsync($"/api/mappings/{filePath}");
getAfterDelete.StatusCode.Should().Be(HttpStatusCode.NotFound,
    "deleted file must return 404 on subsequent GET");
```

---

### 9. Missing Unauthenticated Test for DELETE /api/mappings/{path}

**Severity**: P2 (Medium)
**Location**: `src/Fishtank.Api.IntegrationTests/Api/Story4_1_MappingsEndpointsTests.cs`
**Criterion**: Coverage — AC-14 (Unauthenticated Requests Rejected)

**Issue Description**:
Three unauthenticated tests cover GET, PUT, and POST (resync), but `DELETE /api/mappings/{path}` is absent. All four endpoints must require authentication per NFR-8.

**Recommended Fix**:

```csharp
[Fact(DisplayName = "AC-14: Unauthenticated DELETE /api/mappings/{path} — returns HTTP 401")]
public async Task DeleteMapping_Unauthenticated_ReturnsHTTP401()
{
    var response = await Client.DeleteAsync("/api/mappings/test-path");
    response.StatusCode.Should().Be(HttpStatusCode.Unauthorized,
        "unauthenticated DELETE /api/mappings/{path} must return 401 (NFR-8)");
}
```

---

## Best Practices Found

### 1. GUID-Isolated Temp Directories

**Location**: `MappingServiceTests.cs:24`, `ResyncServiceTests.cs:33`
**Pattern**: Test Instance Isolation

Each test class constructor creates a unique directory via `Path.Combine(Path.GetTempPath(), "...", Guid.NewGuid().ToString())`. This guarantees zero cross-test interference even under parallel execution, and avoids cleanup ordering issues. Use this pattern as a reference for any future service tests that touch the filesystem.

---

### 2. Theory Data Sets for Security-Critical Paths

**Location**: `MappingServiceTests.cs:45-130`
**Pattern**: Parameterized boundary testing

The path-sanitization tests use `[Theory]` with four separate `[InlineData]` groups, each targeting a distinct attack surface:

```csharp
[Theory(DisplayName = "SanitizePath rejects direct ../ sequences")]
[InlineData("../etc/passwd")]
[InlineData("service/../../../etc/passwd")]
// ...
public async Task CreateFileAsync_DirectPathTraversal_ThrowsValidationException(string maliciousPath)
```

This is exactly the right approach for security boundaries — each attack vector is explicit, labeled, and independently reported. New attack patterns can be added as a single `[InlineData]` line with no structural change.

---

### 3. Documented Skip Reasons with Cross-Reference

**Location**: `ResyncServiceTests.cs:63`, `Story4_1_MappingsEndpointsTests.cs:595`
**Pattern**: Skip reason documentation

Both skipped tests explain *why* they are skipped and *where* the coverage is picked up:

```csharp
[Fact(Skip = "Timing-sensitive unit test: empty mocks root completes instantly, releasing lock before second call. AC-12 concurrent guard is fully covered by the integration test Story4_1_MappingsEndpointsTests.Resync_ConcurrentCalls_SecondCallReturns409.")]
```

This prevents skip-debt accumulation. Any reviewer can immediately assess whether the skip is acceptable without digging through other files.

---

### 4. Reflection-Based Interface Contract Tests

**Location**: `src/Fishtank.Api.IntegrationTests/Engine/FileWatcherContractTests.cs:22-140`
**Pattern**: Structural contract verification

Using reflection to assert event handler signatures, method return types, and `IDisposable` implementation is a strong pattern for interface contracts that need to remain stable across implementations:

```csharp
onCreatedEvent!.EventHandlerType.Should().Be(typeof(Action<string>),
    "OnCreated must accept Action<string> delegate");
```

This approach will catch breaking changes to the interface contract at compile-time (compilation failure) or test-time (reflection assertion failure), whichever comes first.

---

## Findings Summary

| # | Severity | Finding                                                               |
|---|----------|-----------------------------------------------------------------------|
| 1 | P0 Critical | AC-12 concurrent guard test has false-positive conditional assertion — passes when guard is absent |
| 2 | P0 Critical | AC-5 test tests path traversal (AC-13/AC-6), not I/O write failure — real AC-5 scenario untested |
| 3 | P1 High   | NFR-2 performance test runs against empty directory — not meaningful validation |
| 4 | P1 High   | AC-7/AC-8 error paths (MAPPING_FILE_EXISTS, MAPPING_FILE_NOT_FOUND) lack integration HTTP tests |
| 5 | P1 High   | AC-15 SignalR broadcast unverified — deferred to E2E with no concrete roadmap |
| 6 | P1 High   | AC-10 FakeFileWatcher `Simulate*` methods not tested |
| 7 | P2 Medium | `Task.Delay(100)` in AC-11 test violates Architecture D6 |
| 8 | P2 Medium | AC-3 update test doesn't verify file content was changed |
| 9 | P2 Medium | AC-4 delete test doesn't verify file removed from disk |
| 10 | P2 Medium | Missing unauthenticated DELETE test (AC-14 partial) |
| 11 | P3 Low    | `FakeFileWatcherContractTests` in UnitTests project is a thin 1-assertion stub |

---

## Recommendations Prioritized

### Must Fix Before Regression-Safe Sign-Off
1. **Finding #1** — Fix AC-12 false-positive by removing the conditional and asserting `statusCodes.Should().Contain(HttpStatusCode.Conflict)`
2. **Finding #2** — Rename AC-5 test to AC-13 variant; add real AC-5 I/O failure unit test asserting `ISystemEventService.CreateAsync` was called

### Should Fix in Near-Term
3. **Finding #3** — Seed 200 files in NFR-2 test
4. **Finding #4** — Add integration tests for duplicate creation (HTTP 409) and not-found (HTTP 404)
5. **Finding #6** — Add `FakeFileWatcher.SimulateCreated/Changed/Deleted/Renamed` tests

### Improve When Convenient
6. **Finding #5** — Add `IHubContext` mock assertion in `ResyncServiceTests` to verify SignalR broadcast
7. **Finding #7** — Replace `Task.Delay(100)` with `File.SetLastWriteTimeUtc`
8. **Findings #8-9** — Add content/disk-state assertions to AC-3 and AC-4
9. **Finding #10** — Add unauthenticated DELETE test
