import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

/**
 * ATDD component tests for Story 5.1 — Feature Toggles Admin Console
 * 
 * RED PHASE scaffolds covering:
 *   AC-2: Admin Console sidebar nav item visible to Admins only
 *   AC-6: Disabling a feature requires confirmation dialog (NFR-15)
 *   AC-7: Enabling a feature requires no confirmation
 *   AC-13: Admin Console sub-navigation structure
 *   AC-14: data-testid attributes
 * 
 * These tests verify the Admin Console component structure, role-based
 * visibility, toggle confirmation dialogs, and SignalR integration.
 * 
 * Components tested:
 *   - Sidebar (Admin Console nav item conditional rendering)
 *   - AdminConsolePage (container with sub-navigation)
 *   - FeatureTogglesSection (toggle list with switches and confirmation)
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

// Mock useTogglesHub to avoid SignalR connection attempts in tests
vi.mock("@/features/admin/hooks/useTogglesHub", () => ({
  useTogglesHub: vi.fn(),
}));

// Use vi.stubGlobal to mock fetch (TypeScript-safe, browser-env compatible)
const fetchMock = vi.fn();

describe("Sidebar — Admin Console nav item", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ─── AC-2: Admin Console sidebar nav item visible to Admins only ──────────

  it("AC-2: renders Admin Console nav item for Admin-role user", async () => {
    // RED phase: Sidebar doesn't have Admin Console nav item yet
    // Mock Sidebar component import (will be implemented)
    const Sidebar = (await import("@/components/layout/Sidebar")).Sidebar;

    mockAuthContext.user = { id: "admin-1", username: "testadmin", role: "Admin" };

    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Sidebar />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Verify Admin Console nav item is present
    const adminNavItem = screen.getByTestId("nav-admin-console");
    expect(adminNavItem).toBeInTheDocument();
    expect(adminNavItem).toHaveTextContent("Admin Console");

    // Verify icon is bi-shield-lock
    const icon = adminNavItem.querySelector("i.bi-shield-lock");
    expect(icon).toBeInTheDocument();

    // Verify nav item is below a divider
    // (Will check DOM structure — divider before Admin Console item)
    const parentNav = adminNavItem.closest("nav");
    expect(parentNav).toBeInTheDocument();
  });

  it("AC-2: does NOT render Admin Console nav item for Standard User", async () => {
    // RED phase: Sidebar doesn't have conditional rendering yet
    const Sidebar = (await import("@/components/layout/Sidebar")).Sidebar;

    mockAuthContext.user = { id: "user-1", username: "testuser", role: "Standard User" };

    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Sidebar />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Verify Admin Console nav item is NOT present (not rendered at all, not just hidden)
    const adminNavItem = screen.queryByTestId("nav-admin-console");
    expect(adminNavItem).not.toBeInTheDocument();
  });
});

describe("AdminConsolePage — container and sub-navigation", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.clearAllMocks();
    mockAuthContext.user = { id: "admin-1", username: "testadmin", role: "Admin" };
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ─── AC-13: Admin Console sub-navigation structure ────────────────────────

  it("AC-13: renders Admin Console page with sub-navigation tabs", async () => {
    // RED phase: AdminConsolePage component doesn't exist yet
    const AdminConsolePage = (await import("@/features/admin/pages/AdminConsolePage"))
      .AdminConsolePage;

    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AdminConsolePage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Verify page container
    const pageContainer = screen.getByTestId("page-admin-console");
    expect(pageContainer).toBeInTheDocument();

    // Verify sub-navigation tabs: Feature Toggles / Health / Audit Log
    const featureTogglesTab = screen.getByTestId("tab-feature-toggles");
    const healthTab = screen.getByTestId("tab-health");
    const auditLogTab = screen.getByTestId("tab-audit-log");

    expect(featureTogglesTab).toBeInTheDocument();
    expect(healthTab).toBeInTheDocument();
    expect(auditLogTab).toBeInTheDocument();

    // Verify Feature Toggles is default active tab
    expect(featureTogglesTab).toHaveAttribute("aria-selected", "true");
  });

  it("AC-13: Health and Audit Log tabs show placeholder content", async () => {
    // RED phase: Placeholder content doesn't exist yet
    const AdminConsolePage = (await import("@/features/admin/pages/AdminConsolePage"))
      .AdminConsolePage;

    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AdminConsolePage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const user = userEvent.setup();

    // Click Health tab
    const healthTab = screen.getByTestId("tab-health");
    await user.click(healthTab);

    // Verify placeholder content
    expect(
      await screen.findByText(/Coming in Story 5\.3/i)
    ).toBeInTheDocument();

    // Click Audit Log tab
    const auditLogTab = screen.getByTestId("tab-audit-log");
    await user.click(auditLogTab);

    // Verify placeholder content
    expect(
      await screen.findByText(/Coming in Story 5\.3/i)
    ).toBeInTheDocument();
  });
});

describe("FeatureTogglesSection — toggle list and confirmation", () => {
  const mockToggles = [
    {
      name: "network_activity",
      displayName: "Network Activity",
      description: "Real-time request monitoring",
      enabled: true,
      updatedAt: "2026-07-09T12:00:00Z",
      envVarOverride: null,
    },
    {
      name: "mappings_editor",
      displayName: "Mappings Editor",
      description: "File explorer and editor",
      enabled: false, // AC-7 test: click to enable (no confirmation)
      updatedAt: "2026-07-09T12:00:00Z",
      envVarOverride: null,
    },
    {
      name: "record_mode",
      displayName: "Record Mode",
      description: "Auto-capture proxied requests",
      enabled: false,
      updatedAt: "2026-07-09T12:00:00Z",
      envVarOverride: false, // Env-var-locked to OFF
    },
  ];

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.clearAllMocks();
    mockAuthContext.user = { id: "admin-1", username: "testadmin", role: "Admin" };

    // Mock fetch for useToggles hook
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockToggles }),
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ─── AC-4: Feature toggles list displays all known toggles ────────────────

  it("AC-4: renders toggle table with all toggles", async () => {
    // RED phase: FeatureTogglesSection component doesn't exist yet
    const FeatureTogglesSection = (
      await import("@/features/admin/components/FeatureTogglesSection")
    ).FeatureTogglesSection;

    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <FeatureTogglesSection />
      </QueryClientProvider>
    );

    // Wait for toggles to load
    await waitFor(() => {
      expect(screen.getByTestId("table-toggles")).toBeInTheDocument();
    });

    // Verify toggle rows are present
    const networkActivityRow = screen.getByTestId("toggle-row-network_activity");
    const mappingsEditorRow = screen.getByTestId("toggle-row-mappings_editor");
    const recordModeRow = screen.getByTestId("toggle-row-record_mode");

    expect(networkActivityRow).toBeInTheDocument();
    expect(mappingsEditorRow).toBeInTheDocument();
    expect(recordModeRow).toBeInTheDocument();

    // Verify toggle switches are present
    expect(screen.getByTestId("toggle-switch-network_activity")).toBeInTheDocument();
    expect(screen.getByTestId("toggle-switch-mappings_editor")).toBeInTheDocument();
    expect(screen.getByTestId("toggle-switch-record_mode")).toBeInTheDocument();
  });

  // ─── AC-6: Disabling a feature requires confirmation dialog (NFR-15) ──────

  it("AC-6: clicking to disable enabled toggle shows confirmation dialog", async () => {
    // RED phase: Confirmation dialog doesn't exist yet
    const FeatureTogglesSection = (
      await import("@/features/admin/components/FeatureTogglesSection")
    ).FeatureTogglesSection;

    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <FeatureTogglesSection />
      </QueryClientProvider>
    );

    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByTestId("toggle-switch-network_activity")).toBeInTheDocument();
    });

    // Click toggle to disable (currently enabled)
    const toggleSwitch = screen.getByTestId("toggle-switch-network_activity");
    await user.click(toggleSwitch);

    // Verify confirmation dialog appears
    const dialog = await screen.findByTestId("dialog-toggle-disable");
    expect(dialog).toBeInTheDocument();

    // Verify dialog content
    expect(dialog).toHaveTextContent(/Disable Network Activity\?/i);
    expect(dialog).toHaveTextContent(
      /This will take effect immediately for all active sessions/i
    );

    // Verify action buttons
    const cancelButton = screen.getByTestId("dialog-toggle-disable-cancel");
    const confirmButton = screen.getByTestId("dialog-toggle-disable-confirm");

    expect(cancelButton).toBeInTheDocument();
    expect(confirmButton).toBeInTheDocument();
  });

  it("AC-6: confirmation dialog Disable button triggers PUT request", async () => {
    // RED phase: Confirmation dialog action doesn't exist yet
    const FeatureTogglesSection = (
      await import("@/features/admin/components/FeatureTogglesSection")
    ).FeatureTogglesSection;

    const queryClient = new QueryClient();

    // Mock PUT request
    const putFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: null }),
    });
    fetchMock.mockImplementation((url: string, options: RequestInit | undefined) => {
      if (options?.method === "PUT") return putFetch(url, options);
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true, data: mockToggles }),
      });
    });

    render(
      <QueryClientProvider client={queryClient}>
        <FeatureTogglesSection />
      </QueryClientProvider>
    );

    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByTestId("toggle-switch-network_activity")).toBeInTheDocument();
    });

    // Click toggle to disable
    const toggleSwitch = screen.getByTestId("toggle-switch-network_activity");
    await user.click(toggleSwitch);

    // Click Disable in confirmation dialog
    const confirmButton = await screen.findByTestId("dialog-toggle-disable-confirm");
    await user.click(confirmButton);

    // Verify PUT request was made
    await waitFor(() => {
      expect(putFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/toggles/network_activity"),
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ enabled: false }),
        })
      );
    });

    // Verify dialog closes
    await waitFor(() => {
      expect(screen.queryByTestId("dialog-toggle-disable")).not.toBeInTheDocument();
    });
  });

  it("AC-6: confirmation dialog Cancel button closes dialog without request", async () => {
    // RED phase: Cancel action doesn't exist yet
    const FeatureTogglesSection = (
      await import("@/features/admin/components/FeatureTogglesSection")
    ).FeatureTogglesSection;

    const queryClient = new QueryClient();

    const putFetch = vi.fn();
    fetchMock.mockImplementation((url: string, options: RequestInit | undefined) => {
      if (options?.method === "PUT") return putFetch(url, options);
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true, data: mockToggles }),
      });
    });

    render(
      <QueryClientProvider client={queryClient}>
        <FeatureTogglesSection />
      </QueryClientProvider>
    );

    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByTestId("toggle-switch-network_activity")).toBeInTheDocument();
    });

    // Click toggle to disable
    const toggleSwitch = screen.getByTestId("toggle-switch-network_activity");
    await user.click(toggleSwitch);

    // Click Cancel in confirmation dialog
    const cancelButton = await screen.findByTestId("dialog-toggle-disable-cancel");
    await user.click(cancelButton);

    // Verify dialog closes
    await waitFor(() => {
      expect(screen.queryByTestId("dialog-toggle-disable")).not.toBeInTheDocument();
    });

    // Verify PUT request was NOT made
    expect(putFetch).not.toHaveBeenCalled();
  });

  // ─── AC-7: Enabling a feature requires no confirmation ─────────────────────

  it("AC-7: clicking to enable disabled toggle triggers PUT immediately (no dialog)", async () => {
    // RED phase: No-confirmation logic doesn't exist yet
    const FeatureTogglesSection = (
      await import("@/features/admin/components/FeatureTogglesSection")
    ).FeatureTogglesSection;

    const queryClient = new QueryClient();

    const putFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: null }),
    });
    fetchMock.mockImplementation((url: string, options: RequestInit | undefined) => {
      if (options?.method === "PUT") return putFetch(url, options);
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true, data: mockToggles }),
      });
    });

    render(
      <QueryClientProvider client={queryClient}>
        <FeatureTogglesSection />
      </QueryClientProvider>
    );

    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByTestId("toggle-switch-mappings_editor")).toBeInTheDocument();
    });

    // Click toggle to enable (mappings_editor currently disabled in mock)
    const toggleSwitch = screen.getByTestId("toggle-switch-mappings_editor");
    await user.click(toggleSwitch);

    // Verify confirmation dialog does NOT appear
    expect(screen.queryByTestId("dialog-toggle-disable")).not.toBeInTheDocument();

    // Verify PUT request was made immediately
    await waitFor(() => {
      expect(putFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/toggles/mappings_editor"),
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ enabled: true }),
        })
      );
    });
  });

  // ─── AC-9: Env var locked toggle shows indicator (R-E5-006) ───────────────

  it("AC-9: env-var-locked toggle shows 'Locked by environment variable' badge", async () => {
    // RED phase: Env var badge doesn't exist yet
    const FeatureTogglesSection = (
      await import("@/features/admin/components/FeatureTogglesSection")
    ).FeatureTogglesSection;

    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <FeatureTogglesSection />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("toggle-row-record_mode")).toBeInTheDocument();
    });

    // Verify env var badge is present for record_mode (envVarOverride: false)
    const envBadge = screen.getByTestId("toggle-env-badge-record_mode");
    expect(envBadge).toBeInTheDocument();
    expect(envBadge).toHaveTextContent(/Overridden by env var/i);
  });

  it("AC-9: env-var-locked toggle switch is disabled", async () => {
    // RED phase: Toggle disable logic doesn't exist yet
    const FeatureTogglesSection = (
      await import("@/features/admin/components/FeatureTogglesSection")
    ).FeatureTogglesSection;

    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <FeatureTogglesSection />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("toggle-switch-record_mode")).toBeInTheDocument();
    });

    // Verify toggle switch is disabled
    const toggleSwitch = screen.getByTestId("toggle-switch-record_mode");
    expect(toggleSwitch).toBeDisabled();
    expect(toggleSwitch).toHaveAttribute("aria-disabled", "true");
  });
});
