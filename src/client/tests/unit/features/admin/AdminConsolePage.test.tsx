import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { AdminConsolePage } from "@/features/admin/pages/AdminConsolePage";

/**
 * Unit tests for AdminConsolePage component covering:
 * - Tab navigation state management
 * - Tab selection and aria attributes
 * - Tab panel visibility
 * - useTogglesHub integration
 * 
 * Coverage goal: 90%+ line/branch coverage
 */

// Mock useTogglesHub to avoid SignalR connection
const mockUseTogglesHub = vi.fn();
vi.mock("@/features/admin/hooks/useTogglesHub", () => ({
  useTogglesHub: () => mockUseTogglesHub(),
}));

// Mock FeatureTogglesSection to isolate AdminConsolePage tests
vi.mock("@/features/admin/components/FeatureTogglesSection", () => ({
  FeatureTogglesSection: () => <div data-testid="mock-feature-toggles-section">Feature Toggles Section</div>,
}));

describe("AdminConsolePage", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it("renders Admin Console heading and tabs", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AdminConsolePage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText("Admin Console")).toBeInTheDocument();
    expect(screen.getByTestId("tab-feature-toggles")).toBeInTheDocument();
    expect(screen.getByTestId("tab-health")).toBeInTheDocument();
    expect(screen.getByTestId("tab-audit-log")).toBeInTheDocument();
  });

  it("initializes with Feature Toggles tab active", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AdminConsolePage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const featureTogglesTab = screen.getByTestId("tab-feature-toggles");
    expect(featureTogglesTab).toHaveAttribute("aria-selected", "true");
    expect(featureTogglesTab).toHaveAttribute("aria-controls", "panel-feature-toggles");

    // Verify panel is visible
    const panel = screen.getByRole("tabpanel", { name: /feature toggles/i });
    expect(panel).toBeInTheDocument();
    expect(panel).toHaveAttribute("id", "panel-feature-toggles");
  });

  it("switches to Health tab when clicked", async () => {
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AdminConsolePage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const healthTab = screen.getByTestId("tab-health");
    await user.click(healthTab);

    await waitFor(() => {
      expect(healthTab).toHaveAttribute("aria-selected", "true");
    });

    expect(screen.getByText("Coming in Story 5.3")).toBeInTheDocument();
    
    // Verify Feature Toggles tab is no longer active
    const featureTogglesTab = screen.getByTestId("tab-feature-toggles");
    expect(featureTogglesTab).toHaveAttribute("aria-selected", "false");
  });

  it("switches to Audit Log tab when clicked", async () => {
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AdminConsolePage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const auditLogTab = screen.getByTestId("tab-audit-log");
    await user.click(auditLogTab);

    await waitFor(() => {
      expect(auditLogTab).toHaveAttribute("aria-selected", "true");
    });

    expect(screen.getByText("Coming in Story 5.3")).toBeInTheDocument();
    
    // Verify Feature Toggles tab is no longer active
    const featureTogglesTab = screen.getByTestId("tab-feature-toggles");
    expect(featureTogglesTab).toHaveAttribute("aria-selected", "false");
  });

  it("switches back to Feature Toggles tab after navigating away", async () => {
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AdminConsolePage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Navigate to Health tab
    const healthTab = screen.getByTestId("tab-health");
    await user.click(healthTab);
    await waitFor(() => expect(healthTab).toHaveAttribute("aria-selected", "true"));

    // Navigate back to Feature Toggles
    const featureTogglesTab = screen.getByTestId("tab-feature-toggles");
    await user.click(featureTogglesTab);

    await waitFor(() => {
      expect(featureTogglesTab).toHaveAttribute("aria-selected", "true");
    });

    expect(screen.getByTestId("mock-feature-toggles-section")).toBeInTheDocument();
    expect(healthTab).toHaveAttribute("aria-selected", "false");
  });

  it("only renders active tab panel", async () => {
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AdminConsolePage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Initially Feature Toggles panel is visible
    expect(screen.getByTestId("mock-feature-toggles-section")).toBeInTheDocument();
    expect(screen.queryByText("Coming in Story 5.3")).not.toBeInTheDocument();

    // Switch to Health tab
    const healthTab = screen.getByTestId("tab-health");
    await user.click(healthTab);

    await waitFor(() => {
      expect(screen.getByText("Coming in Story 5.3")).toBeInTheDocument();
    });

    // Feature Toggles section should not be rendered
    expect(screen.queryByTestId("mock-feature-toggles-section")).not.toBeInTheDocument();
  });

  it("initializes SignalR hub connection via useTogglesHub hook", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AdminConsolePage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(mockUseTogglesHub).toHaveBeenCalledTimes(1);
  });

  it("renders page container with correct data-testid", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AdminConsolePage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByTestId("page-admin-console")).toBeInTheDocument();
  });

  it("applies correct role=tab attributes to tab buttons", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AdminConsolePage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const featureTogglesTab = screen.getByTestId("tab-feature-toggles");
    const healthTab = screen.getByTestId("tab-health");
    const auditLogTab = screen.getByTestId("tab-audit-log");

    expect(featureTogglesTab).toHaveAttribute("role", "tab");
    expect(healthTab).toHaveAttribute("role", "tab");
    expect(auditLogTab).toHaveAttribute("role", "tab");
  });

  it("applies correct role=tabpanel attributes to tab panels", async () => {
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AdminConsolePage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Feature Toggles panel
    const featureTogglesPanel = screen.getByRole("tabpanel");
    expect(featureTogglesPanel).toHaveAttribute("id", "panel-feature-toggles");
    expect(featureTogglesPanel).toHaveAttribute("aria-labelledby", "tab-feature-toggles");

    // Switch to Health and verify
    await user.click(screen.getByTestId("tab-health"));
    await waitFor(() => {
      const healthPanel = screen.getByRole("tabpanel");
      expect(healthPanel).toHaveAttribute("id", "panel-health");
      expect(healthPanel).toHaveAttribute("aria-labelledby", "tab-health");
    });
  });

  it("renders tablist with correct role attribute", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AdminConsolePage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const tablist = screen.getByRole("tablist");
    expect(tablist).toBeInTheDocument();
  });
});
