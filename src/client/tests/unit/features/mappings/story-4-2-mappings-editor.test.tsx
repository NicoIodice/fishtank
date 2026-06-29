/**
 * ATDD component tests — Story 4.2: Mappings File Explorer & Dual-Mode Editor
 * Layer: Frontend component (Vitest + React Testing Library + msw)
 *
 * RED PHASE — these tests define expected behaviour and FAIL against the current
 * codebase. MappingsPage is a placeholder; MappingEditor, RawJsonTab, FormTab,
 * and associated hooks do not exist yet.
 *
 * ACs covered in this file:
 *   AC-5  — Clicking a file loads content into the editor via GET /api/mappings/{path}
 *   AC-6  — Dual-mode editor: Form tab + Raw JSON tab (CodeMirror, lang-json, one-dark)
 *   AC-7  — Tab switch preserves unsaved changes (shared edit buffer)
 *   AC-8  — Unsaved-change indicator: ● dot + italic filename in tree node
 *   AC-9  — Save / Discard enablement rules
 *   AC-17 — Copy JSON button in Raw JSON tab
 *
 * data-testid contract (verbatim from DESIGN.md):
 *   mappings-breadcrumb-editor
 *   mappings-tab-form
 *   mappings-tab-raw
 *   mappings-btn-save
 *   mappings-btn-discard
 *   mappings-btn-copy-json
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

// ─── Components under test (do not exist yet — RED) ──────────────────────────
import { MappingsPage } from "@/features/mappings/pages/MappingsPage";

// ─── msw handler override ────────────────────────────────────────────────────
import { server } from "@/test/mocks/server";
import { http, HttpResponse } from "msw";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const MAPPING_CONTENT = JSON.stringify({
  request: { method: "GET", url: "/api/account" },
  response: { status: 200, body: "ok", headers: { "Content-Type": "application/json" } },
  extraField: "advanced-wiremock-key",
});

const FILE_CONTENT_RESPONSE = {
  success: true,
  data: {
    content: MAPPING_CONTENT,
    name: "get_account_happy-path.json",
    path: "payments-api/mappings/get_account_happy-path.json",
    lastModified: "2026-06-28T14:32:00.000Z",
    sizeBytes: MAPPING_CONTENT.length,
  },
};

const TREE_RESPONSE = {
  success: true,
  data: {
    mocksRoot: "/var/mocks",
    children: [
      {
        name: "payments-api",
        type: "folder",
        path: "payments-api",
        lastModified: null,
        sizeBytes: null,
        children: [
          {
            name: "mappings",
            type: "folder",
            path: "payments-api/mappings",
            lastModified: null,
            sizeBytes: null,
            children: [
              {
                name: "get_account_happy-path.json",
                type: "file",
                path: "payments-api/mappings/get_account_happy-path.json",
                lastModified: "2026-06-28T14:32:00.000Z",
                sizeBytes: MAPPING_CONTENT.length,
                children: null,
              },
            ],
          },
        ],
      },
    ],
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeQc() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <MemoryRouter initialEntries={["/mappings"]}>
      <QueryClientProvider client={makeQc()}>{children}</QueryClientProvider>
    </MemoryRouter>
  );
}

function renderPage() {
  return render(
    <Wrapper>
      <MappingsPage />
    </Wrapper>,
  );
}

/** Click a file node in the tree and wait for the editor to load. */
async function clickFileAndWaitForEditor(user: ReturnType<typeof userEvent.setup>) {
  await waitFor(() => {
    expect(
      screen.getByTestId(
        "mappings-tree-node-payments-api-get_account_happy-path.json",
      ),
    ).toBeInTheDocument();
  });
  await user.click(
    screen.getByTestId(
      "mappings-tree-node-payments-api-get_account_happy-path.json",
    ),
  );
  await waitFor(() => {
    expect(screen.getByTestId("mappings-breadcrumb-editor")).toBeInTheDocument();
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Story 4.2 — MappingsPage: Editor", () => {
  beforeEach(() => {
    server.use(
      http.get("/api/mappings", () => HttpResponse.json(TREE_RESPONSE)),
      // Catch-all for GET /api/mappings/{**path}
      http.get("/api/mappings/*", () => HttpResponse.json(FILE_CONTENT_RESPONSE)),
    );
  });

  // ─── AC-5: File click loads editor ───────────────────────────────────────

  it("AC-5: clicking a file in the tree fetches GET /api/mappings/{path} and shows breadcrumb", async () => {
    // RED: clicking file node in placeholder has no effect
    const user = userEvent.setup();
    renderPage();

    await clickFileAndWaitForEditor(user);

    // Breadcrumb shows the file path
    const breadcrumb = screen.getByTestId("mappings-breadcrumb-editor");
    expect(breadcrumb).toHaveTextContent("get_account_happy-path.json");
  });

  // ─── AC-6: Dual-mode tab bar ──────────────────────────────────────────────

  it("AC-6: editor shows Form tab and Raw JSON tab after a file is loaded", async () => {
    // RED: tab bar does not exist in placeholder
    const user = userEvent.setup();
    renderPage();

    await clickFileAndWaitForEditor(user);

    expect(screen.getByTestId("mappings-tab-form")).toBeInTheDocument();
    expect(screen.getByTestId("mappings-tab-raw")).toBeInTheDocument();
  });

  it("AC-6: Raw JSON tab renders a CodeMirror editor (lang-json + one-dark)", async () => {
    // RED: CodeMirror is not installed; RawJsonTab does not exist
    const user = userEvent.setup();
    renderPage();

    await clickFileAndWaitForEditor(user);

    // Switch to Raw JSON tab
    await user.click(screen.getByTestId("mappings-tab-raw"));

    // CodeMirror renders a .cm-editor root element
    await waitFor(() => {
      const cmEditor = document.querySelector(".cm-editor");
      expect(cmEditor).not.toBeNull();
    });

    // The editor should contain the JSON content
    await waitFor(() => {
      const editorContent = document.querySelector(".cm-content");
      expect(editorContent).not.toBeNull();
    });
  });

  it("AC-6: Form tab renders guided fields (method, URL pattern, status)", async () => {
    // RED: FormTab does not exist
    const user = userEvent.setup();
    renderPage();

    await clickFileAndWaitForEditor(user);

    // Form tab is selected by default (or click it)
    const formTab = screen.getByTestId("mappings-tab-form");
    await user.click(formTab);

    // Common mapping fields must be visible
    await waitFor(() => {
      // Method field
      expect(
        screen.getByLabelText(/method/i),
      ).toBeInTheDocument();
      // URL pattern field
      expect(
        screen.getByLabelText(/url/i),
      ).toBeInTheDocument();
      // Status field
      expect(
        screen.getByLabelText(/status/i),
      ).toBeInTheDocument();
    });
  });

  // ─── AC-7: Tab switch preserves unsaved changes ───────────────────────────

  it("AC-7: edits in Form tab are reflected in Raw JSON tab after switching", async () => {
    // RED: no shared edit buffer; tabs switch with no state retention
    const user = userEvent.setup();
    renderPage();

    await clickFileAndWaitForEditor(user);

    // Start on Form tab
    await user.click(screen.getByTestId("mappings-tab-form"));

    // Modify the status field in the Form tab
    const statusInput = screen.getByLabelText(/status/i);
    await user.clear(statusInput);
    await user.type(statusInput, "404");

    // Switch to Raw JSON tab
    await user.click(screen.getByTestId("mappings-tab-raw"));

    // Raw JSON should reflect the changed status value
    await waitFor(() => {
      const editorContent = document.querySelector(".cm-content");
      expect(editorContent?.textContent).toContain("404");
    });
  });

  it("AC-7: advanced/unknown fields are NOT dropped when switching Form → Raw", async () => {
    // RED: no parsed-object edit buffer; unknown keys would be lost
    const user = userEvent.setup();
    renderPage();

    await clickFileAndWaitForEditor(user);

    // Start on Form tab, make any edit to trigger serialization
    await user.click(screen.getByTestId("mappings-tab-form"));
    const statusInput = screen.getByLabelText(/status/i);
    await user.clear(statusInput);
    await user.type(statusInput, "200");

    // Switch to Raw JSON tab — advanced key 'extraField' must still be present
    await user.click(screen.getByTestId("mappings-tab-raw"));

    await waitFor(() => {
      const editorContent = document.querySelector(".cm-content");
      expect(editorContent?.textContent).toContain("extraField");
      expect(editorContent?.textContent).toContain("advanced-wiremock-key");
    });
  });

  // ─── AC-8: Unsaved-change indicator ──────────────────────────────────────

  it("AC-8: tree node shows ● dot and italic when file has unsaved changes", async () => {
    // RED: no dirty-state tracking exists
    const user = userEvent.setup();
    renderPage();

    await clickFileAndWaitForEditor(user);

    // Make an edit in the Raw JSON tab
    await user.click(screen.getByTestId("mappings-tab-raw"));

    // Simulate typing in the CodeMirror editor (the actual CM interaction is
    // complex in jsdom; use a direct state manipulation via the form tab instead)
    await user.click(screen.getByTestId("mappings-tab-form"));
    const statusInput = screen.getByLabelText(/status/i);
    await user.clear(statusInput);
    await user.type(statusInput, "500");

    // The tree node for the active file must show the unsaved indicator
    await waitFor(() => {
      const fileNode = screen.getByTestId(
        "mappings-tree-node-payments-api-get_account_happy-path.json",
      );
      // Check for ● dot or data-dirty attribute
      const hasDirtyIndicator =
        fileNode.textContent?.includes("●") ||
        fileNode.hasAttribute("data-dirty");
      expect(hasDirtyIndicator).toBe(true);
    });
  });

  // ─── AC-9: Save / Discard enablement ─────────────────────────────────────

  it("AC-9: Save is disabled and Discard is disabled when file is clean (no unsaved changes)", async () => {
    // RED: buttons do not exist
    const user = userEvent.setup();
    renderPage();

    await clickFileAndWaitForEditor(user);

    const saveBtn = screen.getByTestId("mappings-btn-save");
    const discardBtn = screen.getByTestId("mappings-btn-discard");

    // Clean state: Save disabled, Discard disabled
    expect(saveBtn).toBeDisabled();
    expect(discardBtn).toBeDisabled();
  });

  it("AC-9: Save and Discard are both enabled when file has unsaved changes", async () => {
    // RED: buttons do not exist
    const user = userEvent.setup();
    renderPage();

    await clickFileAndWaitForEditor(user);

    // Make an edit
    await user.click(screen.getByTestId("mappings-tab-form"));
    const statusInput = screen.getByLabelText(/status/i);
    await user.clear(statusInput);
    await user.type(statusInput, "500");

    await waitFor(() => {
      expect(screen.getByTestId("mappings-btn-save")).toBeEnabled();
      expect(screen.getByTestId("mappings-btn-discard")).toBeEnabled();
    });
  });

  // ─── AC-17: Copy JSON ────────────────────────────────────────────────────

  it("AC-17: Raw JSON tab has a Copy JSON button that copies editor content to clipboard", async () => {
    // RED: Copy JSON button does not exist
    const user = userEvent.setup();

    // Stub clipboard API
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      configurable: true,
    });

    renderPage();
    await clickFileAndWaitForEditor(user);

    // Switch to Raw JSON tab
    await user.click(screen.getByTestId("mappings-tab-raw"));

    const copyBtn = screen.getByTestId("mappings-btn-copy-json");
    expect(copyBtn).toBeInTheDocument();

    await user.click(copyBtn);

    // Clipboard writeText must have been called with the current editor content
    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith(
        expect.stringContaining('"method"'),
      );
    });
  });
});
