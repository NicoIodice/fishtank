/**
 * ATDD component tests for Cross-Screen Recording Indicator — Story 4.5
 * Layer: Vitest + RTL (component-level, no live backend)
 *
 * RED PHASE — these tests are RED-by-construction:
 *   - useRecordingState hook doesn't exist yet
 *   - Cross-screen indicator element not in TopBar
 *   - data-testid="topbar-badge-recording-active" doesn't exist
 *
 * ACs covered:
 *   AC-5:  Cross-screen indicator appears in top bar when navigated away from /activity
 *   AC-6:  Cross-screen indicator absent on /login and /setup
 *   AC-9:  prefers-reduced-motion → transition: none (not animation: none)
 *
 * data-testid contract:
 *   topbar-badge-recording-active
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TopBar } from "../../../components/layout/TopBar";

// ─── Mock Setup ─────────────────────────────────────────────────────────────

// Mock the useRecordingState hook (doesn't exist yet — RED phase)
// @ts-ignore — hook doesn't exist yet
vi.mock("../../features/activity/hooks/useRecordingState", () => ({
  useRecordingState: vi.fn(() => ({
    isRecording: false,
    startedAt: null,
    startRecording: vi.fn(),
    stopRecording: vi.fn(),
    isStarting: false,
    isStopping: false,
  })),
}));

// Mock useNavigate for testing indicator click
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// ─── Test Suite ─────────────────────────────────────────────────────────────

describe("TopBar — Cross-Screen Recording Indicator (Story 4.5)", () => {
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

  function renderTopBarAt(route: string, isRecording = false) {
    const { useRecordingState } = require("../../features/activity/hooks/useRecordingState");
    // @ts-ignore
    vi.mocked(useRecordingState).mockReturnValue({
      isRecording,
      startedAt: isRecording ? new Date().toISOString() : null,
      startRecording: vi.fn(),
      stopRecording: vi.fn(),
      isStarting: false,
      isStopping: false,
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path="*" element={<TopBar />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  // ─── AC-5: Cross-screen indicator appears when navigated away ───────────

  it("AC-5: indicator is visible when recording and NOT on /activity", async () => {
    // RED phase: indicator element doesn't exist in TopBar yet

    renderTopBarAt("/mappings", true);

    const indicator = await screen.findByTestId("topbar-badge-recording-active");
    expect(indicator).toBeVisible();
    expect(indicator).toHaveTextContent("● Recording");
  });

  it("AC-5: indicator has correct amber pill styling", async () => {
    // RED phase: styling not implemented

    renderTopBarAt("/services", true);

    const indicator = await screen.findByTestId("topbar-badge-recording-active");

    const styles = window.getComputedStyle(indicator);
    expect(styles.backgroundColor).toBe("var(--warning-subtle)");
    expect(styles.color).toBe("var(--warning)");
    expect(styles.borderRadius).toBe("9999px");
    expect(styles.fontSize).toBe("var(--text-sm)");
    expect(styles.fontWeight).toBe("var(--font-semibold)");
  });

  it("AC-5: indicator has correct ARIA attributes and role", async () => {
    // RED phase: ARIA not implemented

    renderTopBarAt("/settings", true);

    const indicator = await screen.findByTestId("topbar-badge-recording-active");

    expect(indicator).toHaveAttribute("role", "button");
    expect(indicator).toHaveAttribute(
      "aria-label",
      "Recording active — return to Network Activity",
    );
    expect(indicator).toHaveAttribute("tabIndex", "0");
  });

  it("AC-5: clicking indicator navigates to /activity", async () => {
    // RED phase: click handler not implemented

    renderTopBarAt("/mappings", true);

    const indicator = await screen.findByTestId("topbar-badge-recording-active");
    await user.click(indicator);

    expect(mockNavigate).toHaveBeenCalledWith("/activity");
  });

  it("AC-5: pressing Enter on indicator navigates to /activity", async () => {
    // RED phase: keyboard handler not implemented

    renderTopBarAt("/services", true);

    const indicator = await screen.findByTestId("topbar-badge-recording-active");
    indicator.focus();
    await user.keyboard("{Enter}");

    expect(mockNavigate).toHaveBeenCalledWith("/activity");
  });

  it("AC-5: pressing Space on indicator navigates to /activity", async () => {
    // RED phase: keyboard handler not implemented

    renderTopBarAt("/settings", true);

    const indicator = await screen.findByTestId("topbar-badge-recording-active");
    indicator.focus();
    await user.keyboard(" ");

    expect(mockNavigate).toHaveBeenCalledWith("/activity");
  });

  it("AC-5: indicator is hidden when on /activity (user already on the page)", async () => {
    // RED phase: conditional rendering not implemented

    renderTopBarAt("/activity", true);

    const indicator = screen.queryByTestId("topbar-badge-recording-active");
    expect(indicator).not.toBeInTheDocument();
  });

  it("AC-5: indicator is hidden when recording is inactive", async () => {
    // RED phase: conditional rendering not implemented

    renderTopBarAt("/mappings", false);

    const indicator = screen.queryByTestId("topbar-badge-recording-active");
    expect(indicator).not.toBeInTheDocument();
  });

  // ─── AC-6: Indicator absent on auth screens ─────────────────────────────

  it("AC-6: indicator NOT rendered on /login when recording", async () => {
    // RED phase: isAuthScreen guard not implemented

    renderTopBarAt("/login", true);

    const indicator = screen.queryByTestId("topbar-badge-recording-active");
    expect(indicator).not.toBeInTheDocument();
  });

  it("AC-6: indicator NOT rendered on /setup when recording", async () => {
    // RED phase: isAuthScreen guard not implemented

    renderTopBarAt("/setup", true);

    const indicator = screen.queryByTestId("topbar-badge-recording-active");
    expect(indicator).not.toBeInTheDocument();
  });

  // ─── AC-9: prefers-reduced-motion ───────────────────────────────────────

  it("AC-9: indicator entrance animation respects prefers-reduced-motion", async () => {
    // RED phase: CSS transition: none not implemented for reduced motion

    // Set prefers-reduced-motion media query
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    Object.defineProperty(mediaQuery, "matches", {
      writable: true,
      value: true,
    });

    renderTopBarAt("/mappings", true);

    const indicator = await screen.findByTestId("topbar-badge-recording-active");

    // Verify transition: none (NOT animation: none — this is a CSS transition)
    const styles = window.getComputedStyle(indicator);
    expect(styles.transition).toBe("none");
  });

  it("AC-9: indicator entrance uses transition (not animation) when motion allowed", async () => {
    // RED phase: entrance transition not implemented

    // Normal motion (not reduced)
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    Object.defineProperty(mediaQuery, "matches", {
      writable: true,
      value: false,
    });

    renderTopBarAt("/services", true);

    const indicator = await screen.findByTestId("topbar-badge-recording-active");

    // Verify opacity transition (entrance is opacity 0→1 150ms ease per DESIGN.md)
    const styles = window.getComputedStyle(indicator);
    expect(styles.transition).toContain("opacity");
    expect(styles.transition).toContain("150ms");
    expect(styles.transition).toContain("ease");
  });
});
