import { useState } from "react";
import { useBreakpoint } from "@/lib/useBreakpoint";
import { AppearanceSettings } from "../components/AppearanceSettings";

type SettingsSection = "appearance" | "activity" | "cache" | "mocks-root";

const sections: { id: SettingsSection; label: string }[] = [
  { id: "appearance", label: "Appearance" },
  { id: "activity", label: "Activity" },
  { id: "cache", label: "Cache" },
  { id: "mocks-root", label: "Mocks Root" },
];

export function SettingsPage() {
  const [active, setActive] = useState<SettingsSection>("appearance");
  const { mobile } = useBreakpoint();

  return (
    <main
      data-testid="page-settings"
      style={{
        display: "flex",
        gap: "var(--section-gap)",
        flexDirection: mobile ? "column" : "row",
      }}
    >
      {mobile ? (
        <select
          aria-label="Settings section"
          value={active}
          onChange={(e) => setActive(e.target.value as SettingsSection)}
          style={{
            width: "100%",
            padding: "6px 8px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--input-border)",
            background: "var(--input-bg)",
            color: "var(--content-fg)",
          }}
        >
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      ) : (
        <nav
          aria-label="Settings sections"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "2px",
            minWidth: "160px",
          }}
        >
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              aria-current={active === s.id ? "page" : undefined}
              style={{
                textAlign: "left",
                padding: "8px var(--nav-item-px)",
                borderRadius: "var(--radius-xl)",
                border: "none",
                cursor: "pointer",
                fontSize: "0.875rem",
                fontWeight: 500,
                background:
                  active === s.id ? "var(--sidebar-active-bg)" : "transparent",
                color:
                  active === s.id
                    ? "var(--sidebar-active-fg)"
                    : "var(--content-fg)",
              }}
            >
              {s.label}
            </button>
          ))}
        </nav>
      )}
      <section style={{ flex: 1 }}>
        <h2
          style={{
            fontSize: "1.125rem",
            fontWeight: 600,
            marginBottom: "var(--section-gap)",
          }}
        >
          {sections.find((s) => s.id === active)?.label}
        </h2>
        {active === "appearance" ? (
          <AppearanceSettings />
        ) : (
          <p className="text-muted">Configured in a later story.</p>
        )}
      </section>
    </main>
  );
}
