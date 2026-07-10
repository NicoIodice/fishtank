import { useAuditLog } from "../hooks/useAuditLog";
import type { AuditEntryDto } from "../types";

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function formatResource(entry: AuditEntryDto): string {
  return entry.resourceId
    ? `${entry.resourceType}: ${entry.resourceId}`
    : entry.resourceType;
}

export function AuditLogSection() {
  const { items, isLoading, loadMore, hasMore, total } = useAuditLog();

  if (isLoading && items.length === 0) {
    return (
      <div data-testid="section-audit-log" style={{ padding: "1rem" }}>
        Loading audit log…
      </div>
    );
  }

  return (
    <div data-testid="section-audit-log" style={{ padding: "1rem" }}>
      <div
        style={{
          fontSize: "0.75rem",
          color: "var(--muted-foreground)",
          marginBottom: "0.5rem",
        }}
      >
        {total} total entries
      </div>
      <table
        data-testid="table-audit-log"
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "0.875rem",
        }}
      >
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            <th style={{ textAlign: "left", padding: "0.5rem" }}>Action</th>
            <th style={{ textAlign: "left", padding: "0.5rem" }}>Actor</th>
            <th style={{ textAlign: "left", padding: "0.5rem" }}>Resource</th>
            <th style={{ textAlign: "left", padding: "0.5rem" }}>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td
                colSpan={4}
                style={{ padding: "0.5rem", color: "var(--muted-foreground)" }}
              >
                No audit entries yet.
              </td>
            </tr>
          ) : (
            items.map((entry) => (
              <tr
                key={entry.id}
                data-testid={`audit-row-${entry.id}`}
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <td style={{ padding: "0.5rem" }}>
                  <code style={{ fontSize: "0.75rem" }}>{entry.action}</code>
                </td>
                <td style={{ padding: "0.5rem" }}>
                  {entry.actorUsername ?? (
                    <em style={{ color: "var(--muted-foreground)" }}>system</em>
                  )}
                </td>
                <td style={{ padding: "0.5rem" }}>{formatResource(entry)}</td>
                <td
                  style={{
                    padding: "0.5rem",
                    fontSize: "0.75rem",
                    color: "var(--muted-foreground)",
                  }}
                >
                  {formatTimestamp(entry.createdAt)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      {hasMore && (
        <button
          data-testid="btn-audit-load-more"
          onClick={loadMore}
          style={{
            marginTop: "1rem",
            padding: "0.5rem 1rem",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            background: "transparent",
            cursor: "pointer",
          }}
        >
          Load more
        </button>
      )}
    </div>
  );
}
