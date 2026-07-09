---
stepsCompleted: ['step-01-load-context', 'step-02-define-thresholds', 'step-03-gather-evidence', 'step-04-evaluate-and-score', 'step-05-generate-report']
lastStep: 'step-05-generate-report'
lastSaved: '2026-07-09'
story_key: '4-6-navigation-guard-and-sign-out-protection'
story_title: 'Navigation Guard & Sign-Out Protection'
scope: 'new code paths only'
auditor: 'Master Test Architect'
nfr_areas: ['performance', 'security', 'reliability', 'accessibility']
blocker_count: 0
major_count: 1
minor_count: 0
---

# NFR Evidence Assessment: Story 4.6

**Story:** Navigation Guard & Sign-Out Protection  
**Scope:** New code paths only  
**Audit Date:** 2026-07-09

---

## Executive Summary

| Category | Verdict | Findings |
|----------|---------|----------|
| **Performance** | PASS | No concerns — efficient Set-based state tracking, O(1) operations |
| **Security** | PASS | No sensitive data exposure; no escalation paths |
| **Reliability** | PASS | Error boundaries, cleanup on unmount, beforeunload fallback |
| **Accessibility** | MAJOR | Missing focus trap and Enter-to-submit in SignOutConfirmDialog (NFR-19 partial) |

**Gate Decision:** PROCEED WITH REMEDIATION — 0 BLOCKERs, 1 MAJOR issue

---

## Files Audited

| File | Purpose |
|------|---------|
| [useUnsavedChanges.tsx](src/client/src/hooks/useUnsavedChanges.tsx) | Global unsaved state context |
| [SignOutConfirmDialog.tsx](src/client/src/components/dialogs/SignOutConfirmDialog.tsx) | Sign-out confirmation dialog |
| [NavigationGuard.tsx](src/client/src/features/mappings/components/NavigationGuard.tsx) | Navigation blocker with guard dialog |
| [TopBar.tsx](src/client/src/components/layout/TopBar.tsx) | Sign-out guard integration |

---

## NFR-15: Destructive Actions Require Explicit Confirmation

**Verdict: PASS ✓**

### Evidence

| Checkpoint | Status | Evidence Location |
|------------|--------|-------------------|
| Sign-out with unsaved state shows confirmation | ✓ | TopBar.tsx lines 64-72: `if (hasAnyUnsaved) { setShowSignOutDialog(true); return; }` |
| SignOutConfirmDialog requires explicit "Sign out" click | ✓ | SignOutConfirmDialog.tsx line 62: `onClick={onConfirm}` on "Sign out" button |
| Navigation away with unsaved changes shows guard | ✓ | NavigationGuard.tsx line 105: `useBlocker` intercepts navigation |
| Guard requires explicit "Discard and navigate" | ✓ | NavigationGuard.tsx line 62: "Discard and navigate" button with `onClick={onDiscard}` |

### Analysis

Both destructive action paths are protected:

1. **Sign-out path:** TopBar checks `hasAnyUnsaved` and displays SignOutConfirmDialog when true. The dialog body dynamically reflects which sources have unsaved state (mappings-editor, mocks-root-path, service-modal). Sign-out only proceeds when the user explicitly clicks "Sign out".

2. **Navigation path:** NavigationGuard uses React Router's `useBlocker` hook and displays GuardDialog when `isDirty` is true. Navigation only proceeds when the user explicitly clicks "Discard and navigate".

**No false positives:** Both guards check actual dirty state, not presence of components.

---

## NFR-19: Dialog Keyboard Accessibility

**Verdict: MAJOR ✗**

### Requirements per NFR-19

| Requirement | SignOutConfirmDialog | NavigationGuard (GuardDialog) |
|-------------|----------------------|-------------------------------|
| Focus trap (Tab cycles within dialog) | ✗ MISSING | ✗ MISSING |
| Enter key submits primary action | ✗ MISSING | ✗ MISSING |
| Escape key cancels/closes | ✓ Implemented | ✗ MISSING |

### Evidence: SignOutConfirmDialog.tsx

**Escape handling present (lines 14-26):**
```tsx
useEffect(() => {
  if (!open) return;
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      onOpenChange(false);
    }
  }
  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, [open, onOpenChange]);
```

**Missing implementations:**
- No `useRef` for dialog container to manage focus
- No `FocusTrap` component or `tabIndex` management
- No Enter key handler to trigger `onConfirm`

### Evidence: NavigationGuard.tsx (GuardDialog)

**No keyboard handling found:**
- Lines 16-74 define `GuardDialog` — no `onKeyDown`, no focus management
- Uses inline styles without accessibility enhancements
- Buttons are natively keyboard-accessible (Tab + Space/Enter on focused button works), but:
  - No Escape handler to close
  - No Enter handler at dialog level for primary action
  - No focus trap

### Code Review Link

This finding aligns with **Code Review M-2**: "Missing focus trap + Enter-to-submit in SignOutConfirmDialog"

---

## Performance

**Verdict: PASS ✓**

### Evidence

| Checkpoint | Status | Analysis |
|------------|--------|----------|
| State operations are O(1) | ✓ | `useUnsavedChanges.tsx` uses `Set<UnsavedSource>` — add/delete/has are O(1) |
| No expensive re-renders | ✓ | Context value object created inside provider; consumers re-render only when context changes |
| No blocking operations | ✓ | All operations are synchronous in-memory; no API calls in state management |
| beforeunload is lightweight | ✓ | Handler in NavigationGuard.tsx (lines 98-106) only checks boolean `isDirty` |

### Memory Profile

- `UnsavedSource` type has 3 possible values — Set size capped at 3 entries max
- `getSignOutMessage` creates strings on demand — no pre-computed storage

**No performance concerns identified.**

---

## Security

**Verdict: PASS ✓**

### Evidence

| Checkpoint | Status | Analysis |
|------------|--------|----------|
| No sensitive data in state | ✓ | `UnsavedSource` values are opaque identifiers ("mappings-editor", etc.) — no user data |
| No PII in dialog messages | ✓ | Messages are static templates referencing state sources, not content |
| Sign-out calls authenticated endpoint | ✓ | TopBar.tsx line 78: `apiFetch("/api/auth/logout", { method: "POST" })` |
| No state leakage across sessions | ✓ | Context resets on logout; `qc.clear()` clears React Query cache (line 82) |

**No security concerns identified.**

---

## Reliability

**Verdict: PASS ✓**

### Evidence

| Checkpoint | Status | Analysis |
|------------|--------|----------|
| Error boundary for useBlocker | ✓ | NavigationGuard.tsx lines 229-254: `NavigationGuardBoundary` catches errors and falls back to history-patching |
| Context cleanup on unmount | ✓ | useUnsavedChanges.tsx line 28: `return () => clearUnsaved(source)` in useEffect |
| beforeunload for hard navigation | ✓ | NavigationGuard.tsx lines 98-106: handles browser refresh/URL entry |
| Graceful degradation | ✓ | `NavigationGuardFallback` patches `history.pushState`/`replaceState` when data router unavailable |

### Edge Cases Handled

1. **MemoryRouter in tests:** Error boundary catches `useBlocker` error and switches to fallback
2. **Direct URL entry:** `beforeunload` event triggers browser's native confirmation
3. **Network failure on sign-out:** TopBar.tsx lines 79-81 catch and proceed with client-side cleanup

**No reliability concerns identified.**

---

## Findings Summary

### BLOCKER (0)

None.

### MAJOR (1)

| ID | NFR | Component | Finding | Remediation |
|----|-----|-----------|---------|-------------|
| **M-1** | NFR-19 | SignOutConfirmDialog | Missing focus trap and Enter-to-submit keyboard handling | Add `useFocusTrap` hook or wrap with focus-trap component; add Enter key handler to trigger `onConfirm` |

### MINOR (0)

None.

---

## Remediation Plan

### M-1: SignOutConfirmDialog Keyboard Accessibility

**Required changes to SignOutConfirmDialog.tsx:**

1. **Focus trap:** Use `useRef` + `useEffect` to trap Tab focus within modal:
   ```tsx
   const dialogRef = useRef<HTMLDivElement>(null);
   
   useEffect(() => {
     if (open) {
       const focusableElements = dialogRef.current?.querySelectorAll<HTMLElement>(
         'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
       );
       if (focusableElements?.length) {
         focusableElements[0].focus();
       }
     }
   }, [open]);
   ```

2. **Enter-to-submit:** Extend keydown handler:
   ```tsx
   if (e.key === "Escape") {
     onOpenChange(false);
   } else if (e.key === "Enter") {
     onConfirm();
   }
   ```

3. **Optional: NavigationGuard consistency:** Apply same patterns to GuardDialog for Escape and Enter handling.

**Effort estimate:** 1 hour

---

## Verdict Summary

| NFR | Status | Notes |
|-----|--------|-------|
| NFR-15 | **PASS** | Destructive actions require explicit confirmation — fully implemented |
| NFR-19 | **MAJOR** | Keyboard accessibility incomplete — focus trap and Enter-to-submit missing |

**Gate Decision:** Story 4.6 may proceed to completion. M-1 should be addressed in a follow-up story or before release gate.

---

## Appendix: Test Design Cross-Reference

From [test-design-epic-4.md](../_bmad-output/test-artifacts/test-design/test-design-epic-4.md):

| NFR | Planned Validation | This Assessment |
|-----|-------------------|-----------------|
| NFR-15 | E2E: Destructive action → confirmation dialog required | ✓ Evidence confirms implementation |
| NFR-19 | Playwright keyboard-only E2E | ✗ Implementation gaps would cause E2E failure — remediate first |
