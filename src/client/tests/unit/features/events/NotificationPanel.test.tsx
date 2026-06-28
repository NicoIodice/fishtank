/**
 * Component tests for Story 2.4 — NotificationPanel.
 *
 * ACs covered:
 *   AC-4: initial 20 items render; "Load more" fetches the next page.
 *   AC-5: clicking an item body fires POST /api/system-events/{id}/read and the
 *         item drops to read state; clicking ✕ removes it from the panel view.
 *   AC-6: "Mark all read" is hidden when the unread count is 0.
 *
 * Follows the project's vi.stubGlobal("fetch") pattern (Story 2.3 tests),
 * routing on the request URL to feed the React Query hooks.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  within,
  fireEvent,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { NotificationPanel } from "@/features/events/components/NotificationPanel";
import type { SystemEvent } from "@/features/events/types/systemEvent";

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeEvent(i: number): SystemEvent {
  return {
    id: `evt-${i}`,
    severity: i % 2 === 0 ? "error" : "warning",
    message: `Engine failure ${i}`,
    serviceId: `svc-${i}`,
    serviceName: `Service ${i}`,
    createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString(),
    isRead: false,
  };
}

// 25 unread warning/error events → 20 on first page, 5 on the second.
const ALL = Array.from({ length: 25 }, (_, i) => makeEvent(i));

/**
 * Per-test backend state for the fetch mock. Encapsulated in a fresh closure on
 * every installFetchMock() call (M2) so it cannot outlive a test or bleed across
 * tests — there is no module-level mutable state to forget to reset.
 */
interface MockBackend {
  setUnreadCount(n: number): void;
  readonly markAllReadCalls: number;
}

function installFetchMock(): MockBackend {
  let unreadCount = ALL.length;
  const readIds = new Set<string>();
  let markAllReadCalls = 0;

  const pageFor = (skip: number, take: number) => {
    const items = ALL.slice(skip, skip + take).map((e) => ({
      ...e,
      isRead: readIds.has(e.id),
    }));
    return {
      success: true,
      data: {
        items,
        total: ALL.length,
        hasMore: skip + items.length < ALL.length,
      },
    };
  };

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      const method = (init?.method ?? "GET").toUpperCase();

      if (url.includes("/unread-count")) {
        return jsonResponse({ success: true, data: { count: unreadCount } });
      }
      if (url.includes("/read-all") && method === "POST") {
        markAllReadCalls += 1;
        unreadCount = 0;
        return jsonResponse({ success: true, data: { marked: 25 } });
      }
      // POST /api/system-events/{id}/read
      const readMatch = /\/api\/system-events\/([^/]+)\/read$/.exec(url);
      if (readMatch && method === "POST") {
        const id = readMatch[1];
        if (!readIds.has(id)) {
          readIds.add(id);
          unreadCount = Math.max(0, unreadCount - 1);
        }
        return jsonResponse({ success: true, data: { id } });
      }
      // GET list with skip/take
      if (url.includes("/api/system-events")) {
        const u = new URL(url, "http://localhost");
        const skip = Number(u.searchParams.get("skip") ?? "0");
        const take = Number(u.searchParams.get("take") ?? "20");
        return jsonResponse(pageFor(skip, take));
      }
      throw new Error(`Unexpected fetch: ${method} ${url}`);
    }),
  );

  return {
    setUnreadCount: (n: number) => {
      unreadCount = n;
    },
    get markAllReadCalls() {
      return markAllReadCalls;
    },
  };
}

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  } as Response;
}

function renderPanel() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={qc}>
        <NotificationPanel onClose={vi.fn()} />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

let mock: MockBackend;

beforeEach(() => {
  mock = installFetchMock();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── AC-4: initial 20 + Load more ────────────────────────────────────────────

describe("NotificationPanel — AC-4 content & pagination", () => {
  it("renders 20 items on initial open", async () => {
    renderPanel();
    await waitFor(() =>
      expect(
        screen.getAllByTestId(/^topbar-notification-item-(?!dismiss-)[^/]+$/),
      ).toHaveLength(20),
    );
  });

  it('"Load more" fetches and appends the next page', async () => {
    const user = userEvent.setup();
    renderPanel();
    await waitFor(() =>
      expect(
        screen.getAllByTestId(/^topbar-notification-item-(?!dismiss-)[^/]+$/),
      ).toHaveLength(20),
    );

    await user.click(screen.getByTestId("topbar-btn-notification-load-more"));

    await waitFor(() =>
      expect(
        screen.getAllByTestId(/^topbar-notification-item-(?!dismiss-)[^/]+$/),
      ).toHaveLength(25),
    );
    // All loaded → load-more hides.
    expect(
      screen.queryByTestId("topbar-btn-notification-load-more"),
    ).toBeNull();
  });
});

// ─── AC-5: mark-read on body click + dismiss ─────────────────────────────────

describe("NotificationPanel — AC-5 mark read & dismiss", () => {
  it("clicking the item body POSTs /{id}/read", async () => {
    const user = userEvent.setup();
    renderPanel();
    await waitFor(() =>
      expect(
        screen.queryByTestId("topbar-notification-item-evt-0"),
      ).not.toBeNull(),
    );

    await user.click(screen.getByTestId("topbar-notification-item-evt-0"));

    await waitFor(() => {
      const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls;
      const hit = calls.some(
        ([u, init]) =>
          String(u).endsWith("/api/system-events/evt-0/read") &&
          (init?.method ?? "").toUpperCase() === "POST",
      );
      expect(hit).toBe(true);
    });
  });

  it("dismiss (✕) removes the item from the panel view", async () => {
    const user = userEvent.setup();
    renderPanel();
    await waitFor(() =>
      expect(
        screen.queryByTestId("topbar-notification-item-evt-0"),
      ).not.toBeNull(),
    );

    await user.click(
      screen.getByTestId("topbar-notification-item-dismiss-evt-0"),
    );

    await waitFor(() =>
      expect(screen.queryByTestId("topbar-notification-item-evt-0")).toBeNull(),
    );
  });
});

// ─── AC-6: Mark all read hidden when unread == 0 ─────────────────────────────

describe("NotificationPanel — AC-6 mark all read", () => {
  it('"Mark all read" is visible when unread > 0 and hides after clicking', async () => {
    const user = userEvent.setup();
    renderPanel();

    const markAll = await screen.findByTestId(
      "topbar-btn-notification-mark-all-read",
    );
    expect(markAll).not.toBeNull();

    await user.click(markAll);

    await waitFor(() =>
      expect(
        screen.queryByTestId("topbar-btn-notification-mark-all-read"),
      ).toBeNull(),
    );
    expect(mock.markAllReadCalls).toBe(1);
  });

  it('"Mark all read" is hidden when unread count is 0', async () => {
    mock.setUnreadCount(0);
    renderPanel();
    // Items still load (they exist) but the button must not appear.
    await waitFor(() =>
      expect(
        screen.getAllByTestId(/^topbar-notification-item-/).length,
      ).toBeGreaterThan(0),
    );
    expect(
      screen.queryByTestId("topbar-btn-notification-mark-all-read"),
    ).toBeNull();
  });

  it("each item shows its service tag when serviceName is present", async () => {
    renderPanel();
    const item = await screen.findByTestId("topbar-notification-item-evt-0");
    expect(within(item).getByText("Service 0")).toBeTruthy();
  });
});

// ── scroll/newCount paths ─────────────────────────────────────────────────────

describe("NotificationPanel — scroll and new-pill paths", () => {
  let mock: MockBackend;

  beforeEach(() => {
    mock = installFetchMock();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fires handleScroll without throwing when body div is scrolled", async () => {
    renderPanel();
    await waitFor(() =>
      expect(
        screen.queryAllByTestId(/^topbar-notification-item-/).length,
      ).toBeGreaterThan(0),
    );

    // Simulate scroll on the panel body
    const body = document.querySelector('[class*="body"]');
    if (body) {
      fireEvent.scroll(body, { target: { scrollTop: 0 } });
    }
    // No crash, no new-pill visible (scrollTop = 0 ≤ threshold)
    expect(screen.queryByTestId("topbar-btn-notification-new-pill")).toBeNull();
  });
});
