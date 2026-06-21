import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

/**
 * Unit tests for the useTheme hook.
 *
 * RED PHASE — these tests define the expected hook contract.
 * They FAIL before implementation because src/client/src/lib/useTheme.ts does not exist.
 * They PASS once useTheme is created with the specified interface.
 *
 * Tested contract:
 *   - Reads initial theme from document.documentElement.dataset.theme
 *   - setTheme updates both the DOM attribute AND localStorage["fishtank-theme"]
 *   - All 4 valid theme values are accepted without error
 *   - Falls back to "clean-light" when dataset.theme is unset
 */

// Import will fail until src/client/src/lib/useTheme.ts is created — confirming RED phase.
import { useTheme } from "@/lib/useTheme";

const THEME_KEY = "fishtank-theme";
type Theme = "clean-light" | "deep-ocean" | "emerald-terminal" | "ink-amber";

beforeEach(() => {
  // Reset to clean-light as jsdom default state
  document.documentElement.dataset.theme = "clean-light";
  localStorage.removeItem(THEME_KEY);
});

afterEach(() => {
  document.documentElement.removeAttribute("data-theme");
  localStorage.removeItem(THEME_KEY);
});

describe("useTheme", () => {
  it("reads initial theme from document.documentElement.dataset.theme", () => {
    document.documentElement.dataset.theme = "deep-ocean";

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("deep-ocean");
  });

  it("falls back to 'clean-light' when dataset.theme is empty or unset", () => {
    document.documentElement.removeAttribute("data-theme");

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("clean-light");
  });

  it("setTheme updates document.documentElement.dataset.theme", () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setTheme("deep-ocean");
    });

    expect(document.documentElement.dataset.theme).toBe("deep-ocean");
    expect(result.current.theme).toBe("deep-ocean");
  });

  it("setTheme writes the theme to localStorage under 'fishtank-theme'", () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setTheme("emerald-terminal");
    });

    expect(localStorage.getItem(THEME_KEY)).toBe("emerald-terminal");
  });

  it("setTheme works for all 4 valid theme values", () => {
    const themes: Theme[] = [
      "clean-light",
      "deep-ocean",
      "emerald-terminal",
      "ink-amber",
    ];

    for (const theme of themes) {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setTheme(theme);
      });

      expect(result.current.theme).toBe(theme);
      expect(document.documentElement.dataset.theme).toBe(theme);
      expect(localStorage.getItem(THEME_KEY)).toBe(theme);
    }
  });

  it("setTheme does not throw when localStorage is unavailable", () => {
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error("localStorage unavailable");
    };

    const { result } = renderHook(() => useTheme());

    // Must not throw — visual change still applied
    expect(() => {
      act(() => {
        result.current.setTheme("ink-amber");
      });
    }).not.toThrow();

    // DOM is still updated even though localStorage threw
    expect(document.documentElement.dataset.theme).toBe("ink-amber");

    Storage.prototype.setItem = originalSetItem;
  });
});
