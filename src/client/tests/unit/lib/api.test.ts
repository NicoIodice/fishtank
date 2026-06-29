import { describe, it, expect, vi, afterEach } from "vitest";
import { apiFetch, ApiError } from "@/lib/api";

// Helper: create a mock Response
function mockResponse(
  body: unknown,
  status = 200,
  contentType = "application/json",
): Response {
  const bodyStr = typeof body === "string" ? body : JSON.stringify(body);
  return new Response(bodyStr, {
    status,
    headers: { "Content-Type": contentType },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("apiFetch", () => {
  // ─── 2xx success ────────────────────────────────────────────────────────────

  it("returns data on 200 success response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockResponse({ success: true, data: { id: 1, name: "test" } }),
    );

    const result = await apiFetch<{ id: number; name: string }>("/api/test");
    expect(result).toEqual({ id: 1, name: "test" });
  });

  it("sends credentials: include by default", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(mockResponse({ success: true, data: null }));

    await apiFetch("/api/test").catch(() => {});
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/test",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  // ─── 401 handling ───────────────────────────────────────────────────────────

  it("throws ApiError with AUTH_UNAUTHORIZED on 401", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockResponse(
        {
          success: false,
          error: { code: "AUTH_UNAUTHORIZED", message: "Not authenticated" },
        },
        401,
      ),
    );

    await expect(apiFetch("/api/protected")).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof ApiError && (e as ApiError).code === "AUTH_UNAUTHORIZED",
    );
  });

  it("redirects to /login on 401 when redirectOn401 is true (default)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockResponse(
        {
          success: false,
          error: { code: "AUTH_UNAUTHORIZED", message: "Not authenticated" },
        },
        401,
      ),
    );

    await apiFetch("/api/protected").catch(() => {});
    expect(window.location.href).toBe("/login");
  });

  it("does NOT redirect on 401 when redirectOn401: false", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockResponse(
        {
          success: false,
          error: { code: "AUTH_UNAUTHORIZED", message: "Not authenticated" },
        },
        401,
      ),
    );

    await apiFetch("/api/login", {
      method: "POST",
      redirectOn401: false,
    }).catch(() => {});

    // href unchanged from initial stub ("http://localhost/") proves no redirect happened
    expect(window.location.href).toBe("http://localhost/");
  });

  it("surfaces error code and message from 401 body", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockResponse(
        {
          success: false,
          error: {
            code: "AUTH_INVALID_CREDENTIALS",
            message: "Invalid username or password.",
          },
        },
        401,
      ),
    );

    const err = (await apiFetch("/api/auth/login", {
      method: "POST",
      redirectOn401: false,
    }).catch((e) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("AUTH_INVALID_CREDENTIALS");
    expect(err.message).toBe("Invalid username or password.");
  });

  // ─── Non-2xx error handling ─────────────────────────────────────────────────

  it("throws ApiError with HTTP_404 on 404 response with JSON body", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockResponse(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Resource not found" },
        },
        404,
      ),
    );

    const err = (await apiFetch("/api/missing").catch((e) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("NOT_FOUND");
  });

  it("throws ApiError with HTTP_502 on non-JSON error body (e.g. nginx HTML)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("<html>Bad Gateway</html>", {
        status: 502,
        headers: { "Content-Type": "text/html" },
      }),
    );

    const err = (await apiFetch("/api/test").catch((e) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("HTTP_502");
    expect(err.message).toContain("502");
  });

  it("throws ApiError with HTTP_500 when server returns 500 with JSON error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockResponse(
        {
          success: false,
          error: { code: "INTERNAL_ERROR", message: "Unexpected server error" },
        },
        500,
      ),
    );

    const err = (await apiFetch("/api/test").catch((e) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("INTERNAL_ERROR");
  });

  // ─── Success=false on 2xx ───────────────────────────────────────────────────

  it("throws ApiError when success=false on a 200 response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockResponse(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Invalid input" },
        },
        200,
      ),
    );

    const err = (await apiFetch("/api/test").catch((e) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("VALIDATION_ERROR");
  });

  it("uses AUTH_UNAUTHORIZED fallback code when 401 body has no error.code", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockResponse({ success: false }, 401),
    );

    const err = (await apiFetch("/api/protected", {
      redirectOn401: false,
    }).catch((e) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("AUTH_UNAUTHORIZED");
    expect(err.message).toBe("Not authenticated");
  });

  it("uses UNKNOWN_ERROR fallback code when success=false body has no error field", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockResponse({ success: false }, 200),
    );

    const err = (await apiFetch("/api/test").catch((e) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("UNKNOWN_ERROR");
    expect(err.message).toBe("Unknown error");
  });

  it("uses HTTP_xxx fallback code when non-2xx body has no error field", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockResponse({ success: false }, 503),
    );

    const err = (await apiFetch("/api/test").catch((e) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("HTTP_503");
  });

  // ─── ApiError class ─────────────────────────────────────────────────────────

  it("ApiError has correct name, code, and message", () => {
    const err = new ApiError("TEST_CODE", "test message");
    expect(err.name).toBe("ApiError");
    expect(err.code).toBe("TEST_CODE");
    expect(err.message).toBe("test message");
    expect(err).toBeInstanceOf(Error);
  });
});
