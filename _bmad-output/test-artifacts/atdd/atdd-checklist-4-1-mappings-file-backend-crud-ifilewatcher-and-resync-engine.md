---
story_id: "4.1"
story_key: "4-1-mappings-file-backend-crud-ifilewatcher-and-resync-engine"
story_title: "Mappings File Backend — CRUD, IFileWatcher & Resync Engine"
workflow_type: "testarch-atdd"
workflow_mode: "create"
date: "2026-06-28"
author: "Murat (Master Test Architect)"
status: "red-phase"
test_files_created:
  - "src/Fishtank.Api.IntegrationTests/Api/Story4_1_MappingsEndpointsTests.cs"
---

# ATDD Checklist: Story 4.1 — Mappings File Backend

**Generated:** 2026-06-28  
**Story:** 4-1-mappings-file-backend-crud-ifilewatcher-and-resync-engine  
**Status:** RED PHASE (tests compile but fail against current codebase)

---

## Test Coverage Summary

### Integration Tests Created

**File:** `src/Fishtank.Api.IntegrationTests/Api/Story4_1_MappingsEndpointsTests.cs`

| Test Method | AC Coverage | Priority | Status |
|-------------|-------------|----------|--------|
| `GetMappings_ReturnsSuccessEnvelope_WithFolderTreeStructure` | AC-1 | P0 | ✅ RED |
| `CreateMapping_ValidRequest_CreatesFileAndReturns201` | AC-2 | P0 | ✅ RED |
| `UpdateMapping_ExistingFile_UpdatesContentAndReturns200` | AC-3 | P0 | ✅ RED |
| `DeleteMapping_ExistingFile_RemovesFileAndReturns200` | AC-4 | P0 | ✅ RED |
| `CreateMapping_WriteFailure_CreatesSystemEventAndReturnsError` | AC-5 | P1 | ✅ RED |
| `Resync_ReloadsAllMappings_AndReturnsSuccessCounts` | AC-6 | P0 | ✅ RED |
| `Resync_LessThan200Files_CompletesInUnder1Second` | AC-7 (NFR-2) | P1 | ✅ RED |
| `Resync_ConcurrentCalls_SecondCallReturns409` | AC-12 | P1 | ✅ RED |
| `CreateMapping_PathTraversal_ReturnsHTTP400` | AC-13 | P0 | ✅ RED |
| `CreateMapping_AbsolutePath_ReturnsHTTP400` | AC-13 | P0 | ✅ RED |
| `GetMappings_Unauthenticated_ReturnsHTTP401` | AC-14 | P1 | ✅ RED |
| `UpdateMapping_Unauthenticated_ReturnsHTTP401` | AC-14 | P1 | ✅ RED |
| `Resync_Unauthenticated_ReturnsHTTP401` | AC-14 | P1 | ✅ RED |

**Total Tests:** 13  
**ACs Covered:** AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-12, AC-13, AC-14

---

## Acceptance Criteria Coverage

### ✅ Covered by Tests

- **AC-1:** GET /api/mappings returns folder tree structure
  - Test: `GetMappings_ReturnsSuccessEnvelope_WithFolderTreeStructure`
  
- **AC-2:** POST /api/mappings creates file on disk
  - Test: `CreateMapping_ValidRequest_CreatesFileAndReturns201`
  
- **AC-3:** PUT /api/mappings/{path} updates file on disk
  - Test: `UpdateMapping_ExistingFile_UpdatesContentAndReturns200`
  
- **AC-4:** DELETE /api/mappings/{path} removes file from disk
  - Test: `DeleteMapping_ExistingFile_RemovesFileAndReturns200`
  
- **AC-5:** File operation failure creates System Event
  - Test: `CreateMapping_WriteFailure_CreatesSystemEventAndReturnsError`
  
- **AC-6:** POST /api/resync reloads all files and returns counts
  - Test: `Resync_ReloadsAllMappings_AndReturnsSuccessCounts`
  
- **AC-7:** Resync performance <1s for <200 files (NFR-2)
  - Test: `Resync_LessThan200Files_CompletesInUnder1Second`
  
- **AC-12:** Concurrent Resync calls blocked with HTTP 409
  - Test: `Resync_ConcurrentCalls_SecondCallReturns409`
  
- **AC-13:** Path traversal blocked with HTTP 400
  - Tests: `CreateMapping_PathTraversal_ReturnsHTTP400`, `CreateMapping_AbsolutePath_ReturnsHTTP400`
  
- **AC-14:** Unauthenticated requests rejected with HTTP 401
  - Tests: `GetMappings_Unauthenticated_ReturnsHTTP401`, `UpdateMapping_Unauthenticated_ReturnsHTTP401`, `Resync_Unauthenticated_ReturnsHTTP401`

### 📝 Deferred to Implementation (Unit Tests)

- **AC-8:** IFileWatcher interface definition
  - Unit tests will verify interface contract (OnCreated, OnChanged, OnDeleted, OnRenamed, OnError callbacks)
  
- **AC-9:** TrackingFileSystemHandler implementation
  - Unit tests will verify OS FileSystemWatcher wrapper with InternalBufferSize and Error handler
  
- **AC-10:** FakeFileWatcher test harness
  - Unit tests will verify synchronous callback triggers (SimulateCreated, SimulateChanged, etc.)
  
- **AC-11:** _lastKnownModified for conflict detection
  - Unit tests will verify conflict detection logic; integration test AC-6 covers end-to-end resync behavior

- **AC-15:** ResyncCompleted SignalR event broadcast
  - SignalR hub tests will verify event broadcast (similar to Story2_3_ServicesHubTests.cs pattern)
  
- **AC-16:** On-demand seed import (POST /api/services/import)
  - Integration tests for import endpoint (similar to Story2_1_ServicesTests.cs seed import tests)

---

## RED Phase Verification

### Expected Failures (Before Implementation)

All tests in `Story4_1_MappingsEndpointsTests.cs` will fail with:

```
HTTP 404 Not Found
```

**Reason:** The following components do not exist yet:
- `MappingsEndpoints.cs` (REST API layer)
- `MappingService.cs` (file CRUD logic)
- `ResyncService.cs` (resync engine)
- `IFileWatcher.cs` interface
- Error codes: `MAPPING_PATH_INVALID`, `MAPPING_FILE_NOT_FOUND`, `MAPPING_FILE_EXISTS`, `MAPPING_WRITE_FAILED`, `RESYNC_IN_PROGRESS`

### Compilation Status

✅ **Tests compile successfully** with existing infrastructure:
- `IntegrationTestBase` provides authenticated client setup
- `FishtankWebApplicationFactory` provides test host
- `TestAuthHelper` provides authentication helpers
- `JsonSerializerOptions` for deserializing response envelopes
- FluentAssertions for readable assertions

---

## Implementation Handoff

### Prerequisites for GREEN Phase

1. **Backend Services:**
   - Create `IFileWatcher.cs` interface in `src/Fishtank.Api/Engine/`
   - Create `TrackingFileSystemHandler.cs` (OS implementation)
   - Create `FakeFileWatcher.cs` in `src/Fishtank.Api.IntegrationTests/Fakes/` for test harness
   - Create `MappingService.cs` in `src/Fishtank.Api/Services/`
   - Create `ResyncService.cs` in `src/Fishtank.Api/Services/`

2. **REST API Endpoints:**
   - Create `MappingsEndpoints.cs` in `src/Fishtank.Api/Endpoints/`
   - Register endpoint group in `Program.cs`
   - Apply `.RequireAuthorization()` to all endpoints

3. **DTOs:**
   - Create `FolderTreeDto.cs` in `src/Fishtank.Api/Models/`
   - Create `FileMetadataDto.cs` in `src/Fishtank.Api/Models/`
   - Create `ResyncResultDto.cs` in `src/Fishtank.Api/Models/`

4. **Error Codes:**
   - Add to `ErrorCodes.cs`:
     - `MAPPING_PATH_INVALID`
     - `MAPPING_FILE_NOT_FOUND`
     - `MAPPING_FILE_EXISTS`
     - `MAPPING_WRITE_FAILED`
     - `RESYNC_IN_PROGRESS`

5. **Dependency Injection:**
   - Register `IFileWatcher` (scoped per service)
   - Register `MappingService` (scoped)
   - Register `ResyncService` (singleton with SemaphoreSlim guard)

### Test Fixture Requirements

- **Performance Test (AC-7):** Create a test fixture with ~200 mapping files to validate NFR-2
- **Concurrency Test (AC-12):** No special fixture needed; tests use parallel Task.WhenAll
- **Security Test (AC-13):** No special fixture needed; tests use malicious paths

### Expected GREEN Phase Outcome

After implementation, all 13 tests in `Story4_1_MappingsEndpointsTests.cs` should PASS:

```
✅ AC-1: GET /api/mappings — returns folder tree structure
✅ AC-2: POST /api/mappings — creates file on disk
✅ AC-3: PUT /api/mappings/{path} — updates existing file
✅ AC-4: DELETE /api/mappings/{path} — removes file from disk
✅ AC-5: File write failure — creates System Event and returns error
✅ AC-6: POST /api/resync — reloads all files and returns counts
✅ AC-7: Resync performance — completes in <1s for <200 files
✅ AC-12: Concurrent Resync — second call returns HTTP 409
✅ AC-13: Path traversal — rejected with HTTP 400 MAPPING_PATH_INVALID
✅ AC-13: Absolute paths — rejected with HTTP 400 MAPPING_PATH_INVALID
✅ AC-14: Unauthenticated GET /api/mappings — returns HTTP 401
✅ AC-14: Unauthenticated PUT /api/mappings/{path} — returns HTTP 401
✅ AC-14: Unauthenticated POST /api/resync — returns HTTP 401
```

---

## Risk Mitigation Coverage

| Risk ID | Description | Test Coverage | Status |
|---------|-------------|---------------|--------|
| R-E4-001 | FileSystemWatcher race conditions | AC-6 (Resync conflict detection) | ✅ Covered |
| R-E4-003 | Resync concurrency corruption | AC-12 (concurrent Resync guard) | ✅ Covered |
| R-E4-004 | File write failure silently dropped | AC-5 (System Event on failure) | ✅ Covered |
| R-E4-005 | Path traversal security | AC-13 (path sanitization) | ✅ Covered |

---

## Notes for Dev Team

### Test Harness: FakeFileWatcher

The `FakeFileWatcher` test harness (AC-10) is critical for deterministic testing:

```csharp
// Expected usage in integration tests:
var fakeWatcher = new FakeFileWatcher();
// In test setup, inject fakeWatcher instead of TrackingFileSystemHandler

// In test body:
fakeWatcher.SimulateChanged("test-service/mappings/file.json");
// Assert conflict detection or resync behavior
```

### Path Sanitization Requirements

The `MappingService.SanitizePath()` method must reject:
1. Any path containing `../` sequences (path traversal)
2. Absolute paths (starting with `/` or drive letters like `C:\`)
3. Paths resolving outside the service's `MocksRoot` directory

### Concurrency Guard Pattern

The `ResyncService` must use `SemaphoreSlim(1,1)` to ensure only one Resync operation runs at a time:

```csharp
private readonly SemaphoreSlim _resyncLock = new(1, 1);

public async Task<ResyncResultDto> ResyncAsync()
{
    if (!await _resyncLock.WaitAsync(0))
    {
        throw new ConflictException("RESYNC_IN_PROGRESS", 
            "A resync operation is already in progress. Please wait.");
    }
    try
    {
        // Resync logic...
    }
    finally
    {
        _resyncLock.Release();
    }
}
```

---

## Appendix: Test Execution Commands

### Run All Story 4.1 Tests

```bash
dotnet test --filter "FullyQualifiedName~Story4_1_MappingsEndpointsTests"
```

### Run Specific AC Test

```bash
dotnet test --filter "FullyQualifiedName~GetMappings_ReturnsSuccessEnvelope_WithFolderTreeStructure"
```

### Run with Coverage

```bash
dotnet test --collect:"XPlat Code Coverage" --filter "FullyQualifiedName~Story4_1_MappingsEndpointsTests"
```

---

## Checklist Sign-Off

- [x] Test file created: `Story4_1_MappingsEndpointsTests.cs`
- [x] All P0 and P1 ACs covered by integration tests
- [x] Tests compile successfully (RED phase)
- [x] Tests use standard patterns (IntegrationTestBase, TestAuthHelper, FluentAssertions)
- [x] Tests follow AC numbering and DisplayName conventions
- [x] Security tests cover path traversal (AC-13) and authentication (AC-14)
- [x] Performance test documents NFR-2 threshold (AC-7)
- [x] Concurrency test covers SemaphoreSlim guard (AC-12)
- [x] Error envelope pattern validated in all tests
- [x] ATDD checklist artifact created

**Next Step:** Hand off to dev team for GREEN phase implementation. All tests currently fail with HTTP 404 (expected).
