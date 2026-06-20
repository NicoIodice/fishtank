import { chromium } from "@playwright/test";
import {
  authStorageInit,
  configureAuthSession,
  setAuthProvider,
} from "@seontechnologies/playwright-utils/auth-session";
import { fishtankAuthProvider } from "./auth/auth-provider";

async function globalSetup(): Promise<void> {
  // Initialise auth-session storage directory
  authStorageInit();
  configureAuthSession({
    authStoragePath: "./playwright/.auth",
    debug: process.env.DEBUG_AUTH === "true",
  });
  setAuthProvider(fishtankAuthProvider);

  // TODO: Uncomment once the /api/auth/login endpoint is implemented
  // await seedAuthStorageState();
}

/**
 * Authenticates once via the Fishtank API and persists the browser storage
 * state (httpOnly JWT cookie) to disk for reuse across all test workers.
 *
 * Enable by uncommenting the call in globalSetup above, and un-commenting
 * `storageState` in playwright.config.ts.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function seedAuthStorageState(): Promise<void> {
  const browser = await chromium.launch();
  const context = await browser.newContext();

  const apiUrl = process.env.API_URL ?? "http://localhost:5000";
  const response = await context.request.post(`${apiUrl}/api/auth/login`, {
    data: {
      username: process.env.TEST_USER ?? "admin",
      password: process.env.TEST_PASS ?? "admin",
    },
  });

  if (!response.ok()) {
    await browser.close();
    throw new Error(`Auth seeding failed: HTTP ${response.status()}`);
  }

  await context.storageState({ path: "./playwright/.auth/user.json" });
  await browser.close();
}

export default globalSetup;
