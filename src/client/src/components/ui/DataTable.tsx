import { useRef, useState, type ReactNode } from "react";
import styles from "./DataTable.module.css";

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  width?: string;
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
  const tbodyRef = useRef<HTMLTableSectionElement>(null);

  function handleKeyDown(e: React.KeyboardEvent, idx: number) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = Math.min(idx + 1, rows.length - 1);
      (tbodyRef.current?.children[next] as HTMLElement)?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = Math.max(idx - 1, 0);
      (tbodyRef.current?.children[prev] as HTMLElement)?.focus();
    } else if (e.key === "Enter" && onRowClick) {
      onRowClick(rows[idx]);
    }
  }

  function handleSortClick(key: string) {
    if (sortKey === key) setSortAsc((v) => !v);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
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
