import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTogglesHub } from "@/features/admin/hooks/useTogglesHub";
import type { HubConnection } from "@microsoft/signalr";
import type { ReactNode } from "react";

/**
 * Unit tests for useTogglesHub hook covering:
 * - SignalR connection initialization
 * - FeatureToggleChanged event handling
 * - Query invalidation on event
 * - Connection cleanup on unmount
 * - Error handling for connection failures
 * 
 * Coverage goal: 90%+ line/branch coverage
 */

const mockConnection = {
  on: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
} as unknown as HubConnection;

const mockCreateHubConnection = vi.fn(() => mockConnection);

vi.mock("@/lib/signalr", () => ({
  createHubConnection: (url: string) => mockCreateHubConnection(url),
}));

describe("useTogglesHub", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
    mockConnection.start = vi.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it("creates hub connection to /hubs/toggles", () => {
    renderHook(() => useTogglesHub(), { wrapper });

    expect(mockCreateHubConnection).toHaveBeenCalledWith("/hubs/toggles");
  });

  it("registers FeatureToggleChanged event handler", () => {
    renderHook(() => useTogglesHub(), { wrapper });

    expect(mockConnection.on).toHaveBeenCalledWith(
      "FeatureToggleChanged",
      expect.any(Function)
    );
  });

  it("starts SignalR connection on mount", async () => {
    renderHook(() => useTogglesHub(), { wrapper });

    await waitFor(() => {
      expect(mockConnection.start).toHaveBeenCalled();
    });
  });

  it("invalidates toggles query when FeatureToggleChanged event received", async () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    renderHook(() => useTogglesHub(), { wrapper });

    // Get the event handler that was registered
    const eventHandler = vi.mocked(mockConnection.on).mock.calls.find(
      ([eventName]) => eventName === "FeatureToggleChanged"
    )?.[1];

    expect(eventHandler).toBeDefined();

    // Simulate SignalR event
    eventHandler?.();

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["toggles"] });
    });
  });

  it("stops connection on unmount", () => {
    const { unmount } = renderHook(() => useTogglesHub(), { wrapper });

    unmount();

    expect(mockConnection.stop).toHaveBeenCalled();
  });

  it("logs error when connection fails to start", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const connectionError = new Error("Connection failed");
    mockConnection.start = vi.fn().mockRejectedValue(connectionError);

    renderHook(() => useTogglesHub(), { wrapper });

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "TogglesHub connection failed:",
        connectionError
      );
    });

    consoleErrorSpy.mockRestore();
  });

  it("creates new connection on each mount", () => {
    const { unmount: unmount1 } = renderHook(() => useTogglesHub(), { wrapper });
    const firstConnectionCallCount = mockCreateHubConnection.mock.calls.length;

    unmount1();

    const { unmount: unmount2 } = renderHook(() => useTogglesHub(), { wrapper });
    const secondConnectionCallCount = mockCreateHubConnection.mock.calls.length;

    expect(secondConnectionCallCount).toBe(firstConnectionCallCount + 1);

    unmount2();
  });

  it("stops previous connection when remounting", () => {
    const { unmount: unmount1 } = renderHook(() => useTogglesHub(), { wrapper });

    unmount1();

    expect(mockConnection.stop).toHaveBeenCalledTimes(1);

    const { unmount: unmount2 } = renderHook(() => useTogglesHub(), { wrapper });

    unmount2();

    expect(mockConnection.stop).toHaveBeenCalledTimes(2);
  });

  it("handles multiple FeatureToggleChanged events", async () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    renderHook(() => useTogglesHub(), { wrapper });

    const eventHandler = vi.mocked(mockConnection.on).mock.calls.find(
      ([eventName]) => eventName === "FeatureToggleChanged"
    )?.[1];

    expect(eventHandler).toBeDefined();

    // Simulate multiple events
    eventHandler?.();
    eventHandler?.();
    eventHandler?.();

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledTimes(3);
    });

    invalidateSpy.mock.calls.forEach((call) => {
      expect(call[0]).toEqual({ queryKey: ["toggles"] });
    });
  });

  it("creates connection before registering event handler", () => {
    renderHook(() => useTogglesHub(), { wrapper });

    const createCallIndex = mockCreateHubConnection.mock.invocationCallOrder[0];
    const onCallIndex = mockConnection.on.mock.invocationCallOrder[0];

    expect(createCallIndex).toBeLessThan(onCallIndex);
  });

  it("registers event handler before starting connection", async () => {
    renderHook(() => useTogglesHub(), { wrapper });

    await waitFor(() => {
      const onCallIndex = mockConnection.on.mock.invocationCallOrder[0];
      const startCallIndex = mockConnection.start.mock.invocationCallOrder[0];

      expect(onCallIndex).toBeLessThan(startCallIndex);
    });
  });

  it("stops connection even if start failed", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockConnection.start = vi.fn().mockRejectedValue(new Error("Start failed"));

    const { unmount } = renderHook(() => useTogglesHub(), { wrapper });

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    unmount();

    expect(mockConnection.stop).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("does not throw when stop fails on unmount", () => {
    mockConnection.stop = vi.fn().mockRejectedValue(new Error("Stop failed"));

    const { unmount } = renderHook(() => useTogglesHub(), { wrapper });

    expect(() => unmount()).not.toThrow();
  });

  it("uses the same queryClient instance throughout lifecycle", async () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { rerender } = renderHook(() => useTogglesHub(), { wrapper });

    const eventHandler = vi.mocked(mockConnection.on).mock.calls.find(
      ([eventName]) => eventName === "FeatureToggleChanged"
    )?.[1];

    // Trigger event
    eventHandler?.();

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledTimes(1);
    });

    // Rerender (same component instance)
    rerender();

    // Trigger event again
    eventHandler?.();

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledTimes(2);
    });
  });
});
