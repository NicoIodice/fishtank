---
story_key: 1-4-additional-ui-themes-deep-ocean-emerald-terminal-ink-and-amber
generated: "2026-06-28"
phase: trace
gate_decision: PASS
---

# Traceability Matrix — Story 1.4: Additional UI Themes (Deep Ocean, Emerald Terminal, Ink & Amber)

## Coverage Summary

| AC | Description | E2E | Unit | NFR | Status |
|----|-------------|-----|------|-----|--------|
| AC-1 | Theme picker in Settings → Appearance; selection updates `data-theme` on `<html>` and writes `localStorage["fishtank-theme"]` | `story-1-4-themes.spec.ts` (AC-1a: picker renders 4 options; AC-1b: Deep Ocean updates data-theme) | `useTheme.test.ts` (setTheme updates dataset.theme; writes to localStorage; all 4 themes accepted) | — | ✅ Covered |
| AC-2 | Theme persists on reload — does not revert to prefers-color-scheme | `story-1-4-themes.spec.ts` (AC-2: localStorage persists, survives reload) | `useTheme.test.ts` (setTheme writes under 'fishtank-theme') | — | ✅ Covered |
| AC-3 | Deep Ocean theme CSS block + token values | `story-1-4-themes.spec.ts` (T-1-4-01: [data-theme="deep-ocean"] block present; AC-1b: data-theme applied) | — | — | ⚠️ Partial (block present; individual token values not asserted) |
| AC-4 | Emerald Terminal theme CSS block + token values | `story-1-4-themes.spec.ts` (T-1-4-01: [data-theme="emerald-terminal"] block present) | — | — | ⚠️ Partial (block present; individual token values not asserted) |
| AC-5 | Ink & Amber theme token values (`sidebar-fg: #a1a1aa`, `content-muted: #52525b`, `topbar-icon-fg: #ffffff`) | `story-1-4-themes.spec.ts` (AC-5: computed CSS variable values asserted) | — | — | ✅ Covered |
| AC-6 | Required tokens (`--success-subtle`, `--brand-fg`, `--topbar-icon-fg`) present in ALL theme blocks | `story-1-4-themes.spec.ts` (T-1-4-01: all 4 theme blocks present; AC-5: topbar-icon-fg for Ink & Amber) | — | — | ⚠️ Partial (presence of blocks confirmed; per-block token completeness not fully asserted) |
| AC-7 | Cold-load default: `prefers-color-scheme: dark` → Deep Ocean; no preference / light → Clean Light | `story-1-4-themes.spec.ts` (T-1-4-03: dark cold-load → Deep Ocean) | `useTheme.test.ts` (falls back to 'clean-light' when dataset.theme unset) | — | ⚠️ Partial (dark branch E2E covered; light/unset cold-load not E2E-asserted) |

## Test Inventory

| Test File | Framework | Count | ACs Covered |
|-----------|-----------|-------|-------------|
| `src/client/tests/e2e/story-1-4-themes.spec.ts` | Playwright | 6 | AC-1,2,3,4,5,6,7 |
| `src/client/tests/unit/lib/useTheme.test.ts` | Vitest | 6 | AC-1,2,7 |
| **Total** | | **12** | |

## Gap Analysis

| AC | Gap | Risk | Disposition |
|----|-----|------|-------------|
| AC-3 | Deep Ocean per-token computed values not asserted | LOW | All 4 theme CSS blocks confirmed present via T-1-4-01; token values verified manually and via NFR assessment |
| AC-4 | Emerald Terminal per-token computed values not asserted | LOW | Same as AC-3 |
| AC-6 | `--success-subtle` and `--brand-fg` not asserted per-block | LOW | Ink & Amber `--topbar-icon-fg` is asserted; extending to all tokens/blocks is a high-maintenance test with low incremental confidence |
| AC-7 | Light/unset cold-load branch not E2E-asserted | LOW | Unit hook test covers the `clean-light` fallback path; E2E would require clearing `prefers-color-scheme` override |

## Gate Decision

**PASS** — All theme switching, persistence, and CSS block loading ACs are covered. Partial
coverage on computed token values for Deep Ocean and Emerald Terminal is accepted; the presence
of all four `[data-theme]` CSS blocks is verified. Ink & Amber token assertions provide the
most critical coverage. No blockers.
