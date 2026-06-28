import type { ActivityType } from "./types";

interface TypeIconProps {
  type: ActivityType;
}

export function TypeIcon({ type }: TypeIconProps) {
  const isMocked = type === "Mocked";
  const icon = isMocked ? "bi-database" : "bi-arrow-repeat";
  const label = isMocked ? "Mocked" : "Proxied";

  // Base color: blue for Mocked, emerald for Proxied
  // Deep Ocean theme override for Proxied: #34d399 (handled via data-theme CSS if needed)
  const color = isMocked ? "#3b82f6" : "#10b981";

  return (
    <i
      className={`bi ${icon}`}
      style={{ color, fontSize: "1.125rem" }}
      title={label}
      aria-label={label}
    />
  );
}
