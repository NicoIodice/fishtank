import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppearanceSettings } from "@/features/settings/components/AppearanceSettings";
import { ActivitySettings } from "@/features/settings/components/ActivitySettings";
import { SettingsPage } from "@/features/settings/pages/SettingsPage";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockApiFetch = vi.hoisted(() => vi.fn());
const mockUpdateMaxEntries = vi.hoisted(() => vi.fn());
const mockUpdateInterval = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", () => ({
  apiFetch: mockApiFetch,
}));

vi.mock("@/lib/api", () => ({
  apiFetch: mockApiFetch,
}));

vi.mock("@/lib/useTheme", () => ({
  useTheme: vi.fn(() => ({
    theme: "clean-light",
    setTheme: vi.fn(),
  })),
}));

vi.mock("@/features/settings/hooks/useActivitySettings", () => ({
  useActivitySettings: vi.fn(() => ({
    settings: { autoRefreshInterval: 2000, maxEntries: 1000 },
    updateInterval: mockUpdateInterval,
    updateMaxEntries: mockUpdateMaxEntries,
  })),
}));

vi.mock("@/features/settings/hooks/useServiceCache", () => ({
  useServiceCaches: vi.fn(() => ({ data: [], isLoading: false })),
  useClearCache: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useClearAllCaches: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

vi.mock("@/features/settings/hooks/useAppSettings", () => ({
  useAppSettings: vi.fn(() => ({
    data: { captureFullHeaders: false },
    isLoading: false,
  })),
  APP_SETTINGS_QUERY_KEY: ["app-settings"],
}));

vi.mock("@/lib/useBreakpoint", () => ({
  useBreakpoint: vi.fn(() => ({
    desktop: true,
    mid: false,
    midNarrow: false,
    mobile: false,
  })),
}));

import { useTheme } from "@/lib/useTheme";
const mockUseTheme = vi.mocked(useTheme);

import { useBreakpoint } from "@/lib/useBreakpoint";
const mockUseBreakpoint = vi.mocked(useBreakpoint);

beforeEach(() => vi.clearAllMocks());

// ─── AppearanceSettings ───────────────────────────────────────────────────────

describe("AppearanceSettings", () => {
  it("renders all theme radio options", () => {
    render(<AppearanceSettings />);
    expect(screen.getByTestId("theme-option-clean-light")).toBeInTheDocument();
    expect(screen.getByTestId("theme-option-deep-ocean")).toBeInTheDocument();
    expect(
      screen.getByTestId("theme-option-emerald-terminal"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("theme-option-ink-amber")).toBeInTheDocument();
  });

  it("marks the current theme as checked", () => {
    mockUseTheme.mockReturnValue({
      theme: "deep-ocean",
      setTheme: vi.fn(),
    });
    render(<AppearanceSettings />);
    const radio = screen.getByTestId(
      "theme-option-deep-ocean",
    ) as HTMLInputElement;
    expect(radio.checked).toBe(true);
  });

  it("calls setTheme when a radio option is changed", async () => {
    const setTheme = vi.fn();
    mockUseTheme.mockReturnValue({ theme: "clean-light", setTheme });
    const user = userEvent.setup();

    render(<AppearanceSettings />);
    await user.click(screen.getByTestId("theme-option-deep-ocean"));

    expect(setTheme).toHaveBeenCalledWith("deep-ocean");
  });
});

// ─── SettingsPage ─────────────────────────────────────────────────────────────

describe("SettingsPage", () => {
  beforeEach(() => {
    mockUseBreakpoint.mockReturnValue({
      desktop: true,
      mid: false,
      midNarrow: false,
      mobile: false,
    });
  });

  it("renders desktop navigation with all sections", () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <SettingsPage />
      </QueryClientProvider>,
    );
    expect(screen.getByTestId("settings-nav-appearance")).toBeInTheDocument();
    expect(screen.getByTestId("settings-nav-activity")).toBeInTheDocument();
    expect(screen.getByTestId("settings-nav-cache")).toBeInTheDocument();
    expect(screen.getByTestId("settings-nav-mocks-root")).toBeInTheDocument();
  });

  it("switches section when a nav button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <SettingsPage />
      </QueryClientProvider>,
    );

    // Default is appearance
    expect(screen.getByTestId("settings-appearance")).toBeInTheDocument();

    // Click activity
    await user.click(screen.getByTestId("settings-nav-activity"));
    expect(screen.queryByTestId("settings-appearance")).not.toBeInTheDocument();
  });

  it("renders a select dropdown in mobile mode", () => {
    mockUseBreakpoint.mockReturnValue({
      desktop: false,
      mid: false,
      midNarrow: false,
      mobile: true,
    });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <SettingsPage />
      </QueryClientProvider>,
    );
    expect(
      screen.getByRole("combobox", { name: /settings section/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("settings-nav-appearance"),
    ).not.toBeInTheDocument();
  });

  it("mobile select onChange switches the active section", async () => {
    mockUseBreakpoint.mockReturnValue({
      desktop: false,
      mid: false,
      midNarrow: false,
      mobile: true,
    });
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <SettingsPage />
      </QueryClientProvider>,
    );

    const select = screen.getByRole("combobox", { name: /settings section/i });
    await user.selectOptions(select, "activity");

    expect(
      screen.getByTestId("settings-select-activity-refresh-interval"),
    ).toBeInTheDocument();
  });

  it("clicking cache nav shows CacheSettings section", async () => {
    mockUseBreakpoint.mockReturnValue({
      desktop: true,
      mid: false,
      midNarrow: false,
      mobile: false,
    });
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <SettingsPage />
      </QueryClientProvider>,
    );
    await user.click(screen.getByTestId("settings-nav-cache"));
    expect(screen.queryByTestId("settings-appearance")).not.toBeInTheDocument();
    // CacheSettings has no mocked component but SettingsPage renders the branch
  });

  it("clicking mocks-root nav shows fallback text", async () => {
    mockUseBreakpoint.mockReturnValue({
      desktop: true,
      mid: false,
      midNarrow: false,
      mobile: false,
    });
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <SettingsPage />
      </QueryClientProvider>,
    );
    await user.click(screen.getByTestId("settings-nav-mocks-root"));
    expect(
      screen.getByText(/configured in a later story/i),
    ).toBeInTheDocument();
  });
});

// ─── ActivitySettings ─────────────────────────────────────────────────────────

describe("ActivitySettings", () => {
  function renderActivity() {
    return render(
      <QueryClientProvider client={new QueryClient()}>
        <ActivitySettings />
      </QueryClientProvider>,
    );
  }

  it("calls updateMaxEntries when max-entries select changes", async () => {
    const user = userEvent.setup();
    renderActivity();

    await user.selectOptions(
      screen.getByTestId("settings-select-activity-max-entries"),
      "500",
    );

    expect(mockUpdateMaxEntries).toHaveBeenCalledWith(500);
  });

  it("isTogglingHeaders guard: second click is ignored while first is in-flight", async () => {
    // Keep the first apiFetch pending to ensure isTogglingHeaders stays true
    let resolveFirst!: (v: unknown) => void;
    mockApiFetch.mockReturnValueOnce(
      new Promise((res) => {
        resolveFirst = res;
      }),
    );

    const user = userEvent.setup();
    renderActivity();

    const checkbox = screen.getByTestId("settings-toggle-capture-full-headers");
    // First click starts the toggle
    await user.click(checkbox);
    // Second click should be a no-op (isTogglingHeaders guard)
    await user.click(checkbox);

    // Only one apiFetch call regardless of two clicks
    expect(mockApiFetch).toHaveBeenCalledTimes(1);
    // Clean up
    resolveFirst({ captureFullHeaders: true });
  });

  it("appSettings?.captureFullHeaders ?? false uses false when captureFullHeaders is undefined", async () => {
    // Render with appSettings having no captureFullHeaders key → ?? false is the branch
    // (useAppSettings mock returns { captureFullHeaders: false } by default, change to undefined)
    const { useAppSettings } =
      await import("@/features/settings/hooks/useAppSettings");
    vi.mocked(useAppSettings).mockReturnValueOnce({
      data: {
        captureFullHeaders: undefined as unknown as boolean,
        mocksHostPath: "",
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useAppSettings>);

    mockApiFetch.mockResolvedValueOnce({ captureFullHeaders: false });
    const user = userEvent.setup();
    renderActivity();

    await user.click(
      screen.getByTestId("settings-toggle-capture-full-headers"),
    );

    await waitFor(() =>
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/api/settings/capture-headers",
        expect.objectContaining({ method: "PUT" }),
      ),
    );
  });

  it("catch branch: logs error when toggle capture headers fails", async () => {
    mockApiFetch.mockRejectedValueOnce(new Error("network error"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    renderActivity();

    const checkbox = screen.getByTestId("settings-toggle-capture-full-headers");
    await userEvent.setup().click(checkbox);

    await waitFor(() => expect(consoleSpy).toHaveBeenCalled());
    consoleSpy.mockRestore();
  });
});
