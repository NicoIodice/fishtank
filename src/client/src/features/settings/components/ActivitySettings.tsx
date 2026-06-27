import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAppSettings, APP_SETTINGS_QUERY_KEY } from "../hooks/useAppSettings";
import { useActivitySettings } from "../hooks/useActivitySettings";

export function ActivitySettings() {
  const queryClient = useQueryClient();
  const { data: appSettings } = useAppSettings();
  const { settings, updateInterval, updateMaxEntries } = useActivitySettings();
  const [isTogglingHeaders, setIsTogglingHeaders] = useState(false);

  async function handleCaptureHeadersToggle() {
    if (isTogglingHeaders) return;
    setIsTogglingHeaders(true);
    try {
      const current = appSettings?.captureFullHeaders ?? false;
      await apiFetch<{ captureFullHeaders: boolean }>("/api/settings/capture-headers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !current }),
      });
      await queryClient.invalidateQueries({ queryKey: APP_SETTINGS_QUERY_KEY });
    } catch (err) {
      console.error("Toggle capture headers failed:", err);
    } finally {
      setIsTogglingHeaders(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--section-gap, 24px)" }}>
      {/* Auto-refresh interval */}
      <div>
        <label
          htmlFor="settings-select-activity-refresh-interval"
          style={{ display: "block", fontWeight: 500, marginBottom: "6px" }}
        >
          Auto-refresh interval
        </label>
        <select
          id="settings-select-activity-refresh-interval"
          data-testid="settings-select-activity-refresh-interval"
          value={String(settings.autoRefreshInterval)}
          onChange={(e) => {
            const v = e.target.value;
            updateInterval(
              v === "disabled" ? "disabled" : (Number(v) as 1000 | 2000 | 5000),
            );
          }}
          style={{
            padding: "6px 8px",
            borderRadius: "4px",
            border: "1px solid #e5e7eb",
            fontSize: "0.875rem",
          }}
        >
          <option value="1000">1 second</option>
          <option value="2000">2 seconds (default)</option>
          <option value="5000">5 seconds</option>
          <option value="disabled">Disabled</option>
        </select>
      </div>

      {/* Max log entries */}
      <div>
        <label
          htmlFor="settings-select-activity-max-entries"
          style={{ display: "block", fontWeight: 500, marginBottom: "6px" }}
        >
          Max log entries per service
        </label>
        <select
          id="settings-select-activity-max-entries"
          data-testid="settings-select-activity-max-entries"
          value={String(settings.maxEntries)}
          onChange={(e) => {
            updateMaxEntries(Number(e.target.value) as 500 | 1000 | 5000);
          }}
          style={{
            padding: "6px 8px",
            borderRadius: "4px",
            border: "1px solid #e5e7eb",
            fontSize: "0.875rem",
          }}
        >
          <option value="500">500</option>
          <option value="1000">1 000 (default)</option>
          <option value="5000">5 000</option>
        </select>
        <p style={{ marginTop: "4px", fontSize: "0.8rem", color: "#6b7280" }}>
          To change the runtime maximum, set{" "}
          <code>FISHTANK_ACTIVITY_LOG_MAX_ROWS</code> in docker-compose.yml.
        </p>
      </div>

      {/* Sensitive header redaction */}
      <div>
        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            data-testid="settings-toggle-capture-full-headers"
            checked={appSettings?.captureFullHeaders ?? false}
            onChange={handleCaptureHeadersToggle}
            disabled={isTogglingHeaders || !appSettings}
            style={{ marginTop: "2px" }}
          />
          <span>
            <span style={{ display: "block", fontWeight: 500 }}>
              Capture full request headers
            </span>
            <span style={{ display: "block", fontSize: "0.8rem", color: "#6b7280" }}>
              Disables redaction of Authorization, Cookie, and other sensitive headers
            </span>
          </span>
        </label>
      </div>

      {/* TODO: Story 3.4 — add row detail style selector here */}
    </div>
  );
}
