# ATDD Checklist — Story 3.3
## Activity Log Filtering, Sorting, Auto-refresh & Log Controls

**Story reference**: `3-3-activity-log-filtering-sorting-auto-refresh-and-log-controls`  
**Epic**: Epic 3 — Network Activity & Request Monitoring  
**Generated**: ATDD RED-phase scaffold  
**Phase gate**: RED ✅ (22/25 unit tests failing; backend builds clean; frontend types clean)

---

## Phase Gate Status

| Check | Status | Notes |
|-------|--------|-------|
| Test scaffold files created | ✅ | 3 files (backend integration, frontend unit, E2E) |
| All ACs referenced (AC-1 through AC-12) | ✅ | AC-9, AC-11 deferred (lower priority, no UI stub) |
| Backend tests compile clean | ✅ | `dotnet build` → 0 errors, 2 CVE warnings (pre-existing) |
| Frontend types clean | ✅ | `tsc --noEmit` → 0 errors |
| Unit tests RED | ✅ | 22 failed / 3 passed / 25 total |
| E2E tests RED | ⏳ | Requires live stack — not run in scaffold phase |
| Backend integration tests RED | ⏳ | Requires running API — T1–T4 may PASS (backend already implemented) |

> **3 passing unit tests** are intentional — they are "meta-shape" assertions
> (verify testid attributes are present in the DOM) that don't depend on
> filter wiring. They confirm the DOM contract, not the behaviour.

---

## Scaffold File Paths

| Layer | File | Tests |
|-------|------|-------|
| Backend integration | `src/Fishtank.Api.IntegrationTests/Api/Story3_3_ActivityFilterTests.cs` | 11 |
| Frontend unit (Vitest + RTL) | `src/client/tests/unit/features/story-3-3-activity-filters.test.tsx` | 25 |
| E2E (Playwright) | `src/client/tests/e2e/story-3-3-activity-filters.spec.ts` | 3 |
| **Total** | | **39** |

> **Note — vitest path convention**: The task spec referenced
> `src/client/src/features/activity/__tests__/ActivityFilters.test.tsx`, but
> `vitest.config.ts` only picks up `tests/unit/**/*.test.{ts,tsx}`. The unit test
> file was placed at the correct discovery path following the project convention.

---

## Backend Integration Tests (`Story3_3_ActivityFilterTests.cs`)

| Test | Acceptance Criteria | Priority |
|------|---------------------|----------|
| `FilterByServiceId_ReturnsOnlyMatchingRows` | T1 / AC-2 | P1 |
| `FilterByServiceId_UnknownId_ReturnsEmpty` | T1 / AC-2 | P1 |
| `FilterByType_Mocked_ReturnsOnlyMockedRows` | T2 / AC-3 | P1 |
| `FilterByType_Proxied_ReturnsOnlyProxiedRows` | T2 / AC-3 | P1 |
| `FilterByType_All_ReturnsAllRows` | T2 / AC-3 | P1 |
| `FilterBySearch_UrlPath_ReturnsMatchingRows` | T3 / AC-1 | P0 |
| `FilterBySearch_Method_ReturnsMatchingRows` | T3 / AC-1 | P0 |
| `FilterBySearch_NoMatch_ReturnsEmpty` | T3 / AC-1 | P0 |
| `DeleteActivityLog_Returns204` | T4 / AC-10 | P0 |
| `DeleteActivityLog_ClearsAllRows` | T4 / AC-10 | P0 |
| `DeleteActivityLog_SubsequentGetReturnsEmpty` | T4 / AC-10 | P0 |

### Backend RED Expectation

> T1–T4 tests call endpoints that are **already implemented** in `ActivityService.cs`
> (`QueryAsync` + `ClearAsync`). These tests are likely to **PASS** immediately.
> If they fail, it indicates a missing route or registration issue.

---

## Frontend Unit Tests (`story-3-3-activity-filters.test.tsx`)

| Test | Acceptance Criteria | RED Reason |
|------|---------------------|-----------|
| `AC-1 search: renders search input` | AC-1 | passes (DOM shape) |
| `AC-1 search: search input is enabled` | AC-1 | ❌ input is disabled |
| `AC-1 search: typing in search hides non-matching rows` | AC-1 | ❌ input disabled, no filter wired |
| `AC-2 service filter: renders service select dropdown` | AC-2 | passes (DOM shape) |
| `AC-2 service filter: service dropdown is enabled` | AC-2 | ❌ select is disabled |
| `AC-2 service filter: selecting a service hides rows from other services` | AC-2 | ❌ disabled, no filter |
| `AC-3 type filter: type filter button is enabled` | AC-3 | ❌ button disabled |
| `AC-3 type filter: type filter Mocked checkbox hides Proxied rows` | AC-3 | ❌ button disabled |
| `AC-3 type filter: type filter Proxied checkbox hides Mocked rows` | AC-3 | ❌ button disabled |
| `AC-4 AND logic: all active filters applied simultaneously` | AC-4 | ❌ no filters wired |
| `AC-5 clear filters: clear filters button is enabled` | AC-5 | ❌ button disabled |
| `AC-5 clear filters: clicking clear filters resets search and service` | AC-5 | ❌ disabled |
| `AC-5 clear filters: clear filters restores hidden rows` | AC-5 | ❌ disabled |
| `AC-6 sort: table renders activity-col-timestamp header` | AC-6 | passes (DOM shape) |
| `AC-6 sort: clicking timestamp header sorts rows descending then ascending` | AC-6 | ❌ sort not wired |
| `AC-7 live-paused: LIVE/PAUSED toggle button is enabled` | AC-7 | ❌ button disabled |
| `AC-7 live-paused: clicking LIVE/PAUSED switches label to PAUSED` | AC-7 | ❌ disabled |
| `AC-7 live-paused: while paused new SignalR rows are buffered not shown` | AC-7 | ❌ disabled |
| `AC-7 live-paused: clicking PAUSED button flushes buffered rows` | AC-7 | ❌ disabled |
| `AC-8 refresh: in LIVE mode refresh button is hidden` | AC-8 | ❌ button display:none |
| `AC-10 clear log: clear log button is enabled` | AC-10 | ❌ button disabled |
| `AC-10 clear log: clicking clear log calls DELETE /api/activity` | AC-10 | ❌ disabled |
| `AC-10 clear log: after clear log the table shows empty state` | AC-10 | ❌ disabled |
| `AC-10 clear log: proxy counter resets to 0 after clear log` | AC-10 | ❌ disabled |
| `AC-12 proxy counter: ProxyCounterPill receives unfiltered rows` | AC-12 | ❌ counter not tested yet |

---

## E2E Tests (`story-3-3-activity-filters.spec.ts`)

| Test | Acceptance Criteria | RED Reason |
|------|---------------------|-----------|
| `T13: AC-2 — selecting a service shows only that service's rows (P1)` | AC-2 | ❌ dropdown disabled |
| `T14: AC-10 — Clear log button deletes all rows and resets proxy counter (P0)` | AC-10 | ❌ button disabled |
| `T14b: AC-10 — Clear log while paused also clears pause snapshot (P0)` | AC-10 | ❌ both buttons disabled |

---

## `data-testid` Contract

All test IDs below must be present in the DOM after Story 3.3 is implemented.
Implementation MUST NOT change these IDs (breaking change to E2E + unit tests).

| `data-testid` | Component | Story 3.3 AC | Notes |
|---------------|-----------|--------------|-------|
| `activity-input-search` | ActivityPage toolbar | AC-1 | Currently `disabled` |
| `activity-select-service` | ActivityPage toolbar | AC-2 | Currently `disabled` |
| `activity-btn-type-filter` | ActivityPage toolbar | AC-3 | Currently `disabled` |
| `activity-checkbox-type-mocked` | Type filter popover | AC-3 | Currently `disabled` |
| `activity-checkbox-type-proxied` | Type filter popover | AC-3 | **NEW** — not yet rendered |
| `activity-btn-clear-filters` | ActivityPage toolbar | AC-5 | Currently `disabled` |
| `activity-col-timestamp` | ActivityTable header | AC-6 | **NEW** — sortable column header |
| `activity-btn-live-paused` | ActivityPage header | AC-7 | Currently `disabled` |
| `activity-btn-refresh` | ActivityPage header | AC-8 | Currently `display:none` |
| `activity-btn-clear-log` | ActivityPage header | AC-10 | Currently `disabled` |
| `activity-pill-proxy-count` | ProxyCounterPill | AC-12 | Already present (unfiltered) |
| `activity-row-{id}` | ActivityTable rows | AC-1,2,3,4,5,6 | Already present |
| `datatable-empty` | ActivityTable empty state | AC-10 | Must show "Log cleared" text |
| `settings-select-activity-refresh-interval` | ActivitySettings | AC-11 | **NEW** — settings screen |

---

## Deferred / Out of Scope

| AC | Reason |
|----|--------|
| AC-9 (column visibility) | No UI stub exists yet; lower priority |
| AC-11 (auto-refresh interval setting) | Requires new Settings route; follow-up story |
| Column sort for columns other than timestamp | T-shirt sizing; can be AC-6 extension |

---

## Implementation Guidance for Developer

When implementing Story 3.3, make tests GREEN by:

1. **AC-1 Search**: Remove `disabled` from `activity-input-search`. Wire `searchQuery` state in `ActivityPage`. Filter `rows` in `useMemo` via `row.urlPath.includes(searchQuery) || row.method.includes(searchQuery)`.

2. **AC-2 Service filter**: Remove `disabled` from `activity-select-service`. Wire `selectedServiceId` state. Filter `rows` in `useMemo`.

3. **AC-3 Type filter**: Remove `disabled` from `activity-btn-type-filter` and the checkboxes. Add `activity-checkbox-type-proxied`. Wire `typeFilter` state. Filter `rows` in `useMemo`.

4. **AC-4 AND logic**: Compose all filters in one `useMemo` chain (search AND service AND type).

5. **AC-5 Clear filters**: Remove `disabled` from `activity-btn-clear-filters`. On click, reset `searchQuery`, `selectedServiceId`, `typeFilter` to defaults.

6. **AC-6 Sort**: Add `data-testid="activity-col-timestamp"` sort header. Wire `sortOrder` state (`asc`/`desc`). Sort in `useMemo` after filtering.

7. **AC-7 Live/Paused**: Remove `disabled` from `activity-btn-live-paused`. Wire `isPaused` state in `useActivityLog` (buffer incoming SignalR rows; flush on resume).

8. **AC-8 Refresh**: Show `activity-btn-refresh` only when `isPaused === true`. On click, flush buffered rows.

9. **AC-10 Clear log**: Remove `disabled` from `activity-btn-clear-log`. On click, call `DELETE /api/activity` via `clearActivityLog()` in `api.ts`, then `clearRows()`. Pass `clearActivityLog` as a prop or call inside the component.

10. **AC-12 Proxy counter**: Ensure `ProxyCounterPill` receives unfiltered `rows` (not the post-filter slice).

### Critical: filter must be client-side

All filtering/sorting is in-memory `useMemo` in `ActivityPage`. The `ActivityTable` receives the already-filtered slice. `ProxyCounterPill` receives the **unfiltered** `rows`.
