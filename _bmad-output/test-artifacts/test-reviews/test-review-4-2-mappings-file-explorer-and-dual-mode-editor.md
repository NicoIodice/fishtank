---
story_key: 4-2-mappings-file-explorer-and-dual-mode-editor
epic: 4
generated: 2026-06-29
reviewer: Master Test Architect (bmad-testarch-test-review)
verdict: pass
quality_score: 91
findings:
  blocker: 0
  major: 1
  minor: 6
gate_decision: PASS
---

# Test Quality Review — Story 4-2: Mappings File Explorer & Dual-Mode Editor

**Scope:** Test quality only (not production code). Reviewed the Vitest+RTL+msw component/unit
suite, the Playwright E2E spec, the xUnit backend integration test, and the msw handlers.

**Verdict: PASS** — zero BLOCKERs. The suite is strong: assertions are behavioural (not
presence-only), the AC↔test mapping is complete with P0 scenarios genuinely covered at the
right layer, and the deterministic-suite configuration (`isolate:false`/`maxWorkers:1`) is
correctly serviced by `server.resetHandlers()` in `src/test/setup.ts`. The one MAJOR is a
tautological assertion line that should be corrected; the MINORs are low-value/coverage-driven
tests and a handful of negative-assertion hard waits.

---

## Quality Score: 91 / 100

| Dimension | Score | Notes |
|---|---|---|
| Assertion strength | 9/10 | Mutations assert request bodies, server confirmation, state non-mutation, error copy. One tautology (`\|\|` expect). |
| Determinism / isolation | 9/10 | `resetHandlers` correct; module-state leak in FolderTree explicitly mitigated with unique paths; two fixed-time negative waits. |
| AC traceability | 10/10 | All 21 ACs mapped; P0s covered at component + E2E. |
| E2E quality | 9/10 | Live stack, self-scoped faker seeds, `skipNetworkMonitoring` correctly scoped to P1-4; one weak delete-from-disk assertion. |
| Test correctness | 9/10 | P1-4/P1-5 genuinely validate AC-16/AC-20; coverage-theater is minimal and honestly documented. |

---

## Findings Summary

| Severity | Count |
|---|---|
| BLOCKER | 0 |
| MAJOR | 1 |
| MINOR | 6 |

### BLOCKER — none

### MAJOR

**M-1 — Tautological assertion: `expect(...) || expect(...)`**
`src/client/tests/unit/features/settings/story-4-2-mocks-root-settings.test.tsx` is the
gap-fill file; the offending construct is in the **ATDD** file
`src/client/tests/unit/features/mappings/story-4-2-settings-mocks-root.test.tsx:155`:

```js
expect(input).toHaveAttribute("readonly") || expect(input).toBeDisabled();
```

The `||` is dead syntax — the first `expect()` returns an assertion object (truthy) and short-
circuits, so the second branch is never evaluated. If the intent was "readonly OR disabled",
this does **not** express that: it asserts only `readonly`, and if `readonly` is absent it
throws before the `||` matters. The test currently passes only because the component happens to
set `readonly`. It is not wrong about the AC outcome, but the assertion does not say what it
appears to say and would mislead a future maintainer who removes `readonly` in favour of
`disabled`.
**Recommended fix:** assert the real intent explicitly, e.g.
`expect(input.hasAttribute("readonly") || (input as HTMLInputElement).disabled).toBe(true);`
The companion gap-fill file already asserts `toHaveAttribute("readonly")` cleanly, so coverage
is not lost — this is purely an assertion-clarity correctness fix. (Not a BLOCKER: the AC-21
read-only behaviour is correctly and unambiguously asserted in
`story-4-2-mocks-root-settings.test.tsx:85-94`.)

### MINOR

**m-1 — AC-3 asserts the proxy attribute, not the brand-color border.**
`story-4-2-mappings-folder-tree.test.tsx:260-270` asserts `data-active="true"` rather than the
spec'd `border-left: ... var(--brand)`. The component drives both from the same `isActive`
boolean, so the proxy is sound, but no test pins the actual UX-DR11 brand-color left-border
style. Consider one assertion on the computed `border-left` / `--brand` token.

**m-2 — AC-13 service-dropdown positive assertion is loose.**
`story-4-2-mappings-crud.test.tsx:391-397` uses
`queryByRole("combobox") || queryByRole("listbox") || queryByText(/select.*service/i)`. The
negative half (file-name modal absent) is strong; the positive half is an over-broad OR. The
`story-4-2-mappings-page-coverage.test.tsx` and `story-4-2-components-unit.test.tsx` files
assert the dialog/combobox precisely, so AC-13 is adequately covered overall — tighten the ATDD
assertion when convenient.

**m-3 — Negative-assertion hard waits.**
`story-4-2-mapping-editor-unit.test.tsx:449` (`setTimeout 50ms` then `putCalled === false`) and
`story-4-2-mappings-crud.test.tsx:746` (`setTimeout 100ms` then guard-dialog absent). Both prove
the *absence* of an effect, which legitimately needs a settle window, but a fixed delay is
mildly fragile under load. Prefer asserting a positive observable side-effect that would only
exist on the wrong path, or `waitFor` on a stable post-condition. Low risk; not a determinism
defect.

**m-4 — Coverage-theater (well-documented, low value).**
`story-4-2-mapping-editor-branch-coverage.test.tsx` contains two tests whose only purpose is to
*document* dead-code branches (`branch 13/17/23` null guards; `branch 2` ToastList info variant)
without exercising new behaviour. They are honest and the author labels them as intentional
gaps; they inflate the test count without adding behavioural protection. Acceptable as
documentation, but they are not meaningful behavioural tests.

**m-5 — E2E delete-from-disk assertion is weak.**
`story-4-2-mappings-explorer-editor.spec.ts:276-282`: after delete it does
`apiFetch(...).catch(e => e)` then `expect(res).toBeTruthy()`. A *successful* 200 would also be
truthy, so this does not actually prove a 404/deletion on disk — the tree-removal assertion
above it is the real check. Recommend asserting the caught error's status is 404 (or that the
resolved body is the not-found envelope).

**m-6 — `story-4-2-settings-mocks-root.test.tsx` (ATDD) renders the whole SettingsPage but
mocks five sibling hooks.** This is appropriate for an AC-21 section test, but it means the test
is coupled to the SettingsPage sub-nav wiring; the focused gap-fill file
`story-4-2-mocks-root-settings.test.tsx` (component-isolated) is the more durable AC-21 test.
No action required — noted for maintenance awareness.

---

## AC ↔ Test Traceability

Layers: **C** = component (Vitest+RTL+msw), **U** = isolated unit, **E** = Playwright E2E,
**I** = xUnit integration. Adequacy: **Strong / Adequate / Weak**.

| AC | Requirement | Test(s) | Layer | Adequacy |
|---|---|---|---|---|
| AC-1 (P0) | Folder tree full hierarchy + per-file testid | folder-tree `AC-1`; components-unit treeitem roles; E2E P0-1 | C, U, E | Strong |
| AC-2 (P1) | Root label = `mocksRoot`, not hardcoded | folder-tree `AC-2` (×2, incl. negative `/mocks` absent + custom-root variant) | C | Strong |
| AC-3 (P1) | Active file brand-color left border, single active | folder-tree `AC-3` (asserts `data-active`, proxy for border) | C | Adequate (m-1) |
| AC-4 (P2) | Expand/collapse persists across re-fetch (session) | folder-tree `AC-4`; components-unit Space-toggle collapse | C, U | Strong |
| AC-5 (P0) | File click → GET content → editor + breadcrumb + lastKnownModified | editor `AC-5`; page-coverage `openFile`; E2E P1-1; **backend** `Story4_2...Returns200WithContentAndMetadata` + nested-path | C, E, I | Strong |
| AC-6 (P0) | Dual-mode tabs; Raw=CodeMirror(lang-json+one-dark); Form fields | editor `AC-6` (×3: tabs, `.cm-editor`/`.cm-content`, Form fields); editor-unit tab aria-selected | C, U | Strong |
| AC-7 (P0) | Tab switch preserves edits; advanced keys not dropped | editor `AC-7` (Form→Raw reflects 404; `extraField` retained); form-tab passthrough of unknown keys | C, U | Strong |
| AC-8 (P1) | Unsaved indicator: ● dot + italic | editor `AC-8`; components-unit `data-dirty`; editor-unit breadcrumb dot | C, U | Strong |
| AC-9 (P1) | Save/Discard enablement rules | editor `AC-9` (×2 clean/dirty); editor-unit button-state | C, U | Strong |
| AC-10 (P0/P1) | Save waits for 200; PUT body {content,lastKnownModified}; success toast; no optimistic | crud `AC-10` (×2, asserts body + indicator clear + toast); editor-unit handleSave; page-coverage; E2E P1-2 (disk verify) | C, U, E | Strong |
| AC-11 | Discard reverts, no network | crud `AC-11` (asserts no PUT + buttons re-disabled); editor-unit handleDiscard valid/invalid JSON | C, U | Strong |
| AC-12 | New Mapping / New Response separate buttons → correct sub-folder + modal | crud `AC-12` (×2); page-coverage New-Response→responses/ POST path | C | Strong |
| AC-13 (P1) | No-service → service dropdown before naming modal | crud `AC-13` (negative strong, positive loose); page-coverage full selector→POST flow | C | Strong (m-2) |
| AC-14 (P0) | Delete confirmation, exact copy, no optimistic delete | crud `AC-14` (×3: copy, cancel-no-DELETE, confirm-removes); editor-unit delete flows; E2E P1-3 | C, U, E | Strong |
| AC-15 | Rename pre-fills + GET→POST→DELETE; Duplicate _copy via GET→POST | crud `AC-15` (×2); editor-unit rename/duplicate + path computation; mutations-coverage useRenameFile/useDuplicateFile + 409 retry + makeCopyPath; E2E P2-1/P2-2 | C, U, E | Strong |
| AC-16 (P1) | Failed write → error toast, state not mutated; no SE created by FE | crud `AC-16` (toast + ● remains); editor-unit error toasts for save/delete/rename/duplicate; page-coverage create error; **E2E P1-4** fault-injected PUT 500 | C, U, E | Strong |
| AC-17 | Copy JSON button copies raw content | editor `AC-17` (clipboard.writeText called with `"method"`) | C | Strong |
| AC-18 (P0) | useBlocker guard scoped to /mappings; confirm/cancel; no-prompt when clean | crud `AC-18` (×2, fallback path); **components-unit BlockerDialog data-router path** (×4 incl. proceed/reset) + fallback (×7) | C, U | Strong |
| AC-19 | Loading skeleton aria-busy; no-service + no-files empty states | folder-tree `AC-19` (skeleton + select-a-service); page-coverage `No mappings yet` + empty-state buttons | C | Strong |
| AC-20 (P1) | Keyboard nav: arrows move focus, Enter opens; aria-labels on icon buttons | folder-tree `AC-20` (aria-labels); components-unit (ArrowUp/Down boundaries, Enter, Space, no-focus Enter); **E2E P1-5** arrow+Enter opens file | C, U, E | Strong |
| AC-21 | Settings → Mocks Root read-only display + edit warning + testids | settings-mocks-root ATDD (×5, incl. M-1 tautology); mocks-root-settings gap-fill (×8: loading, readonly, warning, save-modal, confirm/cancel) | C | Strong |

**Backend (AC-5 / NFR-8 / R-E4-005):** `Story4_2_MappingsContentEndpointTests` covers 200+metadata,
nested catch-all routing, 404 `MAPPING_FILE_NOT_FOUND`, 400 `MAPPING_PATH_INVALID` (traversal),
401 unauthenticated, camelCase serialization (positive + negative on PascalCase), and a
regression guard that `GET /api/mappings` (tree) is not shadowed. **Strong.**

---

## Determinism / Isolation Assessment

- **msw isolation correct.** `src/test/setup.ts` calls `server.resetHandlers()` in `afterEach`,
  so per-test `server.use()` overrides do not leak across the shared worker. RTL `cleanup()` and
  `vi.useRealTimers()` run in `tests/unit/setup.ts` `afterEach`.
- **Module-level state leak is mitigated, not eliminated.** `FolderTree.tsx` holds a module-scope
  `sessionExpandState` Map (by design — session-scoped expand state). `story-4-2-components-unit`
  documents this explicitly and uses **unique per-test service/file paths** for every test that
  mutates expand state, so no cross-test pollution occurs. This is the correct mitigation given
  `isolate:false`. New tests touching FolderTree must follow the same unique-path discipline.
- **No `vi.restoreAllMocks()` in global teardown.** Component tests use locally-scoped `vi.fn()`
  spies (not global module mocks) except `story-4-2-settings-mocks-root.test.tsx`, which uses
  top-of-file `vi.mock(...)` factories — those are hoisted module mocks and are not reset between
  tests, but they are static return values (no call-count assertions across tests), so no leakage
  risk. Acceptable.
- **Hard waits:** two fixed `setTimeout` negative-assertion waits (m-3). Not ordering-dependent;
  low flake risk.
- Consistent with the reported **660/660 deterministic** full-suite result. Nothing in the
  story-4-2 files reintroduces flakiness.

---

## E2E Quality Assessment

- **Live stack, no CRUD mocking.** All CRUD goes through `apiFetch` against the real API; seed
  data is created per-test via `seedService`/`seedMappingFile` with `faker` unique slugs
  (self-scoped, no shared fixtures).
- **Fault-injection scoped correctly.** Only P1-4 uses `page.route()` (PUT→500), and the
  `{ annotation: [{ type: "skipNetworkMonitoring" }] }` is attached to **that single test's**
  options object — not global. Verified: no other test carries the annotation, and the route
  filter only fulfills PUT (others `route.continue()`).
- **P1-5 keyboard test** genuinely validates AC-20: it reaches the file via `ArrowDown`×2 + `Enter`
  and asserts the editor breadcrumb appears — it does not assert on incidental DOM. The pragmatic
  click-to-collapse/expand to seat `focusedPath` before arrowing is sound given the path-based
  focus model in `FolderTree` (focus tracked by `data-node-path`, not index).
- **robust selectors:** `data-testid` throughout; text assertions only for the exact delete copy
  and toast message regex.
- **Weak spot:** P1-3 delete "gone from disk" check (m-5).

---

## Gate Decision

**PASS.** Zero BLOCKERs. All 21 ACs — including every P0 (tree render, file-click→editor, Raw
CodeMirror, tab-switch-preserves-edits, delete confirmation, nav-guard, and the E2E tree render)
— have at least one meaningful, behavioural test at the layer the epic test-design prescribes.
P1-4 (AC-16) and P1-5 (AC-20) genuinely validate their ACs after the harness-whitelist /
a11y-interaction rework. Backend AC-5 is thoroughly covered including the route-shadowing
regression guard and traversal/auth security cases.

The single MAJOR (M-1 tautological `||` assertion) is a correctness-of-expression issue that
does not reduce AC coverage (the same behaviour is asserted cleanly elsewhere) and therefore does
not block the gate; it should be corrected in a follow-up touch. The MINORs are quality nits
(proxy assertions, loose ORs, negative-assertion hard waits, documented coverage-theater, and one
weak E2E disk check) that are safe to address opportunistically.

**Recommended follow-ups (non-blocking):** fix M-1; tighten m-5 (assert 404 on delete) and m-1
(assert brand border once); optionally replace the two negative-assertion `setTimeout`s with
positive post-conditions.
