import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { ResyncResultDto } from "../types/mappings";

/**
 * React Query mutation hook for POST /api/resync.
 *
 * On success resolves with ResyncResultDto and invalidates the ["mappings"] query
 * so the folder tree refetches automatically.
 * On error (e.g. 409 RESYNC_IN_PROGRESS, network error) throws ApiError.
 */
export function useResync() {
  const queryClient = useQueryClient();
  return useMutation<ResyncResultDto, Error>({
    mutationFn: () =>
      apiFetch<ResyncResultDto>("/api/resync", { method: "POST" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["mappings"] });
    },
  });
}
