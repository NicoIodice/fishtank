---
story_key: 3-1-activity-log-backend-request-capture-and-header-redaction
generated: 2026-06-27
verdict: PASS
blocker_count: 0
concern_count: 1
---

# NFR Assessment — Story 3.1

**Story:** Activity Log Backend — Request Capture & Header Redaction  
**Scope:** New code paths only  
**Assessor:** Master Test Architect (NFR Audit Skill)  
**Date:** 2026-06-27

---

## 1. PERFORMANCE

### NFR-3: SignalR Broadcast Within 500ms

| Criterion | Evidence | Verdict |
|---|---|---|
| Polling interval ≤250ms | `ActivityPollingService.cs` L25: `TimeSpan.FromMilliseconds(250)` — timer fires every 250ms | ✅ |
| Broadcast is async | `ActivityService.cs` L18: `await hub.Clients.All.SendAsync("ActivityRowAdded", dto)` | ✅ |
| No artificial delays introduced | No `Task.Delay` or blocking calls between capture and broadcast | ✅ |
| **Worst-case latency** | 250ms (poll interval) + minimal processing (~5ms) = ~255ms << 500ms | **PASS** |

### NFR-ACTIVITY: Row Cap with FIFO Eviction

| Criterion | Evidence | Verdict |
|---|---|---|
| Cap enforced | `ActivityStore.cs` L29-33: `while (queue.Count > _maxRowsPerService) queue.TryDequeue(out _)` | ✅ |
| Default cap documented | `ActivityStore.cs` L18: default = 5000, configurable via `FISHTANK_ACTIVITY_LOG_MAX_ROWS` | ✅ |
| No unbounded memory growth | ConcurrentQueue per service, FIFO eviction on overflow | ✅ |
| **Memory safety** | Bounded queues with automatic eviction | **PASS** |

### QueryAsync Efficiency

| Criterion | Evidence | Verdict |
|---|---|---|
| ServiceId filter applied early | `ActivityStore.GetAll(serviceId)` filters at retrieval time before sorting | ✅ |
| Ordering by timestamp desc | `ActivityStore.cs` L41-47: `.OrderByDescending(r => r.Timestamp)` | ✅ |
| Skip/Take bounded | `ActivityEndpoints.cs` L38-39: skip ≥0, take clamped 1–200 | ✅ |
| **Query efficiency** | In-memory data, O(n) filter acceptable for 5000-row cap | **PASS** |

---

## 2. SECURITY

### OWASP A02 — Cryptographic Failures (Header Redaction)

| Criterion | Evidence | Verdict |
|---|---|---|
| `Authorization` redacted | `HeaderRedactionService.cs` L13: exact match set | ✅ |
| `Cookie` redacted | `HeaderRedactionService.cs` L14: exact match set | ✅ |
| `Set-Cookie` redacted | `HeaderRedactionService.cs` L15: exact match set | ✅ |
| `X-Api-Key` redacted | `HeaderRedactionService.cs` L16: exact match set | ✅ |
| `X-Auth-Token` redacted | `HeaderRedactionService.cs` L17: exact match set | ✅ |
| Headers containing "secret" | `HeaderRedactionService.cs` L52: `.Contains("SECRET")` case-insensitive | ✅ |
| Headers containing "token" | `HeaderRedactionService.cs` L53: `.Contains("TOKEN")` case-insensitive | ✅ |
| Request headers redacted | `ActivityPollingService.cs` L103: `RequestHeaders = headerRedaction.Redact(row.RequestHeaders)` | ✅ |
| Response headers redacted | `ActivityPollingService.cs` L104: `ResponseHeaders = headerRedaction.Redact(row.ResponseHeaders)` | ✅ |
| Redaction at storage time | Redaction applied before `activityService.CaptureAsync(row)` at L106 | ✅ |
| **Sensitive data protection** | All required headers redacted before storage | **PASS** |

### OWASP A01 — Broken Access Control

| Endpoint | Auth Required | Evidence | Verdict |
|---|---|---|---|
| `GET /api/activity` | ✅ | `ActivityEndpoints.cs` L11: `.RequireAuthorization()` | ✅ |
| `DELETE /api/activity` | ✅ | `ActivityEndpoints.cs` L12: `.RequireAuthorization()` | ✅ |
| `PUT /api/settings/capture-headers` | ✅ | `SettingsEndpoints.cs` L11: `.RequireAuthorization()` | ✅ |
| `GET /api/settings` | ✅ | `SettingsEndpoints.cs` L10: `.RequireAuthorization()` | ✅ |
| `ActivityHub` SignalR | ✅ | `ActivityHub.cs` L6: `[Authorize]` attribute | ✅ |
| **Access control** | All activity endpoints require authentication | **PASS** |

### OWASP A03 — Injection

| Parameter | Type | Sanitization | Verdict |
|---|---|---|---|
| `serviceId` | `Guid?` | Parsed by ASP.NET routing; validated against DB | ✅ |
| `type` | `string?` | `Enum.TryParse<ActivityType>` — whitelist validation | ✅ |
| `search` | `string?` | Used only in `String.Contains()` — no DB/shell/command use | ✅ |
| `skip` | `int` | `Math.Max(skip, 0)` — bounded | ✅ |
| `take` | `int` | `Math.Min(Math.Max(take, 1), 200)` — bounded | ✅ |
| **Injection risk** | All inputs sanitized; in-memory store — no SQL/OS command vectors | **PASS** |

### Header Capture Setting Scope Control

| Criterion | Evidence | Verdict |
|---|---|---|
| Setting protected by auth | Both GET/PUT settings endpoints require authorization | ✅ |
| Instance-wide (not user-specific) | `ServerConfigService` stores global key-value setting | ✅ |
| Env var override respected | `HeaderRedactionService.cs` L31: checks `FISHTANK_CAPTURE_FULL_HEADERS` first | ✅ |
| **Setting access control** | Properly scope-controlled | **PASS** |

---

## 3. RELIABILITY

### Thread Safety

| Component | Mechanism | Evidence | Verdict |
|---|---|---|---|
| Activity store | `ConcurrentDictionary<Guid, ConcurrentQueue<ActivityRow>>` | `ActivityStore.cs` L14 | ✅ |
| FIFO eviction | `while` loop with `TryDequeue` | `ActivityStore.cs` L32-33 | ✅ |
| Polling re-entrancy guard | `Interlocked.CompareExchange` on `_isPolling` | `ActivityPollingService.cs` L42 | ✅ |
| Service info cache | `ConcurrentDictionary<Guid, (string, int)>` | `ActivityPollingService.cs` L20 | ✅ |

**Note:** The eviction `while` loop may over-evict under extreme concurrent load (benign — removes oldest rows slightly faster than necessary). Cannot under-evict.

| **Thread safety** | Proper concurrent collections; re-entrancy protected | **PASS** |

### Error Handling — Polling Service

| Scenario | Handling | Evidence | Verdict |
|---|---|---|---|
| WireMock log entry exception | Caught + logged; continues to next entry | `ActivityPollingService.cs` L111-113: `Log.Warning(ex, ...)` | ✅ |
| Service info fetch failure | Returns `default`; entry skipped | `ActivityPollingService.cs` L125-127 | ✅ |
| Crash loop prevention | Individual entry failures don't affect timer | try/catch wraps each entry processing | ✅ |
| **Graceful degradation** | Polling service resilient to transient failures | **PASS** |

### Capture Non-Blocking

| Criterion | Evidence | Verdict |
|---|---|---|
| Decoupled from WireMock request handling | Polling reads from `server.LogEntries` after WireMock completes | ✅ |
| Failure isolation | `ProcessLogEntryAsync` failures don't propagate to WireMock | ✅ |
| No blocking of mock responses | Timer-based polling runs on separate thread | ✅ |
| **Request handling isolation** | ActivityService cannot break WireMock | **PASS** |

---

## 4. MAINTAINABILITY

### Interface Abstraction

| Service | Interface | Evidence |
|---|---|---|
| `ActivityService` | `IActivityService` | `Services/IActivityService.cs` |
| `HeaderRedactionService` | `IHeaderRedactionService` | `Services/IHeaderRedactionService.cs` |
| `ActivityStore` | `IActivityStore` | `Engine/IActivityStore.cs` |

| **Interface coverage** | All new services have interface abstractions | **PASS** |

### In-Memory-Only Documentation

| Criterion | Evidence | Verdict |
|---|---|---|
| Class-level doc | `ActivityStore.cs` L9-11: "Thread-safe singleton in-memory store for WireMock request/response activity" | ✅ |
| Cleared on restart | AC-9 documented in story spec; implicit by in-memory singleton | ⚠️ |

| **Documentation clarity** | Class doc present; "cleared on restart" not explicit in code comments | **CONCERN** |

**Recommendation:** Add explicit note to `ActivityStore` class doc: _"Data is not persisted; cleared on application restart."_

### Error Code Convention

| Code | Prefix | Convention | Verdict |
|---|---|---|---|
| `ACTIVITY_INVALID_TYPE` | `ACTIVITY_` | Follows project-context.md prefix pattern | ✅ |
| `ACTIVITY_SERVICE_NOT_FOUND` | `ACTIVITY_` | Follows project-context.md prefix pattern | ✅ |

| **Error code consistency** | Correct prefix convention | **PASS** |

---

## Summary

| NFR Category | Checks | Pass | Concern | Blocker |
|---|---|---|---|---|
| **Performance** | 3 | 3 | 0 | 0 |
| **Security** | 4 | 4 | 0 | 0 |
| **Reliability** | 3 | 3 | 0 | 0 |
| **Maintainability** | 3 | 2 | 1 | 0 |
| **TOTAL** | **13** | **12** | **1** | **0** |

---

## Concerns (Non-Blocking)

### CONCERN-1: In-Memory Documentation Gap

**Location:** `src/Fishtank.Api/Engine/ActivityStore.cs`

**Issue:** The class documentation mentions "in-memory store" but does not explicitly state that data is cleared on application/container restart. This is documented in the story AC-9 but not in the code itself.

**Impact:** Minor — developers reading the code might not immediately realize the ephemeral nature of the data.

**Recommended Fix:**
```csharp
/// <summary>
/// Thread-safe singleton in-memory store for WireMock request/response activity.
/// Maintains a per-service FIFO queue capped at <see cref="_maxRowsPerService"/> rows.
/// <para>
/// <b>Note:</b> Data is NOT persisted — all activity rows are cleared on application restart.
/// </para>
/// </summary>
```

---

## Quality Gate Decision

| Gate | Result |
|---|---|
| **BLOCKER count** | 0 |
| **CONCERN count** | 1 (non-blocking) |
| **Overall Verdict** | ✅ **PASS** |

The story 3.1 implementation satisfies all critical NFR requirements. The single concern is documentation-only and does not affect runtime behavior.
