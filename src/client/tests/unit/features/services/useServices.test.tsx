import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// Stable mocks
const mockApiFetch = vi.hoisted(() => vi.fn());
const mockShowToast = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", () => ({
  apiFetch: mockApiFetch,
  ApiError: class ApiError extends Error {
    code: string;
    status: number;
    constructor(code: string, message: string, status = 400) {
      super(message);
      this.code = code;
      this.status = status;
    }
  },
}));

vi.mock("@/lib/ToastContext", () => ({
  useShowToast: () => mockShowToast,
}));

// Hook references populated after vi.resetModules
type UseServices =
  typeof import("@/features/services/hooks/useServices").useServices;
type UseNextPort =
  typeof import("@/features/services/hooks/useServices").useNextPort;
type UseCreateService =
  typeof import("@/features/services/hooks/useServices").useCreateService;
type UseUpdateService =
  typeof import("@/features/services/hooks/useServices").useUpdateService;
type UseToggleService =
  typeof import("@/features/services/hooks/useServices").useToggleService;

let useServices: UseServices;
let useNextPort: UseNextPort;
let useCreateService: UseCreateService;
let useUpdateService: UseUpdateService;
let useToggleService: UseToggleService;

describe("useServices hooks", () => {
  beforeAll(async () => {
    vi.resetModules();
    ({
      useServices,
      useNextPort,
      useCreateService,
      useUpdateService,
      useToggleService,
    } = await import("@/features/services/hooks/useServices"));
  });

  beforeEach(() => vi.clearAllMocks());

  function makeWrapper() {
    const qc = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
  }

  // ── useServices ─────────────────────────────────────────────────────────────

  it("fetches /api/services and returns service list", async () => {
    const mockServices = [{ id: "svc-1", name: "Alpha" }];
    mockApiFetch.mockResolvedValueOnce(mockServices);

    const { result } = renderHook(() => useServices(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(mockServices);
  });

  // ── useNextPort ─────────────────────────────────────────────────────────────

  it("fetches /api/services/next-port and returns port number", async () => {
    mockApiFetch.mockResolvedValueOnce({ port: 30150 });

    const { result } = renderHook(() => useNextPort(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toBe(30150);
  });

  // ── useCreateService ────────────────────────────────────────────────────────

  it("calls POST /api/services with payload and invalidates services query", async () => {
    const newService = { id: "svc-new", name: "New Service" };
    mockApiFetch.mockResolvedValueOnce(newService);

    const { result } = renderHook(() => useCreateService(), {
      wrapper: makeWrapper(),
    });

    result.current.mutate({
      name: "New Service",
      externalUrl: "http://example.com",
      port: 30150,
      tags: [],
    });

    await waitFor(() =>
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/api/services",
        expect.objectContaining({ method: "POST" }),
      ),
    );
  });

  // ── useUpdateService ────────────────────────────────────────────────────────

  it("calls PUT /api/services/:id with payload and invalidates services query", async () => {
    const updated = { id: "svc-1", name: "Updated" };
    mockApiFetch.mockResolvedValueOnce(updated);

    const { result } = renderHook(() => useUpdateService(), {
      wrapper: makeWrapper(),
    });

    result.current.mutate({
      id: "svc-1",
      payload: {
        name: "Updated",
        externalUrl: "http://updated.com",
        port: 30150,
        tags: [],
      },
    });

    await waitFor(() =>
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/api/services/svc-1",
        expect.objectContaining({ method: "PUT" }),
      ),
    );
  });

  // ── useToggleService ────────────────────────────────────────────────────────

  it("calls POST /api/services/:id/start on start toggle", async () => {
    const toggled = { id: "svc-1", name: "Alpha", isActive: true };
    mockApiFetch.mockResolvedValueOnce(toggled);

    const { result } = renderHook(() => useToggleService(), {
      wrapper: makeWrapper(),
    });

    result.current.mutate({ id: "svc-1", action: "start" });

    await waitFor(() =>
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/api/services/svc-1/start",
        expect.objectContaining({ method: "POST" }),
      ),
    );
  });

  it("shows error toast when toggle fails", async () => {
    mockApiFetch.mockRejectedValueOnce(new Error("Server error"));

    const { result } = renderHook(() => useToggleService(), {
      wrapper: makeWrapper(),
    });

    result.current.mutate({ id: "svc-1", action: "stop" });

    await waitFor(() => expect(mockShowToast).toHaveBeenCalled());
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.stringContaining("Failed"),
      "error",
    );
  });

  it("uses [] fallback in onMutate when services cache is empty", async () => {
    mockApiFetch.mockResolvedValueOnce({ id: "svc-1", isActive: true });

    const { result } = renderHook(() => useToggleService(), {
      wrapper: makeWrapper(),
    });

    // No prior useServices call → cache is empty → old?.map(...) returns undefined → falls back to []
    result.current.mutate({ id: "svc-1", action: "start" });

    await waitFor(() =>
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/api/services/svc-1/start",
        expect.anything(),
      ),
    );
  });
});
