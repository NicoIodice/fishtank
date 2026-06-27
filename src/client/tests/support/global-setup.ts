/// <reference types="node" />
import { chromium } from "@playwright/test";
import {
  authStorageInit,
  configureAuthSession,
  setAuthProvider,
  saveStorageState,
  getStorageStatePath,
} from "@seontechnologies/playwright-utils/auth-session";
import { fishtankAuthProvider } from "./auth/auth-provider";

async function globalSetup(): Promise<void> {
  // Initialise auth-session storage directory
  authStorageInit();
  configureAuthSession({
    debug: process.env.DEBUG_AUTH === "true",
  });
  setAuthProvider(fishtankAuthProvider);

  await seedAuthStorageState();
}

/**
 * Resets the database to a clean state, creates the test admin account, then
 * authenticates and persists the browser storage state (httpOnly JWT cookie)
 * to disk for reuse across all test workers.
 *
 * The reset is performed via POST /api/test/reset-db, a dev/test-only endpoint
 * that wipes all rows so every E2E run starts from an identical baseline
 * regardless of what the local database contained before.
 */
async function seedAuthStorageState(): Promise<void> {
  const browser = await chromium.launch();
  const context = await browser.newContext();

  const apiUrl = process.env.API_URL ?? "http://127.0.0.1:5000";
  const username = process.env.TEST_USER ?? "admin";
  const password = process.env.TEST_PASS ?? "Admin@Test123";

  // ── 1. Wipe the database ─────────────────────────────────────────────────
  const resetResponse = await context.request.post(
    `${apiUrl}/api/test/reset-db`,
  );
  if (!resetResponse.ok()) {
    await browser.close();
    throw new Error(
      `DB reset failed: HTTP ${resetResponse.status()}. ` +
        "Is the API running in Development/Testing mode?",
    );
  }

  // ── 2. Create the test admin account (DB is now empty → first-run) ───────
  const setupResponse = await context.request.post(`${apiUrl}/api/auth/setup`, {
    data: { username, password },
  });
  if (!setupResponse.ok()) {
    await browser.close();
    throw new Error(`Admin setup failed: HTTP ${setupResponse.status()}`);
  }

  // ── 3. Log in and capture the JWT cookie ─────────────────────────────────
  const loginResponse = await context.request.post(`${apiUrl}/api/auth/login`, {
    data: { username, password },
  });
  if (!loginResponse.ok()) {
    await browser.close();
    throw new Error(`Auth seeding failed: HTTP ${loginResponse.status()}`);
  }

  await context.storageState({ path: "./playwright/.auth/user.json" });

  // Also overwrite the path that createAuthFixtures()/manageAuthToken uses.
  // authStorageInit() pre-creates this file with empty cookies, which fools
  // manageAuthToken into skipping login. Overwrite it with the real JWT state.
  const authState = await context.storageState();
  const tokenPath = getStorageStatePath({
    environment: "local",
    userIdentifier: "default",
  });
  saveStorageState(tokenPath, authState);

  await browser.close();
}

export default globalSetup;
