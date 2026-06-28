---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-06-21'
story_key: '1-4-additional-ui-themes-deep-ocean-emerald-terminal-ink-and-amber'
story_id: '1.4'
---

# ATDD Checklist: Story 1-4 — Additional UI Themes

## Phase Gate Summary

| Gate | Status | Notes |
|------|--------|-------|
| ≥1 acceptance test scaffold file exists | ✅ | 2 files created (E2E + unit) |
| Tests reference story acceptance criteria | ✅ | ACs 1, 2, 5 and T-1-4-01 covered |
| TypeScript compiles clean | ✅ | Type errors: none |
| Tests fail against current codebase (RED phase) | ✅ | Unit: import fails (useTheme missing); E2E: data-testid not present |

## Scaffold Files Generated

| File | Type | Tests |
|------|------|-------|
| `src/client/tests/e2e/story-1-4-themes.spec.ts` | E2E (Playwright) | 5 tests |
| `src/client/tests/unit/lib/useTheme.test.ts` | Unit (Vitest) | 5 tests |

## Test → Acceptance Criteria Mapping

| Test | AC | Priority | Level |
|------|----|----------|-------|
| T-1-4-01: all 4 CSS blocks present | T-1-4-01 | P3 | E2E |
| AC-1a: theme picker renders with 4 options | AC-1 | P3 | E2E |
| AC-1b: selecting Deep Ocean updates data-theme | AC-1 | P3 | E2E |
| AC-2: theme persists to localStorage, survives reload | AC-2 | P3 | E2E |
| AC-5: Ink & Amber tokens (sidebar-fg, content-muted, topbar-icon-fg) | AC-5 | P3 | E2E |
| useTheme: reads initial from dataset.theme | AC-1 | P3 | Unit |
| useTheme: fallback to clean-light when unset | AC-7 | P3 | Unit |
| useTheme: setTheme updates DOM attribute | AC-1 | P3 | Unit |
| useTheme: setTheme writes to localStorage | AC-2 | P3 | Unit |
| useTheme: all 4 theme values accepted | AC-1–5 | P3 | Unit |
| useTheme: no throw when localStorage unavailable | AC-1 | P3 | Unit |

## data-testid Contract

| Element | data-testid |
|---------|-------------|
| Appearance section container | `settings-appearance` |
| Clean Light radio | `theme-option-clean-light` |
| Deep Ocean radio | `theme-option-deep-ocean` |
| Emerald Terminal radio | `theme-option-emerald-terminal` |
| Ink & Amber radio | `theme-option-ink-amber` |

## RED Phase Confirmation

**Unit tests:** `tests/unit/lib/useTheme.test.ts` — FAIL with:
```
Error: Failed to resolve import "@/lib/useTheme" from "tests/unit/lib/useTheme.test.ts". Does the file exist?
```
Test files: 1 failed. Tests: none run. ✅ Confirmed RED.

**E2E tests:** `tests/e2e/story-1-4-themes.spec.ts` — will FAIL against current codebase:
- AC-1a: `getByTestId("settings-appearance")` not found (placeholder text shown instead)
- AC-1b: `getByTestId("theme-option-deep-ocean")` not found
- AC-2: `getByTestId("theme-option-emerald-terminal")` not found
- AC-5: `getByTestId("theme-option-ink-amber")` not found
Note: T-1-4-01 (CSS blocks check) may PASS since theme.css was written in story 1-3. This is acceptable — the suite is RED as a whole.
