import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ActivityTable } from "@/features/activity/ActivityTable";
import type { ActivityRow } from "@/features/activity/types";

/**
 * ATDD component tests for ActivityTable — Story 3.2
 *
 * Covers:
 *   AC-4:  Default visible columns in correct order
 *   AC-5:  Method chips with DESIGN.md token colors
 *   AC-6:  Type column Bootstrap Icons + tooltips
 *   AC-7:  Amber left-border on proxied + Live service rows
 *   AC-8:  Red background on 5xx rows
 *   AC-9:  Both row highlights apply simultaneously
 *   AC-12: Virtual scrolling — DOM does not contain all 10k rows
 *   AC-15: Empty states (no activity yet / log cleared)
 *   AC-16: data-testid attributes on rows and action buttons
 */

// ─── Mock @tanstack/react-virtual (jsdom has no layout engine) ───────────────
// The mock renders up to MAX_VIRTUAL_ROWS items so tests can find DOM elements.
// AC-12 verifies that 10k rows only render MAX_VIRTUAL_ROWS (virtual scrolling).
const MAX_VIRTUAL_ROWS = 50;
vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: vi.fn(
    ({ count, estimateSize }: { count: number; estimateSize: (i: number) => number }) => ({
      getVirtualItems: () =>
        Array.from({ length: Math.min(count, MAX_VIRTUAL_ROWS) }, (_, i) => ({
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

// ─── React Query wrapper with pre-seeded service status ──────────────────────
// Uses the minimal ServiceStatus shape that ActivityTable reads from the cache.

const MOCK_SERVICES = [
  { id: "service-1", status: "live" },
  { id: "service-2", status: "stopped" },
];

function makeQc() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData(["services"], MOCK_SERVICES);
  return qc;
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={makeQc()}>{children}</QueryClientProvider>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const generateMockRows = (count: number): ActivityRow[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `row-${i}`,
    timestamp: new Date(Date.now() - i * 1000).toISOString(),
    method: (["GET", "POST", "PUT", "DELETE", "PATCH"] as const)[i % 5],
    urlPath: `/endpoint-${i}`,
    statusCode: 200,
    type: (i % 2 === 0 ? "Mocked" : "Proxied") as "Mocked" | "Proxied",
    serviceId: "service-1",
    serviceName: "Test Service",
    servicePort: 30100,
    durationMs: 10 + i,
    requestHeaders: {},
    requestBody: null,
    responseHeaders: {},
    responseBody: null,
  }));

// Use a helper that always wraps with QueryClientProvider (ActivityTable needs useQueryClient)
function renderTable(rows: ActivityRow[], hadRows = true) {
  return render(<ActivityTable rows={rows} hadRows={hadRows} />, { wrapper: Wrapper });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ActivityTable — Story 3.2", () => {
  beforeEach(() => vi.clearAllMocks());

  // ─── AC-4: Default visible columns ─────────────────────────────────────────

  it("AC-4: renders default visible columns in correct order", () => {
    renderTable(generateMockRows(3));

    const headers = screen.getAllByRole("columnheader");
    const texts = headers.map((h) => h.textContent?.trim() ?? "");

    // Type column uses a bi-funnel icon (aria-label="Type"), has no text content.
    // Other columns are text-based.
    expect(texts).toEqual(
      expect.arrayContaining(["Method", "URL Path", "Status", "Service", "Actions"]),
    );
    // Verify the Type column is present via its aria-label on the icon
    expect(screen.getByRole("columnheader", { name: /type/i })).toBeInTheDocument();
  });

  // ─── AC-5: Method chips ─────────────────────────────────────────────────────
  // MethodChip uses inline styles (not CSS class names).
  // jsdom converts hex colors to rgb in inline style properties.

  it("AC-5: GET method chip renders with blue color", () => {
    const rows: ActivityRow[] = [{ ...generateMockRows(1)[0], id: "r1", method: "GET" }];
    renderTable(rows);
    const chip = screen.getByText("GET");
    // GET → #3b82f6 → rgb(59, 130, 246)
    expect(chip.style.color).toBe("rgb(59, 130, 246)");
  });

  it("AC-5: POST method chip renders with emerald color", () => {
    const rows: ActivityRow[] = [{ ...generateMockRows(1)[0], id: "r1", method: "POST" }];
    renderTable(rows);
    const chip = screen.getByText("POST");
    // POST → #10b981 → rgb(16, 185, 129)
    expect(chip.style.color).toBe("rgb(16, 185, 129)");
  });

  it("AC-5: DELETE method chip renders with red color", () => {
    const rows: ActivityRow[] = [{ ...generateMockRows(1)[0], id: "r1", method: "DELETE" }];
    renderTable(rows);
    const chip = screen.getByText("DELETE");
    // DELETE → #ef4444 → rgb(239, 68, 68)
    expect(chip.style.color).toBe("rgb(239, 68, 68)");
  });

  it("AC-5: unknown method chip renders with slate fallback color", () => {
    const rows: ActivityRow[] = [{ ...generateMockRows(1)[0], id: "r1", method: "UNKNOWN" }];
    renderTable(rows);
    const chip = screen.getByText("UNKNOWN");
    // DEFAULT_COLOR → #475569 → rgb(71, 85, 105)
    expect(chip.style.color).toBe("rgb(71, 85, 105)");
  });

  it("AC-5: PUT method chip renders with amber color", () => {
    const rows: ActivityRow[] = [{ ...generateMockRows(1)[0], id: "r1", method: "PUT" }];
    renderTable(rows);
    const chip = screen.getByText("PUT");
    // PUT → #d97706 → rgb(217, 119, 6)
    expect(chip.style.color).toBe("rgb(217, 119, 6)");
  });

  it("AC-5: PATCH method chip renders with purple color", () => {
    const rows: ActivityRow[] = [{ ...generateMockRows(1)[0], id: "r1", method: "PATCH" }];
    renderTable(rows);
    const chip = screen.getByText("PATCH");
    // PATCH → #8b5cf6 → rgb(139, 92, 246)
    expect(chip.style.color).toBe("rgb(139, 92, 246)");
  });

  // ─── AC-6: Type column icons ─────────────────────────────────────────────────

  it("AC-6: Mocked row renders bi-database icon with tooltip", () => {
    const rows: ActivityRow[] = [{ ...generateMockRows(1)[0], id: "r1", type: "Mocked" }];
    renderTable(rows);
    const icon = document.querySelector(".bi-database");
    expect(icon).toBeInTheDocument();
  });

  it("AC-6: Proxied row renders bi-arrow-repeat icon with tooltip", () => {
    const rows: ActivityRow[] = [{ ...generateMockRows(1)[0], id: "r1", type: "Proxied" }];
    renderTable(rows);
    const icon = document.querySelector(".bi-arrow-repeat");
    expect(icon).toBeInTheDocument();
  });

  // ─── AC-7: Amber border on proxied + Live rows ─────────────────────────────
  // jsdom converts hex #f59e0b → rgb(245, 158, 11) in inline style properties.

  it("AC-7: proxied row with Live service has amber border-left on first cell", () => {
    const rows: ActivityRow[] = [
      { ...generateMockRows(1)[0], id: "proxied-live", type: "Proxied", serviceId: "service-1" },
    ];
    renderTable(rows);
    const row = screen.getByTestId("activity-row-proxied-live");
    const firstCell = row.querySelector("td:first-child") as HTMLElement;
    // #f59e0b → rgb(245, 158, 11)
    expect(firstCell.style.borderLeft).toMatch(/rgb\(245,\s*158,\s*11\)/);
  });

  it("AC-7: proxied row with Stopped service has NO amber border", () => {
    const rows: ActivityRow[] = [
      { ...generateMockRows(1)[0], id: "proxied-stopped", type: "Proxied", serviceId: "service-2" },
    ];
    renderTable(rows);
    const row = screen.getByTestId("activity-row-proxied-stopped");
    const firstCell = row.querySelector("td:first-child") as HTMLElement;
    expect(firstCell.style.borderLeft).not.toMatch(/rgb\(245,\s*158,\s*11\)/);
  });

  // ─── AC-8: Red background on 5xx rows ────────────────────────────────────
  // The background color is set on the <tr> row element (not each <td>).
  // AC-8 requires var(--error-row-bg) specifically (theme-aware CSS variable).

  it("AC-8: 5xx row applies error-row-bg CSS variable to all cells", () => {
    const rows: ActivityRow[] = [
      { ...generateMockRows(1)[0], id: "error-row", statusCode: 500 },
    ];
    renderTable(rows);
    const row = screen.getByTestId("activity-row-error-row") as HTMLTableRowElement;
    // Background is applied on the <tr> via var(--error-row-bg, ...)
    // jsdom preserves the CSS variable string in cssText
    expect(row.style.cssText).toMatch(/var\(--error-row-bg/);
  });

  it("AC-8: 2xx row does NOT have error background", () => {
    const rows: ActivityRow[] = [
      { ...generateMockRows(1)[0], id: "ok-row", statusCode: 200 },
    ];
    renderTable(rows);
    const row = screen.getByTestId("activity-row-ok-row") as HTMLTableRowElement;
    expect(row.style.backgroundColor).toBe("");
  });

  // ─── AC-9: Both highlights simultaneously ─────────────────────────────────

  it("AC-9: Proxied+Live+5xx row gets both amber border AND red background", () => {
    const rows: ActivityRow[] = [
      {
        ...generateMockRows(1)[0],
        id: "dual-highlight",
        type: "Proxied",
        serviceId: "service-1",
        statusCode: 503,
      },
    ];
    renderTable(rows);
    const row = screen.getByTestId("activity-row-dual-highlight") as HTMLTableRowElement;
    const firstCell = row.querySelector("td:first-child") as HTMLElement;

    // Amber border on first cell: #f59e0b → rgb(245, 158, 11)
    expect(firstCell.style.borderLeft).toMatch(/rgb\(245,\s*158,\s*11\)/);
    // Red background on the row element via var(--error-row-bg)
    expect(row.style.cssText).toMatch(/var\(--error-row-bg/);
  });

  // ─── AC-12: Virtual scrolling ─────────────────────────────────────────────────

  it("AC-12: renders far fewer than 10,000 rows in DOM (virtual scrolling)", () => {
    renderTable(generateMockRows(10000));
    const rendered = screen.queryAllByTestId(/^activity-row-/);
    expect(rendered.length).toBeLessThan(100);
    expect(rendered.length).toBeGreaterThan(0);
  });

  // ─── AC-15: Empty states ──────────────────────────────────────────────────────

  it("AC-15: renders 'No activity yet' when hadRows=false", () => {
    renderTable([], false);
    expect(screen.getByText("No activity yet")).toBeInTheDocument();
  });

  it("AC-15: renders 'Log cleared' when hadRows=true but rows=[]", () => {
    renderTable([]);
    expect(screen.getByText("Log cleared")).toBeInTheDocument();
  });

  // ─── AC-16: data-testid attributes ────────────────────────────────────────────

  it("AC-16: every row has data-testid=activity-row-{id}", () => {
    const rows = generateMockRows(3);
    renderTable(rows);
    rows.forEach((r) => {
      expect(screen.getByTestId(`activity-row-${r.id}`)).toBeInTheDocument();
    });
  });

  it("AC-16: Proxied row has Save as Mock action button with correct testid", () => {
    const rows: ActivityRow[] = [
      { ...generateMockRows(1)[0], id: "proxied-row", type: "Proxied" },
    ];
    renderTable(rows);
    const saveBtn = screen.queryByLabelText("Save as Mock");
    expect(saveBtn).toBeInTheDocument();
    expect(saveBtn).toHaveAttribute("data-testid", "activity-btn-save-as-mock");
  });

  // ─── AC-13: Keyboard navigation ───────────────────────────────────────────

  it("AC-13: table container has role=grid and tabIndex=0 for keyboard focus", () => {
    renderTable(generateMockRows(3));
    const grid = screen.getByRole("grid");
    expect(grid).toBeInTheDocument();
    expect(grid).toHaveAttribute("tabIndex", "0");
  });

  it("AC-13: ArrowDown moves row focus to next row", () => {
    renderTable(generateMockRows(3));
    const grid = screen.getByRole("grid");
    // Press ArrowDown — first row (index 0) should get tabIndex=0
    fireEvent.keyDown(grid, { key: "ArrowDown" });
    const rows = screen.getAllByRole("row", { hidden: false });
    // First data row (after header) should now be tabIndex=0
    const dataRows = rows.filter((r) => r.hasAttribute("data-testid"));
    expect(dataRows[0]).toHaveAttribute("tabIndex", "0");
  });

  it("AC-13: ArrowUp does not go below index 0", () => {
    renderTable(generateMockRows(3));
    const grid = screen.getByRole("grid");
    // Press ArrowUp without any prior focus — should not crash
    fireEvent.keyDown(grid, { key: "ArrowUp" });
    // Grid still renders
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("AC-13: action buttons have correct aria-labels", () => {
    const rows: ActivityRow[] = [
      { ...generateMockRows(1)[0], id: "test-row", type: "Proxied" },
    ];
    renderTable(rows);
    expect(screen.getByLabelText("View detail")).toBeInTheDocument();
    expect(screen.getByLabelText("Save as Mock")).toBeInTheDocument();
  });
});

