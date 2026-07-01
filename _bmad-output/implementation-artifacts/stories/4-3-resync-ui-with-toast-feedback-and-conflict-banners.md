---
story_id: "4.3"
story_key: "4-3-resync-ui-with-toast-feedback-and-conflict-banners"
epic: 4
story_title: "Resync UI with Toast Feedback & Conflict Banners"
status: ready-for-dev
priority: high
frs_covered:
  - FR-20 (Resync from Mappings toolbar — reload all Mapping and Response files from disk for all Services; progress indicator; success/failure/partial-success toasts; conflict detection for externally modified open files; unsaved changes never silently discarded)
ux_drs_covered:
  - UX-DR11 (toast patterns; inline banners; conflict resolution UX)
nfrs_addressed:
  - NFR-2 (Resync completes in under 1 second for <200 files, with a progress indicator shown for larger sets)
  - NFR-21 (prefers-reduced-motion — spinner animation respects reduced motion)
architecture_items:
  - HUB_INVALIDATION_MAP seam — ResyncCompleted event triggers queryClient.invalidateQueries([["mappings"]])
  - Toast system enhancement — persistent error toasts until user dismisses
risk_links:
  - R-E4-001 (FileSystemWatcher race conditions / conflict detection)
  - R-E4-003 (Resync concurrency — 409 RESYNC_IN_PROGRESS)
  - R-E4-004 (File write failure surfacing)
---

# Story 4.3: Resync UI with Toast Feedback & Conflict Banners

## Story

**As a** developer,
**I want** to trigger Resync from the Mappings toolbar and receive clear feedback on what loaded, what failed, and whether any of my open files were modified externally,
**So that** I can keep the in-memory mock engine in sync with the filesystem without restarting the container.

---

## Status

ready-for-dev

---

## Context

### Background

Epic 4 delivers the file management and mock-capture layer for Fishtank. **Story 4.1 (done)** shipped the backend foundation: `POST /api/resync` endpoint, `ResyncService` with `SemaphoreSlim` concurrency guard, conflict detection via `_lastKnownModified`, and SignalR broadcast of `ResyncCompleted`. **Story 4.2 (done)** built the Mappings file explorer and dual-mode editor, including the navigation guard and unsaved-change tracking.

**Story 4.3 (this story)** is the Resync UI story — it adds the Resync button to the Mappings toolbar and surfaces all the backend responses through toasts and conflict banners.

### Scope Boundaries Within Epic 4

- **This story (4.3):** Resync button, in-progress/success/failure/partial-success toasts, conflict banner for externally modified files, deleted-file banner, duration formatting, toast persistence for errors.
- **Story 4.4 (next):** Save As Mock modal — uses the folder tree rendered by 4.2; no Resync dependency.
- **Story 4.5:** Record mode — auto-writes files; no Resync dependency.
- **Story 4.6:** Sign-out protection; generalizes navigation guard — no Resync dependency.

### What Exists (consumable now — shipped by Stories 4.1 and 4.2)

**Backend REST API** (`src/Fishtank.Api/Endpoints/MappingsEndpoints.cs`):

| Method & route | Success | Notes |
|---|---|---|
| `POST /api/resync` | `200` `ResyncResultDto` | Returns mappings/responses counts, elapsed time, conflicts list, failures list. Concurrent calls return `409` `RESYNC_IN_PROGRESS`. |

**Backend DTOs** (camelCase over the wire):
```typescript
interface ResyncResultDto {
  mappingsLoaded: number;
  responsesLoaded: number;
  elapsedMs: number;
  conflicts: ConflictDto[];
  failures: ResyncFailureDto[];
}

interface ConflictDto {
  path: string;   // relative to MocksRoot, forward slashes
  reason: string; // "File modified externally since last load"
}

interface ResyncFailureDto {
  path: string;
  reason: string;
}
```

**Backend behavior:**
- `ResyncService` uses `SemaphoreSlim(1,1)` — concurrent `POST /api/resync` calls return `409` with code `RESYNC_IN_PROGRESS`.
- Conflict detection: compares file `LastWriteTime` against `MappingService._lastKnownModified` dictionary. If the file's modification time advanced since the editor loaded it, it's flagged as a conflict.
- On success, broadcasts `ResyncCompleted` event via `ServicesHub` to all connected clients.

**Frontend infrastructure (Story 4.2):**
- `src/client/src/lib/queryClient.ts` — `HUB_INVALIDATION_MAP` already contains `ResyncCompleted: [["mappings"]]`.
- `src/client/src/lib/useToast.ts` — `{ toasts, showToast(message, variant), dismissToast(id) }`; variants `error | success | info`. Current behavior: all toasts auto-dismiss after 4s.
- `src/client/src/features/mappings/pages/MappingsPage.tsx` — full Mappings page with folder tree, editor, unsaved tracking. **The Resync button is a placeholder seam (not rendered yet).**
- `src/client/src/features/mappings/hooks/useMappingMutations.ts` — existing mutations for create/update/delete.
- `src/client/src/features/mappings/types/mappings.ts` — existing DTO types.

**SignalR integration:**
- `src/client/src/lib/signalr.ts` — hub connection factory already handles `/hubs/services`.
- When `ResyncCompleted` fires, the hub listener in `App.tsx` (or equivalent) calls `queryClient.invalidateQueries(HUB_INVALIDATION_MAP["ResyncCompleted"])` — this triggers a re-fetch of `["mappings"]`.

### What This Story Adds

1. **Resync button** in the Mappings toolbar with spinner during operation.
2. **Toast feedback:** in-progress, success, failure, partial-success patterns.
3. **Conflict banner:** displayed when the currently open file was modified externally WITH local unsaved changes.
4. **Deleted-file banner:** displayed when the currently open file was deleted externally.
5. **Silent reload:** when the currently open file was modified externally WITHOUT local changes.
6. **Duration formatting:** `<10,000ms → {N}ms`; `≥10,000ms → {N}s`; `≥60,000ms → {N}m {N}s`.
7. **Toast persistence enhancement:** error toasts persist until user dismisses (not auto-dismiss).

---

## Acceptance Criteria

### AC-1: Resync button in Mappings toolbar (FR-20)
**Given** the Mappings page is loaded,
**Then** a Resync button (`data-testid="mappings-btn-resync"`) is visible in the toolbar with icon `bi-arrow-clockwise` and label "Resync".

### AC-2: Resync button shows spinner and is disabled during operation (FR-20)
**Given** the Resync button is clicked,
**When** `POST /api/resync` is pending,
**Then** the button shows a spinner animation (respects `prefers-reduced-motion`), the button is disabled, and an in-progress toast displays: "Resyncing…".

### AC-3: Success toast with correct format (FR-20)
**Given** Resync completes successfully (no failures, at least one file loaded),
**When** the response is received,
**Then** the in-progress toast is dismissed, a success toast shows: "{M} mappings and {R} responses loaded in {duration}", and the toast auto-dismisses after 4s.

### AC-4: Zero-files success toast (FR-20)
**Given** Resync completes with 0 mappings and 0 responses loaded,
**Then** the success toast shows: "0 files loaded in {duration} — check your Mocks Root path and volume configuration."

### AC-5: Duration format rules (FR-20)
**Given** the elapsed time from the Resync response,
**Then** the duration is formatted as:
- `<10,000ms`: `{N}ms` (e.g., "850ms")
- `≥10,000ms and <60,000ms`: `{N.X}s` (e.g., "12.5s")
- `≥60,000ms`: `{M}m {S}s` (e.g., "1m 23s")

### AC-6: Failure toast (FR-20)
**Given** Resync fails completely (e.g., `RESYNC_IN_PROGRESS`, network error),
**Then** an error toast shows the reason (e.g., "Resync failed — A resync operation is already in progress."), the Resync button re-enables, and the error toast persists until the user dismisses it.

### AC-7: Partial success toasts (FR-20)
**Given** Resync completes with some files loaded AND some failures,
**Then** a success toast shows the loaded count, AND each failed file generates a separate error toast with filename and reason (e.g., "Failed to load {filename} — {reason}"). Error toasts persist until dismissed.

### AC-8: Conflict banner for externally modified file WITH local unsaved changes (FR-20, R-E4-001)
**Given** the currently open file has local unsaved changes,
**And** Resync reports that file as a conflict (modified externally),
**When** Resync completes,
**Then** an inline banner (`data-testid="mappings-banner-conflict"`) appears above the editor: "This file was modified on disk since you started editing." with actions:
- "View disk version" (`data-testid="mappings-btn-view-disk"`) — secondary action, shows a confirmation before discarding local edits and reloading from disk
- "Keep my edits" (`data-testid="mappings-btn-keep-edits"`) — dismisses the banner, preserves local edits

### AC-9: Deleted-file banner (FR-20)
**Given** the currently open file was deleted externally,
**And** Resync runs (or SignalR `ResyncCompleted` fires),
**When** the file no longer exists on disk,
**Then** an inline banner (`data-testid="mappings-banner-deleted"`) appears: "File no longer exists on disk." with action:
- "Close" (`data-testid="mappings-btn-close-deleted"`) — clears the editor pane, removes the file from the active selection.

### AC-10: Silent reload for externally modified file WITHOUT local changes (FR-20)
**Given** the currently open file has NO local unsaved changes,
**And** Resync reports that file as a conflict (modified externally),
**When** Resync completes,
**Then** the editor silently reloads the new disk version — no banner shown.

### AC-11: Unsaved changes are never silently discarded (FR-20)
**Given** any Resync scenario,
**Then** unsaved changes are NEVER silently discarded — the conflict banner always appears if the user has unsaved edits on a conflicted file.

### AC-12: Editor remains interactive during Resync (FR-20)
**Given** Resync is in progress,
**Then** the user can continue editing the currently open file — the editor is not locked.

### AC-13: Resync performance indicator (NFR-2)
**Given** a Resync operation on a mapping set <200 files,
**Then** it completes in under 1 second. (Backend enforced; frontend displays the duration.)

### AC-14: SignalR ResyncCompleted triggers tree refresh (Architecture)
**Given** `ResyncCompleted` is broadcast by the backend,
**When** the frontend hub listener receives the event,
**Then** `queryClient.invalidateQueries([["mappings"]])` is called (already wired in `HUB_INVALIDATION_MAP`), and the folder tree re-fetches.

### AC-15: Concurrent Resync handling (R-E4-003)
**Given** a Resync operation is already in progress,
**When** the user clicks Resync again (or another client triggers it),
**Then** the backend returns `409` with `RESYNC_IN_PROGRESS`, and the frontend shows an error toast: "Resync failed — A resync operation is already in progress. Please wait."

### AC-16: Error toast persistence (UX enhancement)
**Given** an error toast is shown,
**Then** it does NOT auto-dismiss after 4s — it persists until the user clicks the dismiss button.

---

## Tasks / Subtasks

- [ ] **Task 1: Add ResyncResultDto types and useResync mutation hook** (AC: 3, 4, 5, 6, 7, 14, 15)
  - [ ] 1.1 Add TypeScript types to `features/mappings/types/mappings.ts`: `ResyncResultDto`, `ConflictDto`, `ResyncFailureDto`
  - [ ] 1.2 Create `features/mappings/hooks/useResync.ts` — React Query `useMutation` for `POST /api/resync`; returns `ResyncResultDto`; handles API errors

- [ ] **Task 2: Implement duration formatting utility** (AC: 5)
  - [ ] 2.1 Create `features/mappings/utils/formatDuration.ts` — export `formatDuration(elapsedMs: number): string`
  - [ ] 2.2 Rules: `<10,000ms` → `{N}ms`; `≥10,000ms && <60,000ms` → `{N.X}s` (1 decimal); `≥60,000ms` → `{M}m {S}s`
  - [ ] 2.3 Unit tests for edge cases: 0ms, 999ms, 10000ms, 59999ms, 60000ms, 123456ms

- [ ] **Task 3: Enhance toast system for error persistence** (AC: 16)
  - [ ] 3.1 Update `lib/useToast.ts` — add optional `persist?: boolean` parameter to `showToast(message, variant, persist?)`
  - [ ] 3.2 When `persist=true`, do NOT set the auto-dismiss timeout
  - [ ] 3.3 Default: `persist=false` for `success` and `info`, `persist=true` for `error`
  - [ ] 3.4 Update existing call sites if needed (verify they pass tests)

- [ ] **Task 4: Build ResyncButton component** (AC: 1, 2, 3, 4, 5, 6, 7, 15)
  - [ ] 4.1 Create `features/mappings/components/ResyncButton.tsx`
  - [ ] 4.2 Button with `bi-arrow-clockwise` icon + "Resync" label; `data-testid="mappings-btn-resync"`
  - [ ] 4.3 On click: call `useResync` mutation; show in-progress toast "Resyncing…"
  - [ ] 4.4 While pending: show spinner (CSS animation), disable button
  - [ ] 4.5 On success: dismiss in-progress toast, show success toast with formatted duration
  - [ ] 4.6 On error (`RESYNC_IN_PROGRESS` or network): dismiss in-progress toast, show persistent error toast
  - [ ] 4.7 On partial success (failures array non-empty): show success toast for loaded count + individual error toasts for each failure
  - [ ] 4.8 Spinner respects `prefers-reduced-motion` (no animation if reduced motion)

- [ ] **Task 5: Build ConflictBanner component** (AC: 8, 10, 11)
  - [ ] 5.1 Create `features/mappings/components/ConflictBanner.tsx`
  - [ ] 5.2 Props: `onViewDisk: () => void`, `onKeepEdits: () => void`
  - [ ] 5.3 Banner message: "This file was modified on disk since you started editing."
  - [ ] 5.4 "View disk version" button with confirmation dialog before discarding
  - [ ] 5.5 "Keep my edits" button dismisses banner, preserves local state
  - [ ] 5.6 `data-testid` values: `mappings-banner-conflict`, `mappings-btn-view-disk`, `mappings-btn-keep-edits`

- [ ] **Task 6: Build DeletedFileBanner component** (AC: 9)
  - [ ] 6.1 Create `features/mappings/components/DeletedFileBanner.tsx`
  - [ ] 6.2 Props: `onClose: () => void`
  - [ ] 6.3 Banner message: "File no longer exists on disk."
  - [ ] 6.4 "Close" button clears editor pane
  - [ ] 6.5 `data-testid` values: `mappings-banner-deleted`, `mappings-btn-close-deleted`

- [ ] **Task 7: Integrate Resync into MappingsPage** (AC: 1, 2, 8, 9, 10, 11, 12, 14)
  - [ ] 7.1 Add `<ResyncButton />` to the Mappings toolbar (between tree and editor)
  - [ ] 7.2 Track `activeFileConflict: ConflictDto | null` state — set when Resync result includes a conflict for the currently open file path
  - [ ] 7.3 Track `activeFileDeleted: boolean` state — set when the active file's path is NOT in the refreshed tree after Resync
  - [ ] 7.4 Render `<ConflictBanner />` when `activeFileConflict` is set AND `isDirty` is true
  - [ ] 7.5 Render `<DeletedFileBanner />` when `activeFileDeleted` is true
  - [ ] 7.6 Silent reload: if `activeFileConflict` is set AND `isDirty` is false, re-fetch the file content automatically (call `refetchFileContent`)
  - [ ] 7.7 Editor remains interactive during Resync (no loading overlay on editor pane)
  - [ ] 7.8 "View disk version" handler: set `isDirty=false`, refetch file content, dismiss conflict banner
  - [ ] 7.9 "Keep my edits" handler: dismiss conflict banner, keep local edits
  - [ ] 7.10 "Close deleted" handler: clear `activeFilePath`, clear editor state

- [ ] **Task 8: Component tests (Vitest + Testing Library)** (AC: all)
  - [ ] 8.1 `formatDuration.test.ts` — all edge cases
  - [ ] 8.2 `ResyncButton.test.tsx` — button renders; shows spinner during pending; shows success toast; shows error toast on failure; shows partial success toasts
  - [ ] 8.3 `ConflictBanner.test.tsx` — renders message and buttons; "View disk version" shows confirmation; "Keep my edits" calls onKeepEdits
  - [ ] 8.4 `DeletedFileBanner.test.tsx` — renders message and close button
  - [ ] 8.5 `useToast.test.ts` (if not already covered) — error toasts persist; success toasts auto-dismiss
  - [ ] 8.6 `MappingsPage.test.tsx` (integration) — Resync shows conflict banner when dirty; silent reload when clean; deleted-file banner when file removed

- [ ] **Task 9: E2E tests (Playwright)** (AC: 1, 3, 6, 8, 9, 10, 15)
  - [ ] 9.1 Click Resync → success toast with correct counts (P0)
  - [ ] 9.2 External file modification during edit → conflict banner appears after Resync (P1)
  - [ ] 9.3 "Keep my edits" preserves local changes; "View disk version" replaces editor content (P1)
  - [ ] 9.4 External file deletion → deleted-file banner appears (P1)
  - [ ] 9.5 Silent reload when file modified externally but no local edits (P1)
  - [ ] 9.6 Concurrent Resync → 409 error toast (P1, R-E4-003)

---

## Dev Notes

### Architecture Patterns & Constraints (from project-context.md)

- **No raw `fetch`** — all calls via `apiFetch<T>()` (`lib/api.ts`); `credentials:'include'` is automatic.
- **No `useState(false)` for server-loading** — use React Query `isLoading`/`isPending` from the mutation.
- **Component-level `queryClient.invalidateQueries()` is forbidden** except inside a mutation's `onSuccess` callback. SignalR-driven invalidation is handled by `HUB_INVALIDATION_MAP`.
- **Feature folders are self-contained** — no cross-feature imports.
- **`data-testid` is mandatory** on every interactive + structural element.
- **Dates:** API returns ISO-8601 UTC.

### Canonical `data-testid` values (DESIGN.md — use verbatim)

| Element | `data-testid` |
|---|---|
| Resync button | `mappings-btn-resync` |
| Conflict banner | `mappings-banner-conflict` |
| View disk version button | `mappings-btn-view-disk` |
| Keep my edits button | `mappings-btn-keep-edits` |
| Deleted file banner | `mappings-banner-deleted` |
| Close deleted button | `mappings-btn-close-deleted` |
| In-progress toast | `toast-resync-progress` (new) |
| Success toast | `toast-resync-success` (new) |
| Error toast | `toast-resync-error` (new) |

### Toast Behavior Clarification

The current `useToast` implementation auto-dismisses all toasts after 4s. This story enhances it:
- **Error toasts persist** until the user dismisses them — critical for surfacing file failures.
- **Success/info toasts auto-dismiss** after 4s (existing behavior).
- **In-progress toast** is dismissed programmatically when the operation completes.

### Conflict Detection Flow

1. User opens a file in the editor → `lastKnownModified` is stored from the `GET /api/mappings/{path}` response.
2. User makes edits → `isDirty = true`.
3. External process modifies the file on disk → `LastWriteTime` advances.
4. User clicks Resync → backend compares `LastWriteTime` vs `MappingService._lastKnownModified`.
5. Backend returns the file path in `conflicts[]` with reason "File modified externally since last load".
6. Frontend checks: is `activeFilePath` in `conflicts[]`?
   - If YES and `isDirty`: show `<ConflictBanner />`.
   - If YES and NOT `isDirty`: silent reload (re-fetch file content, update editor).
7. Backend updates `_lastKnownModified` for all reloaded files.

### Deleted-File Detection Flow

1. User opens a file in the editor.
2. External process deletes the file on disk.
3. User clicks Resync (or `ResyncCompleted` SignalR event fires).
4. Tree re-fetches (`queryClient.invalidateQueries([["mappings"]])`).
5. Frontend compares `activeFilePath` against the new tree.
6. If `activeFilePath` is NOT found in the new tree → show `<DeletedFileBanner />`.

### Duration Formatting Examples

| `elapsedMs` | Formatted output |
|---|---|
| 0 | "0ms" |
| 850 | "850ms" |
| 9999 | "9999ms" |
| 10000 | "10.0s" |
| 12500 | "12.5s" |
| 59999 | "60.0s" (rounds to 60.0s) |
| 60000 | "1m 0s" |
| 123456 | "2m 3s" |

### File Locations

**New (frontend):**
```
src/client/src/features/mappings/
├── components/
│   ├── ResyncButton.tsx              ← NEW
│   ├── ConflictBanner.tsx            ← NEW
│   └── DeletedFileBanner.tsx         ← NEW
├── hooks/
│   └── useResync.ts                  ← NEW
├── utils/
│   └── formatDuration.ts             ← NEW
└── types/mappings.ts                 ← UPDATE (add ResyncResultDto, ConflictDto, ResyncFailureDto)
```

**Updated (frontend):**
- `src/client/src/lib/useToast.ts` — add `persist` parameter
- `src/client/src/features/mappings/pages/MappingsPage.tsx` — add ResyncButton, conflict/deleted state, banners

**Not touched:**
- `src/Fishtank.Api/` — backend already complete from Story 4.1
- `src/client/src/lib/queryClient.ts` — `HUB_INVALIDATION_MAP` already has `ResyncCompleted`

### Files Being Modified — Current State to Preserve

- **`MappingsPage.tsx`** — add Resync button to toolbar; add conflict/deleted state + banner rendering; **preserve all existing editor, tree, navigation guard logic**.
- **`useToast.ts`** — add `persist?: boolean` parameter; **preserve existing showToast/dismissToast behavior for non-persistent toasts**.
- **`mappings.ts` (types)** — add new DTO types; **preserve existing types (TreeNode, FolderTree, FileContent, FileMetadata, MappingJson)**.

### Error Codes Consumed

| Code | HTTP | UI handling |
|---|---|---|
| `RESYNC_IN_PROGRESS` | 409 | Error toast: "A resync operation is already in progress. Please wait." |
| Network error | — | Error toast: "Resync failed — Network error." |
| Partial success | 200 | Success toast + individual error toasts for each failure |

### Spinner Animation — prefers-reduced-motion

```css
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.resync-spinner {
  animation: spin 1s linear infinite;
}

@media (prefers-reduced-motion: reduce) {
  .resync-spinner {
    animation: none;
  }
}
```

Or use Tailwind's `motion-reduce:animate-none` if available.

---

## References

- **Epic 4 in epics.md:** Story 4-3 acceptance criteria
- **Test Design:** [test-design-epic-4.md](../../test-artifacts/test-design/test-design-epic-4.md) — Story 4-3 section with 14 test scenarios
- **Previous Story:** [4-2-mappings-file-explorer-and-dual-mode-editor.md](4-2-mappings-file-explorer-and-dual-mode-editor.md) — editor state, isDirty tracking, lastKnownModified
- **PRD FR-20:** "A user can trigger Resync from the Mappings toolbar to reload all Mapping and Response files from disk for all Services and refresh the folder tree. Resync button disabled during operation with spinner and in-progress toast. Success/failure/partial-success toasts. Conflict detection for externally modified open files. Unsaved changes are never silently discarded."
- **Architecture:** [architecture.md](../../planning-artifacts/architecture.md) — SignalR hub patterns, `HUB_INVALIDATION_MAP`
- **Project Context:** [project-context.md](../../project-context.md) — API patterns, error codes, toast patterns

---

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
