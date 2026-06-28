# Code Review — Story 3-2: Network Activity Page — Real-Time Log Display

**Date:** 2026-06-27
**Branch:** `feature/3-2-network-activity-page-real-time-log-display`
**Reviewer:** Adversarial Code Review (3-Layer: Blind Hunter · Edge Case Hunter · Acceptance Auditor)

---

## Executive Summary

| Severity | Count |
|---|---|
| BLOCKER | 3 |
| MAJOR | 6 |
| MINOR | 7 |
| PASS | 14 |

**Three blockers must be fixed before merge.** The most critical (`B-1`) causes a runtime crash on page load — every user hitting `/activity` will see a crash or empty table due to a broken API response deserialization. `B-2` means AC-13 (keyboard navigation) is completely unimplemented. `B-3` violates an explicit architecture constraint that was called out in the story spec Dev Notes.

---

## BLOCKER Findings

### B-1 — `api.ts`: `fetchActivityRows` always returns `undefined`, causing runtime crash

**File:** `src/client/src/features/activity/api.ts`
**ACs broken:** AC-1 (initial rows never load)

The API endpoint `GET /api/activity` returns the standard envelope `{ success: true, data: ActivityRowDto[] }` — `data` is a **flat array**, not a nested `{ items, total }` object. The `apiFetch<T>()` function unwraps to `body.data as T`.

`fetchActivityRows` declares:
```typescript
interface ActivityResponse {
  items: ActivityRow[];
  total: number;
}
const response = await apiFetch<ActivityResponse>(path);
return response.items;
```

At runtime, `response` is `ActivityRowDto[]` (an array). Accessing `.items` on an array returns `undefined`. This propagates into `useActivityLog.ts`:

```typescript
fetchActivityRows({ take: 200 })
  .then((initialRows) => {
    setRows(initialRows);          // sets rows to undefined
    if (initialRows.length > 0) … // throws TypeError — caught by .catch()
    setIsLoading(false);
  })
  .catch((err) => {
    console.error(…);
    setIsLoading(false);            // rows remains undefined
  });
```

`ActivityTable` receives `rows={undefined}`, calls `rows.length`, and crashes the page.

**Fix:**
```typescript
// Remove ActivityResponse interface entirely
export async function fetchActivityRows(params?: ActivityQueryParams): Promise<ActivityRow[]> {
  // … build query string unchanged …
  return apiFetch<ActivityRow[]>(path);
}
```

The integration test `GetActivity_ReturnsNewestFirst` confirms the response shape: `body.GetProperty("data").GetArrayLength()` — the data IS the array.

---

### B-2 — `ActivityTable.tsx`: Keyboard navigation (AC-13) not implemented

**File:** `src/client/src/features/activity/ActivityTable.tsx`
**AC broken:** AC-13

The spec requires `ArrowUp`/`ArrowDown` to move row focus within the table. No `onKeyDown` handler exists anywhere in `ActivityTable.tsx`. There is also no `focusedRowIndex` state. The only interactive elements are the action buttons, which receive natural tab order but no row-level keyboard navigation.

**Fix required:** Add `focusedRowIndex` state and an `onKeyDown` handler on the scroll container:
```typescript
const [focusedRowIndex, setFocusedRowIndex] = useState<number>(-1);

// On the parentRef div:
onKeyDown={(e) => {
  if (e.key === "ArrowDown") {
    e.preventDefault();
    setFocusedRowIndex(i => Math.min(rows.length - 1, i + 1));
  }
  if (e.key === "ArrowUp") {
    e.preventDefault();
    setFocusedRowIndex(i => Math.max(0, i - 1));
  }
}}
```

Rows at `virtualItem.index === focusedRowIndex` should receive `tabIndex={0}` and `autoFocus` (or `ref.focus()`). The container itself needs `tabIndex={-1}` to be focusable.

---

### B-3 — `ActivityTable.tsx`: Cross-feature type import violates architecture constraint

**File:** `src/client/src/features/activity/ActivityTable.tsx` (line 4)
**Architecture rule broken:** Story spec Dev Notes — "Feature folder self-containment"

```typescript
import type { Service } from "../services/types/service";
```

The story spec Dev Notes explicitly state:
> **Feature folder self-containment** — `features/activity/` must not import from `features/services/` or other feature folders. Read service statuses from React Query cache via `useQueryClient()` (accessing cached data is acceptable; **importing service hooks is not**).

While the comment refers to hooks, importing `Service` type from the services feature creates a compile-time and conceptual coupling that the constraint forbids.

**Fix:** Define a minimal local type or use an inline shape:
```typescript
// In ActivityTable.tsx — do not import from features/services
type ServiceStatus = { id: string; status: string };
const services = queryClient.getQueryData<ServiceStatus[]>(["services"]) ?? [];
```

---

## MAJOR Findings

### M-1 — `useConnectionState.ts`: Creates 3 duplicate hub connections for monitoring (AC-14 partially broken)

**File:** `src/client/src/lib/useConnectionState.ts`

The hook creates **three brand-new `HubConnection` instances** just to poll their `.state`:

```typescript
const connections = [
  createHubConnection("/hubs/services"),  // NEW connection #3
  createHubConnection("/hubs/events"),    // NEW connection #4
  createHubConnection("/hubs/activity"),  // NEW connection #5
];
```

Meanwhile, `useServicesHub`, `useEventsHub`, and `useActivityLog` each create their own connections (#1, #2, #6). When on the Activity page, **6 concurrent WebSocket connections** are active. Worse, the banner monitors connections #3-5, which are independent from the feature connections #1-2-6. If the `useActivityLog` connection (#6) drops, the banner doesn't fire because connection #5 may still be up.

The interval polling (`setInterval(checkStates, 1000)`) is also inefficient — the correct approach is event-driven via SignalR's `onreconnecting`/`onclose` callbacks.

**Fix:** Track connection state centrally in `lib/signalr.ts` by emitting state-change events from `createHubConnection`, or expose a shared connection instance per URL via a registry/singleton pattern. `useConnectionState` should subscribe to those state events rather than create new connections.

---

### M-2 — `useActivityLog.ts`: Race condition — SignalR rows prepended before initial fetch can be overwritten

**File:** `src/client/src/features/activity/useActivityLog.ts`

The initial fetch and SignalR subscription are started concurrently. If SignalR delivers `ActivityRowAdded` before the `fetchActivityRows` promise resolves:

1. `setRows(prev => [newRow, ...prev])` → `rows = [newRow]`
2. Initial fetch resolves → `setRows(initialRows)` → **`newRow` is silently dropped**

For a busy mock service, this is a real-world scenario where rows received in the 50–500ms between mount and initial-fetch resolution are permanently lost.

**Fix:**
```typescript
.then((initialRows) => {
  if (!mounted) return;
  setRows(prev => {
    // Merge: keep any rows already in state (from SignalR), then append initial rows
    // that aren't already represented (de-dup by id)
    const existingIds = new Set(prev.map(r => r.id));
    const newFromFetch = initialRows.filter(r => !existingIds.has(r.id));
    return [...prev, ...newFromFetch];
  });
  …
```

---

### M-3 — `TypeIcon.tsx`: Deep Ocean theme override for `bi-arrow-repeat` not implemented (AC-6, AC-17)

**File:** `src/client/src/features/activity/TypeIcon.tsx`

The spec requires WCAG-compliant `#34d399` (emerald-400) for `bi-arrow-repeat` in Deep Ocean theme, because `#10b981` (emerald-500) fails 4.5:1 contrast against `#0f2233` background. The code has only a comment:

```typescript
// Deep Ocean theme override for Proxied: #34d399 (handled via data-theme CSS if needed)
const color = isMocked ? "#3b82f6" : "#10b981";
```

No CSS file or `data-theme` scoped rule is created anywhere. AC-6 ("Deep Ocean theme applies `#34d399` override") and AC-17 (WCAG spot-check) are not met for this surface.

**Fix option A** — CSS variable approach:
```css
/* features/activity/TypeIcon.module.css */
.proxied-icon { color: #10b981; }
[data-theme="deep-ocean"] .proxied-icon { color: #34d399; }
```

**Fix option B** — Inline via CSS variable:
```typescript
const proxiedStyle = {
  color: "var(--proxied-icon-color, #10b981)",
};
// and in global CSS: [data-theme="deep-ocean"] { --proxied-icon-color: #34d399; }
```

---

### M-4 — `ActivityTable.tsx`: Virtual row columns don't align with header

**File:** `src/client/src/features/activity/ActivityTable.tsx`

The implementation puts `<colgroup>` inside the `<table>` element, which correctly sizes `<thead>` columns. However, each virtual `<tr>` uses `display: table; tableLayout: fixed` — it is a **separate table layout context** and has no `<colgroup>` of its own. The column widths from the outer colgroup do not apply to these independently laid-out rows.

At non-exact viewport widths (especially with scrollbars), the Method/URL/Status/Type/Service/Actions columns in the body will not align with the headers.

**Fix:** Switch to the standard Tanstack Virtual table pattern where `<tbody>` has `position: relative; height: totalSize` and the `<tr>` elements are positioned absolute within it (sharing the single table's colgroup):

```tsx
<div ref={parentRef} style={{ height: "600px", overflow: "auto" }}>
  <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
    <colgroup>…</colgroup>
    <thead style={{ position: "sticky", top: 0, zIndex: 1, background: "#f9fafb" }}>…</thead>
    <tbody style={{ position: "relative", height: `${virtualizer.getTotalSize()}px` }}>
      {virtualItems.map((vi) => (
        <tr key={vi.key} style={{ position: "absolute", top: 0, width: "100%",
          transform: `translateY(${vi.start}px)`, height: `${vi.size}px` }}>
          …
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

---

### M-5 — `ActivityTable.tsx` / `ActivityPage.tsx`: `activity-btn-columns` not rendered (AC-4, AC-16)

**Files:** `ActivityTable.tsx`, `ActivityPage.tsx`
**ACs broken:** AC-4 (partial), AC-16

AC-4 explicitly states: "hidden columns (`ms`/DateTime) available via the Columns selector (`data-testid=\"activity-btn-columns\"`)." AC-16 lists `activity-btn-columns` in the required data-testid manifest. Neither the button nor the column-visibility state is implemented.

While the column management logic is likely deferred to a later story, the spec requires the stub button to exist at the correct DOM position with the correct `data-testid`.

**Fix:** Add a stub button (disabled) to the ActivityPage toolbar:
```tsx
<button
  data-testid="activity-btn-columns"
  disabled
  style={{ … }}
>
  <i className="bi bi-layout-three-columns" /> Columns
</button>
```

---

### M-6 — Integration test `GetActivity_ReturnsNewestFirst` is vacuously true on empty store

**File:** `src/Fishtank.Api.IntegrationTests/Api/Story3_2_ActivityHubTests.cs`

The test for AC-1 (newest-first ordering) bails out silently when the store is empty:
```csharp
if (data.GetArrayLength() == 0)
    return; // Test passes unconditionally
```

In a clean test environment with no pre-seeded data, this test always passes and proves nothing. The `[Collection("Integration")]` attribute suggests test isolation, meaning the store likely IS empty.

**Fix:** Seed rows directly into `IActivityStore` via the DI container before querying, then assert order. Pattern follows Story 3.1 tests.

---

## MINOR Findings

### Mi-1 — `ProxyCounterPill.tsx`: Popover `<li>` key uses `service.name` (not serviceId)

```tsx
<li key={service.name} …>
```

If two services share the same display name, React will emit duplicate key warnings and potentially mis-render. The `serviceId` (map key) should be included in the value and used as the React key.

---

### Mi-2 — `MethodChip.tsx`: Display text uses raw `method` prop, not normalized

```tsx
{method}
```

The color lookup normalizes via `.toUpperCase()`, but the displayed label is the raw prop value. If the API ever returns lowercase methods (e.g., `"get"`), the chip displays `"get"` while styling uses the `GET` entry. Fix: `{method.toUpperCase()}`.

---

### Mi-3 — `useActivityLog.ts`: SignalR initial connect failure is silent

```typescript
connection.start()
  .catch((err) => console.error("[ActivityHub] Connection failed:", err));
```

Connection failure is swallowed and never surfaced to the user or to `useConnectionState`. The backend-unreachable banner won't trigger from a failed initial connect (only from subsequent disconnect/reconnect events).

---

### Mi-4 — `ActivityTable.tsx`: `--error-row-bg` CSS variable has hardcoded light-mode fallback

```typescript
"var(--error-row-bg, rgba(254, 226, 226, 0.5))"
```

The fallback `rgba(254, 226, 226, 0.5)` is hardcoded for the light theme. In Dark/Deep Ocean themes where `--error-row-bg` is not defined, this fallback will render an incorrectly light background. The CSS variable should be defined in the global theme stylesheet for all themes.

---

### Mi-5 — `AppShell.tsx`: Banner `padding-top` is hardcoded `48px`, not dynamic

```tsx
style={{ paddingTop: isDisconnected ? "48px" : undefined }}
```

Spec requires "content area adds padding-top **equal to the banner height**." On narrow viewports where banner text wraps to two lines, the padding won't match and content will be obscured. Fix: use a CSS class toggle or measure the banner element dynamically.

---

### Mi-6 — `ActivityTable.tsx`: Table height is hardcoded `600px`

```tsx
style={{ height: "600px", overflow: "auto" }}
```

The table doesn't fill the available viewport height. On large monitors it leaves dead whitespace; on small monitors it provides no minimum height guard. Consider `calc(100vh - var(--header-height) - var(--toolbar-height))` or CSS `flex-1 + min-height`.

---

### Mi-7 — `ProxyCounterPill.tsx`: Popover may clip inside overflow-hidden ancestors

The popover uses `position: absolute` within a `position: relative` wrapper div. If the header container has `overflow: hidden`, the popover will be visually clipped. Consider using a portal (`createPortal`) or the Popover API to render the popover outside the stacking context.

---

## Passing Items

| Item | Notes |
|---|---|
| AC-3: No React Query on activity feed | `// DO NOT useQuery here` comment present; `HUB_INVALIDATION_MAP` not modified ✓ |
| AC-5: Method chip colors | All 6 DESIGN.md color pairs correctly mapped ✓ |
| AC-7: Amber left-border logic | Reads from React Query cache (no refetch); Stopped service correctly excluded ✓ |
| AC-8: 5xx background via `--error-row-bg` | CSS variable with fallback ✓ |
| AC-9: Both highlights simultaneously | Correctly independent conditions ✓ |
| AC-10: ProxyCounterPill core behaviour | Count, per-service breakdown, error color, `aria-live`, dismiss on Esc/outside ✓ |
| AC-11: Header element order | Refresh (hidden), LIVE (green dot), spacer, pill, Record stub, Clear log stub — correct order ✓ |
| AC-14: Banner in AppShell (structure) | Fixed position, correct message, connection state-driven ✓ (implementation has issues — see M-1) |
| AC-15: Empty states | "No activity yet" vs "Log cleared" via `hadRows` prop ✓ |
| `ActivityStore.GetAll()` ordering | `OrderByDescending(r => r.Timestamp)` applied; `QueryAsync` ordering is correct ✓ |
| `ActivityHub.cs` authorization | `[Authorize]` attribute present ✓ |
| Header redaction | `HeaderRedactionService` applied in `ActivityPollingService` before `CaptureAsync` ✓ |
| Virtual scrolling library documented | Comment present: `// Virtual scrolling: using @tanstack/react-virtual for NFR-4` ✓ |
| vite.config.ts `onwarn` | Correctly suppresses `INVALID_ANNOTATION` from `@microsoft/signalr` ESM bundle ✓ |
| `activity-row-{id}` data-testids | Correctly applied on every `<tr>` ✓ |
| `data-testid="activity-btn-view-{id}"` | Per-row view button has unique testid ✓ |
| Test: virtual scrolling capped | `AC-12` test correctly asserts `< 100` DOM rows for 10k input ✓ |
| Test: SignalR prepend order | AC-2 test correctly asserts row-2 appears before row-1 ✓ |
| `HUB_INVALIDATION_MAP` untouched | Not modified — `ActivityRowAdded` correctly omitted ✓ |

---

## Fix Priority

| # | Finding | File | Effort |
|---|---|---|---|
| B-1 | `fetchActivityRows` broken API deserialization | `api.ts` | ~5 min |
| B-2 | Keyboard navigation missing | `ActivityTable.tsx` | ~1h |
| B-3 | Cross-feature type import | `ActivityTable.tsx` | ~5 min |
| M-1 | Duplicate hub connections in `useConnectionState` | `useConnectionState.ts` | ~2h |
| M-2 | Race condition: initial fetch overwrites SignalR rows | `useActivityLog.ts` | ~15 min |
| M-3 | Deep Ocean theme override missing | `TypeIcon.tsx` + CSS | ~15 min |
| M-4 | Virtual row column misalignment | `ActivityTable.tsx` | ~30 min |
| M-5 | `activity-btn-columns` stub missing | `ActivityPage.tsx` | ~5 min |
| M-6 | Integration test always vacuously passes | Integration test | ~30 min |
| Mi-1–7 | Various minor issues | Multiple | ~1h total |
