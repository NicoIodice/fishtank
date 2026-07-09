---
story_id: "4.2"
story_key: "4-2-mappings-file-explorer-and-dual-mode-editor"
epic: 4
story_title: "Mappings File Explorer & Dual-Mode Editor"
status: done
priority: high
frs_covered:
  - FR-17 (folder tree UI — Mocks Root → service folders → mappings/ → responses/ → files)
  - FR-18 (file CRUD UI — create, edit, rename, duplicate, delete; unsaved tracking; confirmations)
  - FR-19 (dual-mode editor — Form view + Raw JSON CodeMirror tab)
  - FR-21 (navigation guard — useBlocker confirmation on unsaved edits, scoped to /mappings)
  - FR-22 (System Events + error toast on failed write — frontend surfacing)
  - FR-20 (Settings → Mocks Root read-only display with edit warning)
ux_drs_covered:
  - UX-DR11 (active file brand-color left border; folder tree spec)
  - UX-DR5 / UX-DR6 (Settings sub-nav — Mocks Root section populated by this story)
nfrs_addressed:
  - NFR-15 (destructive delete requires confirmation dialog — no optimistic delete)
  - NFR-19 (keyboard navigation: arrow keys navigate tree, Enter opens; icon-only buttons have aria-label)
  - NFR-8 (all API calls authenticated via httpOnly cookie — apiFetch credentials:'include')
---

# Story 4.2: Mappings File Explorer & Dual-Mode Editor

## Story

**As a** developer,
**I want** to browse, create, edit, rename, duplicate, and delete Mapping and Response files directly in the browser with a folder tree and a dual-mode (Form / Raw JSON) editor,
**So that** I can manage my mock configurations without leaving the Fishtank UI or touching the filesystem directly.

---

## Status

done

---

## Context

### Background

Epic 4 delivers the file management and mock-capture layer for Fishtank. **Story 4.1 (done) shipped the entire backend foundation** for file operations: the Mappings CRUD REST API, the `IFileWatcher` abstraction, and the Resync engine. **Story 4.2 is the first frontend story of Epic 4** — it builds the `/mappings` screen UI that consumes those endpoints: the folder-tree file explorer and the dual-mode file editor.

Scope boundaries within Epic 4:
- **This story (4.2):** Folder tree, file CRUD UI, dual-mode editor (Form + Raw JSON), unsaved-change tracking, navigation guard scoped to `/mappings`, and the Settings → Mocks Root **read-only** display.
- **Story 4.3 (next):** Resync button, toast feedback, and conflict/deleted-file banners. **Do NOT build the Resync button or conflict banners here** — 4.2 leaves a clearly marked seam.
- **Story 4.6:** Generalizes the navigation guard and adds sign-out protection. 4.2 implements the guard for the `/mappings` route only; 4.6 hardens it across all navigation trigger types (R-E4-002).
- **Story 4.4 / 4.5:** Save-as-Mock and Record mode write into the tree this story renders.

### What Exists (consumable now — shipped by Story 4.1)

**Backend REST API** (`src/Fishtank.Api/Endpoints/MappingsEndpoints.cs`), all under `.RequireAuthorization()`:

| Method & route | Request body | Success | Notes |
|---|---|---|---|
| `GET /api/mappings` | — | `200` `FolderTreeDto` | Returns the full tree (metadata only — **no file content**). See gap below. |
| `POST /api/mappings` | `{ path, content }` | `201` `FileMetadataDto` | `MAPPING_FILE_EXISTS` → `409`; invalid path → `400`. |
| `PUT /api/mappings/{**path}` | `{ content, lastKnownModified? }` | `200` `FileMetadataDto` | `MAPPING_FILE_NOT_FOUND` → `404`; invalid path → `400`. Catch-all route — nested paths supported. |
| `DELETE /api/mappings/{**path}` | — | `200` `{ success:true, data:null }` | `MAPPING_FILE_NOT_FOUND` → `404`. |
| `POST /api/resync` | — | `200` `ResyncResultDto` | **Not consumed in 4.2** — Story 4.3 owns the Resync UI. |

**Backend DTOs** (camelCase over the wire via System.Text.Json):
```csharp
// FolderTreeDto.cs
record FolderTreeDto(string MocksRoot, List<TreeNodeDto> Children);
record TreeNodeDto(string Name, string Type /* "folder"|"file" */, string Path /* relative to MocksRoot */,
                   DateTimeOffset? LastModified, long? SizeBytes, List<TreeNodeDto>? Children);
// FileMetadataDto.cs
record FileMetadataDto(string Name, string Path, DateTimeOffset LastModified, long SizeBytes);
```
Wire shape (note: `mocksRoot`, `children`, `name`, `type`, `path`, `lastModified`, `sizeBytes`):
```json
{ "success": true, "data": {
  "mocksRoot": "/mocks",
  "children": [
    { "name": "payments-api", "type": "folder", "path": "payments-api", "lastModified": null, "sizeBytes": null,
      "children": [
        { "name": "mappings", "type": "folder", "path": "payments-api/mappings", "children": [
          { "name": "get_account_happy-path.json", "type": "file", "path": "payments-api/mappings/get_account_happy-path.json",
            "lastModified": "2026-06-28T14:32:00.000Z", "sizeBytes": 1024, "children": null }
        ]}
      ]}
  ]}}
```

**Backend error codes** (from `4-1` — `MAPPING_*` prefix): `MAPPING_PATH_INVALID` (400), `MAPPING_FILE_NOT_FOUND` (404), `MAPPING_FILE_EXISTS` (409), `MAPPING_WRITE_FAILED` (500). On any write failure the backend already creates a System Event (FR-22) — the frontend's job is to surface the error toast.

**Frontend infrastructure (Epic 1–3, ready to use):**
- `src/client/src/lib/api.ts` — `apiFetch<T>(path, options)` (always `credentials:'include'`; throws typed `ApiError(code, message)`; `401` → redirects to `/login`). **Never use raw `fetch`.**
- `src/client/src/lib/queryClient.ts` — `queryClient` + `HUB_INVALIDATION_MAP` (already contains `ResyncCompleted: [["mappings"]]`).
- `src/client/src/lib/useToast.ts` — `{ toasts, showToast(message, variant), dismissToast(id) }`; variants `error | success | info`. (Note: current `showToast` auto-dismisses all variants after 4s; error toasts that must persist are tightened in Story 4.3 — for 4.2 use `showToast(msg, "error")` and accept the existing behavior, do not refactor the toast lib here.)
- `src/client/src/router.tsx` — `createBrowserRouter`; `/mappings` route already mounted to `MappingsPage`.
- `src/client/src/features/mappings/pages/MappingsPage.tsx` — current placeholder ("Configured in a later story") — **replace it**.
- `src/client/src/features/settings/pages/SettingsPage.tsx` — `mocks-root` section is currently the placeholder `<p>Configured in a later story.</p>` — **replace that branch** with the read-only Mocks Root display.
- shadcn/ui in `components/ui/` (never hand-edit), shared components in `components/shared/`.

### ⚠️ Backend gap to close in this story — single-file content read

**There is no endpoint that returns a single file's *content*.** `GET /api/mappings` returns the tree (metadata only); `MappingService` has no `ReadFileAsync`/`GetFile` path. Clicking a file in the tree must load its content into the editor, so this story must add a read endpoint.

**Decision (assumption — flagged for Nico):** Add `GET /api/mappings/{**path}` returning `{ content, name, path, lastModified, sizeBytes }`. This is the cleanest fit with the existing catch-all routing on the same group, keeps the editor's `lastKnownModified` (needed for `PUT`) coming from the same response, and avoids overloading the tree payload with file bodies. If Nico prefers content embedded in the tree instead, that is a larger backend change and is **not** assumed here.

### Libraries to install (Story 4.2 owns this — per test-design row "CodeMirror packages ⚠️ To be installed in Story 4-2")

```
@uiw/react-codemirror
@codemirror/lang-json
@codemirror/theme-one-dark
```
These are the exact packages mandated by `project-context.md` (Editor widget) and the epic AC. Install into `src/client`. Do not substitute Monaco or any other editor.

---

## Acceptance Criteria

### AC-1: Folder tree renders the full hierarchy (FR-17, UX-DR11)
**Given** the `/mappings` route is loaded,
**When** `GET /api/mappings` resolves,
**Then** the left pane (~240px) renders a collapsible folder tree: **Mocks Root → service folders → `mappings/` and `responses/` sub-folders → file nodes**; folders and files are visually distinguished; each file node carries `data-testid="mappings-tree-node-{service-slug}-{filename}"`.

### AC-2: Root label shows configured Mocks Root path, not hardcoded (FR-17)
**Given** the tree response,
**Then** the tree's root node label displays `data.mocksRoot` exactly as returned by the backend (e.g. `/mocks`) — never a hardcoded string. Service nodes show the service display name with the real filesystem path in a `title`/tooltip.

### AC-3: Active file highlighted with brand-color left border (UX-DR11)
**Given** a file is open in the editor,
**Then** its tree node is highlighted with a brand-color left border (`--brand` token); only one file is active at a time.

### AC-4: Expand/collapse state preserved for the session (FR-17)
**Given** the user expands/collapses folders,
**Then** that expand/collapse state persists for the browser session (it survives re-fetch/invalidation of the tree and navigating away and back within the session). Session-scoped client state is acceptable (e.g. in-memory store or `sessionStorage`) — not persisted to the backend.

### AC-5: Clicking a file loads its content into the editor (FR-17, FR-19)
**Given** the user clicks a file node,
**When** the file content is fetched (`GET /api/mappings/{**path}`),
**Then** the editor pane loads with a breadcrumb of the file path (`data-testid="mappings-breadcrumb-editor"`) and the file content; the `lastModified` from the response is retained as `lastKnownModified` for the eventual `PUT`.

### AC-6: Dual-mode editor — Form tab and Raw JSON tab (FR-19)
**Given** a file is open,
**Then** a tab bar offers **Form** (`data-testid="mappings-tab-form"`) and **Raw JSON** (`data-testid="mappings-tab-raw"`); the Form tab presents guided fields for common Mapping properties (method, URL pattern, status, response body / `BodyAsFile`, content-type, delay, priority, header filter, body matcher, use-transformer toggle); the Raw JSON tab renders a **CodeMirror** editor configured with `@codemirror/lang-json` and `@codemirror/theme-one-dark`.

### AC-7: Switching tabs preserves unsaved changes (FR-19)
**Given** unsaved edits made in either tab,
**When** the user switches Form ⇄ Raw JSON,
**Then** the edits are preserved across the switch (Form edits reflected in Raw JSON and vice-versa; the in-memory edit buffer is the single source of truth). Advanced WireMock fields not surfaced in the Form view remain editable via the Raw JSON tab and are never lost on a Form↔Raw round-trip.

### AC-8: Unsaved-change indicator — dot + italic filename (FR-18)
**Given** the open file has unsaved changes,
**Then** a `●` dot is appended to the filename in the tree node and the filename is rendered in italic; the indicator clears after a successful Save or a Discard.

### AC-9: Save / Discard enablement rules (FR-18, DESIGN.md)
**Given** the editor state,
**Then** **Save** (`data-testid="mappings-btn-save"`) is enabled when the file is newly created (not yet on disk) **OR** has unsaved changes, and disabled otherwise; **Discard** (`data-testid="mappings-btn-discard"`) is enabled only when the file is an existing on-disk file with unsaved changes, and disabled for new (unsaved) files and clean files.

### AC-10: Save waits for server confirmation; success updates state (FR-18)
**Given** Save is clicked on an existing file,
**When** `PUT /api/mappings/{path}` (body `{ content, lastKnownModified }`) returns `200`,
**Then** the UI updates **only after** server confirmation (no optimistic mutation): the unsaved indicator clears, `lastKnownModified` is updated from the response, and a success toast is shown. For a new file, Save issues `POST /api/mappings` `{ path, content }` and on `201` the tree refreshes and the file becomes the active on-disk file.

### AC-11: Discard reverts unsaved edits (FR-18)
**Given** an existing file with unsaved changes,
**When** Discard is clicked,
**Then** the editor reverts to the last-saved content and the unsaved indicator clears; no network call is made.

### AC-12: New Mapping / New Response — separate buttons, correct sub-folder (FR-18)
**Given** the toolbar,
**Then** there are **two separate** buttons: **+ New Mapping** (`data-testid="mappings-btn-new-mapping"`) creates a file under the selected service's `mappings/` folder, and **+ New Response** (`data-testid="mappings-btn-new-response"`) creates under `responses/`; each opens the file-naming modal (`data-testid="mappings-modal-file-name"`, filename input `mappings-input-filename`).

### AC-13: Create with no service selected → service-selection dropdown first (FR-18)
**Given** the user triggers New Mapping/New Response while **no service folder is selected**,
**Then** a service-selection dropdown is presented **before** the naming modal; once a service is chosen the naming modal proceeds and the file is created in that service's correct sub-folder.

### AC-14: Delete requires confirmation — no optimistic delete (FR-18, NFR-15)
**Given** the Delete action (`data-testid="mappings-btn-delete"`),
**When** clicked,
**Then** a confirmation dialog appears with the exact copy **"Delete this mapping? This removes the file from disk."**; the file is removed from disk and tree **only after** `DELETE /api/mappings/{path}` returns `200` (no optimistic removal); cancelling closes the dialog with no change.

### AC-15: Rename and Duplicate (FR-18)
**Given** the Rename (`data-testid="mappings-btn-rename"`) and Duplicate (`data-testid="mappings-btn-duplicate"`) actions in the editor actions bar,
**Then** **Rename** opens the naming modal pre-filled with the current name and, on confirm, renames the file on disk; **Duplicate** creates a copy with a suffix in the same folder. Because the 4.1 backend exposes no rename/duplicate endpoint, both are composed from the existing primitives — see Dev Notes "Rename/Duplicate composition" — and both wait for server confirmation before the tree updates.

### AC-16: Failed write surfaces an error toast (FR-18, FR-22)
**Given** any file write (`POST`/`PUT`/`DELETE`/rename/duplicate) fails,
**When** the backend returns an error (e.g. `MAPPING_WRITE_FAILED`, `MAPPING_FILE_EXISTS`),
**Then** an error toast is shown with an actionable message (e.g. `Failed to save {filename} — {reason}.`); the editor/tree state is **not** mutated (the backend has already created the System Event — the frontend does not create it); no silent failure.

### AC-17: Copy JSON (DESIGN.md)
**Given** the Raw JSON tab,
**Then** a **Copy JSON** button (`data-testid="mappings-btn-copy-json"`) copies the current raw editor content to the clipboard.

### AC-18: Navigation guard on unsaved edits, scoped to /mappings (FR-21, R-E4-002)
**Given** unsaved Mapping edits exist,
**When** the user navigates away from `/mappings` (router navigation),
**Then** React Router's `useBlocker` shows a confirmation dialog (`data-testid="mappings-modal-discard-confirm"`) with **Discard and navigate** (`mappings-btn-discard-confirm`) and **Stay/Cancel** (`mappings-btn-discard-cancel`); confirming discards and navigates, cancelling keeps the user on the page with edits intact. When there are no unsaved edits, navigation proceeds without a prompt. (Full cross-trigger coverage — logo click, browser back, sign-out — is hardened in Story 4.6.)

### AC-19: Empty / loading states (DESIGN.md)
**Given** the tree is loading,
**Then** a skeleton/loading container with `aria-busy="true"` + `aria-label="Loading mappings"` is shown.
**Given** no service is selected,
**Then** the editor pane shows the empty state: `bi-file-earmark-code` + "Select a service" + "Choose a service from the left panel to browse its mapping files."
**Given** a service is selected with no files,
**Then** the empty state shows the service name + `bi-file-earmark-plus` + "No mappings yet" + the **+ New Mapping** and **+ New Response** buttons.

### AC-20: Keyboard navigation (NFR-19)
**Given** focus is in the folder tree,
**Then** arrow keys move node focus and **Enter** opens the focused file; all icon-only buttons (Save, Discard, Duplicate, Rename, Delete, Copy JSON, New Mapping, New Response) carry meaningful `aria-label`s; all interactive elements are reachable by keyboard.

### AC-21: Settings → Mocks Root read-only display (FR-20, UX-DR6)
**Given** Settings → Mocks Root section,
**Then** the currently configured Mocks Root path is displayed (read from the tree's `mocksRoot` or a settings source) with an Edit affordance that shows an inline warning that changing it requires restarting services and running Resync. **For v1 the path is display-only** — the actual edit-with-validation path is out of scope (deferred to an Epic 5 enhancement per test-design "Not in Scope"). Wire `data-testid` values verbatim from DESIGN.md: `settings-input-mocks-root`, `settings-btn-mocks-root-save`, `settings-btn-mocks-root-discard`, `settings-modal-mocks-root-confirm`, `settings-btn-mocks-root-confirm`.

---

## Tasks / Subtasks

- [ ] **Task 1: Install editor dependencies & scaffold the mappings feature folder** (AC: 6, 17)
  - [ ] 1.1 `npm i @uiw/react-codemirror @codemirror/lang-json @codemirror/theme-one-dark` in `src/client`
  - [ ] 1.2 Create feature structure under `src/client/src/features/mappings/`: `pages/`, `components/`, `hooks/`, `types/` — self-contained, no cross-feature imports
  - [ ] 1.3 Define TS types in `features/mappings/types/` mirroring backend DTOs: `TreeNode` (`{ name; type:"folder"|"file"; path; lastModified:string|null; sizeBytes:number|null; children:TreeNode[]|null }`), `FolderTree` (`{ mocksRoot; children }`), `FileContent` (`{ content; name; path; lastModified; sizeBytes }`), `FileMetadata`

- [ ] **Task 2: Backend — add single-file content read endpoint** (AC: 5) — closes the gap noted in Context
  - [ ] 2.1 Add `GET /api/mappings/{**path}` to `MappingsEndpoints.cs` under the same authorized group (ordered before/alongside the existing catch-all routes; verify it does not collide with `GET ""` tree route — the tree route is `""`, file route is `{**path}`, so they are distinct)
  - [ ] 2.2 Add `ReadFileAsync(path, ct)` to `IMappingService` / `MappingService.cs` returning content + metadata; reuse the existing `PathSanitizer`/`SanitizePath` logic — reject traversal; `MAPPING_FILE_NOT_FOUND` (404) when absent
  - [ ] 2.3 Add `FileContentDto(string Content, string Name, string Path, DateTimeOffset LastModified, long SizeBytes)` to `Models/`
  - [ ] 2.4 Integration test: `GET /api/mappings/{path}` returns content for an existing file; `404` for missing; `400` for traversal; `401` unauthenticated

- [ ] **Task 3: Folder-tree explorer component** (AC: 1, 2, 3, 4, 19, 20)
  - [ ] 3.1 `features/mappings/hooks/useMappingsTree.ts` — React Query `useQuery(["mappings"], () => apiFetch<FolderTree>("/api/mappings"))`; loading/error states from RQ (`isLoading`/`isFetching`) — never `useState(false)`
  - [ ] 3.2 `features/mappings/components/FolderTree.tsx` — recursive render; folder expand/collapse; file `data-testid="mappings-tree-node-{service-slug}-{filename}"`
  - [ ] 3.3 Root node label bound to `tree.mocksRoot` (AC-2); service node `title`=real path
  - [ ] 3.4 Active-file brand left-border styling (AC-3)
  - [ ] 3.5 Session-scoped expand/collapse + selected-service state (in-memory store / `sessionStorage`) surviving tree re-fetch (AC-4)
  - [ ] 3.6 Keyboard handlers: arrow keys move focus, Enter opens (AC-20); skeleton loader `aria-busy`/`aria-label="Loading mappings"` (AC-19)

- [ ] **Task 4: File editor shell + dual-mode tabs** (AC: 5, 6, 7, 17)
  - [ ] 4.1 `features/mappings/hooks/useFileContent.ts` — fetch content via `GET /api/mappings/{path}`; store `lastKnownModified`
  - [ ] 4.2 `features/mappings/components/MappingEditor.tsx` — breadcrumb (`mappings-breadcrumb-editor`), tab bar, actions bar
  - [ ] 4.3 `RawJsonTab.tsx` — `@uiw/react-codemirror` with `json()` extension + `oneDark` theme; Copy JSON button (`mappings-btn-copy-json`, AC-17)
  - [ ] 4.4 `FormTab.tsx` — guided fields (method, URL pattern, status, response body/`BodyAsFile`, content-type, delay, priority, header filter, body matcher, use-transformer toggle)
  - [ ] 4.5 Single in-memory edit buffer shared by both tabs; Form↔Raw round-trip preserves unknown/advanced fields (AC-7) — parse/serialize JSON without dropping unmodeled keys

- [ ] **Task 5: Unsaved-change tracking, Save & Discard** (AC: 8, 9, 10, 11, 16)
  - [ ] 5.1 Track dirty state by comparing edit buffer vs last-saved content
  - [ ] 5.2 Tree node: `●` dot + italic when dirty (AC-8)
  - [ ] 5.3 Save/Discard enablement per AC-9 rules
  - [ ] 5.4 Save mutation: existing → `PUT /api/mappings/{path}` `{content,lastKnownModified}`; new → `POST /api/mappings` `{path,content}`; wait for server confirmation, then update state + success toast (AC-10). Use React Query `useMutation` — **no optimistic update**
  - [ ] 5.5 Discard reverts buffer to last-saved, no network (AC-11)
  - [ ] 5.6 On mutation error → error toast `Failed to save {filename} — {reason}.`; do not mutate state (AC-16)

- [ ] **Task 6: Create / Delete / Rename / Duplicate** (AC: 12, 13, 14, 15, 16)
  - [ ] 6.1 + New Mapping / + New Response separate buttons → correct sub-folder; naming modal (AC-12)
  - [ ] 6.2 No-service-selected → service-selection dropdown before naming modal (AC-13)
  - [ ] 6.3 Delete confirmation dialog with exact copy; `DELETE` then remove from tree on success — no optimistic delete (AC-14)
  - [ ] 6.4 Rename: naming modal pre-filled; compose via `GET` content → `POST` new path → `DELETE` old path (see Dev Notes); wait for confirmation (AC-15)
  - [ ] 6.5 Duplicate: `GET` content → `POST` new path with suffix (e.g. `{name}_copy.json`) in same folder (AC-15)
  - [ ] 6.6 All operations invalidate `["mappings"]` via React Query `queryClient.invalidateQueries` in the mutation `onSuccess` (this is a mutation callback, NOT a component-level invalidation — allowed; `HUB_INVALIDATION_MAP` covers SignalR-driven invalidation only)
  - [ ] 6.7 Error path for each → error toast, no state mutation (AC-16). File-error copy from DESIGN.md (`Failed to delete/rename {filename} — {reason}.`)

- [ ] **Task 7: Navigation guard (scoped to /mappings)** (AC: 18)
  - [ ] 7.1 `useBlocker((tx) => hasUnsavedEdits && tx.currentLocation.pathname !== tx.nextLocation.pathname)` in the Mappings page
  - [ ] 7.2 Confirmation dialog `mappings-modal-discard-confirm` with confirm/cancel buttons (`mappings-btn-discard-confirm` / `mappings-btn-discard-cancel`)
  - [ ] 7.3 Confirm → `blocker.proceed()`; cancel → `blocker.reset()`; no unsaved edits → never blocks
  - [ ] 7.4 Leave a clearly commented seam noting Story 4.6 generalizes this guard + adds sign-out protection

- [ ] **Task 8: Replace MappingsPage placeholder & wire it together** (AC: all UI)
  - [ ] 8.1 Replace `features/mappings/pages/MappingsPage.tsx` body: two-pane layout (FolderTree | MappingEditor), toolbar, toasts, navigation guard; keep `data-testid="page-mappings"`
  - [ ] 8.2 Empty states (AC-19): no-service, service-with-no-files
  - [ ] 8.3 Confirm `/mappings` route in `router.tsx` already mounts the page (it does) — no router change needed

- [ ] **Task 9: Settings → Mocks Root read-only display** (AC: 21)
  - [ ] 9.1 `features/settings/components/MocksRootSettings.tsx` — read-only path display + Edit affordance + inline warning ("changing requires restarting services and running Resync")
  - [ ] 9.2 Replace the `mocks-root` placeholder branch in `SettingsPage.tsx` with the new component
  - [ ] 9.3 Wire DESIGN.md `data-testid`s verbatim (display-only for v1; edit-with-validation deferred)

- [ ] **Task 10: Update msw handlers & frontend tests** (AC: all)
  - [ ] 10.1 Add/extend msw handlers for `GET /api/mappings`, `GET /api/mappings/{path}`, `POST`, `PUT`, `DELETE` (same PR as the new `GET` content endpoint — DoD gate 6)
  - [ ] 10.2 Component tests (Vitest + Testing Library): tree renders full hierarchy (P0); root label from `mocksRoot` not hardcoded (P1); active-file brand border (P1); expand/collapse session persistence (P2); file click loads editor (P0); Form view fields (P1); Raw JSON CodeMirror with lang-json + one-dark (P0); tab switch preserves unsaved changes (P0); dot + italic unsaved indicator (P1); Save/Discard enablement (P1); delete confirmation dialog (P0); no-service create → dropdown (P1)
  - [ ] 10.3 Component test for the navigation-guard dialog appearing on blocked nav with unsaved state (supports R-E4-002; full E2E matrix is Story 4.6)

- [ ] **Task 11: E2E (Playwright) — live stack, no backend mocking** (AC: 1, 5, 10, 14, 15, 16, 20)
  - [ ] 11.1 Navigate to Mappings → tree renders configured services (P0)
  - [ ] 11.2 Create new mapping file → appears in tree + on disk (P1)
  - [ ] 11.3 Edit file → Save → updated on disk (P1)
  - [ ] 11.4 Delete file → confirmation → removed from tree + disk (P1)
  - [ ] 11.5 Rename file → tree updates + disk renamed (P2)
  - [ ] 11.6 Duplicate file → new file with suffix (P2)
  - [ ] 11.7 Write failure → error toast with actionable message (P1, R-E4-004 — use permitted fault-injection `page.route()` only)
  - [ ] 11.8 Keyboard navigation: arrow keys navigate tree, Enter opens (P1)

---

## Dev Notes

### Architecture Patterns & Constraints (from project-context.md)

- **No raw `fetch`** — all calls via `apiFetch<T>()` (`lib/api.ts`); `credentials:'include'` is automatic; `401` redirect is handled there.
- **No `useState(false)` for server-loading** — use React Query `isLoading`/`isFetching`.
- **No optimistic updates** here — only the Service enable/disable toggle is optimistic in the whole app. Every mappings mutation waits for server confirmation (matches AC-10, AC-14).
- **Component-level `queryClient.invalidateQueries()` is forbidden** — **except** inside a React Query mutation's `onSuccess` callback, which is the correct place to invalidate after a write. The `HUB_INVALIDATION_MAP` rule governs **SignalR-driven** invalidation only (Resync → Story 4.3). Do not add a component-level effect that invalidates the cache.
- **Feature folders are self-contained** — no cross-feature imports. Shared bits go in `components/shared/` or `lib/`.
- **`components/ui/` (shadcn) is never hand-edited.**
- **`data-testid` is mandatory** on every interactive + structural element; use the canonical values from DESIGN.md verbatim (table reproduced below). If an element here lacks a spec'd id, add one following `{element-type}-{entity-slug}` and note it in the PR — never skip.
- **Dates:** API returns ISO-8601 UTC; display via `Intl.DateTimeFormat`.
- **TypeScript strict mode is on** — no `any` leaks; model DTOs precisely.

### Canonical `data-testid` values (DESIGN.md — use verbatim)

| Element | `data-testid` |
|---|---|
| Mappings page root | `page-mappings` (already present) |
| New Mapping button | `mappings-btn-new-mapping` |
| New Response button | `mappings-btn-new-response` |
| Folder tree node (per file) | `mappings-tree-node-{service-slug}-{filename}` |
| Save button | `mappings-btn-save` |
| Discard button | `mappings-btn-discard` |
| Duplicate button | `mappings-btn-duplicate` |
| Rename button | `mappings-btn-rename` |
| Delete button | `mappings-btn-delete` |
| Form tab | `mappings-tab-form` |
| Raw JSON tab | `mappings-tab-raw` |
| Copy JSON button | `mappings-btn-copy-json` |
| File naming modal (new/rename) | `mappings-modal-file-name` |
| Filename input | `mappings-input-filename` |
| Editor breadcrumb | `mappings-breadcrumb-editor` |
| Discard-guard dialog | `mappings-modal-discard-confirm` |
| Discard-guard confirm | `mappings-btn-discard-confirm` |
| Discard-guard cancel | `mappings-btn-discard-cancel` |
| Settings Mocks Root input | `settings-input-mocks-root` |
| Settings Mocks Root save | `settings-btn-mocks-root-save` |
| Settings Mocks Root discard | `settings-btn-mocks-root-discard` |
| Settings Mocks Root change confirm dialog | `settings-modal-mocks-root-confirm` |
| Settings Mocks Root confirm | `settings-btn-mocks-root-confirm` |

> The `mappings-btn-resync` testid exists in DESIGN.md but the **Resync button belongs to Story 4.3** — do not render it here.

### Rename / Duplicate composition (no dedicated backend endpoint)

The 4.1 backend exposes only `GET` (tree) / `POST` / `PUT` / `DELETE`. Therefore:
- **Duplicate** = `GET /api/mappings/{srcPath}` (content) → `POST /api/mappings` `{ path: dstPathWithSuffix, content }`. Suffix convention: `{basename}_copy.json` (collision → `_copy_2.json`, etc. — POST returns `MAPPING_FILE_EXISTS` 409 you can detect and retry/increment).
- **Rename** = `GET` content → `POST` to new path → `DELETE` old path. Sequence so that a failure mid-way never destroys data: only `DELETE` the old file **after** the `POST` succeeds. If `DELETE` fails after a successful `POST`, surface an error toast and leave both files (safe). All steps wait for confirmation; the tree invalidates once at the end.
- Filename conventions (DESIGN.md): mapping `{method}_{path-slugified}_{variant}.json`, response `{method}_{path-slugified}_{variant}_body.json`, underscores as delimiters. The Form view's `BodyAsFile` references responses as `../responses/{...}_body.json`.

### Dual-mode editor — preserving advanced fields (AC-7)

The Form view models only **common** Mapping fields. To avoid dropping advanced WireMock fields on a Form→Raw round-trip, the single source of truth is the **parsed JSON object** in the edit buffer. Form fields read/write known keys on that object; unknown keys are retained untouched. Serialize to text only for the CodeMirror view and for `PUT`/`POST` bodies. Never reconstruct the JSON purely from Form fields.

### Navigation guard (FR-21) — React Router v6 `useBlocker`

`react-router-dom` v6+ with `createBrowserRouter` is already in the stack, so `useBlocker` is available. Scope the blocker to fire only when `hasUnsavedEdits` is true and the path is actually changing. 4.2 covers **router navigation away from `/mappings`**; Story 4.6 (R-E4-002 mitigation) extends coverage to logo click, browser back button, direct URL entry, and sign-out, with the full E2E matrix. Leave a `// Story 4.6: generalize guard + sign-out protection` comment at the seam.

### File Locations

**New (frontend):**
```
src/client/src/features/mappings/
├── pages/MappingsPage.tsx              ← REPLACE placeholder
├── components/
│   ├── FolderTree.tsx                  ← NEW
│   ├── MappingEditor.tsx               ← NEW
│   ├── FormTab.tsx                     ← NEW
│   ├── RawJsonTab.tsx                  ← NEW (CodeMirror)
│   ├── FileNameModal.tsx               ← NEW (new/rename)
│   ├── ServiceSelectModal.tsx          ← NEW (no-service-selected flow)
│   └── DeleteConfirmDialog.tsx         ← NEW (or reuse shared confirm)
├── hooks/
│   ├── useMappingsTree.ts              ← NEW (useQuery ["mappings"])
│   ├── useFileContent.ts               ← NEW (GET {path})
│   └── useMappingMutations.ts          ← NEW (POST/PUT/DELETE/rename/duplicate)
└── types/mappings.ts                   ← NEW (DTO mirrors)

src/client/src/features/settings/components/MocksRootSettings.tsx  ← NEW
```

**Updated (frontend):**
- `src/client/src/features/settings/pages/SettingsPage.tsx` — replace `mocks-root` placeholder branch
- msw handlers (test support) — add mappings endpoints

**New / updated (backend — single-file read endpoint, Task 2):**
- `src/Fishtank.Api/Endpoints/MappingsEndpoints.cs` — add `GET /api/mappings/{**path}` (UPDATE)
- `src/Fishtank.Api/Services/MappingService.cs` + `IMappingService` — add `ReadFileAsync` (UPDATE)
- `src/Fishtank.Api/Models/FileContentDto.cs` — NEW

**Not touched:** `router.tsx` (route already present), `queryClient.ts` (`ResyncCompleted` already mapped), `lib/api.ts`, anything Resync-related.

### Files being modified — current state to preserve

- **`MappingsPage.tsx`** — currently a placeholder returning `page-mappings`. Replacing wholesale; keep the `data-testid="page-mappings"` on the root `<main>`.
- **`SettingsPage.tsx`** — a 4-section sub-nav (Appearance/Activity/Cache/Mocks Root); only the `mocks-root` branch is a placeholder. **Preserve the sub-nav structure and the other three sections** — change only the `else`/`mocks-root` branch.
- **`MappingsEndpoints.cs`** — adding a `GET {**path}` must not shadow the existing `GET ""` tree route. They differ (`""` vs `{**path}`); verify with the new integration test that `GET /api/mappings` still returns the tree.

### Error Codes consumed (from Story 4.1)

| Code | HTTP | UI handling |
|---|---|---|
| `MAPPING_PATH_INVALID` | 400 | error toast |
| `MAPPING_FILE_NOT_FOUND` | 404 | error toast (e.g. file deleted externally — banner UX is Story 4.3) |
| `MAPPING_FILE_EXISTS` | 409 | error toast; on Duplicate, increment suffix and retry |
| `MAPPING_WRITE_FAILED` | 500 | error toast `Failed to save {filename} — {reason}.` |

### Test Design Reference

See `_bmad-output/test-artifacts/test-design/test-design-epic-4.md` → **Story 4-2** (20 scenarios; 4×P0 component, 1×P0 E2E):
- P0: tree hierarchy render; file-click loads editor; Raw JSON CodeMirror (lang-json + one-dark); tab-switch preserves unsaved changes; delete confirmation dialog; E2E navigate→tree renders.
- Risk **R-E4-002** (navigation guard bypass) — mitigation is primarily Story 4.6's E2E matrix; 4.2 ships the `/mappings`-scoped guard + a component test.
- Risk **R-E4-004** (write failure) — error-toast E2E with permitted fault-injection `page.route()`.
- Accessibility: keyboard tree nav (NFR-19) E2E.

### E2E Backend Mocking Policy (project-context.md)

E2E runs against the **live stack** — no `page.route()` for CRUD. The only permitted interceptor here is **fault injection** for the write-failure scenario (11.7). Use `storageState` for the authenticated session (do not mock auth).

### Dependencies

| Dependency | Source | Status |
|---|---|---|
| Mappings CRUD REST API (`GET tree`/`POST`/`PUT`/`DELETE`) | Story 4.1 | ✅ Complete |
| Single-file content read endpoint | — | ⚠️ Added in this story (Task 2) |
| `apiFetch<T>`, `queryClient`, `useToast`, router | Epic 1 | ✅ Complete |
| CodeMirror packages | npm | ⚠️ Installed in this story (Task 1) |
| Resync UI, conflict/deleted-file banners | Story 4.3 | ⛔ Out of scope here |
| Generalized navigation guard + sign-out protection | Story 4.6 | ⛔ Out of scope here |

### Anti-Patterns to Avoid

| ❌ | ✅ |
|---|---|
| Raw `fetch()` in components/hooks | `apiFetch<T>()` from `lib/api.ts` |
| `useState(false)` for tree loading | React Query `isLoading`/`isFetching` |
| Optimistic create/save/delete | Wait for server confirmation (AC-10, AC-14) |
| `queryClient.invalidateQueries()` in a component effect | Only inside a mutation `onSuccess` |
| Rebuilding JSON from Form fields (drops advanced fields) | Parsed-object edit buffer; Form writes known keys only |
| Cross-feature imports | `components/shared/` or `lib/` |
| Hand-editing `components/ui/` (shadcn) | Regenerate via shadcn CLI |
| Hardcoding the Mocks Root label | Bind to `tree.mocksRoot` (AC-2) |
| Rendering the Resync button | That is Story 4.3 |
| Inventing new `data-testid`s when DESIGN.md defines them | Use the canonical values verbatim |
| `page.route()` mocking CRUD in E2E | Live stack; fault-injection only |

### DoD Gates for This Story (project-context.md "Definition of Done")

| # | Gate | Verified by |
|---|---|---|
| 1 | All ATDD/E2E acceptance tests pass | `playwright test` |
| 2 | All backend integration tests pass (incl. new `GET {path}`) | `dotnet test src/Fishtank.Api.IntegrationTests` |
| 3 | TypeScript builds clean — 0 errors | `npm run build` in `src/client` |
| 4 | .NET builds clean — 0 errors, 0 warnings | `dotnet build src/Fishtank.slnx` |
| 5 | Every new interactive/structural UI element has a `data-testid` | Code review |
| 6 | msw handlers updated in same PR as the new content endpoint | Code review |
| 7 | No new critical anti-patterns | Code review |
| 8 | Story status set to `done` in `sprint-status.yaml` | Agent |

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.2: Mappings File Explorer & Dual-Mode Editor] (lines 944–973)
- [Source: _bmad-output/planning-artifacts/epics.md#FR-17, FR-18, FR-19, FR-21] (lines 37–41)
- [Source: _bmad-output/test-artifacts/test-design/test-design-epic-4.md#Story 4-2] (lines 187–214); risks R-E4-002 (line 88), R-E4-004; CodeMirror install (line 506)
- [Source: _bmad-output/project-context.md#Frontend Rules / API Patterns / Anti-Patterns / Testing Rules / Definition of Done]
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-Fishtank-2026-06-04/DESIGN.md#Mappings file explorer] (lines 470–487); empty states (lines 599–600); toast copy (lines 514–518); data-testid convention (lines 653–768)
- [Source: src/Fishtank.Api/Endpoints/MappingsEndpoints.cs] — backend routes shipped by 4.1
- [Source: src/Fishtank.Api/Models/FolderTreeDto.cs, FileMetadataDto.cs, CreateMappingRequest.cs, UpdateMappingRequest.cs] — DTO contracts
- [Source: _bmad-output/implementation-artifacts/stories/4-1-mappings-file-backend-crud-ifilewatcher-and-resync-engine.md] — sibling backend story

---

## Dev Agent Record

### Agent Model Used

_TBD by dev agent_

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed — comprehensive developer guide created.

### File List

---

## Open Questions / Assumptions (for Nico)

1. **Single-file content read endpoint (Task 2).** The 4.1 backend has no way to read a single file's *content* (the tree is metadata-only). I assumed adding `GET /api/mappings/{**path}` returning content + metadata, as it is the cleanest fit with the existing catch-all routing and supplies the `lastKnownModified` the editor needs for `PUT`. If you prefer embedding content in the tree response, that is a different (heavier) backend change — flag it and I'll revise.
2. **Mocks Root edit is display-only in v1.** Per the test-design "Not in Scope" table, the Settings → Mocks Root **edit-with-validation** path is deferred to an Epic 5 enhancement; 4.2 ships read-only display + the warning copy and the spec'd `data-testid`s. Confirm this is the intended cut.
3. **Navigation guard scope.** 4.2 implements the `useBlocker` guard for the `/mappings` route only; the full cross-trigger hardening (logo click, browser back, sign-out) and its E2E matrix live in Story 4.6 (R-E4-002). Confirm 4.2 should not pre-empt 4.6.
4. **Error-toast persistence.** The current `useToast` auto-dismisses all variants after 4s. 4.2 uses it as-is; persistent error toasts are tightened in Story 4.3. Confirm acceptable for 4.2.
