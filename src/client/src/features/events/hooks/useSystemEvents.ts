import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { SystemEventPage } from "../types/systemEvent";

export const EVENTS_QUERY_KEY = ["events"] as const;
export const UNREAD_COUNT_KEY = ["events", "unread-count"] as const;
const PAGE_SIZE = 20;

export type EventGroup = "warnings-errors" | "info";

/** Paginated list for a severity group ("Load more" via fetchNextPage). */
export function useSystemEvents(group: EventGroup) {
  return useInfiniteQuery({
    queryKey: [...EVENTS_QUERY_KEY, group],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      apiFetch<SystemEventPage>(
        `/api/system-events?severity=${group}&skip=${pageParam}&take=${PAGE_SIZE}`,
      ),
    getNextPageParam: (last, all) =>
      last.hasMore ? all.reduce((n, p) => n + p.items.length, 0) : undefined,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: UNREAD_COUNT_KEY,
    queryFn: () =>
      apiFetch<{ count: number }>("/api/system-events/unread-count"),
    select: (d) => d.count,
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ id: string }>(`/api/system-events/${id}/read`, {
        method: "POST",
      }),
    onSuccess: () => {
      // UnreadCountChanged hub event also refreshes the badge; invalidate as a fallback.
      void qc.invalidateQueries({ queryKey: EVENTS_QUERY_KEY });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ marked: number }>("/api/system-events/read-all", {
        method: "POST",
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: EVENTS_QUERY_KEY }),
  });
}

export function useClearAll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (group: EventGroup) =>
      apiFetch<{ cleared: boolean }>(`/api/system-events?severity=${group}`, {
        method: "DELETE",
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: EVENTS_QUERY_KEY }),
  });
}
