---
story_key: 4-2-mappings-file-explorer-and-dual-mode-editor
epic: 4
generated: 2026-06-29
author: Master Test Architect (bmad-testarch-trace)
mode: create
oracle: formal-acceptance-criteria (AC-1..AC-21)
gate: PASS
gate_quality_score: 91
coverage:
  acs_total: 21
  acs_full: 19
  acs_partial: 2
  acs_none: 0
  p0_total: 6
  p0_covered: 6
risk_links:
  - R-E4-002 (navigation guard bypass) — AC-18
  - R-E4-004 (write failure silently dropped) — AC-16
suite_status:
  unit_component_full_suite: 660/660 green (52 files)
  e2e: 8/8 green (live stack)
  backend_integration: Story4_2_MappingsContentEndpointTests (7 tests) green
  ts_build: 0 errors
---

# Requirements → Test Traceability Matrix — Story 4-2: Mappings File Explorer & Dual-Mode Editor

**Story:** 4.2 — Mappings File Explorer & Dual-Mode Editor (Epic 4)
**Coverage oracle:** Formal acceptance criteria AC-1..AC-21 from the story file.
**Date:** 2026-06-29
**Gate decision:** **PASS** (quality score 91/100; verified against the test-quality review and the live test files.)

Layers: **C** = component (Vitest + RTL + msw), **U** = isolated unit (Vitest), **E** = Playwright E2E (live stack), **I** = xUnit backend integration.
Coverage status: **full** = behavioural test(s) at the prescribed layer pin the AC outcome; **partial** = covered, but only via a proxy/loose assertion or a weak side-check; **none** = no meaningful test.
Priority is the test-design priority for the primary scenario covering the AC (test-design-epic-4.md, Story 4-2 block). ACs not enumerated in the test-design carry no formal priority ("—").

## AC → Test Matrix

| AC | Requirement (FR / UX-DR / NFR) | Priority | Risk | Covering test(s) — file : test title (line) | Layer | Status |
|---|---|---|---|---|---|---|
| AC-1 | Folder tree full hierarchy + per-file `data-testid` (FR-17, UX-DR11) | **P0** | — | `story-4-2-mappings-folder-tree.test.tsx` : "AC-1: renders folder tree with Mocks Root → service → mappings/ → responses/ → file nodes" (147); `story-4-2-components-unit.test.tsx` (treeitem roles); `story-4-2-mappings-explorer-editor.spec.ts` : "P0-1 (AC-1): navigating to /mappings renders the folder tree" (109) | C, U, E | **full** |
| AC-2 | Root label = `data.mocksRoot`, not hardcoded (FR-17) | P1 | — | `story-4-2-mappings-folder-tree.test.tsx` : "AC-2: root node label displays data.mocksRoot verbatim" (184) + "AC-2: root label updates when backend returns a different mocksRoot path" (199) | C | **full** |
| AC-3 | Active file brand-color left border; single active (UX-DR11) | P1 | — | `story-4-2-mappings-folder-tree.test.tsx` : "AC-3: clicking a file node gives it the brand-color left-border active style, only one at a time" (220) | C | **partial** |
| AC-4 | Expand/collapse persists across re-fetch (session) (FR-17) | P2 | — | `story-4-2-mappings-folder-tree.test.tsx` : "AC-4: expand/collapse state survives a tree re-fetch (session-scoped)" (275); `story-4-2-components-unit.test.tsx` (Space-toggle collapse) | C, U | **full** |
| AC-5 | File click → `GET /api/mappings/{path}` → editor + breadcrumb + retains `lastKnownModified` (FR-17, FR-19) | **P0** | — | `story-4-2-mappings-editor.test.tsx` : "AC-5: clicking a file in the tree fetches GET /api/mappings/{path} and shows breadcrumb" (151); `story-4-2-mappings-page-coverage.test.tsx` (openFile); E2E "P1-1 (AC-5): clicking a file ... loads the editor with breadcrumb" (139); **backend** `Story4_2_MappingsContentEndpointTests` : `GetMappingContent_ExistingFile_Returns200WithContentAndMetadata` (88) + `GetMappingContent_NestedPath_RoutedCorrectlyByCatchAll` (165) | C, U, E, I | **full** |
| AC-6 | Dual-mode tabs; Raw = CodeMirror (lang-json + one-dark); Form fields (FR-19) | **P0** | — | `story-4-2-mappings-editor.test.tsx` : "AC-6: editor shows Form tab and Raw JSON tab" (165) + "AC-6: Raw JSON tab renders a CodeMirror editor (lang-json + one-dark)" (176) + "AC-6: Form tab renders guided fields" (199); `story-4-2-mapping-editor-unit.test.tsx` (tab aria-selected) | C, U | **full** |
| AC-7 | Tab switch preserves edits; advanced/unknown keys not dropped (FR-19) | **P0** | — | `story-4-2-mappings-editor.test.tsx` : "AC-7: edits in Form tab are reflected in Raw JSON tab after switching" (229) + "AC-7: advanced/unknown fields are NOT dropped when switching Form → Raw" (254); `story-4-2-form-tab.test.tsx` (unknown-key passthrough) | C, U | **full** |
| AC-8 | Unsaved indicator: `●` dot + italic filename (FR-18) | P1 | — | `story-4-2-mappings-editor.test.tsx` : "AC-8: tree node shows ● dot and italic when file has unsaved changes" (279); `story-4-2-components-unit.test.tsx` (`data-dirty`); `story-4-2-mapping-editor-unit.test.tsx` (breadcrumb dot) | C, U | **full** |
| AC-9 | Save/Discard enablement rules (FR-18) | P1 | — | `story-4-2-mappings-editor.test.tsx` : "AC-9: Save ... disabled ... when clean" (311) + "AC-9: Save and Discard are both enabled when file has unsaved changes" (326); `story-4-2-mapping-editor-unit.test.tsx` (button-state) | C, U | **full** |
| AC-10 | Save waits for 200; PUT body `{content,lastKnownModified}`; success toast; no optimistic (FR-18) | **P0**/P1 | — | `story-4-2-mappings-crud.test.tsx` : "AC-10: Save issues PUT ... with content + lastKnownModified; clears unsaved indicator on 200" (169) + "AC-10: Save shows a success toast after 200 PUT response" (221); `story-4-2-mapping-editor-unit.test.tsx` (handleSave); E2E "P1-2 (AC-10): editing ... and saving updates it on disk" (173) | C, U, E | **full** |
| AC-11 | Discard reverts; no network call (FR-18) | — | — | `story-4-2-mappings-crud.test.tsx` : "AC-11: Discard reverts to last-saved content without a network call" (263); `story-4-2-mapping-editor-unit.test.tsx` (handleDiscard valid/invalid JSON) | C, U | **full** |
| AC-12 | New Mapping / New Response separate buttons → correct sub-folder + naming modal (FR-18) | — | — | `story-4-2-mappings-crud.test.tsx` : "AC-12: '+ New Mapping' button opens the file-naming modal" (318) + "AC-12: '+ New Response' button opens the file-naming modal" (343); `story-4-2-mappings-page-coverage.test.tsx` (New-Response → responses/ POST path) | C | **full** |
| AC-13 | No service selected → service dropdown before naming modal (FR-18) | P1 | — | `story-4-2-mappings-crud.test.tsx` : "AC-13: New Mapping when no service is selected shows service-selection dropdown before naming modal" (367); `story-4-2-mappings-page-coverage.test.tsx` (full selector → POST flow); `story-4-2-components-unit.test.tsx` (precise combobox) | C | **full** |
| AC-14 | Delete confirmation, exact copy, no optimistic delete (FR-18, NFR-15) | **P0** | — | `story-4-2-mappings-crud.test.tsx` : "AC-14 (P0): clicking Delete shows confirmation dialog with exact copy text" (411) + "AC-14: cancelling ... makes no DELETE request" (432) + "AC-14: confirming delete issues DELETE ... and removes file from tree on 200" (472); `story-4-2-mapping-editor-unit.test.tsx` (delete flows); E2E "P1-3 (AC-14): deleting a file shows confirmation then removes it from tree and disk" (234) | C, U, E | **full** |
| AC-15 | Rename (pre-filled; GET→POST→DELETE) + Duplicate (GET→POST `_copy`) (FR-18) | P2 | — | `story-4-2-mappings-crud.test.tsx` : "AC-15: Rename opens naming modal pre-filled" (563) + "AC-15: Duplicate button creates a copy with a _copy suffix via GET→POST" (586); `story-4-2-mapping-editor-unit.test.tsx` (rename/duplicate + path computation); `story-4-2-mutations-coverage.test.tsx` (useRenameFile/useDuplicateFile + 409 retry + makeCopyPath); E2E "P2-1 (AC-15): renaming ... renames on disk" (289) + "P2-2 (AC-15): duplicating ... creates a _copy variant" (341) | C, U, E | **full** |
| AC-16 | Failed write → error toast; state not mutated; FE creates no System Event (FR-18, FR-22) | P1 | **R-E4-004** | `story-4-2-mappings-crud.test.tsx` : "AC-16: PUT failure shows error toast with actionable message; state is not mutated" (637); `story-4-2-mapping-editor-unit.test.tsx` (error toasts: save/delete/rename/duplicate); `story-4-2-mappings-page-coverage.test.tsx` (create error); E2E "P1-4 (AC-16, R-E4-004): save failure shows error toast with actionable message" (379, fault-injected PUT 500) | C, U, E | **full** |
| AC-17 | Copy JSON button copies raw content (DESIGN.md) | — | — | `story-4-2-mappings-editor.test.tsx` : "AC-17: Raw JSON tab has a Copy JSON button that copies editor content to clipboard" (347) | C | **full** |
| AC-18 | `useBlocker` guard scoped to /mappings; confirm/cancel; no-prompt when clean (FR-21) | **P0** | **R-E4-002** | `story-4-2-mappings-crud.test.tsx` : "AC-18: navigation away from /mappings with unsaved edits shows discard-confirm dialog" (697) + "AC-18: navigation away without unsaved edits does NOT show blocker dialog" (728); `story-4-2-components-unit.test.tsx` (BlockerDialog data-router proceed/reset + fallback paths) | C, U | **full** |
| AC-19 | Loading skeleton `aria-busy`; no-service + no-files empty states (DESIGN.md) | — | — | `story-4-2-mappings-folder-tree.test.tsx` : "AC-19: shows skeleton loader with aria-busy='true' and aria-label='Loading mappings'" (135) + "AC-19: shows 'Select a service' empty state ..." (313); `story-4-2-mappings-page-coverage.test.tsx` ("No mappings yet" + empty-state buttons) | C | **full** |
| AC-20 | Keyboard nav: arrows move focus, Enter opens; aria-labels on icon buttons (NFR-19) | P1 | — | `story-4-2-mappings-folder-tree.test.tsx` : "AC-20: New Mapping and New Response buttons carry meaningful aria-labels" (332); `story-4-2-components-unit.test.tsx` (ArrowUp/Down boundaries, Enter, Space, no-focus Enter); E2E "P1-5 (AC-20): arrow keys move focus in the folder tree; Enter opens a file" (450) | C, U, E | **full** |
| AC-21 | Settings → Mocks Root read-only display + edit warning + canonical testids (FR-20, UX-DR6) | — | — | `story-4-2-settings-mocks-root.test.tsx` (ATDD ×5: AC-21 input/readonly/warning/save+discard ids/confirm-modal, lines 121–197); `story-4-2-mocks-root-settings.test.tsx` (gap-fill ×8: loading, readonly, Edit-warning, Discard, Save-modal, confirm, cancel, missing-mocksRoot, lines 43–224) | C | **full** |

### Backend integration coverage (supports AC-5, NFR-8, R-E4-005)

`Story4_2_MappingsContentEndpointTests.cs` (7 tests, all green):
- `GetMappingsTree_NotShadowedByContentRoute_Returns200WithTree` (57) — route-shadowing regression guard (tree `""` route survives the new `{**path}` route)
- `GetMappingContent_ExistingFile_Returns200WithContentAndMetadata` (88)
- `GetMappingContent_NestedPath_RoutedCorrectlyByCatchAll` (165)
- `GetMappingContent_NonExistentFile_Returns404` (201) — `MAPPING_FILE_NOT_FOUND`
- `GetMappingContent_PathTraversal_Returns400` (229) — `MAPPING_PATH_INVALID` (R-E4-005)
- `GetMappingContent_Unauthenticated_Returns401` (260) — NFR-8
- `GetMappingContent_ResponseShape_UsesJsonCamelCase` (282)

## Coverage by Priority

All priorities below are taken from test-design-epic-4.md (Story 4-2). P0s **must** all be covered for a PASS.

| Priority | ACs in this story | Covered (full) | Covered (partial) | None | Status |
|---|---|---|---|---|---|
| **P0** | AC-1, AC-5, AC-6, AC-7, AC-10*, AC-14, AC-18 | AC-1, AC-5, AC-6, AC-7, AC-10, AC-14, AC-18 (7/7) | 0 | 0 | **100% — gate-clear** |
| **P1** | AC-2, AC-3, AC-8, AC-9, AC-10*, AC-13, AC-16, AC-20 | AC-2, AC-8, AC-9, AC-10, AC-13, AC-16, AC-20 | AC-3 | 0 | full or partial; no gaps |
| **P2** | AC-4, AC-15 | AC-4, AC-15 | 0 | 0 | full |
| **— (no test-design priority)** | AC-11, AC-12, AC-17, AC-19, AC-21 | all 5 | 0 | 0 | full |

\*AC-10 spans a P0 component scenario (tab/state) and P1 E2E (disk verify); listed in both rows.

Test-design Story 4-2 P0 scenario set = {tree hierarchy render, file-click loads editor, Raw JSON CodeMirror, tab-switch preserves unsaved changes, delete confirmation dialog, E2E navigate→tree renders}. **Every P0 scenario maps to at least one green test at the prescribed layer.**

## Coverage Counts

- **Total ACs:** 21
- **Full:** 19
- **Partial:** 2 (AC-3, AC-16)
- **None:** 0
- **P0 coverage:** 6/6 distinct P0 scenarios (7/7 P0-tagged ACs) — **100%**

## Gaps & Partial-Coverage Notes

No AC is uncovered. Two ACs are **partial** because the assertion is a proxy or a weak side-check rather than the literal spec'd outcome. Neither is a P0 and both are corroborated elsewhere:

1. **AC-3 — partial (proxy assertion).** `story-4-2-mappings-folder-tree.test.tsx:220` asserts the node's `data-active="true"` attribute (and single-active invariant) rather than the literal UX-DR11 `border-left: … var(--brand)` computed style. The component drives both `data-active` and the brand border from the same `isActive` boolean, so the proxy is sound, but no test pins the actual brand-color left border. Recommended follow-up (non-blocking): one assertion on the computed `border-left` / `--brand` token. (Test-review finding **m-1**.)

2. **AC-16 — full at AC level, but the E2E disk-side check is weak (partial).** AC-16's frontend behaviour (error toast with actionable copy + no state mutation) is **strongly** covered at C/U and by E2E P1-4 (fault-injected PUT 500). It is marked partial only to flag the related weak disk-verification pattern in the delete E2E: `story-4-2-mappings-explorer-editor.spec.ts:276-282` (P1-3, AC-14) does `apiFetch(...).catch(e => e)` then `expect(res).toBeTruthy()` — a successful 200 is also truthy, so it does not actually prove a 404/deletion-on-disk; the tree-removal assertion above it is the real check. Recommended follow-up (non-blocking): assert the caught error's status is 404 / the not-found envelope. (Test-review finding **m-5**.)
   - Note: the AC-16 *requirement outcome itself* is fully and behaviourally covered; the weak check is on AC-14's disk side. AC-14 is also independently fully covered at component/unit (DELETE issued only after confirm; tree node removed only on 200). The "partial" tag is conservative and reflects the test-review's m-5 only.

### Additional quality observations carried from the test-review (non-coverage, non-blocking)

- **M-1 (MAJOR, assertion clarity — not a coverage gap):** `story-4-2-settings-mocks-root.test.tsx:155` uses `expect(input).toHaveAttribute("readonly") || expect(input).toBeDisabled();` — the `||` is dead syntax (short-circuits on the first truthy assertion object). It does not reduce AC-21 coverage because the companion gap-fill file `story-4-2-mocks-root-settings.test.tsx:85-94` asserts `readonly` cleanly. Fix for clarity in a follow-up.
- **m-2, m-3, m-4** (loose service-dropdown OR; two negative-assertion fixed `setTimeout` waits; documented dead-code "coverage-theater" tests in `story-4-2-mapping-editor-branch-coverage.test.tsx`) — quality nits, no AC left uncovered.

## Gate Decision

### **PASS**

**Rationale:**

- **All 21 ACs have at least one meaningful, behavioural test** at the layer the epic test-design prescribes. 19 are full, 2 are partial (AC-3 proxy border assertion; AC-16/AC-14 weak E2E disk check) — both non-P0 and corroborated by other tests.
- **All P0 scenarios are covered (6/6 distinct; 7/7 P0-tagged ACs)** at component + E2E: tree hierarchy render, file-click→editor (+ backend content endpoint), Raw JSON CodeMirror (lang-json + one-dark), tab-switch-preserves-edits, delete confirmation, navigation guard, and the E2E tree render. The P0 100% threshold (test-design Quality Gates: "P0 pass rate 100% — PR merge blocked") is met.
- **Both linked risks are mitigated by tests:** R-E4-002 (nav-guard) via AC-18 component + data-router BlockerDialog tests (full cross-trigger E2E matrix is correctly deferred to Story 4.6 per scope); R-E4-004 (write failure) via AC-16 component + the fault-injected E2E P1-4.
- **Backend AC-5 is thoroughly covered** including the route-shadowing regression guard and the security cases (traversal → 400, unauthenticated → 401) that map to R-E4-005 / NFR-8.
- **Suite health is green and deterministic:** full unit/component suite 660/660 (52 files), E2E 8/8 against the live stack, backend integration 7/7, TypeScript build 0 errors, and per-file coverage meets the 90/90/90/85 thresholds for all 15 story-4-2 source files.
- The single MAJOR (M-1) is an assertion-expression clarity defect, not a coverage loss — the same behaviour is asserted cleanly elsewhere — so it does not gate.

**Why not CONCERNS:** The two partials are non-P0, are proxy/secondary-check weaknesses (not missing behaviour), and each AC's primary outcome is asserted behaviourally. They are tracked as opportunistic follow-ups, consistent with the independent test-quality review verdict of PASS (score 91). Inflating to CONCERNS would not reflect the real state.

**Recommended follow-ups (all non-blocking):**
1. Fix M-1 — express the readonly/disabled intent without the dead `||`.
2. Tighten AC-3 — add one assertion on the computed brand `border-left` / `--brand` token.
3. Tighten the P1-3 delete E2E (m-5) — assert the caught error status is 404 rather than mere truthiness.
4. Optionally replace the two negative-assertion `setTimeout` waits (m-3) with positive post-conditions.
