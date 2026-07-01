interface DeletedFileBannerProps {
  onClose: () => void;
}

/**
 * Inline banner displayed when the currently open file no longer exists on disk
 * after a Resync operation (AC-9).
 */
export function DeletedFileBanner({ onClose }: DeletedFileBannerProps) {
  return (
    <div
      data-testid="mappings-banner-deleted"
      role="alert"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "10px 16px",
        background: "var(--danger-subtle, #fef2f2)",
        borderBottom: "1px solid var(--danger, #ef4444)",
        color: "var(--content-fg, #374151)",
        fontSize: "0.875rem",
        flexShrink: 0,
      }}
    >
      <i
        className="bi bi-trash-fill"
        aria-hidden="true"
        style={{ color: "var(--danger, #ef4444)" }}
      />
      <span style={{ flex: 1 }}>File no longer exists on disk.</span>
      <button
        data-testid="mappings-btn-close-deleted"
        onClick={onClose}
        style={{
          padding: "4px 12px",
          border: "1px solid var(--input-border, #e5e7eb)",
          borderRadius: "4px",
          background: "var(--surface, #fff)",
          color: "var(--content-fg, #374151)",
          fontSize: "0.8125rem",
          cursor: "pointer",
        }}
      >
        Close
      </button>
    </div>
  );
}
