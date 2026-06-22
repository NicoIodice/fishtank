---
story_id: "2.2"
epic: 2
story_key: 2-2-services-page-browse-create-and-edit-services
story_title: "Services Page â€” Browse, Create & Edit Services"
status: review
priority: high
baseline_commit: 0ec129b3b7e2fc47e739ba9c8f2e7fe48ace2f1a
---

# Story 2.2: Services Page â€” Browse, Create & Edit Services

## Story

**As a** developer,  
**I want** to view all mock services in a card grid or table, and create or edit services through a guided modal,  
**So that** I can manage my service definitions without writing JSON or using the command line.

---

## Status

Review

---

## Context

### Background

Story 2.1 built the complete backend for Services Management: `GET /api/services`, `POST /api/services`, `PUT /api/services/{id}`, `POST /api/services/{id}/stop`, `POST /api/services/{id}/start`, and `GET /api/services/next-port` are all live. `ServiceDto` is defined. The WireMock engine starts automatically on service creation.

This story builds the **React frontend** for browsing, creating, and editing services. It also:
- Adds `MockFileCount` to the `ServiceDto` and `ServiceManager` (counting files in the service's MocksRoot folder)
- Creates the `<DataTable>` base component that Epics 3 and 4 will extend
- Does NOT wire ServicesHub real-time updates â€” that is Story 2.3
- Does NOT implement optimistic toggle UI â€” that is Story 2.3 (toggle in this story calls API and re-fetches, no optimistic)

### Current State of Services Frontend

`src/client/src/features/services/pages/ServicesPage.tsx` is a placeholder:
```tsx
export function ServicesPage() {
  return (
    <main data-testid="page-services">
      <h1 className="page-title">Services</h1>
      <p className="text-muted">Configured in a later story.</p>
    </main>
  );
}
```

`src/client/src/features/services/` has only `pages/ServicesPage.tsx`. No `components/`, `hooks/`, or `types/` directories exist yet.

### Current State of ServiceDto (Story 2.1 baseline)

```csharp
// src/Fishtank.Api/Models/ServiceDto.cs
public record ServiceDto(
    Guid Id, string Name, string Slug, string? Description,
    string ExternalUrl, int Port, string MocksRoot,
    string Status,   // "live" | "stopped"
    bool IsActive, string[] Tags,
    DateTimeOffset CreatedAt,
    bool? MocksRootChanged = null  // AC-5 only on PUT response
);
```

This story adds `int MockFileCount` to `ServiceDto`.

### Implementation Sequence for This Story

1. **Backend**: Add `MockFileCount` to `ServiceDto` and compute it in `ServiceManager` â€” blocks frontend integration tests
2. **Frontend types**: Define `Service` TypeScript interface matching updated `ServiceDto`
3. **Frontend hooks**: `useServices`, `useNextPort`, `useCreateService`, `useUpdateService`, `useToggleService`
4. **`<DataTable>` base component** â€” establishes the shared table anatomy for Epics 3 + 4
5. **`ServiceCard` component** â€” full UX-DR8 spec
6. **`AddEditServiceModal` component** â€” full validation + slug-change warning
7. **`ServicesPage`** complete implementation â€” card grid + table toggle + tag filter + empty state
8. **Integration tests** (backend: MockFileCount) + **E2E Playwright tests** (frontend)

### Already Established: apiFetch and React Query Patterns

```typescript
// src/client/src/lib/api.ts â€” USE THIS, never raw fetch
import { apiFetch } from "@/lib/api";
// credentials: 'include' is always set automatically

// React Query pattern (same as auth hooks):
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
```

### Already Established: HUB_INVALIDATION_MAP

```typescript
// src/client/src/lib/queryClient.ts
export const HUB_INVALIDATION_MAP: Record<string, QueryKey[]> = {
  // Comment says "DO NOT add entries in this story" for Story 2.1
  // Story 2.3 adds: ServiceStatusChanged: [["services"]]
};
```
**This story does NOT modify `HUB_INVALIDATION_MAP`** â€” that is Story 2.3.

### Bootstrap Icons Usage Pattern

Bootstrap Icons are installed as an npm package (`bootstrap-icons: ^1.13.1`).
The icons are linked via CSS in `src/client/index.html` or via a global CSS import.
Check `src/client/index.html` to see how icons are currently imported.
Usage pattern: `<i className="bi bi-server" aria-hidden="true" />` (same as in `AboutModal.tsx`).

### Modal Pattern (from AboutModal.tsx)

The `AboutModal` establishes the modal pattern:
- Backdrop div handles click-outside-to-close: `onClick={handleBackdropClick}` where `e.target === e.currentTarget`
- Keyboard: `onKeyDown` handles `Escape`
- Root div: `role="presentation"`, inner div: `role="dialog" aria-modal="true" aria-labelledby`
- Close button: `aria-label="Close [Name] modal"`
- `data-testid` on the dialog element

Use the same pattern in `AddEditServiceModal`.

### Tag Filter Behavior

Tag filter is **client-side only** â€” no new API endpoint. The `useServices` hook fetches all services once; tag filtering is applied in component state using `Array.filter()`. The tag filter renders as a multi-select or a click-to-toggle chip list in the Services page header (above the card grid / table).

---

## Acceptance Criteria

**AC-1 â€” Services card grid:**  
**Given** the `/services` route,  
**When** the page loads,  
**Then** services are displayed in a card grid (default); Stopped services render at 72% opacity; an empty state with a primary "Add Service" button is shown when no services exist (FR-6, UX-DR8).

**AC-2 â€” Responsive grid columns:**  
**Given** the card grid,  
**Then** 3 columns at â‰¥1024px, 2 columns at 640â€“1023px, 1 column at <640px (FR-6, UX-DR6).

**AC-3 â€” Service card content:**  
**Given** a Service card,  
**Then** it displays: name (bold), description (muted), port badge (monospace, violet-100/violet-700 colors), External URL, mock file count, status pill (Live: green-500 dot + pulse animation; Stopped: slate-500 dot, no pulse), enable/disable toggle, and explicit "Edit" link; clicking name/description area has no action (UX-DR8).

**AC-4 â€” Table view:**  
**Given** the table view toggle in the Services toolbar,  
**When** the user switches to table view,  
**Then** services render in a sortable table using the `<DataTable>` base component: `table-layout: fixed`, `<colgroup>` column widths, sticky headers, row hover state, keyboard arrow-key navigation; view preference persisted per session (FR-6, UX-DR11).

**AC-5 â€” Add Service modal port pre-fill:**  
**Given** the "Add Service" modal,  
**Then** the port field is pre-filled with the next available port (from `GET /api/services/next-port`); the three read-only path fields (MocksRoot, mappings/, responses/) update with a 200ms debounce after each keystroke in Service Name; all validation errors appear inline on field blur and on submit (FR-1).

**AC-6 â€” Create service:**  
**Given** the Add Service modal with a valid form submitted,  
**Then** the service is created, the WireMock engine starts on the assigned port, the card grid shows the new card, and the modal closes (FR-1).

**AC-7 â€” Tags:**  
**Given** tags in the Add/Edit Service modal,  
**Then** free-form text tags can be entered (press Enter or comma to add); tags are saved with the service; a tag filter chip list in the Services page header filters the displayed services to matching services (FR-2).

**AC-8 â€” Edit modal:**  
**Given** the "Edit" link on a service card,  
**When** the Edit modal opens,  
**Then** all fields are pre-populated; a Slug-change warning appears inline if the name change would alter the Slug (FR-4).

**AC-9 â€” Performance:**  
**Given** 50 configured services,  
**When** the Services page loads,  
**Then** all cards render within 1 second of navigation (feature-specific NFR from PRD Â§5.1).

**AC-10 â€” MockFileCount on ServiceDto:**  
**Given** `GET /api/services`,  
**Then** each service in the response includes `mockFileCount: int` â€” the number of `.json` files in the service's MocksRoot directory; returns `0` if the directory does not exist or is inaccessible.

---

## Tasks / Subtasks

### Task 1: Add MockFileCount to ServiceDto and ServiceManager (AC: #10)

- [x] Update `src/Fishtank.Api/Models/ServiceDto.cs`:
  ```csharp
  public record ServiceDto(
      Guid Id,
      string Name,
      string Slug,
      string? Description,
      string ExternalUrl,
      int Port,
      string MocksRoot,
      string Status,
      bool IsActive,
      string[] Tags,
      DateTimeOffset CreatedAt,
      int MockFileCount,              // NEW â€” count of .json files in MocksRoot/
      bool? MocksRootChanged = null
  );
  ```

- [x] Update `src/Fishtank.Api/Services/ServiceManager.cs` â€” add a private helper:
  ```csharp
  private static int CountMockFiles(string mocksRoot)
  {
      try
      {
          if (!Directory.Exists(mocksRoot)) return 0;
          return Directory.GetFiles(mocksRoot, "*.json", SearchOption.TopDirectoryOnly).Length;
      }
      catch
      {
          return 0; // inaccessible volume â†’ graceful 0, not 500
      }
  }
  ```

- [x] Update `ServiceManager` DTO mapping everywhere `ServiceDto` is constructed (search for `new ServiceDto(` in ServiceManager.cs):
  - Add `MockFileCount: CountMockFiles(service.MocksRoot)` to each `ServiceDto` instantiation
  - **NOTE**: `CreateAsync` constructs the DTO after saving. `UpdateAsync`, `StopAsync`, `StartAsync`, and `ListAsync` all construct DTOs too â€” update ALL of them.

- [x] Update `src/Fishtank.Api.IntegrationTests/Api/Story2_1_ServicesTests.cs`:
  - The AC-1 test that asserts on ServiceDto shape now must accept `mockFileCount: 0` (MocksRoot won't exist in tests â€” returns 0 gracefully).
  - Do NOT re-write existing tests â€” add only a `mockFileCount` assertion where DTO shape is checked.

### Task 2: Define frontend service types (AC: #3, #5, #6)

- [x] Create `src/client/src/features/services/types/service.ts`:
  ```typescript
  export interface Service {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    externalUrl: string;
    port: number;
    mocksRoot: string;
    status: "live" | "stopped";
    isActive: boolean;
    tags: string[];
    createdAt: string;      // ISO datetime
    mockFileCount: number;
  }

  export interface CreateServicePayload {
    name: string;
    description?: string | null;
    externalUrl: string;
    port: number;
    tags?: string[];
  }

  export interface UpdateServicePayload {
    name: string;
    description?: string | null;
    externalUrl: string;
    port: number;
    tags?: string[];
  }

  export interface CreateServiceResponse extends Service {
    mocksRootChanged?: boolean | null;
  }

  // In-page form state (not sent to API)
  export interface ServiceFormValues {
    name: string;
    description: string;
    externalUrl: string;
    port: string;      // String for input, converted to number on submit
    tags: string[];
  }
  ```

### Task 3: Create React Query hooks for services (AC: #1, #5, #6, #8)

- [x] Create `src/client/src/features/services/hooks/useServices.ts`:
  ```typescript
  import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
  import { apiFetch } from "@/lib/api";
  import type { Service, CreateServicePayload, UpdateServicePayload, CreateServiceResponse } from "../types/service";

  export const SERVICES_QUERY_KEY = ["services"] as const;
  export const NEXT_PORT_QUERY_KEY = ["services", "next-port"] as const;

  export function useServices() {
    return useQuery<Service[]>({
      queryKey: SERVICES_QUERY_KEY,
      queryFn: () => apiFetch<Service[]>("/api/services"),
      staleTime: 30_000,
    });
  }

  export function useNextPort() {
    return useQuery<number>({
      queryKey: NEXT_PORT_QUERY_KEY,
      queryFn: () => apiFetch<number>("/api/services/next-port"),
      staleTime: 0, // Always fresh â€” another user might create a service concurrently
    });
  }

  export function useCreateService() {
    const qc = useQueryClient();
    return useMutation<CreateServiceResponse, Error, CreateServicePayload>({
      mutationFn: (payload) =>
        apiFetch<CreateServiceResponse>("/api/services", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }),
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: SERVICES_QUERY_KEY });
        void qc.invalidateQueries({ queryKey: NEXT_PORT_QUERY_KEY });
      },
    });
  }

  export function useUpdateService() {
    const qc = useQueryClient();
    return useMutation<CreateServiceResponse, Error, { id: string; payload: UpdateServicePayload }>({
      mutationFn: ({ id, payload }) =>
        apiFetch<CreateServiceResponse>(`/api/services/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }),
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: SERVICES_QUERY_KEY });
      },
    });
  }

  // Story 2.2: basic toggle â€” no optimistic update (Story 2.3 upgrades this)
  export function useToggleService() {
    const qc = useQueryClient();
    return useMutation<Service, Error, { id: string; action: "start" | "stop" }>({
      mutationFn: ({ id, action }) =>
        apiFetch<Service>(`/api/services/${id}/${action}`, { method: "POST" }),
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: SERVICES_QUERY_KEY });
      },
    });
  }
  ```

### Task 4: Create `<DataTable>` base component (AC: #4)

This component is the shared table base. Epic 3 and 4 will extend it with activity-log columns and mapping-file columns respectively. The base is generic enough to render any row type.

- [x] Create `src/client/src/components/ui/DataTable.tsx`:
  ```tsx
  import { useRef, useState, useEffect, type ReactNode } from "react";
  import styles from "./DataTable.module.css";

  export interface DataTableColumn<T> {
    key: string;
    header: ReactNode;
    width?: string;          // e.g. "180px", "1fr"
    sortable?: boolean;
    cell: (row: T) => ReactNode;
    ariaLabel?: (row: T) => string;
  }

  interface DataTableProps<T> {
    columns: DataTableColumn<T>[];
    rows: T[];
    getRowId: (row: T) => string;
    onRowClick?: (row: T) => void;
    caption?: string;
    "data-testid"?: string;
  }

  export function DataTable<T>({
    columns,
    rows,
    getRowId,
    onRowClick,
    caption,
    "data-testid": testId,
  }: DataTableProps<T>) {
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortAsc, setSortAsc] = useState(true);
    const [focusedRowIdx, setFocusedRowIdx] = useState<number | null>(null);
    const tbodyRef = useRef<HTMLTableSectionElement>(null);

    // Keyboard navigation: arrow up/down moves focus, Enter triggers onRowClick
    function handleKeyDown(e: React.KeyboardEvent, idx: number) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = Math.min(idx + 1, rows.length - 1);
        setFocusedRowIdx(next);
        (tbodyRef.current?.children[next] as HTMLElement)?.focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = Math.max(idx - 1, 0);
        setFocusedRowIdx(prev);
        (tbodyRef.current?.children[prev] as HTMLElement)?.focus();
      } else if (e.key === "Enter" && onRowClick) {
        onRowClick(rows[idx]);
      }
    }

    function handleSortClick(key: string) {
      if (sortKey === key) setSortAsc((v) => !v);
      else { setSortKey(key); setSortAsc(true); }
    }

    const sortedRows = sortKey
      ? [...rows].sort((a, b) => {
          const col = columns.find((c) => c.key === sortKey);
          if (!col) return 0;
          const aVal = col.cell(a);
          const bVal = col.cell(b);
          const aStr = typeof aVal === "string" ? aVal : String(aVal ?? "");
          const bStr = typeof bVal === "string" ? bVal : String(bVal ?? "");
          return sortAsc ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
        })
      : rows;

    return (
      <div className={styles.wrapper} data-testid={testId}>
        <table className={styles.table}>
          {caption && <caption className={styles.caption}>{caption}</caption>}
          <colgroup>
            {columns.map((col) => (
              <col key={col.key} style={{ width: col.width }} />
            ))}
          </colgroup>
          <thead className={styles.thead}>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={styles.th}
                  aria-sort={
                    sortKey === col.key
                      ? sortAsc
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                >
                  {col.sortable ? (
                    <button
                      className={styles.sortBtn}
                      onClick={() => handleSortClick(col.key)}
                      aria-label={`Sort by ${typeof col.header === "string" ? col.header : col.key}`}
                    >
                      {col.header}
                      {sortKey === col.key && (
                        <i
                          className={`bi ${sortAsc ? "bi-caret-up-fill" : "bi-caret-down-fill"}`}
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody ref={tbodyRef} className={styles.tbody}>
            {sortedRows.map((row, idx) => (
              <tr
                key={getRowId(row)}
                className={`${styles.tr} ${onRowClick ? styles.clickable : ""}`}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={() => onRowClick?.(row)}
                onKeyDown={(e) => handleKeyDown(e, idx)}
                onFocus={() => setFocusedRowIdx(idx)}
                aria-label={
                  columns[0]?.ariaLabel ? columns[0].ariaLabel(row) : undefined
                }
              >
                {columns.map((col) => (
                  <td key={col.key} className={styles.td}>
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className={styles.empty} data-testid="datatable-empty">
            No items to display.
          </div>
        )}
      </div>
    );
  }
  ```

- [x] Create `src/client/src/components/ui/DataTable.module.css`:
  ```css
  .wrapper {
    width: 100%;
    overflow-x: hidden; /* No horizontal scroll â€” table-layout: fixed */
  }

  .table {
    width: 100%;
    table-layout: fixed;
    border-collapse: collapse;
    font-size: 0.875rem;
    color: var(--content-fg);
  }

  .caption {
    text-align: left;
    font-size: 0.75rem;
    color: var(--content-muted);
    margin-bottom: 8px;
  }

  .thead {
    position: sticky;
    top: 0;
    z-index: 1;
    background: var(--content-surface);
  }

  .th {
    padding: 8px 12px;
    font-size: 0.6875rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--content-muted);
    text-align: left;
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
  }

  .sortBtn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: none;
    border: none;
    cursor: pointer;
    font-size: inherit;
    font-weight: inherit;
    text-transform: inherit;
    letter-spacing: inherit;
    color: inherit;
    padding: 0;
  }

  .sortBtn:hover {
    color: var(--content-fg);
  }

  .tbody {}

  .tr {
    border-bottom: 1px solid var(--border);
    transition: background-color 0.1s;
  }

  .tr:hover {
    background: var(--content-surface);
  }

  .clickable {
    cursor: pointer;
  }

  .clickable:focus-visible {
    outline: 2px solid var(--brand);
    outline-offset: -2px;
  }

  .td {
    padding: 10px 12px;
    vertical-align: middle;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .empty {
    padding: 32px;
    text-align: center;
    color: var(--content-muted);
    font-size: 0.875rem;
  }

  @media (prefers-reduced-motion: reduce) {
    .tr {
      transition: none;
    }
  }
  ```

### Task 5: Create `ServiceCard` component (AC: #3, full UX-DR8 spec)

- [x] Create `src/client/src/features/services/components/ServiceCard.module.css`:
  ```css
  .card {
    background: var(--content-bg);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    padding: var(--card-p);
    display: flex;
    flex-direction: column;
    gap: 8px;
    transition: border-color 0.15s;
  }

  .card:hover {
    border-color: rgba(var(--brand-rgb), 0.3);
  }

  .card.stopped {
    opacity: 0.72;
  }

  .header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
  }

  .nameSection {
    flex: 1;
    min-width: 0;
  }

  .name {
    font-weight: 700;
    font-size: 0.875rem;
    color: var(--content-fg);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .description {
    font-size: 0.75rem;
    color: var(--content-muted);
    margin-top: 2px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .portBadge {
    font-family: 'Cascadia Code', 'Fira Code', Consolas, ui-monospace, monospace;
    font-size: 0.75rem;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: var(--radius-full);
    background: var(--port-badge-bg);
    color: var(--port-badge-fg);
    white-space: nowrap;
    flex-shrink: 0;
  }

  .meta {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .metaRow {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.75rem;
    color: var(--content-muted);
    overflow: hidden;
  }

  .metaRow i {
    flex-shrink: 0;
    font-size: 0.8125rem;
  }

  .metaValue {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-top: auto;
    padding-top: 8px;
    border-top: 1px solid var(--border);
  }

  .statusPill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .dot.live {
    background: #22c55e;
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  .dot.stopped {
    background: #94a3b8;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .toggle {
    position: relative;
    display: inline-flex;
    align-items: center;
    width: 36px;
    height: 20px;
    cursor: pointer;
  }

  .toggle input {
    opacity: 0;
    width: 0;
    height: 0;
    position: absolute;
  }

  .toggleTrack {
    position: absolute;
    inset: 0;
    border-radius: 20px;
    background: #cbd5e1;
    transition: background 0.2s;
  }

  .toggle input:checked + .toggleTrack {
    background: var(--brand);
  }

  .toggleThumb {
    position: absolute;
    left: 3px;
    top: 3px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #ffffff;
    transition: transform 0.2s;
  }

  .toggle input:checked ~ .toggleThumb {
    transform: translateX(16px);
  }

  .toggle:focus-within {
    outline: 2px solid var(--brand);
    outline-offset: 2px;
    border-radius: 20px;
  }

  .editLink {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--brand);
    text-decoration: none;
    cursor: pointer;
    background: none;
    border: none;
    padding: 0;
  }

  .editLink:hover {
    text-decoration: underline;
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .tag {
    font-size: 0.6875rem;
    padding: 1px 6px;
    border-radius: var(--radius-full);
    background: var(--content-surface);
    border: 1px solid var(--border);
    color: var(--content-muted);
  }

  @media (prefers-reduced-motion: reduce) {
    .card { transition: none; }
    .dot.live { animation: none; }
    .toggleTrack { transition: none; }
    .toggleThumb { transition: none; }
  }
  ```

- [x] Create `src/client/src/features/services/components/ServiceCard.tsx`:
  ```tsx
  import type { Service } from "../types/service";
  import { useToggleService } from "../hooks/useServices";
  import styles from "./ServiceCard.module.css";

  interface ServiceCardProps {
    service: Service;
    onEdit: (service: Service) => void;
  }

  export function ServiceCard({ service, onEdit }: ServiceCardProps) {
    const toggleMutation = useToggleService();
    const isLive = service.status === "live";
    const toggleId = `toggle-${service.id}`;

    function handleToggle() {
      toggleMutation.mutate({ id: service.id, action: isLive ? "stop" : "start" });
    }

    return (
      <article
        className={`${styles.card} ${!isLive ? styles.stopped : ""}`}
        data-testid={`service-card-${service.id}`}
        aria-label={`${service.name} service card`}
      >
        {/* Header row: name + description (non-interactive area) + port badge */}
        <div className={styles.header}>
          <div className={styles.nameSection}>
            <div className={styles.name}>{service.name}</div>
            {service.description && (
              <div className={styles.description}>{service.description}</div>
            )}
          </div>
          <span className={styles.portBadge} title={`Port ${service.port}`}>
            :{service.port}
          </span>
        </div>

        {/* Meta: External URL, mock file count */}
        <div className={styles.meta}>
          <div className={styles.metaRow}>
            <i className="bi bi-link-45deg" aria-hidden="true" />
            <span className={styles.metaValue} title={service.externalUrl}>
              {service.externalUrl}
            </span>
          </div>
          <div className={styles.metaRow}>
            <i className="bi bi-file-earmark-code" aria-hidden="true" />
            <span className={styles.metaValue}>
              {service.mockFileCount === 0
                ? "No mapping files"
                : `${service.mockFileCount} mapping ${service.mockFileCount === 1 ? "file" : "files"}`}
            </span>
          </div>
          <div className={styles.metaRow}>
            <i className="bi bi-folder2" aria-hidden="true" />
            <span className={styles.metaValue} title={service.mocksRoot} style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "0.6875rem" }}>
              {service.mocksRoot}
            </span>
          </div>
        </div>

        {/* Tags */}
        {service.tags.length > 0 && (
          <div className={styles.tags} aria-label="Service tags">
            {service.tags.map((tag) => (
              <span key={tag} className={styles.tag}>{tag}</span>
            ))}
          </div>
        )}

        {/* Footer: status pill + toggle + edit link */}
        <div className={styles.footer}>
          <div className={styles.statusPill} aria-live="polite">
            <span
              className={`${styles.dot} ${isLive ? styles.live : styles.stopped}`}
              aria-hidden="true"
            />
            <span className="status-label">{isLive ? "Live" : "Stopped"}</span>
          </div>
          <div className={styles.actions}>
            {/* Enable/disable toggle â€” optimistic upgrade in Story 2.3 */}
            <label
              className={styles.toggle}
              htmlFor={toggleId}
              aria-label={`${isLive ? "Stop" : "Start"} ${service.name}`}
            >
              <input
                id={toggleId}
                type="checkbox"
                checked={isLive}
                onChange={handleToggle}
                disabled={toggleMutation.isPending}
                aria-label={`${isLive ? "Stop" : "Start"} ${service.name}`}
              />
              <span className={styles.toggleTrack} />
              <span className={styles.toggleThumb} />
            </label>

            {/* Edit link â€” opens Add/Edit modal in Edit mode */}
            <button
              className={styles.editLink}
              onClick={() => onEdit(service)}
              aria-label={`Edit ${service.name}`}
              data-testid={`edit-service-${service.id}`}
            >
              Edit
            </button>
          </div>
        </div>
      </article>
    );
  }
  ```

### Task 6: Create `AddEditServiceModal` component (AC: #5, #6, #7, #8)

The modal handles both Add and Edit modes. Slug change warning is shown in Edit mode when the submitted name would produce a different slug.

- [x] Create `src/client/src/features/services/components/AddEditServiceModal.module.css`:
  See the `AboutModal.module.css` for base modal CSS patterns. The AddEdit modal is larger (full-size form), so it needs its own layout. Key classes: `.backdrop`, `.modal`, `.header`, `.title`, `.closeBtn`, `.body`, `.fieldGroup`, `.label`, `.input`, `.readonlyPath`, `.error`, `.tagInput`, `.tagChips`, `.tagChip`, `.tagRemove`, `.slugWarning`, `.footer`, `.cancelBtn`, `.submitBtn`.

  ```css
  /* AddEditServiceModal.module.css */
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: var(--z-modal-backdrop);
    padding: 16px;
  }

  .modal {
    background: var(--content-bg);
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-overlay);
    width: 100%;
    max-width: 520px;
    max-height: calc(100dvh - 32px);
    display: flex;
    flex-direction: column;
    z-index: var(--z-modal);
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .title {
    font-size: 1rem;
    font-weight: 700;
    color: var(--content-fg);
  }

  .closeBtn {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--content-muted);
    font-size: 1rem;
    padding: 4px;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
  }

  .closeBtn:hover { color: var(--content-fg); }

  .body {
    padding: 20px;
    overflow-y: auto;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .fieldGroup {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--content-fg);
  }

  .required::after {
    content: " *";
    color: var(--error);
  }

  .input {
    padding: 8px 10px;
    border: 1px solid var(--input-border);
    border-radius: var(--radius-md);
    background: var(--input-bg);
    color: var(--content-fg);
    font-size: 0.875rem;
    width: 100%;
    font-family: inherit;
  }

  .input:focus-visible {
    outline: 2px solid var(--brand);
    outline-offset: 0;
    border-color: var(--brand);
  }

  .input.hasError {
    border-color: var(--error);
  }

  .readonlyPath {
    padding: 6px 10px;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--content-surface);
    color: var(--content-muted);
    font-size: 0.75rem;
    font-family: 'Cascadia Code', 'Fira Code', Consolas, ui-monospace, monospace;
    word-break: break-all;
  }

  .errorMsg {
    font-size: 0.75rem;
    color: var(--error);
  }

  .slugWarning {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    padding: 8px 10px;
    border-radius: var(--radius-md);
    background: var(--warning-subtle);
    border: 1px solid var(--warning);
    font-size: 0.75rem;
    color: var(--content-fg);
  }

  .tagInputRow {
    display: flex;
    gap: 8px;
  }

  .tagInput {
    flex: 1;
    padding: 6px 10px;
    border: 1px solid var(--input-border);
    border-radius: var(--radius-md);
    background: var(--input-bg);
    color: var(--content-fg);
    font-size: 0.875rem;
    font-family: inherit;
  }

  .tagChips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    min-height: 24px;
  }

  .tagChip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px 2px 10px;
    border-radius: var(--radius-full);
    background: var(--content-surface);
    border: 1px solid var(--border);
    font-size: 0.75rem;
    color: var(--content-fg);
  }

  .tagRemove {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--content-muted);
    font-size: 0.6875rem;
    padding: 0;
    display: flex;
    align-items: center;
  }

  .tagRemove:hover { color: var(--error); }

  .footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 14px 20px;
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }

  .cancelBtn {
    padding: 8px 16px;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--content-bg);
    color: var(--content-fg);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
  }

  .cancelBtn:hover { background: var(--content-surface); }

  .submitBtn {
    padding: 8px 16px;
    border: none;
    border-radius: var(--radius-md);
    background: var(--brand);
    color: var(--brand-fg);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
  }

  .submitBtn:hover { opacity: 0.9; }
  .submitBtn:disabled { opacity: 0.5; cursor: not-allowed; }

  @media (prefers-reduced-motion: reduce) {
    .modal { transition: none; }
  }
  ```

- [x] Create `src/client/src/features/services/components/AddEditServiceModal.tsx`:
  
  Key behaviors:
  - **Port pre-fill**: On mount in Add mode, call `GET /api/services/next-port` to pre-fill the port field. The `useNextPort` hook is called only when modal is open (query should be enabled conditionally).
  - **Read-only paths**: Three read-only fields showing computed paths. MocksRoot = `{mocksRootDisplay}/{slug}`. Use a `200ms` debounced effect on the `name` field to update them. For Add mode, `mocksRootDisplay = "/app/mocks"` (hardcoded â€” the actual base path is only known server-side, but the convention is `/app/mocks/{slug}`; show as informational). Actually show all three: MocksRoot, `{mocksRoot}/`, `{mocksRoot}/responses/` â€” just the mocksRoot (mappings folder) since the architecture shows `MappingsFolder = service.MocksRoot`.
  - **Slug computation**: Mirror the backend slug logic in JS: `name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/^-+|-+$/g, '')` 
  - **Slug-change warning in Edit mode**: Show a warning banner if `newSlug !== originalSlug` while editing an existing service.
  - **Validation on blur + submit**: Required fields: name (non-empty, â‰¤64 chars), externalUrl (must start with `http://` or `https://`), port (must be number 30100â€“30199). All errors from `ApiError` thrown on submit also shown inline.
  - **Tags**: Enter a tag string and press Enter or comma key to add it as a chip. Click âœ• on a chip to remove it. Tags can also be pasted as comma-separated values.

  ```tsx
  import { useState, useEffect, useCallback, useRef } from "react";
  import { useNextPort, useCreateService, useUpdateService } from "../hooks/useServices";
  import type { Service, ServiceFormValues } from "../types/service";
  import { ApiError } from "@/lib/api";
  import styles from "./AddEditServiceModal.module.css";

  interface AddEditServiceModalProps {
    mode: "add" | "edit";
    service?: Service;   // Present in edit mode
    onClose: () => void;
    onSuccess?: () => void;
  }

  function generateSlug(name: string): string {
    return name.toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/^-+|-+$/g, "");
  }

  export function AddEditServiceModal({
    mode,
    service,
    onClose,
    onSuccess,
  }: AddEditServiceModalProps) {
    const isEdit = mode === "edit";

    // Form state
    const [values, setValues] = useState<ServiceFormValues>(() => ({
      name: service?.name ?? "",
      description: service?.description ?? "",
      externalUrl: service?.externalUrl ?? "",
      port: service?.port?.toString() ?? "",
      tags: service?.tags ?? [],
    }));
    const [errors, setErrors] = useState<Partial<Record<keyof ServiceFormValues, string>>>({});
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [tagInput, setTagInput] = useState("");
    const [debouncedName, setDebouncedName] = useState(values.name);

    // Debounce name â†’ slug â†’ path preview (200ms)
    useEffect(() => {
      const timer = setTimeout(() => setDebouncedName(values.name), 200);
      return () => clearTimeout(timer);
    }, [values.name]);

    const slug = generateSlug(debouncedName);
    const originalSlug = service ? generateSlug(service.name) : null;
    const slugChanged = isEdit && originalSlug !== null && slug !== originalSlug && slug.length >= 2;
    const mocksRootPreview = slug.length >= 2 ? `/app/mocks/${slug}` : "/app/mocks/...";

    // Next port pre-fill (Add mode only)
    const { data: nextPort } = useNextPort();
    useEffect(() => {
      if (!isEdit && nextPort && !values.port) {
        setValues((v) => ({ ...v, port: String(nextPort) }));
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nextPort, isEdit]);

    const createService = useCreateService();
    const updateService = useUpdateService();

    function validateForm(): boolean {
      const newErrors: Partial<Record<keyof ServiceFormValues, string>> = {};
      if (!values.name.trim()) newErrors.name = "Service name is required.";
      else if (values.name.trim().length > 64) newErrors.name = "Service name must be 64 characters or fewer.";
      else if (/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u.test(values.name)) newErrors.name = "Service name must not contain emoji.";
      if (!values.externalUrl.trim()) newErrors.externalUrl = "External URL is required.";
      else if (!/^https?:\/\/.+/.test(values.externalUrl.trim())) newErrors.externalUrl = "External URL must start with http:// or https://";
      const portNum = Number(values.port);
      if (!values.port.trim() || isNaN(portNum)) newErrors.port = "Port is required.";
      else if (portNum < 30100 || portNum > 30199) newErrors.port = "Port must be in the range 30100â€“30199.";
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    }

    async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      setSubmitError(null);
      if (!validateForm()) return;

      const payload = {
        name: values.name.trim(),
        description: values.description.trim() || null,
        externalUrl: values.externalUrl.trim(),
        port: Number(values.port),
        tags: values.tags,
      };

      try {
        if (isEdit && service) {
          await updateService.mutateAsync({ id: service.id, payload });
        } else {
          await createService.mutateAsync(payload);
        }
        onSuccess?.();
        onClose();
      } catch (err) {
        if (err instanceof ApiError) {
          // Map known error codes to field-level errors
          if (err.code === "SERVICE_NAME_REQUIRED" || err.code === "SERVICE_NAME_TOO_LONG" || err.code === "SERVICE_NAME_INVALID") {
            setErrors((e) => ({ ...e, name: err.message }));
          } else if (err.code === "SERVICE_PORT_CONFLICT" || err.code === "SERVICE_PORT_OUT_OF_RANGE" || err.code === "SERVICE_PORT_RANGE_EXHAUSTED") {
            setErrors((e) => ({ ...e, port: err.message }));
          } else if (err.code === "SERVICE_URL_INVALID") {
            setErrors((e) => ({ ...e, externalUrl: err.message }));
          } else if (err.code === "SERVICE_SLUG_CONFLICT") {
            setErrors((e) => ({ ...e, name: err.message }));
          } else {
            setSubmitError(err.message);
          }
        } else {
          setSubmitError("An unexpected error occurred. Please try again.");
        }
      }
    }

    function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
      if (e.target === e.currentTarget) onClose();
    }

    function handleKeyDown(e: React.KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    // Tag handling
    function addTag(raw: string) {
      const parts = raw.split(",").map((t) => t.trim()).filter(Boolean);
      const newTags = parts.filter((t) => !values.tags.includes(t));
      if (newTags.length > 0) setValues((v) => ({ ...v, tags: [...v.tags, ...newTags] }));
    }

    function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        addTag(tagInput);
        setTagInput("");
      }
    }

    function removeTag(tag: string) {
      setValues((v) => ({ ...v, tags: v.tags.filter((t) => t !== tag) }));
    }

    const isPending = createService.isPending || updateService.isPending;

    return (
      <div
        className={styles.backdrop}
        onClick={handleBackdropClick}
        onKeyDown={handleKeyDown}
        role="presentation"
      >
        <div
          className={styles.modal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="service-modal-title"
          data-testid="service-modal"
        >
          <div className={styles.header}>
            <h2 id="service-modal-title" className={styles.title}>
              {isEdit ? `Edit "${service?.name}"` : "Add Service"}
            </h2>
            <button
              className={styles.closeBtn}
              onClick={onClose}
              aria-label="Close service modal"
            >
              <i className="bi bi-x-lg" aria-hidden="true" />
            </button>
          </div>

          <form className={styles.body} onSubmit={handleSubmit} noValidate>
            {/* Name */}
            <div className={styles.fieldGroup}>
              <label htmlFor="svc-name" className={`${styles.label} ${styles.required}`}>
                Service Name
              </label>
              <input
                id="svc-name"
                className={`${styles.input} ${errors.name ? styles.hasError : ""}`}
                type="text"
                value={values.name}
                onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
                onBlur={() => validateForm()}
                maxLength={64}
                placeholder="My API"
                aria-describedby={errors.name ? "svc-name-error" : undefined}
                data-testid="input-service-name"
                autoFocus
              />
              {errors.name && (
                <span id="svc-name-error" className={styles.errorMsg} role="alert">
                  {errors.name}
                </span>
              )}
            </div>

            {/* Slug change warning (edit mode) */}
            {slugChanged && (
              <div className={styles.slugWarning} role="alert" data-testid="slug-change-warning">
                <i className="bi bi-exclamation-triangle" aria-hidden="true" />
                <span>
                  Renaming this service will change its Slug from <strong>{originalSlug}</strong> to <strong>{slug}</strong>.
                  The Mocks Root directory will need to be renamed to match.
                </span>
              </div>
            )}

            {/* Description */}
            <div className={styles.fieldGroup}>
              <label htmlFor="svc-desc" className={styles.label}>
                Description <span style={{ color: "var(--content-muted)", fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                id="svc-desc"
                className={styles.input}
                type="text"
                value={values.description}
                onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
                placeholder="Short description"
                data-testid="input-service-description"
              />
            </div>

            {/* External URL */}
            <div className={styles.fieldGroup}>
              <label htmlFor="svc-url" className={`${styles.label} ${styles.required}`}>
                External URL
              </label>
              <input
                id="svc-url"
                className={`${styles.input} ${errors.externalUrl ? styles.hasError : ""}`}
                type="url"
                value={values.externalUrl}
                onChange={(e) => setValues((v) => ({ ...v, externalUrl: e.target.value }))}
                onBlur={() => validateForm()}
                placeholder="https://api.example.com"
                aria-describedby={errors.externalUrl ? "svc-url-error" : undefined}
                data-testid="input-service-url"
              />
              {errors.externalUrl && (
                <span id="svc-url-error" className={styles.errorMsg} role="alert">
                  {errors.externalUrl}
                </span>
              )}
            </div>

            {/* Port */}
            <div className={styles.fieldGroup}>
              <label htmlFor="svc-port" className={`${styles.label} ${styles.required}`}>
                Port <span style={{ color: "var(--content-muted)", fontWeight: 400 }}>(30100â€“30199)</span>
              </label>
              <input
                id="svc-port"
                className={`${styles.input} ${errors.port ? styles.hasError : ""}`}
                type="number"
                value={values.port}
                onChange={(e) => setValues((v) => ({ ...v, port: e.target.value }))}
                onBlur={() => validateForm()}
                min={30100}
                max={30199}
                aria-describedby={errors.port ? "svc-port-error" : undefined}
                data-testid="input-service-port"
                style={{ fontFamily: "var(--font-mono, monospace)" }}
              />
              {errors.port && (
                <span id="svc-port-error" className={styles.errorMsg} role="alert">
                  {errors.port}
                </span>
              )}
            </div>

            {/* Read-only: Mocks Root path preview (informational) */}
            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                Mocks Root <span style={{ color: "var(--content-muted)", fontWeight: 400 }}>(computed, read-only)</span>
              </label>
              <div className={styles.readonlyPath} aria-readonly="true" data-testid="readonly-mocks-root">
                {mocksRootPreview}
              </div>
            </div>

            {/* Tags */}
            <div className={styles.fieldGroup}>
              <label htmlFor="svc-tags" className={styles.label}>
                Tags <span style={{ color: "var(--content-muted)", fontWeight: 400 }}>(optional)</span>
              </label>
              {values.tags.length > 0 && (
                <div className={styles.tagChips}>
                  {values.tags.map((tag) => (
                    <span key={tag} className={styles.tagChip}>
                      {tag}
                      <button
                        type="button"
                        className={styles.tagRemove}
                        onClick={() => removeTag(tag)}
                        aria-label={`Remove tag ${tag}`}
                      >
                        <i className="bi bi-x" aria-hidden="true" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <input
                id="svc-tags"
                className={styles.tagInput}
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={() => { if (tagInput.trim()) { addTag(tagInput); setTagInput(""); } }}
                placeholder="Enter tag, press Enter or comma to add"
                data-testid="input-service-tags"
              />
            </div>

            {/* Submit error (non-field errors) */}
            {submitError && (
              <div className={styles.errorMsg} role="alert" data-testid="submit-error">
                {submitError}
              </div>
            )}
          </form>

          <div className={styles.footer}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
              data-testid="btn-cancel"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitBtn}
              form="service-modal-form"
              disabled={isPending}
              data-testid="btn-submit-service"
              onClick={handleSubmit as unknown as React.MouseEventHandler<HTMLButtonElement>}
            >
              {isPending ? "Savingâ€¦" : isEdit ? "Save Changes" : "Add Service"}
            </button>
          </div>
        </div>
      </div>
    );
  }
  ```
  
  **IMPORTANT**: The `handleSubmit` is attached to the form via `onSubmit` in the `<form>` tag inside `.body`. The footer submit button uses `onClick` that calls `handleSubmit`. This pattern avoids needing to pass the form ref cross-component. Alternatively, wrap the entire modal body + footer in a single `<form>` element. Use whichever pattern is cleanest â€” the key requirement is that pressing Enter in any field submits the form.

  **SIMPLER ALTERNATIVE**: Wrap the entire modal (`.body` div + `.footer` div) in a `<form id="service-form" onSubmit={handleSubmit}>` element and use `form="service-form"` on the submit button. This is the recommended pattern.

### Task 7: Complete `ServicesPage` (AC: #1, #2, #3, #4, #7, #9)

- [x] Fully replace `src/client/src/features/services/pages/ServicesPage.tsx`:

  Key behaviors:
  - **View mode toggle**: Card grid (default) vs. table view. Persist to `sessionStorage` with key `fishtank_services_view` (`"grid"` | `"table"`).
  - **Tag filter**: Chips above the card grid/table. Clicking a chip toggles it active/inactive. Active tags filter services (any service that has ALL active tags is shown â€” AND logic per FR-2 AC: "tags are used for grouping and filtering"). Show tag filter only when at least one service has tags.
  - **Empty state**: Show when `services.length === 0` after tag filtering (or overall if no services). Display a primary "Add Service" button.
  - **Loading state**: Show a spinner or skeleton while `useServices` is loading.
  - **Error state**: Show an error message if the query fails.
  - **Toolbar**: Left: page title + view toggle buttons (grid / list icons). Right: tag filter chips + "Add Service" button.
  - **Table columns** (using `<DataTable>`): Name, Port, Status, External URL, Mock Files, Tags, Actions (Edit link). Use colgroup widths: Name=30%, Port=80px, Status=90px, External URL=25%, Mock Files=90px, Tags=20%, Actions=80px.
  - **Performance note**: 50 service cards must render within 1 second. React Query caches the list. For 50 simple card components with CSS grid, this is well within budget â€” no virtualization needed at this count.

  ```tsx
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
    } catch { return "grid"; }
  }

  export function ServicesPage() {
    const { data: services = [], isLoading, isError } = useServices();
    const [viewMode, setViewMode] = useState<ViewMode>(getInitialViewMode);
    const [modalOpen, setModalOpen] = useState(false);
    const [editService, setEditService] = useState<Service | null>(null);
    const [activeTags, setActiveTags] = useState<Set<string>>(new Set());

    // Collect all unique tags across all services
    const allTags = Array.from(
      new Set(services.flatMap((s) => s.tags))
    ).sort();

    // Filter services by active tags (AND logic)
    const filteredServices = activeTags.size === 0
      ? services
      : services.filter((s) => [...activeTags].every((tag) => s.tags.includes(tag)));

    function toggleTag(tag: string) {
      setActiveTags((prev) => {
        const next = new Set(prev);
        if (next.has(tag)) next.delete(tag);
        else next.add(tag);
        return next;
      });
    }

    function openAdd() { setEditService(null); setModalOpen(true); }
    function openEdit(svc: Service) { setEditService(svc); setModalOpen(true); }
    function closeModal() { setModalOpen(false); setEditService(null); }

    function handleViewModeChange(mode: ViewMode) {
      setViewMode(mode);
      try { sessionStorage.setItem("fishtank_services_view", mode); } catch {}
    }

    // Table columns for DataTable base component
    const tableColumns: DataTableColumn<Service>[] = [
      {
        key: "name", header: "Name", width: "30%", sortable: true,
        cell: (s) => (
          <span style={{ fontWeight: 600 }}>{s.name}</span>
        ),
      },
      {
        key: "port", header: "Port", width: "80px", sortable: true,
        cell: (s) => (
          <span style={{ fontFamily: "monospace", fontSize: "0.75rem" }}>:{s.port}</span>
        ),
      },
      {
        key: "status", header: "Status", width: "90px",
        cell: (s) => (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span style={{
              width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
              background: s.status === "live" ? "#22c55e" : "#94a3b8",
            }} />
            <span className="status-label">{s.status === "live" ? "Live" : "Stopped"}</span>
          </span>
        ),
      },
      {
        key: "externalUrl", header: "External URL", width: "25%", sortable: true,
        cell: (s) => (
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.75rem" }}>
            {s.externalUrl}
          </span>
        ),
      },
      {
        key: "mockFiles", header: "Mocks", width: "90px",
        cell: (s) => <span style={{ fontSize: "0.75rem" }}>{s.mockFileCount}</span>,
      },
      {
        key: "tags", header: "Tags", width: "20%",
        cell: (s) => (
          <span style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {s.tags.map((t) => (
              <span key={t} style={{
                fontSize: "0.6875rem", padding: "1px 6px",
                borderRadius: 9999, background: "var(--content-surface)",
                border: "1px solid var(--border)", color: "var(--content-muted)",
              }}>{t}</span>
            ))}
          </span>
        ),
      },
      {
        key: "actions", header: "Actions", width: "80px",
        cell: (s) => (
          <button
            style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--brand)",
              background: "none", border: "none", cursor: "pointer", padding: 0 }}
            onClick={(e) => { e.stopPropagation(); openEdit(s); }}
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
              >
                <i className="bi bi-grid-3x3-gap" aria-hidden="true" />
              </button>
              <button
                className={`${styles.viewBtn} ${viewMode === "table" ? styles.viewBtnActive : ""}`}
                onClick={() => handleViewModeChange("table")}
                aria-pressed={viewMode === "table"}
                aria-label="Table view"
                title="Table view"
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
            >
              <i className="bi bi-plus-lg" aria-hidden="true" />
              Add Service
            </button>
          </div>
        </div>

        {/* Tag filter chips */}
        {allTags.length > 0 && (
          <div className={styles.tagFilter} role="group" aria-label="Filter by tag">
            {allTags.map((tag) => (
              <button
                key={tag}
                className={`${styles.tagFilterChip} ${activeTags.has(tag) ? styles.tagFilterChipActive : ""}`}
                onClick={() => toggleTag(tag)}
                aria-pressed={activeTags.has(tag)}
              >
                {tag}
              </button>
            ))}
            {activeTags.size > 0 && (
              <button
                className={styles.clearTagsBtn}
                onClick={() => setActiveTags(new Set())}
                aria-label="Clear all tag filters"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className={styles.loadingState} data-testid="services-loading">
            <i className="bi bi-arrow-clockwise" aria-hidden="true" style={{ animation: "spin 1s linear infinite" }} />
            <span>Loading servicesâ€¦</span>
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className={styles.errorState} role="alert" data-testid="services-error">
            <i className="bi bi-exclamation-triangle" aria-hidden="true" />
            Failed to load services. Please refresh the page.
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && filteredServices.length === 0 && (
          <div className={styles.emptyState} data-testid="services-empty">
            <i className="bi bi-server" aria-hidden="true" style={{ fontSize: "2rem", color: "var(--content-muted)" }} />
            <p>
              {activeTags.size > 0
                ? "No services match the selected tags."
                : "No services yet."}
            </p>
            {activeTags.size === 0 && (
              <button className={styles.emptyAddBtn} onClick={openAdd} data-testid="empty-add-service">
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
        {!isLoading && !isError && filteredServices.length > 0 && viewMode === "table" && (
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
  ```

- [x] Create `src/client/src/features/services/pages/ServicesPage.module.css`:
  ```css
  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }

  .toolbarLeft {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .toolbarRight {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .viewToggle {
    display: flex;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    overflow: hidden;
  }

  .viewBtn {
    padding: 5px 8px;
    background: var(--content-bg);
    border: none;
    cursor: pointer;
    color: var(--content-muted);
    display: flex;
    align-items: center;
    font-size: 0.875rem;
  }

  .viewBtn + .viewBtn {
    border-left: 1px solid var(--border);
  }

  .viewBtnActive {
    background: var(--content-surface);
    color: var(--content-fg);
  }

  .addBtn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    border: none;
    border-radius: var(--radius-md);
    background: var(--brand);
    color: var(--brand-fg);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
  }

  .addBtn:hover { opacity: 0.9; }

  .tagFilter {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 12px;
  }

  .tagFilterChip {
    padding: 3px 10px;
    border: 1px solid var(--border);
    border-radius: var(--radius-full);
    background: var(--content-bg);
    color: var(--content-muted);
    font-size: 0.75rem;
    cursor: pointer;
  }

  .tagFilterChipActive {
    background: var(--brand);
    color: var(--brand-fg);
    border-color: var(--brand);
  }

  .clearTagsBtn {
    padding: 3px 10px;
    border: none;
    border-radius: var(--radius-full);
    background: none;
    color: var(--content-muted);
    font-size: 0.75rem;
    cursor: pointer;
    text-decoration: underline;
  }

  /* Card grid â€” responsive columns */
  .cardGrid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }

  @media (max-width: 1023px) {
    .cardGrid { grid-template-columns: repeat(2, 1fr); }
  }

  @media (max-width: 639px) {
    .cardGrid { grid-template-columns: 1fr; }
  }

  /* Loading / error / empty states */
  .loadingState,
  .errorState,
  .emptyState {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 64px 20px;
    color: var(--content-muted);
    font-size: 0.875rem;
  }

  .errorState {
    color: var(--error);
  }

  .emptyAddBtn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border: none;
    border-radius: var(--radius-md);
    background: var(--brand);
    color: var(--brand-fg);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    margin-top: 8px;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  ```

### Task 8: Verify TypeScript build and fix any type errors (AC: all)

- [x] Run: `cd src/client && npx tsc --noEmit --project tsconfig.app.json`
- [x] Fix any type errors before proceeding

### Task 9: Create E2E Playwright tests (AC: #1â€“#9 â€” P0 + P1 from test-design-epic-2.md)

- [x] Create `src/client/tests/story-2-2-services-page.spec.ts`:

  P0 tests (must pass):
  ```
  1. /services loads with 50 seeded services; all cards visible within 1000ms (R-004)
  2. Empty state shows "Add Service" CTA when no services exist
  3. Add Service modal: port field pre-filled via GET /api/services/next-port
  ```

  P1 tests (should pass):
  ```
  4. Card grid: 3 col at â‰¥1024px, 2 col at 640â€“1023px, 1 col at <640px
  5. Table view toggle switches layout; view preference persisted in sessionStorage
  6. Tags: enter free-form tags, save, assert tags appear on card and tag filter works
  ```

  Auth pattern: Use the Playwright test setup from existing tests. Check `src/client/tests/` for existing spec files or a `playwright.config.ts` that sets up auth state.

  For the 50-services performance test: use the API directly in test setup to create 50 services (POST /api/services Ã— 50 or use a seed endpoint). Assert `Date.now()` before navigation to `/services` and after `waitForSelector('[data-testid="services-grid"]')`. Performance assertion: elapsed < 1000ms.

  ```typescript
  // Story 2.2 E2E tests
  import { test, expect } from "@playwright/test";

  // Use auth state from global setup (fishtank-setup.json or similar)
  // Check existing playwright.config.ts for storageState path

  test.describe("Story 2.2 â€” Services Page", () => {
    test.beforeEach(async ({ request }) => {
      // Clean state via admin API (if reset endpoint available) or rely on test isolation
    });

    test("P0-1: Empty state shows Add Service CTA", async ({ page }) => {
      await page.goto("/services");
      await expect(page.getByTestId("services-empty")).toBeVisible();
      await expect(page.getByTestId("empty-add-service")).toBeVisible();
    });

    test("P0-2: Add Service modal port pre-filled", async ({ page }) => {
      await page.goto("/services");
      await page.getByTestId("btn-add-service").click();
      await expect(page.getByTestId("service-modal")).toBeVisible();
      const portInput = page.getByTestId("input-service-port");
      const portValue = await portInput.inputValue();
      expect(Number(portValue)).toBeGreaterThanOrEqual(30100);
      expect(Number(portValue)).toBeLessThanOrEqual(30199);
    });

    test("P0-3: 50 services render within 1000ms", async ({ page, request }) => {
      // Seed 50 services
      const authToken = page.context(); // Uses storageState for auth
      for (let i = 1; i <= 50; i++) {
        await request.post("/api/services", {
          data: { name: `Test Service ${i}`, externalUrl: `http://example${i}.com`, port: 30100 + i - 1, tags: [] },
        });
      }
      const start = Date.now();
      await page.goto("/services");
      await page.waitForSelector('[data-testid="services-grid"]');
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(1000);
      const cards = page.locator('[data-testid^="service-card-"]');
      await expect(cards).toHaveCount(50);
    });

    // P1 tests...
  });
  ```

  **Important:** Check `src/client/playwright.config.ts` and `src/client/tests/` for existing auth setup patterns before writing the beforeEach. Don't duplicate setup code that might already exist.

### Task 10: Create backend integration tests for MockFileCount (AC: #10)

- [x] Add to `src/Fishtank.Api.IntegrationTests/Api/Story2_2_ServicesPageTests.cs`:

  Tests:
  ```
  1. GET /api/services â€” MockFileCount is 0 when MocksRoot does not exist
  2. GET /api/services â€” MockFileCount counts .json files in MocksRoot when it does exist
  ```

  Since MocksRoot is not created by this story, test 1 is straightforward (all integration test services will have `mockFileCount: 0`). Test 2 creates a temp directory with some `.json` files, sets FISHTANK_MOCKS_ROOT to the temp dir, creates a service, and asserts MockFileCount matches.

---

## Dev Notes

### Critical Rules

1. **Never use raw `fetch`** â€” always `apiFetch<T>()` from `@/lib/api`.
2. **`credentials: 'include'` is automatic** via `apiFetch` â€” do not add it manually.
3. **React Query queryKey conventions** â€” use `["services"]` (exact match used by Story 2.3's `HUB_INVALIDATION_MAP`). The key `["services"]` MUST be the top-level key so that `invalidateQueries({ queryKey: ["services"] })` in Story 2.3 invalidates the list.
4. **Do NOT modify `HUB_INVALIDATION_MAP`** â€” Story 2.3 adds the `ServiceStatusChanged` entry.
5. **No `SignalR` in this story** â€” real-time status updates are Story 2.3. The toggle in this story calls the API and re-fetches (non-optimistic).
6. **`<DataTable>` is the shared base** â€” do not use HTML `<table>` directly in ServicesPage or anywhere else after this story. Epic 3 and 4 extend this component.
7. **Column widths via `<colgroup>`** â€” required per UX-DR11. Use the `width` property on `DataTableColumn`.
8. **Status pill Live pulse animation** â€” `animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite` on the green dot. Must be suppressed by `@media (prefers-reduced-motion: reduce)` (UX-DR13). The `ServiceCard.module.css` already includes this.
9. **Tag filter is AND logic** â€” a service matches if it has ALL active tags (not just any).
10. **Mock file count graceful fallback** â€” `CountMockFiles()` must never throw. It returns 0 on any exception (`Directory.Exists` + try/catch).
11. **ServiceDto position** â€” `int MockFileCount` is added BEFORE `bool? MocksRootChanged = null` (positional record parameter order matters for deserialization). Place it as the second-to-last parameter.

### Files Modified from Story 2.1

- `src/Fishtank.Api/Models/ServiceDto.cs` â€” add `int MockFileCount`
- `src/Fishtank.Api/Services/ServiceManager.cs` â€” add `CountMockFiles` helper + update all `ServiceDto` constructions
- `src/Fishtank.Api.IntegrationTests/Api/Story2_1_ServicesTests.cs` â€” add `mockFileCount` assertion to DTO shape tests

### New Files Created by This Story

**Backend:**
```
src/Fishtank.Api.IntegrationTests/Api/Story2_2_ServicesPageTests.cs   NEW
```

**Frontend:**
```
src/client/src/features/services/types/service.ts                     NEW
src/client/src/features/services/hooks/useServices.ts                 NEW
src/client/src/features/services/components/ServiceCard.tsx           NEW
src/client/src/features/services/components/ServiceCard.module.css    NEW
src/client/src/features/services/components/AddEditServiceModal.tsx   NEW
src/client/src/features/services/components/AddEditServiceModal.module.css  NEW
src/client/src/features/services/pages/ServicesPage.tsx               MODIFIED (full replacement)
src/client/src/features/services/pages/ServicesPage.module.css        NEW
src/client/src/components/ui/DataTable.tsx                            NEW
src/client/src/components/ui/DataTable.module.css                     NEW
src/client/tests/story-2-2-services-page.spec.ts                      NEW
```

### DoD Gates (Must Pass Before Story is "Done")

1. `dotnet test src/Fishtank.Api.IntegrationTests` â€” all GREEN (including Story 2.1 tests)
2. `npm run build` in `src/client` â€” 0 TypeScript errors
3. `dotnet build src/Fishtank.slnx` â€” 0 errors, 0 warnings
4. All Story 2.2 ATDD acceptance tests GREEN

### Deferred Items

- Optimistic toggle UI (toggle reverts on failure, error toast) â†’ Story 2.3
- Real-time status updates via ServicesHub â†’ Story 2.3
- `prefers-reduced-motion` for loading spinner (bi-arrow-clockwise) â†’ use `@media` in `ServicesPage.module.css` to remove rotation animation, kept as static icon

---

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

### Completion Notes List

### File List

