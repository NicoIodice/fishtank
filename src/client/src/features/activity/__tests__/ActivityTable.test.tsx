import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { ActivityTable } from "../ActivityTable";
import type { ActivityRow } from "../types";

/**
 * ATDD component tests for ActivityTable — Story 3.2
 * 
 * RED PHASE scaffolds covering:
 *   AC-4: Default visible columns
 *   AC-5: Method chips with DESIGN.md token colors
 *   AC-6: Type column Bootstrap Icons + tooltips
 *   AC-7: Amber left-border on proxied + Live service rows
 *   AC-8: Red background on 5xx rows
 *   AC-9: Both row highlights apply simultaneously
 *   AC-12: Virtual scrolling for 10,000+ rows
 *   AC-16: data-testid attributes
 * 
 * These tests verify the ActivityTable component renders rows with correct
 * visual treatments, handles large datasets with virtual scrolling, and
 * applies row highlights based on type and status code.
 */

// Mock React Query client for service status lookup
const mockQueryClient = {
  getQueryData: vi.fn(() => [
    { id: "service-1", name: "Test Service", status: "Live" },
    { id: "service-2", name: "Stopped Service", status: "Stopped" },
  ]),
};

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => mockQueryClient,
}));

const generateMockRows = (count: number): ActivityRow[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `row-${i}`,
    timestamp: new Date(Date.now() - i * 1000).toISOString(),
    method: ["GET", "POST", "PUT", "DELETE", "PATCH"][i % 5],
    urlPath: `/endpoint-${i}`,
    statusCode: 200,
    type: i % 2 === 0 ? ("Mocked" as const) : ("Proxied" as const),
    serviceId: "service-1",
    serviceName: "Test Service",
    servicePort: 30100,
    durationMs: 10 + i,
    requestHeaders: {},
    requestBody: null,
    responseHeaders: {},
    responseBody: null,
  }));
};

describe("ActivityTable component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── AC-4: Default visible columns ────────────────────────────────────────

  it("AC-4: renders default visible columns in correct order", async () => {
    // RED phase: ActivityTable component doesn't exist yet
    const rows = generateMockRows(3);
    render(<ActivityTable rows={rows} hadRows={true} />);

    // Verify column headers exist in correct order:
    // Method · URL Path · Status · Type · Service · Actions
    const headers = screen.getAllByRole("columnheader");
    
    expect(headers).toHaveLength(6);
    expect(headers[0]).toHaveTextContent("Method");
    expect(headers[1]).toHaveTextContent("URL Path");
    expect(headers[2]).toHaveTextContent("Status");
    expect(headers[3]).toHaveTextContent("Type");
    expect(headers[4]).toHaveTextContent("Service");
    expect(headers[5]).toHaveTextContent("Actions");
  });

  // ─── AC-5: Method chips with colors ────────────────────────────────────────

  it("AC-5: renders method chips with correct DESIGN.md colors", async () => {
    // RED phase: MethodChip component doesn't exist yet
    const rows: ActivityRow[] = [
      {
        ...generateMockRows(1)[0],
        method: "GET",
      },
      {
        ...generateMockRows(1)[0],
        id: "row-2",
        method: "POST",
      },
      {
        ...generateMockRows(1)[0],
        id: "row-3",
        method: "DELETE",
      },
    ];

    render(<ActivityTable rows={rows} hadRows={true} />);

    // Verify GET method chip has blue color
    const getChip = screen.getByText("GET");
    expect(getChip).toHaveClass(/blue/); // Will check for blue-500 class

    // Verify POST method chip has emerald color
    const postChip = screen.getByText("POST");
    expect(postChip).toHaveClass(/emerald/); // Will check for emerald-500 class

    // Verify DELETE method chip has red color
    const deleteChip = screen.getByText("DELETE");
    expect(deleteChip).toHaveClass(/red/); // Will check for red-500 class
  });

  // ─── AC-6: Type column icons ───────────────────────────────────────────────

  it("AC-6: renders type icons with correct Bootstrap icons and tooltips", async () => {
    // RED phase: TypeIcon component doesn't exist yet
    const rows: ActivityRow[] = [
      {
        ...generateMockRows(1)[0],
        type: "Mocked",
      },
      {
        ...generateMockRows(1)[0],
        id: "row-2",
        type: "Proxied",
      },
    ];

    render(<ActivityTable rows={rows} hadRows={true} />);

    // Verify Mocked icon (bi-database)
    const mockedIcon = screen.getByLabelText("Mocked");
    expect(mockedIcon).toHaveClass("bi-database");

    // Verify Proxied icon (bi-arrow-repeat)
    const proxiedIcon = screen.getByLabelText("Proxied");
    expect(proxiedIcon).toHaveClass("bi-arrow-repeat");
  });

  // ─── AC-7: Amber border on proxied + Live service rows ────────────────────

  it("AC-7: applies amber left-border to first cell when row is Proxied and service is Live", async () => {
    // RED phase: Row highlight logic doesn't exist yet
    const rows: ActivityRow[] = [
      {
        ...generateMockRows(1)[0],
        id: "proxied-live",
        type: "Proxied",
        serviceId: "service-1", // Live service
      },
      {
        ...generateMockRows(1)[0],
        id: "proxied-stopped",
        type: "Proxied",
        serviceId: "service-2", // Stopped service
      },
    ];

    render(<ActivityTable rows={rows} hadRows={true} />);

    // Verify proxied + Live row has amber border on first cell
    const liveRow = screen.getByTestId("activity-row-proxied-live");
    const liveFirstCell = liveRow.querySelector("td:first-child");
    expect(liveFirstCell).toHaveStyle({ borderLeft: "2px solid #f59e0b" });

    // Verify proxied + Stopped row does NOT have amber border
    const stoppedRow = screen.getByTestId("activity-row-proxied-stopped");
    const stoppedFirstCell = stoppedRow.querySelector("td:first-child");
    expect(stoppedFirstCell).not.toHaveStyle({ borderLeft: "2px solid #f59e0b" });
  });

  // ─── AC-8: Red background on 5xx rows ──────────────────────────────────────

  it("AC-8: applies red background to all cells when status is 5xx", async () => {
    // RED phase: Row highlight logic doesn't exist yet
    const rows: ActivityRow[] = [
      {
        ...generateMockRows(1)[0],
        id: "error-row",
        statusCode: 500,
      },
      {
        ...generateMockRows(1)[0],
        id: "success-row",
        statusCode: 200,
      },
    ];

    render(<ActivityTable rows={rows} hadRows={true} />);

    // Verify 5xx row has error background on all cells
    const errorRow = screen.getByTestId("activity-row-error-row");
    const errorCells = errorRow.querySelectorAll("td");
    errorCells.forEach((cell) => {
      expect(cell).toHaveStyle({ backgroundColor: "var(--error-row-bg)" });
    });

    // Verify 2xx row does NOT have error background
    const successRow = screen.getByTestId("activity-row-success-row");
    const successCells = successRow.querySelectorAll("td");
    successCells.forEach((cell) => {
      expect(cell).not.toHaveStyle({ backgroundColor: "var(--error-row-bg)" });
    });
  });

  // ─── AC-9: Both highlights apply simultaneously ────────────────────────────

  it("AC-9: applies both amber border AND red background when row is Proxied+Live+5xx", async () => {
    // RED phase: Row highlight logic doesn't exist yet
    const rows: ActivityRow[] = [
      {
        ...generateMockRows(1)[0],
        id: "proxied-live-error",
        type: "Proxied",
        serviceId: "service-1", // Live service
        statusCode: 503,
      },
    ];

    render(<ActivityTable rows={rows} hadRows={true} />);

    const row = screen.getByTestId("activity-row-proxied-live-error");
    const firstCell = row.querySelector("td:first-child");
    const allCells = row.querySelectorAll("td");

    // Verify amber border on first cell
    expect(firstCell).toHaveStyle({ borderLeft: "2px solid #f59e0b" });

    // Verify red background on all cells
    allCells.forEach((cell) => {
      expect(cell).toHaveStyle({ backgroundColor: "var(--error-row-bg)" });
    });
  });

  // ─── AC-12: Virtual scrolling for 10,000+ rows ────────────────────────────

  it("AC-12: uses virtual scrolling and does NOT render all 10k rows in DOM", async () => {
    // RED phase: Virtual scrolling implementation doesn't exist yet
    const rows = generateMockRows(10000);
    
    render(<ActivityTable rows={rows} hadRows={true} />);

    // Verify only visible rows are rendered (not all 10,000)
    // Virtual scrolling should render ~20-30 rows at a time
    const renderedRows = screen.queryAllByTestId(/^activity-row-/);
    
    expect(renderedRows.length).toBeLessThan(100);
    expect(renderedRows.length).toBeGreaterThan(0);
  });

  // ─── AC-16: data-testid attributes ─────────────────────────────────────────

  it("AC-16: all rows have correct data-testid attributes", async () => {
    // RED phase: data-testid attributes don't exist yet
    const rows = generateMockRows(3);
    
    render(<ActivityTable rows={rows} hadRows={true} />);

    // Verify each row has data-testid="activity-row-{id}"
    rows.forEach((row) => {
      const rowElement = screen.getByTestId(`activity-row-${row.id}`);
      expect(rowElement).toBeInTheDocument();
    });
  });

  it("AC-16: action buttons have correct data-testid and aria-label", async () => {
    // RED phase: Action buttons don't exist yet
    const rows: ActivityRow[] = [
      {
        ...generateMockRows(1)[0],
        id: "test-row",
        type: "Proxied",
      },
    ];

    render(<ActivityTable rows={rows} hadRows={true} />);

    // Verify View detail button (always shown)
    const viewBtn = screen.getByLabelText("View detail");
    expect(viewBtn).toHaveAttribute("data-testid", "activity-btn-view-test-row");

    // Verify Save as Mock button (shown for Proxied rows only)
    const saveBtn = screen.getByLabelText("Save as Mock");
    expect(saveBtn).toHaveAttribute("data-testid", "activity-btn-save-as-mock");
  });

  // ─── Empty states ──────────────────────────────────────────────────────────

  it("AC-15: renders 'No activity yet' empty state when hadRows=false", async () => {
    // RED phase: Empty state doesn't exist yet
    render(<ActivityTable rows={[]} hadRows={false} />);

    expect(screen.getByText("No activity yet")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Requests will appear here once a service is live and receiving traffic.",
      ),
    ).toBeInTheDocument();
  });

  it("AC-15: renders 'Log cleared' empty state when hadRows=true", async () => {
    // RED phase: Empty state doesn't exist yet
    render(<ActivityTable rows={[]} hadRows={true} />);

    expect(screen.getByText("Log cleared")).toBeInTheDocument();
    expect(
      screen.getByText("New requests will appear as they arrive."),
    ).toBeInTheDocument();
  });
});
