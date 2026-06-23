import { test, expect } from "../support/fixtures";
import { apiFetch } from "../support/helpers/api-client";
import { faker } from "@faker-js/faker";

/**
 * RED-PHASE ATDD acceptance test scaffolds for Story 2.3:
 * Enable/Disable Service Toggle, ServicesHub & Real-Time Status.
 *
 * These tests FAIL before implementation. They PASS once Story 2.3 is done.
 *
 * ACs covered:
 *   AC-1: Toggle click → optimistic UI flip (isActive) before API responds;
 *         revert + error toast on 500.
 *   AC-2: ServiceStatusChanged SignalR event → React Query cache invalidated
 *         → services list refreshes without a page reload.
 *
 * RED before implementation:
 *   - useServicesHub hook does not exist
 *   - AppShell does not call useServicesHub
 *   - HUB_INVALIDATION_MAP does not map ServiceStatusChanged
 *   - ServiceCard toggle has no data-testid
 *   - Toast infrastructure does not exist
 *
 * Data-testid contract (must exist after Story 2.3):
 *   service-toggle-{id}  — the toggle <input> on each ServiceCard
 *   toast-container      — the container rendered by ToastProvider
 */

// ─── Helpers ──────────────────────────────────────────────────────────────

function uniqueName(prefix: string): string {
  return `${prefix}-${faker.string.alphanumeric(6).toLowerCase()}`;
}

interface CreatedService {
  id: string;
  name: string;
  port: number;
  slug: string;
  status: "live" | "stopped";
  isActive: boolean;
  tags: string[];
  mockFileCount: number;
}

async function getNextPort(
  request: Parameters<typeof apiFetch>[0],
): Promise<number> {
  const result = await apiFetch<{ port: number }>(
    request,
    "/api/services/next-port",
  );
  return result.port;
}

async function seedService(
  request: Parameters<typeof apiFetch>[0],
  overrides: Partial<{
    name: string;
    externalUrl: string;
    port: number;
  }> = {},
): Promise<CreatedService> {
  const name = overrides.name ?? uniqueName("hub-svc");
  return apiFetch<CreatedService>(request, "/api/services", {
    method: "POST",
    data: JSON.stringify({
      name,
      externalUrl:
        overrides.externalUrl ?? `https://${faker.internet.domainName()}`,
      port: overrides.port ?? (await getNextPort(request)),
    }),
  });
}

// ─── P0: Toggle optimistic UI ─────────────────────────────────────────────

test.describe("P0 — AC-1: Toggle optimistic UI", () => {
  /**
   * RED: ServiceCard toggle has no data-testid yet, so getByTestId fails.
   *      Additionally, useToggleService has no optimistic update logic.
   * GREEN: toggle input has data-testid="service-toggle-{id}" and flips
   *        isActive immediately via onMutate.
   */
  test("toggle input has data-testid and clicking it flips the toggle immediately", async ({
    page,
    request,
  }) => {
    // Arrange — seed a live service
    const service = await seedService(request, {
      name: uniqueName("toggle-opt"),
    });

    // Navigate to the services page
    await page.goto("/services");
    await page.waitForSelector(`[data-testid="service-card-${service.id}"]`);

    // Intercept the stop call to add delay (so we can observe optimistic state)
    await page.route(`**/api/services/${service.id}/stop`, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.continue();
    });

    // Act — get the toggle and click it
    // RED: data-testid does not exist yet
    const toggle = page.getByTestId(`service-toggle-${service.id}`);
    await expect(toggle).toBeVisible();

    // Confirm initial state (isActive = true → toggle checked)
    await expect(toggle).toBeChecked();

    await toggle.click();

    // Assert optimistic flip — toggle should appear unchecked immediately
    // RED: useToggleService lacks optimistic onMutate, so toggle won't flip
    //      until the server responds.
    await expect(toggle).not.toBeChecked();
  });

  /**
   * RED: No toast infrastructure exists. After a 500 error, the toggle
   *      should revert and an error toast should appear.
   * GREEN: Toast system installed; useToggleService onError reverts + shows toast.
   */
  test("server error reverts toggle and shows error toast", async ({
    page,
    request,
  }) => {
    // Arrange
    const service = await seedService(request, {
      name: uniqueName("toggle-err"),
    });

    await page.goto("/services");
    await page.waitForSelector(`[data-testid="service-card-${service.id}"]`);

    // Stub the stop endpoint to return 500
    await page.route(`**/api/services/${service.id}/stop`, async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error: { message: "WireMock failed to stop" },
        }),
      });
    });

    const toggle = page.getByTestId(`service-toggle-${service.id}`);
    await expect(toggle).toBeChecked();

    // Act
    await toggle.click();

    // Assert revert — toggle should return to checked after error
    await expect(toggle).toBeChecked();

    // Assert toast — RED: toast infrastructure doesn't exist yet
    const toastContainer = page.getByTestId("toast-container");
    await expect(toastContainer).toBeVisible();
    await expect(toastContainer).toContainText(/failed|error/i);
  });
});

// ─── P1: Real-time ServiceStatusChanged via ServicesHub ───────────────────

test.describe("P1 — AC-2: Real-time status update via ServicesHub SignalR", () => {
  /**
   * This test validates the full real-time signal path:
   *   Browser tab B: connects to /hubs/services via SignalR
   *   Tab A: POST /api/services/{id}/stop (via API)
   *   Tab B: should see the service update in the UI without a reload
   *
   * Uses two browser contexts to simulate multi-tab real-time behaviour.
   *
   * RED: useServicesHub hook does not exist, AppShell does not call it,
   *      HUB_INVALIDATION_MAP["ServiceStatusChanged"] is empty.
   * GREEN: Hook wired → ServiceStatusChanged triggers invalidateQueries(["services"])
   *        → the service list refreshes in the UI.
   */
  test("ServiceStatusChanged event refreshes services list without page reload", async ({
    browser,
    request,
  }) => {
    // Arrange — seed a live service
    const service = await seedService(request, {
      name: uniqueName("rt-status"),
    });

    // Open two contexts (simulates two browser tabs)
    const contextA = await browser.newContext({
      storageState: "tests/support/auth/.auth/user.json",
    });
    const contextB = await browser.newContext({
      storageState: "tests/support/auth/.auth/user.json",
    });

    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    try {
      // Tab B — open the services page and wait for the service card to appear
      await pageB.goto("/services");
      await pageB.waitForSelector(`[data-testid="service-card-${service.id}"]`);

      // Confirm Tab B shows service as live
      const statusPill = pageB.locator(
        `[data-testid="service-card-${service.id}"] [data-testid="status-pill"]`,
      );
      await expect(statusPill).toContainText(/live/i);

      // Tab A — stop the service via API (not UI) so only SignalR triggers the UI update
      await pageA.goto("/services");
      await apiFetch(request, `/api/services/${service.id}/stop`, {
        method: "POST",
      });

      // Assert — Tab B should update WITHOUT a page reload
      // RED: AppShell does not call useServicesHub, so no SignalR connection is made.
      //      The status pill will NOT update until the user manually refreshes.
      // GREEN: useServicesHub wired → HUB_INVALIDATION_MAP invalidates ["services"]
      //        → React Query refetches → status pill switches to "Stopped".
      await expect(statusPill).toContainText(/stopped/i, { timeout: 5000 });
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });

  /**
   * Simpler variant: verify HUB_INVALIDATION_MAP maps ServiceStatusChanged.
   * This checks that the React app wires the event name correctly even in
   * scenarios where the full SignalR flow can't be easily automated.
   *
   * RED: HUB_INVALIDATION_MAP["ServiceStatusChanged"] is currently {}.
   * GREEN: Map updated to { ServiceStatusChanged: [["services"]] }.
   */
  test("stopping a service via API eventually shows 'stopped' status in the UI", async ({
    page,
    request,
  }) => {
    // Arrange
    const service = await seedService(request, {
      name: uniqueName("stop-api"),
    });

    await page.goto("/services");
    await page.waitForSelector(`[data-testid="service-card-${service.id}"]`);

    // Act — stop via API
    await apiFetch(request, `/api/services/${service.id}/stop`, {
      method: "POST",
    });

    // Assert — status updates in the UI within 5 s (driven by SignalR invalidation)
    // RED: No SignalR wiring → UI never updates without a page reload.
    const statusPill = page.locator(
      `[data-testid="service-card-${service.id}"] [data-testid="status-pill"]`,
    );
    await expect(statusPill).toContainText(/stopped/i, { timeout: 5000 });
  });
});
