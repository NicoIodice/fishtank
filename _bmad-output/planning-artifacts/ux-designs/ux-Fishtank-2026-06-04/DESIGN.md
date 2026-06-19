---
name: Fishtank
version: "1.0"
status: draft
updated: 2026-06-05
ui-system: "shadcn/ui + Tailwind CSS"

colors:
  # ── Semantic tokens (CSS variable names; resolved per theme class) ──────────
  # Default values = Clean Light theme
  brand:                  "#0ea5e9"   # sky-500
  brand-fg:               "#ffffff"
  brand-rgb:              "14,165,233"  # RGB channels of {colors.brand}; used as rgba(var(--brand-rgb), opacity) for theme-aware transparency — overridden per theme
  sidebar-bg:             "#f1f5f9"   # slate-100
  sidebar-fg:             "#475569"   # slate-600
  sidebar-active-bg:      "#e0f2fe"   # sky-100
  sidebar-active-fg:      "#0369a1"   # sky-700
  topbar-bg:              "#ffffff"
  topbar-border:          "#e2e8f0"   # slate-200
  content-bg:             "#ffffff"
  content-surface:        "#f8fafc"   # slate-50 — table headers, input bg
  content-fg:             "#1e293b"   # slate-800
  content-muted:          "#64748b"   # slate-500
  border:                 "#e2e8f0"   # slate-200
  input-bg:               "#f8fafc"   # slate-50
  input-border:           "#cbd5e1"   # slate-300

  # ── Status / semantic (theme-invariant) ────────────────────────────────────
  success:                "#22c55e"   # green-500
  success-subtle:         "#dcfce7"   # green-100
  warning:                "#f59e0b"   # amber-500
  warning-subtle:         "#fef3c7"   # amber-100
  error:                  "#ef4444"   # red-500
  error-subtle:           "#fee2e2"   # red-100
  info:                   "#3b82f6"   # blue-500
  info-subtle:            "#dbeafe"   # blue-100

  # ── HTTP method chip colors (theme-invariant) ──────────────────────────────
  method-get:             "#3b82f6"   # blue-500 — intentionally matches {colors.info}; GET chips and info indicators appear identical; accept or differentiate before v1 ships. **Gate owner: design lead. Acceptance criteria: decision recorded (accepted identical OR token updated and icon-mock-color updated consistently; differentiated value contrast-validated across all 4 themes).**
  method-get-bg:          "#dbeafe"   # blue-100
  method-post:            "#10b981"   # emerald-500
  method-post-bg:         "#d1fae5"   # emerald-100
  method-put:             "#d97706"   # amber-600 — differentiated from {colors.warning} (#f59e0b / amber-500)
  method-put-bg:          "#fde68a"   # amber-200 — differentiated from {colors.warning-subtle} (#fef3c7 / amber-100)
  method-delete:          "#ef4444"   # red-500 — intentionally matches {colors.error}; DELETE chips on error rows produce double-red (accepted: both signal danger)
  method-delete-bg:       "#fee2e2"   # red-100 — intentionally matches {colors.error-subtle}; see note above
  method-patch:           "#8b5cf6"   # violet-500
  method-patch-bg:        "#ede9fe"   # violet-100
  # Note: standard methods use method-{verb} (fg text color) + method-{verb}-bg; "other" uses explicit -fg/-bg suffixes for clarity.
  method-other-bg:        "#f1f5f9"   # slate-100 — fallback for OPTIONS, HEAD, CONNECT, TRACE
  method-other-fg:        "#475569"   # slate-600 — fallback for OPTIONS, HEAD, CONNECT, TRACE

  # ── Port badge ──────────────────────────────────────────────────────────────
  port-badge-bg:          "#ede9fe"   # violet-100 — shares background with method-patch-bg; distinguished by fg shade (violet-700 vs violet-500) and context (badge vs. chip). Shift to indigo if user testing shows confusion.
  port-badge-fg:          "#6d28d9"   # violet-700

  # ── Network Activity type icons (icon-only, no text chips) ─────────────────
  # Type is shown as a Bootstrap Icon with a tooltip — not as a text chip
  icon-mock-color:        "#3b82f6"   # blue-500 — bi-database; intentionally matches {colors.info} — update both if one changes. Contrast: blue-500 on Deep Ocean #0f2233 ≈ 4.8:1 ✅; validate against all 4 theme backgrounds before v1. **Gate owner: design lead. Acceptance criteria: contrast validated against all 4 theme backgrounds; decision recorded (accepted OR token updated consistently with {colors.info}).**
  icon-proxy-color:       "#10b981"   # emerald-500 — bi-arrow-repeat; intentionally matches {colors.method-post} — update both if one changes. Contrast: emerald-500 on Deep Ocean #0f2233 ≈ 4.3:1 — ⚠️ **Gate owner: design lead.** If measured value falls below 4.5:1, raise to `#34d399` (emerald-400, ≈ 6.8:1 on #0f2233) in the Deep Ocean token block only — per-theme override, as done for `--content-muted`. Update `method-post` Deep Ocean override consistently.

  # ── Network Activity row highlight colors ────────────────────────────────
  # Proxied row (only when service is Live): left border accent
  proxied-live-border:    "#f59e0b"   # amber-500 — intentionally matches {colors.warning}; amber signals active live-proxy state, distinct context from PUT chips
  # ⚠ Known visual overlap: a PUT proxied live row shows both an amber PUT chip (method-put: amber-600 / method-put-bg: amber-200) and this amber-500 left-border. Accept as intentional tradeoff or adjust one shade before v1 ships. **Gate owner: design lead. Acceptance criteria: decision recorded (accepted OR `proxied-live-border` adjusted and contrast-validated) before v1 ships.**
  # Error row (HTTP 5xx or exception): subtle red background
  # ⚠ .04 opacity is nearly invisible on dark theme backgrounds — use var(--error-row-bg) not the YAML literal; dark themes override to .10 in their CSS block
  error-row-bg:           "rgba(239,68,68,.04)"

typography:
  sans:   "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  mono:   "'Cascadia Code', 'Fira Code', 'Consolas', ui-monospace, 'SF Mono', monospace"
  scale:
    "2xs": "0.625rem"    # 10px — badges, unread counts
    xs:    "0.6875rem"   # 11px — table column headers (uppercase)
    sm:    "0.75rem"     # 12px — secondary labels, timestamps, tooltips
    base:  "0.875rem"    # 14px — body, nav items, form labels
    md:    "1rem"        # 16px — page titles
    lg:    "1.125rem"    # 18px — section headings (settings sections)
  weight:
    normal:  400
    medium:  500
    semibold: 600
    bold:    700
    extrabold: 800

rounded:
  sm:   "4px"     # chips, small badges
  md:   "6px"     # inputs, small buttons
  lg:   "8px"     # larger text/action buttons; card-style containers with explicit overflow: hidden
  xl:   "10px"    # nav items, toolbar items
  card: "12px"    # service cards, modals, drawers
  full: "9999px"  # status pills, notification badges, toggles

spacing:
  base-unit: "4px"
  # Tailwind 4-unit system; key layout values:
  topbar-height:          "44px"    # 11 × 4px — aligned to 4px base unit
  sidebar-width-expanded: "200px"
  sidebar-width-collapsed: "52px"
  page-px:                "20px"    # 5 × 4px — aligned to 4px base unit
  page-py:                "20px"    # 5 × 4px — aligned to 4px base unit
  card-p:                 "16px"    # service card internal padding
  nav-item-px:            "16px"    # sidebar nav item horizontal padding
  nav-item-py:            "8px"     # sidebar nav item vertical padding
  toolbar-py:             "12px"    # toolbar top/bottom padding
  section-gap:            "16px"    # 4 × 4px — gap between settings rows / card-stack items

transitions:
  # CSS transition/animation shorthand values — not layout lengths; stored separately from spacing to avoid type confusion.
  sidebar-collapse:  "width 200ms ease"    # sidebar expand/collapse animation
  collapse-chevron:  "transform 200ms ease"  # chevron rotation on sidebar expand/collapse
  bottom-sheet-snap: "transform 200ms ease"  # snap-back on incomplete drag-to-dismiss gesture

components:
  # Visual specs only — behavioral specs live in EXPERIENCE.md
  service-card-min-height: "auto"   # CSS default — no minimum height enforced; cards size to their content
  service-card-grid-cols:  "repeat(3, 1fr)"   # ≥ 1024px; 2 col 640–1023px (Mid-wide + Mid-narrow); 1 col < 640px
  service-card-stopped-opacity: "0.72"   # 72% — stopped services recede without disappearing
  table-row-height:        "36px"
  toggle-width:            "32px"
  toggle-height:           "20px"    # 5 × 4px — aligned to 4px base unit
  topbar-badge-size:       "16px"   # height only (4 × 4px); min-width expands to ≥ 24px to accommodate "99+" (three chars at {typography.scale.2xs})
---

# Brand & Style

Fishtank is a developer and QA tool — a **professional infrastructure product**, not a consumer app. The visual identity communicates **precision, trustworthiness, and speed**. It should feel like the best-in-class internal tooling a senior engineer would be proud to open every day: clean, dense without being cluttered, and readable at a glance.

**Voice in UI chrome:** direct, technical, never cute. Labels use the real term ("Resync Mappings", not "Refresh"); status text is exact ("24 mappings loaded in 142ms", not "Done!").

**Logo mark:** Bootstrap Icon `bi-droplet-half` (placeholder). A custom SVG logo must be designed before v1 ships — this is a **hard v1 release gate**: "Custom SVG logo reviewed and merged" must appear as a completed task in the v1 Definition of Done before the build is tagged for release. The placeholder `bi-droplet-half` must not ship as the final identity. **Gate owner:** product lead (must be assigned before v1 kickoff). **Acceptance criteria:** single-color SVG approved by product lead, merged to main branch, favicon generated at 32×32px (PNG primary) + 16×16px (ICO fallback), and verified for legibility at both sizes. Design constraints for the final logo: rendered at 20×20px beside the wordmark; must be a single-color SVG that accepts a `fill` CSS property so it adapts to the active theme's `{colors.brand-fg}`; must remain legible at 16×16px (favicon use); must have a monochrome fallback for print/high-contrast contexts.

---

# Colors

## Theme system

Four named themes, selectable in Settings → Appearance. Themes are implemented as CSS classes on `<html>` (`data-theme="clean-light"` etc.) that override the CSS custom properties defined in the tokens above. `prefers-color-scheme` maps to Clean Light (light) and Deep Ocean (dark) as system defaults **on first load only**. Once the user selects a theme in Settings, that preference is written to `localStorage` and takes precedence over `prefers-color-scheme` on all subsequent loads. If `localStorage` is cleared, the system default applies again. There is no live sync between `prefers-color-scheme` changes and the active theme — changes take effect only on the next cold load or explicit user selection.

| Theme | Sidebar bg | Accent | Sidebar register |
|---|---|---|---|
| **Clean Light** (default light) | `#f1f5f9` | `#0ea5e9` sky-500 | All-light, minimal border |
| **Deep Ocean** (default dark) | `#0d1b2a` | `#3b82f6` blue-500 | Full dark — sidebar + content + tables all dark |
| **Emerald Terminal** | `#064e3b` | `#10b981` emerald-500 | Deep green sidebar, light content area |
| **Ink & Amber** | `#18181b` | `#f59e0b` amber-500 | Near-black sidebar, white content area |

### Clean Light token overrides
```css
[data-theme="clean-light"] {
  --sidebar-bg: #f1f5f9;   --sidebar-fg: #475569;
  --sidebar-active-bg: #e0f2fe;  --sidebar-active-fg: #0369a1;
  --topbar-bg: #ffffff;    --topbar-border: #e2e8f0;
  --content-bg: #ffffff;   --content-surface: #f8fafc;
  --content-fg: #1e293b;   --content-muted: #64748b;
  --border: #e2e8f0;       --brand: #0ea5e9;   --brand-rgb: 14,165,233;
  --input-bg: #f8fafc;     --input-border: #cbd5e1;
  --topbar-icon-fg: #1e293b;   /* content-fg — legible on white topbar */
  --error-row-bg: rgba(239,68,68,.04);   /* base value — dark themes override to .10 */
  --success-subtle: #dcfce7;   /* green-100 — theme-invariant; defined in every theme block so var(--success-subtle) always resolves */
  --brand-fg: #ffffff;          /* invariant across all themes — always white; declared in each theme block for explicit override capability */
}
```

### Deep Ocean token overrides
```css
[data-theme="deep-ocean"] {
  --sidebar-bg: #0d1b2a;   --sidebar-fg: #94a3b8;   /* slate-400; raised from #64748b (~3.66:1 — WCAG AA fail) to ~5.9:1 */
  --sidebar-active-bg: rgba(59,130,246,.18);  --sidebar-active-fg: #93c5fd;
  --topbar-bg: #0a1628;    --topbar-border: rgba(255,255,255,.07);
  --content-bg: #0f2233;   --content-surface: #0d1b2a;
  --content-fg: #cbd5e1;   --content-muted: #94a3b8;   /* slate-400: ~5.9:1 on #0f2233 — passes WCAG AA */
  --border: rgba(255,255,255,.08);  --brand: #3b82f6;   --brand-rgb: 59,130,246;
  --input-bg: #162d42;     --input-border: rgba(255,255,255,.12);
  --shadow-raised: 0 4px 16px rgba(0,0,0,.40);
  --shadow-overlay: 0 8px 40px rgba(0,0,0,.60);
  --topbar-icon-fg: #cbd5e1;   /* content-fg — legible on dark topbar */
  --error-row-bg: rgba(239,68,68,.10);   /* increased from .04 — .04 is near-invisible on dark navy #0f2233 */
  --success-subtle: #dcfce7;   /* green-100 — theme-invariant */
  --brand-fg: #ffffff;          /* invariant across all themes — always white; declared in each theme block for explicit override capability */
}
```

### Emerald Terminal token overrides
```css
[data-theme="emerald-terminal"] {
  --sidebar-bg: #064e3b;   --sidebar-fg: #6ee7b7;
  --sidebar-active-bg: rgba(16,185,129,.2);  --sidebar-active-fg: #34d399;
  --topbar-bg: #052e20;    --topbar-border: rgba(255,255,255,.08);
  --content-bg: #f9fafb;   --content-surface: #f0fdf4;
  --content-fg: #1e293b;   --content-muted: #64748b;
  --border: #d1fae5;       --brand: #10b981;   --brand-rgb: 16,185,129;
  --input-bg: #ffffff;     --input-border: #a7f3d0;
  --topbar-icon-fg: #ffffff;   /* white — content-fg (#1e293b) is near-invisible on dark topbar (#052e20) */
  --error-row-bg: rgba(239,68,68,.04);   /* base value; light content area (#f9fafb) — .04 is visible */
  --success-subtle: #dcfce7;   /* green-100 — theme-invariant */
  --brand-fg: #ffffff;          /* invariant across all themes — always white; declared in each theme block for explicit override capability */
}
```

### Ink & Amber token overrides
```css
[data-theme="ink-amber"] {
  --sidebar-bg: #18181b;   --sidebar-fg: #a1a1aa;   /* zinc-400; raised from #71717a (~3.66:1 — WCAG AA fail) to ~6.9:1 */
  --sidebar-active-bg: rgba(245,158,11,.15); --sidebar-active-fg: #fbbf24;
  --topbar-bg: #09090b;    --topbar-border: rgba(255,255,255,.07);
  --content-bg: #ffffff;   --content-surface: #fafafa;
  --content-fg: #18181b;   --content-muted: #52525b;   /* zinc-600; raised from #71717a (~4.48:1 — WCAG AA fail for normal text) to ~7.5:1 */
  --border: #e4e4e7;       --brand: #f59e0b;   --brand-rgb: 245,158,11;
  --input-bg: #fafafa;     --input-border: #d4d4d8;
  --topbar-icon-fg: #ffffff;   /* white — content-fg (#18181b) is invisible on near-black topbar (#09090b) */
  --error-row-bg: rgba(239,68,68,.04);   /* base value; light content area (#ffffff) — .04 is visible */
  --success-subtle: #dcfce7;   /* green-100 — theme-invariant */
  --brand-fg: #ffffff;          /* invariant across all themes — always white; declared in each theme block for explicit override capability */
}
```

## Notification badge
Always `#ef4444` (red-500) with white text — never themed. Ensures unread-count visibility regardless of active theme.

## Topbar icon color in dark-sidebar themes
In themes where `--topbar-bg` is a dark color (Deep Ocean: `#0a1628`; Emerald Terminal: `#052e20`; Ink & Amber: `#09090b`), the top-bar icon buttons (About `bi-info-circle`, Bell `bi-bell`, Avatar initials) use `--topbar-icon-fg` as their icon/text color — **not** `--brand` or `--content-fg` directly. `--topbar-icon-fg` is defined per theme in the CSS token blocks to guarantee contrast with `--topbar-bg`. Using `--content-fg` directly is incorrect for Emerald Terminal and Ink & Amber, where `--content-fg` targets the light content area and is effectively invisible on their dark topbars. Hover background on dark topbars: `rgba(255,255,255,.08)`. Hover background on the Clean Light topbar (white `--topbar-bg`): `rgba(0,0,0,.05)`. The wordmark text beside the logo mark uses `--topbar-icon-fg` in all themes — ensuring legibility on both light and dark topbars. (The logo SVG `fill` property also resolves to `--brand-fg` which is `#ffffff` in all default themes.)

**Overflow display:** counts 1–99 display as the number. When unread count exceeds 99, display the literal string `"99+"`. Badge `min-width` must accommodate three characters at `{typography.scale.2xs}` to prevent clipping.

## Live / Stopped service indicator
- Live: `#22c55e` (green-500) dot — `box-shadow: 0 0 0 2px var(--success-subtle)` pulse
- Stopped: `#64748b` (slate-500) dot — no pulse

---

# Typography

System font stack; Inter is listed as the preferred typeface but is not loaded via CDN at runtime (performance requirement). It renders only if available on the user's system — otherwise the stack falls through to `ui-sans-serif`. Bundling Inter in the container image is out of v1 scope. Monospace used for: paths, URLs, mapping GUIDs, JSON bodies, code snippets, port numbers.

**Table column headers:** `{typography.scale.xs}` + `font-weight: {typography.weight.bold}` + `text-transform: uppercase` + `letter-spacing: 0.05em` — distinguishes headers from data without color.

**Nav items:** `{typography.scale.base}` + `font-weight: {typography.weight.medium}`.

**Page titles:** `{typography.scale.md}` + `font-weight: {typography.weight.extrabold}`.

**Timestamps and secondary meta:** `{typography.scale.sm}` + `color: {colors.content-muted}`.

**Button labels:** `{typography.scale.base}` + `font-weight: {typography.weight.medium}`.

**Status pill labels:** `{typography.scale.sm}` + `font-weight: {typography.weight.semibold}`.

---

# Layout & Spacing

4px base unit throughout for **spacing and layout values** (Tailwind default). Border-radius values follow design intent rather than the spacing grid.

**App shell (desktop):**
```
┌─ topbar (44px) ─────────────────────────────────────┐
│ 🐠 Fishtank          [ℹ] [🔔] [avatar]              │
├─ sidebar (200px) ─┬─ main content (flex-1) ──────────┤
│ nav items         │ page header + toolbar + content   │
│                   │                                   │
└───────────────────┴───────────────────────────────────┘
```

**Sidebar:** expanded 200px / collapsed 52px (icon only). Transition: `{transitions.sidebar-collapse}`. Collapse toggle: chevron at sidebar bottom.

**Content area max-width:** uncapped — fills available space. Tables use `table-layout: fixed` with `width: 100%`; no `overflow-x` on table wrapper — column widths defined in `<colgroup>` to prevent horizontal scroll.

**Card grid:** 3 columns desktop (≥ 1024px) → 2 columns mid (640px–1023px) → 1 column mobile (< 640px).

**Canonical breakpoint table** — single source of truth for all responsive behaviour across all components:

| Breakpoint | px range | Sidebar | Card grid | Right drawer | Settings sub-nav |
|---|---|---|---|---|---|
| Desktop | ≥ 1024px | Expanded (200px) | 3 col | Side drawer (320px) | Left nav (170px) |
| Mid-wide | 768px–1023px | Collapsible (default collapsed, 52px) | 2 col | Side drawer (320px) | Left nav (170px) |
| Mid-narrow | 640px–767px | Hidden behind hamburger | 2 col | Side drawer (320px) | `<select>` dropdown |
| Mobile | < 640px | Hidden behind hamburger | 1 col | Bottom sheet (full-width) ¹ | `<select>` dropdown |

> Note: card grid goes 2-col at < 1024px and 1-col at < 640px; the main sidebar hides behind a hamburger at < 768px (Mid-narrow + mobile); the drawer becomes a bottom sheet at < 640px; the Settings sub-nav collapses to a `<select>` at < 768px. The Mid breakpoint is intentionally split: Mid-wide (768–1023px) has a collapsible sidebar, Mid-narrow (640–767px) hides it behind a hamburger. These thresholds are independent and intentional.
>
> ¹ **Row detail exception:** on mobile the right drawer style is overridden to Modal regardless of the user’s preference setting — see Right drawer component spec.

---

# Elevation & Depth

Three levels:
1. **Surface** — cards, table, inputs: `border: 1px solid {colors.border}`, no shadow
2. **Raised** — dropdowns, tooltips: `box-shadow: var(--shadow-raised, 0 4px 16px rgba(0,0,0,.12))`
3. **Overlay** — modals, drawers: `box-shadow: var(--shadow-overlay, 0 8px 40px rgba(0,0,0,.25))` + backdrop `rgba(0,0,0,.5)`

Light themes and mixed-surface themes (Emerald Terminal, Ink & Amber — which have light content areas) use the default shadow values. Deep Ocean overrides via CSS variable (declared in the Deep Ocean token block):
- `--shadow-raised: 0 4px 16px rgba(0,0,0,.40)`
- `--shadow-overlay: 0 8px 40px rgba(0,0,0,.60)`
**Recommended z-index stack** (implementation reference — adjust to fit your Tailwind configuration):

| Layer | z-index | Elements |
|---|---|---|
| Sidebar | 20 | Main `<nav>` sidebar |
| Top bar + backend banner | 30 | `<header>` + unreachable banner |
| Notification panel | 40 | Bell dropdown |
| Right drawer (desktop) | 50 | Side drawer |
| Modal backdrop | 60 | `rgba(0,0,0,.5)` overlay |
| Modal / bottom sheet | 70 | Dialog overlays |
| Toast | 80 | Toast container |
| Tooltip | 90 | Hover/focus tips |
**Top-bar fixed elements** (cross-screen recording indicator, notification badge, avatar initials): inherit the top bar’s z-index — no additional elevation level; they never float above modals or drawers.

---

# Motion & Animation

**Sidebar collapse:** `{transitions.sidebar-collapse}`. **Collapse chevron:** `transform: rotate(180deg)` using `{transitions.collapse-chevron}`.

**Live status pulse:** CSS animation cycling `box-shadow` from `0 0 0 2px var(--success-subtle)` to `0 0 0 5px transparent`, 1.8s infinite ease-in-out.

**Bottom sheet (mobile drawer):** `transform: translateY(100%)` → `translateY(0)` with `300ms ease` slide-up on open.

**Toast entrance/exit:** `opacity 0→1` + `translateY(8px)→0` on enter; reversed on exit. Duration: 150ms.

**Notification badge new-event pulse:** `transform: scale(1.0) → scale(1.3) → scale(1.0)`, 150ms ease-out.

**`prefers-reduced-motion` overrides:** when the user has opted into reduced motion, all transitions and animations are disabled:

```css
@media (prefers-reduced-motion: reduce) {
  .sidebar          { transition: none; }
  .collapse-chevron { transition: none; }
  .live-pulse       { animation: none; box-shadow: 0 0 0 2px var(--success-subtle); }
  .bottom-sheet     { transition: none; }
  .toast            { transition: none; }
  .notification-badge { animation: none; }
  .refresh-icon     { animation: none; }
  .bottom-sheet-drag { opacity: 1 !important; transition: none; } /* drag-to-dismiss opacity transition — suppressed when reduced motion is preferred */
  .recording-cross-screen { transition: none; opacity: 1; } /* cross-screen recording indicator entrance is a CSS transition (opacity 0→1), not a @keyframes animation — `transition: none` is the correct override; `animation: none` does not suppress CSS transitions */
  .notification-new-pill  { animation: none; transition: none; } /* "N new" sticky pill entrance animation */
}
```
/* ⚠ Class names above are illustrative — align with actual shadcn/ui + Tailwind component class names (or replace with `[data-testid]` selectors) before shipping. */

All animated state changes have static visual equivalents — no state is communicated by motion alone.

**Initial app load:** before the React bundle mounts and the first data fetch completes, the HTML shell renders a single centered spinner (`bi-arrow-clockwise` rotating, 32px, `#0ea5e9` /* Clean Light `--brand` default; CSS variable unavailable before React mounts */) on `#ffffff` /* Clean Light `--content-bg` default */. This state is inline-styled at the HTML shell level — no class-based CSS required.

---

# Shapes

- Service cards: `{rounded.card}` — prominent, friendly
- Buttons (text/action): `{rounded.lg}` — confident, not pill-shaped
- Icon-only buttons (top bar, toolbar): `{rounded.xl}` — larger touch target than text buttons
- Sidebar collapse toggle: `border-radius: 50%` (exception — circular affordance intentionally signals “a toggle for a container,” not a standard action button)
- Inputs, selects: `{rounded.md}` — functional
- Nav items: `{rounded.xl}` — roomy
- Status pills (Live / Stopped): `{rounded.full}` — clearly a label not a button
- HTTP method chips: `{rounded.sm}` — compact, badge-like
- Notification badge: `{rounded.full}` — standard circle
- Toggle switch: `{rounded.full}` — both track and thumb
- Tooltips: `{rounded.md}` — compact informational popover
- LIVE/PAUSED toggle: `{rounded.md}` — interactive hit-target boundary; does not resemble a status pill

**Button shape hierarchy:** text/action buttons → `{rounded.lg}`; icon-only buttons (except sidebar collapse) → `{rounded.xl}`; large standalone destructive buttons → `{rounded.lg}`.

---

# Components

## Top bar
Fixed height `{spacing.topbar-height}`. Logo (placeholder `bi-droplet-half` + wordmark, left-aligned — **v1 gate**: see Brand & Style for the hard logo release gate; final SVG required before shipping). Right side: About icon (`bi-info-circle`), notification bell (`bi-bell`) with unread badge, user avatar (initials, gradient background). All icon buttons: 30×30px, `{rounded.xl}`, subtle background on hover.

**User avatar dropdown:** displays account name + role, then a single action: **Sign out** (`bi-box-arrow-right`). Does not contain a Settings link — Settings is accessed via sidebar nav only.

**About modal** (triggered by `bi-info-circle`): max-width 400px, `{rounded.card}`, elevation level 3. Contains: app name + logo mark, version number, Docker image tag (monospace), build hash (monospace), link to documentation (opens in new tab), link to changelog (opens in new tab), close button. No user-editable fields. Dismiss: Esc, click backdrop, or close button. The modal title element (`h2`) carries `id="about-modal-title"` — required so `aria-labelledby="about-modal-title"` resolves correctly. **Documentation and changelog URLs** are sourced from container environment variables `FISHTANK_DOCS_URL` and `FISHTANK_CHANGELOG_URL` — if either is unset, the corresponding link is hidden.

**Backend unreachable banner:** when the backend becomes unreachable, a full-width banner renders immediately below the top bar (not inside it). Visual spec: `{colors.warning}` text, `{colors.warning-subtle}` background, `bi-exclamation-circle` leading icon (16px), `{typography.scale.sm}`, centered text, `{spacing.page-px}` horizontal padding. Positioned as a direct DOM sibling immediately after the top bar element, within the same stacking context. **Layout:** the banner must be `position: fixed`, `top: 44px` (`{spacing.topbar-height}` — note: `--topbar-height` is not defined as a CSS variable in the theme token blocks; use the literal `44px` or add `--topbar-height: 44px;` to every theme block), `left: 0`, `right: 0`, with `z-index` at the same level as the top bar. The main content area must apply a conditional `padding-top` equal to the banner’s rendered height whenever the banner is visible, so content is not obscured beneath it. `data-testid`: `topbar-banner-backend-unreachable`. Copy and behavior: see EXPERIENCE.md State Patterns → Backend unreachable.

## Sidebar
Collapsible. Expanded: 200px with label + icon. Collapsed: 52px with icon only, tooltip on hover. Section divider: 1px `{colors.border}` line; in dark themes (Deep Ocean, Emerald Terminal, Ink & Amber) the divider uses `rgba(255,255,255,.14)` for increased visibility against dark sidebar backgrounds. Collapse chevron at bottom. Unread event counts are surfaced only via the notification bell in the top bar — no badge on sidebar nav items.

**Touch bottom-label:** on touch devices in collapsed state, a brief label below each icon replaces hover tooltips (not available on touch). Visual spec: `{typography.scale.2xs}`, `{colors.content-muted}`, single line, `text-overflow: ellipsis`, max-width = icon container width (52px). `aria-hidden="true"` — the nav item’s label is already announced to screen readers via the element’s accessible name.

**Nav icons (Bootstrap Icons):**

| Nav item | Icon |
|---|---|
| Services | `bi-server` |
| Network Activity | `bi-activity` |
| Mappings | `bi-file-earmark-code` |
| System Events | `bi-journal-text` |
| Settings | `bi-gear` |
| Collapse toggle | `bi-chevron-double-left` |

**Collapse button:** rounded icon button (`border-radius: 50%`) using `bi-chevron-double-left`; rotates 180° (`transform: rotate(180deg)`) when sidebar is collapsed. Positioned at sidebar bottom, centered horizontally.

## Service card
`{rounded.card}` + `border: 1px solid {colors.border}`. Hover: border shifts to `rgba(var(--brand-rgb), 0.3)` (`{colors.brand}` at 30% opacity, using CSS variable `--brand-rgb` defined per theme — see theme token blocks). Stopped services render at `{components.service-card-stopped-opacity}` opacity. Contains:

- Service name (bold) + description (muted)
- Port badge (monospace pill using `{colors.port-badge-bg}` / `{colors.port-badge-fg}`) — range 30100–30199
- **External URL** (monospace, truncated with tooltip) — renamed from "Upstream URL"
- **Mocks Root** path in monospace: `/mocks/{service-slug}` — read-only, informational. No click interaction; use the **View mappings** action link to navigate to the service's files.
- **Mock count** — total mapping + response files combined (e.g. `bi-file-earmark 7 files`). Informational only. Uses `bi-file-earmark` (not `bi-file-earmark-code`) to avoid implying the count is a navigation link to Mappings.
- Status pill (Live/Stopped)
- Enable/disable toggle
- **Edit** — opens the Edit Service form
- **View mappings** — navigates to the Mappings view with this service pre-selected in the folder tree

**Service slug convention:** lowercase display name; consecutive spaces collapse to a single hyphen; spaces → hyphens; leading/trailing spaces trimmed before slugification; non-alphanumeric non-hyphen characters stripped; consecutive hyphens collapsed to one. Example: "Finance API" → `finance-api`; "Finance & Loans API" → `finance-loans-api`. Dots and other punctuation are stripped before hyphen-collapsing: "API 2.0" → `api-20`; "v2.1 Services" → `v21-services`. Slugs may begin with a digit — no leading-digit restriction applies.

**Port auto-assignment:** when adding a new service, the next available port in range 30100–30199 is pre-filled. The range supports up to 100 services.

**Port exhaustion states:**
- **Warning (≤ 10 ports remaining):** the port input field shows an amber inline notice: "{N} ports remaining in range (30100–30199)." Style: `{colors.warning}` text + `{colors.warning-subtle}` background, `{rounded.md}`, `{typography.scale.sm}`, `bi-exclamation-triangle` leading icon, displayed directly below the port input field.
- **Range full (0 ports remaining):** the Add Service button is disabled; an amber full-width banner in the Services view reads: "Port range 30100–30199 is fully allocated. Service deletion is not available in v1 — free a port by modifying the container configuration directly." Banner style: `{colors.warning}` text + `{colors.warning-subtle}` background, `{spacing.page-px}` horizontal padding, `bi-exclamation-triangle` leading icon. The port field is hidden from the Add Service form.

**Port range limit:** the 30100–30199 range is a v1 constraint supporting up to 100 services. This is an intentional scope decision — the range start is not user-configurable in v1. If the range becomes a blocker, address in a future release.

## Status pill
`{rounded.full}`, 5px colored dot, text label. Live: green palette. Stopped: slate palette. Never uses just color alone — always dot + text (accessibility).

## Toggle switch
32×20px track, 16px thumb. On: `{colors.success}`. Off: `{colors.content-muted}` — inherits the per-theme muted token, ensuring contrast against each theme's content background (Clean Light/Emerald Terminal: `#64748b`; Deep Ocean: `#94a3b8`; Ink & Amber: `#52525b`). Thumb slides with CSS transition (`150ms ease`). Keyboard: `Space` toggles the switch state. (`Enter` is reserved for form submission and does not activate standalone toggles — WAI-ARIA `role="switch"` pattern.)

**Disabled-but-visible state** (e.g. the feature-flag toggles in Settings → Feature Flags when a feature is locked in the current environment): track and thumb render at 50% opacity; `cursor: not-allowed`; `aria-disabled="true"`. The on/off position is still visually communicated — opacity is the only differentiator from the normal state, color is unchanged. Do **not** use the HTML `disabled` attribute — use `aria-disabled` and suppress click/keyboard activation in JavaScript so the element remains in the tab order and is announced by screen readers.

**Stopped-service enable toggle:** the enable/disable toggle on a stopped service card or table row is NOT in the disabled-but-visible state — it is an active control in its off position. The row/card renders at `{components.service-card-stopped-opacity}` opacity as a whole; no additional opacity is applied to the toggle itself. Never compound row-level and element-level opacity on this control.

## Tables
`table-layout: fixed`, `width: 100%`. No outer horizontal scroll — columns defined via `<colgroup>`. Vertical scroll within a bounded container. Row hover: subtle `{colors.content-surface}` background. Selected row: `{colors.brand}` at 10% opacity + 2px left border in `{colors.brand}`. When a row is selected, the 2px brand left-border takes precedence over the amber proxied-live-border. Sticky column headers.

**Suggested `<colgroup>` widths:**

*Network Activity table:*

| Column | Suggested width |
|---|---|
| Method | 80px |
| URL Path | flex (min 200px) |
| Status | 72px |
| Type | 52px |
| Service | 160px |
| Actions | 80px |
| Duration (hidden by default) | 90px |
| Date/Time (hidden by default) | 160px |

*Services table:*

| Column | Suggested width |
|---|---|
| Name | flex (min 200px) |
| Port | 90px |
| External URL | 200px |
| Mock Count | 100px |
| Status | 100px |
| Enabled | 72px |
| Actions | 80px |

## Notification bell dropdown
Opens below top bar, right-aligned, max-width 360px (at < 640px: `width: calc(100vw - 16px)`, centered below the top bar to maintain an 8px safe margin on each side), `{rounded.card}`, elevation level 3. Header: "Notifications — warnings and errors" + "Mark all read" **button** (ghost/tertiary style — no background, no border, `{colors.content-muted}` text; not a filled button). Each item: icon (severity) + message + timestamp + service tag (if applicable) + dismiss (✕). Unread items: slightly elevated background. Mark-as-read: click item or explicit button; badge decrements.

**Scope restriction:** the bell panel shows **warnings and errors only** — `info` and `success` events are excluded. A footer note links to System Events for the full log — copy: "See all events in System Events →"; visual spec: `{typography.scale.sm}`, `{colors.content-muted}`, center-aligned, separated from the item list by a `1px {colors.border}` top border; `data-testid`: `topbar-link-notification-panel-footer`. This keeps the bell panel actionable — it signals things that need attention, not routine operational info.

**Pagination:** 20 items on open. A **"Load more" button** at the bottom of the list loads the next 20 items per click. Infinite scroll (auto-load on scroll) is not used — not keyboard-operable. The button is hidden once all items are loaded.

**Item read/unread states:** Unread items have a subtly elevated background (`{colors.content-surface}`) and full-opacity severity icon. Read items revert to the standard panel background with the severity icon at reduced opacity (`opacity: 0.6`) — the item remains visible in the panel. The read/unread distinction must not rely on background color alone: the reduced-opacity icon serves as the secondary cue for users who cannot perceive the background shift.

**Service tag format:** each notification item optionally displays a service tag — a non-interactive muted text label showing the service display name, styled as `{typography.scale.sm}`, `rgba(var(--brand-rgb), 0.12)` background, `{colors.border}` border, `{rounded.md}`. The tag is omitted entirely (not shown as empty) when no service is associated with the event.

## Mappings file explorer
Left pane (folder tree, ~240px): collapsible tree. Root node = mocks volume path. Service nodes = display name + real path in tooltip. Children: `mappings/` and `responses/` sub-folders. File nodes: filename + extension. Active file: highlighted with brand left-border. Modified (unsaved) file: `●` dot appended to filename in tree, italic style. Keyboard: arrow keys to navigate, Enter to open.

Right pane (file editor): breadcrumb path at top. Tab bar: Form | Raw JSON. Form tab: structured fields (method, URL pattern, status, response body, content-type, delay, priority, header filter, body matcher, use-transformer toggle). Raw JSON tab: syntax-highlighted, **Copy JSON** button (copies raw content to clipboard). Actions bar: **Duplicate · Rename · Delete · Discard · Save**.

**Save / Discard enable rules:**
- **Save** — enabled when: file is newly created (not yet written to disk) OR file has unsaved changes. Disabled otherwise.
- **Discard** — enabled when: file is an existing file with unsaved changes. Disabled for new (unsaved) files and for clean files.

**New file actions:** "+ New Mapping" and "+ New Response" are **separate buttons** that create files in the correct sub-folder (`mappings/` vs `responses/`) respectively.

**File naming conventions:** all segments use underscores as delimiters.
- Mapping files: `{method-lowercase}_{path-slugified}_{variant}.json` — `{variant}` is either a scenario descriptor for manually created files (e.g. `happy-path`, `not-found`, `server-error`, `unauthorized`) or the HTTP status code as a string (e.g. `500`) for auto-generated files from Mock Suggestion. Example manual: `get_account_happy-path.json`. Example auto-generated: `post_api_finance_transfer_500.json`.
- Response files: `{method-lowercase}_{path-slugified}_{variant}_body.json` — example manual: `get_account_happy-path_body.json`. Example auto-generated: `post_api_finance_transfer_500_body.json`.

**Path slugification rule:** replace `/` with `_`, strip leading `_`, replace path parameters (`{id}`, `:id`, `{id:type}` [strip `:type` suffix], `<id>`) with the literal string `param`; replace wildcard segments `*` with `wildcard`; replace `**` with `doublestar`; collapse consecutive `_` to single `_`, lowercase all. Example: `/api/v1/users/{id}/orders` → `api_v1_users_param_orders`.

**Path structure:** all service files live under `/mocks/{service-slug}/` — mappings at `/mocks/{service-slug}/mappings/`, responses at `/mocks/{service-slug}/responses/`. The `BodyAsFile` field in a mapping references the response file with a relative path that mirrors the response file naming convention: `../responses/{method-lowercase}_{path-slugified}_{variant}_body.json`.

## Modal
`{rounded.card}`. Header: title + close (✕). Footer: action buttons right-aligned (ghost + primary). Backdrop: `rgba(0,0,0,.5)`. Dismiss: Esc key or click backdrop. Focus trapped while open. Three size variants apply — use the table below; the 480px Base size is the default for all general-purpose dialogs.

**Size variants:**

| Size | Max-width | Use cases |
|---|---|---|
| Base | `480px` | General-purpose: delete confirmation, copy file, add service, first-run setup |
| Informational | `400px` | About modal — read-only, no form fields |
| Data-heavy | `560px` | Network Activity row detail — displays request/response body content |
| Small | `360px` | File naming modal — single filename input, short form |

## Toast notifications

Toasts appear at the **bottom-right** of the viewport, above the content area (never overlapping table action buttons). Max-width 360px, `{rounded.card}`, elevation level 2. Stack vertically (newest on top), up to 3 visible; additional toasts queue behind (max queue depth: 10; when the queue is full, the oldest invisible queued item is silently dropped). Identical toasts (same severity + same message) are collapsed — subsequent duplicates increment a `(×N)` counter on the visible toast rather than adding new entries. The counter resets when the visible toast is dismissed or expires — a new occurrence of the same message after dismissal creates a fresh toast from `(×1)` (no counter shown until a second duplicate arrives in the same visibility window). When a visible toast dismisses or expires, the next queued item becomes visible immediately.

| Severity | Icon | Behaviour |
|---|---|---|
| Success | `bi-check-circle` | Auto-dismiss after 4 s |
| Info | `bi-info-circle` | Auto-dismiss after 4 s. Can be pinned (no auto-dismiss) for in-progress operations — pinned info toasts must be dismissed programmatically on completion (e.g. Resync in-progress toast — see EXPERIENCE.md Resync behavior). |
| Warning | `bi-exclamation-triangle` | Auto-dismiss after 6 s. Can be pinned (no auto-dismiss) for ongoing conditions (e.g. connection-loss during save) — pinned warnings clear when the condition resolves or are dismissed manually. |
| Error | `bi-x-circle` | Persistent — dismiss manually |

Left border accent uses the severity color token. Dismiss button (✕) on every toast.

**File save error:** "Failed to save `{filename}` — {reason}." Severity: error. Includes a **Retry** inline action.

**File delete error:** "Failed to delete `{filename}` — {reason}." Severity: error. No retry.

**File rename error:** "Failed to rename `{filename}` — {reason}." Severity: error. No retry.

**Connection loss during save:** persistent warning toast: "Connection lost. Your changes have not been saved." Auto-clears when connection is restored; can also be dismissed manually. **If manually dismissed before reconnection, it does not reappear** — the user has acknowledged the state. The Backend unreachable amber banner in the top bar (if triggered) remains visible regardless.

## Recording badge

Displayed inline in the Network Activity page header while Record mode is active. Amber pill: background `{colors.warning-subtle}`, text `{colors.warning}`, `{rounded.full}`, `{typography.scale.sm}` `font-weight: {typography.weight.semibold}`. Content: `● Recording`. Positioned after the LIVE/PAUSED indicator in the page header, before the [flex spacer] — see EXPERIENCE.md page header element order. Visible only while recording is active; hidden otherwise.

**Connection-loss variant:** when the WebSocket/SSE connection drops during recording, the badge content changes to `⚠ Recording paused — connection lost`. Visual treatment: same amber pill **colors** (`{colors.warning-subtle}` / `{colors.warning}`); the pill width auto-sizes to its content; `bi-exclamation-triangle` replaces the `●` dot; text unchanged in weight and size. The badge must **not** disappear — it changes state in place so the user is clearly aware recording has paused. When the connection is restored, the badge reverts to `● Recording` with no animation.

**Cross-screen indicator:** when recording is active and the user navigates away from Network Activity, a persistent amber pill appears in the top bar (between the logo area and the About icon button). Visual spec: `{colors.warning-subtle}` background, `{colors.warning}` text/icon, `{rounded.full}`, `{typography.scale.sm}`, `font-weight: {typography.weight.semibold}`. Content: `● Recording`. Width auto-sizes to content. `z-index` inherits from the top bar — never floats above modals or drawers. Entrance animation: `opacity 0→1` 150ms ease. No pulse animation. Hidden on `/login` and `/setup` screens.

## LIVE / PAUSED indicator

Displayed in the Network Activity page header, between the Refresh icon and the Recording badge. Indicates the current auto-refresh polling state. **The indicator itself is the pause/resume toggle** — clicking it pauses polling when LIVE, or resumes it when PAUSED. `role="button"`. Keyboard: `Enter` and `Space` both toggle the state. LIVE state: `aria-pressed="false"`, `aria-label="Pause auto-refresh"`. PAUSED state: `aria-pressed="true"`, `aria-label="Resume auto-refresh"`. Non-interactive (`aria-disabled="true"`, `aria-pressed="true"`, `cursor: not-allowed`) when Settings interval = Disabled — the effective state is PAUSED and cannot be toggled by the user.

- **LIVE state** (polling active): 8px `#22c55e` (green-500) filled circle + label `"LIVE"`, `{typography.scale.sm}`, `font-weight: {typography.weight.semibold}`, `color: {colors.success}`.
- **PAUSED state** (either Settings interval = Disabled, or indicator clicked to pause): no dot; label `"PAUSED"`, `{typography.scale.sm}`, `font-weight: {typography.weight.semibold}`, `color: {colors.content-muted}`.
- Both states: inline-flex layout, `gap: 4px`, vertically centered in the page header.
- No animation on state transition.

**Paired `bi-arrow-clockwise` refresh icon:** 16px, `{colors.content-muted}`; visible **only** when the effective refresh state is paused (Settings interval = Disabled, or indicator is toggled to PAUSED). While a manual fetch is in progress, the icon rotates via `animation: spin 1s linear infinite`; it is static when idle. When `prefers-reduced-motion` is active, the rotation is suppressed (see `prefers-reduced-motion` block in Motion & Animation). See EXPERIENCE.md for full interaction behavior.

## Right drawer
Slides from right, width 320px (desktop, ≥ 640px). On mobile (< 640px), renders as a **bottom sheet** — slides up from the bottom of the viewport, full width, drag handle at top. **Drag handle:** 36×4px `{rounded.full}` pill, `{colors.content-muted}` colour, centered at top of sheet. `role="presentation"` — no keyboard affordance on the handle itself (keyboard users use the Close button). Bottom sheet is more thumb-accessible than a side drawer on small screens. Same elevation as modal (level 3). Dismiss: Esc, tap/click outside, drag down (bottom sheet only), or close button.

**Drag-to-dismiss gesture:** activates after ≥ 80px downward drag. A velocity ≥ 300px/s at any point also triggers dismiss. If the drag is abandoned below threshold, the sheet snaps back using `{transitions.bottom-sheet-snap}`. Sheet opacity transitions toward 0 as drag distance increases (fully transparent at 160px drag). When `prefers-reduced-motion` is active, the opacity transition is suppressed — sheet snaps immediately on release.

**Row detail exception:** for row detail content specifically, the right drawer style is overridden to Modal on mobile — the bottom sheet behavior described above does not apply to row detail below 640px. See EXPERIENCE.md Row detail section → mobile override.

## Bottom panel
Split layout, draggable divider handle. **Divider handle visual spec:** full-width strip, 8px height, `cursor: row-resize`; centered 24×4px `{rounded.full}` pill indicator in `{colors.content-muted}`. Hover state: full-strip background shifts to `{colors.content-muted}` at 12% opacity. Min panel height 100px; max 60% of viewport. Tab bar: **Request** (method, URL path, request headers, request body) | **Response** (HTTP status, response headers, response body). Close button collapses panel.

## Settings layout
Left sub-nav (170px) + right content area. Sub-nav items same style as main sidebar nav items. Content area: section title + setting rows (label+description left, control right). Section titles use `{typography.scale.lg}` + `font-weight: {typography.weight.semibold}`. Controls: select, toggle, button group (row detail style), swatch grid (themes).

**Settings sub-nav items:** Appearance / Network Activity / Paths / Cache / Auth & Users / Feature Flags.

**Dual-sidebar layout:** when Settings is active, both the main sidebar (200px/52px, collapsible) and the settings sub-nav (170px, fixed) are visible simultaneously. The main sidebar remains fully functional and can be collapsed to 52px to give the settings content more room. The settings sub-nav has no collapse affordance — it is always at full width.

**Responsive breakpoints:** see canonical breakpoint table in Layout & Spacing — settings sub-nav collapses to a full-width `<select>` dropdown above the content area at < 768px; main sidebar hides behind hamburger at < 768px as normal. The settings sub-nav never overlaps the main sidebar.

> **Auth & Users — not in v1 scope.** User management, roles, and authentication configuration are intentionally excluded from v1. The nav item is rendered at 50% opacity with a `bi-lock` icon appended; clicking it shows a centered placeholder reading "Auth & Users — coming soon" with muted body text "User management will be available in a future release." No form fields, no action buttons. **This nav item must be removed (not hidden) before v2 ships unless a dedicated Auth & Users spec has been written and approved. Gate owner: product lead. Acceptance criteria: nav item absent from Settings sub-nav and `GET /settings/auth` returns 404. Add to v2 Definition of Done before planning begins.**

**Cache section:** Visual layout only — see EXPERIENCE.md Settings screen for full behavioral spec.
- "Clear all caches" row: label + description text (left) + `Clear All` button (right) — `variant: destructive` (solid `{colors.error}` background, `{colors.brand-fg}` text)
- Named caches list: each entry shown as a card row — name (left), entry count + estimated size (center, muted), `Clear` button (right)
- Clearing a cache requires confirmation before execution

## HTTP method chip

`{rounded.sm}`, `font-weight: {typography.weight.bold}`, `font-size: {typography.scale.xs}`, uppercase text, `white-space: nowrap`. Foreground and background from the `method-*` token set. Always includes the method text — never color-only.

Long methods (`OPTIONS`, `HEAD`, `CONNECT`, `TRACE`) render at full text using the `method-other-*` token pair (`{colors.method-other-bg}` / `{colors.method-other-fg}`) for background and foreground. Set a minimum column width of `72px` in `<colgroup>` to accommodate the widest value. Chips never truncate — if a chip overflows, fix the column definition.

## Tooltip

Appears on **hover** (400ms delay) and on **keyboard focus** (no delay) for any element whose visible label is absent or truncated. Placement: above by default; flips below or to the side when viewport space is insufficient. Max-width: 240px. `{typography.scale.sm}`, `{rounded.md}`, elevation level 2. Colors: background `{colors.content-fg}`, text `{colors.content-bg}` (inverted for contrast in all themes). Long paths wrap; tooltip text is never truncated. Dismiss on `Esc` or when the trigger loses focus/hover.

**Standard tooltip targets:**
- Truncated path/URL cells in tables (shows full value)
- Collapsed sidebar nav items (shows item label)
- Service tree nodes in Mappings pane (shows real file system path)
- Top bar icon buttons (shows action label: “About”, “Notifications” — the bell button tooltip uses the abbreviated form; the full `aria-label="Notifications — warnings and errors"` is the screen-reader label, not the tooltip text)
- Network Activity type icon (`bi-database` → "Mocked"; `bi-arrow-repeat` → "Proxied")
- Network Activity Actions column icon buttons (`bi-eye` → "View detail"; `bi-lightning-charge` → "Save as Mock")
- Theme swatches in Settings → Appearance (shows theme name)
- Port badges on service cards (shows “Port {number}”)
- User avatar button in top bar (shows account name)

---

# Empty States

All views must render a purposeful empty state — not a blank content area.

| View | Empty condition | Empty state content |
|---|---|---|
| Services | No services configured | `bi-server` (48px, muted) + "No services yet" heading + "Add your first service." + primary **Add Service** button |
| Network Activity | No requests captured | `bi-activity` (48px, muted) + "No activity yet" + "Requests will appear here once a service is live and receiving traffic." |
| Network Activity | Log cleared by user | `bi-activity` (48px, muted) + "Log cleared" + "New requests will appear as they arrive." |
| Mappings — no service selected | Tree present, nothing selected | `bi-file-earmark-code` (48px, muted) + "Select a service" + "Choose a service from the left panel to browse its mapping files." |
| Mappings — service selected, no files | Service expanded, folders empty | Service name shown + `bi-file-earmark-plus` (48px, muted) + "No mappings yet" + **+ New Mapping** and **+ New Response** buttons |
| System Events | No events logged | `bi-journal-text` (48px, muted) + "No events yet" + "System events will appear here as services start and stop." |
| Notifications panel | No unread warnings or errors | `bi-bell-slash` (32px, muted) + "No warnings or errors — all caught up." — inline within the bell dropdown |
| Network Activity | Search or filter returns no matches (log has rows but none match active filters) | `bi-funnel` (48px, muted) + "No matching requests" + "Adjust or clear filters to see all activity." + **Clear filters** button |

Empty state icons: `color: {colors.content-muted}`. Headings: `{typography.scale.md}` + `font-weight: {typography.weight.semibold}`. Body text: `{typography.scale.base}` + `color: {colors.content-muted}`.

**Icon sizes:** full-page and screen-level empty states use 48px icons. Inline panel empty states (notification bell dropdown, Settings cache list) use 32px icons — the smaller size is appropriate for the compact panel context.

> **UI copy source of truth:** EXPERIENCE.md is the canonical source for all UI copy strings (headings, subtext, button labels). This table defines structure and icon; consult EXPERIENCE.md for exact wording.

---

# Accessibility

## ARIA roles and labels
- **Toggle switch:** `role="switch"` + `aria-checked="true|false"` + label associated via `aria-labelledby` or `<label>`.
- **Notification bell button:** `aria-label="Notifications — warnings and errors"` + `aria-haspopup="true"` + `aria-expanded` reflecting dropdown open state.
- **Sidebar nav:** `role="navigation"` on `<nav>`; `aria-current="page"` on the active item.
- **Modal:** `role="dialog"` + `aria-modal="true"` + `aria-labelledby` pointing to the modal title element. **Modal title `id` convention:** every modal heading carries `id="{screen}-modal-{identifier}-title"` (e.g. `services-modal-add-title`, `topbar-modal-signout-confirm-title`); the About modal uses `id="about-modal-title"` (shell-level, no screen prefix).
- **Right drawer / bottom sheet:** `role="dialog"` + `aria-labelledby` pointing to a visible heading. **On mobile (bottom sheet):** `aria-modal="true"` — focus is trapped. **On desktop (side drawer):** `aria-modal="false"` — focus is intentionally not trapped so keyboard users can navigate table rows behind the open drawer (see Focus management below).
- **File tree:** `role="tree"` with `role="treeitem"` for nodes; `aria-expanded` on folder nodes; `aria-selected` on active file.
- **Status pill:** colored dot is `aria-hidden="true"`; text label is always present.
- **Skeleton loaders:** `aria-busy="true"` + `aria-label="Loading {content-name}"` on the loading container (examples: `aria-label="Loading services"`, `aria-label="Loading mappings"`); `aria-busy` removed when content is resolved.

## Focus management
- **Modal / drawer open:** focus moves to the first focusable element inside the overlay.
- **Modal / drawer close:** focus returns to the element that triggered the overlay.
- **Focus trap:** active for modals. Active for bottom sheets on mobile. Desktop drawers do **not** trap focus — the table behind the drawer is intentionally accessible by keyboard so users can scroll/navigate rows while the drawer is open. Ensure the drawer close button (✕) is the first focusable element in the drawer so Shift+Tab from the table reaches it intuitively.

## Live regions
- Service status changes (Live ↔ Stopped): `aria-live="polite"` — e.g. "Finance API is now Live."
- Toast notifications: `role="alert"` for errors; `role="status"` for success/info.
- Notification badge count changes: `aria-live="polite"` on the badge element.

## Color contrast
All text/background combinations must meet WCAG 2.1 AA (4.5:1 normal text, 3:1 large text). All four theme variants must be validated individually before shipping — passing the validation for one theme does not imply passing for others.

**Per-theme contrast status (must all be ✅ before v1 ships):**

| Theme | Status | Notes |
|---|---|---|
| Clean Light | ✅ Pass | `--content-muted` (#64748b) on white ≈ 4.6:1 |
| Deep Ocean | ✅ Pass | `--content-muted` (#94a3b8) ≈ 5.9:1 on #0f2233; `--sidebar-fg` raised from #64748b (≈ 3.66:1 — **FAIL**) to #94a3b8 (≈ 5.9:1 on #0d1b2a) — passes |
| Emerald Terminal | ⚠️ Partial | `--content-muted` (#64748b) on `#f9fafb` ≈ 4.6:1 — passes; `--sidebar-fg` (#6ee7b7) on `#064e3b` ≈ 5.96:1 — passes WCAG AA; `--sidebar-active-fg` (#34d399 on composited dark-green background) — **unverified, manual check required before marking ✅** |
| Ink & Amber | ✅ Pass (with fix) | `--content-muted` raised from `#71717a` (≈ 4.48:1 — **FAIL** for normal text) to `#52525b` zinc-600 (≈ 7.5:1 on white) — passes; `--sidebar-fg` raised from `#71717a` (≈ 3.66:1 — **FAIL**) to `#a1a1aa` (≈ 6.9:1 on `#18181b`) — passes |

**Sidebar active-fg contrast — must also be validated per theme before v1 ships.** Active nav-item text (`--sidebar-active-fg`) renders on the active background (`--sidebar-active-bg` composited over `--sidebar-bg`). These combinations are not listed in the table above and must be confirmed individually:
- **Clean Light:** `#0369a1` (sky-700) on `#e0f2fe` (sky-100)
- **Deep Ocean:** `#93c5fd` (blue-300) on `rgba(59,130,246,.18)` composited over `#0d1b2a`
- **Emerald Terminal:** `#34d399` (emerald-400) on `rgba(16,185,129,.2)` composited over `#064e3b` — **flag for manual check; emerald-on-dark-green may fall short of 4.5:1**
- **Ink & Amber:** `#fbbf24` (amber-400) on `rgba(245,158,11,.15)` composited over `#18181b`

## `data-testid` convention
All interactive and key structural elements carry a `data-testid` attribute for automated testing. `data-testid` values are never used for styling.

**Generation rule:** `{screen-slug}-{component-type}-{identifier}` in `kebab-case`, scoped to the component. Screen slugs: `services`, `activity`, `mappings`, `events`, `settings`, `login`, `setup`. Shell-level layout scopes (`topbar`, `sidebar`) are also valid prefixes — they apply to always-present app-shell elements that do not belong to a single screen. Component types follow the element category: `btn`, `card`, `row`, `modal`, `drawer`, `panel`, `input`, `toggle`, `tab`, `tree-node`, `badge`, `toast`, `swatch`, `nav-item`, `checkbox`, `select`, `pill`, `popover`, `link`, `breadcrumb`.

**Route-to-slug mapping:**

| Route | Screen name | Screen slug |
|---|---|---|
| `/services` | Services | `services` |
| `/activity` | Network Activity | `activity` |
| `/mappings` | Mappings | `mappings` |
| `/events` | System Events | `events` |
| `/settings` | Settings | `settings` |
| `/login` | Login | `login` |
| `/setup` | First-run setup | `setup` |

**Reference table (required entries — all must be implemented consistently):**

| Element | `data-testid` |
|---|---|
| Add Service button | `services-btn-add` |
| Service card (per service) | `services-card-{slug}` |
| Enable/disable toggle (card view) | `services-card-toggle-{slug}` |
| Active toggle (table view) | `services-table-toggle-{slug}` |
| Edit button on card | `services-btn-edit-{slug}` |
| Edit button on table row | `services-table-btn-edit-{slug}` |
| Mappings link on card | `services-btn-viewmappings-{slug}` |
| Mappings link on table row | `services-table-btn-viewmappings-{slug}` |
| Add Service modal | `services-modal-add` |
| Edit Service modal (per service) | `services-modal-edit-{slug}` |
| Service card mock file count | `services-card-filecount-{slug}` |
| Services table view toggle | `services-btn-table-view` |
| Service table row (per service) | `services-table-row-{slug}` |
| Notification bell | `topbar-btn-bell` |
| Notification badge | `topbar-badge-bell` |
| Notification panel | `topbar-panel-notifications` |
| Notification item (per item) | `topbar-notification-item-{id}` |
| Notification item dismiss button | `topbar-notification-item-dismiss-{id}` |
| Notification panel load more button | `topbar-btn-notification-load-more` |
| Notification panel footer link | `topbar-link-notification-panel-footer` |
| Notification panel "N new" pill | `topbar-btn-notification-new-pill` |
| About button | `topbar-btn-about` |
| About modal | `topbar-modal-about` |
| User avatar button | `topbar-btn-avatar` |
| Sign-out confirmation dialog | `topbar-modal-signout-confirm` |
| Sign-out confirm button | `topbar-btn-signout-confirm` |
| Sign-out cancel button | `topbar-btn-signout-cancel` |
| Sidebar collapse button | `sidebar-btn-collapse` |
| Hamburger button (mobile sidebar toggle) | `sidebar-btn-hamburger` |
| Sidebar nav item (per item) | `sidebar-nav-item-{slug}` |
| Activity search field | `activity-input-search` |
| Activity service dropdown | `activity-select-service` |
| Activity type filter button | `activity-btn-type-filter` |
| Activity type filter — Mocked checkbox | `activity-checkbox-type-mocked` |
| Activity type filter — Proxied checkbox | `activity-checkbox-type-proxied` |
| Activity clear filters button | `activity-btn-clear-filters` |
| Activity columns button | `activity-btn-columns` |
| Activity column selector checkbox (per column) | `activity-checkbox-col-{column-slug}` (valid slugs: `method`, `url-path`, `status`, `type`, `service`, `ms`, `datetime`) |
| Activity table row (per row) | `activity-row-{request-id}` |
| Activity record button | `activity-btn-record` |
| Activity clear log button | `activity-btn-clear-log` |
| Activity LIVE/PAUSED toggle | `activity-btn-live-paused` |
| Activity recording badge | `activity-badge-recording` |
| Cross-screen recording indicator (top bar) | `topbar-badge-recording-active` |
| Backend unreachable banner | `topbar-banner-backend-unreachable` |
| Activity manual refresh button | `activity-btn-refresh` |
| Activity proxy counter pill | `activity-pill-proxy-count` |
| Activity proxy counter popover | `activity-popover-proxy-count` |
| Row detail modal | `activity-modal-row-detail` |
| Row detail drawer | `activity-drawer-row-detail` |
| Row detail bottom panel | `activity-panel-row-detail` |
| Mock Suggestion modal | `activity-modal-mock-suggestion` |
| Save as Mock button (in detail) | `activity-btn-save-as-mock` |
| Mappings resync button | `mappings-btn-resync` |
| New Mapping button | `mappings-btn-new-mapping` |
| New Response button | `mappings-btn-new-response` |
| Folder tree node (per file) | `mappings-tree-node-{service-slug}-{filename}` |
| File editor save button | `mappings-btn-save` |
| File editor discard button | `mappings-btn-discard` |
| File editor duplicate button | `mappings-btn-duplicate` |
| File editor rename button | `mappings-btn-rename` |
| File editor delete button | `mappings-btn-delete` |
| File editor Form tab | `mappings-tab-form` |
| File editor Raw JSON tab | `mappings-tab-raw` |
| File editor Copy JSON button | `mappings-btn-copy-json` |
| File naming modal (new file / rename) | `mappings-modal-file-name` |
| Filename input (naming modal) | `mappings-input-filename` |
| File editor breadcrumb | `mappings-breadcrumb-editor` |
| Mappings discard-guard dialog | `mappings-modal-discard-confirm` |
| Mappings discard-guard confirm button | `mappings-btn-discard-confirm` |
| Mappings discard-guard cancel button | `mappings-btn-discard-cancel` |
| Settings theme swatch (per theme) | `settings-swatch-{theme-slug}` (valid theme slugs: `clean-light`, `deep-ocean`, `emerald-terminal`, `ink-amber`) |
| Settings row detail style control | `settings-segmented-row-detail` |
| Settings row detail style option (per option) | `settings-segmented-row-detail-{option-slug}` (valid slugs: `modal`, `drawer`, `panel`) |
| Settings auto-refresh select | `settings-select-auto-refresh` |
| Settings Mocks Root input | `settings-input-mocks-root` |
| Settings Mocks Root save button | `settings-btn-mocks-root-save` |
| Settings Mocks Root discard button | `settings-btn-mocks-root-discard` |
| Settings clear all caches button | `settings-btn-clear-all-caches` |
| Toast container | `toast-container` |
| Login username input | `login-input-username` |
| Login password input | `login-input-password` |
| Login submit button | `login-btn-submit` |
| Setup username input | `setup-input-username` |
| Setup password input | `setup-input-password` |
| Setup confirm password input | `setup-input-confirm-password` |
| Setup submit button | `setup-btn-submit` |
| Settings max log entries select | `settings-select-max-log-entries` |
| Settings header redaction toggle | `settings-toggle-header-redaction` |
| Settings Record Mode toggle | `settings-toggle-record-mode` |
| Settings Pipeline Reset API toggle | `settings-toggle-pipeline-reset` |
| Settings sidebar default select | `settings-select-sidebar-default` |
| Settings sub-nav item (per section) | `settings-nav-{section-slug}` (valid slugs: `appearance`, `network-activity`, `paths`, `cache`, `auth-users`, `feature-flags` — **note:** `auth-users` replaces the `&` with `-` directly; it is a fixed constant, not generated by the service slug algorithm) |
| Settings Mocks Root change confirmation dialog | `settings-modal-mocks-root-confirm` |
| Settings Mocks Root confirm button | `settings-btn-mocks-root-confirm` |
| Settings clear cache (per service) | `settings-btn-clear-cache-{slug}` |
| Settings clear cache confirmation dialog (per service) | `settings-modal-clear-cache-confirm-{slug}` |
| Settings clear cache confirm button (per service) | `settings-btn-clear-cache-confirm-{slug}` |
| Settings clear cache cancel button (per service) | `settings-btn-clear-cache-cancel-{slug}` |
| Settings clear all caches confirmation dialog | `settings-modal-clear-all-caches-confirm` |
| Settings clear all caches confirm button | `settings-btn-clear-all-caches-confirm` |
| Settings clear all caches cancel button | `settings-btn-clear-all-caches-cancel` |
| System Events warnings tab | `events-tab-warnings` |
| System Events info tab | `events-tab-info` |
| System Events mark all read button | `events-btn-mark-all-read` |
| System Events clear all button (Warnings & Errors tab) | `events-btn-clear-all-warnings` |
| System Events clear all button (Info tab) | `events-btn-clear-all-info` |
| System Events event item (per item) | `events-item-{id}` |
| System Events load more button | `events-btn-load-more` |
| System Events Warnings & Errors clear-all confirm dialog | `events-modal-clear-all-warnings-confirm` |
| System Events Warnings & Errors clear-all confirm button | `events-btn-clear-all-warnings-confirm` |
| System Events Info clear-all confirm dialog | `events-modal-clear-all-info-confirm` |
| System Events Info clear-all confirm button | `events-btn-clear-all-info-confirm` |

---

# Do's and Don'ts

**Do:**
- Use `table-layout: fixed` on all tables; define column widths in `<colgroup>`
- Provide `text-overflow: ellipsis` + `overflow: hidden` + `white-space: nowrap` on path/URL cells
- Show skeleton loaders (not spinners) for table content during fetch
- Use the real WireMock field names in form labels (e.g. "URL Pattern" not "Endpoint")
- Keep error/warning colors consistent with the semantic palette regardless of theme
- Always pair status indicators with text (dot + label, not dot alone)

**Don't:**
- Add `overflow-x: auto` to table wrappers — fix the columns instead
- Use `position: fixed` for toasts that overlap table action buttons
- Use color as the only differentiator for HTTP method chips — always include the method text
- Load custom web fonts — system stack only (performance requirement)
- Show optimistic success states for file save operations — wait for confirmation

