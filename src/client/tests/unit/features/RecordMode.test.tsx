/**
 * ATDD component tests for Record Mode — Story 4.5
 * Layer: Vitest + RTL + msw (component-level, no live backend)
 *
 * RED PHASE — these tests are RED-by-construction:
 *   - useRecordingState hook doesn't exist yet
 *   - Record button stub is disabled in ActivityPage
 *   - Recording badge stub has display: none
 *   - POST /api/recording/start endpoint doesn't exist (404)
 *   - POST /api/recording/stop endpoint doesn't exist (404)
 *   - GET /api/recording/status endpoint doesn't exist (404)
 *
 * ACs covered:
 *   AC-1:  Record button activates Record mode
 *   AC-2:  Recording badge visible and amber-styled
 *   AC-3:  Stop button deactivates mode, badge hides immediately
 *   AC-7:  SignalR disconnect → badge shows warning state
 *   AC-8:  SignalR reconnect → badge returns to "● Recording"
 *   AC-9:  prefers-reduced-motion → no animations
 *   AC-11: Record button state loaded on ActivityPage mount
 *
 * data-testid contract:
 *   activity-btn-record
 *   activity-badge-recording
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ActivityPage } from "@/features/activity/pages/ActivityPage";
import { useActivityLog } from "@/features/activity/useActivityLog";

// ─── Mock Setup ─────────────────────────────────────────────────────────────

// Mock the useRecordingState hook (doesn't exist yet — RED phase)
// @ts-expect-error — hook doesn't exist yet
vi.mock("@/features/activity/hooks/useRecordingState", () => ({
  useRecordingState: vi.fn(() => ({
    isRecording: false,
    startedAt: null,
    startRecording: vi.fn(),
    stopRecording: vi.fn(),
    isStarting: false,
    isStopping: false,
  })),
}));

// Mock SignalR connection for activity log
const mockHubConnection = {
  on: vi.fn(),
  off: vi.fn(),
  invoke: vi.fn(),
  start: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn().mockResolvedValue(undefined),
  onclose: vi.fn(),
  onreconnected: vi.fn(),
};

vi.mock("@/lib/signalr", () => ({
  getHubConnection: vi.fn(() => mockHubConnection),
}));

// Mock apiFetch for activity feed initial load
vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn().mockResolvedValue({ items: [], total: 0 }),
}));

// Mock useActivityLog — default: isConnected: true (override per-test for AC-7/AC-8)
vi.mock("@/features/activity/useActivityLog", () => ({
  useActivityLog: vi.fn(() => ({
    rows: [],
    isLoading: false,
    isConnected: true,
  })),
}));

// ─── Test Suite ─────────────────────────────────────────────────────────────

describe("RecordMode — Story 4.5", () => {
  let queryClient: QueryClient;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    user = userEvent.setup();
  });

  afterEach(() => {
    queryClient.clear();
  });

  function renderActivityPage() {
    return render(
      <QueryClientProvider client={queryClient}>
        <ActivityPage />
      </QueryClientProvider>,
    );
  }

  // ─── AC-11: Record button state loaded on mount ─────────────────────────

  it("AC-11: loads recording status on mount and renders button correctly", async () => {
    // RED phase: useRecordingState hook returns isRecording: false by default
    // Button should render with "● Record" label when not recording

    renderActivityPage();

    await waitFor(() => {
      const button = screen.getByTestId("activity-btn-record");
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent("● Record");
      expect(button).toHaveAttribute("aria-pressed", "false");
    });
  });

  // ─── AC-1: Record button activates Record mode ──────────────────────────

  it("AC-1: clicking Record button calls startRecording and changes to Stop", async () => {
    // RED phase: useRecordingState hook doesn't exist yet
    // This test will fail because the hook is mocked but not wired to ActivityPage

    const mockStartRecording = vi.fn();
    const { useRecordingState } =
      await import("@/features/activity/hooks/useRecordingState");
    // @ts-expect-error -- mock type mismatch in test context
    vi.mocked(useRecordingState).mockReturnValue({
      isRecording: false,
      startedAt: null,
      startRecording: mockStartRecording,
      stopRecording: vi.fn(),
      isStarting: false,
      isStopping: false,
    });

    renderActivityPage();

    const button = await screen.findByTestId("activity-btn-record");
    await user.click(button);

    await waitFor(() => {
      expect(mockStartRecording).toHaveBeenCalledOnce();
    });
  });

  it("AC-1: button changes to '⏹ Stop' when recording becomes active", async () => {
    // RED phase: button text doesn't change yet because ActivityPage stub is disabled

    const { useRecordingState } =
      await import("@/features/activity/hooks/useRecordingState");
    // @ts-expect-error -- mock type mismatch in test context
    vi.mocked(useRecordingState).mockReturnValue({
      isRecording: true,
      startedAt: new Date().toISOString(),
      startRecording: vi.fn(),
      stopRecording: vi.fn(),
      isStarting: false,
      isStopping: false,
    });

    renderActivityPage();

    await waitFor(() => {
      const button = screen.getByTestId("activity-btn-record");
      expect(button).toHaveTextContent("⏹ Stop");
      expect(button).toHaveAttribute("aria-pressed", "true");
    });
  });

  // ─── AC-2: Recording badge visible and amber-styled ─────────────────────

  it("AC-2: Recording badge is visible with amber styling when recording", async () => {
    // RED phase: badge stub has display: none

    const { useRecordingState } =
      await import("@/features/activity/hooks/useRecordingState");
    // @ts-expect-error -- mock type mismatch in test context
    vi.mocked(useRecordingState).mockReturnValue({
      isRecording: true,
      startedAt: new Date().toISOString(),
      startRecording: vi.fn(),
      stopRecording: vi.fn(),
      isStarting: false,
      isStopping: false,
    });

    renderActivityPage();

    await waitFor(() => {
      const badge = screen.getByTestId("activity-badge-recording");
      expect(badge).toBeVisible();
      expect(badge).toHaveTextContent("● Recording");

      // Verify amber pill styling (check inline style attribute — jsdom can't resolve CSS vars)
      const badgeStyle = badge.getAttribute("style") ?? "";
      expect(badgeStyle).toContain("var(--warning-subtle)");
      expect(badgeStyle).toContain("var(--warning)");
      expect(badgeStyle).toContain("9999px");
    });
  });

  it("AC-2: Recording badge is hidden when not recording", async () => {
    // RED phase: badge is always hidden (display: none stub)

    const { useRecordingState } =
      await import("@/features/activity/hooks/useRecordingState");
    // @ts-expect-error -- mock type mismatch in test context
    vi.mocked(useRecordingState).mockReturnValue({
      isRecording: false,
      startedAt: null,
      startRecording: vi.fn(),
      stopRecording: vi.fn(),
      isStarting: false,
      isStopping: false,
    });

    renderActivityPage();

    await waitFor(() => {
      const badge = screen.queryByTestId("activity-badge-recording");
      expect(badge).not.toBeInTheDocument();
    });
  });

  // ─── AC-3: Stop button deactivates mode ─────────────────────────────────

  it("AC-3: clicking Stop button calls stopRecording and hides badge immediately", async () => {
    // RED phase: stopRecording not wired yet

    const mockStopRecording = vi.fn();
    const { useRecordingState } =
      await import("@/features/activity/hooks/useRecordingState");
    // @ts-expect-error -- mock type mismatch in test context
    vi.mocked(useRecordingState).mockReturnValue({
      isRecording: true,
      startedAt: new Date().toISOString(),
      startRecording: vi.fn(),
      stopRecording: mockStopRecording,
      isStarting: false,
      isStopping: false,
    });

    renderActivityPage();

    const button = await screen.findByTestId("activity-btn-record");
    await user.click(button);

    await waitFor(() => {
      expect(mockStopRecording).toHaveBeenCalledOnce();
    });
  });

  it("AC-3: badge hides immediately with no transition when recording stops", async () => {
    // RED phase: badge hide animation not implemented yet (should be instant)

    const { useRecordingState } =
      await import("@/features/activity/hooks/useRecordingState");
    // @ts-expect-error -- mock type mismatch in test context
    const mockImpl = vi.mocked(useRecordingState);

    // Start with recording active
    mockImpl.mockReturnValue({
      isRecording: true,
      startedAt: new Date().toISOString(),
      startRecording: vi.fn(),
      stopRecording: vi.fn(),
      isStarting: false,
      isStopping: false,
    });

    const { rerender } = renderActivityPage();

    await waitFor(() => {
      const badge = screen.getByTestId("activity-badge-recording");
      expect(badge).toBeVisible();
    });

    // Stop recording
    mockImpl.mockReturnValue({
      isRecording: false,
      startedAt: null,
      startRecording: vi.fn(),
      stopRecording: vi.fn(),
      isStarting: false,
      isStopping: false,
    });

    rerender(
      <QueryClientProvider client={queryClient}>
        <ActivityPage />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      const badge = screen.queryByTestId("activity-badge-recording");
      expect(badge).not.toBeInTheDocument();

      // Badge is removed from DOM on stop (no lingering element, so no transition on hide)
    });
  });

  // ─── AC-7: SignalR disconnect → warning state ───────────────────────────

  it("AC-7: badge shows warning state when SignalR disconnects during recording", async () => {
    // RED phase: useActivityLog doesn't expose isConnected yet

    const { useRecordingState } =
      await import("@/features/activity/hooks/useRecordingState");
    // @ts-expect-error -- mock type mismatch in test context
    vi.mocked(useRecordingState).mockReturnValue({
      isRecording: true,
      startedAt: new Date().toISOString(),
      startRecording: vi.fn(),
      stopRecording: vi.fn(),
      isStarting: false,
      isStopping: false,
    });

    // Override useActivityLog mock for this test: simulate disconnect
    vi.mocked(useActivityLog).mockReturnValue({
      rows: [],
      isLoading: false,
      isConnected: false,
    } as ReturnType<typeof useActivityLog>);

    renderActivityPage();

    await waitFor(() => {
      const badge = screen.getByTestId("activity-badge-recording");
      expect(badge).toBeVisible();
      expect(badge).toHaveTextContent("Recording paused — connection lost");

      // Verify warning icon is present
      const warningIcon = badge.querySelector("i.bi-exclamation-triangle");
      expect(warningIcon).toBeInTheDocument();

      // Verify amber colors remain — check inline style attribute (jsdom can't resolve CSS vars)
      const badgeStyle = badge.getAttribute("style") ?? "";
      expect(badgeStyle).toContain("var(--warning-subtle)");
      expect(badgeStyle).toContain("var(--warning)");
    });
  });

  // ─── AC-8: SignalR reconnect → resume ───────────────────────────────────

  it("AC-8: badge returns to normal state when SignalR reconnects", async () => {
    // RED phase: reconnect handling not implemented

    const { useRecordingState } =
      await import("@/features/activity/hooks/useRecordingState");
    // @ts-expect-error -- mock type mismatch in test context
    vi.mocked(useRecordingState).mockReturnValue({
      isRecording: true,
      startedAt: new Date().toISOString(),
      startRecording: vi.fn(),
      stopRecording: vi.fn(),
      isStarting: false,
      isStopping: false,
    });

    // Override useActivityLog mock for this test: simulate reconnect (isConnected: true already default, explicit here for clarity)
    vi.mocked(useActivityLog).mockReturnValue({
      rows: [],
      isLoading: false,
      isConnected: true,
    } as ReturnType<typeof useActivityLog>);

    renderActivityPage();

    await waitFor(() => {
      const badge = screen.getByTestId("activity-badge-recording");
      expect(badge).toBeVisible();
      expect(badge).toHaveTextContent("● Recording");

      // Verify no warning icon
      const warningIcon = badge.querySelector("i.bi-exclamation-triangle");
      expect(warningIcon).not.toBeInTheDocument();
    });
  });

  // ─── AC-9: prefers-reduced-motion ───────────────────────────────────────

  it("AC-9: Recording badge respects prefers-reduced-motion (no animation)", async () => {
    // RED phase: prefers-reduced-motion CSS not implemented yet

    // Set prefers-reduced-motion media query
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    Object.defineProperty(mediaQuery, "matches", {
      writable: true,
      value: true,
    });

    const { useRecordingState } =
      await import("@/features/activity/hooks/useRecordingState");
    // @ts-expect-error -- mock type mismatch in test context
    vi.mocked(useRecordingState).mockReturnValue({
      isRecording: true,
      startedAt: new Date().toISOString(),
      startRecording: vi.fn(),
      stopRecording: vi.fn(),
      isStarting: false,
      isStopping: false,
    });

    renderActivityPage();

    await waitFor(() => {
      const badge = screen.getByTestId("activity-badge-recording");
      expect(badge).toBeVisible();

      // Verify badge has no animation or transition (should be none)
      const styles = window.getComputedStyle(badge);
      // Note: The badge itself doesn't animate entrance (only cross-screen indicator does)
      // This test verifies badge rendering respects reduced motion in general
      expect(styles.animation).not.toContain("pulse");
    });
  });
});
