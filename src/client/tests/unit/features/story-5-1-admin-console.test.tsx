import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

/**
 * ATDD component tests for Story 5.1 � Feature Toggles Admin Console
 *
 * Scope: Sidebar (AC-2) and AdminConsolePage structure (AC-13).
 * FeatureTogglesSection behavior (AC-4, AC-6, AC-7, AC-9) is covered in
 * tests/unit/features/admin/FeatureTogglesSection.test.tsx.
 */

// Mock auth context to control user role
const mockAuthContext = {
  user: { id: "admin-1", username: "testadmin", role: "Admin" },
  isAuthenticated: true,
  isLoading: false,
};

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => mockAuthContext,
}));

// Mock useTogglesHub to avoid SignalR connection attempts
vi.mock("@/features/admin/hooks/useTogglesHub", () => ({
  useTogglesHub: vi.fn(),
}));

// Mock FeatureTogglesSection to avoid useToggles/fetch calls from AdminConsolePage
// (FeatureTogglesSection behavior is covered in tests/unit/features/admin/FeatureTogglesSection.test.tsx)
vi.mock("@/features/admin/components/FeatureTogglesSection", () => ({
  FeatureTogglesSection: () => (
    <div data-testid="mock-feature-toggles">Toggles</div>
  ),
}));

describe("Sidebar � Admin Console nav item", () => {
  beforeEach(() => {
    vi.clearAllMocks(); // Clear any sidebar collapsed state left by layout.test.tsx in the shared jsdom worker
    localStorage.removeItem("fishtank-sidebar-collapsed");
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("AC-2: renders Admin Console nav item for Admin-role user", async () => {
    const Sidebar = (await import("@/components/layout/Sidebar")).Sidebar;
    mockAuthContext.user = {
      id: "admin-1",
      username: "testadmin",
      role: "Admin",
    };

    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Sidebar />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const adminNavItem = screen.getByTestId("nav-admin-console");
    expect(adminNavItem).toBeInTheDocument();
    expect(adminNavItem).toHaveTextContent("Admin Console");
    const icon = adminNavItem.querySelector("i.bi-shield-lock");
    expect(icon).toBeInTheDocument();
    const parentNav = adminNavItem.closest("nav");
    expect(parentNav).toBeInTheDocument();
  });

  it("AC-2: does NOT render Admin Console nav item for Standard User", async () => {
    const Sidebar = (await import("@/components/layout/Sidebar")).Sidebar;
    mockAuthContext.user = {
      id: "user-1",
      username: "testuser",
      role: "Standard User",
    };

    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Sidebar />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const adminNavItem = screen.queryByTestId("nav-admin-console");
    expect(adminNavItem).not.toBeInTheDocument();
  });
});

describe("AdminConsolePage � container and sub-navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthContext.user = {
      id: "admin-1",
      username: "testadmin",
      role: "Admin",
    };
  });

  it("AC-13: renders Admin Console page with sub-navigation tabs", async () => {
    const { AdminConsolePage } =
      await import("@/features/admin/pages/AdminConsolePage");
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AdminConsolePage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByTestId("page-admin-console")).toBeInTheDocument();
    expect(screen.getByTestId("tab-feature-toggles")).toBeInTheDocument();
    expect(screen.getByTestId("tab-health")).toBeInTheDocument();
    expect(screen.getByTestId("tab-audit-log")).toBeInTheDocument();
    expect(screen.getByTestId("tab-feature-toggles")).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("AC-13: Health and Audit Log tabs show placeholder content", async () => {
    const { AdminConsolePage } =
      await import("@/features/admin/pages/AdminConsolePage");
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AdminConsolePage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const user = userEvent.setup();

    await user.click(screen.getByTestId("tab-health"));
    expect(
      await screen.findByText(/Coming in Story 5\.3/i),
    ).toBeInTheDocument();

    await user.click(screen.getByTestId("tab-audit-log"));
    expect(
      await screen.findByText(/Coming in Story 5\.3/i),
    ).toBeInTheDocument();
  });
});
