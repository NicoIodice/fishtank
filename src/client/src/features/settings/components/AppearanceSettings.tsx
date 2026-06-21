import { useTheme } from "@/lib/useTheme";
import type { Theme } from "@/lib/useTheme";

const THEMES: { value: Theme; label: string }[] = [
  { value: "clean-light", label: "Clean Light" },
  { value: "deep-ocean", label: "Deep Ocean" },
  { value: "emerald-terminal", label: "Emerald Terminal" },
  { value: "ink-amber", label: "Ink & Amber" },
];

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();

  return (
    <section data-testid="settings-appearance">
      <fieldset
        style={{ border: "none", padding: 0, margin: 0 }}
        aria-label="Select theme"
      >
        <legend
          style={{
            fontSize: "0.875rem",
            fontWeight: 600,
            color: "var(--content-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: "12px",
          }}
        >
          Theme
        </legend>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {THEMES.map(({ value, label }) => (
            <label
              key={value}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                fontSize: "0.9375rem",
                color: "var(--content-fg)",
              }}
            >
              <input
                type="radio"
                name="theme"
                value={value}
                checked={theme === value}
                onChange={() => setTheme(value)}
                data-testid={`theme-option-${value}`}
                style={{ accentColor: "var(--brand)", cursor: "pointer" }}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
    </section>
  );
}
