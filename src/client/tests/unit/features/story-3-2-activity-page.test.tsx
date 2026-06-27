import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ActivityRow } from "@/features/activity/types";

/**
 * ATDD component tests for ActivityPage — Story 3.2
 *
 * Covers:
 *   AC-2: Real-time SignalR row prepend
 *   AC-3: No React Query on activity feed (architectural constraint)
 */

// ─── Capture SignalR event callbacks ─────────────────────────────────────────

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

// Mock apiFetch for initial load
vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn().mockResolvedValue([]),
}));

// Mock the activity API
vi.mock("@/features/activity/api", () => ({
  fetchActivityRows: vi.fn().mockResolvedValue([]),
}));

// ─── Mock @tanstack/react-virtual (jsdom has no layout engine) ───────────────
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

// ─── React Query wrapper (ActivityTable internally uses useQueryClient) ───────

function makeQc() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={makeQc()}>{children}</QueryClientProvider>;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("ActivityPage — Story 3.2", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(capturedHandlers).forEach((k) => delete capturedHandlers[k]);
  });

  // ─── AC-3: Architectural constraint ────────────────────────────────────────

  it("AC-3: useActivityLog.ts contains mandatory DO NOT useQuery comment", async () => {
    // Verify the architectural constraint is documented in the hook source.
    // This is a meta-test: the hook MUST have the comment as a guardrail.
    const hookSource = await import("@/features/activity/useActivityLog?raw");
    const sourceText = (hookSource as { default: string }).default;
    expect(sourceText).toContain("DO NOT useQuery here");
  });

  // ─── AC-2: SignalR subscription ────────────────────────────────────────────

  it("AC-2: ActivityPage subscribes to ActivityRowAdded on mount", async () => {
    const { ActivityPage } = await import("@/features/activity/pages/ActivityPage");
    render(<ActivityPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(mockConnection.on).toHaveBeenCalledWith(
        "ActivityRowAdded",
        expect.any(Function),
      );
    });
  });

  it("AC-2: new rows prepended via SignalR appear in table newest-first", async () => {
    const { ActivityPage } = await import("@/features/activity/pages/ActivityPage");
    render(<ActivityPage />, { wrapper: Wrapper });

    // Wait for SignalR subscription to be established
    await waitFor(() => {
      expect(capturedHandlers["ActivityRowAdded"]).toBeDefined();
    });

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

    // Simulate first row arriving
    capturedHandlers["ActivityRowAdded"]!(row1);
    // Then second (newer) row
    capturedHandlers["ActivityRowAdded"]!(row2);

    await waitFor(() => {
      const rows = screen.queryAllByTestId(/^activity-row-/);
      expect(rows.length).toBeGreaterThanOrEqual(2);
    });

    const rows = screen.getAllByTestId(/^activity-row-/);
    // row-2 was prepended last, so it should appear first
    expect(rows[0]).toHaveAttribute("data-testid", "activity-row-row-2");
    expect(rows[1]).toHaveAttribute("data-testid", "activity-row-row-1");
  });
});

// ─── AC-1: Initial page load via direct apiFetch ─────────────────────────────

import { fetchActivityRows } from "@/features/activity/api";
const mockFetchActivityRows = vi.mocked(fetchActivityRows);

describe("ActivityPage initial load — AC-1", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(capturedHandlers).forEach((k) => delete capturedHandlers[k]);
  });

  it("AC-1: renders seeded rows from initial apiFetch (not useQuery)", async () => {
    const seedRows: ActivityRow[] = [
      {
        id: "initial-1",
        timestamp: "2024-01-01T10:01:00Z",
        method: "GET",
        urlPath: "/api/test",
        statusCode: 200,
        type: "Mocked",
        serviceId: "svc-1",
        serviceName: "Demo",
        servicePort: 30100,
        durationMs: 5,
        requestHeaders: {},
        requestBody: null,
        responseHeaders: {},
        responseBody: null,
      },
    ];
    mockFetchActivityRows.mockResolvedValueOnce(seedRows);

    const { ActivityPage } = await import("@/features/activity/pages/ActivityPage");
    render(<ActivityPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByTestId("activity-row-initial-1")).toBeInTheDocument();
    });
    expect(mockFetchActivityRows).toHaveBeenCalledWith({ take: 200 });
  });
});
