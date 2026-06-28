import { apiFetch } from "@/lib/api";
import type { ActivityRow, ActivityQueryParams } from "./types";

export async function fetchActivityRows(
  params?: ActivityQueryParams,
): Promise<ActivityRow[]> {
  const searchParams = new URLSearchParams();
  if (params?.serviceId) searchParams.set("serviceId", params.serviceId);
  if (params?.type) searchParams.set("type", params.type);
  if (params?.search) searchParams.set("search", params.search);
  if (params?.skip !== undefined) searchParams.set("skip", String(params.skip));
  if (params?.take !== undefined) searchParams.set("take", String(params.take));

  const query = searchParams.toString();
  const path = `/api/activity${query ? `?${query}` : ""}`;

  // API returns ApiResponse.Ok(rows) → apiFetch unwraps body.data → ActivityRow[]
  return apiFetch<ActivityRow[]>(path);
}

export async function clearActivityLog(): Promise<void> {
  await apiFetch<null>("/api/activity", { method: "DELETE" });
}
