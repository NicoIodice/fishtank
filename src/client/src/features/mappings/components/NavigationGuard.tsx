import React, {
  Component,
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useRef,
} from "react";
import { useBlocker } from "react-router-dom";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import styles from "./NavigationGuard.module.css";

interface NavigationGuardProps {
  isDirty: boolean;
}

// ─── Dialog UI (shared by both data-router and history-patch paths) ──────────

interface GuardDialogProps {
  onStay: () => void;
  onDiscard: () => void;
}

function GuardDialog({ onStay, onDiscard }: GuardDialogProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  // Stable ref so the Escape effect never tears down/re-attaches on re-render
  const onStayRef = useRef(onStay);
  useLayoutEffect(() => {
    onStayRef.current = onStay;
  });

  // Trap focus within the dialog (NFR-19)
  useFocusTrap(contentRef, true);

  // Escape key → stay on page (NFR-19); empty deps — always reads latest via ref
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onStayRef.current();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Unsaved changes"
      data-testid="dialog-navigation-guard"
      className={styles.backdrop}
    >
      <div
        ref={contentRef}
        className={styles.dialog}
      >
        <h3 className={styles.title}>Unsaved Changes</h3>
        <p className={styles.body}>
          You have unsaved changes. If you leave now, your changes will be lost.
        </p>
        <div className={styles.actions}>
          <button
            data-testid="dialog-navigation-guard-cancel"
            type="button"
            onClick={onStay}
            className={styles.stayBtn}
          >
            Stay
          </button>
          <button
            data-testid="dialog-navigation-guard-confirm"
            type="button"
            onClick={onDiscard}
            className={styles.discardBtn}
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
 * Story 4.6: Added global context integration and beforeunload handler
 */
function BlockerDialog({ isDirty }: BlockerDialogProps) {
  const { registerUnsaved, clearUnsaved } = useUnsavedChanges();

  // Register/unregister with global unsaved changes context
  useEffect(() => {
    if (isDirty) {
      registerUnsaved("mappings-editor");
    } else {
      clearUnsaved("mappings-editor");
    }
    return () => clearUnsaved("mappings-editor");
  }, [isDirty, registerUnsaved, clearUnsaved]);

  // beforeunload handler for page refresh/direct URL navigation (AC-12)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = ""; // Required for Chrome
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

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
          detail: {
            url: targetUrl,
            proceed: () => original(data, unused, url),
          },
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
    return () =>
      window.removeEventListener(NAV_ATTEMPT_EVENT, handleNavAttempt);
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
