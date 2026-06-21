import { QueryClient, type QueryKey } from "@tanstack/react-query";

export const HUB_INVALIDATION_MAP: Record<string, QueryKey[]> = {
  // Populated by subsequent epics — DO NOT add entries in this story
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
});
