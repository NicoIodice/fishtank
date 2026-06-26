---
date: 2026-06-26
phase: test-automate
story_id: "1.4"
story_key: 1-4-additional-ui-themes-deep-ocean-emerald-terminal-ink-and-amber
story_title: "Additional UI Themes — Deep Ocean, Emerald Terminal, Ink & Amber"
reconstructed: true
reconstructed_on: 2026-06-26
reconstructed_note: >
  This summary was retroactively reconstructed on 2026-06-26 from the test suite
  that actually exists in the repo. The base `bmad-testarch-automate` skill wrote a
  generic `automation-summary.md` and never persisted a per-story copy. Test counts
  and coverage below reflect the real test files on disk, not the original run.
---

# Test Automation Summary — Story 1-4: Additional UI Themes (Deep Ocean, Emerald Terminal, Ink & Amber)

**Date:** 2026-06-26
**Phase:** test-automate (retroactively reconstructed)
**Story:** `1-4-additional-ui-themes-deep-ocean-emerald-terminal-ink-and-amber`
**Test Suite Outcome:** 12 tests covering the theme picker, persistence, and token application — 6 unit + 6 E2E

---

## Test Files

| File | Suite | Layer | Tests |
|------|-------|-------|-------|
| `src/client/tests/unit/lib/useTheme.test.ts` | Vitest + @testing-library/react (jsdom) | unit | 6 |
| `src/client/tests/e2e/story-1-4-themes.spec.ts` | Playwright | e2e | 6 |

**Total: 12 tests** (6 unit + 6 E2E)

---

## Coverage Table (AC → test → layer → status)

| AC | Description | Covering test(s) | Layer | Status |
|----|-------------|------------------|-------|--------|
| AC-1 | Theme picker in Settings → Appearance; selection updates `data-theme` on `<html>` immediately and writes `localStorage["fishtank-theme"]` | `useTheme > setTheme updates document.documentElement.dataset.theme`; `useTheme > setTheme writes the theme to localStorage under 'fishtank-theme'`; E2E `AC-1a: Settings → Appearance renders a theme picker with 4 options`; E2E `AC-1b: selecting Deep Ocean updates data-theme on <html> immediately` | unit + e2e | FULL |
| AC-2 | Theme persists on reload — does not revert to `prefers-color-scheme` | `useTheme > setTheme writes the theme to localStorage`; E2E `AC-2: theme selection persists to localStorage and survives page reload` | unit + e2e | FULL |
| AC-3 | Deep Ocean theme tokens applied (`sidebar-fg`, `content-muted`, shadows, etc.) | E2E `AC-1b: selecting Deep Ocean updates data-theme` (applies theme); `T-1-4-01` confirms the `[data-theme="deep-ocean"]` block is present in the loaded stylesheet | e2e | PARTIAL |
| AC-4 | Emerald Terminal theme tokens applied (`topbar-icon-fg: #ffffff`, etc.) | E2E `T-1-4-01` confirms the `[data-theme="emerald-terminal"]` block is present; `AC-2` selects Emerald Terminal and confirms it is applied/persisted (does not assert individual token values) | e2e | PARTIAL |
| AC-5 | Ink & Amber theme tokens applied (`sidebar-fg: #a1a1aa`, `content-muted: #52525b`, `topbar-icon-fg: #ffffff`) | E2E `AC-5: Ink & Amber theme applies correct sidebar-fg and content-muted tokens` (asserts computed token values) | e2e | FULL |
| AC-6 | Required tokens (`--success-subtle`, `--brand-fg`, `--topbar-icon-fg`) present in ALL theme blocks; correct hover backgrounds | `T-1-4-01` confirms all 4 `[data-theme]` blocks exist; AC-5 asserts `--topbar-icon-fg` for Ink & Amber. No test asserts `--success-subtle`/`--brand-fg` presence per-block, nor hover-background values | e2e | PARTIAL |
| AC-7 | First-load default: no `localStorage` + `prefers-color-scheme: dark` → Deep Ocean; light/unset → Clean Light | E2E `T-1-4-03: cold load with prefers-color-scheme: dark applies Deep Ocean theme`; unit `useTheme > falls back to 'clean-light' when dataset.theme is empty or unset`. The dark-default branch is covered; the explicit light/unset → Clean Light cold-load branch is not directly asserted | unit + e2e | PARTIAL |

---

## Per-Suite Test Breakdown

### Unit — `src/client/tests/unit/lib/useTheme.test.ts` (6 tests)

| # | Test | What it verifies | AC |
|---|------|------------------|----|
| 1 | `reads initial theme from document.documentElement.dataset.theme` | Hook initial state reads from `<html data-theme>` | AC-1 |
| 2 | `falls back to 'clean-light' when dataset.theme is empty or unset` | Default fallback | AC-7 |
| 3 | `setTheme updates document.documentElement.dataset.theme` | DOM attribute mutation | AC-1 |
| 4 | `setTheme writes the theme to localStorage under 'fishtank-theme'` | Persistence write | AC-1, AC-2 |
| 5 | `setTheme works for all 4 valid theme values` | All 4 theme values accepted (DOM + localStorage) | AC-1 |
| 6 | `setTheme does not throw when localStorage is unavailable` | Graceful degradation — visual change still applied | AC-1 |

### E2E — `src/client/tests/e2e/story-1-4-themes.spec.ts` (6 tests)

| # | Test | What it verifies | AC |
|---|------|------------------|----|
| 1 | `T-1-4-01: all 4 theme CSS variable blocks are present in the stylesheet` | All 4 `[data-theme="…"]` selector blocks loaded | AC-3/4/5/6 (foundation) |
| 2 | `AC-1a: Settings → Appearance renders a theme picker with 4 options` | Picker container + 4 radio testids visible | AC-1 |
| 3 | `AC-1b: selecting Deep Ocean updates data-theme on <html> immediately` | Immediate `data-theme` update, no reload | AC-1, AC-3 |
| 4 | `AC-2: theme selection persists to localStorage and survives page reload` | localStorage round-trip + persistence after reload | AC-2, AC-4 |
| 5 | `AC-5: Ink & Amber theme applies correct sidebar-fg and content-muted tokens` | Computed token values for Ink & Amber | AC-5 |
| 6 | `T-1-4-03: cold load with prefers-color-scheme: dark applies Deep Ocean theme` | Dark cold-load default | AC-7 |

---

## Coverage Summary

| AC | Status |
|----|--------|
| AC-1 | FULL |
| AC-2 | FULL |
| AC-3 | PARTIAL |
| AC-4 | PARTIAL |
| AC-5 | FULL |
| AC-6 | PARTIAL |
| AC-7 | PARTIAL |

**FULL: 3 · PARTIAL: 4 · NONE: 0**

---

## Gaps

- **AC-3 (Deep Ocean tokens):** Tests confirm the Deep Ocean block exists and the theme is applied, but no test asserts the specific Deep Ocean token values (`sidebar-fg: #94a3b8`, `--shadow-raised`, `--shadow-overlay`, `error-row-bg`). Only Ink & Amber (AC-5) has explicit per-token value assertions.
- **AC-4 (Emerald Terminal tokens):** No test asserts Emerald Terminal token values (e.g. `topbar-icon-fg: #ffffff`). Coverage is limited to block-presence and theme-application/persistence.
- **AC-6 (required tokens in all blocks + hover backgrounds):** No test enumerates `--success-subtle` / `--brand-fg` per theme block, and the hover-background rules (`rgba(255,255,255,.08)` on dark topbars, `rgba(0,0,0,.05)` on Clean Light) are not asserted anywhere.
- **AC-7 (light/unset cold-load default):** The dark → Deep Ocean cold-load path is asserted (E2E T-1-4-03) and the hook fallback to `clean-light` is unit-tested, but there is no E2E test that exercises a cold load with `prefers-color-scheme: light/unset` and asserts Clean Light is applied via `main.tsx`.
- **AppearanceSettings component:** There is no isolated component test for `AppearanceSettings.tsx`; its behaviour is covered only indirectly through the `useTheme` unit tests and the Playwright E2E flow. (The story did not call for a standalone component test — Task 6 specified only the `useTheme` unit test — so this is an intentional gap, not a missing deliverable.)

These gaps are token-value assertion gaps, not behavioural gaps: the picker, immediate application, and persistence (the story's core deliverables) are fully covered. The DESIGN.md token correctness for Deep Ocean / Emerald Terminal / required-token presence relies on the Story 1.3 CSS being correct plus the block-presence check (T-1-4-01).
