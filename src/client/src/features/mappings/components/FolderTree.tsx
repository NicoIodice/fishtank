import React, { useState, useCallback, useRef } from "react";
import type { TreeNode, FolderTree as FolderTreeType } from "../types/mappings";

interface FolderTreeProps {
  tree: FolderTreeType;
  activeFilePath: string | null;
  dirtyFilePaths: Set<string>;
  onFileClick: (node: TreeNode) => void;
  selectedServicePath: string | null;
  onServiceSelect: (path: string | null) => void;
}

// Session-scoped expand/collapse state (survives re-fetch but not page reload)
const sessionExpandState = new Map<string, boolean>();

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9_.-]/g, "-");
}

/** Attribute written on every treeitem so the keyboard handler can read the path. */
const DATA_NODE_PATH = "data-node-path";

interface TreeNodeItemProps {
  node: TreeNode;
  depth: number;
  serviceSlug: string;
  activeFilePath: string | null;
  dirtyFilePaths: Set<string>;
  onFileClick: (node: TreeNode) => void;
  onServiceSelect: (path: string | null) => void;
  selectedServicePath: string | null;
  focusedPath: string | null;
  setFocusedPath: (path: string | null) => void;
}

function TreeNodeItem({
  node,
  depth,
  serviceSlug,
  activeFilePath,
  dirtyFilePaths,
  onFileClick,
  onServiceSelect,
  selectedServicePath,
  focusedPath,
  setFocusedPath,
}: TreeNodeItemProps) {
  const [expanded, setExpanded] = useState<boolean>(() => {
    if (sessionExpandState.has(node.path)) {
      return sessionExpandState.get(node.path)!;
    }
    // Default: all folders expanded initially
    return true;
  });

  const isFile = node.type === "file";
  const isActive = isFile && activeFilePath === node.path;
  const isDirty = isFile && dirtyFilePaths.has(node.path);
  // Focus is tracked by path — correct regardless of how many folders are expanded
  const isFocused = focusedPath === node.path;

  const handleToggle = useCallback(() => {
    if (node.type === "folder") {
      const next = !expanded;
      setExpanded(next);
      sessionExpandState.set(node.path, next);
      // Track keyboard focus so arrow-key navigation works after a folder click
      setFocusedPath(node.path);
      if (depth === 0) {
        // Always select the service (don't deselect on collapse) so that
        // "click service name → New Mapping" works regardless of expand state
        onServiceSelect(node.path);
      }
    } else {
      onFileClick(node);
      setFocusedPath(node.path);
    }
  }, [node, expanded, depth, onFileClick, onServiceSelect, setFocusedPath]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleToggle();
      }
    },
    [handleToggle],
  );

  const testId =
    isFile ? `mappings-tree-node-${serviceSlug}-${node.name}` : undefined;

  return (
    <div>
      <div
        role="treeitem"
        tabIndex={isFocused ? 0 : -1}
        data-testid={testId}
        data-active={isActive ? "true" : undefined}
        data-dirty={isDirty ? "true" : undefined}
        {...{ [DATA_NODE_PATH]: node.path }}
        aria-selected={isActive}
        aria-expanded={isFile ? undefined : expanded}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          padding: "3px 8px 3px " + (8 + depth * 16) + "px",
          cursor: "pointer",
          borderLeft: isActive ? "3px solid var(--brand, #3b82f6)" : "3px solid transparent",
          background: isActive
            ? "var(--sidebar-active-bg, rgba(59,130,246,0.1))"
            : selectedServicePath && node.path.startsWith(selectedServicePath) && !isFile
              ? "var(--surface-subtle, rgba(0,0,0,0.04))"
              : "transparent",
          color: "var(--content-fg, #374151)",
          fontSize: "0.875rem",
          userSelect: "none",
          borderRadius: "0 4px 4px 0",
          outline: isFocused ? "2px solid var(--brand, #3b82f6)" : "none",
          outlineOffset: "-2px",
        }}
      >
        {/* Folder icon or file icon */}
        {isFile ? (
          <i className="bi bi-file-earmark-code" style={{ fontSize: "0.85em", opacity: 0.7 }} />
        ) : (
          <i
            className={expanded ? "bi bi-folder2-open" : "bi bi-folder2"}
            style={{ fontSize: "0.85em", opacity: 0.7 }}
          />
        )}

        {/* Filename — italic + dot when dirty */}
        <span style={{ fontStyle: isDirty ? "italic" : "normal", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {isDirty && <span aria-hidden="true">● </span>}
          {node.name}
        </span>
      </div>

      {/* Render children if folder is expanded */}
      {!isFile && expanded && node.children && (
        <div role="group">
          {node.children.map((child) => (
            <TreeNodeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              serviceSlug={serviceSlug}
              activeFilePath={activeFilePath}
              dirtyFilePaths={dirtyFilePaths}
              onFileClick={onFileClick}
              onServiceSelect={onServiceSelect}
              selectedServicePath={selectedServicePath}
              focusedPath={focusedPath}
              setFocusedPath={setFocusedPath}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FolderTree({
  tree,
  activeFilePath,
  dirtyFilePaths,
  onFileClick,
  selectedServicePath,
  onServiceSelect,
}: FolderTreeProps) {
  // Track focus by node path so it is correct regardless of expand/collapse state.
  // The arrow-key handler reads DOM order via querySelectorAll and syncs focusedPath
  // from the data-node-path attribute of the target element — no arithmetic index needed.
  const [focusedPath, setFocusedPath] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const items = containerRef.current?.querySelectorAll<HTMLElement>("[role='treeitem']");
      if (!items || items.length === 0) return;

      // Find the currently focused item's position in DOM order
      const currentIdx = focusedPath
        ? Array.from(items).findIndex(
            (el) => el.getAttribute(DATA_NODE_PATH) === focusedPath,
          )
        : -1;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = Math.min(currentIdx + 1, items.length - 1);
        const target = items[next];
        const path = target.getAttribute(DATA_NODE_PATH);
        setFocusedPath(path);
        target.focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = Math.max(currentIdx - 1, 0);
        const target = items[prev];
        const path = target.getAttribute(DATA_NODE_PATH);
        setFocusedPath(path);
        target.focus();
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (currentIdx >= 0) {
          items[currentIdx].click();
        }
      }
    },
    [focusedPath],
  );

  return (
    <div
      role="tree"
      aria-label="Mappings file tree"
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      style={{ overflowY: "auto", height: "100%" }}
    >
      {/* Mocks Root label — bound to tree.mocksRoot (AC-2) */}
      <div
        style={{
          padding: "6px 8px",
          fontSize: "0.75rem",
          fontWeight: 600,
          color: "var(--content-muted, #6b7280)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          userSelect: "none",
        }}
      >
        {tree.mocksRoot}
      </div>

      {tree.children.length === 0 ? (
        <div style={{ padding: "8px", color: "var(--content-muted, #6b7280)", fontSize: "0.875rem" }}>
          No services configured.
        </div>
      ) : (
        tree.children.map((serviceNode) => (
          <TreeNodeItem
            key={serviceNode.path}
            node={serviceNode}
            depth={0}
            serviceSlug={slugify(serviceNode.name)}
            activeFilePath={activeFilePath}
            dirtyFilePaths={dirtyFilePaths}
            onFileClick={onFileClick}
            onServiceSelect={onServiceSelect}
            selectedServicePath={selectedServicePath}
            focusedPath={focusedPath}
            setFocusedPath={setFocusedPath}
          />
        ))
      )}
    </div>
  );
}
