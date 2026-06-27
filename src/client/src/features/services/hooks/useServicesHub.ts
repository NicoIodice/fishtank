import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createHubConnection } from "@/lib/signalr";
import { HUB_INVALIDATION_MAP } from "@/lib/queryClient";

/**
 * Manages the /hubs/services SignalR connection.
 * Mount once in AppShell — do NOT call per-component.
 * Reconnect logic is handled by withAutomaticReconnect() in createHubConnection.
 */
export function useServicesHub() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const connection = createHubConnection("/hubs/services");

    connection.on("ServiceStatusChanged", () => {
      const keys = HUB_INVALIDATION_MAP["ServiceStatusChanged"] ?? [];
      keys.forEach(
        (key) => void queryClient.invalidateQueries({ queryKey: key }),
      );
    });

    void connection.start().catch((err: unknown) => {
      // Non-fatal — hub is best-effort; optimistic toggle + invalidateQueries still work
      console.warn("[ServicesHub] connection failed:", err);
    });

    return () => {
      void connection.stop();
    };
  }, [queryClient]);
}
