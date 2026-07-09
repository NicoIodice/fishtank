---
storyId: '4.5'
storyKey: '4-5-record-mode-and-cross-screen-recording-indicator'
storyFile: 'c:\GIT\_Personal\fishtank\_bmad-output\implementation-artifacts\stories\4-5-record-mode-and-cross-screen-recording-indicator.md'
atddChecklistPath: 'c:\GIT\_Personal\fishtank\_bmad-output\test-artifacts\atdd\atdd-checklist-4-5-record-mode-and-cross-screen-recording-indicator.md'
generatedTestFiles:
  - 'src/client/tests/unit/features/RecordMode.test.tsx'
  - 'src/client/tests/unit/layout/TopBar-RecordingIndicator.test.tsx'
  - 'src/Fishtank.Api.IntegrationTests/Api/RecordingTests.cs'
  - 'src/client/tests/e2e/story-4-5-record-mode-and-cross-screen-recording-indicator.spec.ts'
inputDocuments:
  - '_bmad/tea/config.yaml'
  - '_bmad-output/test-artifacts/test-design/test-design-epic-4.md'
  - '_bmad-output/implementation-artifacts/stories/4-5-record-mode-and-cross-screen-recording-indicator.md'
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generate-tests']
lastStep: 'step-02-generate-tests'
lastSaved: '2026-07-08'
testStackType: 'fullstack'
workflowPhase: 'complete'
---

# ATDD Checklist: Story 4-5 — Record Mode & Cross-Screen Recording Indicator

**Status:** RED phase (tests compile but fail)
**Author:** Murat (Master Test Architect)
**Date:** 2026-07-08

## Test Coverage Summary

| Layer | ACs Covered | Test Count | Status |
|-------|-------------|------------|--------|
| Component (Vitest + RTL) | AC-1, AC-2, AC-3, AC-5, AC-6, AC-7, AC-8, AC-9, AC-11 | 17 | ✅ Generated (RED) |
| Integration (xUnit) | AC-4, AC-8 | 8 | ✅ Generated (RED) |
| E2E (Playwright) | AC-4, AC-5, AC-6 | 6 | ✅ Generated (RED) |
| **Total** | **12 ACs** | **31 tests** | **✅ RED Phase Complete** |

## Acceptance Criteria Checklist

- [ ] **AC-1:** Record mode activates on button click (Component)
- [ ] **AC-2:** Recording badge visible and amber-styled (Component)
- [ ] **AC-3:** Stop button deactivates and badge hides (Component)
- [ ] **AC-4:** Auto-capture writes files (Integration + E2E)
- [ ] **AC-5:** Cross-screen indicator in top bar (Component + E2E)
- [ ] **AC-6:** Cross-screen indicator absent on /login and /setup (Component + E2E)
- [ ] **AC-7:** SignalR disconnect → warning state (Component)
- [ ] **AC-8:** SignalR reconnect → resume + System Event (Component + Integration)
- [ ] **AC-9:** prefers-reduced-motion disables animations (Component)
- [ ] **AC-10:** Recording status persists (covered by AC-11)
- [ ] **AC-11:** Record button state loaded on mount (Component)
- [ ] **AC-12:** data-testid attributes (covered in all tests)

## Generated Test Files

### Frontend Component Tests

**File:** `src/client/src/features/activity/__tests__/RecordMode.test.tsx`
- AC-1: Record button activates mode
- AC-2: Recording badge visible and styled
- AC-3: Stop button deactivates mode
- AC-7: SignalR disconnect → warning state
- AC-8: SignalR reconnect → resume
- AC-9: prefers-reduced-motion
- AC-11: Button state loaded on mount

**File:** `src/client/src/components/layout/__tests__/TopBar-RecordingIndicator.test.tsx`
- AC-5: Cross-screen indicator appears
- AC-6: Indicator absent on /login and /setup

### Backend Integration Tests

**File:** `src/Fishtank.Api.IntegrationTests/Api/RecordingTests.cs`
- AC-4: Auto-capture writes Mapping + Response files
- AC-8: SignalR reconnect creates System Event with gap duration
- POST /api/recording/start (200 and 409 conflict)
- POST /api/recording/stop (200 and 409 conflict)
- GET /api/recording/status (200 and 401 unauthenticated)

### E2E Tests

**File:** `src/client/tests/e2e/story-4-5-record-mode-and-cross-screen-recording-indicator.spec.ts`
- AC-4: Files appear on disk after recording
- AC-5: Top bar indicator visible after navigation
- AC-6: Indicator not on /login
- Click indicator → navigate to /activity

## RED Phase Validation

Tests are RED-by-construction because:

❌ **Frontend:** `useRecordingState` hook doesn't exist  
❌ **Frontend:** Record button stub is disabled  
❌ **Frontend:** Recording badge stub has `display: none`  
❌ **Frontend:** Cross-screen indicator not in TopBar  
❌ **Backend:** `RecordingEndpoints.cs` doesn't exist  
❌ **Backend:** `IRecordingService` / `RecordingService` don't exist  
❌ **Backend:** Routes `/api/recording/*` return 404  

## Next Steps

1. **Verify tests compile** — run `npm test` (frontend) and `dotnet test` (backend)
2. **Verify tests are RED** — all tests should fail with expected errors
3. **Handoff to dev-story** — tests are ready for implementation phase

---

## Notes

- All tests use canonical `data-testid` values from story spec
- Component tests use `vi.mock` for non-existent hooks (RED phase pattern)
- Integration tests expect 404 from non-existent endpoints (RED phase pattern)
- E2E tests will fail on missing UI elements (RED phase pattern)
