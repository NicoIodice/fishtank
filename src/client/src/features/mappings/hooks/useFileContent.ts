import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { FileContent } from "../types/mappings";

/**
 * React Query hook to fetch a single file's content.
 * Returns content + lastModified for the editor's lastKnownModified (AC-5).
 */
export function useFileContent(path: string | null) {
  return useQuery({
    queryKey: ["mappings-file", path],
    queryFn: () => apiFetch<FileContent>(`/api/mappings/${path}`),
    enabled: path !== null,
  });
}
