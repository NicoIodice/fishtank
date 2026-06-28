import { useState } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";

export type RowDetailStyleValue = "modal" | "drawer" | "panel";

export interface UseRowDetailStyleResult {
  /** User's stored preference (default: "modal"). */
  rowDetailStyle: RowDetailStyleValue;
  /** Effective style after applying mobile override (always "modal" when viewport < 640px). */
  effectiveStyle: RowDetailStyleValue;
  /** Persist a new preference to localStorage. */
  setRowDetailStyle: (style: RowDetailStyleValue) => void;
}

const STORAGE_KEY = "fishtank-appearance-settings";
const DEFAULT_STYLE: RowDetailStyleValue = "modal";

function readStyleFromStorage(): RowDetailStyleValue {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { rowDetailStyle?: unknown };
      if (
        parsed.rowDetailStyle === "drawer" ||
        parsed.rowDetailStyle === "panel" ||
        parsed.rowDetailStyle === "modal"
      ) {
        return parsed.rowDetailStyle;
      }
    }
  } catch {
    // ignore
  }
  return DEFAULT_STYLE;
}

export function useRowDetailStyle(): UseRowDetailStyleResult {
  const isMobile = useMediaQuery("(max-width: 639px)");

  const [rowDetailStyle, setRowDetailStyleState] =
    useState<RowDetailStyleValue>(() => readStyleFromStorage());

  function setRowDetailStyle(style: RowDetailStyleValue) {
    setRowDetailStyleState(style);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const existing = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...existing, rowDetailStyle: style }),
      );
    } catch {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ rowDetailStyle: style }),
        );
      } catch {
        // ignore
      }
    }
  }

  const effectiveStyle: RowDetailStyleValue = isMobile
    ? "modal"
    : rowDetailStyle;

  return { rowDetailStyle, effectiveStyle, setRowDetailStyle };
}
