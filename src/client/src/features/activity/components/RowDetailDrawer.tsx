import React, { useEffect } from "react";
import type { ActivityRow } from "@/features/activity/types";
import { RowDetailContent } from "./RowDetailContent";

/**
 * RowDetailDrawer — Story 3.4
 * 320px right-side drawer, Esc to close. Updates in-place when row prop changes.
 * z-index: 50 per UX-DR14. aria-modal="false" (users can navigate table behind).
 */
export interface RowDetailDrawerProps {
  row: ActivityRow;
  onClose: () => void;
}

export function RowDetailDrawer({
  row,
  onClose,
}: RowDetailDrawerProps): React.ReactElement {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <>
      {/* Transparent backdrop captures click-outside to close (AC-2) */}
      <div
        data-testid="activity-row-detail-drawer-backdrop"
        aria-hidden="true"
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 49,
        }}
      />
      <div
        data-testid="activity-row-detail-drawer"
        role="complementary"
        aria-label="Request detail"
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: "320px",
        backgroundColor: "var(--surface-card, #fff)",
        boxShadow: "var(--shadow-overlay, -4px 0 20px rgba(0,0,0,.15))",
        zIndex: 50,
        overflow: "auto",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
          flexShrink: 0,
        }}
      >
        <h2 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 600 }}>
          Request Detail
        </h2>
        <button
          data-testid="activity-row-detail-close"
          aria-label="Close"
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "4px",
            color: "var(--content-fg, #374151)",
            lineHeight: 1,
          }}
        >
          <i className="bi bi-x-lg" aria-hidden="true" />
        </button>
      </div>

      <RowDetailContent row={row} />
    </div>
    </>
  );
}
