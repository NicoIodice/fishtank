import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { ServiceCacheEntry } from "../types/cache";

export const SERVICE_CACHE_QUERY_KEY = ["service-caches"] as const;

export function useServiceCaches() {
  return useQuery({
    queryKey: SERVICE_CACHE_QUERY_KEY,
    queryFn: () => apiFetch<ServiceCacheEntry[]>("/api/cache"),
  });
}

export function useClearCache() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (serviceId: string) =>
      apiFetch<null>("/api/cache/" + serviceId, { method: "DELETE" }),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: SERVICE_CACHE_QUERY_KEY }),
  });
}

export function useClearAllCaches() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<null>("/api/cache", { method: "DELETE" }),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: SERVICE_CACHE_QUERY_KEY }),
  });
}
