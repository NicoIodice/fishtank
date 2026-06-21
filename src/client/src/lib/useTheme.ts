import { useState, useCallback } from "react";

export type Theme =
  | "clean-light"
  | "deep-ocean"
  | "emerald-terminal"
  | "ink-amber";

const THEME_KEY = "fishtank-theme";

/**
 * Reads and sets the active Fishtank UI theme.
 *
 * - Initial state is read from `document.documentElement.dataset.theme`
 *   (set by main.tsx on first load — avoids a flash of default theme).
 * - `setTheme` updates the DOM attribute immediately for a live theme switch,
 *   then persists the selection to `localStorage["fishtank-theme"]`.
 * - localStorage write is wrapped in try/catch so the visual change is never
 *   blocked by sandboxed / privacy-restricted environments.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(
    () =>
      (document.documentElement.dataset.theme as Theme | undefined) ??
      "clean-light",
  );

  const setTheme = useCallback((newTheme: Theme) => {
    document.documentElement.dataset.theme = newTheme;
    try {
      localStorage.setItem(THEME_KEY, newTheme);
    } catch {
      // localStorage unavailable (sandboxed iframe, strict privacy mode).
      // The visual change is still applied via the DOM attribute.
    }
    setThemeState(newTheme);
  }, []);

  return { theme, setTheme };
}
