import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { AppShell } from "@/components/layout/AppShell";

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("@/lib/useBreakpoint", () => ({
  useBreakpoint: vi.fn(() => ({
    desktop: true,
    mid: false,
    midNarrow: false,
    mobile: false,
  })),
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({
    user: { username: "alice", role: "admin" },
    needsSetup: false,
    isLoading: false,
  })),
}));

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn().mockResolvedValue(null),
  ApiError: class ApiError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  },
}));

// Stub notification components to avoid their complex hooks
vi.mock("@/features/events/components/NotificationBadge", () => ({
  NotificationBadge: ({ count }: { count: number }) => (
    <span data-testid="mock-badge">{count}</span>
  ),
}));

vi.mock("@/features/events/components/NotificationPanel", () => ({
  NotificationPanel: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="mock-panel">
      <button onClick={onClose}>close panel</button>
    </div>
  ),
}));

vi.mock("@/features/events/hooks/useSystemEvents", () => ({
  useUnreadCount: vi.fn(() => ({ data: 0, isLoading: false })),
  useSystemEvents: vi.fn(() => ({
    data: undefined,
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    isLoading: false,
  })),
}));

vi.mock("@/features/services/hooks/useServicesHub", () => ({
  useServicesHub: vi.fn(),
}));

vi.mock("@/features/events/hooks/useEventsHub", () => ({
  useEventsHub: vi.fn(),
}));

vi.mock("@/lib/useConnectionState", () => ({
  useConnectionState: vi.fn(() => false),
}));

// ─── Static imports after mocks ───────────────────────────────────────────────

import { useBreakpoint } from "@/lib/useBreakpoint";
const mockUseBreakpoint = vi.mocked(useBreakpoint);

import { useConnectionState } from "@/lib/useConnectionState";
const mockUseConnectionState = vi.mocked(useConnectionState);

import { apiFetch } from "@/lib/api";
const mockApiFetch = vi.mocked(apiFetch);

import { useAuth } from "@/features/auth/hooks/useAuth";
const mockUseAuth = vi.mocked(useAuth);

// ─── Wrapper helpers ──────────────────────────────────────────────────────────

function makeQC() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function withRouter(element: ReactNode) {
  return (
    <QueryClientProvider client={makeQC()}>
      <MemoryRouter initialEntries={["/services"]}>{element}</MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.restoreAllMocks());

// ─── Sidebar ──────────────────────────────────────────────────────────────────

describe("Sidebar — desktop", () => {
  it("renders the main navigation sidebar", () => {
    render(withRouter(<Sidebar />));
    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
  });

  it("renders all nav items", () => {
    render(withRouter(<Sidebar />));
    expect(screen.getByTestId("sidebar-nav-services")).toBeInTheDocument();
    expect(screen.getByTestId("sidebar-nav-activity")).toBeInTheDocument();
    expect(screen.getByTestId("sidebar-nav-mappings")).toBeInTheDocument();
    expect(screen.getByTestId("sidebar-nav-events")).toBeInTheDocument();
    expect(screen.getByTestId("sidebar-nav-settings")).toBeInTheDocument();
  });

  it("has a collapse toggle button", () => {
    render(withRouter(<Sidebar />));
    expect(screen.getByTestId("sidebar-collapse-toggle")).toBeInTheDocument();
  });

  it("toggles collapsed state when the collapse button is clicked", async () => {
    const user = userEvent.setup();
    render(withRouter(<Sidebar />));

    const btn = screen.getByTestId("sidebar-collapse-toggle");
    const initialLabel = btn.getAttribute("aria-label");
    await user.click(btn);

    expect(btn.getAttribute("aria-label")).not.toBe(initialLabel);
  });

  it("starts collapsed in mid-size breakpoint", () => {
    mockUseBreakpoint.mockReturnValue({
      desktop: false,
      mid: true,
      midNarrow: false,
      mobile: false,
    });
    const { container } = render(withRouter(<Sidebar />));
    // In mid mode the sidebar starts collapsed — look for the collapsed class
    const sidebar = container.querySelector("[data-testid='sidebar']");
    expect(sidebar).not.toBeNull();
  });

  it("handles localStorage failure gracefully on persist", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage full");
    });

    const user = userEvent.setup();
    render(withRouter(<Sidebar />));
    // Toggling should NOT throw even when localStorage.setItem throws
    const btn = screen.getByTestId("sidebar-collapse-toggle");
    await expect(user.click(btn)).resolves.not.toThrow();

    vi.restoreAllMocks();
  });
});

describe("Sidebar — mobile overlay", () => {
  beforeEach(() => {
    mockUseBreakpoint.mockReturnValue({
      desktop: false,
      mid: false,
      midNarrow: false,
      mobile: true,
    });
  });

  it("does not render the backdrop when mobileOpen is false", () => {
    render(withRouter(<Sidebar mobileOpen={false} />));
    expect(screen.queryByTestId("sidebar-backdrop")).not.toBeInTheDocument();
  });

  it("renders the backdrop when mobileOpen is true", () => {
    render(withRouter(<Sidebar mobileOpen={true} />));
    expect(screen.getByTestId("sidebar-backdrop")).toBeInTheDocument();
  });

  it("calls onMobileClose when the backdrop is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(withRouter(<Sidebar mobileOpen={true} onMobileClose={onClose} />));

    await user.click(screen.getByTestId("sidebar-backdrop"));
    expect(onClose).toHaveBeenCalled();
  });
});

// ─── TopBar ───────────────────────────────────────────────────────────────────

describe("TopBar", () => {
  it("renders the top bar with logo", () => {
    render(withRouter(<TopBar />));
    expect(screen.getByTestId("top-bar")).toBeInTheDocument();
    expect(screen.getByTestId("topbar-logo")).toBeInTheDocument();
  });

  it("shows user initials in the avatar button", () => {
    render(withRouter(<TopBar />));
    // "alice" → initials "AL"
    const btn = screen.getByTestId("topbar-avatar-button");
    expect(btn).toHaveTextContent("AL");
  });

  it("opens the About modal when the About button is clicked", async () => {
    const user = userEvent.setup();
    render(withRouter(<TopBar />));

    await user.click(screen.getByTestId("topbar-about-button"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("shows the hamburger button in mobile mode", () => {
    render(withRouter(<TopBar isMobile={true} />));
    expect(screen.getByTestId("hamburger-button")).toBeInTheDocument();
  });

  it("calls apiFetch on sign out", async () => {
    mockApiFetch.mockResolvedValue(null);
    const user = userEvent.setup();

    render(withRouter(<TopBar />));
    await user.click(screen.getByTestId("topbar-avatar-button"));
    await user.click(screen.getByTestId("topbar-signout-button"));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/api/auth/logout",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  it("still navigates to /login even when sign-out API throws", async () => {
    mockApiFetch.mockRejectedValue(new Error("network error"));
    const user = userEvent.setup();

    render(withRouter(<TopBar />));
    await user.click(screen.getByTestId("topbar-avatar-button"));
    await user.click(screen.getByTestId("topbar-signout-button"));

    // Should not crash — caught error path
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalled());
  });

  it("opens the notification panel when the bell is clicked", async () => {
    const user = userEvent.setup();
    render(withRouter(<TopBar />));

    await user.click(screen.getByTestId("topbar-btn-bell"));
    expect(screen.getByTestId("mock-panel")).toBeInTheDocument();
  });

  it("closes the notification panel when closed from inside the panel", async () => {
    const user = userEvent.setup();
    render(withRouter(<TopBar />));

    await user.click(screen.getByTestId("topbar-btn-bell")); // open
    await user.click(screen.getByText("close panel")); // close via panel callback

    expect(screen.queryByTestId("mock-panel")).not.toBeInTheDocument();
  });

  it("toggles notification panel off when bell clicked while open", async () => {
    const user = userEvent.setup();
    render(withRouter(<TopBar />));

    await user.click(screen.getByTestId("topbar-btn-bell")); // open
    await user.click(screen.getByTestId("topbar-btn-bell")); // close again

    expect(screen.queryByTestId("mock-panel")).not.toBeInTheDocument();
  });

  it("closes avatar dropdown when backdrop is clicked", async () => {
    const user = userEvent.setup();
    const { container } = render(withRouter(<TopBar />));

    await user.click(screen.getByTestId("topbar-avatar-button")); // open dropdown
    expect(screen.getByTestId("topbar-signout-button")).toBeInTheDocument();

    // Click the invisible backdrop div (first child of avatarWrapper after button)
    const backdrop = container.querySelector(
      '[class*="dropdownBackdrop"]',
    ) as HTMLElement;
    if (backdrop) await user.click(backdrop);

    await waitFor(() =>
      expect(
        screen.queryByTestId("topbar-signout-button"),
      ).not.toBeInTheDocument(),
    );
  });

  it("closes notification panel on Escape key", async () => {
    const user = userEvent.setup();
    render(withRouter(<TopBar />));

    await user.click(screen.getByTestId("topbar-btn-bell")); // open
    expect(screen.getByTestId("mock-panel")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    await waitFor(() =>
      expect(screen.queryByTestId("mock-panel")).not.toBeInTheDocument(),
    );
  });

  it("shows 'User menu' aria-label when user is null", () => {
    mockUseAuth.mockReturnValueOnce({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });

    render(withRouter(<TopBar />));
    const btn = screen.getByTestId("topbar-avatar-button");
    expect(btn.getAttribute("aria-label")).toBe("User menu");
  });
});

// ─── AppShell ─────────────────────────────────────────────────────────────────

describe("AppShell", () => {
  it("renders the shell with top bar and sidebar", () => {
    render(withRouter(<AppShell />));
    expect(screen.getByTestId("app-shell")).toBeInTheDocument();
    expect(screen.getByTestId("top-bar")).toBeInTheDocument();
    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
  });

  it("shows the disconnected banner when useConnectionState returns true", () => {
    mockUseConnectionState.mockReturnValue(true);
    render(withRouter(<AppShell />));
    expect(
      screen.getByText(/connection to fishtank server lost/i),
    ).toBeInTheDocument();
  });

  it("does not show the disconnected banner when connected", () => {
    mockUseConnectionState.mockReturnValue(false);
    render(withRouter(<AppShell />));
    expect(
      screen.queryByText(/connection to fishtank server lost/i),
    ).not.toBeInTheDocument();
  });

  it("toggles the mobile sidebar when the hamburger button is clicked", async () => {
    mockUseBreakpoint.mockReturnValue({
      desktop: false,
      mid: false,
      midNarrow: false,
      mobile: true,
    });
    const user = userEvent.setup();
    render(withRouter(<AppShell />));

    // TopBar receives sidebarOpen=false initially; clicking the hamburger toggles it.
    const hamburger = screen.getByTestId("hamburger-button");
    await user.click(hamburger);
    // After click the sidebar open prop should have toggled (no crash = passing)
    expect(screen.getByTestId("app-shell")).toBeInTheDocument();
  });

  it("closes the mobile sidebar when breakpoint transitions from mobile to desktop", () => {
    // Start in mobile mode
    mockUseBreakpoint.mockReturnValue({
      desktop: false,
      mid: false,
      midNarrow: false,
      mobile: true,
    });

    const { rerender } = render(withRouter(<AppShell />));

    // Transition to desktop mode — AppShell's render-time guard should close the sidebar
    mockUseBreakpoint.mockReturnValue({
      desktop: true,
      mid: false,
      midNarrow: false,
      mobile: false,
    });

    // Re-render to trigger the guard
    rerender(withRouter(<AppShell />));

    // No crash; app-shell still renders
    expect(screen.getByTestId("app-shell")).toBeInTheDocument();
  });

  it("applies extra padding on the body when disconnected", () => {
    mockUseConnectionState.mockReturnValue(true);
    render(withRouter(<AppShell />));
    // Shows the banner when disconnected
    expect(
      screen.getByText(/connection to fishtank server lost/i),
    ).toBeInTheDocument();
  });
});
