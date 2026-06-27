---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-06-22'
story_key: 2-2-services-page-browse-create-and-edit-services
story_id: '2.2'
story_file: _bmad-output/implementation-artifacts/2-2-services-page-browse-create-and-edit-services.md
detected_stack: fullstack
generation_mode: ai
---

# ATDD Checklist — Story 2.2: Services Page — Browse, Create & Edit Services

## Phase 1: Preflight & Context

- [x] Stack: `fullstack` (C# / .NET 10 backend + React 19 / TypeScript frontend)
- [x] Framework: Playwright (E2E) + Vitest + RTL (unit)
- [x] Config: `playwright.config.ts` + `vitest.config.ts` both present and configured
- [x] Story file loaded from `_bmad-output/implementation-artifacts/2-2-services-page-browse-create-and-edit-services.md`
- [x] 10 acceptance criteria extracted
- [x] Existing test patterns reviewed (story-1-3-shell.spec.ts, api.test.ts, fixtures/index.ts)

## Phase 2: Generation Mode

- [x] Mode: **AI Generation** (acceptance criteria are clear, standard CRUD + navigation scenarios)
- [x] Browser recording: skipped (no complex UI interactions requiring live recording)

## Phase 3: Test Strategy

### AC → Test Level Mapping

| AC  | Description                                   | Level       | Priority | Test File                                      |
|-----|-----------------------------------------------|-------------|----------|------------------------------------------------|
| AC-1 | Card grid / empty state                      | E2E         | P0       | story-2-2-services-page.spec.ts                |
| AC-2 | Responsive grid columns                       | E2E         | P1       | story-2-2-services-page.spec.ts                |
| AC-3 | Service card content                          | Unit + E2E  | P1       | story-2-2-services-ui.test.tsx + e2e           |
| AC-4 | Table view toggle + sessionStorage            | E2E         | P1       | story-2-2-services-page.spec.ts                |
| AC-5 | Add modal: port pre-fill + path preview       | E2E + Unit  | P0       | story-2-2-services-page.spec.ts + unit         |
| AC-6 | Create service end-to-end                     | E2E         | P1       | story-2-2-services-page.spec.ts                |
| AC-7 | Tags: add + filter                            | E2E         | P1       | story-2-2-services-page.spec.ts                |
| AC-8 | Edit modal: pre-populated + slug warning      | Unit + E2E  | P1       | story-2-2-services-ui.test.tsx + e2e           |
| AC-9 | Performance: 50 services ≤1000ms              | E2E         | P0       | story-2-2-services-page.spec.ts (P0-3)         |
| AC-10 | MockFileCount on ServiceDto (backend)        | Integration | P0       | Story2_2_ServicesPageTests.cs (in story task)  |

### Test Coverage Matrix

| Test ID | AC   | Level | Priority | File                                     | Status |
|---------|------|-------|----------|------------------------------------------|--------|
| P0-1    | AC-1 | E2E   | P0       | tests/e2e/story-2-2-services-page.spec.ts | 🔴 RED |
| P0-2    | AC-5 | E2E   | P0       | tests/e2e/story-2-2-services-page.spec.ts | 🔴 RED |
| P0-3    | AC-9 | E2E   | P0       | tests/e2e/story-2-2-services-page.spec.ts | 🔴 RED |
| P1-1    | AC-6 | E2E   | P1       | tests/e2e/story-2-2-services-page.spec.ts | 🔴 RED |
| P1-2    | AC-4 | E2E   | P1       | tests/e2e/story-2-2-services-page.spec.ts | 🔴 RED |
| P1-3    | AC-7 | E2E   | P1       | tests/e2e/story-2-2-services-page.spec.ts | 🔴 RED |
| P1-4    | AC-2 | E2E   | P1       | tests/e2e/story-2-2-services-page.spec.ts | 🔴 RED |
| P1-5    | AC-8 | E2E   | P1       | tests/e2e/story-2-2-services-page.spec.ts | 🔴 RED |
| P1-6    | AC-3 | E2E   | P1       | tests/e2e/story-2-2-services-page.spec.ts | 🔴 RED |
| U-1     | AC-3 | Unit  | P1       | tests/unit/features/story-2-2-services-ui.test.tsx | 🔴 RED |
| U-2     | AC-3 | Unit  | P1       | tests/unit/features/story-2-2-services-ui.test.tsx | 🔴 RED |
| U-3     | AC-5 | Unit  | P1       | tests/unit/features/story-2-2-services-ui.test.tsx | 🔴 RED |
| U-4     | AC-8 | Unit  | P1       | tests/unit/features/story-2-2-services-ui.test.tsx | 🔴 RED |

### Risk Register

| Risk ID | Risk                                          | Mitigation                                               |
|---------|-----------------------------------------------|----------------------------------------------------------|
| R-001   | Empty-state test requires clean DB             | Document TODO for Epic 6 reset endpoint; run in isolated CI |
| R-002   | 50-service perf test may fail on port conflicts | Graceful loop with try/catch; skip on conflict           |
| R-003   | `@testing-library/user-event` version compat  | Check existing unit tests use same import pattern        |
| R-004   | MockFileCount = 0 in all test env (no real dir)| Integration test covers graceful 0-return explicitly     |

## Phase 4: RED Phase Verification

### E2E tests (Playwright)

**File**: `src/client/tests/e2e/story-2-2-services-page.spec.ts`

**RED phase status**: Tests will fail with Playwright timeout errors because `data-testid="services-grid"`, `data-testid="services-empty"`, `data-testid="service-modal"`, and all other new data-testids do not exist in the current placeholder `ServicesPage`. The page currently renders only `<p>Configured in a later story.</p>`.

**Verified RED**: ✅ (placeholder has no new testids — E2E tests will timeout on `waitForSelector`)

### Unit tests (Vitest)

**File**: `src/client/tests/unit/features/story-2-2-services-ui.test.tsx`

**RED phase status**: Tests fail to load with `Error: Failed to resolve import "@/features/services/components/ServiceCard"` — the module doesn't exist yet.

**Verified RED**: ✅
```
FAIL  tests/unit/features/story-2-2-services-ui.test.tsx
Error: Failed to resolve import "@/features/services/components/ServiceCard" 
from "tests/unit/features/story-2-2-services-ui.test.tsx". Does the file exist?
```

## Phase 5: Completion

### Handoff to dev-story

- Story file: `_bmad-output/implementation-artifacts/2-2-services-page-browse-create-and-edit-services.md`
- E2E test scaffolds: `src/client/tests/e2e/story-2-2-services-page.spec.ts`
- Unit test scaffolds: `src/client/tests/unit/features/story-2-2-services-ui.test.tsx`
- Backend integration tests: defined in Story Task 10 (to be written by dev-story)

### GREEN Gate Criteria

The ATDD phase is complete when ALL of the following pass:

**P0 (blockers — must be GREEN before story sign-off):**
- [ ] P0-1: Empty state shows Add Service CTA
- [ ] P0-2: Add Service modal port pre-filled from /api/services/next-port
- [ ] P0-3: 50 services render within 1000ms (AC-9 performance gate)

**P1 (should be GREEN before story sign-off):**
- [ ] P1-1: Create service via Add Service modal
- [ ] P1-2: Table view toggle + sessionStorage persistence
- [ ] P1-3: Tag filter chips filter services (AND logic)
- [ ] P1-4: Responsive grid columns (3/2/1 at breakpoints)
- [ ] P1-5: Edit modal slug-change warning
- [ ] P1-6: Service card content (port badge, status pill, Edit link)

**Unit tests (all must be GREEN):**
- [ ] All 18 Vitest unit tests in story-2-2-services-ui.test.tsx

**Backend integration tests (GREEN per Story 2.2 Task 10):**
- [ ] MockFileCount = 0 when MocksRoot does not exist
- [ ] MockFileCount counts .json files in existing MocksRoot
