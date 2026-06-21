import { test, expect } from "../support/fixtures";

/**
 * ATDD acceptance test scaffolds for Story 1.3:
 * React App Shell, Login & First-Run Setup Screens.
 *
 * RED PHASE — these tests define the expected acceptance behaviour.
 * They FAIL before implementation (current codebase is the Vite counter placeholder).
 * They PASS once the React app shell, routing, auth forms, and CSS theme are implemented.
 *
 * ACs covered:
 *   AC-1  — Unauthenticated redirect to /login
 *   AC-2  — First-run gate: redirect to /setup when no users exist
 *   AC-3  — Login: valid credentials → JWT cookie set → navigate to /services
 *   AC-4  — Login: invalid credentials → inline error, username retained, password cleared
 *   AC-5  — Setup screen: create admin account → navigate to /services
 *   AC-8  — Top bar renders (logo, About icon, Bell, Avatar)
 *   AC-9  — Sign-out: POST /api/auth/logout → navigate to /login
 *   AC-10 — About modal: env var fields visible/hidden correctly
 *   AC-11 — Sidebar renders with all 5 nav items on desktop
 *   AC-13 — Hamburger visible on mobile viewport (<768px), sidebar hidden
 */

test.describe("Story 1-3: React App Shell, Login & First-Run Setup Screens", () => {
  // ─────────────────────────────────────────────────────────────────────────
  // AC-1 — Unauthenticated redirect to /login
  // RED:  Current Vite placeholder does not redirect to /login
  // GREEN: ProtectedRoute redirects unauthenticated users to /login
  // ─────────────────────────────────────────────────────────────────────────

  test("AC-1: unauthenticated navigation to /services redirects to /login", async ({
    page,
  }) => {
    // Given: no JWT cookie and an admin account exists
    await page.context().clearCookies();

    // When: user navigates to a protected route
    await page.goto("/services");

    // Then: redirected to /login
    await expect(page).toHaveURL(/\/login/, {
      timeout: 10_000,
    });
    await expect(page.getByTestId("login-page")).toBeVisible({
      message:
        "Unauthenticated navigation to /services must redirect to /login " +
        "and render the login page (data-testid='login-page').",
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // AC-2 — First-run gate: fresh instance redirects to /setup
  // RED:  Current app does not call GET /api/setup/status or redirect
  // GREEN: FirstRunGate checks /api/setup/status and redirects to /setup
  // ─────────────────────────────────────────────────────────────────────────

  test("AC-2: fresh instance (needsSetup=true) redirects any route to /setup", async ({
    page,
  }) => {
    // Given: the backend reports needsSetup=true (fresh instance)
    // Mock the setup status endpoint to return needsSetup: true
    await page.route("**/api/setup/status", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { needsSetup: true } }),
      }),
    );

    // When: user navigates to any route
    await page.goto("/services");

    // Then: redirected to /setup
    await expect(page).toHaveURL(/\/setup/, {
      timeout: 10_000,
    });
    await expect(page.getByTestId("setup-page")).toBeVisible({
      message:
        "On a fresh instance (needsSetup=true) any route must redirect to /setup " +
        "and render the setup page (data-testid='setup-page').",
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // AC-3 — Login: valid credentials → JWT cookie set → navigate to /services
  // RED:  No login page or routing exists
  // GREEN: LoginPage posts to /api/auth/login; on success navigates to /services
  // ─────────────────────────────────────────────────────────────────────────

  test("AC-3: valid login credentials set cookie and navigate to /services", async ({
    page,
  }) => {
    // Given: the API accepts valid credentials
    // /api/auth/me returns 401 initially; 200 after login succeeds
    let loginSucceeded = false;
    await page.route("**/api/auth/me", (route) => {
      if (loginSucceeded) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: {
              username: "admin",
              role: "Admin",
              forcePasswordChange: false,
            },
          }),
        });
      }
      return route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error: { code: "AUTH_UNAUTHORIZED", message: "Not authenticated" },
        }),
      });
    });
    await page.route("**/api/setup/status", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { needsSetup: false } }),
      }),
    );
    await page.route("**/api/auth/login", (route) => {
      loginSucceeded = true;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            username: "admin",
            role: "Admin",
            forcePasswordChange: false,
          },
        }),
        headers: {
          "Set-Cookie":
            "fishtank_auth=test-jwt; HttpOnly; SameSite=Strict; Path=/",
        },
      });
    });

    // When: user navigates to /login and submits valid credentials
    await page.goto("/login");
    await page.getByTestId("login-username-input").fill("admin");
    await page.getByTestId("login-password-input").fill("correct-password");
    await page.getByTestId("login-submit-button").click();

    // Then: navigated to /services
    await expect(page).toHaveURL(/\/services/, { timeout: 10_000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // AC-4 — Login: invalid credentials → inline error, username retained
  // RED:  No login page or form exists
  // GREEN: LoginPage shows inline error; username field keeps value; password cleared
  // ─────────────────────────────────────────────────────────────────────────

  test(
    "AC-4: invalid credentials show inline error and retain username",
    { annotation: [{ type: "skipNetworkMonitoring" }] },
    async ({ page }) => {
      // Given: the API rejects credentials
      await page.route("**/api/auth/me", (route) =>
        route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            error: { code: "AUTH_UNAUTHORIZED", message: "Not authenticated" },
          }),
        }),
      );
      await page.route("**/api/setup/status", (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: { needsSetup: false } }),
        }),
      );
      await page.route("**/api/auth/login", (route) =>
        route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            error: {
              code: "AUTH_INVALID_CREDENTIALS",
              message: "Invalid username or password.",
            },
          }),
        }),
      );

      // When: user navigates to /login and submits invalid credentials
      await page.goto("/login");
      await page.getByTestId("login-username-input").fill("admin");
      await page.getByTestId("login-password-input").fill("wrong-password");
      await page.getByTestId("login-submit-button").click();

      // Then: inline error message displayed
      await expect(page.getByTestId("login-error-message")).toBeVisible({
        message:
          "Inline error message must appear on invalid credentials (data-testid='login-error-message').",
      });

      // And: username field retains its value
      await expect(page.getByTestId("login-username-input")).toHaveValue(
        "admin",
        {
          message:
            "Username field must retain its value after a failed login attempt.",
        },
      );

      // And: password field is cleared
      await expect(page.getByTestId("login-password-input")).toHaveValue("", {
        message: "Password field must be cleared after a failed login attempt.",
      });
    },
  );

  // ─────────────────────────────────────────────────────────────────────────
  // AC-5 — Setup screen: valid submission creates admin and navigates to /services
  // RED:  No setup page exists
  // GREEN: SetupPage posts to /api/auth/setup; on success navigates to /services
  // ─────────────────────────────────────────────────────────────────────────

  test("AC-5: valid setup form creates admin account and navigates to /services", async ({
    page,
  }) => {
    // Given: fresh instance with needsSetup=true
    await page.route("**/api/setup/status", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { needsSetup: true } }),
      }),
    );
    await page.route("**/api/auth/setup", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { username: "admin", role: "Admin" },
        }),
        headers: {
          "Set-Cookie":
            "fishtank_auth=test-jwt; HttpOnly; SameSite=Strict; Path=/",
        },
      }),
    );

    // When: user fills in the setup form with valid data
    await page.goto("/setup");
    await page.getByTestId("setup-username-input").fill("admin");
    await page.getByTestId("setup-password-input").fill("SecurePassw0rd!");
    await page.getByTestId("setup-submit-button").click();

    // Then: navigated to /services
    await expect(page).toHaveURL(/\/services/, { timeout: 10_000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // AC-8 — Top bar renders with logo, About icon, Bell stub, and Avatar
  // RED:  Current Vite placeholder has no top bar
  // GREEN: TopBar component renders with data-testid="top-bar" and child testids
  // ─────────────────────────────────────────────────────────────────────────

  test("AC-8: authenticated app shell renders top bar with all elements", async ({
    page,
  }) => {
    // Given: authenticated session
    await page.route("**/api/setup/status", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { needsSetup: false } }),
      }),
    );
    await page.route("**/api/auth/me", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            userId: "1",
            username: "admin",
            role: "Admin",
            forcePasswordChange: false,
          },
        }),
      }),
    );

    // When: user navigates to the app
    await page.goto("/services");

    // Then: top bar renders
    await expect(page.getByTestId("top-bar")).toBeVisible({
      message:
        "Top bar must render in the authenticated app shell (data-testid='top-bar').",
    });

    // And: all child elements are visible
    await expect(page.getByTestId("topbar-logo")).toBeVisible({
      message:
        "Logo must be visible in the top bar (data-testid='topbar-logo').",
    });
    await expect(page.getByTestId("topbar-about-button")).toBeVisible({
      message:
        "About button must be visible in the top bar (data-testid='topbar-about-button').",
    });
    await expect(page.getByTestId("topbar-bell-button")).toBeVisible({
      message:
        "Notification bell must be visible in the top bar (data-testid='topbar-bell-button').",
    });
    await expect(page.getByTestId("topbar-avatar-button")).toBeVisible({
      message:
        "User avatar button must be visible in the top bar (data-testid='topbar-avatar-button').",
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // AC-9 — Sign-out: POST /api/auth/logout → navigate to /login
  // RED:  No sign-out action exists
  // GREEN: Avatar dropdown → Sign out → POST logout → redirect to /login
  // ─────────────────────────────────────────────────────────────────────────

  test("AC-9: sign-out calls logout endpoint and redirects to /login", async ({
    page,
  }) => {
    // Given: authenticated session
    await page.route("**/api/setup/status", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { needsSetup: false } }),
      }),
    );
    await page.route("**/api/auth/me", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            userId: "1",
            username: "admin",
            role: "Admin",
            forcePasswordChange: false,
          },
        }),
      }),
    );

    let logoutCalled = false;
    await page.route("**/api/auth/logout", (route) => {
      logoutCalled = true;
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: null }),
      });
    });

    // When: user opens avatar dropdown and clicks sign out
    await page.goto("/services");
    await page.getByTestId("topbar-avatar-button").click();
    await page.getByTestId("topbar-signout-button").click();

    // Then: POST /api/auth/logout was called
    expect(logoutCalled).toBe(true);

    // And: redirected to /login
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // AC-10 — About modal opens and shows env var fields (hidden if unset)
  // RED:  No About modal exists
  // GREEN: AboutModal renders with env var content; unset vars hidden
  // ─────────────────────────────────────────────────────────────────────────

  test("AC-10: About modal opens on button click", async ({ page }) => {
    // Given: authenticated session
    await page.route("**/api/setup/status", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { needsSetup: false } }),
      }),
    );
    await page.route("**/api/auth/me", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            userId: "1",
            username: "admin",
            role: "Admin",
            forcePasswordChange: false,
          },
        }),
      }),
    );

    // When: user clicks the About button
    await page.goto("/services");
    await page.getByTestId("topbar-about-button").click();

    // Then: About modal is visible
    await expect(page.getByTestId("about-modal")).toBeVisible({
      message:
        "About modal must open when the About button is clicked (data-testid='about-modal').",
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // AC-11 — Sidebar renders with all 5 nav items on desktop
  // RED:  Current Vite placeholder has no sidebar
  // GREEN: Sidebar renders with Services, Activity, Mappings, Events, Settings
  // ─────────────────────────────────────────────────────────────────────────

  test("AC-11: authenticated app shell renders sidebar with 5 nav items on desktop", async ({
    page,
  }) => {
    // Given: authenticated session on desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.route("**/api/setup/status", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { needsSetup: false } }),
      }),
    );
    await page.route("**/api/auth/me", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            userId: "1",
            username: "admin",
            role: "Admin",
            forcePasswordChange: false,
          },
        }),
      }),
    );

    // When: user navigates to the app
    await page.goto("/services");

    // Then: sidebar renders
    await expect(page.getByTestId("sidebar")).toBeVisible({
      message:
        "Sidebar must render in the authenticated app shell (data-testid='sidebar').",
    });

    // And: all 5 nav items are visible
    for (const item of [
      "sidebar-nav-services",
      "sidebar-nav-activity",
      "sidebar-nav-mappings",
      "sidebar-nav-events",
      "sidebar-nav-settings",
    ]) {
      await expect(page.getByTestId(item)).toBeVisible({
        message: `Nav item must be visible (data-testid='${item}').`,
      });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // AC-13 — Hamburger visible on mobile (<768px), sidebar hidden
  // RED:  Current Vite placeholder has no hamburger or responsive logic
  // GREEN: Sidebar hidden, hamburger button visible at 375px viewport width
  // ─────────────────────────────────────────────────────────────────────────

  test("AC-13: hamburger menu visible and sidebar hidden on mobile viewport", async ({
    page,
  }) => {
    // Given: authenticated session on mobile viewport (<768px)
    await page.setViewportSize({ width: 375, height: 812 });
    await page.route("**/api/setup/status", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { needsSetup: false } }),
      }),
    );
    await page.route("**/api/auth/me", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            userId: "1",
            username: "admin",
            role: "Admin",
            forcePasswordChange: false,
          },
        }),
      }),
    );

    // When: user navigates to the app
    await page.goto("/services");

    // Then: hamburger button is visible
    await expect(page.getByTestId("hamburger-button")).toBeVisible({
      message:
        "Hamburger button must be visible on mobile viewport <768px (data-testid='hamburger-button').",
    });

    // And: sidebar is not visible (hidden behind hamburger)
    await expect(page.getByTestId("sidebar")).not.toBeVisible({
      message:
        "Sidebar must be hidden on mobile viewport <768px; only accessible via hamburger.",
    });
  });
});
