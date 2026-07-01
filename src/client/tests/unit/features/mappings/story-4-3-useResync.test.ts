/**
 * ATDD unit tests — Story 4.3: Resync UI with Toast Feedback & Conflict Banners
 * Layer: Unit (Vitest + renderHook + MSW)
 *
 * RED PHASE — `useResync` does not exist yet.
 * Import will fail until `src/client/src/features/mappings/hooks/useResync.ts` is created.
 *
 * ACs covered:
 *   AC-3  — On success, mutation resolves with ResyncResultDto
 *   AC-6  — 409 RESYNC_IN_PROGRESS → ApiError with code "RESYNC_IN_PROGRESS"
 *   AC-15 — Concurrent Resync returns 409 with RESYNC_IN_PROGRESS code
 */

import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// ─── MSW handler overrides ────────────────────────────────────────────────────
import { server } from "@/test/mocks/server";
import { http, HttpResponse } from "msw";

// ─── Types (not yet created — RED) ───────────────────────────────────────────
// RED: these imports will fail until the files are created
import { useResync } from "@/features/mappings/hooks/useResync";
import type { ResyncResultDto } from "@/features/mappings/types/mappings";

// ─────────────────────────────────────────────────────────────────────────────

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  };
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

const RESYNC_SUCCESS_RESPONSE: ResyncResultDto = {
  mappingsLoaded: 5,
  responsesLoaded: 3,
  elapsedMs: 850,
  conflicts: [],
  failures: [],
};

const RESYNC_PARTIAL_RESPONSE: ResyncResultDto = {
  mappingsLoaded: 3,
  responsesLoaded: 2,
  elapsedMs: 1200,
  conflicts: [],
  failures: [
    { path: "service/mappings/bad-file.json", reason: "Permission denied" },
  ],
};

const RESYNC_ZERO_FILES_RESPONSE: ResyncResultDto = {
  mappingsLoaded: 0,
  responsesLoaded: 0,
  elapsedMs: 45,
  conflicts: [],
  failures: [],
};

// ─────────────────────────────────────────────────────────────────────────────

describe("useResync hook (AC-3, AC-6, AC-15)", () => {
  describe("successful Resync", () => {
    it("mutateAsync resolves with ResyncResultDto on 200 response", async () => {
      server.use(
        http.post("/api/resync", () =>
          HttpResponse.json({ success: true, data: RESYNC_SUCCESS_RESPONSE }),
        ),
      );

      const { result } = renderHook(() => useResync(), {
        wrapper: makeWrapper(),
      });

      let data: ResyncResultDto | undefined;
      await waitFor(async () => {
        data = await result.current.mutateAsync();
      });

      expect(data).toEqual(RESYNC_SUCCESS_RESPONSE);
      expect(data?.mappingsLoaded).toBe(5);
      expect(data?.responsesLoaded).toBe(3);
      expect(data?.elapsedMs).toBe(850);
    });

    it("resolves with zero-files result when backend returns 0 loaded (AC-4)", async () => {
      server.use(
        http.post("/api/resync", () =>
          HttpResponse.json({
            success: true,
            data: RESYNC_ZERO_FILES_RESPONSE,
          }),
        ),
      );

      const { result } = renderHook(() => useResync(), {
        wrapper: makeWrapper(),
      });

      let data: ResyncResultDto | undefined;
      await waitFor(async () => {
        data = await result.current.mutateAsync();
      });

      expect(data?.mappingsLoaded).toBe(0);
      expect(data?.responsesLoaded).toBe(0);
    });

    it("resolves with partial result including failures array (AC-7)", async () => {
      server.use(
        http.post("/api/resync", () =>
          HttpResponse.json({ success: true, data: RESYNC_PARTIAL_RESPONSE }),
        ),
      );

      const { result } = renderHook(() => useResync(), {
        wrapper: makeWrapper(),
      });

      let data: ResyncResultDto | undefined;
      await waitFor(async () => {
        data = await result.current.mutateAsync();
      });

      expect(data?.failures).toHaveLength(1);
      expect(data?.failures[0].path).toBe("service/mappings/bad-file.json");
    });
  });

  describe("concurrent Resync → 409 (AC-15)", () => {
    it("throws ApiError with code RESYNC_IN_PROGRESS when backend returns 409", async () => {
      server.use(
        http.post("/api/resync", () =>
          HttpResponse.json(
            {
              success: false,
              error: {
                code: "RESYNC_IN_PROGRESS",
                message: "A resync operation is already in progress.",
              },
            },
            { status: 409 },
          ),
        ),
      );

      const { result } = renderHook(() => useResync(), {
        wrapper: makeWrapper(),
      });

      await waitFor(async () => {
        await expect(result.current.mutateAsync()).rejects.toMatchObject({
          code: "RESYNC_IN_PROGRESS",
        });
      });
    });
  });

  describe("network error (AC-6)", () => {
    it("throws when network is unavailable", async () => {
      server.use(http.post("/api/resync", () => HttpResponse.error()));

      const { result } = renderHook(() => useResync(), {
        wrapper: makeWrapper(),
      });

      await waitFor(async () => {
        await expect(result.current.mutateAsync()).rejects.toThrow();
      });
    });
  });

  describe("hook shape", () => {
    it("exposes mutateAsync, isPending, isError, data properties", () => {
      const { result } = renderHook(() => useResync(), {
        wrapper: makeWrapper(),
      });

      expect(typeof result.current.mutateAsync).toBe("function");
      expect(result.current.isPending).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.data).toBeUndefined();
    });
  });
});
