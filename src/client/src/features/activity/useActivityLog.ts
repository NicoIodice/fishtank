import { useEffect, useState, useRef } from "react";
import { createHubConnection } from "@/lib/signalr";
import { fetchActivityRows } from "./api";
import type { ActivityRow } from "./types";

// DO NOT useQuery here — activity is SignalR append-only.
// React Query would poll stale data and break the push model.

export function useActivityLog() {
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hadRows, setHadRows] = useState(false);
  // Track rows that arrived via SignalR while the initial fetch was in-flight,
  // so the fetch result doesn't overwrite them (M-2 race condition fix).
  const pendingSignalRRows = useRef<ActivityRow[]>([]);
  const fetchSettled = useRef(false);

  useEffect(() => {
    let mounted = true;

    // Subscribe to real-time events BEFORE the initial fetch so we never miss a row.
    const connection = createHubConnection("/hubs/activity");

    connection.on("ActivityRowAdded", (newRow: ActivityRow) => {
      if (!mounted) return;
      if (!fetchSettled.current) {
        // Buffer rows that arrive before the initial fetch settles.
        pendingSignalRRows.current = [newRow, ...pendingSignalRRows.current];
      } else {
        setRows((prev) => [newRow, ...prev]);
      }
      setHadRows(true);
    });

    connection
      .start()
      .then(() => console.log("[ActivityHub] Connected"))
      .catch((err) => console.error("[ActivityHub] Connection failed:", err));

    // Initial load via direct apiFetch (not useQuery) — after subscription is set up.
    fetchActivityRows({ take: 200 })
      .then((initialRows) => {
        if (!mounted) return;
        fetchSettled.current = true;
        // Prepend any SignalR rows that arrived during the fetch.
        const buffered = pendingSignalRRows.current;
        pendingSignalRRows.current = [];
        setRows([...buffered, ...initialRows]);
        if (initialRows.length > 0 || buffered.length > 0) setHadRows(true);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load initial activity rows:", err);
        if (!mounted) return;
        fetchSettled.current = true;
        const buffered = pendingSignalRRows.current;
        pendingSignalRRows.current = [];
        if (buffered.length > 0) setRows(buffered);
        setIsLoading(false);
      });

    return () => {
      mounted = false;
      connection.stop();
    };
  }, []);

  function clearRows() {
    setRows([]);
    // hadRows remains true to distinguish "cleared" from "never had rows"
  }

  return { rows, clearRows, isLoading, hadRows };
}
