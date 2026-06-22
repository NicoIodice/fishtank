import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { ChangePasswordRequest } from "../types/auth";

export function useChangePassword() {
  const qc = useQueryClient();

  return useMutation<null, Error, ChangePasswordRequest>({
    mutationFn: (req) =>
      apiFetch<null>("/api/auth/change-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
        redirectOn401: false,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["auth", "me"] });
    },
  });
}
