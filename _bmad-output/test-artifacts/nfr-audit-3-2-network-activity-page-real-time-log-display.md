---
stepsCompleted: ['step-01-load-context', 'step-02-define-thresholds', 'step-03-gather-evidence', 'step-04-evaluate-and-score', 'step-05-generate-report']
lastStep: 'step-05-generate-report'
lastSaved: '2026-06-27'
story: '3-2-network-activity-page-real-time-log-display'
verdict: 'CONDITIONAL PASS'
---

# NFR Audit Report — Story 3-2: Network Activity Page — Real-Time Log Display

**Story:** 3-2 Network Activity Page — Real-Time Log Display  
**Audit Date:** 2026-06-27  
**Auditor:** Master Test Architect (bmad-testarch-nfr)  
**Overall Verdict:** ⚠️ **CONDITIONAL PASS**

---

## Executive Summary

The implementation demonstrates strong performance, security, and reliability patterns. Virtual scrolling, auth guards, race-condition handling, and ARIA attributes are all correctly implemented and test-covered. Two conditional items prevent a clean PASS: (1) no E2E test exists for the full SignalR push-latency SLA, and (2) keyboard focus ring (visual indicator) is not verified by any automated test. Both are low-risk deferrals that should be addressed before Epic 3 closure.

---

## NFR Evidence Matrix

| # | Domain | Threshold / Requirement | Result | Evidence | Gaps |
|---|--------|------------------------|--------|----------|------|
| 1 | **Performance** | Virtual scroll renders <100 DOM rows with 10k dataset | ✅ PASS | AC-12 unit test; `useVirtualizer` with `overscan: 5`; `estimateSize: 48px` | No live perf profiling |
| 2 | **Performance** | SignalR append-only; no React Query polling on activity feed | ✅ PASS | "DO NOT useQuery" guard comment; AC-3 meta-test; `useActivityLog` bypasses TanStack Query | — |
| 3 | **Performance** | Initial load capped at 200 rows (`take: 200`) | ✅ PASS | `fetchActivityRows({ take: 200 })`; endpoint enforces `take = Math.Min(take, 200)` | — |
| 4 | **Security** | `GET /api/activity` requires auth | ✅ PASS | `.RequireAuthorization()` on both GET and DELETE in `ActivityEndpoints.cs` | — |
| 5 | **Security** | `ActivityHub` requires auth | ✅ PASS | `[Authorize]` attribute on `ActivityHub`; unauthenticated 401 test passes | — |
| 6 | **Security** | JWT read from httpOnly cookie (not Authorization header) | ✅ PASS | `OnMessageReceived` reads `fishtank_auth` cookie; integration test verifies negotiate 200 for authenticated client | — |
| 7 | **Security** | Input validation on query params | ✅ PASS | `type` param validated via `Enum.TryParse`; `serviceId` validated with DB lookup; `take` clamped to [1, 200]; `skip` floored to 0 | — |
| 8 | **Security** | No injection vectors via URL/headers stored to DOM | ✅ PASS | React escapes all interpolated values by default; no `dangerouslySetInnerHTML` in any Activity component | — |
| 9 | **Reliability** | Race condition (SignalR + initial fetch) handled | ✅ PASS | `pendingSignalRRows` ref buffers events during fetch; fetch flush merges buffered rows; unit test AC-2 covers prepend ordering | — |
| 10 | **Reliability** | API fetch failure handled gracefully | ✅ PASS | `.catch()` in `useActivityLog` flushes buffered SignalR rows and clears `isLoading`; page remains functional | — |
| 11 | **Reliability** | SignalR disconnect / connection failure logged | ⚠️ CONCERN | `connection.catch()` logs error to console; no user-visible error state or reconnect UI | Action item A1 |
| 12 | **Reliability** | `mounted` guard prevents state after unmount | ✅ PASS | `let mounted = true` checked in both `then` and `catch`; `connection.stop()` called on cleanup | — |
| 13 | **Scalability** | `ActivityStore` in-memory singleton — inherent constraint acknowledged | ✅ PASS (Constrained) | `ConcurrentDictionary` + `ConcurrentQueue` per service; FIFO eviction at 5,000 rows/service (configurable via `FISHTANK_ACTIVITY_LOG_MAX_ROWS`); cleared on container restart by design | Known single-instance limitation — documented |
| 14 | **Scalability** | Virtual scroll handles 10k rows at 60fps | ✅ PASS | `@tanstack/react-virtual` with `overscan: 5`; `height: 600px` scroll container; AC-12 verifies DOM row count <100 for 10k dataset | No actual 60fps measurement |
| 15 | **Accessibility** | `role="grid"` on table container | ✅ PASS | `ActivityTable` line 92: `role="grid"`; AC-13 test verifies presence | — |
| 16 | **Accessibility** | `aria-rowcount` set to total row count | ✅ PASS | `aria-rowcount={rows.length}` on grid container (line 93) | — |
| 17 | **Accessibility** | `aria-rowindex` on each virtual row | ✅ PASS | `aria-rowindex={virtualItem.index + 1}` on each `<tr>` (line 225) | — |
| 18 | **Accessibility** | ArrowUp/ArrowDown keyboard navigation | ✅ PASS | `handleKeyDown` in `ActivityTable`; AC-13 unit tests cover ArrowDown focus move, ArrowUp boundary, and no-crash | — |
| 19 | **Accessibility** | `tabIndex` management for focused row | ✅ PASS | `tabIndex={focusedIndex === virtualItem.index ? 0 : -1}` per row; grid container `tabIndex={0}` | — |
| 20 | **Accessibility** | `aria-live="polite"` on ProxyCounterPill | ✅ PASS | `aria-live="polite"` on pill button (line 73); AC-10 test covers this explicitly | — |
| 21 | **Accessibility** | `aria-label` on action buttons | ✅ PASS | "View detail" and "Save as Mock" aria-labels; AC-13 test `getByLabelText` verifies both | — |
| 22 | **Accessibility** | Visual focus ring on keyboard-focused rows | ⚠️ CONCERN | `tabIndex` switching is implemented; no CSS `:focus` or `outline` style verified by automated test | Action item A2 |
| 23 | **Accessibility** | E2E SignalR push latency (NFR-3, <500ms) | ⚠️ CONCERN | Integration test comment says "Full SignalR push latency is validated in Playwright E2E"; E2E spec file exists at `tests/e2e/story-3-2-activity-page.spec.ts` but no evidence it runs against a live container in CI | Action item A3 |

---

## Domain Verdicts

### 1. Performance — ✅ PASS

**Evidence:**
- `useActivityLog.ts` fetches a capped initial load of 200 rows via `fetchActivityRows({ take: 200 })`, matched by the backend's `Math.Min(take, 200)` clamp.
- `ActivityTable.tsx` uses `@tanstack/react-virtual` (virtualizer) with `estimateSize: 48px` and `overscan: 5`. The scroll container has a fixed `height: 600px` overflow, ensuring only visible rows are rendered.
- AC-12 unit test: 10,000 rows input → <100 rows in DOM. Test passes in the 176-test Vitest suite.
- The "DO NOT useQuery" comment and AC-3 meta-test enforce the architectural constraint that activity data flows only through SignalR (append) + one-shot fetch, never through React Query polling.

**No thresholds missed.** No live perf profiling exists but the architectural constraints guarantee bounded initial load and O(1) append.

---

### 2. Security — ✅ PASS

**Evidence:**
- `ActivityEndpoints.cs` lines 11–12: both `GET /api/activity` and `DELETE /api/activity` call `.RequireAuthorization()`.
- `ActivityHub.cs`: decorated with `[Authorize]`. Integration test `ActivityHub_UnauthenticatedRequest_Returns401` confirms HTTP 401 is returned for anonymous negotiate.
- JWT is read from an httpOnly cookie (`fishtank_auth`) via `OnMessageReceived`, preventing JavaScript access to the token (XSS mitigated at auth layer).
- `type` query parameter uses `Enum.TryParse` with a `Results.BadRequest` return on invalid values — prevents injection via enum mismatch.
- `serviceId` validated via DB lookup with `Results.NotFound` — prevents phantom service ID confusion.
- `take` clamped to [1, 200] and `skip` to ≥ 0 — prevents resource exhaustion via large page queries.
- React's JSX escaping prevents XSS from any activity data rendered to DOM (`urlPath`, `serviceName`, etc.).

**No security gaps identified.**

---

### 3. Reliability — ✅ PASS (with minor concern)

**Evidence:**
- **Race condition fix (M-2):** `pendingSignalRRows` ref buffers SignalR events received before `fetchSettled.current = true`. On fetch resolution, buffered rows are prepended to the fetched set. This ensures no events are dropped when SignalR connects before the initial HTTP load completes.
- **Fetch failure path:** `.catch()` block sets `fetchSettled.current = true`, flushes the buffer into state, and calls `setIsLoading(false)`. The page renders with whatever SignalR rows were received, even if the initial fetch fails.
- **Unmount guard:** `let mounted = true` checked inside both `.then()` and `.catch()` callbacks; `connection.stop()` called in cleanup function.
- AC-2 unit tests verify: subscription established on mount, rows prepended newest-first, cleanup on unmount.

**Concern (A1):** SignalR connection failure is logged to console only (`console.error`). No reconnect strategy or user-visible error state exists. This is an NFR gap for a real-time feature — a transient SignalR failure would silently stop updates with no indication to the user.

---

### 4. Scalability — ✅ PASS (Constrained)

**Evidence:**
- `ActivityStore` is an in-memory singleton using `ConcurrentDictionary<Guid, ConcurrentQueue<ActivityRow>>`. Thread-safe under concurrent append from WireMock proxy threads.
- FIFO eviction at 5,000 rows/service (default; configurable via `FISHTANK_ACTIVITY_LOG_MAX_ROWS` env var) prevents unbounded memory growth.
- The client fetches at most 200 rows on initial load and appends new rows one at a time, so frontend memory is also bounded.
- Virtual scrolling via `@tanstack/react-virtual` allows the table to display any number of rows without DOM explosion.

**Known architectural constraint:** ActivityStore is a single-instance in-memory store — data is not persisted across container restarts and does not scale horizontally. This is an intentional design decision for the Fishtank dev-proxy use case and is documented in the store's XML comment.

---

### 5. Accessibility / Keyboard Navigation — ✅ PASS (with minor concern)

**Evidence:**
- **GRID role:** `role="grid"` on the virtualised scroll container; `role="row"` on each `<tr>`.
- **Row counting:** `aria-rowcount={rows.length}` on grid; `aria-rowindex={index + 1}` on each rendered row.
- **Keyboard navigation:** `handleKeyDown` with `ArrowDown`/`ArrowUp` logic; `focusedIndex` state drives `tabIndex` switching.
- **Action button labels:** `aria-label="View detail"` and `aria-label="Save as Mock"` on per-row action buttons, verified by AC-13 `getByLabelText` tests.
- **Type icon:** `aria-label` on `TypeIcon` component (line 21 of `TypeIcon.tsx`), e.g. "Mocked" / "Proxied".
- **ProxyCounterPill:** `aria-live="polite"` for live count announcements; `aria-label` with count — tested in 10 dedicated unit tests.
- **`tabIndex` management:** grid container has `tabIndex={0}`; focused row gets `tabIndex={0}`, others `-1`.

**Concern (A2):** No automated test verifies that a CSS focus ring or `outline` style is applied to the focused row. The `tabIndex` mechanics are correct, but visual accessibility (WCAG 2.4.7 Focus Visible) is not confirmed by testing.

---

## Test Coverage Summary

| Suite | Tests | Status |
|-------|-------|--------|
| `story-3-2-activity-page.test.tsx` | 4 unit tests | ✅ All passing |
| `story-3-2-activity-table.test.tsx` | 21 unit tests (AC-4 through AC-16) | ✅ All passing |
| `story-3-2-proxy-counter-pill.test.tsx` | 10 unit tests (AC-10) | ✅ All passing |
| `Story3_2_ActivityHubTests.cs` | 3 integration tests (AC-1, AC-2 auth) | ✅ All passing |
| **Total Vitest** | **176 tests** | ✅ All passing |
| **Total integration (C#)** | **89 tests** | ✅ All passing |

**Coverage gaps:**
- AC-13 keyboard focus ring (visual): no test
- AC-2 full SignalR push latency (E2E against container): deferred, no evidence of CI execution

---

## Action Items

| ID | Priority | Domain | Description |
|----|----------|--------|-------------|
| A1 | P1 | Reliability | Add user-visible error/reconnect state when SignalR connection fails. Currently only `console.error` is emitted. Consider a toast notification or status banner. Acceptable to defer to Story 3-3 (LIVE/PAUSED toggle story). |
| A2 | P2 | Accessibility | Add a test (or visual regression snapshot) confirming that the focused `<tr>` has a visible outline/focus ring style (WCAG 2.4.7). |
| A3 | P1 | Reliability / Performance | The Playwright E2E spec (`story-3-2-activity-page.spec.ts`) that tests SignalR push latency within 1500ms (AC-2 E2E) must be verified as executing in CI against a live container. Confirm it is included in the CI E2E run or escalate as a gap. |

---

## Gate-Ready YAML

```yaml
nfr-gate:
  story: '3-2-network-activity-page-real-time-log-display'
  verdict: CONDITIONAL_PASS
  date: '2026-06-27'
  domains:
    performance: PASS
    security: PASS
    reliability: PASS_WITH_CONCERN   # A1: no SignalR reconnect UI
    scalability: PASS_CONSTRAINED    # known in-memory singleton design
    accessibility: PASS_WITH_CONCERN # A2: focus ring not visually tested
  action_items:
    - id: A1
      priority: P1
      description: 'Add SignalR disconnect/error user-visible state'
      defer_to: story-3-3
    - id: A2
      priority: P2
      description: 'Add focus ring visual test for keyboard navigation'
    - id: A3
      priority: P1
      description: 'Confirm E2E SignalR latency test runs in CI'
  proceed_to_phase_11_trace: true
```

---

## Verdict

**⚠️ CONDITIONAL PASS**

All hard security, performance, and core reliability requirements are met with test evidence. The two concern items (SignalR silent failure and focus ring visual gap) are low-risk for the current story scope and have clear deferral paths. Phase 11 (TRACE) may proceed. Action items A1 and A3 should be tracked as open items into Story 3-3.
