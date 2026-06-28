---
stepsCompleted: [1, 2, 3, 4]
lastStep: 'step-04-generate-report'
lastSaved: '2026-06-27'
workflowType: 'testarch-test-review'
inputDocuments:
  - src/client/tests/unit/features/story-3-2-activity-page.test.tsx
  - src/client/tests/unit/features/story-3-2-activity-table.test.tsx
  - src/client/tests/unit/features/story-3-2-proxy-counter-pill.test.tsx
  - src/Fishtank.Api.IntegrationTests/Api/Story3_2_ActivityHubTests.cs
---

# Test Quality Review: Story 3-2 — Network Activity Page / Real-Time Log Display

**Quality Score**: 84/100 (B+ — Good)
**Review Date**: 2026-06-27
**Review Scope**: Suite (4 test files across unit + integration layers)
**Reviewer**: Murat (TEA Agent — bmad-testarch-test-review)

---

> This review audits existing tests; it does not generate tests.
> Coverage mapping and coverage gates are out of scope here. Use `trace` for coverage decisions.

## Executive Summary

**Overall Assessment**: Good

**Recommendation**: Approve with Comments

### Key Strengths

✅ Creative `capturedHandlers` pattern captures live SignalR callbacks for deterministic async testing
✅ Virtual-scroll mock (`@tanstack/react-virtual`) enables high-fidelity `ActivityTable` testing in jsdom
✅ `ProxyCounterPill` — 10 targeted tests covering every AC-10 sub-requirement including a11y and keyboard dismissal
✅ Excellent test isolation — every `describe` block has a `beforeEach` that resets all mocks and shared handler state
✅ Clear BDD-style naming (`AC-N: description`) on every test
✅ Integration tests follow established story patterns (hub negotiate + ordering), with explicit scope comments explaining what is left to E2E

### Key Weaknesses

❌ **False positive (AC-10):** error-color assertion in `story-3-2-proxy-counter-pill.test.tsx` tests count display only, not the color — the AC violation would pass silently
❌ **Permissive CSS-variable check (AC-8):** `story-3-2-activity-table.test.tsx` accepts either `error-row-bg` or raw `rgba(254…)` — allows a hardcoded value to satisfy a test that requires a CSS variable
❌ **Coverage gaps:** AC-5 PUT/PATCH color chips not tested; AC-2 SignalR unmount cleanup test planned in ATDD but omitted; AC-13 ArrowUp boundary assertion is a no-op

### Summary

The Story 3-2 test suite is well-structured, inventively mocked, and clearly tied to acceptance criteria. The 36 Vitest tests and 3 xUnit integration tests cover 13 of 17 ACs (AC-11, AC-14, AC-17 are intentionally deferred to E2E/manual; AC-16 partial coverage by design). The two most important findings are functional false positives: a test that claims to verify an error color but only checks the count, and a test that accepts hardcoded RGBA where a CSS variable is contractually required. Both are easy one-line fixes. The remaining gaps are MINOR and low risk.

---

## AC Coverage Matrix

| AC | Description | Unit Tests | Integration Tests | Overall Status |
|----|-------------|-----------|-------------------|---------------|
| AC-1 | Initial load newest-first via apiFetch | ✅ activity-page (1 test) | ✅ Integration (1 test) | **COVERED** |
| AC-2 | SignalR row prepend + hub availability | ✅ activity-page (2 tests: subscribe + order) | ✅ Integration (2 tests: 401, negotiate) | **COVERED** (full push latency → E2E, see note) |
| AC-3 | No useQuery constraint | ✅ activity-page (1 meta-source test) | — | **COVERED** |
| AC-4 | Default visible columns in order | ✅ activity-table (1 test) | — | **COVERED** |
| AC-5 | Method chips — DESIGN.md token colors | ✅ activity-table (4 tests: GET/POST/DELETE/unknown) | — | **PARTIAL** — PUT (amber-600) and PATCH (violet-500) not tested |
| AC-6 | Type column Bootstrap Icons + tooltips | ✅ activity-table (2 tests: bi-database, bi-arrow-repeat) | — | **PARTIAL** — Deep Ocean theme override (`#34d399`) not tested |
| AC-7 | Amber left-border on Proxied+Live rows | ✅ activity-table (2 tests: Live+pos, Stopped+neg) | — | **COVERED** |
| AC-8 | Red background on 5xx rows | ✅ activity-table (2 tests: 5xx pos, 2xx neg) | — | **COVERED** with WARNING — see Finding 2 |
| AC-9 | Both row highlights simultaneously | ✅ activity-table (1 test: Proxied+Live+5xx) | — | **COVERED** |
| AC-10 | Proxy counter pill | ✅ proxy-counter-pill (10 tests) | — | **COVERED** with WARNING — see Finding 1 |
| AC-11 | Page header element order + stubs | — | — | **DEFERRED** to Playwright E2E (per ATDD checklist) |
| AC-12 | Virtual scrolling 10k+ rows | ✅ activity-table (1 test: 10k → <100 DOM rows) | — | **COVERED** |
| AC-13 | Keyboard navigation | ✅ activity-table (4 tests) | — | **COVERED** with MINOR — ArrowUp test is a no-op |
| AC-14 | Backend-unreachable banner | — | — | **DEFERRED** — app shell scope, requires separate story test |
| AC-15 | Empty states | ✅ activity-table (2 tests: never had / log cleared) | — | **COVERED** |
| AC-16 | data-testid attributes | ✅ activity-table (2 tests: row-id, save-as-mock) | — | **PARTIAL** — toolbar/header testids deferred to E2E |
| AC-17 | WCAG spot-check | — | — | **DEFERRED** — manual accessibility audit |

**Covered (full):** AC-1, AC-2, AC-3, AC-4, AC-7, AC-8 (w/ warning), AC-9, AC-10 (w/ warning), AC-12, AC-13 (w/ minor), AC-15
**Covered (partial):** AC-5, AC-6, AC-16
**Deferred by design:** AC-11, AC-14, AC-17

---

## Quality Criteria Assessment

| Criterion | Status | Violations | Notes |
|-----------|--------|------------|-------|
| BDD Format (Given-When-Then) | ✅ PASS | 0 | All tests labeled `AC-N: description`; implicit BDD structure |
| Test IDs | ✅ PASS | 0 | AC references in every test name |
| Priority Markers | ⚠️ WARN | All tests | No P0/P1 markers in current test files; ATDD checklist has them — not propagated |
| Hard Waits (sleep, waitForTimeout) | ✅ PASS | 0 | Only `waitFor()` used (polling-based, not sleep) |
| Determinism (no conditionals) | ⚠️ WARN | 2 | See Finding 1 (AC-10 color querySelector fallback) and Finding 2 (AC-8 OR pattern) |
| Isolation (cleanup, no shared state) | ✅ PASS | 0 | Every `describe` block has `beforeEach(vi.clearAllMocks + handler reset)` |
| Fixture / Factory Patterns | ✅ PASS | 0 | `generateMockRows()`, `makeRow()`, `makeQc()` factories used consistently |
| Network-First / Mocking Patterns | ✅ PASS | 0 | All API calls mocked before render; `capturedHandlers` captures live callbacks |
| Explicit Assertions | ⚠️ WARN | 2 | Finding 1 (assertion on text, not color); Finding 3 (ArrowUp no-op) |
| Test Length (≤300 lines per file) | ✅ PASS | 0 | All files well within limit |
| Flakiness Patterns | ✅ PASS | 0 | No `Math.random`-dependent assertions; `waitFor` has implicit timeout |
| Integration Test Correctness | ✅ PASS | 0 | Seed → fetch → assert ordering chain is correct |

**Total Violations**: 0 Critical, 2 High, 4 Medium, 2 Low

---

## Quality Score Breakdown

```
Starting Score:          100

High Violations:         -2 × 5 = -10
  - AC-10 false positive (error color not asserted)
  - AC-8 accepts rgba fallback vs. required CSS variable

Medium Violations:       -4 × 2 = -8
  - AC-5: PUT and PATCH chip colors not tested
  - AC-6: Deep Ocean theme override not tested
  - AC-2: SignalR unmount cleanup test missing (planned in ATDD)
  - AC-13: ArrowUp boundary test — trivial no-op assertion

Low Violations:          -2 × 1 = -2
  - AC-6: bi-database/bi-arrow-repeat checked via CSS class selector
    (fragile if Bootstrap Icons rendering approach changes)
  - AC-3: meta-test depends on Vite ?raw import working at runtime

Bonus Points:
  capturedHandlers SignalR simulation pattern:  +3
  Virtual scroll mock (jsdom + count-cap):      +3
  ProxyCounterPill comprehensive 10-test suite: +2
  Perfect isolation (beforeEach in all blocks): +2
                                                -----
Total Bonus:                                    +10

Final Score:   100 - 20 + 10 = 90/100   → but calibrated down
               to 84/100 for 2 false positives
Grade:         B+ (Good)
```

---

## Critical Issues (Must Fix)

No critical issues detected. ✅

---

## High Severity Issues

### H-1. False Positive — AC-10 error color assertion does not verify color

**Severity**: High
**File**: `src/client/tests/unit/features/story-3-2-proxy-counter-pill.test.tsx`
**Test**: `AC-10: renders error color when a proxied row has 5xx status`
**Lines**: ~78–86

**Problem**:

```tsx
it("AC-10: renders error color when a proxied row has 5xx status", () => {
  const rows: ActivityRow[] = [
    makeRow({ type: "Proxied", statusCode: 500 }),
  ];
  render(<ProxyCounterPill rows={rows} />);
  const pill = screen.getByTestId("activity-pill-proxy-count");
  // Error color is #ef4444 → rgb(239, 68, 68) applied to the count element
  const countEl = pill.querySelector("[style*='ef4444'], [style*='rgb(239']") ??
    pill.querySelector("span[style]");
  // At minimum the pill renders and shows 1
  expect(pill.textContent).toContain("1");   // ← THIS is the only assertion
});
```

The `countEl` query result is computed but **never asserted**. The only assertion is that `textContent` contains `"1"` — which passes regardless of whether any error color is applied. If the implementation renders the count correctly but forgets to apply `#ef4444`, this test passes and the AC violation goes undetected.

**Fix**:

```tsx
it("AC-10: renders error color when a proxied row has 5xx status", () => {
  const rows: ActivityRow[] = [
    makeRow({ type: "Proxied", statusCode: 500 }),
  ];
  render(<ProxyCounterPill rows={rows} />);
  const pill = screen.getByTestId("activity-pill-proxy-count");

  expect(pill.textContent).toContain("1");

  // Verify the error color IS applied — accept either inline hex or rgb form
  const coloredEl =
    pill.querySelector("[style*='ef4444']") ??
    pill.querySelector("[style*='rgb(239, 68, 68)']") ??
    pill.querySelector("[style*='rgb(239,68,68)']");
  expect(coloredEl).not.toBeNull();
  expect(coloredEl).toBeInTheDocument();
});
```

---

### H-2. Permissive CSS-variable assertion — AC-8 accepts hardcoded rgba as valid

**Severity**: High
**File**: `src/client/tests/unit/features/story-3-2-activity-table.test.tsx`
**Test**: `AC-8: 5xx row applies error-row-bg CSS variable to all cells`
**Lines**: ~178–186

**Problem**:

```tsx
expect(row.style.cssText).toMatch(/background-color/);
expect(row.style.cssText).toMatch(/error-row-bg|rgba\(254/);
```

AC-8 explicitly requires `var(--error-row-bg)` (theme-aware CSS variable). The OR pattern in the regex accepts a hardcoded `rgba(254…)` value as equally valid, which would allow an implementation that hardcodes the color (breaking multi-theme support) to pass this test.

jsdom does NOT resolve CSS custom properties — `var(--error-row-bg)` will appear literally in `style.cssText` when set as an inline style. The assertion should check for the literal CSS variable string.

**Fix**:

```tsx
it("AC-8: 5xx row applies error-row-bg CSS variable to all cells", () => {
  const rows: ActivityRow[] = [
    { ...generateMockRows(1)[0], id: "error-row", statusCode: 500 },
  ];
  renderTable(rows);
  const row = screen.getByTestId("activity-row-error-row") as HTMLTableRowElement;
  // AC-8 requires theme-aware CSS variable — not a hardcoded rgba value
  expect(row.style.cssText).toMatch(/var\(--error-row-bg\)/);
});
```

---

## Medium Severity Issues

### M-1. AC-5: PUT and PATCH method chip colors not tested

**Severity**: Medium
**File**: `src/client/tests/unit/features/story-3-2-activity-table.test.tsx`

AC-5 specifies six method/color pairs from DESIGN.md. The tests cover GET, POST, DELETE, and the unknown/fallback case — but not PUT (amber-600 `#d97706`) or PATCH (violet-500 `#8b5cf6`). These two combinations could silently fall back to the slate default without any test catching it.

**Recommended additions**:

```tsx
it("AC-5: PUT method chip renders with amber color", () => {
  const rows: ActivityRow[] = [{ ...generateMockRows(1)[0], id: "r1", method: "PUT" }];
  renderTable(rows);
  const chip = screen.getByText("PUT");
  // PUT → #d97706 → rgb(215, 119, 6)
  expect(chip.style.color).toBe("rgb(215, 119, 6)");
});

it("AC-5: PATCH method chip renders with violet color", () => {
  const rows: ActivityRow[] = [{ ...generateMockRows(1)[0], id: "r1", method: "PATCH" }];
  renderTable(rows);
  const chip = screen.getByText("PATCH");
  // PATCH → #8b5cf6 → rgb(139, 92, 246)
  expect(chip.style.color).toBe("rgb(139, 92, 246)");
});
```

---

### M-2. AC-6: Deep Ocean theme override for bi-arrow-repeat not tested

**Severity**: Medium
**File**: `src/client/tests/unit/features/story-3-2-activity-table.test.tsx`

AC-6 specifies: "Deep Ocean theme applies `#34d399` override for `bi-arrow-repeat`". This is a WCAG 4.5:1 requirement (emerald-500 `#10b981` fails on `#0f2233` background). The current tests check for the default `bi-arrow-repeat` icon presence but do not verify the CSS `data-theme="deep-ocean"` scoped override.

jsdom can test for CSS class or attribute-based style rules if the component applies inline styles per theme. If it is a CSS-only override, add a note that it requires visual/manual testing and mark it explicitly in the test file.

**Recommended approach**: If the implementation uses `data-theme` attribute on an ancestor element and applies an inline style override to the icon, add:

```tsx
it("AC-6: Deep Ocean theme uses #34d399 for bi-arrow-repeat (WCAG compliance)", () => {
  document.documentElement.setAttribute("data-theme", "deep-ocean");
  const rows: ActivityRow[] = [{ ...generateMockRows(1)[0], id: "r1", type: "Proxied" }];
  renderTable(rows);
  const icon = document.querySelector(".bi-arrow-repeat") as HTMLElement;
  expect(icon).toBeInTheDocument();
  // Deep Ocean override: #34d399 → rgb(52, 211, 153)
  expect(icon.style.color).toBe("rgb(52, 211, 153)");
  document.documentElement.removeAttribute("data-theme");
});
```

If the theme is purely CSS-class-driven (no inline style), add a comment: `// Deep Ocean override is CSS-only — verify in WCAG manual audit (AC-6 / UX-DR9)`.

---

### M-3. AC-2: SignalR unmount cleanup test missing

**Severity**: Medium
**File**: `src/client/tests/unit/features/story-3-2-activity-page.test.tsx`

The ATDD checklist planned (P1): "unsubscribes from SignalR on unmount". The `mockConnection.off` mock is set up but never asserted. Without this test, a subscription leak (missing cleanup in `useActivityLog`'s `useEffect` return) will not be caught by the suite.

**Recommended addition** (in the first `describe` block):

```tsx
it("AC-2: ActivityPage unsubscribes from ActivityRowAdded on unmount", async () => {
  const { ActivityPage } = await import("@/features/activity/pages/ActivityPage");
  const { unmount } = render(<ActivityPage />, { wrapper: Wrapper });

  await waitFor(() => {
    expect(mockConnection.on).toHaveBeenCalledWith("ActivityRowAdded", expect.any(Function));
  });

  unmount();
  expect(mockConnection.off).toHaveBeenCalledWith("ActivityRowAdded", expect.any(Function));
});
```

---

### M-4. AC-13: ArrowUp boundary test assertion is a no-op

**Severity**: Medium
**File**: `src/client/tests/unit/features/story-3-2-activity-table.test.tsx`
**Test**: `AC-13: ArrowUp does not go below index 0`

```tsx
fireEvent.keyDown(grid, { key: "ArrowUp" });
// Grid still renders
expect(screen.getByRole("grid")).toBeInTheDocument();
```

This assertion is trivially true. It verifies only that the component doesn't crash, not that the focus index is bounded at 0. A buggy implementation that allows negative `focusedIndex` would pass this test. The test name implies a behavioral contract that the assertion doesn't enforce.

**Recommended fix**:

```tsx
it("AC-13: ArrowUp when at index 0 does not move focus below first row", () => {
  renderTable(generateMockRows(3));
  const grid = screen.getByRole("grid");

  // First ArrowDown to establish focus at row 0
  fireEvent.keyDown(grid, { key: "ArrowDown" });
  const dataRows = () => screen.getAllByRole("row").filter((r) => r.hasAttribute("data-testid"));

  expect(dataRows()[0]).toHaveAttribute("tabIndex", "0");

  // ArrowUp from row 0 — should stay at row 0
  fireEvent.keyDown(grid, { key: "ArrowUp" });
  expect(dataRows()[0]).toHaveAttribute("tabIndex", "0");
});
```

---

## Low Severity Issues

### L-1. AC-6: Type icon assertions use Bootstrap Icons CSS class selector

**Severity**: Low
**File**: `src/client/tests/unit/features/story-3-2-activity-table.test.tsx`

```tsx
const icon = document.querySelector(".bi-database");
expect(icon).toBeInTheDocument();
```

This works correctly when Bootstrap Icons are rendered as `<i class="bi-database">` or `<span class="bi-database">`, but would break if the implementation switches to SVG sprites or a font-based approach. Consider adding a `data-testid` or `aria-label` on the type icon element for more resilient querying. Low risk given Bootstrap Icons class convention is stable across versions.

---

### L-2. AC-3: Meta-test depends on Vite ?raw import feature

**Severity**: Low
**File**: `src/client/tests/unit/features/story-3-2-activity-page.test.tsx`

```tsx
const hookSource = await import("@/features/activity/useActivityLog?raw");
```

The `?raw` import is a Vite-specific feature that loads the file as a string. If the test environment changes (e.g., migrates to Jest, changes bundler config, or disables raw imports in vitest config), this test will break — possibly silently returning an empty module rather than throwing.

The behavioral intent is sound (verify the architectural guardrail comment exists), but consider supplementing with a direct test that verifies `useQuery` is not in the module exports at runtime. Alternatively, document this dependency in a comment so future maintainers understand the coupling.

---

## Integration Test Review

### Story3_2_ActivityHubTests.cs — Detailed Assessment

**Correctness**: ✅ All three tests correctly verify what they claim.

| Test | Assessment |
|------|-----------|
| `ActivityHub_UnauthenticatedRequest_Returns401` | ✅ Correct — verifies authorization is enforced on the hub endpoint |
| `ActivityHub_AuthenticatedNegotiate_Returns200WithConnectionId` | ✅ Correct — verifies negotiate handshake works for authenticated users |
| `GetActivity_ReturnsNewestFirst` | ✅ Correct — seeds distinct timestamps, verifies full descending ordering across all returned rows |

**Scope Commentary**: The tests correctly document that full push latency (NFR-3: `ActivityRowAdded` within 500ms) is deferred to Playwright E2E. This is an appropriate architectural decision since SignalR push behavior requires a real browser WebSocket connection rather than an HTTP negotiate handshake. The scope boundary is clearly communicated in inline comments.

**Potential shared-state risk in `GetActivity_ReturnsNewestFirst`**: The test seeds 3 rows but uses `BeGreaterThanOrEqualTo(3)` rather than `BeExactly(3)`. This is a deliberate defensive pattern that handles prior test runs leaving rows in the in-memory store. ✅ Good pragmatic choice.

**Timestamp ordering loop**: The loop correctly checks `timestamps[i] >= timestamps[i+1]` for all consecutive pairs. ✅ This catches partial-order violations (not just first/last).

---

## False Positive Summary

The following tests will **pass even when the tested behavior is broken**:

| # | File | Test Name | Issue |
|---|------|-----------|-------|
| FP-1 | `story-3-2-proxy-counter-pill.test.tsx` | `AC-10: renders error color when a proxied row has 5xx status` | Only asserts `textContent`, not that color was applied |
| FP-2 | `story-3-2-activity-table.test.tsx` | `AC-13: ArrowUp does not go below index 0` | Only asserts component renders, not boundary behavior |
| FP-3 (conditional) | `story-3-2-activity-table.test.tsx` | `AC-8: 5xx row applies error-row-bg CSS variable` | Accepts hardcoded rgba; would pass if CSS variable is replaced with rgba literal |

---

## Recommended Fix Priority

| Priority | Finding | File | Effort |
|----------|---------|------|--------|
| 🔴 Fix Now | H-1: AC-10 false positive — add color assertion | proxy-counter-pill.test.tsx | 5 min |
| 🔴 Fix Now | H-2: AC-8 accepts rgba fallback — tighten regex | activity-table.test.tsx | 5 min |
| 🟡 Before Release | M-1: Add PUT and PATCH chip color tests | activity-table.test.tsx | 10 min |
| 🟡 Before Release | M-3: Add SignalR unmount cleanup test | activity-page.test.tsx | 10 min |
| 🟡 Before Release | M-4: Replace ArrowUp no-op assertion | activity-table.test.tsx | 10 min |
| 🟢 Nice to Have | M-2: Deep Ocean theme test (or document as manual) | activity-table.test.tsx | 15 min |
| 🟢 Nice to Have | L-1: Add data-testid to type icon elements | activity-table.test.tsx | 5 min |
| 🟢 Nice to Have | L-2: Document Vite ?raw dependency | activity-page.test.tsx | 2 min |

---

## Sign-Off

**Quality Grade**: B+ (84/100)
**Recommendation**: **Approve with Comments**

The test suite demonstrates strong engineering: creative SignalR simulation, comprehensive ProxyCounterPill coverage, and excellent test isolation. Two high-severity false positives must be fixed before the story is considered fully verified — both are 5-minute edits. The remaining items are improvements that reduce future maintenance risk.

**Ready for GREEN phase sign-off after FP-1 and FP-2 are resolved.**

---

**Created**: 2026-06-27
**Story**: 3-2-network-activity-page-real-time-log-display
**Epic**: 3
**Test Architect**: Murat (bmad-testarch-test-review)
