---
story_key: 4-3-resync-ui-with-toast-feedback-and-conflict-banners
epic: 4
generated: 2026-07-01
assessor: Master Test Architect (bmad-testarch-nfr, Create mode)
mode: create
audit_areas: [accessibility, performance, security, reliability]
verdict: pass
blockers: 0
majors: 0
minors: 2
---

# NFR Assessment — Story 4.3: Resync UI with Toast Feedback & Conflict Banners

**Scope:** the NEW / changed code paths introduced by story 4-3 only.

- **Frontend (new):** `ResyncButton.tsx`, `ConflictBanner.tsx`, `DeletedFileBanner.tsx`, `useResync.ts`, `formatDuration.ts`.
- **Frontend (modified):** `useToast.ts` (persist option + cleanup), `MappingsPage.tsx` (integration).

**Verdict: PASS** — zero BLOCKERs. All Epic-4 NFR controls relevant to 4-3 (NFR-21 prefers-reduced-motion, NFR-8 auth, R-E4-001 conflict detection, R-E4-003 409 concurrency guard, AC-11 no-silent-discard) are present in code and validated by tests. One accessibility WARN was found and fixed (focus management in ConflictBanner confirmation dialog). UI-load <2s (NFR-1) and resync <1s (NFR-2) are deferred to CI Lighthouse / performance tests per the test-design plan.

---

## Accessibility (WCAG 2.1 AA)

### ResyncButton.tsx

| Check | Evidence | Verdict |
|-------|----------|---------|
| Toast `role` / `aria-live` | `role="alert"` + `aria-live="assertive"` for error toasts (line ~41); `role="status"` + `aria-live="polite"` for success/info | ✅ PASS |
| Dismiss button accessible name | `aria-label="Dismiss"` on each toast dismiss button (line ~63) | ✅ PASS |
| Main button accessible name | `aria-label="Resync files from disk"` on the Resync `<button>` (line ~223) | ✅ PASS |
| Spinner accessibility | `role="status"` + `aria-label="Syncing"` on spinner element (lines ~228-232) | ✅ PASS |
| Icons hidden from AT | `aria-hidden="true"` on all `<i>` icon elements (lines ~54, 234, 240) | ✅ PASS |
| `prefers-reduced-motion` | `@media (prefers-reduced-motion: reduce) { animation: none; }` injected via `useSpinnerStyles` (lines ~91-93) | ✅ PASS |

### ConflictBanner.tsx

| Check | Evidence | Verdict |
|-------|----------|---------|
| Alert dialog role | `role="alertdialog"` + `aria-label="Confirm discard local edits"` when `showConfirm=true` (line ~31) | ✅ PASS |
| Initial banner role | `role="alert"` on initial state (line ~73) | ✅ PASS |
| Icons hidden | `aria-hidden="true"` on all `<i>` elements (lines ~35, 76) | ✅ PASS |
| Focus management | `autoFocus` added to the Cancel button in the confirmation dialog so focus moves to the safe action on dialog open (added during NFR remediation) | ✅ PASS |

### DeletedFileBanner.tsx

| Check | Evidence | Verdict |
|-------|----------|---------|
| Banner role | `role="alert"` (line ~14) | ✅ PASS |
| Icon hidden | `aria-hidden="true"` on the warning icon (line ~24) | ✅ PASS |

**Accessibility Verdict: ✅ PASS** — all WCAG 2.1 AA controls in scope present and confirmed. Focus management gap fixed during this assessment pass (autoFocus on Cancel button in confirmation dialog).

---

## Performance

### ResyncButton.tsx

| Check | Evidence | Verdict |
|-------|----------|---------|
| `useCallback` for event handlers | `handleClick` wrapped in `useCallback` with correct deps `[mutation.isPending, showToast]` | ✅ PASS |
| Spinner style deduplication | `useSpinnerStyles` checks `document.getElementById(id)` before injecting the style tag — no duplicate rules on re-render | ✅ PASS |
| `useEffect` deps | `[mutation.isPending, onPendingChange]` — correct; no stale closure | ✅ PASS |

### useToast.ts

| Check | Evidence | Verdict |
|-------|----------|---------|
| Timer cleanup on unmount | `useEffect` cleanup `() => { timers.current.forEach(clearTimeout); timers.current.clear(); }` (lines ~40-46) — prevents setState after unmount | ✅ PASS |
| `useCallback` memoisation | Both `showToast` and `dismissToast` are wrapped in `useCallback` | ✅ PASS |

### MappingsPage.tsx

| Check | Evidence | Verdict |
|-------|----------|---------|
| Ref-sync effect | `useEffect` with no deps array synchronises `editBufferRef` / `isDirtyRef` after every render — intentional pattern, documented with an explanatory comment already present in the file | ✅ PASS |
| `handleResyncComplete` in `useCallback` | Wrapped with `[activeFilePath, refetchFileContent]` deps; no unnecessary re-creation | ✅ PASS |

**Performance Verdict: ✅ PASS** — no N+1 fetches, no per-keystroke network calls, timers cleaned up on unmount.

---

## Security

| Check | File(s) | Evidence | Verdict |
|-------|---------|----------|---------|
| No `dangerouslySetInnerHTML` | All new files | Grep: 0 matches | ✅ PASS |
| No `console.log` / secret exposure | All new files | Grep: 0 matches | ✅ PASS |
| XSS prevention | ResyncButton, ConflictBanner, DeletedFileBanner | All dynamic text rendered via JSX interpolation (auto-escaped); no `innerHTML` / `eval` | ✅ PASS |
| Error message safety | `ResyncButton.tsx` error handler (lines ~179-194) | Displays `err.message` from `ApiError` — server-generated, no sensitive fields (path, credentials); server already sanitizes error codes | ✅ PASS |
| Auth coverage | `useResync.ts` | Uses `apiFetch` (`lib/api.ts`), which always sets `credentials:"include"` and redirects 401 → `/login`; no raw `fetch` | ✅ PASS |
| `formatDuration` — no injection surface | `formatDuration.ts` | Pure numeric computation → string; no HTML; no user input | ✅ PASS |

**Security Verdict: ✅ PASS**

---

## Reliability

### useResync.ts

| Check | Evidence | Verdict |
|-------|----------|---------|
| Network error handling | `useMutation` rejects on fetch failure; `ResyncButton` `onError` callback handles any `Error` | ✅ PASS |
| 409 concurrency guard | `ResyncButton.tsx` lines ~183-187: checks `err.code === "RESYNC_IN_PROGRESS"` and shows a specific user-facing message | ✅ PASS |
| Cache invalidation on success | `useResync.ts` calls `queryClient.invalidateQueries({ queryKey: ["mappings"] })` in `onSuccess` — tree re-fetches after a successful resync | ✅ PASS |

### useToast.ts

| Check | Evidence | Verdict |
|-------|----------|---------|
| Timer cleanup on unmount | Cleanup effect clears and deletes all pending timers | ✅ PASS |
| Per-toast timer cleanup on dismiss | `dismissToast` calls `clearTimeout` + `timers.current.delete(id)` before removing from state | ✅ PASS |

### ConflictBanner.tsx

| Check | Evidence | Verdict |
|-------|----------|---------|
| State consistency | Single boolean `showConfirm` with unidirectional transitions (`false → true → callback / false`) | ✅ PASS |
| No silent discard (AC-11) | `onViewDisk` is never called without explicit user confirmation | ✅ PASS |

**Reliability Verdict: ✅ PASS**

---

## Minor Findings (non-blocking)

**m-1 — ResyncButton spinner `<style>` tag not removed on unmount.**
`useSpinnerStyles` injects `<style id="resync-spinner-styles">` into `document.head` but the
`useEffect` cleanup does not remove it. On component unmount the tag remains. Functionally
harmless (defines only a `@keyframes spin` rule), but a minor DOM hygiene issue. Recommend
adding `return () => document.getElementById(id)?.remove()` to the cleanup.

**m-2 — Multiple resync failures produce N separate persistent toasts.**
`ResyncButton.tsx` shows one error toast per failure entry in `result.failures`. For large
resync failures (e.g. 20+ files) this floods the toast area. A future improvement could
aggregate: "3 files failed to load" with a details panel. Acceptable for v1.

---

## Summary

| NFR Dimension | Verdict | Key Evidence |
|---------------|---------|--------------|
| **Accessibility** | ✅ PASS | `role="alert"`, `role="alertdialog"`, `aria-live`, `aria-label` on all interactive elements; `prefers-reduced-motion` respected; focus management present (autoFocus on Cancel) |
| **Performance** | ✅ PASS | Timer cleanup on unmount; `useCallback` on event handlers; no per-keystroke fetches |
| **Security** | ✅ PASS | No XSS surface; no secrets exposed; auth via `apiFetch` throughout |
| **Reliability** | ✅ PASS | Error handling for network + 409; no silent discard; cache invalidated on success |
