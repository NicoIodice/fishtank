---
workflowStatus: 'complete'
totalSteps: 5
stepsCompleted:
  - step-01-detect-mode
  - step-02-load-context
  - step-03-risk-and-testability
  - step-04-coverage-plan
  - step-05-generate-output
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-06-28'
workflowType: 'testarch-test-design'
mode: 'epic-level'
epic: 4
epicTitle: 'Mappings, Mock Capture & Recording'
inputDocuments:
  - _bmad-output/project-context.md
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/test-artifacts/test-design/test-design-epic-3.md
---

# Test Design: Epic 4 — Mappings, Mock Capture & Recording

**Date:** 2026-06-28
**Author:** Murat (Master Test Architect)
**Status:** Draft
**Project:** Fishtank
**Epic Reference:** Epic 4 (v0.4.0)
**PRD FRs:** FR-14, FR-15, FR-16, FR-17, FR-18, FR-19, FR-20, FR-21, FR-28

---

## Executive Summary

**Scope:** Epic-level test design for Epic 4 — Mappings, Mock Capture & Recording

Epic 4 delivers the file management and mock capture layer for Fishtank: a dual-pane Mappings explorer (folder tree + editor), full file CRUD operations on volume-mounted Mapping/Response files, the Resync engine with conflict detection, "Save as Mock" from proxied requests, Record mode for auto-capture, and navigation/sign-out guards for unsaved state. This epic builds on the SignalR infrastructure from Epics 1–3, introduces the `IFileWatcher` abstraction, and completes the `HUB_INVALIDATION_MAP` seam with `ResyncCompleted`.

**Stories in Scope:**

| Story | Title | FRs |
|-------|-------|-----|
| **4-1** | Mappings File Backend — CRUD, IFileWatcher & Resync Engine | FR-17, FR-18, FR-20, FR-22 |
| **4-2** | Mappings File Explorer & Dual-Mode Editor | FR-17, FR-18, FR-19, FR-21 |
| **4-3** | Resync UI with Toast Feedback & Conflict Banners | FR-20 |
| **4-4** | Save As Mock — Mock Suggestion Modal | FR-14, FR-15 |
| **4-5** | Record Mode & Cross-Screen Recording Indicator | FR-16 |
| **4-6** | Navigation Guard & Sign-Out Protection | FR-21, FR-28 |

**Risk Summary:**

- Total risks identified: **7**
- High-priority risks (≥6): **2**
- Medium-priority risks (3–5): **4**
- Low-priority risks (1–2): **1**
- Critical categories: DATA, TECH, UX, SEC

**Coverage Summary:**

- P0 scenarios: 14 (~10–14 hours)
- P1 scenarios: 24 (~14–20 hours)
- P2/P3 scenarios: 10 (~5–8 hours)
- **Total effort**: ~29–42 hours (~4–6 days)

---

## Not in Scope

| Item | Reasoning | Mitigation |
|------|-----------|------------|
| **On-demand seed import via Admin Console** | FR-5 on-demand path — Admin Console UI wired in Epic 5 | Backend tested in Story 4-1; UI deferred to Epic 5 |
| **Settings → Mocks Root edit UI** | Story 4-2 establishes read-only display; edit path requires Resync coordination | Display-only tested; edit-with-validation deferred to Epic 5 enhancement |
| **Activity log filter persistence** | Activity filters are session-only (Epic 3) | N/A — by design |
| **File versioning / undo history** | v1 does not support file version history | User must manage via git or external backup |
| **Full WCAG 2.1 AA audit** | Spot-check only; full audit is PSG-2 (pre-ship gate) | Axe-core spot-check on Mappings screen |

---

## Risk Assessment

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Prob | Impact | Score | Mitigation | Owner | Timeline |
|---------|----------|-------------|------|--------|-------|------------|-------|----------|
| **R-E4-001** | **DATA** | FileSystemWatcher race conditions — external file modification detected but conflict banner shows stale state due to concurrent Resync; user loses unsaved work | 2 | 3 | **6** | `IFileWatcher` abstraction with `FakeFileWatcher` for deterministic tests; `ConcurrentDictionary` for `_lastKnownModified`; `SemaphoreSlim(1,1)` guard on `ResyncAsync()`; integration test simulating concurrent external modification + Resync | Nico / Dev | Before Story 4-1 complete |
| **R-E4-002** | **UX** | Navigation guard bypassed — React Router `useBlocker` not intercepting all navigation paths (browser back, logo click, sidebar nav); unsaved changes lost silently | 2 | 3 | **6** | E2E tests covering all navigation trigger types: (1) sidebar nav click, (2) logo click, (3) browser back button, (4) direct URL entry, (5) sign-out; assert confirmation dialog appears in all cases with unsaved state | Nico / QA | Before Story 4-6 complete |

### Medium-Priority Risks (Score 3–5)

| Risk ID | Category | Description | Prob | Impact | Score | Mitigation | Owner |
|---------|----------|-------------|------|--------|-------|------------|-------|
| **R-E4-003** | TECH | Resync concurrency — multiple simultaneous `POST /api/resync` calls cause interleaved `_lastKnownModified` updates, corrupting conflict detection state | 2 | 2 | 4 | `SemaphoreSlim` guard returns HTTP 409 `RESYNC_IN_PROGRESS` for concurrent calls; integration test: parallel Resync requests → first succeeds, second receives 409 | Nico / Dev |
| **R-E4-004** | DATA | File write failure silently dropped — disk error or permission denied not surfaced to user; System Event created but user unaware | 2 | 2 | 4 | Integration test: simulate disk write failure → assert System Event created AND error toast shown; E2E: verify toast renders with actionable message | Nico / QA |
| **R-E4-005** | SEC | Path traversal in file operations — `PUT /api/mappings/{path}` accepts `../` sequences allowing writes outside Mocks Root | 2 | 2 | 4 | Unit tests on path sanitization: `../` sequences stripped; integration test: attempt path traversal → HTTP 400 `MAPPING_PATH_INVALID` | Nico / Dev |
| **R-E4-006** | TECH | Record mode gap — SignalR disconnect during recording causes missed proxied requests with no user visibility | 2 | 2 | 4 | Integration test: simulate disconnect → reconnect → assert System Event logged with gap duration; E2E: verify badge changes to warning state during disconnect | Nico / QA |

### Low-Priority Risks (Score 1–2)

| Risk ID | Category | Description | Prob | Impact | Score | Action |
|---------|----------|-------------|------|--------|-------|--------|
| **R-E4-007** | OPS | FSW buffer overflow on bulk file copy (Windows) — events dropped silently with no user feedback | 1 | 2 | 2 | Set `InternalBufferSize = 65536` on each watcher; register `watcher.Error` handler → log `ENGINE_FSW_BUFFER_OVERFLOW` warning; document in README |

### Risk Category Legend

- **TECH**: Technical/Architecture (flaws, integration, scalability)
- **SEC**: Security (access controls, auth, data exposure)
- **DATA**: Data Integrity (loss, corruption, inconsistency)
- **UX**: User Experience (navigation, state management)
- **OPS**: Operations (deployment, config, monitoring)

---

## NFR Planning

**Purpose:** Capture Epic 4–specific NFR thresholds, planned validation, and evidence expected for later `nfr-assess`.

| NFR Category | Requirement / Threshold | Risk Link | Planned Validation | Evidence Needed |
|--------------|-------------------------|-----------|-------------------|-----------------|
| **Performance** | Resync <1s for <200 files (NFR-2) | R-E4-003 | Integration test with 200-file fixture; assert elapsed ≤1000ms | Test report with duration |
| **Performance** | UI initial load <2s (NFR-1) | — | Playwright Lighthouse audit on Mappings page | Lighthouse report (nightly CI) |
| **Data Integrity** | Unsaved changes never silently discarded (FR-20) | R-E4-001 | Integration + E2E tests covering all conflict scenarios | Test pass + coverage report |
| **Security** | File write operations require authentication (NFR-8) | — | Integration test: unauthenticated `PUT /api/mappings/{path}` → 401 | Test report |
| **Security** | Path traversal blocked (R-E4-005) | R-E4-005 | Unit + integration tests on path sanitization | Test pass |
| **Accessibility** | Keyboard navigation in folder tree (NFR-19) | — | Playwright keyboard-only E2E: arrow keys navigate tree, Enter opens file | E2E test pass |
| **Accessibility** | prefers-reduced-motion (NFR-21) | — | Playwright with `prefers-reduced-motion: reduce` emulation; assert no animation on Recording badge | E2E test pass |
| **Reliability** | Destructive actions require confirmation (NFR-15) | — | E2E: Delete file → confirmation dialog required; no optimistic delete | E2E test pass |

**Unknown thresholds:** None — all thresholds are specified in PRD.

---

## Entry Criteria

- [x] Epic 3 complete — Activity log operational with real-time SignalR push
- [x] `ServicesHub.cs`, `EventsHub.cs`, `ActivityHub.cs` operational (SignalR infrastructure from Epics 2–3)
- [x] `<DataTable>` base component with row-detail variants complete (Epic 3)
- [x] React Query + SignalR seam (`queryClient.ts` + `HUB_INVALIDATION_MAP`) established (Epic 1)
- [x] WireMock engine serving traffic with proxied requests logged (Epic 2 + 3)
- [ ] Test environment: Fishtank container running at `http://localhost:5000/health` → 200
- [ ] At least one mock service with Mapping/Response files on disk (volume-mounted)

## Exit Criteria

- [ ] All P0 tests passing
- [ ] All P1 tests passing (or failures triaged with fix stories)
- [ ] No open P0/P1 bugs related to FR-14 through FR-21, FR-28
- [ ] Resync performance (NFR-2) validated at ≤1s for 200 files
- [ ] All navigation guard paths (R-E4-002) validated via E2E
- [ ] Path traversal protection (R-E4-005) validated via unit + integration tests
- [ ] `IFileWatcher` abstraction + `FakeFileWatcher` test harness operational
- [ ] `HUB_INVALIDATION_MAP` updated with `ResyncCompleted: [["mappings"]]`

---

## Test Coverage Plan

### Story 4-1: Mappings File Backend — CRUD, IFileWatcher & Resync Engine

**FRs:** FR-17 (folder tree backend), FR-18 (file CRUD), FR-20 (Resync), FR-22 (System Events)

| Test Level | Test Scenario | Priority | Risk Link | Owner | Notes |
|------------|---------------|----------|-----------|-------|-------|
| **Unit** | Path sanitization rejects `../` sequences | P0 | R-E4-005 | DEV | Security: path traversal |
| **Unit** | Path sanitization rejects absolute paths outside Mocks Root | P0 | R-E4-005 | DEV | Security |
| **Unit** | Path sanitization allows valid relative paths | P1 | — | DEV | Positive case |
| **Unit** | `IFileWatcher.cs` interface defines required callbacks: Created, Changed, Deleted, Renamed | P1 | R-E4-001 | DEV | Abstraction contract |
| **Unit** | `FakeFileWatcher` triggers callbacks synchronously for test determinism | P0 | R-E4-001 | DEV | Test harness |
| **Integration** | `GET /api/mappings` returns folder tree structure | P0 | — | QA | FR-17 backend |
| **Integration** | `POST /api/mappings` creates file on disk | P0 | — | QA | FR-18 |
| **Integration** | `PUT /api/mappings/{path}` updates file on disk | P0 | — | QA | FR-18 |
| **Integration** | `DELETE /api/mappings/{path}` removes file from disk | P0 | — | QA | FR-18 |
| **Integration** | File write failure creates System Event + returns error | P1 | R-E4-004 | QA | FR-22 |
| **Integration** | `POST /api/resync` reloads all files and returns counts | P0 | — | QA | FR-20 backend |
| **Integration** | Resync detects externally modified file → conflict flag in response | P1 | R-E4-001 | QA | FR-20 conflict detection |
| **Integration** | Concurrent Resync calls → first succeeds, second returns 409 | P1 | R-E4-003 | QA | Concurrency guard |
| **Integration** | Resync <200 files completes in ≤1000ms | P1 | — | QA | NFR-2 |
| **Integration** | Path traversal attempt → HTTP 400 `MAPPING_PATH_INVALID` | P0 | R-E4-005 | QA | Security |
| **Integration** | Unauthenticated `PUT /api/mappings/{path}` → HTTP 401 | P1 | — | QA | NFR-8 |
| **Integration** | `ResyncCompleted` SignalR event broadcast on Resync success | P1 | — | QA | Architecture D7 |

**Test Count:** 17 | **Effort:** ~8–12 hours

---

### Story 4-2: Mappings File Explorer & Dual-Mode Editor

**FRs:** FR-17 (folder tree UI), FR-18 (file CRUD UI), FR-19 (dual-mode editor), FR-21 (navigation guard)

| Test Level | Test Scenario | Priority | Risk Link | Owner | Notes |
|------------|---------------|----------|-----------|-------|-------|
| **Component** | Folder tree renders Mocks Root → service folders → mappings/ → responses/ → files | P0 | — | DEV | FR-17 |
| **Component** | Root label displays configured Mocks Root path (not hardcoded) | P1 | — | DEV | FR-17 |
| **Component** | Active file highlighted with brand-color left border | P1 | — | DEV | UX-DR11 |
| **Component** | Expand/collapse state preserved for session | P2 | — | DEV | FR-17 |
| **Component** | File click loads content in editor pane | P0 | — | DEV | FR-17 |
| **Component** | Form view displays common Mapping fields | P1 | — | DEV | FR-19 |
| **Component** | Raw JSON tab renders CodeMirror with `lang-json` + `theme-one-dark` | P0 | — | DEV | FR-19 |
| **Component** | Tab switch preserves unsaved changes | P0 | — | DEV | FR-19 |
| **Component** | Unsaved indicator: `●` dot + italic filename | P1 | — | DEV | FR-18 |
| **Component** | Save and Discard buttons enabled only with unsaved changes | P1 | — | DEV | FR-18 |
| **Component** | Delete file shows confirmation dialog | P0 | — | DEV | NFR-15 |
| **Component** | Create file with no service selected → service-selection dropdown | P1 | — | DEV | FR-18 |
| **E2E** | Navigate to Mappings → folder tree renders with configured services | P0 | — | QA | FR-17 |
| **E2E** | Create new mapping file → file appears in tree + on disk | P1 | — | QA | FR-18 |
| **E2E** | Edit file → Save → file updated on disk | P1 | — | QA | FR-18 |
| **E2E** | Delete file → confirmation → file removed from tree + disk | P1 | — | QA | FR-18 |
| **E2E** | Rename file → tree updates + disk renamed | P2 | — | QA | FR-18 |
| **E2E** | Duplicate file → new file created with suffix | P2 | — | QA | FR-18 |
| **E2E** | Write failure → error toast shown with actionable message | P1 | R-E4-004 | QA | FR-22 |
| **E2E** | Keyboard navigation: arrow keys navigate tree | P1 | — | QA | NFR-19 |

**Test Count:** 20 | **Effort:** ~10–14 hours

---

### Story 4-3: Resync UI with Toast Feedback & Conflict Banners

**FRs:** FR-20 (Resync UI, conflict detection, toast feedback)

| Test Level | Test Scenario | Priority | Risk Link | Owner | Notes |
|------------|---------------|----------|-----------|-------|-------|
| **Component** | Resync button shows spinner + disabled state during operation | P1 | — | DEV | FR-20 |
| **Component** | In-progress toast: "Resyncing…" shown during operation | P1 | — | DEV | FR-20 |
| **Component** | Success toast: "{M} mappings and {R} responses loaded in {duration}" | P0 | — | DEV | FR-20 |
| **Component** | Success toast auto-dismisses after 4s | P2 | — | DEV | FR-20 |
| **Component** | Duration format: <10000ms → `{N}ms`; ≥10000ms → `{N}s`; ≥60000ms → `{N}m {N}s` | P2 | — | DEV | FR-20 |
| **Component** | Zero files loaded toast: "0 files loaded in {duration} — check your Mocks Root path" | P1 | — | DEV | FR-20 |
| **Component** | Failure toast: shows error reason; Resync button re-enables | P1 | — | DEV | FR-20 |
| **Component** | Partial success: loaded count in success toast + error toasts for failures | P2 | — | DEV | FR-20 |
| **Component** | File deleted externally → "File no longer exists on disk." banner with Close action | P1 | R-E4-001 | DEV | FR-20 |
| **Component** | File modified externally WITH local changes → conflict banner with "View disk version" + "Keep my edits" | P0 | R-E4-001 | DEV | FR-20 |
| **Component** | File modified externally WITHOUT local changes → silent reload | P1 | R-E4-001 | DEV | FR-20 |
| **E2E** | Click Resync → success toast with correct counts | P0 | — | QA | FR-20 |
| **E2E** | External file modification during edit → conflict banner appears after Resync | P1 | R-E4-001 | QA | FR-20 |
| **E2E** | "Keep my edits" preserves local changes; "View disk version" replaces editor content | P1 | R-E4-001 | QA | FR-20 |

**Test Count:** 14 | **Effort:** ~6–10 hours

---

### Story 4-4: Save As Mock — Mock Suggestion Modal

**FRs:** FR-14 (Save as Mock action), FR-15 (Mock Suggestion modal)

| Test Level | Test Scenario | Priority | Risk Link | Owner | Notes |
|------------|---------------|----------|-----------|-------|-------|
| **Component** | `bi-lightning-charge` "Save as Mock" visible only on proxied rows | P0 | — | DEV | FR-14 |
| **Component** | "Save as Mock" not visible on Mocked rows | P1 | — | DEV | FR-14 |
| **Component** | Modal opens pre-populated with proxied request data | P0 | — | DEV | FR-14 |
| **Component** | Mapping JSON block: WildcardMatcher, method, BodyAsFile, UseTransformer: true | P1 | — | DEV | FR-15 |
| **Component** | Response body block pre-populated from proxied response | P1 | — | DEV | FR-15 |
| **Component** | Default Response filename: `{method}_{path-slugified}_{status}_body.json` | P1 | — | DEV | FR-15 |
| **Component** | Status mismatch shows non-blocking inline note | P2 | — | DEV | FR-15 |
| **Component** | UseTransformer checkbox toggles `Response.UseTransformer` value | P2 | — | DEV | FR-15 |
| **Component** | Both blocks have syntax highlighting (lighter than CodeMirror) | P2 | — | DEV | FR-15 |
| **Integration** | Save mock writes Mapping + Response files to disk | P0 | — | QA | FR-14 |
| **Integration** | Duplicate save (same suggestion ID) returns existing file path — idempotent | P1 | — | QA | Architecture FR-14-16 flow |
| **E2E** | Proxied row → Save as Mock → modal opens → Save → files on disk + folder tree updates | P0 | — | QA | FR-14 |
| **E2E** | Save failure → System Event created + modal stays open with error | P1 | R-E4-004 | QA | FR-14 |
| **E2E** | Row detail panel "Save as Mock" action opens modal | P1 | — | QA | FR-9 + FR-14 |

**Test Count:** 14 | **Effort:** ~6–10 hours

---

### Story 4-5: Record Mode & Cross-Screen Recording Indicator

**FRs:** FR-16 (Record mode, recording badge, cross-screen indicator)

| Test Level | Test Scenario | Priority | Risk Link | Owner | Notes |
|------------|---------------|----------|-----------|-------|-------|
| **Component** | "● Record" button activates Record mode; changes to "⏹ Stop" | P0 | — | DEV | FR-16 |
| **Component** | Recording badge (amber) appears in Network Activity header | P0 | — | DEV | FR-16 |
| **Component** | "⏹ Stop" deactivates mode; badge hides immediately (no animation) | P1 | — | DEV | FR-16 |
| **Component** | Cross-screen indicator appears in top bar when navigated away from `/activity` | P0 | — | DEV | FR-16 |
| **Component** | Cross-screen indicator: `role="button"`, `aria-label`, keyboard-accessible | P1 | — | DEV | NFR-19 |
| **Component** | SignalR disconnect → badge shows "⚠ Recording paused — connection lost" | P1 | R-E4-006 | DEV | FR-16 |
| **Component** | SignalR reconnect → badge returns to "● Recording" | P1 | R-E4-006 | DEV | FR-16 |
| **Component** | `prefers-reduced-motion` → Recording badge does not animate | P1 | — | DEV | NFR-21 |
| **Integration** | Record mode active + proxied request → Mapping + Response files auto-written | P0 | — | QA | FR-16 |
| **Integration** | SignalR reconnect after disconnect → System Event with gap duration | P1 | R-E4-006 | QA | FR-16 |
| **E2E** | Activate Record mode → make proxied request → files appear on disk without user action | P0 | — | QA | FR-16 |
| **E2E** | Navigate away from `/activity` with Record mode active → top bar indicator visible | P1 | — | QA | FR-16 |
| **E2E** | Click cross-screen indicator → navigates to `/activity` | P1 | — | QA | FR-16 |
| **E2E** | Indicator not visible on `/login` or `/setup` | P2 | — | QA | FR-16 |

**Test Count:** 14 | **Effort:** ~6–10 hours

---

### Story 4-6: Navigation Guard & Sign-Out Protection

**FRs:** FR-21 (navigation guard), FR-28 (sign-out protection)

| Test Level | Test Scenario | Priority | Risk Link | Owner | Notes |
|------------|---------------|----------|-----------|-------|-------|
| **Component** | Unsaved Mapping edits + route change → confirmation dialog via `useBlocker` | P0 | R-E4-002 | DEV | FR-21 |
| **Component** | Confirmation dialog: "Discard and navigate" vs "Stay" options | P1 | R-E4-002 | DEV | FR-21 |
| **Component** | Sign-out with unsaved Mapping edits → dialog title "Sign out?", body mentions Mappings | P0 | — | DEV | FR-28 |
| **Component** | Sign-out with pending Mocks Root path → dialog body mentions Mocks Root | P1 | — | DEV | FR-28 |
| **Component** | Sign-out with both unsaved Mapping + Mocks Root → combined message | P1 | — | DEV | FR-28 |
| **Component** | Sign-out with in-progress Add/Edit Service modal → body includes "form data" mention | P2 | — | DEV | FR-28 |
| **Component** | No unsaved state → sign-out proceeds immediately, no dialog | P0 | — | DEV | FR-28 |
| **E2E** | Unsaved edit + sidebar nav click → confirmation dialog appears | P0 | R-E4-002 | QA | FR-21 |
| **E2E** | Unsaved edit + logo click → confirmation dialog appears | P1 | R-E4-002 | QA | FR-21 |
| **E2E** | Unsaved edit + browser back button → confirmation dialog appears | P1 | R-E4-002 | QA | FR-21 |
| **E2E** | Unsaved edit + sign-out → "Sign out?" dialog appears | P0 | — | QA | FR-28 |
| **E2E** | Dialog Cancel → user stays on page, edits preserved | P1 | — | QA | FR-21 |
| **E2E** | Dialog "Sign out" → session ends, redirect to `/login` | P1 | — | QA | FR-28 |

**Test Count:** 13 | **Effort:** ~5–8 hours

---

## Coverage Summary by Priority

### P0 (Critical) — Run on every commit

**Criteria:** Blocks core journey + High risk (≥6) + No workaround

| Requirement | Test Level | Risk Link | Test Count | Owner |
|-------------|------------|-----------|------------|-------|
| Path sanitization (security) | Unit | R-E4-005 | 2 | DEV |
| `FakeFileWatcher` test harness | Unit | R-E4-001 | 1 | DEV |
| File CRUD backend (GET, POST, PUT, DELETE) | Integration | — | 4 | QA |
| Resync backend | Integration | — | 1 | QA |
| Path traversal blocked | Integration | R-E4-005 | 1 | QA |
| Mock save writes files | Integration | — | 1 | QA |
| Record mode auto-writes files | Integration | — | 1 | QA |
| Folder tree renders | Component | — | 1 | DEV |
| File loads in editor | Component | — | 1 | DEV |
| Tab switch preserves changes | Component | — | 1 | DEV |
| Raw JSON CodeMirror | Component | — | 1 | DEV |
| Delete confirmation dialog | Component | — | 1 | DEV |
| Conflict banner with options | Component | R-E4-001 | 1 | DEV |
| Success toast format | Component | — | 1 | DEV |
| Save as Mock on proxied only | Component | — | 1 | DEV |
| Modal opens pre-populated | Component | — | 1 | DEV |
| Record button activates mode | Component | — | 1 | DEV |
| Recording badge visible | Component | — | 1 | DEV |
| Cross-screen indicator | Component | — | 1 | DEV |
| Navigation guard fires | Component | R-E4-002 | 1 | DEV |
| Sign-out guard fires | Component | — | 1 | DEV |
| No unsaved state = no dialog | Component | — | 1 | DEV |
| Mappings page renders | E2E | — | 1 | QA |
| Save as Mock full flow | E2E | — | 1 | QA |
| Record mode full flow | E2E | — | 1 | QA |
| Resync success toast | E2E | — | 1 | QA |
| Navigation guard via sidebar | E2E | R-E4-002 | 1 | QA |
| Sign-out guard via menu | E2E | — | 1 | QA |

**Total P0:** 32 tests | **Effort:** ~10–14 hours

---

### P1 (High) — Run on PR to release branch

**Criteria:** Important features + Medium risk (3–4) + Common workflows

| Requirement | Test Level | Test Count | Owner |
|-------------|------------|------------|-------|
| Path sanitization positive case | Unit | 1 | DEV |
| IFileWatcher interface contract | Unit | 1 | DEV |
| File write failure → System Event | Integration | 1 | QA |
| External modification → conflict flag | Integration | 1 | QA |
| Concurrent Resync → 409 | Integration | 1 | QA |
| Resync performance (NFR-2) | Integration | 1 | QA |
| Unauthenticated write → 401 | Integration | 1 | QA |
| ResyncCompleted SignalR event | Integration | 1 | QA |
| Duplicate mock save → idempotent | Integration | 1 | QA |
| SignalR reconnect → System Event | Integration | 1 | QA |
| UI components (tree, editor, forms, indicators) | Component | 14 | DEV |
| File CRUD E2E (create, edit, delete) | E2E | 4 | QA |
| Conflict banner E2E | E2E | 2 | QA |
| Save mock failure E2E | E2E | 1 | QA |
| Row detail Save as Mock | E2E | 1 | QA |
| Record mode navigation E2E | E2E | 2 | QA |
| Navigation guard (logo, browser back) | E2E | 2 | QA |
| Sign-out dialog options | E2E | 2 | QA |

**Total P1:** 38 tests | **Effort:** ~14–20 hours

---

### P2/P3 (Medium/Low) — Run nightly/weekly or on-demand

| Requirement | Test Level | Test Count | Priority | Owner |
|-------------|------------|------------|----------|-------|
| Expand/collapse state preserved | Component | 1 | P2 | DEV |
| Toast auto-dismiss timing | Component | 1 | P2 | DEV |
| Duration format variants | Component | 1 | P2 | DEV |
| Partial success toasts | Component | 1 | P2 | DEV |
| Status mismatch inline note | Component | 1 | P2 | DEV |
| UseTransformer checkbox | Component | 1 | P2 | DEV |
| Syntax highlighting (lighter) | Component | 1 | P2 | DEV |
| Rename file E2E | E2E | 1 | P2 | QA |
| Duplicate file E2E | E2E | 1 | P2 | QA |
| Indicator not on login/setup | E2E | 1 | P2 | QA |
| Sign-out with modal open | Component | 1 | P2 | DEV |

**Total P2/P3:** 11 tests | **Effort:** ~5–8 hours

---

## Execution Order

### Smoke Tests (<3 min)

**Purpose:** Fast feedback after deployment; catch build-breaking issues.

1. [ ] `GET /health` → 200 (30s)
2. [ ] `GET /api/mappings` → 200 with folder tree structure (30s)
3. [ ] Navigate to Mappings page → renders without JS errors (1min)
4. [ ] Navigate to Network Activity → Record button visible (30s)

**Total:** 4 scenarios

### P0 Tests (<15 min)

**Purpose:** Critical path validation before merge.

1. [ ] Path sanitization unit tests (2 scenarios)
2. [ ] FakeFileWatcher unit test (1 scenario)
3. [ ] File CRUD integration tests (4 scenarios)
4. [ ] Resync integration test (1 scenario)
5. [ ] Path traversal integration test (1 scenario)
6. [ ] Mock save integration test (1 scenario)
7. [ ] Record mode integration test (1 scenario)
8. [ ] Core UI components (folder tree, editor, tabs, guards) (12 scenarios)
9. [ ] Core E2E flows (mappings page, save mock, record, resync, guards) (6 scenarios)

**Total:** 32 scenarios

### P1 Tests (<25 min)

**Purpose:** Feature coverage for release confidence.

1. [ ] Extended unit tests (2 scenarios)
2. [ ] Extended integration tests (9 scenarios)
3. [ ] UI component coverage (14 scenarios)
4. [ ] E2E feature coverage (12 scenarios)

**Total:** 38 scenarios

---

## Execution Strategy

| Tier | Trigger | Suites | Max Duration |
|------|---------|--------|--------------|
| **PR** | Every push to `story/**`, `feature/**` | Smoke + P0 + P1 (unit, integration, component) | <20 min |
| **Nightly** | Scheduled 02:00 UTC | Full P0–P2 + Lighthouse + Axe-core | <40 min |
| **Weekly** | Scheduled Sunday 06:00 UTC | Full suite + 200-file Resync performance + all 4 themes WCAG | <60 min |

---

## Resource Estimates

| Priority | Test Count | Effort Range |
|----------|------------|--------------|
| P0 | 32 | 10–14 hours |
| P1 | 38 | 14–20 hours |
| P2/P3 | 11 | 5–8 hours |
| **Total** | **81** | **29–42 hours (~4–6 days)** |

**Assumptions:**

- One developer wearing QA hat (solo project)
- Unit + component tests written alongside implementation (dev-owned)
- Integration + E2E tests written post-implementation (QA-owned or dev when solo)
- Estimates exclude CI setup time (already in place from Epic 1)
- `IFileWatcher` abstraction + `FakeFileWatcher` must be completed in Story 4-1 before other stories begin testing

---

## Quality Gates

| Gate | Threshold | Enforcement |
|------|-----------|-------------|
| P0 pass rate | **100%** | PR merge blocked |
| P1 pass rate | **≥95%** | PR merge blocked; failures triaged |
| High-risk mitigations | Complete before Story 4-1 closes | R-E4-001 (FileSystemWatcher abstraction), R-E4-005 (path traversal protection) |
| Code coverage (backend) | **≥80%** MappingService, ResyncService, IFileWatcher | CI coverage report |
| Code coverage (frontend) | **≥80%** `features/mappings/` | CI coverage report |
| Resync performance (NFR-2) | **≤1000ms for 200 files** | Integration test assertion |
| Navigation guard paths (R-E4-002) | **All 5 trigger types pass** | E2E test suite |
| Path traversal (R-E4-005) | **100% of patterns blocked** | Unit + integration tests |
| Axe violations | **0 critical/serious** | Nightly axe-core scan |

---

## Dependencies and Assumptions

### Dependencies

| Dependency | Source | Status |
|------------|--------|--------|
| WireMock engine with proxied requests logged | Epic 2 + 3 | ✅ Complete |
| Activity log with SignalR push | Epic 3 | ✅ Complete |
| `<DataTable>` with row-detail variants | Epic 3 | ✅ Complete |
| `queryClient.ts` + `HUB_INVALIDATION_MAP` | Epic 1 | ✅ Complete |
| `ServicesHub.cs` for `ResyncCompleted` broadcast | Epic 2 | ✅ Complete |
| Volume-mounted Mocks Root | Docker config | ⚠️ Required for tests |
| CodeMirror packages (`@uiw/react-codemirror`, `@codemirror/lang-json`, `@codemirror/theme-one-dark`) | npm | ⚠️ To be installed in Story 4-2 |

### Assumptions

1. `IFileWatcher` abstraction and `FakeFileWatcher` are created in Story 4-1 — all subsequent stories depend on this
2. `ResyncCompleted` is added to `HUB_INVALIDATION_MAP` in Story 4-1 — completes the Epic 1 seam contract
3. Mock Suggestion modal uses lighter syntax highlighting (not full CodeMirror) — implementation detail
4. Settings → Mocks Root is read-only display in v1; edit functionality is a post-v1 enhancement
5. Navigation guard via `useBlocker` requires React Router v6+ (already in project stack)
6. File versioning / undo is out of scope for v1 — users manage via external tools (git)
