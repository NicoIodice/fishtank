import React, { Component, useState, useEffect, useCallback } from "react";
import { useBlocker } from "react-router-dom";

interface NavigationGuardProps {
  isDirty: boolean;
}

// ─── Dialog UI (shared by both data-router and history-patch paths) ──────────

interface GuardDialogProps {
  onStay: () => void;
  onDiscard: () => void;
}

function GuardDialog({ onStay, onDiscard }: GuardDialogProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Unsaved changes"
      data-testid="mappings-modal-discard-confirm"
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        background: "rgba(0,0,0,0.5)",
      }}
    >
      <div
        style={{
          background: "var(--surface, #fff)",
          borderRadius: "8px",
          padding: "24px",
          minWidth: "320px",
          maxWidth: "480px",
          width: "100%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        <h3 style={{ margin: "0 0 12px", fontSize: "1rem", fontWeight: 600 }}>
          Unsaved Changes
        </h3>
        <p style={{ margin: "0 0 20px", fontSize: "0.9375rem", color: "var(--content-fg, #374151)" }}>
          You have unsaved changes. If you leave now, your changes will be lost.
        </p>
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <button
            data-testid="mappings-btn-discard-cancel"
            type="button"
            onClick={onStay}
            style={{
              padding: "8px 16px",
              border: "1px solid var(--input-border, #e5e7eb)",
              borderRadius: "4px",
              background: "transparent",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            Stay / Cancel
          </button>
          <button
            data-testid="mappings-btn-discard-confirm"
            type="button"
            onClick={onDiscard}
            style={{
              padding: "8px 16px",
              border: "none",
              borderRadius: "4px",
              background: "var(--danger, #ef4444)",
              color: "#fff",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 600,
            }}
          >
            Discard and navigate
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Data-router path: uses useBlocker ───────────────────────────────────────

interface BlockerDialogProps {
  isDirty: boolean;
}

/**
 * Inner component that calls useBlocker.
 * Rendered inside an ErrorBoundary so that if useBlocker throws
 * (e.g. when used inside MemoryRouter in tests), it degrades gracefully and
 * NavigationGuardFallback takes over using history-patching instead.
 *
 * Story 4.6: generalize guard + sign-out protection
 */
function BlockerDialog({ isDirty }: BlockerDialogProps) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname,
  );

  if (blocker.state !== "blocked") return null;

  return (
    <GuardDialog
      onStay={() => blocker.reset?.()}
      onDiscard={() => blocker.proceed?.()}
    />
  );
}

// ─── Fallback path: patches window.history when data router unavailable ───────

const NAV_ATTEMPT_EVENT = "__fishtank_nav_attempt__";

/**
 * Fallback navigation guard used when useBlocker is unavailable (MemoryRouter).
 * Patches window.history.pushState and window.history.replaceState to fire a
 * custom event so the guard can intercept programmatic navigation.
 */
function NavigationGuardFallback({ isDirty }: { isDirty: boolean }) {
  const [blocked, setBlocked] = useState(false);
  const [pendingFn, setPendingFn] = useState<(() => void) | null>(null);

  useEffect(() => {
    const origPush = window.history.pushState.bind(window.history);
    const origReplace = window.history.replaceState.bind(window.history);

    function intercept(
      original: typeof window.history.pushState,
      data: unknown,
      unused: string,
      url?: string | URL | null,
    ) {
      const targetUrl = url ? String(url) : window.location.href;
      // Dispatch custom event for the guard to pick up
      window.dispatchEvent(
        new CustomEvent(NAV_ATTEMPT_EVENT, {
          detail: { url: targetUrl, proceed: () => original(data, unused, url) },
        }),
      );
    }

    window.history.pushState = (data, unused, url) => {
      intercept(origPush, data, unused, url);
    };
    window.history.replaceState = (data, unused, url) => {
      intercept(origReplace, data, unused, url);
    };

    return () => {
      window.history.pushState = origPush;
      window.history.replaceState = origReplace;
    };
  }, []);

  const handleNavAttempt = useCallback(
    (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        url: string;
        proceed: () => void;
      };
      if (isDirty) {
        setBlocked(true);
        setPendingFn(() => detail.proceed);
      } else {
        detail.proceed();
      }
    },
    [isDirty],
  );

  useEffect(() => {
    window.addEventListener(NAV_ATTEMPT_EVENT, handleNavAttempt);
    return () => window.removeEventListener(NAV_ATTEMPT_EVENT, handleNavAttempt);
  }, [handleNavAttempt]);

  if (!blocked) return null;

  return (
    <GuardDialog
      onStay={() => {
        setBlocked(false);
        setPendingFn(null);
      }}
      onDiscard={() => {
        setBlocked(false);
        if (pendingFn) pendingFn();
        setPendingFn(null);
      }}
    />
  );
}

// ─── Error boundary wrapping BlockerDialog ────────────────────────────────────

interface BoundaryState {
  hasError: boolean;
}

interface BoundaryProps {
  isDirty: boolean;
}

/**
 * Error boundary that catches the error thrown by useBlocker when it is used
 * outside a data router (e.g. inside MemoryRouter in unit tests).
 * Falls back to history-patching approach via NavigationGuardFallback.
 */
class NavigationGuardBoundary extends Component<
  React.PropsWithChildren<BoundaryProps>,
  BoundaryState
> {
  constructor(props: React.PropsWithChildren<BoundaryProps>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      // useBlocker not available — use history-patching fallback
      return <NavigationGuardFallback isDirty={this.props.isDirty} />;
    }
    return this.props.children;
  }
}

export function NavigationGuard({ isDirty }: NavigationGuardProps) {
  return (
    <NavigationGuardBoundary isDirty={isDirty}>
      <BlockerDialog isDirty={isDirty} />
    </NavigationGuardBoundary>
  );
}
