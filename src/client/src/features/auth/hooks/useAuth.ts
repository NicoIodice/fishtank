import { useQuery } from "@tanstack/react-query";
import { apiFetch, ApiError } from "@/lib/api";
import type { AuthUser } from "../types/auth";

export function useAuth() {
  const {
    data: user,
    isLoading,
    isFetching,
  } = useQuery<AuthUser | null>({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      try {
        // redirectOn401: false — let ProtectedRoute handle the soft redirect
        // so React Router preserves state.from for redirect-back after login
        return await apiFetch<AuthUser>("/api/auth/me", {
          redirectOn401: false,
        });
      } catch (err) {
        if (err instanceof ApiError && err.code === "AUTH_UNAUTHORIZED") {
          return null;
        }
        throw err;
      }
    },
    staleTime: 30_000,
    retry: false,
  });

  return {
    user: user ?? null,
    // Treat a background refetch as loading only when we have no user yet
    // (prevents premature redirect to /login after invalidation on login)
    isLoading: isLoading || (isFetching && !user),
    isAuthenticated: !!user,
  };
}
