import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { renderHook, act } from "@testing-library/react";

// Ensure real timers before every test to avoid fake-timer leaks from other test files
beforeEach(() => vi.useRealTimers());

// ─── ToastContext + Toast re-export ──────────────────────────────────────────

import { ToastProvider, useShowToast } from "@/lib/ToastContext";
// Also import from the re-export file to cover Toast.tsx
import { ToastProvider as ToastProviderViaReExport } from "@/components/ui/Toast";

describe("ToastContext", () => {
  it("ToastProvider re-export from Toast.tsx is the same function", () => {
    expect(ToastProviderViaReExport).toBe(ToastProvider);
  });

  it("useShowToast returns a no-op when called outside ToastProvider", () => {
    const { result } = renderHook(() => useShowToast());
    expect(() => result.current("test")).not.toThrow();
  });

  it("ToastProvider provides showToast that adds and auto-dismisses toasts", () => {
    vi.useFakeTimers();

    function TestConsumer() {
      const showToast = useShowToast();
      return (
        <button
          onClick={() => showToast("Hello world", "info")}
          data-testid="trigger"
        >
          Show Toast
        </button>
      );
    }

    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );

    // No toast yet
    expect(screen.queryByTestId("toast-container")).not.toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByTestId("trigger"));
    });

    // Toast appears
    expect(screen.getByTestId("toast-container")).toBeInTheDocument();
    expect(screen.getByText("Hello world")).toBeInTheDocument();

    // Auto-dismisses after 4s
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.queryByTestId("toast-container")).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it("ToastProvider shows error and success variants", () => {
    vi.useFakeTimers();

    function TestConsumer() {
      const showToast = useShowToast();
      return (
        <>
          <button
            onClick={() => showToast("Error msg", "error")}
            data-testid="err-btn"
          >
            Error
          </button>
          <button
            onClick={() => showToast("Success msg", "success")}
            data-testid="ok-btn"
          >
            Success
          </button>
        </>
      );
    }

    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );

    act(() => {
      fireEvent.click(screen.getByTestId("err-btn"));
    });
    expect(screen.getByRole("alert")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    act(() => {
      fireEvent.click(screen.getByTestId("ok-btn"));
    });
    expect(screen.getByRole("status")).toBeInTheDocument();

    vi.useRealTimers();
  });
});

// ─── useConnectionState ───────────────────────────────────────────────────────

const mockConnections: Array<{
  on: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  state: string;
}> = [];

vi.mock("@/lib/signalr", () => ({
  createHubConnection: vi.fn(() => {
    const conn = {
      on: vi.fn(),
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
      state: "Connected",
    };
    mockConnections.push(conn);
    return conn;
  }),
}));

import { useConnectionState } from "@/lib/useConnectionState";
import { HubConnectionState } from "@microsoft/signalr";

describe("useConnectionState", () => {
  beforeEach(() => {
    mockConnections.length = 0;
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns false (connected) when all hubs are connected", async () => {
    const { result } = renderHook(() => useConnectionState());

    await act(async () => {
      // Advance clock enough for start() promises to resolve without firing setInterval
      await vi.advanceTimersByTimeAsync(50);
    });

    expect(result.current).toBe(false);
  });

  it("returns true when a hub is disconnected", async () => {
    // Start connected, then mark one as disconnected
    const { result } = renderHook(() => useConnectionState());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });

    // Simulate a hub going disconnected
    act(() => {
      if (mockConnections[0]) {
        mockConnections[0].state = HubConnectionState.Disconnected;
      }
      vi.advanceTimersByTime(1100); // trigger interval check
    });

    expect(result.current).toBe(true);
  });

  it("stops all connections on unmount", async () => {
    const { unmount } = renderHook(() => useConnectionState());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });

    unmount();

    // All created connections should be stopped
    for (const conn of mockConnections) {
      expect(conn.stop).toHaveBeenCalled();
    }
  });
});
