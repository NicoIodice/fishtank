/**
 * Coverage-gap tests — Story 4.3: Resync UI with Toast Feedback & Conflict Banners
 * Layer: Unit / Component (Vitest + React Testing Library + MSW)
 *
 * These tests were added AFTER the initial ATDD suite to close specific
 * branch/line coverage gaps that survived the first green run:
 *
 * Gap 1 — ConflictBanner.tsx line 59
 *   Function: onClick={() => setShowConfirm(false)}  (Cancel button in confirm state)
 *   Missing: no test clicked Cancel after entering confirm state
 *
 * Gap 2 — MappingsPage.tsx lines 267-271
 *   Function: handleCloseDeleted callback body
 *   Missing: AC-9 test never clicked the "Close" button on the deleted-file banner
 *
 * Gap 3 — MappingsPage.tsx line 301
 *   Branch: setShowServiceSelect(true) inside handleNewResponseClick when no service selected
 *   Missing: no test clicked "New Response" without a service already selected
 *
 * Gap 4 — ResyncButton.tsx branch at useSpinnerStyles early-return
 *   Branch: if (document.getElementById(id)) return;  (style tag already injected)
 *   Missing: no test rendered ResyncButton when the style element already existed in DOM
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

import { server } from "@/test/mocks/server";
import { http, HttpResponse } from "msw";

import { ConflictBanner } from "@/features/mappings/components/ConflictBanner";
import { ResyncButton } from "@/features/mappings/components/ResyncButton";
import { MappingsPage } from "@/features/mappings/pages/MappingsPage";

// ─── Shared helpers ───────────────────────────────────────────────────────────

function makeQC() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={makeQC()}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

function renderMappingsPage() {
  return render(
    <QueryClientProvider client={makeQC()}>
      <MemoryRouter>
        <MappingsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const ACTIVE_FILE_PATH = "svc/mappings/file.json";
const MAPPING_CONTENT = JSON.stringify({
  request: { method: "GET", url: "/api/path" },
  response: { status: 200, body: "ok" },
});

const TREE_WITH_FILE = {
  success: true,
  data: {
    mocksRoot: "/var/mocks",
    children: [
      {
        name: "svc",
        type: "folder",
        path: "svc",
        lastModified: null,
        sizeBytes: null,
        children: [
          {
            name: "mappings",
            type: "folder",
            path: "svc/mappings",
            lastModified: null,
            sizeBytes: null,
            children: [
              {
                name: "file.json",
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

const TREE_WITHOUT_FILE = {
  success: true,
  data: {
    mocksRoot: "/var/mocks",
    children: [
      {
        name: "svc",
        type: "folder",
        path: "svc",
        lastModified: null,
        sizeBytes: null,
        children: [
          {
            name: "mappings",
            type: "folder",
            path: "svc/mappings",
            lastModified: null,
            sizeBytes: null,
            children: [], // file removed after resync
          },
        ],
      },
    ],
  },
};

function fileContentResponse() {
  return HttpResponse.json({
    success: true,
    data: {
      content: MAPPING_CONTENT,
      name: "file.json",
      path: ACTIVE_FILE_PATH,
      lastModified: "2026-06-28T14:32:00.000Z",
      sizeBytes: MAPPING_CONTENT.length,
    },
  });
}

// ─── Gap 1: ConflictBanner — Cancel button in confirm state ──────────────────

describe("ConflictBanner — Cancel button (coverage gap: line 59)", () => {
  it("clicking Cancel in confirm dialog returns to initial banner state", async () => {
    const onViewDisk = vi.fn();
    const user = userEvent.setup();

    render(
      <ConflictBanner onViewDisk={onViewDisk} onKeepEdits={vi.fn()} />,
    );

    // Step 1: click "View disk version" to enter the confirm state
    await user.click(screen.getByTestId("mappings-btn-view-disk"));

    // Confirm state: Cancel button is now present
    await waitFor(() => {
      expect(
        screen.getByTestId("mappings-btn-view-disk-cancel"),
      ).toBeInTheDocument();
    });

    // The confirmation warning text should be visible
    expect(
      screen.getByText(/Viewing the disk version will discard your local edits/i),
    ).toBeInTheDocument();

    // Step 2: click Cancel → should revert to initial state
    await user.click(screen.getByTestId("mappings-btn-view-disk-cancel"));

    // Initial state restored: original message back, Cancel gone, onViewDisk NOT called
    await waitFor(() => {
      expect(
        screen.getByText("This file was modified on disk since you started editing."),
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByTestId("mappings-btn-view-disk-cancel"),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("mappings-btn-view-disk")).toBeInTheDocument();
    expect(onViewDisk).not.toHaveBeenCalled();
  });

  it("Cancel button in confirm dialog does not call onViewDisk", async () => {
    const onViewDisk = vi.fn();
    const user = userEvent.setup();

    render(
      <ConflictBanner onViewDisk={onViewDisk} onKeepEdits={vi.fn()} />,
    );

    await user.click(screen.getByTestId("mappings-btn-view-disk"));
    await waitFor(() =>
      expect(screen.getByTestId("mappings-btn-view-disk-cancel")).toBeInTheDocument(),
    );

    await user.click(screen.getByTestId("mappings-btn-view-disk-cancel"));

    expect(onViewDisk).not.toHaveBeenCalled();
  });

  it("confirm dialog changes role to alertdialog when showConfirm=true", async () => {
    const user = userEvent.setup();

    render(
      <ConflictBanner onViewDisk={vi.fn()} onKeepEdits={vi.fn()} />,
    );

    // Initial state: role="alert"
    expect(screen.getByTestId("mappings-banner-conflict")).toHaveAttribute(
      "role",
      "alert",
    );

    // Enter confirm state: role="alertdialog"
    await user.click(screen.getByTestId("mappings-btn-view-disk"));
    await waitFor(() =>
      expect(screen.getByTestId("mappings-banner-conflict")).toHaveAttribute(
        "role",
        "alertdialog",
      ),
    );

    // Cancel: back to role="alert"
    await user.click(screen.getByTestId("mappings-btn-view-disk-cancel"));
    await waitFor(() =>
      expect(screen.getByTestId("mappings-banner-conflict")).toHaveAttribute(
        "role",
        "alert",
      ),
    );
  });
});

// ─── Gap 2: MappingsPage — handleCloseDeleted (AC-9 Close button) ────────────

describe("MappingsPage — AC-9 Close button (coverage gap: lines 267-271)", () => {
  it("clicking Close on deleted-file banner deselects the file and hides the banner", async () => {
    let treeCallCount = 0;

    server.use(
      http.get("/api/mappings", () => {
        treeCallCount++;
        return HttpResponse.json(
          treeCallCount === 1 ? TREE_WITH_FILE : TREE_WITHOUT_FILE,
        );
      }),
      http.get("/api/mappings/:path", () => fileContentResponse()),
      http.post("/api/resync", () =>
        HttpResponse.json({
          success: true,
          data: {
            mappingsLoaded: 0,
            responsesLoaded: 0,
            elapsedMs: 50,
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
        screen.getByTestId("mappings-tree-node-svc-file.json"),
      ).toBeInTheDocument();
    });
    await user.click(screen.getByTestId("mappings-tree-node-svc-file.json"));

    // Trigger Resync — tree refetches and the file is gone
    await user.click(screen.getByTestId("mappings-btn-resync"));

    // Deleted-file banner must appear
    await waitFor(() => {
      expect(
        screen.getByTestId("mappings-banner-deleted"),
      ).toBeInTheDocument();
    });

    // Click the Close button on the banner
    await user.click(screen.getByTestId("mappings-btn-close-deleted"));

    // Banner should disappear after Close
    await waitFor(() => {
      expect(
        screen.queryByTestId("mappings-banner-deleted"),
      ).not.toBeInTheDocument();
    });
  });

  it("closing deleted-file banner shows the empty-state panel (no file selected)", async () => {
    let treeCallCount = 0;

    server.use(
      http.get("/api/mappings", () => {
        treeCallCount++;
        return HttpResponse.json(
          treeCallCount === 1 ? TREE_WITH_FILE : TREE_WITHOUT_FILE,
        );
      }),
      http.get("/api/mappings/:path", () => fileContentResponse()),
      http.post("/api/resync", () =>
        HttpResponse.json({
          success: true,
          data: {
            mappingsLoaded: 0,
            responsesLoaded: 0,
            elapsedMs: 50,
            conflicts: [],
            failures: [],
          },
        }),
      ),
    );

    const user = userEvent.setup();
    renderMappingsPage();

    await waitFor(() => {
      expect(
        screen.getByTestId("mappings-tree-node-svc-file.json"),
      ).toBeInTheDocument();
    });
    await user.click(screen.getByTestId("mappings-tree-node-svc-file.json"));

    await user.click(screen.getByTestId("mappings-btn-resync"));

    await waitFor(() => {
      expect(screen.getByTestId("mappings-banner-deleted")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("mappings-btn-close-deleted"));

    // After closing, no file is selected — the editor pane goes back to empty state
    // (no save button, no breadcrumb editor, no deleted banner)
    await waitFor(() => {
      expect(
        screen.queryByTestId("mappings-banner-deleted"),
      ).not.toBeInTheDocument();
      expect(screen.queryByTestId("mappings-btn-save")).not.toBeInTheDocument();
    });
  });
});

// ─── Gap 3: MappingsPage — handleNewResponseClick with no service ─────────────

describe("MappingsPage — handleNewResponseClick without service (coverage gap: line 301)", () => {
  it('clicking "New Response" with no service selected opens service-select modal', async () => {
    server.use(
      http.get("/api/mappings", () =>
        HttpResponse.json({
          success: true,
          data: { mocksRoot: "/var/mocks", children: [] },
        }),
      ),
    );

    const user = userEvent.setup();
    renderMappingsPage();

    // Wait for the toolbar to appear (tree loaded)
    await waitFor(() => {
      expect(screen.getByTestId("mappings-btn-new-response")).toBeInTheDocument();
    });

    // Click New Response with no service selected
    await user.click(screen.getByTestId("mappings-btn-new-response"));

    // Service-select modal should appear (setShowServiceSelect(true) branch)
    // The ServiceSelectModal uses role="dialog" with aria-label="Select service"
    await waitFor(() => {
      expect(
        screen.getByRole("dialog", { name: "Select service" }),
      ).toBeInTheDocument();
    });
  });

  it('clicking "New Response" when a service IS selected skips service modal, opens file-name modal', async () => {
    // Use TREE_WITH_FILE so there's a clickable file node.
    // Clicking the file sets both activeFilePath AND selectedServicePath,
    // so a subsequent "New Response" click goes straight to the filename modal.
    server.use(
      http.get("/api/mappings", () => HttpResponse.json(TREE_WITH_FILE)),
      http.get("/api/mappings/:path", () => fileContentResponse()),
    );

    const user = userEvent.setup();
    renderMappingsPage();

    // Wait for tree to load and click the file (sets selectedServicePath = "svc")
    await waitFor(() => {
      expect(screen.getByTestId("mappings-tree-node-svc-file.json")).toBeInTheDocument();
    });
    await user.click(screen.getByTestId("mappings-tree-node-svc-file.json"));

    // Wait for the editor to confirm a file is open
    await waitFor(() => {
      expect(screen.getByTestId("mappings-btn-save")).toBeInTheDocument();
    });

    // Now click New Response — service is already selected via the file click,
    // so it should skip the service-select modal and open the filename modal directly
    await user.click(screen.getByTestId("mappings-btn-new-response"));

    // File-name modal should appear (not service-select modal)
    // FileNameModal has data-testid="mappings-modal-file-name"
    await waitFor(() => {
      expect(
        screen.getByTestId("mappings-modal-file-name"),
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByRole("dialog", { name: "Select service" }),
    ).not.toBeInTheDocument();
  });
});

// ─── Gap 4: ResyncButton — useSpinnerStyles early-return branch ───────────────

describe("ResyncButton — useSpinnerStyles deduplication (coverage gap: branch at line 68)", () => {
  beforeEach(() => {
    // Pre-inject the style element that useSpinnerStyles creates.
    // This forces the early-return branch: if (document.getElementById(id)) return;
    const existing = document.getElementById("resync-spinner-styles");
    if (!existing) {
      const style = document.createElement("style");
      style.id = "resync-spinner-styles";
      style.textContent = "/* pre-existing */";
      document.head.appendChild(style);
    }
  });

  afterEach(() => {
    // Clean up the pre-injected element so other tests start fresh
    const el = document.getElementById("resync-spinner-styles");
    if (el) el.remove();
  });

  it("renders correctly when spinner style tag is already in DOM (no duplicate created)", () => {
    renderWithProviders(<ResyncButton />);

    // Button still renders correctly despite early-return in useSpinnerStyles
    expect(screen.getByTestId("mappings-btn-resync")).toBeInTheDocument();
    expect(screen.getByTestId("mappings-btn-resync")).toHaveTextContent("Resync");

    // Only ONE style element with this id should exist
    const styleElements = document.querySelectorAll("#resync-spinner-styles");
    expect(styleElements).toHaveLength(1);
  });

  it("does NOT add a second style tag when one already exists", () => {
    // Count before render
    const before = document.querySelectorAll("#resync-spinner-styles").length;
    expect(before).toBe(1);

    renderWithProviders(<ResyncButton />);

    // Should still be exactly 1
    const after = document.querySelectorAll("#resync-spinner-styles").length;
    expect(after).toBe(1);
  });
});
