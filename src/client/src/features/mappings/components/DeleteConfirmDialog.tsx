interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Delete confirmation dialog with exact copy text from DESIGN.md (AC-14, NFR-15).
 * No optimistic delete — file is only removed after DELETE returns 200.
 */
export function DeleteConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
}: DeleteConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Confirm delete"
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
        <h3 style={{ margin: "0 0 12px", fontSize: "1rem", fontWeight: 600, color: "var(--danger, #ef4444)" }}>
          Delete Mapping
        </h3>
        <p style={{ margin: "0 0 20px", fontSize: "0.9375rem", color: "var(--content-fg, #374151)" }}>
          Delete this mapping? This removes the file from disk.
        </p>
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <button
            type="button"
            aria-label="Cancel"
            onClick={onCancel}
            style={{
              padding: "8px 16px",
              border: "1px solid var(--input-border, #e5e7eb)",
              borderRadius: "4px",
              background: "transparent",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            aria-label="Confirm delete"
            onClick={onConfirm}
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
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
