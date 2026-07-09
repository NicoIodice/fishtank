import { type RefObject, useEffect } from "react";

const FOCUSABLE_SELECTORS =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Traps keyboard focus within a container element while `enabled` is true.
 *
 * - Moves focus to the first focusable child on activation.
 * - Tab and Shift+Tab cycle within the container; focus cannot leave.
 *
 * Usage:
 *   const ref = useRef<HTMLDivElement>(null);
 *   useFocusTrap(ref, isOpen);
 *   return <div ref={ref}>…</div>;
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled) return;
    const container = containerRef.current;
    if (!container) return;

    // Move focus into the dialog on open;
    // save the previously-focused element so we can restore it on close
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusables = Array.from(
      container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS),
    );
    if (focusables.length > 0) {
      focusables[0].focus();
    }

    function handleTab(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const focusable = Array.from(
        container!.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleTab);
    return () => {
      document.removeEventListener("keydown", handleTab);
      // Restore focus to whichever element was active before the dialog opened
      // (WCAG 2.1 SC 2.4.3 — Focus Order)
      previouslyFocused?.focus();
    };
  }, [enabled, containerRef]);
}
