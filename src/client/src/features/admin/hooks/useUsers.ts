/**
 * React Query hooks for user management.
 * Provides data fetching, creation, and deactivation mutations.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { User, CreateUserRequest } from "../types/user";

/**
 * Fetches all users (Admin only).
 * Requires authentication with Admin role.
 */
export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const data = await apiFetch<User[]>('/api/users');
      return data ?? [];
    },
  });
}

/**
 * Creates a new Standard User account.
 * Requires authentication with Admin role.
 */
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateUserRequest) =>
      apiFetch<User>("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

/**
 * Deactivates a user account.
 * Requires authentication with Admin role.
 * Prevents deactivating the last active admin.
 */
export function useDeactivateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) =>
      apiFetch<User>(`/api/users/${userId}/deactivate`, { method: "PUT" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
