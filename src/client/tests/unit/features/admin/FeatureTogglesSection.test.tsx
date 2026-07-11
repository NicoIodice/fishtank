import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { FeatureTogglesSection } from "@/features/admin/components/FeatureTogglesSection";
import type { FeatureToggle } from "@/features/admin/types";

/**
 * Unit tests for FeatureTogglesSection component covering:
 * - Toggle list rendering with env var overrides
 * - Toggle switch interaction (enable/disable)
 * - Confirmation dialog for disable action
 * - No confirmation for enable action
 * - Env-var-locked toggle UI state
 * - Loading state
 *
 * Coverage goal: 90%+ line/branch coverage
 */

const mockSetToggle = vi.fn();
const mockUseToggles = vi.fn();
const mockToggles: FeatureToggle[] = [
  {
    name: "network_activity",
    displayName: "Network Activity",
    description: "View network activity logs",
    enabled: true,
    updatedAt: new Date("2026-07-09T10:00:00Z").toISOString(),
    envVarOverride: null,
  },
  {
    name: "mappings_editor",
    displayName: "Mappings Editor",
    description: "Edit request/response mappings",
    enabled: true,
    updatedAt: new Date("2026-07-09T11:00:00Z").toISOString(),
    envVarOverride: null,
  },
  {
    name: "record_mode",
    displayName: "Record Mode",
    description: "Record real service responses",
    enabled: false,
    updatedAt: new Date("2026-07-09T12:00:00Z").toISOString(),
    envVarOverride: null,
  },
];

vi.mock("@/features/admin/hooks/useToggles", () => ({
  useToggles: () => mockUseToggles(),
}));

describe("FeatureTogglesSection", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    mockUseToggles.mockReturnValue({
      toggles: mockToggles,
      isLoading: false,
      error: null,
      setToggle: mockSetToggle,
      isSettingToggle: false,
    });
    vi.clearAllMocks();
    // Re-apply default after clearAllMocks clears mockUseToggles
    mockUseToggles.mockReturnValue({
      toggles: mockToggles,
      isLoading: false,
      error: null,
      setToggle: mockSetToggle,
      isSettingToggle: false,
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  it("renders toggle list table with all toggles", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <FeatureTogglesSection />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByTestId("section-feature-toggles")).toBeInTheDocument();
    expect(screen.getByTestId("table-toggles")).toBeInTheDocument();

    expect(
      screen.getByTestId("toggle-row-network_activity"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("toggle-row-mappings_editor"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("toggle-row-record_mode")).toBeInTheDocument();
  });

  it("displays toggle display names, descriptions, and timestamps", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <FeatureTogglesSection />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText("Network Activity")).toBeInTheDocument();
    expect(screen.getByText("View network activity logs")).toBeInTheDocument();

    expect(screen.getByText("Mappings Editor")).toBeInTheDocument();
    expect(
      screen.getByText("Edit request/response mappings"),
    ).toBeInTheDocument();

    expect(screen.getByText("Record Mode")).toBeInTheDocument();
    expect(
      screen.getByText("Record real service responses"),
    ).toBeInTheDocument();
  });

  it("renders toggle switches with correct checked state", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <FeatureTogglesSection />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const networkActivitySwitch = screen.getByTestId(
      "toggle-switch-network_activity",
    ) as HTMLInputElement;
    const mappingsEditorSwitch = screen.getByTestId(
      "toggle-switch-mappings_editor",
    ) as HTMLInputElement;
    const recordModeSwitch = screen.getByTestId(
      "toggle-switch-record_mode",
    ) as HTMLInputElement;

    expect(networkActivitySwitch.checked).toBe(true);
    expect(mappingsEditorSwitch.checked).toBe(true);
    expect(recordModeSwitch.checked).toBe(false);
  });

  it("shows confirmation dialog when disabling an enabled toggle", async () => {
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <FeatureTogglesSection />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const networkActivitySwitch = screen.getByTestId(
      "toggle-switch-network_activity",
    );
    await user.click(networkActivitySwitch);

    await waitFor(() => {
      expect(screen.getByTestId("dialog-toggle-disable")).toBeInTheDocument();
    });

    expect(screen.getByText("Disable Network Activity?")).toBeInTheDocument();
    expect(
      screen.getByText(
        "This will take effect immediately for all active sessions.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("dialog-toggle-disable-cancel"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("dialog-toggle-disable-confirm"),
    ).toBeInTheDocument();
  });

  it("cancels disable when Cancel button clicked in confirmation dialog", async () => {
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <FeatureTogglesSection />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const networkActivitySwitch = screen.getByTestId(
      "toggle-switch-network_activity",
    );
    await user.click(networkActivitySwitch);

    await waitFor(() => {
      expect(screen.getByTestId("dialog-toggle-disable")).toBeInTheDocument();
    });

    const cancelButton = screen.getByTestId("dialog-toggle-disable-cancel");
    await user.click(cancelButton);

    await waitFor(() => {
      expect(
        screen.queryByTestId("dialog-toggle-disable"),
      ).not.toBeInTheDocument();
    });

    expect(mockSetToggle).not.toHaveBeenCalled();
  });

  it("confirms disable when Disable button clicked in confirmation dialog", async () => {
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <FeatureTogglesSection />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const networkActivitySwitch = screen.getByTestId(
      "toggle-switch-network_activity",
    );
    await user.click(networkActivitySwitch);

    await waitFor(() => {
      expect(screen.getByTestId("dialog-toggle-disable")).toBeInTheDocument();
    });

    const confirmButton = screen.getByTestId("dialog-toggle-disable-confirm");
    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockSetToggle).toHaveBeenCalledWith({
        name: "network_activity",
        enabled: false,
      });
    });

    await waitFor(() => {
      expect(
        screen.queryByTestId("dialog-toggle-disable"),
      ).not.toBeInTheDocument();
    });
  });

  it("enables toggle without confirmation when toggle is disabled", async () => {
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <FeatureTogglesSection />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const recordModeSwitch = screen.getByTestId("toggle-switch-record_mode");
    await user.click(recordModeSwitch);

    await waitFor(() => {
      expect(mockSetToggle).toHaveBeenCalledWith({
        name: "record_mode",
        enabled: true,
      });
    });

    // Verify no confirmation dialog was shown
    expect(
      screen.queryByTestId("dialog-toggle-disable"),
    ).not.toBeInTheDocument();
  });

  it("closes dialog when backdrop is clicked", async () => {
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <FeatureTogglesSection />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const networkActivitySwitch = screen.getByTestId(
      "toggle-switch-network_activity",
    );
    await user.click(networkActivitySwitch);

    await waitFor(() => {
      expect(screen.getByTestId("dialog-toggle-disable")).toBeInTheDocument();
    });

    const dialog = screen.getByTestId("dialog-toggle-disable");
    const backdrop = dialog.parentElement!;
    await user.click(backdrop);

    await waitFor(() => {
      expect(
        screen.queryByTestId("dialog-toggle-disable"),
      ).not.toBeInTheDocument();
    });

    expect(mockSetToggle).not.toHaveBeenCalled();
  });

  it("does not close dialog when dialog content is clicked", async () => {
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <FeatureTogglesSection />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const networkActivitySwitch = screen.getByTestId(
      "toggle-switch-network_activity",
    );
    await user.click(networkActivitySwitch);

    await waitFor(() => {
      expect(screen.getByTestId("dialog-toggle-disable")).toBeInTheDocument();
    });

    const dialog = screen.getByTestId("dialog-toggle-disable");
    await user.click(dialog);

    // Dialog should still be visible
    expect(screen.getByTestId("dialog-toggle-disable")).toBeInTheDocument();
  });

  it("displays env-var-locked badge for toggles with envVarOverride", () => {
    const togglesWithEnvVar: FeatureToggle[] = [
      {
        ...mockToggles[0],
        envVarOverride: false,
      },
    ];

    mockUseToggles.mockReturnValue({
      toggles: togglesWithEnvVar,
      isLoading: false,
      error: null,
      setToggle: mockSetToggle,
      isSettingToggle: false,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <FeatureTogglesSection />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const badge = screen.getByTestId("toggle-env-badge-network_activity");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent("Overridden by env var");
    expect(badge).toHaveAttribute(
      "title",
      "This toggle is locked by environment variable FISHTANK_TOGGLE_NETWORK_ACTIVITY and cannot be changed at runtime.",
    );
  });

  it("disables toggle switch for env-var-locked toggles", () => {
    const togglesWithEnvVar: FeatureToggle[] = [
      {
        ...mockToggles[0],
        enabled: true,
        envVarOverride: false, // Locked to false by env var
      },
    ];

    mockUseToggles.mockReturnValue({
      toggles: togglesWithEnvVar,
      isLoading: false,
      error: null,
      setToggle: mockSetToggle,
      isSettingToggle: false,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <FeatureTogglesSection />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const networkActivitySwitch = screen.getByTestId(
      "toggle-switch-network_activity",
    ) as HTMLInputElement;
    expect(networkActivitySwitch.disabled).toBe(true);
    expect(networkActivitySwitch).toHaveAttribute("aria-disabled", "true");
    expect(networkActivitySwitch.checked).toBe(false); // env var override applies
  });

  it("does not trigger setToggle when clicking locked toggle", async () => {
    const user = userEvent.setup();

    const togglesWithEnvVar: FeatureToggle[] = [
      {
        ...mockToggles[0],
        envVarOverride: false,
      },
    ];

    mockUseToggles.mockReturnValue({
      toggles: togglesWithEnvVar,
      isLoading: false,
      error: null,
      setToggle: mockSetToggle,
      isSettingToggle: false,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <FeatureTogglesSection />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const networkActivitySwitch = screen.getByTestId(
      "toggle-switch-network_activity",
    );

    // Try to click the disabled switch
    await user.click(networkActivitySwitch);

    // setToggle should not be called
    expect(mockSetToggle).not.toHaveBeenCalled();
  });

  it("applies env var override to toggle checked state", () => {
    const togglesWithEnvVar: FeatureToggle[] = [
      {
        ...mockToggles[0],
        enabled: true, // DB says true
        envVarOverride: false, // Env var overrides to false
      },
    ];

    mockUseToggles.mockReturnValue({
      toggles: togglesWithEnvVar,
      isLoading: false,
      error: null,
      setToggle: mockSetToggle,
      isSettingToggle: false,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <FeatureTogglesSection />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const networkActivitySwitch = screen.getByTestId(
      "toggle-switch-network_activity",
    ) as HTMLInputElement;
    expect(networkActivitySwitch.checked).toBe(false); // env var override takes precedence
  });

  it("displays loading state when isLoading is true", () => {
    mockUseToggles.mockReturnValue({
      toggles: [],
      isLoading: true,
      error: null,
      setToggle: mockSetToggle,
      isSettingToggle: false,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <FeatureTogglesSection />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText("Loading toggles...")).toBeInTheDocument();
    expect(screen.queryByTestId("table-toggles")).not.toBeInTheDocument();
  });

  it("disables all toggle switches when isSettingToggle is true", () => {
    mockUseToggles.mockReturnValue({
      toggles: mockToggles,
      isLoading: false,
      error: null,
      setToggle: mockSetToggle,
      isSettingToggle: true,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <FeatureTogglesSection />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const networkActivitySwitch = screen.getByTestId(
      "toggle-switch-network_activity",
    ) as HTMLInputElement;
    const mappingsEditorSwitch = screen.getByTestId(
      "toggle-switch-mappings_editor",
    ) as HTMLInputElement;
    const recordModeSwitch = screen.getByTestId(
      "toggle-switch-record_mode",
    ) as HTMLInputElement;

    expect(networkActivitySwitch.disabled).toBe(true);
    expect(mappingsEditorSwitch.disabled).toBe(true);
    expect(recordModeSwitch.disabled).toBe(true);
  });

  it("renders table headers correctly", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <FeatureTogglesSection />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText("Feature")).toBeInTheDocument();
    expect(screen.getByText("Description")).toBeInTheDocument();
    expect(screen.getByText("State")).toBeInTheDocument();
    expect(screen.getByText("Last Modified")).toBeInTheDocument();
  });

  it("formats timestamps correctly", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <FeatureTogglesSection />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const row = screen.getByTestId("toggle-row-network_activity");

    // Timestamp should be formatted as locale string
    const timestamp = within(row).getByText(/7\/9\/2026/i); // Matches locale-formatted date
    expect(timestamp).toBeInTheDocument();
  });

  it("dialog has correct ARIA attributes", async () => {
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <FeatureTogglesSection />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const networkActivitySwitch = screen.getByTestId(
      "toggle-switch-network_activity",
    );
    await user.click(networkActivitySwitch);

    await waitFor(() => {
      const dialog = screen.getByTestId("dialog-toggle-disable");
      expect(dialog).toHaveAttribute("role", "dialog");
      expect(dialog).toHaveAttribute("aria-modal", "true");
      expect(dialog).toHaveAttribute("aria-labelledby", "disable-toggle-title");
    });
  });
});
