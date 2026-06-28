import { useTheme } from "@/lib/useTheme";
import type { Theme } from "@/lib/useTheme";
import { useRowDetailStyle } from "@/hooks/useRowDetailStyle";
import type { RowDetailStyleValue } from "@/hooks/useRowDetailStyle";

const THEMES: { value: Theme; label: string }[] = [
  { value: "clean-light", label: "Clean Light" },
  { value: "deep-ocean", label: "Deep Ocean" },
  { value: "emerald-terminal", label: "Emerald Terminal" },
  { value: "ink-amber", label: "Ink & Amber" },
];

const ROW_DETAIL_STYLES: {
  value: RowDetailStyleValue;
  label: string;
  testid: string;
}[] = [
  {
    value: "modal",
    label: "Modal",
    testid: "settings-appearance-row-detail-modal",
  },
  {
    value: "drawer",
    label: "Right Drawer",
    testid: "settings-appearance-row-detail-drawer",
  },
  {
    value: "panel",
    label: "Bottom Panel",
    testid: "settings-appearance-row-detail-panel",
  },
];

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const { rowDetailStyle, setRowDetailStyle } = useRowDetailStyle();

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

      {/* Row detail style — Story 3.4 */}
      <fieldset
        data-testid="settings-row-detail-style"
        style={{ border: "none", padding: 0, margin: "24px 0 0" }}
        aria-label="Row detail style"
      >
        <legend
          style={{
            fontSize: "0.875rem",
            fontWeight: 600,
            color: "var(--content-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: "4px",
          }}
        >
          Row Detail Style
        </legend>
        <p
          style={{
            fontSize: "0.8125rem",
            color: "var(--content-muted)",
            margin: "0 0 12px",
          }}
        >
          Choose how request details appear when you click a row in the activity
          log
        </p>
        <div style={{ display: "flex", gap: "8px" }}>
          {ROW_DETAIL_STYLES.map(({ value, label, testid }) => (
            <button
              key={value}
              data-testid={testid}
              onClick={() => setRowDetailStyle(value)}
              aria-pressed={rowDetailStyle === value}
              style={{
                padding: "6px 16px",
                border: "1px solid",
                borderColor:
                  rowDetailStyle === value
                    ? "var(--brand, #3b82f6)"
                    : "#e5e7eb",
                borderRadius: "4px",
                cursor: "pointer",
                backgroundColor:
                  rowDetailStyle === value
                    ? "var(--brand, #3b82f6)"
                    : "var(--surface-subtle, #f9fafb)",
                color:
                  rowDetailStyle === value
                    ? "#fff"
                    : "var(--content-fg, #374151)",
                fontWeight: rowDetailStyle === value ? 600 : 400,
                fontSize: "0.875rem",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>
    </section>
  );
}
