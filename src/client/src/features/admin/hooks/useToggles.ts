import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { FeatureToggle, SetToggleRequest } from "../types";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: { code: string; message: string };
}

async function fetchToggles(): Promise<FeatureToggle[]> {
  const response = await fetch("/api/admin/toggles", {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch toggles: ${response.statusText}`);
  }

  const json: ApiResponse<FeatureToggle[]> = await response.json();
  if (!json.success) {
    throw new Error(json.error?.message || "Failed to fetch toggles");
  }

  return json.data;
}

async function setToggle(name: string, request: SetToggleRequest): Promise<FeatureToggle> {
  const response = await fetch(`/api/admin/toggles/${encodeURIComponent(name)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const json: ApiResponse<never> = await response.json();
    throw new Error(json.error?.message || `Failed to set toggle: ${response.statusText}`);
  }

  const json: ApiResponse<FeatureToggle> = await response.json();
  if (!json.success) {
    throw new Error(json.error?.message || "Failed to set toggle");
  }

  return json.data;
}

export function useToggles() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["toggles"],
    queryFn: fetchToggles,
  });

  const mutation = useMutation({
    mutationFn: ({ name, enabled }: { name: string; enabled: boolean }) =>
      setToggle(name, { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["toggles"] });
    },
  });

  return {
    toggles: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    setToggle: mutation.mutate,
    isSettingToggle: mutation.isPending,
  };
}
