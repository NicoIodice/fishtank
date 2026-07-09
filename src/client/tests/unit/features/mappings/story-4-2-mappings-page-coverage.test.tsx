/**
 * Coverage-gap tests — Story 4.2: MappingsPage
 * Targets the uncovered branches/lines in MappingsPage.tsx:
 *   - handleSaveSuccess (updateLastKnownModified)
 *   - handleDeleteSuccess (clears active file)
 *   - handleRenameSuccess (clears active file)
 *   - handleDirtyChange when no activeFilePath
 *   - handleFileNameConfirm via service-selected flow (pendingServicePath)
 *   - handleFileNameConfirm with newFileType="response"
 *   - ServiceSelectModal cancel (closes modal, clears newFileType)
 *   - FileNameModal cancel (closes modal, clears state)
 *   - handleEditBufferChange
 *   - createFileMutation onError (ApiError and generic)
 *   - empty-state with selectedServicePath set (no files empty state)
 *   - PageToastList dismiss button
 *   - handleNewResponseClick when service is selected (goes to FileNameModal)
 */

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

import { MappingsPage } from "@/features/mappings/pages/MappingsPage";
import { server } from "@/test/mocks/server";
import { http, HttpResponse } from "msw";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MAPPING_CONTENT = JSON.stringify({
  request: { method: "GET", url: "/api/account" },
  response: { status: 200, body: "ok" },
});

const TREE_WITH_FILE = {
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
                path: "payments-api/mappings/get_account.json",
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
    name: "get_account.json",
    path: "payments-api/mappings/get_account.json",
    lastModified: "2026-06-28T14:32:00.000Z",
    sizeBytes: MAPPING_CONTENT.length,
  },
};

const TREE_EMPTY_SERVICE = {
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
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeQc() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function renderPage(qc?: QueryClient) {
  const client = qc ?? makeQc();
  return render(
    <MemoryRouter initialEntries={["/mappings"]}>
      <QueryClientProvider client={client}>
        <MappingsPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

async function waitForTree() {
  await waitFor(() => {
    expect(screen.getByText("payments-api")).toBeInTheDocument();
  });
}

async function openFile(user: ReturnType<typeof userEvent.setup>) {
  await waitForTree();
  const fileNode = screen.getByTestId(
    "mappings-tree-node-payments-api-get_account.json",
  );
  await user.click(fileNode);
  await waitFor(() => {
    expect(screen.getByTestId("mappings-breadcrumb-editor")).toBeInTheDocument();
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("MappingsPage — handleDeleteSuccess clears active file", () => {
  beforeEach(() => {
    server.use(
      http.get("/api/mappings", () => HttpResponse.json(TREE_WITH_FILE)),
      http.get("/api/mappings/*", () => HttpResponse.json(FILE_CONTENT_RESPONSE)),
    );
  });

  it("after successful delete, editor pane shows the empty state", async () => {
    const user = userEvent.setup();

    // After delete, return empty tree
    let treeCallCount = 0;
    server.use(
      http.get("/api/mappings", () => {
        treeCallCount++;
        if (treeCallCount > 1) {
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
        return HttpResponse.json(TREE_WITH_FILE);
      }),
      http.delete("/api/mappings/*", () =>
        HttpResponse.json({ success: true, data: null }),
      ),
    );

    renderPage();
    await openFile(user);

    // Click delete, confirm
    await user.click(screen.getByTestId("mappings-btn-delete"));
    await waitFor(() => {
      expect(screen.getByText(/Delete this mapping/i)).toBeInTheDocument();
    });
    const confirmBtn = screen.getByRole("button", { name: /confirm delete/i });
    await user.click(confirmBtn);

    // Editor should close — empty state should appear
    await waitFor(() => {
      expect(
        screen.queryByTestId("mappings-breadcrumb-editor"),
      ).not.toBeInTheDocument();
    });
  });
});

describe("MappingsPage — handleRenameSuccess clears active file", () => {
  beforeEach(() => {
    server.use(
      http.get("/api/mappings", () => HttpResponse.json(TREE_WITH_FILE)),
      http.get("/api/mappings/*", () => HttpResponse.json(FILE_CONTENT_RESPONSE)),
    );
  });

  it("after successful rename, editor closes (no active file)", async () => {
    const user = userEvent.setup();

    server.use(
      http.post("/api/mappings", () =>
        HttpResponse.json(
          {
            success: true,
            data: {
              name: "renamed.json",
              path: "payments-api/mappings/renamed.json",
              lastModified: "2026-06-28T15:00:00.000Z",
              sizeBytes: 100,
            },
          },
          { status: 201 },
        ),
      ),
      http.delete("/api/mappings/*", () =>
        HttpResponse.json({ success: true, data: null }),
      ),
    );

    renderPage();
    await openFile(user);

    // Click rename
    await user.click(screen.getByTestId("mappings-btn-rename"));
    await waitFor(() => {
      expect(screen.getByTestId("mappings-modal-file-name")).toBeInTheDocument();
    });

    // Clear and type new name
    const input = screen.getByTestId("mappings-input-filename");
    await user.clear(input);
    await user.type(input, "renamed.json");

    // Confirm
    const confirmBtn = screen.getByRole("button", { name: /confirm/i });
    await user.click(confirmBtn);

    // Editor should close
    await waitFor(() => {
      expect(
        screen.queryByTestId("mappings-breadcrumb-editor"),
      ).not.toBeInTheDocument();
    });
  });
});

describe("MappingsPage — create file flow via service selector", () => {
  beforeEach(() => {
    server.use(
      http.get("/api/mappings", () => HttpResponse.json(TREE_WITH_FILE)),
      http.get("/api/mappings/*", () => HttpResponse.json(FILE_CONTENT_RESPONSE)),
    );
  });

  it("New Mapping with no service → service selector → file name modal → POST creates file", async () => {
    const user = userEvent.setup();
    let postBody: unknown = null;

    server.use(
      http.post("/api/mappings", async ({ request }) => {
        postBody = await request.json();
        return HttpResponse.json(
          {
            success: true,
            data: {
              name: "new-file.json",
              path: "payments-api/mappings/new-file.json",
              lastModified: "2026-06-28T15:00:00.000Z",
              sizeBytes: 100,
            },
          },
          { status: 201 },
        );
      }),
    );

    renderPage();
    await waitForTree();

    // Click New Mapping without selecting a service
    const newMappingBtn = screen.getByTestId("mappings-btn-new-mapping");
    await user.click(newMappingBtn);

    // Service selector should appear
    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: /select.*service/i })).toBeInTheDocument();
    });

    // Select the service
    const serviceSelect = screen.getByRole("combobox", { name: /select service/i });
    await user.selectOptions(serviceSelect, "payments-api");

    // Click Continue
    const continueBtn = screen.getByRole("button", { name: /continue/i });
    await user.click(continueBtn);

    // File name modal should appear
    await waitFor(() => {
      expect(screen.getByTestId("mappings-modal-file-name")).toBeInTheDocument();
    });

    // Enter a filename
    const filenameInput = screen.getByTestId("mappings-input-filename");
    await user.type(filenameInput, "new-file.json");

    // Confirm
    const confirmBtn = screen.getByRole("button", { name: /confirm/i });
    await user.click(confirmBtn);

    // POST should have been called with correct path
    await waitFor(() => {
      expect(postBody).toMatchObject({
        path: "payments-api/mappings/new-file.json",
        content: expect.any(String),
      });
    });
  });

  it("New Response with service selected → file name modal → POST creates file in responses/ folder", async () => {
    const user = userEvent.setup();
    let postBody: unknown = null;

    server.use(
      http.post("/api/mappings", async ({ request }) => {
        postBody = await request.json();
        return HttpResponse.json(
          {
            success: true,
            data: {
              name: "response-file.json",
              path: "payments-api/responses/response-file.json",
              lastModified: "2026-06-28T15:00:00.000Z",
              sizeBytes: 100,
            },
          },
          { status: 201 },
        );
      }),
    );

    renderPage();
    await waitForTree();

    // Select service first
    await user.click(screen.getByText("payments-api"));

    // Click New Response
    const newResponseBtn = screen.getByTestId("mappings-btn-new-response");
    await user.click(newResponseBtn);

    // File name modal should appear
    await waitFor(() => {
      expect(screen.getByTestId("mappings-modal-file-name")).toBeInTheDocument();
    });

    // Type filename
    const filenameInput = screen.getByTestId("mappings-input-filename");
    await user.type(filenameInput, "response-file.json");

    // Confirm
    const confirmBtn = screen.getByRole("button", { name: /confirm/i });
    await user.click(confirmBtn);

    // POST must have been called with responses/ sub-folder
    await waitFor(() => {
      expect(postBody).toMatchObject({
        path: "payments-api/responses/response-file.json",
      });
    });
  });
});

describe("MappingsPage — ServiceSelectModal cancel", () => {
  beforeEach(() => {
    server.use(
      http.get("/api/mappings", () => HttpResponse.json(TREE_WITH_FILE)),
    );
  });

  it("cancelling the service selector closes the modal without showing file name modal", async () => {
    const user = userEvent.setup();

    renderPage();
    await waitForTree();

    // Click New Mapping without service
    await user.click(screen.getByTestId("mappings-btn-new-mapping"));
    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: /select.*service/i })).toBeInTheDocument();
    });

    // Cancel
    const cancelBtn = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelBtn);

    // Both modals closed
    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: /select.*service/i }),
      ).not.toBeInTheDocument();
    });
    expect(
      screen.queryByTestId("mappings-modal-file-name"),
    ).not.toBeInTheDocument();
  });
});

describe("MappingsPage — FileNameModal cancel", () => {
  beforeEach(() => {
    server.use(
      http.get("/api/mappings", () => HttpResponse.json(TREE_WITH_FILE)),
    );
  });

  it("cancelling the file name modal closes it without creating a file", async () => {
    const user = userEvent.setup();
    let postCalled = false;

    server.use(
      http.post("/api/mappings", () => {
        postCalled = true;
        return HttpResponse.json({ success: true, data: {} }, { status: 201 });
      }),
    );

    renderPage();
    await waitForTree();

    // Select service then open New Mapping modal
    await user.click(screen.getByText("payments-api"));
    await user.click(screen.getByTestId("mappings-btn-new-mapping"));

    await waitFor(() => {
      expect(screen.getByTestId("mappings-modal-file-name")).toBeInTheDocument();
    });

    // Cancel
    const cancelBtn = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelBtn);

    await waitFor(() => {
      expect(
        screen.queryByTestId("mappings-modal-file-name"),
      ).not.toBeInTheDocument();
    });
    expect(postCalled).toBe(false);
  });
});

describe("MappingsPage — createFileMutation error handling", () => {
  beforeEach(() => {
    server.use(
      http.get("/api/mappings", () => HttpResponse.json(TREE_WITH_FILE)),
    );
  });

  it("POST failure shows an error toast with actionable message", async () => {
    const user = userEvent.setup();

    server.use(
      http.post("/api/mappings", () =>
        HttpResponse.json(
          {
            success: false,
            error: {
              code: "MAPPING_FILE_EXISTS",
              message: "A file with that name already exists",
            },
          },
          { status: 409 },
        ),
      ),
    );

    renderPage();
    await waitForTree();

    // Select service and open modal
    await user.click(screen.getByText("payments-api"));
    await user.click(screen.getByTestId("mappings-btn-new-mapping"));

    await waitFor(() => {
      expect(screen.getByTestId("mappings-modal-file-name")).toBeInTheDocument();
    });

    // Enter filename and confirm
    const filenameInput = screen.getByTestId("mappings-input-filename");
    await user.type(filenameInput, "existing-file.json");
    await user.click(screen.getByRole("button", { name: /confirm/i }));

    // Error toast should appear
    await waitFor(() => {
      const alerts = document.querySelectorAll("[role='alert']");
      const hasError = Array.from(alerts).some(
        (el) =>
          el.textContent?.includes("Failed") ||
          el.textContent?.includes("already exists"),
      );
      expect(hasError).toBe(true);
    });
  });

  it("non-ApiError on POST shows generic error toast", async () => {
    const user = userEvent.setup();

    server.use(
      http.post("/api/mappings", () => HttpResponse.error()),
    );

    renderPage();
    await waitForTree();

    // Select service and open modal
    await user.click(screen.getByText("payments-api"));
    await user.click(screen.getByTestId("mappings-btn-new-mapping"));

    await waitFor(() => {
      expect(screen.getByTestId("mappings-modal-file-name")).toBeInTheDocument();
    });

    const filenameInput = screen.getByTestId("mappings-input-filename");
    await user.type(filenameInput, "new-file.json");
    await user.click(screen.getByRole("button", { name: /confirm/i }));

    // Error toast
    await waitFor(() => {
      const alerts = document.querySelectorAll("[role='alert']");
      expect(alerts.length).toBeGreaterThan(0);
    });
  });
});

describe("MappingsPage — empty state when service is selected but no files", () => {
  it("shows 'No mappings yet' when service is selected with no files", async () => {
    const user = userEvent.setup();

    server.use(
      http.get("/api/mappings", () => HttpResponse.json(TREE_EMPTY_SERVICE)),
    );

    renderPage();
    await waitForTree();

    // Click service folder to select it
    await user.click(screen.getByText("payments-api"));

    // Should see 'No mappings yet' empty state
    await waitFor(() => {
      expect(screen.getByText(/No mappings yet/i)).toBeInTheDocument();
    });

    // Empty state buttons also exist
    expect(
      screen.getByTestId("mappings-btn-new-mapping-empty"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("mappings-btn-new-response-empty"),
    ).toBeInTheDocument();
  });

  it("clicking New Mapping from empty state opens file name modal", async () => {
    const user = userEvent.setup();

    server.use(
      http.get("/api/mappings", () => HttpResponse.json(TREE_EMPTY_SERVICE)),
    );

    renderPage();
    await waitForTree();

    await user.click(screen.getByText("payments-api"));

    await waitFor(() => {
      expect(screen.getByTestId("mappings-btn-new-mapping-empty")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("mappings-btn-new-mapping-empty"));

    await waitFor(() => {
      expect(screen.getByTestId("mappings-modal-file-name")).toBeInTheDocument();
    });
  });

  it("clicking New Response from empty state opens file name modal", async () => {
    const user = userEvent.setup();

    server.use(
      http.get("/api/mappings", () => HttpResponse.json(TREE_EMPTY_SERVICE)),
    );

    renderPage();
    await waitForTree();

    await user.click(screen.getByText("payments-api"));

    await waitFor(() => {
      expect(screen.getByTestId("mappings-btn-new-response-empty")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("mappings-btn-new-response-empty"));

    await waitFor(() => {
      expect(screen.getByTestId("mappings-modal-file-name")).toBeInTheDocument();
    });
  });
});

describe("MappingsPage — PageToastList dismiss", () => {
  beforeEach(() => {
    server.use(
      http.get("/api/mappings", () => HttpResponse.json(TREE_WITH_FILE)),
    );
  });

  it("clicking Dismiss on a page-level toast removes it", async () => {
    const user = userEvent.setup();

    // Trigger a create-file success toast
    server.use(
      http.post("/api/mappings", () =>
        HttpResponse.json(
          {
            success: true,
            data: {
              name: "new-file.json",
              path: "payments-api/mappings/new-file.json",
              lastModified: new Date().toISOString(),
              sizeBytes: 42,
            },
          },
          { status: 201 },
        ),
      ),
    );

    renderPage();
    await waitForTree();

    // Select service, open modal, create file
    await user.click(screen.getByText("payments-api"));
    await user.click(screen.getByTestId("mappings-btn-new-mapping"));

    await waitFor(() => {
      expect(screen.getByTestId("mappings-modal-file-name")).toBeInTheDocument();
    });

    await user.type(screen.getByTestId("mappings-input-filename"), "new-file.json");
    await user.click(screen.getByRole("button", { name: /confirm/i }));

    // Wait for toast to appear
    await waitFor(() => {
      const toasts = document.querySelectorAll("[role='status'], [role='alert']");
      const hasCreateToast = Array.from(toasts).some(
        (el) =>
          el.textContent?.includes("Created") ||
          el.textContent?.includes("new-file"),
      );
      expect(hasCreateToast).toBe(true);
    });

    // Dismiss the toast
    const dismissBtn = screen.getByRole("button", { name: /dismiss/i });
    await user.click(dismissBtn);

    await waitFor(() => {
      const toasts = document.querySelectorAll("[role='status'], [role='alert']");
      const stillHasToast = Array.from(toasts).some(
        (el) =>
          el.textContent?.includes("Created") ||
          el.textContent?.includes("new-file"),
      );
      expect(stillHasToast).toBe(false);
    });
  });
});

describe("MappingsPage — handleSaveSuccess updates lastKnownModified", () => {
  beforeEach(() => {
    server.use(
      http.get("/api/mappings", () => HttpResponse.json(TREE_WITH_FILE)),
      http.get("/api/mappings/*", () => HttpResponse.json(FILE_CONTENT_RESPONSE)),
    );
  });

  it("after save, unsaved indicator clears from tree node", async () => {
    const user = userEvent.setup();

    server.use(
      http.put("/api/mappings/*", () =>
        HttpResponse.json({
          success: true,
          data: {
            name: "get_account.json",
            path: "payments-api/mappings/get_account.json",
            lastModified: "2026-06-28T15:00:00.000Z",
            sizeBytes: MAPPING_CONTENT.length,
          },
        }),
      ),
    );

    renderPage();
    await openFile(user);

    // Make dirty
    await user.click(screen.getByTestId("mappings-tab-form"));
    const statusInput = screen.getByLabelText(/status/i);
    await user.clear(statusInput);
    await user.type(statusInput, "418");

    // Save
    await user.click(screen.getByTestId("mappings-btn-save"));

    // Unsaved indicator clears
    await waitFor(() => {
      const fileNode = screen.getByTestId(
        "mappings-tree-node-payments-api-get_account.json",
      );
      expect(fileNode.textContent).not.toContain("●");
    });
  });
});

describe("MappingsPage — handleDirtyChange path", () => {
  beforeEach(() => {
    server.use(
      http.get("/api/mappings", () => HttpResponse.json(TREE_WITH_FILE)),
      http.get("/api/mappings/*", () => HttpResponse.json(FILE_CONTENT_RESPONSE)),
    );
  });

  it("dirty tracking sets dirtyFilePaths for the active file", async () => {
    const user = userEvent.setup();

    renderPage();
    await openFile(user);

    // Make dirty — this exercises handleDirtyChange with activeFilePath set
    await user.click(screen.getByTestId("mappings-tab-form"));
    const statusInput = screen.getByLabelText(/status/i);
    await user.clear(statusInput);
    await user.type(statusInput, "500");

    // The tree node must show dirty indicator
    await waitFor(() => {
      const fileNode = screen.getByTestId(
        "mappings-tree-node-payments-api-get_account.json",
      );
      const isDirty =
        fileNode.textContent?.includes("●") ||
        fileNode.hasAttribute("data-dirty");
      expect(isDirty).toBe(true);
    });
  });
});
