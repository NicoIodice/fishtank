import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

interface AppSettings {
  mocksHostPath: string;
  captureFullHeaders: boolean;
}

export const APP_SETTINGS_QUERY_KEY = ["app-settings"] as const;

export function useAppSettings() {
  return useQuery<AppSettings>({
    queryKey: APP_SETTINGS_QUERY_KEY,
    queryFn: () => apiFetch<AppSettings>("/api/settings"),
    staleTime: Infinity,
  });
}
