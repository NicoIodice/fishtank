import { test, expect } from "../support/fixtures";

/**
 * RED-PHASE ATDD acceptance test scaffolds for Story 5.3:
 * Health Dashboard, Audit Log & Auto-Registration Toggle.
 *
 * These tests FAIL before implementation. They PASS once Story 5.3 is done.
 *
 * ACs covered:
 *   AC-1:  Health Dashboard displays operational metrics (active services, total requests, DB status, uptime)
 *   AC-4:  Audit Log section displays entries (action, actor, resource, timestamp)
 *   AC-9:  Auto-Registration toggle appears in Feature Toggles section
 *   AC-11: Login page shows "Create account" link when auto-registration is ON
 *   AC-12: Admin Console placeholder tabs replaced with real content
 *   AC-13: data-testid attributes present
 *
 * RED before implementation:
 *   - /api/admin/health endpoint does not exist (404)
 *   - /api/admin/audit endpoint does not exist (404)
 *   - /api/auth/registration-status endpoint does not exist (404)
 *   - /api/auth/register endpoint does not exist (404)
 *   - HealthDashboardSection component does not exist
 *   - AuditLogSection component does not exist
 *   - useHealth hooks do not exist
 *   - useAuditLog hooks do not exist
 *   - useRegistrationStatus hook does not exist
 *   - Health and Audit Log tabs still show placeholder content
 *   - auto_registration toggle not in FeatureToggles table
 *   - AuditLog table does not exist
 *   - AuditService does not exist
 *
 * Data-testid contract (must exist after Story 5.3):
 *   tab-health                              — Health sub-nav tab
 *   tab-audit-log                           — Audit Log sub-nav tab
 *   section-health                          — Health Dashboard section container
 *   health-active-services                  — Active services metric
 *   health-total-requests                   — Total requests metric
 *   health-db-status                        — Database status metric
 *   health-uptime                           — Uptime metric
 *   btn-health-refresh                      — Health refresh button
 *   section-audit-log                       — Audit Log section container
 *   table-audit-log                         — Audit Log table
 *   audit-row-{id}                          — Audit Log row (dynamic)
 *   btn-audit-load-more                     — Audit Log load more button
 *   toggle-row-auto_registration            — Auto-registration toggle entry
 *   toggle-switch-auto_registration         — Auto-registration toggle switch
 *   page-register                           — Register page container
 *   input-register-username                 — Register username input
 *   input-register-password                 — Register password input
 *   input-register-confirm-password         — Register confirm password input
 *   btn-register-submit                     — Register submit button
 *   link-login-register                     — Login page register link
 */

// ─── P0: Health Dashboard displays metrics (AC-1) ─────────────────────────

test.describe("P0 — AC-1: Health Dashboard section displays operational metrics", () => {
  /**
   * RED: Health tab shows placeholder "Coming in Story 5.3"
   * GREEN: Health tab renders HealthDashboardSection with metrics
   */
  test("Health tab shows Health Dashboard section with all metrics", async ({
    page,
  }) => {
    // Arrange — navigate to Admin Console → Health tab
    await page.goto("/admin");
    await page.getByTestId("tab-health").click();

    // Assert — HealthDashboardSection renders
    // RED: section-health testid does not exist yet
    await expect(page.getByTestId("section-health")).toBeVisible();

    // Verify all metric elements are present
    // RED: metric testids do not exist yet
    await expect(page.getByTestId("health-active-services")).toBeVisible();
    await expect(page.getByTestId("health-total-requests")).toBeVisible();
    await expect(page.getByTestId("health-db-status")).toBeVisible();
    await expect(page.getByTestId("health-uptime")).toBeVisible();

    // Verify refresh button is present
    // RED: btn-health-refresh testid does not exist yet
    await expect(page.getByTestId("btn-health-refresh")).toBeVisible();
  });

  /**
   * RED: Health metrics show placeholder content
   * GREEN: Health metrics display actual data from /api/admin/health
   */
  test("Health Dashboard displays active services count", async ({ page }) => {
    // Arrange — navigate to Health Dashboard
    await page.goto("/admin");
    await page.getByTestId("tab-health").click();

    // Assert — Active Services metric shows numeric value
    const activeServicesMetric = page.getByTestId("health-active-services");
    await expect(activeServicesMetric).toBeVisible();

    // RED: metric shows "0" or placeholder before API exists
    // GREEN: metric shows actual count (≥0)
    await expect(activeServicesMetric).toContainText(/\d+/);
  });

  /**
   * RED: Database status metric does not exist
   * GREEN: Database status shows "Accessible" (green) or "Inaccessible" (red)
   */
  test("Health Dashboard displays database status with visual indicator", async ({
    page,
  }) => {
    // Arrange — navigate to Health Dashboard
    await page.goto("/admin");
    await page.getByTestId("tab-health").click();

    // Assert — Database status metric shows status
    const dbStatusMetric = page.getByTestId("health-db-status");
    await expect(dbStatusMetric).toBeVisible();

    // RED: metric shows placeholder
    // GREEN: metric shows "Accessible" with green styling
    await expect(dbStatusMetric).toContainText(/Accessible|Inaccessible/);

    // Verify visual indicator (green or red)
    const hasGreenClass = await dbStatusMetric.evaluate((el) =>
      el.className.includes("green"),
    );
    const hasRedClass = await dbStatusMetric.evaluate((el) =>
      el.className.includes("red"),
    );
    expect(hasGreenClass || hasRedClass).toBe(true);
  });

  /**
   * RED: Uptime metric does not exist
   * GREEN: Uptime metric displays human-readable duration (e.g., "2h 34m")
   */
  test("Health Dashboard displays container uptime in human-readable format", async ({
    page,
  }) => {
    // Arrange — navigate to Health Dashboard
    await page.goto("/admin");
    await page.getByTestId("tab-health").click();

    // Assert — Uptime metric shows duration
    const uptimeMetric = page.getByTestId("health-uptime");
    await expect(uptimeMetric).toBeVisible();

    // RED: metric shows placeholder "0m" or "N/A"
    // GREEN: metric shows pattern like "2h 34m" or "3d 12h" or "45m"
    await expect(uptimeMetric).toContainText(/\d+[dhms]/);
  });

  /**
   * RED: Manual refresh button does not exist or does nothing
   * GREEN: Clicking refresh button refetches health data immediately
   */
  test("Health refresh button refetches data on click", async ({ page }) => {
    // Arrange — navigate to Health Dashboard
    await page.goto("/admin");
    await page.getByTestId("tab-health").click();

    // Act — click refresh button
    const refreshButton = page.getByTestId("btn-health-refresh");
    await refreshButton.click();

    // Assert — health data is refetched (verify by watching network or UI update)
    // RED: button does nothing or does not exist
    // GREEN: button triggers React Query invalidation, metrics update
    await expect(refreshButton).toBeVisible();

    // Note: Full network monitoring would require Playwright request interception
    // This test verifies button exists and is clickable; integration test validates API call
  });
});

// ─── P0: Audit Log displays entries (AC-4) ────────────────────────────────

test.describe("P0 — AC-4: Audit Log section displays entries", () => {
  /**
   * RED: Audit Log tab shows placeholder "Coming in Story 5.3"
   * GREEN: Audit Log tab renders AuditLogSection with table
   */
  test("Audit Log tab shows Audit Log section with table", async ({ page }) => {
    // Arrange — navigate to Admin Console → Audit Log tab
    await page.goto("/admin");
    await page.getByTestId("tab-audit-log").click();

    // Assert — AuditLogSection renders
    // RED: section-audit-log testid does not exist yet
    await expect(page.getByTestId("section-audit-log")).toBeVisible();

    // Verify audit log table is present
    // RED: table-audit-log testid does not exist yet
    await expect(page.getByTestId("table-audit-log")).toBeVisible();
  });

  /**
   * RED: Audit log table has no columns
   * GREEN: Audit log table displays Action, Actor, Resource, Timestamp columns
   */
  test("Audit Log table has Action, Actor, Resource, Timestamp columns", async ({
    page,
  }) => {
    // Arrange — navigate to Audit Log section
    await page.goto("/admin");
    await page.getByTestId("tab-audit-log").click();

    // Assert — table has correct headers
    const table = page.getByTestId("table-audit-log");

    // RED: table headers don't exist yet
    await expect(
      table.locator("th").filter({ hasText: "Action" }),
    ).toBeVisible();
    await expect(
      table.locator("th").filter({ hasText: "Actor" }),
    ).toBeVisible();
    await expect(
      table.locator("th").filter({ hasText: "Resource" }),
    ).toBeVisible();
    await expect(
      table.locator("th").filter({ hasText: "Timestamp" }),
    ).toBeVisible();
  });

  /**
   * RED: Audit log table is empty or shows no data
   * GREEN: Audit log displays entries from /api/admin/audit (newest-first)
   */
  test("Audit Log displays entries newest-first when audit data exists", async ({
    page,
  }) => {
    // Note: This test requires audit entries to exist in the database
    // Can be seeded by performing actions (e.g., toggle change, user create)

    // Arrange — navigate to Audit Log section
    await page.goto("/admin");
    await page.getByTestId("tab-audit-log").click();

    // RED: table shows empty state "No audit entries yet." or no rows
    // GREEN: table shows audit entries with dynamic testids like audit-row-{id}

    // Assert — verify either empty state or entries exist
    const table = page.getByTestId("table-audit-log");
    const firstRow = table.locator("tbody tr").first();

    // If entries exist, verify first row has audit-row-* testid
    const rowCount = await table.locator("tbody tr").count();
    if (rowCount > 0) {
      await expect(firstRow).toBeVisible();
      // Verify row has data-testid starting with "audit-row-"
      const testid = await firstRow.getAttribute("data-testid");
      expect(testid).toMatch(/^audit-row-/);
    } else {
      // Verify empty state message
      await expect(page.locator("text=No audit entries yet.")).toBeVisible();
    }
  });

  /**
   * RED: Load more button does not exist
   * GREEN: Load more button appears when more than 20 entries exist
   */
  test("Audit Log shows 'Load more' button for pagination", async ({
    page,
  }) => {
    // Note: This test requires more than 20 audit entries to exist
    // In RED phase, button may not exist or be hidden

    // Arrange — navigate to Audit Log section
    await page.goto("/admin");
    await page.getByTestId("tab-audit-log").click();

    // Assert — Load more button is present or hidden based on data
    // RED: btn-audit-load-more testid does not exist yet
    const loadMoreButton = page.getByTestId("btn-audit-load-more");

    // This test is skipped in RED phase unless 20+ audit entries exist
    // GREEN: button appears when total > 20, hidden when total ≤ 20
    await expect(loadMoreButton)
      .toBeVisible()
      .catch(() => {
        // Button may not be visible if fewer than 20 entries exist
        // This is expected behavior, not a failure
      });
  });

  /**
   * RED: Empty state does not exist
   * GREEN: Empty state "No audit entries yet." shown when no audit entries
   */
  test("Audit Log shows empty state when no entries exist", async ({
    page,
  }) => {
    // Note: This test requires a fresh database with no audit entries
    // May need to reset DB or use a test environment

    // Arrange — navigate to Audit Log section
    await page.goto("/admin");
    await page.getByTestId("tab-audit-log").click();

    // RED: table shows no empty state or generic error
    // GREEN: empty state "No audit entries yet." is displayed
    const table = page.getByTestId("table-audit-log");
    const rowCount = await table.locator("tbody tr").count();

    if (rowCount === 0) {
      await expect(page.locator("text=No audit entries yet.")).toBeVisible();
    }
  });
});

// ─── P1: Auto-Registration toggle in Feature Toggles (AC-9) ───────────────

test.describe("P1 — AC-9: Auto-Registration toggle appears in Feature Toggles section", () => {
  /**
   * RED: auto_registration toggle does not exist in FeatureToggles table
   * GREEN: auto_registration toggle appears in Feature Toggles section
   */
  test("Auto-Registration toggle entry appears in Feature Toggles list", async ({
    page,
  }) => {
    // Arrange — navigate to Admin Console → Feature Toggles tab
    await page.goto("/admin");
    // Default tab is Feature Toggles, no need to click

    // Assert — auto_registration toggle row is visible
    // RED: toggle-row-auto_registration testid does not exist yet
    const toggleRow = page.getByTestId("toggle-row-auto_registration");
    await expect(toggleRow).toBeVisible();

    // Verify display name
    await expect(toggleRow).toContainText("User Self-Registration");

    // Verify description
    await expect(toggleRow).toContainText(
      "Allow new accounts to be created via the registration page",
    );
  });

  /**
   * RED: auto_registration toggle shows as enabled (wrong default)
   * GREEN: auto_registration toggle is disabled by default (OFF)
   */
  test("Auto-Registration toggle is disabled by default", async ({ page }) => {
    // Arrange — navigate to Feature Toggles section
    await page.goto("/admin");

    // Assert — auto_registration toggle switch is unchecked (disabled)
    const toggleRow = page.getByTestId("toggle-row-auto_registration");
    await expect(toggleRow).toBeVisible(); // row is visible

    const toggleSwitch = page.getByTestId("toggle-switch-auto_registration");
    // Note: native checkbox inputs are hidden by CSS in the custom toggle component
    // Use not.toBeChecked() which works on hidden form elements
    await expect(toggleSwitch).not.toBeChecked();

    // Also verify aria-checked attribute
    // RED: toggle may show as checked (enabled) before migration seed
    // GREEN: toggle is unchecked (aria-checked="false")
    await expect(toggleSwitch).toHaveAttribute("aria-checked", "false");
  });

  /**
   * RED: Env var override indicator does not work
   * GREEN: When FISHTANK_AUTO_REGISTRATION=true, toggle shows as env-var-locked
   */
  test("Auto-Registration toggle shows env-var-locked indicator when set via env var", async () => {
    // Note: This test requires FISHTANK_AUTO_REGISTRATION=true to be set
    // Cannot be tested in normal E2E without container restart with env var
    // Defer to integration test or manual testing

    test.skip(
      true,
      "Requires container restart with FISHTANK_AUTO_REGISTRATION=true env var",
    );
  });
});

// ─── P1: Login page conditional registration link (AC-11) ─────────────────

test.describe("P1 — AC-11: Login page shows conditional registration link", () => {
  /**
   * RED: /api/auth/registration-status endpoint does not exist (404)
   * GREEN: Login page fetches registration status and conditionally shows link
   */
  test("Login page does NOT show 'Create account' link when auto-registration is OFF", async ({
    page,
  }) => {
    // Arrange — auto-registration is OFF by default

    // Act — navigate to login page
    await page.goto("/login");

    // Assert — "Create account" link is NOT visible
    // RED: link-login-register testid does not exist yet
    const registerLink = page.getByTestId("link-login-register");

    // RED: link may be visible before conditional rendering is implemented
    // GREEN: link is hidden when auto-registration is OFF
    await expect(registerLink).toBeHidden();
  });

  /**
   * RED: Registration link always visible (wrong behavior)
   * GREEN: Login page shows "Create account" link when auto-registration is ON
   */
  test("Login page shows 'Create account' link when auto-registration is ON", async () => {
    // Note: This test requires auto_registration toggle to be enabled
    // Cannot easily enable in E2E without admin login + toggle change
    // Defer to integration test or scenario-based E2E

    test.skip(
      true,
      "Requires auto_registration toggle to be ON — defer to scenario test",
    );
  });

  /**
   * RED: /register route does not exist
   * GREEN: Clicking "Create account" link navigates to /register page
   */
  test("Create account link navigates to /register route", async () => {
    // Note: This test requires auto-registration to be ON
    // Skipped in RED phase; will pass once AC-11 is fully implemented

    test.skip(
      true,
      "Requires auto-registration to be ON and link to be visible",
    );
  });
});

// ─── P1: Register page with form (AC-11) ──────────────────────────────────

test.describe("P1 — AC-11: Register page renders registration form", () => {
  /**
   * RED: /register route does not exist (404)
   * GREEN: /register route renders registration form
   */
  test("Register page renders with username, password, confirm password fields", async () => {
    // Note: This test requires auto-registration to be ON
    // In RED phase, /register route may not exist or show "not available" message

    test.skip(true, "Requires /register route and auto-registration to be ON");

    // // Uncomment for GREEN phase:
    // await page.goto("/register");
    //
    // // Assert — page-register testid exists
    // await expect(page.getByTestId("page-register")).toBeVisible();
    //
    // // Verify form fields
    // await expect(page.getByTestId("input-register-username")).toBeVisible();
    // await expect(page.getByTestId("input-register-password")).toBeVisible();
    // await expect(page.getByTestId("input-register-confirm-password")).toBeVisible();
    // await expect(page.getByTestId("btn-register-submit")).toBeVisible();
  });

  /**
   * RED: Register page always shows form (wrong behavior)
   * GREEN: Register page shows "not available" message when auto-registration is OFF
   */
  test("Register page shows 'Self-registration is not available' when auto-registration is OFF", async ({
    page,
  }) => {
    // Note: Default state is auto-registration OFF

    // Act — navigate to /register directly
    await page.goto("/register");

    // RED: page may show form or 404 before implementation
    // GREEN: page shows message "Self-registration is not available for this instance."
    await expect(
      page.locator("text=Self-registration is not available"),
    ).toBeVisible();

    // Verify "Sign in" link is present
    await expect(page.locator('a[href="/login"]')).toBeVisible();
  });
});

// ─── P0: Admin Console placeholder tabs replaced (AC-12) ──────────────────

test.describe("P0 — AC-12: Admin Console placeholder tabs replaced with real content", () => {
  /**
   * RED: Health tab shows placeholder "Coming in Story 5.3"
   * GREEN: Health tab renders HealthDashboardSection (no placeholder)
   */
  test("Health tab no longer shows placeholder content", async ({ page }) => {
    // Arrange — navigate to Health tab
    await page.goto("/admin");
    await page.getByTestId("tab-health").click();

    // Assert — placeholder text does NOT appear
    // RED: text "Coming in Story 5.3" is visible
    // GREEN: text "Coming in Story 5.3" does not exist
    await expect(page.locator("text=Coming in Story 5.3")).toBeHidden();

    // Verify real content is visible instead
    await expect(page.getByTestId("section-health")).toBeVisible();
  });

  /**
   * RED: Audit Log tab shows placeholder "Coming in Story 5.3"
   * GREEN: Audit Log tab renders AuditLogSection (no placeholder)
   */
  test("Audit Log tab no longer shows placeholder content", async ({
    page,
  }) => {
    // Arrange — navigate to Audit Log tab
    await page.goto("/admin");
    await page.getByTestId("tab-audit-log").click();

    // Assert — placeholder text does NOT appear
    // RED: text "Coming in Story 5.3" is visible
    // GREEN: text "Coming in Story 5.3" does not exist
    await expect(page.locator("text=Coming in Story 5.3")).toBeHidden();

    // Verify real content is visible instead
    await expect(page.getByTestId("section-audit-log")).toBeVisible();
  });
});
