import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ActivityTable } from "@/features/activity/ActivityTable";
import type { ActivityRow } from "@/features/activity/types";

/**
 * ATDD component tests — Story 4.4: Save As Mock Icon Visibility
 * Layer: Vitest + Testing Library (component-level)
 *
 * RED PHASE — these tests are RED-by-construction:
 *   - The bi-lightning-charge "Save as Mock" icon does not exist in ActivityTable yet
 *   - The icon should only render for proxied rows (type === "proxied")
 *   - Clicking the icon should open the Mock Suggestion modal (not implemented)
 *
 * ACs covered:
 *   AC-1: Save as Mock action visible only on proxied rows (FR-14)
 *   AC-2: Save as Mock action opens Mock Suggestion modal (FR-14)
 *
 * Test Strategy:
 *   - Verify icon renders ONLY for proxied rows (not mocked rows)
 *   - Verify icon has correct data-testid and aria-label
 *   - Verify icon click triggers modal open handler
 *
 * Expected RED behavior:
 *   - Tests will fail because bi-lightning-charge icon doesn't exist yet
 *   - Tests will fail because data-testid="activity-btn-save-as-mock-{rowId}" not found
 *   - Tests will fail because modal open handler not implemented
 */

// ─── Mock @tanstack/react-virtual ───────────────────────────────────────────
const MAX_VIRTUAL_ROWS = 50;
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
        Array.from({ length: Math.min(count, MAX_VIRTUAL_ROWS) }, (_, i) => ({
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

// ─── React Query wrapper ─────────────────────────────────────────────────────
const MOCK_SERVICES = [{ id: "service-1", status: "live" }];

function makeQc() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData(["services"], MOCK_SERVICES);
  return qc;
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={makeQc()}>{children}</QueryClientProvider>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function renderTable(rows: ActivityRow[], hadRows = true) {
  return render(<ActivityTable rows={rows} hadRows={hadRows} />, {
    wrapper: Wrapper,
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Story 4.4: Save As Mock Icon Visibility", () => {
  beforeEach(() => vi.clearAllMocks());

  // ─── AC-1: bi-lightning-charge visible only on proxied rows ───────────────

  it("AC-1 (P0): Save as Mock icon renders for proxied row", () => {
    const proxiedRow: ActivityRow = {
      id: "proxied-row-1",
      timestamp: new Date().toISOString(),
      method: "POST",
      urlPath: "/api/users/123",
      statusCode: 200,
      type: "Proxied",
      serviceId: "service-1",
      serviceName: "Test Service",
      servicePort: 30100,
      durationMs: 50,
      requestHeaders: {},
      requestBody: JSON.stringify({ name: "Test" }),
      responseHeaders: {},
      responseBody: JSON.stringify({ id: 123, name: "Test" }),
    };

    renderTable([proxiedRow]);

    // Expect: bi-lightning-charge icon with data-testid="activity-btn-save-as-mock-proxied-row-1"
    const saveAsMockBtn = screen.getByTestId(
      "activity-btn-save-as-mock-proxied-row-1",
    );
    expect(saveAsMockBtn).toBeInTheDocument();
    expect(saveAsMockBtn).toHaveAttribute("aria-label", "Save as Mock");

    // Verify icon uses bi-lightning-charge
    const icon = saveAsMockBtn.querySelector("i.bi-lightning-charge");
    expect(icon).toBeInTheDocument();
  });

  it("AC-1 (P1): Save as Mock icon NOT visible on mocked row", () => {
    const mockedRow: ActivityRow = {
      id: "mocked-row-1",
      timestamp: new Date().toISOString(),
      method: "GET",
      urlPath: "/api/products",
      statusCode: 200,
      type: "Mocked",
      serviceId: "service-1",
      serviceName: "Test Service",
      servicePort: 30100,
      durationMs: 5,
      requestHeaders: {},
      requestBody: null,
      responseHeaders: {},
      responseBody: JSON.stringify({ products: [] }),
    };

    renderTable([mockedRow]);

    // Expect: bi-lightning-charge icon should NOT exist
    const saveAsMockBtn = screen.queryByTestId(
      "activity-btn-save-as-mock-mocked-row-1",
    );
    expect(saveAsMockBtn).not.toBeInTheDocument();

    // Verify bi-eye (view detail) icon still exists
    const viewDetailBtn = screen.getByTestId(
      "activity-btn-view-detail-mocked-row-1",
    );
    expect(viewDetailBtn).toBeInTheDocument();
  });

  it("AC-1 (P1): Multiple proxied rows each have Save as Mock icon", () => {
    const proxiedRows: ActivityRow[] = [
      {
        id: "proxied-1",
        timestamp: new Date().toISOString(),
        method: "POST",
        urlPath: "/api/orders",
        statusCode: 201,
        type: "Proxied",
        serviceId: "service-1",
        serviceName: "Test Service",
        servicePort: 30100,
        durationMs: 100,
        requestHeaders: {},
        requestBody: JSON.stringify({ item: "Widget" }),
        responseHeaders: {},
        responseBody: JSON.stringify({ orderId: 456 }),
      },
      {
        id: "proxied-2",
        timestamp: new Date().toISOString(),
        method: "GET",
        urlPath: "/api/orders/456",
        statusCode: 200,
        type: "Proxied",
        serviceId: "service-1",
        serviceName: "Test Service",
        servicePort: 30100,
        durationMs: 30,
        requestHeaders: {},
        requestBody: null,
        responseHeaders: {},
        responseBody: JSON.stringify({ orderId: 456, status: "shipped" }),
      },
    ];

    renderTable(proxiedRows);

    // Expect: both rows have Save as Mock icon
    expect(
      screen.getByTestId("activity-btn-save-as-mock-proxied-1"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("activity-btn-save-as-mock-proxied-2"),
    ).toBeInTheDocument();
  });

  // ─── AC-2: Icon click opens modal ─────────────────────────────────────────

  it("AC-2 (P0): Clicking Save as Mock icon opens Mock Suggestion modal", () => {
    const proxiedRow: ActivityRow = {
      id: "proxied-row-2",
      timestamp: new Date().toISOString(),
      method: "PUT",
      urlPath: "/api/users/789",
      statusCode: 200,
      type: "Proxied",
      serviceId: "service-1",
      serviceName: "Test Service",
      servicePort: 30100,
      durationMs: 75,
      requestHeaders: {},
      requestBody: JSON.stringify({ name: "Updated" }),
      responseHeaders: {},
      responseBody: JSON.stringify({ id: 789, name: "Updated" }),
    };

    renderTable([proxiedRow]);

    const saveAsMockBtn = screen.getByTestId(
      "activity-btn-save-as-mock-proxied-row-2",
    );
    fireEvent.click(saveAsMockBtn);

    // Expect: Mock Suggestion modal opens
    const modal = screen.getByTestId("mock-suggestion-modal");
    expect(modal).toBeInTheDocument();
    expect(modal).toHaveAttribute("role", "dialog");
    expect(modal).toHaveAttribute("aria-modal", "true");
  });
});
