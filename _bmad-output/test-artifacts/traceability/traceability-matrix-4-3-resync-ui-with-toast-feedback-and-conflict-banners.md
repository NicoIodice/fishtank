---
story_key: 4-3-resync-ui-with-toast-feedback-and-conflict-banners
epic: 4
generated: 2026-07-01
author: Master Test Architect (bmad-testarch-trace)
mode: create
oracle: formal-acceptance-criteria (AC-1..AC-16, 14 covered)
gate: PASS
gate_quality_score: 91
coverage:
  acs_total: 14
  acs_full: 14
  acs_partial: 0
  acs_none: 0
  p0_total: 4
  p0_covered: 4
risk_links:
  - R-E4-001 (FileSystemWatcher race / conflict detection) — AC-8, AC-11
  - R-E4-003 (Resync concurrency — 409 RESYNC_IN_PROGRESS) — AC-7, AC-15, AC-16
suite_status:
  unit_component_full_suite: 741/741 green (60 files)
  e2e: SKIPPED (Docker not running during lifecycle session; spec parses clean)
  ts_build: 0 errors
  lint: 0 errors (1 pre-existing warning in ActivityTable.tsx)
---

# Requirements → Test Traceability Matrix — Story 4.3: Resync UI with Toast Feedback & Conflict Banners

**Story:** 4.3 — Resync UI with Toast Feedback & Conflict Banners (Epic 4)
**Coverage oracle:** Formal acceptance criteria AC-1..AC-16 (14 addressed; AC-13, AC-14 are Story 4.2 ACs carried over for reference; not in scope for 4.3).
**Date:** 2026-07-01
**Gate decision:** **PASS** (quality score 91/100; verified against the test-quality review and live test files.)

Layers: **C** = component (Vitest + RTL + msw), **U** = isolated unit (Vitest), **E** = Playwright E2E (live stack — SKIPPED this run).
Coverage status: **full** = behavioural test(s) at the prescribed layer pin the AC outcome; **partial** = covered via a proxy/loose assertion; **none** = no meaningful test.
Priority is from test-design-epic-4.md Story 4-3 block.

## AC → Test Matrix

| AC | Requirement | Priority | Risk | Covering test(s) — file : test title | Layer | Status |
|---|---|---|---|---|---|---|
| AC-1 | Resync button visible in Mappings toolbar (`data-testid="mappings-btn-resync"`) with icon + label (FR-20) | **P0** | — | `story-4-3-resync-button.test.tsx` : "AC-1: renders the Resync button with testid and label"; `story-4-3-mappings-page-resync.test.tsx` : "AC-1: Resync button is visible in the toolbar"; E2E P0-1 | C, E | **full** |
| AC-2 | Spinner shown + button disabled during `POST /api/resync` pending state (FR-20, NFR-21) | **P0** | — | `story-4-3-resync-button.test.tsx` : "AC-2: shows 'Syncing…' progress toast immediately on click", "AC-2: spinner visible while POST pending", "AC-2: disables button while POST pending" | C | **full** |
| AC-3 | Success toast with count + duration when resync completes with files loaded (FR-20) | **P0** | — | `story-4-3-resync-button.test.tsx` : "AC-3: shows success toast with count and duration on 200"; `story-4-3-useResync.test.ts` : "mutateAsync resolves with ResyncResultDto on 200"; E2E P0-2 | C, U, E | **full** |
| AC-4 | Zero-files success toast when 0 mappings + 0 responses loaded (FR-20) | P1 | — | `story-4-3-resync-button.test.tsx` : "AC-4: shows zero-files toast when 0 mappings and 0 responses loaded"; `story-4-3-useResync.test.ts` : "resolves with zero-files result" | C, U | **full** |
| AC-5 | Duration formatted per rules: `<10s → Nms`, `≥10s <60s → N.Xs`, `≥60s → Nm Ns` (FR-20) | P1 | — | `story-4-3-format-duration.test.ts` : 11 tests covering all boundary values (0ms, 9999ms, 10000ms, 12500ms, 59999ms, 60000ms, 83000ms); `story-4-3-resync-button.test.tsx` : "AC-5: duration formatted correctly in toast" | U, C | **full** |
| AC-6 | Error toast shown on network error or complete failure; persists until dismissed (FR-20) | P1 | — | `story-4-3-resync-button.test.tsx` : "AC-6: shows persistent error toast on network error"; `story-4-3-useResync.test.ts` : "throws on network error"; E2E P1-2 | C, U, E | **full** |
| AC-7 | Partial success: success toast for loaded count + per-file error toast for failures; error toasts persist (FR-20) | P1 | R-E4-003 | `story-4-3-resync-button.test.tsx` : "AC-7: shows success toast AND per-file error toasts on partial success"; `story-4-3-useResync.test.ts` : "resolves with partial result with failures" | C, U | **full** |
| AC-8 | Conflict banner shown when active file is dirty AND in `resync.conflicts` list (FR-20, R-E4-001) | P1 | R-E4-001 | `story-4-3-conflict-banner.test.tsx` : "AC-8: renders banner with conflict message", "AC-8: shows file path in the message"; `story-4-3-mappings-page-resync.test.tsx` : "AC-8: conflict banner appears after resync"; E2E P1-3 | C, E | **full** |
| AC-9 | Deleted-file banner shown when active file is in resync deletions list (FR-20) | P1 | — | `story-4-3-deleted-file-banner.test.tsx` : "AC-9: renders deleted-file banner", "AC-9: Close button calls onClose"; `story-4-3-mappings-page-resync.test.tsx` : "AC-9: deleted-file banner appears"; `story-4-3-coverage-gaps.test.tsx` : "Gap 2 — handleCloseDeleted" | C | **full** |
| AC-10 | Clean (not dirty) active file silently reloads from disk when conflicted (FR-20) | P1 | — | `story-4-3-mappings-page-resync.test.tsx` : "AC-10: silent reload when file is clean and in conflicts list", "handleResyncComplete triggers refetch for clean conflicted file" | C | **full** |
| AC-11 | Unsaved changes never silently discarded — confirmation required before viewing disk version (FR-20, R-E4-001) | **P0** | R-E4-001 | `story-4-3-conflict-banner.test.tsx` : "AC-11: 'View disk version' opens confirmation dialog", "AC-11: confirmation dialog shows alertdialog role"; `story-4-3-mappings-page-resync.test.tsx` : "AC-11: conflict banner gate" | C | **full** |
| AC-12 | "Keep my edits" button dismisses conflict banner (FR-20) | P1 | — | `story-4-3-conflict-banner.test.tsx` : "AC-8: 'Keep my edits' button calls onKeepEdits"; `story-4-3-mappings-page-resync.test.tsx` : "AC-12: 'Keep my edits' dismisses conflict banner"; `story-4-3-coverage-gaps.test.tsx` : "Cancel button does not call onViewDisk" | C | **full** |
| AC-15 | Resync button disabled while mutation in progress; re-enables after completion (FR-20) | P1 | R-E4-003 | `story-4-3-resync-button.test.tsx` : "AC-2: disables button while POST pending", "AC-15: button re-enables after resync completes"; `story-4-3-useResync.test.ts` : "isPending is true while mutation is in-flight"; E2E P1-1 | C, U, E | **full** |
| AC-16 | 409 error handled gracefully; persistent error toast shown (FR-20, R-E4-003) | P1 | R-E4-003 | `story-4-3-useToast-persist.test.ts` : "error toast does NOT auto-dismiss after 4s", "explicit persist=true prevents auto-dismiss"; `story-4-3-resync-button.test.tsx` : "AC-16: error toast does NOT auto-dismiss"; E2E P1-2 | C, U, E | **full** |

## Implementation File Coverage

| File | Purpose | ACs Covered |
|------|---------|-------------|
| `src/client/src/features/mappings/components/ResyncButton.tsx` | Resync button with spinner, toast integration, in-progress/success/failure/partial-success logic | AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-15, AC-16 |
| `src/client/src/features/mappings/components/ConflictBanner.tsx` | Inline conflict banner with two-step "View disk version" confirmation | AC-8, AC-11, AC-12 |
| `src/client/src/features/mappings/components/DeletedFileBanner.tsx` | Inline deleted-file banner with Close action | AC-9 |
| `src/client/src/features/mappings/hooks/useResync.ts` | React Query `useMutation` for `POST /api/resync`; cache invalidation on success | AC-3, AC-4, AC-7 |
| `src/client/src/features/mappings/utils/formatDuration.ts` | Duration formatting utility: `ms → Nms / N.Xs / Nm Ns` | AC-5 |
| `src/client/src/lib/useToast.ts` (modified) | Added `persist` option; cleanup effect to clear timers on unmount | AC-16 |
| `src/client/src/features/mappings/pages/MappingsPage.tsx` (modified) | Integration of ResyncButton, ConflictBanner, DeletedFileBanner; `handleResyncComplete` with dirty/clean branching | AC-1, AC-8, AC-9, AC-10, AC-11 |

## Test File Coverage

| Test File | Layer | ACs Covered | Tests |
|-----------|-------|-------------|------:|
| `story-4-3-format-duration.test.ts` | U | AC-5 | 11 |
| `story-4-3-useResync.test.ts` | U | AC-3, AC-4, AC-6, AC-7, AC-15 | 7 |
| `story-4-3-useToast-persist.test.ts` | U | AC-16 | 8 |
| `story-4-3-resync-button.test.tsx` | C | AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-15, AC-16 | 21 |
| `story-4-3-conflict-banner.test.tsx` | C | AC-8, AC-11, AC-12 | 9 |
| `story-4-3-deleted-file-banner.test.tsx` | C | AC-9 | 6 |
| `story-4-3-mappings-page-resync.test.tsx` | C (page integration) | AC-1, AC-8, AC-9, AC-10, AC-11, AC-12 | 7 |
| `story-4-3-coverage-gaps.test.tsx` | C (gap closure) | AC-9, AC-12, branches | 9 |
| `story-4-3-resync-ui-…spec.ts` (E2E) | E | AC-1, AC-3, AC-6, AC-8, AC-9, AC-10, AC-15, AC-16 | 10 |

## Coverage by Priority

| Priority | ACs in this story | Covered (full) | Covered (partial) | None | Status |
|---|---|---|---|---|---|
| **P0** | AC-1, AC-2, AC-3, AC-11 | 4 | 0 | 0 | ✅ ALL P0s COVERED |
| P1 | AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-12, AC-15, AC-16 | 10 | 0 | 0 | ✅ |
| **Total** | **14** | **14** | **0** | **0** | ✅ **PASS** |

## Risk Coverage

| Risk ID | Description | ACs | Test Evidence |
|---------|-------------|-----|---------------|
| R-E4-001 | FileSystemWatcher race / conflict detection | AC-8, AC-11 | `story-4-3-conflict-banner.test.tsx` (alertdialog confirmation); `story-4-3-mappings-page-resync.test.tsx` (dirty gate) |
| R-E4-003 | Resync concurrency — 409 RESYNC_IN_PROGRESS | AC-7, AC-15, AC-16 | `story-4-3-useResync.test.ts` (409 ApiError); `story-4-3-useToast-persist.test.ts` (persist); `story-4-3-resync-button.test.tsx` (AC-15/16 combined) |

## Gate Decision

**PASS** ✅

- All 14 ACs implemented and covered by ≥1 unit/component test
- All 4 P0 ACs covered at the component integration layer
- Coverage thresholds met: Lines 94.12% · Statements 92.86% · Functions 93.14% · Branches 90.41%
- `tsc -b --noEmit` exit 0; `npm run lint` 0 errors; `npx vitest run` 741/741 green
- E2E scaffold present and typechecks clean; runtime execution deferred to CI (Docker unavailable locally during this lifecycle session)
