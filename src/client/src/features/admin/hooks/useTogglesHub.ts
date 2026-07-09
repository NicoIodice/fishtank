import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createHubConnection } from "@/lib/signalr";

/**
 * Hook to establish SignalR connection to /hubs/toggles and invalidate ["toggles"]
 * queries when FeatureToggleChanged event is received (AC-12).
 * 
 * Wire this hook in AdminConsolePage or a central location where toggle data is used.
 */
export function useTogglesHub() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const connection = createHubConnection("/hubs/toggles");

    connection.on("FeatureToggleChanged", () => {
      queryClient.invalidateQueries({ queryKey: ["toggles"] });
    });

    connection
      .start()
      .catch((err) => console.error("TogglesHub connection failed:", err));

    return () => {
      connection.stop();
    };
  }, [queryClient]);
}
