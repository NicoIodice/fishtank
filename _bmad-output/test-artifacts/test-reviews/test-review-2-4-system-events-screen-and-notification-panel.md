---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-quality-evaluation', 'step-03f-aggregate-scores', 'step-04-generate-report']
lastStep: 'step-04-generate-report'
lastSaved: '2026-06-26'
workflowType: 'testarch-test-review'
overallGrade: 'C+'
overallScore: 78
verdict: 'CONCERNS'
blockerCount: 1
---

# Test Quality Review — Story 2-4: System Events Screen & Notification Panel

**Date:** 2026-06-26
**Story:** `2-4-system-events-screen-and-notification-panel`
**Overall Grade:** C+ (78/100)
**Verdict:** CONCERNS ⚠️

**BLOCKER COUNT: 1**

> **Scope:** This review assesses TEST QUALITY only (determinism, isolation, async handling, meaningful assertions, layering, E2E mocking policy). Coverage/traceability is assessed separately. Product code was read only to confirm whether a finding is a test-only fix vs. a product-code change.

---

## Score Summary

| Dimension | Score | Grade | Key Findings |
|-----------|-------|-------|--------------|
| Determinism | 60/100 | D | One BLOCKER (E2E exact-count on shared mutable backend under parallel workers) + one HIGH (integration `Task.Delay(15)` timestamp race that also exposes a product ordering gap) |
| Isolation | 80/100 | B- | Integration + unit isolation is correct; E2E relies on once-per-run DB reset while tests accumulate rows in a shared DB |
| Async handling | 92/100 | A- | Frontend uses `findBy`/`waitFor`/`expect.poll` correctly; no arbitrary sleeps except the integration `Task.Delay` |
| Meaningful assertions | 85/100 | B | Strong DTO/contract assertions; AC-3 E2E badge assertion is weak (`not.toHaveText(before)`) |
| Maintainability | 80/100 | B- | Clear AAA, descriptive `DisplayName`s; stale RED-phase comments now contradict implemented code |
| **Overall** | **78/100** | **C+** | 1 BLOCKER, 2 HIGH; one finding requires a product-code change to fully resolve |

---

## BLOCKERS (1)

### B1 — E2E AC-4 asserts an exact count (`toHaveCount(20)`) against a shared, mutable backend run under parallel workers

- **File:** `src/client/tests/e2e/story-2-4-system-events.spec.ts:166` (also `:155` seeding, `:165` locator)
- **Severity:** BLOCKER (flaky-by-design)
- **What:** The AC-4 test seeds 22 failing services and then asserts the panel shows **exactly** 20 warning/error items on first open:
  ```ts
  for (let i = 0; i < 22; i++) await seedFailingService(request);
  ...
  await expect(items).toHaveCount(20);
  ```
  The database is wiped **once** in `global-setup.ts` (`POST /api/test/reset-db`), not per test. Every prior test in this file (`AC-1` seeds 2, `AC-3` seeds 1, `AC-5` seeds 2+1) writes warning/error rows into the **same** backend DB, and `playwright.config.ts` sets `fullyParallel: true` with `workers: 2` and `retries: 2` on CI. Therefore the count of unread warning/error events visible to AC-4 is the sum of whatever other tests/workers have already seeded — it is not deterministically 20. The exact-count assertion will pass or fail depending on scheduling and retry order.
- **Why it is a BLOCKER and not a NIT:** an exact `toHaveCount(20)` on globally-shared, monotonically-growing state is non-deterministic by construction. It gives false confidence (green locally where it happens to run first/single-worker; red intermittently in CI), which is exactly the failure mode test review must gate.
- **Fix (test-only):** make the assertion robust to a polluted shared backend. Options, in order of preference:
  1. Assert the **page-size invariant** instead of the absolute total: `expect(await items.count()).toBeLessThanOrEqual(20)` plus, after Load more, `expect(itemsAfter).toBeGreaterThan(itemsBefore)`. This validates "20 per page + Load more appends" without depending on global totals.
  2. Or scope the assertion to events this test created (filter panel items by the unique `name`/message produced via `uniqueMessage(...)`), so concurrent rows are ignored.
  3. Do **not** rely on a per-test DB reset for E2E — the project policy is a shared live stack, so the test must be written to tolerate co-resident data.
- **Product-code change required?** No — this is fixable entirely in the test.

---

## HIGH (2)

### H1 — Integration `List_OrderedNewestFirst` uses `await Task.Delay(15)` to force timestamp ordering, masking a product ordering gap

- **File:** `src/Fishtank.Api.IntegrationTests/Api/Story2_4_SystemEventsTests.cs:144`
  ```cs
  await SeedEventAsync(SystemEventSeverity.Warning, "oldest");
  await Task.Delay(15);
  await SeedEventAsync(SystemEventSeverity.Warning, "newest");
  ```
- **Severity:** HIGH (flaky-by-design + reveals a product-code weakness)
- **What:** Ordering is asserted purely by `CreatedAt`. The product (`SystemEventService.ListAsync`, lines 63–68) sorts `OrderByDescending(e => e.CreatedAt)` with **no tiebreaker**, and the entity sets `CreatedAt = DateTimeOffset.UtcNow` (`SystemEvent.cs:10`). `DateTimeOffset.UtcNow` has coarse resolution; two `AddAsync` calls in quick succession can land on the **same** tick. The test inserts a 15 ms real-timer sleep specifically to separate the two timestamps so the order is observable. Remove the sleep and the test becomes order-nondeterministic.
- **Why it matters:** The sleep papers over the fact that production newest-first ordering is itself ambiguous for events created within the same clock tick (entirely plausible for two engine crashes during one start sequence). The test "passes" only because it hand-spaces the inserts; real traffic gets no such spacing.
- **Fix:**
  - **Product-code change (recommended, to make the behavior actually deterministic):** add a stable secondary sort in `ListAsync`, e.g. `OrderByDescending(e => e.CreatedAt).ThenByDescending(e => e.Id)`, or introduce a monotonic insertion sequence column and order by it. Then the test can drop the `Task.Delay`.
  - **Test-only stopgap (if product change is deferred):** stop using wall-clock spacing — seed two events and assert ordering against an explicit, controlled `CreatedAt` (or assert only the count, leaving ordering to the unit layer). The current `Task.Delay(15)` should not ship as-is.
- **Product-code change required?** Yes to fully fix (the ordering ambiguity is in product code). The test can be made non-flaky on its own as a stopgap, but that only hides the underlying nondeterminism.

### H2 — E2E `seedFailingService` swallows all errors and assumes exactly one error event per call

- **File:** `src/client/tests/e2e/story-2-4-system-events.spec.ts:66-81`
  ```ts
  await request.fetch(".../api/services", { ... port: 30100 ... }).catch(() => {});
  ```
- **Severity:** HIGH (reliability / hidden under-seeding)
- **What:** Every seed swallows its result with `.catch(() => {})` and assumes the engine-crash path wrote exactly one `error` SystemEvent. If the API rejects the request earlier (e.g. duplicate name, port-range validation, or a duplicate-port 409 before the engine is ever started), **no** event row is produced — silently. Tests that need N events (AC-4 needs ≥22, the pagination tests need >20) will then under-seed and fail for the wrong reason, with no diagnostic.
- **Why it matters:** The helper's correctness is invisible: a swallowed 4xx looks identical to a successful "crash → event" path. This couples every seed-dependent test to an undocumented side effect of the service-create endpoint.
- **Fix:** assert the side effect, not the request. After seeding, poll `getUnreadCount(request)` (or the list endpoint) and proceed only once the expected number of events exists — e.g. use the `recurse`/`expect.poll` fixture to wait until the count reaches the target. Better: if/when a test-only "create system event" seed route exists, use it (the file's own NOTE at lines 61-65 anticipates this). Do not silently `.catch(() => {})`; at minimum log the swallowed failure.
- **Product-code change required?** No (a deterministic test-seed endpoint would help but is optional); fixable in the test by asserting the seeded state before acting.

---

## MEDIUM (2)

| # | File:Line | Finding | Fix |
|---|-----------|---------|-----|
| M1 | `story-2-4-system-events.spec.ts:135-144` (AC-3) | Badge assertion is weak/fragile: captures `before` as the badge text (or "0") then asserts `not.toHaveText(before)`. Combined with the shared polluted DB, `before` may already reflect other tests' events, and "changed from before" is a thin guarantee (does not verify an *increment*). | Read the unread count via `getUnreadCount(request)` before/after and assert `after === before + 1` with `expect.poll`, consistent with AC-5's approach. Avoids depending on rendered badge text and on `"99+"` capping. |
| M2 | `NotificationPanel.test.tsx:39-41,112-117` | Module-level mutable shared state (`unreadCount`, `readIds`, `markAllReadCalls`) drives the fetch mock. It is reset in `beforeEach`, so tests are isolated today, but the pattern is fragile — any future test that forgets the reset, or any `it.concurrent`, leaks state across tests. | Acceptable as-is given the `beforeEach` reset. To harden, encapsulate the mutable state inside `installFetchMock()` (return a fresh closure per call) so it cannot outlive a test. |

---

## LOW / NIT (4)

| # | File:Line | Finding | Action |
|---|-----------|---------|--------|
| L1 | `story-2-4-system-events.spec.ts:24-31, 130-133, 162, 251, 276, 288` | Stale RED-phase comments now contradict the shipped code (e.g. "TopBar still uses `topbar-bell-button`", "panel does not exist yet", "RED: 404 today"). Source confirms `topbar-btn-bell`, `sidebar-nav-events`, and the panel now exist. Misleading to a future reader. | Remove/refresh the RED-phase annotations post-implementation (NIT — does not affect correctness). |
| L2 | `Story2_4_SystemEventsTests.cs:12-37` | File/class header still describes the suite as "RED-PHASE … COMPILE … FAIL at runtime (404 / contract mismatch)". The endpoints are now implemented, so these tests are green-phase regression tests. | Update the header comment to reflect green-phase status. |
| L3 | `NotificationPanel.test.tsx:91-97` | `jsonResponse` casts a partial literal `as Response` (only `ok/status/json`). Works for the hook under test, but a brittle shim if the client ever reads other `Response` members. | Acceptable; note for future (use `new Response(JSON.stringify(body), {...})` if the client surface grows). |
| L4 | `SystemEventServiceTests.cs:172`, `ListAsync_LastPage_HasMoreFalse` | Paging tests rely on insertion order to pick `Items[0]` / page boundaries, and the product orders by `CreatedAt` with no tiebreaker (see H1). These tests assert **counts** only (not which specific item), so they are not order-flaky today. | No action; flagged for awareness alongside H1. |

---

## What is GOOD (kept for the record)

- **Unit `SystemEventServiceTests.cs`** is the strongest file: per-instance InMemory DB (`Guid.NewGuid()`), correct `IDisposable` cleanup, `ClearReceivedCalls()` to isolate the create-broadcast from the assertion, meaningful contract assertions (verbatim message, lowercased severity, `IsRead=false`), idempotency and unknown-id edge cases, and the mark-all-read test deliberately exceeds one page (30 items) to prove it is not page-bounded. Deterministic and well-isolated.
- **Frontend unit tests** use `findBy*` / `waitFor` / `userEvent` throughout — no arbitrary `setTimeout`/sleep, `vi.restoreAllMocks()` in `afterEach`, deterministic fixtures with fixed UTC dates. `SystemEventItem.test.tsx` asserts real behavior (opacity cue, `stopPropagation` on link/dismiss, deep-link href, verbatim message, service-tag omission) rather than "renders without throwing".
- **Integration tests** reset the DB per test via `IntegrationTestBase.InitializeAsync → ResetDatabaseAsync()`, seed deterministically through the real service layer, and assert the response envelope shape + error codes (`SYSTEM_EVENT_NOT_FOUND`). Auth regression guards (401 unauthenticated) are present.
- **E2E** correctly follows the backend-mocking policy: it hits the **live** stack with no backend stubbing, uses `storageState` auth (`playwright.config.ts:25`) seeded once in `global-setup.ts`, uses canonical `data-testid`s that exist in source, and uses `expect.poll` for the eventually-consistent badge/count flows (AC-5). The real-time SignalR path is correctly pushed to E2E rather than faked at a lower layer.

---

## Gate Decision

**CONCERNS ⚠️ — 1 BLOCKER must be fixed before this gate passes.**

- **B1** (E2E exact-count on shared mutable backend under parallel workers) is a flaky-by-design defect that will produce intermittent CI failures and false confidence. It is fixable in the test alone.
- **H1** additionally exposes a genuine product-code gap (no stable secondary sort in `SystemEventService.ListAsync`); recommend a `ThenBy(Id)`/sequence tiebreaker so newest-first is deterministic, after which the integration `Task.Delay(15)` can be removed.
- **H2** should be fixed so seed failures cannot silently under-seed.

Remediate B1 (and ideally H1/H2) and re-run the gate.
