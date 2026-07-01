import React, { useState, useCallback } from "react";
import type { TreeNode, MappingJson } from "../types/mappings";
import { FormTab } from "./FormTab";
import { RawJsonTab } from "./RawJsonTab";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { FileNameModal } from "./FileNameModal";
import { useToast } from "@/lib/useToast";
import {
  useSaveExisting,
  useDeleteFile,
  useRenameFile,
  useDuplicateFile,
  fetchFileContent,
  makeCopyPath,
} from "../hooks/useMappingMutations";
import type { FileMetadata } from "../types/mappings";
import { ApiError } from "@/lib/api";

type EditorTab = "form" | "raw";

interface ToastListProps {
  toasts: { id: string; message: string; variant: string }[];
  onDismiss: (id: string) => void;
}

function ToastList({ toasts, onDismiss }: ToastListProps) {
  if (toasts.length === 0) return null;
  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 2000,
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="alert"
          style={{
            padding: "12px 16px",
            borderRadius: "6px",
            background:
              t.variant === "error"
                ? "var(--danger, #ef4444)"
                : t.variant === "success"
                  ? "var(--success, #22c55e)"
                  : "var(--brand, #3b82f6)",
            color: "#fff",
            fontSize: "0.875rem",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            maxWidth: "360px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span style={{ flex: 1 }}>{t.message}</span>
          <button
            onClick={() => onDismiss(t.id)}
            style={{
              background: "none",
              border: "none",
              color: "#fff",
              cursor: "pointer",
              padding: "0 4px",
              fontSize: "1rem",
            }}
            aria-label="Dismiss toast"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

interface MappingEditorProps {
  activeFile: TreeNode | null;
  fileContent: string | null;
  lastKnownModified: string | null;
  isDirty: boolean;
  onDirtyChange: (dirty: boolean, content?: string) => void;
  onSaveSuccess: (metadata: FileMetadata) => void;
  onDeleteSuccess: () => void;
  onRenameSuccess: () => void;
  editBuffer: MappingJson | null;
  onEditBufferChange: (buffer: MappingJson) => void;
  isResyncPending?: boolean;
}

export function MappingEditor({
  activeFile,
  fileContent,
  lastKnownModified,
  isDirty,
  onDirtyChange,
  onSaveSuccess,
  onDeleteSuccess,
  onRenameSuccess,
  editBuffer,
  onEditBufferChange,
  isResyncPending = false,
}: MappingEditorProps) {
  const [activeTab, setActiveTab] = useState<EditorTab>("form");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const { toasts, showToast, dismissToast } = useToast();

  // Reset tab to "form" when the open file changes — React's "adjust state
  // during render" pattern (avoids a setState-in-effect cascade).
  const [tabFilePath, setTabFilePath] = useState(activeFile?.path);
  if (activeFile?.path !== tabFilePath) {
    setTabFilePath(activeFile?.path);
    setActiveTab("form");
  }

  // Get raw JSON text from buffer
  const rawJsonText = editBuffer ? JSON.stringify(editBuffer, null, 2) : "";

  // Handle form changes: update buffer with known keys
  const handleFormChange = useCallback(
    (updated: MappingJson) => {
      onEditBufferChange(updated);
      onDirtyChange(true);
    },
    [onEditBufferChange, onDirtyChange],
  );

  // Handle raw JSON changes: parse and update buffer
  const handleRawChange = useCallback(
    (value: string) => {
      try {
        const parsed = JSON.parse(value) as MappingJson;
        onEditBufferChange(parsed);
        onDirtyChange(true);
      } catch {
        // Invalid JSON while typing — just mark dirty but don't update buffer yet
        onDirtyChange(true);
      }
    },
    [onEditBufferChange, onDirtyChange],
  );

  // Save mutation
  const saveMutation = useSaveExisting({
    onSuccess: (data) => {
      onDirtyChange(false);
      onSaveSuccess(data);
      showToast(`Saved ${data.name} successfully.`, "success");
    },
    onError: (err) => {
      const msg =
        err instanceof ApiError
          ? `Failed to save ${activeFile?.name ?? "file"} — ${err.message}.`
          : `Failed to save ${activeFile?.name ?? "file"} — unknown error.`;
      showToast(msg, "error");
    },
  });

  const handleSave = useCallback(() => {
    if (!activeFile || !lastKnownModified) return;
    const content = JSON.stringify(editBuffer, null, 2);
    saveMutation.mutate({
      path: activeFile.path,
      content,
      lastKnownModified,
    });
  }, [activeFile, lastKnownModified, editBuffer, saveMutation]);

  // Discard — revert to last-saved content (no network call)
  const handleDiscard = useCallback(() => {
    if (!fileContent) return;
    try {
      const parsed = JSON.parse(fileContent) as MappingJson;
      onEditBufferChange(parsed);
    } catch {
      // If the original content isn't valid JSON, set buffer to empty
      onEditBufferChange({});
    }
    onDirtyChange(false);
  }, [fileContent, onEditBufferChange, onDirtyChange]);

  // Delete mutation
  const deleteMutation = useDeleteFile({
    onSuccess: () => {
      setShowDeleteConfirm(false);
      onDeleteSuccess();
      showToast("File deleted successfully.", "success");
    },
    onError: (err) => {
      setShowDeleteConfirm(false);
      const msg =
        err instanceof ApiError
          ? `Failed to delete ${activeFile?.name ?? "file"} — ${err.message}.`
          : `Failed to delete ${activeFile?.name ?? "file"} — unknown error.`;
      showToast(msg, "error");
    },
  });

  const handleDeleteConfirm = useCallback(() => {
    if (!activeFile) return;
    deleteMutation.mutate({ path: activeFile.path });
  }, [activeFile, deleteMutation]);

  // Rename mutation
  const renameMutation = useRenameFile({
    onSuccess: () => {
      setShowRenameModal(false);
      onRenameSuccess();
      showToast("File renamed successfully.", "success");
    },
    onError: (err) => {
      setShowRenameModal(false);
      const msg =
        err instanceof ApiError
          ? `Failed to rename ${activeFile?.name ?? "file"} — ${err.message}.`
          : `Failed to rename ${activeFile?.name ?? "file"} — unknown error.`;
      showToast(msg, "error");
    },
  });

  const handleRenameConfirm = useCallback(
    async (newFilename: string) => {
      if (!activeFile) return;
      // Compose new path in same folder
      const lastSlash = activeFile.path.lastIndexOf("/");
      const dir = lastSlash >= 0 ? activeFile.path.slice(0, lastSlash + 1) : "";
      const newPath = `${dir}${newFilename}`;

      try {
        // Fetch current content for the rename operation
        const fc = await fetchFileContent(activeFile.path);
        renameMutation.mutate({
          oldPath: activeFile.path,
          newPath,
          content: fc.content,
        });
      } catch (err) {
        const msg =
          err instanceof ApiError
            ? `Failed to rename ${activeFile.name} — ${err.message}.`
            : `Failed to rename ${activeFile.name} — unknown error.`;
        showToast(msg, "error");
      }
    },
    [activeFile, renameMutation, showToast],
  );

  // Duplicate mutation
  const duplicateMutation = useDuplicateFile({
    onSuccess: () => {
      showToast("File duplicated successfully.", "success");
    },
    onError: (err) => {
      const msg =
        err instanceof ApiError
          ? `Failed to duplicate ${activeFile?.name ?? "file"} — ${err.message}.`
          : `Failed to duplicate ${activeFile?.name ?? "file"} — unknown error.`;
      showToast(msg, "error");
    },
  });

  const handleDuplicate = useCallback(async () => {
    if (!activeFile) return;
    const dstPath = makeCopyPath(activeFile.path);
    try {
      const fc = await fetchFileContent(activeFile.path);
      duplicateMutation.mutate({
        srcPath: activeFile.path,
        dstPath,
        content: fc.content,
      });
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? `Failed to duplicate ${activeFile.name} — ${err.message}.`
          : `Failed to duplicate ${activeFile.name} — unknown error.`;
      showToast(msg, "error");
    }
  }, [activeFile, duplicateMutation, showToast]);

  if (!activeFile || !editBuffer) {
    return null;
  }

  const saveEnabled = isDirty || false; // enabled when dirty
  const discardEnabled = isDirty; // enabled only when dirty (existing file)

  const btnBase: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "5px 12px",
    border: "1px solid var(--input-border, #e5e7eb)",
    borderRadius: "4px",
    fontSize: "0.8125rem",
    cursor: "pointer",
    background: "var(--surface, #fff)",
    color: "var(--content-fg, #374151)",
  };

  const btnDisabled: React.CSSProperties = {
    ...btnBase,
    opacity: 0.5,
    cursor: "not-allowed",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Breadcrumb */}
      <div
        data-testid="mappings-breadcrumb-editor"
        style={{
          padding: "8px 16px",
          borderBottom: "1px solid var(--input-border, #e5e7eb)",
          fontSize: "0.875rem",
          color: "var(--content-muted, #6b7280)",
          display: "flex",
          alignItems: "center",
          gap: "4px",
          flexShrink: 0,
        }}
      >
        <i className="bi bi-file-earmark-code" aria-hidden="true" />
        <span>{activeFile.path}</span>
        {isDirty && <span style={{ color: "var(--warning, #f59e0b)" }}>●</span>}
      </div>

      {/* Actions bar — aria-hidden when a modal dialog is open so accessibility
           role queries (getByRole) only find elements within the modal */}
      <div
        aria-hidden={showDeleteConfirm || showRenameModal || undefined}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "6px 16px",
          borderBottom: "1px solid var(--input-border, #e5e7eb)",
          background: "var(--surface-subtle, #f9fafb)",
          flexShrink: 0,
          flexWrap: "wrap",
        }}
      >
        {/* Save button is hidden during Resync to keep the editor non-disabled (AC-12) */}
        {!isResyncPending && (
          <button
            data-testid="mappings-btn-save"
            aria-label="Save file"
            disabled={!saveEnabled}
            onClick={handleSave}
            style={saveEnabled ? { ...btnBase, background: "var(--brand, #3b82f6)", color: "#fff", borderColor: "var(--brand, #3b82f6)" } : btnDisabled}
          >
            <i className="bi bi-floppy" aria-hidden="true" />
            Save
          </button>
        )}

        <button
          data-testid="mappings-btn-discard"
          aria-label="Discard unsaved changes"
          disabled={!discardEnabled}
          onClick={handleDiscard}
          style={discardEnabled ? btnBase : btnDisabled}
        >
          <i className="bi bi-arrow-counterclockwise" aria-hidden="true" />
          Discard
        </button>

        <div style={{ width: "1px", height: "20px", background: "var(--input-border, #e5e7eb)", margin: "0 4px" }} />

        <button
          data-testid="mappings-btn-rename"
          aria-label="Rename file"
          onClick={() => setShowRenameModal(true)}
          style={btnBase}
        >
          <i className="bi bi-pencil" aria-hidden="true" />
          Rename
        </button>

        <button
          data-testid="mappings-btn-duplicate"
          aria-label="Duplicate file"
          onClick={() => void handleDuplicate()}
          style={btnBase}
        >
          <i className="bi bi-copy" aria-hidden="true" />
          Duplicate
        </button>

        <button
          data-testid="mappings-btn-delete"
          aria-label="Delete file"
          onClick={() => setShowDeleteConfirm(true)}
          style={{ ...btnBase, color: "var(--danger, #ef4444)", borderColor: "var(--danger, #ef4444)" }}
        >
          <i className="bi bi-trash" aria-hidden="true" />
          Delete
        </button>
      </div>

      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--input-border, #e5e7eb)",
          background: "var(--surface-subtle, #f9fafb)",
          flexShrink: 0,
        }}
      >
        <button
          data-testid="mappings-tab-form"
          role="tab"
          aria-selected={activeTab === "form"}
          onClick={() => setActiveTab("form")}
          style={{
            padding: "8px 20px",
            border: "none",
            borderBottom: activeTab === "form" ? "2px solid var(--brand, #3b82f6)" : "2px solid transparent",
            background: "transparent",
            cursor: "pointer",
            fontSize: "0.875rem",
            fontWeight: activeTab === "form" ? 600 : 400,
            color: activeTab === "form" ? "var(--brand, #3b82f6)" : "var(--content-muted, #6b7280)",
          }}
        >
          Form
        </button>
        <button
          data-testid="mappings-tab-raw"
          role="tab"
          aria-selected={activeTab === "raw"}
          onClick={() => setActiveTab("raw")}
          style={{
            padding: "8px 20px",
            border: "none",
            borderBottom: activeTab === "raw" ? "2px solid var(--brand, #3b82f6)" : "2px solid transparent",
            background: "transparent",
            cursor: "pointer",
            fontSize: "0.875rem",
            fontWeight: activeTab === "raw" ? 600 : 400,
            color: activeTab === "raw" ? "var(--brand, #3b82f6)" : "var(--content-muted, #6b7280)",
          }}
        >
          Raw JSON
        </button>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {activeTab === "form" ? (
          <FormTab editBuffer={editBuffer} onChange={handleFormChange} />
        ) : (
          <RawJsonTab content={rawJsonText} onChange={handleRawChange} />
        )}
      </div>

      {/* Modals & dialogs */}
      <DeleteConfirmDialog
        isOpen={showDeleteConfirm}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <FileNameModal
        isOpen={showRenameModal}
        initialValue={activeFile.name}
        title="Rename File"
        onConfirm={(name) => void handleRenameConfirm(name)}
        onCancel={() => setShowRenameModal(false)}
      />

      {/* Toast notifications */}
      <ToastList toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
