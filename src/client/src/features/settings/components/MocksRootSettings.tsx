import React, { useState } from "react";
import { useMocksRoot } from "@/features/settings/hooks/useMocksRoot";

/**
 * Settings → Mocks Root section (AC-21, FR-20, UX-DR6).
 *
 * Displays the current Mocks Root path (read from the tree's mocksRoot).
 * For v1, the path is display-only (edit-with-validation deferred to Epic 5).
 * Edit affordance shows an inline warning about service restart + Resync.
 *
 * data-testid values verbatim from DESIGN.md:
 *   settings-input-mocks-root
 *   settings-btn-mocks-root-save
 *   settings-btn-mocks-root-discard
 *   settings-modal-mocks-root-confirm
 *   settings-btn-mocks-root-confirm
 */
export function MocksRootSettings() {
  const { data, isLoading } = useMocksRoot();
  const [showWarning, setShowWarning] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const mocksRoot = data?.mocksRoot ?? "";

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "0.8125rem",
    fontWeight: 600,
    color: "var(--content-muted, #6b7280)",
    marginBottom: "6px",
  };

  return (
    <section data-testid="settings-mocks-root">
      <p
        style={{
          fontSize: "0.875rem",
          color: "var(--content-muted, #6b7280)",
          marginBottom: "16px",
        }}
      >
        The directory where WireMock mapping and response files are stored. This
        path is configured at startup via the{" "}
        <code>FISHTANK_MOCKS_ROOT</code> environment variable.
      </p>

      <div style={{ marginBottom: "16px" }}>
        <label htmlFor="mocks-root-input" style={labelStyle}>
          Mocks Root Path
        </label>
        <input
          id="mocks-root-input"
          data-testid="settings-input-mocks-root"
          type="text"
          value={isLoading ? "Loading…" : mocksRoot}
          readOnly
          aria-readonly="true"
          style={{
            width: "100%",
            maxWidth: "480px",
            padding: "8px 10px",
            border: "1px solid var(--input-border, #e5e7eb)",
            borderRadius: "4px",
            fontSize: "0.875rem",
            background: "var(--input-bg-disabled, #f3f4f6)",
            color: "var(--content-fg, #374151)",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Edit affordance — shows inline warning about restart + Resync */}
      {!showWarning && (
        <button
          type="button"
          aria-label="Edit Mocks Root path"
          onClick={() => setShowWarning(true)}
          style={{
            padding: "6px 14px",
            border: "1px solid var(--input-border, #e5e7eb)",
            borderRadius: "4px",
            background: "transparent",
            color: "var(--content-fg, #374151)",
            fontSize: "0.875rem",
            cursor: "pointer",
            marginBottom: "16px",
          }}
        >
          Edit
        </button>
      )}

      {showWarning && (
        <div
          style={{
            padding: "12px 16px",
            border: "1px solid var(--warning, #f59e0b)",
            borderRadius: "6px",
            background: "var(--warning-bg, #fffbeb)",
            marginBottom: "16px",
          }}
        >
          <p
            style={{
              margin: "0 0 12px",
              fontSize: "0.875rem",
              color: "var(--content-fg, #374151)",
            }}
          >
            <strong>Warning:</strong> Changing the Mocks Root requires restarting
            services and running Resync to reload all mapping files. This change
            takes effect after a service restart.
          </p>
        </div>
      )}

      {/* Action buttons — always present in the section (AC-21) */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <button
          data-testid="settings-btn-mocks-root-save"
          type="button"
          aria-label="Save Mocks Root change"
          onClick={() => setShowConfirmModal(true)}
          style={{
            padding: "6px 14px",
            border: "none",
            borderRadius: "4px",
            background: "var(--brand, #3b82f6)",
            color: "#fff",
            fontSize: "0.875rem",
            cursor: "pointer",
          }}
        >
          Save
        </button>
        <button
          data-testid="settings-btn-mocks-root-discard"
          type="button"
          aria-label="Discard Mocks Root change"
          onClick={() => setShowWarning(false)}
          style={{
            padding: "6px 14px",
            border: "1px solid var(--input-border, #e5e7eb)",
            borderRadius: "4px",
            background: "transparent",
            color: "var(--content-fg, #374151)",
            fontSize: "0.875rem",
            cursor: "pointer",
          }}
        >
          Discard
        </button>
      </div>

      {/* Confirmation modal */}
      {showConfirmModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirm Mocks Root change"
          data-testid="settings-modal-mocks-root-confirm"
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
            <h3 style={{ margin: "0 0 12px", fontSize: "1rem", fontWeight: 600 }}>
              Confirm Mocks Root Change
            </h3>
            <p style={{ margin: "0 0 20px", fontSize: "0.875rem", color: "var(--content-fg)" }}>
              Changing the Mocks Root requires restarting services and running
              Resync. Are you sure?
            </p>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
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
                data-testid="settings-btn-mocks-root-confirm"
                type="button"
                aria-label="Confirm Mocks Root change"
                onClick={() => {
                  // For v1, edit-with-validation is deferred to Epic 5
                  setShowConfirmModal(false);
                  setShowWarning(false);
                }}
                style={{
                  padding: "8px 16px",
                  border: "none",
                  borderRadius: "4px",
                  background: "var(--brand, #3b82f6)",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
