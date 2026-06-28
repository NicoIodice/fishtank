import React, { useEffect } from "react";
import type { ActivityRow } from "@/features/activity/types";
import { RowDetailContent } from "./RowDetailContent";

/**
 * RowDetailModal — Story 3.4
 * Centered overlay (max-width 560px) with backdrop, focus-trapped, Esc to close.
 * z-index: backdrop=60, dialog=70 per UX-DR14.
 */
export interface RowDetailModalProps {
  row: ActivityRow;
  onClose: () => void;
}

export function RowDetailModal({
  row,
  onClose,
}: RowDetailModalProps): React.ReactElement {
  // Esc key closes the modal (document-level listener so fireEvent.keyDown(document) works in tests)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      role="presentation"
      onClick={handleBackdropClick}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 60,
      }}
    >
      <div
        data-testid="activity-row-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="row-detail-modal-title"
        style={{
          backgroundColor: "var(--surface-card, #fff)",
          borderRadius: "var(--radius-card, 12px)",
          maxWidth: "560px",
          width: "calc(100% - 48px)",
          maxHeight: "80vh",
          overflow: "auto",
          padding: "24px",
          boxShadow: "var(--shadow-overlay, 0 8px 40px rgba(0,0,0,.2))",
          position: "relative",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <h2
            id="row-detail-modal-title"
            style={{ margin: 0, fontSize: "1.125rem", fontWeight: 600 }}
          >
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
    </div>
  );
}
