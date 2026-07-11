import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { HealthDto } from "../types";

export function useHealth() {
  return useQuery({
    queryKey: ["admin", "health"],
    queryFn: () => apiFetch<HealthDto>("/api/admin/health"),
    refetchInterval: 30_000,
  });
}
