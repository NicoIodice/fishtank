# ATDD Checklist — Story 4.2: Mappings File Explorer & Dual-Mode Editor

**Story key:** `4-2-mappings-file-explorer-and-dual-mode-editor`
**Epic:** 4
**Date generated:** 2026-06-28
**Phase:** RED (scaffolds written; implementation pending)

---

## Phase Gate Status

| Gate | Status | Notes |
|---|---|---|
| Test files created | PASS | 6 scaffold files written (4 component, 1 E2E, 1 backend integration) |
| ACs referenced | PASS | All 21 ACs addressed (see coverage table below) |
| Compile / parse clean (TypeScript) | PASS | `npx tsc --noEmit` — 0 errors |
| msw handlers added | PASS | `src/client/src/test/mocks/handlers.ts` updated with mappings endpoints |
| Component tests RED | PASS | 37 new tests across 4 files, all 37 FAIL (placeholder MappingsPage / missing components) |
| E2E specs RED-by-construction | PASS | Spec parses/typechecks cleanly; RED because MappingsPage is a placeholder and the folder tree / editor do not exist |
| Backend integration tests RED | PASS | `Story4_2_MappingsContentEndpointTests.cs` — 7 tests, all RED because `GET /api/mappings/{**path}` endpoint does not exist yet |

---

## Scaffold File Inventory

### Component / Unit Tests (Vitest + React Testing Library + msw)

| File | ACs Covered | Test Count | RED Confirmed |
|---|---|---|---|
| `src/client/tests/unit/features/mappings/story-4-2-mappings-folder-tree.test.tsx` | AC-1, AC-2, AC-3, AC-4, AC-19, AC-20 | 8 | YES — all 8 FAIL (placeholder renders no tree) |
| `src/client/tests/unit/features/mappings/story-4-2-mappings-editor.test.tsx` | AC-5, AC-6, AC-7, AC-8, AC-9, AC-17 | 10 | YES — all 10 FAIL (placeholder; no editor/tabs/CodeMirror) |
| `src/client/tests/unit/features/mappings/story-4-2-mappings-crud.test.tsx` | AC-10, AC-11, AC-12, AC-13, AC-14, AC-15, AC-16, AC-18 | 14 | YES — all 14 FAIL (placeholder; no CRUD dialogs/buttons/navigation guard) |
| `src/client/tests/unit/features/mappings/story-4-2-settings-mocks-root.test.tsx` | AC-21 | 5 | YES — all 5 FAIL (SettingsPage Mocks Root section still placeholder) |

**Total component tests: 37 — 37 FAIL (RED confirmed)**

### E2E Tests (Playwright — live stack)

| File | ACs Covered | Scenarios | RED Status |
|---|---|---|---|
| `src/client/tests/e2e/story-4-2-mappings-explorer-editor.spec.ts` | AC-1 (P0), AC-5 (P1), AC-10 (P1), AC-14 (P1), AC-15 (P2×2), AC-16 (P1), AC-20 (P1) | 8 | RED-by-construction — page is a placeholder; TypeScript compiles clean (`tsc --noEmit` exit 0) |

### Backend Integration Tests (xUnit — `src/Fishtank.Api.IntegrationTests/`)

| File | ACs Covered | Test Count | RED Status |
|---|---|---|---|
| `src/Fishtank.Api.IntegrationTests/Api/Story4_2_MappingsContentEndpointTests.cs` | AC-5 (backend: GET /api/mappings/{**path} content endpoint) | 7 | RED — endpoint `GET /api/mappings/{**path}` does not exist; `ReadFileAsync` and `FileContentDto` not implemented |

---

## Generated Tests with AC Mapping

### story-4-2-mappings-folder-tree.test.tsx

| Test Name | ACs |
|---|---|
| AC-19: shows skeleton loader with aria-busy='true' and aria-label='Loading mappings' while tree loads | AC-19 |
| AC-1: renders folder tree with Mocks Root → service → mappings/ → responses/ → file nodes | AC-1 |
| AC-2: root node label displays data.mocksRoot verbatim (not a hardcoded string) | AC-2 |
| AC-2: root label updates when backend returns a different mocksRoot path | AC-2 |
| AC-3: clicking a file node gives it the brand-color left-border active style, only one at a time | AC-3 |
| AC-4: expand/collapse state survives a tree re-fetch (session-scoped) | AC-4 |
| AC-19: shows 'Select a service' empty state in editor pane when no service is selected | AC-19 |
| AC-20: New Mapping and New Response buttons carry meaningful aria-labels | AC-20 |

### story-4-2-mappings-editor.test.tsx

| Test Name | ACs |
|---|---|
| AC-5: clicking a file in the tree fetches GET /api/mappings/{path} and shows breadcrumb | AC-5 |
| AC-6: editor shows Form tab and Raw JSON tab after a file is loaded | AC-6 |
| AC-6: Raw JSON tab renders a CodeMirror editor (lang-json + one-dark) | AC-6 |
| AC-6: Form tab renders guided fields (method, URL pattern, status) | AC-6 |
| AC-7: edits in Form tab are reflected in Raw JSON tab after switching | AC-7 |
| AC-7: advanced/unknown fields are NOT dropped when switching Form → Raw | AC-7 |
| AC-8: tree node shows ● dot and italic when file has unsaved changes | AC-8 |
| AC-9: Save is disabled and Discard is disabled when file is clean | AC-9 |
| AC-9: Save and Discard are both enabled when file has unsaved changes | AC-9 |
| AC-17: Raw JSON tab has a Copy JSON button that copies editor content to clipboard | AC-17 |

### story-4-2-mappings-crud.test.tsx

| Test Name | ACs |
|---|---|
| AC-10: Save issues PUT /api/mappings/{path} with content + lastKnownModified; clears unsaved indicator on 200 | AC-10 |
| AC-10: Save shows a success toast after 200 PUT response | AC-10 |
| AC-11: Discard reverts to last-saved content without a network call | AC-11 |
| AC-12: '+ New Mapping' button opens the file-naming modal | AC-12 |
| AC-12: '+ New Response' button opens the file-naming modal | AC-12 |
| AC-13: New Mapping when no service is selected shows service-selection dropdown first | AC-13 |
| AC-14 (P0): clicking Delete shows confirmation dialog with exact copy text | AC-14 |
| AC-14: cancelling the delete dialog makes no DELETE request | AC-14 |
| AC-14: confirming delete issues DELETE and removes file from tree on 200 | AC-14 |
| AC-15: Rename opens naming modal pre-filled with current filename | AC-15 |
| AC-15: Duplicate button creates a copy with a _copy suffix via GET→POST | AC-15 |
| AC-16: PUT failure shows error toast; state is not mutated | AC-16 |
| AC-18: navigation away from /mappings with unsaved edits shows discard-confirm dialog | AC-18 |
| AC-18: navigation away without unsaved edits does NOT show blocker dialog | AC-18 |

### story-4-2-settings-mocks-root.test.tsx

| Test Name | ACs |
|---|---|
| AC-21: Settings → Mocks Root section renders settings-input-mocks-root with the configured path | AC-21 |
| AC-21: Mocks Root input is read-only (display-only for v1) | AC-21 |
| AC-21: Edit affordance shows an inline warning about service restart + Resync | AC-21 |
| AC-21: settings-btn-mocks-root-save and settings-btn-mocks-root-discard exist in the section | AC-21 |
| AC-21: settings-modal-mocks-root-confirm and settings-btn-mocks-root-confirm exist | AC-21 |

### story-4-2-mappings-explorer-editor.spec.ts (E2E)

| Test Name | ACs | Priority |
|---|---|---|
| P0-1: navigating to /mappings renders the folder tree with configured services | AC-1 | P0 |
| P1-1: clicking a file in the tree loads the editor with breadcrumb | AC-5 | P1 |
| P1-2: editing a file in Raw JSON and saving updates it on disk | AC-10 | P1 |
| P1-3: deleting a file shows confirmation then removes it from tree and disk | AC-14 | P1 |
| P2-1: renaming a file updates the tree node and renames on disk | AC-15 | P2 |
| P2-2: duplicating a file creates a _copy variant in the same folder | AC-15 | P2 |
| P1-4: save failure shows error toast with actionable message (fault-injection) | AC-16 | P1 |
| P1-5: arrow keys move focus in the folder tree; Enter opens a file | AC-20 | P1 |

### Story4_2_MappingsContentEndpointTests.cs (Backend integration)

| Test Name | ACs |
|---|---|
| AC-5 (regression): GET /api/mappings still returns tree — not shadowed | AC-5 |
| AC-5: GET /api/mappings/{path} returns 200 with file content and metadata | AC-5 |
| AC-5: GET /api/mappings/{**path} nested path correctly routed by catch-all | AC-5 |
| AC-5: GET /api/mappings/{path} for non-existent file returns 404 MAPPING_FILE_NOT_FOUND | AC-5 |
| AC-5: GET /api/mappings/{**path} with path traversal returns 400 MAPPING_PATH_INVALID | AC-5 |
| AC-5 / NFR-8: GET /api/mappings/{path} unauthenticated returns 401 | AC-5, NFR-8 |
| AC-5: GET /api/mappings/{path} response FileContentDto uses camelCase JSON properties | AC-5 |

---

## data-testid Contract Table

All values verbatim from DESIGN.md (story Dev Notes section).

| Element | `data-testid` | Scaffolded In |
|---|---|---|
| Mappings page root | `page-mappings` | folder-tree, crud, editor, E2E |
| New Mapping button | `mappings-btn-new-mapping` | folder-tree, crud, E2E |
| New Response button | `mappings-btn-new-response` | folder-tree, crud, E2E |
| Folder tree node (per file) | `mappings-tree-node-{service-slug}-{filename}` | folder-tree, editor, crud, E2E |
| Save button | `mappings-btn-save` | editor, crud, E2E |
| Discard button | `mappings-btn-discard` | editor, crud, E2E |
| Duplicate button | `mappings-btn-duplicate` | crud, E2E |
| Rename button | `mappings-btn-rename` | crud, E2E |
| Delete button | `mappings-btn-delete` | crud, E2E |
| Form tab | `mappings-tab-form` | editor, crud |
| Raw JSON tab | `mappings-tab-raw` | editor, crud, E2E |
| Copy JSON button | `mappings-btn-copy-json` | editor, E2E |
| File naming modal (new/rename) | `mappings-modal-file-name` | crud, E2E |
| Filename input | `mappings-input-filename` | crud, E2E |
| Editor breadcrumb | `mappings-breadcrumb-editor` | editor, crud, E2E |
| Discard-guard dialog | `mappings-modal-discard-confirm` | crud |
| Discard-guard confirm | `mappings-btn-discard-confirm` | crud |
| Discard-guard cancel | `mappings-btn-discard-cancel` | crud |
| Settings Mocks Root input | `settings-input-mocks-root` | settings-mocks-root |
| Settings Mocks Root save | `settings-btn-mocks-root-save` | settings-mocks-root |
| Settings Mocks Root discard | `settings-btn-mocks-root-discard` | settings-mocks-root |
| Settings Mocks Root confirm dialog | `settings-modal-mocks-root-confirm` | settings-mocks-root |
| Settings Mocks Root confirm button | `settings-btn-mocks-root-confirm` | settings-mocks-root |

---

## AC Coverage Summary

| AC | Description | Scaffolded | Layer(s) |
|---|---|---|---|
| AC-1 | Folder tree renders full hierarchy | YES | Component (P0), E2E P0 |
| AC-2 | Root label shows data.mocksRoot verbatim | YES | Component |
| AC-3 | Active file brand-color left border | YES | Component |
| AC-4 | Expand/collapse preserved for session | YES | Component |
| AC-5 | File click loads content via GET /api/mappings/{path} | YES | Component (P0), E2E P1, Backend |
| AC-6 | Dual-mode editor: Form + Raw JSON (CodeMirror) | YES | Component (P0) |
| AC-7 | Tab switch preserves unsaved changes | YES | Component (P0) |
| AC-8 | Unsaved indicator: ● dot + italic | YES | Component |
| AC-9 | Save/Discard enablement rules | YES | Component |
| AC-10 | Save waits for server; success updates state | YES | Component, E2E P1 |
| AC-11 | Discard reverts without network call | YES | Component |
| AC-12 | New Mapping / New Response separate buttons | YES | Component |
| AC-13 | No service selected → service dropdown first | YES | Component |
| AC-14 | Delete confirmation dialog; no optimistic delete | YES | Component (P0), E2E P1 |
| AC-15 | Rename pre-fills modal; Duplicate with _copy suffix | YES | Component, E2E P2 |
| AC-16 | Failed write shows error toast; state not mutated | YES | Component, E2E P1 (fault-injection) |
| AC-17 | Copy JSON button copies to clipboard | YES | Component |
| AC-18 | Navigation guard: useBlocker confirmation dialog | YES | Component |
| AC-19 | Empty/loading states (skeleton, no-service, no-files) | YES | Component |
| AC-20 | Keyboard navigation (arrow keys, aria-labels) | YES | Component, E2E P1 |
| AC-21 | Settings → Mocks Root read-only display | YES | Component |

**All 21 ACs scaffolded.**

---

## RED Confirmation

### Component tests (Vitest) — RAN and FAILED

Command: `npm run test:unit` (in `src/client/`)

```
Test Files  5 failed | 40 passed (45)
Tests      44 failed | 454 passed (498)  [new story-4-2: 37 failing]
```

Key failing assertions (new scaffolds):

```
× AC-19: shows skeleton loader with aria-busy='true'
  → Unable to find an element with the role "status"
  (placeholder page renders no skeleton)

× AC-1: renders folder tree with Mocks Root → service → mappings/
  → Unable to find an element by: [data-testid="mappings-tree-node-payments-api-get_account_happy-path.json"]
  (placeholder renders no tree)

× AC-5: clicking a file in the tree fetches GET /api/mappings/{path} and shows breadcrumb
  → Unable to find an element by: [data-testid="mappings-tree-node-payments-api-get_account_happy-path.json"]
  (timeout — placeholder has no clickable tree node)

× AC-6: Raw JSON tab renders a CodeMirror editor
  → Expected to find .cm-editor element; CodeMirror not installed yet

× AC-14 (P0): clicking Delete shows confirmation dialog
  → Unable to find an element by: [data-testid="mappings-btn-delete"]
  (placeholder renders no delete button)

× AC-21: Settings → Mocks Root section renders settings-input-mocks-root
  → Unable to find an element by: [data-testid="settings-input-mocks-root"]
  (section still shows "Configured in a later story.")
```

### E2E tests (Playwright) — RED-by-construction

E2E specs were NOT run against the live stack (Docker not started; per task instructions).

Status: **RED-by-construction** — the spec file:
- Parses cleanly: `npx tsc --noEmit` exit code 0, 0 errors
- Is RED because `MappingsPage` renders a placeholder (`"Configured in a later story."`) with no tree, editor, or CRUD UI

### Backend integration tests (xUnit) — RED-by-construction

The `Story4_2_MappingsContentEndpointTests.cs` tests are RED because:
- `GET /api/mappings/{**path}` endpoint does not exist in `MappingsEndpoints.cs`
- `IMappingService.ReadFileAsync` method does not exist
- `FileContentDto` record does not exist in `Fishtank.Api/Models/`

These will fail with `HttpStatusCode.NotFound` (404 — route not registered) rather than the expected 200/404/400/401 responses.

---

## Notes / Constraints

1. **AC-19 no-files empty state**: The test for "service with no files → empty state shows + New Mapping + New Response" was merged into AC-12/AC-13 tests and the folder-tree file's no-service test. A dedicated "service selected but no files" scenario can be added during GREEN phase.

2. **AC-6 CodeMirror in jsdom**: CodeMirror 6 renders via DOM APIs that jsdom partially supports. The test asserts `.cm-editor` element presence. If CodeMirror uses canvas or ResizeObserver (not in jsdom), the test may need a `vi.mock('@uiw/react-codemirror')` stub during GREEN phase — left as RED now to drive the real implementation decision.

3. **AC-18 navigation guard**: The `useBlocker` test uses `window.history.pushState` to simulate navigation in MemoryRouter. Full cross-trigger coverage (logo click, browser back, sign-out) is Story 4.6; the 4.2 test covers the router-navigation case only, per story scope boundary.

4. **Pre-existing failure**: `settings.test.tsx` was already failing 7 tests before story 4.2 scaffolds were written (confirmed by stash test). These failures are not caused by the 4.2 scaffolds.
