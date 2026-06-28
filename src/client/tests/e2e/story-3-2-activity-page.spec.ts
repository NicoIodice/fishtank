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

/** Seed an activity row via the test-only endpoint. Returns the row ID used. */
async function seedActivityRow(
  request: Request,
  serviceId: string,
  urlPath: string,
): Promise<string> {
  const rowId = faker.string.uuid();
  await apiFetch<null>(request, "/api/activity/test-seed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    data: JSON.stringify({
      id: rowId,
      serviceId,
      urlPath,
      method: "GET",
      statusCode: 200,
      type: "Mocked",
      durationMs: 5,
    }),
  });
  return rowId;
}

// ─── AC-1: Page loads with existing rows ────────────────────────────────────

test("AC-1: /activity page loads and displays activity table", async ({
  page,
  request,
}) => {
  // Seed a service and a row so the table has content to display.
  const service = await seedService(request, uniquePath().replace("/", "svc-"));
  const rowId = await seedActivityRow(request, service.id, "/api/check");

  await page.goto("/activity");

  // Verify page title is present
  await expect(page.locator("h1")).toContainText("Network Activity");

  // Verify the seeded row is visible in the virtual-list table.
  // The activity table renders div[role="grid"] rows (not a <table> element).
  await expect(
    page.locator(`[data-testid="activity-row-${rowId}"]`),
  ).toBeVisible({ timeout: 5000 });
});

// ─── AC-2: Real-time SignalR row prepend ────────────────────────────────────

test("AC-2: New activity row appears in real-time via SignalR", async ({
  page,
  request,
}) => {
  // Navigate first so the SignalR subscription is active before we seed.
  await page.goto("/activity");
  await expect(page.locator('[data-testid="activity-btn-live-paused"]')).toBeVisible();

  // Get initial row count
  const initialRows = page.locator('[data-testid^="activity-row-"]');
  const initialCount = await initialRows.count();

  // Seed a row via the test endpoint — CaptureAsync broadcasts ActivityRowAdded via SignalR.
  const service = await seedService(request, uniquePath().replace("/", "svc-"));
  const urlPath = uniquePath();
  const rowId = await seedActivityRow(request, service.id, urlPath);

  // Wait for the new row to appear via SignalR push (500ms NFR + test overhead).
  const rowLocator = page.locator(`[data-testid="activity-row-${rowId}"]`);
  await expect(rowLocator).toBeVisible({ timeout: 3000 });

  // Verify row count increased
  const updatedCount = await initialRows.count();
  expect(updatedCount).toBe(initialCount + 1);

  // Verify the new row contains the seeded URL path
  await expect(rowLocator).toContainText(urlPath);
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

  // Verify Clear log button — enabled since story 3-3
  const clearBtn = page.locator('[data-testid="activity-btn-clear-log"]');
  await expect(clearBtn).toBeVisible();
  await expect(clearBtn).toBeEnabled();

  // Verify Record button stub — still disabled, deferred to a future story
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

  // Verify search input — enabled since story 3-3
  const searchInput = page.locator('[data-testid="activity-input-search"]');
  await expect(searchInput).toBeVisible();
  await expect(searchInput).toBeEnabled();

  // Verify service dropdown — enabled since story 3-3
  const serviceSelect = page.locator('[data-testid="activity-select-service"]');
  await expect(serviceSelect).toBeVisible();
  await expect(serviceSelect).toBeEnabled();

  // Verify type filter button — enabled since story 3-3
  const typeFilterBtn = page.locator(
    '[data-testid="activity-btn-type-filter"]',
  );
  await expect(typeFilterBtn).toBeVisible();
  await expect(typeFilterBtn).toBeEnabled();

  // Verify clear filters button — enabled since story 3-3
  const clearFiltersBtn = page.locator(
    '[data-testid="activity-btn-clear-filters"]',
  );
  await expect(clearFiltersBtn).toBeVisible();
  await expect(clearFiltersBtn).toBeEnabled();
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
