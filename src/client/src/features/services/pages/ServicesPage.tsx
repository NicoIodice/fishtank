import { useState } from "react";
import { useServices } from "../hooks/useServices";
import { ServiceCard } from "../components/ServiceCard";
import { AddEditServiceModal } from "../components/AddEditServiceModal";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import type { Service } from "../types/service";
import styles from "./ServicesPage.module.css";

type ViewMode = "grid" | "table";

function getInitialViewMode(): ViewMode {
  try {
    const stored = sessionStorage.getItem("fishtank_services_view");
    return stored === "table" ? "table" : "grid";
  } catch {
    return "grid";
  }
}

export function ServicesPage() {
  const { data: services = [], isLoading, isError } = useServices();
  const [viewMode, setViewMode] = useState<ViewMode>(getInitialViewMode);
  const [modalOpen, setModalOpen] = useState(false);
  const [editService, setEditService] = useState<Service | null>(null);
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());

  // Collect all unique tags across all services
  const allTags = Array.from(new Set(services.flatMap((s) => s.tags))).sort();

  // Filter services by active tags (AND logic)
  const filteredServices =
    activeTags.size === 0
      ? services
      : services.filter((s) =>
          [...activeTags].every((tag) => s.tags.includes(tag)),
        );

  function toggleTag(tag: string) {
    setActiveTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  function openAdd() {
    setEditService(null);
    setModalOpen(true);
  }

  function openEdit(svc: Service) {
    setEditService(svc);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditService(null);
  }

  function handleViewModeChange(mode: ViewMode) {
    setViewMode(mode);
    try {
      sessionStorage.setItem("fishtank_services_view", mode);
    } catch {
      // sessionStorage unavailable
    }
  }

  // Table columns for DataTable base component
  const tableColumns: DataTableColumn<Service>[] = [
    {
      key: "name",
      header: "Name",
      width: "30%",
      sortable: true,
      sortValue: (s) => s.name,
      cell: (s) => <span style={{ fontWeight: 600 }}>{s.name}</span>,
    },
    {
      key: "port",
      header: "Port",
      width: "80px",
      sortable: true,
      sortValue: (s) => s.port,
      cell: (s) => (
        <span style={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
          :{s.port}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "90px",
      cell: (s) => (
        <span
          style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              flexShrink: 0,
              background: s.status === "live" ? "#22c55e" : "#94a3b8",
            }}
          />
          <span className="status-label">
            {s.status === "live" ? "Live" : "Stopped"}
          </span>
        </span>
      ),
    },
    {
      key: "externalUrl",
      header: "External URL",
      width: "25%",
      sortable: true,
      sortValue: (s) => s.externalUrl,
      cell: (s) => (
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontSize: "0.75rem",
          }}
        >
          {s.externalUrl}
        </span>
      ),
    },
    {
      key: "mockFiles",
      header: "Mocks",
      width: "90px",
      cell: (s) => (
        <span style={{ fontSize: "0.75rem" }}>{s.mockFileCount}</span>
      ),
    },
    {
      key: "tags",
      header: "Tags",
      width: "20%",
      cell: (s) => (
        <span style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {s.tags.map((t) => (
            <span
              key={t}
              style={{
                fontSize: "0.6875rem",
                padding: "1px 6px",
                borderRadius: 9999,
                background: "var(--content-surface)",
                border: "1px solid var(--border)",
                color: "var(--content-muted)",
              }}
            >
              {t}
            </span>
          ))}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      width: "80px",
      cell: (s) => (
        <button
          style={{
            fontSize: "0.75rem",
            fontWeight: 500,
            color: "var(--brand)",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
          onClick={(e) => {
            e.stopPropagation();
            openEdit(s);
          }}
          aria-label={`Edit ${s.name}`}
          data-testid={`table-edit-${s.id}`}
        >
          Edit
        </button>
      ),
    },
  ];

  return (
    <main data-testid="page-services">
      {/* Page toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <h1 className="page-title">Services</h1>
          <div className={styles.viewToggle} role="group" aria-label="View mode">
            <button
              className={`${styles.viewBtn} ${viewMode === "grid" ? styles.viewBtnActive : ""}`}
              onClick={() => handleViewModeChange("grid")}
              aria-pressed={viewMode === "grid"}
              aria-label="Grid view"
              title="Grid view"
              type="button"
            >
              <i className="bi bi-grid-3x3-gap" aria-hidden="true" />
            </button>
            <button
              className={`${styles.viewBtn} ${viewMode === "table" ? styles.viewBtnActive : ""}`}
              onClick={() => handleViewModeChange("table")}
              aria-pressed={viewMode === "table"}
              aria-label="Table view"
              title="Table view"
              type="button"
            >
              <i className="bi bi-table" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className={styles.toolbarRight}>
          <button
            className={styles.addBtn}
            onClick={openAdd}
            data-testid="btn-add-service"
            type="button"
          >
            <i className="bi bi-plus-lg" aria-hidden="true" />
            Add Service
          </button>
        </div>
      </div>

      {/* Tag filter chips */}
      {allTags.length > 0 && (
        <div
          className={styles.tagFilter}
          role="group"
          aria-label="Filter by tag"
        >
          {allTags.map((tag) => (
            <button
              key={tag}
              className={`${styles.tagFilterChip} ${activeTags.has(tag) ? styles.tagFilterChipActive : ""}`}
              onClick={() => toggleTag(tag)}
              aria-pressed={activeTags.has(tag)}
              type="button"
            >
              {tag}
            </button>
          ))}
          {activeTags.size > 0 && (
            <button
              className={styles.clearTagsBtn}
              onClick={() => setActiveTags(new Set())}
              aria-label="Clear all tag filters"
              type="button"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className={styles.loadingState} data-testid="services-loading">
          <i
            className="bi bi-arrow-clockwise"
            aria-hidden="true"
            style={{ animation: "spin 1s linear infinite" }}
          />
          <span>Loading services…</span>
        </div>
      )}

      {/* Error */}
      {isError && (
        <div
          className={styles.errorState}
          role="alert"
          data-testid="services-error"
        >
          <i className="bi bi-exclamation-triangle" aria-hidden="true" />
          Failed to load services. Please refresh the page.
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && filteredServices.length === 0 && (
        <div className={styles.emptyState} data-testid="services-empty">
          <i
            className="bi bi-server"
            aria-hidden="true"
            style={{ fontSize: "2rem", color: "var(--content-muted)" }}
          />
          <p>
            {activeTags.size > 0
              ? "No services match the selected tags."
              : "No services yet."}
          </p>
          {activeTags.size === 0 && (
            <button
              className={styles.emptyAddBtn}
              onClick={openAdd}
              data-testid="empty-add-service"
              type="button"
            >
              <i className="bi bi-plus-lg" aria-hidden="true" />
              Add Service
            </button>
          )}
        </div>
      )}

      {/* Card grid */}
      {!isLoading && !isError && filteredServices.length > 0 && viewMode === "grid" && (
        <div className={styles.cardGrid} data-testid="services-grid">
          {filteredServices.map((svc) => (
            <ServiceCard key={svc.id} service={svc} onEdit={openEdit} />
          ))}
        </div>
      )}

      {/* Table view */}
      {!isLoading &&
        !isError &&
        filteredServices.length > 0 &&
        viewMode === "table" && (
          <DataTable
            columns={tableColumns}
            rows={filteredServices}
            getRowId={(s) => s.id}
            data-testid="services-table"
          />
        )}

      {/* Add / Edit modal */}
      {modalOpen && (
        <AddEditServiceModal
          mode={editService ? "edit" : "add"}
          service={editService ?? undefined}
          onClose={closeModal}
        />
      )}
    </main>
  );
}

