import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useLogin } from "@/features/auth/hooks/useLogin";
import { useSetup } from "@/features/auth/hooks/useSetup";
import { useChangePassword } from "@/features/auth/hooks/useChangePassword";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

function fetchOk(data: unknown) {
  return vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ),
  );
}

function fetchErr(code: string, message: string) {
  return vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({ success: false, error: { code, message } }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    ),
  );
}

afterEach(() => vi.restoreAllMocks());

// ─── useLogin ─────────────────────────────────────────────────────────────────

describe("useLogin", () => {
  it("calls POST /api/auth/login with credentials", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(fetchOk({ token: "abc" }));
    const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ username: "admin", password: "s3cr3t" });
    });

    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/auth/login");
    expect((init as RequestInit).method).toBe("POST");
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ username: "admin", password: "s3cr3t" });
  });

  it("rejects on API error", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      fetchErr("AUTH_INVALID_CREDENTIALS", "Bad credentials"),
    );
    const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });

    await expect(
      act(async () => {
        await result.current.mutateAsync({ username: "admin", password: "wrong" });
      }),
    ).rejects.toThrow();
  });
});

// ─── useSetup ─────────────────────────────────────────────────────────────────

describe("useSetup", () => {
  it("calls POST /api/auth/setup and writes setup-status to cache on success", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(fetchOk({ token: "abc" }));
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const Wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useSetup(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ username: "admin", password: "newp@ssw0rd!!" });
    });

    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/auth/setup");
    expect((init as RequestInit).method).toBe("POST");

    // onSuccess should have written needsSetup:false to cache
    expect(qc.getQueryData(["setup-status"])).toEqual({ needsSetup: false });
  });
});

// ─── useChangePassword ────────────────────────────────────────────────────────

describe("useChangePassword", () => {
  it("calls PUT /api/auth/change-password with current and new passwords", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(fetchOk(null));
    const { result } = renderHook(() => useChangePassword(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ currentPassword: "oldPass1!", newPassword: "newPass1!2345" });
    });

    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/auth/change-password");
    expect((init as RequestInit).method).toBe("PUT");
    expect(JSON.parse((init as RequestInit).body as string)).toMatchObject({
      currentPassword: "oldPass1!",
      newPassword: "newPass1!2345",
    });
  });

  it("rejects when the API returns an error", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      fetchErr("AUTH_INVALID_CREDENTIALS", "Wrong current password"),
    );
    const { result } = renderHook(() => useChangePassword(), { wrapper: createWrapper() });

    await expect(
      act(async () => {
        await result.current.mutateAsync({ currentPassword: "bad", newPassword: "newPass1!2345" });
      }),
    ).rejects.toThrow();
  });
});
