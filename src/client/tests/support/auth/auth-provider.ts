import { unlinkSync } from "fs";
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

const API_URL = process.env.API_URL ?? "http://localhost:5000";

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

    // Reuse existing storage state if available
    const existing = loadStorageState(tokenPath);
    if (existing) {
      return existing;
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
        password: process.env.TEST_ADMIN_PASS ?? "admin",
      };
    default:
      return {
        username: process.env.TEST_USER ?? "admin",
        password: process.env.TEST_PASS ?? "admin",
      };
  }
}
