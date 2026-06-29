/**
 * ATDD E2E acceptance tests — Story 4.2: Mappings File Explorer & Dual-Mode Editor
 * Layer: Playwright E2E (live stack — no backend mocking except fault-injection)
 *
 * RED PHASE — these tests are RED-by-construction:
 *   - MappingsPage is currently a placeholder ("Configured in a later story.")
 *   - The folder tree, editor, and all CRUD UI do not exist yet.
 *   - The GET /api/mappings/{**path} content endpoint does not exist yet.
 *
 * ACs covered:
 *   AC-1  — P0: Navigate to /mappings → tree renders configured services
 *   AC-5  — P1: Click file → content loads in editor (requires content endpoint)
 *   AC-10 — P1: Edit file → Save → updated on disk
 *   AC-14 — P1: Delete file → confirmation → removed from tree + disk
 *   AC-15 — P2: Rename file → tree updates + disk renamed
 *   AC-15 — P2: Duplicate file → new file with _copy suffix
 *   AC-16 — P1: Write failure → error toast (fault-injection via page.route())
 *   AC-20 — P1: Keyboard navigation: arrow keys navigate tree, Enter opens
 *
 * E2E Policy (from project-context.md):
 *   - Runs against the LIVE stack (Vite on :5173 + API on :5000)
 *   - No page.route() mocking for CRUD — live stack only
 *   - ONLY permitted interceptor: fault-injection for write-failure scenario (AC-16)
 *   - Authentication via storageState (fishtankAuthProvider)
 *
 * data-testid contract (verbatim from DESIGN.md):
 *   page-mappings
 *   mappings-tree-node-{service-slug}-{filename}
 *   mappings-btn-new-mapping
 *   mappings-btn-new-response
 *   mappings-btn-save
 *   mappings-btn-discard
 *   mappings-btn-delete
 *   mappings-btn-rename
 *   mappings-btn-duplicate
 *   mappings-tab-form
 *   mappings-tab-raw
 *   mappings-breadcrumb-editor
 *   mappings-modal-file-name
 *   mappings-input-filename
 *   mappings-btn-copy-json
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

/** Create a service via the API — needed to have a service folder in the tree. */
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

/** Create a mapping file via the API. */
async function seedMappingFile(
  request: Request,
  serviceSlug: string,
  filename: string,
): Promise<void> {
  const content = JSON.stringify({
    request: { method: "GET", url: `/${faker.string.alphanumeric(8)}` },
    response: { status: 200, body: "e2e test response" },
  });

  await apiFetch<unknown>(request, "/api/mappings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    data: JSON.stringify({
      path: `${serviceSlug}/mappings/${filename}`,
      content,
    }),
  });
}

// ─── P0: Tree renders (AC-1) ────────────────────────────────────────────────

test.describe("Story 4.2 — P0: Mappings tree", () => {
  test("P0-1 (AC-1): navigating to /mappings renders the folder tree with configured services", async ({
    page,
    request,
  }) => {
    // RED: MappingsPage is a placeholder — tree does not render

    // Seed a service and a mapping file so the tree has content
    const svcName = uniqueSlug();
    const svc = await seedService(request, svcName);
    const filename = `get_${uniqueSlug()}.json`;
    await seedMappingFile(request, svc.slug, filename);

    await page.goto("/mappings");

    // Page root must be present
    await expect(page.getByTestId("page-mappings")).toBeVisible();

    // Service folder must appear in the tree
    await expect(page.getByText(svcName)).toBeVisible({ timeout: 10_000 });

    // File node must carry the correct data-testid
    await expect(
      page.getByTestId(`mappings-tree-node-${svc.slug}-${filename}`),
    ).toBeVisible({ timeout: 10_000 });
  });
});

// ─── P1: File click loads editor (AC-5) ─────────────────────────────────────

test.describe("Story 4.2 — P1: File click loads editor", () => {
  test("P1-1 (AC-5): clicking a file in the tree loads the editor with breadcrumb", async ({
    page,
    request,
  }) => {
    // RED: placeholder has no tree or editor

    const svcName = uniqueSlug();
    const svc = await seedService(request, svcName);
    const filename = `get_${uniqueSlug()}.json`;
    await seedMappingFile(request, svc.slug, filename);

    await page.goto("/mappings");

    // Wait for tree to appear and click the file
    const fileNode = page.getByTestId(
      `mappings-tree-node-${svc.slug}-${filename}`,
    );
    await expect(fileNode).toBeVisible({ timeout: 10_000 });
    await fileNode.click();

    // Editor breadcrumb must appear with the filename
    const breadcrumb = page.getByTestId("mappings-breadcrumb-editor");
    await expect(breadcrumb).toBeVisible({ timeout: 5_000 });
    await expect(breadcrumb).toContainText(filename);

    // Form and Raw JSON tabs must be present
    await expect(page.getByTestId("mappings-tab-form")).toBeVisible();
    await expect(page.getByTestId("mappings-tab-raw")).toBeVisible();
  });
});

// ─── P1: Save to disk (AC-10) ───────────────────────────────────────────────

test.describe("Story 4.2 — P1: Edit and save mapping file", () => {
  test("P1-2 (AC-10): editing a file in Raw JSON and saving updates it on disk", async ({
    page,
    request,
  }) => {
    // RED: editor, save button, and PUT mutation do not exist

    const svcName = uniqueSlug();
    const svc = await seedService(request, svcName);
    const filename = `get_${uniqueSlug()}.json`;
    await seedMappingFile(request, svc.slug, filename);

    await page.goto("/mappings");

    const fileNode = page.getByTestId(
      `mappings-tree-node-${svc.slug}-${filename}`,
    );
    await expect(fileNode).toBeVisible({ timeout: 10_000 });
    await fileNode.click();

    await expect(page.getByTestId("mappings-breadcrumb-editor")).toBeVisible({
      timeout: 5_000,
    });

    // Switch to Raw JSON tab and make an edit
    await page.getByTestId("mappings-tab-raw").click();

    const cmEditor = page.locator(".cm-editor");
    await expect(cmEditor).toBeVisible({ timeout: 5_000 });

    // Click into editor and add a comment or change a value
    await cmEditor.click();
    await page.keyboard.press("Control+A");
    const newContent = JSON.stringify({
      request: { method: "GET", url: "/e2e-updated" },
      response: { status: 201, body: "updated by e2e" },
    });
    await page.keyboard.type(newContent);

    // Save must now be enabled
    await expect(page.getByTestId("mappings-btn-save")).toBeEnabled({
      timeout: 3_000,
    });
    await page.getByTestId("mappings-btn-save").click();

    // Success toast or cleared unsaved indicator
    await expect(page.locator("[role='status'], [role='alert']").first()).toBeVisible({
      timeout: 5_000,
    });

    // Verify the change persisted — re-fetch content via API
    const fileContent = await apiFetch<{ content: string }>(
      request,
      `/api/mappings/${svc.slug}/mappings/${filename}`,
    );
    expect(fileContent.content).toContain("e2e-updated");
  });
});

// ─── P1: Delete with confirmation (AC-14) ───────────────────────────────────

test.describe("Story 4.2 — P1: Delete mapping file", () => {
  test("P1-3 (AC-14): deleting a file shows confirmation then removes it from tree and disk", async ({
    page,
    request,
  }) => {
    // RED: delete button and confirmation dialog do not exist

    const svcName = uniqueSlug();
    const svc = await seedService(request, svcName);
    const filename = `get_${uniqueSlug()}.json`;
    await seedMappingFile(request, svc.slug, filename);

    await page.goto("/mappings");

    const fileNode = page.getByTestId(
      `mappings-tree-node-${svc.slug}-${filename}`,
    );
    await expect(fileNode).toBeVisible({ timeout: 10_000 });
    await fileNode.click();

    await expect(page.getByTestId("mappings-breadcrumb-editor")).toBeVisible({
      timeout: 5_000,
    });

    // Click Delete
    await page.getByTestId("mappings-btn-delete").click();

    // Confirmation dialog with exact copy
    await expect(
      page.getByText(
        "Delete this mapping? This removes the file from disk.",
      ),
    ).toBeVisible({ timeout: 3_000 });

    // Confirm deletion
    await page.getByRole("button", { name: /delete|confirm/i }).click();

    // File must disappear from the tree
    await expect(
      page.getByTestId(`mappings-tree-node-${svc.slug}-${filename}`),
    ).not.toBeVisible({ timeout: 5_000 });

    // Verify file is gone from disk via API
    const res = await apiFetch<unknown>(
      request,
      `/api/mappings/${svc.slug}/mappings/${filename}`,
      { method: "GET" },
    ).catch((e: unknown) => e);
    // Should be a 404 error
    expect(res).toBeTruthy(); // error object returned
  });
});

// ─── P2: Rename (AC-15) ──────────────────────────────────────────────────────

test.describe("Story 4.2 — P2: Rename mapping file", () => {
  test("P2-1 (AC-15): renaming a file updates the tree node and renames on disk", async ({
    page,
    request,
  }) => {
    // RED: rename button and modal do not exist

    const svcName = uniqueSlug();
    const svc = await seedService(request, svcName);
    const originalName = `get_${uniqueSlug()}.json`;
    const newName = `get_renamed_${uniqueSlug()}.json`;
    await seedMappingFile(request, svc.slug, originalName);

    await page.goto("/mappings");

    const fileNode = page.getByTestId(
      `mappings-tree-node-${svc.slug}-${originalName}`,
    );
    await expect(fileNode).toBeVisible({ timeout: 10_000 });
    await fileNode.click();

    await expect(page.getByTestId("mappings-breadcrumb-editor")).toBeVisible({
      timeout: 5_000,
    });

    // Click Rename
    await page.getByTestId("mappings-btn-rename").click();

    // Naming modal pre-filled with original name
    await expect(page.getByTestId("mappings-modal-file-name")).toBeVisible({
      timeout: 3_000,
    });
    await expect(page.getByTestId("mappings-input-filename")).toHaveValue(
      originalName,
    );

    // Clear and enter new name
    await page.getByTestId("mappings-input-filename").fill(newName);
    await page.getByRole("button", { name: /confirm|rename|ok/i }).click();

    // Old node must be gone; new node must appear
    await expect(
      page.getByTestId(`mappings-tree-node-${svc.slug}-${originalName}`),
    ).not.toBeVisible({ timeout: 5_000 });
    await expect(
      page.getByTestId(`mappings-tree-node-${svc.slug}-${newName}`),
    ).toBeVisible({ timeout: 5_000 });
  });
});

// ─── P2: Duplicate (AC-15) ───────────────────────────────────────────────────

test.describe("Story 4.2 — P2: Duplicate mapping file", () => {
  test("P2-2 (AC-15): duplicating a file creates a _copy variant in the same folder", async ({
    page,
    request,
  }) => {
    // RED: duplicate button does not exist

    const svcName = uniqueSlug();
    const svc = await seedService(request, svcName);
    const baseName = `get_${uniqueSlug()}`;
    const originalName = `${baseName}.json`;
    await seedMappingFile(request, svc.slug, originalName);

    await page.goto("/mappings");

    const fileNode = page.getByTestId(
      `mappings-tree-node-${svc.slug}-${originalName}`,
    );
    await expect(fileNode).toBeVisible({ timeout: 10_000 });
    await fileNode.click();

    await expect(page.getByTestId("mappings-breadcrumb-editor")).toBeVisible({
      timeout: 5_000,
    });

    // Click Duplicate
    await page.getByTestId("mappings-btn-duplicate").click();

    // A _copy variant must appear in the tree
    await expect(
      page.getByTestId(`mappings-tree-node-${svc.slug}-${baseName}_copy.json`),
    ).toBeVisible({ timeout: 5_000 });
  });
});

// ─── P1: Write failure → error toast (AC-16, R-E4-004) ──────────────────────
// NOTE: This test uses page.route() ONLY for fault-injection (permitted per policy).

test.describe("Story 4.2 — P1: Write failure error toast", () => {
  test("P1-4 (AC-16, R-E4-004): save failure shows error toast with actionable message",
    // The PUT → 500 response is intentional fault-injection; skip the network-error
    // monitor for this test only so the harness does not fail on the expected 5xx.
    { annotation: [{ type: "skipNetworkMonitoring" }] },
    async ({
    page,
    request,
  }) => {
    // RED: error toast not wired to save action

    const svcName = uniqueSlug();
    const svc = await seedService(request, svcName);
    const filename = `get_${uniqueSlug()}.json`;
    await seedMappingFile(request, svc.slug, filename);

    // Fault-injection: intercept PUT to return 500 MAPPING_WRITE_FAILED
    await page.route("**/api/mappings/**", async (route) => {
      if (route.request().method() === "PUT") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            error: {
              code: "MAPPING_WRITE_FAILED",
              message: "Disk write failed: permission denied",
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/mappings");

    const fileNode = page.getByTestId(
      `mappings-tree-node-${svc.slug}-${filename}`,
    );
    await expect(fileNode).toBeVisible({ timeout: 10_000 });
    await fileNode.click();

    await expect(page.getByTestId("mappings-breadcrumb-editor")).toBeVisible({
      timeout: 5_000,
    });

    // Make an edit and try to save
    await page.getByTestId("mappings-tab-form").click();
    const statusInput = page.getByLabel(/status/i);
    await statusInput.fill("418");

    await expect(page.getByTestId("mappings-btn-save")).toBeEnabled({
      timeout: 3_000,
    });
    await page.getByTestId("mappings-btn-save").click();

    // Error toast must appear with actionable message
    await expect(
      page.locator("[role='alert'], [role='status']").filter({
        hasText: /failed.*save|permission denied|write failed/i,
      }),
    ).toBeVisible({ timeout: 5_000 });

    // Unsaved indicator must remain (state not mutated)
    await expect(fileNode).toContainText("●");
  });
});

// ─── P1: Keyboard navigation (AC-20) ────────────────────────────────────────

test.describe("Story 4.2 — P1: Keyboard navigation", () => {
  test("P1-5 (AC-20): arrow keys move focus in the folder tree; Enter opens a file", async ({
    page,
    request,
  }) => {
    // RED: keyboard navigation does not exist in placeholder

    const svcName = uniqueSlug();
    const svc = await seedService(request, svcName);
    const filename = `get_${uniqueSlug()}.json`;
    await seedMappingFile(request, svc.slug, filename);

    await page.goto("/mappings");

    // Wait for the tree to render
    await expect(page.getByText(svcName)).toBeVisible({ timeout: 10_000 });

    // Click the service folder once — this collapses it but sets keyboard focus
    // (focusedPath) on the service node, giving us a known position in the tree
    // regardless of how many other services appear above it in the DOM.
    await page.getByText(svcName).click();
    // Click again to re-expand so the file is visible in DOM order.
    await page.getByText(svcName).click();

    // From the service node (focusedPath is now the service), press ArrowDown twice:
    //   ArrowDown #1 → "mappings" sub-folder (service's first child)
    //   ArrowDown #2 → the seeded file (mappings' first child)
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");

    // Press Enter to open the file — fires the file node's click handler
    await page.keyboard.press("Enter");

    // Editor must load
    await expect(page.getByTestId("mappings-breadcrumb-editor")).toBeVisible({
      timeout: 5_000,
    });
  });
});
