import type { APIRequestContext } from "@playwright/test";

const API_URL = process.env.API_URL ?? "http://localhost:5000";

/** Fishtank response envelope — every endpoint wraps its payload in this shape. */
export interface ApiEnvelope<T> {
  success: boolean;
  data: T | null;
  error?: {
    code: string;
    message: string;
    details?: string;
  };
}

/**
 * Typed fetch helper aligned with Fishtank's response envelope.
 *
 * Uses Playwright's APIRequestContext so cookies (httpOnly JWT) are forwarded
 * automatically. Throws with the API error code on non-success responses.
 *
 * @example
 * const services = await apiFetch<Service[]>(request, '/api/services');
 */
export async function apiFetch<T>(
  request: APIRequestContext,
  path: string,
  options?: Parameters<APIRequestContext["fetch"]>[1],
): Promise<T> {
  const response = await request.fetch(`${API_URL}${path}`, options);
  const body: ApiEnvelope<T> = await response.json();

  if (!body.success) {
    const code = body.error?.code ?? "UNKNOWN";
    const message = body.error?.message ?? "No message";
    throw new Error(`API [${code}]: ${message}`);
  }

  return body.data as T;
}
