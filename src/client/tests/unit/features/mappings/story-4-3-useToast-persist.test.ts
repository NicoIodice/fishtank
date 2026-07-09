/**
 * ATDD unit tests — Story 4.3: Resync UI with Toast Feedback & Conflict Banners
 * Layer: Unit (Vitest + renderHook)
 *
 * RED PHASE — these tests cover the NEW `persist` parameter added to `useToast`
 * in Story 4.3. The current `useToast` does NOT support `persist` and always
 * auto-dismisses after 4 s regardless of variant.
 *
 * These tests WILL FAIL until `lib/useToast.ts` is updated per Task 3:
 *   3.1  Add optional `persist?: boolean` parameter to showToast()
 *   3.2  When persist=true, do NOT set the auto-dismiss timeout
 *   3.3  Default: persist=false for success/info, persist=true for error
 *
 * ACs covered:
 *   AC-16 — Error toasts persist until user dismisses (not auto-dismiss after 4 s)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

import { useToast } from "@/lib/useToast";

// ─────────────────────────────────────────────────────────────────────────────

describe("useToast — persist parameter (AC-16)", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  describe("error variant — auto-persist by default (new behaviour)", () => {
    it("error toast does NOT auto-dismiss after 4 s (AC-16)", () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showToast("Resync failed — network error", "error");
      });

      expect(result.current.toasts).toHaveLength(1);

      // Advance past the 4 s auto-dismiss window
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Toast must still be present — error variant must persist
      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].message).toBe(
        "Resync failed — network error",
      );
    });

    it("error toast is dismissed when dismissToast is called explicitly", () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showToast("Resync failed", "error");
      });

      const id = result.current.toasts[0].id;

      act(() => {
        result.current.dismissToast(id);
      });

      expect(result.current.toasts).toHaveLength(0);
    });

    it("multiple error toasts all persist independently", () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showToast("Error 1", "error");
        result.current.showToast("Error 2", "error");
      });

      expect(result.current.toasts).toHaveLength(2);

      act(() => {
        vi.advanceTimersByTime(10000);
      });

      // Both must still be present
      expect(result.current.toasts).toHaveLength(2);
    });
  });

  describe("success variant — auto-dismiss preserved (existing behaviour)", () => {
    it("success toast still auto-dismisses after 4 s", () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showToast("5 mappings loaded in 850ms", "success");
      });

      expect(result.current.toasts).toHaveLength(1);

      act(() => {
        vi.advanceTimersByTime(4000);
      });

      expect(result.current.toasts).toHaveLength(0);
    });
  });

  describe("info variant — auto-dismiss preserved (existing behaviour)", () => {
    it("info toast still auto-dismisses after 4 s", () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showToast("Resyncing…", "info");
      });

      expect(result.current.toasts).toHaveLength(1);

      act(() => {
        vi.advanceTimersByTime(4000);
      });

      expect(result.current.toasts).toHaveLength(0);
    });
  });

  describe("explicit persist=true overrides default for any variant", () => {
    it("success toast with persist=true does NOT auto-dismiss", () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        // Explicit persist flag on a success toast
        result.current.showToast("Custom persistent success", "success", true);
      });

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Must still be present because persist=true was passed
      expect(result.current.toasts).toHaveLength(1);
    });

    it("error toast with persist=false auto-dismisses in 4 s", () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        // Explicit opt-out of persistence for an error toast
        result.current.showToast("Transient error", "error", false);
      });

      act(() => {
        vi.advanceTimersByTime(4000);
      });

      expect(result.current.toasts).toHaveLength(0);
    });
  });

  describe("showToast signature accepts persist as 3rd argument (Task 3.1)", () => {
    it("calling showToast with 3 args does not throw", () => {
      const { result } = renderHook(() => useToast());

      expect(() => {
        act(() => {
          result.current.showToast("Test", "error", true);
        });
      }).not.toThrow();
    });
  });
});
