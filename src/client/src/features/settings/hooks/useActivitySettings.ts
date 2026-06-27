import { useState } from "react";

export interface ActivitySettings {
  autoRefreshInterval: 1000 | 2000 | 5000 | "disabled";
  maxEntries: 500 | 1000 | 5000;
}

const DEFAULT_ACTIVITY_SETTINGS: ActivitySettings = {
  autoRefreshInterval: 2000,
  maxEntries: 1000,
};

const STORAGE_KEY = "fishtank-activity-settings";

export function useActivitySettings() {
  const [settings, setSettings] = useState<ActivitySettings>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as ActivitySettings) : DEFAULT_ACTIVITY_SETTINGS;
    } catch {
      return DEFAULT_ACTIVITY_SETTINGS;
    }
  });

  function updateInterval(value: ActivitySettings["autoRefreshInterval"]) {
    const next = { ...settings, autoRefreshInterval: value };
    setSettings(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function updateMaxEntries(value: ActivitySettings["maxEntries"]) {
    const next = { ...settings, maxEntries: value };
    setSettings(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  return { settings, updateInterval, updateMaxEntries };
}
