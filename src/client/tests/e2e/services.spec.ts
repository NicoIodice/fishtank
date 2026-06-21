import { test, expect } from "../support/fixtures";
import { createService } from "../support/factories/service-factory";
import { apiFetch } from "../support/helpers/api-client";

/**
 * Example E2E spec — Services feature.
 *
 * Demonstrates:
 *  - Given/When/Then structure
 *  - data-testid selector strategy
 *  - Network interception before navigation (race-free)
 *  - Factory-based test data
 *  - networkErrorMonitor for catching unexpected API errors
 *
 * TODO: Remove skips and fill in data-testids once the UI is implemented.
 */
test.describe("Services", () => {
  test.beforeEach(async ({ page }) => {
    // TODO: restore storageState auth once login endpoint is implemented
    await page.goto("/");
  });

  // TODO: Unskip once the Services feature (story 1-x) is implemented
  test.skip("displays the services list on load", async ({
    page,
    interceptNetworkCall,
  }) => {
    // Given — intercept before navigation so no response is missed
    const servicesCall = interceptNetworkCall({ url: "**/api/services" });

    // When
    await page.goto("/services");

    // Then — API returned successfully
    const { status } = await servicesCall;
    expect(status).toBe(200);

    // And — list container is visible
    await expect(page.getByTestId("services-list")).toBeVisible();
  });

  // TODO: Unskip once the Services feature (story 1-x) is implemented
  test.skip("creates a new service via the UI", async ({
    page,
    interceptNetworkCall,
  }) => {
    // Given — seed factory data (override only what matters for this test)
    const service = createService({ name: "payments-mock", port: 30150 });
    const createCall = interceptNetworkCall({
      url: "**/api/services",
      method: "POST",
    });

    // When — user fills and submits the create form
    await page.goto("/services");
    await page.getByTestId("add-service-button").click();
    await page.getByTestId("service-name-input").fill(service.name);
    await page.getByTestId("service-port-input").fill(String(service.port));
    await page.getByTestId("service-save-button").click();

    // Then — POST succeeded
    const { status } = await createCall;
    expect(status).toBe(201);

    // And — new row appears in the list
    await expect(page.getByTestId(`service-row-${service.name}`)).toBeVisible();
  });

  // TODO: Unskip once the Services feature (story 1-x) is implemented
  test.skip("API: creates and retrieves a service without the browser", async ({
    request,
  }) => {
    // Given
    const service = createService();

    // When — POST directly to the API (no browser overhead)
    const created = await apiFetch<ServiceConfig>(request, "/api/services", {
      method: "POST",
      data: service,
    });

    // Then
    expect(created.name).toBe(service.name);
    expect(created.port).toBe(service.port);
  });
});
