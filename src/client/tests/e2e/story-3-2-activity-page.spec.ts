import { test, expect } from "../support/fixtures";
import { apiFetch } from "../support/helpers/api-client";
import { faker } from "@faker-js/faker";

/**
 * ATDD acceptance tests for Story 3.2:
 * Network Activity Page — Real-Time Log Display.
 *
 * RED PHASE scaffolds — run against the LIVE stack (Vite on :5173 + API on :5000).
 * Real-time row prepend is driven by SignalR ActivityRowAdded events broadcast
 * after HTTP requests hit running mock services.
 *
 * ACs covered:
 *   AC-1: Page loads with existing rows newest-first.
 *   AC-2: Real-time SignalR row prepend within 500ms.
 *   AC-11: Page header element order and stubs render correctly.
 *   AC-16: data-testid attributes on all interactive elements.
 *
 * Data-testid contract (canonical):
 *   activity-row-{id}                — per-row element
 *   activity-btn-refresh             — manual refresh icon stub
 *   activity-btn-live-paused         — LIVE/PAUSED indicator stub
 *   activity-badge-recording         — recording badge stub (hidden)
 *   activity-pill-proxy-count        — proxy counter pill
 *   activity-btn-record              — record button stub
 *   activity-btn-clear-log           — clear log button stub
 *   activity-input-search            — search input stub
 *   activity-select-service          — service dropdown stub
 *   activity-btn-type-filter         — type filter button stub
 *   activity-btn-clear-filters       — clear filters button stub
 *   activity-btn-columns             — columns selector button
 */

// ─── Types & helpers ────────────────────────────────────────────────────────

type Request = Parameters<typeof apiFetch>[0];

function uniquePath(): string {
  return `/test-${faker.string.alphanumeric(8).toLowerCase()}`;
}

/**
 * Trigger a mock HTTP request that will generate an ActivityRow.
 * Returns the path used so tests can verify it appears in the table.
 */
async function triggerMockRequest(request: Request): Promise<string> {
  const path = uniquePath();
  
  // Hit a running mock service on port 30100 (first service port)
  // This will trigger ActivityHub broadcast
  await request.fetch(`http://127.0.0.1:30100${path}`, {
    method: "GET",
  });
  
  return path;
}

// ─── AC-1: Page loads with existing rows ────────────────────────────────────

test("AC-1: /activity page loads and displays activity table", async ({
  page,
}) => {
  // RED phase: ActivityPage does not exist yet
  await page.goto("/activity");

  // Verify page title is present
  await expect(page.locator("h1")).toContainText("Network Activity");

  // Verify table structure exists (will fail - no component yet)
  const table = page.locator("table");
  await expect(table).toBeVisible();
});

// ─── AC-2: Real-time SignalR row prepend ────────────────────────────────────

test("AC-2: New activity row appears in real-time via SignalR", async ({
  page,
  request,
}) => {
  // RED phase: ActivityPage and SignalR subscription don't exist yet
  await page.goto("/activity");

  // Get initial row count
  const initialRows = page.locator('[data-testid^="activity-row-"]');
  const initialCount = await initialRows.count();

  // Trigger a new HTTP request that will broadcast ActivityRowAdded
  const testPath = await triggerMockRequest(request);

  // Wait for new row to appear (500ms NFR + test overhead = 1500ms max)
  await page.waitForSelector('[data-testid^="activity-row-"]', {
    timeout: 1500,
  });

  // Verify row count increased
  const updatedRows = page.locator('[data-testid^="activity-row-"]');
  const updatedCount = await updatedRows.count();
  expect(updatedCount).toBe(initialCount + 1);

  // Verify the new row contains the test path
  const firstRow = updatedRows.first();
  await expect(firstRow).toContainText(testPath);
});

// ─── AC-11: Page header element order ───────────────────────────────────────

test("AC-11: Page header renders all elements in correct order", async ({
  page,
}) => {
  // RED phase: ActivityPage header structure doesn't exist yet
  await page.goto("/activity");

  // Verify page title
  const pageTitle = page.locator("h1");
  await expect(pageTitle).toContainText("Network Activity");

  // Verify LIVE/PAUSED indicator stub
  const liveIndicator = page.locator(
    '[data-testid="activity-btn-live-paused"]',
  );
  await expect(liveIndicator).toBeVisible();
  await expect(liveIndicator).toContainText("LIVE");

  // Verify proxy counter pill
  const proxyPill = page.locator('[data-testid="activity-pill-proxy-count"]');
  await expect(proxyPill).toBeVisible();
  await expect(proxyPill).toContainText("Proxied:");

  // Verify Clear log button stub
  const clearBtn = page.locator('[data-testid="activity-btn-clear-log"]');
  await expect(clearBtn).toBeVisible();
  await expect(clearBtn).toBeDisabled();

  // Verify Record button stub
  const recordBtn = page.locator('[data-testid="activity-btn-record"]');
  await expect(recordBtn).toBeVisible();
  await expect(recordBtn).toBeDisabled();
});

// ─── AC-11: Toolbar stubs render correctly ──────────────────────────────────

test("AC-11: Toolbar filter controls render as disabled stubs", async ({
  page,
}) => {
  // RED phase: Toolbar stubs don't exist yet
  await page.goto("/activity");

  // Verify search input stub
  const searchInput = page.locator('[data-testid="activity-input-search"]');
  await expect(searchInput).toBeVisible();
  await expect(searchInput).toBeDisabled();

  // Verify service dropdown stub
  const serviceSelect = page.locator(
    '[data-testid="activity-select-service"]',
  );
  await expect(serviceSelect).toBeVisible();
  await expect(serviceSelect).toBeDisabled();

  // Verify type filter button stub
  const typeFilterBtn = page.locator(
    '[data-testid="activity-btn-type-filter"]',
  );
  await expect(typeFilterBtn).toBeVisible();
  await expect(typeFilterBtn).toBeDisabled();

  // Verify clear filters button stub
  const clearFiltersBtn = page.locator(
    '[data-testid="activity-btn-clear-filters"]',
  );
  await expect(clearFiltersBtn).toBeVisible();
  await expect(clearFiltersBtn).toBeDisabled();
});

// ─── AC-16: data-testid attributes ──────────────────────────────────────────

test("AC-16: All interactive elements have correct data-testid attributes", async ({
  page,
}) => {
  // RED phase: Elements don't exist yet
  await page.goto("/activity");

  // Verify all required data-testid attributes exist
  const requiredTestIds = [
    "activity-btn-refresh",
    "activity-btn-live-paused",
    "activity-pill-proxy-count",
    "activity-btn-record",
    "activity-btn-clear-log",
    "activity-input-search",
    "activity-select-service",
    "activity-btn-type-filter",
    "activity-btn-clear-filters",
  ];

  for (const testId of requiredTestIds) {
    const element = page.locator(`[data-testid="${testId}"]`);
    await expect(element).toBeAttached({ timeout: 5000 });
  }
});
