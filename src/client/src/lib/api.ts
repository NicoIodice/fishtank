export class ApiError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit & { redirectOn401?: boolean },
): Promise<T> {
  const { redirectOn401 = true, ...fetchOptions } = options ?? {};
  const res = await fetch(path, { credentials: "include", ...fetchOptions });

  // Parse body once; handle non-JSON error bodies (e.g. nginx 502 HTML)
  const body = (await res.json().catch(() => null)) as {
    success?: boolean;
    data?: T;
    error?: { code: string; message: string };
  } | null;

  if (res.status === 401) {
    if (redirectOn401) window.location.href = "/login";
    throw new ApiError(
      body?.error?.code ?? "AUTH_UNAUTHORIZED",
      body?.error?.message ?? "Not authenticated",
    );
  }

  if (!res.ok) {
    throw new ApiError(
      body?.error?.code ?? `HTTP_${res.status}`,
      body?.error?.message ?? `Request failed with status ${res.status}`,
    );
  }

  if (!body?.success) {
    throw new ApiError(
      body?.error?.code ?? "UNKNOWN_ERROR",
      body?.error?.message ?? "Unknown error",
    );
  }
  return body.data as T;
}
