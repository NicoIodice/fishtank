---
story_id: "3.1"
story_key: 3-1-activity-log-backend-request-capture-and-header-redaction
phase: atdd-red
created: 2026-06-27
status: PASS
---

# ATDD Checklist — Story 3-1: Activity Log Backend — Request Capture & Header Redaction

**Date:** 2026-06-27
**Phase:** RED (scaffolds created, implementation pending)
**Scope:** Backend only — no frontend/Playwright tests for this story

---

## Phase Gate Status

| Gate | Status | Notes |
|------|--------|-------|
| Test files created | ✅ | All 3 files created at correct paths |
| ACs referenced in tests | ✅ | AC-1, AC-2, AC-3, AC-5, AC-7, AC-8 all covered |
| Compile clean (0 errors) | ✅ | `dotnet build` → 0 errors, 2 pre-existing NuGet warnings (unrelated) |
| Tests RED (fail when run) | ✅ | Unit tests throw `NotImplementedException`; integration tests hit unmapped endpoints → 404 ≠ expected 200/401 |

**Overall Gate Status: PASS ✅**

---

## Test Files Created

| # | File Path | Type | ACs |
|---|-----------|------|-----|
| 1 | [src/Fishtank.Api.UnitTests/Services/HeaderRedactionServiceTests.cs](../../src/Fishtank.Api.UnitTests/Services/HeaderRedactionServiceTests.cs) | Unit | AC-2, AC-3 |
| 2 | [src/Fishtank.Api.UnitTests/Engine/ActivityStoreTests.cs](../../src/Fishtank.Api.UnitTests/Engine/ActivityStoreTests.cs) | Unit | AC-1, AC-5 |
| 3 | [src/Fishtank.Api.IntegrationTests/Api/Story3_1_ActivityTests.cs](../../src/Fishtank.Api.IntegrationTests/Api/Story3_1_ActivityTests.cs) | Integration | AC-7, AC-8 |

---

## All Test Names with AC Mapping

### `HeaderRedactionServiceTests.cs` (AC-2, AC-3)

| Test Method | AC | Description |
|-------------|-----|-------------|
| `Redact_ExactMatchSensitiveHeader_ReplacesValueWithRedacted` | AC-2 | `Authorization`, `Cookie`, `Set-Cookie`, `X-Api-Key`, `X-Auth-Token` all produce `[REDACTED]` (5 `[InlineData]`) |
| `Redact_ExactMatchIsCaseInsensitive_ReplacesValueWithRedacted` | AC-2 | Same headers with mixed/upper case names are still redacted (6 `[InlineData]`) |
| `Redact_HeaderContainsSecret_ReplacesValueWithRedacted` | AC-2 | Header name containing `secret` is redacted (4 `[InlineData]`) |
| `Redact_HeaderContainsToken_ReplacesValueWithRedacted` | AC-2 | Header name containing `token` is redacted (4 `[InlineData]`) |
| `Redact_SafeHeader_PassesThroughUnchanged` | AC-2 | `Content-Type`, `Accept`, `X-Request-Id`, `User-Agent`, `Cache-Control` are NOT redacted (5 `[InlineData]`) |
| `Redact_MixedHeaders_RedactsOnlySensitiveKeys` | AC-2 | Mixed header dict — only sensitive keys become `[REDACTED]`, safe keys unchanged |
| `Redact_WhenCaptureFullHeadersEnabled_ReturnsOriginalValues` | AC-3 | `captureFullHeaders=true` disables all redaction (5 `[InlineData]`) |
| `Redact_EmptyDictionary_ReturnsEmptyDictionary` | AC-2 | Empty input → empty output |

**Total tests in file:** 8 test methods (30 individual cases via `[InlineData]`)

---

### `ActivityStoreTests.cs` (AC-1, AC-5)

| Test Method | AC | Description |
|-------------|-----|-------------|
| `Add_SingleRow_IsReturnedByGetAll` | AC-1 | Add one row; `GetAll()` returns it |
| `GetAll_WithServiceIdFilter_ReturnsOnlyMatchingRows` | AC-1 | `GetAll(serviceId)` filters to that service only |
| `GetAll_NoFilter_ReturnsAllRows` | AC-1 | `GetAll()` with no filter returns rows from all services |
| `Add_BeyondCap_EvidesOldestRowFirst` | AC-5 | Adding row #(cap+1) evicts the oldest (FIFO) |
| `Add_BeyondCap_EvictionDoesNotAffectOtherServices` | AC-5 | Per-service cap — eviction in service A doesn't touch service B |
| `Clear_RemovesAllEntries` | AC-5 | `Clear()` → `GetAll()` returns empty |
| `Clear_ThenGetAllWithFilter_ReturnsEmpty` | AC-5 | `Clear()` → `GetAll(serviceId)` still returns empty |

**Total tests in file:** 7 test methods

---

### `Story3_1_ActivityTests.cs` (AC-7, AC-8)

| Test Method | AC | Description |
|-------------|-----|-------------|
| `GetActivity_Unauthenticated_Returns401` | AC-7 | `GET /api/activity` without auth → 401 |
| `GetActivity_Authenticated_NoActivity_Returns200WithEmptyArray` | AC-7 | `GET /api/activity` authenticated → 200 + empty `data` array |
| `DeleteActivity_Authenticated_Returns200WithSuccess` | AC-8 | `DELETE /api/activity` authenticated → 200 + `{success:true, data:null}` |
| `DeleteActivity_Unauthenticated_Returns401` | AC-8 | `DELETE /api/activity` without auth → 401 |

**Total tests in file:** 4 test methods

---

## AC Coverage Summary

| AC | Covered By | Covered? |
|----|-----------|----------|
| AC-1: Request capture to in-memory store | `ActivityStoreTests` | ✅ |
| AC-2: Sensitive header redaction at storage time | `HeaderRedactionServiceTests` | ✅ |
| AC-3: Full header capture opt-in | `HeaderRedactionServiceTests` | ✅ |
| AC-4: Header capture setting scope (instance-wide, DB-persisted) | Deferred — requires `ServerConfigService` integration; covered by AC-10 settings endpoint test in future story or settings integration test | ⏭️ |
| AC-5: Per-service row cap with FIFO eviction | `ActivityStoreTests` | ✅ |
| AC-6: SignalR `ActivityHub` broadcasts | Deferred — SignalR hub tests typically require Playwright or dedicated hub integration test harness; flagged for Story 3-2 | ⏭️ |
| AC-7: GET /api/activity with filters | `Story3_1_ActivityTests` (auth guard + empty list) | ✅ (partial — filter query params deferred to Story 3-2/3-3 when UI is in place) |
| AC-8: DELETE /api/activity clears all logs | `Story3_1_ActivityTests` | ✅ |
| AC-9: Activity data cleared on container restart | By design (in-memory); no test possible — documented | ⏭️ |
| AC-10: Settings endpoint for header capture toggle | Deferred — `SettingsEndpoints` extension; tested when implemented | ⏭️ |

---

## RED Phase Failure Analysis

### Unit Tests (`HeaderRedactionServiceTests`, `ActivityStoreTests`)

Both unit test files contain RED-phase stubs of the production classes. The stubs are defined directly in the test file and throw `NotImplementedException` on every method call. Tests fail with:

```
System.NotImplementedException: RED: Fishtank.Api.Services.HeaderRedactionService has not been implemented yet.
System.NotImplementedException: RED: Fishtank.Api.Engine.ActivityStore has not been implemented yet.
```

**GREEN transition:** Remove the inline stub class, add `using Fishtank.Api.Services;` / `using Fishtank.Api.Engine;`, rebuild.

### Integration Tests (`Story3_1_ActivityTests`)

Activity endpoints are not registered in `Program.cs` yet. All requests to `/api/activity` return `404 Not Found` from ASP.NET Core's routing layer. Tests fail because:

- `GetActivity_Unauthenticated_Returns401` → gets 404, asserts 401
- `GetActivity_Authenticated_NoActivity_Returns200WithEmptyArray` → gets 404, asserts 200
- `DeleteActivity_Authenticated_Returns200WithSuccess` → gets 404, asserts 200
- `DeleteActivity_Unauthenticated_Returns401` → gets 404, asserts 401

**GREEN transition:** Implement `ActivityEndpoints.cs` and register it in `Program.cs`.

---

## Notes & Deferred Items

1. **AC-4 / AC-10 (Settings toggle):** The `PUT /api/settings/capture-headers` endpoint and `captureFullHeaders` field in `GET /api/settings` are omitted from this ATDD batch — they require changes to `SettingsEndpoints.cs` and `ServerConfigService`. Add a dedicated test in that endpoint's implementation story.

2. **AC-6 (SignalR `ActivityHub`):** The `ActivityRowAdded` real-time broadcast requires a SignalR hub test harness. Following the established project pattern (Story 2.3/2.4), the SignalR smoke test (hub auth negotiate) will be added to `Story3_1_ActivityTests.cs` once `ActivityHub.cs` exists; the full push latency assertion (NFR-3, ≤500ms) is documented in the Epic 3 test design as R-E3-002/R-E3-004 and is best validated via Playwright in Story 3-2.

3. **Filter query params (AC-7 `serviceId`, `type`, `search`, `skip`, `take`):** The pagination and filtering assertions are deferred — they require seeded activity rows and are better tested in Story 3-2/3-3 once the UI drives the filter parameters.
