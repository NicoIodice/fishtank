/**
 * Targeted branch-coverage tests for MappingEditor.tsx — Story 4.2
 *
 * Covers branches not reached by story-4-2-mapping-editor-unit.test.tsx
 * that are reachable via prop-based or MSW-based testing:
 *
 *   Branch 5  (line 155): save onError ApiError path — activeFile.name ?? "file"
 *                          false path (name is undefined → "file" fallback)
 *   Branch 9  (line 173): handleDiscard — if(!fileContent) return (true branch)
 *   Branch 18 (line 228): handleRenameConfirm — lastSlash < 0 → dir = "" branch
 *
 * Dead code branches (unreachable via normal UI — documented as intentional gaps):
 *   Branch 2  (line 50):  ToastList "info" variant — MappingEditor never issues info toasts
 *   Branch 6  (line 156): save onError non-ApiError path — activeFile.name ?? "file" (see note)
 *   Branch 11/12 (line 195-196): delete onError — same (see note)
 *   Branch 13 (line 202): handleDeleteConfirm — if(!activeFile) return
 *   Branch 15/16 (line 217-218): rename onError — same (see note)
 *   Branch 17 (line 225): handleRenameConfirm — if(!activeFile) return
 *   Branch 21/22 (line 258-259): duplicate onError — same (see note)
 *   Branch 23 (line 265): handleDuplicate — if(!activeFile) return
 *
 * Note on ?? "file" fallbacks (branches 5-covered, 6, 11/12, 15/16, 21/22):
 *   Branch 5 is covered by the "name undefined" fixture below. Branches 6, 11/12,
 *   15/16, 21/22 require BOTH the non-ApiError error path AND activeFile.name=undefined.
 *   The non-ApiError path cannot be exercised in this environment because MSW Node's
 *   HttpResponse.error() causes apiFetch to throw ApiError (not TypeError). These are
 *   defensive dead code in practice — documented as intentional gaps.
 *
 * Note on activeFile null guards (13, 17, 23):
 *   The component returns null at line 283 when activeFile=null, making the
 *   inner null guards in handleDeleteConfirm, handleRenameConfirm, and
 *   handleDuplicate structurally unreachable. Documented as intentional gaps.
 *
 * Note on ToastList info variant (branch 2):
 *   MappingEditor only issues "success" and "error" toasts. The else/info
 *   branch in ToastList's background ternary is dead code in v1.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

import { MappingEditor } from "@/features/mappings/components/MappingEditor";
import type { MappingJson, TreeNode } from "@/features/mappings/types/mappings";
import { server } from "@/test/mocks/server";
import { http, HttpResponse } from "msw";

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const ACTIVE_FILE: TreeNode = {
  name: "get_account.json",
  type: "file",
  path: "payments-api/mappings/get_account.json",
  lastModified: "2026-06-28T14:32:00.000Z",
  sizeBytes: 1024,
  children: null,
};

/** No slash in path — lastSlash = -1 → dir = "" (branch 18) */
const ROOT_LEVEL_FILE: TreeNode = {
  name: "root.json",
  type: "file",
  path: "root.json",
  lastModified: "2026-06-28T14:32:00.000Z",
  sizeBytes: 512,
  children: null,
};

/**
 * File with name=undefined — exercises the `activeFile?.name ?? "file"` fallback
 * branches (5, 11, 15, 21) in onError handlers. These are defensive null-coalescing
 * guards; the TypeScript type says name:string but the guard protects against runtime
 * omissions. Branch 5 (save onError ApiError path) is covered by this fixture.
 */
const FILE_WITHOUT_NAME: TreeNode = {
  name: undefined as unknown as string,
  type: "file",
  path: "payments-api/mappings/nameless.json",
  lastModified: "2026-06-28T14:32:00.000Z",
  sizeBytes: 512,
  children: null,
};

const CONTENT = JSON.stringify({
  request: { method: "GET", url: "/api/account" },
  response: { status: 200, body: "ok" },
});

const EDIT_BUFFER: MappingJson = JSON.parse(CONTENT) as MappingJson;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeQc() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function renderEditor(opts: {
  activeFile?: TreeNode | null;
  fileContent?: string | null;
  lastKnownModified?: string | null;
  isDirty?: boolean;
  editBuffer?: MappingJson | null;
  onDirtyChange?: (dirty: boolean, content?: string) => void;
  onSaveSuccess?: (metadata: { name: string; path: string; lastModified: string; sizeBytes: number }) => void;
  onDeleteSuccess?: () => void;
  onRenameSuccess?: () => void;
  onEditBufferChange?: (buffer: MappingJson) => void;
} = {}) {
  const {
    activeFile = ACTIVE_FILE,
    fileContent = CONTENT,
    lastKnownModified = "2026-06-28T14:32:00.000Z",
    isDirty = false,
    editBuffer = EDIT_BUFFER,
    onDirtyChange = vi.fn(),
    onSaveSuccess = vi.fn(),
    onDeleteSuccess = vi.fn(),
    onRenameSuccess = vi.fn(),
    onEditBufferChange = vi.fn(),
  } = opts;

  return render(
    <MemoryRouter>
      <QueryClientProvider client={makeQc()}>
        <MappingEditor
          activeFile={activeFile}
          fileContent={fileContent}
          lastKnownModified={lastKnownModified}
          isDirty={isDirty}
          onDirtyChange={onDirtyChange}
          onSaveSuccess={onSaveSuccess}
          onDeleteSuccess={onDeleteSuccess}
          onRenameSuccess={onRenameSuccess}
          editBuffer={editBuffer}
          onEditBufferChange={onEditBufferChange}
        />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

// ─── Branch 5: save onError — activeFile?.name ?? "file" fallback ───────────
// When the save mutation fails with an ApiError AND activeFile.name is undefined,
// the message template `Failed to save ${activeFile?.name ?? "file"}` uses "file"
// (the ?? fallback). This covers branch 5's false path (null-coalescing else).
//
// Strategy: render with FILE_WITHOUT_NAME (name=undefined) and make PUT return
// a 500 error so the saveMutation onError fires with an ApiError.

describe("MappingEditor — branch 5: save onError uses 'file' fallback when activeFile.name is undefined", () => {
  it("shows 'Failed to save file' (using ?? fallback) when name is undefined and save fails", async () => {
    const user = userEvent.setup();

    server.use(
      http.put("/api/mappings/*", () =>
        HttpResponse.json(
          {
            success: false,
            error: { code: "INTERNAL_ERROR", message: "server boom" },
          },
          { status: 500 },
        ),
      ),
    );

    renderEditor({
      activeFile: FILE_WITHOUT_NAME,
      isDirty: true, // enables Save button
    });

    await user.click(screen.getByTestId("mappings-btn-save"));

    await waitFor(() => {
      // Branch 5: activeFile?.name → undefined → ?? "file" → "file"
      const alerts = document.querySelectorAll("[role='alert']");
      const hasMsg = Array.from(alerts).some((el) =>
        el.textContent?.includes("Failed to save file"),
      );
      expect(hasMsg).toBe(true);
    });
  });
});

// ─── Branch 9: handleDiscard — if(!fileContent) return true branch ────────────
// When isDirty=true (Discard enabled) but fileContent=null, clicking Discard
// triggers handleDiscard which immediately returns at: if (!fileContent) return

describe("MappingEditor — branch 9: handleDiscard early return when fileContent is null", () => {
  it("does not call onEditBufferChange or onDirtyChange when fileContent is null", async () => {
    const user = userEvent.setup();
    const onEditBufferChange = vi.fn();
    const onDirtyChange = vi.fn();

    renderEditor({
      isDirty: true,     // enables Discard button (discardEnabled = isDirty)
      fileContent: null, // handleDiscard: if (!fileContent) return immediately
      onEditBufferChange,
      onDirtyChange,
    });

    const discardBtn = screen.getByTestId("mappings-btn-discard");
    expect(discardBtn).not.toBeDisabled(); // isDirty=true → button enabled

    await user.click(discardBtn);

    // Guard fires → no side-effects
    expect(onEditBufferChange).not.toHaveBeenCalled();
    expect(onDirtyChange).not.toHaveBeenCalled();
  });
});

// ─── Branch 18: handleRenameConfirm — lastSlash < 0 → dir = "" ───────────────
// When activeFile.path has no "/" (a root-level file), the rename computes:
//   lastSlash = activeFile.path.lastIndexOf("/") → -1
//   dir = lastSlash >= 0 ? ... : "" → "" (branch 18 false path)
//   newPath = "" + newFilename → just the filename with no prefix

describe("MappingEditor — branch 18: rename root-level file (no slash in path)", () => {
  it("computes newPath without directory prefix when the active file path has no slash", async () => {
    const user = userEvent.setup();
    let capturedPostPath: string | null = null;

    server.use(
      // fetchFileContent GET for root.json
      http.get("/api/mappings/root.json", () =>
        HttpResponse.json({
          success: true,
          data: {
            content: CONTENT,
            name: "root.json",
            path: "root.json",
            lastModified: "2026-06-28T14:32:00.000Z",
            sizeBytes: CONTENT.length,
          },
        }),
      ),
      // POST creates the renamed file (renameMutation step 1)
      http.post("/api/mappings", async ({ request }) => {
        const body = (await request.json()) as { path: string };
        capturedPostPath = body.path;
        return HttpResponse.json(
          {
            success: true,
            data: {
              name: "renamed_root.json",
              path: body.path,
              lastModified: "2026-06-28T15:00:00.000Z",
              sizeBytes: 100,
            },
          },
          { status: 201 },
        );
      }),
      // DELETE old file (renameMutation step 2)
      http.delete("/api/mappings/root.json", () =>
        HttpResponse.json({ success: true, data: null }),
      ),
    );

    renderEditor({ activeFile: ROOT_LEVEL_FILE, fileContent: CONTENT });

    // Open rename modal
    await user.click(screen.getByTestId("mappings-btn-rename"));
    await waitFor(() => {
      expect(screen.getByTestId("mappings-modal-file-name")).toBeInTheDocument();
    });

    // Clear and type the new filename
    const input = screen.getByTestId("mappings-input-filename");
    await user.clear(input);
    await user.type(input, "renamed_root.json");

    // Confirm rename
    await user.click(screen.getByRole("button", { name: /confirm/i }));

    await waitFor(() => {
      expect(capturedPostPath).not.toBeNull();
    });

    // Branch 18 false path: dir = "" → newPath = "" + "renamed_root.json"
    expect(capturedPostPath).toBe("renamed_root.json");
  });
});

// ─── Dead-code guards documentation ──────────────────────────────────────────

describe("MappingEditor — branch 13/17/23: inner activeFile null guards (dead code)", () => {
  it("component null-renders when activeFile=null; inner null guards are unreachable", () => {
    const { container } = renderEditor({ activeFile: null });
    // Line 283: if (!activeFile || !editBuffer) return null fires first.
    // handleDeleteConfirm, handleRenameConfirm, handleDuplicate are never reached.
    expect(container.firstChild).toBeNull();
  });
});

describe("MappingEditor — branch 2: ToastList info variant (dead code)", () => {
  it("no toasts on initial render (info/brand colour branch unused in MappingEditor v1)", () => {
    const { container } = renderEditor({ isDirty: false });
    // MappingEditor only issues 'success' and 'error' toasts.
    // The ToastList else-branch (info/brand colour) is dead code.
    expect(container.querySelectorAll("[role='alert']").length).toBe(0);
    expect(screen.getByTestId("mappings-breadcrumb-editor")).toBeInTheDocument();
  });
});
