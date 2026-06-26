---
story_key: "1-4-additional-ui-themes-deep-ocean-emerald-terminal-ink-and-amber"
generated: "2026-06-26"
verdict: "CONCERNS"
stepsCompleted: ["step-05-generate-report"]
lastStep: "step-05-generate-report"
lastSaved: "2026-06-26"
retroactively_generated: true
---

# NFR Assessment — Story 1.4
# Additional UI Themes — Deep Ocean, Emerald Terminal, Ink & Amber

**Generated:** 2026-06-26 (retroactively generated)
**Story:** 1.4 — Additional UI Themes (Deep Ocean, Emerald Terminal, Ink & Amber)
**Overall Gate Decision:** ⚠️ CONCERNS — 0 BLOCKER items; 1 CONCERNS item deferred to pre-ship gate PSG-2

> **Retroactive note:** This artifact was not persisted during the original Story 1.4 review.
> Story 1.4 is the "Additional UI themes" (CSS/UI-only) story, and the original review treated it
> as NFR-not-applicable. That was incorrect: NFR evaluation **is** applicable for a theming story
> (theme contrast/accessibility, maintainability of the CSS-variable token system, theme-switch
> performance, persistence reliability). This document was retroactively generated on **2026-06-26**
> from the as-merged code. All evidence cites real file paths and lines in the implemented codebase.

---

## NFR Evidence by Category

### Accessibility / Usability
*(treated as the quality axis equivalent to "Security" for a UI-only theming story)*

| NFR | Description | Evidence | Score |
|-----|-------------|----------|-------|
| WCAG 2.1 AA contrast — full audit | Full contrast audit across all 4 themes is **not** completed in this story. It is the deferred pre-ship gate **PSG-2** ("WCAG 2.1 AA audit — full contrast audit across all 4 themes; must be scheduled after Epic 4 closes"), `releases.yaml:123-125`, `cleared: false`; also tracked `sprint-status.yaml:147` (`pre-ship-gate-2-wcag-21-aa-contrast-audit: backlog`). | ⚠️ CONCERNS (pending PSG-2) |
| WCAG 2.1 AA contrast — spot checks | Per-theme token values are spot-checked in the E2E test. `story-1-4-themes.spec.ts:190-193` asserts Ink & Amber `--sidebar-fg: #a1a1aa` (≈6.9:1 on zinc-900) and `--content-muted: #52525b` (≈7.5:1) — both above the AA 4.5:1 threshold for the spot-checked pairs. | ✅ PASS (spot-check only) |
| Topbar icon legibility | `--topbar-icon-fg` is defined per theme and contrasts against the dark topbar: `#ffffff` on Emerald Terminal (`theme.css:120`) and Ink & Amber (`theme.css:135`); `#cbd5e1` on Deep Ocean over `#0a1628` topbar (`theme.css:98,105`). Verified by `story-1-4-themes.spec.ts:194-199`. | ✅ PASS |
| Semantic / keyboard-accessible picker | Theme picker uses a native `<fieldset>` + `<legend>Theme</legend>` with `aria-label="Select theme"` and native `<input type="radio">` elements (`AppearanceSettings.tsx:16-19,51-59`) — keyboard-navigable and screen-reader announceable without custom ARIA. | ✅ PASS |
| Color not sole signal | The picker pairs each radio with a text `<label>` ("Clean Light", "Deep Ocean", "Emerald Terminal", "Ink & Amber") — `AppearanceSettings.tsx:4-9,60` — selection is never conveyed by color alone. | ✅ PASS |

**Accessibility / Usability gate: CONCERNS** — Spot-checked contrast and a fully accessible picker pass now; the *full* WCAG 2.1 AA audit across all 4 themes is intentionally deferred to pre-ship gate **PSG-2** (post-Epic 4). This is a tracked, accepted deferral — **not a blocker for this story**.

---

### Maintainability

| NFR | Description | Evidence | Score |
|-----|-------------|----------|-------|
| CSS-variable token architecture | All theming flows through CSS custom properties scoped per `[data-theme="…"]` selector block (`theme.css:80-139`). Each of the 4 themes is a self-contained token block; the `:root` block (`theme.css:7-77`) holds Clean-Light defaults plus theme-invariant status tokens. | ✅ PASS |
| Theme added without component changes | A theme is activated purely by setting `data-theme` on `<html>` (`useTheme.ts:29`); descendant components inherit the swapped variables automatically. No component edits were required to support the 3 new themes — `AppearanceSettings` is data-driven from a single `THEMES` array (`AppearanceSettings.tsx:4-9`). | ✅ PASS |
| No hardcoded colors in components | `Grep` for hex literals (`#[0-9a-fA-F]{3,6}`) across `src/client/src/features/settings` returns **no matches**. `AppearanceSettings.tsx` and `SettingsPage.tsx` use only `var(--…)` tokens (`AppearanceSettings.tsx:24,48,58`; `SettingsPage.tsx:36-38,71-75`). | ✅ PASS |
| Single source for theme contract | The `Theme` union type (`useTheme.ts:3-7`) is exported and reused by `AppearanceSettings` (`AppearanceSettings.tsx:2`) — adding/removing a theme is a single-point change to the union + the `THEMES` array. | ✅ PASS |
| No duplicated init logic | `useTheme` reads the already-applied `document.documentElement.dataset.theme` rather than re-running the bootstrap logic in `main.tsx:13-28` (`useTheme.ts:22-26`), preventing a flash-of-default and avoiding logic duplication. | ✅ PASS |
| Test coverage anchors contract | Hook contract covered by `useTheme.test.ts` (7 unit tests, incl. all 4 themes and localStorage-failure path); ACs covered by `story-1-4-themes.spec.ts` (6 E2E tests). | ✅ PASS |

**Maintainability gate: PASS**

---

### Performance

| NFR | Description | Evidence | Score |
|-----|-------------|----------|-------|
| Instant theme switch (no reload) | `setTheme` mutates `document.documentElement.dataset.theme` synchronously (`useTheme.ts:29`); the browser recomputes inherited CSS custom properties in place — no module reload, no network round-trip, no React tree remount. Verified by `story-1-4-themes.spec.ts:123-136` (data-theme updates immediately on click, no reload). | ✅ PASS |
| No layout thrash | Only color/shadow CSS variables change between themes (`theme.css:80-139`); no layout-affecting properties (width/display/position) are theme-scoped, so a switch triggers repaint without reflow of the layout tree. | ✅ PASS |
| `prefers-reduced-motion` respected | `theme.css:142-154` disables `transition`/`animation` (`!important`) on all 8 animated elements (sidebar, collapse-chevron, live-pulse, bottom-sheet, toast, notification-badge, refresh-icon, recording-cross-screen) under `@media (prefers-reduced-motion: reduce)`. | ✅ PASS |

**Performance gate: PASS**

---

### Reliability

| NFR | Description | Evidence | Score |
|-----|-------------|----------|-------|
| Persisted theme restored on reload | `setTheme` writes the selection to `localStorage["fishtank-theme"]` (`useTheme.ts:31`); `main.tsx:14-16` reads it on cold load and re-applies it before render — the stored theme wins over `prefers-color-scheme`. Verified by `story-1-4-themes.spec.ts:144-166` (select → reload → same theme active). | ✅ PASS |
| System-preference fallback | When no stored theme exists, `main.tsx:17-24` falls back to `prefers-color-scheme` (dark → `deep-ocean`, light/unset → `clean-light`). Verified by `story-1-4-themes.spec.ts:207-225` (cold load, dark preference → Deep Ocean). | ✅ PASS |
| Graceful localStorage failure | Both the write path (`useTheme.ts:30-35`) and the bootstrap read path (`main.tsx:13,25-28`) wrap localStorage access in `try/catch`; on failure the visual change is still applied via the DOM attribute and bootstrap defaults to `clean-light`. Verified by `useTheme.test.ts:94-113` (setTheme does not throw when `localStorage.setItem` throws; DOM still updated). | ✅ PASS |
| Safe default when attribute unset | `useTheme` initial state defaults to `"clean-light"` when `dataset.theme` is absent (`useTheme.ts:22-26`); verified by `useTheme.test.ts:44-50`. | ✅ PASS |

**Reliability gate: PASS**

---

## Remediation Log

No remediation actions required for this story. One quality item is intentionally deferred:

1. **Full WCAG 2.1 AA contrast audit across all 4 themes** — deferred to pre-ship gate **PSG-2**
   (`releases.yaml:123-125`, `sprint-status.yaml:147`), scheduled after Epic 4 closes. Story 1.4
   ships with spot-checked contrast values and a fully accessible (keyboard + screen-reader) picker;
   the comprehensive axe-core scan (test design P2-001) runs at the PSG-2 milestone. This is a tracked,
   accepted deferral and does **not** block Story 1.4 (per `sprint-status.yaml:53`, Story 1.4 is
   non-blocking and does not gate any Epic 2 story).

---

## Gate-Ready YAML

```yaml
nfr_gate:
  story_key: "1-4-additional-ui-themes-deep-ocean-emerald-terminal-ink-and-amber"
  verdict: CONCERNS
  retroactively_generated: true
  categories:
    accessibility_usability: CONCERNS  # full WCAG 2.1 AA audit deferred to PSG-2
    maintainability: PASS
    performance: PASS
    reliability: PASS
  blockers: 0
  concerns: 1
  deferred_gates:
    - id: "PSG-2"
      description: "Full WCAG 2.1 AA contrast audit across all 4 themes (post-Epic 4)"
      blocks_story: false
      blocks_v1_release: true
  generated: "2026-06-26"
```
