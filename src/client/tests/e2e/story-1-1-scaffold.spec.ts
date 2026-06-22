import { test, expect } from "../support/fixtures";

/**
 * ATDD acceptance test scaffolds for Story 1.1:
 * Project Scaffold, Docker Image & CI Pipeline.
 *
 * RED PHASE — these tests define the expected end-state UI behaviour.
 * They FAIL before the app shell is built (Vite placeholder is still in place).
 * They PASS once the React app shell (top bar, sidebar, routing) is implemented
 * as part of Story 1.3.
 *
 * Story 1.1 creates the Docker image and CI pipeline; Story 1.3 implements
 * the React shell. These E2E scaffolds exist here to confirm the deployed
 * container serves the correct shell (not the Vite placeholder).
 *
 * ACs covered:
 *   AC4  — Container serves the React shell at the root path
 *   AC3c — Direct navigation to a client-side route renders the React shell
 */
test.describe("Story 1-1: Project Scaffold — App Shell E2E", () => {
  // ─────────────────────────────────────────────────────────────────────────
  // AC4 — App shell renders at root
  // RED:  The Vite placeholder app renders (no top bar or sidebar exist)
  // GREEN: The React app shell renders with data-testid="top-bar" after
  //        Story 1.3 implements the shell
  // ─────────────────────────────────────────────────────────────────────────

  test("AC4: root path renders the app shell top bar", async ({ page }) => {
    // Given: authenticated session (storageState provides JWT cookie)
    await page.goto("/");

    // Then: the app shell top bar is visible (not the Vite placeholder)
    await expect(page.getByTestId("top-bar")).toBeVisible({
      message:
        "The root path must render the Fishtank app shell top bar (data-testid='top-bar'). " +
        "If the Vite placeholder is shown, the React shell has not been implemented yet.",
    });
  });

  test("AC4: root path renders the app shell sidebar", async ({ page }) => {
    // Given: authenticated session (storageState provides JWT cookie)
    await page.goto("/");

    // Then: the sidebar navigation is visible
    await expect(page.getByTestId("sidebar")).toBeVisible({
      message:
        "The root path must render the sidebar navigation (data-testid='sidebar'). " +
        "If the Vite placeholder is shown, the React shell has not been implemented yet.",
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // AC3c — SPA routing: direct navigation to a client-side route
  // RED:  The Vite default app has no route for /services → shows placeholder
  //       or a blank page (React Router not configured)
  // GREEN: The app shell renders correctly at /services after Story 1.3
  //        (React Router configured with a /services route)
  // ─────────────────────────────────────────────────────────────────────────

  test("AC3c: direct navigation to /services renders the React shell", async ({
    page,
  }) => {
    // Given: authenticated session (storageState provides JWT cookie)
    await page.goto("/services");

    // Then: the React shell is visible (not a 404 or blank page)
    await expect(page.getByTestId("top-bar")).toBeVisible({
      message:
        "Direct navigation to /services must render the app shell, not a 404 page. " +
        "The SPA fallback (MapFallbackToFile) must be configured on the backend.",
    });

    // And: no browser-level 404 error (page title is not 'Page not found')
    await expect(page).not.toHaveTitle(/404|not found/i);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Negative: Vite placeholder is not served in production build
  // RED:  The Vite placeholder text is visible in current dev state
  // GREEN: The Vite placeholder is replaced by the Fishtank app shell
  // ─────────────────────────────────────────────────────────────────────────

  test("AC4-neg: Vite default placeholder is not rendered", async ({
    page,
  }) => {
    // Given
    await page.goto("/");

    // Then: the Vite placeholder content is not visible
    // (the "Get started" heading or Vite/React logo combo is the placeholder)
    await expect(page.getByText("Get started")).not.toBeVisible({
      message:
        "The Vite placeholder ('Get started' heading) must not be shown. " +
        "Replace App.tsx with the Fishtank app shell before shipping.",
    });
  });
});
