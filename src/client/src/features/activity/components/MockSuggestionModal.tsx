import { useState, useEffect, useMemo } from "react";
import type { ActivityRow } from "../types";
import { useSaveAsMock } from "../hooks/useSaveAsMock";
import { useToast } from "@/lib/useToast";
import {
  generateMockSuggestion,
  prettyPrintJson,
} from "../utils/mockSuggestionGenerator";

interface MockSuggestionModalProps {
  row: ActivityRow;
  onClose: () => void;
}

/**
 * MockSuggestionModal: Modal for saving a proxied request as a WireMock mapping.
 *
 * Features:
 * - Two editable textareas: Mapping JSON and Response Body
 * - UseTransformer checkbox (default: true)
 * - Save/Close buttons
 * - Escape key closes modal
 * - Status mismatch warning (if user edits Response.StatusCode)
 * - Success: closes modal + originating row detail, shows toast, refreshes folder tree
 * - Failure: stays open, shows error message
 */
export function MockSuggestionModal({
  row,
  onClose,
}: MockSuggestionModalProps) {
  // Generate initial mock suggestion
  const { mappingJson, responseFilename, mappingFilename } =
    generateMockSuggestion(row);

  // State
  const [mappingContent, setMappingContent] = useState(
    JSON.stringify(mappingJson, null, 2),
  );
  const [responseContent, setResponseContent] = useState(
    prettyPrintJson(row.responseBody),
  );
  const [useTransformer, setUseTransformer] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Derived state: check for status mismatch warning
  const statusWarning = useMemo(() => {
    try {
      const parsed = JSON.parse(mappingContent);
      const editedStatus = parsed.Response?.StatusCode;
      return !!(editedStatus && editedStatus !== row.statusCode);
    } catch {
      return false;
    }
  }, [mappingContent, row.statusCode]);

  // Handle UseTransformer checkbox change
  const handleUseTransformerChange = (checked: boolean) => {
    setUseTransformer(checked);
    try {
      const parsed = JSON.parse(mappingContent);
      if (parsed.Response) {
        parsed.Response.UseTransformer = checked;
        setMappingContent(JSON.stringify(parsed, null, 2));
      }
    } catch {
      // Ignore JSON parse errors - user might be mid-edit
    }
  };

  // Hooks
  const { showToast } = useToast();
  const saveAsMock = useSaveAsMock({
    onSuccess: () => {
      showToast("Mock saved.", "success", false); // Auto-dismiss after 2s
      onClose(); // Close modal + originating row detail
    },
    onError: (err) => {
      setErrorMessage(
        `Failed to save mock — ${err.message}. Check System Events for details.`,
      );
    },
  });

  // Derive serviceSlug from serviceName if not provided
  const serviceSlug =
    row.serviceSlug ??
    row.serviceName.toLowerCase().replace(/[^a-z0-9_.-]/g, "-");

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Handle Save
  const handleSave = () => {
    setErrorMessage(null);
    saveAsMock.mutate({
      serviceSlug,
      mappingFilename,
      mappingContent,
      responseFilename,
      responseContent,
    });
  };

  return (
    <div
      data-testid="mock-suggestion-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mock-suggestion-modal-title"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={(e) => {
        // Close modal if clicking backdrop
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "8px",
          width: "90%",
          maxWidth: "900px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h2
            id="mock-suggestion-modal-title"
            style={{ fontSize: "1.25rem", fontWeight: 600, margin: 0 }}
          >
            Save As Mock
          </h2>
          <button
            onClick={onClose}
            aria-label="Close modal"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "1.5rem",
              color: "#6b7280",
              padding: "0 4px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            padding: "24px",
            overflowY: "auto",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: "24px",
          }}
        >
          {/* Mapping JSON section */}
          <div>
            <label
              htmlFor="mock-suggestion-mapping-json"
              style={{
                display: "block",
                fontWeight: 600,
                marginBottom: "8px",
                fontSize: "0.875rem",
              }}
            >
              Mapping
            </label>
            <textarea
              id="mock-suggestion-mapping-json"
              data-testid="mock-suggestion-mapping-json"
              value={mappingContent}
              onChange={(e) => setMappingContent(e.target.value)}
              style={{
                width: "100%",
                height: "200px",
                fontFamily: "monospace",
                fontSize: "0.875rem",
                padding: "8px",
                border: "1px solid #d1d5db",
                borderRadius: "4px",
                resize: "vertical",
              }}
            />
          </div>

          {/* Response Body section */}
          <div>
            <label
              htmlFor="mock-suggestion-response-body"
              style={{
                display: "block",
                fontWeight: 600,
                marginBottom: "8px",
                fontSize: "0.875rem",
              }}
            >
              Response Body — {responseFilename}
            </label>
            <textarea
              id="mock-suggestion-response-body"
              data-testid="mock-suggestion-response-body"
              value={responseContent}
              onChange={(e) => setResponseContent(e.target.value)}
              style={{
                width: "100%",
                height: "200px",
                fontFamily: "monospace",
                fontSize: "0.875rem",
                padding: "8px",
                border: "1px solid #d1d5db",
                borderRadius: "4px",
                resize: "vertical",
              }}
            />
          </div>

          {/* UseTransformer checkbox */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="checkbox"
              id="mock-suggestion-use-transformer"
              data-testid="mock-suggestion-use-transformer"
              checked={useTransformer}
              onChange={(e) => handleUseTransformerChange(e.target.checked)}
              style={{ cursor: "pointer" }}
            />
            <label
              htmlFor="mock-suggestion-use-transformer"
              style={{ fontSize: "0.875rem", cursor: "pointer" }}
            >
              Enable WireMock response templating
            </label>
          </div>

          {/* Status mismatch warning */}
          {statusWarning && (
            <div
              data-testid="mock-suggestion-status-warning"
              style={{
                padding: "12px",
                backgroundColor: "#fef3c7",
                border: "1px solid #fbbf24",
                borderRadius: "4px",
                fontSize: "0.875rem",
                color: "#92400e",
              }}
            >
              Filename reflects the original proxied status ({row.statusCode}).
              Consider renaming after saving if the response status has changed.
            </div>
          )}

          {/* Error message */}
          {errorMessage && (
            <div
              style={{
                padding: "12px",
                backgroundColor: "#fee2e2",
                border: "1px solid #ef4444",
                borderRadius: "4px",
                fontSize: "0.875rem",
                color: "#991b1b",
              }}
            >
              {errorMessage}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
          }}
        >
          <button
            data-testid="mock-suggestion-btn-close"
            onClick={onClose}
            style={{
              padding: "8px 16px",
              border: "1px solid #d1d5db",
              borderRadius: "4px",
              backgroundColor: "white",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 500,
            }}
          >
            Close
          </button>
          <button
            data-testid="mock-suggestion-btn-save"
            onClick={handleSave}
            disabled={saveAsMock.isPending}
            style={{
              padding: "8px 16px",
              border: "none",
              borderRadius: "4px",
              backgroundColor: saveAsMock.isPending ? "#93c5fd" : "#3b82f6",
              color: "white",
              cursor: saveAsMock.isPending ? "not-allowed" : "pointer",
              fontSize: "0.875rem",
              fontWeight: 500,
            }}
          >
            {saveAsMock.isPending ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
