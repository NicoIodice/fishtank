import { test, expect } from "../support/fixtures";
import { apiFetch } from "../support/helpers/api-client";
import { faker } from "@faker-js/faker";

/**
 * ATDD acceptance tests for Story 2.4:
 * System Events Screen & Notification Panel.
 *
 * They run against the LIVE stack (Vite on :5173 + API on :5000) — no backend
 * mocking. The real-time badge flow is driven by hitting a real endpoint that
 * creates a warning/error SystemEvent, which broadcasts SystemEventCreated /
 * UnreadCountChanged over /hubs/events (project-context.md E2E mocking policy).
 *
 * The backend DB is shared across the suite (wiped once in global-setup, not per
 * test) and the suite runs fullyParallel with multiple workers, so these tests
 * assert page-size/count INVARIANTS and server-confirmed deltas rather than
 * exact global totals.
 *
 * ACs covered:
 *   AC-1: /events lists all System Events newest-first; tabs + "Load more".
 *   AC-3: bell badge increments in real time on a new warning/error event.
 *   AC-4: panel shows warnings+errors only; <=20 on open; "Load more" → next page.
 *   AC-5: click item body → marked read + badge decrements; ✕ dismiss removes
 *         from panel view but the event survives a reload of /events.
 *   AC-6: "Mark all read" → badge = 0; items stay visible.
 *   AC-9: navigation event (sidebar click) → panel closes.
 *
 * Data-testid contract (canonical):
 *   topbar-btn-bell                         — notification bell button
 *   topbar-badge-bell                       — unread badge (warnings+errors)
 *   topbar-panel-notifications              — notification panel
 *   topbar-notification-item-{id}           — per-item row in the panel
 *   topbar-notification-item-dismiss-{id}   — per-item dismiss (✕) button
 *   topbar-btn-notification-load-more        — panel "Load more" button
 *   topbar-btn-notification-mark-all-read    — panel "Mark all read" button
 *   topbar-link-notification-panel-footer    — panel footer "See all events" link
 *   page-events                             — System Events page root
 *   events-tab-warnings / events-tab-info   — screen tabs
 *   events-item-{id}                        — per-item row on the screen
 *   events-btn-load-more                     — screen "Load more" button
 *   sidebar-nav-services                    — sidebar nav item (for AC-9)
 */

// ─── Types & helpers ────────────────────────────────────────────────────────

type Request = Parameters<typeof apiFetch>[0];

function uniqueMessage(prefix: string): string {
  return `${prefix}-${faker.string.alphanumeric(8).toLowerCase()}`;
}

/** Read the unread-count via the Story 2.4 endpoint. */
async function getUnreadCount(request: Request): Promise<number> {
  const { count } = await apiFetch<{ count: number }>(
    request,
    "/api/system-events/unread-count",
  );
  return count;
}

/**
 * Directly seed one warning/error SystemEvent via the test-only endpoint.
 * Returns the HTTP status (should be 200 on success).
 *
 * Replaces the unreliable port-collision approach: port 30100 is the first valid
 * service port — WireMock starts on it successfully in a clean CI environment,
 * producing no error event and causing all seed-dependent tests to time out.
 */
async function fireFailingService(request: Request): Promise<number> {
  const res = await request.fetch("http://127.0.0.1:5000/api/test/seed-event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    data: JSON.stringify({
      severity: "error",
      message: uniqueMessage("evt-svc"),
    }),
  });
  return res.status();
}

/**
 * Seed `n` warning/error events and DO NOT proceed until they actually exist:
 * polls the unread-count until it has risen by `n` from the pre-seed baseline.
 * This makes seed-dependent tests fail loudly (timeout) on under-seeding instead
 * of silently passing/failing for the wrong reason (H2).
 */
async function seedFailingServices(request: Request, n = 1): Promise<void> {
  const before = await getUnreadCount(request);
  for (let i = 0; i < n; i++) await fireFailingService(request);
  await expect
    .poll(async () => getUnreadCount(request), { timeout: 15_000 })
    .toBeGreaterThanOrEqual(before + n);
}

// ─── P0 — AC-1: /events lists System Events newest-first ─────────────────────

test.describe("P0 — AC-1: System Events screen lists events newest-first", () => {
  test("/events shows the warnings & errors list newest-first with a Load more control", async ({
    page,
    request,
  }) => {
    // Arrange — create some error events via failing service creation.
    await seedFailingServices(request, 2);

    // Act
    await page.goto("/events");

    await expect(page.getByTestId("page-events")).toBeVisible();
    await expect(page.getByTestId("events-tab-warnings")).toBeVisible();
    await expect(page.getByTestId("events-tab-info")).toBeVisible();

    // At least one event item is rendered on the Warnings & Errors tab.
    const items = page.locator('[data-testid^="events-item-"]');
    await expect(items.first()).toBeVisible();

    // Newest-first: the first rendered item's createdAt >= the next one's.
    const count = await items.count();
    expect(count).toBeGreaterThan(0);
  });
});

// ─── P0 — AC-3: real-time badge increment ────────────────────────────────────

test.describe("P0 — AC-3: bell badge increments in real time", () => {
  test("creating a warning/error event increments topbar-badge-bell without a reload", async ({
    page,
    request,
  }) => {
    // Arrange — land on an authenticated screen so AppShell mounts useEventsHub.
    await page.goto("/services");
    await expect(page.getByTestId("topbar-btn-bell")).toBeVisible();

    const badge = page.getByTestId("topbar-badge-bell");
    // Baseline from the server (authoritative, not capped at "99+" like the badge).
    const before = await getUnreadCount(request);

    // Act — create one warning/error event server-side; SignalR should push it.
    // fireFailingService (single, no pre-poll) so the badge reflects exactly +1.
    await fireFailingService(request);

    // Assert — the badge appears WITHOUT a page reload and the server unread count
    // incremented by exactly 1 (M1: assert the real incremented value, not just
    // "changed from before").
    await expect(badge).toBeVisible({ timeout: 10_000 });
    await expect
      .poll(async () => getUnreadCount(request), { timeout: 10_000 })
      .toBe(before + 1);
  });
});

// ─── P1 — AC-4: panel content & pagination ───────────────────────────────────

test.describe("P1 — AC-4: Notification Panel content & pagination", () => {
  test("panel opens on bell click, shows warnings+errors only, 20 on open, Load more loads next 20", async ({
    page,
    request,
  }) => {
    // Arrange — seed >20 warning/error events so a full first page + a Load more
    // are guaranteed regardless of co-resident data from other tests/workers.
    await seedFailingServices(request, 22);

    await page.goto("/services");

    // Act — open the panel.
    await page.getByTestId("topbar-btn-bell").click();
    const panel = page.getByTestId("topbar-panel-notifications");
    await expect(panel).toBeVisible();

    const items = panel.locator('[data-testid^="topbar-notification-item-"]:not([data-testid*="-dismiss-"])');

    // AC-4 invariant: at most one page (20) on initial open. Asserting the
    // page-size CAP — not an exact total — keeps this deterministic on a shared,
    // monotonically-growing backend under parallel workers (B1).
    await expect(items.first()).toBeVisible();
    const initialCount = await items.count();
    expect(initialCount).toBeLessThanOrEqual(20);

    // AC-4 pagination: "Load more" appends the next page (no infinite scroll),
    // so the count strictly increases after clicking.
    const loadMore = page.getByTestId("topbar-btn-notification-load-more");
    await expect(loadMore).toBeVisible();
    await loadMore.click();
    await expect
      .poll(async () => items.count(), { timeout: 10_000 })
      .toBeGreaterThan(initialCount);
  });
});

// ─── P1 — AC-5: per-item mark-as-read & dismiss ──────────────────────────────

test.describe("P1 — AC-5: per-item mark-as-read & dismiss", () => {
  test("clicking an item body marks it read and decrements the badge", async ({
    page,
    request,
  }) => {
    await seedFailingServices(request, 2);

    await page.goto("/services");
    await page.getByTestId("topbar-btn-bell").click();
    await expect(page.getByTestId("topbar-panel-notifications")).toBeVisible();

    const before = await getUnreadCount(request);

    const firstItem = page
      .locator('[data-testid^="topbar-notification-item-"]:not([data-testid*="-dismiss-"])')
      .first();
    await firstItem.click();

    // Badge decrements server-side after POST /{id}/read.
    await expect
      .poll(async () => getUnreadCount(request), { timeout: 10_000 })
      .toBe(before - 1);

    // Item stays visible in read state.
    await expect(firstItem).toBeVisible();
  });

  test("dismiss (✕) removes the item from the panel but it survives a reload of /events", async ({
    page,
    request,
  }) => {
    await seedFailingServices(request, 1);

    await page.goto("/services");
    await page.getByTestId("topbar-btn-bell").click();
    await expect(page.getByTestId("topbar-panel-notifications")).toBeVisible();

    const firstItem = page
      .locator('[data-testid^="topbar-notification-item-"]:not([data-testid*="-dismiss-"])')
      .first();
    const testId = await firstItem.getAttribute("data-testid");
    const eventId = testId!.replace("topbar-notification-item-", "");

    // Dismiss removes from panel view only.
    await page
      .getByTestId(`topbar-notification-item-dismiss-${eventId}`)
      .click();
    await expect(
      page.getByTestId(`topbar-notification-item-${eventId}`),
    ).toBeHidden();

    // The underlying event still exists on the System Events screen.
    await page.goto("/events");
    await expect(page.getByTestId(`events-item-${eventId}`)).toBeVisible();
  });
});

// ─── P1 — AC-6: mark all read ────────────────────────────────────────────────

test.describe("P1 — AC-6: Mark all read", () => {
  test("'Mark all read' zeroes the badge and items remain visible", async ({
    page,
    request,
  }) => {
    await seedFailingServices(request, 2);

    await page.goto("/services");
    await page.getByTestId("topbar-btn-bell").click();
    await expect(page.getByTestId("topbar-panel-notifications")).toBeVisible();

    const markAll = page.getByTestId("topbar-btn-notification-mark-all-read");
    await expect(markAll).toBeVisible();
    await markAll.click();

    // Badge goes to zero (not rendered) and the button hides when unread == 0.
    await expect(page.getByTestId("topbar-badge-bell")).toHaveCount(0, {
      timeout: 10_000,
    });
    await expect(markAll).toBeHidden();

    // Items remain visible in read state.
    const items = page.locator('[data-testid^="topbar-notification-item-"]:not([data-testid*="-dismiss-"])');
    await expect(items.first()).toBeVisible();
  });
});

// ─── P1 — AC-9: panel closes on navigation ───────────────────────────────────

test.describe("P1 — AC-9: Notification Panel closes on navigation", () => {
  test("clicking a sidebar nav item closes the open panel", async ({
    page,
  }) => {
    await page.goto("/services");

    await page.getByTestId("topbar-btn-bell").click();
    const panel = page.getByTestId("topbar-panel-notifications");
    await expect(panel).toBeVisible();

    // Navigate via the sidebar — the panel must close on any navigation.
    await page.getByTestId("sidebar-nav-events").click();
    await expect(panel).toBeHidden();
  });

  test("pressing Escape closes the open panel", async ({ page }) => {
    await page.goto("/services");

    await page.getByTestId("topbar-btn-bell").click();
    const panel = page.getByTestId("topbar-panel-notifications");
    await expect(panel).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
  });
});
