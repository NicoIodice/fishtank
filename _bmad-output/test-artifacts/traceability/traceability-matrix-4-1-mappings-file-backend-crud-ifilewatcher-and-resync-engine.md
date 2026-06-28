# Traceability Matrix — Story 4-1: Mappings File Backend CRUD, IFileWatcher, and Resync Engine

**Generated:** 2026-06-28  
**Story:** 4-1 — Mappings File Backend CRUD, IFileWatcher, and Resync Engine  
**Quality Gate Decision:** ⚠️ CONCERNS

---

## Test Suite Summary

| Suite | Pass | Skip | Fail | Total |
|-------|------|------|------|-------|
| Integration (`Story4_1_MappingsEndpointsTests`) | 15 | 1 | 0 | 16 |
| Integration (`FileWatcherContractTests`) | 10 | 0 | 0 | 10 |
| Unit (`MappingServiceTests`) | 10 | 0 | 0 | 10 |
| Unit (`ResyncServiceTests`) | 3 | 1 | 0 | 4 |
| Unit (`FakeFileWatcherContractTests`) | 1 | 0 | 0 | 1 |

> Note: The 126-test integration suite count includes all story integration tests in the project. Story 4-1 contributes ~25 integration tests (15 in `Story4_1_MappingsEndpointsTests` + 10 in `FileWatcherContractTests`) plus ~14 unit tests across two unit test classes, with 2 skips total.

---

## Traceability Matrix

### AC-1 — Create mapping file via API (POST /api/mappings)

| Test | File | Type | Status |
|------|------|------|--------|
| `CreateMapping_ValidRequest_CreatesFileAndReturns201` | `Story4_1_MappingsEndpointsTests.cs` | Integration | ✅ PASS |
| `CreateFileAsync_ValidRelativePath_Succeeds` ×4 | `MappingServiceTests.cs` | Unit | ✅ PASS |
| `CreateFileAsync_BackslashPath_NormalizedAndCreated` | `MappingServiceTests.cs` | Unit | ✅ PASS |

**Coverage:** ✅ FULL — HTTP 201 response, file metadata (path, lastModified), path normalisation all verified.

---

### AC-2 — Read mapping file via API (GET /api/mappings/{path})

| Test | File | Type | Status |
|------|------|------|--------|
| _(none)_ | — | — | ❌ NO TEST |

**Coverage:** ❌ NOT COVERED — No integration test for `GET /api/mappings/{path}`. No unit test for a `ReadFileAsync` / `GetFileAsync` method. This endpoint must exist (or be intentionally absent) for AC-2 to be resolved.

---

### AC-3 — Update mapping file via API (PUT /api/mappings/{path})

| Test | File | Type | Status |
|------|------|------|--------|
| `UpdateMapping_ExistingFile_UpdatesContentAndReturns200` | `Story4_1_MappingsEndpointsTests.cs` | Integration | ✅ PASS |

**Coverage:** ✅ FULL — HTTP 200 response and updated file metadata verified.

---

### AC-4 — Delete mapping file via API (DELETE /api/mappings/{path})

| Test | File | Type | Status |
|------|------|------|--------|
| `DeleteMapping_ExistingFile_RemovesFileAndReturns200` | `Story4_1_MappingsEndpointsTests.cs` | Integration | ✅ PASS |

**Coverage:** ✅ FULL — HTTP 200 with `data: null` envelope verified.

---

### AC-5 — List mappings via API (GET /api/mappings)

| Test | File | Type | Status |
|------|------|------|--------|
| `GetMappings_ReturnsSuccessEnvelope_WithFolderTreeStructure` | `Story4_1_MappingsEndpointsTests.cs` | Integration | ✅ PASS |

**Coverage:** ✅ FULL — HTTP 200, standard envelope, folder-tree object with `mocksRoot` property verified.

---

### AC-6 — Invalid path rejected (MAPPING_PATH_INVALID)

| Test | File | Type | Status |
|------|------|------|--------|
| `CreateMapping_WriteFailure_CreatesSystemEventAndReturnsError` | `Story4_1_MappingsEndpointsTests.cs` | Integration | ✅ PASS |
| `CreateMapping_PathTraversal_ReturnsHTTP400` | `Story4_1_MappingsEndpointsTests.cs` | Integration | ✅ PASS |
| `CreateMapping_AbsolutePath_ReturnsHTTP400` | `Story4_1_MappingsEndpointsTests.cs` | Integration | ✅ PASS |

**Coverage:** ✅ FULL — HTTP 400 with `MAPPING_PATH_INVALID` error code verified for both traversal and absolute-path inputs. (See also AC-13 for deeper unit-level coverage.)

---

### AC-7 — Duplicate file creation rejected (MAPPING_FILE_EXISTS)

| Test | File | Type | Status |
|------|------|------|--------|
| `CreateFileAsync_FileExists_ThrowsValidationException` | `MappingServiceTests.cs` | Unit | ✅ PASS |

**Coverage:** ⚠️ PARTIAL — Service-level exception and error code `MAPPING_FILE_EXISTS` verified. **No integration test** confirms HTTP 409 / 422 response from the endpoint. HTTP contract untested end-to-end.

---

### AC-8 — Not found on read/update/delete (MAPPING_FILE_NOT_FOUND)

| Test | File | Type | Status |
|------|------|------|--------|
| `UpdateFileAsync_FileNotFound_ThrowsNotFoundException` | `MappingServiceTests.cs` | Unit | ✅ PASS |
| `DeleteFileAsync_FileNotFound_ThrowsNotFoundException` | `MappingServiceTests.cs` | Unit | ✅ PASS |

**Coverage:** ⚠️ PARTIAL — Service-level `NotFoundException` with code `MAPPING_FILE_NOT_FOUND` verified. **No integration test** confirms HTTP 404 response for `PUT` or `DELETE` on a non-existent file. HTTP contract untested end-to-end.

---

### AC-9 — IFileWatcher abstraction (FakeFileWatcher for tests)

| Test | File | Type | Status |
|------|------|------|--------|
| `TrackingFileSystemHandler_HasCorrectInternalBufferSize` | `FileWatcherContractTests.cs` | Integration | ✅ PASS |
| `TrackingFileSystemHandler_IncludesSubdirectories` | `FileWatcherContractTests.cs` | Integration | ✅ PASS |

**Coverage:** ✅ FULL — `FakeFileWatcher` exists as a fully-implemented test harness (`Fakes/FakeFileWatcher.cs`); `TrackingFileSystemHandler` properties (buffer size 65536, recursive subdirectories) verified. `FakeFileWatcher` is used throughout the integration suite as a DI replacement.

---

### AC-10 — IFileWatcher contract test

| Test | File | Type | Status |
|------|------|------|--------|
| `IFileWatcher_DefinesOnCreatedEvent` | `FileWatcherContractTests.cs` | Integration | ✅ PASS |
| `IFileWatcher_DefinesOnChangedEvent` | `FileWatcherContractTests.cs` | Integration | ✅ PASS |
| `IFileWatcher_DefinesOnDeletedEvent` | `FileWatcherContractTests.cs` | Integration | ✅ PASS |
| `IFileWatcher_DefinesOnRenamedEvent` | `FileWatcherContractTests.cs` | Integration | ✅ PASS |
| `IFileWatcher_DefinesOnErrorEvent` | `FileWatcherContractTests.cs` | Integration | ✅ PASS |
| `IFileWatcher_DefinesStartMethod` | `FileWatcherContractTests.cs` | Integration | ✅ PASS |
| `IFileWatcher_DefinesStopMethod` | `FileWatcherContractTests.cs` | Integration | ✅ PASS |
| `IFileWatcher_ImplementsIDisposable` | `FileWatcherContractTests.cs` | Integration | ✅ PASS |
| `IFileWatcher_SupportsEventSubscription` | `FakeFileWatcherContractTests.cs` (Unit) | Unit | ✅ PASS |

**Coverage:** ✅ FULL — All interface members (OnCreated, OnChanged, OnDeleted, OnRenamed, OnError, Start, Stop, IDisposable) verified via reflection-based contract tests.

---

### AC-11 — Resync conflict detection — externally modified file flagged

| Test | File | Type | Status |
|------|------|------|--------|
| `Resync_ExternallyModifiedFile_FlagsConflict` | `Story4_1_MappingsEndpointsTests.cs` | Integration | ✅ PASS |

**Coverage:** ✅ FULL — File created via API, then modified directly on disk, resync triggered; `conflicts` array in response contains the modified file path.

---

### AC-12 — Resync concurrent guard (RESYNC_IN_PROGRESS)

| Test | File | Type | Status |
|------|------|------|--------|
| `Resync_ConcurrentCalls_SecondCallReturns409` | `Story4_1_MappingsEndpointsTests.cs` | Integration | ✅ PASS |
| `ResyncAsync_ConcurrentCalls_SecondThrowsValidationException` | `ResyncServiceTests.cs` | Unit | ⏭️ SKIP |

**Coverage:** ✅ FULL (at integration level) — Integration test fires two concurrent HTTP calls and asserts one returns 409 with `RESYNC_IN_PROGRESS`. Unit test skipped because the empty mocks root completes before the second call can be issued; the integration test is the definitive guard.

**Skip rationale:** Timing-sensitive unit test skipped by design; concurrent guard coverage delegated to integration layer.

---

### AC-13 — Path sanitization / traversal protection

| Test | File | Type | Status |
|------|------|------|--------|
| `CreateMapping_PathTraversal_ReturnsHTTP400` | `Story4_1_MappingsEndpointsTests.cs` | Integration | ✅ PASS |
| `CreateMapping_AbsolutePath_ReturnsHTTP400` | `Story4_1_MappingsEndpointsTests.cs` | Integration | ✅ PASS |
| `CreateFileAsync_DirectPathTraversal_ThrowsValidationException` ×4 | `MappingServiceTests.cs` | Unit | ✅ PASS |
| `CreateFileAsync_EncodedPathTraversal_ThrowsValidationException` ×2 | `MappingServiceTests.cs` | Unit | ✅ PASS |
| `CreateFileAsync_RepeatedPathTraversal_ThrowsValidationException` ×3 | `MappingServiceTests.cs` | Unit | ✅ PASS |
| `CreateFileAsync_AbsolutePath_ThrowsValidationException` ×4 | `MappingServiceTests.cs` | Unit | ✅ PASS |
| `CreateFileAsync_PathResolvingOutsideRoot_ThrowsValidationException` ×2 | `MappingServiceTests.cs` | Unit | ✅ PASS |

**Coverage:** ✅ FULL — Direct `../`, URL-encoded `%2F..`, repeated traversal, absolute paths, and paths resolving outside Mocks Root all blocked. 17 parametrized test cases + 2 integration tests. Strongest-covered AC in the story.

---

### AC-14 — Resync loads mappings correctly

| Test | File | Type | Status |
|------|------|------|--------|
| `Resync_ReloadsAllMappings_AndReturnsSuccessCounts` | `Story4_1_MappingsEndpointsTests.cs` | Integration | ✅ PASS |
| `ResyncAsync_SequentialCalls_BothSucceed` | `ResyncServiceTests.cs` | Unit | ✅ PASS |
| `ResyncAsync_EmptyMocksRoot_ReturnsZeroCounts` | `ResyncServiceTests.cs` | Unit | ✅ PASS |
| `ResyncAsync_NonExistentMocksRoot_ReturnsZeroCounts` | `ResyncServiceTests.cs` | Unit | ✅ PASS |

**Coverage:** ✅ FULL — `mappingsLoaded`, `responsesLoaded`, `elapsedMs`, `failures[]` in response verified; zero-count edge cases (empty and non-existent roots) covered.

---

### AC-15 — Resync triggers SignalR ResyncCompleted broadcast

| Test | File | Type | Status |
|------|------|------|--------|
| `Resync_Success_BroadcastsResyncCompletedEvent` | `Story4_1_MappingsEndpointsTests.cs` | Integration | ✅ PASS |

**Coverage:** ✅ SUFFICIENT (with noted limitation) — HTTP layer verified: 200 response with `mappingsLoaded` count. Full real-time SignalR broadcast verification (hub `ResyncCompleted` event received by a connected client) deferred to Playwright E2E tests, per in-code comment citing cookie-based auth complexity.

---

### AC-16 — POST /api/services/import (deferred)

| Test | File | Type | Status |
|------|------|------|--------|
| `ServicesImport_AdditiveImport_CreatesNewAndSkipsExisting` | `Story4_1_MappingsEndpointsTests.cs` | Integration | ⏭️ SKIP |

**Coverage:** ⏭️ EXPLICITLY DEFERRED — Test scaffold exists and is skipped with documented reason: "AC-16 /api/services/import endpoint is not implemented in story 4-1. Deferred to future story."

---

## Coverage Summary

| AC | Description | Tests | Status | Gate |
|----|-------------|-------|--------|------|
| AC-1 | Create mapping file (POST) | 6 | ✅ PASS | ✅ |
| AC-2 | Read mapping file (GET by path) | 0 | ❌ NONE | ❌ |
| AC-3 | Update mapping file (PUT) | 1 | ✅ PASS | ✅ |
| AC-4 | Delete mapping file (DELETE) | 1 | ✅ PASS | ✅ |
| AC-5 | List mappings (GET /api/mappings) | 1 | ✅ PASS | ✅ |
| AC-6 | Invalid path rejected | 3 | ✅ PASS | ✅ |
| AC-7 | Duplicate file (MAPPING_FILE_EXISTS) | 1 (unit) | ⚠️ PARTIAL | ⚠️ |
| AC-8 | Not found (MAPPING_FILE_NOT_FOUND) | 2 (unit) | ⚠️ PARTIAL | ⚠️ |
| AC-9 | IFileWatcher abstraction / FakeFileWatcher | 2 | ✅ PASS | ✅ |
| AC-10 | IFileWatcher contract test | 9 | ✅ PASS | ✅ |
| AC-11 | Resync conflict detection | 1 | ✅ PASS | ✅ |
| AC-12 | Resync concurrent guard | 1 pass + 1 skip | ✅ PASS | ✅ |
| AC-13 | Path sanitization / traversal | 19 | ✅ PASS | ✅ |
| AC-14 | Resync loads mappings | 4 | ✅ PASS | ✅ |
| AC-15 | Resync SignalR broadcast | 1 (partial) | ✅ PASS | ✅ |
| AC-16 | POST /api/services/import | 1 (skip) | ⏭️ DEFERRED | ⏭️ |

---

## Uncovered / Partially Covered ACs

### ❌ AC-2 — Read mapping file via API (GET /api/mappings/{path}) — NO COVERAGE

No test exists for reading a single mapping file by path. This may indicate:

1. **The endpoint was not implemented** — If `GET /api/mappings/{path}` was not built in this story, AC-2 should be deferred with a documented skip, similar to AC-16.
2. **The endpoint exists but is untested** — If the endpoint is implemented, an integration test is needed asserting HTTP 200, the file content, and proper envelope structure.
3. **AC-2 merged into AC-5** — The list endpoint may return full file content in the tree, making a per-path read endpoint unnecessary. If so, AC-2 should be formally closed against AC-5.

**Recommendation:** Clarify scope. If endpoint exists → add test. If deferred → add skip stub. If merged → close AC-2 with note.

---

### ⚠️ AC-7 — Duplicate file (MAPPING_FILE_EXISTS) — UNIT ONLY

Error code `MAPPING_FILE_EXISTS` validated at the service layer. The HTTP response code (expected: 409 Conflict) and response body are not verified at the integration level.

**Recommendation:** Add integration test: `POST /api/mappings` twice with the same path → assert HTTP 409 with `MAPPING_FILE_EXISTS` error code.

---

### ⚠️ AC-8 — Not found (MAPPING_FILE_NOT_FOUND) — UNIT ONLY

`NotFoundException` with code `MAPPING_FILE_NOT_FOUND` validated for `UpdateFileAsync` and `DeleteFileAsync` at the service layer. HTTP 404 responses for `PUT /api/mappings/{non-existent}` and `DELETE /api/mappings/{non-existent}` are not verified.

**Recommendation:** Add integration tests for both endpoints against non-existent paths → assert HTTP 404 with `MAPPING_FILE_NOT_FOUND` error code.

---

## Quality Gate Decision

**Decision: ⚠️ CONCERNS**

| Criterion | Result |
|-----------|--------|
| All ACs have at least one passing test | ❌ AC-2 has zero tests |
| All tests passing (excluding intentional skips) | ✅ 0 failures |
| No AC has only failed tests | ✅ |
| Intentional skips are documented | ✅ AC-12 unit skip and AC-16 deferred both documented |
| Critical security ACs (AC-13) covered | ✅ Excellent coverage (19 test cases) |

**Gate is CONCERNS, not FAIL**, because:
- AC-2 may legitimately be absent (endpoint not in scope, merged into AC-5, or deferred), but this is unresolved ambiguity rather than a confirmed gap.
- AC-7 and AC-8 have correct service-layer behaviour proven; HTTP contract risk is low given the framework's standard exception mapping.
- 0 failures across the full story's test suite.
- Security-critical AC-13 has the deepest test coverage in the story.

**Actions required before PASS:**

1. **AC-2:** Resolve scope — document as deferred, add integration test, or formally close against AC-5.
2. **AC-7:** Add integration test: duplicate `POST` → HTTP 409 `MAPPING_FILE_EXISTS`.
3. **AC-8:** Add integration tests: `PUT`/`DELETE` on non-existent path → HTTP 404 `MAPPING_FILE_NOT_FOUND`.

If AC-2 is confirmed out of scope and AC-7/AC-8 integration gaps are accepted as risk (service-layer coverage is sufficient), the gate may be upgraded to **PASS WITH NOTES**.
