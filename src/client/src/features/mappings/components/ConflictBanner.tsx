import React, { useState } from "react";

interface ConflictBannerProps {
  onViewDisk: () => void;
  onKeepEdits: () => void;
}

/**
 * Inline banner displayed when the currently open file has local unsaved changes
 * and Resync reported that the file was modified externally (AC-8).
 */
export function ConflictBanner({
  onViewDisk,
  onKeepEdits,
}: ConflictBannerProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  const bannerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "10px 16px",
    background: "var(--warning-subtle, #fffbeb)",
    borderBottom: "1px solid var(--warning, #f59e0b)",
    color: "var(--content-fg, #374151)",
    fontSize: "0.875rem",
    flexShrink: 0,
    flexWrap: "wrap",
  };

  if (showConfirm) {
    return (
      <div
        data-testid="mappings-banner-conflict"
        role="alertdialog"
        aria-modal="false"
        aria-label="Confirm discard local edits"
        style={bannerStyle}
      >
        <i
          className="bi bi-exclamation-triangle-fill"
          aria-hidden="true"
          style={{ color: "var(--warning, #f59e0b)" }}
        />
        <span style={{ flex: 1 }}>
          Viewing the disk version will discard your local edits. This cannot be
          undone.
        </span>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            data-testid="mappings-btn-view-disk-confirm"
            onClick={onViewDisk}
            style={{
              padding: "4px 12px",
              border: "1px solid var(--danger, #ef4444)",
              borderRadius: "4px",
              background: "var(--danger, #ef4444)",
              color: "#fff",
              fontSize: "0.8125rem",
              cursor: "pointer",
            }}
          >
            Discard &amp; view disk version
          </button>
          <button
            data-testid="mappings-btn-view-disk-cancel"
            autoFocus
            onClick={() => setShowConfirm(false)}
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
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="mappings-banner-conflict"
      role="alert"
      style={bannerStyle}
    >
      <i
        className="bi bi-exclamation-triangle-fill"
        aria-hidden="true"
        style={{ color: "var(--warning, #f59e0b)" }}
      />
      <span style={{ flex: 1 }}>
        This file was modified on disk since you started editing.
      </span>
      <div style={{ display: "flex", gap: "8px" }}>
        <button
          data-testid="mappings-btn-view-disk"
          onClick={() => setShowConfirm(true)}
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
          View disk version
        </button>
        <button
          data-testid="mappings-btn-keep-edits"
          onClick={onKeepEdits}
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
          Keep my edits
        </button>
      </div>
    </div>
  );
}
