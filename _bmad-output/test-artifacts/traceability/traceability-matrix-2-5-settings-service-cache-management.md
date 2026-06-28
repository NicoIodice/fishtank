---
story_key: "2-5-settings-service-cache-management"
story_title: "Settings — Service Cache Management"
generated: "2026-06-27"
phase: "bmad-testarch-trace"
stepsCompleted: ["step-01-load-context", "step-02-discover-tests", "step-03-map-criteria", "step-04-analyze-gaps", "step-05-gate-decision"]
lastStep: "step-05-gate-decision"
lastSaved: "2026-06-27"
gateDecision: "PASS"
coverageOracle: "formal-requirements"
externalPointerStatus: "not_used"
totalACs: 5
coveredACs: 5
totalTests: 34
totalTestsGreen: 29
totalTestsWaived: 5
blockers: 0
---

# Traceability Matrix — Story 2.5
# Settings — Service Cache Management

**Story:** `2-5-settings-service-cache-management`  
**Epic:** 2 — Services Management & System Health  
**Phase:** `bmad-testarch-trace` (Create mode)  
**Generated:** 2026-06-27  
**Oracle type:** Formal requirements (story ACs)

---

## Gate Decision: ✅ PASS

| Metric | Value |
|---|---|
| ACs covered | 5 / 5 |
| Tests GREEN | 29 / 29 (locally executable) |
| Tests WAIVED | 5 (E2E — live stack required; will run in CI) |
| BLOCKER items | **0** |
| FAIL items | **0** |
| CONCERNS (deferred) | 2 (performance — non-blocking, no threshold defined) |
| NFR gate | ✅ PASS |
| Code review gate | ✅ PASS (0 blockers; 5 advisory, 2 deferred pre-existing) |
| ATDD gate | ✅ PASS (all 5 ACs scaffolded RED, all 5 now GREEN post-dev) |

---

## Coverage Oracle

Resolved from story file: `_bmad-output/implementation-artifacts/2-5-settings-service-cache-management.md`

| ID | Acceptance Criterion | Priority |
|---|---|---|
| AC-1 | Cache list shows all services with entry count and estimated size | P0 |
| AC-2 | Per-service Clear with confirmation → `DELETE /api/cache/{id}` called → list refreshes | P0 |
| AC-3 | Clear All with confirmation → `DELETE /api/cache` called → list refreshes | P1 |
| AC-4 | Empty state when no services configured | P1 |
| AC-5 | Standard User can access and use cache management | P1 |

---

## Test Suite Inventory

| Suite | File | Count | Status |
|---|---|---|---|
| Backend integration | `src/Fishtank.Api.IntegrationTests/Api/Story2_5_CacheTests.cs` | 5 | ✅ 5/5 GREEN |
| Frontend component | `src/client/tests/unit/features/story-2-5-cache-settings.test.tsx` | 15 | ✅ 15/15 GREEN |
| Frontend unit | `src/client/tests/unit/features/story-2-5-cache-types.test.ts` | 9 | ✅ 9/9 GREEN |
| E2E Playwright | `src/client/tests/e2e/story-2-5-settings-service-cache.spec.ts` | 5 | ⚠️ WAIVED (live stack) |
| **Total** | | **34** | **29 GREEN · 5 WAIVED** |

---

## Traceability Matrix

### AC-1: Cache list shows all services with entry count and estimated size

**Coverage status: FULL**  
**Heuristic signals:** ✅ Endpoint coverage · ✅ Auth guard (positive + negative) · ✅ Error-path (auth denied) · ✅ Loading state · ✅ List rendering · ✅ Unit (formatBytes all branches) · ⚠️ E2E waived

| Test | File | Layer | Status | Notes |
|---|---|---|---|---|
| `GetCache_Unauthenticated_Returns401` | `Story2_5_CacheTests.cs` | Integration | ✅ GREEN | Auth guard — regression guard for auth contract |
| `GetCache_Authenticated_NoServices_Returns200WithEmptyArray` | `Story2_5_CacheTests.cs` | Integration | ✅ GREEN | Authenticated GET returns 200 + `[]` |
| `shows loading text while data is being fetched` | `story-2-5-cache-settings.test.tsx` | Component | ✅ GREEN | Loading state rendered correctly |
| `renders service names for all entries` | `story-2-5-cache-settings.test.tsx` | Component | ✅ GREEN | List renders service names |
| `renders entry counts (plural and singular)` | `story-2-5-cache-settings.test.tsx` | Component | ✅ GREEN | Singular "1 entry" / plural "N entries" |
| `renders formatBytes output for each service's estimated size` | `story-2-5-cache-settings.test.tsx` | Component | ✅ GREEN | Formatted size per service |
| `renders per-service Clear buttons with correct testids` | `story-2-5-cache-settings.test.tsx` | Component | ✅ GREEN | `data-testid` presence validated |
| `renders the Clear All button` | `story-2-5-cache-settings.test.tsx` | Component | ✅ GREEN | Global Clear All visible |
| `returns "0 B" for 0 bytes` | `story-2-5-cache-types.test.ts` | Unit | ✅ GREEN | formatBytes branch: 0 |
| `returns bytes with "B" suffix for values under 1 KB (e.g. 512)` | `story-2-5-cache-types.test.ts` | Unit | ✅ GREEN | formatBytes branch: < 1 KB |
| `returns bytes with "B" suffix for 1-byte values` | `story-2-5-cache-types.test.ts` | Unit | ✅ GREEN | formatBytes boundary: 1 B |
| `returns bytes with "B" suffix for 1023 bytes (just under 1 KB)` | `story-2-5-cache-types.test.ts` | Unit | ✅ GREEN | formatBytes boundary: 1023 B |
| `returns "1.0 KB" for exactly 1024 bytes` | `story-2-5-cache-types.test.ts` | Unit | ✅ GREEN | formatBytes boundary: 1 KiB |
| `returns "1.5 KB" for 1536 bytes` | `story-2-5-cache-types.test.ts` | Unit | ✅ GREEN | formatBytes: mid-KB |
| `returns KB display for values up to (but not including) 1 MiB` | `story-2-5-cache-types.test.ts` | Unit | ✅ GREEN | formatBytes branch: KB range |
| `returns "1.0 MB" for exactly 1 MiB (1024 * 1024 bytes)` | `story-2-5-cache-types.test.ts` | Unit | ✅ GREEN | formatBytes boundary: 1 MiB |
| `returns "1.5 MB" for 1.5 MiB` | `story-2-5-cache-types.test.ts` | Unit | ✅ GREEN | formatBytes: mid-MB |
| `AC-1: lists each service with name, entry count, and size` | `story-2-5-settings-service-cache.spec.ts` | E2E | ⚠️ WAIVED | Live stack required; runs in CI |

---

### AC-2: Per-service Clear with confirmation → DELETE /api/cache/{id} called → list refreshes

**Coverage status: FULL**  
**Heuristic signals:** ✅ Endpoint coverage · ✅ Error-path (404 not found) · ✅ Dialog open/cancel/confirm flow · ✅ Mutation called on confirm · ✅ No mutation on cancel · ⚠️ Success-path HTTP (live stack) · ⚠️ E2E waived

| Test | File | Layer | Status | Notes |
|---|---|---|---|---|
| `DeleteCache_NonExistentId_Returns404WithServiceNotFound` | `Story2_5_CacheTests.cs` | Integration | ✅ GREEN | 404 + `SERVICE_NOT_FOUND` error code |
| `clicking Clear opens the confirmation dialog` | `story-2-5-cache-settings.test.tsx` | Component | ✅ GREEN | Dialog opens on Clear click |
| `Cancel closes the dialog without calling the delete mutation` | `story-2-5-cache-settings.test.tsx` | Component | ✅ GREEN | Mutation not invoked on cancel |
| `Confirm calls the clear-cache mutation (DELETE /api/cache/{id})` | `story-2-5-cache-settings.test.tsx` | Component | ✅ GREEN | `useClearCache` mutation invoked |
| `AC-2: per-service Clear with confirmation calls DELETE` | `story-2-5-settings-service-cache.spec.ts` | E2E | ⚠️ WAIVED | Full HTTP round-trip + list refresh — live stack; runs in CI |

> **Note — success HTTP path:** `DELETE /api/cache/{id}` success path (204 / 200 for existing service) requires a live WireMock instance registered in `IServicesRegistry`. The test factory cannot spin up WireMock servers; this path is exercised exclusively by the E2E test. Gap is acknowledged in the automation summary; E2E covers it when the live stack is available.

---

### AC-3: Clear All with confirmation → DELETE /api/cache called → list refreshes

**Coverage status: FULL**  
**Heuristic signals:** ✅ Endpoint coverage (HTTP 200 + `{success:true}`) · ✅ Dialog open/cancel/confirm flow · ✅ Mutation called on confirm · ✅ No mutation on cancel · ⚠️ E2E waived

| Test | File | Layer | Status | Notes |
|---|---|---|---|---|
| `DeleteAllCaches_Authenticated_Returns200WithSuccess` | `Story2_5_CacheTests.cs` | Integration | ✅ GREEN | DELETE /api/cache → 200 + `{success:true,data:null}` |
| `clicking Clear All opens the clear-all dialog` | `story-2-5-cache-settings.test.tsx` | Component | ✅ GREEN | Dialog opens on Clear All click |
| `Cancel on Clear All dialog closes it without calling mutation` | `story-2-5-cache-settings.test.tsx` | Component | ✅ GREEN | Mutation not invoked on cancel |
| `Confirm Clear All calls the clear-all-caches mutation (DELETE /api/cache)` | `story-2-5-cache-settings.test.tsx` | Component | ✅ GREEN | `useClearAllCaches` mutation invoked |
| `AC-3: Clear All with confirmation calls DELETE /api/cache` | `story-2-5-settings-service-cache.spec.ts` | E2E | ⚠️ WAIVED | Full round-trip + list refresh — live stack; runs in CI |

---

### AC-4: Empty state when no services configured

**Coverage status: FULL**  
**Heuristic signals:** ✅ Icon visible · ✅ Primary text · ✅ Secondary description · ⚠️ E2E waived

| Test | File | Layer | Status | Notes |
|---|---|---|---|---|
| `shows the bi-database icon when data is empty` | `story-2-5-cache-settings.test.tsx` | Component | ✅ GREEN | `bi-database` icon renders |
| `shows "No service caches yet." primary text` | `story-2-5-cache-settings.test.tsx` | Component | ✅ GREEN | Primary empty-state message |
| `shows the secondary empty-state description text` | `story-2-5-cache-settings.test.tsx` | Component | ✅ GREEN | Secondary description |
| `AC-4: empty state with icon and message` | `story-2-5-settings-service-cache.spec.ts` | E2E | ⚠️ WAIVED | Live stack (no services seeded); runs in CI |

---

### AC-5: Standard User can access and use cache management

**Coverage status: FULL**  
**Heuristic signals:** ✅ Auth positive (Admin) · ✅ Auth positive (Standard User) · ✅ Auth negative (unauthenticated → 401) · ⚠️ E2E waived

| Test | File | Layer | Status | Notes |
|---|---|---|---|---|
| `GetCache_Unauthenticated_Returns401` | `Story2_5_CacheTests.cs` | Integration | ✅ GREEN | Negative path: unauthenticated denied |
| `GetCache_Authenticated_NoServices_Returns200WithEmptyArray` | `Story2_5_CacheTests.cs` | Integration | ✅ GREEN | Admin user positive path |
| `GetCache_StandardUser_Returns200` | `Story2_5_CacheTests.cs` | Integration | ✅ GREEN | Standard User positive path — no Admin role required |
| `AC-5: authenticated user sees cache management UI` | `story-2-5-settings-service-cache.spec.ts` | E2E | ⚠️ WAIVED | Standard User full UI flow — live stack; runs in CI |

---

## Coverage Summary by AC

| AC | Priority | Unit | Component | Integration | E2E | Status |
|---|---|---|---|---|---|---|
| AC-1 | P0 | ✅ 9 tests (formatBytes) | ✅ 8 tests (loading + list) | ✅ 2 tests (GET 200, auth 401) | ⚠️ 1 (waived) | **FULL** |
| AC-2 | P0 | — | ✅ 3 tests (dialog flow) | ✅ 1 test (DELETE 404) | ⚠️ 1 (waived) | **FULL** |
| AC-3 | P1 | — | ✅ 3 tests (dialog flow) | ✅ 1 test (DELETE 200) | ⚠️ 1 (waived) | **FULL** |
| AC-4 | P1 | — | ✅ 3 tests (empty state) | — | ⚠️ 1 (waived) | **FULL** |
| AC-5 | P1 | — | — | ✅ 3 tests (unauth + Admin + Standard) | ⚠️ 1 (waived) | **FULL** |

> AC-4 has no integration test because "no services configured" is solely a UI concern — the API returns `[]` (already covered by the AC-1 empty-array integration test). Component tests are the appropriate layer for empty-state rendering.

---

## E2E Waiver Record

| Test | AC | Waiver reason | CI tag |
|---|---|---|---|
| `AC-1: lists each service with name, entry count, and size` | AC-1 | Requires live Docker stack (Vite :5173 + API :5000 + WireMock) | Will run in CI |
| `AC-2: per-service Clear with confirmation calls DELETE` | AC-2 | Live stack required; exercises full HTTP DELETE + list invalidation | Will run in CI |
| `AC-3: Clear All with confirmation calls DELETE /api/cache` | AC-3 | Live stack required | Will run in CI |
| `AC-4: empty state with icon and message` | AC-4 | Live stack required (DB reset via `POST /api/test/reset-services`) | Will run in CI |
| `AC-5: authenticated user sees cache management UI` | AC-5 | Live stack required (Standard User session state) | Will run in CI |

**Waiver basis:** `project-context.md` E2E policy — Playwright tests require the live full stack and are not run locally. Tests are not skipped (no `test.skip()`); they execute as part of the CI pipeline against the live environment.

---

## Prior Phase Gate Summary

| Phase | Artifact | Verdict |
|---|---|---|
| ATDD (RED) | `atdd-checklist-2-5-settings-service-cache-management.md` | ✅ PASS — All 5 ACs scaffolded; 3 integration tests RED (expected), 1 GREEN-ALREADY (auth guard) |
| Automation (`testarch-automate`) | `automation-summary-2-5-settings-service-cache-management.md` | ✅ PASS — 24 tests added; 29/29 locally-executable GREEN; 3 gaps closed |
| NFR | `nfr-assessment-2-5-settings-service-cache-management.md` | ✅ PASS — 0 BLOCKERs; 2 deferred CONCERNS (synchronous disk I/O, volume-bounded) |
| Code review | `code-review-2-5-settings-service-cache-management.md` | ✅ PASS — 0 blockers; 5 ADVISORY (styling, a11y, escape key, E2E intercept ambiguity, disk I/O); 2 DEFER (pre-existing debt) |

---

## Deferred Items Carried Forward

| ID | Source | Category | Description | Severity |
|---|---|---|---|---|
| C-1 | NFR assessment | Performance | `EstimateSize` synchronous disk I/O on every `GET /api/cache`; no threshold defined | CONCERNS |
| C-2 | NFR assessment | Performance | `ClearAsync`/`ClearAllAsync` synchronous WireMock disk ops on clear; no threshold defined | CONCERNS |
| ADV-1 | Code review | UX | "Clear All" trigger and confirm buttons missing destructive `var(--error)` styling | ADVISORY |
| ADV-2 | Code review | Accessibility | Per-service dialog missing `<h3>` heading and `aria-labelledby` | ADVISORY |
| ADV-3 | Code review | Accessibility | Confirmation dialogs do not handle `Escape` keydown | ADVISORY |
| ADV-4 | Code review | Test quality | E2E `interceptNetworkCall` URL pattern `**/api/cache` is method-blind (DELETE vs GET ambiguity) | ADVISORY |
| ADV-6 | Code review | Convention | Loading and empty-state containers missing `data-testid` | ADVISORY |
| DEF-1 | Code review | Tech debt | `"SERVICE_NOT_FOUND"` as raw string literal (pre-existing pattern) | DEFER |
| DEF-2 | Code review | Tech debt | Bare `catch {}` in `EstimateSize` swallows all exception types (pre-existing pattern) | DEFER |

None of the above items are BLOCKERs. All are deferred to backlog or a future story.

---

## Quality Gate Decision

```
╔══════════════════════════════════════════════════════════════════╗
║  GATE DECISION: ✅ PASS                                          ║
║                                                                  ║
║  Story 2.5 — Settings: Service Cache Management                  ║
║  Coverage: 5/5 ACs FULL                                          ║
║  Tests GREEN: 29/29 (locally executable)                         ║
║  Tests WAIVED: 5/5 E2E (live stack — CI only)                    ║
║  BLOCKER items: 0                                                ║
║  FAIL items: 0                                                   ║
║                                                                  ║
║  Story 2.5 is cleared for the `done` gate.                       ║
╚══════════════════════════════════════════════════════════════════╝
```

**Rationale:** All five acceptance criteria have FULL coverage across at least two test layers each. The four locally-executable test suites (integration × 5, component × 15, unit × 9) are uniformly GREEN. The five E2E Playwright tests are waived under the project's documented E2E policy (live stack required; they run in CI). No BLOCKER or FAIL items were found across ATDD, automation, NFR, or code review phases. Deferred items are CONCERNS or ADVISORY — non-blocking quality notes for the backlog.
