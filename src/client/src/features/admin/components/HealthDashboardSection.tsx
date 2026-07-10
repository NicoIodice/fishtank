import { useState } from "react";
import { useHealth } from "../hooks/useHealth";

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function HealthDashboardSection() {
  const { data, isLoading, refetch, dataUpdatedAt } = useHealth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function handleRefresh() {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  }

  if (isLoading) {
    return (
      <div data-testid="section-health" style={{ padding: "1rem" }}>
        Loading health data…
      </div>
    );
  }

  const lastRefreshed = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString()
    : "—";

  return (
    <div data-testid="section-health" style={{ padding: "1rem" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1rem",
          marginBottom: "1rem",
        }}
      >
        <div
          style={{
            padding: "1rem",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
          }}
        >
          <div
            style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}
          >
            Active Services
          </div>
          <div
            data-testid="health-active-services"
            style={{ fontSize: "1.5rem", fontWeight: 600 }}
          >
            {data?.activeServicesCount ?? 0}
          </div>
        </div>

        <div
          style={{
            padding: "1rem",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
          }}
        >
          <div
            style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}
          >
            Total Requests
          </div>
          <div
            data-testid="health-total-requests"
            style={{ fontSize: "1.5rem", fontWeight: 600 }}
          >
            {data?.totalRequestCount ?? 0}
          </div>
        </div>

        <div
          style={{
            padding: "1rem",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
          }}
        >
          <div
            style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}
          >
            Database
          </div>
          <div
            data-testid="health-db-status"
            className={
              data?.databaseStatus === "accessible"
                ? "status-green"
                : "status-red"
            }
          >
            <span
              className={
                data?.databaseStatus === "accessible"
                  ? "status-green"
                  : "status-red"
              }
              style={{
                display: "inline-block",
                padding: "0.125rem 0.5rem",
                borderRadius: "9999px",
                fontSize: "0.875rem",
                fontWeight: 500,
                backgroundColor:
                  data?.databaseStatus === "accessible"
                    ? "var(--success, #22c55e)"
                    : "var(--destructive, #ef4444)",
                color: "#fff",
              }}
            >
              {data?.databaseStatus === "accessible"
                ? "Accessible"
                : "Inaccessible"}
            </span>
          </div>
        </div>

        <div
          style={{
            padding: "1rem",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
          }}
        >
          <div
            style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}
          >
            Uptime
          </div>
          <div
            data-testid="health-uptime"
            style={{ fontSize: "1.5rem", fontWeight: 600 }}
          >
            {data ? formatUptime(data.uptimeSeconds) : "—"}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          fontSize: "0.75rem",
          color: "var(--muted-foreground)",
        }}
      >
        <span>Last refreshed: {lastRefreshed}</span>
        <button
          data-testid="btn-health-refresh"
          onClick={() => void handleRefresh()}
          disabled={isRefreshing}
          aria-label="Refresh health data"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "0.25rem",
            color: "var(--muted-foreground)",
          }}
        >
          ↻
        </button>
      </div>
    </div>
  );
}
