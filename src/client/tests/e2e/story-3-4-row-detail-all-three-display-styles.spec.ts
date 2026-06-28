import { test, expect } from "../support/fixtures";
import { apiFetch } from "../support/helpers/api-client";
import { faker } from "@faker-js/faker";

/**
 * ATDD E2E acceptance tests for Story 3.4:
 * Row Detail — All Three Display Styles.
 *
 * RED PHASE scaffolds — run against the LIVE stack (Vite on :5173 + API on :5000).
 * Tests FAIL against the current codebase because row detail components
 * (RowDetailModal, RowDetailDrawer, RowDetailPanel) do not yet exist.
 * They will PASS once Story 3.4 is fully implemented.
 *
 * ACs covered:
 *   T15 — Click row → Modal opens with all fields visible (AC-1, AC-2, P0)
 *   T16 — Change preference to Right Drawer in Settings → row click opens drawer (AC-2, AC-9, P1)
 *   T17 — Change preference to Bottom Panel in Settings → row click opens panel with tabs (AC-2, AC-9, P1)
 *   T18 — Keyboard navigation: arrow keys move row focus, Enter opens detail (AC-8, P1)
 *   T19 — Proxied row shows "Save as Mock" action in detail header (AC-5, P2)
 *
 * Data-testid contract (canonical):
 *   activity-row-{id}                    — per-row element in ActivityTable
 *   activity-row-detail-modal            — Modal container (when style = modal)
 *   activity-row-detail-drawer           — Right Drawer container (when style = drawer)
 *   activity-row-detail-panel            — Bottom Panel container (when style = panel)
 *   activity-row-detail-close            — close button inside any detail container
 *   activity-row-detail-save-mock        — "Save as Mock" action button (proxied rows)
 *   activity-row-detail-request-id       — request ID field in detail
 *   activity-row-detail-status-code      — HTTP status code field in detail
 *   activity-row-detail-method           — HTTP method field in detail
 *   activity-row-detail-url-path         — URL path field in detail
 *   activity-row-detail-service-name     — service name field in detail
 *   activity-row-detail-service-port     — service port field in detail
 *   activity-row-detail-type             — request type field in detail
 *   activity-row-detail-datetime         — timestamp/datetime field in detail
 *   activity-row-detail-request-headers  — request headers section in detail
 *   activity-row-detail-response-headers — response headers section in detail
 *   activity-row-detail-request-body     — request body section in detail
 *   activity-row-detail-response-body    — response body section in detail
 *   settings-appearance-row-detail-modal   — segmented button: Modal option (Settings)
 *   settings-appearance-row-detail-drawer  — segmented button: Right Drawer option (Settings)
 *   settings-appearance-row-detail-panel   — segmented button: Bottom Panel option (Settings)
 *
 * Prerequisites:
 *   - API running at http://127.0.0.1:5000
 *   - Vite dev server running at http://127.0.0.1:5173
 *   - At least one mock service created and able to receive traffic
 */

// Run tests serially — they share the in-memory IActivityStore and localStorage.
test.describe.configure({ mode: "serial" });

// ─── Types & helpers ─────────────────────────────────────────────────────────

type Request = Parameters<typeof apiFetch>[0];

function uniqueName(prefix: string): string {
  return `${prefix}-${faker.string.alphanumeric(6).toLowerCase()}`;
}

const APPEARANCE_STORAGE_KEY = "fishtank-appearance-settings";

interface CreatedService {
  id: string;
  name: string;
  port: number;
  slug: string;
}

/** Create a service via the API and return its metadata. */
async function seedService(
  request: Request,
  name: string,
  externalUrl = "https://httpbin.org",
): Promise<CreatedService> {
  const { port } = await apiFetch<{ port: number }>(
    request,
    "/api/services/next-port",
  );

  return apiFetch<CreatedService>(request, "/api/services", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    data: JSON.stringify({ name, externalUrl, port, tags: [] }),
  });
}

/** Seed a single activity row via the test-only capture endpoint. */
async function seedActivityRow(
  request: Request,
  serviceId: string,
  opts: {
    urlPath?: string;
    method?: string;
    statusCode?: number;
    type?: "Mocked" | "Proxied";
    requestHeaders?: Record<string, string>;
    responseHeaders?: Record<string, string>;
    requestBody?: string | null;
    responseBody?: string | null;
  } = {},
): Promise<string> {
  const rowId = faker.string.uuid();
  await apiFetch<null>(request, "/api/activity/test-seed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    data: JSON.stringify({
      id: rowId,
      serviceId,
      urlPath: opts.urlPath ?? "/test-path",
      method: opts.method ?? "GET",
      statusCode: opts.statusCode ?? 200,
      type: opts.type ?? "Mocked",
      durationMs: 12,
      requestHeaders: opts.requestHeaders ?? {
        "content-type": "application/json",
      },
      requestBody: opts.requestBody ?? null,
      responseHeaders: opts.responseHeaders ?? {
        "content-type": "application/json",
      },
      responseBody: opts.responseBody ?? "{}",
    }),
  });
  return rowId;
}

/** Navigate to Settings → Appearance and change the row detail style. */
async function setRowDetailStyle(
  page: import("@playwright/test").Page,
  style: "modal" | "drawer" | "panel",
): Promise<void> {
  await page.click('[data-testid="sidebar-nav-settings"]');
  await page.waitForURL(/\/settings/, { timeout: 5000 });

  // Click the Appearance sub-nav link if it exists
  const appearanceLink = page.locator(
    '[data-testid="settings-subnav-appearance"]',
  );
  if (await appearanceLink.isVisible()) {
    await appearanceLink.click();
  }

  await page.click(`[data-testid="settings-appearance-row-detail-${style}"]`);
}

// Reset services + activity store before each test.
test.beforeEach(async ({ request }) => {
  await apiFetch<null>(request, "/api/test/reset-services", { method: "POST" });
});

// Clear appearance localStorage preference before each test so styles don't bleed between tests.
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(
    (key) => localStorage.removeItem(key),
    APPEARANCE_STORAGE_KEY,
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// T15: Click row → Modal opens (AC-1, AC-2 — P0)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * T15: Clicking an activity row opens the Modal (default style).
 * The modal must display all required fields: request ID, datetime, HTTP method,
 * URL path, service name, service port, type, HTTP status code, request headers,
 * request body, response headers, response body (FR-9, AC-1).
 *
 * RED phase: RowDetailModal does not exist yet — clicking a row does nothing.
 * This test will FAIL because `activity-row-detail-modal` is not rendered.
 *
 * AC-1 reference: "Given clicking any row, When the row detail opens, Then it
 * displays: request ID (GUID), DateTime (ISO 8601), HTTP method, URL path,
 * Service name and port, Type, HTTP status, request headers ([REDACTED] for
 * redacted values), request body, response headers, response body."
 * AC-2 reference: "The correct style renders — Modal: centered overlay,
 * max-width 560px, backdrop, focus-trapped, Esc to close."
 */
test("T15: AC-1 AC-2 — clicking a row opens the Modal with all fields (P0)", async ({
  page,
  request,
}) => {
  // Seed a service and a row with known field values
  const svcName = uniqueName("svc");
  const service = await seedService(request, svcName);

  const rowId = await seedActivityRow(request, service.id, {
    urlPath: "/api/payment",
    method: "POST",
    statusCode: 201,
    type: "Mocked",
    requestHeaders: {
      "content-type": "application/json",
      authorization: "[REDACTED]",
    },
    requestBody: '{"amount":42}',
    responseHeaders: { "content-type": "application/json" },
    responseBody: '{"id":"mock-1"}',
  });

  // Navigate to activity page
  await page.goto("/activity");
  await expect(page.locator("h1")).toContainText("Network Activity");

  // Wait for the row to appear
  const rowLocator = page.locator(`[data-testid="activity-row-${rowId}"]`);
  await expect(rowLocator).toBeVisible({ timeout: 5000 });

  // RED: clicking a row currently does nothing
  await rowLocator.click();

  // Assert modal container is visible
  const modal = page.locator('[data-testid="activity-row-detail-modal"]');
  await expect(modal).toBeVisible({ timeout: 3000 });

  // Assert all required fields are visible inside the modal
  await expect(
    modal.locator('[data-testid="activity-row-detail-request-id"]'),
  ).toContainText(rowId);
  await expect(
    modal.locator('[data-testid="activity-row-detail-method"]'),
  ).toContainText("POST");
  await expect(
    modal.locator('[data-testid="activity-row-detail-url-path"]'),
  ).toContainText("/api/payment");
  await expect(
    modal.locator('[data-testid="activity-row-detail-status-code"]'),
  ).toContainText("201");
  await expect(
    modal.locator('[data-testid="activity-row-detail-service-name"]'),
  ).toContainText(svcName);
  await expect(
    modal.locator('[data-testid="activity-row-detail-service-port"]'),
  ).toContainText(String(service.port));
  await expect(
    modal.locator('[data-testid="activity-row-detail-type"]'),
  ).toContainText("Mocked");
  await expect(
    modal.locator('[data-testid="activity-row-detail-datetime"]'),
  ).toBeVisible();
  await expect(
    modal.locator('[data-testid="activity-row-detail-request-headers"]'),
  ).toContainText("[REDACTED]");
  await expect(
    modal.locator('[data-testid="activity-row-detail-request-body"]'),
  ).toContainText('"amount": 42');
  await expect(
    modal.locator('[data-testid="activity-row-detail-response-body"]'),
  ).toContainText('"id": "mock-1"');

  // Assert Esc closes the modal
  await page.keyboard.press("Escape");
  await expect(modal).not.toBeVisible({ timeout: 2000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// T16: Settings → Right Drawer → row click opens drawer (AC-2, AC-9 — P1)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * T16: After changing the row detail style preference to "Right Drawer" in
 * Settings → Appearance, clicking a row opens the Right Drawer (320px).
 *
 * RED phase: Settings segmented button group does not exist; RowDetailDrawer
 * does not exist. Both assertions fail.
 *
 * AC-2 reference: "Right Drawer: 320px from right edge, slides in, Esc to close,
 * click outside to close."
 * AC-9 reference: "selection is persisted in localStorage under key
 * fishtank-appearance-settings."
 */
test("T16: AC-2 AC-9 — setting preference to Right Drawer opens drawer on row click (P1)", async ({
  page,
  request,
}) => {
  const svcName = uniqueName("svc");
  const service = await seedService(request, svcName);
  const rowId = await seedActivityRow(request, service.id, {
    urlPath: "/api/orders",
    method: "GET",
    statusCode: 200,
    type: "Mocked",
  });

  // Change preference to drawer via Settings
  await page.goto("/settings");
  await setRowDetailStyle(page, "drawer");

  // Verify localStorage was updated
  const storedValue = await page.evaluate(
    (key) => localStorage.getItem(key),
    APPEARANCE_STORAGE_KEY,
  );
  const parsed = JSON.parse(storedValue ?? "{}") as { rowDetailStyle?: string };
  expect(parsed.rowDetailStyle).toBe("drawer");

  // Navigate to Activity page
  await page.click('[data-testid="sidebar-nav-activity"]');
  await expect(page.locator("h1")).toContainText("Network Activity");

  const rowLocator = page.locator(`[data-testid="activity-row-${rowId}"]`);
  await expect(rowLocator).toBeVisible({ timeout: 5000 });

  // RED: RowDetailDrawer does not exist
  await rowLocator.click();

  const drawer = page.locator('[data-testid="activity-row-detail-drawer"]');
  await expect(drawer).toBeVisible({ timeout: 3000 });

  // Assert Esc closes the drawer
  await page.keyboard.press("Escape");
  await expect(drawer).not.toBeVisible({ timeout: 2000 });

  // Assert click outside (backdrop) closes the drawer
  await rowLocator.click();
  await expect(drawer).toBeVisible({ timeout: 3000 });
  await page.locator('[data-testid="activity-row-detail-drawer-backdrop"]').click();
  await expect(drawer).not.toBeVisible({ timeout: 2000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// T17: Settings → Bottom Panel → row click opens panel with tabs (AC-2, AC-9 — P1)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * T17: After changing the row detail style preference to "Bottom Panel" in
 * Settings → Appearance, clicking a row opens the Bottom Panel with
 * Request / Response tabs.
 *
 * RED phase: RowDetailPanel and the settings segmented button do not exist.
 *
 * AC-2 reference: "Bottom Panel: bottom half with Request/Response tabs,
 * close collapses panel."
 * AC-4 reference: "When the Bottom Panel close button is clicked, the panel
 * collapses and the selected table row is cleared."
 */
test("T17: AC-2 AC-4 AC-9 — setting preference to Bottom Panel opens tabbed panel on row click (P1)", async ({
  page,
  request,
}) => {
  const svcName = uniqueName("svc");
  const service = await seedService(request, svcName);
  const rowId = await seedActivityRow(request, service.id, {
    urlPath: "/api/items",
    method: "GET",
    statusCode: 200,
    type: "Mocked",
    requestBody: null,
    responseBody: '["item-1","item-2"]',
  });

  // Change preference to panel via Settings
  await page.goto("/settings");
  await setRowDetailStyle(page, "panel");

  // Navigate to Activity page
  await page.click('[data-testid="sidebar-nav-activity"]');
  await expect(page.locator("h1")).toContainText("Network Activity");

  const rowLocator = page.locator(`[data-testid="activity-row-${rowId}"]`);
  await expect(rowLocator).toBeVisible({ timeout: 5000 });

  // RED: RowDetailPanel does not exist
  await rowLocator.click();

  const panel = page.locator('[data-testid="activity-row-detail-panel"]');
  await expect(panel).toBeVisible({ timeout: 3000 });

  // Assert Request/Response tabs are present
  await expect(
    panel.locator('[role="tab"]').filter({ hasText: /request/i }),
  ).toBeVisible();
  await expect(
    panel.locator('[role="tab"]').filter({ hasText: /response/i }),
  ).toBeVisible();

  // Switch to Response tab and verify response body appears
  await panel
    .locator('[role="tab"]')
    .filter({ hasText: /response/i })
    .click();
  await expect(
    panel.locator('[data-testid="activity-row-detail-response-body"]'),
  ).toContainText("item-1");

  // Close the panel and verify the row highlight is cleared (AC-4)
  await panel.locator('[data-testid="activity-row-detail-close"]').click();
  await expect(panel).not.toBeVisible({ timeout: 2000 });

  // The row should no longer be highlighted/selected
  await expect(rowLocator).not.toHaveAttribute("aria-selected", "true");
});

// ─────────────────────────────────────────────────────────────────────────────
// T18: Keyboard navigation — arrow keys + Enter (AC-8 — P1)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * T18: In the activity table, arrow keys move row focus and pressing Enter
 * on a focused row opens its detail in the active display style (Modal by default).
 *
 * RED phase: onRowKeyDown is not wired in ActivityTable; Enter does nothing.
 *
 * AC-8 reference: "arrow keys move row focus; Enter opens row detail; Tab moves
 * between interactive elements in logical order; all action icons have
 * aria-label tooltips."
 */
test("T18: AC-8 — keyboard Enter on focused row opens row detail (P1)", async ({
  page,
  request,
}) => {
  const svcName = uniqueName("svc");
  const service = await seedService(request, svcName);
  const rowId = await seedActivityRow(request, service.id, {
    urlPath: "/kb/articles",
    method: "GET",
    statusCode: 200,
    type: "Mocked",
  });

  await page.goto("/activity");
  await expect(page.locator("h1")).toContainText("Network Activity");

  const rowLocator = page.locator(`[data-testid="activity-row-${rowId}"]`);
  await expect(rowLocator).toBeVisible({ timeout: 5000 });

  // Focus the grid container, then use ArrowDown to select the first row.
  // (The Enter handler requires focusedIndex to be non-null, which is set by
  // arrow-key navigation, not by direct element focus.)
  await page.locator('[role="grid"]').focus();
  await page.keyboard.press("ArrowDown");

  // Enter on the focused row opens the row detail
  await page.keyboard.press("Enter");

  const modal = page.locator('[data-testid="activity-row-detail-modal"]');
  await expect(modal).toBeVisible({ timeout: 3000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// T19: Proxied row shows "Save as Mock" action (AC-5 — P2)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * T19: When a proxied row is opened in row detail, a "Save as Mock"
 * action button (bi-lightning-charge icon, brand color) is rendered.
 * Clicking it is a no-op placeholder until Epic 4 Story 4.4.
 *
 * RED phase: RowDetailContent does not yet render the "Save as Mock" button.
 *
 * AC-5 reference: "Given a proxied request in row detail, Then a 'Save as Mock'
 * action (bi-lightning-charge, brand color) renders in the detail header —
 * clicking it is a no-op placeholder until Epic 4 Story 4.4."
 */
test("T19: AC-5 — proxied row shows disabled Save as Mock button in detail (P2)", async ({
  page,
  request,
}) => {
  const svcName = uniqueName("svc");
  const service = await seedService(request, svcName);
  const proxiedRowId = await seedActivityRow(request, service.id, {
    urlPath: "/proxy/endpoint",
    method: "GET",
    statusCode: 200,
    type: "Proxied",
  });

  await page.goto("/activity");
  await expect(page.locator("h1")).toContainText("Network Activity");

  const rowLocator = page.locator(
    `[data-testid="activity-row-${proxiedRowId}"]`,
  );
  await expect(rowLocator).toBeVisible({ timeout: 5000 });

  // RED: clicking a row does nothing yet
  await rowLocator.click();

  const modal = page.locator('[data-testid="activity-row-detail-modal"]');
  await expect(modal).toBeVisible({ timeout: 3000 });

  // Assert "Save as Mock" button is visible and disabled (proxied rows have it disabled
  // until the feature is fully implemented — M-3 fix from code review).
  const saveMockBtn = modal.locator(
    '[data-testid="activity-row-detail-save-mock"]',
  );
  await expect(saveMockBtn).toBeVisible();
  await expect(saveMockBtn).toBeDisabled();

  // Clicking a disabled button is a no-op — page should not navigate away.
  // force: true is required to click a disabled element.
  await saveMockBtn.click({ force: true });
  await expect(modal).toBeVisible(); // still open
  await expect(page).toHaveURL(/\/activity/);
});
