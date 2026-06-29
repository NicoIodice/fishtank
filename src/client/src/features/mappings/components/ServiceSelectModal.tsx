import { useState } from "react";
import type { TreeNode } from "../types/mappings";

interface ServiceSelectModalProps {
  isOpen: boolean;
  services: TreeNode[];
  onSelect: (serviceNode: TreeNode) => void;
  onCancel: () => void;
}

/**
 * Service selection modal shown when no service is selected and the user
 * tries to create a new mapping/response (AC-13).
 */
export function ServiceSelectModal({
  isOpen,
  services,
  onSelect,
  onCancel,
}: ServiceSelectModalProps) {
  const [selected, setSelected] = useState<string>("");

  if (!isOpen) return null;

  const handleConfirm = () => {
    const svc = services.find((s) => s.path === selected);
    if (svc) onSelect(svc);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Select service"
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
        <h3 style={{ margin: "0 0 16px", fontSize: "1rem", fontWeight: 600 }}>Select a Service</h3>
        <p style={{ fontSize: "0.875rem", color: "var(--content-muted)", marginBottom: "12px" }}>
          Choose which service to create the file in:
        </p>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          aria-label="Select service"
          style={{
            width: "100%",
            padding: "8px 10px",
            border: "1px solid var(--input-border, #e5e7eb)",
            borderRadius: "4px",
            fontSize: "0.875rem",
            marginBottom: "16px",
          }}
        >
          <option value="">— select a service —</option>
          {services.map((svc) => (
            <option key={svc.path} value={svc.path}>
              {svc.name}
            </option>
          ))}
        </select>
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
            type="button"
            onClick={handleConfirm}
            disabled={!selected}
            style={{
              padding: "8px 16px",
              border: "none",
              borderRadius: "4px",
              background: "var(--brand, #3b82f6)",
              color: "#fff",
              cursor: selected ? "pointer" : "not-allowed",
              fontSize: "0.875rem",
              opacity: selected ? 1 : 0.6,
            }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
