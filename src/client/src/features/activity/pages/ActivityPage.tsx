import { useActivityLog } from "../useActivityLog";
import { ActivityTable } from "../ActivityTable";
import { ProxyCounterPill } from "../ProxyCounterPill";

export function ActivityPage() {
  const { rows, isLoading, hadRows } = useActivityLog();

  if (isLoading) {
    return (
      <main data-testid="page-activity">
        <div style={{ padding: "32px", textAlign: "center" }}>
          Loading activity...
        </div>
      </main>
    );
  }

  return (
    <main data-testid="page-activity" style={{ padding: "24px" }}>
      {/* Page Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: "24px",
          gap: "16px",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>
          Network Activity
        </h1>

        {/* Refresh icon stub — hidden initially (visible when paused in Story 3.3) */}
        <button
          data-testid="activity-btn-refresh"
          aria-label="Manual refresh"
          disabled
          style={{ display: "none" }}
        >
          <i className="bi bi-arrow-clockwise" />
        </button>

        {/* LIVE/PAUSED indicator stub */}
        <button
          data-testid="activity-btn-live-paused"
          aria-label="Pause auto-refresh"
          disabled
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "4px 12px",
            border: "1px solid #e5e7eb",
            borderRadius: "4px",
            backgroundColor: "#f9fafb",
            fontSize: "0.875rem",
            fontWeight: 500,
            cursor: "not-allowed",
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: "#10b981",
            }}
          />
          LIVE
        </button>

        {/* Recording badge stub — hidden */}
        <span data-testid="activity-badge-recording" style={{ display: "none" }}>
          ● Recording
        </span>

        {/* Flex spacer */}
        <div style={{ flex: 1 }} />

        {/* Proxy counter pill */}
        <ProxyCounterPill rows={rows} />

        {/* Record button stub */}
        <button
          data-testid="activity-btn-record"
          disabled
          style={{
            padding: "6px 12px",
            border: "1px solid #e5e7eb",
            borderRadius: "4px",
            backgroundColor: "#f9fafb",
            fontSize: "0.875rem",
            cursor: "not-allowed",
          }}
        >
          ● Record
        </button>

        {/* Clear log button stub */}
        <button
          data-testid="activity-btn-clear-log"
          disabled
          style={{
            padding: "6px 12px",
            border: "1px solid #e5e7eb",
            borderRadius: "4px",
            backgroundColor: "#f9fafb",
            fontSize: "0.875rem",
            cursor: "not-allowed",
          }}
        >
          Clear log
        </button>
      </div>

      {/* Toolbar stubs */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <input
          data-testid="activity-input-search"
          placeholder="Search..."
          disabled
          style={{
            padding: "8px 12px",
            border: "1px solid #e5e7eb",
            borderRadius: "4px",
            fontSize: "0.875rem",
            flex: 1,
          }}
        />

        <select
          data-testid="activity-select-service"
          disabled
          style={{
            padding: "8px 12px",
            border: "1px solid #e5e7eb",
            borderRadius: "4px",
            fontSize: "0.875rem",
          }}
        >
          <option>All Services</option>
        </select>

        <button
          data-testid="activity-btn-type-filter"
          disabled
          style={{
            padding: "8px 12px",
            border: "1px solid #e5e7eb",
            borderRadius: "4px",
            backgroundColor: "#f9fafb",
            fontSize: "0.875rem",
            cursor: "not-allowed",
          }}
        >
          <i className="bi bi-funnel" />
        </button>

        <button
          data-testid="activity-btn-clear-filters"
          disabled
          style={{
            padding: "8px 12px",
            border: "1px solid #e5e7eb",
            borderRadius: "4px",
            backgroundColor: "#f9fafb",
            fontSize: "0.875rem",
            cursor: "not-allowed",
          }}
        >
          Clear filters
        </button>

        {/* Columns selector stub — non-functional (Story 3.3) */}
        <button
          data-testid="activity-btn-columns"
          disabled
          style={{
            padding: "8px 12px",
            border: "1px solid #e5e7eb",
            borderRadius: "4px",
            backgroundColor: "#f9fafb",
            fontSize: "0.875rem",
            cursor: "not-allowed",
          }}
        >
          <i className="bi bi-columns-gap" /> Columns
        </button>

        {/* Mocked type filter checkbox stub — non-functional (Story 3.3) */}
        <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.875rem" }}>
          <input
            data-testid="activity-checkbox-type-mocked"
            type="checkbox"
            disabled
          />
          Mocked
        </label>
      </div>

      {/* Activity Table */}
      <ActivityTable rows={rows} hadRows={hadRows} />
    </main>
  );
}
