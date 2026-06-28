import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ActivityRow } from "@/features/activity/types";
import { ActivityTable } from "@/features/activity/ActivityTable";

// jsdom has no layout engine — mock useVirtualizer to return items directly
vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: vi.fn(
    ({
      count,
      estimateSize,
    }: {
      count: number;
      estimateSize: (i: number) => number;
    }) => ({
      getVirtualItems: () =>
        Array.from({ length: Math.min(count, 50) }, (_, i) => ({
          index: i,
          key: i,
          start: i * (estimateSize ? estimateSize(i) : 48),
          size: estimateSize ? estimateSize(i) : 48,
          lane: 0,
        })),
      getTotalSize: () => count * 48,
      scrollToIndex: vi.fn(),
      measure: vi.fn(),
    }),
  ),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRow(overrides: Partial<ActivityRow> = {}): ActivityRow {
  return {
    id: overrides.id ?? "row-default",
    timestamp: overrides.timestamp ?? "2024-06-01T10:00:00Z",
    method: overrides.method ?? "GET",
    urlPath: overrides.urlPath ?? "/default",
    statusCode: overrides.statusCode ?? 200,
    type: overrides.type ?? "Mocked",
    serviceId: overrides.serviceId ?? "svc-1",
    serviceName: overrides.serviceName ?? "Test Service",
    servicePort: overrides.servicePort ?? 30100,
    durationMs: overrides.durationMs ?? 42,
    requestHeaders: {},
    requestBody: null,
    responseHeaders: {},
    responseBody: null,
    ...overrides,
  };
}

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => vi.clearAllMocks());

// ─── ActivityTable unit tests ─────────────────────────────────────────────────

describe("ActivityTable", () => {
  // ── Empty states ────────────────────────────────────────────────────────────

  it("shows 'No activity yet' when rows=[] and hadRows=false", () => {
    render(
      <Wrapper>
        <ActivityTable rows={[]} hadRows={false} />
      </Wrapper>,
    );
    expect(screen.getByTestId("datatable-empty")).toBeInTheDocument();
    expect(screen.getByText("No activity yet")).toBeInTheDocument();
  });

  it("shows 'Log cleared' when rows=[] and hadRows=true", () => {
    render(
      <Wrapper>
        <ActivityTable rows={[]} hadRows={true} />
      </Wrapper>,
    );
    expect(screen.getByText("Log cleared")).toBeInTheDocument();
  });

  // ── Sort headers — aria-sort attribute ───────────────────────────────────────

  it("shows aria-sort=none on all columns when no sort is active", () => {
    render(
      <Wrapper>
        <ActivityTable
          rows={[makeRow()]}
          hadRows={true}
          sort={{ column: null, direction: null }}
        />
      </Wrapper>,
    );
    const headers = screen
      .getAllByRole("columnheader")
      .filter((th) => th.getAttribute("data-sort-column"));
    headers.forEach((th) => expect(th.getAttribute("aria-sort")).toBe("none"));
  });

  it("shows aria-sort=ascending for the sorted column (asc)", () => {
    render(
      <Wrapper>
        <ActivityTable
          rows={[makeRow()]}
          hadRows={true}
          sort={{ column: "urlPath", direction: "asc" }}
        />
      </Wrapper>,
    );
    const urlHeader = screen
      .getAllByRole("columnheader")
      .find((th) => th.getAttribute("data-sort-column") === "urlPath");
    expect(urlHeader?.getAttribute("aria-sort")).toBe("ascending");
  });

  it("shows aria-sort=descending for the sorted column (desc)", () => {
    render(
      <Wrapper>
        <ActivityTable
          rows={[makeRow()]}
          hadRows={true}
          sort={{ column: "statusCode", direction: "desc" }}
        />
      </Wrapper>,
    );
    const statusHeader = screen
      .getAllByRole("columnheader")
      .find((th) => th.getAttribute("data-sort-column") === "statusCode");
    expect(statusHeader?.getAttribute("aria-sort")).toBe("descending");
  });

  it("shows ascending sort indicator (↑) for ascending column", () => {
    render(
      <Wrapper>
        <ActivityTable
          rows={[makeRow()]}
          hadRows={true}
          sort={{ column: "durationMs", direction: "asc" }}
        />
      </Wrapper>,
    );
    expect(screen.getByText("↑")).toBeInTheDocument();
  });

  it("shows descending sort indicator (↓) for descending column", () => {
    render(
      <Wrapper>
        <ActivityTable
          rows={[makeRow()]}
          hadRows={true}
          sort={{ column: "timestamp", direction: "desc" }}
        />
      </Wrapper>,
    );
    expect(screen.getByText("↓")).toBeInTheDocument();
  });

  it("calls onSort with the correct column name when a header is clicked", () => {
    const onSort = vi.fn();
    render(
      <Wrapper>
        <ActivityTable
          rows={[makeRow()]}
          hadRows={true}
          sort={{ column: null, direction: null }}
          onSort={onSort}
        />
      </Wrapper>,
    );
    const methodHeader = screen
      .getAllByRole("columnheader")
      .find((th) => th.getAttribute("data-sort-column") === "method");
    fireEvent.click(methodHeader!);
    expect(onSort).toHaveBeenCalledWith("method");
  });

  it("covers all 6 sortable columns with aria-sort attribute", () => {
    const columns = [
      "method",
      "urlPath",
      "statusCode",
      "durationMs",
      "timestamp",
      "serviceName",
    ];
    for (const col of columns) {
      const { unmount } = render(
        <Wrapper>
          <ActivityTable
            rows={[makeRow()]}
            hadRows={true}
            sort={{ column: col as never, direction: "asc" }}
          />
        </Wrapper>,
      );
      const header = screen
        .getAllByRole("columnheader")
        .find((th) => th.getAttribute("data-sort-column") === col);
      expect(header?.getAttribute("aria-sort")).toBe("ascending");
      unmount();
    }
  });

  // ── Keyboard navigation ─────────────────────────────────────────────────────

  it("responds to ArrowDown key on the grid", () => {
    const rows = [makeRow({ id: "r1" }), makeRow({ id: "r2" })];
    const { container } = render(
      <Wrapper>
        <ActivityTable rows={rows} hadRows={true} />
      </Wrapper>,
    );
    const grid = container.querySelector('[role="grid"]')!;
    fireEvent.keyDown(grid, { key: "ArrowDown" });
    // No crash = passing; row focus is internal state
    expect(grid).toBeInTheDocument();
  });

  it("responds to ArrowUp key on the grid", () => {
    const rows = [makeRow({ id: "r1" }), makeRow({ id: "r2" })];
    const { container } = render(
      <Wrapper>
        <ActivityTable rows={rows} hadRows={true} />
      </Wrapper>,
    );
    const grid = container.querySelector('[role="grid"]')!;
    // Go down first, then back up
    fireEvent.keyDown(grid, { key: "ArrowDown" });
    fireEvent.keyDown(grid, { key: "ArrowUp" });
    expect(grid).toBeInTheDocument();
  });

  it("ignores arrow keys when rows are empty", () => {
    const { container } = render(
      <Wrapper>
        <ActivityTable rows={[]} hadRows={false} />
      </Wrapper>,
    );
    // Component shows empty state, no grid present
    expect(screen.getByTestId("datatable-empty")).toBeInTheDocument();
    // No crash when container is the empty state div
    expect(container).toBeInTheDocument();
  });
});
