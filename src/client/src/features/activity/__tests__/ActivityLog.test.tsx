import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { ActivityPage } from "../pages/ActivityPage";
import type { ActivityRow } from "../types";

/**
 * ATDD component tests for ActivityPage — Story 3.2
 * 
 * RED PHASE scaffolds covering:
 *   AC-2: Real-time SignalR row prepend
 *   AC-3: No React Query on activity feed
 * 
 * These tests verify the ActivityPage component (which uses useActivityPage hook)
 * correctly subscribes to SignalR ActivityRowAdded events and prepends new rows
 * to the local state WITHOUT using React Query.
 */

// Mock SignalR connection
const mockHubConnection = {
  on: vi.fn(),
  off: vi.fn(),
  invoke: vi.fn(),
  start: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn().mockResolvedValue(undefined),
};

vi.mock("../../../lib/signalr", () => ({
  getHubConnection: vi.fn(() => mockHubConnection),
}));

// Mock apiFetch for initial load
vi.mock("../../../lib/api", () => ({
  apiFetch: vi.fn().mockResolvedValue({ items: [], total: 0 }),
}));

describe("ActivityPage component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── AC-3: No React Query usage ───────────────────────────────────────────

  it("AC-3: does NOT use React Query for activity data (comment verification)", async () => {
    // RED phase: useActivityPage.ts doesn't exist yet
    // This test will fail until the hook is created with the required comment

    // Read the useActivityPage hook source to verify it contains the mandatory comment
    // This is a meta-test that ensures the architecture constraint is documented
    const hookSource = await import("../useActivityPage?raw");
    const sourceText = hookSource.default;

    expect(sourceText).toContain("// DO NOT useQuery here");
    expect(sourceText).not.toContain("useQuery");
  });

  // ─── AC-2: SignalR subscription and row prepend ───────────────────────────

  it("AC-2: subscribes to SignalR ActivityRowAdded on mount", async () => {
    // RED phase: ActivityPage component doesn't exist yet
    render(<ActivityPage />);

    // Verify SignalR subscription was established
    await waitFor(() => {
      expect(mockHubConnection.on).toHaveBeenCalledWith(
        "ActivityRowAdded",
        expect.any(Function),
      );
    });
  });

  it("AC-2: prepends new row when ActivityRowAdded event is received", async () => {
    // RED phase: ActivityPage component doesn't exist yet
    const { rerender } = render(<ActivityPage />);

    // Get the ActivityRowAdded callback
    const activityRowAddedCallback = mockHubConnection.on.mock.calls.find(
      (call) => call[0] === "ActivityRowAdded",
    )?.[1];

    expect(activityRowAddedCallback).toBeDefined();

    // Simulate receiving a new activity row via SignalR
    const newRow: ActivityRow = {
      id: "test-row-1",
      timestamp: new Date().toISOString(),
      method: "GET",
      urlPath: "/test-endpoint",
      statusCode: 200,
      type: "Mocked",
      serviceId: "service-1",
      serviceName: "Test Service",
      servicePort: 30100,
      durationMs: 42,
      requestHeaders: {},
      requestBody: null,
      responseHeaders: {},
      responseBody: null,
    };

    activityRowAddedCallback!(newRow);
    rerender(<ActivityPage />);

    // Verify the new row appears in the table
    await waitFor(() => {
      expect(screen.getByTestId("activity-row-test-row-1")).toBeInTheDocument();
    });

    // Verify the row contains expected data
    expect(screen.getByText("/test-endpoint")).toBeInTheDocument();
    expect(screen.getByText("GET")).toBeInTheDocument();
    expect(screen.getByText("200")).toBeInTheDocument();
  });

  it("AC-2: new rows are prepended (newest first)", async () => {
    // RED phase: ActivityPage component doesn't exist yet
    render(<ActivityPage />);

    const activityRowAddedCallback = mockHubConnection.on.mock.calls.find(
      (call) => call[0] === "ActivityRowAdded",
    )?.[1];

    // Add first row
    const row1: ActivityRow = {
      id: "row-1",
      timestamp: "2024-01-01T10:00:00Z",
      method: "GET",
      urlPath: "/first",
      statusCode: 200,
      type: "Mocked",
      serviceId: "service-1",
      serviceName: "Test Service",
      servicePort: 30100,
      durationMs: 10,
      requestHeaders: {},
      requestBody: null,
      responseHeaders: {},
      responseBody: null,
    };

    activityRowAddedCallback!(row1);

    // Add second row (newer timestamp)
    const row2: ActivityRow = {
      id: "row-2",
      timestamp: "2024-01-01T10:01:00Z",
      method: "POST",
      urlPath: "/second",
      statusCode: 201,
      type: "Proxied",
      serviceId: "service-1",
      serviceName: "Test Service",
      servicePort: 30100,
      durationMs: 20,
      requestHeaders: {},
      requestBody: null,
      responseHeaders: {},
      responseBody: null,
    };

    activityRowAddedCallback!(row2);

    await waitFor(() => {
      const rows = screen.getAllByTestId(/^activity-row-/);
      expect(rows).toHaveLength(2);
      
      // Verify newest row (row-2) appears first
      expect(rows[0]).toHaveAttribute("data-testid", "activity-row-row-2");
      expect(rows[1]).toHaveAttribute("data-testid", "activity-row-row-1");
    });
  });

  it("AC-2: unsubscribes from SignalR on unmount", async () => {
    // RED phase: ActivityPage component doesn't exist yet
    const { unmount } = render(<ActivityPage />);

    unmount();

    // Verify SignalR unsubscription
    await waitFor(() => {
      expect(mockHubConnection.off).toHaveBeenCalledWith(
        "ActivityRowAdded",
        expect.any(Function),
      );
    });
  });
});
