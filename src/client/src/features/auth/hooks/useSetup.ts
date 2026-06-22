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
      // Write the new value directly so FirstRunGate does not redirect back to
      // /setup before a background refetch completes (stale-while-revalidate
      // would otherwise serve the old needsSetup:true during the gap between
      // navigate() and the refetch response).
      qc.setQueryData(["setup-status"], { needsSetup: false });
      void qc.invalidateQueries({ queryKey: ["auth", "me"] });
    },
  });
}
