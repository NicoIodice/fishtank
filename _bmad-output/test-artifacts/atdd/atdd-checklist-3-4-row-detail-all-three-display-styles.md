---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-write-tests
lastStep: step-03-write-tests
lastSaved: '2026-06-28'
story_key: 3-4-row-detail-all-three-display-styles
story_id: '3.4'
mode: Create
phase: RED
---

# ATDD Checklist — Story 3.4: Row Detail — All Three Display Styles

**Date:** 2026-06-28
**Author:** Murat (Master Test Architect)
**Story:** Story 3.4 — Row Detail — All Three Display Styles
**Branch:** `feature/3-4-row-detail-all-three-display-styles`
**Phase:** RED (scaffold created — tests compile but fail)

---

## Scaffolds Created

| # | File | Type | Status |
|---|------|------|--------|
| 1 | `src/client/tests/e2e/story-3-4-row-detail-all-three-display-styles.spec.ts` | Playwright E2E | ✅ Created |
| 2 | `src/client/tests/unit/features/story-3-4-row-detail-all-three-display-styles.test.tsx` | Vitest component/unit | ✅ Created |
| 3 | `src/client/src/features/activity/components/RowDetailModal.tsx` | RED stub | ✅ Created |
| 4 | `src/client/src/features/activity/components/RowDetailDrawer.tsx` | RED stub | ✅ Created |
| 5 | `src/client/src/features/activity/components/RowDetailPanel.tsx` | RED stub | ✅ Created |
| 6 | `src/client/src/features/activity/hooks/useRowDetailStyle.ts` | RED stub | ✅ Created |

---

## Test Cases Generated

### E2E (Playwright) — `story-3-4-row-detail-all-three-display-styles.spec.ts`

| Test ID | Test Name | AC Mapping | Priority | RED? |
|---------|-----------|-----------|----------|------|
| T15 | AC-1 AC-2 — clicking a row opens the Modal with all fields | AC-1, AC-2 | P0 | ✅ FAIL (modal not rendered) |
| T16 | AC-2 AC-9 — setting preference to Right Drawer opens drawer on row click | AC-2, AC-9 | P1 | ✅ FAIL (drawer not rendered) |
| T17 | AC-2 AC-4 AC-9 — setting preference to Bottom Panel opens tabbed panel on row click | AC-2, AC-4, AC-9 | P1 | ✅ FAIL (panel not rendered) |
| T18 | AC-8 — keyboard Enter on focused row opens row detail | AC-8 | P1 | ✅ FAIL (keyboard handler not wired) |
| T19 | AC-5 — proxied row shows disabled Save as Mock button in detail | AC-5 | P2 | ✅ FAIL (RowDetailModal not rendered) |

### Component / Unit (Vitest) — `story-3-4-row-detail-all-three-display-styles.test.tsx`

| Test ID | Test Name | AC Mapping | Priority | RED? |
|---------|-----------|-----------|----------|------|
| CT-1a | RowDetailModal renders all required metadata fields | AC-1 | P0 | ✅ FAIL |
| CT-1b | RowDetailModal renders headers, request body, response body | AC-1 | P0 | ✅ FAIL |
| CT-1c | RowDetailModal: Esc key calls onClose | AC-2 | P0 | ✅ FAIL |
| CT-2 | RowDetailDrawer renders all required fields with 320px width | AC-2 | P1 | ✅ FAIL |
| CT-3a | RowDetailPanel renders Request and Response tabs | AC-2 | P1 | ✅ FAIL |
| CT-3b | RowDetailPanel: switching to Response tab shows response body | AC-2 | P1 | ✅ FAIL |
| CT-4 | Headers display `[REDACTED]` for sensitive header values | AC-1, FR-10 | P1 | ✅ FAIL |
| CT-5a | Save as Mock button rendered for Proxied rows | AC-5 | P1 | ✅ FAIL |
| CT-5b | Save as Mock button NOT rendered for Mocked rows | AC-5 | P1 | ⚠️ PASS* |
| CT-5c | Save as Mock button click is a no-op | AC-5 | P1 | ✅ FAIL |
| CT-6 | Mobile <640px always uses Modal regardless of drawer preference | AC-6 | P1 | ⚠️ PASS* |
| CT-7a | useRowDetailStyle returns "modal" as default (no stored preference) | AC-9 | P1 | ⚠️ PASS* |
| CT-7b | useRowDetailStyle returns stored preference from localStorage | AC-9 | P1 | ✅ FAIL |
| CT-8a | useRowDetailStyle persists preference to fishtank-appearance-settings | AC-9 | P1 | ✅ FAIL |
| CT-8b | setRowDetailStyle does not overwrite unrelated localStorage keys | AC-9 | P1 | ✅ FAIL |
| CT-9 | RowDetailDrawer updates in-place when row prop changes | AC-3 | P1 | ✅ FAIL |
| CT-10 | RowDetailPanel close button calls onClose callback | AC-4 | P1 | ✅ FAIL |

> ⚠️ **PASS\* — Stub coincidence:** CT-5b passes because the stub returns `null` (no button rendered — correct for Mocked rows). CT-6 passes because the stub's `effectiveStyle` is always `"modal"`. CT-7a passes because the stub's default is `"modal"`. These tests will remain green through implementation, which is acceptable — they are checking correct default/negative behaviors.

---

## AC Coverage Summary

| AC | Description | Covered By | Priority |
|----|-------------|-----------|----------|
| AC-1 | Row opens on click/Enter with all fields | CT-1a, CT-1b, CT-4, T15 | P0 |
| AC-2 | Three display styles (Modal, Drawer, Panel) | CT-1c, CT-2, CT-3a, CT-3b, T15, T16, T17 | P0/P1 |
| AC-3 | Right Drawer updates in-place | CT-9 | P1 |
| AC-4 | Bottom Panel close clears selection | CT-10, T17 | P1 |
| AC-5 | Save as Mock placeholder for proxied rows | CT-5a, CT-5b, CT-5c, T19 | P1/P2 |
| AC-6 | Mobile override (<640px → always Modal) | CT-6 | P1 |
| AC-7 | Virtual scrolling unaffected | *(covered in Story 3.2 tests — NFR-4)* | P2 |
| AC-8 | Keyboard navigation (Enter opens detail) | T18 | P1 |
| AC-9 | Settings preference persistence in localStorage | CT-7a, CT-7b, CT-8a, CT-8b, T16, T17 | P1 |
| AC-10 | WCAG spot-check | *(P3 — deferred to nightly CI axe-core run)* | P3 |

---

## RED Phase Confirmation

- **TypeScript compilation:** ✅ Clean (`tsc --noEmit` — both `tsconfig.app.json` and `tsconfig.e2e.json`)
- **Unit tests compile and fail:** ✅ Confirmed — 14/17 tests FAIL with meaningful assertions (stub returns null/no-op)
- **E2E spec compiles:** ✅ Confirmed — no TypeScript errors
- **Stub files created:** ✅ 4 stub files created under `src/client/src/` (compile-only, no implementation)

---

## Prerequisites for GREEN Phase

Story 3.4 implementation must deliver:

1. `RowDetailModal.tsx` — Modal overlay (560px, backdrop, focus-trapped, Esc closes, `data-testid="activity-row-detail-modal"`)
2. `RowDetailDrawer.tsx` — Right drawer (320px, updates in-place, Esc/click-outside closes, `data-testid="activity-row-detail-drawer"`)
3. `RowDetailPanel.tsx` — Bottom panel (Request/Response tabs, close clears selection, `data-testid="activity-row-detail-panel"`)
4. `RowDetailContent.tsx` — Shared field renderer (all AC-1 fields + `[REDACTED]` + Save as Mock)
5. `useRowDetailStyle.ts` — Reads/writes `fishtank-appearance-settings.rowDetailStyle`; exposes `effectiveStyle` with mobile override
6. `ActivityPage.tsx` — `selectedRowId` state + click/Enter handlers + mobile detection
7. `AppearanceSettings.tsx` — Segmented button group (`data-testid="settings-appearance-row-detail-{style}"`)
8. All `data-testid` attributes as documented in Task 6 of the story

---

## Handoff to dev-story

- **Story file:** `_bmad-output/implementation-artifacts/stories/3-4-row-detail-all-three-display-styles.md`
- **Test files (RED):**
  - `src/client/tests/e2e/story-3-4-row-detail-all-three-display-styles.spec.ts`
  - `src/client/tests/unit/features/story-3-4-row-detail-all-three-display-styles.test.tsx`
- **Stubs to replace with real implementation:**
  - `src/client/src/features/activity/components/RowDetailModal.tsx`
  - `src/client/src/features/activity/components/RowDetailDrawer.tsx`
  - `src/client/src/features/activity/components/RowDetailPanel.tsx`
  - `src/client/src/features/activity/hooks/useRowDetailStyle.ts`
- **Run tests to verify GREEN:** `npx vitest run tests/unit/features/story-3-4*` and `npx playwright test story-3-4*`
