# ATDD Checklist — Story 4.3: Resync UI with Toast Feedback & Conflict Banners

**Story key:** `4-3-resync-ui-with-toast-feedback-and-conflict-banners`
**Epic:** 4
**Date generated:** 2026-07-01
**Phase:** GREEN (all scaffolds implemented and passing)

---

## Phase Gate Status

| Gate | Status | Notes |
|---|---|---|
| Test files created | PASS | 8 scaffold files written (7 unit/component, 1 E2E) |
| ACs referenced | PASS | All 14 ACs addressed (see coverage table below) |
| Compile / parse clean (TypeScript) | PASS | `npx tsc -b --noEmit` — 0 errors |
| msw handlers added | PASS | `src/client/src/test/mocks/handlers.ts` updated with `POST /api/resync` default handler |
| Component / unit tests GREEN | PASS | 732 tests across 7 files, all passing after dev-story implementation |
| Coverage gaps closed | PASS | 9 additional tests in `story-4-3-coverage-gaps.test.tsx` — 741/741 total |
| E2E specs parseable | PASS | E2E spec typechecks clean; runtime execution skipped (Docker not running during lifecycle session) |

---

## Scaffold File Inventory

### Unit / Component Tests (Vitest + React Testing Library + msw)

| File | ACs Covered | Test Count | Status |
|---|---|---|---|
| `src/client/tests/unit/features/mappings/story-4-3-format-duration.test.ts` | AC-5 | 11 | GREEN — all pass |
| `src/client/tests/unit/features/mappings/story-4-3-useResync.test.ts` | AC-3, AC-4, AC-7, AC-15 | 7 | GREEN — all pass |
| `src/client/tests/unit/features/mappings/story-4-3-useToast-persist.test.ts` | AC-16 | 8 | GREEN — all pass |
| `src/client/tests/unit/features/mappings/story-4-3-resync-button.test.tsx` | AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-15, AC-16 | 21 | GREEN — all pass |
| `src/client/tests/unit/features/mappings/story-4-3-conflict-banner.test.tsx` | AC-8, AC-11, AC-12 | 9 | GREEN — all pass (requires `waitFor` import, added post-code-review) |
| `src/client/tests/unit/features/mappings/story-4-3-deleted-file-banner.test.tsx` | AC-9 | 6 | GREEN — all pass |
| `src/client/tests/unit/features/mappings/story-4-3-mappings-page-resync.test.tsx` | AC-1, AC-8, AC-9, AC-10, AC-11 | 7 | GREEN — all pass |

**Total component / unit tests: 69 across 7 ATDD files — all GREEN**

### Coverage Gap Tests (post-automate phase)

| File | Gaps Closed | Test Count | Status |
|---|---|---|---|
| `src/client/tests/unit/features/mappings/story-4-3-coverage-gaps.test.tsx` | ConflictBanner cancel, MappingsPage close-deleted, handleNewResponseClick no-service, ResyncButton spinner-dedup | 9 | GREEN — all pass |

**Grand total: 741 / 741 tests passing**

### E2E Tests (Playwright — live stack)

| File | ACs Covered | Scenarios | Status |
|---|---|---|---|
| `src/client/tests/e2e/story-4-3-resync-ui-with-toast-feedback-and-conflict-banners.spec.ts` | AC-1, AC-3, AC-4, AC-6, AC-7, AC-8, AC-9, AC-10, AC-12, AC-15 | 10 | SKIPPED (Docker not running); spec parses clean (`tsc --noEmit` exit 0) |

---

## Generated Tests with AC Mapping

### story-4-3-format-duration.test.ts

| Test Name | ACs |
|---|---|
| formats sub-10s durations as milliseconds (e.g. 850ms) | AC-5 |
| formats 9999ms as "9999ms" (boundary below 10 000ms) | AC-5 |
| formats 10000ms as "10.0s" (boundary at 10 000ms) | AC-5 |
| formats mid-range seconds with one decimal (e.g. 12500ms → "12.5s") | AC-5 |
| formats 59999ms as "60.0s" (boundary below 60 000ms) | AC-5 |
| formats 60000ms as "1m 0s" (boundary at 60 000ms) | AC-5 |
| formats 83000ms as "1m 23s" | AC-5 |
| formats 0ms as "0ms" | AC-5 |
| rounds sub-second values to integer ms | AC-5 |
| formats large ms values correctly (e.g. 9999ms) | AC-5 |
| formats seconds to one decimal place (e.g. 12.567s → "12.6s") | AC-5 |

### story-4-3-useResync.test.ts

| Test Name | ACs |
|---|---|
| mutateAsync resolves with ResyncResultDto on 200 | AC-3 |
| resolves with partial result with failures (AC-7) | AC-7 |
| resolves with zero-files result (AC-4) | AC-4 |
| throws ApiError with RESYNC_IN_PROGRESS on 409 | AC-7, AC-15 |
| throws on network error (AC-6) | AC-6 |
| invalidates ["mappings"] query on success | AC-3 |
| isPending is true while mutation is in-flight (AC-15) | AC-15 |

### story-4-3-useToast-persist.test.ts

| Test Name | ACs |
|---|---|
| error toast does NOT auto-dismiss after 4s (default persist=true for errors) | AC-16 |
| success toast auto-dismisses after 4s | AC-3 |
| info toast auto-dismisses after 4s | — |
| explicit persist=true prevents auto-dismiss on success toast | AC-16 |
| explicit persist=false causes auto-dismiss on error toast | — |
| dismissToast removes the toast immediately | — |
| showToast returns an id that can be used to dismiss | — |
| multiple toasts can coexist and be independently dismissed | — |

### story-4-3-resync-button.test.tsx

| Test Name | ACs |
|---|---|
| AC-1: renders the Resync button with testid and label | AC-1 |
| AC-1: button has aria-label "Resync files from disk" | AC-1 |
| AC-2: shows "Syncing…" progress toast immediately on click | AC-2 |
| AC-2: spinner visible while POST pending | AC-2 |
| AC-2: disables button while POST pending | AC-2, AC-15 |
| AC-3: shows success toast with count and duration on 200 with files loaded | AC-3, AC-5 |
| AC-4: shows zero-files toast when 0 mappings and 0 responses loaded | AC-4 |
| AC-5: duration formatted correctly in toast (ms → 850ms) | AC-5 |
| AC-6: shows persistent error toast on network error | AC-6 |
| AC-7: shows success toast AND per-file error toasts on partial success | AC-7 |
| AC-15: 409 RESYNC_IN_PROGRESS shows "already in progress" error toast | AC-7, AC-15 |
| AC-15: button re-enables after resync completes | AC-15 |
| AC-16: error toast does NOT auto-dismiss | AC-16 |
| AC-16: persistent error toast has dismiss button | AC-16 |
| toast-resync-progress has data-testid="toast-resync-progress" | AC-2 |
| toast-resync-success has data-testid="toast-resync-success" | AC-3 |
| toast-resync-error has data-testid="toast-resync-error" | AC-6 |
| spinner has role="status" and aria-label="Syncing" | AC-2 |
| button icon is aria-hidden | — |
| progress toast is dismissed after success | AC-3 |
| ResyncButton reports isPending to parent via onPendingChange callback | AC-2, AC-15 |

### story-4-3-conflict-banner.test.tsx

| Test Name | ACs |
|---|---|
| AC-8: renders banner with conflict message | AC-8 |
| AC-8: shows file path in the message | AC-8 |
| AC-8: "Keep my edits" button calls onKeepEdits | AC-8, AC-12 |
| AC-11: "View disk version" opens confirmation dialog (not immediately onViewDisk) | AC-11 |
| AC-11: confirmation dialog shows alertdialog role | AC-11 |
| AC-11: "Discard & view disk version" confirm button calls onViewDisk | AC-11 |
| "View disk version" calls onViewDisk (after confirmation) | AC-11, AC-12 |
| banner has role="alert" in initial state | AC-8 |
| data-testid="mappings-banner-conflict" present | AC-8 |

### story-4-3-deleted-file-banner.test.tsx

| Test Name | ACs |
|---|---|
| AC-9: renders deleted-file banner | AC-9 |
| AC-9: shows file path in message | AC-9 |
| AC-9: "Close" button calls onClose | AC-9 |
| banner has role="alert" | AC-9 |
| data-testid="mappings-banner-deleted" present | AC-9 |
| close button has data-testid="mappings-btn-close-deleted" | AC-9 |

### story-4-3-mappings-page-resync.test.tsx

| Test Name | ACs |
|---|---|
| AC-1: Resync button is visible in the toolbar | AC-1 |
| AC-8: conflict banner appears after resync when open file is dirty and in conflicts list | AC-8 |
| AC-11: conflict banner gate — open dirty file blocks silent reload | AC-11 |
| AC-9: deleted-file banner appears after resync when open file is in deletions list | AC-9 |
| AC-10: silent reload when file is clean (not dirty) and in conflicts list | AC-10 |
| AC-12: "Keep my edits" dismisses conflict banner | AC-12 |
| handleResyncComplete triggers refetch for clean conflicted file | AC-10 |

---

## MSW Handler Changes

`src/client/src/test/mocks/handlers.ts` — added default `POST /api/resync` handler:

```typescript
http.post('/api/resync', () =>
  HttpResponse.json({
    mappingsLoaded: 3,
    responsesLoaded: 2,
    elapsedMs: 850,
    conflicts: [],
    failures: [],
  }),
),
```

Per-test overrides use `server.use(http.post('/api/resync', ...))` pattern consistent with the existing suite.
