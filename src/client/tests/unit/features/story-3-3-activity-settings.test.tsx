import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Unit tests for ActivitySettings component (Story 3-3 gap coverage — AC-11).
 *
 * Covers:
 *   AC-11a — Renders auto-refresh interval select with options 1s/2s/5s/Disabled
 *   AC-11b — Changing interval calls updateInterval and persists to localStorage
 *   AC-11c — Capture full headers checkbox reads from useAppSettings
 *   AC-11d — Checkbox is disabled when appSettings is undefined (loading state)
 */

const STORAGE_KEY = "fishtank-activity-settings";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn().mockResolvedValue({ captureFullHeaders: false, mocksHostPath: "/" }),
}));

// ─── Wrapper ──────────────────────────────────────────────────────────────────

function makeQc(appSettings?: { captureFullHeaders: boolean; mocksHostPath: string }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  if (appSettings !== undefined) {
    qc.setQueryData(["app-settings"], appSettings);
  }
  return qc;
}

function Wrapper({
  children,
  appSettings,
}: {
  children: React.ReactNode;
  appSettings?: { captureFullHeaders: boolean; mocksHostPath: string };
}) {
  return (
    <QueryClientProvider client={makeQc(appSettings)}>{children}</QueryClientProvider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("ActivitySettings — Story 3.3 (AC-11)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // ─── AC-11a: Auto-refresh interval select renders all options ─────────────────

  it("AC-11a: renders auto-refresh interval select with 1s/2s/5s/Disabled options", async () => {
    const { ActivitySettings } = await import(
      "@/features/settings/components/ActivitySettings"
    );
    render(
      <Wrapper appSettings={{ captureFullHeaders: false, mocksHostPath: "/" }}>
        <ActivitySettings />
      </Wrapper>,
    );

    const select = screen.getByTestId("settings-select-activity-refresh-interval");
    expect(select).toBeInTheDocument();

    const options = Array.from(select.querySelectorAll("option")).map((o) => o.value);
    expect(options).toContain("1000");
    expect(options).toContain("2000");
    expect(options).toContain("5000");
    expect(options).toContain("disabled");
  });

  it("AC-11a: auto-refresh interval select shows 2 seconds (default) as default value", async () => {
    const { ActivitySettings } = await import(
      "@/features/settings/components/ActivitySettings"
    );
    render(
      <Wrapper appSettings={{ captureFullHeaders: false, mocksHostPath: "/" }}>
        <ActivitySettings />
      </Wrapper>,
    );

    const select = screen.getByTestId(
      "settings-select-activity-refresh-interval",
    ) as HTMLSelectElement;
    expect(select.value).toBe("2000");
  });

  it("AC-11a: max log entries select renders with 500/1000/5000 options", async () => {
    const { ActivitySettings } = await import(
      "@/features/settings/components/ActivitySettings"
    );
    render(
      <Wrapper appSettings={{ captureFullHeaders: false, mocksHostPath: "/" }}>
        <ActivitySettings />
      </Wrapper>,
    );

    const select = screen.getByTestId("settings-select-activity-max-entries");
    expect(select).toBeInTheDocument();

    const options = Array.from(select.querySelectorAll("option")).map((o) => o.value);
    expect(options).toContain("500");
    expect(options).toContain("1000");
    expect(options).toContain("5000");
  });

  // ─── AC-11b: Changing interval persists to localStorage ──────────────────────

  it("AC-11b: changing interval to 1s persists '1000' to localStorage", async () => {
    const { ActivitySettings } = await import(
      "@/features/settings/components/ActivitySettings"
    );
    const user = userEvent.setup();
    render(
      <Wrapper appSettings={{ captureFullHeaders: false, mocksHostPath: "/" }}>
        <ActivitySettings />
      </Wrapper>,
    );

    const select = screen.getByTestId("settings-select-activity-refresh-interval");
    await user.selectOptions(select, "1000");

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    expect(stored.autoRefreshInterval).toBe(1000);
  });

  it("AC-11b: changing interval to Disabled persists 'disabled' to localStorage", async () => {
    const { ActivitySettings } = await import(
      "@/features/settings/components/ActivitySettings"
    );
    const user = userEvent.setup();
    render(
      <Wrapper appSettings={{ captureFullHeaders: false, mocksHostPath: "/" }}>
        <ActivitySettings />
      </Wrapper>,
    );

    const select = screen.getByTestId("settings-select-activity-refresh-interval");
    await user.selectOptions(select, "disabled");

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    expect(stored.autoRefreshInterval).toBe("disabled");
  });

  it("AC-11b: changing interval updates the select's displayed value immediately", async () => {
    const { ActivitySettings } = await import(
      "@/features/settings/components/ActivitySettings"
    );
    const user = userEvent.setup();
    render(
      <Wrapper appSettings={{ captureFullHeaders: false, mocksHostPath: "/" }}>
        <ActivitySettings />
      </Wrapper>,
    );

    const select = screen.getByTestId(
      "settings-select-activity-refresh-interval",
    ) as HTMLSelectElement;
    await user.selectOptions(select, "5000");

    expect(select.value).toBe("5000");
  });

  // ─── AC-11c: Capture full headers checkbox reads from useAppSettings ──────────

  it("AC-11c: capture full headers checkbox reads captureFullHeaders=false from appSettings", async () => {
    const { ActivitySettings } = await import(
      "@/features/settings/components/ActivitySettings"
    );
    render(
      <Wrapper appSettings={{ captureFullHeaders: false, mocksHostPath: "/" }}>
        <ActivitySettings />
      </Wrapper>,
    );

    const checkbox = screen.getByTestId(
      "settings-toggle-capture-full-headers",
    ) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
  });

  it("AC-11c: capture full headers checkbox reflects captureFullHeaders=true from appSettings", async () => {
    const { ActivitySettings } = await import(
      "@/features/settings/components/ActivitySettings"
    );
    render(
      <Wrapper appSettings={{ captureFullHeaders: true, mocksHostPath: "/" }}>
        <ActivitySettings />
      </Wrapper>,
    );

    const checkbox = screen.getByTestId(
      "settings-toggle-capture-full-headers",
    ) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  // ─── AC-11d: Checkbox is disabled when appSettings is undefined ───────────────

  it("AC-11d: capture full headers checkbox is disabled when appSettings is loading (undefined)", async () => {
    const { ActivitySettings } = await import(
      "@/features/settings/components/ActivitySettings"
    );
    // No appSettings pre-seeded → useAppSettings returns undefined (loading)
    render(
      <Wrapper>
        <ActivitySettings />
      </Wrapper>,
    );

    const checkbox = screen.getByTestId("settings-toggle-capture-full-headers");
    expect(checkbox).toBeDisabled();
  });

  it("AC-11d: capture full headers checkbox is enabled when appSettings is loaded", async () => {
    const { ActivitySettings } = await import(
      "@/features/settings/components/ActivitySettings"
    );
    render(
      <Wrapper appSettings={{ captureFullHeaders: false, mocksHostPath: "/" }}>
        <ActivitySettings />
      </Wrapper>,
    );

    const checkbox = screen.getByTestId("settings-toggle-capture-full-headers");
    // Not disabled when appSettings is present
    await waitFor(() => expect(checkbox).not.toBeDisabled());
  });

  // ─── Calling PUT /api/settings/capture-headers on toggle ─────────────────────

  it("AC-11c: clicking capture headers checkbox calls apiFetch with PUT", async () => {
    const { apiFetch } = await import("@/lib/api");
    const mockApiFetch = vi.mocked(apiFetch);
    mockApiFetch.mockResolvedValue({ captureFullHeaders: true, mocksHostPath: "/" });

    const { ActivitySettings } = await import(
      "@/features/settings/components/ActivitySettings"
    );
    const user = userEvent.setup();
    render(
      <Wrapper appSettings={{ captureFullHeaders: false, mocksHostPath: "/" }}>
        <ActivitySettings />
      </Wrapper>,
    );

    const checkbox = screen.getByTestId("settings-toggle-capture-full-headers");
    await user.click(checkbox);

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/api/settings/capture-headers",
        expect.objectContaining({ method: "PUT" }),
      );
    });
  });
});
