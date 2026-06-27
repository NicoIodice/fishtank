---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-quality-evaluation', 'step-04-generate-report']
lastStep: 'step-04-generate-report'
lastSaved: '2026-06-27'
workflowType: 'testarch-test-review'
inputDocuments:
  - src/Fishtank.Api.IntegrationTests/Api/Story2_5_CacheTests.cs
  - src/client/tests/e2e/story-2-5-settings-service-cache.spec.ts
  - src/client/tests/unit/features/story-2-5-cache-settings.test.tsx
  - src/client/tests/unit/features/story-2-5-cache-types.test.ts
  - _bmad-output/test-artifacts/atdd-checklist-2-5-settings-service-cache-management.md
  - _bmad-output/test-artifacts/automation-summary-2-5-settings-service-cache-management.md
---

# Test Quality Review — Story 2.5: Settings — Service Cache Management

**Quality Score**: 82/100 (B — Good, with one blocking defect)
**Review Date**: 2026-06-27
**Review Scope**: Single story — 4 test files (29 tests across 4 layers)
**Reviewer**: TEA Agent (Master Test Architect)
**Gate Verdict**: ❌ **FAIL** — 1 BLOCKER must be resolved before CI green-phase

---

> **Coverage note:** This review audits test quality only. Coverage mapping is out of scope — use
> `bmad-testarch-trace` for traceability matrix and coverage gate decisions.

---

## Executive Summary

**Overall Assessment**: Good

**Recommendation**: Request Changes (1 BLOCKER, 7 advisories)

### Key Strengths

✅ Full AC coverage across all 5 ACs (AC-1 through AC-5) is achieved across the layer pyramid  
✅ Fixture and mock discipline is excellent: fresh QueryClient per component test, `vi.stubGlobal` 
   pattern consistent with project conventions, `interceptNetworkCall` used (not ad-hoc `waitForResponse`)  
✅ Network-first ordering is correct in all E2E tests — intercepts are registered before the actions
   that trigger the relevant network calls; no race conditions in happy-path flows  
✅ Data factories (`faker`, `uniqueName`, `seedService`) prevent hardcoded collision between runs  
✅ No hard waits (`waitForTimeout`, `Thread.Sleep`) anywhere in the suite  

### Key Weaknesses

❌ **BLOCKER:** AC-4 E2E calls `POST /api/test/reset-services` (global teardown) inside a test body
   in a suite configured with `fullyParallel: true` — guaranteed intermittent CI failures  
⚠️ AC-2 and AC-3 component "Confirm" tests stop at mutation-called; they do not assert dialog
   close or list re-fetch, leaving the React Query invalidation contract unverified at component level  
⚠️ AC-2 integration layer has no happy-path test for `DELETE /api/cache/{id}` when the service
   exists — only the 404 error path is covered at this layer  

### Summary

The test suite for Story 2.5 is well-structured, uses correct patterns for all three layers
(xUnit integration, Vitest/RTL component, Playwright E2E), and achieves full AC coverage. The
fixture and mock discipline is clean throughout. One structural defect in the E2E layer must be
fixed before this test suite is safe to run in CI: the AC-4 empty-state test performs a global
database teardown (`POST /api/test/reset-services`) that will intermittently destroy services
seeded by concurrently-running AC-1, AC-2, AC-3, and AC-5 tests. With `fullyParallel: true` (the
project default in `playwright.config.ts`) and `workers: 2` in CI, tests within the same file run
across workers, making this collision highly probable. Once that BLOCKER is resolved, the remaining
findings are advisory-level refinements.

---

## Quality Criteria Assessment

| Criterion                            | Status      | Violations | Notes                                                            |
| ------------------------------------ | ----------- | ---------- | ---------------------------------------------------------------- |
| BDD Format (Given-When-Then)         | ✅ PASS     | 0          | E2E/component tests use clear Arrange/Act/Assert with comments   |
| Test IDs (`data-testid`)             | ✅ PASS     | 0          | Canonical slug-based IDs used consistently in E2E and component  |
| Priority Markers (P0/P1)             | ✅ PASS     | 0          | E2E describes carry P0/P1; integration uses AC labels; unit N/A  |
| Hard Waits                           | ✅ PASS     | 0          | No `waitForTimeout`, `Thread.Sleep`, or `setTimeout` anywhere    |
| Determinism                          | ✅ PASS     | 0          | No if/else flow control, no unseeded random, no try/catch abuse  |
| Isolation (cleanup / shared state)   | ❌ FAIL     | 1          | **BLOCKER** — AC-4 global reset in parallel suite (see B-1)      |
| Fixture Patterns                     | ✅ PASS     | 0          | `mergeTests` composite fixture; `interceptNetworkCall` used       |
| Data Factories                       | ✅ PASS     | 0          | `seedService` + `uniqueName(faker)` for E2E; fixed fixtures for component |
| Network-First Pattern                | ✅ PASS     | 0          | Intercepts always set before the triggering click (see note A-7) |
| Explicit Assertions                  | ⚠️ WARN     | 2          | AC-2/AC-3 confirms: mutation called but dialog close + refetch unverified |
| Test Length (≤300 lines)             | ⚠️ WARN     | 1          | `cache-settings.test.tsx` = ~323 lines (8% over ideal threshold) |
| Test Duration (≤1.5 min)             | ✅ PASS     | 0          | Integration runs ~4 s; unit/component are sub-second; E2E: N/A locally |

---

## Findings

### BLOCKERS

---

#### B-1 — AC-4 E2E: Global `reset-services` teardown in fully-parallel suite
**File:** `src/client/tests/e2e/story-2-5-settings-service-cache.spec.ts`  
**Lines:** ~217–220  
**Severity:** BLOCKER — intermittent CI failure  

**Problem:**

```typescript
// AC-4 test, line ~217
await request.post(`${API_URL}/api/test/reset-services`);
```

`playwright.config.ts` sets `fullyParallel: true` and `workers: 2` in CI. Under these settings,
all 5 tests in this spec file are distributed across workers and execute concurrently. The AC-4
test calls `POST /api/test/reset-services` at the start of its body, which deletes **all services**
in the database — including services seeded moments earlier by the concurrently-executing AC-1,
AC-2, AC-3, and AC-5 tests. Those tests will then fail with "element not found" because the service
rows they seeded have been deleted.

Realistic collision scenario (2 workers in CI):
```
Worker 1 (AC-1):  seedService("ac1-svc-xyz")   → service exists
Worker 2 (AC-4):  POST /api/test/reset-services → ALL services deleted
Worker 1 (AC-1):  getByTestId("settings-btn-clear-cache-ac1-svc-xyz") → NOT FOUND → ❌ FAIL
```

This will cause random CI failures roughly 40–70% of the time depending on worker timing.

**Fix — Option A (preferred): Scoped cleanup**

Replace the global reset with a scoped approach. Create a service in AC-4's own setup and clean it
up using `test.afterEach` (or simply don't seed — the empty state is only guaranteed if no other
services exist, so AC-4 needs its own approach). The most robust fix:

```typescript
test.describe("Story 2.5 — P1: AC-4 Empty state when no services configured", () => {
  // Run this describe serially, after all other tests in the file, to avoid collisions.
  test.describe.configure({ mode: 'serial' });

  let seededIds: string[] = [];

  test.afterEach(async ({ request }) => {
    // Clean up only services seeded by this test
    for (const id of seededIds) {
      await request.delete(`${API_URL}/api/services/${id}`).catch(() => {});
    }
    seededIds = [];
  });

  test("with no services, Cache section shows empty state ...", async ({ page, request }) => {
    // Arrange: Delete only services this test knows about,
    // or accept that "empty state" means "no services created BY THIS TEST".
    // The simplest guarantee: don't seed, and accept that the test is only
    // reliable in a clean environment or when run in serial mode.
    await page.goto("/settings");
    await page.getByTestId("settings-nav-cache").click();
    // ...
  });
});
```

**Fix — Option B (minimal): `test.describe.configure({ mode: 'serial' })` for the whole file**

Add at the top of the spec file:
```typescript
test.describe.configure({ mode: 'serial' });
```
This makes ALL 5 tests run serially on a single worker, eliminating the race condition. Downside:
loses parallelism across the whole story-2-5 spec file. Acceptable if the suite is fast enough.

**Fix — Option C: Remove `POST /api/test/reset-services` entirely**

Instead of resetting all services, seed a service with a known name in AC-4 and then delete it to
confirm the empty-state is rendered. Or, navigate to the real empty state by only asserting when
the component receives `[]` from the GET — this is already proven by the component test.
Confirm whether a dedicated E2E test for AC-4's empty state is worth the isolation cost.

---

### ADVISORY ITEMS

---

#### A-1 — AC-2 integration: missing happy-path test for `DELETE /api/cache/{id}` (service exists)
**File:** `src/Fishtank.Api.IntegrationTests/Api/Story2_5_CacheTests.cs`  
**Severity:** Advisory  

The only integration test for AC-2's `DELETE /api/cache/{id}` endpoint exercises the error path
(non-existent ID → 404). There is no integration test that:
1. Seeds a real service in the database  
2. Calls `DELETE /api/cache/{serviceId}`  
3. Asserts `200 OK` + `{ "success": true, "data": null }`  

The happy path is covered by the E2E (AC-2 Playwright test), but if the E2E fails for unrelated
reasons, there's no integration-level safety net for the DELETE success contract.

**Suggested addition:**

```csharp
[Fact(DisplayName = "AC-2: DELETE /api/cache/{id} for existing service → 200 success")]
public async Task DeleteCache_ExistingService_Returns200()
{
    var client = await GetAuthenticatedClientAsync();
    
    // Seed a service directly via the services endpoint
    var createResp = await client.PostAsJsonAsync("/api/services", new
    {
        name = "cache-test-svc",
        externalUrl = "http://example.com",
        port = 39999,
        tags = Array.Empty<string>()
    });
    createResp.StatusCode.Should().Be(HttpStatusCode.Created);
    var created = await createResp.Content.ReadFromJsonAsync<JsonElement>();
    var serviceId = created.GetProperty("data").GetProperty("id").GetString();
    
    var response = await client.DeleteAsync($"/api/cache/{serviceId}");
    
    response.StatusCode.Should().Be(HttpStatusCode.OK);
    var body = await response.Content.ReadFromJsonAsync<JsonElement>();
    body.GetProperty("success").GetBoolean().Should().BeTrue();
    body.GetProperty("data").ValueKind.Should().Be(JsonValueKind.Null);
}
```

---

#### A-2 — AC-2/AC-3 component tests: Confirm path does not assert dialog-close or list-refetch
**File:** `src/client/tests/unit/features/story-2-5-cache-settings.test.tsx`  
**Lines:** ~215–228 (AC-2 confirm), ~310–325 (AC-3 confirm)  
**Severity:** Advisory  

Both "Confirm calls the mutation" tests stop at verifying `deleteMock.toHaveBeenCalledTimes(1)`.
They do not assert:
1. The confirmation dialog is closed after confirm (`expect(screen.queryByRole("dialog")).toBeNull()`)
2. A GET re-fetch was triggered (verifying React Query cache invalidation)

The AC explicitly requires "list refreshes." The refetch contract is verified at E2E level but is
unverified at component level. A regression in the `onSuccess` / `invalidateQueries` call in
`useServiceCache.ts` would not be caught by these tests.

**Suggested additions at end of each "Confirm" test:**

```typescript
// After waitFor that mutation was called:

// Assert: dialog closes after confirm
await waitFor(() => {
  expect(screen.queryByRole("dialog")).toBeNull();
});

// Assert: list re-fetched — GET was called again after the DELETE
const getCalls = (fetchMock.mock.calls as [RequestInfo | URL, RequestInit?][])
  .filter(([, init]) => (init?.method ?? "GET").toUpperCase() === "GET");
expect(getCalls.length).toBeGreaterThanOrEqual(2); // initial load + invalidation refetch
```

---

#### A-3 — AC-5 Standard User: DELETE operations not verified at any layer for Standard User role
**Files:** `Story2_5_CacheTests.cs`, `story-2-5-settings-service-cache.spec.ts`  
**Severity:** Advisory  

AC-5 specifies that a Standard User "can access cache management." The integration test
`GetCache_StandardUser_Returns200` verifies GET /api/cache succeeds for Standard User. The E2E
AC-5 test uses the global `storageState` (likely Admin) and only checks UI visibility.

Neither layer verifies that a Standard User can **execute** DELETE /api/cache/{id} or DELETE
/api/cache. If the endpoint has role-based authorization differences between GET and DELETE (e.g.,
only Admin can clear), this gap would miss it.

**Suggested addition to `Story2_5_CacheTests.cs`:**

```csharp
[Fact(DisplayName = "AC-5: DELETE /api/cache with Standard User → 200 (no Admin-only policy)")]
public async Task DeleteAllCaches_StandardUser_Returns200()
{
    // ... (same setup as GetCache_StandardUser_Returns200)
    var stdClient = /* standard user client */;
    var response = await stdClient.DeleteAsync("/api/cache");
    response.StatusCode.Should().Be(HttpStatusCode.OK);
}
```

---

#### A-4 — `vi.restoreAllMocks()` semantically incorrect for `vi.stubGlobal` cleanup
**File:** `src/client/tests/unit/features/story-2-5-cache-settings.test.tsx`  
**Lines:** ~88–90  
**Severity:** Advisory (no functional impact)  

```typescript
afterEach(() => {
  vi.restoreAllMocks();  // ← restores vi.spyOn mocks, NOT vi.stubGlobal globals
});
```

`vi.restoreAllMocks()` restores mocks created with `vi.spyOn()` and `vi.fn()`. The proper cleanup
for `vi.stubGlobal("fetch", ...)` is `vi.unstubAllGlobals()`. In practice this test file works
correctly because `beforeEach` always re-installs a fresh mock before each test, so the stale
global stub doesn't cause cross-test contamination. However, the semantic mismatch should be
corrected for clarity and correctness in cases where `beforeEach` might be removed or refactored.

**Fix:**

```typescript
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals(); // add this
});
```

---

#### A-5 — `story-2-5-cache-settings.test.tsx` slightly over 300-line soft limit
**File:** `src/client/tests/unit/features/story-2-5-cache-settings.test.tsx`  
**Lines:** ~323  
**Severity:** Advisory (cosmetic)  

The file is 8% over the 300-line ideal threshold defined in the project's quality DoD. This is
borderline and the file structure is clean. No immediate action required, but as the component
grows (e.g., error-state tests, loading-error coverage), consider splitting into:
- `story-2-5-cache-settings-list.test.tsx` (AC-1/AC-4 rendering)
- `story-2-5-cache-settings-dialogs.test.tsx` (AC-2/AC-3 interactions)

---

#### A-6 — `formatBytes`: no negative, NaN, or Infinity edge-case tests
**File:** `src/client/tests/unit/features/story-2-5-cache-types.test.ts`  
**Severity:** Advisory (low risk)  

The nine tests exhaustively cover the four documented branches (0 B, bytes, KB, MB). They do not
test: `formatBytes(-1)`, `formatBytes(NaN)`, `formatBytes(Infinity)`. Since `estimatedBytes` comes
from the API and is always ≥ 0 in the contract, this is low risk. If the function is ever used
for display of user-provided or unvalidated data, these cases matter.

---

#### A-7 — AC-3 E2E: `interceptNetworkCall` URL pattern `**/api/cache` matches both GET and DELETE
**File:** `src/client/tests/e2e/story-2-5-settings-service-cache.spec.ts`  
**Lines:** ~162–163  
**Severity:** Advisory (low probability, well-commented)  

```typescript
const clearAllCall = interceptNetworkCall({ url: "**/api/cache" });
```

This pattern matches any method to `/api/cache` — both the initial `GET /api/cache` and the
`DELETE /api/cache`. The test comment correctly notes the intercept is placed after the initial GET
has already completed. In practice this is correct because React Query completes the GET during
`page.goto` + nav-click, and the next `/api/cache` call will be the DELETE on confirm.

However, if React Query triggers a background re-fetch (e.g., window focus refetch, stale-while-
revalidate) between setting up the intercept and clicking "Confirm," `clearAllCall` could resolve
with a `GET 200` instead of `DELETE 200`, causing `expect(status).toBe(200)` to pass vacuously
while the DELETE was never verified.

**Suggested improvement:**

Use a method-scoped intercept if `interceptNetworkCall` supports it, or add a method assertion:

```typescript
const clearAllCall = interceptNetworkCall({ url: "**/api/cache" });
// ... click confirm ...
const { status, method } = await clearAllCall;
expect(method?.toUpperCase()).toBe("DELETE"); // guard against capturing a stray GET
expect(status).toBe(200);
```

---

## AC Coverage Verdict

| AC | Integration | Component | E2E | Gap? |
|----|------------|-----------|-----|------|
| AC-1: Cache list with entry count + size | ✅ (empty array GET) | ✅ (loading, list, formatBytes) | ✅ (P0) | Happy-path GET with real entries missing at integration (Advisory A-1 scope) |
| AC-2: Per-service Clear + confirmation + DELETE + refresh | ⚠️ (error path only) | ⚠️ (mutation called; no refresh assert) | ✅ (P0) | See B-1, A-1, A-2 |
| AC-3: Clear All + confirmation + DELETE + refresh | ✅ | ⚠️ (mutation called; no refresh assert) | ✅ (P1) | See A-2 |
| AC-4: Empty state | ✅ (via AC-1 empty array) | ✅ (icon, text, description) | ⚠️ global reset blocker | See B-1 |
| AC-5: Standard User access | ✅ (GET + Standard User) | N/A | ⚠️ Admin storageState used | See A-3 |

---

## Score Breakdown

| Category         | Deductions | Reason                                    |
|------------------|-----------|-------------------------------------------|
| Starting score   | 100       |                                           |
| Isolation        | -10       | B-1: Global reset in parallel suite (P0 violation) |
| Assertions       | -4        | A-2: 2× confirm tests missing dialog+refetch assertions |
| AC coverage      | -2        | A-1: AC-2 happy path missing at integration layer |
| Cleanup          | -1        | A-4: `vi.restoreAllMocks` semantic issue  |
| Test length      | -1        | A-5: 323-line file (soft limit)           |
| **Final Score**  | **82/100** | **B — Good**                             |

---

## Gate Verdict

```
╔════════════════════════════════════════════════════════════════╗
║  GATE: ❌ FAIL                                                 ║
║  Blockers: 1 (B-1 — parallel isolation in AC-4 E2E)           ║
║  Advisory: 7 items                                             ║
║                                                                ║
║  Required before CI green-phase:                               ║
║    Fix B-1 (AC-4 global reset / parallel isolation)            ║
╚════════════════════════════════════════════════════════════════╝
```

**Next recommended workflow:** Fix B-1, then run `bmad-testarch-trace` to produce the
traceability matrix and formal coverage gate decision.
