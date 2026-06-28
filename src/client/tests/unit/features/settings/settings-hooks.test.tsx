/**
 * Tests for settings hooks.
 * Uses vi.hoisted to create a stable mockApiFetch that survives module resets.
 * beforeAll(vi.resetModules) inside the wrapper describe ensures hooks are
 * freshly imported with this file's mock — not a stale cached version from
 * another test file that also mocks @/lib/api (story-3-2, story-3-3, etc.).
 */
import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// Stable mock function created at hoist time so the factory always returns the
// same fn — even after vi.resetModules() clears and reloads @/lib/api.
const mockApiFetch = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", () => ({
  apiFetch: mockApiFetch,
}));

beforeEach(() => vi.clearAllMocks());

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

// ─── Hook references — populated by beforeAll dynamic imports ─────────────────
// We import hooks dynamically after vi.resetModules() so they resolve @/lib/api
// with this file's mock factory, regardless of file-load-order side-effects.

type UseAppSettings =
  typeof import("@/features/settings/hooks/useAppSettings").useAppSettings;
type UseServiceCaches =
  typeof import("@/features/settings/hooks/useServiceCache").useServiceCaches;
type UseClearCache =
  typeof import("@/features/settings/hooks/useServiceCache").useClearCache;
type UseClearAllCaches =
  typeof import("@/features/settings/hooks/useServiceCache").useClearAllCaches;
type UseActivitySettings =
  typeof import("@/features/settings/hooks/useActivitySettings").useActivitySettings;

let useAppSettings: UseAppSettings;
let useServiceCaches: UseServiceCaches;
let useClearCache: UseClearCache;
let useClearAllCaches: UseClearAllCaches;
let useActivitySettings: UseActivitySettings;

describe("settings hooks", () => {
  beforeAll(async () => {
    // Clear module cache so hooks re-resolve @/lib/api with this file's factory.
    vi.resetModules();
    ({ useAppSettings } =
      await import("@/features/settings/hooks/useAppSettings"));
    ({ useServiceCaches, useClearCache, useClearAllCaches } =
      await import("@/features/settings/hooks/useServiceCache"));
    ({ useActivitySettings } =
      await import("@/features/settings/hooks/useActivitySettings"));
  });

  // ─── useAppSettings ─────────────────────────────────────────────────────────

  describe("useAppSettings", () => {
    it("fetches from /api/settings and returns app settings", async () => {
      mockApiFetch.mockResolvedValueOnce({
        mocksHostPath: "/mocks",
        captureFullHeaders: false,
      });

      const { result } = renderHook(() => useAppSettings(), {
        wrapper: makeWrapper(),
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toMatchObject({
        mocksHostPath: "/mocks",
        captureFullHeaders: false,
      });
    });
  });

  // ─── useServiceCaches ───────────────────────────────────────────────────────

  describe("useServiceCaches", () => {
    it("fetches the list of service caches from /api/cache", async () => {
      mockApiFetch.mockResolvedValueOnce([
        { serviceId: "svc-a", sizeBytes: 512 },
      ]);

      const { result } = renderHook(() => useServiceCaches(), {
        wrapper: makeWrapper(),
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toHaveLength(1);
      expect(result.current.data?.[0]).toMatchObject({ serviceId: "svc-a" });
    });
  });

  // ─── useClearCache ──────────────────────────────────────────────────────────

  describe("useClearCache", () => {
    it("calls DELETE /api/cache/:id on mutate", async () => {
      mockApiFetch.mockResolvedValueOnce(null);

      const { result } = renderHook(() => useClearCache(), {
        wrapper: makeWrapper(),
      });
      result.current.mutate("my-service");

      await waitFor(() => {
        expect(mockApiFetch).toHaveBeenCalledWith(
          "/api/cache/my-service",
          expect.objectContaining({ method: "DELETE" }),
        );
      });
    });
  });

  // ─── useClearAllCaches ──────────────────────────────────────────────────────

  describe("useClearAllCaches", () => {
    it("calls DELETE /api/cache on mutate", async () => {
      mockApiFetch.mockResolvedValueOnce(null);

      const { result } = renderHook(() => useClearAllCaches(), {
        wrapper: makeWrapper(),
      });
      result.current.mutate();

      await waitFor(() => {
        expect(mockApiFetch).toHaveBeenCalledWith(
          "/api/cache",
          expect.objectContaining({ method: "DELETE" }),
        );
      });
    });
  });

  // ─── useActivitySettings (localStorage-based) ───────────────────────────────

  describe("useActivitySettings", () => {
    it("returns default settings when localStorage is empty", () => {
      localStorage.clear();
      const { result } = renderHook(() => useActivitySettings());
      expect(result.current.settings.autoRefreshInterval).toBe(2000);
      expect(result.current.settings.maxEntries).toBe(1000);
    });

    it("updateInterval persists the new interval to localStorage", () => {
      localStorage.clear();
      const { result } = renderHook(() => useActivitySettings());
      result.current.updateInterval(5000);
      const stored = JSON.parse(
        localStorage.getItem("fishtank-activity-settings") ?? "{}",
      );
      expect(stored.autoRefreshInterval).toBe(5000);
    });

    it("updateMaxEntries persists the new max entries to localStorage", () => {
      localStorage.clear();
      const { result } = renderHook(() => useActivitySettings());
      result.current.updateMaxEntries(500);
      const stored = JSON.parse(
        localStorage.getItem("fishtank-activity-settings") ?? "{}",
      );
      expect(stored.maxEntries).toBe(500);
    });

    it("reads existing settings from localStorage on mount", () => {
      localStorage.setItem(
        "fishtank-activity-settings",
        JSON.stringify({ autoRefreshInterval: "disabled", maxEntries: 5000 }),
      );
      const { result } = renderHook(() => useActivitySettings());
      expect(result.current.settings.autoRefreshInterval).toBe("disabled");
      expect(result.current.settings.maxEntries).toBe(5000);
    });
  });
});
