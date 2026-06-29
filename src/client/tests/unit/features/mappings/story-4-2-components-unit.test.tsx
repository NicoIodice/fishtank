/**
 * Focused unit tests — Story 4.2: Component coverage gap-fill
 * Layer: Frontend component (Vitest + React Testing Library)
 *
 * Purpose: push FileNameModal, FolderTree, ServiceSelectModal, DeleteConfirmDialog,
 * and NavigationGuard above the coverage thresholds by exercising every uncovered
 * branch and line identified in the coverage report.
 *
 * Uncovered paths targeted:
 *   FileNameModal  — handleSubmit (lines 33-35), trim-disabled button (line 79/109)
 *   FolderTree     — TreeNodeItem handleKeyDown Space (lines 80-82)
 *                  — FolderTree handleKeyDown ArrowDown/ArrowUp/Enter (lines 181-208)
 *   ServiceSelectModal — handleConfirm no-selection branch (lines 26-27), services.find (line 62)
 *   NavigationGuard    — blocker.proceed (line 113), fallback proceed (line 154),
 *                        fallback onDiscard (lines 189-195)
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter, createMemoryRouter, RouterProvider, Link } from "react-router-dom";

import { FileNameModal } from "@/features/mappings/components/FileNameModal";
import { ServiceSelectModal } from "@/features/mappings/components/ServiceSelectModal";
import { DeleteConfirmDialog } from "@/features/mappings/components/DeleteConfirmDialog";
import { FolderTree } from "@/features/mappings/components/FolderTree";
import { NavigationGuard } from "@/features/mappings/components/NavigationGuard";
import type { FolderTree as FolderTreeType, TreeNode } from "@/features/mappings/types/mappings";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TREE: FolderTreeType = {
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
              sizeBytes: 1024,
              children: null,
            },
          ],
        },
      ],
    },
  ],
};


const SERVICES: TreeNode[] = [
  {
    name: "payments-api",
    type: "folder",
    path: "payments-api",
    lastModified: null,
    sizeBytes: null,
    children: null,
  },
  {
    name: "orders-api",
    type: "folder",
    path: "orders-api",
    lastModified: null,
    sizeBytes: null,
    children: null,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// FileNameModal
// ─────────────────────────────────────────────────────────────────────────────

describe("FileNameModal — uncovered paths", () => {
  it("does not render when isOpen=false", () => {
    render(
      <FileNameModal isOpen={false} onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(screen.queryByTestId("mappings-modal-file-name")).not.toBeInTheDocument();
  });

  it("renders dialog when isOpen=true", () => {
    render(
      <FileNameModal isOpen={true} onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(screen.getByTestId("mappings-modal-file-name")).toBeInTheDocument();
  });

  it("Confirm button is disabled when input is empty or only whitespace", () => {
    render(
      <FileNameModal isOpen={true} onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );
    const confirmBtn = screen.getByRole("button", { name: /confirm/i });
    expect(confirmBtn).toBeDisabled();
  });

  it("Confirm button becomes enabled once a non-whitespace value is typed", async () => {
    const user = userEvent.setup();
    render(
      <FileNameModal isOpen={true} onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );
    const input = screen.getByTestId("mappings-input-filename");
    const confirmBtn = screen.getByRole("button", { name: /confirm/i });

    await user.type(input, "my-file.json");
    expect(confirmBtn).toBeEnabled();
  });

  it("handleSubmit: calls onConfirm with trimmed value when form is submitted (line 33-35)", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <FileNameModal isOpen={true} onConfirm={onConfirm} onCancel={vi.fn()} />,
    );

    const input = screen.getByTestId("mappings-input-filename");
    await user.type(input, "  new-mapping.json  ");

    // Submit via pressing Enter (which submits the form)
    await user.keyboard("{Enter}");

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onConfirm).toHaveBeenCalledWith("new-mapping.json");
  });

  it("handleSubmit: clicking the Confirm button submits the form and calls onConfirm with trimmed value", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <FileNameModal isOpen={true} onConfirm={onConfirm} onCancel={vi.fn()} />,
    );

    const input = screen.getByTestId("mappings-input-filename");
    await user.type(input, "hello.json");

    const confirmBtn = screen.getByRole("button", { name: /confirm/i });
    await user.click(confirmBtn);

    expect(onConfirm).toHaveBeenCalledWith("hello.json");
  });

  it("handleSubmit: does NOT call onConfirm when value is only whitespace", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <FileNameModal isOpen={true} onConfirm={onConfirm} onCancel={vi.fn()} />,
    );

    const input = screen.getByTestId("mappings-input-filename");
    await user.type(input, "   ");

    // Button should still be disabled (trim() is empty), so form submit via
    // fireEvent bypasses the disabled guard and exercises the guard inside handleSubmit
    const form = input.closest("form")!;
    fireEvent.submit(form);

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("Cancel button calls onCancel", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(
      <FileNameModal isOpen={true} onConfirm={vi.fn()} onCancel={onCancel} />,
    );

    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("initialValue pre-fills the input", () => {
    render(
      <FileNameModal
        isOpen={true}
        initialValue="existing-file.json"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    const input = screen.getByTestId("mappings-input-filename") as HTMLInputElement;
    expect(input.value).toBe("existing-file.json");
  });

  it("input value resets to initialValue when isOpen toggles", async () => {
    const { rerender } = render(
      <FileNameModal isOpen={true} initialValue="original.json" onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );

    // (initial input captured here for context — value is checked after rerender)
    screen.getByTestId("mappings-input-filename");

    // Close modal
    rerender(
      <FileNameModal isOpen={false} initialValue="original.json" onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );

    // Re-open with new initial value
    rerender(
      <FileNameModal isOpen={true} initialValue="renamed.json" onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );

    const refreshedInput = screen.getByTestId("mappings-input-filename") as HTMLInputElement;
    expect(refreshedInput.value).toBe("renamed.json");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ServiceSelectModal
// ─────────────────────────────────────────────────────────────────────────────

describe("ServiceSelectModal — uncovered paths", () => {
  it("does not render when isOpen=false", () => {
    render(
      <ServiceSelectModal
        isOpen={false}
        services={SERVICES}
        onSelect={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders dialog when isOpen=true", () => {
    render(
      <ServiceSelectModal
        isOpen={true}
        services={SERVICES}
        onSelect={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByRole("dialog", { name: /select service/i })).toBeInTheDocument();
  });

  it("Continue button is disabled when no service is selected", () => {
    render(
      <ServiceSelectModal
        isOpen={true}
        services={SERVICES}
        onSelect={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /continue/i })).toBeDisabled();
  });

  it("handleConfirm: does NOT call onSelect when no service is chosen (lines 26-27 — if(svc) branch is false)", () => {
    const onSelect = vi.fn();
    render(
      <ServiceSelectModal
        isOpen={true}
        services={SERVICES}
        onSelect={onSelect}
        onCancel={vi.fn()}
      />,
    );
    // Directly fire click on Continue without selecting; button is disabled
    // but we verify onSelect isn't called under any circumstance when selected=""
    const continueBtn = screen.getByRole("button", { name: /continue/i });
    // The button is disabled so userEvent won't fire it; use fireEvent to bypass
    fireEvent.click(continueBtn);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("handleConfirm: calls onSelect with the matched service node when a service is selected (line 62 — services.find)", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <ServiceSelectModal
        isOpen={true}
        services={SERVICES}
        onSelect={onSelect}
        onCancel={vi.fn()}
      />,
    );

    // Select "payments-api" from the dropdown
    const select = screen.getByRole("combobox", { name: /select service/i });
    await user.selectOptions(select, "payments-api");

    const continueBtn = screen.getByRole("button", { name: /continue/i });
    expect(continueBtn).toBeEnabled();
    await user.click(continueBtn);

    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith(SERVICES[0]);
  });

  it("handleConfirm: calls onSelect with the correct node for the second service", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <ServiceSelectModal
        isOpen={true}
        services={SERVICES}
        onSelect={onSelect}
        onCancel={vi.fn()}
      />,
    );

    const select = screen.getByRole("combobox", { name: /select service/i });
    await user.selectOptions(select, "orders-api");

    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(onSelect).toHaveBeenCalledWith(SERVICES[1]);
  });

  it("Cancel button calls onCancel", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(
      <ServiceSelectModal
        isOpen={true}
        services={SERVICES}
        onSelect={vi.fn()}
        onCancel={onCancel}
      />,
    );

    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("renders all provided services as options", () => {
    render(
      <ServiceSelectModal
        isOpen={true}
        services={SERVICES}
        onSelect={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByRole("option", { name: "payments-api" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "orders-api" })).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DeleteConfirmDialog
// ─────────────────────────────────────────────────────────────────────────────

describe("DeleteConfirmDialog — cancel / confirm flows", () => {
  it("does not render when isOpen=false", () => {
    render(
      <DeleteConfirmDialog isOpen={false} onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders dialog when isOpen=true", () => {
    render(
      <DeleteConfirmDialog isOpen={true} onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(screen.getByRole("dialog", { name: /confirm delete/i })).toBeInTheDocument();
  });

  it("Cancel button calls onCancel", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(
      <DeleteConfirmDialog isOpen={true} onConfirm={vi.fn()} onCancel={onCancel} />,
    );

    await user.click(screen.getByRole("button", { name: /^cancel$/i }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("Confirm delete button calls onConfirm", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <DeleteConfirmDialog isOpen={true} onConfirm={onConfirm} onCancel={vi.fn()} />,
    );

    await user.click(screen.getByRole("button", { name: /confirm delete/i }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FolderTree — keyboard navigation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * IMPORTANT: FolderTree.tsx has a module-level `sessionExpandState` Map that
 * persists across tests in the same worker (isolate:false).  Any test that
 * collapses a folder writes to that Map, polluting later tests that use the
 * same node paths.
 *
 * Mitigation: every test that mutates expand state uses a UNIQUE service/file
 * path that is never referenced by any other test in this file.  Tests that
 * just observe (dirty indicator, click) must either use unique paths OR use
 * a path that is guaranteed to already be expanded (i.e. has never been
 * collapsed in a prior test within this run).
 */

// Unique trees used only by tests that mutate expand state
const TREE_SPACE_FOLDER: FolderTreeType = {
  mocksRoot: "/var/mocks",
  children: [
    {
      name: "space-test-svc",
      type: "folder",
      path: "space-test-svc",
      lastModified: null,
      sizeBytes: null,
      children: [
        {
          name: "mappings",
          type: "folder",
          path: "space-test-svc/mappings",
          lastModified: null,
          sizeBytes: null,
          children: [
            {
              name: "space-file.json",
              type: "file",
              path: "space-test-svc/mappings/space-file.json",
              lastModified: "2026-06-29T10:00:00.000Z",
              sizeBytes: 100,
              children: null,
            },
          ],
        },
      ],
    },
  ],
};

// Flat tree with top-level service folders only (no children) — for ArrowDown/Up tests.
// No children means no sessionExpandState interference.
const FLAT_TWO_SERVICE_TREE: FolderTreeType = {
  mocksRoot: "/var/mocks",
  children: [
    {
      name: "flat-svc-one",
      type: "folder",
      path: "flat-svc-one",
      lastModified: null,
      sizeBytes: null,
      children: [],  // explicitly empty — no file children to expand/collapse
    },
    {
      name: "flat-svc-two",
      type: "folder",
      path: "flat-svc-two",
      lastModified: null,
      sizeBytes: null,
      children: [],
    },
  ],
};

// Tree for dirty/click tests — uses unique paths not touched by any expand-state test
const TREE_DIRTY: FolderTreeType = {
  mocksRoot: "/var/mocks",
  children: [
    {
      name: "dirty-test-svc",
      type: "folder",
      path: "dirty-test-svc",
      lastModified: null,
      sizeBytes: null,
      children: [
        {
          name: "mappings",
          type: "folder",
          path: "dirty-test-svc/mappings",
          lastModified: null,
          sizeBytes: null,
          children: [
            {
              name: "dirty-file.json",
              type: "file",
              path: "dirty-test-svc/mappings/dirty-file.json",
              lastModified: "2026-06-29T10:00:00.000Z",
              sizeBytes: 100,
              children: null,
            },
          ],
        },
      ],
    },
  ],
};

// Tree for Enter-key / onFileClick tests — unique paths
const TREE_ENTER: FolderTreeType = {
  mocksRoot: "/var/mocks",
  children: [
    {
      name: "enter-test-svc",
      type: "folder",
      path: "enter-test-svc",
      lastModified: null,
      sizeBytes: null,
      children: [
        {
          name: "mappings",
          type: "folder",
          path: "enter-test-svc/mappings",
          lastModified: null,
          sizeBytes: null,
          children: [
            {
              name: "enter-file.json",
              type: "file",
              path: "enter-test-svc/mappings/enter-file.json",
              lastModified: "2026-06-29T10:00:00.000Z",
              sizeBytes: 100,
              children: null,
            },
          ],
        },
      ],
    },
  ],
};

describe("FolderTree — keyboard navigation", () => {
  it("renders the mocks root label", () => {
    render(
      <FolderTree
        tree={TREE}
        activeFilePath={null}
        dirtyFilePaths={new Set()}
        onFileClick={vi.fn()}
        selectedServicePath={null}
        onServiceSelect={vi.fn()}
      />,
    );
    expect(screen.getByText("/var/mocks")).toBeInTheDocument();
  });

  it("renders tree items as treeitem roles", () => {
    render(
      <FolderTree
        tree={TREE}
        activeFilePath={null}
        dirtyFilePaths={new Set()}
        onFileClick={vi.fn()}
        selectedServicePath={null}
        onServiceSelect={vi.fn()}
      />,
    );
    const items = screen.getAllByRole("treeitem");
    expect(items.length).toBeGreaterThan(0);
  });

  it("TreeNodeItem handleKeyDown: Enter key on a file node calls onFileClick", async () => {
    const user = userEvent.setup();
    const onFileClick = vi.fn();

    render(
      <FolderTree
        tree={TREE_ENTER}
        activeFilePath={null}
        dirtyFilePaths={new Set()}
        onFileClick={onFileClick}
        selectedServicePath={null}
        onServiceSelect={vi.fn()}
      />,
    );

    const fileNode = screen.getByTestId("mappings-tree-node-enter-test-svc-enter-file.json");
    fileNode.focus();
    await user.keyboard("{Enter}");

    expect(onFileClick).toHaveBeenCalledWith(
      expect.objectContaining({ path: "enter-test-svc/mappings/enter-file.json" }),
    );
  });

  it("TreeNodeItem handleKeyDown: Space key on a file node triggers the same action as Enter (lines 80-82)", async () => {
    const user = userEvent.setup();
    const onFileClick = vi.fn();

    render(
      <FolderTree
        tree={TREE_SPACE_FOLDER}
        activeFilePath={null}
        dirtyFilePaths={new Set()}
        onFileClick={onFileClick}
        selectedServicePath={null}
        onServiceSelect={vi.fn()}
      />,
    );

    const fileNode = screen.getByTestId("mappings-tree-node-space-test-svc-space-file.json");
    fileNode.focus();
    await user.keyboard(" ");

    expect(onFileClick).toHaveBeenCalledWith(
      expect.objectContaining({ path: "space-test-svc/mappings/space-file.json" }),
    );
  });

  it("TreeNodeItem handleKeyDown: Space key on a folder node toggles expand/collapse (lines 80-82)", async () => {
    const user = userEvent.setup();
    const onServiceSelect = vi.fn();

    // Use unique path "space-test-svc" — this specific test is allowed to collapse it
    render(
      <FolderTree
        tree={TREE_SPACE_FOLDER}
        activeFilePath={null}
        dirtyFilePaths={new Set()}
        onFileClick={vi.fn()}
        selectedServicePath={null}
        onServiceSelect={onServiceSelect}
      />,
    );

    // All folders expand by default; grab the first treeitem (the service folder)
    const treeitems = screen.getAllByRole("treeitem");
    const serviceItem = treeitems[0]; // space-test-svc folder
    serviceItem.focus();

    // Space should toggle collapse
    await user.keyboard(" ");

    await waitFor(() => {
      // After collapse the file is no longer in DOM
      expect(
        screen.queryByTestId("mappings-tree-node-space-test-svc-space-file.json"),
      ).not.toBeInTheDocument();
    });

    // onServiceSelect called because depth===0
    expect(onServiceSelect).toHaveBeenCalledWith("space-test-svc");
  });

  it("FolderTree handleKeyDown: ArrowDown from null focusedPath moves to first item (line 191-197)", async () => {
    render(
      <FolderTree
        tree={FLAT_TWO_SERVICE_TREE}
        activeFilePath={null}
        dirtyFilePaths={new Set()}
        onFileClick={vi.fn()}
        selectedServicePath={null}
        onServiceSelect={vi.fn()}
      />,
    );

    const tree = screen.getByRole("tree");

    // focusedPath starts null → currentIdx = -1 → next = Math.min(0, len-1) = 0
    fireEvent.keyDown(tree, { key: "ArrowDown" });

    await waitFor(() => {
      const focused = document.activeElement as HTMLElement;
      expect(focused.getAttribute("data-node-path")).toBe("flat-svc-one");
    });
  });

  it("FolderTree handleKeyDown: ArrowDown from first item moves to second item (line 191-197)", async () => {
    render(
      <FolderTree
        tree={FLAT_TWO_SERVICE_TREE}
        activeFilePath={null}
        dirtyFilePaths={new Set()}
        onFileClick={vi.fn()}
        selectedServicePath={null}
        onServiceSelect={vi.fn()}
      />,
    );

    const tree = screen.getByRole("tree");

    // First ArrowDown: null → items[0] (flat-svc-one)
    fireEvent.keyDown(tree, { key: "ArrowDown" });
    await waitFor(() => {
      expect((document.activeElement as HTMLElement).getAttribute("data-node-path")).toBe("flat-svc-one");
    });

    // Second ArrowDown: flat-svc-one → items[1] (flat-svc-two)
    fireEvent.keyDown(tree, { key: "ArrowDown" });
    await waitFor(() => {
      expect((document.activeElement as HTMLElement).getAttribute("data-node-path")).toBe("flat-svc-two");
    });
  });

  it("FolderTree handleKeyDown: ArrowUp moves focus from second item back to first (line 198-204)", async () => {
    render(
      <FolderTree
        tree={FLAT_TWO_SERVICE_TREE}
        activeFilePath={null}
        dirtyFilePaths={new Set()}
        onFileClick={vi.fn()}
        selectedServicePath={null}
        onServiceSelect={vi.fn()}
      />,
    );

    const tree = screen.getByRole("tree");

    // Navigate to second item
    fireEvent.keyDown(tree, { key: "ArrowDown" });
    await waitFor(() => {
      expect((document.activeElement as HTMLElement).getAttribute("data-node-path")).toBe("flat-svc-one");
    });
    fireEvent.keyDown(tree, { key: "ArrowDown" });
    await waitFor(() => {
      expect((document.activeElement as HTMLElement).getAttribute("data-node-path")).toBe("flat-svc-two");
    });

    // ArrowUp moves back to first item
    fireEvent.keyDown(tree, { key: "ArrowUp" });
    await waitFor(() => {
      expect((document.activeElement as HTMLElement).getAttribute("data-node-path")).toBe("flat-svc-one");
    });
  });

  it("FolderTree handleKeyDown: ArrowUp at first item stays at first item (boundary — max(0))", async () => {
    render(
      <FolderTree
        tree={FLAT_TWO_SERVICE_TREE}
        activeFilePath={null}
        dirtyFilePaths={new Set()}
        onFileClick={vi.fn()}
        selectedServicePath={null}
        onServiceSelect={vi.fn()}
      />,
    );

    const tree = screen.getByRole("tree");

    // Move to first item
    fireEvent.keyDown(tree, { key: "ArrowDown" });
    await waitFor(() => {
      expect((document.activeElement as HTMLElement).getAttribute("data-node-path")).toBe("flat-svc-one");
    });

    // ArrowUp at first item — should stay on flat-svc-one (Math.max(-1, 0) = 0)
    fireEvent.keyDown(tree, { key: "ArrowUp" });
    await waitFor(() => {
      expect((document.activeElement as HTMLElement).getAttribute("data-node-path")).toBe("flat-svc-one");
    });
  });

  it("FolderTree handleKeyDown: ArrowDown at last item stays at last item (boundary — min(length-1))", async () => {
    render(
      <FolderTree
        tree={FLAT_TWO_SERVICE_TREE}
        activeFilePath={null}
        dirtyFilePaths={new Set()}
        onFileClick={vi.fn()}
        selectedServicePath={null}
        onServiceSelect={vi.fn()}
      />,
    );

    const tree = screen.getByRole("tree");

    // Navigate to last item (flat-svc-two)
    fireEvent.keyDown(tree, { key: "ArrowDown" });
    await waitFor(() => {
      expect((document.activeElement as HTMLElement).getAttribute("data-node-path")).toBe("flat-svc-one");
    });
    fireEvent.keyDown(tree, { key: "ArrowDown" });
    await waitFor(() => {
      expect((document.activeElement as HTMLElement).getAttribute("data-node-path")).toBe("flat-svc-two");
    });

    // ArrowDown at last item — should stay on flat-svc-two
    fireEvent.keyDown(tree, { key: "ArrowDown" });
    await waitFor(() => {
      expect((document.activeElement as HTMLElement).getAttribute("data-node-path")).toBe("flat-svc-two");
    });
  });

  it("FolderTree handleKeyDown: Enter with no focused item (currentIdx=-1) does nothing (lines 205-209)", () => {
    const onFileClick = vi.fn();
    const onServiceSelect = vi.fn();

    render(
      <FolderTree
        tree={FLAT_TWO_SERVICE_TREE}
        activeFilePath={null}
        dirtyFilePaths={new Set()}
        onFileClick={onFileClick}
        selectedServicePath={null}
        onServiceSelect={onServiceSelect}
      />,
    );

    const tree = screen.getByRole("tree");

    // Fire Enter before any item is focused (focusedPath is null → currentIdx = -1)
    fireEvent.keyDown(tree, { key: "Enter" });

    // Neither callback should be called
    expect(onFileClick).not.toHaveBeenCalled();
    expect(onServiceSelect).not.toHaveBeenCalled();
  });

  it("FolderTree handleKeyDown: Enter on focused item triggers a click (lines 205-209)", async () => {
    const onServiceSelect = vi.fn();

    render(
      <FolderTree
        tree={FLAT_TWO_SERVICE_TREE}
        activeFilePath={null}
        dirtyFilePaths={new Set()}
        onFileClick={vi.fn()}
        selectedServicePath={null}
        onServiceSelect={onServiceSelect}
      />,
    );

    const tree = screen.getByRole("tree");

    // ArrowDown to set focusedPath to flat-svc-one
    fireEvent.keyDown(tree, { key: "ArrowDown" });
    await waitFor(() => {
      expect((document.activeElement as HTMLElement).getAttribute("data-node-path")).toBe("flat-svc-one");
    });

    // Enter should click flat-svc-one (a service folder at depth=0 → onServiceSelect)
    fireEvent.keyDown(tree, { key: "Enter" });

    await waitFor(() => {
      expect(onServiceSelect).toHaveBeenCalledWith("flat-svc-one");
    });
  });

  it("renders 'No services configured.' when tree has no children", () => {
    const emptyTree: FolderTreeType = { mocksRoot: "/var/mocks", children: [] };

    render(
      <FolderTree
        tree={emptyTree}
        activeFilePath={null}
        dirtyFilePaths={new Set()}
        onFileClick={vi.fn()}
        selectedServicePath={null}
        onServiceSelect={vi.fn()}
      />,
    );

    expect(screen.getByText("No services configured.")).toBeInTheDocument();
  });

  it("shows dirty indicator on dirty files", () => {
    const dirtyPath = "dirty-test-svc/mappings/dirty-file.json";

    render(
      <FolderTree
        tree={TREE_DIRTY}
        activeFilePath={null}
        dirtyFilePaths={new Set([dirtyPath])}
        onFileClick={vi.fn()}
        selectedServicePath={null}
        onServiceSelect={vi.fn()}
      />,
    );

    const fileNode = screen.getByTestId("mappings-tree-node-dirty-test-svc-dirty-file.json");
    expect(fileNode).toHaveAttribute("data-dirty", "true");
  });

  it("clicking a file node calls onFileClick with the node", async () => {
    const user = userEvent.setup();
    const onFileClick = vi.fn();

    render(
      <FolderTree
        tree={TREE_DIRTY}
        activeFilePath={null}
        dirtyFilePaths={new Set()}
        onFileClick={onFileClick}
        selectedServicePath={null}
        onServiceSelect={vi.fn()}
      />,
    );

    const fileNode = screen.getByTestId("mappings-tree-node-dirty-test-svc-dirty-file.json");
    await user.click(fileNode);

    expect(onFileClick).toHaveBeenCalledWith(
      expect.objectContaining({ path: "dirty-test-svc/mappings/dirty-file.json" }),
    );
  });

  it("clicking a top-level service folder calls onServiceSelect", async () => {
    const user = userEvent.setup();
    const onServiceSelect = vi.fn();

    render(
      <FolderTree
        tree={FLAT_TWO_SERVICE_TREE}
        activeFilePath={null}
        dirtyFilePaths={new Set()}
        onFileClick={vi.fn()}
        selectedServicePath={null}
        onServiceSelect={onServiceSelect}
      />,
    );

    const treeitems = screen.getAllByRole("treeitem");
    // The first treeitem is the first service-level folder (flat-svc-one)
    await user.click(treeitems[0]);

    expect(onServiceSelect).toHaveBeenCalledWith("flat-svc-one");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// NavigationGuard — fallback path (MemoryRouter triggers ErrorBoundary)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * When NavigationGuard is rendered inside a plain MemoryRouter (not a data router),
 * useBlocker() throws an invariant error. The NavigationGuardBoundary catches it
 * and renders NavigationGuardFallback instead, which patches window.history.
 *
 * This matches the production usage pattern for tests.
 */
describe("NavigationGuard (fallback path via ErrorBoundary)", () => {
  const NAV_ATTEMPT_EVENT = "__fishtank_nav_attempt__";

  function renderGuard(isDirty: boolean) {
    return render(
      <MemoryRouter>
        <NavigationGuard isDirty={isDirty} />
      </MemoryRouter>,
    );
  }

  function dispatchNavAttempt(proceed: () => void) {
    window.dispatchEvent(
      new CustomEvent(NAV_ATTEMPT_EVENT, {
        detail: { url: "/some-other-route", proceed },
      }),
    );
  }

  it("renders nothing when isDirty=false and no nav attempt", () => {
    renderGuard(false);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders nothing when isDirty=true and no nav attempt", () => {
    renderGuard(true);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("fallback: when NOT dirty, dispatching NAV_ATTEMPT_EVENT calls proceed() directly without showing dialog (line 154)", () => {
    const proceed = vi.fn();
    renderGuard(false);

    dispatchNavAttempt(proceed);

    // Dialog must NOT appear
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    // proceed must have been called immediately
    expect(proceed).toHaveBeenCalledOnce();
  });

  it("fallback: when dirty, dispatching NAV_ATTEMPT_EVENT shows the guard dialog", async () => {
    const proceed = vi.fn();
    renderGuard(true);

    dispatchNavAttempt(proceed);

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: /unsaved changes/i })).toBeInTheDocument();
    });

    // proceed must NOT have been called yet
    expect(proceed).not.toHaveBeenCalled();
  });

  it("fallback onStay: clicking 'Stay / Cancel' dismisses dialog without calling proceed", async () => {
    const user = userEvent.setup();
    const proceed = vi.fn();
    renderGuard(true);

    dispatchNavAttempt(proceed);

    await waitFor(() => {
      expect(screen.getByTestId("mappings-modal-discard-confirm")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("mappings-btn-discard-cancel"));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(proceed).not.toHaveBeenCalled();
  });

  it("fallback onDiscard: clicking 'Discard and navigate' dismisses dialog and calls proceed (lines 189-195)", async () => {
    const user = userEvent.setup();
    const proceed = vi.fn();
    renderGuard(true);

    dispatchNavAttempt(proceed);

    await waitFor(() => {
      expect(screen.getByTestId("mappings-modal-discard-confirm")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("mappings-btn-discard-confirm"));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(proceed).toHaveBeenCalledOnce();
  });

  it("fallback onDiscard: multiple sequential nav attempts work correctly", async () => {
    const user = userEvent.setup();
    const proceed1 = vi.fn();
    const proceed2 = vi.fn();

    renderGuard(true);

    // First attempt
    dispatchNavAttempt(proceed1);

    await waitFor(() => {
      expect(screen.getByTestId("mappings-modal-discard-confirm")).toBeInTheDocument();
    });

    // Discard first
    await user.click(screen.getByTestId("mappings-btn-discard-confirm"));
    expect(proceed1).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Second attempt
    dispatchNavAttempt(proceed2);

    await waitFor(() => {
      expect(screen.getByTestId("mappings-modal-discard-confirm")).toBeInTheDocument();
    });

    // Stay on second
    await user.click(screen.getByTestId("mappings-btn-discard-cancel"));
    expect(proceed2).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// NavigationGuard — window.history patching
// ─────────────────────────────────────────────────────────────────────────────

describe("NavigationGuard (fallback) — history patching", () => {
  it("patches window.history.pushState and dispatches NAV_ATTEMPT_EVENT", async () => {
    const listener = vi.fn();
    window.addEventListener("__fishtank_nav_attempt__", listener);

    render(
      <MemoryRouter>
        <NavigationGuard isDirty={false} />
      </MemoryRouter>,
    );

    // Give effect time to mount and patch
    await waitFor(() => {
      // Call the patched pushState
      window.history.pushState(null, "", "/patched-route");
      expect(listener).toHaveBeenCalled();
    });

    window.removeEventListener("__fishtank_nav_attempt__", listener);
  });

  it("patches window.history.replaceState and dispatches NAV_ATTEMPT_EVENT", async () => {
    const listener = vi.fn();
    window.addEventListener("__fishtank_nav_attempt__", listener);

    render(
      <MemoryRouter>
        <NavigationGuard isDirty={false} />
      </MemoryRouter>,
    );

    await waitFor(() => {
      window.history.replaceState(null, "", "/replaced-route");
      expect(listener).toHaveBeenCalled();
    });

    window.removeEventListener("__fishtank_nav_attempt__", listener);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// NavigationGuard — data router path (BlockerDialog, line 113)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * When NavigationGuard is rendered inside a createMemoryRouter data router,
 * useBlocker works correctly and BlockerDialog is rendered instead of the
 * ErrorBoundary fallback. This covers line 113: blocker.proceed?.()
 */
describe("NavigationGuard (data router path — BlockerDialog)", () => {
  function buildDataRouter(isDirty: boolean) {
    // Page A has the NavigationGuard and a link to page B
    const PageA = () => (
      <div>
        <NavigationGuard isDirty={isDirty} />
        <Link to="/page-b" data-testid="nav-link">Go to B</Link>
        <span>Page A</span>
      </div>
    );
    const PageB = () => <span>Page B</span>;

    return createMemoryRouter(
      [
        { path: "/", element: <PageA /> },
        { path: "/page-b", element: <PageB /> },
      ],
      { initialEntries: ["/"] },
    );
  }

  it("BlockerDialog: does NOT block navigation when isDirty=false", async () => {
    const user = userEvent.setup();
    const router = buildDataRouter(false);

    render(<RouterProvider router={router} />);

    // Navigate to page B
    await user.click(screen.getByTestId("nav-link"));

    // Should navigate without showing the guard dialog
    await waitFor(() => {
      expect(screen.getByText("Page B")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("mappings-modal-discard-confirm")).not.toBeInTheDocument();
  });

  it("BlockerDialog: shows guard dialog when isDirty=true and navigation is attempted", async () => {
    const user = userEvent.setup();
    const router = buildDataRouter(true);

    render(<RouterProvider router={router} />);

    // Attempt to navigate to page B
    await user.click(screen.getByTestId("nav-link"));

    // Guard dialog must appear and navigation must be blocked
    await waitFor(() => {
      expect(screen.getByTestId("mappings-modal-discard-confirm")).toBeInTheDocument();
    });

    // Still on page A
    expect(screen.getByText("Page A")).toBeInTheDocument();
  });

  it("BlockerDialog: Stay / Cancel (onStay) dismisses dialog and stays on page A (blocker.reset)", async () => {
    const user = userEvent.setup();
    const router = buildDataRouter(true);

    render(<RouterProvider router={router} />);

    await user.click(screen.getByTestId("nav-link"));

    await waitFor(() => {
      expect(screen.getByTestId("mappings-modal-discard-confirm")).toBeInTheDocument();
    });

    // Click Stay
    await user.click(screen.getByTestId("mappings-btn-discard-cancel"));

    // Dialog dismissed, still on page A
    expect(screen.queryByTestId("mappings-modal-discard-confirm")).not.toBeInTheDocument();
    expect(screen.getByText("Page A")).toBeInTheDocument();
  });

  it("BlockerDialog: Discard and navigate (onDiscard) calls blocker.proceed and navigates away (line 113)", async () => {
    const user = userEvent.setup();
    const router = buildDataRouter(true);

    render(<RouterProvider router={router} />);

    // Trigger navigation
    await user.click(screen.getByTestId("nav-link"));

    await waitFor(() => {
      expect(screen.getByTestId("mappings-modal-discard-confirm")).toBeInTheDocument();
    });

    // Click Discard — calls blocker.proceed() at line 113
    await user.click(screen.getByTestId("mappings-btn-discard-confirm"));

    // Should navigate to page B
    await waitFor(() => {
      expect(screen.getByText("Page B")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("mappings-modal-discard-confirm")).not.toBeInTheDocument();
  });
});
