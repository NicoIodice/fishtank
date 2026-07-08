import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, ApiError } from "@/lib/api";

/** Minimal file info returned by POST /api/mappings. */
interface SavedFileInfo {
  name: string;
  path: string;
  lastModified: string;
  sizeBytes: number;
}

interface SaveAsMockArgs {
  serviceSlug: string;
  mappingFilename: string;
  mappingContent: string;
  responseFilename: string;
  responseContent: string;
}

interface SaveAsMockResult {
  mappingFile: SavedFileInfo;
  responseFile: SavedFileInfo;
}

/**
 * useSaveAsMock: React Query mutation hook to save a proxied request as a WireMock mapping.
 * 
 * Performs two POST calls to /api/mappings:
 * 1. Create mapping file: {serviceSlug}/mappings/{mappingFilename}
 * 2. Create response file: {serviceSlug}/responses/{responseFilename}
 * 
 * On success:
 * - Invalidates ["mappings"] query to refresh the folder tree
 * - Returns both file metadata objects
 * 
 * On failure:
 * - Throws ApiError with code and message
 * - Backend creates System Event entry (handled by Story 4.1)
 */
export function useSaveAsMock(options?: {
  onSuccess?: (data: SaveAsMockResult) => void;
  onError?: (err: ApiError) => void;
}) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      serviceSlug,
      mappingFilename,
      mappingContent,
      responseFilename,
      responseContent,
    }: SaveAsMockArgs): Promise<SaveAsMockResult> => {
      // Step 1: Create mapping file
      const mappingPath = `${serviceSlug}/mappings/${mappingFilename}`;
      const mappingFile = await apiFetch<SavedFileInfo>("/api/mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: mappingPath, content: mappingContent }),
      });

      // Step 2: Create response file (only after mapping succeeds)
      const responsePath = `${serviceSlug}/responses/${responseFilename}`;
      const responseFile = await apiFetch<SavedFileInfo>("/api/mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: responsePath, content: responseContent }),
      });

      return { mappingFile, responseFile };
    },
    onSuccess: (data) => {
      // Invalidate mappings query to refresh folder tree
      void qc.invalidateQueries({ queryKey: ["mappings"] });
      options?.onSuccess?.(data);
    },
    onError: (err: Error) => {
      // Cast to ApiError if it is one, otherwise wrap in generic error
      const apiError =
        err instanceof ApiError ? err : new ApiError("UNKNOWN_ERROR", err.message);
      options?.onError?.(apiError);
    },
  });
}
