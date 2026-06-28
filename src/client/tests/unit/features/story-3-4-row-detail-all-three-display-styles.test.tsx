import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ActivityRow } from "@/features/activity/types";

/**
 * ATDD component tests for Story 3.4:
 * Row Detail — All Three Display Styles.
 *
 * RED PHASE scaffolds — all tests FAIL against the current codebase because
 * RowDetailModal, RowDetailDrawer, RowDetailPanel, RowDetailContent, and
 * useRowDetailStyle do not yet exist.  They will PASS once Story 3.4 is implemented.
 *
 * ACs covered:
 *   CT-1 (AC-1, P0) — RowDetailModal renders all required fields
 *   CT-2 (AC-2, P1) — RowDetailDrawer renders all required fields
 *   CT-3 (AC-2, P1) — RowDetailPanel renders with Request/Response tabs
 *   CT-4 (AC-1, P1) — Headers show [REDACTED] for sensitive values
 *   CT-5 (AC-5, P1) — Save as Mock button rendered for proxied rows only
 *   CT-6 (AC-6, P1) — Mobile override (<640px) always uses Modal
 *   CT-7 (AC-9, P1) — useRowDetailStyle reads preference from localStorage (default: "modal")
 *   CT-8 (AC-9, P1) — useRowDetailStyle persists new preference to localStorage
 *   CT-9 (AC-3, P1) — RowDetailDrawer updates in-place when row prop changes
 *   CT-10 (AC-4, P1) — RowDetailPanel close button calls onClose
 *
 * Data-testid contract (canonical):
 *   activity-row-detail-modal            — Modal container
 *   activity-row-detail-drawer           — Right Drawer container
 *   activity-row-detail-panel            — Bottom Panel container
 *   activity-row-detail-close            — close/collapse button in any container
 *   activity-row-detail-save-mock        — "Save as Mock" placeholder button
 *   activity-row-detail-request-id       — request ID field
 *   activity-row-detail-status-code      — HTTP status code field
 *   activity-row-detail-method           — HTTP method field
 *   activity-row-detail-url-path         — URL path field
 *   activity-row-detail-service-name     — service name field
 *   activity-row-detail-service-port     — service port field
 *   activity-row-detail-type             — request type field
 *   activity-row-detail-datetime         — ISO datetime field
 *   activity-row-detail-request-headers  — request headers section
 *   activity-row-detail-response-headers — response headers section
 *   activity-row-detail-request-body     — request body section
 *   activity-row-detail-response-body    — response body section
 */

// ─── jsdom has no layout engine — mock useVirtualizer if needed ───────────────
vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: vi.fn(
    ({
      count,
      estimateSize,
    }: {
      count: number;
      estimateSize?: (i: number) => number;
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

// ─── SignalR mock (used by ActivityPage which wraps row detail) ───────────────
const capturedHandlers: Record<string, (...args: unknown[]) => void> = {};

const mockConnection = {
  on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
    capturedHandlers[event] = handler;
  }),
  off: vi.fn(),
  start: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn().mockResolvedValue(undefined),
  state: "Connected",
};

vi.mock("@/lib/signalr", () => ({
  createHubConnection: vi.fn(() => mockConnection),
}));

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/features/activity/api", () => ({
  fetchActivityRows: vi.fn().mockResolvedValue([]),
  clearActivityLog: vi.fn().mockResolvedValue(undefined),
}));

// ─── Constants ────────────────────────────────────────────────────────────────

const APPEARANCE_STORAGE_KEY = "fishtank-appearance-settings";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeQc() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={makeQc()}>{children}</QueryClientProvider>
  );
}

function makeRow(overrides: Partial<ActivityRow> = {}): ActivityRow {
  return {
    id: overrides.id ?? "row-abc-123",
    timestamp: overrides.timestamp ?? "2026-01-15T10:30:00.000Z",
    method: overrides.method ?? "GET",
    urlPath: overrides.urlPath ?? "/api/test",
    statusCode: overrides.statusCode ?? 200,
    type: overrides.type ?? "Mocked",
    serviceId: overrides.serviceId ?? "svc-1",
    serviceName: overrides.serviceName ?? "Alpha Service",
    servicePort: overrides.servicePort ?? 30100,
    durationMs: overrides.durationMs ?? 42,
    requestHeaders: overrides.requestHeaders ?? {
      "content-type": "application/json",
    },
    requestBody: overrides.requestBody ?? null,
    responseHeaders: overrides.responseHeaders ?? {
      "content-type": "application/json",
    },
    responseBody: overrides.responseBody ?? '{"ok":true}',
    ...overrides,
  };
}

// ─── CT-1: RowDetailModal renders all required fields (AC-1, P0) ─────────────

describe("RowDetailModal — CT-1 (AC-1, P0)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders request ID, datetime, method, URL, service name & port, type, status code", async () => {
    // RED: RowDetailModal does not exist yet
    const { RowDetailModal } =
      await import("@/features/activity/components/RowDetailModal");

    const row = makeRow({
      id: "guid-1234-5678",
      timestamp: "2026-06-28T09:00:00.000Z",
      method: "POST",
      urlPath: "/api/orders",
      statusCode: 201,
      type: "Mocked",
      serviceName: "Order Service",
      servicePort: 30200,
    });

    render(
      <Wrapper>
        <RowDetailModal row={row} onClose={vi.fn()} />
      </Wrapper>,
    );

    const modal = screen.getByTestId("activity-row-detail-modal");
    expect(modal).toBeInTheDocument();

    expect(
      screen.getByTestId("activity-row-detail-request-id"),
    ).toHaveTextContent("guid-1234-5678");
    expect(screen.getByTestId("activity-row-detail-method")).toHaveTextContent(
      "POST",
    );
    expect(
      screen.getByTestId("activity-row-detail-url-path"),
    ).toHaveTextContent("/api/orders");
    expect(
      screen.getByTestId("activity-row-detail-status-code"),
    ).toHaveTextContent("201");
    expect(
      screen.getByTestId("activity-row-detail-service-name"),
    ).toHaveTextContent("Order Service");
    expect(
      screen.getByTestId("activity-row-detail-service-port"),
    ).toHaveTextContent("30200");
    expect(screen.getByTestId("activity-row-detail-type")).toHaveTextContent(
      "Mocked",
    );
    expect(
      screen.getByTestId("activity-row-detail-datetime"),
    ).toBeInTheDocument();
  });

  it("renders request headers, request body, response headers, response body", async () => {
    // RED: RowDetailModal does not exist yet
    const { RowDetailModal } =
      await import("@/features/activity/components/RowDetailModal");

    const row = makeRow({
      requestHeaders: { "content-type": "application/json", accept: "*/*" },
      requestBody: '{"amount":99}',
      responseHeaders: { "content-type": "application/json" },
      responseBody: '{"success":true}',
    });

    render(
      <Wrapper>
        <RowDetailModal row={row} onClose={vi.fn()} />
      </Wrapper>,
    );

    expect(
      screen.getByTestId("activity-row-detail-request-headers"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("activity-row-detail-request-body"),
    ).toHaveTextContent('{"amount":99}');
    expect(
      screen.getByTestId("activity-row-detail-response-headers"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("activity-row-detail-response-body"),
    ).toHaveTextContent('{"success":true}');
  });

  it("Esc key calls onClose", async () => {
    // RED: RowDetailModal does not exist yet
    const { RowDetailModal } =
      await import("@/features/activity/components/RowDetailModal");

    const onClose = vi.fn();
    const row = makeRow();

    render(
      <Wrapper>
        <RowDetailModal row={row} onClose={onClose} />
      </Wrapper>,
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });
});

// ─── CT-2: RowDetailDrawer renders all required fields (AC-2, P1) ────────────

describe("RowDetailDrawer — CT-2 (AC-2, P1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders all required fields with 320px width", async () => {
    // RED: RowDetailDrawer does not exist yet
    const { RowDetailDrawer } =
      await import("@/features/activity/components/RowDetailDrawer");

    const row = makeRow({
      id: "row-drawer-01",
      method: "PUT",
      urlPath: "/api/config",
      statusCode: 204,
      serviceName: "Config Service",
      servicePort: 30300,
    });

    render(
      <Wrapper>
        <RowDetailDrawer row={row} onClose={vi.fn()} />
      </Wrapper>,
    );

    const drawer = screen.getByTestId("activity-row-detail-drawer");
    expect(drawer).toBeInTheDocument();

    // Verify the drawer width is 320px (via inline style or CSS class)
    const styles = window.getComputedStyle(drawer);
    expect(styles.width === "320px" || drawer.className.includes("w-80")).toBe(
      true,
    );

    // All required fields present
    expect(
      screen.getByTestId("activity-row-detail-request-id"),
    ).toHaveTextContent("row-drawer-01");
    expect(screen.getByTestId("activity-row-detail-method")).toHaveTextContent(
      "PUT",
    );
    expect(
      screen.getByTestId("activity-row-detail-url-path"),
    ).toHaveTextContent("/api/config");
    expect(
      screen.getByTestId("activity-row-detail-status-code"),
    ).toHaveTextContent("204");
    expect(
      screen.getByTestId("activity-row-detail-service-name"),
    ).toHaveTextContent("Config Service");
  });
});

// ─── CT-3: RowDetailPanel renders with Request/Response tabs (AC-2, P1) ──────

describe("RowDetailPanel — CT-3 (AC-2, P1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders Request and Response tabs", async () => {
    // RED: RowDetailPanel does not exist yet
    const { RowDetailPanel } =
      await import("@/features/activity/components/RowDetailPanel");

    const row = makeRow({
      requestBody: '{"q":"search"}',
      responseBody: '["result-1","result-2"]',
    });

    render(
      <Wrapper>
        <RowDetailPanel row={row} onClose={vi.fn()} />
      </Wrapper>,
    );

    const panel = screen.getByTestId("activity-row-detail-panel");
    expect(panel).toBeInTheDocument();

    // Both tabs rendered
    expect(screen.getByRole("tab", { name: /request/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /response/i })).toBeInTheDocument();
  });

  it("switching to Response tab shows response body", async () => {
    // RED: RowDetailPanel does not exist yet
    const { RowDetailPanel } =
      await import("@/features/activity/components/RowDetailPanel");

    const row = makeRow({
      requestBody: '{"q":"search"}',
      responseBody: '["result-1","result-2"]',
    });

    const user = userEvent.setup();
    render(
      <Wrapper>
        <RowDetailPanel row={row} onClose={vi.fn()} />
      </Wrapper>,
    );

    // Switch to Response tab
    await user.click(screen.getByRole("tab", { name: /response/i }));

    // Response body should now be visible
    expect(
      screen.getByTestId("activity-row-detail-response-body"),
    ).toHaveTextContent("result-1");
  });
});

// ─── CT-4: [REDACTED] headers (AC-1, FR-10, P1) ──────────────────────────────

describe("RowDetailContent — CT-4 ([REDACTED] headers, AC-1, P1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("displays [REDACTED] for headers with redacted values", async () => {
    // RED: RowDetailModal / RowDetailContent does not exist yet
    const { RowDetailModal } =
      await import("@/features/activity/components/RowDetailModal");

    const row = makeRow({
      requestHeaders: {
        "content-type": "application/json",
        authorization: "[REDACTED]",
        "x-api-key": "[REDACTED]",
      },
    });

    render(
      <Wrapper>
        <RowDetailModal row={row} onClose={vi.fn()} />
      </Wrapper>,
    );

    const headersSection = screen.getByTestId(
      "activity-row-detail-request-headers",
    );
    // The redacted values should appear as [REDACTED]
    expect(headersSection).toHaveTextContent("[REDACTED]");
    // The header key names should still be visible
    expect(headersSection).toHaveTextContent("authorization");
    expect(headersSection).toHaveTextContent("x-api-key");
    // Non-sensitive headers show their actual value
    expect(headersSection).toHaveTextContent("application/json");
  });
});

// ─── CT-5: Save as Mock for proxied rows only (AC-5, P1) ─────────────────────

describe("RowDetailContent — CT-5 (Save as Mock, AC-5, P1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders Save as Mock button for Proxied rows", async () => {
    // RED: RowDetailModal / RowDetailContent does not exist yet
    const { RowDetailModal } =
      await import("@/features/activity/components/RowDetailModal");

    const proxiedRow = makeRow({ type: "Proxied" });

    render(
      <Wrapper>
        <RowDetailModal row={proxiedRow} onClose={vi.fn()} />
      </Wrapper>,
    );

    expect(
      screen.getByTestId("activity-row-detail-save-mock"),
    ).toBeInTheDocument();
  });

  it("does NOT render Save as Mock button for Mocked rows", async () => {
    // RED: RowDetailModal / RowDetailContent does not exist yet
    const { RowDetailModal } =
      await import("@/features/activity/components/RowDetailModal");

    const mockedRow = makeRow({ type: "Mocked" });

    render(
      <Wrapper>
        <RowDetailModal row={mockedRow} onClose={vi.fn()} />
      </Wrapper>,
    );

    expect(
      screen.queryByTestId("activity-row-detail-save-mock"),
    ).not.toBeInTheDocument();
  });

  it("Save as Mock button click is a no-op (placeholder)", async () => {
    // RED: RowDetailModal / RowDetailContent does not exist yet
    const { RowDetailModal } =
      await import("@/features/activity/components/RowDetailModal");

    const onClose = vi.fn();
    const proxiedRow = makeRow({ type: "Proxied" });
    const user = userEvent.setup();

    render(
      <Wrapper>
        <RowDetailModal row={proxiedRow} onClose={onClose} />
      </Wrapper>,
    );

    await user.click(screen.getByTestId("activity-row-detail-save-mock"));

    // onClose should NOT have been called — button is a no-op placeholder
    expect(onClose).not.toHaveBeenCalled();
  });
});

// ─── CT-6: Mobile override always uses Modal (AC-6, P1) ──────────────────────

describe("ActivityPage row detail — CT-6 (mobile override, AC-6, P1)", () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    window.matchMedia = originalMatchMedia;
  });

  it("uses Modal style when viewport < 640px, even if preference is drawer", async () => {
    // RED: useRowDetailStyle + mobile override does not exist yet

    // Set user preference to "drawer"
    localStorage.setItem(
      APPEARANCE_STORAGE_KEY,
      JSON.stringify({ rowDetailStyle: "drawer" }),
    );

    // Mock window.matchMedia to simulate mobile viewport (max-width: 639px matches)
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches:
        query.includes("max-width: 639px") || query.includes("max-width:639px"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { useRowDetailStyle } =
      await import("@/features/activity/hooks/useRowDetailStyle");
    const { renderHook } = await import("@testing-library/react");

    const { result } = renderHook(() => useRowDetailStyle());

    // Despite preference being "drawer", mobile override forces "modal"
    expect(result.current.effectiveStyle).toBe("modal");
  });
});

// ─── CT-7: useRowDetailStyle reads from localStorage (AC-9, P1) ──────────────

describe("useRowDetailStyle — CT-7 (localStorage read, AC-9, P1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("returns 'modal' as the default when no preference is stored", async () => {
    // RED: useRowDetailStyle does not exist yet
    const { useRowDetailStyle } =
      await import("@/features/activity/hooks/useRowDetailStyle");
    const { renderHook } = await import("@testing-library/react");

    const { result } = renderHook(() => useRowDetailStyle());

    expect(result.current.rowDetailStyle).toBe("modal");
  });

  it("returns stored preference when localStorage has a value", async () => {
    // RED: useRowDetailStyle does not exist yet
    localStorage.setItem(
      APPEARANCE_STORAGE_KEY,
      JSON.stringify({ rowDetailStyle: "panel" }),
    );

    const { useRowDetailStyle } =
      await import("@/features/activity/hooks/useRowDetailStyle");
    const { renderHook } = await import("@testing-library/react");

    const { result } = renderHook(() => useRowDetailStyle());

    expect(result.current.rowDetailStyle).toBe("panel");
  });
});

// ─── CT-8: useRowDetailStyle persists preference (AC-9, P1) ──────────────────

describe("useRowDetailStyle — CT-8 (localStorage write, AC-9, P1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("persists new preference to localStorage key 'fishtank-appearance-settings'", async () => {
    // RED: useRowDetailStyle does not exist yet
    const { useRowDetailStyle } =
      await import("@/features/activity/hooks/useRowDetailStyle");
    const { renderHook, act } = await import("@testing-library/react");

    const { result } = renderHook(() => useRowDetailStyle());

    act(() => {
      result.current.setRowDetailStyle("drawer");
    });

    const stored = JSON.parse(
      localStorage.getItem(APPEARANCE_STORAGE_KEY) ?? "{}",
    ) as { rowDetailStyle?: string };
    expect(stored.rowDetailStyle).toBe("drawer");
  });

  it("does not overwrite unrelated localStorage keys in the same namespace", async () => {
    // RED: useRowDetailStyle does not exist yet
    localStorage.setItem(
      APPEARANCE_STORAGE_KEY,
      JSON.stringify({ theme: "deep-ocean", rowDetailStyle: "modal" }),
    );

    const { useRowDetailStyle } =
      await import("@/features/activity/hooks/useRowDetailStyle");
    const { renderHook, act } = await import("@testing-library/react");

    const { result } = renderHook(() => useRowDetailStyle());

    act(() => {
      result.current.setRowDetailStyle("panel");
    });

    const stored = JSON.parse(
      localStorage.getItem(APPEARANCE_STORAGE_KEY) ?? "{}",
    ) as { theme?: string; rowDetailStyle?: string };

    // Theme should still be intact
    expect(stored.theme).toBe("deep-ocean");
    // New preference persisted
    expect(stored.rowDetailStyle).toBe("panel");
  });
});

// ─── CT-9: RowDetailDrawer updates in-place (AC-3, P1) ───────────────────────

describe("RowDetailDrawer — CT-9 (update in-place, AC-3, P1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("updates displayed row data when row prop changes without unmounting", async () => {
    // RED: RowDetailDrawer does not exist yet
    const { RowDetailDrawer } =
      await import("@/features/activity/components/RowDetailDrawer");

    const rowA = makeRow({ id: "row-a", urlPath: "/api/alpha" });
    const rowB = makeRow({ id: "row-b", urlPath: "/api/beta" });

    const { rerender } = render(
      <Wrapper>
        <RowDetailDrawer row={rowA} onClose={vi.fn()} />
      </Wrapper>,
    );

    expect(
      screen.getByTestId("activity-row-detail-request-id"),
    ).toHaveTextContent("row-a");
    expect(
      screen.getByTestId("activity-row-detail-url-path"),
    ).toHaveTextContent("/api/alpha");

    // Update the row prop — drawer should update in-place without unmounting
    rerender(
      <Wrapper>
        <RowDetailDrawer row={rowB} onClose={vi.fn()} />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(
        screen.getByTestId("activity-row-detail-request-id"),
      ).toHaveTextContent("row-b");
    });
    expect(
      screen.getByTestId("activity-row-detail-url-path"),
    ).toHaveTextContent("/api/beta");

    // The drawer container should still be mounted (no close animation)
    expect(
      screen.getByTestId("activity-row-detail-drawer"),
    ).toBeInTheDocument();
  });
});

// ─── CT-10: RowDetailPanel close clears selection (AC-4, P1) ─────────────────

describe("RowDetailPanel — CT-10 (close clears selection, AC-4, P1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("close button calls onClose callback", async () => {
    // RED: RowDetailPanel does not exist yet
    const { RowDetailPanel } =
      await import("@/features/activity/components/RowDetailPanel");

    const onClose = vi.fn();
    const row = makeRow();
    const user = userEvent.setup();

    render(
      <Wrapper>
        <RowDetailPanel row={row} onClose={onClose} />
      </Wrapper>,
    );

    await user.click(screen.getByTestId("activity-row-detail-close"));

    expect(onClose).toHaveBeenCalledOnce();
  });
});
