/**
 * ATDD E2E acceptance tests — Story 4.4: Save As Mock — Mock Suggestion Modal
 * Layer: Playwright E2E (live stack — no backend mocking except fault-injection)
 *
 * RED PHASE — these tests are RED-by-construction:
 *   - MockSuggestionModal component doesn't exist yet
 *   - bi-lightning-charge "Save as Mock" icon doesn't exist in ActivityTable
 *   - useSaveAsMock mutation hook doesn't exist
 *   - POST /api/mappings save flow for mock suggestion not implemented
 *   - Folder tree refresh after save not implemented
 *
 * ACs covered:
 *   AC-1:  Save as Mock icon visible only on proxied rows
 *   AC-2:  Icon click opens Mock Suggestion modal
 *   AC-9:  Save success writes two files (Mapping + Response)
 *   AC-10: Save success closes modal, refreshes tree, shows toast
 *   AC-11: Write failure shows error, creates System Event
 *   AC-3:  Row detail "Save as Mock" button opens modal
 *
 * E2E Policy (from project-context.md):
 *   - Runs against the LIVE stack (Vite on :5173 + API on :5000)
 *   - No page.route() mocking for CRUD — live stack only
 *   - ONLY permitted interceptor: fault-injection for write-failure scenario (AC-11)
 *   - Authentication via storageState (fishtankAuthProvider)
 *
 * data-testid contract:
 *   activity-btn-save-as-mock-{rowId}
 *   mock-suggestion-modal
 *   mock-suggestion-mapping-json
 *   mock-suggestion-response-body
 *   mock-suggestion-use-transformer
 *   mock-suggestion-btn-save
 *   mock-suggestion-btn-close
 *   mappings-tree-node-{service-slug}-{filename}
 */

import { test, expect } from "../support/fixtures";
import { apiFetch } from "../support/helpers/api-client";
import { faker } from "@faker-js/faker";

// ─── Types & helpers ────────────────────────────────────────────────────────

type Request = Parameters<typeof apiFetch>[0];

function uniqueSlug(): string {
  return `e2e-${faker.string.alphanumeric(6).toLowerCase()}`;
}

interface CreatedService {
  id: string;
  name: string;
  port: number;
  slug: string;
}

/** Create a service via the API for testing */
async function seedService(
  request: Request,
  name: string,
): Promise<CreatedService> {
  const { port } = await apiFetch<{ port: number }>(
    request,
    "/api/services/next-port",
  );

  return apiFetch<CreatedService>(request, "/api/services", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    data: JSON.stringify({
      name,
      externalUrl: "https://httpbin.org",
      port,
      tags: [],
    }),
  });
}

interface ActivityRow {
  serviceId: string;
  urlPath: string;
  type: "Proxied" | "Mocked";
  id: string;
  statusCode: number;
  method: string;
  serviceName: string;
  serviceSlug?: string;
}

/** Wait for a proxied request to appear in activity log */
async function waitForProxiedRequest(
  request: Request,
  serviceId: string,
  urlPath: string,
  timeoutMs = 5000,
): Promise<ActivityRow> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const activity = await apiFetch<ActivityRow[]>(request, "/api/activity");
    const found = activity.find(
      (row) =>
        row.serviceId === serviceId &&
        row.urlPath === urlPath &&
        row.type === "Proxied",
    );
    if (found) return found;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Proxied request not found: ${urlPath}`);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

test.describe("Story 4.4: Save As Mock — Full Flow", () => {
  let service: CreatedService;
  let serviceSlug: string;

  test.beforeEach(async ({ request }) => {
    // Create a test service
    const name = uniqueSlug();
    service = await seedService(request, name);
    serviceSlug = service.slug;
  });

  // ─── AC-1, AC-2: Icon visible and opens modal ─────────────────────────────

  test.skip("AC-1, AC-2 (P0): Save as Mock icon visible on proxied row, opens modal", async ({
    page,
    request,
  }) => {
    // Navigate to Activity page
    await page.goto("/activity");
    await expect(page.getByTestId("page-activity")).toBeVisible();

    // Make a proxied request (triggers WireMock proxy)
    const proxyUrl = `http://localhost:${service.port}/api/test`;
    await fetch(proxyUrl, { method: "POST", body: JSON.stringify({ test: true }) });

    // Wait for proxied request to appear in activity log
    const proxiedRow = await waitForProxiedRequest(
      request,
      service.id,
      "/api/test",
    );

    // Verify Save as Mock icon is visible
    const saveAsMockBtn = page.getByTestId(
      `activity-btn-save-as-mock-${proxiedRow.id}`,
    );
    await expect(saveAsMockBtn).toBeVisible();
    await expect(saveAsMockBtn).toHaveAttribute("aria-label", "Save as Mock");

    // Click the icon
    await saveAsMockBtn.click();

    // Verify modal opens
    const modal = page.getByTestId("mock-suggestion-modal");
    await expect(modal).toBeVisible();
    await expect(modal).toHaveAttribute("role", "dialog");
  });

  test.skip("AC-1 (P1): Save as Mock icon NOT visible on mocked row", async ({
    page,
    request,
  }) => {
    // Create a mapping file first (so we have a mocked response)
    const mappingContent = JSON.stringify({
      Guid: faker.string.uuid(),
      Request: {
        Path: { Matchers: [{ Name: "WildcardMatcher", Pattern: "/api/mocked" }] },
        Methods: ["GET"],
      },
      Response: {
        StatusCode: 200,
        BodyAsFile: "../responses/get_api_mocked_200_body.json",
      },
    });

    await apiFetch(request, "/api/mappings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      data: JSON.stringify({
        path: `${serviceSlug}/mappings/get_api_mocked_200.json`,
        content: mappingContent,
      }),
    });

    await apiFetch(request, "/api/mappings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      data: JSON.stringify({
        path: `${serviceSlug}/responses/get_api_mocked_200_body.json`,
        content: JSON.stringify({ mocked: true }),
      }),
    });

    // Navigate to Activity page
    await page.goto("/activity");

    // Make a mocked request
    const proxyUrl = `http://localhost:${service.port}/api/mocked`;
    await fetch(proxyUrl);

    // Wait for mocked request to appear
    await page.waitForTimeout(1000);

    // Reload activity page to see the mocked request
    await page.reload();

    // Find the mocked row (should have bi-eye but NOT bi-lightning-charge)
    const rows = page.locator("[data-testid^='activity-row-']");
    const firstRow = rows.first();

    // Verify bi-eye exists
    const viewDetailBtn = firstRow.getByTestId(/activity-btn-view-detail-/);
    await expect(viewDetailBtn).toBeVisible();

    // Verify Save as Mock icon does NOT exist
    const saveAsMockBtn = firstRow.getByTestId(/activity-btn-save-as-mock-/);
    await expect(saveAsMockBtn).not.toBeVisible();
  });

  // ─── AC-3: Row detail "Save as Mock" button ───────────────────────────────

  test.skip("AC-3 (P1): Row detail panel Save as Mock button opens modal", async ({
    page,
    request,
  }) => {
    await page.goto("/activity");

    // Make a proxied request
    const proxyUrl = `http://localhost:${service.port}/api/detail-test`;
    await fetch(proxyUrl, { method: "PUT", body: JSON.stringify({ data: "test" }) });

    const proxiedRow = await waitForProxiedRequest(
      request,
      service.id,
      "/api/detail-test",
    );

    // Click view detail (bi-eye)
    const viewDetailBtn = page.getByTestId(
      `activity-btn-view-detail-${proxiedRow.id}`,
    );
    await viewDetailBtn.click();

    // Wait for row detail to open (could be Modal, Drawer, or Panel)
    const rowDetail = page.getByTestId(/activity-row-detail-(modal|drawer|panel)/);
    await expect(rowDetail).toBeVisible();

    // Click "Save as Mock" button in row detail
    const saveAsMockBtnInDetail = rowDetail.getByRole("button", {
      name: /save as mock/i,
    });
    await saveAsMockBtnInDetail.click();

    // Verify modal opens
    const modal = page.getByTestId("mock-suggestion-modal");
    await expect(modal).toBeVisible();
  });

  // ─── AC-9, AC-10: Save success flow ───────────────────────────────────────

  test.skip("AC-9, AC-10 (P0): Save writes files, closes modal, refreshes tree, shows toast", async ({
    page,
    request,
  }) => {
    await page.goto("/activity");

    // Make a proxied request
    const proxyUrl = `http://localhost:${service.port}/api/v1/users/123`;
    await fetch(proxyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Alice" }),
    });

    const proxiedRow = await waitForProxiedRequest(
      request,
      service.id,
      "/api/v1/users/123",
    );

    // Open Save as Mock modal
    const saveAsMockBtn = page.getByTestId(
      `activity-btn-save-as-mock-${proxiedRow.id}`,
    );
    await saveAsMockBtn.click();

    const modal = page.getByTestId("mock-suggestion-modal");
    await expect(modal).toBeVisible();

    // Verify Mapping JSON is pre-populated
    const mappingTextarea = modal.getByTestId("mock-suggestion-mapping-json");
    const mappingContent = await mappingTextarea.inputValue();
    const mappingJson = JSON.parse(mappingContent);

    expect(mappingJson.Request.Path.Matchers[0].Pattern).toBe("/api/v1/users/123");
    expect(mappingJson.Request.Methods).toEqual(["POST"]);
    expect(mappingJson.Response.BodyAsFile).toBe(
      "../responses/post_api_v1_users_123_200_body.json",
    );

    // Click Save button
    const saveBtn = modal.getByTestId("mock-suggestion-btn-save");
    await saveBtn.click();

    // AC-10: Modal should close
    await expect(modal).not.toBeVisible();

    // AC-10: Success toast should appear
    await expect(page.getByText("Mock saved.")).toBeVisible();

    // AC-9: Verify files were created via API
    const mappingPath = `${serviceSlug}/mappings/post_api_v1_users_123_200.json`;
    const responsePath = `${serviceSlug}/responses/post_api_v1_users_123_200_body.json`;

    const mappingFile = await apiFetch<{ content: string }>(
      request,
      `/api/mappings/${mappingPath}`,
    );
    expect(mappingFile.content).toContain("WildcardMatcher");

    const responseFile = await apiFetch<{ content: string }>(
      request,
      `/api/mappings/${responsePath}`,
    );
    expect(responseFile.content).toBeTruthy();

    // AC-10: Navigate to /mappings and verify folder tree updated
    await page.goto("/mappings");
    await expect(page.getByTestId("page-mappings")).toBeVisible();

    const treeNode = page.getByTestId(
      `mappings-tree-node-${serviceSlug}-post_api_v1_users_123_200.json`,
    );
    await expect(treeNode).toBeVisible();
  });

  // ─── AC-11: Write failure handling ────────────────────────────────────────

  test.skip("AC-11 (P1): Write failure shows error, modal stays open, System Event created", async ({
    page,
    request,
  }) => {
    await page.goto("/activity");

    // Make a proxied request
    const proxyUrl = `http://localhost:${service.port}/api/fail-test`;
    await fetch(proxyUrl);

    const proxiedRow = await waitForProxiedRequest(
      request,
      service.id,
      "/api/fail-test",
    );

    // Open Save as Mock modal
    const saveAsMockBtn = page.getByTestId(
      `activity-btn-save-as-mock-${proxiedRow.id}`,
    );
    await saveAsMockBtn.click();

    const modal = page.getByTestId("mock-suggestion-modal");
    await expect(modal).toBeVisible();

    // Inject fault: intercept POST /api/mappings to return 500 error
    await page.route("**/api/mappings", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            error: "MAPPING_WRITE_FAILED",
            message: "Disk write error",
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Click Save button
    const saveBtn = modal.getByTestId("mock-suggestion-btn-save");
    await saveBtn.click();

    // AC-11: Modal should stay open
    await expect(modal).toBeVisible();

    // AC-11: Error message should appear
    await expect(
      modal.getByText(/Failed to save mock — Disk write error/i),
    ).toBeVisible();

    // AC-11: Save button should remain enabled for retry
    await expect(saveBtn).toBeEnabled();

    // AC-11: Verify System Event was created (check System Events page)
    await page.goto("/system-events");
    await expect(page.getByTestId("page-system-events")).toBeVisible();

    // Look for the error event
    await expect(page.getByText(/MAPPING_WRITE_FAILED/i)).toBeVisible();
  });

  // ─── Edge case: Multiple saves (idempotency) ──────────────────────────────

  test.skip("AC-12 (P1): Duplicate save is idempotent", async ({
    page,
    request,
  }) => {
    await page.goto("/activity");

    const proxyUrl = `http://localhost:${service.port}/api/idempotent`;
    await fetch(proxyUrl);

    const proxiedRow = await waitForProxiedRequest(
      request,
      service.id,
      "/api/idempotent",
    );

    // First save
    let saveAsMockBtn = page.getByTestId(
      `activity-btn-save-as-mock-${proxiedRow.id}`,
    );
    await saveAsMockBtn.click();

    let modal = page.getByTestId("mock-suggestion-modal");
    await expect(modal).toBeVisible();

    let saveBtn = modal.getByTestId("mock-suggestion-btn-save");
    await saveBtn.click();

    await expect(modal).not.toBeVisible();
    await expect(page.getByText("Mock saved.")).toBeVisible();

    // Second save (should be idempotent)
    saveAsMockBtn = page.getByTestId(
      `activity-btn-save-as-mock-${proxiedRow.id}`,
    );
    await saveAsMockBtn.click();

    modal = page.getByTestId("mock-suggestion-modal");
    await expect(modal).toBeVisible();

    saveBtn = modal.getByTestId("mock-suggestion-btn-save");
    await saveBtn.click();

    // Should show "Mock already saved" toast
    await expect(page.getByText("Mock already saved.")).toBeVisible();
  });
});
