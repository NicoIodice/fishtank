/**
 * ATDD E2E acceptance tests — Story 4.6: Navigation Guard & Sign-Out Protection
 * Layer: Playwright E2E (live stack — no backend mocking)
 *
 * RED PHASE — these tests are RED-by-construction:
 *   - useUnsavedChanges hook does not exist yet
 *   - SignOutConfirmDialog component does not exist yet
 *   - MappingsPage does not have useBlocker wired yet
 *   - UserMenu/TopBar does not have sign-out guard wired yet
 *   - ServiceModal does not expose state to global context yet
 *   - SettingsPage does not expose Mocks Root state yet
 *
 * ACs covered:
 *   AC-1  — P0: Navigation guard triggers on unsaved Mapping edits
 *   AC-2  — P0: "Discard and navigate" proceeds
 *   AC-3  — P0: "Stay" cancels navigation
 *   AC-4  — P0: Sign-out with unsaved Mapping edits shows confirmation
 *   AC-5  — P1: Sign-out with pending Mocks Root path shows confirmation
 *   AC-6  — P1: Sign-out with both Mapping + Mocks Root
 *   AC-7  — P1: Sign-out with in-progress Service modal
 *   AC-8  — P1: Sign-out with all three unsaved states
 *   AC-9  — P0: Sign-out with no unsaved state proceeds immediately
 *   AC-10 — P0: Sign-out confirmation "Cancel" keeps user signed in
 *   AC-11 — P0: Sign-out confirmation "Sign out" proceeds
 *   AC-12 — P0: Navigation guard covers ALL 5 trigger types
 *   AC-13 — P1: data-testid attributes
 *
 * E2E Policy (from project-context.md):
 *   - Runs against the LIVE stack (Vite on :5173 + API on :5000)
 *   - Authentication via storageState (fishtankAuthProvider)
 *   - No page.route() mocking for happy-path flows
 *
 * data-testid contract (from story AC-13):
 *   dialog-navigation-guard
 *   dialog-navigation-guard-confirm ("Discard and navigate")
 *   dialog-navigation-guard-cancel ("Stay")
 *   dialog-signout-confirm
 *   dialog-signout-cancel ("Cancel")
 *   dialog-signout-confirm-btn ("Sign out")
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

/** Create a service via the API — needed to have a service folder with Mapping files. */
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

/** Create a Mapping file via the API for testing navigation guard. */
async function createMappingFile(
  request: Request,
  serviceName: string,
  filename: string = "test-mapping.json",
): Promise<void> {
  const mappingContent = {
    request: {
      method: "GET",
      urlPath: "/api/test",
    },
    response: {
      status: 200,
      body: { message: "test response" },
    },
  };

  await apiFetch(request, `/api/mappings/${serviceName}/mappings/${filename}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    data: JSON.stringify(mappingContent),
  });
}

// ─── AC-1, AC-2, AC-3: Navigation guard on unsaved Mapping edits ───────────

test.describe("Navigation Guard — Unsaved Mapping Edits", () => {
  test("AC-1: Navigation guard triggers when navigating away with unsaved edits", async ({
    page,
    request,
  }) => {
    // RED PHASE: useBlocker not wired in MappingsPage yet
    // EXPECTED: Confirmation dialog appears on navigation attempt
    // ACTUAL: Navigation proceeds without guard — this test will FAIL (RED)

    const serviceName = uniqueSlug();
    await seedService(request, serviceName);
    await createMappingFile(request, serviceName, "nav-guard-test.json");

    // Navigate to Mappings page
    await page.goto("/mappings");
    await page.waitForLoadState("networkidle");

    // Open file in editor
    await page.click(
      `[data-testid="mappings-tree-node-${serviceName}-nav-guard-test.json"]`,
    );

    // Make unsaved edit in Raw JSON tab
    const editor = page.locator('[data-testid="mappings-tab-raw"]');
    await editor.click();
    await page.keyboard.type(" "); // Add a space to trigger unsaved state

    // Attempt to navigate away via sidebar (Services link)
    await page.click('[data-testid="nav-services"]');

    // Assert navigation guard dialog appears
    const guardDialog = page.locator('[data-testid="dialog-navigation-guard"]');
    await expect(guardDialog).toBeVisible();
    await expect(guardDialog).toContainText("Discard and navigate");
    await expect(guardDialog).toContainText("Stay");
  });

  test("AC-2: 'Discard and navigate' proceeds with navigation", async ({
    page,
    request,
  }) => {
    // RED PHASE: useBlocker not wired yet
    // EXPECTED: Unsaved changes discarded, navigation completes
    // ACTUAL: Navigation guard does not exist — this test will FAIL (RED)

    const serviceName = uniqueSlug();
    await seedService(request, serviceName);
    await createMappingFile(request, serviceName, "discard-test.json");

    await page.goto("/mappings");
    await page.waitForLoadState("networkidle");
    await page.click(
      `[data-testid="mappings-tree-node-${serviceName}-discard-test.json"]`,
    );

    // Make unsaved edit
    const editor = page.locator('[data-testid="mappings-tab-raw"]');
    await editor.click();
    await page.keyboard.type(" ");

    // Trigger navigation
    await page.click('[data-testid="nav-services"]');

    // Click "Discard and navigate"
    await page.click('[data-testid="dialog-navigation-guard-confirm"]');

    // Assert navigation completed to Services page
    await expect(page).toHaveURL(/\/services/);
    await expect(page.locator('[data-testid="page-services"]')).toBeVisible();
  });

  test("AC-3: 'Stay' cancels navigation and preserves unsaved changes", async ({
    page,
    request,
  }) => {
    // RED PHASE: useBlocker not wired yet
    // EXPECTED: Dialog closes, remains on Mappings page, edits preserved
    // ACTUAL: Navigation guard does not exist — this test will FAIL (RED)

    const serviceName = uniqueSlug();
    await seedService(request, serviceName);
    await createMappingFile(request, serviceName, "stay-test.json");

    await page.goto("/mappings");
    await page.waitForLoadState("networkidle");
    await page.click(
      `[data-testid="mappings-tree-node-${serviceName}-stay-test.json"]`,
    );

    // Make unsaved edit
    const editor = page.locator('[data-testid="mappings-tab-raw"]');
    await editor.click();
    const testText = "TEST_EDIT_MARKER";
    await page.keyboard.type(testText);

    // Trigger navigation
    await page.click('[data-testid="nav-services"]');

    // Click "Stay"
    await page.click('[data-testid="dialog-navigation-guard-cancel"]');

    // Assert dialog closed, still on Mappings page
    await expect(
      page.locator('[data-testid="dialog-navigation-guard"]'),
    ).not.toBeVisible();
    await expect(page).toHaveURL(/\/mappings/);

    // Assert unsaved changes preserved in editor
    await expect(editor).toContainText(testText);
  });
});

// ─── AC-12: All 5 navigation trigger types ─────────────────────────────────

test.describe("Navigation Guard — All Trigger Types (R-E4-002)", () => {
  test("AC-12a: Trigger type 1 — Sidebar nav click", async ({
    page,
    request,
  }) => {
    // RED PHASE: useBlocker not wired yet
    // EXPECTED: Guard triggers on sidebar link click
    // ACTUAL: This test will FAIL (RED)

    const serviceName = uniqueSlug();
    await seedService(request, serviceName);
    await createMappingFile(request, serviceName, "sidebar-nav.json");

    await page.goto("/mappings");
    await page.waitForLoadState("networkidle");
    await page.click(
      `[data-testid="mappings-tree-node-${serviceName}-sidebar-nav.json"]`,
    );
    await page.locator('[data-testid="mappings-tab-raw"]').click();
    await page.keyboard.type(" ");

    await page.click('[data-testid="nav-activity"]');

    await expect(
      page.locator('[data-testid="dialog-navigation-guard"]'),
    ).toBeVisible();
  });

  test("AC-12b: Trigger type 2 — Logo click (home navigation)", async ({
    page,
    request,
  }) => {
    // RED PHASE: useBlocker not wired yet
    // EXPECTED: Guard triggers on logo/brand click
    // ACTUAL: This test will FAIL (RED)

    const serviceName = uniqueSlug();
    await seedService(request, serviceName);
    await createMappingFile(request, serviceName, "logo-nav.json");

    await page.goto("/mappings");
    await page.waitForLoadState("networkidle");
    await page.click(
      `[data-testid="mappings-tree-node-${serviceName}-logo-nav.json"]`,
    );
    await page.locator('[data-testid="mappings-tab-raw"]').click();
    await page.keyboard.type(" ");

    // Click logo/brand to navigate to home
    await page.click('[data-testid="brand-logo"]');

    await expect(
      page.locator('[data-testid="dialog-navigation-guard"]'),
    ).toBeVisible();
  });

  test("AC-12c: Trigger type 3 — Browser back button", async ({
    page,
    request,
  }) => {
    // RED PHASE: useBlocker not wired yet
    // EXPECTED: Guard triggers on browser back
    // ACTUAL: This test will FAIL (RED)

    const serviceName = uniqueSlug();
    await seedService(request, serviceName);
    await createMappingFile(request, serviceName, "back-nav.json");

    // Navigate: Services → Mappings → edit file
    await page.goto("/services");
    await page.goto("/mappings");
    await page.waitForLoadState("networkidle");
    await page.click(
      `[data-testid="mappings-tree-node-${serviceName}-back-nav.json"]`,
    );
    await page.locator('[data-testid="mappings-tab-raw"]').click();
    await page.keyboard.type(" ");

    // Browser back button
    await page.goBack();

    await expect(
      page.locator('[data-testid="dialog-navigation-guard"]'),
    ).toBeVisible();
  });

  test("AC-12d: Trigger type 4 — Browser forward button", async ({
    page,
    request,
  }) => {
    // RED PHASE: useBlocker not wired yet
    // EXPECTED: Guard triggers on browser forward after back
    // ACTUAL: This test will FAIL (RED)

    const serviceName = uniqueSlug();
    await seedService(request, serviceName);
    await createMappingFile(request, serviceName, "forward-nav.json");

    await page.goto("/services");
    await page.goto("/mappings");
    await page.waitForLoadState("networkidle");
    await page.click(
      `[data-testid="mappings-tree-node-${serviceName}-forward-nav.json"]`,
    );
    await page.locator('[data-testid="mappings-tab-raw"]').click();
    await page.keyboard.type(" ");

    // Go back, then forward
    await page.goBack();
    await page.click('[data-testid="dialog-navigation-guard-cancel"]'); // Cancel first guard
    await page.goForward();

    await expect(
      page.locator('[data-testid="dialog-navigation-guard"]'),
    ).toBeVisible();
  });

  test("AC-12e: Trigger type 5 — Direct URL entry / page refresh (beforeunload)", async ({
    page,
    request,
  }) => {
    // RED PHASE: beforeunload handler not wired yet
    // EXPECTED: Browser's native "Leave site?" dialog appears
    // ACTUAL: This test will FAIL (RED)
    // NOTE: Playwright cannot dismiss the native browser dialog — we can only detect the event

    const serviceName = uniqueSlug();
    await seedService(request, serviceName);
    await createMappingFile(request, serviceName, "refresh-nav.json");

    await page.goto("/mappings");
    await page.waitForLoadState("networkidle");
    await page.click(
      `[data-testid="mappings-tree-node-${serviceName}-refresh-nav.json"]`,
    );
    await page.locator('[data-testid="mappings-tab-raw"]').click();
    await page.keyboard.type(" ");

    // Listen for beforeunload dialog attempt
    let beforeUnloadTriggered = false;
    page.on("dialog", (dialog) => {
      if (dialog.type() === "beforeunload") {
        beforeUnloadTriggered = true;
        dialog.accept(); // Must accept to continue test
      }
    });

    // Trigger page refresh
    await page.reload();

    // Assert beforeunload handler was registered and triggered
    expect(beforeUnloadTriggered).toBe(true);
  });
});

// ─── AC-4: Sign-out with unsaved Mapping edits ─────────────────────────────

test.describe("Sign-Out Guard — Unsaved Mapping Edits", () => {
  test("AC-4: Sign-out with unsaved Mapping edits shows confirmation dialog", async ({
    page,
    request,
  }) => {
    // RED PHASE: Sign-out guard not wired in UserMenu yet
    // EXPECTED: SignOutConfirmDialog appears with Mapping-specific message
    // ACTUAL: Sign-out proceeds immediately — this test will FAIL (RED)

    const serviceName = uniqueSlug();
    await seedService(request, serviceName);
    await createMappingFile(request, serviceName, "signout-mappings.json");

    await page.goto("/mappings");
    await page.waitForLoadState("networkidle");
    await page.click(
      `[data-testid="mappings-tree-node-${serviceName}-signout-mappings.json"]`,
    );
    await page.locator('[data-testid="mappings-tab-raw"]').click();
    await page.keyboard.type(" ");

    // Attempt sign-out
    await page.click('[data-testid="user-menu-trigger"]');
    await page.click('[data-testid="user-menu-signout"]');

    // Assert sign-out confirmation dialog appears
    const dialog = page.locator('[data-testid="dialog-signout-confirm"]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Sign out?");
    await expect(dialog).toContainText(
      "You have unsaved changes in the Mappings editor",
    );
  });
});

// ─── AC-5: Sign-out with pending Mocks Root path ───────────────────────────

test.describe("Sign-Out Guard — Pending Mocks Root Path", () => {
  test("AC-5: Sign-out with unsaved Mocks Root path shows confirmation", async ({
    page,
  }) => {
    // RED PHASE: Settings page does not expose Mocks Root edit state to global context yet
    // EXPECTED: SignOutConfirmDialog appears with Mocks Root message
    // ACTUAL: Sign-out proceeds immediately — this test will FAIL (RED)

    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    // Assume Settings page has an Edit button for Mocks Root (deferred to Epic 5)
    // For this test: simulate pending Mocks Root state by triggering edit mode
    // (Implementation detail: This may not exist yet — test will fail)
    await page.click('[data-testid="settings-btn-edit-mocks-root"]');
    await page.fill('[data-testid="settings-input-mocks-root"]', "/new/path");

    // Attempt sign-out without saving
    await page.click('[data-testid="user-menu-trigger"]');
    await page.click('[data-testid="user-menu-signout"]');

    const dialog = page.locator('[data-testid="dialog-signout-confirm"]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("You have an unsaved Mocks Root path");
  });
});

// ─── AC-6: Sign-out with both Mapping + Mocks Root ─────────────────────────

test.describe("Sign-Out Guard — Multiple Unsaved Sources", () => {
  test("AC-6: Sign-out with both Mapping edits AND Mocks Root path", async ({
    page,
    request,
  }) => {
    // RED PHASE: Global context and sign-out guard not wired yet
    // EXPECTED: Combined message in dialog body
    // ACTUAL: This test will FAIL (RED)

    const serviceName = uniqueSlug();
    await seedService(request, serviceName);
    await createMappingFile(request, serviceName, "combined-state.json");

    await page.goto("/mappings");
    await page.waitForLoadState("networkidle");
    await page.click(
      `[data-testid="mappings-tree-node-${serviceName}-combined-state.json"]`,
    );
    await page.locator('[data-testid="mappings-tab-raw"]').click();
    await page.keyboard.type(" ");

    // Also make Mocks Root pending
    await page.goto("/settings");
    await page.click('[data-testid="settings-btn-edit-mocks-root"]');
    await page.fill(
      '[data-testid="settings-input-mocks-root"]',
      "/another/path",
    );

    // Attempt sign-out
    await page.click('[data-testid="user-menu-trigger"]');
    await page.click('[data-testid="user-menu-signout"]');

    const dialog = page.locator('[data-testid="dialog-signout-confirm"]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(
      "unsaved changes in the Mappings editor",
    );
    await expect(dialog).toContainText("an unsaved Mocks Root path");
  });

  test("AC-7: Sign-out with in-progress Service modal form data", async ({
    page,
  }) => {
    // RED PHASE: ServiceModal does not expose state to global context yet
    // EXPECTED: Dialog mentions "unsaved form data"
    // ACTUAL: This test will FAIL (RED)

    await page.goto("/services");
    await page.waitForLoadState("networkidle");

    // Open Add Service modal
    await page.click('[data-testid="service-btn-add"]');

    // Fill in form (creating unsaved state)
    await page.fill('[data-testid="service-modal-name"]', "Test Service");
    await page.fill('[data-testid="service-modal-url"]', "https://example.com");

    // Attempt sign-out without saving
    await page.click('[data-testid="user-menu-trigger"]');
    await page.click('[data-testid="user-menu-signout"]');

    const dialog = page.locator('[data-testid="dialog-signout-confirm"]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("unsaved form data");
  });

  test("AC-8: Sign-out with all three unsaved states (Mapping + Mocks Root + Service modal)", async ({
    page,
    request,
  }) => {
    // RED PHASE: All three sources not integrated yet
    // EXPECTED: Dialog combines all three in order
    // ACTUAL: This test will FAIL (RED)

    const serviceName = uniqueSlug();
    await seedService(request, serviceName);
    await createMappingFile(request, serviceName, "all-three.json");

    // Create unsaved Mapping edit
    await page.goto("/mappings");
    await page.waitForLoadState("networkidle");
    await page.click(
      `[data-testid="mappings-tree-node-${serviceName}-all-three.json"]`,
    );
    await page.locator('[data-testid="mappings-tab-raw"]').click();
    await page.keyboard.type(" ");

    // Create pending Mocks Root
    await page.goto("/settings");
    await page.click('[data-testid="settings-btn-edit-mocks-root"]');
    await page.fill('[data-testid="settings-input-mocks-root"]', "/path/three");

    // Create in-progress Service modal
    await page.goto("/services");
    await page.click('[data-testid="service-btn-add"]');
    await page.fill('[data-testid="service-modal-name"]', "All Three Test");

    // Attempt sign-out
    await page.click('[data-testid="user-menu-trigger"]');
    await page.click('[data-testid="user-menu-signout"]');

    const dialog = page.locator('[data-testid="dialog-signout-confirm"]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(
      "unsaved changes in the Mappings editor",
    );
    await expect(dialog).toContainText("an unsaved Mocks Root path");
    await expect(dialog).toContainText("unsaved form data");
  });
});

// ─── AC-9: Sign-out with no unsaved state proceeds immediately ─────────────

test.describe("Sign-Out — No Unsaved State (Happy Path)", () => {
  test("AC-9: Sign-out proceeds immediately when no unsaved state exists", async ({
    page,
  }) => {
    // RED PHASE: Sign-out guard not yet implemented
    // EXPECTED: No dialog shown, redirect to /login
    // ACTUAL: This is the ONLY test that PASSES before implementation (no guard = immediate sign-out)
    // However, once sign-out guard is added, this test ensures the guard has correct conditional logic

    await page.goto("/services");
    await page.waitForLoadState("networkidle");

    // Trigger sign-out with clean state
    await page.click('[data-testid="user-menu-trigger"]');
    await page.click('[data-testid="user-menu-signout"]');

    // Assert NO dialog appears
    await expect(
      page.locator('[data-testid="dialog-signout-confirm"]'),
    ).not.toBeVisible();

    // Assert redirect to login page
    await expect(page).toHaveURL(/\/login/);
  });
});

// ─── AC-10, AC-11: Sign-out dialog actions ─────────────────────────────────

test.describe("Sign-Out Dialog Actions", () => {
  test("AC-10: 'Cancel' keeps user signed in", async ({ page, request }) => {
    // RED PHASE: Dialog not implemented yet
    // EXPECTED: Dialog closes, user stays on current page, state preserved
    // ACTUAL: This test will FAIL (RED)

    const serviceName = uniqueSlug();
    await seedService(request, serviceName);
    await createMappingFile(request, serviceName, "cancel-signout.json");

    await page.goto("/mappings");
    await page.waitForLoadState("networkidle");
    await page.click(
      `[data-testid="mappings-tree-node-${serviceName}-cancel-signout.json"]`,
    );
    await page.locator('[data-testid="mappings-tab-raw"]').click();
    await page.keyboard.type("MARKER");

    await page.click('[data-testid="user-menu-trigger"]');
    await page.click('[data-testid="user-menu-signout"]');

    // Click Cancel
    await page.click('[data-testid="dialog-signout-cancel"]');

    // Assert dialog closed, still on Mappings page
    await expect(
      page.locator('[data-testid="dialog-signout-confirm"]'),
    ).not.toBeVisible();
    await expect(page).toHaveURL(/\/mappings/);

    // Assert unsaved state preserved
    await expect(
      page.locator('[data-testid="mappings-tab-raw"]'),
    ).toContainText("MARKER");
  });

  test("AC-11: 'Sign out' button proceeds with logout", async ({
    page,
    request,
  }) => {
    // RED PHASE: Dialog not implemented yet
    // EXPECTED: Logout API called, redirect to /login
    // ACTUAL: This test will FAIL (RED)

    const serviceName = uniqueSlug();
    await seedService(request, serviceName);
    await createMappingFile(request, serviceName, "confirm-signout.json");

    await page.goto("/mappings");
    await page.waitForLoadState("networkidle");
    await page.click(
      `[data-testid="mappings-tree-node-${serviceName}-confirm-signout.json"]`,
    );
    await page.locator('[data-testid="mappings-tab-raw"]').click();
    await page.keyboard.type(" ");

    await page.click('[data-testid="user-menu-trigger"]');
    await page.click('[data-testid="user-menu-signout"]');

    // Click "Sign out"
    await page.click('[data-testid="dialog-signout-confirm-btn"]');

    // Assert redirect to login page
    await expect(page).toHaveURL(/\/login/);
  });

  test("AC-10: Escape key dismisses sign-out dialog", async ({
    page,
    request,
  }) => {
    // RED PHASE: Dialog keyboard handling not implemented yet
    // EXPECTED: Dialog closes on Escape, user stays signed in
    // ACTUAL: This test will FAIL (RED)

    const serviceName = uniqueSlug();
    await seedService(request, serviceName);
    await createMappingFile(request, serviceName, "escape-signout.json");

    await page.goto("/mappings");
    await page.waitForLoadState("networkidle");
    await page.click(
      `[data-testid="mappings-tree-node-${serviceName}-escape-signout.json"]`,
    );
    await page.locator('[data-testid="mappings-tab-raw"]').click();
    await page.keyboard.type(" ");

    await page.click('[data-testid="user-menu-trigger"]');
    await page.click('[data-testid="user-menu-signout"]');

    // Press Escape
    await page.keyboard.press("Escape");

    // Assert dialog closed
    await expect(
      page.locator('[data-testid="dialog-signout-confirm"]'),
    ).not.toBeVisible();
    await expect(page).toHaveURL(/\/mappings/);
  });
});

// ─── AC-13: data-testid coverage verification ──────────────────────────────

test.describe("data-testid Attributes", () => {
  test("AC-13: All required data-testid attributes present", async ({
    page,
    request,
  }) => {
    // RED PHASE: Components not implemented yet
    // EXPECTED: All testid attributes from AC-13 table present
    // ACTUAL: This test will FAIL (RED)

    const serviceName = uniqueSlug();
    await seedService(request, serviceName);
    await createMappingFile(request, serviceName, "testid-check.json");

    await page.goto("/mappings");
    await page.waitForLoadState("networkidle");
    await page.click(
      `[data-testid="mappings-tree-node-${serviceName}-testid-check.json"]`,
    );
    await page.locator('[data-testid="mappings-tab-raw"]').click();
    await page.keyboard.type(" ");

    // Trigger navigation guard
    await page.click('[data-testid="nav-services"]');

    // Verify navigation guard dialog testids
    await expect(
      page.locator('[data-testid="dialog-navigation-guard"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="dialog-navigation-guard-confirm"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="dialog-navigation-guard-cancel"]'),
    ).toBeVisible();

    // Cancel and trigger sign-out guard
    await page.click('[data-testid="dialog-navigation-guard-cancel"]');
    await page.click('[data-testid="user-menu-trigger"]');
    await page.click('[data-testid="user-menu-signout"]');

    // Verify sign-out dialog testids
    await expect(
      page.locator('[data-testid="dialog-signout-confirm"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="dialog-signout-cancel"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="dialog-signout-confirm-btn"]'),
    ).toBeVisible();
  });
});
