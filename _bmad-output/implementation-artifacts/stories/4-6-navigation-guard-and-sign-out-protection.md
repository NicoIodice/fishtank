---
story_id: "4.6"
story_key: "4-6-navigation-guard-and-sign-out-protection"
epic: 4
story_title: "Navigation Guard & Sign-Out Protection"
status: ready-for-dev
priority: high
frs_covered:
  - FR-21 (User navigating away from Mappings screen while unsaved Mapping edits exist triggers a confirmation prompt before the action proceeds)
  - FR-28 (Sign-out with unsaved Mapping edits, in-progress Add/Edit Service modal, or unsaved Mocks Root value shows confirmation dialog with title "Sign out?"; if no unsaved state, sign-out proceeds immediately)
ux_drs_covered:
  - EXPERIENCE.md Sign-out protection section (Dialog title, body text variations, actions, combined state messaging)
nfrs_addressed:
  - NFR-15 (Destructive actions require explicit confirmation — sign-out with unsaved state is destructive)
  - NFR-19 (Dialog keyboard-accessible — focus trap, Enter submits, Escape cancels)
architecture_items:
  - NEW src/client/src/hooks/useUnsavedChanges.ts — global state context for tracking all unsaved state sources
  - NEW src/client/src/components/dialogs/SignOutConfirmDialog.tsx — reusable sign-out confirmation dialog with dynamic body text
  - UPDATE src/client/src/features/mappings/pages/MappingsPage.tsx — wire React Router useBlocker for navigation guard
  - UPDATE src/client/src/components/layout/UserMenu.tsx — wire sign-out guard with SignOutConfirmDialog
  - UPDATE src/client/src/features/services/components/ServiceModal.tsx — expose isOpen/isDirty state to global context
  - UPDATE src/client/src/features/settings/pages/SettingsPage.tsx — expose pending Mocks Root state to global context
risk_links:
  - R-E4-002 (Navigation guard bypassed — React Router useBlocker not intercepting all navigation paths; HIGH priority score 6; mitigated by E2E tests covering all 5 trigger types)
---

# Story 4.6: Navigation Guard & Sign-Out Protection

## Story

**As a** developer,
**I want** to be warned before navigating away or signing out when I have unsaved Mapping edits or other unsaved state,
**So that** I never accidentally lose work I intended to save.

---

## Status

ready-for-dev

---

## Context

### Background

Epic 4 delivers the file management and mock-capture layer for Fishtank. **Story 4.1 (done)** shipped the backend file CRUD infrastructure. **Story 4.2 (done)** built the Mappings file explorer and dual-mode editor with basic navigation-away protection (a stub `useBlocker` that was not fully wired). **Story 4.3 (done)** added Resync UI with conflict banners. **Story 4.4 (done)** delivered the Mock Suggestion modal. **Story 4.5 (done)** completed Record mode with cross-screen indicator.

**Story 4.6 (this story)** completes the unsaved-state protection layer for Epic 4:
1. **Navigation guard** — Intercepts ALL route changes (sidebar nav, logo click, browser back/forward, direct URL entry) when unsaved Mapping edits exist, using React Router's `useBlocker` hook.
2. **Sign-out protection** — Before signing out, checks for multiple unsaved state sources (Mapping edits, pending Mocks Root path, in-progress Service modal) and displays a confirmation dialog with context-specific messaging.

This story closes the final gap in Epic 4 and directly addresses the high-priority risk **R-E4-002** (navigation guard bypassed).

### Scope Boundaries

- **Story 4.2 (done):** Established Mappings editor with `hasUnsavedChanges` state — navigation guard stub present but not fully wired to all nav triggers.
- **This story (4.6):** Wires `useBlocker` for ALL navigation paths, creates global unsaved-state context, implements sign-out confirmation dialog with all body text variants.
- **Epic 5 (later):** Settings → Mocks Root edit UI with full save/discard flow. This story only tracks pending state for sign-out guard purposes; the edit flow itself is deferred.

### What Exists (consumable now)

**Mappings editor state** (`MappingsPage.tsx`):
```tsx
const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
// Updated when editor content differs from last-saved state
```
This state already exists. This story consumes it in the global context.

**Service modal state** (`ServiceModal.tsx`):
```tsx
const [isOpen, setIsOpen] = useState(false);
const [isDirty, setIsDirty] = useState(false);
// isDirty = form values differ from initial (create) or loaded (edit) values
```
This state already exists. This story exposes it to the global context.

**Sign-out handler** (`UserMenu.tsx`):
```tsx
const handleSignOut = async () => {
  await logout();
  navigate("/login");
};
```
This handler already exists. This story wraps it with guard logic.

**Settings page** (`SettingsPage.tsx`):
- Mocks Root path is displayed read-only in Story 4.2.
- An Edit button exists but the edit flow is deferred to Epic 5.
- For sign-out protection purposes, if an Edit input is visible with unsaved changes, that state must be tracked.

### What This Story Adds

**New files:**
1. `src/client/src/hooks/useUnsavedChanges.ts` — Context provider + hook for global unsaved state registry
2. `src/client/src/components/dialogs/SignOutConfirmDialog.tsx` — Reusable confirmation dialog

**Updated files:**
1. `MappingsPage.tsx` — Wire `useBlocker` with unsaved state, register state with global context
2. `UserMenu.tsx` — Wire sign-out guard, show `SignOutConfirmDialog` when unsaved state exists
3. `ServiceModal.tsx` — Register isOpen/isDirty with global context
4. `SettingsPage.tsx` — Register pending Mocks Root state with global context (if Edit mode exists)

---

## Acceptance Criteria

### AC-1: Navigation guard triggers on unsaved Mapping edits (FR-21, R-E4-002)
**Given** unsaved Mapping edits exist (editor content differs from last-saved state),
**When** the user attempts to navigate to another route via ANY mechanism (sidebar nav click, logo click, browser back button, direct URL entry),
**Then** React Router's `useBlocker` hook intercepts the navigation; a confirmation prompt appears with actions "Discard and navigate" (primary) and "Stay" (secondary).

### AC-2: Navigation guard "Discard and navigate" proceeds (FR-21)
**Given** the navigation guard confirmation prompt is showing,
**When** "Discard and navigate" is clicked,
**Then** unsaved changes are discarded; the editor reverts to last-saved state OR clears if creating new; navigation proceeds to the intended route.

### AC-3: Navigation guard "Stay" cancels navigation (FR-21)
**Given** the navigation guard confirmation prompt is showing,
**When** "Stay" is clicked or Escape is pressed,
**Then** the prompt closes; the user remains on the Mappings page; unsaved changes are preserved.

### AC-4: Sign-out with unsaved Mapping edits shows confirmation dialog (FR-28)
**Given** unsaved Mapping edits exist,
**When** sign-out is triggered (avatar menu → Sign out),
**Then** a dialog appears with:
- **Title:** "Sign out?"
- **Body:** "You have unsaved changes in the Mappings editor. Sign out now? Unsaved changes will be lost."
- **Actions:** Cancel (secondary) and Sign out (primary, destructive styling)

### AC-5: Sign-out with pending Mocks Root path shows confirmation dialog (FR-28)
**Given** an unsaved Mocks Root path value exists in Settings,
**When** sign-out is triggered,
**Then** the dialog body reads: "You have an unsaved Mocks Root path. Sign out now? Unsaved changes will be lost."

### AC-6: Sign-out with both unsaved Mapping edits AND pending Mocks Root path (FR-28)
**Given** BOTH unsaved Mapping edits AND pending Mocks Root path exist,
**When** sign-out is triggered,
**Then** the dialog body reads: "You have unsaved changes in the Mappings editor and an unsaved Mocks Root path. Sign out now? Unsaved changes will be lost."

### AC-7: Sign-out with in-progress Add/Edit Service modal (FR-28)
**Given** an Add Service or Edit Service modal is open with form data entered,
**When** sign-out is triggered,
**Then** the dialog body includes: "Any unsaved form data will be lost." — the modal is transient and does NOT independently block sign-out; instead it contributes to the combined message.

### AC-8: Sign-out with all three unsaved states (FR-28)
**Given** unsaved Mapping edits, pending Mocks Root path, AND in-progress Service modal all exist simultaneously,
**When** sign-out is triggered,
**Then** the dialog body combines all relevant warnings in a single coherent message (order: Mappings editor → Mocks Root path → form data).

### AC-9: Sign-out with no unsaved state proceeds immediately (FR-28)
**Given** NO unsaved state exists (no Mapping edits, no pending Mocks Root, no open Service modal with changes),
**When** sign-out is triggered,
**Then** sign-out proceeds immediately — no dialog shown; user is redirected to `/login`.

### AC-10: Sign-out confirmation "Cancel" keeps user signed in (FR-28)
**Given** the sign-out confirmation dialog is showing,
**When** "Cancel" is clicked or Escape is pressed,
**Then** the dialog closes; the user remains signed in; navigation does not occur; unsaved state is preserved.

### AC-11: Sign-out confirmation "Sign out" proceeds with sign-out (FR-28)
**Given** the sign-out confirmation dialog is showing,
**When** "Sign out" is clicked,
**Then** the `logout` API is called; on success, the user is redirected to `/login`; the dialog closes.

### AC-12: Navigation guard covers ALL 5 trigger types (R-E4-002)
**Given** unsaved Mapping edits exist,
**Then** the navigation guard intercepts navigation from all of these trigger types:
1. Sidebar nav click (e.g., clicking "Services" in the sidebar)
2. Logo click (clicking the Fishtank brand logo in the top bar)
3. Browser back button (history.back() or browser back arrow)
4. Browser forward button (history.forward() after going back)
5. Direct URL entry (typing a new URL in the address bar — this triggers `beforeunload`)

**Note:** For trigger type 5 (direct URL entry / page refresh), the browser's native `beforeunload` dialog appears (not the React confirmation prompt). This requires `window.onbeforeunload` handler in addition to `useBlocker`.

### AC-13: data-testid attributes (mandatory)
**Given** the implementation is complete,
**Then** all new interactive and structural elements carry canonical `data-testid` values:

| Element | `data-testid` |
|---|---|
| Navigation guard dialog | `dialog-navigation-guard` |
| Navigation guard "Discard and navigate" button | `dialog-navigation-guard-confirm` |
| Navigation guard "Stay" button | `dialog-navigation-guard-cancel` |
| Sign-out confirmation dialog | `dialog-signout-confirm` |
| Sign-out confirmation "Cancel" button | `dialog-signout-cancel` |
| Sign-out confirmation "Sign out" button | `dialog-signout-confirm-btn` |

---

## Technical Requirements

### Global Unsaved State Context

Create a React context to centralize unsaved state tracking. Each feature registers its unsaved state with this context; the sign-out guard reads from it.

**`src/client/src/hooks/useUnsavedChanges.ts`:**
```typescript
import { createContext, useContext, useState, useCallback, ReactNode } from "react";

// State source identifiers
export type UnsavedSource =
  | "mappings-editor"
  | "mocks-root-path"
  | "service-modal";

interface UnsavedChangesContextValue {
  /** Current set of unsaved state sources */
  unsavedSources: Set<UnsavedSource>;
  /** Register an unsaved state source */
  registerUnsaved: (source: UnsavedSource) => void;
  /** Unregister an unsaved state source */
  clearUnsaved: (source: UnsavedSource) => void;
  /** Check if any unsaved state exists */
  hasAnyUnsaved: boolean;
  /** Get human-readable message for sign-out dialog */
  getSignOutMessage: () => string | null;
}

const UnsavedChangesContext = createContext<UnsavedChangesContextValue | null>(null);

export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const [unsavedSources, setUnsavedSources] = useState<Set<UnsavedSource>>(new Set());

  const registerUnsaved = useCallback((source: UnsavedSource) => {
    setUnsavedSources(prev => new Set(prev).add(source));
  }, []);

  const clearUnsaved = useCallback((source: UnsavedSource) => {
    setUnsavedSources(prev => {
      const next = new Set(prev);
      next.delete(source);
      return next;
    });
  }, []);

  const hasAnyUnsaved = unsavedSources.size > 0;

  const getSignOutMessage = useCallback((): string | null => {
    if (unsavedSources.size === 0) return null;

    const parts: string[] = [];
    if (unsavedSources.has("mappings-editor")) {
      parts.push("unsaved changes in the Mappings editor");
    }
    if (unsavedSources.has("mocks-root-path")) {
      parts.push("an unsaved Mocks Root path");
    }
    if (unsavedSources.has("service-modal")) {
      parts.push("unsaved form data");
    }

    // Build combined message
    if (parts.length === 1) {
      return `You have ${parts[0]}. Sign out now? Unsaved changes will be lost.`;
    }
    if (parts.length === 2) {
      return `You have ${parts[0]} and ${parts[1]}. Sign out now? Unsaved changes will be lost.`;
    }
    // 3 sources
    return `You have ${parts[0]}, ${parts[1]}, and ${parts[2]}. Sign out now? Unsaved changes will be lost.`;
  }, [unsavedSources]);

  return (
    <UnsavedChangesContext.Provider value={{
      unsavedSources,
      registerUnsaved,
      clearUnsaved,
      hasAnyUnsaved,
      getSignOutMessage,
    }}>
      {children}
    </UnsavedChangesContext.Provider>
  );
}

export function useUnsavedChanges() {
  const ctx = useContext(UnsavedChangesContext);
  if (!ctx) throw new Error("useUnsavedChanges must be used within UnsavedChangesProvider");
  return ctx;
}
```

**Provider placement:** Wrap the `<RouterProvider>` (or the top-level app component inside the auth boundary) with `<UnsavedChangesProvider>`. This ensures all routes and components can access the context.

### React Router useBlocker for Navigation Guard

In `MappingsPage.tsx`, use React Router's `useBlocker` hook:

```typescript
import { useBlocker } from "react-router-dom";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";

// Inside component
const { registerUnsaved, clearUnsaved } = useUnsavedChanges();
const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

// Sync local state with global context
useEffect(() => {
  if (hasUnsavedChanges) {
    registerUnsaved("mappings-editor");
  } else {
    clearUnsaved("mappings-editor");
  }
  return () => clearUnsaved("mappings-editor");
}, [hasUnsavedChanges, registerUnsaved, clearUnsaved]);

// Navigation guard
const blocker = useBlocker(
  ({ currentLocation, nextLocation }) =>
    hasUnsavedChanges && currentLocation.pathname !== nextLocation.pathname
);

// Render confirmation dialog when blocker is blocked
{blocker.state === "blocked" && (
  <NavigationGuardDialog
    onConfirm={() => {
      setHasUnsavedChanges(false);  // Clear unsaved state
      blocker.proceed();            // Allow navigation
    }}
    onCancel={() => blocker.reset()}
  />
)}
```

### beforeunload for Direct URL Entry / Page Refresh

`useBlocker` does NOT intercept browser-level navigation (address bar change, refresh, window close). Add a `beforeunload` handler:

```typescript
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = "";  // Required for Chrome
    }
  };
  window.addEventListener("beforeunload", handleBeforeUnload);
  return () => window.removeEventListener("beforeunload", handleBeforeUnload);
}, [hasUnsavedChanges]);
```

**Note:** The browser shows its own generic dialog for `beforeunload` — this is expected behavior per web standards. The custom React dialog is only for in-app SPA navigation.

### Sign-Out Confirmation Dialog Component

**`src/client/src/components/dialogs/SignOutConfirmDialog.tsx`:**
```tsx
import * as Dialog from "@radix-ui/react-dialog";
// Or use shadcn/ui AlertDialog — follow existing project pattern

interface SignOutConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: string;
  onConfirm: () => void;
}

export function SignOutConfirmDialog({
  open,
  onOpenChange,
  message,
  onConfirm,
}: SignOutConfirmDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="..." />
        <Dialog.Content
          data-testid="dialog-signout-confirm"
          className="..."
          onEscapeKeyDown={() => onOpenChange(false)}
        >
          <Dialog.Title>Sign out?</Dialog.Title>
          <Dialog.Description>{message}</Dialog.Description>
          <div className="flex gap-2 justify-end">
            <button
              data-testid="dialog-signout-cancel"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </button>
            <button
              data-testid="dialog-signout-confirm-btn"
              onClick={onConfirm}
              className="destructive"  /* Apply destructive styling */
            >
              Sign out
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

**Follow project dialog patterns:** Check existing modals/dialogs in the codebase (e.g., Delete confirmation dialog from Story 4.2) and follow the same styling and component library patterns.

### UserMenu Sign-Out Guard Wiring

**In `UserMenu.tsx` (or wherever sign-out action is handled):**
```typescript
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { SignOutConfirmDialog } from "@/components/dialogs/SignOutConfirmDialog";

// Inside component
const { hasAnyUnsaved, getSignOutMessage } = useUnsavedChanges();
const [showSignOutDialog, setShowSignOutDialog] = useState(false);

const handleSignOutClick = () => {
  if (hasAnyUnsaved) {
    setShowSignOutDialog(true);
  } else {
    performSignOut();
  }
};

const performSignOut = async () => {
  await logout();
  navigate("/login");
};

// In render
<button onClick={handleSignOutClick}>Sign out</button>

{showSignOutDialog && (
  <SignOutConfirmDialog
    open={showSignOutDialog}
    onOpenChange={setShowSignOutDialog}
    message={getSignOutMessage()!}
    onConfirm={performSignOut}
  />
)}
```

### Service Modal State Registration

**In `ServiceModal.tsx`:**
```typescript
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";

// Inside component
const { registerUnsaved, clearUnsaved } = useUnsavedChanges();
const [isDirty, setIsDirty] = useState(false);

useEffect(() => {
  // Only register if modal is open AND has unsaved changes
  if (isOpen && isDirty) {
    registerUnsaved("service-modal");
  } else {
    clearUnsaved("service-modal");
  }
  return () => clearUnsaved("service-modal");
}, [isOpen, isDirty, registerUnsaved, clearUnsaved]);
```

### Settings Page Mocks Root State Registration

**In `SettingsPage.tsx`:**
If an edit mode for Mocks Root exists (even if the full save flow is deferred to Epic 5), register the pending state:
```typescript
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";

const { registerUnsaved, clearUnsaved } = useUnsavedChanges();
const [pendingMocksRoot, setPendingMocksRoot] = useState<string | null>(null);

useEffect(() => {
  if (pendingMocksRoot !== null) {
    registerUnsaved("mocks-root-path");
  } else {
    clearUnsaved("mocks-root-path");
  }
  return () => clearUnsaved("mocks-root-path");
}, [pendingMocksRoot, registerUnsaved, clearUnsaved]);
```

If no edit mode exists yet (fully deferred), the `mocks-root-path` source will never be registered, and the sign-out message will not mention it.

---

## Dev Notes

### Critical: Files to Read Before Implementing

1. **`src/client/src/features/mappings/pages/MappingsPage.tsx`** — read the full file to understand existing `hasUnsavedChanges` state management and where `useBlocker` should be integrated. Do NOT duplicate state logic.
2. **`src/client/src/components/layout/UserMenu.tsx`** (or equivalent — may be `TopBar.tsx` or a dropdown component) — read to understand the current sign-out handler structure before wrapping it with guard logic.
3. **`src/client/src/features/services/components/ServiceModal.tsx`** — read to understand existing `isOpen` and form state management. Identify where `isDirty` is calculated.
4. **`src/client/src/features/settings/pages/SettingsPage.tsx`** — read to understand the current Mocks Root display. Determine if an edit mode exists or if it's purely read-only (in which case, skip `mocks-root-path` registration).
5. **Any existing dialog/modal components** — check the project's existing dialog pattern (shadcn/ui AlertDialog, Radix Dialog, or custom) and follow the same pattern for `SignOutConfirmDialog`.

### Risk Mitigation: R-E4-002 (Navigation Guard Bypassed)

This is a **HIGH priority risk** (score 6). The E2E test suite MUST cover all 5 navigation trigger types:

1. **Sidebar nav click** — Playwright: `page.getByTestId("nav-services").click()` → assert dialog appears
2. **Logo click** — Playwright: `page.getByTestId("brand-logo").click()` → assert dialog appears
3. **Browser back button** — Playwright: `page.goBack()` → assert dialog appears
4. **Browser forward button** — Playwright: `page.goBack(); page.goForward()` → assert dialog appears
5. **Direct URL entry / refresh** — Playwright: `page.reload()` → browser's native `beforeunload` dialog appears (cannot be asserted in Playwright, but the handler must be present in code)

If ANY of these paths bypasses the guard, R-E4-002 is not mitigated.

### useBlocker React Router v6 Requirements

React Router v6.4+ `useBlocker` requires:
- The router must be created with `createBrowserRouter` (not `BrowserRouter` component) — verify this is the case in `router.tsx`.
- The `useBlocker` callback receives `{ currentLocation, nextLocation }` — compare pathnames to determine if navigation should be blocked.
- `blocker.state` values: `"unblocked"`, `"blocked"`, `"proceeding"`.
- Call `blocker.proceed()` to allow navigation after confirmation.
- Call `blocker.reset()` to cancel navigation and return to `"unblocked"` state.

### beforeunload Behavior

The `beforeunload` event is the browser's last line of defense. Key points:
- The event handler MUST call `e.preventDefault()` and set `e.returnValue = ""` (both are required for cross-browser support).
- The browser shows its OWN generic dialog — you cannot customize this text (browser security restriction).
- This covers: page refresh, closing the tab, typing a new URL in the address bar.
- Playwright CANNOT intercept `beforeunload` dialogs — the test verifies the handler EXISTS by checking that navigation is blocked (the test will hang waiting for dialog confirmation).

### Navigation Guard Dialog vs. Sign-Out Dialog

These are TWO SEPARATE dialogs:
1. **Navigation Guard Dialog** — Shown by `useBlocker` when navigating between routes (sidebar, logo, back/forward buttons). Actions: "Discard and navigate" / "Stay".
2. **Sign-Out Confirmation Dialog** — Shown when clicking "Sign out" with unsaved state. Actions: "Cancel" / "Sign out".

The navigation guard dialog is inline with `MappingsPage`; the sign-out dialog is a global component triggered from `UserMenu`. They are independent.

### Combined Sign-Out Messages

The sign-out dialog body is dynamically constructed based on which unsaved sources are registered:

| Sources | Body Text |
|---------|-----------|
| mappings-editor only | "You have unsaved changes in the Mappings editor. Sign out now? Unsaved changes will be lost." |
| mocks-root-path only | "You have an unsaved Mocks Root path. Sign out now? Unsaved changes will be lost." |
| service-modal only | "You have unsaved form data. Sign out now? Unsaved changes will be lost." |
| mappings-editor + mocks-root-path | "You have unsaved changes in the Mappings editor and an unsaved Mocks Root path. Sign out now? Unsaved changes will be lost." |
| mappings-editor + service-modal | "You have unsaved changes in the Mappings editor and unsaved form data. Sign out now? Unsaved changes will be lost." |
| mocks-root-path + service-modal | "You have an unsaved Mocks Root path and unsaved form data. Sign out now? Unsaved changes will be lost." |
| all three | "You have unsaved changes in the Mappings editor, an unsaved Mocks Root path, and unsaved form data. Sign out now? Unsaved changes will be lost." |

The `getSignOutMessage()` function in the context handles this logic.

### msw Handlers

This story does NOT add new API endpoints — all guards are frontend-only. No msw handler updates required.

---

## Test Design Reference

**From test-design-epic-4.md (Story 4-6 section):**

| Test Level | Test Scenario | Priority | Risk Link | Notes |
|------------|---------------|----------|-----------|-------|
| **Component** | Unsaved Mapping edits + route change → confirmation dialog via `useBlocker` | P0 | R-E4-002 | AC-1 |
| **Component** | Confirmation dialog: "Discard and navigate" vs "Stay" options | P1 | R-E4-002 | AC-2, AC-3 |
| **Component** | Sign-out with unsaved Mapping edits → dialog title "Sign out?", body mentions Mappings | P0 | — | AC-4 |
| **Component** | Sign-out with pending Mocks Root path → dialog body mentions Mocks Root | P1 | — | AC-5 |
| **Component** | Sign-out with both unsaved Mapping + Mocks Root → combined message | P1 | — | AC-6 |
| **Component** | Sign-out with in-progress Add/Edit Service modal → body includes "form data" mention | P2 | — | AC-7 |
| **Component** | No unsaved state → sign-out proceeds immediately, no dialog | P0 | — | AC-9 |
| **E2E** | Unsaved edit + sidebar nav click → confirmation dialog appears | P0 | R-E4-002 | AC-1, AC-12 |
| **E2E** | Unsaved edit + logo click → confirmation dialog appears | P1 | R-E4-002 | AC-12 |
| **E2E** | Unsaved edit + browser back button → confirmation dialog appears | P1 | R-E4-002 | AC-12 |
| **E2E** | Unsaved edit + sign-out → "Sign out?" dialog appears | P0 | — | AC-4 |
| **E2E** | Dialog Cancel → user stays on page, edits preserved | P1 | — | AC-3, AC-10 |
| **E2E** | Dialog "Sign out" → session ends, redirect to `/login` | P1 | — | AC-11 |

**Total test count:** 13 | **Effort estimate:** ~5–8 hours

---

## Tasks / Subtasks

- [ ] **Task 1: Create global unsaved changes context** (AC: 4–9)
  - [ ] 1.1 Create `src/client/src/hooks/useUnsavedChanges.ts` with `UnsavedChangesProvider` and `useUnsavedChanges` hook
  - [ ] 1.2 Define `UnsavedSource` union type: `"mappings-editor" | "mocks-root-path" | "service-modal"`
  - [ ] 1.3 Implement `registerUnsaved`, `clearUnsaved`, `hasAnyUnsaved`, `getSignOutMessage` in context
  - [ ] 1.4 Wrap application with `<UnsavedChangesProvider>` in the appropriate location (inside auth boundary, wrapping routes)

- [ ] **Task 2: Wire navigation guard in MappingsPage** (AC: 1–3, 12)
  - [ ] 2.1 Import `useBlocker` from `react-router-dom`
  - [ ] 2.2 Import `useUnsavedChanges` and register/clear `"mappings-editor"` based on existing `hasUnsavedChanges` state
  - [ ] 2.3 Configure `useBlocker` callback to block when `hasUnsavedChanges` is true and pathname changes
  - [ ] 2.4 Create navigation guard dialog component (or use existing dialog pattern) with `data-testid="dialog-navigation-guard"`
  - [ ] 2.5 Render dialog when `blocker.state === "blocked"`
  - [ ] 2.6 Wire "Discard and navigate" to clear state + `blocker.proceed()`
  - [ ] 2.7 Wire "Stay" to `blocker.reset()`

- [ ] **Task 3: Add beforeunload handler** (AC: 12)
  - [ ] 3.1 Add `useEffect` with `beforeunload` event listener in `MappingsPage.tsx`
  - [ ] 3.2 Handler calls `e.preventDefault()` and sets `e.returnValue = ""` when `hasUnsavedChanges` is true
  - [ ] 3.3 Clean up listener on unmount

- [ ] **Task 4: Create SignOutConfirmDialog component** (AC: 4–11)
  - [ ] 4.1 Create `src/client/src/components/dialogs/SignOutConfirmDialog.tsx`
  - [ ] 4.2 Accept props: `open`, `onOpenChange`, `message`, `onConfirm`
  - [ ] 4.3 Render dialog with title "Sign out?", dynamic body, Cancel and Sign out buttons
  - [ ] 4.4 Apply destructive styling to "Sign out" button
  - [ ] 4.5 Handle Escape key to cancel (via `onEscapeKeyDown` or dialog library default)
  - [ ] 4.6 Add `data-testid` attributes per AC-13

- [ ] **Task 5: Wire sign-out guard in UserMenu** (AC: 4, 9–11)
  - [ ] 5.1 Import `useUnsavedChanges` in `UserMenu.tsx` (or wherever sign-out is handled)
  - [ ] 5.2 Add state for `showSignOutDialog`
  - [ ] 5.3 Modify sign-out click handler: if `hasAnyUnsaved`, show dialog; else call `performSignOut()` directly
  - [ ] 5.4 Render `SignOutConfirmDialog` with `getSignOutMessage()` as body
  - [ ] 5.5 Wire dialog confirm to `performSignOut()`

- [ ] **Task 6: Register Service modal state with global context** (AC: 7, 8)
  - [ ] 6.1 Import `useUnsavedChanges` in `ServiceModal.tsx`
  - [ ] 6.2 Add `useEffect` to register/clear `"service-modal"` based on `isOpen && isDirty`
  - [ ] 6.3 Ensure cleanup on modal close or unmount

- [ ] **Task 7: Register Settings Mocks Root state (if applicable)** (AC: 5, 6, 8)
  - [ ] 7.1 Review `SettingsPage.tsx` — determine if Mocks Root edit mode exists
  - [ ] 7.2 If edit mode exists: import `useUnsavedChanges` and register/clear `"mocks-root-path"` based on pending edit state
  - [ ] 7.3 If edit mode is fully deferred: skip this task (document in completion notes)

- [ ] **Task 8: Component tests** (AC: 1–9)
  - [ ] 8.1 Test: `MappingsPage` with unsaved changes + route change → dialog renders
  - [ ] 8.2 Test: "Discard and navigate" calls `blocker.proceed()` and clears state
  - [ ] 8.3 Test: "Stay" calls `blocker.reset()` and preserves state
  - [ ] 8.4 Test: Sign-out with each unsaved source → correct dialog body
  - [ ] 8.5 Test: Sign-out with no unsaved state → no dialog, logout called
  - [ ] 8.6 Test: Sign-out dialog Cancel → dialog closes, no logout
  - [ ] 8.7 Test: Sign-out dialog confirm → logout called

- [ ] **Task 9: E2E tests** (AC: 1, 12, R-E4-002)
  - [ ] 9.1 Navigate to Mappings, make edit, click sidebar nav → dialog appears
  - [ ] 9.2 Navigate to Mappings, make edit, click logo → dialog appears
  - [ ] 9.3 Navigate to Mappings, make edit, browser back → dialog appears
  - [ ] 9.4 Navigate to Mappings, make edit, click sign-out → sign-out dialog appears
  - [ ] 9.5 Sign-out dialog Cancel → user stays signed in
  - [ ] 9.6 Sign-out dialog "Sign out" → redirected to /login

---

## Previous Story Intelligence

### Learnings from Story 4.5 (Record Mode)

**Review findings applicable to this story:**
- **B-2 pattern (null treated as falsy):** When using boolean state that can be null during initialization, use explicit checks (`!== false` or `=== true`) rather than truthy/falsy evaluation to avoid incorrect initial renders.
- **M-1 pattern (missing onError):** Add `onError` callbacks to mutations that could fail (e.g., logout could fail due to network issues).

**Applicable code patterns:**
- SignalR connection state pattern from Story 4.5 is NOT applicable here — this story is frontend-only with no SignalR.
- The `useRecordingState` hook pattern (React Query for server state) is NOT applicable — unsaved changes tracking is client-side state only.

### Files Modified in Story 4.5 That May Be Relevant

- `TopBar.tsx` — if sign-out is in TopBar's user menu, that's where the guard goes
- `ActivityPage.tsx` — example of how to integrate `useBlocker` (if it was used there; may not be)

---

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

---

### Review Findings

_To be populated after code review_
