import React, { useState } from "react";
import type { ActivityRow } from "@/features/activity/types";

/**
 * RowDetailPanel — Story 3.4
 * Bottom half panel with Request / Response tabs. Close collapses panel and clears selection.
 * z-index: 70 per UX-DR14.
 */
export interface RowDetailPanelProps {
  row: ActivityRow;
  onClose: () => void;
}

export function RowDetailPanel({
  row,
  onClose,
}: RowDetailPanelProps): React.ReactElement {
  const [activeTab, setActiveTab] = useState<"request" | "response">("request");

  return (
    <div
      data-testid="activity-row-detail-panel"
      role="region"
      aria-label="Request detail"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: "40vh",
        minHeight: "100px",
        backgroundColor: "var(--surface-card, #fff)",
        boxShadow: "0 -4px 20px rgba(0,0,0,.15)",
        zIndex: 70,
        display: "flex",
        flexDirection: "column",
        borderTop: "1px solid #e5e7eb",
      }}
    >
      {/* Panel header — metadata + close */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "8px 16px",
          borderBottom: "1px solid #e5e7eb",
          flexShrink: 0,
          flexWrap: "wrap",
        }}
      >
        <span
          data-testid="activity-row-detail-method"
          style={{ fontWeight: 600, fontSize: "0.875rem" }}
        >
          {row.method}
        </span>
        <span
          data-testid="activity-row-detail-status-code"
          style={{ fontSize: "0.875rem" }}
        >
          {row.statusCode}
        </span>
        <span
          data-testid="activity-row-detail-url-path"
          style={{ flex: 1, fontSize: "0.875rem", wordBreak: "break-all" }}
        >
          {row.urlPath}
        </span>
        <span
          data-testid="activity-row-detail-request-id"
          style={{
            fontSize: "0.75rem",
            color: "var(--content-muted, #6b7280)",
            fontFamily: "monospace",
          }}
        >
          {row.id}
        </span>
        <span
          data-testid="activity-row-detail-type"
          style={{ fontSize: "0.75rem" }}
        >
          {row.type}
        </span>
        <span style={{ fontSize: "0.75rem" }}>
          <span data-testid="activity-row-detail-service-name">
            {row.serviceName}
          </span>
          {":"}
          <span data-testid="activity-row-detail-service-port">
            {row.servicePort}
          </span>
        </span>
        <span
          data-testid="activity-row-detail-datetime"
          style={{
            fontSize: "0.75rem",
            color: "var(--content-muted, #6b7280)",
            fontFamily: "monospace",
          }}
        >
          {row.timestamp}
        </span>

        {/* Save as Mock — proxied rows only */}
        {row.type === "Proxied" && (
          <button
            data-testid="activity-row-detail-save-mock"
            aria-label="Save as Mock"
            onClick={() => {
              /* no-op placeholder until Epic 4 Story 4.4 */
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              background: "none",
              border: "1px solid var(--brand, #3b82f6)",
              borderRadius: "4px",
              cursor: "pointer",
              padding: "4px 8px",
              color: "var(--brand, #3b82f6)",
              fontSize: "0.8125rem",
            }}
          >
            <i className="bi bi-lightning-charge" aria-hidden="true" />
            Save as Mock
          </button>
        )}

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
            marginLeft: "auto",
          }}
        >
          <i className="bi bi-x-lg" aria-hidden="true" />
        </button>
      </div>

      {/* Tab bar */}
      <div
        role="tablist"
        data-testid="activity-row-detail-tabs"
        style={{
          display: "flex",
          borderBottom: "1px solid #e5e7eb",
          padding: "0 16px",
          flexShrink: 0,
        }}
      >
        <button
          role="tab"
          data-testid="activity-row-detail-tab-request"
          aria-selected={activeTab === "request"}
          onClick={() => setActiveTab("request")}
          style={{
            padding: "8px 16px",
            background: "none",
            border: "none",
            borderBottom:
              activeTab === "request"
                ? "2px solid var(--brand, #3b82f6)"
                : "2px solid transparent",
            cursor: "pointer",
            fontWeight: activeTab === "request" ? 600 : 400,
            color:
              activeTab === "request"
                ? "var(--brand, #3b82f6)"
                : "var(--content-fg, #374151)",
          }}
        >
          Request
        </button>
        <button
          role="tab"
          data-testid="activity-row-detail-tab-response"
          aria-selected={activeTab === "response"}
          onClick={() => setActiveTab("response")}
          style={{
            padding: "8px 16px",
            background: "none",
            border: "none",
            borderBottom:
              activeTab === "response"
                ? "2px solid var(--brand, #3b82f6)"
                : "2px solid transparent",
            cursor: "pointer",
            fontWeight: activeTab === "response" ? 600 : 400,
            color:
              activeTab === "response"
                ? "var(--brand, #3b82f6)"
                : "var(--content-fg, #374151)",
          }}
        >
          Response
        </button>
      </div>

      {/* Tab content */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "12px 16px",
          fontFamily: "monospace",
          fontSize: "0.8125rem",
        }}
      >
        {activeTab === "request" && (
          <>
            <div
              data-testid="activity-row-detail-request-headers"
              style={{ marginBottom: "12px" }}
            >
              {Object.entries(row.requestHeaders).map(([key, value]) => (
                <div key={key} style={{ lineHeight: 1.6 }}>
                  <span style={{ color: "var(--content-muted, #6b7280)" }}>
                    {key}
                  </span>
                  {": "}
                  <span>{value}</span>
                </div>
              ))}
            </div>
            {row.requestBody != null && (
              <div
                data-testid="activity-row-detail-request-body"
                style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}
              >
                {row.requestBody}
              </div>
            )}
          </>
        )}

        {activeTab === "response" && (
          <>
            <div
              data-testid="activity-row-detail-response-headers"
              style={{ marginBottom: "12px" }}
            >
              {Object.entries(row.responseHeaders).map(([key, value]) => (
                <div key={key} style={{ lineHeight: 1.6 }}>
                  <span style={{ color: "var(--content-muted, #6b7280)" }}>
                    {key}
                  </span>
                  {": "}
                  <span>{value}</span>
                </div>
              ))}
            </div>
            {row.responseBody != null && (
              <div
                data-testid="activity-row-detail-response-body"
                style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}
              >
                {row.responseBody}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
