---
story_key: 4-2-mappings-file-explorer-and-dual-mode-editor
date: 2026-06-29
verdict: pass
reviewer: bmad-code-review (adversarial)
epic: 4
---

# Code Review — Story 4.2: Mappings File Explorer & Dual-Mode Editor

Adversarial senior review of the working-tree changes for story 4-2. Scope: frontend
`features/mappings/**`, `features/settings/components/MocksRootSettings.tsx` +
`SettingsPage.tsx`, backend content endpoint (`MappingsEndpoints.cs`, `MappingService.cs`,
`IMappingService.cs`, `FileContentDto.cs`), and the test/support changes.

## Remediation status (post-review, 2026-06-29)

All 4 MAJOR findings were fixed in a QuickDev cycle during the lifecycle run (before merge):
- **M-1** (cross-feature import): resolved — `MocksRootSettings` now uses a local `features/settings/hooks/useMocksRoot.ts` (no cross-feature import; shares the `["mappings"]` query cache).
- **M-2** (keyboard roving-focus desync): resolved — focus now derived from DOM order via a `data-node-path` attribute, correct across multiple expanded folders.
- **M-3** (duplicate suffix on 409): resolved — duplicate retries `_copy_2`, `_copy_3`, … on `MAPPING_FILE_EXISTS` (capped at 50).
- **M-4** (fragile test isolation / settings flakiness): resolved — `mockApiFetch.mockReset()` drains `*Once` queues + `afterAll` restores the real `apiFetch`; full suite now deterministic (491/491 across repeated runs).

Build clean and full client suite 491/491 (verified twice) after remediation. MINOR items remain as documented below (non-blocking).

## Verdict: PASS (zero BLOCKERs)

The story is functionally complete and the security-critical surface (new
`GET /api/mappings/{**path}` content endpoint) is sound: it reuses the existing
`SanitizePath` traversal guard, is under `.RequireAuthorization()`, returns the correct
error codes, and does not shadow the tree route. All DoD build/test gates that can be
verified locally pass (`tsc -b` clean; `vitest run` 491/491 pass; backend builds; the 7
new Story 4.2 integration tests pass). There are no correctness or security defects that
rise to BLOCKER. Several MAJOR items below should be fixed before merge but none block the
gate per the "pass = zero BLOCKERs" rule.

## Findings summary

| Severity | Count |
|---|---|
| BLOCKER | 0 |
| MAJOR | 4 |
| MINOR | 7 |

## Verified strengths (no action needed)

- **Path traversal / sanitization** — `ReadFileAsync` calls the shared `SanitizePath`
  (`MappingService.cs:37`), which URL-decodes first, rejects `../`, absolute/UNC/drive
  paths, and verifies the resolved path stays under Mocks Root. Integration test
  `GetMappingContent_PathTraversal_Returns400` passes (encoded `..` → 400 MAPPING_PATH_INVALID).
- **Route shadowing** — `GET ""` (tree) and `GET {**path}` (content) are distinct routes;
  regression test `GetMappingsTree_NotShadowedByContentRoute_Returns200WithTree` passes.
- **Auth** — content endpoint inherits `.RequireAuthorization()` from the group;
  `GetMappingContent_Unauthenticated_Returns401` passes.
- **Anti-patterns avoided** — no raw `fetch` (all via `apiFetch`); no `useState(false)` for
  server-loading (React Query `isLoading`); `invalidateQueries` only inside mutation
  `onSuccess`; no optimistic create/save/delete; no Resync button rendered; AC-7 advanced
  WireMock fields preserved via spread of the parsed `editBuffer` in `FormTab.updateField`.
- **Mocks Root label** bound to `tree.mocksRoot` (FolderTree.tsx:220, MocksRootSettings.tsx:23) — not hardcoded (AC-2).
- **Delete copy** matches AC-14 verbatim ("Delete this mapping? This removes the file from disk.").
- **`data-testid` coverage** — all canonical DESIGN.md ids present verbatim (save/discard/
  rename/duplicate/delete, tabs, copy-json, breadcrumb, file-name modal + input, discard-guard
  dialog + confirm/cancel, settings mocks-root set). Extra ids (`-empty` suffixes) are additive.

---

## Findings

### MAJOR

#### M-1 — Cross-feature import violates the story's explicit Anti-Patterns table
**File:** `src/client/src/features/settings/components/MocksRootSettings.tsx:2`
**AC/Rule:** Anti-Patterns table ("Cross-feature imports → `components/shared/` or `lib/`");
DoD gate 7 ("No new critical anti-patterns"); Dev Notes "Feature folders are self-contained".
**Description:** A `features/settings` component imports
`useMappingsTree` from `@/features/mappings/hooks/useMappingsTree`. This is exactly the
cross-feature coupling the story forbids. AC-21 explicitly allows reading the path from
"a settings source" as an alternative, so the dependency is avoidable.
**Recommended fix:** Move the Mocks Root source out of the mappings feature — either expose
`mocksRoot` from a settings/config endpoint/hook, or lift the shared tree-query hook into
`lib/` (e.g. `lib/useMocksRoot.ts`) so neither feature imports the other's internals.

#### M-2 — Folder-tree keyboard focus index is computed incorrectly for multi-service trees (AC-20)
**File:** `src/client/src/features/mappings/components/FolderTree.tsx:154` (`myIndex={myIndex + idx + 1}`)
**AC:** AC-20 (arrow keys move node focus; Enter opens).
**Description:** The flat focus index passed to children is `parentIndex + childIdx + 1`,
which does not account for the number of descendants rendered by preceding siblings. With
more than one expanded service folder, child indices from different subtrees collide/overlap.
The arrow-key handler (`FolderTree.tsx:182-195`) drives DOM focus by `querySelectorAll`
order (correct), but `setFocusedIndex` / `isFocused` / `tabIndex` use the broken index, so
the visible focus ring and roving `tabIndex` desync from the actually-focused element once
the tree has multiple expanded folders. Only single-service trees behave correctly (which is
why current unit tests pass).
**Recommended fix:** Stop threading a manual index. Compute focus against the live, ordered
`querySelectorAll("[role='treeitem']")` node list (the handler already does), and derive
`isFocused`/`tabIndex` from a ref-tracked active element or from a flattened, pre-order list
of visible nodes built once per render — not from per-subtree arithmetic.

#### M-3 — Duplicate does not increment suffix on collision; second duplicate fails (AC-15)
**Files:** `src/client/src/features/mappings/hooks/useMappingMutations.ts:132-153` (`useDuplicateFile`),
`useMappingMutations.ts:165-174` (`makeCopyPath`), `MappingEditor.tsx:264-281`.
**AC:** AC-15 + Dev Notes "Rename/Duplicate composition" + Error-codes table
("on Duplicate, increment suffix and retry").
**Description:** `makeCopyPath` only ever produces `{base}_copy{ext}`. Duplicating the same
file twice POSTs the same `_copy` path; the backend returns 409 `MAPPING_FILE_EXISTS` and
the code merely shows an error toast. The story mandates detecting the 409 and retrying with
`_copy_2.json`, `_copy_3.json`, etc.
**Recommended fix:** In `useDuplicateFile`, catch `ApiError` with code `MAPPING_FILE_EXISTS`
and retry the POST with an incremented suffix (loop with a sane cap), or pre-check the tree
for existing copies and choose the next free suffix before POSTing.

#### M-4 — Fragile unit-test isolation: leaked `mockResolvedValueOnce` + `clearAllMocks`
**File:** `src/client/tests/unit/features/settings/settings.test.tsx:215` (added in this story),
interacting with `settings.test.tsx:68` (`beforeEach(() => vi.clearAllMocks())`) and the
ActivitySettings guard test at `settings.test.tsx:250-272`.
**Description:** The new "mocks-root nav" test queues
`mockApiFetch.mockResolvedValueOnce({ mocksRoot, children })`. `MocksRootSettings` consumes
this via React Query asynchronously; if the queued value is not consumed within the test, it
leaks. `vi.clearAllMocks()` (used in `beforeEach`) does **not** clear queued `*Once`
implementations (only `resetAllMocks`/`mockReset` does), so a later test
(`isTogglingHeaders guard`) can consume the stale resolved value, making its first toggle
resolve immediately and the second click fire a real second `apiFetch` → asserts 1 call,
gets 2. Reproduced deterministically with
`vitest run settings.test.tsx story-4-2-mappings-crud.test.tsx` (1 failed). The full
`vitest run` passes only because file-level worker isolation hides the leak — i.e. this is a
latent flake sensitive to sharding/ordering, not a stable green.
**Recommended fix:** Switch the suite's `beforeEach` to `vi.resetAllMocks()` (or add an
explicit `mockApiFetch.mockReset()`), and ensure the mocks-root test awaits consumption of
its queued value (e.g. `await screen.findBy...` on rendered tree content) so nothing leaks.
Also note line 16 and line 20 register `vi.mock("@/lib/api", ...)` twice — collapse to one.

### MINOR

#### m-1 — AC-19 "service-with-no-files" empty state omits the service name
**File:** `src/client/src/features/mappings/pages/MappingsPage.tsx:408-448`
AC-19 specifies the no-files empty state shows "the service name + `bi-file-earmark-plus` +
'No mappings yet' + buttons". The service name is not rendered. Add it.

#### m-2 — AC-2 service-node `title`/tooltip with real filesystem path is missing
**File:** `src/client/src/features/mappings/components/FolderTree.tsx:90-137`
AC-2 requires service nodes to "show the service display name with the real filesystem path
in a `title`/tooltip." No `title` attribute is set on any tree node. Add `title={node.path}`
(or absolute path) to service/folder rows.

#### m-3 — Dirty flag is set imperatively, never cleared by content equality (AC-8 / Task 5.1)
**Files:** `MappingEditor.tsx:122-143`, `MappingsPage.tsx:135-151`
Any edit calls `onDirtyChange(true)`; editing a field and reverting it to the saved value
still shows the dirty dot/italic. Task 5.1 specifies "comparing edit buffer vs last-saved
content." Compute dirty by comparing serialized `editBuffer` against `savedContent`.

#### m-4 — Invalid-JSON typing in Raw tab silently drops the keystroke from the buffer (AC-7 edge)
**File:** `src/client/src/features/mappings/components/MappingEditor.tsx:131-143`
On unparseable JSON, `handleRawChange` marks dirty but does not update the buffer, so a Save
while mid-edit persists the last *valid* parse, not what is on screen. Consider holding raw
text in a buffer and validating on save/tab-switch, or disabling Save while JSON is invalid
with a visible hint.

#### m-5 — Copy JSON failure is swallowed with no feedback (AC-17)
**File:** `src/client/src/features/mappings/components/RawJsonTab.tsx:16-22`
Clipboard failure is silently ignored. Surface an error (or success) toast so the action is
not a silent no-op.

#### m-6 — Two independent toast stacks / `useToast` instances can overlap
**Files:** `MappingsPage.tsx:104,504` (`PageToastList`) and `MappingEditor.tsx:111,472` (`ToastList`)
Create-file toasts render from the page instance; save/delete/rename/duplicate from the
editor instance — two fixed bottom-right containers that can visually stack on top of each
other. Consider a single shared toast outlet.

#### m-7 — `NavigationGuard` patches global `window.history` via an ErrorBoundary fallback
**File:** `src/client/src/features/mappings/components/NavigationGuard.tsx:118-199,216-244`
The history-patching fallback exists to make `useBlocker` testable under `MemoryRouter`. It
monkey-patches `window.history.pushState/replaceState` globally and is reached by catching a
thrown hook error in an ErrorBoundary. In production with `createBrowserRouter` the real
`useBlocker` path runs, so this is dormant — but production code reshaping global history to
serve tests is a smell. Prefer testing the guard with a data router (`createMemoryRouter`)
and dropping the fallback, or isolate the fallback behind a test-only flag.

---

## Test-quality assessment of MODIFIED existing tests

- `Story4_1_MappingsEndpointsTests.cs` — changes are almost entirely mojibake→em-dash
  encoding fixes, import reordering, one fluent-assertion API swap
  (`HaveCountGreaterThanOrEqualTo` → `Count.Should().BeGreaterThanOrEqualTo`), and a comment
  clarification on the SignalR test. **No coverage weakened or disabled.** The pre-existing
  AC-16 `Skip` was retained, not newly added.
- `FishtankWebApplicationFactory.cs` — adds cleanup of the temp `_testMocksRoot` on dispose;
  the AC-11/4-1 service-registration is intact (`FISHTANK_MOCKS_ROOT` wired at lines 41-44).
  The "restored deleted service-registration block" fix is sound — no similar damage found
  elsewhere. The 7 Story 4.2 integration tests pass against this factory.
- `settings.test.tsx` — updated to assert the new `settings-mocks-root` section instead of
  the placeholder; legitimate, but introduces the M-4 isolation fragility.
- `api.test.ts` — `""` → `"http://localhost/"` matches the new location stub default and
  still asserts "no redirect occurred." Legitimate, not a weakening.
- `stub-pages.test.tsx` — drops the obsolete `/mappings` heading assertion (the placeholder
  heading is gone) and wraps the page in Router+QueryClient providers. Acceptable; real
  coverage moved to the dedicated `tests/unit/features/mappings/*` suites.
- `setup.ts` — location-stub default change with a clear rationale (MSW relative-URL
  resolution). Legitimate.
- `handlers.ts` — adds the 5 mappings endpoints (DoD gate 6 satisfied). Note the GET/PUT/
  DELETE content handlers use `:path` (single segment), not a catch-all, so nested paths
  fall through unless a test overrides via `server.use()`. Minor brittleness, not a defect.

## DoD gate status (locally verifiable)

| # | Gate | Result |
|---|---|---|
| 2 | Backend integration tests (incl. new GET {path}) | PASS (7/7 Story 4.2 tests) |
| 3 | TypeScript builds clean | PASS (`tsc -b` exit 0) |
| 4 | .NET builds clean | PASS (0 errors; NU1903 NuGet advisory warnings are pre-existing, package-level) |
| 5 | Every new UI element has a `data-testid` | PASS (canonical ids verbatim) |
| 6 | msw handlers updated in same PR | PASS |
| 7 | No new critical anti-patterns | PARTIAL — M-1 cross-feature import |
| — | `vitest run` full suite | PASS (491/491); M-4 is an ordering-sensitive latent flake |

## Gate decision

**PASS** — zero BLOCKERs. Security-critical content endpoint is correct and tested; build and
test gates are green under the canonical commands. Recommend fixing **M-1** (anti-pattern /
DoD gate 7), **M-2** (keyboard-nav focus desync, AC-20), **M-3** (Duplicate suffix increment,
AC-15), and **M-4** (test isolation) before merge, and triaging the MINOR items.
