import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, ApiError } from "@/lib/api";
import type { FileMetadata, FileContent } from "../types/mappings";
import { MAPPINGS_QUERY_KEY } from "./useMappingsTree";

/**
 * Encode a full file path for safe use as a single URL segment. The entire
 * path (including "/" separators) is percent-encoded so it occupies one route
 * parameter. The backend decodes and validates via SanitizePath.
 */
export function encodePath(path: string): string {
  return encodeURIComponent(path);
}

interface SaveExistingArgs {
  path: string;
  content: string;
  lastKnownModified: string;
}

interface CreateNewArgs {
  path: string;
  content: string;
}

interface DeleteArgs {
  path: string;
}

interface RenameArgs {
  oldPath: string;
  newPath: string;
  content: string;
}

interface DuplicateArgs {
  srcPath: string;
  dstPath: string;
  content: string;
}

/** useMutation for saving an existing file (PUT). Invalidates tree on success. */
export function useSaveExisting(options?: {
  onSuccess?: (data: FileMetadata) => void;
  onError?: (err: Error) => void;
}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ path, content, lastKnownModified }: SaveExistingArgs) =>
      apiFetch<FileMetadata>(`/api/mappings/${encodePath(path)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, lastKnownModified }),
      }),
    onSuccess: (data) => {
      // Invalidate tree only in mutation onSuccess (per anti-pattern rules)
      void qc.invalidateQueries({ queryKey: MAPPINGS_QUERY_KEY });
      options?.onSuccess?.(data);
    },
    onError: (err: Error) => {
      options?.onError?.(err);
    },
  });
}

/** useMutation for creating a new file (POST). */
export function useCreateFile(options?: {
  onSuccess?: (data: FileMetadata) => void;
  onError?: (err: Error) => void;
}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ path, content }: CreateNewArgs) =>
      apiFetch<FileMetadata>("/api/mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, content }),
      }),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: MAPPINGS_QUERY_KEY });
      options?.onSuccess?.(data);
    },
    onError: (err: Error) => {
      options?.onError?.(err);
    },
  });
}

/** useMutation for deleting a file (DELETE). */
export function useDeleteFile(options?: {
  onSuccess?: () => void;
  onError?: (err: Error) => void;
}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ path }: DeleteArgs) =>
      apiFetch<null>(`/api/mappings/${encodePath(path)}`, { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: MAPPINGS_QUERY_KEY });
      options?.onSuccess?.();
    },
    onError: (err: Error) => {
      options?.onError?.(err);
    },
  });
}

/**
 * Rename: GET content → POST to new path → DELETE old path.
 * Only DELETE after POST succeeds (safe: never destroys data on partial failure).
 */
export function useRenameFile(options?: {
  onSuccess?: () => void;
  onError?: (err: Error) => void;
}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ oldPath, newPath, content }: RenameArgs) => {
      // POST to new path
      await apiFetch<FileMetadata>("/api/mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: newPath, content }),
      });
      // DELETE old path only after POST succeeds
      await apiFetch<null>(`/api/mappings/${encodePath(oldPath)}`, { method: "DELETE" });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: MAPPINGS_QUERY_KEY });
      options?.onSuccess?.();
    },
    onError: (err: Error) => {
      options?.onError?.(err);
    },
  });
}

/** Maximum number of suffix increments to attempt before surfacing an error. */
const MAX_DUPLICATE_RETRIES = 50;

/**
 * Duplicate: POST to new path with _copy suffix; on 409 MAPPING_FILE_EXISTS,
 * retry with _copy_2, _copy_3, … up to MAX_DUPLICATE_RETRIES (AC-15).
 */
export function useDuplicateFile(options?: {
  onSuccess?: () => void;
  onError?: (err: Error) => void;
}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ srcPath, dstPath, content }: DuplicateArgs) => {
      // dstPath is the initial _copy path; retry with incrementing suffixes on 409
      let attempt = 0;
      let candidatePath = dstPath;
      while (true) {
        try {
          await apiFetch<FileMetadata>("/api/mappings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path: candidatePath, content }),
          });
          return; // success
        } catch (err) {
          if (
            err instanceof ApiError &&
            err.code === "MAPPING_FILE_EXISTS" &&
            attempt < MAX_DUPLICATE_RETRIES
          ) {
            attempt++;
            candidatePath = makeCopyPath(srcPath, attempt);
          } else {
            throw err;
          }
        }
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: MAPPINGS_QUERY_KEY });
      options?.onSuccess?.();
    },
    onError: (err: Error) => {
      options?.onError?.(err);
    },
  });
}

/**
 * Helper to read file content for rename/duplicate operations.
 */
export async function fetchFileContent(path: string): Promise<FileContent> {
  return apiFetch<FileContent>(`/api/mappings/${encodePath(path)}`);
}

/**
 * Compute a suffix-based copy path.
 *   attempt 0 → foo_copy.json  (first duplicate)
 *   attempt 1 → foo_copy_2.json
 *   attempt 2 → foo_copy_3.json
 *   …
 */
export function makeCopyPath(srcPath: string, attempt = 0): string {
  const lastSlash = srcPath.lastIndexOf("/");
  const dir = lastSlash >= 0 ? srcPath.slice(0, lastSlash + 1) : "";
  const filename = lastSlash >= 0 ? srcPath.slice(lastSlash + 1) : srcPath;
  const dotIdx = filename.lastIndexOf(".");
  const suffix = attempt === 0 ? "_copy" : `_copy_${attempt + 1}`;
  if (dotIdx < 0) return `${dir}${filename}${suffix}`;
  const base = filename.slice(0, dotIdx);
  const ext = filename.slice(dotIdx);
  return `${dir}${base}${suffix}${ext}`;
}
