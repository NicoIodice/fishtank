import { useRef, useState, type ReactNode } from "react";
import styles from "./DataTable.module.css";

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  width?: string;
  sortable?: boolean;
  cell: (row: T) => ReactNode;
  /** Raw value used for sorting; falls back to String(cell(row)) if omitted. */
  sortValue?: (row: T) => string | number;
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
        const aRaw = col.sortValue ? col.sortValue(a) : col.cell(a);
        const bRaw = col.sortValue ? col.sortValue(b) : col.cell(b);
        const aStr = typeof aRaw === "number" ? String(aRaw) : typeof aRaw === "string" ? aRaw : "";
        const bStr = typeof bRaw === "number" ? String(bRaw) : typeof bRaw === "string" ? bRaw : "";
        return sortAsc ? aStr.localeCompare(bStr, undefined, { numeric: true, sensitivity: "base" }) : bStr.localeCompare(aStr, undefined, { numeric: true, sensitivity: "base" });
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
