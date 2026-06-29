/**
 * ATDD component tests — Story 4.2: Mappings File Explorer & Dual-Mode Editor
 * Layer: Frontend component (Vitest + React Testing Library + msw)
 *
 * RED PHASE — these tests define expected behaviour and FAIL against the current
 * codebase. MappingsPage is a placeholder; all CRUD dialogs/modals do not exist.
 *
 * ACs covered in this file:
 *   AC-10 — Save waits for server confirmation; success updates state + toast
 *   AC-11 — Discard reverts unsaved edits without a network call
 *   AC-12 — New Mapping / New Response: separate buttons, correct sub-folder, naming modal
 *   AC-13 — No-service-selected → service-selection dropdown before naming modal
 *   AC-14 — Delete requires confirmation dialog; no optimistic delete
 *   AC-15 — Rename pre-fills modal; Duplicate creates copy with suffix
 *   AC-16 — Failed write shows error toast; state not mutated
 *   AC-18 — Navigation guard: useBlocker confirmation dialog on unsaved edits
 *
 * data-testid contract (verbatim from DESIGN.md):
 *   mappings-btn-save
 *   mappings-btn-discard
 *   mappings-btn-new-mapping
 *   mappings-btn-new-response
 *   mappings-modal-file-name
 *   mappings-input-filename
 *   mappings-btn-delete
 *   mappings-btn-rename
 *   mappings-btn-duplicate
 *   mappings-modal-discard-confirm
 *   mappings-btn-discard-confirm
 *   mappings-btn-discard-cancel
 */

import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

// ─── Component under test (does not exist yet — RED) ─────────────────────────
import { MappingsPage } from "@/features/mappings/pages/MappingsPage";

// ─── msw handler override ────────────────────────────────────────────────────
import { server } from "@/test/mocks/server";
import { http, HttpResponse } from "msw";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const MAPPING_CONTENT = JSON.stringify({
  request: { method: "GET", url: "/api/account" },
  response: { status: 200, body: "ok" },
});

const TREE_WITH_SERVICE = {
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
          {
            name: "responses",
            type: "folder",
            path: "payments-api/responses",
            lastModified: null,
            sizeBytes: null,
            children: [],
          },
        ],
      },
    ],
  },
};

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeQc() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function Wrapper({
  children,
  qc,
}: {
  children: React.ReactNode;
  qc?: QueryClient;
}) {
  const client = qc ?? makeQc();
  return (
    <MemoryRouter initialEntries={["/mappings"]}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </MemoryRouter>
  );
}

async function openFile(user: ReturnType<typeof userEvent.setup>) {
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

async function makeDirty(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByTestId("mappings-tab-form"));
  const statusInput = screen.getByLabelText(/status/i);
  await user.clear(statusInput);
  await user.type(statusInput, "418");
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Story 4.2 — MappingsPage: Save / Discard", () => {
  beforeEach(() => {
    server.use(
      http.get("/api/mappings", () => HttpResponse.json(TREE_WITH_SERVICE)),
      http.get("/api/mappings/*", () => HttpResponse.json(FILE_CONTENT_RESPONSE)),
    );
  });

  // ─── AC-10: Save waits for server confirmation ────────────────────────────

  it("AC-10: Save issues PUT /api/mappings/{path} with content + lastKnownModified; clears unsaved indicator on 200", async () => {
    // RED: save button does not exist
    const user = userEvent.setup();
    let putCalled = false;
    let putBody: unknown = null;

    server.use(
      http.put("/api/mappings/*", async ({ request }) => {
        putCalled = true;
        putBody = await request.json();
        return HttpResponse.json({
          success: true,
          data: {
            name: "get_account_happy-path.json",
            path: "payments-api/mappings/get_account_happy-path.json",
            lastModified: "2026-06-28T15:00:00.000Z",
            sizeBytes: MAPPING_CONTENT.length,
          },
        });
      }),
    );

    render(
      <Wrapper>
        <MappingsPage />
      </Wrapper>,
    );

    await openFile(user);
    await makeDirty(user);

    // Save
    await user.click(screen.getByTestId("mappings-btn-save"));

    // PUT must have been called with content and lastKnownModified
    await waitFor(() => {
      expect(putCalled).toBe(true);
    });
    expect(putBody).toMatchObject({
      content: expect.any(String),
      lastKnownModified: "2026-06-28T14:32:00.000Z",
    });

    // Unsaved indicator must clear
    await waitFor(() => {
      const fileNode = screen.getByTestId(
        "mappings-tree-node-payments-api-get_account_happy-path.json",
      );
      expect(fileNode.textContent).not.toContain("●");
    });
  });

  it("AC-10: Save shows a success toast after 200 PUT response", async () => {
    // RED: toast system not wired to save action
    const user = userEvent.setup();

    server.use(
      http.put("/api/mappings/*", () =>
        HttpResponse.json({
          success: true,
          data: {
            name: "get_account_happy-path.json",
            path: "payments-api/mappings/get_account_happy-path.json",
            lastModified: "2026-06-28T15:00:00.000Z",
            sizeBytes: MAPPING_CONTENT.length,
          },
        }),
      ),
    );

    render(
      <Wrapper>
        <MappingsPage />
      </Wrapper>,
    );

    await openFile(user);
    await makeDirty(user);
    await user.click(screen.getByTestId("mappings-btn-save"));

    // A success toast must appear
    await waitFor(() => {
      const toasts = document.querySelectorAll("[role='status'], [role='alert']");
      const hasSuccessToast = Array.from(toasts).some(
        (el) =>
          el.textContent?.toLowerCase().includes("saved") ||
          el.textContent?.toLowerCase().includes("success"),
      );
      expect(hasSuccessToast).toBe(true);
    });
  });

  // ─── AC-11: Discard reverts edits ────────────────────────────────────────

  it("AC-11: Discard reverts to last-saved content without a network call", async () => {
    // RED: discard button does not exist
    const user = userEvent.setup();
    let putCalled = false;

    server.use(
      http.put("/api/mappings/*", () => {
        putCalled = true;
        return HttpResponse.json({ success: true, data: {} });
      }),
    );

    render(
      <Wrapper>
        <MappingsPage />
      </Wrapper>,
    );

    await openFile(user);
    await makeDirty(user);

    // Verify it's dirty
    await waitFor(() => {
      expect(screen.getByTestId("mappings-btn-discard")).toBeEnabled();
    });

    await user.click(screen.getByTestId("mappings-btn-discard"));

    // No PUT must have been issued
    expect(putCalled).toBe(false);

    // Unsaved indicator must clear
    await waitFor(() => {
      const fileNode = screen.getByTestId(
        "mappings-tree-node-payments-api-get_account_happy-path.json",
      );
      expect(fileNode.textContent).not.toContain("●");
    });

    // Save and Discard must be disabled again
    expect(screen.getByTestId("mappings-btn-save")).toBeDisabled();
    expect(screen.getByTestId("mappings-btn-discard")).toBeDisabled();
  });
});

describe("Story 4.2 — MappingsPage: Create files", () => {
  beforeEach(() => {
    server.use(
      http.get("/api/mappings", () => HttpResponse.json(TREE_WITH_SERVICE)),
      http.get("/api/mappings/*", () => HttpResponse.json(FILE_CONTENT_RESPONSE)),
    );
  });

  // ─── AC-12: New Mapping / New Response buttons ────────────────────────────

  it("AC-12: '+ New Mapping' button opens the file-naming modal", async () => {
    // RED: button does not exist in placeholder
    const user = userEvent.setup();

    render(
      <Wrapper>
        <MappingsPage />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("mappings-btn-new-mapping")).toBeInTheDocument();
    });

    // First select a service so the service-selection step is skipped
    await user.click(screen.getByText("payments-api"));

    await user.click(screen.getByTestId("mappings-btn-new-mapping"));

    await waitFor(() => {
      expect(screen.getByTestId("mappings-modal-file-name")).toBeInTheDocument();
      expect(screen.getByTestId("mappings-input-filename")).toBeInTheDocument();
    });
  });

  it("AC-12: '+ New Response' button opens the file-naming modal", async () => {
    // RED: button does not exist in placeholder
    const user = userEvent.setup();

    render(
      <Wrapper>
        <MappingsPage />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("mappings-btn-new-response")).toBeInTheDocument();
    });

    await user.click(screen.getByText("payments-api"));
    await user.click(screen.getByTestId("mappings-btn-new-response"));

    await waitFor(() => {
      expect(screen.getByTestId("mappings-modal-file-name")).toBeInTheDocument();
    });
  });

  // ─── AC-13: No service selected → service dropdown first ─────────────────

  it("AC-13: New Mapping when no service is selected shows service-selection dropdown before naming modal", async () => {
    // RED: service-selection dropdown does not exist
    const user = userEvent.setup();

    render(
      <Wrapper>
        <MappingsPage />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("mappings-btn-new-mapping")).toBeInTheDocument();
    });

    // Click New Mapping WITHOUT selecting a service first
    await user.click(screen.getByTestId("mappings-btn-new-mapping"));

    // A service-selection dropdown must appear (not the naming modal)
    await waitFor(() => {
      // The file-naming modal must NOT appear immediately
      expect(
        screen.queryByTestId("mappings-modal-file-name"),
      ).not.toBeInTheDocument();

      // A service selector must be shown
      const serviceSelect =
        screen.queryByRole("combobox") ||
        screen.queryByRole("listbox") ||
        screen.queryByText(/select.*service/i);
      expect(serviceSelect).not.toBeNull();
    });
  });
});

describe("Story 4.2 — MappingsPage: Delete", () => {
  beforeEach(() => {
    server.use(
      http.get("/api/mappings", () => HttpResponse.json(TREE_WITH_SERVICE)),
      http.get("/api/mappings/*", () => HttpResponse.json(FILE_CONTENT_RESPONSE)),
    );
  });

  // ─── AC-14: Delete confirmation dialog — P0 ──────────────────────────────

  it("AC-14 (P0): clicking Delete shows confirmation dialog with exact copy text", async () => {
    // RED: delete button and confirmation dialog do not exist
    const user = userEvent.setup();

    render(
      <Wrapper>
        <MappingsPage />
      </Wrapper>,
    );

    await openFile(user);

    const deleteBtn = screen.getByTestId("mappings-btn-delete");
    await user.click(deleteBtn);

    // Confirmation dialog must appear
    await waitFor(() => {
      expect(screen.getByText("Delete this mapping? This removes the file from disk.")).toBeInTheDocument();
    });
  });

  it("AC-14: cancelling the delete dialog makes no DELETE request and closes the dialog", async () => {
    // RED: no confirmation dialog
    const user = userEvent.setup();
    let deleteCalled = false;

    server.use(
      http.delete("/api/mappings/*", () => {
        deleteCalled = true;
        return HttpResponse.json({ success: true, data: null });
      }),
    );

    render(
      <Wrapper>
        <MappingsPage />
      </Wrapper>,
    );

    await openFile(user);
    await user.click(screen.getByTestId("mappings-btn-delete"));

    await waitFor(() => {
      expect(screen.getByText("Delete this mapping? This removes the file from disk.")).toBeInTheDocument();
    });

    // Cancel the dialog
    const cancelBtn = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelBtn);

    // No DELETE must have been issued
    expect(deleteCalled).toBe(false);

    // Dialog closed
    await waitFor(() => {
      expect(
        screen.queryByText("Delete this mapping? This removes the file from disk."),
      ).not.toBeInTheDocument();
    });
  });

  it("AC-14: confirming delete issues DELETE /api/mappings/{path} and removes file from tree on 200", async () => {
    // RED: no optimistic delete; no network call on confirm
    const user = userEvent.setup();
    let deleteUrl = "";

    // After delete, return an empty tree
    let treeCallCount = 0;
    server.use(
      http.delete("/api/mappings/*", ({ request }) => {
        deleteUrl = request.url;
        return HttpResponse.json({ success: true, data: null });
      }),
      http.get("/api/mappings", () => {
        treeCallCount++;
        if (treeCallCount > 1) {
          // Second call (after delete): return empty tree
          return HttpResponse.json({
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
                      children: [],
                    },
                  ],
                },
              ],
            },
          });
        }
        return HttpResponse.json(TREE_WITH_SERVICE);
      }),
    );

    render(
      <Wrapper>
        <MappingsPage />
      </Wrapper>,
    );

    await openFile(user);
    await user.click(screen.getByTestId("mappings-btn-delete"));

    await waitFor(() => {
      expect(screen.getByText("Delete this mapping? This removes the file from disk.")).toBeInTheDocument();
    });

    // Confirm deletion (find the confirm button — it may say "Delete" or "Confirm")
    const confirmBtn = screen.getByRole("button", {
      name: /delete|confirm/i,
    });
    await user.click(confirmBtn);

    // DELETE request must have been issued
    await waitFor(() => {
      expect(deleteUrl).toContain("payments-api");
    });

    // File must disappear from the tree
    await waitFor(() => {
      expect(
        screen.queryByTestId(
          "mappings-tree-node-payments-api-get_account_happy-path.json",
        ),
      ).not.toBeInTheDocument();
    });
  });
});

describe("Story 4.2 — MappingsPage: Rename & Duplicate", () => {
  beforeEach(() => {
    server.use(
      http.get("/api/mappings", () => HttpResponse.json(TREE_WITH_SERVICE)),
      http.get("/api/mappings/*", () => HttpResponse.json(FILE_CONTENT_RESPONSE)),
    );
  });

  // ─── AC-15: Rename pre-fills modal ───────────────────────────────────────

  it("AC-15: Rename opens naming modal pre-filled with current filename", async () => {
    // RED: rename button and modal do not exist
    const user = userEvent.setup();

    render(
      <Wrapper>
        <MappingsPage />
      </Wrapper>,
    );

    await openFile(user);

    await user.click(screen.getByTestId("mappings-btn-rename"));

    await waitFor(() => {
      expect(screen.getByTestId("mappings-modal-file-name")).toBeInTheDocument();
      const filenameInput = screen.getByTestId("mappings-input-filename");
      expect(filenameInput).toHaveValue("get_account_happy-path.json");
    });
  });

  // ─── AC-15: Duplicate ────────────────────────────────────────────────────

  it("AC-15: Duplicate button creates a copy with a _copy suffix via GET→POST", async () => {
    // RED: duplicate button does not exist
    const user = userEvent.setup();
    let postPath = "";

    server.use(
      http.post("/api/mappings", async ({ request }) => {
        const body = (await request.json()) as { path: string; content: string };
        postPath = body.path;
        return HttpResponse.json(
          {
            success: true,
            data: {
              name: "get_account_happy-path_copy.json",
              path: body.path,
              lastModified: "2026-06-28T15:00:00.000Z",
              sizeBytes: MAPPING_CONTENT.length,
            },
          },
          { status: 201 },
        );
      }),
    );

    render(
      <Wrapper>
        <MappingsPage />
      </Wrapper>,
    );

    await openFile(user);

    await user.click(screen.getByTestId("mappings-btn-duplicate"));

    await waitFor(() => {
      expect(postPath).toContain("_copy");
      expect(postPath).toContain("payments-api/mappings");
    });
  });
});

describe("Story 4.2 — MappingsPage: Error handling", () => {
  beforeEach(() => {
    server.use(
      http.get("/api/mappings", () => HttpResponse.json(TREE_WITH_SERVICE)),
      http.get("/api/mappings/*", () => HttpResponse.json(FILE_CONTENT_RESPONSE)),
    );
  });

  // ─── AC-16: Failed write shows error toast ───────────────────────────────

  it("AC-16: PUT failure shows error toast with actionable message; state is not mutated", async () => {
    // RED: error handling does not exist
    const user = userEvent.setup();

    server.use(
      http.put("/api/mappings/*", () =>
        HttpResponse.json(
          {
            success: false,
            error: {
              code: "MAPPING_WRITE_FAILED",
              message: "Disk write failed: permission denied",
            },
          },
          { status: 500 },
        ),
      ),
    );

    render(
      <Wrapper>
        <MappingsPage />
      </Wrapper>,
    );

    await openFile(user);
    await makeDirty(user);

    await user.click(screen.getByTestId("mappings-btn-save"));

    // Error toast must appear with actionable message
    await waitFor(() => {
      const toasts = document.querySelectorAll("[role='alert']");
      const hasErrorToast = Array.from(toasts).some(
        (el) =>
          el.textContent?.includes("Failed to save") ||
          el.textContent?.includes("permission denied") ||
          el.textContent?.toLowerCase().includes("error"),
      );
      expect(hasErrorToast).toBe(true);
    });

    // File must still show unsaved indicator (state not mutated)
    const fileNode = screen.getByTestId(
      "mappings-tree-node-payments-api-get_account_happy-path.json",
    );
    expect(fileNode.textContent).toContain("●");
  });
});

describe("Story 4.2 — MappingsPage: Navigation guard", () => {
  beforeEach(() => {
    server.use(
      http.get("/api/mappings", () => HttpResponse.json(TREE_WITH_SERVICE)),
      http.get("/api/mappings/*", () => HttpResponse.json(FILE_CONTENT_RESPONSE)),
    );
  });

  // ─── AC-18: useBlocker confirmation dialog ────────────────────────────────

  it("AC-18: navigation away from /mappings with unsaved edits shows discard-confirm dialog", async () => {
    // RED: useBlocker not implemented in placeholder
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/mappings", "/services"]} initialIndex={0}>
        <QueryClientProvider client={makeQc()}>
          <MappingsPage />
        </QueryClientProvider>
      </MemoryRouter>,
    );

    await openFile(user);
    await makeDirty(user);

    // Simulate navigation (e.g., back button or link click)
    // In MemoryRouter context, we test that the blocker dialog appears
    // when the router attempts navigation
    window.history.pushState({}, "", "/services");

    await waitFor(() => {
      expect(
        screen.getByTestId("mappings-modal-discard-confirm"),
      ).toBeInTheDocument();
    });

    // Dialog must have Discard and Stay buttons
    expect(screen.getByTestId("mappings-btn-discard-confirm")).toBeInTheDocument();
    expect(screen.getByTestId("mappings-btn-discard-cancel")).toBeInTheDocument();
  });

  it("AC-18: navigation away without unsaved edits does NOT show blocker dialog", async () => {
    // RED: useBlocker is not implemented
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/mappings"]} initialIndex={0}>
        <QueryClientProvider client={makeQc()}>
          <MappingsPage />
        </QueryClientProvider>
      </MemoryRouter>,
    );

    await openFile(user);
    // Do NOT make any edits

    window.history.pushState({}, "", "/services");

    // Give the component a moment; no blocker dialog should appear
    await new Promise((r) => setTimeout(r, 100));

    expect(
      screen.queryByTestId("mappings-modal-discard-confirm"),
    ).not.toBeInTheDocument();
  });
});
