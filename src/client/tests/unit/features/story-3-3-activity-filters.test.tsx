import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ActivityRow } from "@/features/activity/types";

/**
 * ATDD component tests for ActivityPage — Story 3.3
 * Activity Log Filtering, Sorting, Auto-refresh & Log Controls.
 *
 * RED PHASE scaffolds — all tests FAIL against the current codebase because
 * all filter/sort/live-paused/clear-log controls are disabled stubs in
 * ActivityPage.tsx. They will PASS once Story 3.3 is implemented.
 *
 * ACs covered:
 *   AC-1  — Search filters by URL path + method (case-insensitive OR)
 *   AC-2  — Service dropdown filters by serviceId
 *   AC-3  — Type filter popover with Mocked/Proxied checkboxes
 *   AC-4  — AND logic across all active filters
 *   AC-5  — Clear filters resets all filters + sort to DateTime descending
 *   AC-6  — Column sort cycles: unsorted → asc → desc → unsorted
 *   AC-7  — LIVE/PAUSED toggle freezes/resumes row display
 *   AC-8  — Manual refresh icon visible when paused; calls fetchActivityRows
 *   AC-10 — Clear log calls DELETE /api/activity, clearRows(), resets proxy counter
 *   AC-12 — Proxy counter pill always reflects full unfiltered rows
 *
 * Data-testid contract (canonical):
 *   activity-input-search          — search input (toolbar)
 *   activity-select-service        — service dropdown (toolbar)
 *   activity-btn-type-filter       — type filter trigger button (toolbar)
 *   activity-checkbox-type-mocked  — Mocked checkbox in type filter popover
 *   activity-checkbox-type-proxied — Proxied checkbox in type filter popover
 *   activity-btn-clear-filters     — clear filters button (toolbar)
 *   activity-btn-live-paused       — LIVE/PAUSED toggle (page header)
 *   activity-btn-refresh           — manual refresh icon (page header, shown when paused)
 *   activity-btn-clear-log         — clear log button (page header)
 *   activity-pill-proxy-count      — proxy counter pill (page header)
 *   activity-row-{id}              — per-row element in ActivityTable
 */

// ─── SignalR mock ─────────────────────────────────────────────────────────────

const capturedHandlers: Record<string, (...args: unknown[]) => void> = {};

const mockConnection = {
  on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
    capturedHandlers[event] = handler;
  }),
  off: vi.fn(),
  start: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn().mockResolvedValue(undefined),
  state: "Connected",
};

vi.mock("@/lib/signalr", () => ({
  createHubConnection: vi.fn(() => mockConnection),
}));

// ─── Activity API mock ────────────────────────────────────────────────────────

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/features/activity/api", () => ({
  fetchActivityRows: vi.fn().mockResolvedValue([]),
  clearActivityLog: vi.fn().mockResolvedValue(undefined),
}));

import { fetchActivityRows, clearActivityLog } from "@/features/activity/api";
const mockFetchActivityRows = vi.mocked(fetchActivityRows);
const mockClearActivityLog = vi.mocked(clearActivityLog);

// ─── @tanstack/react-virtual mock (jsdom has no layout engine) ───────────────

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: vi.fn(
    ({ count, estimateSize }: { count: number; estimateSize: (i: number) => number }) => ({
      getVirtualItems: () =>
        Array.from({ length: Math.min(count, 50) }, (_, i) => ({
          index: i,
          key: i,
          start: i * (estimateSize ? estimateSize(i) : 48),
          size: estimateSize ? estimateSize(i) : 48,
          lane: 0,
        })),
      getTotalSize: () => count * 48,
      scrollToIndex: vi.fn(),
      measure: vi.fn(),
    }),
  ),
}));

// ─── React Query wrapper ──────────────────────────────────────────────────────

const MOCK_SERVICES = [
  { id: "service-alpha", name: "Alpha Service", status: "live" },
  { id: "service-beta", name: "Beta Service", status: "stopped" },
];

function makeQc() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // Pre-seed service cache so service dropdown can hydrate
  qc.setQueryData(["services"], MOCK_SERVICES);
  return qc;
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={makeQc()}>{children}</QueryClientProvider>;
}

// ─── Row factories ────────────────────────────────────────────────────────────

function makeRow(overrides: Partial<ActivityRow> = {}): ActivityRow {
  return {
    id: overrides.id ?? "row-default",
    timestamp: overrides.timestamp ?? "2024-06-01T10:00:00Z",
    method: overrides.method ?? "GET",
    urlPath: overrides.urlPath ?? "/default",
    statusCode: overrides.statusCode ?? 200,
    type: overrides.type ?? "Mocked",
    serviceId: overrides.serviceId ?? "service-alpha",
    serviceName: overrides.serviceName ?? "Alpha Service",
    servicePort: overrides.servicePort ?? 30100,
    durationMs: overrides.durationMs ?? 42,
    requestHeaders: overrides.requestHeaders ?? {},
    requestBody: overrides.requestBody ?? null,
    responseHeaders: overrides.responseHeaders ?? {},
    responseBody: overrides.responseBody ?? null,
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("ActivityPage — Story 3.3 (filter/sort/live-paused/clear-log)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(capturedHandlers).forEach((k) => delete capturedHandlers[k]);
    mockFetchActivityRows.mockResolvedValue([]);
    mockClearActivityLog.mockResolvedValue(undefined);
  });

  // ─── AC-1: Search input filters rows (URL path + method, case-insensitive) ───

  describe("AC-1: Search filter", () => {
    it("AC-1: search input is NOT disabled (enabled after Story 3.3)", async () => {
      // RED: fails now because <input data-testid="activity-input-search" disabled />
      const { ActivityPage } = await import("@/features/activity/pages/ActivityPage");
      render(<ActivityPage />, { wrapper: Wrapper });

      await waitFor(() => screen.getByTestId("activity-input-search"));

      const searchInput = screen.getByTestId("activity-input-search");
      // RED: input is currently disabled — this assertion fails
      expect(searchInput).not.toBeDisabled();
    });

    it("AC-1: typing 'payment' in search shows only rows whose path contains 'payment'", async () => {
      // Seed rows: one matches, one does not
      mockFetchActivityRows.mockResolvedValueOnce([
        makeRow({ id: "payment-row", urlPath: "/api/payment/create", method: "POST" }),
        makeRow({ id: "orders-row", urlPath: "/api/orders/list", method: "GET" }),
      ]);

      const { ActivityPage } = await import("@/features/activity/pages/ActivityPage");
      const user = userEvent.setup();
      render(<ActivityPage />, { wrapper: Wrapper });

      // Wait for rows to render
      await waitFor(() => screen.getByTestId("activity-row-payment-row"));

      // Type in search — disabled input, no-ops in userEvent v14
      const searchInput = screen.getByTestId("activity-input-search");
      await user.type(searchInput, "payment");

      // RED: both rows still visible because search is not wired
      await waitFor(() => {
        expect(screen.getByTestId("activity-row-payment-row")).toBeInTheDocument();
        // This assertion fails: orders-row should be hidden but is still visible
        expect(screen.queryByTestId("activity-row-orders-row")).not.toBeInTheDocument();
      });
    });

    it("AC-1: search 'post' matches POST method rows (OR logic — method match)", async () => {
      mockFetchActivityRows.mockResolvedValueOnce([
        makeRow({ id: "post-row", method: "POST", urlPath: "/api/something" }),
        makeRow({ id: "get-row", method: "GET", urlPath: "/api/other" }),
      ]);

      const { ActivityPage } = await import("@/features/activity/pages/ActivityPage");
      const user = userEvent.setup();
      render(<ActivityPage />, { wrapper: Wrapper });

      await waitFor(() => screen.getByTestId("activity-row-post-row"));

      const searchInput = screen.getByTestId("activity-input-search");
      await user.type(searchInput, "post");

      // RED: get-row should be hidden after filtering but is still visible
      await waitFor(() => {
        expect(screen.queryByTestId("activity-row-get-row")).not.toBeInTheDocument();
      });
    });
  });

  // ─── AC-2: Service dropdown filters rows ─────────────────────────────────────

  describe("AC-2: Service filter", () => {
    it("AC-2: service dropdown is NOT disabled (enabled after Story 3.3)", async () => {
      // RED: fails now because <select data-testid="activity-select-service" disabled />
      const { ActivityPage } = await import("@/features/activity/pages/ActivityPage");
      render(<ActivityPage />, { wrapper: Wrapper });

      await waitFor(() => screen.getByTestId("activity-select-service"));

      const serviceSelect = screen.getByTestId("activity-select-service");
      // RED: select is currently disabled — this assertion fails
      expect(serviceSelect).not.toBeDisabled();
    });

    it("AC-2: selecting 'service-alpha' shows only Alpha Service rows", async () => {
      mockFetchActivityRows.mockResolvedValueOnce([
        makeRow({ id: "alpha-row", serviceId: "service-alpha", serviceName: "Alpha Service" }),
        makeRow({ id: "beta-row", serviceId: "service-beta", serviceName: "Beta Service" }),
      ]);

      const { ActivityPage } = await import("@/features/activity/pages/ActivityPage");
      const user = userEvent.setup();
      render(<ActivityPage />, { wrapper: Wrapper });

      await waitFor(() => screen.getByTestId("activity-row-alpha-row"));

      const serviceSelect = screen.getByTestId("activity-select-service");
      await user.selectOptions(serviceSelect, "service-alpha");

      // RED: beta-row should be hidden after service filter but is still visible
      await waitFor(() => {
        expect(screen.queryByTestId("activity-row-beta-row")).not.toBeInTheDocument();
      });
    });

    it("AC-2: service dropdown shows options from React Query cache (not a new fetch)", async () => {
      // RED: dropdown only has "All Services" (no dynamic options yet)
      const { ActivityPage } = await import("@/features/activity/pages/ActivityPage");
      render(<ActivityPage />, { wrapper: Wrapper });

      await waitFor(() => screen.getByTestId("activity-select-service"));

      const serviceSelect = screen.getByTestId("activity-select-service");
      // After implementation, service names from cache should appear as options
      expect(serviceSelect).toHaveTextContent("Alpha Service");
    });
  });

  // ─── AC-3: Type filter popover with checkboxes ────────────────────────────────

  describe("AC-3: Type filter", () => {
    it("AC-3: type filter button is NOT disabled (enabled after Story 3.3)", async () => {
      // RED: fails now because <button data-testid="activity-btn-type-filter" disabled />
      const { ActivityPage } = await import("@/features/activity/pages/ActivityPage");
      render(<ActivityPage />, { wrapper: Wrapper });

      await waitFor(() => screen.getByTestId("activity-btn-type-filter"));

      const typeFilterBtn = screen.getByTestId("activity-btn-type-filter");
      // RED: button is currently disabled — this assertion fails
      expect(typeFilterBtn).not.toBeDisabled();
    });

    it("AC-3: clicking type filter button opens popover with Mocked+Proxied checkboxes", async () => {
      const { ActivityPage } = await import("@/features/activity/pages/ActivityPage");
      const user = userEvent.setup();
      render(<ActivityPage />, { wrapper: Wrapper });

      await waitFor(() => screen.getByTestId("activity-btn-type-filter"));

      await user.click(screen.getByTestId("activity-btn-type-filter"));

      // RED: popover does not open (button is disabled), checkboxes not visible
      await waitFor(() => {
        expect(screen.getByTestId("activity-checkbox-type-mocked")).toBeVisible();
        expect(screen.getByTestId("activity-checkbox-type-proxied")).toBeVisible();
      });
    });

    it("AC-3: selecting only Mocked filters out Proxied rows", async () => {
      mockFetchActivityRows.mockResolvedValueOnce([
        makeRow({ id: "mocked-row", type: "Mocked" }),
        makeRow({ id: "proxied-row", type: "Proxied" }),
      ]);

      const { ActivityPage } = await import("@/features/activity/pages/ActivityPage");
      const user = userEvent.setup();
      render(<ActivityPage />, { wrapper: Wrapper });

      await waitFor(() => screen.getByTestId("activity-row-mocked-row"));

      // Open popover and check only Mocked
      await user.click(screen.getByTestId("activity-btn-type-filter"));
      await user.click(screen.getByTestId("activity-checkbox-type-mocked"));

      // RED: proxied-row should disappear but remains (button disabled, no filter)
      await waitFor(() => {
        expect(screen.queryByTestId("activity-row-proxied-row")).not.toBeInTheDocument();
      });
    });
  });

  // ─── AC-4: AND logic across multiple filters ──────────────────────────────────

  describe("AC-4: AND filter logic", () => {
    it("AC-4: service filter + type filter applied simultaneously with AND logic", async () => {
      mockFetchActivityRows.mockResolvedValueOnce([
        // matches both service-alpha AND Mocked
        makeRow({ id: "alpha-mocked", serviceId: "service-alpha", type: "Mocked" }),
        // matches service-alpha but NOT Mocked
        makeRow({ id: "alpha-proxied", serviceId: "service-alpha", type: "Proxied" }),
        // matches Mocked but NOT service-alpha
        makeRow({ id: "beta-mocked", serviceId: "service-beta", type: "Mocked" }),
      ]);

      const { ActivityPage } = await import("@/features/activity/pages/ActivityPage");
      const user = userEvent.setup();
      render(<ActivityPage />, { wrapper: Wrapper });

      await waitFor(() => screen.getByTestId("activity-row-alpha-mocked"));

      // Apply service filter
      await user.selectOptions(screen.getByTestId("activity-select-service"), "service-alpha");

      // Apply type filter (Mocked only)
      await user.click(screen.getByTestId("activity-btn-type-filter"));
      await user.click(screen.getByTestId("activity-checkbox-type-mocked"));

      // RED: only alpha-mocked should remain; others should be hidden (AND logic)
      await waitFor(() => {
        expect(screen.getByTestId("activity-row-alpha-mocked")).toBeInTheDocument();
        expect(screen.queryByTestId("activity-row-alpha-proxied")).not.toBeInTheDocument();
        expect(screen.queryByTestId("activity-row-beta-mocked")).not.toBeInTheDocument();
      });
    });
  });

  // ─── AC-5: Clear filters resets all filters + sort ───────────────────────────

  describe("AC-5: Clear filters", () => {
    it("AC-5: clear filters button is NOT disabled (enabled after Story 3.3)", async () => {
      // RED: fails now because <button data-testid="activity-btn-clear-filters" disabled />
      const { ActivityPage } = await import("@/features/activity/pages/ActivityPage");
      render(<ActivityPage />, { wrapper: Wrapper });

      await waitFor(() => screen.getByTestId("activity-btn-clear-filters"));

      const clearBtn = screen.getByTestId("activity-btn-clear-filters");
      // RED: button is currently disabled — this assertion fails
      expect(clearBtn).not.toBeDisabled();
    });

    it("AC-5: clicking clear filters shows all rows again after service filter was applied", async () => {
      mockFetchActivityRows.mockResolvedValueOnce([
        makeRow({ id: "alpha-row", serviceId: "service-alpha" }),
        makeRow({ id: "beta-row", serviceId: "service-beta" }),
      ]);

      const { ActivityPage } = await import("@/features/activity/pages/ActivityPage");
      const user = userEvent.setup();
      render(<ActivityPage />, { wrapper: Wrapper });

      await waitFor(() => screen.getByTestId("activity-row-alpha-row"));

      // Apply a filter first
      await user.selectOptions(screen.getByTestId("activity-select-service"), "service-alpha");

      // Now clear filters — should restore both rows
      await user.click(screen.getByTestId("activity-btn-clear-filters"));

      // RED: clear-filters button is disabled, click does nothing; beta-row still filtered
      await waitFor(() => {
        expect(screen.getByTestId("activity-row-alpha-row")).toBeInTheDocument();
        expect(screen.getByTestId("activity-row-beta-row")).toBeInTheDocument();
      });
    });

    it("AC-5: clear filters also resets sort to DateTime descending default", async () => {
      const newerRow = makeRow({ id: "newer", timestamp: "2024-06-01T12:00:00Z" });
      const olderRow = makeRow({ id: "older", timestamp: "2024-06-01T10:00:00Z" });
      mockFetchActivityRows.mockResolvedValueOnce([newerRow, olderRow]);

      const { ActivityPage } = await import("@/features/activity/pages/ActivityPage");
      const user = userEvent.setup();
      render(<ActivityPage />, { wrapper: Wrapper });

      await waitFor(() => screen.getByTestId("activity-row-newer"));

      // Click clear filters — sort should reset to DateTime descending (newer first)
      await user.click(screen.getByTestId("activity-btn-clear-filters"));

      // RED: clear-filters is disabled; this is a pre-condition check for sort reset
      const rows = screen.getAllByTestId(/^activity-row-/);
      // After clearing, newer should appear before older (DateTime descending)
      expect(rows[0]).toHaveAttribute("data-testid", "activity-row-newer");
    });
  });

  // ─── AC-6: Column sort cycles ─────────────────────────────────────────────────

  describe("AC-6: Column sort", () => {
    it("AC-6: clicking Method column header sorts rows ascending by method", async () => {
      mockFetchActivityRows.mockResolvedValueOnce([
        makeRow({ id: "post-row", method: "POST" }),
        makeRow({ id: "delete-row", method: "DELETE" }),
        makeRow({ id: "get-row", method: "GET" }),
      ]);

      const { ActivityPage } = await import("@/features/activity/pages/ActivityPage");
      const user = userEvent.setup();
      render(<ActivityPage />, { wrapper: Wrapper });

      await waitFor(() => screen.getByTestId("activity-row-post-row"));

      // Find the Method column header — it should be a clickable sort trigger
      const methodHeader = screen.getByRole("columnheader", { name: /method/i });

      // RED: column headers are not clickable sort triggers yet (no sort arrow, no handler)
      expect(methodHeader).toHaveAttribute("data-sort-column", "method");

      await user.click(methodHeader);

      // After first click: ascending — DELETE < GET < POST alphabetically
      const rows = screen.getAllByTestId(/^activity-row-/);
      expect(rows[0]).toHaveAttribute("data-testid", "activity-row-delete-row");
    });

    it("AC-6: clicking same column header twice cycles to descending", async () => {
      mockFetchActivityRows.mockResolvedValueOnce([
        makeRow({ id: "post-row", method: "POST" }),
        makeRow({ id: "get-row", method: "GET" }),
      ]);

      const { ActivityPage } = await import("@/features/activity/pages/ActivityPage");
      const user = userEvent.setup();
      render(<ActivityPage />, { wrapper: Wrapper });

      await waitFor(() => screen.getByTestId("activity-row-post-row"));

      const methodHeader = screen.getByRole("columnheader", { name: /method/i });

      // First click → ascending; second click → descending
      // RED: header click handler not implemented
      await user.click(methodHeader);
      await user.click(methodHeader);

      const rows = screen.getAllByTestId(/^activity-row-/);
      // Descending: POST > GET alphabetically
      expect(rows[0]).toHaveAttribute("data-testid", "activity-row-post-row");
    });
  });

  // ─── AC-7: LIVE/PAUSED toggle ─────────────────────────────────────────────────

  describe("AC-7: LIVE/PAUSED toggle", () => {
    it("AC-7: LIVE/PAUSED button is NOT disabled (enabled after Story 3.3)", async () => {
      // RED: fails now because <button data-testid="activity-btn-live-paused" disabled />
      const { ActivityPage } = await import("@/features/activity/pages/ActivityPage");
      render(<ActivityPage />, { wrapper: Wrapper });

      await waitFor(() => screen.getByTestId("activity-btn-live-paused"));

      const liveBtn = screen.getByTestId("activity-btn-live-paused");
      // RED: button is currently disabled — this assertion fails
      expect(liveBtn).not.toBeDisabled();
    });

    it("AC-7: clicking LIVE/PAUSED changes label to PAUSED", async () => {
      const { ActivityPage } = await import("@/features/activity/pages/ActivityPage");
      const user = userEvent.setup();
      render(<ActivityPage />, { wrapper: Wrapper });

      await waitFor(() => screen.getByTestId("activity-btn-live-paused"));

      const livePausedBtn = screen.getByTestId("activity-btn-live-paused");
      expect(livePausedBtn).toHaveTextContent("LIVE");

      // Click to pause — RED: button is disabled, click does nothing
      await user.click(livePausedBtn);

      // RED: button label stays "LIVE" because handler is not wired
      expect(livePausedBtn).toHaveTextContent("PAUSED");
    });

    it("AC-7: after clicking PAUSE, the refresh icon becomes visible", async () => {
      const { ActivityPage } = await import("@/features/activity/pages/ActivityPage");
      const user = userEvent.setup();
      render(<ActivityPage />, { wrapper: Wrapper });

      await waitFor(() => screen.getByTestId("activity-btn-live-paused"));

      // Initially refresh icon should be hidden
      const refreshBtn = screen.getByTestId("activity-btn-refresh");
      expect(refreshBtn).not.toBeVisible();

      // Pause — RED: click is disabled
      await user.click(screen.getByTestId("activity-btn-live-paused"));

      // RED: refresh icon remains hidden because LIVE/PAUSED is not wired
      expect(refreshBtn).toBeVisible();
    });

    it("AC-7: when paused, new SignalR rows do NOT appear in the table", async () => {
      const { ActivityPage } = await import("@/features/activity/pages/ActivityPage");
      const user = userEvent.setup();
      render(<ActivityPage />, { wrapper: Wrapper });

      // Wait for SignalR subscription
      await waitFor(() => expect(capturedHandlers["ActivityRowAdded"]).toBeDefined());

      // Pause
      await user.click(screen.getByTestId("activity-btn-live-paused"));

      // A new row arrives via SignalR
      const lateRow = makeRow({ id: "late-row", urlPath: "/late" });
      capturedHandlers["ActivityRowAdded"]!(lateRow);

      // RED: row still appears because PAUSED is not implemented
      await new Promise((r) => setTimeout(r, 100));
      expect(screen.queryByTestId("activity-row-late-row")).not.toBeInTheDocument();
    });
  });

  // ─── AC-8: Manual refresh when paused ────────────────────────────────────────

  describe("AC-8: Manual refresh", () => {
    it("AC-8: manual refresh button calls fetchActivityRows when clicked", async () => {
      const { ActivityPage } = await import("@/features/activity/pages/ActivityPage");
      const user = userEvent.setup();
      render(<ActivityPage />, { wrapper: Wrapper });

      await waitFor(() => screen.getByTestId("activity-btn-live-paused"));

      // Pause first
      await user.click(screen.getByTestId("activity-btn-live-paused"));

      // The initial fetch call count before manual refresh
      const callCountBefore = mockFetchActivityRows.mock.calls.length;

      // Click refresh button
      const refreshBtn = screen.getByTestId("activity-btn-refresh");
      await user.click(refreshBtn);

      // RED: LIVE/PAUSED not wired → refresh button not visible/clickable
      // fetchActivityRows should have been called once more
      expect(mockFetchActivityRows.mock.calls.length).toBeGreaterThan(callCountBefore);
    });
  });

  // ─── AC-10: Clear log (P0) ────────────────────────────────────────────────────

  describe("AC-10: Clear log (P0)", () => {
    it("AC-10: clear log button is NOT disabled (enabled after Story 3.3)", async () => {
      // RED: fails now because <button data-testid="activity-btn-clear-log" disabled />
      const { ActivityPage } = await import("@/features/activity/pages/ActivityPage");
      render(<ActivityPage />, { wrapper: Wrapper });

      await waitFor(() => screen.getByTestId("activity-btn-clear-log"));

      const clearLogBtn = screen.getByTestId("activity-btn-clear-log");
      // RED: button is currently disabled — this assertion fails
      expect(clearLogBtn).not.toBeDisabled();
    });

    it("AC-10: clicking clear log calls clearActivityLog() (DELETE /api/activity)", async () => {
      const { ActivityPage } = await import("@/features/activity/pages/ActivityPage");
      const user = userEvent.setup();
      render(<ActivityPage />, { wrapper: Wrapper });

      await waitFor(() => screen.getByTestId("activity-btn-clear-log"));

      await user.click(screen.getByTestId("activity-btn-clear-log"));

      // RED: button is disabled → click does nothing → clearActivityLog not called
      expect(mockClearActivityLog).toHaveBeenCalledTimes(1);
    });

    it("AC-10: after clearing log, table shows 'Log cleared' empty state", async () => {
      mockFetchActivityRows.mockResolvedValueOnce([
        makeRow({ id: "existing-row" }),
      ]);

      const { ActivityPage } = await import("@/features/activity/pages/ActivityPage");
      const user = userEvent.setup();
      render(<ActivityPage />, { wrapper: Wrapper });

      await waitFor(() => screen.getByTestId("activity-row-existing-row"));

      await user.click(screen.getByTestId("activity-btn-clear-log"));

      // RED: button disabled → clear does not happen → "Log cleared" state not shown
      await waitFor(() => {
        expect(screen.getByTestId("datatable-empty")).toBeInTheDocument();
        expect(screen.getByTestId("datatable-empty")).toHaveTextContent("Log cleared");
      });
    });

    it("AC-10: after clearing log, proxy counter pill resets to 0", async () => {
      // Seed proxied rows
      mockFetchActivityRows.mockResolvedValueOnce([
        makeRow({ id: "proxied-1", type: "Proxied" }),
        makeRow({ id: "proxied-2", type: "Proxied" }),
      ]);

      const { ActivityPage } = await import("@/features/activity/pages/ActivityPage");
      const user = userEvent.setup();
      render(<ActivityPage />, { wrapper: Wrapper });

      await waitFor(() => screen.getByTestId("activity-row-proxied-1"));

      // Verify proxy counter shows 2
      const pill = screen.getByTestId("activity-pill-proxy-count");
      expect(pill).toHaveTextContent("2");

      await user.click(screen.getByTestId("activity-btn-clear-log"));

      // RED: clear-log is disabled → rows not cleared → counter stays at 2
      await waitFor(() => {
        expect(screen.getByTestId("activity-pill-proxy-count")).toHaveTextContent("0");
      });
    });
  });

  // ─── AC-12: Proxy counter unaffected by filters ───────────────────────────────

  describe("AC-12: Proxy counter shows unfiltered count", () => {
    it("AC-12: proxy counter shows total proxied count even when search filter is active", async () => {
      // Two proxied rows; search will hide one
      mockFetchActivityRows.mockResolvedValueOnce([
        makeRow({ id: "proxied-payment", type: "Proxied", urlPath: "/api/payment" }),
        makeRow({ id: "proxied-orders", type: "Proxied", urlPath: "/api/orders" }),
      ]);

      const { ActivityPage } = await import("@/features/activity/pages/ActivityPage");
      const user = userEvent.setup();
      render(<ActivityPage />, { wrapper: Wrapper });

      await waitFor(() => screen.getByTestId("activity-row-proxied-payment"));

      // Apply search filter (hides orders row)
      const searchInput = screen.getByTestId("activity-input-search");
      await user.type(searchInput, "payment");

      // Even though only 1 row is visible in the table,
      // the proxy counter must show 2 (full unfiltered count).
      // RED: filtering not wired, so both rows are visible and counter shows 2 (passes for wrong reason)
      // The real assertion here tests AC-12 behavior post-implementation.
      const pill = screen.getByTestId("activity-pill-proxy-count");
      expect(pill).toHaveTextContent("2");
    });
  });

  // ─── AC-9: Disabled interval sets PAUSED on mount (new gap coverage) ──────────

  describe("AC-9: Disabled interval → PAUSED on mount", () => {
    beforeEach(() => {
      // Store "disabled" in localStorage before rendering so useActivitySettings
      // returns the disabled interval on the first render.
      localStorage.setItem(
        "fishtank-activity-settings",
        JSON.stringify({ autoRefreshInterval: "disabled", maxEntries: 1000 }),
      );
    });

    afterEach(() => {
      localStorage.removeItem("fishtank-activity-settings");
    });

    it("AC-9: LIVE/PAUSED button shows 'PAUSED' text when interval is disabled", async () => {
      const { ActivityPage } = await import("@/features/activity/pages/ActivityPage");
      render(<ActivityPage />, { wrapper: Wrapper });

      await waitFor(() => screen.getByTestId("activity-btn-live-paused"));

      const livePausedBtn = screen.getByTestId("activity-btn-live-paused");
      expect(livePausedBtn).toHaveTextContent("PAUSED");
    });

    it("AC-9: LIVE/PAUSED button has aria-disabled='true' when interval is disabled", async () => {
      const { ActivityPage } = await import("@/features/activity/pages/ActivityPage");
      render(<ActivityPage />, { wrapper: Wrapper });

      await waitFor(() => screen.getByTestId("activity-btn-live-paused"));

      const livePausedBtn = screen.getByTestId("activity-btn-live-paused");
      expect(livePausedBtn).toHaveAttribute("aria-disabled", "true");
    });

    it("AC-9: Refresh icon is visible when interval is disabled", async () => {
      const { ActivityPage } = await import("@/features/activity/pages/ActivityPage");
      render(<ActivityPage />, { wrapper: Wrapper });

      await waitFor(() => screen.getByTestId("activity-btn-refresh"));

      const refreshBtn = screen.getByTestId("activity-btn-refresh");
      expect(refreshBtn).toBeVisible();
    });

    it("AC-9: clicking LIVE/PAUSED button when interval is disabled has no effect (stays PAUSED)", async () => {
      const { ActivityPage } = await import("@/features/activity/pages/ActivityPage");
      const user = userEvent.setup();
      render(<ActivityPage />, { wrapper: Wrapper });

      await waitFor(() => screen.getByTestId("activity-btn-live-paused"));

      const livePausedBtn = screen.getByTestId("activity-btn-live-paused");
      expect(livePausedBtn).toHaveTextContent("PAUSED");

      // Click the button — should NOT toggle to LIVE
      await user.click(livePausedBtn);

      // Still shows PAUSED after click
      expect(livePausedBtn).toHaveTextContent("PAUSED");
    });
  });

  // ─── Type-filter aria-expanded (m6 MINOR — accessibility attribute) ───────────

  describe("Type-filter aria-expanded", () => {
    it("type-filter button has aria-expanded='false' by default (popover closed)", async () => {
      const { ActivityPage } = await import("@/features/activity/pages/ActivityPage");
      render(<ActivityPage />, { wrapper: Wrapper });

      await waitFor(() => screen.getByTestId("activity-btn-type-filter"));

      const typeFilterBtn = screen.getByTestId("activity-btn-type-filter");
      expect(typeFilterBtn).toHaveAttribute("aria-expanded", "false");
    });

    it("type-filter button has aria-expanded='true' after click (popover open)", async () => {
      const { ActivityPage } = await import("@/features/activity/pages/ActivityPage");
      const user = userEvent.setup();
      render(<ActivityPage />, { wrapper: Wrapper });

      await waitFor(() => screen.getByTestId("activity-btn-type-filter"));

      const typeFilterBtn = screen.getByTestId("activity-btn-type-filter");
      await user.click(typeFilterBtn);

      expect(typeFilterBtn).toHaveAttribute("aria-expanded", "true");
    });

    it("type-filter button aria-expanded toggles back to 'false' when clicked again", async () => {
      const { ActivityPage } = await import("@/features/activity/pages/ActivityPage");
      const user = userEvent.setup();
      render(<ActivityPage />, { wrapper: Wrapper });

      await waitFor(() => screen.getByTestId("activity-btn-type-filter"));

      const typeFilterBtn = screen.getByTestId("activity-btn-type-filter");

      // Open
      await user.click(typeFilterBtn);
      expect(typeFilterBtn).toHaveAttribute("aria-expanded", "true");

      // Close
      await user.click(typeFilterBtn);
      expect(typeFilterBtn).toHaveAttribute("aria-expanded", "false");
    });
  });
});
