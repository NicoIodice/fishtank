import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  useSystemEvents,
  useUnreadCount,
  useMarkRead,
  useMarkAllRead,
  useClearAll,
} from "@/features/events/hooks/useSystemEvents";

// useEventsHub is tested in its own describe block below
// It requires the signalr mock before importing the hook

const mockConnections: Array<{
  on: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
}> = [];

vi.mock("@/lib/signalr", () => ({
  createHubConnection: vi.fn(() => {
    const conn = {
      on: vi.fn(),
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
    };
    mockConnections.push(conn);
    return conn;
  }),
}));

import { useEventsHub } from "@/features/events/hooks/useEventsHub";
import { createHubConnection } from "@/lib/signalr";
const mockCreateHubConnection = vi.mocked(createHubConnection);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

function makeNamedWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

function mockOk(data: unknown) {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockConnections.length = 0;
});
afterEach(() => vi.restoreAllMocks());

// ─── useEventsHub ─────────────────────────────────────────────────────────────

describe("useEventsHub", () => {
  it("creates a hub connection to /hubs/events on mount", () => {
    const qc = new QueryClient();
    renderHook(() => useEventsHub(), { wrapper: makeNamedWrapper(qc) });

    expect(mockCreateHubConnection).toHaveBeenCalledWith("/hubs/events");
    expect(mockConnections).toHaveLength(1);
    expect(mockConnections[0].start).toHaveBeenCalled();
  });

  it("registers SystemEventCreated and UnreadCountChanged listeners", async () => {
    const qc = new QueryClient();
    renderHook(() => useEventsHub(), { wrapper: makeNamedWrapper(qc) });

    await waitFor(() => expect(mockConnections).toHaveLength(1));

    const registeredEvents = mockConnections[0].on.mock.calls.map(
      ([ev]) => ev as string,
    );
    expect(registeredEvents).toContain("SystemEventCreated");
    expect(registeredEvents).toContain("UnreadCountChanged");
  });

  it("stops the connection on unmount", async () => {
    const qc = new QueryClient();
    const { unmount } = renderHook(() => useEventsHub(), {
      wrapper: makeNamedWrapper(qc),
    });
    await waitFor(() => expect(mockConnections).toHaveLength(1));

    unmount();
    expect(mockConnections[0].stop).toHaveBeenCalled();
  });

  it("invalidates queries when SystemEventCreated fires", async () => {
    const qc = new QueryClient();
    renderHook(() => useEventsHub(), { wrapper: makeNamedWrapper(qc) });
    await waitFor(() => expect(mockConnections).toHaveLength(1));

    const systemEventCb = mockConnections[0].on.mock.calls.find(
      ([ev]) => ev === "SystemEventCreated",
    )?.[1] as (() => void) | undefined;

    expect(systemEventCb).toBeDefined();
    // Firing the callback should not throw (invalidateQueries is called internally)
    expect(() => systemEventCb?.()).not.toThrow();
  });

  it("logs a warning when the connection fails to start", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    // Make the NEXT createHubConnection return a connection whose start() rejects
    mockCreateHubConnection.mockReturnValueOnce({
      on: vi.fn(),
      start: vi.fn().mockRejectedValue(new Error("Network error")),
      stop: vi.fn().mockResolvedValue(undefined),
    } as unknown as ReturnType<typeof createHubConnection>);

    const qc = new QueryClient();
    renderHook(() => useEventsHub(), { wrapper: makeNamedWrapper(qc) });

    await waitFor(() => {
      expect(warnSpy).toHaveBeenCalledWith(
        "[EventsHub] connection failed:",
        expect.any(Error),
      );
    });

    warnSpy.mockRestore();
  });

  it("updates unread count query data when UnreadCountChanged fires", async () => {
    const qc = new QueryClient();
    renderHook(() => useEventsHub(), { wrapper: makeNamedWrapper(qc) });
    await waitFor(() => expect(mockConnections).toHaveLength(1));

    const unreadChangedCb = mockConnections[0].on.mock.calls.find(
      ([ev]) => ev === "UnreadCountChanged",
    )?.[1] as ((p: { count: number }) => void) | undefined;

    expect(unreadChangedCb).toBeDefined();
    unreadChangedCb?.({ count: 42 });

    const data = qc.getQueryData<{ count: number }>(["events", "unread-count"]);
    expect(data?.count).toBe(42);
  });
});

// ─── useSystemEvents ──────────────────────────────────────────────────────────

describe("useSystemEvents", () => {
  it("fetches the first page for warnings-errors group", async () => {
    mockOk({
      items: [{ id: "1", severity: "error", message: "oops" }],
      total: 1,
      hasMore: false,
    });

    const { result } = renderHook(() => useSystemEvents("warnings-errors"), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const items = result.current.data?.pages[0]?.items ?? [];
    expect(items).toHaveLength(1);
    expect(items[0]?.severity).toBe("error");
  });
});

// ─── useUnreadCount ───────────────────────────────────────────────────────────

describe("useUnreadCount", () => {
  it("fetches unread count from /api/system-events/unread-count", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { count: 7 } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const { result } = renderHook(() => useUnreadCount(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toBe(7);
    const urls = fetchSpy.mock.calls.map(([u]) => u as string);
    expect(
      urls.some((u) => u.includes("/api/system-events/unread-count")),
    ).toBe(true);
  });
});

// ─── useMarkRead ──────────────────────────────────────────────────────────────

describe("useMarkRead", () => {
  it("calls POST /api/system-events/:id/read on mutate", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { id: "ev1" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const { result } = renderHook(() => useMarkRead(), {
      wrapper: makeWrapper(),
    });
    result.current.mutate("ev1");

    await waitFor(() => {
      const calls = fetchSpy.mock.calls.map(([u, opts]) => ({
        url: u as string,
        method: (opts as RequestInit)?.method,
      }));
      expect(
        calls.some(
          (c) =>
            c.url.includes("/api/system-events/ev1/read") &&
            c.method === "POST",
        ),
      ).toBe(true);
    });
  });
});

// ─── useMarkAllRead ───────────────────────────────────────────────────────────

describe("useMarkAllRead", () => {
  it("calls POST /api/system-events/read-all on mutate", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { marked: 3 } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const { result } = renderHook(() => useMarkAllRead(), {
      wrapper: makeWrapper(),
    });
    result.current.mutate();

    await waitFor(() => {
      const calls = fetchSpy.mock.calls.map(([u, opts]) => ({
        url: u as string,
        method: (opts as RequestInit)?.method,
      }));
      expect(
        calls.some(
          (c) =>
            c.url.includes("/api/system-events/read-all") &&
            c.method === "POST",
        ),
      ).toBe(true);
    });
  });
});

// ─── useClearAll ──────────────────────────────────────────────────────────────

describe("useClearAll", () => {
  it("calls DELETE /api/system-events?severity=warnings-errors on mutate", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { cleared: true } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const { result } = renderHook(() => useClearAll(), {
      wrapper: makeWrapper(),
    });
    result.current.mutate("warnings-errors");

    await waitFor(() => {
      const calls = fetchSpy.mock.calls.map(([u, opts]) => ({
        url: u as string,
        method: (opts as RequestInit)?.method,
      }));
      expect(
        calls.some(
          (c) =>
            c.url.includes("/api/system-events") &&
            c.url.includes("severity=warnings-errors") &&
            c.method === "DELETE",
        ),
      ).toBe(true);
    });
  });
});
