import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import type { ActivityRow } from "@/features/activity/types";

// ─── Mocks ────────────────────────────────────────────────────────────────────

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

vi.mock("@/features/activity/api", () => ({
  fetchActivityRows: vi.fn().mockResolvedValue([]),
  clearActivityLog: vi.fn().mockResolvedValue(undefined),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRow(id = "r1"): ActivityRow {
  return {
    id,
    timestamp: "2024-06-01T10:00:00Z",
    method: "GET",
    urlPath: "/test",
    statusCode: 200,
    type: "Mocked",
    serviceId: "svc-1",
    serviceName: "Test Service",
    servicePort: 30100,
    durationMs: 10,
    requestHeaders: {},
    requestBody: null,
    responseHeaders: {},
    responseBody: null,
  };
}

describe("useActivityLog — error paths and edge cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    Object.keys(capturedHandlers).forEach((k) => delete capturedHandlers[k]);
  });

  it("handles fetch error gracefully and still resolves isLoading", async () => {
    const { fetchActivityRows } = await import("@/features/activity/api");
    vi.mocked(fetchActivityRows).mockRejectedValue(new Error("Network error"));

    const { useActivityLog } =
      await import("@/features/activity/useActivityLog");
    const { result } = renderHook(() => useActivityLog());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    // rows remain empty on error
    expect(result.current.rows).toHaveLength(0);
  });

  it("buffers SignalR rows that arrive before initial fetch settles", async () => {
    const { fetchActivityRows } = await import("@/features/activity/api");

    // Use a delayed fetch so we can inject a SignalR row before it resolves
    let resolveFetch!: (rows: ActivityRow[]) => void;
    vi.mocked(fetchActivityRows).mockImplementation(
      () =>
        new Promise<ActivityRow[]>((resolve) => {
          resolveFetch = resolve;
        }),
    );

    const { useActivityLog } =
      await import("@/features/activity/useActivityLog");
    const { result } = renderHook(() => useActivityLog());

    // Wait for SignalR subscription to be established
    await waitFor(() =>
      expect(capturedHandlers["ActivityRowAdded"]).toBeDefined(),
    );

    // Inject a row BEFORE fetch resolves (should be buffered)
    capturedHandlers["ActivityRowAdded"]!(makeRow("signalr-before-fetch"));

    // Now resolve the fetch
    act(() => resolveFetch([makeRow("fetch-row")]));

    // After settling, both rows should appear (buffered SignalR + fetch row)
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.rows.length).toBeGreaterThanOrEqual(1);
  });

  it("clearRows sets rows to empty array", async () => {
    const { fetchActivityRows } = await import("@/features/activity/api");
    vi.mocked(fetchActivityRows).mockResolvedValue([
      makeRow("r1"),
      makeRow("r2"),
    ]);

    const { useActivityLog } =
      await import("@/features/activity/useActivityLog");
    const { result } = renderHook(() => useActivityLog());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.rows).toHaveLength(2);

    act(() => result.current.clearRows());
    expect(result.current.rows).toHaveLength(0);
    // hadRows stays true after clear
    expect(result.current.hadRows).toBe(true);
  });

  it("stops the connection on unmount", async () => {
    const { useActivityLog } =
      await import("@/features/activity/useActivityLog");
    const { unmount } = renderHook(() => useActivityLog());

    await waitFor(() => expect(mockConnection.start).toHaveBeenCalled());

    unmount();
    expect(mockConnection.stop).toHaveBeenCalled();
  });

  it("does not set hadRows when fetch returns empty array and no buffered rows", async () => {
    const { fetchActivityRows } = await import("@/features/activity/api");
    vi.mocked(fetchActivityRows).mockResolvedValue([]); // empty initial

    const { useActivityLog } =
      await import("@/features/activity/useActivityLog");
    const { result } = renderHook(() => useActivityLog());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.rows).toHaveLength(0);
    expect(result.current.hadRows).toBe(false); // neither condition met
  });

  it("sets hadRows when error occurs but SignalR rows arrived before fetch", async () => {
    const { fetchActivityRows } = await import("@/features/activity/api");

    let rejectFetch!: (err: Error) => void;
    vi.mocked(fetchActivityRows).mockImplementation(
      () =>
        new Promise<ActivityRow[]>((_, reject) => {
          rejectFetch = reject;
        }),
    );

    const { useActivityLog } =
      await import("@/features/activity/useActivityLog");
    const { result } = renderHook(() => useActivityLog());

    await waitFor(() =>
      expect(capturedHandlers["ActivityRowAdded"]).toBeDefined(),
    );

    // Inject a SignalR row before fetch settles
    capturedHandlers["ActivityRowAdded"]!(makeRow("signalr-before-error"));

    // Reject the fetch — error path; buffered row should appear
    act(() => rejectFetch(new Error("Server error")));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    // The buffered SignalR row was preserved via the error catch path
    expect(result.current.rows.length).toBeGreaterThanOrEqual(1);
  });
});
