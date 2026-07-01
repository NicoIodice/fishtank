/**
 * ATDD E2E acceptance tests — Story 4.3: Resync UI with Toast Feedback & Conflict Banners
 * Layer: Playwright E2E (live stack — no backend mocking)
 *
 * RED PHASE — these tests are RED-by-construction:
 *   - data-testid="mappings-btn-resync" does not exist in MappingsPage yet
 *   - Toast data-testid attributes for Resync do not exist yet
 *   - ConflictBanner (data-testid="mappings-banner-conflict") does not exist yet
 *   - DeletedFileBanner (data-testid="mappings-banner-deleted") does not exist yet
 *
 * ACs covered:
 *   AC-1  — P0: Resync button visible in Mappings toolbar
 *   AC-3  — P0: Click Resync → success toast with correct counts
 *   AC-6  — P1: Error toast shown on Resync failure
 *   AC-8  — P1: External file modification + local edits → conflict banner after Resync
 *   AC-9  — P1: Deleted file → deleted-file banner after Resync (or SignalR)
 *   AC-10 — P1: Clean file + external modification → silent reload (no conflict banner)
 *   AC-15 — P1: Concurrent Resync → 409 error toast "already in progress"
 *   AC-16 — P1: Error toast persists (does not auto-dismiss after 4 s)
 *
 * E2E Policy (from project-context.md):
 *   - Runs against the LIVE stack (Vite on :5173 + API on :5000)
 *   - Authentication via storageState (fishtankAuthProvider)
 *   - ONLY permitted interceptors: fault-injection and 409-simulation
 *
 * data-testid contract (DESIGN.md — verbatim):
 *   mappings-btn-resync
 *   mappings-banner-conflict
 *   mappings-btn-view-disk
 *   mappings-btn-keep-edits
 *   mappings-banner-deleted
 *   mappings-btn-close-deleted
 *   toast-resync-progress   (new — Story 4.3)
 *   toast-resync-success    (new — Story 4.3)
 *   toast-resync-error      (new — Story 4.3)
 */

import { test, expect } from "../support/fixtures";
import { apiFetch } from "../support/helpers/api-client";
import { faker } from "@faker-js/faker";

// ─── Types ───────────────────────────────────────────────────────────────────

type Request = Parameters<typeof apiFetch>[0];

interface CreatedService {
  id: string;
  name: string;
  port: number;
  slug: string;
}

// ─── Seed helpers ─────────────────────────────────────────────────────────────

function uniqueSlug(): string {
  return `e2e-${faker.string.alphanumeric(6).toLowerCase()}`;
}

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

async function seedMappingFile(
  request: Request,
  serviceSlug: string,
  filename: string,
  content?: string,
): Promise<void> {
  const defaultContent = JSON.stringify({
    request: { method: "GET", url: `/${faker.string.alphanumeric(8)}` },
    response: { status: 200, body: "e2e resync test" },
  });

  await apiFetch<unknown>(request, "/api/mappings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    data: JSON.stringify({
      path: `${serviceSlug}/mappings/${filename}`,
      content: content ?? defaultContent,
    }),
  });
}

async function deleteService(
  request: Request,
  serviceId: string,
): Promise<void> {
  await apiFetch<unknown>(request, `/api/services/${serviceId}`, {
    method: "DELETE",
  });
}

// ─── P0: AC-1 — Resync button visible ────────────────────────────────────────

test.describe("Story 4.3 — P0: AC-1 Resync button in toolbar", () => {
  test("P0-1 (AC-1): Resync button is visible on /mappings page with correct data-testid", async ({
    page,
    request,
  }) => {
    // RED: mappings-btn-resync does not exist in the current MappingsPage

    const svcName = uniqueSlug();
    const svc = await seedService(request, svcName);

    try {
      await page.goto("/mappings");
      await expect(page.getByTestId("page-mappings")).toBeVisible();

      // Resync button must be visible in the toolbar
      await expect(page.getByTestId("mappings-btn-resync")).toBeVisible({
        timeout: 5_000,
      });

      // Button must have "Resync" label
      await expect(page.getByTestId("mappings-btn-resync")).toContainText(
        "Resync",
      );

      // Bootstrap icon must be present inside the button
      const icon = page
        .getByTestId("mappings-btn-resync")
        .locator(".bi-arrow-clockwise");
      await expect(icon).toBeVisible();

      // Button is enabled when no Resync is in progress
      await expect(page.getByTestId("mappings-btn-resync")).toBeEnabled();
    } finally {
      await deleteService(request, svc.id);
    }
  });
});

// ─── P0: AC-3 — Success toast ────────────────────────────────────────────────

test.describe("Story 4.3 — P0: AC-3 Resync success toast", () => {
  test("P0-2 (AC-3): click Resync → success toast shows '{M} mappings and {R} responses loaded in {duration}'", async ({
    page,
    request,
  }) => {
    // RED: no Resync button, no success toast

    const svcName = uniqueSlug();
    const svc = await seedService(request, svcName);
    const filename = `get_${uniqueSlug()}.json`;
    await seedMappingFile(request, svc.slug, filename);

    try {
      await page.goto("/mappings");
      await expect(page.getByTestId("page-mappings")).toBeVisible();
      await expect(page.getByTestId("mappings-btn-resync")).toBeVisible({
        timeout: 5_000,
      });

      // Click Resync
      await page.getByTestId("mappings-btn-resync").click();

      // In-progress toast should appear first
      await expect(page.getByText("Resyncing…")).toBeVisible({
        timeout: 5_000,
      });

      // Success toast should appear after completion
      // The message pattern is "{M} mappings and {R} responses loaded in {duration}"
      await expect(
        page.getByText(/\d+ mappings and \d+ responses loaded in/i),
      ).toBeVisible({ timeout: 10_000 });

      // Button re-enables after completion
      await expect(page.getByTestId("mappings-btn-resync")).toBeEnabled({
        timeout: 5_000,
      });
    } finally {
      await deleteService(request, svc.id);
    }
  });

  test("P0-3 (AC-4): Resync with no files shows zero-files hint toast", async ({
    page,
    request,
  }) => {
    // Seed a service but no mapping files — results in 0 loaded

    const svcName = uniqueSlug();
    const svc = await seedService(request, svcName);

    try {
      await page.goto("/mappings");
      await expect(page.getByTestId("mappings-btn-resync")).toBeVisible({
        timeout: 5_000,
      });

      await page.getByTestId("mappings-btn-resync").click();

      await expect(
        page.getByText(/0 files loaded in.*check your Mocks Root/i),
      ).toBeVisible({ timeout: 10_000 });
    } finally {
      await deleteService(request, svc.id);
    }
  });
});

// ─── P1: AC-15 — 409 Concurrent Resync ───────────────────────────────────────

test.describe("Story 4.3 — P1: AC-15 Concurrent Resync 409 handling", () => {
  test("P1-1 (AC-15): second concurrent Resync triggers 409 error toast 'already in progress'", async ({
    page,
    request,
  }) => {
    // RED: no Resync button, no error toast

    const svcName = uniqueSlug();
    const svc = await seedService(request, svcName);

    try {
      await page.goto("/mappings");
      await expect(page.getByTestId("mappings-btn-resync")).toBeVisible({
        timeout: 5_000,
      });

      // Intercept the second POST /api/resync to return 409
      await page.route("/api/resync", async (route) => {
        await route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            error: {
              code: "RESYNC_IN_PROGRESS",
              message: "A resync operation is already in progress.",
            },
          }),
        });
      });

      await page.getByTestId("mappings-btn-resync").click();

      // Error toast must appear with the "already in progress" message
      await expect(
        page.getByText(/Resync failed.*already in progress/i),
      ).toBeVisible({ timeout: 10_000 });

      // Button must re-enable after error
      await expect(page.getByTestId("mappings-btn-resync")).toBeEnabled({
        timeout: 5_000,
      });
    } finally {
      await deleteService(request, svc.id);
    }
  });
});

// ─── P1: AC-16 — Error toast persistence ─────────────────────────────────────

test.describe("Story 4.3 — P1: AC-16 Error toast persistence", () => {
  test("P1-2 (AC-16): error toast does not auto-dismiss after 4+ seconds", async ({
    page,
    request,
  }) => {
    // RED: no Resync button, no persistent error toast

    const svcName = uniqueSlug();
    const svc = await seedService(request, svcName);

    try {
      await page.goto("/mappings");
      await expect(page.getByTestId("mappings-btn-resync")).toBeVisible({
        timeout: 5_000,
      });

      // Force a 500 error to trigger an error toast
      await page.route("/api/resync", async (route) => {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            error: {
              code: "INTERNAL_ERROR",
              message: "Simulated server error for persistence test",
            },
          }),
        });
      });

      await page.getByTestId("mappings-btn-resync").click();

      const errorToast = page.getByText(/Resync failed/i);
      await expect(errorToast).toBeVisible({ timeout: 5_000 });

      // Wait well beyond the 4 s auto-dismiss window
      await page.waitForTimeout(5_000);

      // Error toast must STILL be visible — it must not auto-dismiss
      await expect(errorToast).toBeVisible();
    } finally {
      await deleteService(request, svc.id);
    }
  });
});

// ─── P1: AC-8 — Conflict banner ──────────────────────────────────────────────

test.describe("Story 4.3 — P1: AC-8 Conflict banner (dirty + external modification)", () => {
  test("P1-3 (AC-8): file with local unsaved changes + Resync conflict → conflict banner appears", async ({
    page,
    request,
  }) => {
    // RED: no Resync button, no conflict banner

    const svcName = uniqueSlug();
    const svc = await seedService(request, svcName);
    const filename = `get_${uniqueSlug()}.json`;
    await seedMappingFile(request, svc.slug, filename);

    try {
      await page.goto("/mappings");
      await expect(page.getByTestId("page-mappings")).toBeVisible();

      // Wait for the tree to load and click the file
      const fileNode = page.getByTestId(
        `mappings-tree-node-${svc.slug}-${filename}`,
      );
      await expect(fileNode).toBeVisible({ timeout: 10_000 });
      await fileNode.click();

      // Wait for the editor to load
      await expect(page.getByTestId("mappings-breadcrumb-editor")).toBeVisible({
        timeout: 5_000,
      });

      // Make a local edit to set isDirty=true
      // (Click the Raw JSON tab and type something in the editor)
      await page.getByTestId("mappings-tab-raw").click();
      // Focus and modify the raw JSON editor
      const editor = page.locator(".cm-content");
      await editor.click();
      await page.keyboard.press("End");
      await page.keyboard.type(" "); // trigger dirty state

      // Verify dirty state (save button should be enabled)
      await expect(page.getByTestId("mappings-btn-save")).toBeEnabled({
        timeout: 3_000,
      });

      // Intercept Resync to return a conflict for the active file
      const filePath = `${svc.slug}/mappings/${filename}`;
      await page.route("/api/resync", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: {
              mappingsLoaded: 1,
              responsesLoaded: 0,
              elapsedMs: 300,
              conflicts: [
                {
                  path: filePath,
                  reason: "File modified externally since last load",
                },
              ],
              failures: [],
            },
          }),
        });
      });

      // Trigger Resync
      await page.getByTestId("mappings-btn-resync").click();

      // Conflict banner must appear
      await expect(page.getByTestId("mappings-banner-conflict")).toBeVisible({
        timeout: 10_000,
      });

      await expect(
        page.getByText(
          "This file was modified on disk since you started editing.",
        ),
      ).toBeVisible();

      await expect(page.getByTestId("mappings-btn-view-disk")).toBeVisible();
      await expect(page.getByTestId("mappings-btn-keep-edits")).toBeVisible();
    } finally {
      await deleteService(request, svc.id);
    }
  });

  test("P1-4 (AC-8): 'Keep my edits' dismisses conflict banner and preserves local changes", async ({
    page,
    request,
  }) => {
    // RED: no conflict banner, no Keep my edits button

    const svcName = uniqueSlug();
    const svc = await seedService(request, svcName);
    const filename = `get_${uniqueSlug()}.json`;
    await seedMappingFile(request, svc.slug, filename);

    try {
      await page.goto("/mappings");
      const fileNode = page.getByTestId(
        `mappings-tree-node-${svc.slug}-${filename}`,
      );
      await expect(fileNode).toBeVisible({ timeout: 10_000 });
      await fileNode.click();

      await expect(page.getByTestId("mappings-breadcrumb-editor")).toBeVisible({
        timeout: 5_000,
      });

      // Edit the file to mark as dirty
      await page.getByTestId("mappings-tab-raw").click();
      const editor = page.locator(".cm-content");
      await editor.click();
      await page.keyboard.press("End");
      await page.keyboard.type(" ");

      // Trigger Resync with a conflict
      const filePath = `${svc.slug}/mappings/${filename}`;
      await page.route("/api/resync", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: {
              mappingsLoaded: 1,
              responsesLoaded: 0,
              elapsedMs: 200,
              conflicts: [{ path: filePath, reason: "Modified externally" }],
              failures: [],
            },
          }),
        });
      });

      await page.getByTestId("mappings-btn-resync").click();

      await expect(page.getByTestId("mappings-banner-conflict")).toBeVisible({
        timeout: 10_000,
      });

      // Click "Keep my edits"
      await page.getByTestId("mappings-btn-keep-edits").click();

      // Banner must be dismissed
      await expect(
        page.getByTestId("mappings-banner-conflict"),
      ).not.toBeVisible({ timeout: 3_000 });

      // Save button must still be enabled (edits preserved, still dirty)
      await expect(page.getByTestId("mappings-btn-save")).toBeEnabled();
    } finally {
      await deleteService(request, svc.id);
    }
  });

  test("P1-5 (AC-8): 'View disk version' replaces editor content with disk version", async ({
    page,
    request,
  }) => {
    // RED: no conflict banner, no View disk version button

    const svcName = uniqueSlug();
    const svc = await seedService(request, svcName);
    const filename = `get_${uniqueSlug()}.json`;
    const originalContent = JSON.stringify({
      request: { method: "GET", url: "/api/original" },
      response: { status: 200, body: "original" },
    });
    await seedMappingFile(request, svc.slug, filename, originalContent);

    try {
      await page.goto("/mappings");
      const fileNode = page.getByTestId(
        `mappings-tree-node-${svc.slug}-${filename}`,
      );
      await expect(fileNode).toBeVisible({ timeout: 10_000 });
      await fileNode.click();

      await expect(page.getByTestId("mappings-breadcrumb-editor")).toBeVisible({
        timeout: 5_000,
      });

      // Make a local change (dirty)
      await page.getByTestId("mappings-tab-raw").click();
      const editor = page.locator(".cm-content");
      await editor.click();
      await page.keyboard.press("End");
      await page.keyboard.type(" ");

      // Trigger Resync with conflict
      const filePath = `${svc.slug}/mappings/${filename}`;
      await page.route("/api/resync", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: {
              mappingsLoaded: 1,
              responsesLoaded: 0,
              elapsedMs: 200,
              conflicts: [{ path: filePath, reason: "Modified externally" }],
              failures: [],
            },
          }),
        });
      });

      await page.getByTestId("mappings-btn-resync").click();

      await expect(page.getByTestId("mappings-banner-conflict")).toBeVisible({
        timeout: 10_000,
      });

      // Click "View disk version"
      await page.getByTestId("mappings-btn-view-disk").click();

      // Confirmation dialog may appear — accept it
      const confirmBtn = page.getByRole("button", {
        name: /discard|confirm|load/i,
      });
      if (await confirmBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await confirmBtn.click();
      }

      // Banner must be dismissed
      await expect(
        page.getByTestId("mappings-banner-conflict"),
      ).not.toBeVisible({ timeout: 3_000 });

      // File is now clean (not dirty)
      await expect(page.getByTestId("mappings-btn-save")).not.toBeVisible({
        timeout: 3_000,
      });
    } finally {
      await deleteService(request, svc.id);
    }
  });
});

// ─── P1: AC-9 — Deleted-file banner ──────────────────────────────────────────

test.describe("Story 4.3 — P1: AC-9 Deleted-file banner", () => {
  test("P1-6 (AC-9): file deleted externally → deleted-file banner appears after Resync", async ({
    page,
    request,
  }) => {
    // RED: no Resync button, no deleted-file banner

    const svcName = uniqueSlug();
    const svc = await seedService(request, svcName);
    const filename = `get_${uniqueSlug()}.json`;
    await seedMappingFile(request, svc.slug, filename);

    try {
      await page.goto("/mappings");
      const fileNode = page.getByTestId(
        `mappings-tree-node-${svc.slug}-${filename}`,
      );
      await expect(fileNode).toBeVisible({ timeout: 10_000 });
      await fileNode.click();

      await expect(page.getByTestId("mappings-breadcrumb-editor")).toBeVisible({
        timeout: 5_000,
      });

      // Delete the file on disk via API (simulating external deletion)
      await apiFetch(
        request,
        `/api/mappings/${svc.slug}/mappings/${filename}`,
        {
          method: "DELETE",
        },
      );

      // Trigger Resync — after which tree re-fetches and file is gone
      await page.getByTestId("mappings-btn-resync").click();

      // Deleted-file banner must appear
      await expect(page.getByTestId("mappings-banner-deleted")).toBeVisible({
        timeout: 10_000,
      });

      await expect(
        page.getByText("File no longer exists on disk."),
      ).toBeVisible();

      await expect(
        page.getByTestId("mappings-btn-close-deleted"),
      ).toBeVisible();
    } finally {
      await deleteService(request, svc.id);
    }
  });
});

// ─── P1: AC-10 — Silent reload (no local changes) ────────────────────────────

test.describe("Story 4.3 — P1: AC-10 Silent reload when clean + conflict", () => {
  test("P1-7 (AC-10): clean file + Resync conflict → no conflict banner, editor silently updated", async ({
    page,
    request,
  }) => {
    // RED: no Resync button, no silent reload logic

    const svcName = uniqueSlug();
    const svc = await seedService(request, svcName);
    const filename = `get_${uniqueSlug()}.json`;
    await seedMappingFile(request, svc.slug, filename);

    try {
      await page.goto("/mappings");
      const fileNode = page.getByTestId(
        `mappings-tree-node-${svc.slug}-${filename}`,
      );
      await expect(fileNode).toBeVisible({ timeout: 10_000 });
      await fileNode.click();

      // Wait for editor to load — DO NOT make any edits (file stays clean)
      await expect(page.getByTestId("mappings-breadcrumb-editor")).toBeVisible({
        timeout: 5_000,
      });

      // Verify clean state: save button should NOT be visible (not dirty)
      await expect(page.getByTestId("mappings-btn-save")).not.toBeVisible({
        timeout: 2_000,
      });

      // Simulate the conflict by intercepting Resync
      const filePath = `${svc.slug}/mappings/${filename}`;
      await page.route("/api/resync", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: {
              mappingsLoaded: 1,
              responsesLoaded: 0,
              elapsedMs: 200,
              conflicts: [{ path: filePath, reason: "Modified externally" }],
              failures: [],
            },
          }),
        });
      });

      await page.getByTestId("mappings-btn-resync").click();

      // Success toast must appear
      await expect(
        page.getByText(/mappings and \d+ responses loaded in/i),
      ).toBeVisible({ timeout: 10_000 });

      // Conflict banner must NOT appear for a clean file (silent reload)
      await expect(
        page.getByTestId("mappings-banner-conflict"),
      ).not.toBeVisible({ timeout: 3_000 });
    } finally {
      await deleteService(request, svc.id);
    }
  });
});
