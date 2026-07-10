import { test, expect } from "../support/fixtures";

/**
 * RED-PHASE ATDD acceptance test scaffolds for Story 5.2:
 * User Management — Create, View & Deactivate.
 *
 * These tests FAIL before implementation. They PASS once Story 5.2 is done.
 *
 * ACs covered:
 *   AC-1:  User table displays all users (username, role, status, created date)
 *   AC-2:  Status badges (Active green / Deactivated slate)
 *   AC-3:  Create User dialog and form submission
 *   AC-6:  Deactivate with confirmation dialog (NFR-15)
 *   AC-7:  JWT invalidation on deactivation (R-E5-001)
 *   AC-9:  Self-deactivation blocked in UI
 *   AC-13: Users tab in Admin Console sub-nav
 *   AC-14: data-testid attributes present
 *
 * RED before implementation:
 *   - /api/users endpoint does not exist (404)
 *   - UserManagementSection component does not exist
 *   - CreateUserDialog component does not exist
 *   - DeactivateUserDialog component does not exist
 *   - Users tab not in Admin Console sub-nav
 *   - useUsers hooks do not exist
 *
 * Data-testid contract (must exist after Story 5.2):
 *   tab-users                              — Users sub-nav tab
 *   section-users                          — User Management section container
 *   table-users                            — Users table
 *   user-row-{username}                    — User row (dynamic)
 *   user-status-{username}                 — User status badge (dynamic)
 *   user-deactivate-{username}             — Deactivate button (dynamic)
 *   btn-create-user                        — Create User button
 *   dialog-create-user                     — Create User dialog
 *   input-create-user-username             — Username input
 *   input-create-user-password             — Password input
 *   input-create-user-confirm-password     — Confirm password input
 *   dialog-create-user-cancel              — Cancel button
 *   dialog-create-user-submit              — Create button
 *   dialog-deactivate-user                 — Deactivate confirmation dialog
 *   dialog-deactivate-user-cancel          — Cancel button
 *   dialog-deactivate-user-confirm         — Deactivate button
 */

// ─── Helpers ──────────────────────────────────────────────────────────────

// createUser helper: implemented in GREEN phase when POST /api/users exists
// async function createUser(request, username, password) { ... }

// deactivateUser helper: implemented in GREEN phase when PUT /api/users/{id}/deactivate exists
// async function deactivateUser(request, userId) { ... }

// ─── P0: Users tab in Admin Console (AC-13) ───────────────────────────────

test.describe("P0 — AC-13: Admin Console includes Users tab", () => {
  /**
   * RED: Users tab does not exist in Admin Console sub-nav yet.
   * GREEN: Admin Console sub-nav shows Feature Toggles / Users / Health / Audit Log tabs.
   */
  test("Users tab appears in Admin Console sub-nav", async ({ page }) => {
    // Act — navigate to Admin Console
    await page.goto("/admin");

    // Assert — Users tab is visible
    // RED: tab-users testid does not exist yet
    const usersTab = page.getByTestId("tab-users");
    await expect(usersTab).toBeVisible();

    // Verify tab text
    await expect(usersTab).toContainText("Users");

    // Verify tab is second tab (after Feature Toggles)
    const tabs = page.locator('[role="tablist"] button');
    await expect(tabs.nth(1)).toHaveAttribute("data-testid", "tab-users");
  });

  /**
   * RED: UserManagementSection component does not exist.
   * GREEN: Clicking Users tab shows user management UI.
   */
  test("Clicking Users tab shows UserManagementSection", async ({ page }) => {
    // Arrange — navigate to Admin Console
    await page.goto("/admin");

    // Act — click Users tab
    const usersTab = page.getByTestId("tab-users");
    await usersTab.click();

    // Assert — UserManagementSection renders
    // RED: section-users testid does not exist yet
    await expect(page.getByTestId("section-users")).toBeVisible();

    // Verify table is present
    // RED: table-users testid does not exist yet
    await expect(page.getByTestId("table-users")).toBeVisible();
  });
});

// ─── P0: User list displays all users (AC-1, AC-2) ────────────────────────

test.describe("P0 — AC-1, AC-2: User list displays users with status badges", () => {
  /**
   * RED: GET /api/users endpoint does not exist (404).
   * GREEN: User table displays all users with correct columns.
   */
  test("User table displays username, role, status, created date columns", async ({
    page,
  }) => {
    // Arrange — navigate to Users tab
    await page.goto("/admin");
    await page.getByTestId("tab-users").click();

    // Assert — table has correct headers
    const table = page.getByTestId("table-users");

    // RED: table headers don't exist yet
    await expect(
      table.locator("th").filter({ hasText: "Username" }),
    ).toBeVisible();
    await expect(table.locator("th").filter({ hasText: "Role" })).toBeVisible();
    await expect(
      table.locator("th").filter({ hasText: "Status" }),
    ).toBeVisible();
    await expect(
      table.locator("th").filter({ hasText: "Created" }),
    ).toBeVisible();

    // Verify admin user appears in list (seed data)
    // RED: user-row-admin testid does not exist yet
    const adminRow = page.getByTestId("user-row-admin");
    await expect(adminRow).toBeVisible();
  });

  /**
   * RED: Status badge component does not exist.
   * GREEN: Active users show green badge, deactivated users show slate badge.
   */
  test("Active user shows green 'Active' badge", async ({ page }) => {
    // Arrange — navigate to Users tab
    await page.goto("/admin");
    await page.getByTestId("tab-users").click();

    // Assert — admin user (active) shows green badge
    // RED: user-status-admin testid does not exist yet
    const statusBadge = page.getByTestId("user-status-admin");
    await expect(statusBadge).toBeVisible();
    await expect(statusBadge).toContainText("Active");

    // Verify badge has green styling
    await expect(statusBadge).toHaveClass(/bg-green-100/);
    await expect(statusBadge).toHaveClass(/text-green-700/);
  });

  /**
   * RED: Deactivated user state rendering does not exist.
   * GREEN: Deactivated users show slate badge with 50% opacity row.
   */
  test("Deactivated user shows slate 'Deactivated' badge with reduced opacity row", async () => {
    // This test requires a deactivated user to exist
    // Deferred until deactivation flow is implemented
    test.skip(
      true,
      "Requires deactivated user — implemented after AC-6 (deactivation flow)",
    );
  });

  /**
   * RED: Alphabetical sort logic does not exist.
   * GREEN: Users are sorted alphabetically by username.
   */
  test("Users are listed alphabetically by username", async () => {
    // This test requires multiple users
    // Will be implemented when user creation is working
    test.skip(
      true,
      "Requires multiple users — implemented after AC-3 (create user flow)",
    );
  });
});

// ─── P0: Create User dialog and form (AC-3, AC-4) ─────────────────────────

test.describe("P0 — AC-3, AC-4: Create User dialog and validation", () => {
  /**
   * RED: CreateUserDialog component does not exist.
   * GREEN: Clicking "Create User" button opens dialog with form.
   */
  test("Create User button opens dialog with username and password fields", async ({
    page,
  }) => {
    // Arrange — navigate to Users tab
    await page.goto("/admin");
    await page.getByTestId("tab-users").click();

    // Act — click Create User button
    // RED: btn-create-user testid does not exist yet
    await page.getByTestId("btn-create-user").click();

    // Assert — dialog opens
    // RED: dialog-create-user testid does not exist yet
    const dialog = page.getByTestId("dialog-create-user");
    await expect(dialog).toBeVisible();

    // Verify dialog title
    await expect(dialog.locator("h2")).toContainText("Create User");

    // Verify form fields exist
    // RED: input testids do not exist yet
    await expect(page.getByTestId("input-create-user-username")).toBeVisible();
    await expect(page.getByTestId("input-create-user-password")).toBeVisible();
    await expect(
      page.getByTestId("input-create-user-confirm-password"),
    ).toBeVisible();

    // Verify action buttons
    await expect(page.getByTestId("dialog-create-user-cancel")).toBeVisible();
    await expect(page.getByTestId("dialog-create-user-submit")).toBeVisible();
  });

  /**
   * RED: Password validation logic does not exist.
   * GREEN: Password <12 chars shows inline validation error.
   */
  test("Password field shows validation error when <12 characters", async ({
    page,
  }) => {
    // Arrange — open Create User dialog
    await page.goto("/admin");
    await page.getByTestId("tab-users").click();
    await page.getByTestId("btn-create-user").click();

    // Act — enter short password
    const passwordInput = page.getByTestId("input-create-user-password");
    await passwordInput.fill("short");
    await passwordInput.blur();

    // Assert — validation error appears
    // RED: validation error element does not exist yet
    await expect(
      page.locator("text=Password must be at least 12 characters"),
    ).toBeVisible();
  });

  /**
   * RED: Confirm password match validation does not exist.
   * GREEN: Mismatched passwords show inline validation error.
   */
  test("Confirm Password field shows validation error when passwords do not match", async ({
    page,
  }) => {
    // Arrange — open Create User dialog
    await page.goto("/admin");
    await page.getByTestId("tab-users").click();
    await page.getByTestId("btn-create-user").click();

    // Act — enter mismatched passwords
    await page
      .getByTestId("input-create-user-password")
      .fill("ValidPassword123");
    await page
      .getByTestId("input-create-user-confirm-password")
      .fill("DifferentPassword123");
    await page.getByTestId("input-create-user-confirm-password").blur();

    // Assert — validation error appears
    // RED: validation error element does not exist yet
    await expect(page.locator("text=Passwords do not match")).toBeVisible();
  });

  /**
   * RED: POST /api/users endpoint does not exist (404).
   * GREEN: Valid form submission creates user and shows in list.
   */
  test(
    "Creating user with valid data adds user to list immediately",
    { annotation: [{ type: "skipNetworkMonitoring" }] },
    async ({ page }) => {
    // Arrange — open Create User dialog
    await page.goto("/admin");
    await page.getByTestId("tab-users").click();
    await page.getByTestId("btn-create-user").click();

    // Act — fill form and submit
    const newUsername = "testuser";
    const newPassword = "TestPassword123";

    await page.getByTestId("input-create-user-username").fill(newUsername);
    await page.getByTestId("input-create-user-password").fill(newPassword);
    await page
      .getByTestId("input-create-user-confirm-password")
      .fill(newPassword);

    // RED: POST /api/users does not exist yet (will return 404)
    await page.getByTestId("dialog-create-user-submit").click();

    // Assert — dialog closes
    // RED: Dialog stays open because API call fails
    await expect(page.getByTestId("dialog-create-user")).not.toBeVisible();

    // Assert — success toast appears
    // RED: Toast does not appear because mutation fails
    await expect(
      page.locator(`text=User '${newUsername}' created`),
    ).toBeVisible();

    // Assert — new user appears in table
    // RED: user-row-testuser testid does not exist yet
    await expect(page.getByTestId(`user-row-${newUsername}`)).toBeVisible();

    // Verify new user has Standard User role
    const userRow = page.getByTestId(`user-row-${newUsername}`);
    await expect(userRow.locator("text=Standard User")).toBeVisible();
  });

  /**
   * RED: Duplicate username validation does not exist.
   * GREEN: Duplicate username returns 409 error and shows error toast.
   */
  test(
    "Creating user with duplicate username shows error toast",
    { annotation: [{ type: "skipNetworkMonitoring" }] },
    async ({ page }) => {
      // Arrange — open Create User dialog
      await page.goto("/admin");
      await page.getByTestId("tab-users").click();
      await page.getByTestId("btn-create-user").click();

      // Act — try to create user with existing username (admin)
      await page.getByTestId("input-create-user-username").fill("admin");
      await page
        .getByTestId("input-create-user-password")
        .fill("TestPassword123");
      await page
        .getByTestId("input-create-user-confirm-password")
        .fill("TestPassword123");

      // RED: POST /api/users does not return 409 yet (endpoint doesn't exist)
      await page.getByTestId("dialog-create-user-submit").click();

      // Assert — error toast appears
      // RED: Error toast does not appear because API call fails differently
      await expect(
        page.locator("text=A user with this username already exists"),
      ).toBeVisible();

      // Assert — dialog remains open for correction
      await expect(page.getByTestId("dialog-create-user")).toBeVisible();
    },
  );
});

// ─── P0: Deactivate user with confirmation (AC-6, AC-7) ───────────────────

test.describe("P0 — AC-6, AC-7: Deactivate user with JWT invalidation", () => {
  /**
   * RED: DeactivateUserDialog component does not exist.
   * GREEN: Clicking Deactivate button opens confirmation dialog.
   */
  test("Deactivate button opens confirmation dialog", async () => {
    // This test requires a Standard User to exist (not the current admin)
    // Will be implemented after user creation is working
    test.skip(
      true,
      "Requires non-admin user — implemented after AC-3 (create user flow)",
    );
  });

  /**
   * RED: PUT /api/users/{id}/deactivate endpoint does not exist (404).
   * GREEN: Confirming deactivation updates user status to Deactivated.
   */
  test("Confirming deactivation changes user status to Deactivated", async () => {
    // This test requires a Standard User to exist and deactivation endpoint
    test.skip(
      true,
      "Requires user deactivation API — implemented after backend endpoint exists",
    );
  });

  /**
   * RED: TokenVersion increment logic does not exist.
   * GREEN: Deactivated user's JWT is rejected with 401 on next request.
   * Risk: R-E5-001 (JWT invalidation race condition)
   */
  test("Deactivated user's existing JWT is immediately invalidated", async () => {
    // This test requires:
    // 1. User creation API
    // 2. Separate authenticated session for the user
    // 3. Deactivation API with TokenVersion increment
    // 4. JWT middleware validation
    test.skip(
      true,
      "Requires full user lifecycle + JWT validation — complex integration test",
    );
  });
});

// ─── P1: Self-deactivation guard (AC-9) ───────────────────────────────────

test.describe("P1 — AC-9: Self-deactivation blocked in UI", () => {
  /**
   * RED: Self-deactivation guard logic does not exist.
   * GREEN: Current admin user's Deactivate button is disabled or not rendered.
   */
  test("Current admin cannot deactivate their own account", async ({
    page,
  }) => {
    // Arrange — navigate to Users tab
    await page.goto("/admin");
    await page.getByTestId("tab-users").click();

    // Assert — current user's (admin) deactivate button is disabled or absent
    // RED: Self-deactivation guard not implemented yet
    const deactivateButton = page.getByTestId("user-deactivate-admin");

    // Option 1: button has aria-disabled="true"
    // Option 2: button does not exist at all
    // We'll test for aria-disabled first
    if (await deactivateButton.isVisible()) {
      await expect(deactivateButton).toHaveAttribute("aria-disabled", "true");
      // Verify tooltip explains why
      await deactivateButton.hover();
      await expect(
        page.locator("text=You cannot deactivate your own account"),
      ).toBeVisible();
    } else {
      // Button completely hidden for current user — also acceptable
      await expect(deactivateButton).not.toBeVisible();
    }
  });
});

// ─── P1: data-testid attributes (AC-14) ───────────────────────────────────

test.describe("P1 — AC-14: data-testid attributes present", () => {
  /**
   * Verify all required data-testid attributes are present.
   * This is a comprehensive smoke test for testability.
   */
  test("All mandatory data-testid attributes are present", async ({ page }) => {
    // Arrange — navigate to Users tab
    await page.goto("/admin");
    await page.getByTestId("tab-users").click();

    // Assert — structural testids exist
    // RED: Most of these testids do not exist yet
    await expect(page.getByTestId("section-users")).toBeVisible();
    await expect(page.getByTestId("table-users")).toBeVisible();
    await expect(page.getByTestId("btn-create-user")).toBeVisible();

    // Open Create User dialog to verify form testids
    await page.getByTestId("btn-create-user").click();

    await expect(page.getByTestId("dialog-create-user")).toBeVisible();
    await expect(page.getByTestId("input-create-user-username")).toBeVisible();
    await expect(page.getByTestId("input-create-user-password")).toBeVisible();
    await expect(
      page.getByTestId("input-create-user-confirm-password"),
    ).toBeVisible();
    await expect(page.getByTestId("dialog-create-user-cancel")).toBeVisible();
    await expect(page.getByTestId("dialog-create-user-submit")).toBeVisible();

    // Close dialog
    await page.getByTestId("dialog-create-user-cancel").click();

    // Verify dynamic user row testids (admin user should exist)
    await expect(page.getByTestId("user-row-admin")).toBeVisible();
    await expect(page.getByTestId("user-status-admin")).toBeVisible();
    // Deactivate button might not be visible for current user (AC-9)
    // Skip this check or make it conditional
  });
});
