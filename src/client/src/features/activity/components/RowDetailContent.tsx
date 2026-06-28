import type { ActivityRow } from "@/features/activity/types";

interface RowDetailContentProps {
  row: ActivityRow;
}

/**
 * Shared content renderer for row detail — used by RowDetailModal and RowDetailDrawer.
 * Renders all ActivityRow fields with canonical data-testid attributes.
 */

/** Pretty-print JSON if parseable; fall back to raw string (M-5). */
function formatBody(body: string | null): string {
  if (body === null) return "";
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}
export function RowDetailContent({ row }: RowDetailContentProps) {
  return (
    <div>
      {/* Metadata */}
      <dl
        style={{
          display: "grid",
          gridTemplateColumns: "max-content 1fr",
          gap: "4px 12px",
          margin: "0 0 16px",
          fontSize: "0.875rem",
        }}
      >
        <dt style={{ color: "var(--content-muted, #6b7280)", fontWeight: 500 }}>
          Request ID
        </dt>
        <dd
          data-testid="activity-row-detail-request-id"
          style={{ margin: 0, fontFamily: "monospace", wordBreak: "break-all" }}
        >
          {row.id}
        </dd>

        <dt style={{ color: "var(--content-muted, #6b7280)", fontWeight: 500 }}>
          Date / Time
        </dt>
        <dd
          data-testid="activity-row-detail-datetime"
          style={{ margin: 0, fontFamily: "monospace" }}
        >
          {row.timestamp}
        </dd>

        <dt style={{ color: "var(--content-muted, #6b7280)", fontWeight: 500 }}>
          Method
        </dt>
        <dd
          data-testid="activity-row-detail-method"
          style={{ margin: 0, fontWeight: 600 }}
        >
          {row.method}
        </dd>

        <dt style={{ color: "var(--content-muted, #6b7280)", fontWeight: 500 }}>
          URL
        </dt>
        <dd
          data-testid="activity-row-detail-url-path"
          style={{ margin: 0, wordBreak: "break-all" }}
        >
          {row.urlPath}
        </dd>

        <dt style={{ color: "var(--content-muted, #6b7280)", fontWeight: 500 }}>
          Service
        </dt>
        <dd
          data-testid="activity-row-detail-service-name"
          style={{ margin: 0 }}
        >
          {row.serviceName}
        </dd>

        <dt style={{ color: "var(--content-muted, #6b7280)", fontWeight: 500 }}>
          Port
        </dt>
        <dd
          data-testid="activity-row-detail-service-port"
          style={{ margin: 0 }}
        >
          {row.servicePort}
        </dd>

        <dt style={{ color: "var(--content-muted, #6b7280)", fontWeight: 500 }}>
          Type
        </dt>
        <dd data-testid="activity-row-detail-type" style={{ margin: 0 }}>
          {row.type}
        </dd>

        <dt style={{ color: "var(--content-muted, #6b7280)", fontWeight: 500 }}>
          Status
        </dt>
        <dd
          data-testid="activity-row-detail-status-code"
          style={{ margin: 0, fontWeight: 600 }}
        >
          {row.statusCode}
        </dd>
      </dl>

      {/* Request section */}
      <section style={{ marginBottom: "16px" }}>
        <h3
          style={{
            fontSize: "0.8125rem",
            fontWeight: 600,
            color: "var(--content-muted, #6b7280)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            margin: "0 0 6px",
          }}
        >
          Request Headers
        </h3>
        <div
          data-testid="activity-row-detail-request-headers"
          style={{
            fontFamily: "monospace",
            fontSize: "0.8125rem",
            backgroundColor: "var(--surface-subtle, #f9fafb)",
            border: "1px solid #e5e7eb",
            borderRadius: "4px",
            padding: "8px",
          }}
        >
          {Object.entries(row.requestHeaders).map(([key, value]) => (
            <div key={key} style={{ lineHeight: 1.6 }}>
              <span style={{ color: "var(--content-muted, #6b7280)" }}>
                {key}
              </span>
              : <span>{value}</span>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: "16px" }}>
        <h3
          style={{
            fontSize: "0.8125rem",
            fontWeight: 600,
            color: "var(--content-muted, #6b7280)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            margin: "0 0 6px",
          }}
        >
          Request Body
        </h3>
        <div
          data-testid="activity-row-detail-request-body"
          style={{
            fontFamily: "monospace",
            fontSize: "0.8125rem",
            backgroundColor: "var(--surface-subtle, #f9fafb)",
            border: "1px solid #e5e7eb",
            borderRadius: "4px",
            padding: "8px",
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
            minHeight: "32px",
          }}
        >
          {formatBody(row.requestBody)}
        </div>
      </section>

      {/* Response section */}
      <section style={{ marginBottom: "16px" }}>
        <h3
          style={{
            fontSize: "0.8125rem",
            fontWeight: 600,
            color: "var(--content-muted, #6b7280)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            margin: "0 0 6px",
          }}
        >
          Response Headers
        </h3>
        <div
          data-testid="activity-row-detail-response-headers"
          style={{
            fontFamily: "monospace",
            fontSize: "0.8125rem",
            backgroundColor: "var(--surface-subtle, #f9fafb)",
            border: "1px solid #e5e7eb",
            borderRadius: "4px",
            padding: "8px",
          }}
        >
          {Object.entries(row.responseHeaders).map(([key, value]) => (
            <div key={key} style={{ lineHeight: 1.6 }}>
              <span style={{ color: "var(--content-muted, #6b7280)" }}>
                {key}
              </span>
              : <span>{value}</span>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: "16px" }}>
        <h3
          style={{
            fontSize: "0.8125rem",
            fontWeight: 600,
            color: "var(--content-muted, #6b7280)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            margin: "0 0 6px",
          }}
        >
          Response Body
        </h3>
        <div
          data-testid="activity-row-detail-response-body"
          style={{
            fontFamily: "monospace",
            fontSize: "0.8125rem",
            backgroundColor: "var(--surface-subtle, #f9fafb)",
            border: "1px solid #e5e7eb",
            borderRadius: "4px",
            padding: "8px",
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
            minHeight: "32px",
          }}
        >
          {formatBody(row.responseBody)}
        </div>
      </section>

      {/* Save as Mock — proxied rows only (disabled placeholder until Epic 4) */}
      {row.type === "Proxied" && (
        <button
          data-testid="activity-row-detail-save-mock"
          aria-label="Save as Mock"
          disabled
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: "none",
            border: "1px solid var(--brand, #3b82f6)",
            borderRadius: "4px",
            cursor: "not-allowed",
            padding: "6px 12px",
            color: "var(--brand, #3b82f6)",
            fontSize: "0.875rem",
            fontWeight: 500,
            opacity: 0.5,
          }}
        >
          <i className="bi bi-lightning-charge" aria-hidden="true" />
          Save as Mock
        </button>
      )}
    </div>
  );
}
