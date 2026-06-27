---
story_key: 3-3-activity-log-filtering-sorting-auto-refresh-and-log-controls
generated: 2025-07-04
phase: testarch-automate (expand coverage)
---

# Automation Summary — Story 3-3: Activity Log Filtering, Sorting, Auto-refresh & Log Controls

## Executive Summary

This expansion pass added **+18 unit tests** and **+1 backend integration test** to cover
new code paths identified as gaps in the ATDD story-3-3 coverage baseline.  
All existing tests continue to pass. Build is clean.

---

## Coverage Table

| Acceptance Criterion | Test file | Layer | Status |
|---|---|---|---|
| AC-4: Filter by type | `story-3-3-activity-filters.test.tsx` | Unit – Component | ✅ Passing |
| AC-4: Filter by serviceId | `story-3-3-activity-filters.test.tsx` | Unit – Component | ✅ Passing |
| AC-4: Combined serviceId + type AND logic | `Story3_3_ActivityFilterTests.cs` | Integration | ✅ Passing |
| AC-4: Filter reset | `story-3-3-activity-filters.test.tsx` | Unit – Component | ✅ Passing |
| AC-5: Sort order | `story-3-3-activity-filters.test.tsx` | Unit – Component | ✅ Passing |
| AC-6: Live/Paused toggle (enabled) | `story-3-3-activity-filters.test.tsx` | Unit – Component | ✅ Passing |
| AC-7: Refresh rows | `useActivityLog.refreshRows.test.ts` | Unit – Hook | ✅ Passing |
| AC-8: Clear log | `story-3-3-activity-filters.test.tsx` | Unit – Component | ✅ Passing |
| AC-9: Disabled interval → PAUSED on mount | `story-3-3-activity-filters.test.tsx` | Unit – Component | ✅ Passing |
| AC-10: Auth gate (clear log) | `Story3_3_ActivityFilterTests.cs` | Integration | ✅ Passing |
| AC-11a: Interval select options | `story-3-3-activity-settings.test.tsx` | Unit – Component | ✅ Passing |
| AC-11b: Interval persistence to localStorage | `story-3-3-activity-settings.test.tsx` | Unit – Component | ✅ Passing |
| AC-11c: Header capture checkbox from useAppSettings | `story-3-3-activity-settings.test.tsx` | Unit – Component | ✅ Passing |
| AC-11d: Checkbox disabled when settings undefined | `story-3-3-activity-settings.test.tsx` | Unit – Component | ✅ Passing |
| useActivitySettings defaults | `useActivitySettings.test.ts` | Unit – Hook | ✅ Passing |
| useActivitySettings localStorage load | `useActivitySettings.test.ts` | Unit – Hook | ✅ Passing |
| useActivitySettings updateInterval persistence | `useActivitySettings.test.ts` | Unit – Hook | ✅ Passing |
| useActivitySettings invalid JSON fallback | `useActivitySettings.test.ts` | Unit – Hook | ✅ Passing |
| Type-filter button aria-expanded | `story-3-3-activity-filters.test.tsx` | Unit – Component | ✅ Passing |
| E2E: Full filter+sort workflow in browser | — | E2E | ⏭ Skipped (see below) |

---

## Test Suite Totals

| Suite | File | Tests | Delta |
|---|---|---|---|
| Activity page ATDD (component) | `tests/unit/features/story-3-3-activity-filters.test.tsx` | 32 | +7 |
| ActivitySettings component (AC-11) | `tests/unit/features/story-3-3-activity-settings.test.tsx` | 11 | +11 (new file) |
| useActivitySettings hook | `tests/unit/features/activity/useActivitySettings.test.ts` | 8 | +8 (new file) |
| useActivityLog.refreshRows hook | `tests/unit/features/activity/useActivityLog.refreshRows.test.ts` | 3 | +3 (new file) |
| Backend integration | `src/Fishtank.Api.IntegrationTests/Api/Story3_3_ActivityFilterTests.cs` | 12 | +1 |
| E2E browser | `tests/e2e/features/story-3-3-activity-filters.spec.ts` | 3 | 0 (unchanged) |

**New tests this pass: +18 unit, +1 integration = +19 total**

---

## Source Changes

| File | Change |
|---|---|
| `src/features/activity/pages/ActivityPage.tsx` | Added `aria-expanded={typeFilterOpen}` to type-filter button (MINOR m6 fix) |
| `tests/unit/features/story-3-3-activity-filters.test.tsx` | Appended AC-9 (4 tests) + aria-expanded (3 tests); added `afterEach` to vitest import |
| `tests/unit/features/story-3-3-activity-settings.test.tsx` | **New** — 11 tests for ActivitySettings component (AC-11 a/b/c/d) |
| `tests/unit/features/activity/useActivitySettings.test.ts` | **New** — 8 tests for useActivitySettings hook |
| `tests/unit/features/activity/useActivityLog.refreshRows.test.ts` | **New** — 3 tests for refreshRows export in useActivityLog |
| `src/Fishtank.Api.IntegrationTests/Api/Story3_3_ActivityFilterTests.cs` | Appended T5 AND-logic combined filter test |

---

## Verification Results

| Check | Result |
|---|---|
| `npx vitest run` (all 4 unit suites together) | ✅ 54 / 54 passed |
| `npm run build` in `src/client` | ✅ 0 TypeScript errors |
| `dotnet test --filter Story3_3` | ✅ 12 / 12 passed |

---

## Intentional Coverage Gaps

### E2E browser tests — skipped this pass
- **Reason**: E2E tests require a live Fishtank Docker stack (WireMock engine running, API seeded, browser via Playwright) which is not available in the automated test environment.
- **Existing coverage**: `tests/e2e/features/story-3-3-activity-filters.spec.ts` contains 3 Playwright tests that cover the primary filter/sort user flow against a live stack.
- **Recommendation**: Run E2E suite manually with `npm run test:e2e` before any production release.

---

## Key Implementation Notes

1. **`vi.resetModules()` pattern for `useActivitySettings`**: Because the hook reads localStorage during `useState(() => {...})` initialization, the module must be re-imported fresh after setting up localStorage in each test. All hook tests use `vi.resetModules()` in `beforeEach` and re-import via dynamic `await import(...)`.

2. **AC-9 localStorage setup**: The `story-3-3-activity-filters.test.tsx` AC-9 block uses `beforeEach` / `afterEach` with `localStorage.setItem` / `removeItem`. It does NOT need `vi.resetModules()` because the ActivityPage test file already uses a mocked/fresh environment per the existing mock setup pattern.

3. **AND logic test isolation**: Each integration test seeds rows with unique `Guid.NewGuid()` serviceIds to prevent cross-test contamination in the shared in-memory SQLite database.

4. **ActivitySettings QueryClient wrapper**: Tests for AC-11c/d use `makeQc(appSettings?)` which conditionally pre-seeds the `["app-settings"]` React Query cache. When omitted, the cache is empty (simulates loading state → `isLoading=true` → checkbox disabled).
