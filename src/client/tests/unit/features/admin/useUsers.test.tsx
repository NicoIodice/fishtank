import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { ReactNode } from "react";

/**
 * Hook tests for useUsers, useCreateUser, useDeactivateUser
 * Story 5-2: User Management — Create, View & Deactivate
 *
 * Coverage:
 * - useUsers: fetches and returns user list
 * - useCreateUser: creates new Standard User account
 * - useDeactivateUser: deactivates user and invalidates queries
 * - Error handling for all hooks
 */

const mockUsers = [
  {
    id: "user-1",
    username: "alice",
    role: "StandardUser",
    isActive: true,
    createdAt: "2026-01-15T10:00:00Z",
  },
  {
    id: "user-2",
    username: "bob",
    role: "Admin",
    isActive: true,
    createdAt: "2026-01-10T12:00:00Z",
  },
];

const server = setupServer(
  http.get("/api/users", () => {
    return HttpResponse.json({ success: true, data: mockUsers });
  }),
  http.post("/api/users", async ({ request }) => {
    const body = (await request.json()) as {
      username: string;
      password: string;
    };
    return HttpResponse.json({
      success: true,
      data: {
        id: "new-user-id",
        username: body.username,
        role: "StandardUser",
        isActive: true,
        createdAt: new Date().toISOString(),
      },
    });
  }),
  http.put("/api/users/:userId/deactivate", ({ params }) => {
    const { userId } = params;
    return HttpResponse.json({
      success: true,
      data: {
        id: userId,
        username: "alice",
        role: "StandardUser",
        isActive: false,
        createdAt: "2026-01-15T10:00:00Z",
      },
    });
  }),
);

beforeEach(() => {
  server.listen();
  vi.clearAllMocks();
});

afterEach(() => {
  server.close();
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useUsers", () => {
  it("fetches and returns user list", async () => {
    const { useUsers } =
      await import("../../../../src/features/admin/hooks/useUsers");

    const { result } = renderHook(() => useUsers(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockUsers);
    expect(result.current.error).toBeNull();
  });

  it("returns empty array as default when no data", async () => {
    server.use(
      http.get("/api/users", () => {
        return HttpResponse.json({ success: true, data: null });
      }),
    );

    const { useUsers } =
      await import("../../../../src/features/admin/hooks/useUsers");

    const { result } = renderHook(() => useUsers(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Hook provides [] as default via `data: users = []`
    expect(result.current.data).toEqual([]);
  });

  it("handles error when fetch fails", async () => {
    server.use(
      http.get("/api/users", () => {
        return HttpResponse.json(
          {
            success: false,
            error: { code: "AUTH_FORBIDDEN", message: "Access denied" },
          },
          { status: 403 },
        );
      }),
    );

    const { useUsers } =
      await import("../../../../src/features/admin/hooks/useUsers");

    const { result } = renderHook(() => useUsers(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.error?.message).toContain("Access denied");
  });
});

describe("useCreateUser", () => {
  it("creates new user with correct payload", async () => {
    const { useCreateUser } =
      await import("../../../../src/features/admin/hooks/useUsers");

    const { result } = renderHook(() => useCreateUser(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      username: "newuser",
      password: "securePassword123",
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toMatchObject({
      username: "newuser",
      role: "StandardUser",
      isActive: true,
    });
  });

  it("invalidates users query after successful creation", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { useCreateUser } =
      await import("../../../../src/features/admin/hooks/useUsers");

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useCreateUser(), { wrapper });

    result.current.mutate({
      username: "newuser",
      password: "securePassword123",
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["users"] });
  });

  it("handles error when username already exists (409)", async () => {
    server.use(
      http.post("/api/users", () => {
        return HttpResponse.json(
          {
            success: false,
            error: {
              code: "AUTH_USERNAME_EXISTS",
              message: "A user with this username already exists.",
            },
          },
          { status: 409 },
        );
      }),
    );

    const { useCreateUser } =
      await import("../../../../src/features/admin/hooks/useUsers");

    const { result } = renderHook(() => useCreateUser(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      username: "duplicate",
      password: "securePassword123",
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toContain("already exists");
  });

  it("handles validation error for password length", async () => {
    server.use(
      http.post("/api/users", () => {
        return HttpResponse.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Password must be at least 12 characters.",
            },
          },
          { status: 400 },
        );
      }),
    );

    const { useCreateUser } =
      await import("../../../../src/features/admin/hooks/useUsers");

    const { result } = renderHook(() => useCreateUser(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      username: "newuser",
      password: "short",
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toContain("12 characters");
  });
});

describe("useDeactivateUser", () => {
  it("deactivates user successfully", async () => {
    const { useDeactivateUser } =
      await import("../../../../src/features/admin/hooks/useUsers");

    const { result } = renderHook(() => useDeactivateUser(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("user-1");

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toMatchObject({
      id: "user-1",
      isActive: false,
    });
  });

  it("invalidates users query after successful deactivation", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { useDeactivateUser } =
      await import("../../../../src/features/admin/hooks/useUsers");

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useDeactivateUser(), { wrapper });

    result.current.mutate("user-1");

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["users"] });
  });

  it("handles last admin guard error (409)", async () => {
    server.use(
      http.put("/api/users/:userId/deactivate", () => {
        return HttpResponse.json(
          {
            success: false,
            error: {
              code: "ADMIN_LAST_ADMIN_DEACTIVATE",
              message: "Cannot deactivate the last active administrator.",
            },
          },
          { status: 409 },
        );
      }),
    );

    const { useDeactivateUser } =
      await import("../../../../src/features/admin/hooks/useUsers");

    const { result } = renderHook(() => useDeactivateUser(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("last-admin-id");

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toContain(
      "last active administrator",
    );
  });

  it("handles user not found error (404)", async () => {
    server.use(
      http.put("/api/users/:userId/deactivate", () => {
        return HttpResponse.json(
          {
            success: false,
            error: {
              code: "USER_NOT_FOUND",
              message: "User not found.",
            },
          },
          { status: 404 },
        );
      }),
    );

    const { useDeactivateUser } =
      await import("../../../../src/features/admin/hooks/useUsers");

    const { result } = renderHook(() => useDeactivateUser(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("nonexistent-id");

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toContain("not found");
  });
});
