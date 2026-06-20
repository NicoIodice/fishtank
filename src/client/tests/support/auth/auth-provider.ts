import type { AuthProvider } from "@seontechnologies/playwright-utils/auth-session";

const API_URL = process.env.API_URL ?? "http://localhost:5000";

/**
 * Fishtank auth provider for playwright-utils auth-session.
 *
 * Fishtank issues JWTs as httpOnly cookies. For API-only test contexts this
 * provider extracts the raw Set-Cookie string so it can be forwarded via the
 * Cookie header. Browser tests use storageState instead (see global-setup.ts).
 */
export const fishtankAuthProvider: AuthProvider = {
  async getToken(userIdentifier = "default"): Promise<string> {
    const credentials = resolveCredentials(userIdentifier);

    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      throw new Error(
        `Auth failed for "${userIdentifier}": HTTP ${response.status}`,
      );
    }

    const cookie = response.headers.get("set-cookie");
    if (!cookie) {
      throw new Error(
        `Auth failed for "${userIdentifier}": no Set-Cookie header in response`,
      );
    }

    return cookie;
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
