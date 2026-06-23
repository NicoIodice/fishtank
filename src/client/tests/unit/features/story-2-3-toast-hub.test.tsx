/**
 * Story 2.3 — Toast infrastructure & useServicesHub coverage
 *
 * Covers:
 *   - useToast: dismissToast clears timer; auto-dismiss removes toast
 *   - ToastContainer: dismiss button fires onDismiss
 *   - useServicesHub: wires ServiceStatusChanged → invalidateQueries; cleanup stops connection
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useToast } from "@/lib/useToast";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { useServicesHub } from "@/features/services/hooks/useServicesHub";

// ─── useToast ─────────────────────────────────────────────────────────────────

describe("useToast", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("showToast adds a toast; auto-dismisses after 4 s", async () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast("Hello", "info");
    });
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].message).toBe("Hello");

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(result.current.toasts).toHaveLength(0);
  });

  it("dismissToast removes toast before auto-dismiss fires", () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast("Bye", "error");
    });
    const id = result.current.toasts[0].id;

    act(() => {
      result.current.dismissToast(id);
    });
    expect(result.current.toasts).toHaveLength(0);

    // Verify timer was cleared — advancing beyond 4 s should not throw or re-add the toast
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.toasts).toHaveLength(0);
  });
});

// ─── ToastContainer ───────────────────────────────────────────────────────────

describe("ToastContainer", () => {
  it("calls onDismiss when dismiss button is clicked", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    const toasts = [{ id: "t1", message: "Oops", variant: "error" as const }];

    render(<ToastContainer toasts={toasts} onDismiss={onDismiss} />);

    const btn = screen.getByRole("button", { name: /dismiss/i });
    await user.click(btn);

    expect(onDismiss).toHaveBeenCalledWith("t1");
  });

  it("renders nothing when toasts array is empty", () => {
    const { container } = render(
      <ToastContainer toasts={[]} onDismiss={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("error toast has role=alert; info toast has role=status", () => {
    const toasts = [
      { id: "e1", message: "Error!", variant: "error" as const },
      { id: "i1", message: "Info", variant: "info" as const },
    ];
    render(<ToastContainer toasts={toasts} onDismiss={vi.fn()} />);

    const alertEl = screen.getByRole("alert");
    const statusEl = screen.getByRole("status");
    expect(alertEl.textContent).toContain("Error!");
    expect(statusEl.textContent).toContain("Info");
  });
});

// ─── useServicesHub ───────────────────────────────────────────────────────────

const mockStop = vi.fn().mockResolvedValue(undefined);
const mockStart = vi.fn().mockResolvedValue(undefined);
const mockOn = vi.fn();

vi.mock("@/lib/signalr", () => ({
  createHubConnection: vi.fn(() => ({
    on: mockOn,
    start: mockStart,
    stop: mockStop,
  })),
}));

function makeQCWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

describe("useServicesHub", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers ServiceStatusChanged listener on mount", () => {
    const qc = new QueryClient();
    renderHook(() => useServicesHub(), { wrapper: makeQCWrapper(qc) });

    expect(mockOn).toHaveBeenCalledWith(
      "ServiceStatusChanged",
      expect.any(Function),
    );
    expect(mockStart).toHaveBeenCalled();
  });

  it("ServiceStatusChanged handler invalidates ['services'] query", async () => {
    const qc = new QueryClient();
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");

    renderHook(() => useServicesHub(), { wrapper: makeQCWrapper(qc) });

    // Extract and invoke the registered handler
    const [, handler] = mockOn.mock.calls.find(
      ([event]: [string]) => event === "ServiceStatusChanged",
    )!;
    handler();

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ["services"] }),
      );
    });
  });

  it("stops the connection on unmount", () => {
    const qc = new QueryClient();
    const { unmount } = renderHook(() => useServicesHub(), {
      wrapper: makeQCWrapper(qc),
    });

    unmount();
    expect(mockStop).toHaveBeenCalled();
  });
});
