# Code Review: Story 4.6 — Navigation Guard & Sign-Out Protection

**Review Date:** 2026-07-09
**Reviewer:** Code Review Agent (bmad-code-review skill)
**Branch:** `feature/4-6-navigation-guard-and-sign-out-protection`
**Baseline:** `origin/release/v0.4.0`

---

## Review Summary

| Severity | Count |
|----------|-------|
| BLOCKER  | 0     |
| MAJOR    | 2     |
| MINOR    | 3     |
| NITPICK  | 2     |
| Dismissed | 0    |

**Verdict:** ✅ No blockers. Implementation is functionally complete. Two MAJOR issues require attention before merge.

---

## Files Reviewed

| File | Status | Lines Changed |
|------|--------|---------------|
| `src/client/src/hooks/useUnsavedChanges.tsx` | NEW | +78 |
| `src/client/src/types/unsavedChanges.ts` | NEW | +16 |
| `src/client/src/components/dialogs/SignOutConfirmDialog.tsx` | NEW | +72 |
| `src/client/src/components/dialogs/SignOutConfirmDialog.module.css` | NEW | +76 |
| `src/client/src/main.tsx` | MODIFIED | +4 |
| `src/client/src/features/mappings/components/NavigationGuard.tsx` | MODIFIED | +30 |
| `src/client/src/components/layout/TopBar.tsx` | MODIFIED | +22 |
| `src/client/src/features/services/components/AddEditServiceModal.tsx` | MODIFIED | +32 |
| `src/client/tests/unit/components/SignOutConfirmDialog.test.tsx` | NEW | +119 |
| `src/client/tests/unit/lib/useUnsavedChanges.test.tsx` | NEW | +148 |

---

## MAJOR Findings

### M-1: Non-null assertion on potentially null value [TopBar.tsx:231]

**Location:** `src/client/src/components/layout/TopBar.tsx`, line 231

**Issue:**
```tsx
<SignOutConfirmDialog
  ...
  message={getSignOutMessage()!}  // ⚠️ Non-null assertion
  ...
/>
```

The `getSignOutMessage()` function returns `string | null`. While `hasAnyUnsaved` is checked before showing the dialog, there's a potential race condition: if state changes between the check and render cycle, `getSignOutMessage()` could return `null`, causing a runtime crash or unexpected behavior when passing `null` to a component expecting `string`.

**Risk:** Runtime crash if race condition occurs during rapid state changes.

**Fix:**
```tsx
message={getSignOutMessage() ?? ""}
```
Or better, guard the render:
```tsx
{showSignOutDialog && getSignOutMessage() && (
  <SignOutConfirmDialog
    ...
    message={getSignOutMessage()!}
    ...
  />
)}
```

---

### M-2: Missing focus trap and Enter-to-submit (NFR-19 violation) [SignOutConfirmDialog.tsx]

**Location:** `src/client/src/components/dialogs/SignOutConfirmDialog.tsx`

**Issue:** NFR-19 states: _"Dialog keyboard-accessible — focus trap, Enter submits, Escape cancels"_

The implementation:
- ✅ Escape cancels (implemented)
- ❌ **No focus trap** — Tab key allows focus to escape the modal to background elements
- ❌ **Enter does not submit** — Enter key does not trigger "Sign out" action

**Risk:** Fails accessibility requirements. Users can Tab out of modal to interact with background. Keyboard-only users cannot press Enter to confirm.

**Fix:** Add focus trap using a library like `focus-trap-react` or implement manually:
```tsx
import { useRef, useEffect } from "react";

const modalRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (!open) return;
  
  const focusableEls = modalRef.current?.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const firstEl = focusableEls?.[0] as HTMLElement;
  const lastEl = focusableEls?.[focusableEls.length - 1] as HTMLElement;
  
  function handleTab(e: KeyboardEvent) {
    if (e.key === "Tab") {
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl?.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl?.focus();
      }
    }
    if (e.key === "Enter") {
      e.preventDefault();
      onConfirm();
    }
  }
  
  window.addEventListener("keydown", handleTab);
  firstEl?.focus();
  return () => window.removeEventListener("keydown", handleTab);
}, [open, onConfirm]);
```

---

## MINOR Findings

### m-1: Performance — isDirty computed via JSON.stringify on every render [AddEditServiceModal.tsx:78-82]

**Location:** `src/client/src/features/services/components/AddEditServiceModal.tsx`, lines 78-82

**Issue:**
```tsx
const isDirty =
  values.name !== initialValues.name ||
  ...
  JSON.stringify(values.tags) !== JSON.stringify(initialValues.tags);
```

`JSON.stringify` runs on every render. For a small tags array this is negligible, but violates best practices.

**Fix:** Memoize the comparison:
```tsx
const isDirty = useMemo(() => 
  values.name !== initialValues.name ||
  ...
  JSON.stringify(values.tags) !== JSON.stringify(initialValues.tags),
  [values, initialValues]
);
```

---

### m-2: Escape key listener scope issue [SignOutConfirmDialog.tsx:18-27]

**Location:** `src/client/src/components/dialogs/SignOutConfirmDialog.tsx`, lines 18-27

**Issue:** The Escape key handler attaches to `window`, meaning if another dialog opens on top of this one, both would respond to Escape.

```tsx
window.addEventListener("keydown", handleKeyDown);
```

**Risk:** Unexpected behavior if nested dialogs exist (though not currently the case).

**Fix:** Use event capturing with `stopPropagation` or scope to the dialog element:
```tsx
function handleKeyDown(e: KeyboardEvent) {
  if (e.key === "Escape") {
    e.stopPropagation();  // Prevent parent dialogs from closing
    onOpenChange(false);
  }
}
```

---

### m-3: Inline styles in NavigationGuard dialog inconsistent with project patterns [NavigationGuard.tsx:18-85]

**Location:** `src/client/src/features/mappings/components/NavigationGuard.tsx`

**Issue:** `GuardDialog` uses inline styles while `SignOutConfirmDialog` uses CSS modules. Project convention (per project-context.md) is CSS modules for styling.

**Risk:** Inconsistent codebase; harder to maintain and theme.

**Fix:** Extract to `NavigationGuard.module.css` following the same pattern as `SignOutConfirmDialog.module.css`.

---

## NITPICK Findings

### n-1: eslint-disable comment in hook export [useUnsavedChanges.tsx:72]

**Location:** `src/client/src/hooks/useUnsavedChanges.tsx`, line 72

```tsx
// eslint-disable-next-line react-refresh/only-export-components
export function useUnsavedChanges() {
```

This suppresses a Fast Refresh warning. The hook is correctly co-located with its provider, but the linter flags it.

**Suggestion:** Consider splitting into separate files:
- `UnsavedChangesProvider.tsx` — exports component
- `useUnsavedChanges.ts` — exports hook only

Or leave as-is with the disable comment — this is a known pattern trade-off.

---

### n-2: Hardcoded z-index values [NavigationGuard.tsx:25, SignOutConfirmDialog.module.css:8]

**Location:** 
- `NavigationGuard.tsx` — `zIndex: 1000`
- `SignOutConfirmDialog.module.css` — `z-index: 9999`

Inconsistent z-index values between the two dialogs. Should use a consistent z-index scale from CSS variables.

**Suggestion:** Define `--z-modal: 1000` in theme and use consistently.

---

## Acceptance Criteria Compliance

| AC | Status | Notes |
|----|--------|-------|
| AC-1 | ✅ PASS | useBlocker intercepts route changes |
| AC-2 | ✅ PASS | "Discard and navigate" calls blocker.proceed() |
| AC-3 | ✅ PASS | "Stay" calls blocker.reset() |
| AC-4 | ✅ PASS | Mappings editor message matches spec |
| AC-5 | ✅ PASS | Mocks Root path message matches spec |
| AC-6 | ✅ PASS | Combined message order correct |
| AC-7 | ✅ PASS | Service modal tracked as "unsaved form data" |
| AC-8 | ✅ PASS | Three-source message combines correctly |
| AC-9 | ✅ PASS | No unsaved state → immediate sign-out |
| AC-10 | ✅ PASS | Cancel closes dialog, preserves state |
| AC-11 | ✅ PASS | Sign out triggers logout flow |
| AC-12 | ✅ PASS | beforeunload added for browser events |
| AC-13 | ✅ PASS | All data-testid values present |

---

## Unit Test Coverage

| Test File | Tests | Status |
|-----------|-------|--------|
| `SignOutConfirmDialog.test.tsx` | 8 tests | ✅ Covers AC-4, AC-10, AC-11, AC-13 |
| `useUnsavedChanges.test.tsx` | 9 tests | ✅ Covers AC-4-9, edge cases |

**Gap:** No unit tests for NavigationGuard component. Covered by E2E tests only.

---

## Security Review

- ✅ No sensitive data exposed in dialogs
- ✅ Sign-out properly clears React Query cache
- ✅ No XSS vectors in dynamic message rendering
- ✅ beforeunload handler follows browser security model

---

## Recommendations

1. **Fix M-1 and M-2 before merge** — Non-null assertion and NFR-19 compliance
2. **Strongly consider m-3** — Inline styles in NavigationGuard should match project patterns
3. **Can defer n-1 and n-2** — Style consistency improvements for follow-up

---

## Review Verdict

**Ready to merge:** ❌ Not yet — 2 MAJOR findings require fixes

**After fixing M-1 and M-2:** ✅ Ready to merge
