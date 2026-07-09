/**
 * Unit tests for useRecordingState hook — Story 4.5
 * Layer: Vitest + React Hooks + msw
 *
 * Focus: React Query integration, mutation behavior, cache invalidation, error handling
 *
 * ACs covered:
 *   AC-1:  startRecording mutation triggers POST /api/recording/start
 *   AC-3:  stopRecording mutation triggers POST /api/recording/stop
 *   AC-10: Recording status persists across navigation (cache behavior)
 *   AC-11: GET /api/recording/status called on mount
 *
 * Coverage: React Query mutations, optimistic updates, error handling, cache invalidation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { useRecordingState } from "@/features/activity/hooks/useRecordingState";
import type { RecordingStatus } from "@/features/activity/api";

// ─── MSW Server Setup ───────────────────────────────────────────────────────

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// ─── Test Suite ─────────────────────────────────────────────────────────────

describe("useRecordingState Hook — Story 4.5", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: 0 },
        mutations: { retry: false },
      },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  function wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  // ─── Status Query Tests (AC-11) ─────────────────────────────────────────

  it("fetches recording status on mount", async () => {
    // Arrange
    server.use(
      http.get("/api/recording/status", () => {
        return HttpResponse.json({
          success: true,
          data: { isRecording: false, startedAt: null } as RecordingStatus,
        });
      }),
    );

    // Act
    const { result } = renderHook(() => useRecordingState(), { wrapper });

    // Assert
    await waitFor(() => {
      expect(result.current.isRecording).toBe(false);
      expect(result.current.startedAt).toBeNull();
    });
  });

  it("returns isRecording: true when status query returns active recording", async () => {
    // Arrange
    const startedAt = new Date().toISOString();
    server.use(
      http.get("/api/recording/status", () => {
        return HttpResponse.json({
          success: true,
          data: { isRecording: true, startedAt } as RecordingStatus,
        });
      }),
    );

    // Act
    const { result } = renderHook(() => useRecordingState(), { wrapper });

    // Assert
    await waitFor(() => {
      expect(result.current.isRecording).toBe(true);
      expect(result.current.startedAt).toBe(startedAt);
    });
  });

  it("defaults isRecording to false when status query is pending", () => {
    // Arrange
    server.use(
      http.get("/api/recording/status", async () => {
        await new Promise((resolve) => setTimeout(resolve, 10000)); // never resolves in test
        return HttpResponse.json({
          success: true,
          data: { isRecording: false, startedAt: null },
        });
      }),
    );

    // Act
    const { result } = renderHook(() => useRecordingState(), { wrapper });

    // Assert
    expect(result.current.isRecording).toBe(false);
    expect(result.current.startedAt).toBeNull();
  });

  // ─── Start Mutation Tests (AC-1) ───────────────────────────────────────

  it("startRecording mutation calls POST /api/recording/start", async () => {
    // Arrange — stateful handler: GET reflects POST side-effects
    let serverIsRecording = false;
    server.use(
      http.get("/api/recording/status", () => {
        return HttpResponse.json({
          success: true,
          data: {
            isRecording: serverIsRecording,
            startedAt: serverIsRecording ? new Date().toISOString() : null,
          },
        });
      }),
      http.post("/api/recording/start", () => {
        serverIsRecording = true;
        return HttpResponse.json({
          success: true,
          data: { isRecording: true, startedAt: new Date().toISOString() },
        });
      }),
    );

    const { result } = renderHook(() => useRecordingState(), { wrapper });

    // Wait for initial query
    await waitFor(() => expect(result.current.isRecording).toBe(false));

    // Act
    result.current.startRecording();

    // Assert
    await waitFor(() => {
      expect(result.current.isStarting).toBe(false); // mutation completed
    });

    // Status should be refetched and updated
    await waitFor(() => {
      expect(result.current.isRecording).toBe(true);
    });
  });

  it("startRecording mutation sets isStarting: true while pending", async () => {
    // Arrange
    server.use(
      http.get("/api/recording/status", () => {
        return HttpResponse.json({
          success: true,
          data: { isRecording: false, startedAt: null },
        });
      }),
      http.post("/api/recording/start", async () => {
        await new Promise((resolve) => setTimeout(resolve, 100)); // simulate delay
        return HttpResponse.json({
          success: true,
          data: { isRecording: true, startedAt: new Date().toISOString() },
        });
      }),
    );

    const { result } = renderHook(() => useRecordingState(), { wrapper });
    await waitFor(() => expect(result.current.isRecording).toBe(false));

    // Act
    result.current.startRecording();

    // Assert — check isStarting immediately after mutation call
    await waitFor(() => {
      expect(result.current.isStarting).toBe(true);
    });

    // Wait for completion
    await waitFor(() => {
      expect(result.current.isStarting).toBe(false);
    });
  });

  it("startRecording handles 409 conflict error (already recording)", async () => {
    // Arrange
    server.use(
      http.get("/api/recording/status", () => {
        return HttpResponse.json({
          success: true,
          data: { isRecording: false, startedAt: null },
        });
      }),
      http.post("/api/recording/start", () => {
        return HttpResponse.json(
          {
            success: false,
            error: {
              code: "RECORDING_ALREADY_ACTIVE",
              message: "Recording is already active.",
            },
          },
          { status: 409 },
        );
      }),
    );

    const { result } = renderHook(() => useRecordingState(), { wrapper });
    await waitFor(() => expect(result.current.isRecording).toBe(false));

    // Act
    result.current.startRecording();

    // Assert — mutation should complete with error
    await waitFor(() => {
      expect(result.current.isStarting).toBe(false);
    });

    // isRecording should remain false (error case)
    expect(result.current.isRecording).toBe(false);
  });

  // ─── Stop Mutation Tests (AC-3) ────────────────────────────────────────

  it("stopRecording mutation calls POST /api/recording/stop", async () => {
    // Arrange — stateful handler: GET reflects POST side-effects
    let serverIsRecording = true;
    server.use(
      http.get("/api/recording/status", () => {
        return HttpResponse.json({
          success: true,
          data: {
            isRecording: serverIsRecording,
            startedAt: serverIsRecording ? new Date().toISOString() : null,
          },
        });
      }),
      http.post("/api/recording/stop", () => {
        serverIsRecording = false;
        return HttpResponse.json({
          success: true,
          data: { isRecording: false, startedAt: null },
        });
      }),
    );

    const { result } = renderHook(() => useRecordingState(), { wrapper });

    // Wait for initial query (recording active)
    await waitFor(() => expect(result.current.isRecording).toBe(true));

    // Act
    result.current.stopRecording();

    // Assert
    await waitFor(() => {
      expect(result.current.isStopping).toBe(false); // mutation completed
    });

    // Status should be refetched and updated
    await waitFor(() => {
      expect(result.current.isRecording).toBe(false);
    });
  });

  it("stopRecording mutation sets isStopping: true while pending", async () => {
    // Arrange
    server.use(
      http.get("/api/recording/status", () => {
        return HttpResponse.json({
          success: true,
          data: { isRecording: true, startedAt: new Date().toISOString() },
        });
      }),
      http.post("/api/recording/stop", async () => {
        await new Promise((resolve) => setTimeout(resolve, 100)); // simulate delay
        return HttpResponse.json({
          success: true,
          data: { isRecording: false, startedAt: null },
        });
      }),
    );

    const { result } = renderHook(() => useRecordingState(), { wrapper });
    await waitFor(() => expect(result.current.isRecording).toBe(true));

    // Act
    result.current.stopRecording();

    // Assert — check isStopping immediately after mutation call
    await waitFor(() => {
      expect(result.current.isStopping).toBe(true);
    });

    // Wait for completion
    await waitFor(() => {
      expect(result.current.isStopping).toBe(false);
    });
  });

  it("stopRecording handles 409 conflict error (not recording)", async () => {
    // Arrange
    server.use(
      http.get("/api/recording/status", () => {
        return HttpResponse.json({
          success: true,
          data: { isRecording: false, startedAt: null },
        });
      }),
      http.post("/api/recording/stop", () => {
        return HttpResponse.json(
          {
            success: false,
            error: {
              code: "RECORDING_NOT_ACTIVE",
              message: "Recording is not currently active.",
            },
          },
          { status: 409 },
        );
      }),
    );

    const { result } = renderHook(() => useRecordingState(), { wrapper });
    await waitFor(() => expect(result.current.isRecording).toBe(false));

    // Act
    result.current.stopRecording();

    // Assert — mutation should complete with error
    await waitFor(() => {
      expect(result.current.isStopping).toBe(false);
    });

    // isRecording should remain false (already not recording)
    expect(result.current.isRecording).toBe(false);
  });

  // ─── Cache Invalidation Tests (AC-10) ──────────────────────────────────

  it("startRecording invalidates status query cache on success", async () => {
    // Arrange
    let callCount = 0;
    server.use(
      http.get("/api/recording/status", () => {
        callCount++;
        return HttpResponse.json({
          success: true,
          data: {
            isRecording: callCount > 1, // false on first call, true after mutation
            startedAt: callCount > 1 ? new Date().toISOString() : null,
          },
        });
      }),
      http.post("/api/recording/start", () => {
        return HttpResponse.json({
          success: true,
          data: { isRecording: true, startedAt: new Date().toISOString() },
        });
      }),
    );

    const { result } = renderHook(() => useRecordingState(), { wrapper });
    await waitFor(() => expect(result.current.isRecording).toBe(false));

    // Act
    result.current.startRecording();

    // Assert — cache should be invalidated, triggering refetch
    await waitFor(() => {
      expect(result.current.isRecording).toBe(true);
    });
    expect(callCount).toBeGreaterThan(1); // status was refetched
  });

  it("stopRecording invalidates status query cache on success", async () => {
    // Arrange
    let callCount = 0;
    server.use(
      http.get("/api/recording/status", () => {
        callCount++;
        return HttpResponse.json({
          success: true,
          data: {
            isRecording: callCount === 1, // true on first call, false after mutation
            startedAt: callCount === 1 ? new Date().toISOString() : null,
          },
        });
      }),
      http.post("/api/recording/stop", () => {
        return HttpResponse.json({
          success: true,
          data: { isRecording: false, startedAt: null },
        });
      }),
    );

    const { result } = renderHook(() => useRecordingState(), { wrapper });
    await waitFor(() => expect(result.current.isRecording).toBe(true));

    // Act
    result.current.stopRecording();

    // Assert — cache should be invalidated, triggering refetch
    await waitFor(() => {
      expect(result.current.isRecording).toBe(false);
    });
    expect(callCount).toBeGreaterThan(1); // status was refetched
  });
});
