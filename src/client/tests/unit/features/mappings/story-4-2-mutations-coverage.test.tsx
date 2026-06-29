/**
 * Coverage-gap tests — Story 4.2: useMappingMutations.ts
 * Targets uncovered paths in hooks/useMappingMutations.ts:
 *   - useCreateFile onSuccess (invalidates tree)
 *   - useCreateFile onError
 *   - useDuplicateFile 409 retry logic (MAPPING_FILE_EXISTS)
 *   - makeCopyPath (various patterns)
 *   - fetchFileContent
 */

import { describe, it, expect, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

import {
  useCreateFile,
  useDuplicateFile,
  useRenameFile,
  fetchFileContent,
  makeCopyPath,
} from "@/features/mappings/hooks/useMappingMutations";
import { ApiError } from "@/lib/api";
import { server } from "@/test/mocks/server";
import { http, HttpResponse } from "msw";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeQc() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = makeQc();
  return (
    <MemoryRouter>
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    </MemoryRouter>
  );
}

// ─── makeCopyPath unit tests ───────────────────────────────────────────────────

describe("makeCopyPath — pure utility function", () => {
  it("returns {basename}_copy{ext} for attempt=0 (default)", () => {
    expect(makeCopyPath("svc/mappings/foo.json")).toBe(
      "svc/mappings/foo_copy.json",
    );
  });

  it("returns {basename}_copy_2{ext} for attempt=1", () => {
    expect(makeCopyPath("svc/mappings/foo.json", 1)).toBe(
      "svc/mappings/foo_copy_2.json",
    );
  });

  it("returns {basename}_copy_3{ext} for attempt=2", () => {
    expect(makeCopyPath("svc/mappings/foo.json", 2)).toBe(
      "svc/mappings/foo_copy_3.json",
    );
  });

  it("handles filenames without extensions", () => {
    expect(makeCopyPath("svc/mappings/foo", 0)).toBe("svc/mappings/foo_copy");
  });

  it("handles filenames at the root (no directory)", () => {
    expect(makeCopyPath("foo.json", 0)).toBe("foo_copy.json");
  });

  it("handles deeply nested paths", () => {
    expect(makeCopyPath("a/b/c/deep.json", 0)).toBe("a/b/c/deep_copy.json");
  });

  it("handles attempt=0 explicit (same as default)", () => {
    expect(makeCopyPath("svc/mappings/test.json", 0)).toBe(
      "svc/mappings/test_copy.json",
    );
  });
});

// ─── fetchFileContent ─────────────────────────────────────────────────────────

describe("fetchFileContent", () => {
  it("returns parsed FileContent data from GET /api/mappings/{path}", async () => {
    server.use(
      http.get("/api/mappings/*", () =>
        HttpResponse.json({
          success: true,
          data: {
            content: '{"request":{},"response":{}}',
            name: "test.json",
            path: "svc/mappings/test.json",
            lastModified: "2026-06-28T14:00:00.000Z",
            sizeBytes: 26,
          },
        }),
      ),
    );

    const result = await fetchFileContent("svc/mappings/test.json");
    expect(result.name).toBe("test.json");
    expect(result.content).toBe('{"request":{},"response":{}}');
  });

  it("throws ApiError on 404", async () => {
    server.use(
      http.get("/api/mappings/*", () =>
        HttpResponse.json(
          {
            success: false,
            error: { code: "MAPPING_FILE_NOT_FOUND", message: "File not found" },
          },
          { status: 404 },
        ),
      ),
    );

    await expect(fetchFileContent("svc/mappings/missing.json")).rejects.toThrow(
      ApiError,
    );
  });
});

// ─── useCreateFile ────────────────────────────────────────────────────────────

describe("useCreateFile", () => {
  it("calls onSuccess with FileMetadata after successful POST", async () => {
    const onSuccess = vi.fn();

    server.use(
      http.post("/api/mappings", () =>
        HttpResponse.json(
          {
            success: true,
            data: {
              name: "new-file.json",
              path: "svc/mappings/new-file.json",
              lastModified: "2026-06-28T15:00:00.000Z",
              sizeBytes: 42,
            },
          },
          { status: 201 },
        ),
      ),
    );

    const { result } = renderHook(() => useCreateFile({ onSuccess }), {
      wrapper,
    });

    act(() => {
      result.current.mutate({
        path: "svc/mappings/new-file.json",
        content: "{}",
      });
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ name: "new-file.json" }),
      );
    });
  });

  it("calls onError with ApiError on 409 MAPPING_FILE_EXISTS", async () => {
    const onError = vi.fn();

    server.use(
      http.post("/api/mappings", () =>
        HttpResponse.json(
          {
            success: false,
            error: {
              code: "MAPPING_FILE_EXISTS",
              message: "File already exists",
            },
          },
          { status: 409 },
        ),
      ),
    );

    const { result } = renderHook(() => useCreateFile({ onError }), {
      wrapper,
    });

    act(() => {
      result.current.mutate({
        path: "svc/mappings/existing.json",
        content: "{}",
      });
    });

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(expect.any(ApiError));
    });
  });

  it("calls onError with generic error on network failure", async () => {
    const onError = vi.fn();

    server.use(
      http.post("/api/mappings", () => HttpResponse.error()),
    );

    const { result } = renderHook(() => useCreateFile({ onError }), {
      wrapper,
    });

    act(() => {
      result.current.mutate({
        path: "svc/mappings/net-fail.json",
        content: "{}",
      });
    });

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});

// ─── useDuplicateFile — 409 retry logic ───────────────────────────────────────

describe("useDuplicateFile — 409 retry", () => {
  it("retries with _copy_2 suffix on first 409, succeeds on second attempt", async () => {
    const onSuccess = vi.fn();
    const postAttempts: string[] = [];

    server.use(
      http.post("/api/mappings", async ({ request }) => {
        const body = (await request.json()) as { path: string; content: string };
        postAttempts.push(body.path);

        if (body.path.endsWith("_copy.json")) {
          // First attempt: fail with 409
          return HttpResponse.json(
            {
              success: false,
              error: { code: "MAPPING_FILE_EXISTS", message: "Exists" },
            },
            { status: 409 },
          );
        }
        // Second attempt (_copy_2): succeed
        return HttpResponse.json(
          {
            success: true,
            data: {
              name: "foo_copy_2.json",
              path: body.path,
              lastModified: new Date().toISOString(),
              sizeBytes: 10,
            },
          },
          { status: 201 },
        );
      }),
    );

    const { result } = renderHook(
      () => useDuplicateFile({ onSuccess }),
      { wrapper },
    );

    act(() => {
      result.current.mutate({
        srcPath: "svc/mappings/foo.json",
        dstPath: "svc/mappings/foo_copy.json",
        content: "{}",
      });
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });

    expect(postAttempts).toContain("svc/mappings/foo_copy.json");
    expect(postAttempts).toContain("svc/mappings/foo_copy_2.json");
  });

  it("calls onError when max retries exceeded (non-MAPPING_FILE_EXISTS error)", async () => {
    const onError = vi.fn();

    server.use(
      http.post("/api/mappings", () =>
        HttpResponse.json(
          {
            success: false,
            error: { code: "MAPPING_WRITE_FAILED", message: "Write failed" },
          },
          { status: 500 },
        ),
      ),
    );

    const { result } = renderHook(
      () => useDuplicateFile({ onError }),
      { wrapper },
    );

    act(() => {
      result.current.mutate({
        srcPath: "svc/mappings/foo.json",
        dstPath: "svc/mappings/foo_copy.json",
        content: "{}",
      });
    });

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(expect.any(ApiError));
    });
  });
});

// ─── useRenameFile ─────────────────────────────────────────────────────────────

describe("useRenameFile", () => {
  it("calls onSuccess after POST new path + DELETE old path both succeed", async () => {
    const onSuccess = vi.fn();
    let postCalled = false;
    let deleteCalled = false;

    server.use(
      http.post("/api/mappings", () => {
        postCalled = true;
        return HttpResponse.json(
          {
            success: true,
            data: {
              name: "renamed.json",
              path: "svc/mappings/renamed.json",
              lastModified: new Date().toISOString(),
              sizeBytes: 10,
            },
          },
          { status: 201 },
        );
      }),
      http.delete("/api/mappings/*", () => {
        deleteCalled = true;
        return HttpResponse.json({ success: true, data: null });
      }),
    );

    const { result } = renderHook(() => useRenameFile({ onSuccess }), {
      wrapper,
    });

    act(() => {
      result.current.mutate({
        oldPath: "svc/mappings/original.json",
        newPath: "svc/mappings/renamed.json",
        content: "{}",
      });
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });

    expect(postCalled).toBe(true);
    expect(deleteCalled).toBe(true);
  });

  it("calls onError when POST fails (does not attempt DELETE)", async () => {
    const onError = vi.fn();
    let deleteCalled = false;

    server.use(
      http.post("/api/mappings", () =>
        HttpResponse.json(
          {
            success: false,
            error: { code: "MAPPING_FILE_EXISTS", message: "Exists" },
          },
          { status: 409 },
        ),
      ),
      http.delete("/api/mappings/*", () => {
        deleteCalled = true;
        return HttpResponse.json({ success: true, data: null });
      }),
    );

    const { result } = renderHook(() => useRenameFile({ onError }), {
      wrapper,
    });

    act(() => {
      result.current.mutate({
        oldPath: "svc/mappings/original.json",
        newPath: "svc/mappings/taken.json",
        content: "{}",
      });
    });

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(expect.any(ApiError));
    });

    expect(deleteCalled).toBe(false);
  });
});
