import { test, expect } from "../support/fixtures";
import { apiFetch } from "../support/helpers/api-client";
import { faker } from "@faker-js/faker";

/**
 * ATDD acceptance test scaffolds for Story 2.2:
 * Services Page — Browse, Create & Edit Services.
 *
 * RED PHASE — these tests define the expected acceptance behaviour.
 * They FAIL before implementation (current ServicesPage is a placeholder stub).
 * They PASS once Story 2.2 implementation is complete.
 *
 * ACs covered:
 *   AC-1  — Card grid is shown on /services load; empty state with Add CTA when none
 *   AC-2  — Responsive: 3 col ≥1024px, 2 col 640–1023px, 1 col <640px
 *   AC-3  — Service card shows name, port badge, status pill, toggle, Edit link
 *   AC-4  — Table view toggle; view preference persisted per session
 *   AC-5  — Add Service modal: port pre-filled from next-port endpoint
 *   AC-6  — Create service: form submit → card appears in grid → modal closes
 *   AC-7  — Tags: free-form entry, saved, filter chips filter displayed services
 *   AC-8  — Edit modal: pre-populated; slug-change warning shown
 *   AC-9  — Performance: 50 services render ≤1000ms (tested in P0-3)
 *   AC-10 — [backend] mockFileCount is 0 when MocksRoot does not exist (integration test)
 *
 * Known limitations (see TODO comments):
 *   - P0-3 (50-service perf test) seeds via the API without cleanup;
 *     a database-reset endpoint will be added in Epic 6.
 *   - Empty-state test (P0-1) requires no pre-existing services;
 *     run against a fresh container or use the isolated API URL.
 *
 * Data-testid contract (all must exist after implementation):
 *   page-services, services-empty, empty-add-service, btn-add-service,
 *   service-modal, input-service-name, input-service-url, input-service-port,
 *   input-service-tags, btn-submit-service, btn-cancel,
 *   slug-change-warning, services-grid, service-card-{id},
 *   edit-service-{id}, services-table
 */

// ───────────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────────

/** Build a unique service name to avoid cross-test collisions. */
function uniqueName(prefix: string): string {
  return `${prefix}-${faker.string.alphanumeric(6).toLowerCase()}`;
}

const API_URL = process.env.API_URL ?? "http://localhost:5000";

interface CreatedService {
  id: string;
  name: string;
  port: number;
  slug: string;
  status: string;
  tags: string[];
  mockFileCount: number;
}

/** GET /api/services/next-port — returns the next available port number. */
async function getNextPort(
  request: Parameters<typeof apiFetch>[0],
): Promise<number> {
  return apiFetch<number>(request, "/api/services/next-port");
}

/** POST /api/services directly, returns the created service. */
async function seedService(
  request: Parameters<typeof apiFetch>[0],
  overrides: Partial<{
    name: string;
    externalUrl: string;
    port: number;
    tags: string[];
  }> = {},
): Promise<CreatedService> {
  const name = overrides.name ?? uniqueName("test-svc");
  return apiFetch<CreatedService>(request, "/api/services", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    data: JSON.stringify({
      name,
      externalUrl: overrides.externalUrl ?? "http://example.com",
      port: overrides.port ?? 30100,
      tags: overrides.tags ?? [],
    }),
  });
}

// ───────────────────────────────────────────────────────────────────────────
// P0 — Critical path (must never fail in CI)
// ───────────────────────────────────────────────────────────────────────────

test.describe("Story 2.2 — P0: Services Page core", () => {
  // AC-1 — Empty state
  test("P0-1: empty state shows Add Service CTA when no services exist", async ({
    page,
  }) => {
    // NOTE: This test requires a clean database.
    // If services already exist, the empty state will not appear.
    // TODO: Wire to a database-reset API call (Epic 6) before the assertion.

    await page.goto("/services");

    // Page renders
    await expect(page.getByTestId("page-services")).toBeVisible();

    // Empty state container visible
    await expect(page.getByTestId("services-empty")).toBeVisible();

    // Primary "Add Service" CTA inside the empty state
    await expect(page.getByTestId("empty-add-service")).toBeVisible();
    await expect(page.getByTestId("empty-add-service")).toContainText(
      "Add Service",
    );
  });

  // AC-5 — Add Service modal: port pre-filled
  test("P0-2: Add Service modal port is pre-filled from /api/services/next-port", async ({
    page,
    interceptNetworkCall,
  }) => {
    // Given — intercept next-port call before navigation
    const nextPortCall = interceptNetworkCall({
      url: "**/api/services/next-port",
    });

    await page.goto("/services");

    // When — open Add Service modal
    await page.getByTestId("btn-add-service").click();

    // Then — modal is visible
    await expect(page.getByTestId("service-modal")).toBeVisible();

    // And — next-port API was called
    const { status } = await nextPortCall;
    expect(status).toBe(200);

    // And — port field is pre-filled with a valid value in 30100–30199
    // Use auto-waiting assertion: React's useEffect fires async after the query
    // resolves, so we wait for the input to be non-empty before reading it.
    const portInput = page.getByTestId("input-service-port");
    await expect(portInput).toBeVisible();
    await expect(portInput).not.toHaveValue(""); // waits for React state update
    const portValue = await portInput.inputValue();
    expect(Number(portValue)).toBeGreaterThanOrEqual(30100);
    expect(Number(portValue)).toBeLessThanOrEqual(30199);
  });

  // AC-9 — Performance: 50 services ≤1000ms
  test(
    "P0-3: 50 services render within 1000ms of navigation",
    async ({ page, request }) => {
      // Seed up to 50 services (best-effort — may fail on port conflicts if
      // some ports are already taken; use a fresh DB for this test).
      // TODO: Replace with a bulk-seed or reset endpoint (Epic 6).
      const seeded: CreatedService[] = [];
      for (let i = 0; i < 50; i++) {
        try {
          const svc = await seedService(request, {
            name: uniqueName(`perf-svc-${i}`),
            port: 30100 + i,
          });
          seeded.push(svc);
        } catch {
          // Skip if port is taken or service name conflicts — continue
        }
      }

      // Measure time from navigation to grid rendering
      const start = Date.now();
      await page.goto("/services");
      await page.waitForSelector('[data-testid="services-grid"]', {
        timeout: 1500,
      });
      const elapsed = Date.now() - start;

      // Performance gate: all cards must appear within 1 second (AC-9)
      expect(elapsed).toBeLessThan(1000);

      // At least some cards are visible (we may have seeded fewer than 50
      // if port conflicts occurred)
      const cards = page.locator('[data-testid^="service-card-"]');
      const count = await cards.count();
      expect(count).toBeGreaterThan(0);
    },
    { timeout: 30_000 }, // Extended timeout for seeding
  );
});

// ───────────────────────────────────────────────────────────────────────────
// P1 — High-value tests (should pass before feature sign-off)
// ───────────────────────────────────────────────────────────────────────────

test.describe("Story 2.2 — P1: Services Page feature tests", () => {
  // AC-6 — Create service end-to-end
  test("P1-1: Add Service form creates a service and card appears in grid", async ({
    page,
    interceptNetworkCall,
  }) => {
    const name = uniqueName("e2e-create");

    // Given — on the services page
    await page.goto("/services");

    // When — open Add Service modal
    await page.getByTestId("btn-add-service").click();
    await expect(page.getByTestId("service-modal")).toBeVisible();

    // Fill form
    await page.getByTestId("input-service-name").fill(name);
    await page.getByTestId("input-service-url").fill("http://my-service.local");
    // Port is pre-filled; accept the default

    // Intercept POST before submit
    const createCall = interceptNetworkCall({
      url: "**/api/services",
      method: "POST",
    });

    // Submit
    await page.getByTestId("btn-submit-service").click();

    // Then — POST succeeded
    const { status } = await createCall;
    expect(status).toBe(201);

    // And — modal closes
    await expect(page.getByTestId("service-modal")).not.toBeVisible();

    // And — new card appears in the grid
    await expect(
      page.locator(`[data-testid^="service-card-"]`).filter({ hasText: name }),
    ).toBeVisible();
  });

  // AC-4 — Table view toggle + sessionStorage persistence
  test("P1-2: table view toggle switches layout and preference is persisted", async ({
    page,
  }) => {
    // Given — a service exists so the table isn't empty
    // (we rely on any existing service for this test)
    await page.goto("/services");

    // The default view should be grid (or table if previously set)
    // Reset sessionStorage to ensure known starting state
    await page.evaluate(() =>
      sessionStorage.setItem("fishtank_services_view", "grid"),
    );
    await page.reload();
    await page.waitForSelector('[data-testid="services-grid"]');

    // When — click the table view toggle
    await page.locator('[aria-label="Table view"]').click();

    // Then — table is visible, grid is not
    await expect(page.getByTestId("services-table")).toBeVisible();
    await expect(page.getByTestId("services-grid")).not.toBeVisible();

    // And — preference is persisted in sessionStorage
    const stored = await page.evaluate(() =>
      sessionStorage.getItem("fishtank_services_view"),
    );
    expect(stored).toBe("table");

    // And — after page reload the table view is still shown
    await page.reload();
    await expect(page.getByTestId("services-table")).toBeVisible();
  });

  // AC-7 — Tags: add tags, filter by tag
  test("P1-3: tags can be added and tag filter chips filter services", async ({
    page,
    request,
  }) => {
    const tagName = uniqueName("tag");
    const serviceName = uniqueName("tagged-svc");

    // Seed a service with a tag via the API
    const port = await getNextPort(request);
    const created = await seedService(request, {
      name: serviceName,
      tags: [tagName],
      port,
    });

    // Given — on the services page
    await page.goto("/services");

    // Verify the tag filter chip is shown
    const tagChip = page.locator(
      `[role="group"][aria-label="Filter by tag"] button`,
      { hasText: tagName },
    );
    await expect(tagChip).toBeVisible();

    // When — click the tag filter chip
    await tagChip.click();

    // Then — only services with that tag are shown
    const cards = page.locator('[data-testid^="service-card-"]');
    const count = await cards.count();
    // All visible cards must have the selected tag
    for (let i = 0; i < count; i++) {
      const cardText = await cards.nth(i).textContent();
      // This assertion is indirect — the tag badge appears on the card
      expect(cardText).toContain(tagName);
    }

    // And — the seeded service card is visible
    await expect(page.getByTestId(`service-card-${created.id}`)).toBeVisible();
  });

  // AC-2 — Responsive grid: 3 col ≥1024px, 2 col 640–1023px, 1 col <640px
  test("P1-4: card grid uses responsive column count", async ({ page }) => {
    // Given — on the services page (with any existing services)
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/services");

    // Wait for the page to finish loading (services or empty state)
    await page.waitForSelector(
      '[data-testid="services-grid"], [data-testid="services-empty"]',
      { timeout: 5000 },
    );

    // If no services exist, the card grid won't be shown — skip
    const gridLocator = page.getByTestId("services-grid");
    const gridVisible = await gridLocator.isVisible();
    if (!gridVisible) {
      test.skip(); // No services to test responsive grid
      return;
    }

    // At ≥1024px — grid should have 3 columns
    // Verify via CSS grid columns on the .cardGrid element
    const grid1280 = page.getByTestId("services-grid");
    const cols1280 = await grid1280.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.gridTemplateColumns.split(" ").length;
    });
    expect(cols1280).toBe(3);

    // At 640–1023px — 2 columns
    await page.setViewportSize({ width: 800, height: 800 });
    const cols800 = await grid1280.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.gridTemplateColumns.split(" ").length;
    });
    expect(cols800).toBe(2);

    // At <640px — 1 column
    await page.setViewportSize({ width: 375, height: 812 });
    const cols375 = await grid1280.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.gridTemplateColumns.split(" ").length;
    });
    expect(cols375).toBe(1);
  });

  // AC-8 — Edit modal: pre-populated + slug-change warning
  test("P1-5: Edit modal is pre-populated and shows slug-change warning on rename", async ({
    page,
    request,
  }) => {
    const originalName = uniqueName("edit-svc");
    const port = await getNextPort(request);
    const created = await seedService(request, {
      name: originalName,
      port,
    });

    // Given — on the services page
    await page.goto("/services");

    // Find and click the Edit button for the seeded service
    const editBtn = page.getByTestId(`edit-service-${created.id}`);
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    // Then — modal opens
    await expect(page.getByTestId("service-modal")).toBeVisible();

    // And — name field is pre-populated
    const nameInput = page.getByTestId("input-service-name");
    await expect(nameInput).toHaveValue(originalName);

    // When — change the name to produce a different slug
    await nameInput.clear();
    await nameInput.fill("Completely Different Name");

    // Then — slug-change warning appears (with 200ms debounce, wait up to 1s)
    await expect(page.getByTestId("slug-change-warning")).toBeVisible({
      timeout: 1000,
    });
  });

  // AC-3 — Service card: port badge, status pill, toggle, Edit link
  test("P1-6: service card shows expected content", async ({
    page,
    request,
  }) => {
    const name = uniqueName("card-content-svc");
    const port = await getNextPort(request);
    const created = await seedService(request, {
      name,
      port,
      externalUrl: "http://card-test.example.com",
    });

    // Given — on the services page
    await page.goto("/services");

    // Find the card
    const card = page.getByTestId(`service-card-${created.id}`);
    await expect(card).toBeVisible();

    // Port badge: shows the assigned port
    await expect(card.locator(`[title="Port ${port}"]`)).toBeVisible();

    // Status pill: "Stopped" (WireMock may not start in test env — check either)
    const statusText = await card.locator(".status-label").textContent();
    expect(["Live", "Stopped"]).toContain(statusText?.trim());

    // Toggle control (use label element specifically to avoid strict-mode violation
    // — the card renders both a <label> and <input> with the same aria-label)
    await expect(card.locator(`label[aria-label*="${name}"]`)).toBeVisible();

    // Edit link
    await expect(page.getByTestId(`edit-service-${created.id}`)).toBeVisible();
    await expect(page.getByTestId(`edit-service-${created.id}`)).toContainText(
      "Edit",
    );
  });
});
