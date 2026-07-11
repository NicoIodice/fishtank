import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

interface RegistrationStatusDto {
  enabled: boolean;
}

export function useRegistrationStatus() {
  return useQuery({
    queryKey: ["auth", "registration-status"],
    queryFn: () =>
      apiFetch<RegistrationStatusDto>("/api/auth/registration-status", {
        redirectOn401: false,
      }).catch(() => ({ enabled: false })),
    staleTime: 30_000,
  });
}
