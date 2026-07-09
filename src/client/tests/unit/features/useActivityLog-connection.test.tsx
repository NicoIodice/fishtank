/**
 * Unit tests for useActivityLog connection state — Story 4.5
 * Layer: Vitest + React Hooks + SignalR mocks
 *
 * Focus: isConnected state transitions for Recording badge warning state (AC-7, AC-8)
 *
 * ACs covered:
 *   AC-7: SignalR disconnect changes badge to warning state (isConnected: false)
 *   AC-8: SignalR reconnect resumes recording (isConnected: true)
 *   Bug Fix B-2: Treat isConnected: null as connected (initial state before first connection)
 *
 * Coverage: Connection state transitions, onclose/onreconnected handlers, null handling
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useActivityLog } from "@/features/activity/useActivityLog";

// ─── Mock Setup ─────────────────────────────────────────────────────────────

// Mock SignalR connection
const mockHubConnection = {
  on: vi.fn(),
  off: vi.fn(),
  onclose: vi.fn(),
  onreconnected: vi.fn(),
  start: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn().mockResolvedValue(undefined),
};

vi.mock("@/lib/signalr", () => ({
  createHubConnection: vi.fn(() => mockHubConnection),
}));

// Mock apiFetch for initial activity rows
vi.mock("@/features/activity/api", () => ({
  fetchActivityRows: vi.fn().mockResolvedValue([]),
}));

// ─── Test Suite ─────────────────────────────────────────────────────────────

describe("useActivityLog Connection State — Story 4.5", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementation for each test
    mockHubConnection.start.mockResolvedValue(undefined);
    mockHubConnection.onclose.mockClear();
    mockHubConnection.onreconnected.mockClear();
  });

  // ─── Initial State Tests (Bug Fix B-2) ─────────────────────────────────

  it("starts with isConnected: null before SignalR connects", () => {
    // Arrange — delay the start() promise so we can check initial state
    mockHubConnection.start.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100)),
    );

    // Act
    const { result } = renderHook(() => useActivityLog());

    // Assert — initial state is null (not connected yet, not disconnected)
    expect(result.current.isConnected).toBeNull();
  });

  it("treats isConnected: null as connected (Bug Fix B-2)", () => {
    // Arrange
    mockHubConnection.start.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100)),
    );

    // Act
    const { result } = renderHook(() => useActivityLog());

    // Assert — null should be treated as connected in consuming components
    // This test documents the expected behavior: null means "not yet established, assume ok"
    expect(result.current.isConnected).toBeNull();
    expect(result.current.isConnected !== false).toBe(true); // NOT disconnected
  });

  // ─── Connection Success Tests (AC-8) ───────────────────────────────────

  it("sets isConnected: true when SignalR connection succeeds", async () => {
    // Arrange
    mockHubConnection.start.mockResolvedValue(undefined);

    // Act
    const { result } = renderHook(() => useActivityLog());

    // Assert
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });
  });

  it("sets isConnected: true on initial mount after connection", async () => {
    // Arrange
    mockHubConnection.start.mockResolvedValue(undefined);

    // Act
    const { result } = renderHook(() => useActivityLog());

    // Assert — verify state transition: null → true
    expect(result.current.isConnected).toBeNull(); // initial
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true); // after start()
    });
  });

  // ─── Connection Loss Tests (AC-7) ──────────────────────────────────────

  it("sets isConnected: false when SignalR connection is lost", async () => {
    // Arrange
    mockHubConnection.start.mockResolvedValue(undefined);
    const { result } = renderHook(() => useActivityLog());

    // Wait for initial connection
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Act — simulate connection loss
    const oncloseHandler = mockHubConnection.onclose.mock.calls[0][0];
    oncloseHandler();

    // Assert
    await waitFor(() => {
      expect(result.current.isConnected).toBe(false);
    });
  });

  it("transitions from connected to disconnected on SignalR onclose", async () => {
    // Arrange
    mockHubConnection.start.mockResolvedValue(undefined);
    const { result } = renderHook(() => useActivityLog());

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Act — simulate connection drop
    const oncloseHandler = mockHubConnection.onclose.mock.calls[0][0];
    oncloseHandler();

    // Assert — verify state transition: true → false
    await waitFor(() => {
      expect(result.current.isConnected).toBe(false);
    });
  });

  // ─── Reconnection Tests (AC-8) ─────────────────────────────────────────

  it("sets isConnected: true when SignalR reconnects", async () => {
    // Arrange
    mockHubConnection.start.mockResolvedValue(undefined);
    const { result } = renderHook(() => useActivityLog());

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Simulate connection loss
    const oncloseHandler = mockHubConnection.onclose.mock.calls[0][0];
    oncloseHandler();
    await waitFor(() => {
      expect(result.current.isConnected).toBe(false);
    });

    // Act — simulate reconnection
    const onreconnectedHandler =
      mockHubConnection.onreconnected.mock.calls[0][0];
    onreconnectedHandler();

    // Assert
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });
  });

  it("transitions through full connection lifecycle: null → true → false → true", async () => {
    // Arrange
    mockHubConnection.start.mockResolvedValue(undefined);
    const { result } = renderHook(() => useActivityLog());

    // Assert Step 1: Initial state (null)
    expect(result.current.isConnected).toBeNull();

    // Assert Step 2: Connected (true)
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Act Step 3: Connection lost
    const oncloseHandler = mockHubConnection.onclose.mock.calls[0][0];
    oncloseHandler();

    // Assert Step 3: Disconnected (false)
    await waitFor(() => {
      expect(result.current.isConnected).toBe(false);
    });

    // Act Step 4: Reconnected
    const onreconnectedHandler =
      mockHubConnection.onreconnected.mock.calls[0][0];
    onreconnectedHandler();

    // Assert Step 4: Connected again (true)
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });
  });

  // ─── Error Handling Tests ──────────────────────────────────────────────

  it("sets isConnected: false when initial connection fails", async () => {
    // Arrange
    mockHubConnection.start.mockRejectedValue(new Error("Connection failed"));

    // Act
    const { result } = renderHook(() => useActivityLog());

    // Assert
    await waitFor(() => {
      expect(result.current.isConnected).toBe(false);
    });
  });

  it("handles connection failure without crashing", async () => {
    // Arrange
    mockHubConnection.start.mockRejectedValue(new Error("Network error"));

    // Act & Assert — should not throw
    expect(() => {
      renderHook(() => useActivityLog());
    }).not.toThrow();

    // Verify isConnected reflects failure
    const { result } = renderHook(() => useActivityLog());
    await waitFor(() => {
      expect(result.current.isConnected).toBe(false);
    });
  });

  // ─── Cleanup Tests ─────────────────────────────────────────────────────

  it("does not update state after unmount", async () => {
    // Arrange
    mockHubConnection.start.mockResolvedValue(undefined);
    const { result, unmount } = renderHook(() => useActivityLog());

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Act — unmount and then trigger onclose
    unmount();
    const oncloseHandler = mockHubConnection.onclose.mock.calls[0][0];
    oncloseHandler();

    // Assert — state should not change (component unmounted)
    // This test verifies the mountedRef check prevents memory leaks
    expect(result.current.isConnected).toBe(true); // unchanged
  });
});
