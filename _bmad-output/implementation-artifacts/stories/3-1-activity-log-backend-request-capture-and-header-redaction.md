---
story_id: "3.1"
epic: 3
story_key: 3-1-activity-log-backend-request-capture-and-header-redaction
story_title: "Activity Log Backend — Request Capture & Header Redaction"
status: done
priority: critical
---

# Story 3.1: Activity Log Backend — Request Capture & Header Redaction

## Story

**As a** developer,
**I want** all HTTP requests received by mock services to be captured in an in-memory activity log with sensitive headers automatically redacted,
**So that** the activity data is available for real-time monitoring and programmatic queries.

---

## Status

Ready for Dev

---

## Context

### Background

Epic 2 established the WireMock engine layer (`ServicesRegistry`, `IServicesRegistry`, `EngineStartup`), Services CRUD, System Events with SignalR notification, and the service cache management. All mock services are now running via WireMock.Net with per-service fault isolation.

This story implements the **backend observability layer** for Fishtank: capturing every HTTP request that hits any mock service, redacting sensitive headers at storage time, pushing new rows to connected clients via SignalR within 500ms (NFR-3), and exposing the activity data through REST endpoints.

**What this story delivers:**
- In-memory activity store (per-service, capped, cleared on container restart)
- Sensitive header redaction logic (`Authorization`, `Cookie`, `Set-Cookie`, `X-Api-Key`, `X-Auth-Token`, and any header containing `secret` or `token` case-insensitive)
- WireMock request observer integration to capture traffic
- `ActivityHub.cs` SignalR hub for real-time updates
- `GET /api/activity` with filters (serviceId, type, search) + pagination
- `DELETE /api/activity` to clear all logs
- Settings endpoint for header capture opt-in toggle

**What this story does NOT deliver (deferred to later Epic 3 stories):**
- Story 3.2: Network Activity UI page with real-time display
- Story 3.3: Filtering UI, auto-refresh, LIVE/PAUSED indicator
- Story 3.4: Row detail (Modal/Drawer/Panel) UI

### Current State Entering This Story

**Backend state (verified):**

- **`IServicesRegistry`** (`src/Fishtank.Api/Engine/IServicesRegistry.cs`) — singleton, exposes `GetAll()` returning `IReadOnlyDictionary<Guid, WireMockServer>`. Each WireMock instance is keyed by service GUID.
- **`ServicesRegistry`** (`src/Fishtank.Api/Engine/ServicesRegistry.cs`) — `ConcurrentDictionary<Guid, WireMockServer>` implementation registered as **singleton** in `Program.cs`.
- **`EngineStartup`** (`src/Fishtank.Api/Engine/EngineStartup.cs`) — `IHostedService` that starts all `Live` services at container startup. WireMock instances are configured with `ReadStaticMappings = true` and `ProxyAndRecordSettings` for upstream proxying.
- **`DefaultWireMockServerFactory`** (`src/Fishtank.Api/Engine/DefaultWireMockServerFactory.cs`) — creates WireMock servers with settings.
- **`ServicesHub.cs`** (`src/Fishtank.Api/Hubs/ServicesHub.cs`) — SignalR hub for service status changes, requires `[Authorize]`.
- **`EventsHub.cs`** (`src/Fishtank.Api/Hubs/EventsHub.cs`) — SignalR hub for system events, requires `[Authorize]`.
- **`FishtankDbContext`** — `Services` and `SystemEvents` DbSets with soft-delete filter.
- **`SettingsEndpoints.cs`** — currently has `GET /api/settings`. May need extension for activity settings.
- **`ServerConfigService`** — key-value config store in DB. Use for header capture opt-in flag.

**SignalR infrastructure (from Epic 2):**
- Hubs map at `/hubs/services` and `/hubs/events`
- All hubs require JWT cookie auth via `[Authorize]`
- `HUB_INVALIDATION_MAP` in `queryClient.ts` has `ServiceStatusChanged → [["services"]]` and `SystemEventCreated → [["events"]]`

### WireMock.Net 2.11.0 — Request/Response Logging API

WireMock.Net provides request/response observability through its logging mechanism. The key interfaces:

```csharp
// Each WireMockServer has a LogEntries property
var server = WireMockServer.Start(...);
IEnumerable<ILogEntry> entries = server.LogEntries;

// ILogEntry structure (simplified)
public interface ILogEntry
{
    Guid Guid { get; }
    DateTime RequestAt { get; }
    IRequestMessage RequestMessage { get; }
    IResponseMessage ResponseMessage { get; }
    IMappingModel? MappingModel { get; }         // null if proxied (no mapping matched)
    TimeSpan? ResponseTime { get; }              // Request duration
}

// IRequestMessage
public interface IRequestMessage
{
    string Url { get; }                          // Full URL with path
    string Path { get; }                         // Just the path portion
    string Method { get; }                       // HTTP method
    IDictionary<string, WireMockList<string>> Headers { get; }
    string? Body { get; }                        // Request body
}

// IResponseMessage
public interface IResponseMessage
{
    int StatusCode { get; }
    IDictionary<string, WireMockList<string>>? Headers { get; }
    string? BodyAsString { get; }                // Response body
}
```

**Approach for capturing activity:** WireMock provides `server.LogEntries` which is an in-memory list that grows unbounded. Instead of polling, we'll use WireMock's `RequestObserver` callback which fires synchronously after each request is processed:

```csharp
var settings = new WireMockServerSettings
{
    // ... other settings
    RequestObserver = (request, response, mapping) =>
    {
        // Called after every request — mapping is null if proxied
        // Fire-and-forget push to ActivityService
    }
};
```

**Alternative:** If `RequestObserver` is unavailable in WireMock.Net 2.11.0, poll `server.LogEntries` on a timer and track seen GUIDs. Check the NuGet package XML docs at implementation time.

### Header Redaction Rules (FR-10, NFR-9)

Headers to redact at storage time (values replaced with `[REDACTED]`):
1. **Exact match (case-insensitive):** `Authorization`, `Cookie`, `Set-Cookie`, `X-Api-Key`, `X-Auth-Token`
2. **Contains match (case-insensitive on header name):** Any header whose name contains `secret` or `token`

Examples:
- `Authorization: Bearer abc123` → `Authorization: [REDACTED]`
- `X-My-Secret-Key: xyz` → `X-My-Secret-Key: [REDACTED]`
- `CSRF-Token: abc` → `CSRF-Token: [REDACTED]`
- `x-refresh-token: foo` → `x-refresh-token: [REDACTED]`
- `Content-Type: application/json` → unchanged (no match)

**Opt-in full capture:** When `FISHTANK_CAPTURE_FULL_HEADERS` env var is set OR the Settings toggle is enabled, skip redaction entirely. This is a global setting (all services, all users). Does not un-redact previously stored values.

### Activity Log Data Model

```csharp
// In-memory only — NOT an EF entity, NOT persisted to DB
public record ActivityRow
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public DateTimeOffset Timestamp { get; init; }
    public string Method { get; init; } = string.Empty;
    public string UrlPath { get; init; } = string.Empty;
    public int StatusCode { get; init; }
    public ActivityType Type { get; init; }              // Mocked | Proxied
    public Guid ServiceId { get; init; }
    public string ServiceName { get; init; } = string.Empty;
    public int ServicePort { get; init; }
    public int DurationMs { get; init; }
    public Dictionary<string, string> RequestHeaders { get; init; } = new();
    public string? RequestBody { get; init; }
    public Dictionary<string, string> ResponseHeaders { get; init; } = new();
    public string? ResponseBody { get; init; }
}

public enum ActivityType { Mocked, Proxied }
```

### Activity Store Architecture

```
ActivityStore.cs       → ConcurrentDictionary<Guid, ConcurrentQueue<ActivityRow>>
                          keyed by ServiceId
                          singleton — one per process lifetime
                          enforces per-service row cap via configurable maximum

IActivityService.cs    → interface in Services/
ActivityService.cs     → orchestrates: captures from WireMock, applies redaction,
                          stores in ActivityStore, broadcasts via ActivityHub
```

### SignalR Hub Event (project-context.md)

| Hub | Event | Payload |
|---|---|---|
| `/hubs/activity` | `ActivityRowAdded` | `ActivityRowDto` |

Frontend will receive `ActivityRowAdded` and prepend the row to the UI list (SignalR append only — React Query not involved per project-context.md rule).

### Error Codes (ACTIVITY_* prefix)

| Code | HTTP | Description |
|---|---|---|
| `ACTIVITY_SERVICE_NOT_FOUND` | 404 | Service ID in filter does not exist |
| `ACTIVITY_INVALID_TYPE` | 400 | Type filter value not `Mocked` or `Proxied` |

---

## Acceptance Criteria

**AC-1 — Request capture to in-memory store:**
**Given** an HTTP request is received by any Live Service,
**When** the request is processed (matched or proxied),
**Then** an activity log entry is written to the per-service in-memory store with: request ID (GUID), datetime, HTTP method, URL path, HTTP status code, Type (Mocked|Proxied), service ID, service name, service port, response duration (ms), request headers (redacted), request body, response headers, response body.

**AC-2 — Sensitive header redaction at storage time:**
**Given** headers `Authorization`, `Cookie`, `Set-Cookie`, `X-Api-Key`, `X-Auth-Token`, and any header whose name contains "secret" or "token" (case-insensitive match on header name),
**When** the log entry is created,
**Then** those values are stored as `[REDACTED]` — cannot be un-redacted after storage.

**AC-3 — Full header capture opt-in:**
**Given** `FISHTANK_CAPTURE_FULL_HEADERS` env var is set to `true` OR the Settings toggle for header capture is enabled,
**When** a request is logged,
**Then** header values are stored as-is (no redaction applied).

**AC-4 — Header capture setting scope:**
**Given** the header capture opt-in setting (Settings → Activity),
**Then** it is instance-wide — a single global flag persisted in the database via `ServerConfigService`, affecting all services and all authenticated users simultaneously; the setting state is visible to all authenticated users, not Admin-only; toggling it does not retroactively un-redact previously stored `[REDACTED]` values.

**AC-5 — Per-service row cap with eviction:**
**Given** the per-service row cap is reached (configurable via `FISHTANK_ACTIVITY_LOG_MAX_ROWS`, default 5000),
**When** a new entry arrives for that service,
**Then** the oldest entry is pruned automatically (FIFO eviction).

**AC-6 — SignalR ActivityHub broadcasts:**
**Given** `ActivityHub.cs` at `/hubs/activity`,
**When** a new log entry is created,
**Then** an `ActivityRowAdded` event is broadcast to all connected clients within 500ms of the request being received (NFR-3); the hub requires JWT cookie authentication.

**AC-7 — GET /api/activity with filters:**
**Given** `GET /api/activity` with optional query parameters:
- `serviceId` (GUID) — filter to a specific service
- `type` (string: `Mocked` or `Proxied`) — filter by request type
- `search` (string) — case-insensitive contains match on URL path or HTTP method
- `skip` (int, default 0) — pagination offset
- `take` (int, default 50, max 200) — page size

**When** the endpoint is called,
**Then** matching entries are returned in the standard envelope, ordered by timestamp descending (newest first); authentication is required.

**AC-8 — DELETE /api/activity clears all logs:**
**Given** `DELETE /api/activity`,
**When** called by an authenticated user,
**Then** all in-memory entries for all services are cleared and the response is `{"success":true,"data":null}`.

**AC-9 — Activity data cleared on container restart:**
**Given** a container restart,
**Then** all activity log entries are cleared — the log is in-memory only and not persisted to the database.

**AC-10 — Settings endpoint for header capture toggle:**
**Given** `GET /api/settings`,
**When** called,
**Then** the response includes `captureFullHeaders: boolean` indicating the current opt-in state.

**Given** `PUT /api/settings/capture-headers` with body `{ "enabled": true|false }`,
**When** called by an authenticated user,
**Then** the setting is persisted via `ServerConfigService` and the response confirms the new state.

---

## Tasks / Subtasks

### Backend

- [ ] **Task B1: ActivityRow record and ActivityType enum** (AC: 1)
  - [ ] Create `src/Fishtank.Api/Models/ActivityRow.cs`
  - [ ] Record: `ActivityRow` with all fields as per Context section
  - [ ] Enum: `ActivityType { Mocked, Proxied }`
  - [ ] Create `src/Fishtank.Api/Models/ActivityRowDto.cs` for API/SignalR response

- [ ] **Task B2: IActivityStore + ActivityStore** (AC: 1, 5, 9)
  - [ ] Create `src/Fishtank.Api/Engine/IActivityStore.cs`
    - `void Add(Guid serviceId, ActivityRow row)`
    - `IReadOnlyList<ActivityRow> GetAll()`
    - `IReadOnlyList<ActivityRow> GetByService(Guid serviceId)`
    - `void Clear()`
    - `void ClearForService(Guid serviceId)`
  - [ ] Create `src/Fishtank.Api/Engine/ActivityStore.cs`
    - `ConcurrentDictionary<Guid, ConcurrentQueue<ActivityRow>>` keyed by serviceId
    - Register as **singleton** in `Program.cs`
    - Read `FISHTANK_ACTIVITY_LOG_MAX_ROWS` env var (default 5000)
    - On `Add()`: if queue.Count >= cap, TryDequeue oldest, then Enqueue new
    - `GetAll()`: flatten all queues, order by Timestamp descending
    - Thread-safe implementation

- [ ] **Task B3: HeaderRedactionService** (AC: 2, 3, 4)
  - [ ] Create `src/Fishtank.Api/Services/IHeaderRedactionService.cs`
    - `Dictionary<string, string> Redact(IDictionary<string, WireMockList<string>> headers)`
    - `bool IsRedactionEnabled { get; }` — checks env var + DB setting
  - [ ] Create `src/Fishtank.Api/Services/HeaderRedactionService.cs`
    - Inject `IServerConfigService` for DB setting lookup
    - Inject `IConfiguration` for env var
    - Redaction logic:
      - Exact match set: `Authorization`, `Cookie`, `Set-Cookie`, `X-Api-Key`, `X-Auth-Token` (case-insensitive)
      - Contains match: header name contains `secret` or `token` (case-insensitive)
    - If opt-in enabled, return headers as-is
    - Flatten `WireMockList<string>` to single string (comma-join if multiple values)
    - Register as **scoped** in `Program.cs`

- [ ] **Task B4: IActivityService + ActivityService** (AC: 1, 6)
  - [ ] Create `src/Fishtank.Api/Services/IActivityService.cs`
    - `Task CaptureAsync(Guid serviceId, string serviceName, int servicePort, ILogEntry logEntry)`
    - `Task<List<ActivityRowDto>> QueryAsync(Guid? serviceId, string? type, string? search, int skip, int take)`
    - `Task ClearAsync()`
  - [ ] Create `src/Fishtank.Api/Services/ActivityService.cs`
    - Inject: `IActivityStore`, `IHeaderRedactionService`, `IHubContext<ActivityHub>`
    - `CaptureAsync`: create `ActivityRow`, apply redaction, store, broadcast `ActivityRowAdded`
    - `QueryAsync`: filter, paginate, map to DTOs
    - `ClearAsync`: call `ActivityStore.Clear()`
    - Register as **scoped** in `Program.cs`

- [ ] **Task B5: ActivityHub SignalR hub** (AC: 6)
  - [ ] Create `src/Fishtank.Api/Hubs/ActivityHub.cs`
  - [ ] `[Authorize]` attribute — JWT cookie auth
  - [ ] Empty hub body (broadcast is via `IHubContext<ActivityHub>` from service)
  - [ ] Map hub at `/hubs/activity` in `Program.cs` after other hubs

- [ ] **Task B6: WireMock observer integration** (AC: 1, 6)
  - [ ] Modify `src/Fishtank.Api/Engine/DefaultWireMockServerFactory.cs` or `EngineStartup.cs`
  - [ ] Add `IActivityService` injection to the factory/startup
  - [ ] Configure WireMock `RequestObserver` callback (or `LogEntries` polling if observer unavailable)
  - [ ] On each request: lookup service info from `IServicesRegistry` or DB, call `ActivityService.CaptureAsync`
  - [ ] Determine `ActivityType`: if `mapping` is null → Proxied; else → Mocked

- [ ] **Task B7: ActivityEndpoints.cs** (AC: 7, 8)
  - [ ] Create `src/Fishtank.Api/Endpoints/ActivityEndpoints.cs`
  - [ ] `GET /api/activity` → `GetActivityAsync(...)` → validate filters, call `IActivityService.QueryAsync`, return envelope
    - Query params: `serviceId`, `type`, `search`, `skip`, `take`
    - Validate `type` if provided: must be `Mocked` or `Proxied`
    - Validate `serviceId` if provided: service must exist (404 if not)
  - [ ] `DELETE /api/activity` → `ClearActivityAsync(...)` → call `IActivityService.ClearAsync`, return `ApiResponse.Ok<object?>(null)`
  - [ ] Both endpoints `.RequireAuthorization()`
  - [ ] Map endpoints in `Program.cs`

- [ ] **Task B8: Settings endpoint for header capture** (AC: 4, 10)
  - [ ] UPDATE `src/Fishtank.Api/Endpoints/SettingsEndpoints.cs`
  - [ ] Add `captureFullHeaders` to `GET /api/settings` response
    - Read from `ServerConfigService.GetAsync("CaptureFullHeaders")` (default `false`)
  - [ ] Add `PUT /api/settings/capture-headers` endpoint
    - Body: `{ "enabled": true|false }`
    - Call `ServerConfigService.SetAsync("CaptureFullHeaders", enabled.ToString())`
    - Return `{ "success": true, "data": { "captureFullHeaders": enabled } }`
  - [ ] `.RequireAuthorization()` — no Admin-role check

- [ ] **Task B9: Program.cs registration** (AC: all)
  - [ ] Add `builder.Services.AddSingleton<IActivityStore, ActivityStore>();`
  - [ ] Add `builder.Services.AddScoped<IHeaderRedactionService, HeaderRedactionService>();`
  - [ ] Add `builder.Services.AddScoped<IActivityService, ActivityService>();`
  - [ ] Add `app.MapHub<ActivityHub>("/hubs/activity");` after `MapHub<EventsHub>`
  - [ ] Add `app.MapActivityEndpoints();` after `MapCacheEndpoints()`

### Tests

- [ ] **Task T1: HeaderRedactionService unit tests** (AC: 2, 3)
  - [ ] Create `src/Fishtank.Api.UnitTests/Services/HeaderRedactionServiceTests.cs`
  - [ ] Test: `Authorization` header redacted (exact match)
  - [ ] Test: `Cookie`, `Set-Cookie` headers redacted (exact match)
  - [ ] Test: `X-Api-Key`, `X-Auth-Token` headers redacted (exact match)
  - [ ] Test: `X-My-Secret-Key` redacted (contains `secret`)
  - [ ] Test: `CSRF-Token` redacted (contains `token`)
  - [ ] Test: `x-refresh-token` redacted (case-insensitive contains)
  - [ ] Test: `Content-Type`, `Accept` NOT redacted (no match)
  - [ ] Test: Opt-in enabled → no redaction applied
  - [ ] Mock `IServerConfigService` and `IConfiguration`

- [ ] **Task T2: ActivityStore unit tests** (AC: 1, 5, 9)
  - [ ] Create `src/Fishtank.Api.UnitTests/Engine/ActivityStoreTests.cs`
  - [ ] Test: Add row → retrievable via GetAll
  - [ ] Test: Add row for specific service → retrievable via GetByService
  - [ ] Test: FIFO eviction when cap reached
  - [ ] Test: Clear removes all entries
  - [ ] Test: ClearForService removes only that service's entries

- [ ] **Task T3: ActivityService unit tests** (AC: 1, 7)
  - [ ] Create `src/Fishtank.Api.UnitTests/Services/ActivityServiceTests.cs`
  - [ ] Test: CaptureAsync stores row and broadcasts via hub
  - [ ] Test: QueryAsync filters by serviceId
  - [ ] Test: QueryAsync filters by type
  - [ ] Test: QueryAsync filters by search (URL path contains)
  - [ ] Test: QueryAsync filters by search (method contains)
  - [ ] Test: QueryAsync pagination (skip/take)
  - [ ] Mock `IActivityStore`, `IHeaderRedactionService`, `IHubContext<ActivityHub>`

- [ ] **Task T4: Integration tests** (AC: 6, 7, 8, 10)
  - [ ] Create `src/Fishtank.Api.IntegrationTests/Api/Story3_1_ActivityTests.cs`
  - [ ] Test: `GET /api/activity` → 401 for unauthenticated
  - [ ] Test: `GET /api/activity` → 200 with `[]` for authenticated user with no activity
  - [ ] Test: `DELETE /api/activity` → 200 with `{"success":true,"data":null}`
  - [ ] Test: `GET /api/activity?type=Invalid` → 400 with `ACTIVITY_INVALID_TYPE`
  - [ ] Test: `GET /api/activity?serviceId={nonexistent}` → 404 with `ACTIVITY_SERVICE_NOT_FOUND`
  - [ ] Test: `PUT /api/settings/capture-headers` → updates setting
  - [ ] Test: `GET /api/settings` → includes `captureFullHeaders` field
  - [ ] Use `TestAuthHelper.CreateAuthenticatedClientAsync` pattern

- [ ] **Task T5: SignalR hub integration test** (AC: 6)
  - [ ] Add to or create SignalR hub tests
  - [ ] Test: Connect to `/hubs/activity` with valid auth → connection accepted
  - [ ] Test: Connect to `/hubs/activity` without auth → connection rejected
  - [ ] Use `HubConnectionTestHelper` with WAF `CreateHandler()`

---

## Dev Notes

### Architecture Constraints — Mandatory

- **No business logic in endpoint handlers** — `ActivityEndpoints.cs` calls `IActivityService` methods only. All WireMock interaction and redaction logic lives in services.
- **Never return EF entities** — activity data is in-memory only (not EF entities), but DTOs are still required for API responses.
- **Activity log is SignalR-only for frontend** — React Query NOT involved per `project-context.md`. Frontend will use SignalR append only in `useActivityLog.ts`.
- **IActivityStore is singleton** — thread-safe `ConcurrentDictionary<Guid, ConcurrentQueue<ActivityRow>>`.
- **IActivityService is scoped** — injects scoped services like `IHubContext`.
- **HeaderRedactionService is scoped** — needs `IServerConfigService` (EF-backed).

### WireMock.Net API — Request Observer

Check WireMock.Net 2.11.0 for `RequestObserver` or similar callback. If unavailable, implement a polling approach:

```csharp
// Fallback: poll LogEntries on a timer
private HashSet<Guid> _seenLogEntries = new();
private void PollLogEntries(WireMockServer server, Guid serviceId)
{
    foreach (var entry in server.LogEntries)
    {
        if (_seenLogEntries.Add(entry.Guid))
        {
            // New entry — capture it
            _activityService.CaptureAsync(serviceId, ..., entry);
        }
    }
}
```

Prefer `RequestObserver` if available — it's synchronous and guarantees <500ms latency.

### File Locations — New Files

```
src/
  Fishtank.Api/
    Models/
      ActivityRow.cs                              ← NEW
      ActivityRowDto.cs                           ← NEW
    Engine/
      IActivityStore.cs                           ← NEW
      ActivityStore.cs                            ← NEW
    Services/
      IHeaderRedactionService.cs                  ← NEW
      HeaderRedactionService.cs                   ← NEW
      IActivityService.cs                         ← NEW
      ActivityService.cs                          ← NEW
    Endpoints/
      ActivityEndpoints.cs                        ← NEW
      SettingsEndpoints.cs                        ← UPDATE (add capture-headers)
    Hubs/
      ActivityHub.cs                              ← NEW
    Program.cs                                    ← UPDATE
  Fishtank.Api.UnitTests/
    Services/
      HeaderRedactionServiceTests.cs              ← NEW
      ActivityServiceTests.cs                     ← NEW
    Engine/
      ActivityStoreTests.cs                       ← NEW
  Fishtank.Api.IntegrationTests/
    Api/
      Story3_1_ActivityTests.cs                   ← NEW
```

### File Locations — Updated Files

- `src/Fishtank.Api/Program.cs` — add DI registrations and endpoint mappings
- `src/Fishtank.Api/Endpoints/SettingsEndpoints.cs` — add `captureFullHeaders` to response, add PUT endpoint
- `src/Fishtank.Api/Engine/DefaultWireMockServerFactory.cs` OR `EngineStartup.cs` — add request observer

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `FISHTANK_ACTIVITY_LOG_MAX_ROWS` | `5000` | Per-service row cap before FIFO eviction |
| `FISHTANK_CAPTURE_FULL_HEADERS` | `false` | Disable header redaction (env var override) |

### SignalR HUB_INVALIDATION_MAP Update

Activity log uses SignalR-only (no React Query invalidation). The frontend will NOT add an entry to `HUB_INVALIDATION_MAP` for `ActivityRowAdded`. Instead, `useActivityLog.ts` will directly append rows from the hub event.

However, add `ActivityRowAdded` to the frontend SignalR type definitions for type safety.

### Test Design Reference

See `_bmad-output/test-artifacts/test-design-epic-3.md` for:
- Risk R-E3-003: Header redaction bypass — extensive unit test coverage required
- Risk R-E3-004: SignalR <500ms latency — integration test with stopwatch
- P0 test scenarios for this story

### Previous Story Learnings

From Epic 2 stories:
- `ServerConfigService` uses key-value pattern: `GetAsync(key)` returns `string?`, `SetAsync(key, value)` stores string
- `ApiResponse.Ok<T>()` wraps data in `{"success":true,"data":T}`
- `[Authorize]` on SignalR hubs requires JWT cookie auth — no additional config needed
- Integration tests use `TestAuthHelper.CreateAuthenticatedClientAsync()` pattern

---

## Definition of Done

Per `project-context.md`:

| # | Gate | Verified by |
|---|---|---|
| 1 | All unit tests pass | `dotnet test src/Fishtank.Api.UnitTests` |
| 2 | All integration tests pass | `dotnet test src/Fishtank.Api.IntegrationTests` |
| 3 | .NET builds clean — 0 errors, 0 warnings | `dotnet build src/Fishtank.slnx` |
| 4 | No new critical anti-patterns | Code review |
| 5 | Story status set to `done` in `sprint-status.yaml` | Manual / agent |

**Note:** This is a backend-only story. Frontend tasks, E2E tests, and TypeScript checks are in Stories 3.2–3.4.
