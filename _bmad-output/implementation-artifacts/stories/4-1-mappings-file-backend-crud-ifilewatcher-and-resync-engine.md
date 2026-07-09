---
story_id: "4.1"
story_key: "4-1-mappings-file-backend-crud-ifilewatcher-and-resync-engine"
epic: 4
story_title: "Mappings File Backend — CRUD, IFileWatcher & Resync Engine"
status: ready-for-dev
priority: high
frs_covered:
  - FR-5 (on-demand seed import)
  - FR-17 (folder tree backend)
  - FR-18 (file CRUD)
  - FR-20 (Resync with conflict detection)
  - FR-22 (System Events for failures)
ux_drs_covered: []
nfrs_addressed:
  - NFR-2 (Resync <1s for <200 files)
  - NFR-8 (all API endpoints require auth)
  - NFR-13 (seed file read-only mount)
  - NFR-15 (destructive actions require confirmation — DELETE requires backend acknowledgment)
---

# Story 4.1: Mappings File Backend — CRUD, IFileWatcher & Resync Engine

## Story

**As a** developer,
**I want** the backend to support full file operations on Mapping and Response files and detect external file modifications reliably,
**So that** the UI can read, write, and sync mapping files from the volume-mounted filesystem.

---

## Status

ready-for-dev

---

## Context

### Background

Epic 4 delivers the file management and mock capture layer for Fishtank. **Story 4.1 establishes the backend foundation** for all file operations:
- REST API endpoints for file CRUD (`GET /api/mappings`, `POST /api/mappings`, `PUT /api/mappings/{path}`, `DELETE /api/mappings/{path}`)
- The `IFileWatcher` abstraction for detecting external file changes (required for conflict detection)
- The Resync engine (`POST /api/resync`) that reloads all Mapping/Response files from disk
- On-demand seed import endpoint (`POST /api/services/import`) for Admin Console use in Epic 5

This story **does not include any frontend UI** — the Mappings File Explorer (Story 4.2) and Resync UI (Story 4.3) consume these endpoints.

### What Exists (from previous epics)

**Backend infrastructure (Epic 1–3):**
- `FishtankDbContext.cs` — EF Core context with `Services`, `SystemEvents`, `Users` entities
- `ServiceManager.cs` — WireMock engine orchestration (per-service start/stop)
- `ServicesRegistry.cs` — in-memory service state tracking
- `ServicesEndpoints.cs`, `EventsEndpoints.cs`, `ActivityEndpoints.cs` — existing endpoint groups
- `ServicesHub.cs`, `EventsHub.cs`, `ActivityHub.cs` — SignalR hubs
- Response envelope pattern via `ApiResponse<T>` and `GlobalExceptionMiddleware`
- `FishtankException` hierarchy (`NotFoundException`, `ConflictException`, `ValidationException`)

**Existing file interactions:**
- `ServiceManager.cs` reads mappings from disk on service start via WireMock.Net's `ReadStaticMappings()`
- `FISHTANK_MOCKS_ROOT` env var defines the root path
- Each Service has `MocksRoot` (auto-generated from slug) pointing to its folder

**SignalR seam contract (`HUB_INVALIDATION_MAP` in `queryClient.ts`):**
```typescript
const HUB_INVALIDATION_MAP = {
  'ServiceStatusChanged': [['services']],
  'SystemEventCreated': [['events']],
  // ResyncCompleted → [['mappings']] — ADDED IN THIS STORY
} satisfies Record<string, QueryKey[]>;
```

### What This Story Delivers

1. **MappingService.cs** — file CRUD operations on volume-mounted filesystem
2. **IFileWatcher.cs** interface + `TrackingFileSystemHandler.cs` OS implementation + `FakeFileWatcher.cs` test harness
3. **`_lastKnownModified Dictionary<string, DateTimeOffset>`** per service for conflict detection
4. **MappingsEndpoints.cs** — REST API (`GET /api/mappings`, `POST`, `PUT`, `DELETE`)
5. **ResyncService.cs** — reload engine with `POST /api/resync`
6. **On-demand seed import** — `POST /api/services/import` (backend only; Admin Console UI in Epic 5)
7. **`ResyncCompleted` SignalR event** — broadcast on Resync success via `ServicesHub`

### Architecture Constraints (from project-context.md)

- **Response envelope** on all endpoints: `{"success":true,"data":{}}` / `{"success":false,"error":{...}}`
- **Error code prefixes:** `MAPPING_*` for file operation errors
- **Path traversal protection:** Reject any path containing `../` or absolute paths outside Mocks Root
- **Concurrent Resync guard:** `SemaphoreSlim(1,1)` — second call returns HTTP 409 `RESYNC_IN_PROGRESS`
- **File write failures → System Events:** Never silently ignore; always surface to user
- **No `Task.Delay` in tests:** `IFileWatcher` abstraction allows synchronous callback triggers

---

## Acceptance Criteria

### AC-1: GET /api/mappings Returns Folder Tree
**Given** `GET /api/mappings`,
**Then** it returns the complete folder tree structure (Mocks Root → service folders → mappings/ → responses/ → files) with file metadata (name, path, last modified) in the standard envelope (FR-17 backend).

### AC-2: POST /api/mappings Creates File
**Given** `POST /api/mappings` with `{ "path": "service-slug/mappings/new-mapping.json", "content": "..." }`,
**When** the file does not exist,
**Then** the file is created on disk at the specified path relative to Mocks Root; HTTP 201 is returned with the file metadata.

### AC-3: PUT /api/mappings Updates File
**Given** `PUT /api/mappings/{path}` with `{ "content": "..." }`,
**When** the file exists,
**Then** the file content is updated on disk; HTTP 200 is returned with updated metadata.

### AC-4: DELETE /api/mappings Removes File
**Given** `DELETE /api/mappings/{path}`,
**When** the file exists,
**Then** the file is removed from disk; HTTP 200 is returned with `{"success":true,"data":null}` (FR-18).

### AC-5: File Operation Failure Creates System Event
**Given** any file operation (`POST`, `PUT`, `DELETE`) fails (disk error, permission denied),
**Then** a System Event entry is created with severity `error`, the operation type, file path, and error details; an error response is returned — never silently ignored (FR-18, FR-22).

### AC-6: POST /api/resync Reloads All Files
**Given** `POST /api/resync`,
**Then** all Mapping and Response files are reloaded from disk for all services; the response includes: `mappingsLoaded` count, `responsesLoaded` count, `elapsedMs` duration, and `failures` array with per-file failure details for partial failures (FR-20 backend).

### AC-7: Resync Performance
**Given** Resync for a mapping set < 200 files,
**Then** it completes in under 1 second (NFR-2).

### AC-8: IFileWatcher Interface
**Given** the `IFileWatcher` interface in `Engine/IFileWatcher.cs`,
**Then** it defines callbacks: `OnCreated(path)`, `OnChanged(path)`, `OnDeleted(path)`, `OnRenamed(oldPath, newPath)`, and `OnError(exception)`.

### AC-9: TrackingFileSystemHandler Implementation
**Given** `TrackingFileSystemHandler.cs` implementing `IFileWatcher`,
**Then** it wraps the OS `FileSystemWatcher`, watching `mappings/` and `responses/` folders per service; `InternalBufferSize = 65536` is set to prevent buffer overflow on bulk operations; the `Error` event is handled and logs `ENGINE_FSW_BUFFER_OVERFLOW` warning.

### AC-10: FakeFileWatcher Test Harness
**Given** `FakeFileWatcher.cs` implementing `IFileWatcher`,
**Then** it triggers callbacks synchronously when test code calls `SimulateCreated(path)`, `SimulateChanged(path)`, etc. — no `Task.Delay` or OS timing dependencies (Architecture D6).

### AC-11: _lastKnownModified for Conflict Detection
**Given** the `_lastKnownModified Dictionary<string, DateTimeOffset>` per service,
**When** a file is loaded into the editor (via frontend — tracked by UI sending `lastModified` on `PUT`),
**Then** Resync compares each file's current `LastWriteTime` against the stored value; files whose `LastWriteTime` has advanced are flagged with `conflicted: true` in the Resync response (FR-20 conflict detection).

### AC-12: Concurrent Resync Blocked
**Given** a Resync operation is in progress,
**When** a second `POST /api/resync` is called,
**Then** HTTP 409 is returned with error code `RESYNC_IN_PROGRESS` and message "A resync operation is already in progress. Please wait." (concurrency guard via `SemaphoreSlim(1,1)`).

### AC-13: Path Traversal Blocked
**Given** any file operation with a path containing `../` or an absolute path outside Mocks Root,
**Then** HTTP 400 is returned with error code `MAPPING_PATH_INVALID` and message "Invalid path — path traversal or absolute paths are not allowed." (Security: R-E4-005).

### AC-14: Unauthenticated Requests Rejected
**Given** any file operation endpoint called without a valid JWT cookie,
**Then** HTTP 401 is returned (NFR-8).

### AC-15: ResyncCompleted SignalR Event
**Given** `POST /api/resync` completes (full success, partial success, or zero-files outcome),
**Then** `ServicesHub` broadcasts a `ResyncCompleted` event to all connected clients; `HUB_INVALIDATION_MAP` is updated with `ResyncCompleted: [["mappings"]]` (Architecture D7).

### AC-16: On-Demand Seed Import
**Given** `POST /api/services/import` with a seed file JSON payload,
**Then** same additive import behavior as container startup (new services created, existing by Slug skipped, port conflicts as System Event warnings); requires authentication (FR-5 on-demand path).

---

## Tasks / Subtasks

- [ ] **Task 1:** Create `IFileWatcher` interface and implementations (AC: 8, 9, 10)
  - [ ] 1.1 Create `src/Fishtank.Api/Engine/IFileWatcher.cs` with callback signatures
  - [ ] 1.2 Create `src/Fishtank.Api/Engine/TrackingFileSystemHandler.cs` wrapping OS `FileSystemWatcher`
  - [ ] 1.3 Set `InternalBufferSize = 65536` on each watcher instance
  - [ ] 1.4 Handle `watcher.Error` event → log `ENGINE_FSW_BUFFER_OVERFLOW` via Serilog
  - [ ] 1.5 Create `src/Fishtank.Api.IntegrationTests/Fakes/FakeFileWatcher.cs` with `SimulateCreated`, `SimulateChanged`, `SimulateDeleted`, `SimulateRenamed`
  - [ ] 1.6 Register `IFileWatcher` in DI (scoped per service — created when service starts)

- [ ] **Task 2:** Create `MappingService.cs` for file CRUD (AC: 2, 3, 4, 5, 11, 13)
  - [ ] 2.1 Create `src/Fishtank.Api/Services/MappingService.cs`
  - [ ] 2.2 Implement `GetFolderTreeAsync()` returning nested folder/file structure
  - [ ] 2.3 Implement `CreateFileAsync(path, content)` with path sanitization
  - [ ] 2.4 Implement `UpdateFileAsync(path, content, lastKnownModified)` with conflict check
  - [ ] 2.5 Implement `DeleteFileAsync(path)` with existence check
  - [ ] 2.6 Implement `SanitizePath(path)` rejecting `../` and absolute paths outside Mocks Root
  - [ ] 2.7 Create/update `_lastKnownModified` dictionary on file operations
  - [ ] 2.8 On any file write failure → create System Event via `SystemEventService`

- [ ] **Task 3:** Create `ResyncService.cs` for Resync engine (AC: 6, 7, 12, 15)
  - [ ] 3.1 Create `src/Fishtank.Api/Services/ResyncService.cs`
  - [ ] 3.2 Implement `ResyncAsync()` with `SemaphoreSlim(1,1)` guard
  - [ ] 3.3 Reload mappings/responses for all services via `ServiceManager`
  - [ ] 3.4 Compare `LastWriteTime` against `_lastKnownModified` for conflict detection
  - [ ] 3.5 Build response with `mappingsLoaded`, `responsesLoaded`, `elapsedMs`, `failures[]`
  - [ ] 3.6 Inject `IHubContext<ServicesHub>` and broadcast `ResyncCompleted` event on completion
  - [ ] 3.7 Register `ResyncService` as singleton in DI

- [ ] **Task 4:** Create `MappingsEndpoints.cs` REST API (AC: 1, 2, 3, 4, 14)
  - [ ] 4.1 Create `src/Fishtank.Api/Endpoints/MappingsEndpoints.cs`
  - [ ] 4.2 Implement `GET /api/mappings` → `MappingService.GetFolderTreeAsync()`
  - [ ] 4.3 Implement `POST /api/mappings` → `MappingService.CreateFileAsync()`
  - [ ] 4.4 Implement `PUT /api/mappings/{**path}` → `MappingService.UpdateFileAsync()` (catch-all route for nested paths)
  - [ ] 4.5 Implement `DELETE /api/mappings/{**path}` → `MappingService.DeleteFileAsync()`
  - [ ] 4.6 Implement `POST /api/resync` → `ResyncService.ResyncAsync()`
  - [ ] 4.7 Add `.RequireAuthorization()` to all endpoints
  - [ ] 4.8 Register endpoint group in `Program.cs`

- [ ] **Task 5:** Implement on-demand seed import (AC: 16)
  - [ ] 5.1 Create `POST /api/services/import` in `ServicesEndpoints.cs` (or new endpoint group)
  - [ ] 5.2 Reuse existing seed import logic from `EngineStartup.cs` → extract to `SeedImportService.cs`
  - [ ] 5.3 Add `.RequireAuthorization()` to import endpoint

- [ ] **Task 6:** Update `HUB_INVALIDATION_MAP` (AC: 15)
  - [ ] 6.1 Update `src/client/src/lib/queryClient.ts` to add `'ResyncCompleted': [['mappings']]`

- [ ] **Task 7:** Create DTOs and error codes
  - [ ] 7.1 Create `src/Fishtank.Api/Models/FolderTreeDto.cs` (nested structure)
  - [ ] 7.2 Create `src/Fishtank.Api/Models/FileMetadataDto.cs` (name, path, lastModified, size)
  - [ ] 7.3 Create `src/Fishtank.Api/Models/ResyncResultDto.cs` (mappingsLoaded, responsesLoaded, elapsedMs, failures)
  - [ ] 7.4 Add error codes to `ErrorCodes.cs`: `MAPPING_PATH_INVALID`, `MAPPING_FILE_NOT_FOUND`, `MAPPING_FILE_EXISTS`, `MAPPING_WRITE_FAILED`, `RESYNC_IN_PROGRESS`

- [ ] **Task 8:** Unit tests (AC: all)
  - [ ] 8.1 Test `SanitizePath` rejects `../` sequences
  - [ ] 8.2 Test `SanitizePath` rejects absolute paths outside Mocks Root
  - [ ] 8.3 Test `SanitizePath` allows valid relative paths
  - [ ] 8.4 Test `FakeFileWatcher` triggers callbacks synchronously
  - [ ] 8.5 Test `ResyncService` concurrent call returns `RESYNC_IN_PROGRESS`
  - [ ] 8.6 Test conflict detection logic (`LastWriteTime` comparison)

- [ ] **Task 9:** Integration tests (AC: 1, 2, 3, 4, 5, 6, 12, 13, 14)
  - [ ] 9.1 Test `GET /api/mappings` returns folder tree structure
  - [ ] 9.2 Test `POST /api/mappings` creates file on disk
  - [ ] 9.3 Test `PUT /api/mappings/{path}` updates file on disk
  - [ ] 9.4 Test `DELETE /api/mappings/{path}` removes file from disk
  - [ ] 9.5 Test file write failure creates System Event + returns error
  - [ ] 9.6 Test `POST /api/resync` reloads all files and returns counts
  - [ ] 9.7 Test Resync detects externally modified file → conflict flag
  - [ ] 9.8 Test concurrent Resync calls → first succeeds, second returns 409
  - [ ] 9.9 Test Resync <200 files completes in ≤1000ms (NFR-2)
  - [ ] 9.10 Test path traversal attempt → HTTP 400 `MAPPING_PATH_INVALID`
  - [ ] 9.11 Test unauthenticated `PUT /api/mappings/{path}` → HTTP 401
  - [ ] 9.12 Test `ResyncCompleted` SignalR event broadcast on Resync success
  - [ ] 9.13 Test `POST /api/services/import` additive import behavior

---

## Dev Notes

### Architecture Patterns & Constraints

**File service architecture:**
```
MappingsEndpoints.cs (REST API layer)
    │
    ├── MappingService.cs (file CRUD + path sanitization)
    │   ├── FileSystem I/O (System.IO)
    │   ├── _lastKnownModified tracking
    │   └── SystemEventService (on failure)
    │
    └── ResyncService.cs (reload engine)
        ├── SemaphoreSlim(1,1) guard
        ├── ServiceManager (WireMock reload)
        ├── _lastKnownModified comparison
        └── ServicesHub (ResyncCompleted broadcast)
```

**IFileWatcher per-service lifecycle:**
```csharp
// In ServiceManager.cs when a service starts:
var watcher = _fileWatcherFactory.CreateWatcher(service.MocksRoot);
watcher.OnChanged += (path) => _lastKnownModified[path] = DateTimeOffset.UtcNow;
watcher.Start();
_watchers[service.Id] = watcher;
```

### File Locations

**New files to create:**
```
src/Fishtank.Api/
├── Engine/
│   ├── IFileWatcher.cs              ← NEW: interface
│   └── TrackingFileSystemHandler.cs ← NEW: OS FileSystemWatcher wrapper
├── Services/
│   ├── MappingService.cs            ← NEW: file CRUD
│   ├── ResyncService.cs             ← NEW: Resync engine
│   └── SeedImportService.cs         ← NEW: extracted from EngineStartup.cs
├── Endpoints/
│   └── MappingsEndpoints.cs         ← NEW: REST API
├── Models/
│   ├── FolderTreeDto.cs             ← NEW
│   ├── FileMetadataDto.cs           ← NEW
│   └── ResyncResultDto.cs           ← NEW

src/Fishtank.Api.IntegrationTests/
└── Fakes/
    └── FakeFileWatcher.cs           ← NEW: test harness

src/client/src/lib/
└── queryClient.ts                   ← UPDATE: add ResyncCompleted
```

**Existing files to update:**
- `src/Fishtank.Api/Program.cs` — register `MappingsEndpoints`, `MappingService`, `ResyncService`
- `src/Fishtank.Api/Engine/ServiceManager.cs` — integrate `IFileWatcher` per service
- `src/Fishtank.Api/Endpoints/ServicesEndpoints.cs` — add `POST /api/services/import`

### API Contract

**GET /api/mappings**
```json
{
  "success": true,
  "data": {
    "root": "/mocks",
    "children": [
      {
        "name": "payments-api",
        "type": "folder",
        "path": "payments-api",
        "children": [
          {
            "name": "mappings",
            "type": "folder",
            "path": "payments-api/mappings",
            "children": [
              {
                "name": "charge-success.json",
                "type": "file",
                "path": "payments-api/mappings/charge-success.json",
                "lastModified": "2026-06-28T14:32:00.000Z",
                "sizeBytes": 1024
              }
            ]
          }
        ]
      }
    ]
  }
}
```

**POST /api/mappings**
```json
// Request
{ "path": "payments-api/mappings/new-mapping.json", "content": "{...}" }

// Response (201 Created)
{
  "success": true,
  "data": {
    "name": "new-mapping.json",
    "path": "payments-api/mappings/new-mapping.json",
    "lastModified": "2026-06-28T14:32:00.000Z",
    "sizeBytes": 256
  }
}
```

**PUT /api/mappings/{**path}**
```json
// Request
{ "content": "{...}", "lastKnownModified": "2026-06-28T14:30:00.000Z" }

// Response (200 OK)
{
  "success": true,
  "data": {
    "name": "charge-success.json",
    "path": "payments-api/mappings/charge-success.json",
    "lastModified": "2026-06-28T14:32:00.000Z",
    "sizeBytes": 1024
  }
}
```

**POST /api/resync**
```json
// Response (200 OK)
{
  "success": true,
  "data": {
    "mappingsLoaded": 42,
    "responsesLoaded": 38,
    "elapsedMs": 234,
    "conflicts": [
      {
        "path": "payments-api/mappings/charge-success.json",
        "reason": "File modified externally since last load"
      }
    ],
    "failures": [
      {
        "path": "weather-api/mappings/broken.json",
        "reason": "Invalid JSON: Unexpected token at position 45"
      }
    ]
  }
}
```

### Error Codes (MAPPING_* prefix)

| Code | HTTP | Description |
|------|------|-------------|
| `MAPPING_PATH_INVALID` | 400 | Path contains `../` or is absolute outside Mocks Root |
| `MAPPING_FILE_NOT_FOUND` | 404 | File does not exist (for PUT/DELETE) |
| `MAPPING_FILE_EXISTS` | 409 | File already exists (for POST when file exists) |
| `MAPPING_WRITE_FAILED` | 500 | Disk error or permission denied on write |
| `RESYNC_IN_PROGRESS` | 409 | Another Resync operation is running |

### Path Sanitization Logic

```csharp
public static class PathSanitizer
{
    public static string Sanitize(string relativePath, string mocksRoot)
    {
        // Normalize separators
        var normalized = relativePath.Replace('\\', '/');
        
        // Reject path traversal
        if (normalized.Contains("../") || normalized.Contains("/.."))
            throw new ValidationException("MAPPING_PATH_INVALID", 
                "Path traversal sequences are not allowed.");
        
        // Reject absolute paths
        if (Path.IsPathRooted(normalized))
            throw new ValidationException("MAPPING_PATH_INVALID", 
                "Absolute paths are not allowed.");
        
        // Combine and verify result is under Mocks Root
        var fullPath = Path.GetFullPath(Path.Combine(mocksRoot, normalized));
        var normalizedRoot = Path.GetFullPath(mocksRoot);
        
        if (!fullPath.StartsWith(normalizedRoot, StringComparison.OrdinalIgnoreCase))
            throw new ValidationException("MAPPING_PATH_INVALID", 
                "Path resolves outside the Mocks Root directory.");
        
        return fullPath;
    }
}
```

### Conflict Detection Flow

```
1. User opens file in editor (Story 4.2)
   → Frontend sends GET request, stores lastModified timestamp

2. External modification occurs (git pull, another user, etc.)
   → IFileWatcher.OnChanged fires
   → _lastKnownModified[path] updated to new LastWriteTime

3. User triggers Resync
   → ResyncService compares each file's current LastWriteTime 
     against _lastKnownModified
   → Files with advanced timestamps flagged as "conflicts"

4. Frontend receives ResyncResult with conflicts array
   → Story 4.3 renders conflict banners in UI
```

### IFileWatcher Interface

```csharp
namespace Fishtank.Api.Engine;

public interface IFileWatcher : IDisposable
{
    event Action<string> OnCreated;
    event Action<string> OnChanged;
    event Action<string> OnDeleted;
    event Action<string, string> OnRenamed; // oldPath, newPath
    event Action<Exception> OnError;
    
    void Start();
    void Stop();
}
```

### FakeFileWatcher Test Harness

```csharp
namespace Fishtank.Api.IntegrationTests.Fakes;

public class FakeFileWatcher : IFileWatcher
{
    public event Action<string>? OnCreated;
    public event Action<string>? OnChanged;
    public event Action<string>? OnDeleted;
    public event Action<string, string>? OnRenamed;
    public event Action<Exception>? OnError;
    
    public void SimulateCreated(string path) => OnCreated?.Invoke(path);
    public void SimulateChanged(string path) => OnChanged?.Invoke(path);
    public void SimulateDeleted(string path) => OnDeleted?.Invoke(path);
    public void SimulateRenamed(string oldPath, string newPath) => OnRenamed?.Invoke(oldPath, newPath);
    public void SimulateError(Exception ex) => OnError?.Invoke(ex);
    
    public void Start() { } // No-op for tests
    public void Stop() { }  // No-op for tests
    public void Dispose() { }
}
```

### Test Design Reference

See `_bmad-output/test-artifacts/test-design/test-design-epic-4.md` for:
- Risk assessment (R-E4-001 FileSystemWatcher races, R-E4-005 path traversal)
- NFR validation thresholds
- Complete test scenario coverage by priority

### Dependencies

| Dependency | Source | Status |
|------------|--------|--------|
| WireMock engine with proxied requests | Epic 2–3 | ✅ Complete |
| ServicesHub SignalR infrastructure | Epic 2 | ✅ Complete |
| SystemEventService for failure logging | Epic 2 | ✅ Complete |
| Response envelope pattern | Epic 1 | ✅ Complete |
| Seed import logic (to extract) | `EngineStartup.cs` | ✅ Exists |

### Anti-Patterns to Avoid (from project-context.md)

| ❌ Anti-pattern | ✅ Correct |
|----------------|-----------|
| Business logic in endpoint handlers | Move to `MappingService` / `ResyncService` |
| Silently swallowing file write failures | Create System Event + return error response |
| `Task.Delay` in FSW tests | Use `FakeFileWatcher` with synchronous callbacks |
| Raw `FileSystemWatcher` without buffer config | Set `InternalBufferSize = 65536` |
| Path validation only in application code | Use `PathSanitizer` utility + defense in depth |

### DoD Gates for This Story

| # | Gate | Verified by |
|---|------|-------------|
| 1 | All integration tests pass | `dotnet test src/Fishtank.Api.IntegrationTests` |
| 2 | .NET builds clean — 0 errors, 0 warnings | `dotnet build src/Fishtank.slnx` |
| 3 | Path traversal protection validated | Unit + integration tests |
| 4 | Resync <1s for 200 files (NFR-2) | Integration test with fixture |
| 5 | `IFileWatcher` + `FakeFileWatcher` operational | Unit tests |
| 6 | `HUB_INVALIDATION_MAP` updated | Code review |
| 7 | Story status set to `done` | `sprint-status.yaml` |
