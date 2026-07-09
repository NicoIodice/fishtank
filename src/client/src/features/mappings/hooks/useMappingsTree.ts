import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { FolderTree } from "../types/mappings";

export const MAPPINGS_QUERY_KEY = ["mappings"] as const;

/**
 * React Query hook to fetch the full folder tree.
 * Uses React Query isLoading/isFetching — never useState for loading state.
 */
export function useMappingsTree() {
  return useQuery({
    queryKey: MAPPINGS_QUERY_KEY,
    queryFn: () => apiFetch<FolderTree>("/api/mappings"),
  });
}
