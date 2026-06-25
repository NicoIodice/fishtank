import { unlinkSync, writeFileSync, mkdirSync } from "fs";
import path from "path";
import type { APIRequestContext } from "@playwright/test";
import type {
  AuthProvider,
  PlaywrightStorageState,
} from "@seontechnologies/playwright-utils/auth-session";
import {
  getTokenFilePath,
  loadStorageState,
  saveStorageState,
} from "@seontechnologies/playwright-utils/auth-session";

const API_URL = process.env.API_URL ?? "http://127.0.0.1:5000";

/**
 * Fishtank auth provider for playwright-utils auth-session.
 *
 * Fishtank issues JWTs as httpOnly cookies. The provider acquires a storage
 * state via Playwright's APIRequestContext so that cookies set by the login
 * response are captured and persisted for browser contexts.
 */
export const fishtankAuthProvider: AuthProvider = {
  getEnvironment(options?) {
    return options?.environment ?? process.env.TEST_ENV ?? "local";
  },

  getUserIdentifier(options?) {
    return options?.userIdentifier ?? "default";
  },

  extractToken(tokenData) {
    const state = tokenData as PlaywrightStorageState;
    return state.cookies?.[0]?.value ?? null;
  },

  extractCookies(tokenData) {
    const state = tokenData as PlaywrightStorageState;
    return state.cookies ?? [];
  },

  async manageAuthToken(
    request: APIRequestContext,
    options?,
  ): Promise<Record<string, unknown>> {
    const environment = this.getEnvironment(options);
    const userIdentifier = this.getUserIdentifier(options);
    const tokenPath = getTokenFilePath({ environment, userIdentifier });

    // Reuse existing storage state only if the JWT is still valid on the backend.
    // A logout call increments token_version, silently invalidating cached JWTs;
    // we must re-login when that happens to avoid 401s in concurrent tests.
    const existing = loadStorageState(tokenPath);
    if (existing) {
      const cookies =
        (existing as { cookies?: Array<{ name: string; value: string }> })
          .cookies ?? [];
      const jwtCookie = cookies.find((c) => c.name === "fishtank_auth");
      if (jwtCookie) {
        const validation = await request.get(`${API_URL}/api/auth/me`, {
          headers: { Cookie: `fishtank_auth=${jwtCookie.value}` },
        });
        if (validation.ok()) {
          return existing; // JWT is still valid
        }
        // JWT was revoked (e.g. after logout) — fall through to re-login
      }
    }

    // Acquire a new token via the login endpoint
    const credentials = resolveCredentials(userIdentifier);
    const response = await request.post(`${API_URL}/api/auth/login`, {
      data: credentials,
    });

    if (!response.ok()) {
      throw new Error(
        `Auth failed for "${userIdentifier}": HTTP ${response.status()}`,
      );
    }

    // Capture cookies set by the login response
    const storageState = (await request.storageState()) as Record<
      string,
      unknown
    >;
    saveStorageState(tokenPath, storageState);

    // Keep Playwright's global storageState file in sync so the built-in
    // `request` fixture always has the latest JWT after any re-login.
    try {
      const pwAuthPath = path.join(
        process.cwd(),
        "playwright",
        ".auth",
        "user.json",
      );
      mkdirSync(path.dirname(pwAuthPath), { recursive: true });
      writeFileSync(pwAuthPath, JSON.stringify(storageState));
    } catch {
      // non-fatal: Playwright's request fixture will use stale state
    }

    return storageState;
  },

  clearToken(options?) {
    const environment = this.getEnvironment(options);
    const userIdentifier = this.getUserIdentifier(options);
    const tokenPath = getTokenFilePath({ environment, userIdentifier });
    try {
      unlinkSync(tokenPath);
    } catch {
      // file may not exist; ignore
    }
  },

  getBaseUrl() {
    return process.env.BASE_URL ?? "http://localhost:5173";
  },
};

function resolveCredentials(userIdentifier: string): {
  username: string;
  password: string;
} {
  switch (userIdentifier) {
    case "admin":
      return {
        username: process.env.TEST_ADMIN_USER ?? "admin",
        password: process.env.TEST_ADMIN_PASS ?? "Admin@Test123",
      };
    default:
      return {
        username: process.env.TEST_USER ?? "admin",
        password: process.env.TEST_PASS ?? "Admin@Test123",
      };
  }
}
