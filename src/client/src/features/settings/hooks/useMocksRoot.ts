import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

interface MocksRootData {
  mocksRoot: string;
  children: unknown[];
}

/**
 * Settings-feature-local hook that reads the mocksRoot path from the mappings
 * tree endpoint. Deliberately does NOT import from features/mappings — the
 * settings feature must be self-contained (Anti-Patterns table, DoD gate 7).
 *
 * Uses the same ["mappings"] query key so the cache is shared with the
 * mappings feature when both are mounted, but the dependency flows only
 * through the shared React Query cache — not through a cross-feature import.
 */
export function useMocksRoot() {
  return useQuery<MocksRootData>({
    queryKey: ["mappings"] as const,
    queryFn: () => apiFetch<MocksRootData>("/api/mappings"),
  });
}
