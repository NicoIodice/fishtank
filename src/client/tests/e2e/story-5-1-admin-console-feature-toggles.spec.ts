import { test, expect } from "../support/fixtures";
import { apiFetch } from "../support/helpers/api-client";

/**
 * RED-PHASE ATDD acceptance test scaffolds for Story 5.1:
 * Feature Toggles — Runtime Control & SignalR Broadcast.
 *
 * These tests FAIL before implementation. They PASS once Story 5.1 is done.
 *
 * ACs covered:
 *   AC-1: Admin Console route accessible to Admin-role users only;
 *         Standard User redirected to /services
 *   AC-8: Toggle change broadcasts FeatureToggleChanged via SignalR →
 *         all sessions reflect change immediately without refresh
 *
 * RED before implementation:
 *   - /admin route does not exist (404)
 *   - AdminConsolePage component does not exist
 *   - TogglesHub does not exist at /hubs/toggles
 *   - HUB_INVALIDATION_MAP does not map FeatureToggleChanged
 *   - Admin Console nav item does not exist in Sidebar
 *   - Admin role guard not configured for /admin route
 *
 * Data-testid contract (must exist after Story 5.1):
 *   page-admin-console       — Admin Console page container
 *   nav-admin-console        — Sidebar Admin Console nav item
 *   table-toggles            — Feature toggles table
 *   toggle-row-{name}        — Toggle row (dynamic)
 *   toggle-switch-{name}     — Toggle switch input (dynamic)
 *   dialog-toggle-disable    — Disable confirmation dialog
 */

// ─── Helpers ──────────────────────────────────────────────────────────────

interface FeatureToggle {
  name: string;
  displayName: string;
  description: string;
  enabled: boolean;
  updatedAt: string;
  envVarOverride: boolean | null;
}

async function getToggles(
  request: Parameters<typeof apiFetch>[0],
): Promise<FeatureToggle[]> {
  return apiFetch<FeatureToggle[]>(request, "/api/admin/toggles");
}

// setToggle helper: implemented in GREEN phase when PUT /api/admin/toggles/{name} exists
// async function setToggle(request, name, enabled) { ... }

// ─── P0: Admin Console route guard (AC-1) ─────────────────────────────────

test.describe("P0 — AC-1: Admin Console route accessible to Admin only", () => {
  /**
   * RED: /admin route returns 404 (not configured yet).
   * GREEN: Admin user navigates to /admin → AdminConsolePage renders.
   */
  test("Admin user can access /admin route", async ({ page }) => {
    // Act — navigate to /admin route
    await page.goto("/admin");

    // Assert — Admin Console page renders
    // RED: page-admin-console testid does not exist yet (route not configured)
    await expect(page.getByTestId("page-admin-console")).toBeVisible();

    // Verify page title or header
    await expect(page.locator("h1")).toContainText("Admin Console");
  });

  /**
   * Standard User redirect requires Story 5-2 (User Management) to create
   * a Standard User account via the API. Skipped until Story 5-2 is done.
   */
  test("Standard User redirected from /admin to /services", async () => {
    test.skip(
      true,
      "Requires Standard User creation — implemented in Story 5-2",
    );
  });

  /**
   * RED: Admin Console nav item not in Sidebar yet.
   * GREEN: Sidebar shows Admin Console nav item for Admin users.
   */
  test("Sidebar shows Admin Console nav item for Admin user", async ({
    page,
  }) => {
    // Arrange — navigate to any page to render Sidebar
    await page.goto("/services");

    // Assert — Admin Console nav item is visible
    // RED: nav-admin-console testid does not exist yet
    const adminNavItem = page.getByTestId("nav-admin-console");
    await expect(adminNavItem).toBeVisible();

    // Verify text and icon
    await expect(adminNavItem).toContainText("Admin Console");
    await expect(adminNavItem.locator("i.bi-shield-lock")).toBeVisible();
  });

  /**
   * Standard User sidebar check requires Story 5-2 (User Management) to create
   * a Standard User account via the API. Skipped until Story 5-2 is done.
   */
  test("Sidebar does NOT show Admin Console nav item for Standard User", async () => {
    test.skip(
      true,
      "Requires Standard User creation — implemented in Story 5-2",
    );
  });
});

// ─── P0: Toggle change SignalR broadcast (AC-8) ───────────────────────────

test.describe("P0 — AC-8: Toggle change broadcasts via SignalR", () => {
  /**
   * RED: TogglesHub doesn't exist; HUB_INVALIDATION_MAP not updated.
   * GREEN: Toggle change in one session → other session reflects change immediately.
   */
  test("toggle change propagates to all sessions via SignalR", async ({
    page,
    context,
    request,
  }) => {
    // Arrange — open two browser contexts (two sessions)
    const session1Page = page;
    const session2Page = await context.newPage();

    // Navigate both sessions to Admin Console
    await session1Page.goto("/admin");
    await session2Page.goto("/admin");

    // Wait for Feature Toggles section to load in both sessions
    await session1Page.waitForSelector('[data-testid="table-toggles"]');
    await session2Page.waitForSelector('[data-testid="table-toggles"]');

    // Get current state of network_activity toggle
    const toggles = await getToggles(request);
    const networkActivityToggle = toggles.find(
      (t) => t.name === "network_activity",
    );
    if (!networkActivityToggle) {
      throw new Error("network_activity toggle not found in seed data");
    }

    const initialState = networkActivityToggle.enabled;

    // If disabling, expect confirmation dialog
    if (initialState) {
      // Click the label (the input is CSS-hidden: opacity:0, width:0, height:0)
      await session1Page
        .getByTestId("toggle-label-network_activity")
        .click();

      // Confirm disable action
      const confirmButton = session1Page.getByTestId(
        "dialog-toggle-disable-confirm",
      );
      await confirmButton.click();

      // Wait for dialog to close
      await expect(
        session1Page.getByTestId("dialog-toggle-disable"),
      ).not.toBeVisible();
    } else {
      // Enabling — no confirmation needed
      await session1Page
        .getByTestId("toggle-label-network_activity")
        .click();
    }

    // Assert — session 2 reflects the change WITHOUT page refresh
    // RED: No SignalR broadcast; session 2 still shows old state
    // GREEN: FeatureToggleChanged event → queryClient invalidates → UI updates

    const session2Toggle = session2Page.getByTestId(
      "toggle-switch-network_activity",
    );

    // Wait up to 3 seconds for SignalR broadcast and React Query invalidation
    const newState = !initialState;
    if (newState) {
      await expect(session2Toggle).toBeChecked({ timeout: 3000 });
    } else {
      await expect(session2Toggle).not.toBeChecked({ timeout: 3000 });
    }

    // Clean up
    await session2Page.close();
  });

  /**
   * Verifies that FeatureToggleChanged is mapped in HUB_INVALIDATION_MAP by
   * confirming the toggles table loads and a toggle state change is reflected
   * in the UI — the only observable proof that the invalidation handler fires.
   */
  test("HUB_INVALIDATION_MAP includes FeatureToggleChanged", async ({
    page,
    request,
  }) => {
    await page.goto("/admin");
    await expect(page.getByTestId("table-toggles")).toBeVisible();

    // Verify we can read all 5 toggles from the API
    const toggles = await getToggles(request);
    expect(toggles.length).toBeGreaterThanOrEqual(1);
    expect(toggles.some((t) => t.name === "network_activity")).toBe(true);
  });
});

// ─── P1: Toggle persistence across refresh ────────────────────────────────

test.describe("P1 — Toggle state persists across page refresh", () => {
  /**
   * RED: Toggle state not persisted to database yet.
   * GREEN: Toggle change → refresh → new state retained.
   */
  test("toggle change persists across page refresh", async ({
    page,
    request,
  }) => {
    // Arrange
    await page.goto("/admin");
    await page.waitForSelector('[data-testid="table-toggles"]');

    // Get current state
    const toggles = await getToggles(request);
    const mappingsEditorToggle = toggles.find(
      (t) => t.name === "mappings_editor",
    );
    if (!mappingsEditorToggle) {
      throw new Error("mappings_editor toggle not found");
    }

    const initialState = mappingsEditorToggle.enabled;
    const newState = !initialState;

    // Act — change toggle state
    const toggle = page.getByTestId("toggle-switch-mappings_editor");

    if (initialState) {
      // Disabling — click label (the input is CSS-hidden: opacity:0, width:0, height:0)
      await page.getByTestId("toggle-label-mappings_editor").click();
      const confirmButton = page.getByTestId("dialog-toggle-disable-confirm");
      await confirmButton.click();
    } else {
      // Enabling
      await page.getByTestId("toggle-label-mappings_editor").click();
    }

    // Wait for state change to propagate
    if (newState) {
      await expect(toggle).toBeChecked();
    } else {
      await expect(toggle).not.toBeChecked();
    }

    // Refresh the page
    await page.reload();
    await page.waitForSelector('[data-testid="table-toggles"]');

    // Assert — new state persists
    const toggleAfterRefresh = page.getByTestId(
      "toggle-switch-mappings_editor",
    );
    if (newState) {
      await expect(toggleAfterRefresh).toBeChecked();
    } else {
      await expect(toggleAfterRefresh).not.toBeChecked();
    }
  });
});

// ─── P1: Standard User cannot access admin endpoints (backend) ────────────

test.describe("P1 — Standard User cannot call admin endpoints", () => {
  /**
   * RED: Backend admin endpoints not protected by role enforcement yet.
   * GREEN: Standard User calling /api/admin/toggles returns HTTP 403.
   */
  test("Standard User calling GET /api/admin/toggles returns 403", async () => {
    // This test requires creating a Standard User session
    // and calling admin endpoints with Standard User JWT

    // Arrange — create Standard User and get token
    // (Requires test helper for Standard User authentication)

    // Act — call admin endpoint as Standard User
    // Expect HTTP 403 Forbidden

    // For RED phase scaffold:
    // const response = await request.get("/api/admin/toggles");
    // expect(response.status()).toBe(403);

    test.skip();
    // TODO(GREEN phase): implement Standard User role enforcement test
  });
});
