import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { SetupRequest, LoginResponse } from "../types/auth";

export function useSetup() {
  const qc = useQueryClient();

  return useMutation<LoginResponse, Error, SetupRequest>({
    mutationFn: (req) =>
      apiFetch<LoginResponse>("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
        redirectOn401: false,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["auth", "me"] });
      void qc.invalidateQueries({ queryKey: ["setup-status"] });
    },
  });
}
