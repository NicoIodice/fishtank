import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useToggles } from "@/features/admin/hooks/useToggles";
import type { FeatureToggle } from "@/features/admin/types";
import type { ReactNode } from "react";

/**
 * Unit tests for useToggles hook covering:
 * - Query initialization and data fetching
 * - Mutation for setting toggle state
 * - Query invalidation after successful mutation
 * - Error handling for fetch and mutation
 * - API envelope parsing
 *
 * Coverage goal: 90%+ line/branch coverage
 */

const mockToggles: FeatureToggle[] = [
  {
    name: "network_activity",
    displayName: "Network Activity",
    description: "View network activity logs",
    enabled: true,
    updatedAt: new Date("2026-07-09T10:00:00Z").toISOString(),
    envVarOverride: null,
  },
  {
    name: "record_mode",
    displayName: "Record Mode",
    description: "Record real service responses",
    enabled: false,
    updatedAt: new Date("2026-07-09T12:00:00Z").toISOString(),
    envVarOverride: null,
  },
];

const fetchMock = vi.fn();

describe("useToggles", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockClear();
  });

  afterEach(() => {
    queryClient.clear();
    vi.unstubAllGlobals();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it("fetches toggles on mount", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockToggles }),
    } as Response);

    const { result } = renderHook(() => useToggles(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.toggles).toEqual([]);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.toggles).toEqual(mockToggles);
    expect(result.current.error).toBeNull();

    expect(fetch).toHaveBeenCalledWith("/api/admin/toggles", {
      credentials: "include",
    });
  });

  it("returns empty array when no toggles exist", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    } as Response);

    const { result } = renderHook(() => useToggles(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.toggles).toEqual([]);
  });

  it("handles fetch error with failed response", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      statusText: "Forbidden",
      json: async () => ({
        success: false,
        error: { code: "ADMIN_FORBIDDEN", message: "Admin role required" },
      }),
    } as Response);

    const { result } = renderHook(() => useToggles(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.toggles).toEqual([]);
  });

  it("handles fetch error with success:false in envelope", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Database error" },
      }),
    } as Response);

    const { result } = renderHook(() => useToggles(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.toggles).toEqual([]);
  });

  it("handles network error", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useToggles(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.toggles).toEqual([]);
  });

  it("setToggle calls PUT endpoint with correct payload", async () => {
    fetchMock
      // Initial GET for query
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockToggles }),
      } as Response)
      // PUT for mutation
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { ...mockToggles[0], enabled: false },
        }),
      } as Response)
      // Refetch after invalidation
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [{ ...mockToggles[0], enabled: false }, mockToggles[1]],
        }),
      } as Response);

    const { result } = renderHook(() => useToggles(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Trigger mutation
    result.current.setToggle({ name: "network_activity", enabled: false });

    // Wait for mutation to complete
    await waitFor(() => {
      expect(result.current.isSettingToggle).toBe(false);
    });

    // Verify PUT was called with correct args
    expect(fetch).toHaveBeenCalledWith("/api/admin/toggles/network_activity", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ enabled: false }),
    });

    // Verify query was refetched after mutation
    expect(fetch).toHaveBeenCalledTimes(3); // GET, PUT, GET
  });

  it("setToggle invalidates query on success", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockToggles }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { ...mockToggles[1], enabled: true },
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [mockToggles[0], { ...mockToggles[1], enabled: true }],
        }),
      } as Response);

    const { result } = renderHook(() => useToggles(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const initialToggles = result.current.toggles;

    result.current.setToggle({ name: "record_mode", enabled: true });

    await waitFor(() => {
      expect(result.current.isSettingToggle).toBe(false);
    });

    // Query should refetch and update
    await waitFor(() => {
      expect(result.current.toggles).not.toEqual(initialToggles);
    });

    const updatedToggle = result.current.toggles.find(
      (t) => t.name === "record_mode",
    );
    expect(updatedToggle?.enabled).toBe(true);
  });

  it("handles setToggle error with failed response", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockToggles }),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        statusText: "Not Found",
        json: async () => ({
          success: false,
          error: {
            code: "ADMIN_TOGGLE_NOT_FOUND",
            message: "Toggle not found",
          },
        }),
      } as Response);

    const { result } = renderHook(() => useToggles(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    result.current.setToggle({ name: "unknown_toggle", enabled: true });

    await waitFor(() => {
      expect(result.current.isSettingToggle).toBe(false);
    });

    // Mutation should have failed, but hook should still be functional
    expect(result.current.toggles).toEqual(mockToggles);
  });

  it("handles setToggle error with success:false in envelope", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockToggles }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          error: {
            code: "ADMIN_TOGGLE_ENV_LOCKED",
            message: "Toggle is locked by env var",
          },
        }),
      } as Response);

    const { result } = renderHook(() => useToggles(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    result.current.setToggle({ name: "network_activity", enabled: false });

    await waitFor(() => {
      expect(result.current.isSettingToggle).toBe(false);
    });

    // Mutation should have failed
    expect(result.current.toggles).toEqual(mockToggles);
  });

  it("encodes toggle name in URL path", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockToggles }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { ...mockToggles[0], enabled: false },
        }),
      } as Response);

    const { result } = renderHook(() => useToggles(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Use a toggle name with special characters
    result.current.setToggle({ name: "network_activity", enabled: false });

    await waitFor(() => {
      expect(result.current.isSettingToggle).toBe(false);
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/toggles/network_activity",
      expect.any(Object),
    );
  });

  it("includes credentials in fetch requests", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockToggles }),
    } as Response);

    renderHook(() => useToggles(), { wrapper });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/admin/toggles",
        expect.objectContaining({ credentials: "include" }),
      );
    });
  });

  it("sets isSettingToggle to true during mutation", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockToggles }),
      } as Response)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({
                    success: true,
                    data: { ...mockToggles[0], enabled: false },
                  }),
                } as Response),
              100,
            ),
          ),
      );

    const { result } = renderHook(() => useToggles(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    result.current.setToggle({ name: "network_activity", enabled: false });

    await waitFor(() => {
      expect(result.current.isSettingToggle).toBe(true);
    });

    await waitFor(
      () => {
        expect(result.current.isSettingToggle).toBe(false);
      },
      { timeout: 200 },
    );
  });

  // ── Error message fallback branches (branch coverage) ──────────────────────

  it("fetchToggles uses fallback message when error.message is absent", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: false,
        error: { code: "ADMIN_FORBIDDEN" },
      }),
    } as Response);

    const { result } = renderHook(() => useToggles(), { wrapper });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect((result.current.error as Error).message).toBe(
      "Failed to fetch toggles",
    );
  });

  it("setToggle uses statusText fallback when non-ok response has no message", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockToggles }),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        statusText: "Forbidden",
        json: async () => ({
          success: false,
          error: { code: "ADMIN_FORBIDDEN" },
        }),
      } as Response);

    const { result } = renderHook(() => useToggles(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    result.current.setToggle({ name: "network_activity", enabled: false });

    await waitFor(() => {
      expect(result.current.isSettingToggle).toBe(false);
    });
  });

  it("setToggle uses fallback message when success:false response has no message", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockToggles }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          error: { code: "ADMIN_TOGGLE_ENV_LOCKED" },
        }),
      } as Response);

    const { result } = renderHook(() => useToggles(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    result.current.setToggle({ name: "network_activity", enabled: false });

    await waitFor(() => {
      expect(result.current.isSettingToggle).toBe(false);
    });
  });
});
