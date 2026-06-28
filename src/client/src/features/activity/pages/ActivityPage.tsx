import { useState, useMemo, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useActivityLog } from "../useActivityLog";
import { ActivityTable, type SortableColumn } from "../ActivityTable";
import { ProxyCounterPill } from "../ProxyCounterPill";
import { fetchActivityRows, clearActivityLog } from "../api";
import { useActivitySettings } from "@/features/settings/hooks/useActivitySettings";
import { useRowDetailStyle } from "../hooks/useRowDetailStyle";
import { RowDetailModal } from "../components/RowDetailModal";
import { RowDetailDrawer } from "../components/RowDetailDrawer";
import { RowDetailPanel } from "../components/RowDetailPanel";
import type { ActivityRow } from "../types";

// Minimal service shape from React Query cache
interface CachedService {
  id: string;
  name: string;
}

export function ActivityPage() {
  const { rows, clearRows, isLoading, hadRows } = useActivityLog();
  const queryClient = useQueryClient();
  const { settings } = useActivitySettings();
  const isIntervalDisabled = settings.autoRefreshInterval === "disabled";
  const { effectiveStyle } = useRowDetailStyle();

  // Row detail selection
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState<string>("all");
  const [typeMockedChecked, setTypeMockedChecked] = useState(false);
  const [typeProxiedChecked, setTypeProxiedChecked] = useState(false);
  const [typeFilterOpen, setTypeFilterOpen] = useState(false);
  const typeFilterRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!typeFilterOpen) return;
    function handleOutside(e: PointerEvent) {
      if (
        typeFilterRef.current &&
        !typeFilterRef.current.contains(e.target as Node)
      ) {
        setTypeFilterOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setTypeFilterOpen(false);
    }
    document.addEventListener("pointerdown", handleOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handleOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [typeFilterOpen]);
  const [sort, setSort] = useState<{
    column: SortableColumn | null;
    direction: "asc" | "desc" | null;
  }>({ column: null, direction: null });

  // LIVE / PAUSED state
  const [isPaused, setIsPaused] = useState(
    () => settings.autoRefreshInterval === "disabled",
  );
  const [pauseSnapshot, setPauseSnapshot] = useState<ActivityRow[] | null>(
    null,
  );
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  // Reduced-motion check (safe for jsdom/test environments)
  const prefersReducedMotion =
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  // Source rows: snapshot when paused or interval disabled, live rows otherwise
  const effectivelyPaused = isPaused || isIntervalDisabled;
  const sourceRows =
    effectivelyPaused && pauseSnapshot !== null ? pauseSnapshot : rows;

  // Services from React Query cache for dropdown (no new fetch)
  const cachedServices =
    queryClient.getQueryData<CachedService[]>(["services"]) ?? [];

  // Type filter button label
  const typeFilterLabel = (() => {
    if (typeMockedChecked && !typeProxiedChecked) return "Mocked only";
    if (!typeMockedChecked && typeProxiedChecked) return "Proxied only";
    return "All";
  })();

  // Filtered + sorted rows for the table
  const filteredRows = useMemo(() => {
    let result = [...sourceRows];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.urlPath.toLowerCase().includes(q) ||
          r.method.toLowerCase().includes(q),
      );
    }

    if (selectedServiceId !== "all") {
      result = result.filter((r) => r.serviceId === selectedServiceId);
    }

    // Type filter: XOR - only one checked means filter to that type
    if (typeMockedChecked !== typeProxiedChecked) {
      if (typeMockedChecked) {
        result = result.filter((r) => r.type.toLowerCase() === "mocked");
      } else {
        result = result.filter((r) => r.type.toLowerCase() === "proxied");
      }
    }

    // Sort
    result.sort((a, b) => {
      if (!sort.column || !sort.direction) {
        return (
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
      }
      let valA: string | number;
      let valB: string | number;
      switch (sort.column) {
        case "method":
          valA = a.method;
          valB = b.method;
          break;
        case "urlPath":
          valA = a.urlPath;
          valB = b.urlPath;
          break;
        case "statusCode":
          valA = a.statusCode;
          valB = b.statusCode;
          break;
        case "serviceName":
          valA = a.serviceName;
          valB = b.serviceName;
          break;
        case "durationMs":
          valA = a.durationMs;
          valB = b.durationMs;
          break;
        case "timestamp":
          valA = new Date(a.timestamp).getTime();
          valB = new Date(b.timestamp).getTime();
          break;
        default:
          return 0;
      }
      const cmp =
        typeof valA === "number"
          ? (valA as number) - (valB as number)
          : String(valA).localeCompare(String(valB));
      return sort.direction === "asc" ? cmp : -cmp;
    });

    return result;
  }, [
    sourceRows,
    searchQuery,
    selectedServiceId,
    typeMockedChecked,
    typeProxiedChecked,
    sort,
  ]);

  // Handlers
  function handleClearFilters() {
    setSearchQuery("");
    setSelectedServiceId("all");
    setTypeMockedChecked(false);
    setTypeProxiedChecked(false);
    setSort({ column: null, direction: null });
  }

  function handleSort(column: SortableColumn) {
    setSort((prev) => {
      if (prev.column !== column) return { column, direction: "asc" };
      if (prev.direction === "asc") return { column, direction: "desc" };
      return { column: null, direction: null };
    });
  }

  function handleLivePausedToggle() {
    if (isIntervalDisabled) return;
    if (!isPaused) {
      setIsPaused(true);
      setPauseSnapshot([...rows]);
    } else {
      setIsPaused(false);
      setPauseSnapshot(null);
    }
  }

  async function handleManualRefresh() {
    if (isManualRefreshing) return;
    setIsManualRefreshing(true);
    try {
      const freshRows = await fetchActivityRows({ take: 200 });
      setPauseSnapshot(freshRows);
    } catch (err) {
      console.error("Manual refresh failed:", err);
    } finally {
      setIsManualRefreshing(false);
    }
  }

  async function handleClearLog() {
    try {
      await clearActivityLog();
      clearRows();
      if (isPaused) setPauseSnapshot([]);
    } catch (err) {
      console.error("Clear log failed:", err);
    }
  }

  if (isLoading) {
    return (
      <main data-testid="page-activity">
        <div style={{ padding: "32px", textAlign: "center" }}>
          Loading activity...
        </div>
      </main>
    );
  }

  const showRefreshIcon = isPaused || isIntervalDisabled;
  const spinClass =
    isManualRefreshing && !prefersReducedMotion ? "animate-spin" : "";

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

        {/* Refresh icon - visible when paused or interval disabled */}
        <button
          data-testid="activity-btn-refresh"
          aria-label="Manual refresh"
          onClick={handleManualRefresh}
          style={{
            display: showRefreshIcon ? "inline-flex" : "none",
            alignItems: "center",
            background: "none",
            border: "none",
            cursor: isManualRefreshing ? "not-allowed" : "pointer",
            padding: "4px",
            pointerEvents: isManualRefreshing ? "none" : undefined,
          }}
        >
          <i className={`bi bi-arrow-clockwise ${spinClass}`} />
        </button>

        {/* LIVE/PAUSED toggle */}
        {isIntervalDisabled ? (
          <button
            data-testid="activity-btn-live-paused"
            aria-label="Refresh paused (disabled)"
            aria-disabled="true"
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
                backgroundColor: "#9ca3af",
              }}
            />
            PAUSED
          </button>
        ) : (
          <button
            data-testid="activity-btn-live-paused"
            aria-label={isPaused ? "Resume auto-refresh" : "Pause auto-refresh"}
            onClick={handleLivePausedToggle}
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
              cursor: "pointer",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: isPaused ? "#9ca3af" : "#10b981",
              }}
            />
            {isPaused ? "PAUSED" : "LIVE"}
          </button>
        )}

        {/* Recording badge stub */}
        <span
          data-testid="activity-badge-recording"
          style={{ display: "none" }}
        >
          Recording
        </span>

        <div style={{ flex: 1 }} />

        {/* Proxy counter pill - always full unfiltered rows */}
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
          Record
        </button>

        {/* Clear log button */}
        <button
          data-testid="activity-btn-clear-log"
          onClick={handleClearLog}
          style={{
            padding: "6px 12px",
            border: "1px solid #e5e7eb",
            borderRadius: "4px",
            backgroundColor: "#f9fafb",
            fontSize: "0.875rem",
            cursor: "pointer",
          }}
        >
          Clear log
        </button>
      </div>

      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "16px",
          flexWrap: "wrap",
        }}
      >
        <input
          data-testid="activity-input-search"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            padding: "8px 12px",
            border: "1px solid #e5e7eb",
            borderRadius: "4px",
            fontSize: "0.875rem",
            flex: 1,
            minWidth: "160px",
          }}
        />

        <select
          data-testid="activity-select-service"
          value={selectedServiceId}
          onChange={(e) => setSelectedServiceId(e.target.value)}
          style={{
            padding: "8px 12px",
            border: "1px solid #e5e7eb",
            borderRadius: "4px",
            fontSize: "0.875rem",
          }}
        >
          <option value="all">All Services</option>
          {cachedServices.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        {/* Type filter popover */}
        <div ref={typeFilterRef} style={{ position: "relative" }}>
          <button
            data-testid="activity-btn-type-filter"
            aria-expanded={typeFilterOpen}
            onClick={() => setTypeFilterOpen((v) => !v)}
            style={{
              padding: "8px 12px",
              border: "1px solid #e5e7eb",
              borderRadius: "4px",
              backgroundColor: "#f9fafb",
              fontSize: "0.875rem",
              cursor: "pointer",
            }}
          >
            <i className="bi bi-funnel" /> {typeFilterLabel}
          </button>

          {typeFilterOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 0,
                zIndex: 10,
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: "4px",
                padding: "8px 12px",
                minWidth: "140px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                  padding: "4px 0",
                }}
              >
                <input
                  data-testid="activity-checkbox-type-mocked"
                  type="checkbox"
                  checked={typeMockedChecked}
                  onChange={() => setTypeMockedChecked((v) => !v)}
                />
                Mocked
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                  padding: "4px 0",
                }}
              >
                <input
                  data-testid="activity-checkbox-type-proxied"
                  type="checkbox"
                  checked={typeProxiedChecked}
                  onChange={() => setTypeProxiedChecked((v) => !v)}
                />
                Proxied
              </label>
            </div>
          )}
        </div>

        <button
          data-testid="activity-btn-clear-filters"
          onClick={handleClearFilters}
          style={{
            padding: "8px 12px",
            border: "1px solid #e5e7eb",
            borderRadius: "4px",
            backgroundColor: "#f9fafb",
            fontSize: "0.875rem",
            cursor: "pointer",
          }}
        >
          Clear filters
        </button>

        {/* Columns selector stub - deferred to Story 3.4 */}
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
      </div>

      {/* Activity Table - receives filteredRows (filtered + sorted) */}
      <ActivityTable
        rows={filteredRows}
        hadRows={hadRows}
        sort={sort}
        onSort={handleSort}
        onRowClick={(rowId) => setSelectedRowId(rowId)}
        onRowEnter={(rowId) => setSelectedRowId(rowId)}
        selectedRowId={selectedRowId}
      />

      {/* Row detail overlays — conditional on preference + viewport */}
      {(() => {
        const selectedRow =
          filteredRows.find((r) => r.id === selectedRowId) ?? null;
        if (!selectedRow) return null;
        const close = () => setSelectedRowId(null);
        if (effectiveStyle === "drawer") {
          return <RowDetailDrawer row={selectedRow} onClose={close} />;
        }
        if (effectiveStyle === "panel") {
          return <RowDetailPanel row={selectedRow} onClose={close} />;
        }
        return <RowDetailModal row={selectedRow} onClose={close} />;
      })()}
    </main>
  );
}
