# Story 1.4: Additional UI Themes — Deep Ocean, Emerald Terminal, Ink & Amber

Status: done

## Story

As a user,
I want to switch between Deep Ocean, Emerald Terminal, and Ink & Amber themes in Settings → Appearance,
So that I can use Fishtank in a visual environment that suits my workflow and lighting conditions.

## Context

Story 1.3 already implemented:
- **All 4 theme CSS variable blocks** in `src/client/src/styles/theme.css` — `[data-theme="clean-light"]`, `[data-theme="deep-ocean"]`, `[data-theme="emerald-terminal"]`, `[data-theme="ink-amber"]` with exact DESIGN.md token values.
- **Theme initialization on load** in `src/client/src/main.tsx` — reads `localStorage.getItem("fishtank-theme")`, falls back to `prefers-color-scheme` (dark → deep-ocean, light/unset → clean-light), sets `document.documentElement.dataset.theme`.
- **Settings page** with sub-nav and Appearance section — currently shows `"Configured in a later story."` placeholder.

**This story's only job:** Replace that placeholder with a working theme picker and wire it through a `useTheme` hook.

## Acceptance Criteria

**AC-1 — Theme picker in Settings → Appearance:**
**Given** the Settings → Appearance section,
**When** a user selects one of the 4 themes from the picker,
**Then** `data-theme` on `<html>` updates immediately (no reload required) and all CSS custom properties resolve to that theme's tokens. The selection is written to `localStorage` under the key `"fishtank-theme"`.

**AC-2 — Theme persistence on reload:**
**Given** a user selected a theme in Settings,
**When** they reload the page,
**Then** the previously selected theme is applied — it does NOT revert to `prefers-color-scheme`.

**AC-3 — Deep Ocean theme tokens:**
**Given** the Deep Ocean theme is active (`data-theme="deep-ocean"` on `<html>`),
**Then** all CSS properties from the DESIGN.md Deep Ocean block are in effect: `sidebar-fg: #94a3b8`, `content-muted: #94a3b8`, `error-row-bg: rgba(239,68,68,.10)`, `--shadow-raised: 0 4px 16px rgba(0,0,0,.40)`, `--shadow-overlay: 0 8px 40px rgba(0,0,0,.60)`.

**AC-4 — Emerald Terminal theme tokens:**
**Given** the Emerald Terminal theme is active,
**Then** all DESIGN.md Emerald Terminal tokens are applied, including `topbar-icon-fg: #ffffff`.

**AC-5 — Ink & Amber theme tokens:**
**Given** the Ink & Amber theme is active,
**Then** all DESIGN.md Ink & Amber tokens are applied: `sidebar-fg: #a1a1aa`, `content-muted: #52525b`, `topbar-icon-fg: #ffffff`.

**AC-6 — Required tokens present in ALL themes:**
**Given** any active theme,
**Then** `--success-subtle`, `--brand-fg`, and `--topbar-icon-fg` are defined in every theme block; hover backgrounds are `rgba(255,255,255,.08)` on dark topbars and `rgba(0,0,0,.05)` on Clean Light.

**AC-7 — First-load default (no localStorage):**
**Given** no theme value in `localStorage` and `prefers-color-scheme: dark`,
**Then** Deep Ocean is applied on cold load (already handled in main.tsx — verify this still works).
**Given** no theme value in `localStorage` and `prefers-color-scheme: light or unset`,
**Then** Clean Light is applied (already handled in main.tsx — verify).

## Tasks / Subtasks

- [x] **Task 1: Create `useTheme` hook** (AC: 1, 2, 7)
  - [x] Create `src/client/src/lib/useTheme.ts`
  - [x] Hook reads the current theme from `document.documentElement.dataset.theme` (initialized by main.tsx)
  - [x] Exposes `{ theme, setTheme }` — setTheme writes to both `document.documentElement.dataset.theme` AND `localStorage.setItem("fishtank-theme", value)`
  - [x] Theme type: `"clean-light" | "deep-ocean" | "emerald-terminal" | "ink-amber"`
  - [x] Initial state reads from `document.documentElement.dataset.theme || "clean-light"` — avoids re-applying what main.tsx already set (prevents flash)
  - [x] **data-testid NOT needed on this hook** — tested via the UI component

- [x] **Task 2: Create AppearanceSettings component** (AC: 1, 2)
  - [x] Create `src/client/src/features/settings/components/AppearanceSettings.tsx`
  - [x] Import and use `useTheme`
  - [x] Render a fieldset with 4 radio buttons — one per theme. Labels: "Clean Light", "Deep Ocean", "Emerald Terminal", "Ink & Amber"
  - [x] `data-testid="settings-appearance"` on the container `<section>`
  - [x] `data-testid="theme-option-clean-light"`, `data-testid="theme-option-deep-ocean"`, `data-testid="theme-option-emerald-terminal"`, `data-testid="theme-option-ink-amber"` on each radio input
  - [x] `aria-label="Select theme"` on the `<fieldset>` (or `<legend>` with text "Theme")
  - [x] On radio change → call `setTheme(value)` → immediate visual update + localStorage write
  - [x] Currently selected theme radio is checked on initial render

- [x] **Task 3: Wire AppearanceSettings into SettingsPage** (AC: 1)
  - [x] Update `src/client/src/features/settings/pages/SettingsPage.tsx`
  - [x] Import `AppearanceSettings`
  - [x] Replace the `"Configured in a later story."` placeholder in the `appearance` case with `<AppearanceSettings />`
  - [x] All other sections (activity, cache, mocks-root) remain as placeholder text

- [x] **Task 4: Verify theme.css correctness** (AC: 3, 4, 5, 6)
  - [x] Read `src/client/src/styles/theme.css` and confirm all 4 blocks already contain the required DESIGN.md tokens listed in AC-3, AC-4, AC-5, AC-6
  - [x] If any token is missing or wrong — fix in place. CSS is NOT NEW — do not recreate the file.
  - [x] Confirm `--success-subtle` is in every theme block ✓ (story 1-3 added it)
  - [x] Confirm `--brand-fg` is in every theme block ✓ (story 1-3 added it)
  - [x] Confirm `--topbar-icon-fg` is in every theme block ✓ (story 1-3 added it)

- [x] **Task 5: E2E acceptance test** (AC: 1, 2, T-1-4-01)
  - [x] Create `src/client/tests/e2e/story-1-4-themes.spec.ts`
  - [x] T-1-4-01: All 4 `[data-theme="…"]` CSS blocks are present in the loaded stylesheet (Playwright evaluate)
  - [x] T-1-4-02: Navigate to `/settings`, select Deep Ocean → `<html>` `data-theme` updates immediately
  - [x] T-1-4-03: Select a theme, reload → same theme is still active (localStorage round-trip)
  - [x] Tests use `page.goto('/settings')` — assumes user is authenticated (re-use existing auth helper from `tests/support/`)
  - [x] Mock all API calls (same pattern as story-1-3 tests) using `page.route`

- [x] **Task 6: Unit test for useTheme hook** (AC: 1, 2)
  - [x] Create `src/client/tests/unit/lib/useTheme.test.ts`
  - [x] Test: default reads from `document.documentElement.dataset.theme`
  - [x] Test: setTheme updates both DOM attribute and localStorage
  - [x] Test: setTheme with each of the 4 valid theme values works without error
  - [x] Use `@testing-library/react` `renderHook`; jsdom environment

## Dev Notes

### What Story 1-3 Already Did (DO NOT REDO)
- `src/client/src/styles/theme.css` — all 4 CSS variable blocks are fully written with correct DESIGN.md values. Verify, don't recreate.
- `src/client/src/main.tsx` — theme initialization (localStorage → prefers-color-scheme → set `dataset.theme`) already runs on startup. `useTheme` hook should read from `dataset.theme`, not re-apply the initialization logic.
- Settings sub-nav structure — already wired in SettingsPage.tsx with "Configured in a later story." placeholders. Only replace the `appearance` section content.

### useTheme Implementation Pattern
```typescript
// src/client/src/lib/useTheme.ts
type Theme = "clean-light" | "deep-ocean" | "emerald-terminal" | "ink-amber";

const THEME_KEY = "fishtank-theme";

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(
    () => (document.documentElement.dataset.theme as Theme) || "clean-light"
  );

  const setTheme = useCallback((newTheme: Theme) => {
    document.documentElement.dataset.theme = newTheme;
    try {
      localStorage.setItem(THEME_KEY, newTheme);
    } catch {
      // localStorage unavailable — visual change still applied
    }
    setThemeState(newTheme);
  }, []);

  return { theme, setTheme };
}
```

### AppearanceSettings Layout
- Simple section: `<legend>` or `<h3>` "Theme", then 4 radio buttons with labels
- Use `var(--content-fg)` for label text, `var(--border)` for any dividers
- No custom styled radio buttons needed — native `<input type="radio">` is fine for MVP
- No external component library beyond what's already installed

### CSS Architecture Mandates
- Never hardcode hex values in components — always use CSS custom properties
- The theme variables apply because `data-theme` is set on `<html>` — all descendant elements inherit them automatically
- Do NOT import theme.css again in components — already imported in main.tsx

### Architecture Mandates (from project-context.md)
- Each feature folder (`features/{feature}/`) is self-contained
- `data-testid` mandatory on every interactive and structural element
- `components/ui/` is shadcn/ui generated — never hand-edit
- All routes defined in `router.tsx` — feature folders export page components only
- Only use CSS custom properties for colors — never hardcode hex values

### Test Infrastructure Notes
- E2E tests use `page.route()` to mock API responses — see `tests/e2e/story-1-3-shell.spec.ts` for established patterns
- Unit tests use Vitest + `@testing-library/react` + jsdom — see `tests/unit/features/auth/` for patterns
- `useBreakpoint` hook in `src/client/src/lib/useBreakpoint.ts` is already wired — no need to redeclare

### data-testid Contract
| Element | data-testid |
|---------|-------------|
| Appearance section container | `settings-appearance` |
| Clean Light radio | `theme-option-clean-light` |
| Deep Ocean radio | `theme-option-deep-ocean` |
| Emerald Terminal radio | `theme-option-emerald-terminal` |
| Ink & Amber radio | `theme-option-ink-amber` |

### Files to CREATE (NEW)
- `src/client/src/lib/useTheme.ts`
- `src/client/src/features/settings/components/AppearanceSettings.tsx`
- `src/client/tests/e2e/story-1-4-themes.spec.ts`
- `src/client/tests/unit/lib/useTheme.test.ts`

### Files to UPDATE (MODIFY ONLY — read before touching)
- `src/client/src/features/settings/pages/SettingsPage.tsx` — replace appearance placeholder only
- `src/client/src/styles/theme.css` — verify/fix tokens only if needed; do NOT recreate

### References
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.4]
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-Fishtank-2026-06-04/DESIGN.md#Four named themes]
- [Source: _bmad-output/project-context.md#Frontend Rules]
- [Source: src/client/src/styles/theme.css — current token values]
- [Source: src/client/src/main.tsx — existing initialization logic]
- [Source: src/client/src/features/settings/pages/SettingsPage.tsx — current placeholder]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (GitHub Copilot)

### Debug Log References

### Completion Notes List

### File List
