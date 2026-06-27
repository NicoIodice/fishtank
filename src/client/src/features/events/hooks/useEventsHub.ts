import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createHubConnection } from "@/lib/signalr";
import { HUB_INVALIDATION_MAP } from "@/lib/queryClient";
import { UNREAD_COUNT_KEY } from "./useSystemEvents";

/**
 * Manages the /hubs/events SignalR connection.
 * Mount once in AppShell — do NOT call per-component.
 * Reconnect logic is handled by withAutomaticReconnect() in createHubConnection.
 */
export function useEventsHub() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const connection = createHubConnection("/hubs/events");

    connection.on("SystemEventCreated", () => {
      const keys = HUB_INVALIDATION_MAP["SystemEventCreated"] ?? [];
      keys.forEach(
        (key) => void queryClient.invalidateQueries({ queryKey: key }),
      );
    });

    connection.on("UnreadCountChanged", (payload: { count: number }) => {
      queryClient.setQueryData(UNREAD_COUNT_KEY, { count: payload.count });
    });

    void connection.start().catch((err: unknown) => {
      // Non-fatal — hub is best-effort; mutations still invalidate as a fallback.
      console.warn("[EventsHub] connection failed:", err);
    });

    return () => {
      void connection.stop();
    };
  }, [queryClient]);
}
