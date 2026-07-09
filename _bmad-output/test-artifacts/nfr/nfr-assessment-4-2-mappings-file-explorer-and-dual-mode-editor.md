---
story_key: 4-2-mappings-file-explorer-and-dual-mode-editor
epic: 4
generated: 2026-06-29
assessor: Master Test Architect (bmad-testarch-nfr, Create mode)
mode: create
audit_areas: [performance, security, reliability, maintainability]
verdict: pass
blockers: 0
majors: 2
minors: 4
---

# NFR Assessment — Story 4.2: Mappings File Explorer & Dual-Mode Editor

**Scope:** the NEW / changed code paths introduced by story 4-2 only.

- **Backend:** `GET /api/mappings/{**path}` content endpoint + `MappingService.ReadFileAsync` + `FileContentDto`.
- **Frontend:** `features/mappings/**` (FolderTree, MappingEditor, FormTab, RawJsonTab, modals, NavigationGuard, hooks) and `features/settings` MocksRootSettings + useMocksRoot.

**Verdict: PASS** — zero BLOCKERs. All Epic-4 NFR controls relevant to 4-2 (NFR-8 auth, R-E4-005 path traversal, NFR-15 destructive confirmation, no-optimistic-mutation reliability, NFR-19 keyboard nav) are present in code and validated by tests. Two MAJORs are robustness/UX hardening, not gate blockers. UI-load <2s (NFR-1) is deferred to CI Lighthouse per the test-design plan.

---

## Security

| Control | Status | Evidence (file:line) |
|---|---|---|
| New content endpoint requires auth (NFR-8) | PASS | `src/Fishtank.Api/Endpoints/MappingsEndpoints.cs:11,14` — `MapGroup("/api/mappings").RequireAuthorization()`; the new `MapGet("{**path}", GetFileContentAsync)` inherits the group's auth. Validated: `Story4_2_MappingsContentEndpointTests.cs:259-272` (unauthenticated → 401). |
| Path traversal blocked on the NEW read path (R-E4-005) | PASS | `MappingService.cs:37` — `ReadFileAsync` calls the same `SanitizePath` used by create/update/delete; sanitizer at `MappingService.cs:152-180` URL-decodes first (`:155`), rejects `../` variants (`:161`), absolute/UNC/drive paths (`:167`), and re-verifies the resolved path is under Mocks Root (`:175`). Validated: unit `MappingServiceTests.cs:45-167` (direct/encoded/repeated `../`, absolute, outside-root) and integration `Story4_2_MappingsContentEndpointTests.cs:228-251` (encoded traversal → 400 `MAPPING_PATH_INVALID`). |
| No path/info leakage in errors | PASS | `MappingService.cs:40` returns only the caller-supplied relative `path` in the 404 message; `ReadFileAsync` does not echo the resolved absolute `fullPath`. Endpoint maps exceptions to standard envelope codes (`MappingsEndpoints.cs:41-48`). |
| No secret exposure | PASS | `FileContentDto` (`Models/FileContentDto.cs:3-8`) carries only file content + metadata; no credentials/tokens. `MocksRootSettings.tsx:43` displays the env-var NAME (`FISHTANK_MOCKS_ROOT`), not a secret value. |
| Editor does not introduce XSS / injection via rendered content | PASS | `RawJsonTab.tsx:62-74` feeds content to CodeMirror `value` (rendered as editor text, not HTML). No `dangerouslySetInnerHTML`/`innerHTML`/`eval` anywhere in `features/mappings` (grep: 0 matches). React escapes all interpolated strings (e.g. breadcrumb `MappingEditor.tsx:326`). |
| Editor never bypasses auth | PASS | Every call goes through `apiFetch` (`lib/api.ts:16` always `credentials:"include"`, `401`→`/login`): tree `useMappingsTree.ts:14`, content `useFileContent.ts:12`, all mutations `useMappingMutations.ts:41,65,88,111,117,148,182`. No raw `fetch` in the feature. |

**Security finding (MINOR — robustness):** Frontend builds request URLs as `` `/api/mappings/${path}` `` without `encodeURIComponent` (`useMappingMutations.ts:41,88,117`; `useFileContent.ts:12`; `fetchFileContent` `:182`). This is NOT a traversal hole — the backend `SanitizePath` URL-decodes and re-validates server-side (`MappingService.cs:155,172-177`) — but unencoded `#`/`?`/space in a filename could mis-route the request client-side. Recommend `path.split("/").map(encodeURIComponent).join("/")`.

---

## Reliability

| Control | Status | Evidence (file:line) |
|---|---|---|
| Destructive delete requires confirmation — no optimistic delete (NFR-15, AC-14) | PASS | `DeleteConfirmDialog.tsx:48` exact copy "Delete this mapping? This removes the file from disk."; delete button only opens the dialog (`MappingEditor.tsx:392`), `DELETE` fires on confirm (`:201-204`), tree/editor state cleared only in mutation `onSuccess` (`:186-189`, page `handleDeleteSuccess` MappingsPage.tsx:173-178). Validated by component tests (delete-confirmation P0) and E2E `story-4-2-mappings-explorer-editor.spec.ts`. |
| Saves wait for server confirmation — no optimistic mutation (AC-10) | PASS | `useSaveExisting`/`useCreateFile` use React Query `useMutation` with NO `onMutate`/optimistic update (`useMappingMutations.ts:39-78`). State (lastKnownModified, savedContent, dirty clear) updates only in `onSuccess` (`MappingEditor.tsx:147-150`; `MappingsPage.tsx:157-171`). |
| Rename GET→POST→DELETE never destroys data on partial failure (AC-15) | PASS | `useRenameFile` (`useMappingMutations.ts:109-118`): `await POST new path` first; `DELETE old path` runs ONLY after POST resolves. If POST throws, DELETE never runs → both files safe. Comment documents the invariant (`:99-102`). |
| Write failures surface a toast and do NOT mutate state (AC-16) | PASS | All mutations route errors to `onError` toasts: save `MappingEditor.tsx:152-158`, delete `:191-198`, rename `:213-220`, duplicate `:255-261`, create `MappingsPage.tsx:208-214`. No state mutation in any error path. Backend already logs the System Event on write failure (`MappingService.cs:80-85,116-121,139-144`); frontend only surfaces. E2E fault-injection via `page.route()` exercises AC-16 (`spec.ts:376-397`). |
| Navigation guard prevents silent loss of unsaved edits (AC-18, R-E4-002) | PASS | `NavigationGuard.tsx` — `useBlocker` fires only when `isDirty && pathname changing` (`:103-106`); dialog `mappings-modal-discard-confirm` with confirm/cancel (`:21,51,66`); confirm→`blocker.proceed()`, cancel→`blocker.reset()` (`:113-114`). Wired in page with `isDirty` (`MappingsPage.tsx:501`) and the Story-4.6 seam comment (`:500`). Has an ErrorBoundary fallback for MemoryRouter test contexts (`:216-244`). |
| Discard reverts without network (AC-11) | PASS | `MappingEditor.tsx:172-182` reparses last-saved `fileContent` into the buffer and clears dirty — no `apiFetch` call. |
| Duplicate 409 retry bounded (no infinite loop) | PASS | `useDuplicateFile` increments suffix on `MAPPING_FILE_EXISTS` up to `MAX_DUPLICATE_RETRIES = 50` then rethrows (`useMappingMutations.ts:129-166`). |

**Reliability finding (MINOR):** `RawJsonTab.tsx:19-21` swallows clipboard failures silently (no toast). Acceptable for a non-destructive Copy action, but a transient "Copy failed" affordance would improve feedback.

**Reliability finding (MINOR):** On invalid JSON typed in the Raw tab, `MappingEditor.tsx:131-141` marks dirty but does not update the buffer and shows no inline parse-error hint; Save then serialises the last valid buffer (`:163`), silently dropping the in-flight invalid text. Functionally safe (no corrupt write) but the user gets no signal their unparseable edit was not captured. Form-validation polish is reasonably out of 4-2 scope.

---

## Performance

| Control | Status | Evidence (file:line) |
|---|---|---|
| Tree read is O(n) over the filesystem, no N+1 | PASS | `MappingService.BuildTreeNode` (`MappingService.cs:182-222`) is a single recursive `EnumerateFileSystemInfos` walk; run off the request thread via `Task.Run` (`:30`). One read per node, no per-node re-stat. |
| File read is a single bounded read | PASS | `ReadFileAsync` does one `File.ReadAllTextAsync` + one `FileInfo` (`MappingService.cs:42-43`). |
| No full-file re-read on keystroke | PASS | Editing operates entirely on the in-memory `editBuffer` (`MappingEditor.tsx:122-143`); `GET {path}` fires once per file-open via React Query `useFileContent` (`useFileContent.ts:9-15`, `enabled: path!==null`). No fetch on keystroke. |
| React Query caching — no refetch storms | PASS | Tree keyed `["mappings"]` (`useMappingsTree.ts:5`), content keyed `["mappings-file", path]` (`useFileContent.ts:11`); invalidation happens ONLY inside mutation `onSuccess` (`useMappingMutations.ts:48,71,90,120,169`) — no component-effect invalidation (anti-pattern avoided). `useMocksRoot` shares the `["mappings"]` key (`useMocksRoot.ts:20`) → de-duped, no extra request. |
| UI initial load <2s (NFR-1) | DEFERRED-TO-CI | Cannot be measured statically; per test-design "UI initial load <2s (NFR-1) → Playwright Lighthouse audit (nightly CI)". No code path here introduces a synchronous blocking cost; toolbar gates on tree-loaded (`MappingsPage.tsx:288`) and skeleton uses `aria-busy` (`:349-353`). |
| Large-file editor behavior | NOTED (low risk) | CodeMirror handles large docs well; whole-buffer `JSON.stringify` on every render (`MappingEditor.tsx:119`) is O(file size) per keystroke. Fine for typical WireMock mappings (KB-scale); would warrant memoization only for multi-MB files, which mappings are not. |

---

## Maintainability

| Control | Status | Evidence (file:line) |
|---|---|---|
| Keyboard navigation in tree (NFR-19, AC-20) | PASS | `FolderTree.tsx` — `role="tree"` container `tabIndex=0` (`:219,222`), roving-tabindex entry (`:97` `tabIndex={isFocused?0:-1}`), Arrow Up/Down move focus via DOM-order `querySelectorAll` reading `data-node-path` (`:181-215`), Enter opens (`:207-211`); per-node Enter/Space toggle (`:80-88`). E2E keyboard nav `spec.ts:447-477`. |
| aria-labels on icon-bearing buttons | PASS | Save/Discard/Rename/Duplicate/Delete (`MappingEditor.tsx:347,358,371,381,391`), Copy JSON (`RawJsonTab.tsx:40`), New Mapping/Response (`MappingsPage.tsx:301,322,418,432`). Dialogs use `role="dialog" aria-modal` (`DeleteConfirmDialog.tsx:20-22`, `FileNameModal.tsx:41-43`, `NavigationGuard.tsx:18-21`). Toasts use `role=alert/status` + `aria-live` (`MappingsPage.tsx:47-48`). |
| Feature-folder isolation — no cross-feature imports | PASS | `mappings/**` imports only `@/lib/*` and relative `../`; settings `useMocksRoot.ts:1-23` deliberately re-declares the query against `/api/mappings` with a local type and comments why it must NOT import from `features/mappings` (`:9-17`) — isolation fix holds; cache shared only via the `["mappings"]` key. |
| TypeScript strictness — no `any` leaks | PASS | DTOs precisely modelled (`types/mappings.ts:4-31`); edit buffer typed `Record<string, unknown>` (`:34`) with explicit narrowing in `FormTab.tsx:15-26`. No `any` in the feature. |
| data-testid coverage (DoD gate 5) | PASS | Canonical ids present verbatim: tree node `FolderTree.tsx:91`, breadcrumb `MappingEditor.tsx:313`, tabs `:410,428`, action buttons `:346,357,370,380,390`, copy `RawJsonTab.tsx:39`, modals/guard `FileNameModal.tsx:44,76`, `NavigationGuard.tsx:21,51,66`, settings `MocksRootSettings.tsx:53,120,137,161,206`. Resync button correctly absent (Story 4.3). |
| No dead code | PASS (minor) | Feature is lean. `MappingEditor.tsx:287` `const saveEnabled = isDirty || false;` is a redundant `|| false`; harmless, trivially simplifiable. |

**Maintainability finding (MAJOR — process/coverage, not correctness):** The frontend code under audit lives in **untracked** files (`git status` shows `features/mappings/` etc. as `??`). The story DoD requires `npm run build` clean and `features/mappings/` ≥80% coverage. These are CI-gated and cannot be confirmed by static read here — flagged so the gate owner verifies the build + coverage report before merge. (Tests exist: 10 component/unit files under `tests/unit/features/mappings/` + `tests/e2e/story-4-2-...spec.ts`.)

---

## Deferred-to-CI / Nightly

| Item | Why deferred | Where validated |
|---|---|---|
| UI initial load <2s (NFR-1) | Not statically measurable | Playwright Lighthouse, nightly (test-design NFR Planning) |
| `features/mappings/` ≥80% coverage (DoD) | Requires coverage run | CI frontend coverage report |
| `npm run build` 0 errors / `dotnet build` 0 warnings (DoD 3,4) | Requires build | PR CI |
| prefers-reduced-motion (NFR-21) | N/A to 4-2 (Recording badge is Story 4-5); 4-2 skeleton uses a `pulse` animation `MappingsPage.tsx:367` with no reduced-motion guard | Note for Story 4-5 / nightly axe |

---

## Gate Decision

**PASS (concerns: 0 BLOCKER, 2 MAJOR, 4 MINOR).**

Rationale: every Epic-4 NFR control in scope for 4-2 is implemented and test-backed — auth on the new endpoint (NFR-8), path-traversal sanitization reused on the read path (R-E4-005, unit + integration), destructive-delete confirmation (NFR-15), wait-for-server-confirmation on all mutations with safe rename ordering, the `/mappings`-scoped navigation guard (R-E4-002), and keyboard tree navigation with aria-labelled controls (NFR-19). No XSS/injection/secret-exposure vectors. The two MAJORs are a coverage/build verification gate (untracked files, CI-owned) and the unencoded-path-segment robustness note (server-side sanitization already neutralises the security risk) — neither blocks the gate. MINORs are UX/polish.
