/**
 * test-automate: DataTable shared component
 *
 * Covers the new shared base component introduced in Story 2.2 (Epic 2).
 * Tests ensure the generic table renders correctly and its interactive
 * features (sort, keyboard navigation) work as specified.
 *
 * AC-4: sortable table, table-layout fixed, keyboard arrow-key navigation
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";

afterEach(() => {
  vi.clearAllMocks();
});

// ─── Helpers ──────────────────────────────────────────────────────────────

interface Fruit {
  id: string;
  name: string;
  count: number;
}

const fruits: Fruit[] = [
  { id: "b", name: "Banana", count: 5 },
  { id: "a", name: "Apple", count: 12 },
  { id: "c", name: "Cherry", count: 3 },
];

const columns: DataTableColumn<Fruit>[] = [
  {
    key: "name",
    header: "Name",
    sortable: true,
    sortValue: (r) => r.name,
    cell: (r) => <span>{r.name}</span>,
  },
  {
    key: "count",
    header: "Count",
    sortable: true,
    sortValue: (r) => r.count,
    cell: (r) => <span>{r.count}</span>,
  },
];

// ─── Tests ────────────────────────────────────────────────────────────────

describe("DataTable — rendering", () => {
  it("renders all column headers", () => {
    render(
      <DataTable
        columns={columns}
        rows={fruits}
        getRowId={(r) => r.id}
      />,
    );

    // Sort buttons have aria-label="Sort by {col}"
    expect(screen.getByRole("button", { name: /sort by name/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /sort by count/i })).toBeDefined();
  });

  it("renders a row for each item", () => {
    render(
      <DataTable
        columns={columns}
        rows={fruits}
        getRowId={(r) => r.id}
      />,
    );

    expect(screen.getAllByRole("row")).toHaveLength(fruits.length + 1); // +1 for header row
    expect(screen.getByText("Banana")).toBeDefined();
    expect(screen.getByText("Apple")).toBeDefined();
    expect(screen.getByText("Cherry")).toBeDefined();
  });

  it("renders empty state when rows array is empty", () => {
    render(
      <DataTable
        columns={columns}
        rows={[]}
        getRowId={(r) => r.id}
        data-testid="dt-empty"
      />,
    );

    expect(screen.getByTestId("datatable-empty")).toBeDefined();
  });

  it("renders optional caption when provided", () => {
    render(
      <DataTable
        columns={columns}
        rows={fruits}
        getRowId={(r) => r.id}
        caption="Fruit inventory"
      />,
    );
    expect(screen.getByText("Fruit inventory")).toBeDefined();
  });

  it("applies data-testid to wrapper element", () => {
    render(
      <DataTable
        columns={columns}
        rows={fruits}
        getRowId={(r) => r.id}
        data-testid="test-table"
      />,
    );
    expect(screen.getByTestId("test-table")).toBeDefined();
  });
});

describe("DataTable — sort", () => {
  it("sorts by name ascending on first click", async () => {
    const user = userEvent.setup();
    render(
      <DataTable
        columns={columns}
        rows={fruits}
        getRowId={(r) => r.id}
      />,
    );

    await user.click(screen.getByRole("button", { name: /sort by name/i }));

    const cells = screen.getAllByRole("cell").filter((_, i) => i % 2 === 0); // name cells (even indices)
    expect(cells[0].textContent).toBe("Apple");
    expect(cells[1].textContent).toBe("Banana");
    expect(cells[2].textContent).toBe("Cherry");
  });

  it("sorts by name descending on second click (same column)", async () => {
    const user = userEvent.setup();
    render(
      <DataTable
        columns={columns}
        rows={fruits}
        getRowId={(r) => r.id}
      />,
    );

    const sortBtn = screen.getByRole("button", { name: /sort by name/i });
    await user.click(sortBtn); // ascending
    await user.click(sortBtn); // descending

    const cells = screen.getAllByRole("cell").filter((_, i) => i % 2 === 0);
    expect(cells[0].textContent).toBe("Cherry");
    expect(cells[1].textContent).toBe("Banana");
    expect(cells[2].textContent).toBe("Apple");
  });

  it("sorts numerically when sortValue returns a number (count column)", async () => {
    const user = userEvent.setup();
    render(
      <DataTable
        columns={columns}
        rows={fruits}
        getRowId={(r) => r.id}
      />,
    );

    await user.click(screen.getByRole("button", { name: /sort by count/i }));

    // Ascending order: 3, 5, 12
    const countCells = screen.getAllByRole("cell").filter((_, i) => i % 2 !== 0); // count cells (odd indices)
    expect(countCells[0].textContent).toBe("3");
    expect(countCells[1].textContent).toBe("5");
    expect(countCells[2].textContent).toBe("12");
  });

  it("sets aria-sort='ascending' on active sort column", async () => {
    const user = userEvent.setup();
    render(
      <DataTable
        columns={columns}
        rows={fruits}
        getRowId={(r) => r.id}
      />,
    );

    await user.click(screen.getByRole("button", { name: /sort by name/i }));

    const nameHeader = screen.getByRole("button", { name: /sort by name/i }).closest("th");
    expect(nameHeader?.getAttribute("aria-sort")).toBe("ascending");
  });

  it("sets aria-sort='descending' after second click on same column", async () => {
    const user = userEvent.setup();
    render(
      <DataTable
        columns={columns}
        rows={fruits}
        getRowId={(r) => r.id}
      />,
    );

    const btn = screen.getByRole("button", { name: /sort by name/i });
    await user.click(btn);
    await user.click(btn);

    const nameHeader = btn.closest("th");
    expect(nameHeader?.getAttribute("aria-sort")).toBe("descending");
  });

  it("resets to ascending sort when switching to a different column", async () => {
    const user = userEvent.setup();
    render(
      <DataTable
        columns={columns}
        rows={fruits}
        getRowId={(r) => r.id}
      />,
    );

    // Sort name descending
    const nameBtn = screen.getByRole("button", { name: /sort by name/i });
    await user.click(nameBtn);
    await user.click(nameBtn);

    // Switch to count column
    const countBtn = screen.getByRole("button", { name: /sort by count/i });
    await user.click(countBtn);

    const countHeader = countBtn.closest("th");
    expect(countHeader?.getAttribute("aria-sort")).toBe("ascending");
  });
});

describe("DataTable — keyboard navigation", () => {
  it("navigates rows with ArrowDown key", () => {
    render(
      <DataTable
        columns={columns}
        rows={fruits}
        getRowId={(r) => r.id}
        onRowClick={vi.fn()}
      />,
    );

    const rows = screen.getAllByRole("row").slice(1); // skip header
    rows[0].focus();
    fireEvent.keyDown(rows[0], { key: "ArrowDown" });

    expect(document.activeElement).toBe(rows[1]);
  });

  it("navigates rows with ArrowUp key", () => {
    render(
      <DataTable
        columns={columns}
        rows={fruits}
        getRowId={(r) => r.id}
        onRowClick={vi.fn()}
      />,
    );

    const rows = screen.getAllByRole("row").slice(1);
    rows[1].focus();
    fireEvent.keyDown(rows[1], { key: "ArrowUp" });

    expect(document.activeElement).toBe(rows[0]);
  });

  it("calls onRowClick when Enter is pressed on a focused row", () => {
    const onRowClick = vi.fn();
    render(
      <DataTable
        columns={columns}
        rows={fruits}
        getRowId={(r) => r.id}
        onRowClick={onRowClick}
      />,
    );

    const rows = screen.getAllByRole("row").slice(1);
    rows[0].focus();
    fireEvent.keyDown(rows[0], { key: "Enter" });

    expect(onRowClick).toHaveBeenCalledWith(fruits[0]);
  });

  it("clamps ArrowDown at last row", () => {
    render(
      <DataTable
        columns={columns}
        rows={fruits}
        getRowId={(r) => r.id}
        onRowClick={vi.fn()}
      />,
    );

    const rows = screen.getAllByRole("row").slice(1);
    const lastRow = rows[rows.length - 1];
    lastRow.focus();
    fireEvent.keyDown(lastRow, { key: "ArrowDown" });

    // Focus should stay on last row
    expect(document.activeElement).toBe(lastRow);
  });

  it("clamps ArrowUp at first row", () => {
    render(
      <DataTable
        columns={columns}
        rows={fruits}
        getRowId={(r) => r.id}
        onRowClick={vi.fn()}
      />,
    );

    const rows = screen.getAllByRole("row").slice(1);
    rows[0].focus();
    fireEvent.keyDown(rows[0], { key: "ArrowUp" });

    expect(document.activeElement).toBe(rows[0]);
  });
});
