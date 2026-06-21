import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useAuth", () => {
  it("returns user data on successful /api/auth/me", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            username: "admin",
            role: "Admin",
            forcePasswordChange: false,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.user).toEqual({
      username: "admin",
      role: "Admin",
      forcePasswordChange: false,
    });
    expect(result.current.isAuthenticated).toBe(true);
  });

  it("returns null user on 401 (not authenticated)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: { code: "AUTH_UNAUTHORIZED", message: "Not authenticated" },
        }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      ),
    );

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("does NOT redirect to /login on 401 (uses redirectOn401:false)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: { code: "AUTH_UNAUTHORIZED", message: "Not authenticated" },
        }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      ),
    );

    let redirectFired = false;
    const original = window.location;
    Object.defineProperty(window, "location", {
      value: {
        ...original,
        set href(_: string) {
          redirectFired = true;
        },
      },
      writable: true,
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(redirectFired).toBe(false);
    Object.defineProperty(window, "location", {
      value: original,
      writable: true,
    });
  });

  it("isLoading is true while fetching", () => {
    let resolveFetch!: (v: Response) => void;
    vi.spyOn(globalThis, "fetch").mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      }),
    );

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
    // Avoid dangling promise — resolve it
    resolveFetch(
      new Response(JSON.stringify({ success: true, data: null }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  it("treats non-401 errors as thrown (query enters error state)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("<html>Bad Gateway</html>", {
        status: 502,
        headers: { "Content-Type": "text/html" },
      }),
    );

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // On non-401 error: query enters error state; user defaults to null via `user ?? null`
    expect(result.current.user).toBeNull();
  });
});
