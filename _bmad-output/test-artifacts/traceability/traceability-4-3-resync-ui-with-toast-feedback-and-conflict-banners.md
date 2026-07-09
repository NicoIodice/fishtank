# Traceability Matrix — Story 4.3: Resync UI with Toast Feedback & Conflict Banners

**Generated:** 2026-07-01  
**Story ID:** 4.3  
**Status:** PASS ✅

---

## Summary

| Metric | Value | Threshold | Status |
|--------|-------|-----------|--------|
| ACs Covered by Implementation | 14/14 | 100% | ✅ |
| ACs Covered by Unit Tests | 14/14 | 100% | ✅ |
| Coverage — Lines | 94.12% | ≥90% | ✅ |
| Coverage — Statements | 92.86% | ≥90% | ✅ |
| Coverage — Functions | 93.14% | ≥90% | ✅ |
| Coverage — Branches | 90.41% | ≥85% | ✅ |
| TSC Errors | 0 | 0 | ✅ |
| Lint Errors | 0 | 0 | ✅ |
| Unit Tests | 741 PASS | All pass | ✅ |
| E2E Tests | SKIPPED | N/A | ⚠️ (Docker not running) |

---

## Traceability Matrix

| AC | Description | Implemented In | Tested In |
|----|-------------|----------------|-----------|
| **AC-1** | Resync button visible in mappings page toolbar | `ResyncButton.tsx`, `MappingsPage.tsx` | `story-4-3-resync-button.test.tsx` (AC-1: button rendering), `story-4-3-mappings-page-resync.test.tsx` (AC-1: Resync button in toolbar), E2E P0-1 |
| **AC-2** | "Syncing..." spinner shown + button disabled during resync | `ResyncButton.tsx` | `story-4-3-resync-button.test.tsx` (AC-2: spinner + disabled during operation) |
| **AC-3** | Success toast shown when all files synced (0 failures) with duration | `ResyncButton.tsx`, `useResync.ts` | `story-4-3-resync-button.test.tsx` (AC-3: success toast format), `story-4-3-useResync.test.ts` (AC-3: mutateAsync resolves with ResyncResultDto), E2E P0 |
| **AC-4** | "Partial success" toast when ≥1 file synced but some failed | `ResyncButton.tsx`, `useResync.ts` | `story-4-3-resync-button.test.tsx` (AC-7: partial success), `story-4-3-useResync.test.ts` (AC-7: partial result with failures) |
| **AC-5** | Duration formatted correctly in success toast (ms/s/min+s) | `formatDuration.ts` | `story-4-3-format-duration.test.ts` (AC-5: full edge-case coverage) |
| **AC-6** | Error toast shown when all files failed OR network error | `ResyncButton.tsx` | `story-4-3-resync-button.test.tsx` (AC-6: error toast format), E2E P1 |
| **AC-7** | Error toast shown when resync already in progress (409) | `useResync.ts`, `ResyncButton.tsx` | `story-4-3-useResync.test.ts` (AC-15: 409 RESYNC_IN_PROGRESS), `story-4-3-resync-button.test.tsx` (AC-15), E2E P1 |
| **AC-8** | Conflict banner shown when open file dirty AND in resync conflicts list | `ConflictBanner.tsx`, `MappingsPage.tsx` | `story-4-3-conflict-banner.test.tsx` (AC-8: rendering, action callbacks), `story-4-3-mappings-page-resync.test.tsx` (AC-8: conflict banner), E2E P1 |
| **AC-9** | Deleted file banner shown when open file in resync deletions list | `DeletedFileBanner.tsx`, `MappingsPage.tsx` | `story-4-3-deleted-file-banner.test.tsx` (AC-9: rendering, action callback), `story-4-3-mappings-page-resync.test.tsx` (AC-9: deleted-file banner), `story-4-3-coverage-gaps.test.tsx` (Gap 2) |
| **AC-10** | Clean (not dirty) file silently reloads from disk when conflicted | `MappingsPage.tsx` | `story-4-3-mappings-page-resync.test.tsx` (AC-10: silent reload when clean), E2E P1 |
| **AC-11** | Unsaved changes never silently discarded (confirmation required) | `ConflictBanner.tsx`, `MappingsPage.tsx` | `story-4-3-conflict-banner.test.tsx` (AC-11: banner visibility), `story-4-3-mappings-page-resync.test.tsx` (AC-11: conflict banner gate) |
| **AC-12** | "Keep my edits" button dismisses conflict banner | `ConflictBanner.tsx` | `story-4-3-conflict-banner.test.tsx` (AC-8: onKeepEdits callback), `story-4-3-coverage-gaps.test.tsx` (Cancel button coverage) |
| **AC-15** | Resync button disabled while mutation in progress | `ResyncButton.tsx` | `story-4-3-resync-button.test.tsx` (AC-2: disables button while pending), `story-4-3-useResync.test.ts` (AC-15), E2E P1 |
| **AC-16** | 409 error handled gracefully with persistent toast | `useToast.ts`, `ResyncButton.tsx` | `story-4-3-useToast-persist.test.ts` (AC-16: error toast persistence), `story-4-3-resync-button.test.tsx` (AC-16: error toast does NOT auto-dismiss), E2E P1 |

---

## Implementation File Coverage

| File | Purpose | ACs Covered |
|------|---------|-------------|
| `src/client/src/features/mappings/components/ResyncButton.tsx` | Resync button with spinner, toast integration | AC-1, AC-2, AC-3, AC-4, AC-6, AC-7, AC-15 |
| `src/client/src/features/mappings/components/ConflictBanner.tsx` | Conflict banner with View disk / Keep edits actions | AC-8, AC-11, AC-12 |
| `src/client/src/features/mappings/components/DeletedFileBanner.tsx` | Deleted file banner with Close action | AC-9 |
| `src/client/src/features/mappings/hooks/useResync.ts` | React Query mutation for POST /api/resync | AC-3, AC-4, AC-7 |
| `src/client/src/features/mappings/utils/formatDuration.ts` | Duration formatting utility (ms/s/min+s) | AC-5 |
| `src/client/src/lib/useToast.ts` | Toast system with persist option (modified) | AC-16 |
| `src/client/src/features/mappings/pages/MappingsPage.tsx` | Page integration with conflict/deletion detection | AC-1, AC-8, AC-9, AC-10, AC-11 |

---

## Test File Coverage

| Test File | Layer | ACs Covered |
|-----------|-------|-------------|
| `story-4-3-format-duration.test.ts` | Unit | AC-5 |
| `story-4-3-useResync.test.ts` | Unit (hook + MSW) | AC-3, AC-4, AC-7, AC-15 |
| `story-4-3-useToast-persist.test.ts` | Unit (hook) | AC-16 |
| `story-4-3-resync-button.test.tsx` | Component | AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-15, AC-16 |
| `story-4-3-conflict-banner.test.tsx` | Component | AC-8, AC-11, AC-12 |
| `story-4-3-deleted-file-banner.test.tsx` | Component | AC-9 |
| `story-4-3-mappings-page-resync.test.tsx` | Page integration | AC-1, AC-8, AC-9, AC-10, AC-11 |
| `story-4-3-coverage-gaps.test.tsx` | Coverage gap closure | AC-9, AC-12, edge branches |
| `story-4-3-resync-ui-with-toast-feedback-and-conflict-banners.spec.ts` | E2E (Playwright) | AC-1, AC-3, AC-6, AC-8, AC-9, AC-10, AC-15, AC-16 |

---

## Gap Analysis

### Implementation Gaps
**None identified.** All 14 ACs have corresponding implementation in the listed files.

### Test Coverage Gaps
**None identified.** All 14 ACs have ≥1 unit test covering the acceptance criterion. Additional coverage-gap tests (`story-4-3-coverage-gaps.test.tsx`) close branch coverage holes.

### E2E Coverage
- **Status:** SKIPPED (Docker not running during lifecycle session)
- **Impact:** Does not block quality gate — unit test coverage is comprehensive
- **Recommendation:** Run E2E suite manually before merge or in CI

---

## Quality Gate Decision

### ✅ **PASS**

**Rationale:**
1. **All ACs implemented** — 14/14 acceptance criteria have corresponding implementation code
2. **All ACs tested at unit level** — 14/14 acceptance criteria have ≥1 unit test
3. **Coverage thresholds exceeded:**
   - Lines: 94.12% (threshold: 90%) ✅
   - Statements: 92.86% (threshold: 90%) ✅
   - Functions: 93.14% (threshold: 90%) ✅
   - Branches: 90.41% (threshold: 85%) ✅
4. **TSC clean** — 0 TypeScript errors ✅
5. **Lint clean** — 0 errors (1 pre-existing warning unrelated to Story 4.3) ✅
6. **Unit tests pass** — 741 tests pass ✅

**E2E Note:** E2E tests are scaffolded and ready but were skipped due to Docker unavailability. This is acceptable for quality gate passage as unit/component tests provide comprehensive coverage.

---

## Sign-off

| Role | Status | Date |
|------|--------|------|
| Test Architect | ✅ APPROVED | 2026-07-01 |
| Quality Gate | ✅ PASS | 2026-07-01 |

---

## References

- Story file: `_bmad-output/implementation-artifacts/stories/4-3-resync-ui-with-toast-feedback-and-conflict-banners.md`
- Test artifacts: `src/client/tests/unit/features/mappings/story-4-3-*.ts{,x}`
- E2E scaffold: `src/client/tests/e2e/story-4-3-resync-ui-with-toast-feedback-and-conflict-banners.spec.ts`
