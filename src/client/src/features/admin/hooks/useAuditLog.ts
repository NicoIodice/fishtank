import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import type { AuditEntryDto, AuditPageDto } from "../types";

export function useAuditLog() {
  const [page, setPage] = useState(1);
  const [accumulatedItems, setAccumulatedItems] = useState<AuditEntryDto[]>([]);
  const [prevPage, setPrevPage] = useState(0);

  const query = useQuery({
    queryKey: ["admin", "audit", page],
    queryFn: () => apiFetch<AuditPageDto>(`/api/admin/audit?page=${page}`),
  });

  // Adjust state during render (preferred over useEffect for derived state)
  if (query.data && page !== prevPage) {
    setPrevPage(page);
    setAccumulatedItems((prev) =>
      page === 1 ? query.data!.items : [...prev, ...query.data!.items],
    );
  }

  const loadMore = () => setPage((p) => p + 1);
  const total = query.data?.total ?? 0;
  const hasMore = accumulatedItems.length < total;

  return {
    items: accumulatedItems,
    isLoading: query.isLoading,
    loadMore,
    hasMore,
    total,
  };
}
