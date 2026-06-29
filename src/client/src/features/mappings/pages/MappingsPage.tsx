import React, { useState, useCallback } from "react";
import { useMappingsTree } from "../hooks/useMappingsTree";
import { useFileContent } from "../hooks/useFileContent";
import { useCreateFile } from "../hooks/useMappingMutations";
import { FolderTree } from "../components/FolderTree";
import { MappingEditor } from "../components/MappingEditor";
import { FileNameModal } from "../components/FileNameModal";
import { ServiceSelectModal } from "../components/ServiceSelectModal";
import { NavigationGuard } from "../components/NavigationGuard";
import { useToast } from "@/lib/useToast";
import type { TreeNode, MappingJson, FileMetadata } from "../types/mappings";
import { ApiError } from "@/lib/api";

type NewFileType = "mapping" | "response";

// ─── Toast list rendered at root level of MappingsPage ──────────────────────

interface ToastItem {
  id: string;
  message: string;
  variant: string;
}

function PageToastList({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
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
          role={t.variant === "error" ? "alert" : "status"}
          aria-live={t.variant === "error" ? "assertive" : "polite"}
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
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

export function MappingsPage() {
  const { data: tree, isLoading } = useMappingsTree();
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  const [selectedServicePath, setSelectedServicePath] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [editBuffer, setEditBuffer] = useState<MappingJson | null>(null);
  const [lastKnownModified, setLastKnownModified] = useState<string | null>(null);
  const [savedContent, setSavedContent] = useState<string | null>(null);
  const [dirtyFilePaths, setDirtyFilePaths] = useState<Set<string>>(new Set());

  // New file flow
  const [newFileType, setNewFileType] = useState<NewFileType | null>(null);
  const [showServiceSelect, setShowServiceSelect] = useState(false);
  const [showFileNameModal, setShowFileNameModal] = useState(false);
  const [pendingServicePath, setPendingServicePath] = useState<string | null>(null);

  const { toasts, showToast, dismissToast } = useToast();

  // Fetch file content when a file is selected
  const { data: fileContentData } = useFileContent(activeFilePath);

  // Load fetched file content into local editor state — React's "adjust state
  // during render" pattern (avoids a setState-in-effect cascade). Runs when the
  // React Query result reference changes.
  const [loadedContent, setLoadedContent] = useState<typeof fileContentData>(undefined);
  if (fileContentData && fileContentData !== loadedContent) {
    setLoadedContent(fileContentData);
    try {
      const parsed = JSON.parse(fileContentData.content) as MappingJson;
      setEditBuffer(parsed);
    } catch {
      setEditBuffer({});
    }
    setLastKnownModified(fileContentData.lastModified);
    setSavedContent(fileContentData.content);
    setIsDirty(false);
  }

  const handleFileClick = useCallback((node: TreeNode) => {
    setActiveFilePath(node.path);
    // Determine service from first path segment
    const serviceSlug = node.path.split("/")[0];
    setSelectedServicePath(serviceSlug);
  }, []);

  const handleServiceSelect = useCallback((path: string | null) => {
    setSelectedServicePath(path);
  }, []);

  const handleDirtyChange = useCallback(
    (dirty: boolean) => {
      setIsDirty(dirty);
      if (activeFilePath) {
        setDirtyFilePaths((prev) => {
          const next = new Set(prev);
          if (dirty) {
            next.add(activeFilePath);
          } else {
            next.delete(activeFilePath);
          }
          return next;
        });
      }
    },
    [activeFilePath],
  );

  const handleEditBufferChange = useCallback((buffer: MappingJson) => {
    setEditBuffer(buffer);
  }, []);

  const handleSaveSuccess = useCallback(
    (metadata: FileMetadata) => {
      setLastKnownModified(metadata.lastModified);
      setSavedContent(JSON.stringify(editBuffer, null, 2));
      setIsDirty(false);
      if (activeFilePath) {
        setDirtyFilePaths((prev) => {
          const next = new Set(prev);
          next.delete(activeFilePath);
          return next;
        });
      }
    },
    [editBuffer, activeFilePath],
  );

  const handleDeleteSuccess = useCallback(() => {
    setActiveFilePath(null);
    setEditBuffer(null);
    setIsDirty(false);
    setSavedContent(null);
  }, []);

  const handleRenameSuccess = useCallback(() => {
    setActiveFilePath(null);
    setEditBuffer(null);
    setIsDirty(false);
  }, []);

  // Get the active file's TreeNode from the tree
  const activeFileNode: TreeNode | null = React.useMemo(() => {
    if (!activeFilePath || !tree) return null;
    function findNode(nodes: TreeNode[]): TreeNode | null {
      for (const node of nodes) {
        if (node.path === activeFilePath) return node;
        if (node.children) {
          const found = findNode(node.children);
          if (found) return found;
        }
      }
      return null;
    }
    return findNode(tree.children);
  }, [activeFilePath, tree]);

  // Create file mutation
  const createFileMutation = useCreateFile({
    onSuccess: (data) => {
      showToast(`Created ${data.name} successfully.`, "success");
      setActiveFilePath(data.path);
    },
    onError: (err) => {
      const msg =
        err instanceof ApiError
          ? `Failed to create file — ${err.message}.`
          : "Failed to create file — unknown error.";
      showToast(msg, "error");
    },
  });

  const handleNewMappingClick = useCallback(() => {
    setNewFileType("mapping");
    if (!selectedServicePath) {
      setShowServiceSelect(true);
    } else {
      setShowFileNameModal(true);
    }
  }, [selectedServicePath]);

  const handleNewResponseClick = useCallback(() => {
    setNewFileType("response");
    if (!selectedServicePath) {
      setShowServiceSelect(true);
    } else {
      setShowFileNameModal(true);
    }
  }, [selectedServicePath]);

  const handleServiceSelected = useCallback((serviceNode: TreeNode) => {
    setShowServiceSelect(false);
    setPendingServicePath(serviceNode.path);
    setShowFileNameModal(true);
  }, []);

  const handleFileNameConfirm = useCallback(
    (filename: string) => {
      const svcPath = pendingServicePath ?? selectedServicePath;
      if (!svcPath) return;
      const subFolder = newFileType === "mapping" ? "mappings" : "responses";
      const path = `${svcPath}/${subFolder}/${filename}`;
      const defaultContent = JSON.stringify(
        {
          request: { method: "GET", url: "/api/path" },
          response: { status: 200, body: "" },
        },
        null,
        2,
      );
      createFileMutation.mutate({ path, content: defaultContent });
      setShowFileNameModal(false);
      setPendingServicePath(null);
    },
    [pendingServicePath, selectedServicePath, newFileType, createFileMutation],
  );

  // Get top-level service nodes for the service selector
  const serviceNodes = tree?.children ?? [];

  return (
    <main
      data-testid="page-mappings"
      style={{
        display: "flex",
        height: "calc(100vh - var(--navbar-h, 56px))",
        overflow: "hidden",
      }}
    >
      {/* ── Left pane: folder tree ─────────────────────────────── */}
      <aside
        style={{
          width: "240px",
          minWidth: "180px",
          maxWidth: "320px",
          borderRight: "1px solid var(--input-border, #e5e7eb)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Toolbar — rendered only after tree loads so tests can rely on
            "button visible ⇒ tree data available" (AC-12, AC-20) */}
        {!isLoading && tree && (
          <div
            style={{
              display: "flex",
              gap: "6px",
              padding: "8px",
              borderBottom: "1px solid var(--input-border, #e5e7eb)",
              background: "var(--surface-subtle, #f9fafb)",
              flexShrink: 0,
            }}
          >
            <button
              data-testid="mappings-btn-new-mapping"
              aria-label="New Mapping file"
              onClick={handleNewMappingClick}
              style={{
                flex: 1,
                padding: "5px 6px",
                border: "1px solid var(--input-border, #e5e7eb)",
                borderRadius: "4px",
                background: "var(--surface, #fff)",
                color: "var(--content-fg, #374151)",
                fontSize: "0.75rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                justifyContent: "center",
              }}
            >
              <i className="bi bi-plus-lg" aria-hidden="true" />
              Mapping
            </button>
            <button
              data-testid="mappings-btn-new-response"
              aria-label="New Response file"
              onClick={handleNewResponseClick}
              style={{
                flex: 1,
                padding: "5px 6px",
                border: "1px solid var(--input-border, #e5e7eb)",
                borderRadius: "4px",
                background: "var(--surface, #fff)",
                color: "var(--content-fg, #374151)",
                fontSize: "0.75rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                justifyContent: "center",
              }}
            >
              <i className="bi bi-plus-lg" aria-hidden="true" />
              Response
            </button>
          </div>
        )}

        {/* Tree or skeleton */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          {isLoading ? (
            <div
              role="status"
              aria-busy="true"
              aria-label="Loading mappings"
              style={{
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  style={{
                    height: "16px",
                    borderRadius: "4px",
                    background: "var(--surface-subtle, #f3f4f6)",
                    animation: "pulse 1.5s ease-in-out infinite",
                    width: `${60 + i * 10}%`,
                  }}
                />
              ))}
            </div>
          ) : tree ? (
            <FolderTree
              tree={tree}
              activeFilePath={activeFilePath}
              dirtyFilePaths={dirtyFilePaths}
              onFileClick={handleFileClick}
              selectedServicePath={selectedServicePath}
              onServiceSelect={handleServiceSelect}
            />
          ) : null}
        </div>
      </aside>

      {/* ── Right pane: editor ────────────────────────────────── */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {!activeFileNode ? (
          // Empty state (AC-19)
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--content-muted, #6b7280)",
              gap: "12px",
              padding: "32px",
              textAlign: "center",
            }}
          >
            <i
              className={selectedServicePath ? "bi bi-file-earmark-plus" : "bi bi-file-earmark-code"}
              style={{ fontSize: "3rem", opacity: 0.4 }}
              aria-hidden="true"
            />
            {selectedServicePath ? (
              <>
                <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 600 }}>No mappings yet</h3>
                <p style={{ margin: 0, fontSize: "0.9375rem" }}>
                  Use the buttons above to create your first mapping or response file.
                </p>
                <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                  <button
                    data-testid="mappings-btn-new-mapping-empty"
                    aria-label="New Mapping file"
                    onClick={handleNewMappingClick}
                    style={{
                      padding: "8px 16px",
                      border: "1px solid var(--brand, #3b82f6)",
                      borderRadius: "4px",
                      background: "var(--brand, #3b82f6)",
                      color: "#fff",
                      fontSize: "0.875rem",
                      cursor: "pointer",
                    }}
                  >
                    + New Mapping
                  </button>
                  <button
                    data-testid="mappings-btn-new-response-empty"
                    aria-label="New Response file"
                    onClick={handleNewResponseClick}
                    style={{
                      padding: "8px 16px",
                      border: "1px solid var(--input-border, #e5e7eb)",
                      borderRadius: "4px",
                      background: "transparent",
                      color: "var(--content-fg, #374151)",
                      fontSize: "0.875rem",
                      cursor: "pointer",
                    }}
                  >
                    + New Response
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 600 }}>Select a service</h3>
                <p style={{ margin: 0, fontSize: "0.9375rem" }}>
                  Choose a service from the left panel to browse its mapping files.
                </p>
              </>
            )}
          </div>
        ) : (
          <MappingEditor
            activeFile={activeFileNode}
            fileContent={savedContent}
            lastKnownModified={lastKnownModified}
            isDirty={isDirty}
            onDirtyChange={handleDirtyChange}
            onSaveSuccess={handleSaveSuccess}
            onDeleteSuccess={handleDeleteSuccess}
            onRenameSuccess={handleRenameSuccess}
            editBuffer={editBuffer}
            onEditBufferChange={handleEditBufferChange}
          />
        )}
      </div>

      {/* ── Modals ───────────────────────────────────────────── */}

      {/* Service selection modal (no-service-selected flow, AC-13) */}
      <ServiceSelectModal
        isOpen={showServiceSelect}
        services={serviceNodes}
        onSelect={handleServiceSelected}
        onCancel={() => {
          setShowServiceSelect(false);
          setNewFileType(null);
        }}
      />

      {/* File naming modal (AC-12) */}
      <FileNameModal
        isOpen={showFileNameModal}
        title={newFileType === "mapping" ? "New Mapping File" : "New Response File"}
        onConfirm={handleFileNameConfirm}
        onCancel={() => {
          setShowFileNameModal(false);
          setNewFileType(null);
          setPendingServicePath(null);
        }}
      />

      {/* Navigation guard dialog (AC-18, FR-21) */}
      {/* Story 4.6: generalize guard + sign-out protection */}
      <NavigationGuard isDirty={isDirty} />

      {/* Page-level toasts (for create file) */}
      <PageToastList toasts={toasts} onDismiss={dismissToast} />
    </main>
  );
}
