/**
 * ATDD component tests — Story 4.2: Settings → Mocks Root (AC-21)
 * Layer: Frontend component (Vitest + React Testing Library + msw)
 *
 * RED PHASE — these tests define expected behaviour and FAIL against the current
 * codebase. The Settings → Mocks Root section is a placeholder "Configured in
 * a later story." The MocksRootSettings component does not exist yet.
 *
 * ACs covered in this file:
 *   AC-21 — Settings → Mocks Root section: read-only path display, Edit affordance
 *            with inline warning; data-testid values verbatim from DESIGN.md.
 *
 * data-testid contract (verbatim from DESIGN.md):
 *   settings-input-mocks-root
 *   settings-btn-mocks-root-save
 *   settings-btn-mocks-root-discard
 *   settings-modal-mocks-root-confirm
 *   settings-btn-mocks-root-confirm
 *
 * Note: For v1, the edit-with-validation path is display-only (deferred to Epic 5).
 * These tests verify the read-only display and the warning copy only.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

// ─── Component under test (does not exist yet — RED) ─────────────────────────
import { SettingsPage } from "@/features/settings/pages/SettingsPage";

// ─── msw handler override ────────────────────────────────────────────────────
import { server } from "@/test/mocks/server";
import { http, HttpResponse } from "msw";

// ─── Mocks for settings hooks already used by SettingsPage ───────────────────

vi.mock("@/lib/useTheme", () => ({
  useTheme: vi.fn(() => ({
    theme: "clean-light",
    setTheme: vi.fn(),
  })),
}));

vi.mock("@/features/settings/hooks/useActivitySettings", () => ({
  useActivitySettings: vi.fn(() => ({
    settings: { autoRefreshInterval: 2000, maxEntries: 1000 },
    updateInterval: vi.fn(),
    updateMaxEntries: vi.fn(),
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeQc() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <MemoryRouter initialEntries={["/settings?section=mocks-root"]}>
      <QueryClientProvider client={makeQc()}>{children}</QueryClientProvider>
    </MemoryRouter>
  );
}

function renderSettingsPage() {
  return render(
    <Wrapper>
      <SettingsPage />
    </Wrapper>,
  );
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Story 4.2 — Settings: Mocks Root (AC-21)", () => {
  beforeEach(() => {
    // Provide the tree endpoint so mocksRoot can be read
    server.use(
      http.get("/api/mappings", () =>
        HttpResponse.json({
          success: true,
          data: {
            mocksRoot: "/custom/mocks/path",
            children: [],
          },
        }),
      ),
    );
  });

  it("AC-21: Settings → Mocks Root section renders settings-input-mocks-root with the configured path", async () => {
    // RED: the mocks-root branch is still "Configured in a later story."
    renderSettingsPage();

    // Navigate to Mocks Root section (click the sub-nav item)
    const mocksRootNav = screen.getByRole("button", { name: /mocks root/i });
    await userEvent.click(mocksRootNav);

    await waitFor(() => {
      expect(
        screen.getByTestId("settings-input-mocks-root"),
      ).toBeInTheDocument();
    });

    // Input must show the configured path
    const input = screen.getByTestId("settings-input-mocks-root");
    expect(input).toHaveValue("/custom/mocks/path");
  });

  it("AC-21: Mocks Root input is read-only (display-only for v1)", async () => {
    // RED: input does not exist
    renderSettingsPage();

    const mocksRootNav = screen.getByRole("button", { name: /mocks root/i });
    await userEvent.click(mocksRootNav);

    await waitFor(() => {
      expect(
        screen.getByTestId("settings-input-mocks-root"),
      ).toBeInTheDocument();
    });

    const input = screen.getByTestId("settings-input-mocks-root");
    // For v1, the input is display-only (readOnly attribute or disabled)
    expect(input.hasAttribute("readonly") || (input as HTMLInputElement).disabled).toBe(true);
  });

  it("AC-21: Edit affordance shows an inline warning about service restart + Resync", async () => {
    // RED: no Edit affordance or warning copy exists
    renderSettingsPage();

    const mocksRootNav = screen.getByRole("button", { name: /mocks root/i });
    await userEvent.click(mocksRootNav);

    await waitFor(() => {
      expect(screen.getByTestId("settings-input-mocks-root")).toBeInTheDocument();
    });

    // Click the Edit affordance
    const editBtn = screen.getByRole("button", { name: /edit/i });
    await userEvent.click(editBtn);

    // Inline warning must appear
    await waitFor(() => {
      const warningText = screen.getByText(
        /restarting services|restart.*services|run.*resync/i,
      );
      expect(warningText).toBeInTheDocument();
    });
  });

  it("AC-21: settings-btn-mocks-root-save and settings-btn-mocks-root-discard exist in the section", async () => {
    // RED: buttons do not exist
    renderSettingsPage();

    const mocksRootNav = screen.getByRole("button", { name: /mocks root/i });
    await userEvent.click(mocksRootNav);

    await waitFor(() => {
      expect(screen.getByTestId("settings-input-mocks-root")).toBeInTheDocument();
    });

    expect(screen.getByTestId("settings-btn-mocks-root-save")).toBeInTheDocument();
    expect(screen.getByTestId("settings-btn-mocks-root-discard")).toBeInTheDocument();
  });

  it("AC-21: settings-modal-mocks-root-confirm and settings-btn-mocks-root-confirm exist (for v1 the modal may appear on save attempt)", async () => {
    // RED: confirmation modal does not exist
    renderSettingsPage();

    const mocksRootNav = screen.getByRole("button", { name: /mocks root/i });
    await userEvent.click(mocksRootNav);

    await waitFor(() => {
      expect(screen.getByTestId("settings-input-mocks-root")).toBeInTheDocument();
    });

    // Click Save to trigger the confirmation dialog
    const saveBtn = screen.getByTestId("settings-btn-mocks-root-save");
    await userEvent.click(saveBtn);

    await waitFor(() => {
      expect(
        screen.getByTestId("settings-modal-mocks-root-confirm"),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("settings-btn-mocks-root-confirm"),
      ).toBeInTheDocument();
    });
  });
});
