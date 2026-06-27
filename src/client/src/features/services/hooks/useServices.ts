import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useShowToast } from "@/lib/ToastContext";
import type {
  Service,
  CreateServicePayload,
  UpdateServicePayload,
} from "../types/service";

export const SERVICES_QUERY_KEY = ["services"] as const;

export function useServices() {
  return useQuery<Service[]>({
    queryKey: SERVICES_QUERY_KEY,
    queryFn: () => apiFetch<Service[]>("/api/services"),
  });
}

export function useNextPort() {
  return useQuery<number>({
    queryKey: ["services", "next-port"],
    queryFn: async () => {
      const { port } = await apiFetch<{ port: number }>(
        "/api/services/next-port",
      );
      return port;
    },
    staleTime: 0,
  });
}

export function useCreateService() {
  const qc = useQueryClient();

  return useMutation<Service, Error, CreateServicePayload>({
    mutationFn: (payload) =>
      apiFetch<Service>("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SERVICES_QUERY_KEY });
    },
  });
}

export function useUpdateService() {
  const qc = useQueryClient();

  return useMutation<
    Service,
    Error,
    { id: string; payload: UpdateServicePayload }
  >({
    mutationFn: ({ id, payload }) =>
      apiFetch<Service>(`/api/services/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SERVICES_QUERY_KEY });
    },
  });
}

export function useToggleService() {
  const qc = useQueryClient();
  const showToast = useShowToast();

  return useMutation<
    Service,
    Error,
    { id: string; action: "start" | "stop" },
    { previous?: Service[] }
  >({
    mutationFn: ({ id, action }) =>
      apiFetch<Service>(`/api/services/${id}/${action}`, {
        method: "POST",
      }),

    onMutate: async ({ id, action }) => {
      // Cancel in-flight refetches so they don't overwrite the optimistic update
      await qc.cancelQueries({ queryKey: SERVICES_QUERY_KEY });

      // Snapshot current cache for rollback on error
      const previous = qc.getQueryData<Service[]>(SERVICES_QUERY_KEY);

      // Optimistically flip isActive — status pill (service.status) is NOT changed yet
      qc.setQueryData<Service[]>(
        SERVICES_QUERY_KEY,
        (old) =>
          old?.map((s) =>
            s.id === id ? { ...s, isActive: action === "start" } : s,
          ) ?? [],
      );

      return { previous };
    },

    onError: (_err, _vars, context) => {
      // Revert the optimistic update on failure
      if (context?.previous) {
        qc.setQueryData(SERVICES_QUERY_KEY, context.previous);
      }
      showToast("Failed to update service status. Please try again.", "error");
    },

    onSettled: () => {
      // Always re-sync from server — idempotent if hub event already invalidated
      void qc.invalidateQueries({ queryKey: SERVICES_QUERY_KEY });
    },
  });
}
