/**
 * ATDD integration tests — Story 4.3: Resync UI with Toast Feedback & Conflict Banners
 * Layer: Component / Page integration (Vitest + React Testing Library + MSW)
 *
 * RED PHASE — MappingsPage exists but the Resync-related UI does NOT exist yet.
 * Tests FAIL at runtime because:
 *   - data-testid="mappings-btn-resync" is not rendered by MappingsPage
 *   - data-testid="mappings-banner-conflict" is not rendered
 *   - data-testid="mappings-banner-deleted" is not rendered
 *   - No conflict/deletion state management exists
 *
 * ACs covered:
 *   AC-1  — Resync button visible in Mappings toolbar
 *   AC-8  — Conflict banner shown when active file is dirty + in Resync conflicts list
 *   AC-9  — Deleted-file banner shown when active file removed from tree post-Resync
 *   AC-10 — Silent reload when active file has no local changes + is in conflicts list
 *   AC-11 — Unsaved changes are never silently discarded (conflict banner gate)
 *   AC-12 — Editor remains interactive (not locked) during Resync
 *
 * data-testid contract (DESIGN.md — verbatim):
 *   mappings-btn-resync
 *   mappings-banner-conflict
 *   mappings-btn-view-disk
 *   mappings-btn-keep-edits
 *   mappings-banner-deleted
 *   mappings-btn-close-deleted
 */

import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

// MSW handler overrides
import { server } from "@/test/mocks/server";
import { http, HttpResponse } from "msw";

// Component under test — exists but does not yet render Resync UI
import { MappingsPage } from "@/features/mappings/pages/MappingsPage";

// ─────────────────────────────────────────────────────────────────────────────

function renderMappingsPage() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <MappingsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const ACTIVE_FILE_PATH = "payments-api/mappings/get_account.json";
const MAPPING_CONTENT = JSON.stringify({
  request: { method: "GET", url: "/api/account" },
  response: { status: 200, body: "ok" },
});

const TREE_WITH_ACTIVE_FILE = {
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
                name: "get_account.json",
                type: "file",
                path: ACTIVE_FILE_PATH,
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

const TREE_WITHOUT_ACTIVE_FILE = {
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
            children: [], // active file is gone
          },
        ],
      },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────

describe("MappingsPage — AC-1: Resync button in toolbar", () => {
  it('renders data-testid="mappings-btn-resync" in the toolbar', async () => {
    renderMappingsPage();

    // RED: this element does not exist in the current MappingsPage implementation
    await waitFor(() => {
      expect(screen.getByTestId("mappings-btn-resync")).toBeInTheDocument();
    });
  });

  it('Resync button has label "Resync"', async () => {
    renderMappingsPage();

    await waitFor(() => {
      expect(screen.getByTestId("mappings-btn-resync")).toHaveTextContent(
        "Resync",
      );
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("MappingsPage — AC-8: conflict banner (dirty + conflict)", () => {
  it("shows conflict banner when active file has unsaved changes and Resync reports a conflict", async () => {
    // Setup: tree with file, file content, Resync returns a conflict for the active file
    server.use(
      http.get("/api/mappings", () => HttpResponse.json(TREE_WITH_ACTIVE_FILE)),
      http.get("/api/mappings/:path", () =>
        HttpResponse.json({
          success: true,
          data: {
            content: MAPPING_CONTENT,
            name: "get_account.json",
            path: ACTIVE_FILE_PATH,
            lastModified: "2026-06-28T14:32:00.000Z",
            sizeBytes: MAPPING_CONTENT.length,
          },
        }),
      ),
      http.post("/api/resync", () =>
        HttpResponse.json({
          success: true,
          data: {
            mappingsLoaded: 1,
            responsesLoaded: 0,
            elapsedMs: 300,
            conflicts: [
              {
                path: ACTIVE_FILE_PATH,
                reason: "File modified externally since last load",
              },
            ],
            failures: [],
          },
        }),
      ),
    );

    const user = userEvent.setup();
    renderMappingsPage();

    // Open the file in the editor
    await waitFor(() => {
      expect(
        screen.getByTestId(`mappings-tree-node-payments-api-get_account.json`),
      ).toBeInTheDocument();
    });
    await user.click(
      screen.getByTestId(`mappings-tree-node-payments-api-get_account.json`),
    );

    // Wait for the editor to load the file content
    await waitFor(() => {
      expect(screen.getByTestId("mappings-btn-save")).toBeInTheDocument();
    });
    // Make the file dirty: type in the URL field to trigger onDirtyChange(true)
    const urlInput = screen.getByRole("textbox", { name: /URL/i });
    await user.clear(urlInput);
    await user.type(urlInput, "/api/modified");
    // Confirm dirty state: discard button is enabled
    await waitFor(() => {
      expect(screen.getByTestId("mappings-btn-discard")).not.toBeDisabled();
    });

    // Trigger Resync
    await user.click(screen.getByTestId("mappings-btn-resync"));

    // Conflict banner must appear (RED: doesn't exist yet)
    await waitFor(() => {
      expect(
        screen.getByTestId("mappings-banner-conflict"),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        "This file was modified on disk since you started editing.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByTestId("mappings-btn-view-disk")).toBeInTheDocument();
    expect(screen.getByTestId("mappings-btn-keep-edits")).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("MappingsPage — AC-9: deleted-file banner", () => {
  it("shows deleted-file banner when active file is removed from tree after Resync", async () => {
    let treeCallCount = 0;

    server.use(
      http.get("/api/mappings", () => {
        treeCallCount++;
        // First call: tree with file; subsequent calls: file is gone (simulates deletion)
        return HttpResponse.json(
          treeCallCount === 1
            ? TREE_WITH_ACTIVE_FILE
            : TREE_WITHOUT_ACTIVE_FILE,
        );
      }),
      http.get("/api/mappings/:path", () =>
        HttpResponse.json({
          success: true,
          data: {
            content: MAPPING_CONTENT,
            name: "get_account.json",
            path: ACTIVE_FILE_PATH,
            lastModified: "2026-06-28T14:32:00.000Z",
            sizeBytes: MAPPING_CONTENT.length,
          },
        }),
      ),
      http.post("/api/resync", () =>
        HttpResponse.json({
          success: true,
          data: {
            mappingsLoaded: 0,
            responsesLoaded: 0,
            elapsedMs: 120,
            conflicts: [],
            failures: [],
          },
        }),
      ),
    );

    const user = userEvent.setup();
    renderMappingsPage();

    // Open the file
    await waitFor(() => {
      expect(
        screen.queryByTestId(
          `mappings-tree-node-payments-api-get_account.json`,
        ),
      ).toBeInTheDocument();
    });
    await user.click(
      screen.getByTestId(`mappings-tree-node-payments-api-get_account.json`),
    );

    // Trigger Resync (after which tree re-fetches and the file is gone)
    await user.click(screen.getByTestId("mappings-btn-resync"));

    // Deleted-file banner must appear (RED: doesn't exist yet)
    await waitFor(() => {
      expect(screen.getByTestId("mappings-banner-deleted")).toBeInTheDocument();
    });

    expect(
      screen.getByText("File no longer exists on disk."),
    ).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("MappingsPage — AC-10: silent reload when file modified externally, no local changes", () => {
  it("does NOT show conflict banner when active file is clean (not dirty) and has a conflict", async () => {
    server.use(
      http.get("/api/mappings", () => HttpResponse.json(TREE_WITH_ACTIVE_FILE)),
      http.get("/api/mappings/:path", () =>
        HttpResponse.json({
          success: true,
          data: {
            content: MAPPING_CONTENT,
            name: "get_account.json",
            path: ACTIVE_FILE_PATH,
            lastModified: "2026-06-28T14:32:00.000Z",
            sizeBytes: MAPPING_CONTENT.length,
          },
        }),
      ),
      http.post("/api/resync", () =>
        HttpResponse.json({
          success: true,
          data: {
            mappingsLoaded: 1,
            responsesLoaded: 0,
            elapsedMs: 300,
            conflicts: [
              {
                path: ACTIVE_FILE_PATH,
                reason: "File modified externally since last load",
              },
            ],
            failures: [],
          },
        }),
      ),
    );

    const user = userEvent.setup();
    renderMappingsPage();

    // Open the file (no edits — not dirty)
    await waitFor(() => {
      expect(
        screen.queryByTestId(
          `mappings-tree-node-payments-api-get_account.json`,
        ),
      ).toBeInTheDocument();
    });
    await user.click(
      screen.getByTestId(`mappings-tree-node-payments-api-get_account.json`),
    );

    // File is clean (isDirty = false), trigger Resync
    await user.click(screen.getByTestId("mappings-btn-resync"));

    await waitFor(() => {
      // Success toast should appear
      expect(screen.queryByText(/loaded in/i)).toBeInTheDocument();
    });

    // Conflict banner must NOT appear for a clean file (silent reload)
    expect(
      screen.queryByTestId("mappings-banner-conflict"),
    ).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("MappingsPage — AC-11: unsaved changes never silently discarded", () => {
  it("conflict banner is shown (not skipped) when isDirty=true + conflict detected", async () => {
    server.use(
      http.get("/api/mappings", () => HttpResponse.json(TREE_WITH_ACTIVE_FILE)),
      http.get("/api/mappings/:path", () =>
        HttpResponse.json({
          success: true,
          data: {
            content: MAPPING_CONTENT,
            name: "get_account.json",
            path: ACTIVE_FILE_PATH,
            lastModified: "2026-06-28T14:32:00.000Z",
            sizeBytes: MAPPING_CONTENT.length,
          },
        }),
      ),
      http.post("/api/resync", () =>
        HttpResponse.json({
          success: true,
          data: {
            mappingsLoaded: 1,
            responsesLoaded: 0,
            elapsedMs: 200,
            conflicts: [
              { path: ACTIVE_FILE_PATH, reason: "Modified externally" },
            ],
            failures: [],
          },
        }),
      ),
    );

    const user = userEvent.setup();
    renderMappingsPage();

    await waitFor(() => {
      expect(
        screen.queryByTestId(
          `mappings-tree-node-payments-api-get_account.json`,
        ),
      ).toBeInTheDocument();
    });
    await user.click(
      screen.getByTestId(`mappings-tree-node-payments-api-get_account.json`),
    );

    // Make the file dirty before Resync: type in the URL field
    await waitFor(() => {
      expect(screen.getByTestId("mappings-btn-save")).toBeInTheDocument();
    });
    const urlInput = screen.getByRole("textbox", { name: /URL/i });
    await user.clear(urlInput);
    await user.type(urlInput, "/api/dirty");
    // Wait for dirty state: discard button becomes enabled
    await waitFor(() => {
      expect(screen.getByTestId("mappings-btn-discard")).not.toBeDisabled();
    });

    await user.click(screen.getByTestId("mappings-btn-resync"));

    // Conflict banner MUST appear — unsaved changes must not be discarded silently
    await waitFor(() => {
      expect(
        screen.queryByTestId("mappings-banner-conflict"),
      ).toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("MappingsPage — AC-12: editor remains interactive during Resync", () => {
  it("editor pane is NOT disabled/overlaid while Resync is pending", async () => {
    server.use(
      http.get("/api/mappings", () => HttpResponse.json(TREE_WITH_ACTIVE_FILE)),
      http.get("/api/mappings/:path", () =>
        HttpResponse.json({
          success: true,
          data: {
            content: MAPPING_CONTENT,
            name: "get_account.json",
            path: ACTIVE_FILE_PATH,
            lastModified: "2026-06-28T14:32:00.000Z",
            sizeBytes: MAPPING_CONTENT.length,
          },
        }),
      ),
      http.post("/api/resync", async () => {
        await new Promise((r) => setTimeout(r, 150));
        return HttpResponse.json({
          success: true,
          data: {
            mappingsLoaded: 1,
            responsesLoaded: 0,
            elapsedMs: 150,
            conflicts: [],
            failures: [],
          },
        });
      }),
    );

    const user = userEvent.setup();
    renderMappingsPage();

    // Open a file
    await waitFor(() => {
      expect(
        screen.queryByTestId(
          `mappings-tree-node-payments-api-get_account.json`,
        ),
      ).toBeInTheDocument();
    });
    await user.click(
      screen.getByTestId(`mappings-tree-node-payments-api-get_account.json`),
    );

    // Wait for editor to be ready
    await waitFor(() =>
      expect(
        screen.getByTestId("mappings-breadcrumb-editor"),
      ).toBeInTheDocument(),
    );

    // Click Resync (non-blocking for editor)
    await user.click(screen.getByTestId("mappings-btn-resync"));

    // Resync button should be disabled during pending
    expect(screen.getByTestId("mappings-btn-resync")).toBeDisabled();

    // The editor tabs (Form / Raw JSON) must still be accessible — not locked/overlaid
    // The save/discard buttons should NOT be disabled because of Resync
    const saveBtn = screen.queryByTestId("mappings-btn-save");
    if (saveBtn) {
      // Save button is only present when isDirty=true; if present, it must not be
      // disabled due to the Resync operation
      expect(saveBtn).not.toBeDisabled();
    }

    // The editor pane container must not have an overlay or aria-disabled attribute
    expect(
      screen.queryByTestId("mappings-editor-overlay"),
    ).not.toBeInTheDocument();
  });
});
