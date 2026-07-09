# Test Review: Story 4-5 — Record Mode & Cross-Screen Recording Indicator

---

## Re-Review Result — 2026-07-09

**Verdict: ✅ PASS (blockers cleared)**

Both blockers are resolved. Implementation may proceed.

### BLOCKER-1 Fix — Verified ✅

**Location:** `src/client/tests/unit/features/RecordMode.test.tsx` (~line 202)

The broken `window.getComputedStyle(badge).backgroundColor` assertion has been replaced with:

```ts
const badgeStyle = badge.getAttribute("style") ?? "";
expect(badgeStyle).toContain("var(--warning-subtle)");
expect(badgeStyle).toContain("var(--warning)");
expect(badgeStyle).toContain("9999px");
```

Pattern is correct. Comment `// Verify amber pill styling (check inline style attribute — jsdom can't resolve CSS vars)` confirms intent. ✅

### BLOCKER-2 Fix — Verified ✅

**Location:** `src/client/tests/unit/features/RecordMode.test.tsx` (~line 347)

The broken `window.getComputedStyle(badge).backgroundColor` assertion has been replaced with:

```ts
const badgeStyle = badge.getAttribute("style") ?? "";
expect(badgeStyle).toContain("var(--warning-subtle)");
expect(badgeStyle).toContain("var(--warning)");
```

Comment `// Verify amber colors remain — check inline style attribute (jsdom can't resolve CSS vars)` confirms intent. ✅

### Remaining Open Items

The 3 MAJOR and 5 MINOR findings from the original review are unchanged in scope — none were in-scope for this targeted fix. They remain tracked below and do not block implementation.

---

**Reviewer:** Master Test Architect (bmad-testarch-test-review)
**Date:** 2026-07-09
**Story:** 4.5 — Record Mode & Cross-Screen Recording Indicator
**Original Verdict:** ⛔ FAIL — 2 blockers found

---

## Verdict Summary

| Category | Count |
|---|---|
| BLOCKER | 2 |
| MAJOR | 3 |
| MINOR | 5 |

The two blockers are in `RecordMode.test.tsx`: the AC-2 and AC-7 badge style assertions use `window.getComputedStyle()` to check CSS custom property values. jsdom does not resolve CSS variables — these assertions will remain `RED` even after a correct implementation. The fix is a one-line change per assertion (use `getAttribute("style")` + `toContain()`, the pattern used correctly in `TopBar-RecordingIndicator.test.tsx`).

---

## Test Files Reviewed

| File | Tests | Status |
|---|---|---|
| `src/client/tests/unit/features/RecordMode.test.tsx` | 10 | RED (ATDD scaffold) |
| `src/client/tests/unit/layout/TopBar-RecordingIndicator.test.tsx` | 12 | RED (ATDD scaffold) |
| `src/Fishtank.Api.IntegrationTests/Api/RecordingTests.cs` | 6 pass, 2 skip | RED (ATDD scaffold) |
| `src/client/tests/e2e/story-4-5-record-mode-and-cross-screen-recording-indicator.spec.ts` | 5 pass, 1 skip | RED (ATDD scaffold) |
| `src/client/tests/unit/features/useRecordingState.test.tsx` | 11 | RED (ATDD scaffold) |
| `src/client/tests/unit/features/useActivityLog-connection.test.tsx` | 11 | RED (ATDD scaffold) |
| `src/Fishtank.Api.UnitTests/Services/RecordingServiceTests.cs` | 17 | RED (ATDD scaffold) |

---

## 1. AC Coverage

All 12 ACs are represented across the test suite.

| AC | Description | Test File(s) | Notes |
|---|---|---|---|
| AC-1 | Record button activates mode | RecordMode (3), useRecordingState (2), E2E (implicit) | ✅ |
| AC-2 | Recording badge amber-styled | RecordMode (2) | ⛔ Style assertions broken — see BLOCKER-1 |
| AC-3 | Stop deactivates, badge hides immediately | RecordMode (2), useRecordingState (2) | ✅ |
| AC-4 | Auto-capture writes files | RecordingServiceTests (5), Integration skipped (justified) | ✅ |
| AC-5 | Cross-screen indicator in top bar | TopBar (6), E2E (3) | ✅ |
| AC-6 | Indicator absent on /login /setup | TopBar (2), E2E (2) | ✅ |
| AC-7 | SignalR disconnect → warning badge | RecordMode (1), useActivityLog-connection (3) | ⛔ Style assertions broken — see BLOCKER-2 |
| AC-8 | SignalR reconnect → recording resumes + System Event | RecordMode (1), useActivityLog-connection (4), Integration skipped (justified) | ⚠ Gap on System Event path — see MAJOR-1 |
| AC-9 | prefers-reduced-motion | RecordMode (1), TopBar (2) | ⚠ Weak badge assertion — see MINOR-1 |
| AC-10 | Status persists across navigation | useRecordingState (2 cache tests) | ✅ |
| AC-11 | Button state loaded on mount | RecordMode (1), useRecordingState (2) | ✅ |
| AC-12 | data-testid attributes | Used in all layers | ✅ |

---

## 2. BLOCKER Items

### BLOCKER-1 — AC-2 badge style assertions use `getComputedStyle` for CSS variables

**File:** `src/client/tests/unit/features/RecordMode.test.tsx`
**Lines:** ~236–241 (AC-2 "Recording badge is visible with amber styling" test)

```ts
// BROKEN
const styles = window.getComputedStyle(badge);
expect(styles.backgroundColor).toBe("var(--warning-subtle)");
expect(styles.color).toBe("var(--warning)");
expect(styles.borderRadius).toBe("9999px");
```

**Why it breaks:** jsdom does not resolve CSS custom properties. `getComputedStyle(el).backgroundColor` returns `""` (empty string) when the inline style is `var(--warning-subtle)` — never the CSS var string. The assertion `toBe("var(--warning-subtle)")` will never match, leaving the test permanently RED even after a correct implementation.

**Correct pattern** (already used in `TopBar-RecordingIndicator.test.tsx:~100`):
```ts
// CORRECT
const styleAttr = badge.getAttribute("style") ?? "";
expect(styleAttr).toContain("var(--warning-subtle)");
expect(styleAttr).toContain("var(--warning)");
expect(styleAttr).toContain("9999px");
```

**Fix required before implementation.**

---

### BLOCKER-2 — AC-7 warning badge style assertions use `getComputedStyle` for CSS variables

**File:** `src/client/tests/unit/features/RecordMode.test.tsx`
**Lines:** ~353–356 (AC-7 "badge shows warning state when SignalR disconnects" test)

```ts
// BROKEN
const styles = window.getComputedStyle(badge);
expect(styles.backgroundColor).toBe("var(--warning-subtle)");
expect(styles.color).toBe("var(--warning)");
```

**Why it breaks:** Same root cause as BLOCKER-1. The AC-7 requirement is that amber colors remain unchanged on disconnect — that check is permanently untestable as written.

**Fix:** Same pattern as BLOCKER-1 — use `getAttribute("style")` + `toContain()`.

---

## 3. MAJOR Findings

### MAJOR-1 — AC-8 System Event creation has no passing test path

**Files:** `src/Fishtank.Api.IntegrationTests/Api/RecordingTests.cs` (skipped), `src/Fishtank.Api.UnitTests/Services/RecordingServiceTests.cs`

The integration test `AC_8_signalr_reconnect_creates_system_event_with_gap_duration` is skipped with a justified reason (hub lifecycle simulation). However, no unit test in `RecordingServiceTests.cs` covers the `ISystemEventService.AddAsync` call path triggered by a reconnect event with gap duration. The existing unit tests cover:
- `CaptureAsync` write failure → System Event ✅
- Connection state transitions (`isConnected` flag) ✅

Missing: A unit test in `RecordingServiceTests.cs` for a `NotifyReconnectAsync(DateTimeOffset disconnectTime)` (or equivalent) method that verifies `_systemEvents.AddAsync` receives a message containing the gap duration and the prescribed text from AC-8:
> `"Requests received during the {N} seconds gap may not have been captured."`

Without this, AC-8's System Event contract is unverified by any passing test.

**Recommendation:** Add a `RecordingService.NotifyReconnect(DateTimeOffset gapStart)` unit test in `RecordingServiceTests.cs` verifying the `ISystemEventService` call.

---

### MAJOR-2 — SignalR mock naming inconsistency between test files

**Files:**
- `src/client/tests/unit/features/RecordMode.test.tsx:~59` — mocks `getHubConnection`
- `src/client/tests/unit/features/useActivityLog-connection.test.tsx:~20` — mocks `createHubConnection`

Both mock `@/lib/signalr` but export different function names. If `useActivityLog` internally calls `createHubConnection` (as implied by the story context: `createHubConnection("/hubs/activity")`), then `RecordMode.test.tsx`'s `getHubConnection` mock is incorrect.

While this doesn't cause a runtime failure today (because `RecordMode.test.tsx` also mocks `useActivityLog` directly at the module level, bypassing the hub call entirely), it creates a maintenance hazard. Any future refactor that removes the `useActivityLog` module-level mock would expose the broken hub mock.

**Recommendation:** Align to the actual export name used in `@/lib/signalr`. Remove the unnecessary SignalR mock from `RecordMode.test.tsx` entirely — since `useActivityLog` is mocked at module level in that file, the hub mock is redundant.

---

### MAJOR-3 — E2E AC-5 style attribute assertion is brittle

**File:** `src/client/tests/e2e/story-4-5-record-mode-and-cross-screen-recording-indicator.spec.ts:~184`

```ts
const styleAttr = (await topBarIndicator.getAttribute("style")) ?? "";
expect(styleAttr).toContain("var(--warning-subtle)");
expect(styleAttr).toContain("var(--warning)");
```

**Why it's fragile:** This assertion passes only if the indicator uses **inline style attributes** with CSS var strings. If the implementation applies CSS classes from a CSS module (the dominant pattern in this codebase — e.g., `TopBar.tsx` uses `styles.left` / `styles.right`), `getAttribute("style")` would return `null` and the test fails even with correct visual output.

In a Playwright E2E context, a more reliable check is:
```ts
const bgColor = await topBarIndicator.evaluate(el => 
  getComputedStyle(el).getPropertyValue('--warning-subtle').trim()
);
// or assert the rendered color matches the expected token value
```

Alternatively, if inline styles are the agreed implementation approach (to support prefers-reduced-motion runtime JS detection), this should be explicitly documented as an architectural decision.

**Recommendation:** Either document that inline styles are required (the prefers-reduced-motion JS approach implies this) or change to a computed-style check on the resolved CSS token value.

---

## 4. MINOR Findings

### MINOR-1 — AC-9 badge animation assertion is overly narrow

**File:** `src/client/tests/unit/features/RecordMode.test.tsx:~453`

```ts
expect(styles.animation).not.toContain("pulse");
```

Only guards against a single animation named `"pulse"`. Any other animation name (e.g., `"blink"`, `"spin"`, `"recording-indicator"`) would pass this check. Also uses `getComputedStyle` which has the same CSS var resolution limitation noted in BLOCKER-1/2, though for `animation` property jsdom typically returns `""` (an empty string), so `not.toContain("pulse")` would always pass regardless of implementation.

**Recommendation:** Replace with a positive assertion that no animation is running:
```ts
// In prefers-reduced-motion context, transition should be none
const styleAttr = badge.getAttribute("style") ?? "";
expect(styleAttr).toContain("transition: none");
// OR: verify no transition/animation class is applied
```

---

### MINOR-2 — `@ts-expect-error` comments will produce TypeScript errors post-implementation

**File:** `src/client/tests/unit/features/RecordMode.test.tsx` (multiple lines)

The `// @ts-expect-error — hook doesn't exist yet` comments are appropriate for RED phase scaffolds. After implementation, TypeScript will report each as "Unused '@ts-expect-error' directive" because the type error they suppressed no longer exists. This will fail builds that treat unused error suppressions as errors.

**Recommendation:** Add a tracking note to remove all `@ts-expect-error` comments in this file as part of the implementation task. Alternatively, use `// @ts-ignore` if compiler flags don't treat those as errors.

---

### MINOR-3 — Dynamic `await import()` pattern in `RecordMode.test.tsx` needs refactoring post-implementation

**File:** `src/client/tests/unit/features/RecordMode.test.tsx` (repeated in most tests)

```ts
const { useRecordingState } = await import("@/features/activity/hooks/useRecordingState");
vi.mocked(useRecordingState).mockReturnValue({...});
```

This pattern is used because the module doesn't exist yet (RED phase). After implementation, these should be refactored to a top-level import + `vi.mocked()` inline, matching the cleaner pattern in `TopBar-RecordingIndicator.test.tsx`.

**Recommendation:** After the hook is implemented, replace all `await import(...)` occurrences with:
```ts
// At top of file
import { useRecordingState } from "@/features/activity/hooks/useRecordingState";
// In test
vi.mocked(useRecordingState).mockReturnValue({...});
```

---

### MINOR-4 — E2E AC-6 uses `not.toBeVisible()` instead of `not.toBeInTheDocument()`

**File:** `src/client/tests/e2e/story-4-5-record-mode-and-cross-screen-recording-indicator.spec.ts:~278, ~294`

```ts
await expect(topBarIndicator).not.toBeVisible();
```

The test comment notes that `/login` and `/setup` render without the AppShell (no TopBar at all). If TopBar is never rendered, the element is not in the DOM — `not.toBeVisible()` passes in both the "hidden" and "not-in-DOM" cases, so it works but is imprecise. The intent is "element is not in DOM" not "element is hidden."

**Recommendation:** Use `not.toBeInTheDocument()` for clarity on auth screens where TopBar is not rendered. Reserve `not.toBeVisible()` for cases where the element exists but is hidden (e.g., `display: none`).

---

### MINOR-5 — `CaptureAsync_WhenNotRecording_StillWritesFiles` documents ambiguous design decision

**File:** `src/Fishtank.Api.UnitTests/Services/RecordingServiceTests.cs:~395`

The test verifies that `CaptureAsync` writes files even when recording is not active, with the comment: "In production, the caller (ProxyService) checks IsRecordingAsync() before calling." This documents a guard-at-caller design — but the service method has no internal guard.

This is a minor design concern: if another caller invokes `CaptureAsync` without the guard check (e.g., a future integration point), files would be silently written outside of record sessions. 

**Recommendation:** Either add an early-return guard in `CaptureAsync` when `!_isRecording` and update the test accordingly, or add a code comment in `RecordingService.cs` explicitly documenting that the caller is responsible for the recording-state guard.

---

## 5. Positive Observations

These practices stand out as exemplary and should be carried forward:

1. **MSW `onUnhandledRequest: "error"` in `useRecordingState.test.tsx`** — any unexpected API call immediately fails the test, preventing silent false positives.

2. **Stateful MSW handlers in `useRecordingState.test.tsx`** — the start/stop mutation tests use server-side state to verify that cache invalidation triggers a real refetch and the UI reflects the post-mutation server state. This is the gold-standard pattern for testing React Query mutations.

3. **Thread-safety tests in `RecordingServiceTests.cs`** — `Task.WhenAll(10 concurrent calls)` with precise success/failure counts is the right way to verify singleton state under concurrent access.

4. **`TopBar-RecordingIndicator.test.tsx` style checks** — correctly uses `getAttribute("style")` + `toContain()` for CSS var assertions. The AC-9 transition vs animation distinction (checking `transition: none` not `animation: none`) is exactly right per the AC specification.

5. **Skip justifications are precise** — both skipped tests (AC-4 integration, AC-8 integration) cite the specific infrastructure constraint, reference where the coverage is alternatively provided, and don't use generic "TODO" excuses.

6. **`useActivityLog-connection.test.tsx` null-state documentation** — Bug Fix B-2's tests explicitly document the null→true→false→true lifecycle and the "null means not-yet-connected, not disconnected" semantic. This is exactly the kind of invariant test that prevents regressions.

---

## 6. Fix Priority Summary

| # | Finding | Severity | Location | Effort |
|---|---|---|---|---|
| 1 | `getComputedStyle` for CSS vars (AC-2 badge colors) | BLOCKER | RecordMode.test.tsx ~236 | 5 min |
| 2 | `getComputedStyle` for CSS vars (AC-7 warning colors) | BLOCKER | RecordMode.test.tsx ~353 | 5 min |
| 3 | AC-8 System Event creation — no passing test path | MAJOR | RecordingServiceTests.cs | 30 min |
| 4 | SignalR mock naming inconsistency | MAJOR | RecordMode.test.tsx ~59 | 10 min |
| 5 | E2E style attribute assertion fragility | MAJOR | story-4-5.spec.ts ~184 | 15 min |
| 6 | AC-9 badge animation assertion too narrow | MINOR | RecordMode.test.tsx ~453 | 5 min |
| 7 | `@ts-expect-error` cleanup (post-implementation) | MINOR | RecordMode.test.tsx | 10 min |
| 8 | Dynamic import pattern cleanup (post-implementation) | MINOR | RecordMode.test.tsx | 15 min |
| 9 | E2E AC-6 `not.toBeVisible` → `not.toBeInTheDocument` | MINOR | story-4-5.spec.ts ~278, ~294 | 2 min |
| 10 | `CaptureAsync_WhenNotRecording` design decision | MINOR | RecordingServiceTests.cs ~395 | Design discussion |

---

*Items 7 and 8 are deferred to post-implementation; all others should be fixed before implementation begins.*
