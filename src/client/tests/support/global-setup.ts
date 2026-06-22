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
 * Authenticates once via the Fishtank API and persists the browser storage
 * state (httpOnly JWT cookie) to disk for reuse across all test workers.
 *
 * Handles first-run: if the backend reports needsSetup=true, it calls
 * POST /api/auth/setup to create the default admin account before logging in.
 */
async function seedAuthStorageState(): Promise<void> {
  const browser = await chromium.launch();
  const context = await browser.newContext();

  const apiUrl = process.env.API_URL ?? "http://localhost:5000";
  const username = process.env.TEST_USER ?? "admin";
  const password = process.env.TEST_PASS ?? "Admin@Test123";

  // First-run guard: create admin if no users exist yet
  const statusResponse = await context.request.get(
    `${apiUrl}/api/setup/status`,
  );
  if (statusResponse.ok()) {
    const statusBody = (await statusResponse.json()) as {
      data: { needsSetup: boolean };
    };
    if (statusBody.data?.needsSetup) {
      const setupResponse = await context.request.post(
        `${apiUrl}/api/auth/setup`,
        {
          data: { username, password },
        },
      );
      if (!setupResponse.ok()) {
        await browser.close();
        throw new Error(
          `First-run admin setup failed: HTTP ${setupResponse.status()}`,
        );
      }
    }
  }

  const response = await context.request.post(`${apiUrl}/api/auth/login`, {
    data: { username, password },
  });

  if (!response.ok()) {
    await browser.close();
    throw new Error(`Auth seeding failed: HTTP ${response.status()}`);
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
