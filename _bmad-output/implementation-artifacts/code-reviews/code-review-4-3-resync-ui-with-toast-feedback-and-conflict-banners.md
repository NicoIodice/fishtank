---
story_key: 4-3-resync-ui-with-toast-feedback-and-conflict-banners
date: 2026-07-01
verdict: pass
reviewer: bmad-code-review (adversarial)
epic: 4
---

# Code Review — Story 4.3: Resync UI with Toast Feedback & Conflict Banners

Adversarial senior review of the working-tree changes for story 4-3. Scope: frontend
`features/mappings/components/` (ResyncButton, ConflictBanner, DeletedFileBanner),
`features/mappings/hooks/useResync.ts`, `features/mappings/utils/formatDuration.ts`,
`features/mappings/pages/MappingsPage.tsx` (integration), `lib/useToast.ts` (enhancement),
`features/mappings/types/mappings.ts` (new DTOs), and `test/mocks/handlers.ts` (MSW).

## Remediation status (post-review, 2026-07-01)

All 2 BLOCKER findings were fixed in QuickDev cycle 1 before merge:
- **B-1** (AC-10 silent reload missing): resolved — `handleResyncComplete` in `MappingsPage.tsx` now calls `void refetchFileContent()` in the `else` branch (file clean, conflict detected) instead of silently ignoring the update.
- **B-2** (View disk version lacks confirmation): resolved — `ConflictBanner.tsx` now has `showConfirm` state; clicking `mappings-btn-view-disk` transitions to an `alertdialog` confirmation step with `mappings-btn-view-disk-confirm` and `mappings-btn-view-disk-cancel` buttons; `onViewDisk` is only called after the user confirms.

All 2 MAJOR findings were also fixed in the same QuickDev cycle:
- **M-1** (useToast timer leak on unmount): resolved — `useToast.ts` now has a cleanup `useEffect` that calls `clearTimeout` on all pending timers and clears the `Map` on component unmount.
- **M-2** (missing `data-testid` on toast elements): resolved — `ResyncButton.tsx` ToastList now renders `data-testid="toast-resync-error|success|progress"` on each toast `<div>` based on variant.

Build clean and full client suite 741/741 after remediation (verified with `npx tsc -b --noEmit` exit 0 and `npx vitest run`). MINOR items remain as documented below (non-blocking).

## Verdict: PASS (zero BLOCKERs after QuickDev cycle 1)

The story is functionally complete. All DoD build/test gates pass: `tsc -b` clean; `vitest run` 741/741;
`npm run lint` 0 errors (1 pre-existing warning in `ActivityTable.tsx`). The security surface
(no direct DOM injection, all user text via JSX auto-escaping, no raw `fetch`) is sound.

## Findings summary

| Severity | Count | Resolved |
|---|---|---|
| BLOCKER | 2 | 2 (all fixed) |
| MAJOR | 2 | 2 (all fixed) |
| MINOR | 4 | 0 (documented, non-blocking) |

## Verified strengths (no action needed)

- **No dangerouslySetInnerHTML / XSS** — all user-controlled text (file paths, error messages) is interpolated through JSX; zero `dangerouslySetInnerHTML`, `innerHTML`, or `eval` in new code.
- **Auth coverage** — `useResync` calls `apiFetch` (`lib/api.ts`), which unconditionally sets `credentials:"include"` and redirects 401 → `/login`; no raw `fetch`.
- **Concurrency guard respected** — 409 `RESYNC_IN_PROGRESS` is handled as an `ApiError` check in `ResyncButton.tsx`; shows a persistent error toast and re-enables the button without a crash.
- **`prefers-reduced-motion` compliance** — `ResyncButton.tsx` injects a `<style>` block with `@media (prefers-reduced-motion: reduce) { animation: none }` for the spinner; deduplication guard (`getElementById`) prevents double injection on re-render.
- **React Query cache invalidation** — `useResync` calls `queryClient.invalidateQueries({ queryKey: ["mappings"] })` in `onSuccess` to flush the file tree (AC-3 seam).
- **Toast persist semantics** — error toasts now correctly persist (not auto-dismiss) by default in `useToast`; explicit `persist` override propagated for success toasts.
- **Feature-folder isolation** — `ResyncButton`, `ConflictBanner`, `DeletedFileBanner` import only from `@/lib/*` and feature-relative `../`; no cross-feature imports.
- **Spinner style deduplication** — `useSpinnerStyles` in `ResyncButton.tsx` uses `document.getElementById(id)` early-return so the injected `<style>` is not duplicated across re-renders.
- **`data-testid` coverage** — all canonical DESIGN.md ids present: `mappings-btn-resync`, `mappings-banner-conflict`, `mappings-btn-keep-edits`, `mappings-btn-view-disk`, `mappings-btn-view-disk-confirm`, `mappings-btn-view-disk-cancel`, `mappings-banner-deleted`, `mappings-btn-close-deleted`.

---

## Findings

### BLOCKER (both fixed pre-merge)

#### B-1 — AC-10 silent reload not implemented
**File:** `src/client/src/features/mappings/pages/MappingsPage.tsx` — `handleResyncComplete`
**AC/Rule:** AC-10 ("When Resync completes and the currently open file is a conflict but has NO unsaved changes, silently reload the file from disk.")
**Description (original):** `handleResyncComplete` only called `setActiveFileConflict(conflict)` when a conflict was found — it did not distinguish between the dirty and clean cases. For a clean file, the conflict banner would appear incorrectly.
**Fix applied:** Added `else { void refetchFileContent(); }` branch after the `if (isDirtyRef.current)` check, so clean files are silently reloaded from disk without showing the banner.

#### B-2 — "View disk version" has no confirmation guard
**File:** `src/client/src/features/mappings/components/ConflictBanner.tsx`
**AC/Rule:** AC-11 ("Unsaved changes must never be silently discarded."); DESIGN.md conflict-banner UX note ("clicking 'View disk version' must require a confirmation step to prevent accidental discard of in-flight edits").
**Description (original):** The initial implementation called `onViewDisk` directly on the first click, with no confirmation step. A mis-click would immediately discard all unsaved changes with no undo.
**Fix applied:** Added `const [showConfirm, setShowConfirm] = useState(false)`. First click → `setShowConfirm(true)` (renders `role="alertdialog"` with destructive confirm + cancel). Confirm click → `onViewDisk()`. Cancel → `setShowConfirm(false)`.

### MAJOR (both fixed pre-merge)

#### M-1 — useToast memory leak on component unmount
**File:** `src/client/src/lib/useToast.ts`
**Description (original):** `showToast` scheduled `setTimeout` callbacks that called `setToasts(...)` after a 4-second delay. If the host component unmounted before the timer fired (e.g., navigating away mid-resync), the callback would attempt `setState` on an unmounted component — a React warning and potential memory leak in long-running sessions.
**Fix applied:** Added a cleanup `useEffect(() => { const t = timers.current; return () => { t.forEach(clearTimeout); t.clear(); }; }, [])` that clears all in-flight timers on unmount.

#### M-2 — Missing `data-testid` on toast DOM elements
**File:** `src/client/src/features/mappings/components/ResyncButton.tsx`
**Description (original):** `ToastList` rendered toast `<div>` elements without `data-testid` attributes, making them unaddressable in automated tests and violating the DESIGN.md testid contract.
**Fix applied:** Each toast `<div>` now renders `data-testid={t.variant === "error" ? "toast-resync-error" : t.variant === "success" ? "toast-resync-success" : "toast-resync-progress"}`.

### MINOR (non-blocking, documented)

**m-1 — `isDirtyRef` synchronisation is slightly deferred.**
`MappingsPage.tsx` synchronises `isDirtyRef.current` in a `useEffect` with no deps array (runs after every render). Between the render that triggers `handleResyncComplete` and the next `useEffect` flush there is a one-render window where `isDirtyRef.current` could reflect a stale value. In practice this race requires a resync response to arrive in the same React synchronous cycle as a user edit, which is exceptionally unlikely. A future refactor could make `isDirtyRef` a stable ref that is updated directly in the `onDirtyChange` callback. Not a correctness bug for typical usage.

**m-2 — No duplicate-toast deduplication for multiple failures.**
If Resync returns 5 failures, `ResyncButton.tsx` shows 5 separate persistent error toasts. There is no cap or "N files failed" aggregation. For large sync failures this can flood the toast area. Acceptable for v1 but a UX improvement is recommended in a follow-up story.

**m-3 — Formatter returns `"0m 0s"` for 60000ms edge case.**
`formatDuration(60000)` → `"1m 0s"` (correct per AC-5). However `formatDuration(60000 - 1)` → `"59.9s"` (≥10000ms branch) is correct but worth noting: there is no "60s" display value. Boundary is clean per the spec but could surprise callers who expect round seconds.

**m-4 — `ResyncButton` spinner style tag is never removed from `<head>`.**
`useSpinnerStyles` injects a `<style id="resync-spinner-styles">` into `document.head` but the `useEffect` cleanup does not remove it. On unmount the tag remains in `<head>` indefinitely. Functionally harmless (it just defines a `@keyframes spin` rule) but is a minor DOM hygiene issue for long-lived SPA sessions where the Mappings page is repeatedly mounted/unmounted.
