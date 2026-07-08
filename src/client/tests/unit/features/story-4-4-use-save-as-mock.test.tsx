import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

/**
 * Unit tests — Story 4.4: useSaveAsMock Hook
 * Layer: Vitest + Testing Library (hook testing)
 *
 * Uses vi.hoisted + vi.resetModules pattern (required by isolate:false vitest config).
 */

// Stable hoisted mocks — created before any module is evaluated
const mockApiFetch = vi.hoisted(() => vi.fn());
const MockApiError = vi.hoisted(
  () =>
    class ApiError extends Error {
      code: string;
      constructor(code: string, message: string) {
        super(message);
        this.code = code;
        this.name = "ApiError";
      }
    },
);

vi.mock("@/lib/api", () => ({
  apiFetch: mockApiFetch,
  ApiError: MockApiError,
}));

// Hook type references — populated via dynamic import after vi.resetModules
type UseSaveAsMock =
  typeof import("@/features/activity/hooks/useSaveAsMock").useSaveAsMock;
type ApiError = InstanceType<typeof MockApiError>;

let useSaveAsMock: UseSaveAsMock;
let ApiError: typeof MockApiError;

// Helper to create QueryClient wrapper
function makeQc() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function makeWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

describe("Story 4.4: useSaveAsMock Hook", () => {
  beforeAll(async () => {
    vi.resetModules();
    ({ useSaveAsMock } =
      await import("@/features/activity/hooks/useSaveAsMock"));
    ({ ApiError } = (await import("@/lib/api")) as {
      ApiError: typeof MockApiError;
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Success Cases ─────────────────────────────────────────────────────────

  it("creates mapping file and response file on success", async () => {
    const qc = makeQc();
    const wrapper = makeWrapper(qc);

    const mappingFileResult = {
      name: "post_api_users_201.json",
      path: "test-service/mappings/post_api_users_201.json",
      lastModified: "2024-01-01T12:00:00Z",
      sizeBytes: 512,
    };

    const responseFileResult = {
      name: "post_api_users_201_body.json",
      path: "test-service/responses/post_api_users_201_body.json",
      lastModified: "2024-01-01T12:00:00Z",
      sizeBytes: 256,
    };

    mockApiFetch
      .mockResolvedValueOnce(mappingFileResult)
      .mockResolvedValueOnce(responseFileResult);

    const { result } = renderHook(() => useSaveAsMock(), { wrapper });

    result.current.mutate({
      serviceSlug: "test-service",
      mappingFilename: "post_api_users_201.json",
      mappingContent: '{"Guid": "test-guid"}',
      responseFilename: "post_api_users_201_body.json",
      responseContent: '{"id": 123}',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockApiFetch).toHaveBeenCalledTimes(2);

    // First call: mapping file
    expect(mockApiFetch).toHaveBeenNthCalledWith(1, "/api/mappings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: "test-service/mappings/post_api_users_201.json",
        content: '{"Guid": "test-guid"}',
      }),
    });

    // Second call: response file
    expect(mockApiFetch).toHaveBeenNthCalledWith(2, "/api/mappings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: "test-service/responses/post_api_users_201_body.json",
        content: '{"id": 123}',
      }),
    });

    expect(result.current.data).toEqual({
      mappingFile: mappingFileResult,
      responseFile: responseFileResult,
    });
  });

  it("invalidates mappings query after successful save", async () => {
    const qc = makeQc();
    const wrapper = makeWrapper(qc);

    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");

    mockApiFetch
      .mockResolvedValueOnce({ name: "mapping.json" })
      .mockResolvedValueOnce({ name: "response_body.json" });

    const { result } = renderHook(() => useSaveAsMock(), { wrapper });

    result.current.mutate({
      serviceSlug: "test-service",
      mappingFilename: "test.json",
      mappingContent: "{}",
      responseFilename: "test_body.json",
      responseContent: "{}",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["mappings"] });
  });

  it("calls onSuccess callback with file data", async () => {
    const qc = makeQc();
    const wrapper = makeWrapper(qc);

    const onSuccessMock = vi.fn();

    const mappingFileResult = { name: "mapping.json" };
    const responseFileResult = { name: "response_body.json" };

    mockApiFetch
      .mockResolvedValueOnce(mappingFileResult)
      .mockResolvedValueOnce(responseFileResult);

    const { result } = renderHook(
      () => useSaveAsMock({ onSuccess: onSuccessMock }),
      { wrapper },
    );

    result.current.mutate({
      serviceSlug: "test-service",
      mappingFilename: "test.json",
      mappingContent: "{}",
      responseFilename: "test_body.json",
      responseContent: "{}",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(onSuccessMock).toHaveBeenCalledTimes(1);
    expect(onSuccessMock).toHaveBeenCalledWith({
      mappingFile: mappingFileResult,
      responseFile: responseFileResult,
    });
  });

  // ─── Error Cases ───────────────────────────────────────────────────────────

  it("handles mapping file creation failure", async () => {
    const qc = makeQc();
    const wrapper = makeWrapper(qc);

    const error = new ApiError(
      "MAPPING_WRITE_FAILED",
      "Failed to write mapping file",
    );
    mockApiFetch.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useSaveAsMock(), { wrapper });

    result.current.mutate({
      serviceSlug: "test-service",
      mappingFilename: "test.json",
      mappingContent: "{}",
      responseFilename: "test_body.json",
      responseContent: "{}",
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(mockApiFetch).toHaveBeenCalledTimes(1); // Only mapping call, response call skipped
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect((result.current.error as ApiError).code).toBe(
      "MAPPING_WRITE_FAILED",
    );
  });

  it("handles response file creation failure after mapping succeeds", async () => {
    const qc = makeQc();
    const wrapper = makeWrapper(qc);

    const mappingFileResult = { name: "mapping.json" };
    const error = new ApiError(
      "MAPPING_WRITE_FAILED",
      "Failed to write response file",
    );

    mockApiFetch
      .mockResolvedValueOnce(mappingFileResult)
      .mockRejectedValueOnce(error);

    const { result } = renderHook(() => useSaveAsMock(), { wrapper });

    result.current.mutate({
      serviceSlug: "test-service",
      mappingFilename: "test.json",
      mappingContent: "{}",
      responseFilename: "test_body.json",
      responseContent: "{}",
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(mockApiFetch).toHaveBeenCalledTimes(2);
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect((result.current.error as ApiError).message).toContain(
      "response file",
    );
  });

  it("calls onError callback with ApiError", async () => {
    const qc = makeQc();
    const wrapper = makeWrapper(qc);

    const onErrorMock = vi.fn();
    const error = new ApiError("MAPPING_WRITE_FAILED", "Write failed");

    mockApiFetch.mockRejectedValueOnce(error);

    const { result } = renderHook(
      () => useSaveAsMock({ onError: onErrorMock }),
      {
        wrapper,
      },
    );

    result.current.mutate({
      serviceSlug: "test-service",
      mappingFilename: "test.json",
      mappingContent: "{}",
      responseFilename: "test_body.json",
      responseContent: "{}",
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(onErrorMock).toHaveBeenCalledTimes(1);
    expect(onErrorMock).toHaveBeenCalledWith(expect.any(ApiError));
    expect(onErrorMock.mock.calls[0][0].code).toBe("MAPPING_WRITE_FAILED");
  });

  it("wraps non-ApiError errors in ApiError for onError callback", async () => {
    const qc = makeQc();
    const wrapper = makeWrapper(qc);

    const onErrorMock = vi.fn();
    const genericError = new Error("Network failure");
    mockApiFetch.mockRejectedValueOnce(genericError);

    const { result } = renderHook(
      () => useSaveAsMock({ onError: onErrorMock }),
      {
        wrapper,
      },
    );

    result.current.mutate({
      serviceSlug: "test-service",
      mappingFilename: "test.json",
      mappingContent: "{}",
      responseFilename: "test_body.json",
      responseContent: "{}",
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    // The mutation error is still the generic Error
    expect(result.current.error).toBeInstanceOf(Error);

    // But the onError callback receives an ApiError wrapper
    expect(onErrorMock).toHaveBeenCalledTimes(1);
    expect(onErrorMock).toHaveBeenCalledWith(expect.any(ApiError));
    expect(onErrorMock.mock.calls[0][0].code).toBe("UNKNOWN_ERROR");
    expect(onErrorMock.mock.calls[0][0].message).toBe("Network failure");
  });

  it("does not invalidate queries on error", async () => {
    const qc = makeQc();
    const wrapper = makeWrapper(qc);

    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");

    const error = new ApiError("MAPPING_WRITE_FAILED", "Write failed");
    mockApiFetch.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useSaveAsMock(), { wrapper });

    result.current.mutate({
      serviceSlug: "test-service",
      mappingFilename: "test.json",
      mappingContent: "{}",
      responseFilename: "test_body.json",
      responseContent: "{}",
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  // ─── Path Construction ─────────────────────────────────────────────────────

  it("constructs correct mapping file path", async () => {
    const qc = makeQc();
    const wrapper = makeWrapper(qc);

    mockApiFetch
      .mockResolvedValueOnce({ name: "test.json" })
      .mockResolvedValueOnce({ name: "test_body.json" });

    const { result } = renderHook(() => useSaveAsMock(), { wrapper });

    result.current.mutate({
      serviceSlug: "payments-api",
      mappingFilename: "get_account_200.json",
      mappingContent: "{}",
      responseFilename: "get_account_200_body.json",
      responseContent: "{}",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const mappingCall = mockApiFetch.mock.calls[0];
    const mappingBody = JSON.parse(mappingCall[1].body as string);

    expect(mappingBody.path).toBe("payments-api/mappings/get_account_200.json");
  });

  it("constructs correct response file path", async () => {
    const qc = makeQc();
    const wrapper = makeWrapper(qc);

    mockApiFetch
      .mockResolvedValueOnce({ name: "test.json" })
      .mockResolvedValueOnce({ name: "test_body.json" });

    const { result } = renderHook(() => useSaveAsMock(), { wrapper });

    result.current.mutate({
      serviceSlug: "payments-api",
      mappingFilename: "get_account_200.json",
      mappingContent: "{}",
      responseFilename: "get_account_200_body.json",
      responseContent: "{}",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const responseCall = mockApiFetch.mock.calls[1];
    const responseBody = JSON.parse(responseCall[1].body as string);

    expect(responseBody.path).toBe(
      "payments-api/responses/get_account_200_body.json",
    );
  });

  // ─── Sequential Execution ──────────────────────────────────────────────────

  it("waits for mapping file to succeed before creating response file", async () => {
    const qc = makeQc();
    const wrapper = makeWrapper(qc);

    let mappingResolved = false;

    mockApiFetch.mockImplementation((url, options) => {
      const body = JSON.parse((options as { body: string }).body);

      if (body.path.includes("/mappings/")) {
        return new Promise((resolve) => {
          setTimeout(() => {
            mappingResolved = true;
            resolve({ name: "mapping.json" });
          }, 50);
        });
      } else {
        // Response file call
        expect(mappingResolved).toBe(true); // Should only be called after mapping succeeds
        return Promise.resolve({ name: "response_body.json" });
      }
    });

    const { result } = renderHook(() => useSaveAsMock(), { wrapper });

    result.current.mutate({
      serviceSlug: "test-service",
      mappingFilename: "test.json",
      mappingContent: "{}",
      responseFilename: "test_body.json",
      responseContent: "{}",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockApiFetch).toHaveBeenCalledTimes(2);
  });

  // ─── Edge Cases ────────────────────────────────────────────────────────────

  it("handles empty mapping content", async () => {
    const qc = makeQc();
    const wrapper = makeWrapper(qc);

    mockApiFetch
      .mockResolvedValueOnce({ name: "test.json" })
      .mockResolvedValueOnce({ name: "test_body.json" });

    const { result } = renderHook(() => useSaveAsMock(), { wrapper });

    result.current.mutate({
      serviceSlug: "test-service",
      mappingFilename: "test.json",
      mappingContent: "",
      responseFilename: "test_body.json",
      responseContent: "{}",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const mappingCall = mockApiFetch.mock.calls[0];
    const mappingBody = JSON.parse(mappingCall[1].body as string);

    expect(mappingBody.content).toBe("");
  });

  it("handles empty response content", async () => {
    const qc = makeQc();
    const wrapper = makeWrapper(qc);

    mockApiFetch
      .mockResolvedValueOnce({ name: "test.json" })
      .mockResolvedValueOnce({ name: "test_body.json" });

    const { result } = renderHook(() => useSaveAsMock(), { wrapper });

    result.current.mutate({
      serviceSlug: "test-service",
      mappingFilename: "test.json",
      mappingContent: "{}",
      responseFilename: "test_body.json",
      responseContent: "",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const responseCall = mockApiFetch.mock.calls[1];
    const responseBody = JSON.parse(responseCall[1].body as string);

    expect(responseBody.content).toBe("");
  });
});
