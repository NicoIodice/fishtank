# Code Review: Story 3-4 Row Detail All Three Display Styles

**Date:** 2026-06-28  
**Reviewer:** BMAD Code Review Agent  
**Branch:** `feature/3-4-row-detail-all-three-display-styles`  
**Base:** `origin/release/v0.3.0`  
**Story Spec:** `_bmad-output/implementation-artifacts/stories/3-4-row-detail-all-three-display-styles.md`

---

## Summary

| Category | Count |
|----------|-------|
| **BLOCKER** | 0 |
| **MAJOR** | 5 |
| **MINOR** | 3 |
| **Dismissed** | 0 |

**Gate Verdict:** ✅ **PASS** (no blockers; majors are fixable)

---

## MAJOR Findings

### M-1: [AC-2 Violation] RowDetailDrawer missing "click outside to close"

**Source:** Acceptance Auditor + Edge Case Hunter  
**File:** [RowDetailDrawer.tsx](src/client/src/features/activity/components/RowDetailDrawer.tsx#L27-L48)

**Evidence:** AC-2 states: _"Right Drawer: 320px from right edge, slides in, Esc to close, **click outside to close**"_

The current implementation has Esc key handling but no click-outside detection. The drawer is a fixed element with no backdrop overlay, so clicking in the remaining viewport area does nothing.

**Fix:** Add a transparent backdrop or use a `useEffect` with `mousedown` listener to detect clicks outside the drawer's 320px zone and call `onClose()`.

---

### M-2: [AC-2 Incomplete] RowDetailPanel missing Esc key handler

**Source:** Edge Case Hunter + Acceptance Auditor  
**File:** [RowDetailPanel.tsx](src/client/src/features/activity/components/RowDetailPanel.tsx)

**Evidence:** Dev Notes "Detail keyboard (new)" section states: _"Esc: close detail (Modal, Drawer, Panel)"_

- RowDetailModal: ✅ Has document-level `keydown` listener for Escape
- RowDetailDrawer: ✅ Has document-level `keydown` listener for Escape
- RowDetailPanel: ❌ **Missing** — no Escape key handling

**Fix:** Add the same `useEffect` pattern from Modal/Drawer:
```tsx
useEffect(() => {
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") onClose();
  }
  document.addEventListener("keydown", handleKeyDown);
  return () => document.removeEventListener("keydown", handleKeyDown);
}, [onClose]);
```

---

### M-3: [AC-5 Violation] "Save as Mock" button not disabled

**Source:** Acceptance Auditor  
**Files:** [RowDetailContent.tsx](src/client/src/features/activity/components/RowDetailContent.tsx#L221-L243), [RowDetailPanel.tsx](src/client/src/features/activity/components/RowDetailPanel.tsx#L107-L129)

**Evidence:** AC-5 states: _"a 'Save as Mock' action renders — clicking it is a no-op placeholder until Epic 4 Story 4.4"_

The spec says "disabled placeholder". The button currently:
- Has `onClick` with a no-op comment
- Is **not** `disabled` — remains visually clickable with pointer cursor
- Has no disabled visual state

Users clicking expect something to happen. A no-op click is confusing.

**Fix:** Add `disabled={true}` and appropriate disabled styling:
```tsx
<button
  disabled
  data-testid="activity-row-detail-save-mock"
  aria-label="Save as Mock"
  style={{
    // ... existing styles
    opacity: 0.5,
    cursor: "not-allowed",
  }}
>
```

---

### M-4: [Architecture Violation] Cross-feature import in AppearanceSettings

**Source:** Blind Hunter + Acceptance Auditor  
**File:** [AppearanceSettings.tsx](src/client/src/features/settings/components/AppearanceSettings.tsx#L3-L4)

**Evidence:** Project-context.md states: _"Each feature folder is self-contained — **no cross-feature imports**"_

```tsx
import { useRowDetailStyle } from "@/features/activity/hooks/useRowDetailStyle";
import type { RowDetailStyleValue } from "@/features/activity/hooks/useRowDetailStyle";
```

Settings feature (`features/settings/`) imports from activity feature (`features/activity/`).

**Fix Options:**
1. **Move hook to shared location:** `src/client/src/hooks/useRowDetailStyle.ts` or `src/client/src/lib/useRowDetailStyle.ts`
2. **Move hook to settings feature:** Since it's used for settings persistence, `features/settings/hooks/useRowDetailStyle.ts` may be appropriate

Option 1 is cleaner since the hook is consumed by both activity (for display) and settings (for config).

---

### M-5: [Task 2.4 Not Implemented] JSON bodies not pretty-printed

**Source:** Acceptance Auditor  
**File:** [RowDetailContent.tsx](src/client/src/features/activity/components/RowDetailContent.tsx#L158-L170)

**Evidence:** Task 2.4 specifies: _"Pretty-print JSON bodies (if parseable, raw otherwise)"_

Current code renders bodies verbatim:
```tsx
{row.requestBody ?? ""}
{row.responseBody ?? ""}
```

No attempt to parse JSON and format it with indentation.

**Fix:** Add a utility function:
```tsx
function formatBody(body: string | null): string {
  if (!body) return "";
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body; // Not valid JSON — return raw
  }
}
```
Apply in both request body and response body sections. Also apply in RowDetailPanel tab content.

---

## MINOR Findings

### m-1: Shared overlay components not created as planned

**Source:** Acceptance Auditor  
**Deviation:** Task 1.1 and 1.2 planned:
- `src/client/src/components/shared/RightDrawer.tsx`
- `src/client/src/components/shared/BottomPanel.tsx`

Instead, drawer and panel logic is inlined directly into feature-specific components. This is functional but reduces reusability for future features that may need similar overlays.

**Recommendation:** Consider refactoring to shared components in a future cleanup pass.

---

### m-2: Modal dialog z-index not explicitly set

**Source:** Edge Case Hunter  
**File:** [RowDetailModal.tsx](src/client/src/features/activity/components/RowDetailModal.tsx#L43-L59)

**Evidence:** UX-DR14 z-index stack specifies:
- Modal backdrop: 60
- Modal dialog: 70

The backdrop wrapper has `zIndex: 60` but the inner dialog div has no explicit z-index. It relies on DOM stacking context. While this works, explicit `zIndex: 70` on the dialog div would match the spec exactly and guard against future CSS changes.

---

### m-3: Panel height may squeeze on very short viewports

**Source:** Edge Case Hunter  
**File:** [RowDetailPanel.tsx](src/client/src/features/activity/components/RowDetailPanel.tsx#L27-L28)

```tsx
height: "40vh",
minHeight: "100px",
```

On a 200px viewport height, `40vh = 80px` which is below minHeight (100px), so minHeight protects it. But 100px for header + tabs + content is still tight. Consider bumping minHeight to `150px` or using `max(40vh, 150px)`.

---

## Files Reviewed

| File | Status | Issues |
|------|--------|--------|
| `useMediaQuery.ts` | NEW | ✅ Clean |
| `useRowDetailStyle.ts` | NEW | M-4 (location issue) |
| `RowDetailContent.tsx` | NEW | M-3, M-5 |
| `RowDetailModal.tsx` | NEW | m-2 |
| `RowDetailDrawer.tsx` | NEW | M-1 |
| `RowDetailPanel.tsx` | NEW | M-2, M-3, M-5, m-3 |
| `AppearanceSettings.tsx` | MODIFIED | M-4 |
| `ActivityPage.tsx` | MODIFIED | ✅ Clean |
| `ActivityTable.tsx` | MODIFIED | ✅ Clean |

---

## Acceptance Criteria Compliance

| AC | Status | Notes |
|----|--------|-------|
| AC-1 | ✅ Pass | Row detail opens on click/Enter, displays all fields |
| AC-2 | ⚠️ Partial | Modal ✓, Drawer missing click-outside, Panel missing Esc |
| AC-3 | ✅ Pass | Drawer updates in-place (React re-renders with new row prop) |
| AC-4 | ✅ Pass | Panel close clears selection |
| AC-5 | ⚠️ Partial | Button renders but not disabled |
| AC-6 | ✅ Pass | Mobile override forces modal |
| AC-7 | ✅ Pass | Virtual scrolling unaffected |
| AC-8 | ✅ Pass | Keyboard navigation works |
| AC-9 | ✅ Pass | Settings preference persists |
| AC-10 | ✅ Pass | data-testid attributes present |

---

## Recommended Action

Fix the 5 MAJOR items before merge. Estimated effort: ~30 minutes.

Priority order:
1. M-2 (Panel Esc handler) — 2 min copy-paste
2. M-1 (Drawer click-outside) — 10 min
3. M-3 (Disable Save as Mock) — 5 min
4. M-5 (Pretty-print JSON) — 10 min
5. M-4 (Move hook location) — 5 min refactor

---

*Report generated by BMAD Code Review Workflow*
