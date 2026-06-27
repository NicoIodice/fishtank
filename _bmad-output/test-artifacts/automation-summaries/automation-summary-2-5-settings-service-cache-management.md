---
story_key: 2-5-settings-service-cache-management
story_title: "Settings — Service Cache Management"
generated: "2026-06-27"
phase: bmad-testarch-automate (Create mode)
---

# Test Automation Summary — Story 2.5: Settings — Service Cache Management

**Phase:** `bmad-testarch-automate` (Create mode)
**Scope:** Story 2.5 new code paths: `CacheService.cs`, `CacheEndpoints.cs`, `useServiceCache.ts`,
`CacheSettings.tsx`, `cache.ts`
**Date:** 2026-06-27

---

## Outcome

Story 2.5 entered this phase with ATDD scaffolds in place:
- 4 integration tests (GREEN) in `Story2_5_CacheTests.cs`
- 5 Playwright E2E tests (RED — live stack required) in `story-2-5-settings-service-cache.spec.ts`

Three gaps were identified and filled:

1. **`formatBytes` unit coverage** — The utility in `cache.ts` had zero automated test coverage. Added
   9 unit tests covering all four branches (0 B, < 1 KB, < 1 MiB, ≥ 1 MiB) plus boundary values.

2. **`CacheSettings` component coverage** — The component's loading/empty/list states and dialog
   interactions were untested at unit level. Added 15 component tests covering loading state, empty
   state (bi-database icon + text), list rendering (service name, entry count, formatBytes output),
   per-service Clear dialog (open/cancel/confirm), and Clear All dialog (open/cancel/confirm).

3. **AC-5 standard-user integration coverage** — The 4 original integration tests only exercised
   Admin auth. Added 1 integration test that inserts a `StandardUser` directly into the DB and
   confirms `GET /api/cache` returns 200 (proving no Admin-role policy on the endpoint).

No product bugs found. No regressions introduced.

---

## Coverage Table (AC → test file → layer → status)

| AC | Behavior | Test file | Layer | Status |
|----|----------|-----------|-------|--------|
| AC-1 | `GET /api/cache` → 401 for unauthenticated | `Story2_5_CacheTests.cs` (`GetCache_Unauthenticated_Returns401`) | Integration | Pre-existing |
| AC-1 | `GET /api/cache` → 200 with `[]` when no services (authenticated) | `Story2_5_CacheTests.cs` (`GetCache_Authenticated_NoServices_Returns200WithEmptyArray`) | Integration | Pre-existing |
| AC-1 | Loading state renders "Loading caches…" text | `story-2-5-cache-settings.test.tsx` (loading state suite) | Component | **Added** |
| AC-1 | List renders: service name, entry count (singular/plural), formatBytes output | `story-2-5-cache-settings.test.tsx` (list rendering suite) | Component | **Added** |
| AC-1 | `formatBytes(0)` → `"0 B"` | `story-2-5-cache-types.test.ts` | Unit | **Added** |
| AC-1 | `formatBytes(512)` → `"512 B"` | `story-2-5-cache-types.test.ts` | Unit | **Added** |
| AC-1 | `formatBytes(1024)` → `"1.0 KB"` | `story-2-5-cache-types.test.ts` | Unit | **Added** |
| AC-1 | `formatBytes(1536)` → `"1.5 KB"` | `story-2-5-cache-types.test.ts` | Unit | **Added** |
| AC-1 | `formatBytes(1024*1024)` → `"1.0 MB"` | `story-2-5-cache-types.test.ts` | Unit | **Added** |
| AC-2 | `DELETE /api/cache/{id}` for non-existent → 404 + SERVICE_NOT_FOUND | `Story2_5_CacheTests.cs` (`DeleteCache_NonExistentId_Returns404WithServiceNotFound`) | Integration | Pre-existing |
| AC-2 | Per-service Clear button opens confirmation dialog (`role="dialog"`) | `story-2-5-cache-settings.test.tsx` (per-service dialog suite) | Component | **Added** |
| AC-2 | Cancel button closes dialog without calling mutation | `story-2-5-cache-settings.test.tsx` (per-service dialog suite) | Component | **Added** |
| AC-2 | Confirm button calls `useClearCache` mutation (DELETE /api/cache/{id}) | `story-2-5-cache-settings.test.tsx` (per-service dialog suite) | Component | **Added** |
| AC-2 | Full per-service clear flow (click → confirm → cache cleared → list refreshes) | `story-2-5-settings-service-cache.spec.ts` | E2E (RED) | Pre-existing scaffold |
| AC-3 | `DELETE /api/cache` → 200 + `{success:true,data:null}` (authenticated) | `Story2_5_CacheTests.cs` (`DeleteAllCaches_Authenticated_Returns200WithSuccess`) | Integration | Pre-existing |
| AC-3 | Clear All button opens its own confirmation dialog | `story-2-5-cache-settings.test.tsx` (Clear All suite) | Component | **Added** |
| AC-3 | Clear All Cancel closes dialog without calling mutation | `story-2-5-cache-settings.test.tsx` (Clear All suite) | Component | **Added** |
| AC-3 | Clear All Confirm calls `useClearAllCaches` mutation (DELETE /api/cache) | `story-2-5-cache-settings.test.tsx` (Clear All suite) | Component | **Added** |
| AC-3 | Full clear-all flow (click → confirm → all caches cleared → list refreshes) | `story-2-5-settings-service-cache.spec.ts` | E2E (RED) | Pre-existing scaffold |
| AC-4 | Empty state: `bi-database` icon visible | `story-2-5-cache-settings.test.tsx` (empty state suite) | Component | **Added** |
| AC-4 | Empty state: "No service caches yet." text | `story-2-5-cache-settings.test.tsx` (empty state suite) | Component | **Added** |
| AC-4 | Empty state: secondary description text | `story-2-5-cache-settings.test.tsx` (empty state suite) | Component | **Added** |
| AC-4 | No services → empty state visible (live) | `story-2-5-settings-service-cache.spec.ts` | E2E (RED) | Pre-existing scaffold |
| AC-5 | `GET /api/cache` → 200 for authenticated Admin | `Story2_5_CacheTests.cs` (`GetCache_Authenticated_NoServices_Returns200WithEmptyArray`) | Integration | Pre-existing |
| AC-5 | `GET /api/cache` → 200 for Standard User (non-Admin) | `Story2_5_CacheTests.cs` (`GetCache_StandardUser_Returns200`) | Integration | **Added** |
| AC-5 | Standard User can view and use cache management UI (live) | `story-2-5-settings-service-cache.spec.ts` | E2E (RED) | Pre-existing scaffold |

---

## Tests Added This Phase

### Frontend unit — `src/client/tests/unit/features/story-2-5-cache-types.test.ts` (NEW, 9 tests)

| # | Test name |
|---|-----------|
| 1 | `returns "0 B" for 0 bytes` |
| 2 | `returns bytes with "B" suffix for values under 1 KB (e.g. 512)` |
| 3 | `returns bytes with "B" suffix for 1-byte values` |
| 4 | `returns bytes with "B" suffix for 1023 bytes (just under 1 KB)` |
| 5 | `returns "1.0 KB" for exactly 1024 bytes` |
| 6 | `returns "1.5 KB" for 1536 bytes` |
| 7 | `returns KB display for values up to (but not including) 1 MiB` |
| 8 | `returns "1.0 MB" for exactly 1 MiB (1024 * 1024 bytes)` |
| 9 | `returns "1.5 MB" for 1.5 MiB` |

### Frontend component — `src/client/tests/unit/features/story-2-5-cache-settings.test.tsx` (NEW, 15 tests)

| # | Suite | Test name |
|---|-------|-----------|
| 1 | AC-1: loading state | `shows loading text while data is being fetched` |
| 2 | AC-4: empty state | `shows the bi-database icon when data is empty` |
| 3 | AC-4: empty state | `shows "No service caches yet." primary text` |
| 4 | AC-4: empty state | `shows the secondary empty-state description text` |
| 5 | AC-1: list rendering | `renders service names for all entries` |
| 6 | AC-1: list rendering | `renders entry counts (plural and singular)` |
| 7 | AC-1: list rendering | `renders formatBytes output for each service's estimated size` |
| 8 | AC-1: list rendering | `renders per-service Clear buttons with correct testids` |
| 9 | AC-1: list rendering | `renders the Clear All button` |
| 10 | AC-2: per-service dialog | `clicking Clear opens the confirmation dialog` |
| 11 | AC-2: per-service dialog | `Cancel closes the dialog without calling the delete mutation` |
| 12 | AC-2: per-service dialog | `Confirm calls the clear-cache mutation (DELETE /api/cache/{id})` |
| 13 | AC-3: Clear All dialog | `clicking Clear All opens the clear-all dialog` |
| 14 | AC-3: Clear All dialog | `Cancel on Clear All dialog closes it without calling mutation` |
| 15 | AC-3: Clear All dialog | `Confirm Clear All calls the clear-all-caches mutation (DELETE /api/cache)` |

### Backend integration — `src/Fishtank.Api.IntegrationTests/Api/Story2_5_CacheTests.cs` (UPDATED, +1 test)

| # | Test name |
|---|-----------|
| 5 | `AC-5: GET /api/cache with Standard User (non-Admin) auth → 200` |

---

## Test Suite Totals

| Suite | Before | Added | After | Run Result |
|-------|--------|-------|-------|------------|
| Vitest unit/component (all files) | 115 tests / 12 files | 24 tests / 2 files | **139 tests / 14 files** | ✅ 139/139 PASS |
| Integration (all files) | 74 tests | 1 test | **75 tests** | ✅ 75/75 PASS |
| E2E Playwright (Story 2.5 scaffold) | 5 tests (RED) | 0 | 5 tests (RED — live stack) | Not run |

---

## Intentional Coverage Gaps

| Gap | Rationale |
|-----|-----------|
| `CacheService.cs` unit tests (service-layer) | Backend service logic (`ResetMappings`, `ReadStaticMappings`, `EstimateSize`) is tightly coupled to `WireMockServer` concrete class and the live file system. Meaningful unit tests would require a heavy fake/wrapper that adds maintenance cost without proportional value. The integration tests (`GET /api/cache`, `DELETE /api/cache`, `DELETE /api/cache/{id}`) provide sufficient coverage at the HTTP boundary. |
| `useServiceCache.ts` hook unit tests | The hook is a thin wrapper around `useQuery`/`useMutation` with no business logic. Behavior is fully exercised by the `CacheSettings` component tests (which drive the hooks through the rendered component) and the E2E tests. A dedicated hook unit test would duplicate that coverage. |
| E2E Playwright (5 tests) | Require a live Docker stack with a running WireMock instance. Marked RED/deferred as per project E2E policy. Tagged for execution in CI when stack is available. |
| `DELETE /api/cache/{id}` success path (integration) | The 4 original integration tests cover the 404 error path for DELETE. The success path (clearing a real WireMock instance) requires a live running service registered in `IServicesRegistry`; the test factory does not spin up WireMock servers. The E2E test covers this path against the live stack. |
