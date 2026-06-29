import React, { useState } from "react";

interface FileNameModalProps {
  isOpen: boolean;
  initialValue?: string;
  title?: string;
  onConfirm: (filename: string) => void;
  onCancel: () => void;
}

/**
 * Modal for entering a file name (new file or rename).
 * Uses canonical data-testid values from DESIGN.md (AC-12, AC-15).
 */
export function FileNameModal({
  isOpen,
  initialValue = "",
  title = "File Name",
  onConfirm,
  onCancel,
}: FileNameModalProps) {
  const [value, setValue] = useState(initialValue);
  // Reset the field each time the modal transitions to open (and when the
  // initial value changes while open) using React's "adjust state during
  // render" pattern instead of a setState-in-effect.
  const [syncKey, setSyncKey] = useState<string | null>(null);
  const openKey = isOpen ? initialValue : null;
  if (isOpen && openKey !== syncKey) {
    setSyncKey(openKey);
    setValue(initialValue);
  } else if (!isOpen && syncKey !== null) {
    setSyncKey(null);
  }

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onConfirm(value.trim());
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      data-testid="mappings-modal-file-name"
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
        <h3 style={{ margin: "0 0 16px", fontSize: "1rem", fontWeight: 600 }}>{title}</h3>
        <form onSubmit={handleSubmit}>
          <label
            htmlFor="filename-input"
            style={{ display: "block", fontSize: "0.875rem", marginBottom: "6px", color: "var(--content-muted)" }}
          >
            Filename
          </label>
          <input
            id="filename-input"
            data-testid="mappings-input-filename"
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="my-mapping.json"
            autoFocus
            style={{
              width: "100%",
              padding: "8px 10px",
              border: "1px solid var(--input-border, #e5e7eb)",
              borderRadius: "4px",
              fontSize: "0.875rem",
              marginBottom: "16px",
              boxSizing: "border-box",
            }}
          />
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <button
              type="button"
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
              type="submit"
              disabled={!value.trim()}
              style={{
                padding: "8px 16px",
                border: "none",
                borderRadius: "4px",
                background: "var(--brand, #3b82f6)",
                color: "#fff",
                cursor: value.trim() ? "pointer" : "not-allowed",
                fontSize: "0.875rem",
                opacity: value.trim() ? 1 : 0.6,
              }}
            >
              Confirm
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
