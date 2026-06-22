import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
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
    queryFn: () => apiFetch<number>("/api/services/next-port"),
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

  return useMutation<Service, Error, { id: string; action: "start" | "stop" }>({
    mutationFn: ({ id, action }) =>
      apiFetch<Service>(`/api/services/${id}/${action}`, {
        method: "POST",
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SERVICES_QUERY_KEY });
    },
  });
}
