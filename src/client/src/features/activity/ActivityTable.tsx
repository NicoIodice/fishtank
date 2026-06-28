import { useRef, useState, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useQueryClient } from "@tanstack/react-query";
import type { ActivityRow } from "./types";
import { MethodChip } from "./MethodChip";
import { TypeIcon } from "./TypeIcon";

// Virtual scrolling: using @tanstack/react-virtual for NFR-4 (10k rows @ 60fps).
// Consistent with TanStack React Query already in project.

// Minimal local type to avoid cross-feature-folder imports (arch constraint).
interface ServiceStatus {
  id: string;
  status: string;
}

export type SortableColumn =
  | "method"
  | "urlPath"
  | "statusCode"
  | "serviceName"
  | "durationMs"
  | "timestamp";

const ACTIVITY_ROW_HEIGHT_PX = 48;
// Header height: 12px padding-top + ~14px text + 12px padding-bottom + 2px border = ~40px.
// Add a couple of px buffer so the first row never slides under the sticky header.
const ACTIVITY_HEADER_HEIGHT_PX = 44;

interface ActivityTableProps {
  rows: ActivityRow[];
  hadRows: boolean;
  sort?: { column: SortableColumn | null; direction: "asc" | "desc" | null };
  onSort?: (column: SortableColumn) => void;
  onRowClick?: (rowId: string) => void;
  onRowEnter?: (rowId: string) => void;
  selectedRowId?: string | null;
}

export function ActivityTable({
  rows,
  hadRows,
  sort = { column: null, direction: null },
  onSort,
  onRowClick,
  onRowEnter,
  selectedRowId,
}: ActivityTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  // Read service statuses from React Query cache (no refetch).
  // Uses minimal local ServiceStatus type to avoid cross-feature imports.
  const services =
    queryClient.getQueryData<ServiceStatus[]>(["services"]) ?? [];
  const serviceStatusMap = new Map(
    services.map((s) => [s.id, s.status === "live"]),
  );

  // AC-13: keyboard navigation — ArrowUp/ArrowDown move row focus; Enter opens detail
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (rows.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((prev) => Math.min((prev ?? -1) + 1, rows.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((prev) => Math.max((prev ?? 1) - 1, 0));
      } else if (e.key === "Enter" && focusedIndex !== null) {
        e.preventDefault();
        const focusedRow = rows[focusedIndex];
        if (focusedRow && onRowEnter) {
          onRowEnter(focusedRow.id);
        }
      }
    },
    [rows, focusedIndex, onRowEnter],
  );

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ACTIVITY_ROW_HEIGHT_PX,
    overscan: 5,
    paddingStart: ACTIVITY_HEADER_HEIGHT_PX,
  });

  const virtualItems = virtualizer.getVirtualItems();

  // Helper: render sort indicator for a sortable column header
  function SortIndicator({ column }: { column: SortableColumn }) {
    if (sort.column !== column) {
      return (
        <span
          aria-hidden="true"
          style={{ marginLeft: "4px", opacity: 0.3, fontSize: "0.75rem" }}
        >
          ↕
        </span>
      );
    }
    return (
      <span
        aria-hidden="true"
        style={{ marginLeft: "4px", fontSize: "0.75rem" }}
      >
        {sort.direction === "asc" ? "↑" : "↓"}
      </span>
    );
  }

  function sortableHeaderStyle(): React.CSSProperties {
    return {
      padding: "12px",
      textAlign: "left",
      borderBottom: "2px solid #e5e7eb",
      fontSize: "0.875rem",
      fontWeight: 600,
      color: "#374151",
      cursor: onSort ? "pointer" : "default",
      userSelect: "none",
    };
  }

  // Empty states
  if (rows.length === 0) {
    const isCleared = hadRows;
    return (
      <div
        data-testid="datatable-empty"
        style={{
          textAlign: "center",
          padding: "64px 16px",
          color: "#9ca3af",
        }}
      >
        <i
          className="bi bi-activity"
          style={{ fontSize: "48px", display: "block", marginBottom: "16px" }}
          aria-hidden="true"
        />
        <p
          style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "8px" }}
        >
          {isCleared ? "Log cleared" : "No activity yet"}
        </p>
        <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
          {isCleared
            ? "New requests will appear as they arrive."
            : "Requests will appear here once a service is live and receiving traffic."}
        </p>
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      role="grid"
      aria-rowcount={rows.length}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      style={{
        height: "600px",
        overflow: "auto",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
      }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            tableLayout: "fixed",
          }}
        >
          <colgroup>
            <col style={{ width: "8%" }} /> {/* Method */}
            <col style={{ width: "27%" }} /> {/* URL Path */}
            <col style={{ width: "7%" }} /> {/* Status */}
            <col style={{ width: "7%" }} /> {/* ms */}
            <col style={{ width: "12%" }} /> {/* DateTime */}
            <col style={{ width: "7%" }} /> {/* Type */}
            <col style={{ width: "15%" }} /> {/* Service */}
            <col style={{ width: "17%" }} /> {/* Actions */}
          </colgroup>
          <thead
            style={{
              position: "sticky",
              top: 0,
              backgroundColor: "#f9fafb",
              zIndex: 1,
            }}
          >
            <tr>
              <th
                data-sort-column="method"
                style={sortableHeaderStyle()}
                onClick={() => onSort?.("method")}
                aria-sort={
                  sort.column === "method"
                    ? sort.direction === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
              >
                Method
                <SortIndicator column="method" />
              </th>
              <th
                data-sort-column="urlPath"
                style={sortableHeaderStyle()}
                onClick={() => onSort?.("urlPath")}
                aria-sort={
                  sort.column === "urlPath"
                    ? sort.direction === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
              >
                URL Path
                <SortIndicator column="urlPath" />
              </th>
              <th
                data-sort-column="statusCode"
                style={sortableHeaderStyle()}
                onClick={() => onSort?.("statusCode")}
                aria-sort={
                  sort.column === "statusCode"
                    ? sort.direction === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
              >
                Status
                <SortIndicator column="statusCode" />
              </th>
              <th
                data-sort-column="durationMs"
                style={sortableHeaderStyle()}
                onClick={() => onSort?.("durationMs")}
                aria-sort={
                  sort.column === "durationMs"
                    ? sort.direction === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
              >
                ms
                <SortIndicator column="durationMs" />
              </th>
              <th
                data-sort-column="timestamp"
                style={sortableHeaderStyle()}
                onClick={() => onSort?.("timestamp")}
                aria-sort={
                  sort.column === "timestamp"
                    ? sort.direction === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
              >
                DateTime
                <SortIndicator column="timestamp" />
              </th>
              <th
                style={{
                  padding: "12px",
                  textAlign: "center",
                  borderBottom: "2px solid #e5e7eb",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "#374151",
                }}
              >
                <i className="bi bi-funnel" aria-label="Type" />
              </th>
              <th
                data-sort-column="serviceName"
                style={sortableHeaderStyle()}
                onClick={() => onSort?.("serviceName")}
                aria-sort={
                  sort.column === "serviceName"
                    ? sort.direction === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
              >
                Service
                <SortIndicator column="serviceName" />
              </th>
              <th
                style={{
                  padding: "12px",
                  textAlign: "center",
                  borderBottom: "2px solid #e5e7eb",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "#374151",
                }}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {virtualItems.map((virtualItem) => {
              const row = rows[virtualItem.index];
              const isServiceLive =
                serviceStatusMap.get(row.serviceId) ?? false;
              const is5xx = row.statusCode >= 500 && row.statusCode <= 599;
              const showAmberBorder = row.type === "Proxied" && isServiceLive;

              const rowBgColor = is5xx
                ? "var(--error-row-bg, rgba(254, 226, 226, 0.5))"
                : undefined;

              return (
                <tr
                  key={row.id}
                  data-testid={`activity-row-${row.id}`}
                  role="row"
                  aria-rowindex={virtualItem.index + 1}
                  tabIndex={focusedIndex === virtualItem.index ? 0 : -1}
                  onClick={onRowClick ? () => onRowClick(row.id) : undefined}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                    display: "table",
                    tableLayout: "fixed",
                    backgroundColor:
                      selectedRowId === row.id
                        ? "var(--selected-row-bg, rgba(59,130,246,.08))"
                        : rowBgColor,
                    cursor: onRowClick ? "pointer" : undefined,
                  }}
                >
                  <td
                    style={{
                      padding: "12px",
                      borderBottom: "1px solid #f3f4f6",
                      borderLeft: showAmberBorder
                        ? "2px solid #f59e0b"
                        : undefined,
                    }}
                  >
                    <MethodChip method={row.method} />
                  </td>
                  <td
                    style={{
                      padding: "12px",
                      borderBottom: "1px solid #f3f4f6",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {row.urlPath}
                  </td>
                  <td
                    style={{
                      padding: "12px",
                      borderBottom: "1px solid #f3f4f6",
                    }}
                  >
                    {row.statusCode}
                  </td>
                  <td
                    style={{
                      padding: "12px",
                      borderBottom: "1px solid #f3f4f6",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {row.durationMs}ms
                  </td>
                  <td
                    style={{
                      padding: "12px",
                      borderBottom: "1px solid #f3f4f6",
                      whiteSpace: "nowrap",
                      fontSize: "0.8rem",
                    }}
                  >
                    {new Date(row.timestamp).toLocaleTimeString()}
                  </td>
                  <td
                    style={{
                      padding: "12px",
                      borderBottom: "1px solid #f3f4f6",
                      textAlign: "center",
                    }}
                  >
                    <TypeIcon type={row.type} />
                  </td>
                  <td
                    style={{
                      padding: "12px",
                      borderBottom: "1px solid #f3f4f6",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {row.serviceName}
                  </td>
                  <td
                    style={{
                      padding: "12px",
                      borderBottom: "1px solid #f3f4f6",
                      textAlign: "center",
                    }}
                  >
                    <button
                      data-testid={`activity-btn-view-${row.id}`}
                      aria-label="View detail"
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "4px 8px",
                        color: "#374151",
                      }}
                    >
                      <i className="bi bi-eye" />
                    </button>
                    {row.type === "Proxied" && (
                      <button
                        data-testid="activity-btn-save-as-mock"
                        aria-label="Save as Mock"
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: "4px 8px",
                          color: "#3b82f6", // Brand color
                        }}
                      >
                        <i className="bi bi-lightning-charge" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
