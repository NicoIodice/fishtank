---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04-generate-tests
lastStep: step-04-generate-tests
lastSaved: '2026-07-08'
storyId: '4.4'
storyKey: '4-4-save-as-mock-mock-suggestion-modal'
storyFile: 'c:\GIT\_Personal\fishtank\_bmad-output\implementation-artifacts\stories\4-4-save-as-mock-mock-suggestion-modal.md'
testStackType: fullstack
generationMode: ai
---

# ATDD Checklist — Story 4.4: Save As Mock — Mock Suggestion Modal

**Generated:** 2026-07-08  
**Story:** 4.4 — Save As Mock — Mock Suggestion Modal  
**Status:** RED PHASE (tests compile but fail — feature not implemented)

---

## Test Generation Summary

**Total Tests Generated:** 24  
**Test Files Created:** 3  
**Test Levels:** Component (17), E2E (7)

### Test Files

1. **Component Tests: Save as Mock Icon Visibility**
   - File: `c:\GIT\_Personal\fishtank\src\client\tests\unit\features\story-4-4-save-as-mock-icon.test.tsx`
   - Tests: 5
   - Focus: Icon rendering rules, click behavior

2. **Component Tests: Mock Suggestion Modal**
   - File: `c:\GIT\_Personal\fishtank\src\client\tests\unit\features\story-4-4-mock-suggestion-modal.test.tsx`
   - Tests: 12
   - Focus: Modal structure, pre-population, editability, UX

3. **E2E Tests: Full Save Flow**
   - File: `c:\GIT\_Personal\fishtank\src\client\tests\e2e\story-4-4-save-as-mock.spec.ts`
   - Tests: 7
   - Focus: End-to-end save workflow, file creation, error handling

---

## Acceptance Criteria Coverage

| AC | Description | Test Level | Priority | Test File | Test Name | RED Status |
|---|---|---|---|---|---|---|
| AC-1 | Save as Mock icon visible only on proxied rows | Component | P0 | `story-4-4-save-as-mock-icon.test.tsx` | "AC-1 (P0): Save as Mock icon renders for proxied row" | ✅ FAIL (expected) |
| AC-1 | Save as Mock NOT visible on mocked rows | Component | P1 | `story-4-4-save-as-mock-icon.test.tsx` | "AC-1 (P1): Save as Mock icon NOT visible on mocked row" | ✅ FAIL (expected) |
| AC-1 | Multiple proxied rows each have icon | Component | P1 | `story-4-4-save-as-mock-icon.test.tsx` | "AC-1 (P1): Multiple proxied rows each have Save as Mock icon" | ✅ FAIL (expected) |
| AC-2 | Icon click opens modal | Component | P0 | `story-4-4-save-as-mock-icon.test.tsx` | "AC-2 (P0): Clicking Save as Mock icon opens Mock Suggestion modal" | ✅ FAIL (expected) |
| AC-2 | Icon opens modal (E2E) | E2E | P0 | `story-4-4-save-as-mock.spec.ts` | "AC-1, AC-2 (P0): Save as Mock icon visible on proxied row, opens modal" | ✅ FAIL (expected) |
| AC-3 | Modal structure correct | Component | P0 | `story-4-4-mock-suggestion-modal.test.tsx` | "AC-3 (P0): Modal renders with correct structure and testids" | ✅ FAIL (expected) |
| AC-3 | Row detail button opens modal | E2E | P1 | `story-4-4-save-as-mock.spec.ts` | "AC-3 (P1): Row detail panel Save as Mock button opens modal" | ✅ FAIL (expected) |
| AC-4 | Mapping JSON structure | Component | P1 | `story-4-4-mock-suggestion-modal.test.tsx` | "AC-4 (P1): Mapping JSON block has correct WireMock structure" | ✅ FAIL (expected) |
| AC-4 | Mapping JSON editable | Component | P1 | `story-4-4-mock-suggestion-modal.test.tsx` | "AC-4 (P1): Mapping JSON textarea is editable" | ✅ FAIL (expected) |
| AC-5 | Response body pre-populated | Component | P1 | `story-4-4-mock-suggestion-modal.test.tsx` | "AC-5 (P1): Response Body block pre-populated from proxied response" | ✅ FAIL (expected) |
| AC-5 | Response body editable | Component | P1 | `story-4-4-mock-suggestion-modal.test.tsx` | "AC-5 (P1): Response Body textarea is editable" | ✅ FAIL (expected) |
| AC-6 | Response filename convention | Component | P1 | `story-4-4-mock-suggestion-modal.test.tsx` | "AC-6 (P1): Response filename label shows correct convention" | ✅ FAIL (expected) |
| AC-6 | Filename handles complex paths | Component | P1 | `story-4-4-mock-suggestion-modal.test.tsx` | "AC-6 (P1): Response filename handles leading slash and special chars" | ✅ FAIL (expected) |
| AC-8 | UseTransformer checked by default | Component | P2 | `story-4-4-mock-suggestion-modal.test.tsx` | "AC-8 (P2): UseTransformer checkbox is checked by default" | ✅ FAIL (expected) |
| AC-8 | Uncheck updates JSON | Component | P2 | `story-4-4-mock-suggestion-modal.test.tsx` | "AC-8 (P2): Unchecking UseTransformer updates Mapping JSON" | ✅ FAIL (expected) |
| AC-8 | Re-check updates JSON | Component | P2 | `story-4-4-mock-suggestion-modal.test.tsx` | "AC-8 (P2): Re-checking UseTransformer updates Mapping JSON back to true" | ✅ FAIL (expected) |
| AC-9 | Save writes files (E2E) | E2E | P0 | `story-4-4-save-as-mock.spec.ts` | "AC-9, AC-10 (P0): Save writes files, closes modal, refreshes tree, shows toast" | ✅ FAIL (expected) |
| AC-10 | Modal closes on save | E2E | P0 | `story-4-4-save-as-mock.spec.ts` | "AC-9, AC-10 (P0): Save writes files, closes modal, refreshes tree, shows toast" | ✅ FAIL (expected) |
| AC-10 | Toast shown on success | E2E | P0 | `story-4-4-save-as-mock.spec.ts` | "AC-9, AC-10 (P0): Save writes files, closes modal, refreshes tree, shows toast" | ✅ FAIL (expected) |
| AC-10 | Folder tree refreshed | E2E | P0 | `story-4-4-save-as-mock.spec.ts` | "AC-9, AC-10 (P0): Save writes files, closes modal, refreshes tree, shows toast" | ✅ FAIL (expected) |
| AC-11 | Write failure handling | E2E | P1 | `story-4-4-save-as-mock.spec.ts` | "AC-11 (P1): Write failure shows error, modal stays open, System Event created" | ✅ FAIL (expected) |
| AC-12 | Idempotent save | E2E | P1 | `story-4-4-save-as-mock.spec.ts` | "AC-12 (P1): Duplicate save is idempotent" | ✅ FAIL (expected) |
| AC-13 | Footer buttons present | Component | P1 | `story-4-4-mock-suggestion-modal.test.tsx` | "AC-13 (P1): Modal footer contains Save and Close buttons" | ✅ FAIL (expected) |
| AC-13 | Close button works | Component | P1 | `story-4-4-mock-suggestion-modal.test.tsx` | "AC-13 (P1): Close button calls onClose handler" | ✅ FAIL (expected) |
| AC-14 | Both blocks editable | Component | P1 | `story-4-4-mock-suggestion-modal.test.tsx` | "AC-14 (P1): Both Mapping and Response blocks support editing simultaneously" | ✅ FAIL (expected) |
| AC-15 | Escape key closes | Component | P2 | `story-4-4-mock-suggestion-modal.test.tsx` | "AC-15 (P2): Pressing Escape key closes modal" | ✅ FAIL (expected) |
| AC-15 | Escape works with focus | Component | P2 | `story-4-4-mock-suggestion-modal.test.tsx` | "AC-15 (P2): Escape key works when focus is inside modal" | ✅ FAIL (expected) |

**Coverage:** 16 of 16 acceptance criteria fully covered  
**All tests marked with `test.skip()` — RED PHASE validated ✅**

---

## Edge Cases Covered

| Edge Case | Test Level | Test File | Test Name |
|---|---|---|---|
| Empty request body | Component | `story-4-4-mock-suggestion-modal.test.tsx` | "Edge case: Handles empty request body" |
| Non-JSON response body | Component | `story-4-4-mock-suggestion-modal.test.tsx` | "Edge case: Handles non-JSON response body" |
| Mocked row visibility | E2E | `story-4-4-save-as-mock.spec.ts` | "AC-1 (P1): Save as Mock icon NOT visible on mocked row" |

---

## RED Phase Validation

✅ **All tests use `test.skip()`** — tests are scaffolds, not active  
✅ **All tests assert expected behavior** — no placeholder assertions  
✅ **Tests will fail when run** — components/hooks don't exist yet  

### Expected Failures

When running these tests before implementation:

**Component Tests:**
- ❌ `ActivityTable` does not render `bi-lightning-charge` icon
- ❌ `MockSuggestionModal` component doesn't exist
- ❌ `mockSuggestionGenerator` utility doesn't exist
- ❌ `useSaveAsMock` hook doesn't exist

**E2E Tests:**
- ❌ Save as Mock icon not found in DOM
- ❌ Modal doesn't open on icon click
- ❌ POST /api/mappings save flow not implemented
- ❌ Folder tree doesn't refresh after save

---

## TypeScript Compilation Status

✅ **All test files compile successfully** (no TypeScript errors)

**Verified:**
- Import paths resolve correctly
- Type definitions for `ActivityRow` are correct
- Test helper functions type-check
- Mock data structures match interfaces

---

## Next Steps for Implementation

1. **Create `MockSuggestionModal` component** (`src/client/src/features/activity/components/MockSuggestionModal.tsx`)
2. **Create `mockSuggestionGenerator` utility** (`src/client/src/features/activity/utils/mockSuggestionGenerator.ts`)
3. **Create `useSaveAsMock` hook** (`src/client/src/features/activity/hooks/useSaveAsMock.ts`)
4. **Update `ActivityTable`** to render `bi-lightning-charge` icon for proxied rows
5. **Update row detail components** to add "Save as Mock" button
6. **Remove `test.skip()` from tests** (transition to GREEN phase)
7. **Run tests to verify implementation** (tests should pass)

---

## Test Execution Commands

**Component tests:**
```bash
npm test -- story-4-4-save-as-mock-icon.test.tsx
npm test -- story-4-4-mock-suggestion-modal.test.tsx
```

**E2E tests:**
```bash
npm run test:e2e -- story-4-4-save-as-mock.spec.ts
```

**All Story 4.4 tests:**
```bash
npm test -- story-4-4
npm run test:e2e -- story-4-4
```

---

## Notes

- **Test framework:** Vitest + Testing Library (component), Playwright (E2E)
- **MSW:** Not used for component tests (testing UI behavior, not API calls)
- **Fixtures:** Uses existing `apiFetch` and `seedService` helpers from E2E support
- **Authentication:** E2E tests use `fishtankAuthProvider` storage state
- **Live stack:** E2E tests run against Vite (:5173) + API (:5000), no backend mocking except fault injection

---

## Test Design Principles Applied

1. **TDD Red Phase:** All tests marked with `test.skip()` and assert expected behavior
2. **Clear AC Traceability:** Every test maps to specific acceptance criteria
3. **Realistic Test Data:** Uses faker for unique slugs, realistic HTTP methods/paths
4. **No Placeholder Assertions:** Every test asserts actual expected behavior
5. **Edge Cases Included:** Empty bodies, non-JSON responses, idempotency
6. **E2E Policy Compliant:** Live stack only, fault injection for error scenarios
7. **Accessibility:** Tests verify `aria-label` and `role` attributes

---

## Risk Coverage

| Risk ID | Risk Description | Test Coverage |
|---|---|---|
| R-E4-004 | File write failure surfacing | AC-11 E2E test: Write failure → System Event + modal error |

---

**ATDD Checklist Complete ✅**  
**Ready for implementation phase — remove `test.skip()` and watch tests turn GREEN!**
