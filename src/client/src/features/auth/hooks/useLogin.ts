import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { LoginRequest, LoginResponse } from "../types/auth";

export function useLogin() {
  const qc = useQueryClient();

  return useMutation<LoginResponse, Error, LoginRequest>({
    mutationFn: (req) =>
      apiFetch<LoginResponse>("/api/auth/login", {
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
