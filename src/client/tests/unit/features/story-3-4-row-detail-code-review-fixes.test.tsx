/**
 * Expanded tests for Story 3.4 code-review fixes (M-1 through M-5) and coverage gaps.
 *
 * M-1: RowDetailDrawer — click-outside-to-close (backdrop)
 * M-2: RowDetailPanel — Esc key handler
 * M-3: Save as Mock button must be disabled (AC-5 placeholder)
 * M-4: Cross-feature import fix — useRowDetailStyle now lives at @/hooks/useRowDetailStyle
 * M-5: JSON bodies must be pretty-printed
 *
 * Also covers previously uncovered branches:
 *   - RowDetailDrawer Esc key handler
 *   - RowDetailModal backdrop click (e.target !== e.currentTarget)
 *   - RowDetailModal handleBackdropClick false branch (click inside dialog)
 *   - useMediaQuery SSR / matchMedia-unavailable guard
 *   - useRowDetailStyle inner catch fallback
 *   - AppearanceSettings row-detail style segmented buttons
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ActivityRow } from "@/features/activity/types";

// ─── Mock SignalR/API (needed for any component that transitively uses them) ───
vi.mock("@/lib/signalr", () => ({
  createHubConnection: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    state: "Connected",
  })),
}));

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/useTheme", () => ({
  useTheme: vi.fn(() => ({
    theme: "clean-light",
    setTheme: vi.fn(),
  })),
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
    id: overrides.id ?? "row-fix-test",
    timestamp: overrides.timestamp ?? "2026-01-15T10:30:00.000Z",
    method: overrides.method ?? "GET",
    urlPath: overrides.urlPath ?? "/api/test",
    statusCode: overrides.statusCode ?? 200,
    type: overrides.type ?? "Mocked",
    serviceId: overrides.serviceId ?? "svc-1",
    serviceName: overrides.serviceName ?? "Fix Service",
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

// ═══════════════════════════════════════════════════════════════════════════════
// M-1: RowDetailDrawer — click-outside-to-close
// ═══════════════════════════════════════════════════════════════════════════════

describe("M-1 — RowDetailDrawer: click-outside-to-close", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders a backdrop element behind the drawer", async () => {
    const { RowDetailDrawer } =
      await import("@/features/activity/components/RowDetailDrawer");

    render(
      <Wrapper>
        <RowDetailDrawer row={makeRow()} onClose={vi.fn()} />
      </Wrapper>,
    );

    expect(
      screen.getByTestId("activity-row-detail-drawer-backdrop"),
    ).toBeInTheDocument();
  });

  it("clicking the backdrop calls onClose", async () => {
    const { RowDetailDrawer } =
      await import("@/features/activity/components/RowDetailDrawer");

    const onClose = vi.fn();
    render(
      <Wrapper>
        <RowDetailDrawer row={makeRow()} onClose={onClose} />
      </Wrapper>,
    );

    fireEvent.click(screen.getByTestId("activity-row-detail-drawer-backdrop"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("clicking inside the drawer panel does NOT call onClose", async () => {
    const { RowDetailDrawer } =
      await import("@/features/activity/components/RowDetailDrawer");

    const onClose = vi.fn();
    render(
      <Wrapper>
        <RowDetailDrawer row={makeRow()} onClose={onClose} />
      </Wrapper>,
    );

    fireEvent.click(screen.getByTestId("activity-row-detail-drawer"));
    expect(onClose).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// M-1 + Drawer Esc: RowDetailDrawer Esc key closes (coverage gap)
// ═══════════════════════════════════════════════════════════════════════════════

describe("RowDetailDrawer: Esc key closes (coverage gap)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("pressing Esc calls onClose", async () => {
    const { RowDetailDrawer } =
      await import("@/features/activity/components/RowDetailDrawer");

    const onClose = vi.fn();
    render(
      <Wrapper>
        <RowDetailDrawer row={makeRow()} onClose={onClose} />
      </Wrapper>,
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("pressing a non-Esc key does NOT call onClose", async () => {
    const { RowDetailDrawer } =
      await import("@/features/activity/components/RowDetailDrawer");

    const onClose = vi.fn();
    render(
      <Wrapper>
        <RowDetailDrawer row={makeRow()} onClose={onClose} />
      </Wrapper>,
    );

    fireEvent.keyDown(document, { key: "Enter" });
    expect(onClose).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// M-2: RowDetailPanel — Esc key closes
// ═══════════════════════════════════════════════════════════════════════════════

describe("M-2 — RowDetailPanel: Esc key closes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("pressing Esc calls onClose", async () => {
    const { RowDetailPanel } =
      await import("@/features/activity/components/RowDetailPanel");

    const onClose = vi.fn();
    render(
      <Wrapper>
        <RowDetailPanel row={makeRow()} onClose={onClose} />
      </Wrapper>,
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("pressing a non-Esc key does NOT call onClose", async () => {
    const { RowDetailPanel } =
      await import("@/features/activity/components/RowDetailPanel");

    const onClose = vi.fn();
    render(
      <Wrapper>
        <RowDetailPanel row={makeRow()} onClose={onClose} />
      </Wrapper>,
    );

    fireEvent.keyDown(document, { key: "Tab" });
    expect(onClose).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// M-3: Save as Mock button must be disabled (AC-5 placeholder)
// ═══════════════════════════════════════════════════════════════════════════════

describe("M-3 — Save as Mock button is disabled (AC-5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("RowDetailContent: Save as Mock button has disabled attribute for Proxied rows", async () => {
    const { RowDetailModal } =
      await import("@/features/activity/components/RowDetailModal");

    render(
      <Wrapper>
        <RowDetailModal row={makeRow({ type: "Proxied" })} onClose={vi.fn()} />
      </Wrapper>,
    );

    const btn = screen.getByTestId(
      "activity-row-detail-save-mock",
    ) as HTMLButtonElement;
    expect(btn).toBeDisabled();
  });

  it("RowDetailPanel: Save as Mock button has disabled attribute for Proxied rows", async () => {
    const { RowDetailPanel } =
      await import("@/features/activity/components/RowDetailPanel");

    render(
      <Wrapper>
        <RowDetailPanel row={makeRow({ type: "Proxied" })} onClose={vi.fn()} />
      </Wrapper>,
    );

    const btn = screen.getByTestId(
      "activity-row-detail-save-mock",
    ) as HTMLButtonElement;
    expect(btn).toBeDisabled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// M-4: Cross-feature import fix — shared hook accessible at @/hooks/useRowDetailStyle
// ═══════════════════════════════════════════════════════════════════════════════

describe("M-4 — useRowDetailStyle accessible from shared hooks path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("@/hooks/useRowDetailStyle exports useRowDetailStyle", async () => {
    const module = await import("@/hooks/useRowDetailStyle");
    expect(typeof module.useRowDetailStyle).toBe("function");
  });

  it("@/features/activity/hooks/useRowDetailStyle re-exports the same hook", async () => {
    const shared = await import("@/hooks/useRowDetailStyle");
    const feature = await import("@/features/activity/hooks/useRowDetailStyle");
    // Same function reference via re-export
    expect(feature.useRowDetailStyle).toBe(shared.useRowDetailStyle);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// M-5: JSON bodies pretty-printed
// ═══════════════════════════════════════════════════════════════════════════════

describe("M-5 — JSON bodies are pretty-printed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("RowDetailContent: valid JSON request body is pretty-printed", async () => {
    const { RowDetailModal } =
      await import("@/features/activity/components/RowDetailModal");

    render(
      <Wrapper>
        <RowDetailModal
          row={makeRow({ requestBody: '{"name":"Alice","age":30}' })}
          onClose={vi.fn()}
        />
      </Wrapper>,
    );

    const bodyEl = screen.getByTestId("activity-row-detail-request-body");
    // Pretty-printed JSON has line breaks and indentation
    expect(bodyEl.textContent).toContain('"name": "Alice"');
    expect(bodyEl.textContent).toContain('"age": 30');
  });

  it("RowDetailContent: valid JSON response body is pretty-printed", async () => {
    const { RowDetailModal } =
      await import("@/features/activity/components/RowDetailModal");

    render(
      <Wrapper>
        <RowDetailModal
          row={makeRow({ responseBody: '{"status":"ok","count":5}' })}
          onClose={vi.fn()}
        />
      </Wrapper>,
    );

    const bodyEl = screen.getByTestId("activity-row-detail-response-body");
    expect(bodyEl.textContent).toContain('"status": "ok"');
    expect(bodyEl.textContent).toContain('"count": 5');
  });

  it("RowDetailContent: non-JSON request body is displayed as raw text", async () => {
    const { RowDetailModal } =
      await import("@/features/activity/components/RowDetailModal");

    const rawBody = "plain text body — not JSON";
    render(
      <Wrapper>
        <RowDetailModal
          row={makeRow({ requestBody: rawBody })}
          onClose={vi.fn()}
        />
      </Wrapper>,
    );

    expect(
      screen.getByTestId("activity-row-detail-request-body"),
    ).toHaveTextContent(rawBody);
  });

  it("RowDetailContent: null request body renders empty", async () => {
    const { RowDetailModal } =
      await import("@/features/activity/components/RowDetailModal");

    render(
      <Wrapper>
        <RowDetailModal
          row={makeRow({ requestBody: null })}
          onClose={vi.fn()}
        />
      </Wrapper>,
    );

    const bodyEl = screen.getByTestId("activity-row-detail-request-body");
    expect(bodyEl.textContent?.trim()).toBe("");
  });

  it("RowDetailPanel: valid JSON request body is pretty-printed in Request tab", async () => {
    const { RowDetailPanel } =
      await import("@/features/activity/components/RowDetailPanel");

    render(
      <Wrapper>
        <RowDetailPanel
          row={makeRow({ requestBody: '{"q":"search","page":1}' })}
          onClose={vi.fn()}
        />
      </Wrapper>,
    );

    // Default tab is Request
    const bodyEl = screen.getByTestId("activity-row-detail-request-body");
    expect(bodyEl.textContent).toContain('"q": "search"');
    expect(bodyEl.textContent).toContain('"page": 1');
  });

  it("RowDetailPanel: valid JSON response body is pretty-printed in Response tab", async () => {
    const { RowDetailPanel } =
      await import("@/features/activity/components/RowDetailPanel");

    const user = userEvent.setup();
    render(
      <Wrapper>
        <RowDetailPanel
          row={makeRow({ responseBody: '{"results":["a","b"]}' })}
          onClose={vi.fn()}
        />
      </Wrapper>,
    );

    await user.click(screen.getByRole("tab", { name: /response/i }));

    const bodyEl = screen.getByTestId("activity-row-detail-response-body");
    expect(bodyEl.textContent).toContain('"results"');
  });

  it("RowDetailPanel: non-JSON request body renders as raw text (line 10 catch branch)", async () => {
    const { RowDetailPanel } =
      await import("@/features/activity/components/RowDetailPanel");

    const rawBody = "plain=true&mode=raw";
    render(
      <Wrapper>
        <RowDetailPanel
          row={makeRow({ requestBody: rawBody })}
          onClose={vi.fn()}
        />
      </Wrapper>,
    );

    const bodyEl = screen.getByTestId("activity-row-detail-request-body");
    expect(bodyEl.textContent?.trim()).toBe(rawBody);
  });

  it("RowDetailPanel: clicking Response then Request tab switches back (line 183 onClick branch)", async () => {
    const { RowDetailPanel } =
      await import("@/features/activity/components/RowDetailPanel");

    const user = userEvent.setup();
    render(
      <Wrapper>
        <RowDetailPanel row={makeRow()} onClose={vi.fn()} />
      </Wrapper>,
    );

    // Switch to Response
    await user.click(screen.getByRole("tab", { name: /response/i }));
    expect(
      screen.getByTestId("activity-row-detail-tab-response"),
    ).toHaveAttribute("aria-selected", "true");

    // Switch back to Request (exercises line 183 onClick)
    await user.click(screen.getByRole("tab", { name: /request/i }));
    expect(
      screen.getByTestId("activity-row-detail-tab-request"),
    ).toHaveAttribute("aria-selected", "true");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Coverage gap: RowDetailModal backdrop click — false branch
// ═══════════════════════════════════════════════════════════════════════════════

describe("RowDetailModal: backdrop click coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("clicking the backdrop (outside dialog) calls onClose", async () => {
    const { RowDetailModal } =
      await import("@/features/activity/components/RowDetailModal");

    const onClose = vi.fn();
    const { container } = render(
      <Wrapper>
        <RowDetailModal row={makeRow()} onClose={onClose} />
      </Wrapper>,
    );

    // Click the backdrop wrapper (role=presentation, not the dialog itself)
    const backdrop = container.querySelector('[role="presentation"]');
    expect(backdrop).not.toBeNull();
    if (backdrop) {
      fireEvent.click(backdrop);
    }
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("clicking inside the dialog does NOT call onClose", async () => {
    const { RowDetailModal } =
      await import("@/features/activity/components/RowDetailModal");

    const onClose = vi.fn();
    render(
      <Wrapper>
        <RowDetailModal row={makeRow()} onClose={onClose} />
      </Wrapper>,
    );

    // Click the dialog itself (child element) — e.target !== e.currentTarget
    const dialog = screen.getByRole("dialog");
    fireEvent.click(dialog);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("pressing a non-Esc key does NOT call onClose in Modal", async () => {
    const { RowDetailModal } =
      await import("@/features/activity/components/RowDetailModal");

    const onClose = vi.fn();
    render(
      <Wrapper>
        <RowDetailModal row={makeRow()} onClose={onClose} />
      </Wrapper>,
    );

    fireEvent.keyDown(document, { key: "ArrowDown" });
    expect(onClose).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Coverage gap: useMediaQuery — SSR / matchMedia unavailable
// ═══════════════════════════════════════════════════════════════════════════════

describe("useMediaQuery: SSR/matchMedia-unavailable guard", () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    vi.clearAllMocks();
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it("returns false when window.matchMedia is unavailable", async () => {
    // Simulate SSR / jsdom without matchMedia
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: undefined,
    });

    const { useMediaQuery } = await import("@/hooks/useMediaQuery");
    const { renderHook } = await import("@testing-library/react");

    const { result } = renderHook(() => useMediaQuery("(max-width: 639px)"));

    expect(result.current).toBe(false);
  });

  it("registers change listener and updates when media query changes", async () => {
    const handlers: Array<(e: Partial<MediaQueryListEvent>) => void> = [];
    const mockMql = {
      matches: false,
      media: "(max-width: 639px)",
      addEventListener: vi.fn(
        (_: string, handler: (e: Partial<MediaQueryListEvent>) => void) => {
          handlers.push(handler);
        },
      ),
      removeEventListener: vi.fn(),
    };

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockReturnValue(mockMql),
    });

    const { useMediaQuery } = await import("@/hooks/useMediaQuery");
    const { renderHook, act } = await import("@testing-library/react");

    const { result } = renderHook(() => useMediaQuery("(max-width: 639px)"));

    expect(result.current).toBe(false);

    // Simulate media query match change
    act(() => {
      handlers.forEach((h) => h({ matches: true }));
    });

    expect(result.current).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Coverage gap: useRowDetailStyle inner catch fallback (lines 53-54)
// ═══════════════════════════════════════════════════════════════════════════════

describe("useRowDetailStyle: localStorage error fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("falls back gracefully when localStorage.getItem throws", async () => {
    const { useRowDetailStyle } = await import("@/hooks/useRowDetailStyle");
    const { renderHook, act } = await import("@testing-library/react");

    // First render — getItem throws during setRowDetailStyle
    const getItemSpy = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementationOnce(() => {
        throw new Error("storage error");
      });
    const setItemSpy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementationOnce(() => {
        throw new Error("setItem error");
      })
      .mockImplementationOnce(() => {
        /* second attempt succeeds */
      });

    const { result } = renderHook(() => useRowDetailStyle());

    act(() => {
      result.current.setRowDetailStyle("drawer");
    });

    // After error fallback, state is still updated in-memory
    expect(result.current.rowDetailStyle).toBe("drawer");

    getItemSpy.mockRestore();
    setItemSpy.mockRestore();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// AppearanceSettings: row detail style segmented buttons (coverage + M-4)
// ═══════════════════════════════════════════════════════════════════════════════

describe("AppearanceSettings: row detail style selector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders all three row detail style buttons", async () => {
    const { AppearanceSettings } =
      await import("@/features/settings/components/AppearanceSettings");

    render(<AppearanceSettings />);

    expect(
      screen.getByTestId("settings-appearance-row-detail-modal"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("settings-appearance-row-detail-drawer"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("settings-appearance-row-detail-panel"),
    ).toBeInTheDocument();
  });

  it("clicking a style button persists the choice to localStorage", async () => {
    const { AppearanceSettings } =
      await import("@/features/settings/components/AppearanceSettings");

    const user = userEvent.setup();
    render(<AppearanceSettings />);

    await user.click(
      screen.getByTestId("settings-appearance-row-detail-drawer"),
    );

    const stored = JSON.parse(
      localStorage.getItem(APPEARANCE_STORAGE_KEY) ?? "{}",
    ) as { rowDetailStyle?: string };
    expect(stored.rowDetailStyle).toBe("drawer");
  });

  it("selected button shows aria-pressed=true", async () => {
    localStorage.setItem(
      APPEARANCE_STORAGE_KEY,
      JSON.stringify({ rowDetailStyle: "panel" }),
    );

    const { AppearanceSettings } =
      await import("@/features/settings/components/AppearanceSettings");

    render(<AppearanceSettings />);

    const panelBtn = screen.getByTestId("settings-appearance-row-detail-panel");
    expect(panelBtn).toHaveAttribute("aria-pressed", "true");

    const modalBtn = screen.getByTestId("settings-appearance-row-detail-modal");
    expect(modalBtn).toHaveAttribute("aria-pressed", "false");
  });
});
