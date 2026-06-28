import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { ActivityRow } from "@/features/activity/types";

/**
 * Unit tests for useActivityLog.refreshRows (Story 3-3 gap coverage).
 *
 * Covers:
 *   - refreshRows() calls fetchActivityRows and updates rows state
 *   - refreshRows() replaces existing rows with fresh fetch result
 */

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
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useActivityLog — refreshRows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // isolate:false shares the module registry across all test files, so a cached
    // useActivityLog.ts may hold a reference to a different test file's mock of
    // fetchActivityRows. Resetting modules forces a fresh import that picks up
    // this file's vi.mock("@/features/activity/api") factory.
    vi.resetModules();
    Object.keys(capturedHandlers).forEach((k) => delete capturedHandlers[k]);
  });

  it("refreshRows() calls fetchActivityRows", async () => {
    const { fetchActivityRows } = await import("@/features/activity/api");
    const mockFetch = vi.mocked(fetchActivityRows);
    mockFetch.mockResolvedValue([]);

    const { useActivityLog } =
      await import("@/features/activity/useActivityLog");
    const { result } = renderHook(() => useActivityLog());

    // Wait for initial load
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const callsBefore = mockFetch.mock.calls.length;

    await act(async () => {
      await result.current.refreshRows();
    });

    expect(mockFetch.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it("refreshRows() replaces rows with freshly fetched result", async () => {
    const { fetchActivityRows } = await import("@/features/activity/api");
    const mockFetch = vi.mocked(fetchActivityRows);

    // Initial load returns empty
    mockFetch.mockResolvedValueOnce([]);

    const { useActivityLog } =
      await import("@/features/activity/useActivityLog");
    const { result } = renderHook(() => useActivityLog());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Set up fresh rows for the refresh call
    const freshRows = [
      makeRow({ id: "fresh-1", urlPath: "/fresh-path-1" }),
      makeRow({ id: "fresh-2", urlPath: "/fresh-path-2" }),
    ];
    mockFetch.mockResolvedValueOnce(freshRows);

    await act(async () => {
      await result.current.refreshRows();
    });

    expect(result.current.rows).toHaveLength(2);
    expect(result.current.rows[0].id).toBe("fresh-1");
    expect(result.current.rows[1].id).toBe("fresh-2");
  });

  it("refreshRows() does not throw on fetch error (logs and swallows)", async () => {
    const { fetchActivityRows } = await import("@/features/activity/api");
    const mockFetch = vi.mocked(fetchActivityRows);

    // Initial load succeeds
    mockFetch.mockResolvedValueOnce([makeRow({ id: "existing" })]);

    const { useActivityLog } =
      await import("@/features/activity/useActivityLog");
    const { result } = renderHook(() => useActivityLog());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Refresh call fails
    mockFetch.mockRejectedValueOnce(new Error("network error"));

    // Should not throw
    await expect(
      act(async () => {
        await result.current.refreshRows();
      }),
    ).resolves.not.toThrow();

    // Rows should remain unchanged (error swallowed)
    expect(result.current.rows).toHaveLength(1);
  });
});
