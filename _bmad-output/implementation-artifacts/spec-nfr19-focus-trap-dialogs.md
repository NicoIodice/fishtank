---
title: 'fix(a11y): NFR-19 focus trap for sign-out and navigation guard dialogs'
type: 'bugfix'
created: '2026-07-09'
status: 'done'
route: 'one-shot'
---

## Intent

**Problem:** `SignOutConfirmDialog` and `NavigationGuard`'s `GuardDialog` lacked a focus trap and did not restore focus on close, violating WCAG 2.1 SC 2.4.3 (Focus Order). Keyboard users could Tab out of the dialogs and had no focus returned after dismissal.

**Approach:** Extracted a reusable `useFocusTrap(containerRef, enabled)` hook that moves focus into the dialog on open, cycles Tab/Shift+Tab within it, and restores the previously-focused element on close. Applied the hook to both dialog components; added an Escape handler to `GuardDialog` using a callbackRef to avoid unstable effect deps.

## Suggested Review Order

1. [src/client/src/hooks/useFocusTrap.ts](../../src/client/src/hooks/useFocusTrap.ts) — new hook: focus movement, Tab cycle, focus restoration on cleanup
2. [src/client/src/components/dialogs/SignOutConfirmDialog.tsx](../../src/client/src/components/dialogs/SignOutConfirmDialog.tsx) — added `modalRef` + `useFocusTrap(modalRef, open)`
3. [src/client/src/features/mappings/components/NavigationGuard.tsx](../../src/client/src/features/mappings/components/NavigationGuard.tsx) — added `contentRef` + `useFocusTrap(contentRef, true)` + callbackRef Escape handler in `GuardDialog`
4. [src/client/tests/unit/components/SignOutConfirmDialog.test.tsx](../../src/client/tests/unit/components/SignOutConfirmDialog.test.tsx) — 4 new NFR-19 tests: initial focus, Tab wrap forward, Shift+Tab wrap backward, Enter-to-confirm
