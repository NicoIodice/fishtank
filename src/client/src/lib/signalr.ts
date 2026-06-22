import { HubConnectionBuilder, type HubConnection } from "@microsoft/signalr";

export function createHubConnection(url: string): HubConnection {
  return new HubConnectionBuilder()
    .withUrl(url, { withCredentials: true })
    .withAutomaticReconnect()
    .build();
  // DO NOT call .start() here — each feature that needs real-time wires its own hub in Epic 2+
}
