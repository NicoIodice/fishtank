/**
 * ATDD component tests — Story 4.2: Mappings File Explorer & Dual-Mode Editor
 * Layer: Frontend component (Vitest + React Testing Library + msw)
 *
 * RED PHASE — these tests define expected behaviour and FAIL against the current
 * codebase. MappingsPage is a placeholder; FolderTree, MappingEditor, and all
 * associated hooks/components do not exist yet.
 *
 * ACs covered in this file:
 *   AC-1  — Folder tree renders full hierarchy (service → mappings/ → responses/ → files)
 *   AC-2  — Root label displays data.mocksRoot verbatim, never hardcoded
 *   AC-3  — Active file highlighted with brand-color left border
 *   AC-4  — Expand/collapse state preserved across tree re-fetch (session-scoped)
 *   AC-19 — Empty / loading states (skeleton aria-busy, no-service, no-files)
 *   AC-20 — Keyboard navigation (aria-labels on icon-only buttons)
 *
 * data-testid contract (verbatim from DESIGN.md):
 *   page-mappings
 *   mappings-tree-node-{service-slug}-{filename}
 *   mappings-btn-new-mapping
 *   mappings-btn-new-response
 */

import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

// ─── Component under test (does not exist yet — RED) ─────────────────────────
// MappingsPage exists as a placeholder; tests fail because the placeholder
// does not implement FolderTree, editor, or any tree UI.
// FolderTree is imported lazily in a single test that specifically targets it;
// all other tests render via MappingsPage.
import { MappingsPage } from "@/features/mappings/pages/MappingsPage";

// ─── msw handler override for this test file ────────────────────────────────
import { server } from "@/test/mocks/server";
import { http, HttpResponse } from "msw";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const MOCKS_ROOT = "/var/mocks";

const TREE_RESPONSE = {
  success: true,
  data: {
    mocksRoot: MOCKS_ROOT,
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
                sizeBytes: 1024,
                children: null,
              },
            ],
          },
          {
            name: "responses",
            type: "folder",
            path: "payments-api/responses",
            lastModified: null,
            sizeBytes: null,
            children: [
              {
                name: "get_account_happy-path_body.json",
                type: "file",
                path: "payments-api/responses/get_account_happy-path_body.json",
                lastModified: "2026-06-28T14:32:00.000Z",
                sizeBytes: 512,
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

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Story 4.2 — MappingsPage: Folder Tree", () => {
  beforeEach(() => {
    // Default: tree loads successfully
    server.use(
      http.get("/api/mappings", () => HttpResponse.json(TREE_RESPONSE)),
    );
  });

  // ─── AC-19: Loading state ─────────────────────────────────────────────────

  it("AC-19: shows skeleton loader with aria-busy='true' and aria-label='Loading mappings' while tree loads", async () => {
    // RED: skeleton element does not exist in the placeholder page
    renderPage();

    // The skeleton must be visible immediately before the tree resolves
    const skeleton = screen.getByRole("status");
    expect(skeleton).toHaveAttribute("aria-busy", "true");
    expect(skeleton).toHaveAttribute("aria-label", "Loading mappings");
  });

  // ─── AC-1: Full hierarchy render ─────────────────────────────────────────

  it("AC-1: renders folder tree with Mocks Root → service → mappings/ → responses/ → file nodes after fetch resolves", async () => {
    // RED: FolderTree component does not exist; placeholder renders no tree
    renderPage();

    // Wait for the tree to render
    await waitFor(() => {
      expect(
        screen.getByTestId(
          "mappings-tree-node-payments-api-get_account_happy-path.json",
        ),
      ).toBeInTheDocument();
    });

    // Service folder is visible
    expect(screen.getByText("payments-api")).toBeInTheDocument();

    // Sub-folders are visible
    expect(screen.getByText("mappings")).toBeInTheDocument();
    expect(screen.getByText("responses")).toBeInTheDocument();

    // File node for the mapping file carries correct data-testid
    expect(
      screen.getByTestId(
        "mappings-tree-node-payments-api-get_account_happy-path.json",
      ),
    ).toBeInTheDocument();

    // File node for the response file carries correct data-testid
    expect(
      screen.getByTestId(
        "mappings-tree-node-payments-api-get_account_happy-path_body.json",
      ),
    ).toBeInTheDocument();
  });

  // ─── AC-2: Root label from mocksRoot ─────────────────────────────────────

  it("AC-2: root node label displays data.mocksRoot verbatim (not a hardcoded string)", async () => {
    // RED: placeholder shows no tree, no mocksRoot binding
    renderPage();

    await waitFor(() => {
      // The tree root label must show the actual mocksRoot value from the API
      expect(screen.getByText(MOCKS_ROOT)).toBeInTheDocument();
    });

    // Negative: a commonly hardcoded fallback must NOT appear
    expect(screen.queryByText("/mocks")).not.toBeInTheDocument();
  });

  // ─── AC-2 variant: different mocksRoot value ─────────────────────────────

  it("AC-2: root label updates when backend returns a different mocksRoot path", async () => {
    // RED: no binding to mocksRoot
    const customRoot = "/custom/mocks/path";
    server.use(
      http.get("/api/mappings", () =>
        HttpResponse.json({
          success: true,
          data: { mocksRoot: customRoot, children: [] },
        }),
      ),
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(customRoot)).toBeInTheDocument();
    });
  });

  // ─── AC-3: Active file highlighted ───────────────────────────────────────

  it("AC-3: clicking a file node gives it the brand-color left-border active style, only one at a time", async () => {
    // RED: clicking a file node in the placeholder does nothing
    const user = userEvent.setup();

    // Also need GET /api/mappings/{path} for file content
    server.use(
      http.get("/api/mappings/:path", () =>
        HttpResponse.json({
          success: true,
          data: {
            content: '{"request":{"method":"GET","url":"/api/account"},"response":{"status":200}}',
            name: "get_account_happy-path.json",
            path: "payments-api/mappings/get_account_happy-path.json",
            lastModified: "2026-06-28T14:32:00.000Z",
            sizeBytes: 1024,
          },
        }),
      ),
    );

    renderPage();

    await waitFor(() => {
      expect(
        screen.getByTestId(
          "mappings-tree-node-payments-api-get_account_happy-path.json",
        ),
      ).toBeInTheDocument();
    });

    const fileNode = screen.getByTestId(
      "mappings-tree-node-payments-api-get_account_happy-path.json",
    );

    // Click the file — it becomes active
    await user.click(fileNode);

    // Active node must have brand-color left border (via CSS class or style)
    // The exact class/token name is implementation-defined; we test for the
    // ARIA/data indicator or a data-active attribute the implementation exposes.
    await waitFor(() => {
      expect(fileNode).toHaveAttribute("data-active", "true");
    });

    // Only one node may be active; the response-body file must NOT be active
    const responseFileNode = screen.queryByTestId(
      "mappings-tree-node-payments-api-get_account_happy-path_body.json",
    );
    if (responseFileNode) {
      expect(responseFileNode).not.toHaveAttribute("data-active", "true");
    }
  });

  // ─── AC-4: Expand/collapse persists across re-fetch ──────────────────────

  it("AC-4: expand/collapse state survives a tree re-fetch (session-scoped)", async () => {
    // RED: no session-scoped expand/collapse state exists
    const user = userEvent.setup();
    const qc = makeQc();

    render(
      <MemoryRouter initialEntries={["/mappings"]}>
        <QueryClientProvider client={qc}>
          <MappingsPage />
        </QueryClientProvider>
      </MemoryRouter>,
    );

    // Wait for tree to render
    await waitFor(() => {
      expect(screen.getByText("payments-api")).toBeInTheDocument();
    });

    // Collapse the "payments-api" folder
    const serviceFolder = screen.getByText("payments-api");
    await user.click(serviceFolder);

    // Trigger a simulated re-fetch (invalidate the query)
    qc.invalidateQueries({ queryKey: ["mappings"] });

    // Wait for re-fetch to complete
    await waitFor(() => {
      // After re-fetch, the folder should still be collapsed (child files not visible)
      expect(
        screen.queryByTestId(
          "mappings-tree-node-payments-api-get_account_happy-path.json",
        ),
      ).not.toBeInTheDocument();
    });
  });

  // ─── AC-19: No-service selected empty state ───────────────────────────────

  it("AC-19: shows 'Select a service' empty state in editor pane when no service is selected", async () => {
    // RED: placeholder shows no empty state
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("payments-api")).toBeInTheDocument();
    });

    // When no file is open, the editor pane shows the empty state
    expect(
      screen.getByText(/Select a service/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Choose a service from the left panel/i),
    ).toBeInTheDocument();
  });

  // ─── AC-20: Icon-only buttons have aria-labels ────────────────────────────

  it("AC-20: New Mapping and New Response buttons carry meaningful aria-labels", async () => {
    // RED: placeholder page has no toolbar buttons
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("mappings-btn-new-mapping")).toBeInTheDocument();
    });

    const newMappingBtn = screen.getByTestId("mappings-btn-new-mapping");
    const newResponseBtn = screen.getByTestId("mappings-btn-new-response");

    expect(newMappingBtn).toHaveAttribute("aria-label");
    expect(newMappingBtn.getAttribute("aria-label")).not.toBe("");

    expect(newResponseBtn).toHaveAttribute("aria-label");
    expect(newResponseBtn.getAttribute("aria-label")).not.toBe("");
  });
});
