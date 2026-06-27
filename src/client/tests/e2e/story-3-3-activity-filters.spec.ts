import { test, expect } from "../support/fixtures";
import { apiFetch } from "../support/helpers/api-client";
import { faker } from "@faker-js/faker";

/**
 * ATDD E2E acceptance tests for Story 3.3:
 * Activity Log Filtering, Sorting, Auto-refresh & Log Controls.
 *
 * RED PHASE scaffolds — run against the LIVE stack (Vite on :5173 + API on :5000).
 * Tests FAIL against the current codebase because all filter/sort/live-paused/clear-log
 * controls are disabled stubs in ActivityPage.tsx.
 * They will PASS once Story 3.3 is fully implemented.
 *
 * ACs covered:
 *   T13 — Filter by service: selecting a service shows only that service's rows (AC-2, P1)
 *   T14 — Clear log: Clear log button calls DELETE /api/activity, table empties,
 *           proxy counter resets to 0 (AC-10, P0)
 *
 * Data-testid contract (canonical):
 *   activity-select-service        — service dropdown (toolbar)
 *   activity-btn-clear-log         — clear log button (page header)
 *   activity-pill-proxy-count      — proxy counter pill (page header)
 *   activity-row-{id}              — per-row element in ActivityTable
 *   datatable-empty                — empty state container (shown when rows = [])
 *
 * Prerequisites:
 *   - API running at http://127.0.0.1:5000
 *   - Vite dev server running at http://127.0.0.1:5173
 *   - At least two services created and able to receive proxied traffic
 */

// ─── Helpers ─────────────────────────────────────────────────────────────────

type Request = Parameters<typeof apiFetch>[0];

function uniqueName(prefix: string): string {
  return `${prefix}-${faker.string.alphanumeric(6).toLowerCase()}`;
}

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
  // Get the next available port first
  const { port } = await apiFetch<{ port: number }>(
    request,
    "/api/services/next-port",
  );

  return apiFetch<CreatedService>(request, "/api/services", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    data: JSON.stringify({
      name,
      externalUrl,
      port,
      tags: [],
    }),
  });
}

/** Seed activity rows for a given service by directly calling the API capture endpoint. */
async function seedActivityRow(
  request: Request,
  serviceId: string,
  urlPath: string,
  type: "Mocked" | "Proxied" = "Mocked",
): Promise<void> {
  // Use the internal capture endpoint (available in test builds)
  await apiFetch<null>(request, "/api/activity/test-seed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    data: JSON.stringify({
      serviceId,
      urlPath,
      method: "GET",
      statusCode: 200,
      type,
      durationMs: 10,
    }),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// T13: Filter by service (AC-2, P1)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * T13: When a specific service is selected in the service dropdown,
 * only rows for that service are shown in the activity table.
 *
 * RED phase: The service dropdown is disabled — changing it does not filter.
 * This test will FAIL because beta-service rows remain visible after selecting alpha-service.
 *
 * AC-2 reference: "When a specific service is selected, only rows where
 * serviceId matches the selected service are shown."
 */
test("T13: AC-2 — selecting a service in the dropdown shows only that service's rows (P1)", async ({
  page,
  request,
}) => {
  // Navigate to the activity page
  await page.goto("/activity");
  await expect(page.locator("h1")).toContainText("Network Activity");

  // Create two services via API
  const alphaName = uniqueName("alpha-svc");
  const betaName = uniqueName("beta-svc");

  const alphaService = await seedService(request, alphaName);
  const betaService = await seedService(request, betaName);

  // Seed activity rows for each service
  await seedActivityRow(request, alphaService.id, "/alpha/endpoint");
  await seedActivityRow(request, betaService.id, "/beta/endpoint");

  // Reload to see the seeded rows
  await page.reload();

  // Wait for both rows to appear in the table
  await expect(page.locator(`[data-testid^="activity-row-"]`)).toHaveCount(2, {
    timeout: 5000,
  });

  // ─── Select the alpha service in the dropdown ────────────────────────────
  const serviceSelect = page.locator('[data-testid="activity-select-service"]');

  // RED: the service dropdown is currently disabled
  await expect(serviceSelect).not.toBeDisabled();

  // Select alpha service by its service ID value
  await serviceSelect.selectOption(alphaService.id);

  // ─── Assert only alpha rows are visible ─────────────────────────────────
  // Wait for table to update after filter applied
  await page.waitForTimeout(300);

  const rows = page.locator('[data-testid^="activity-row-"]');

  // RED: filtering is not wired → both rows still visible → count is still 2, not 1
  await expect(rows).toHaveCount(1, {
    timeout: 2000,
  });

  // Verify the visible row belongs to alpha service
  const rowText = await rows.first().textContent();
  expect(rowText).toContain("/alpha/endpoint");

  // ─── Reset to All Services and verify both rows return ──────────────────
  await serviceSelect.selectOption("all");

  await expect(rows).toHaveCount(2, {
    timeout: 2000,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T14: Clear log (AC-10, P0)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * T14: When the Clear log button is clicked, all activity rows are deleted
 * via DELETE /api/activity, the table shows the "Log cleared" empty state,
 * and the proxy counter pill resets to 0.
 *
 * RED phase: The Clear log button is disabled — clicking it does nothing.
 * This test will FAIL because the rows remain visible after clicking.
 *
 * AC-10 reference: "DELETE /api/activity is called; on success: clearRows() sets
 * rows = []; table shows 'Log cleared' empty state; proxy counter pill resets to 0."
 */
test("T14: AC-10 — Clear log button deletes all rows and resets proxy counter (P0)", async ({
  page,
  request,
}) => {
  // Navigate to the activity page
  await page.goto("/activity");
  await expect(page.locator("h1")).toContainText("Network Activity");

  // Create a service and seed some proxied rows
  const serviceName = uniqueName("clear-log-svc");
  const service = await seedService(request, serviceName);

  await seedActivityRow(request, service.id, "/endpoint-1", "Proxied");
  await seedActivityRow(request, service.id, "/endpoint-2", "Proxied");

  // Reload to see the seeded rows
  await page.reload();

  // Wait for rows to appear
  const rows = page.locator('[data-testid^="activity-row-"]');
  await expect(rows).toHaveCount(2, { timeout: 5000 });

  // Verify proxy counter shows 2 proxied rows
  const proxyPill = page.locator('[data-testid="activity-pill-proxy-count"]');
  await expect(proxyPill).toContainText("2");

  // ─── Click Clear log ─────────────────────────────────────────────────────
  const clearLogBtn = page.locator('[data-testid="activity-btn-clear-log"]');

  // RED: the Clear log button is currently disabled
  await expect(clearLogBtn).not.toBeDisabled();

  await clearLogBtn.click();

  // ─── Assert table shows "Log cleared" empty state ────────────────────────
  // RED: button disabled → DELETE not called → rows not cleared → empty state not shown
  const emptyState = page.locator('[data-testid="datatable-empty"]');
  await expect(emptyState).toBeVisible({ timeout: 3000 });
  await expect(emptyState).toContainText("Log cleared");

  // ─── Assert no activity rows remain ──────────────────────────────────────
  await expect(rows).toHaveCount(0, {
    timeout: 2000,
  });

  // ─── Assert proxy counter resets to 0 ────────────────────────────────────
  // ProxyCounterPill reads from `rows` — after clearRows(), rows = [] → proxied count = 0
  await expect(proxyPill).toContainText("0");

  // ─── Assert API state: GET /api/activity returns empty ───────────────────
  const activityRows = await apiFetch<unknown[]>(request, "/api/activity");
  expect(activityRows).toHaveLength(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// T14b: Clear log while paused also clears pause snapshot (AC-10)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * T14b: When the log is in PAUSED state and Clear log is clicked,
 * the pause snapshot is also cleared (not just the live rows).
 *
 * RED phase: Both LIVE/PAUSED and Clear log are disabled stubs.
 *
 * AC-10 reference: "if the log was paused, the pause snapshot is also cleared."
 */
test("T14b: AC-10 — Clear log while paused also clears the pause snapshot (P0)", async ({
  page,
  request,
}) => {
  await page.goto("/activity");
  await expect(page.locator("h1")).toContainText("Network Activity");

  // Seed a proxied row
  const serviceName = uniqueName("paused-clear-svc");
  const service = await seedService(request, serviceName);
  await seedActivityRow(request, service.id, "/paused-endpoint", "Proxied");

  await page.reload();

  const rows = page.locator('[data-testid^="activity-row-"]');
  await expect(rows).toHaveCount(1, { timeout: 5000 });

  // ─── Pause the activity log ───────────────────────────────────────────────
  const livePausedBtn = page.locator(
    '[data-testid="activity-btn-live-paused"]',
  );

  // RED: LIVE/PAUSED button is disabled
  await expect(livePausedBtn).not.toBeDisabled();
  await livePausedBtn.click();
  await expect(livePausedBtn).toContainText("PAUSED");

  // ─── Clear log while paused ───────────────────────────────────────────────
  const clearLogBtn = page.locator('[data-testid="activity-btn-clear-log"]');

  // RED: Clear log button is disabled
  await expect(clearLogBtn).not.toBeDisabled();
  await clearLogBtn.click();

  // ─── Both live rows and pause snapshot should be cleared ─────────────────
  const emptyState = page.locator('[data-testid="datatable-empty"]');
  await expect(emptyState).toBeVisible({ timeout: 3000 });
  await expect(emptyState).toContainText("Log cleared");

  await expect(rows).toHaveCount(0);
});
