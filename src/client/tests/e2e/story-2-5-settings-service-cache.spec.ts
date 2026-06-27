import { test, expect } from "../support/fixtures";
import { apiFetch } from "../support/helpers/api-client";
import { faker } from "@faker-js/faker";

/**
 * ATDD acceptance test scaffolds for Story 2.5:
 * Settings — Service Cache Management.
 *
 * RED PHASE — these tests define the expected acceptance behaviour.
 * They FAIL before implementation (Settings → Cache currently shows a
 * placeholder "Configured in a later story.").
 * They PASS once Story 2.5 implementation is complete.
 *
 * ACs covered:
 *   AC-1 — Cache list shows all services with entry count and estimated size
 *   AC-2 — Per-service "Clear" with confirmation → DELETE /api/cache/{id}
 *   AC-3 — "Clear All" with confirmation → DELETE /api/cache
 *   AC-4 — Empty state when no services are configured
 *   AC-5 — Standard User can access and use cache management
 *
 * E2E mocking policy (project-context.md):
 *   storageState for auth (set globally in playwright.config.ts).
 *   Hit real backend for all flows — no page.route() mocking for cache endpoints.
 *
 * Data-testid contract (all must exist after implementation — DESIGN.md):
 *   settings-nav-cache                          — Cache sub-nav item
 *   settings-btn-clear-all-caches               — "Clear All" button
 *   settings-modal-clear-all-caches-confirm     — Clear All confirmation dialog
 *   settings-btn-clear-all-caches-confirm       — confirm button in Clear All dialog
 *   settings-btn-clear-all-caches-cancel        — cancel button in Clear All dialog
 *   settings-btn-clear-cache-{slug}             — per-service Clear button
 *   settings-modal-clear-cache-confirm-{slug}   — per-service confirmation dialog
 *   settings-btn-clear-cache-confirm-{slug}     — per-service confirm button
 *   settings-btn-clear-cache-cancel-{slug}      — per-service cancel button
 */

// Serial mode: AC-4 calls reset-services (global teardown) — serial execution
// prevents race conditions with AC-1/2/3/5 service seeding in parallel workers.
test.describe.configure({ mode: "serial" });

// ─── Types & helpers ──────────────────────────────────────────────────────────

const API_URL = process.env.API_URL ?? "http://127.0.0.1:5000";

function uniqueName(prefix: string): string {
  return `${prefix}-${faker.string.alphanumeric(6).toLowerCase()}`;
}

interface CreatedService {
  id: string;
  name: string;
  port: number;
  slug: string;
  status: string;
  tags: string[];
  mockFileCount: number;
}

/** POST /api/services — seed a service for cache-related tests. */
async function seedService(
  request: Parameters<typeof apiFetch>[0],
  overrides: Partial<{ name: string; externalUrl: string; port: number }> = {},
): Promise<CreatedService> {
  const name = overrides.name ?? uniqueName("cache-svc");
  // Ask the API for the next available port so we never hit SERVICE_PORT_CONFLICT
  // (hardcoded ranges can collide when other tests in the same shard have already
  // allocated ports via next-port) and never hit SERVICE_PORT_OUT_OF_RANGE
  // (the API only accepts 30100–30199).
  const port = overrides.port ?? await apiFetch<number>(request, "/api/services/next-port");
  return apiFetch<CreatedService>(request, "/api/services", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    data: JSON.stringify({
      name,
      externalUrl: overrides.externalUrl ?? "http://example.com",
      port,
      tags: [],
    }),
  });
}

// ─── P0 — AC-1: Cache list shows configured services with stats ───────────────

test.describe("Story 2.5 — P0: AC-1 Cache list shows services with entry count and size", () => {
  test("Settings → Cache lists each service with name, entry count, and estimated size", async ({
    page,
    request,
  }) => {
    // Arrange: seed a service so the cache list is non-empty
    const service = await seedService(request, { name: uniqueName("ac1-svc") });

    // Act
    await page.goto("/settings");
    await page.getByTestId("settings-nav-cache").click();

    // Assert: per-service row is visible with its Clear button
    // RED: CacheSettings component not implemented — placeholder text is shown;
    //      getByTestId(`settings-btn-clear-cache-${service.slug}`) not found
    await expect(
      page.getByTestId(`settings-btn-clear-cache-${service.slug}`),
    ).toBeVisible();

    // Assert: "Clear All" row is also visible when services exist
    await expect(
      page.getByTestId("settings-btn-clear-all-caches"),
    ).toBeVisible();
  });
});

// ─── P0 — AC-2: Per-service Clear with confirmation ───────────────────────────

test.describe("Story 2.5 — P0: AC-2 Per-service Clear with confirmation", () => {
  test("clicking Clear for a service and confirming calls DELETE /api/cache/{id} and list refreshes", async ({
    page,
    request,
    interceptNetworkCall,
  }) => {
    // Arrange
    const service = await seedService(request, { name: uniqueName("ac2-svc") });
    await page.goto("/settings");
    await page.getByTestId("settings-nav-cache").click();

    // Verify the service row is present in the cache list
    // RED: fails here — `settings-btn-clear-cache-{slug}` does not exist yet
    await expect(
      page.getByTestId(`settings-btn-clear-cache-${service.slug}`),
    ).toBeVisible();

    // Set up intercept for the DELETE /api/cache/{serviceId} call
    const clearCall = interceptNetworkCall({
      url: `**/api/cache/${service.id}`,
    });

    // Act: click the per-service Clear button
    await page.getByTestId(`settings-btn-clear-cache-${service.slug}`).click();

    // Assert: confirmation dialog appears with cancel and confirm buttons
    await expect(
      page.getByTestId(`settings-modal-clear-cache-confirm-${service.slug}`),
    ).toBeVisible();
    await expect(
      page.getByTestId(`settings-btn-clear-cache-cancel-${service.slug}`),
    ).toBeVisible();

    // Confirm the clear
    await page
      .getByTestId(`settings-btn-clear-cache-confirm-${service.slug}`)
      .click();

    // Assert: DELETE /api/cache/{id} was called and succeeded
    const { status } = await clearCall;
    expect(status).toBe(200);

    // Assert: list refreshes — service row still present (cache reloaded from disk)
    await expect(
      page.getByTestId(`settings-btn-clear-cache-${service.slug}`),
    ).toBeVisible();
  });
});

// ─── P1 — AC-3: "Clear All" with confirmation ────────────────────────────────

test.describe("Story 2.5 — P1: AC-3 Clear All with confirmation", () => {
  test("clicking Clear All and confirming calls DELETE /api/cache and list refreshes", async ({
    page,
    request,
    interceptNetworkCall,
  }) => {
    // Arrange
    const service = await seedService(request, { name: uniqueName("ac3-svc") });
    await page.goto("/settings");
    await page.getByTestId("settings-nav-cache").click();

    // Verify the Clear All button is visible
    // RED: fails here — `settings-btn-clear-all-caches` does not exist yet
    await expect(
      page.getByTestId("settings-btn-clear-all-caches"),
    ).toBeVisible();

    // Set up intercept for DELETE /api/cache.
    // Placed after page load so the initial GET /api/cache is already past;
    // the first matching call captured will be the DELETE triggered by confirm.
    const clearAllCall = interceptNetworkCall({ url: "**/api/cache" });

    // Act: click the Clear All button
    await page.getByTestId("settings-btn-clear-all-caches").click();

    // Assert: confirmation dialog appears with verbatim EXPERIENCE.md text
    await expect(
      page.getByTestId("settings-modal-clear-all-caches-confirm"),
    ).toBeVisible();
    await expect(page.getByText("Clear all caches?")).toBeVisible();
    await expect(
      page.getByTestId("settings-btn-clear-all-caches-cancel"),
    ).toBeVisible();

    // Confirm
    await page.getByTestId("settings-btn-clear-all-caches-confirm").click();

    // Assert: DELETE /api/cache was called and succeeded
    const { status } = await clearAllCall;
    expect(status).toBe(200);

    // Assert: list refreshes — service row still visible after clear-all
    await expect(
      page.getByTestId(`settings-btn-clear-cache-${service.slug}`),
    ).toBeVisible();
  });
});

// ─── P1 — AC-4: Empty state when no services configured ──────────────────────

test.describe("Story 2.5 — P1: AC-4 Empty state when no services configured", () => {
  test("with no services, Cache section shows empty state with icon and message", async ({
    page,
    request,
  }) => {
    // Arrange: ensure no services exist so the empty state is guaranteed
    await request.post(`${API_URL}/api/test/reset-services`);

    // Act
    await page.goto("/settings");
    await page.getByTestId("settings-nav-cache").click();

    // Assert: empty state text is visible (EXPERIENCE.md verbatim)
    // RED: empty state not implemented — placeholder "Configured in a later story." shown
    await expect(page.getByText("No service caches yet.")).toBeVisible();
    await expect(
      page.getByText(
        "Caches appear here once services are created and receive requests.",
      ),
    ).toBeVisible();

    // Assert: "Clear All" button is NOT visible in the empty state
    await expect(
      page.getByTestId("settings-btn-clear-all-caches"),
    ).not.toBeVisible();
  });
});

// ─── P1 — AC-5: Standard User access ─────────────────────────────────────────

test.describe("Story 2.5 — P1: AC-5 Standard User can access and use cache management", () => {
  test("authenticated user sees cache management UI — no admin role required", async ({
    page,
    request,
  }) => {
    // Arrange: seed a service so the cache section is non-empty
    const service = await seedService(request, { name: uniqueName("ac5-svc") });

    // Act: navigate as the authenticated user (storageState handles auth — any role)
    await page.goto("/settings");
    await page.getByTestId("settings-nav-cache").click();

    // Assert: cache management controls are visible
    // The endpoints use .RequireAuthorization() only — no admin role check.
    // RED: CacheSettings component not implemented — placeholder shown
    await expect(
      page.getByTestId(`settings-btn-clear-cache-${service.slug}`),
    ).toBeVisible();
    await expect(
      page.getByTestId("settings-btn-clear-all-caches"),
    ).toBeVisible();

    // Assert: no forbidden / error state is shown
    await expect(page.getByText("403")).not.toBeVisible();
    await expect(page.getByText("Forbidden")).not.toBeVisible();
  });
});
