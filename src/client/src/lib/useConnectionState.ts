import { useState, useEffect } from "react";
import { HubConnectionState } from "@microsoft/signalr";
import { createHubConnection } from "./signalr";

export function useConnectionState() {
  const [isDisconnected, setIsDisconnected] = useState(false);

  useEffect(() => {
    // Monitor all hub connections by creating test connections
    // In a real app, we'd track all active hub instances
    const connections = [
      createHubConnection("/hubs/services"),
      createHubConnection("/hubs/events"),
      createHubConnection("/hubs/activity"),
    ];

    const checkStates = () => {
      const anyDisconnected = connections.some(
        (c) =>
          c.state === HubConnectionState.Disconnected ||
          c.state === HubConnectionState.Reconnecting,
      );
      setIsDisconnected(anyDisconnected);
    };

    // Start all connections and monitor their states
    Promise.all(connections.map((c) => c.start().catch(() => {}))).then(() => {
      checkStates();
    });

    const interval = setInterval(checkStates, 1000);

    return () => {
      clearInterval(interval);
      connections.forEach((c) => c.stop());
    };
  }, []);

  return isDisconnected;
}
