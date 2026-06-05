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
  input-bg:               "#f8fafc"
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
  method-get:             "#3b82f6"   # blue-500
  method-get-bg:          "#dbeafe"   # blue-100
  method-post:            "#10b981"   # emerald-500
  method-post-bg:         "#d1fae5"   # emerald-100
  method-put:             "#f59e0b"   # amber-500
  method-put-bg:          "#fef3c7"
  method-delete:          "#ef4444"   # red-500
  method-delete-bg:       "#fee2e2"
  method-patch:           "#8b5cf6"   # violet-500
  method-patch-bg:        "#ede9fe"

  # ── Network Activity type icons (icon-only, no text chips) ─────────────────
  # Type is shown as a Bootstrap Icon with a tooltip — not as a text chip
  icon-mock-color:        "#3b82f6"   # blue-500 — bi-database
  icon-proxy-color:       "#10b981"   # emerald-500 — bi-arrow-repeat

  # ── Network Activity row highlight colors ────────────────────────────────
  # Proxied row (only when service is Live): left border accent
  proxied-live-border:    "#f59e0b"   # amber-500
  # Error row (HTTP 5xx or exception): subtle red background
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
  lg:   "8px"     # table wrapper, larger buttons
  xl:   "10px"    # nav items, toolbar items
  card: "12px"    # service cards, modals, drawers
  full: "9999px"  # status pills, notification badges, toggles

spacing:
  base-unit: "4px"
  # Tailwind 4-unit system; key layout values:
  topbar-height:          "42px"
  sidebar-width-expanded: "200px"
  sidebar-width-collapsed: "52px"
  page-px:                "22px"
  page-py:                "18px"
  card-p:                 "16px"
  nav-item-px:            "16px"
  nav-item-py:            "8px"
  toolbar-py:             "12px"
  section-gap:            "14px"

components:
  # Visual specs only — behavioral specs live in EXPERIENCE.md
  service-card-min-height: "auto"
  service-card-grid-cols:  "repeat(3, 1fr)"   # ≥ 1024px; 2 col 640–1023px; 1 col < 640px
  table-row-height:        "36px"
  sidebar-transition:      "width 200ms ease"
  toggle-width:            "32px"
  toggle-height:           "18px"
  topbar-badge-size:       "15px"
---

# Brand & Style

Fishtank is a developer and QA tool — a **professional infrastructure product**, not a consumer app. The visual identity communicates **precision, trustworthiness, and speed**. It should feel like the best-in-class internal tooling a senior engineer would be proud to open every day: clean, dense without being cluttered, and immediately readable at a glance.

**Voice in UI chrome:** direct, technical, never cute. Labels use the real term ("Resync Mappings", not "Refresh"); status text is exact ("24 mappings loaded in 142ms", not "Done!").

**Logo mark:** Bootstrap Icon `bi-droplet-half` (placeholder). A custom SVG logo must be designed and delivered before v1 ships. **Action required:** assign logo design task to design lead and track in the project backlog. Rendered at 20×20px beside the wordmark.

---

# Colors

## Theme system

Four named themes, selectable in Settings → Appearance. Implemented as a CSS class on `<html>` (`data-theme="clean-light"` etc.) that overrides the CSS custom properties defined in the tokens above. `prefers-color-scheme` maps to Clean Light (light) and Deep Ocean (dark) as system defaults.

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
  --border: #e2e8f0;       --brand: #0ea5e9;
  --input-bg: #f8fafc;     --input-border: #cbd5e1;
}
```

### Deep Ocean token overrides
```css
[data-theme="deep-ocean"] {
  --sidebar-bg: #0d1b2a;   --sidebar-fg: #64748b;
  --sidebar-active-bg: rgba(59,130,246,.18);  --sidebar-active-fg: #93c5fd;
  --topbar-bg: #0a1628;    --topbar-border: rgba(255,255,255,.07);
  --content-bg: #0f2233;   --content-surface: #0d1b2a;
  --content-fg: #cbd5e1;   --content-muted: #475569;
  --border: rgba(255,255,255,.08);  --brand: #3b82f6;
  --input-bg: #162d42;     --input-border: rgba(255,255,255,.12);
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
  --border: #d1fae5;       --brand: #10b981;
  --input-bg: #ffffff;     --input-border: #a7f3d0;
}
```

### Ink & Amber token overrides
```css
[data-theme="ink-amber"] {
  --sidebar-bg: #18181b;   --sidebar-fg: #71717a;
  --sidebar-active-bg: rgba(245,158,11,.15); --sidebar-active-fg: #fbbf24;
  --topbar-bg: #09090b;    --topbar-border: rgba(255,255,255,.07);
  --content-bg: #ffffff;   --content-surface: #fafafa;
  --content-fg: #18181b;   --content-muted: #71717a;
  --border: #e4e4e7;       --brand: #f59e0b;
  --input-bg: #fafafa;     --input-border: #d4d4d8;
}
```

## Notification badge
Always `#ef4444` (red-500) with white text — never themed. Ensures unread-count visibility regardless of active theme.

## Live / Stopped service indicator
- Live: `#22c55e` (green-500) dot — `box-shadow: 0 0 0 2px {success-subtle}` pulse
- Stopped: `#64748b` (slate-500) dot — no pulse

---

# Typography

System font stack; no custom web fonts loaded at runtime (performance requirement). Monospace used for: paths, URLs, mapping GUIDs, JSON bodies, code snippets, port numbers.

**Table column headers:** `{typography.scale.xs}` + `font-weight: 700` + `text-transform: uppercase` + `letter-spacing: 0.05em` — distinguishes headers from data without color.

**Nav items:** `{typography.scale.base}` + `font-weight: 500`.

**Page titles:** `{typography.scale.md}` + `font-weight: 800`.

**Timestamps and secondary meta:** `{typography.scale.sm}` + `color: {colors.content-muted}`.

---

# Layout & Spacing

4px base unit throughout (Tailwind default). 

**App shell (desktop):**
```
┌─ topbar (42px) ─────────────────────────────────────┐
│ 🐠 Fishtank          [ℹ] [🔔] [avatar]              │
├─ sidebar (200px) ─┬─ main content (flex-1) ──────────┤
│ nav items         │ page header + toolbar + content   │
│                   │                                   │
└───────────────────┴───────────────────────────────────┘
```

**Sidebar:** expanded 200px / collapsed 52px (icon only). Transition: `{spacing.sidebar-transition}`. Collapse toggle: chevron at sidebar bottom.

**Content area max-width:** uncapped — fills available space. Tables use `table-layout: fixed` with `width: 100%`; no `overflow-x` on table wrapper — column widths defined in `<colgroup>` to prevent horizontal scroll.

**Card grid:** 3 columns desktop (≥ 1024px) → 2 columns mid (640px–1023px) → 1 column mobile (< 640px).

---

# Elevation & Depth

Three levels:
1. **Surface** — cards, table, inputs: `border: 1px solid {colors.border}`, no shadow
2. **Raised** — dropdowns, tooltips: `box-shadow: 0 4px 16px rgba(0,0,0,.12)`
3. **Overlay** — modals, drawers: `box-shadow: 0 8px 40px rgba(0,0,0,.25)` + backdrop `rgba(0,0,0,.5)`

Dark themes use slightly stronger shadows (`rgba(0,0,0,.4)` / `.6`) since borders are less visible against dark backgrounds.

---

# Motion & Animation

**Sidebar collapse:** `width 200ms ease`. **Collapse chevron:** `transform: rotate(180deg)` with matching 200ms ease transition.

**Live status pulse:** CSS animation cycling `box-shadow` from `0 0 0 2px {success-subtle}` to `0 0 0 5px transparent`, 1.8s infinite ease-in-out.

**Bottom sheet (mobile drawer):** `transform: translateY(100%)` → `translateY(0)` with `300ms ease` slide-up on open.

**Toast entrance/exit:** `opacity 0→1` + `translateY(8px)→0` on enter; reversed on exit. Duration: 150ms.

**`prefers-reduced-motion` overrides:** when the user has opted into reduced motion, all transitions and animations are disabled:

```css
@media (prefers-reduced-motion: reduce) {
  .sidebar          { transition: none; }
  .collapse-chevron { transition: none; }
  .live-pulse       { animation: none; box-shadow: 0 0 0 2px var(--success-subtle); }
  .bottom-sheet     { transition: none; }
  .toast            { transition: none; }
}
```

All animated state changes have static visual equivalents — no state is communicated by motion alone.

---

# Shapes

- Service cards: `{rounded.card}` — prominent, friendly
- Buttons: `{rounded.lg}` — confident, not pill-shaped
- Inputs, selects: `{rounded.md}` — functional
- Nav items: `{rounded.xl}` — roomy
- Status pills (Live / Stopped): `{rounded.full}` — clearly a label not a button
- HTTP method chips: `{rounded.sm}` — compact, badge-like
- Notification badge: `{rounded.full}` — standard circle
- Toggle switch: `{rounded.full}` — both track and thumb

---

# Components

## Top bar
Fixed height `{spacing.topbar-height}`. Logo (`bi-droplet-half` + wordmark) left-aligned. Right side: About icon (`bi-info-circle`), notification bell (`bi-bell`) with unread badge, user avatar (initials, gradient background). All icon buttons: 30×30px, `{rounded.xl}`, subtle background on hover.

**User avatar dropdown:** displays account name + role, then a single action: **Sign out** (`bi-box-arrow-right`). Does not contain a Settings link — Settings is accessed via sidebar nav only.

**About modal** (triggered by `bi-info-circle`): max-width 400px, `{rounded.card}`, elevation level 3. Contains: app name + logo mark, version number, build hash (monospace), link to documentation (opens in new tab), link to changelog (opens in new tab), close button. No user-editable fields. Dismiss: Esc, click backdrop, or close button.

## Sidebar
Collapsible. Expanded: 200px with label + icon. Collapsed: 52px with icon only, tooltip on hover. Section divider: 1px `{colors.border}` line. Collapse chevron at bottom. Unread event counts are surfaced only via the notification bell in the top bar — no badge on sidebar nav items.

**Nav icons (Bootstrap Icons):**

| Nav item | Icon |
|---|---|
| Services | `bi-server` |
| Network Activity | `bi-activity` |
| Mappings | `bi-file-earmark-code` |
| System Events | `bi-journal-text` |
| Settings | `bi-gear` |

**Collapse button:** rounded icon button (`border-radius: 50%`) using `bi-chevron-double-left`; rotates 180° (`transform: rotate(180deg)`) when sidebar is collapsed. Positioned at sidebar bottom, centred horizontally.

## Service card
`{rounded.card}` + `border: 1px solid {colors.border}`. Hover: border shifts to `{colors.brand}` at 30% opacity. Stopped services render at 72% opacity. Contains:

- Service name (bold) + description (muted)
- Port badge (violet-tinted monospace pill) — range 30100–30199
- **External URL** (monospace, truncated with tooltip) — renamed from "Upstream URL"
- **Mocks Root** path in monospace: `/mocks/{service-slug}` — read-only, informational. No click interaction; use the **Mappings** action link to navigate to the service's files.
- **Mock count** — total mapping + response files combined (e.g. `bi-file-earmark-code  7 files`). Informational only.
- Status pill (Live/Stopped)
- Enable/disable toggle
- **Edit** — opens the Edit Service form
- **Mappings** — navigates to the Mappings view with this service pre-selected in the folder tree

**Service slug convention:** lowercase display name, spaces → hyphens. Example: "Finance API" → `finance-api`.

**Port auto-assignment:** when adding a new service, the next available port in range 30100–30199 is pre-filled. The range supports up to 100 services.

**Port exhaustion states:**
- **Warning (≤ 10 ports remaining):** the port input field shows an amber inline notice: "X ports remaining in range (30100–30199)."
- **Range full (0 ports remaining):** the Add Service button is disabled; an amber banner in the Services view reads: "Port range 30100–30199 is fully allocated. Remove a service to free a port." The port field is hidden from the Add Service form.

## Status pill
`{rounded.full}`, 5px colored dot, text label. Live: green palette. Stopped: slate palette. Never uses just color alone — always dot + text (accessibility).

## Toggle switch
32×18px track, 14px thumb. On: `{colors.success}`. Off: slate-600 / zinc-600. Thumb slides with CSS transition. Keyboard: `Space` toggles the switch state. (`Enter` is reserved for form submission and does not activate standalone toggles — WAI-ARIA `role="switch"` pattern.)

## Tables
`table-layout: fixed`, `width: 100%`. No outer horizontal scroll — columns defined via `<colgroup>`. Vertical scroll within a bounded container. Row hover: subtle `{colors.content-surface}` background. Selected row: `{colors.brand}` at 10% opacity + 2px left border in `{colors.brand}`. Sticky column headers.

## Notification bell dropdown
Opens below top bar, right-aligned, max-width 360px, `{rounded.card}`, elevation level 3. Header: "Notifications" + "Mark all read" link. List: infinite scroll — loads next 20 items on scroll. Each item: icon (severity) + message + timestamp + dismiss (✕). Unread items: slightly elevated background. Mark-as-read: click item or explicit button; badge decrements.

**Scope restriction:** the bell panel shows **warnings and errors only** — `info` and `success` events are excluded. A footer note links to System Events for the full log. This keeps the bell panel actionable — it signals things that need attention, not routine operational info.

## Mappings file explorer
Left pane (folder tree, ~240px): collapsible tree. Root node = mocks volume path. Service nodes = display name + real path in tooltip. Children: `mappings/` and `responses/` sub-folders. File nodes: filename + extension. Active file: highlighted with brand left-border. Modified (unsaved) file: `●` dot appended to filename in tree, italic style. Keyboard: arrow keys to navigate, Enter to open.

Right pane (file editor): breadcrumb path at top. Tab bar: Form | Raw JSON. Form tab: structured fields (method, URL pattern, status, response body, content-type, delay, priority, header filter, body matcher, use-transformer toggle). Raw JSON tab: syntax-highlighted, Copy button. Actions bar: **Copy · Delete · Discard · Save**.

**Save / Discard enable rules:**
- **Save** — enabled when: file is newly created (not yet written to disk) OR file has unsaved changes. Disabled otherwise.
- **Discard** — enabled when: file is an existing file with unsaved changes. Disabled for new (unsaved) files and for clean files.

**New file actions:** "+ New Mapping" and "+ New Response" are **separate buttons** that create files in the correct sub-folder (`mappings/` vs `responses/`) respectively.

**File naming conventions:** all segments use underscores as delimiters.
- Mapping files: `{method-lowercase}_{path-slugified}_{variant}.json` — `{variant}` is a scenario descriptor (e.g. `happy-path`, `not-found`, `server-error`, `unauthorized`). Example: `get_account_happy-path.json`
- Response files: `{method-lowercase}_{path-slugified}_{variant}_body.json` — example: `get_account_happy-path_body.json`

**Path structure:** all service files live under `/mocks/{service-slug}/` — mappings at `/mocks/{service-slug}/mappings/`, responses at `/mocks/{service-slug}/responses/`. The `BodyAsFile` field in a mapping references the response file with a relative path that mirrors the response file naming convention: `../responses/{method-lowercase}_{path-slugified}_{variant}_body.json`.

## Modal
Max-width 480px (content permitting). `{rounded.card}`. Header: title + close (✕). Footer: action buttons right-aligned (ghost + primary). Backdrop: `rgba(0,0,0,.5)`. Dismiss: Esc key or click backdrop. Focus trapped while open.

## Toast notifications

Toasts appear at the **bottom-right** of the viewport, above the content area (never overlapping table action buttons). Max-width 360px, `{rounded.card}`, elevation level 2. Stack vertically (newest on top), up to 3 visible; additional toasts queue behind.

| Severity | Icon | Behaviour |
|---|---|---|
| Success | `bi-check-circle` | Auto-dismiss after 4 s |
| Info | `bi-info-circle` | Auto-dismiss after 4 s |
| Warning | `bi-exclamation-triangle` | Auto-dismiss after 6 s |
| Error | `bi-x-circle` | Persistent — dismiss manually |

Left border accent uses the severity color token. Dismiss button (✕) on every toast.

**File save error:** "Failed to save `{filename}` — {reason}." Severity: error. Includes a **Retry** inline action.

**File delete error:** "Failed to delete `{filename}` — {reason}." Severity: error. No retry.

**Connection loss during save:** persistent warning toast: "Connection lost. Your changes have not been saved." Auto-clears when connection is restored; can also be dismissed manually.

## Right drawer
Slides from right, width 320px (desktop, ≥ 640px). On mobile (< 640px), renders as a **bottom sheet** — slides up from the bottom of the viewport, full width, drag handle at top. Bottom sheet is more thumb-accessible than a side drawer on small screens. Same elevation as modal (level 3). Dismiss: Esc, tap/click outside, drag down (bottom sheet only), or close button.

## Bottom panel
Split layout, draggable divider handle. Min panel height 100px; max 60% of viewport. Tab bar: Request | Response | Headers. Close button collapses panel.

## Settings layout
Left sub-nav (170px) + right content area. Sub-nav items same style as main sidebar nav items. Content area: section title + setting rows (label+description left, control right). Controls: select, toggle, button group (row detail style), swatch grid (themes).

**Settings sub-nav items:** Appearance / Network Activity / Paths / Cache / Auth & Users / Feature Flags.

**Dual-sidebar layout:** when Settings is active, both the main sidebar (200px/52px, collapsible) and the settings sub-nav (170px, fixed) are visible simultaneously. The main sidebar remains fully functional and can be collapsed to 52px to give the settings content more room. The settings sub-nav has no collapse affordance — it is always at full width.

> **TBD — Auth & Users:** user management, roles, and authentication configuration are not yet designed. This section is reserved in the sub-nav; do not implement until a dedicated spec exists.

**Cache section:**
- "Clear all caches" row: description + red `Clear All` button → confirmation dialog
- Named caches list: each cache shown as a card row with name, entry count, size, and individual `Clear` button
- Clearing a cache is confirmed before execution

## HTTP method chip

`{rounded.sm}`, `font-weight: 700`, `font-size: {typography.scale.xs}`, uppercase text, `white-space: nowrap`. Foreground and background from the `method-*` token set. Always includes the method text — never color-only.

Long methods (`OPTIONS`, `HEAD`, `CONNECT`, `TRACE`) render at full text; set a minimum column width of `72px` in `<colgroup>` to accommodate the widest value. Chips never truncate — if a chip overflows, fix the column definition.

## Tooltip

Appears on **hover** (300ms delay) and on **keyboard focus** (no delay) for any element whose visible label is absent or truncated. Placement: above by default; flips below or to the side when insufficient viewport space. Max-width: 240px. `{typography.scale.sm}`, `{rounded.md}`, elevation level 2. Long paths wrap; tooltip text is never truncated. Dismiss on `Esc` or when the trigger loses focus/hover.

**Standard tooltip targets:**
- Truncated path/URL cells in tables (shows full value)
- Collapsed sidebar nav items (shows item label)
- Service tree nodes in Mappings pane (shows real file system path)
- Top bar icon buttons (shows action label)
- Network Activity type icon (`bi-database`, `bi-arrow-repeat`) — shows "Mock" or "Proxied"

---

# Empty States

All views must render a purposeful empty state — not a blank content area.

| View | Empty condition | Empty state content |
|---|---|---|
| Services | No services configured | `bi-server` (48px, muted) + "No services yet" heading + "Add your first service to get started." + primary **Add Service** button |
| Network Activity | No requests captured | `bi-activity` (48px, muted) + "No activity yet" + "Requests will appear here once a service is live and receiving traffic." |
| Mappings — no service selected | Tree present, nothing selected | `bi-file-earmark-code` (48px, muted) + "Select a service" + "Choose a service from the left panel to browse its mapping files." |
| Mappings — service selected, no files | Service expanded, folders empty | Service name shown + `bi-file-earmark-plus` (48px, muted) + "No mappings yet" + **+ New Mapping** and **+ New Response** buttons |
| System Events | No events logged | `bi-journal-text` (48px, muted) + "No events yet" + "System events will appear here as services start and stop." |
| Notifications panel | No unread notifications | `bi-bell-slash` (32px, muted) + "You're all caught up" — inline within the bell dropdown |

Empty state icons: `color: {colors.content-muted}`. Headings: `{typography.scale.md}` + `font-weight: 600`. Body text: `{typography.scale.base}` + `color: {colors.content-muted}`.

---

# Accessibility

## ARIA roles and labels
- **Toggle switch:** `role="switch"` + `aria-checked="true|false"` + label associated via `aria-labelledby` or `<label>`.
- **Notification bell button:** `aria-label="Notifications"` + `aria-haspopup="true"` + `aria-expanded` reflecting dropdown open state.
- **Sidebar nav:** `role="navigation"` on `<nav>`; `aria-current="page"` on the active item.
- **Modal:** `role="dialog"` + `aria-modal="true"` + `aria-labelledby` pointing to the modal title element.
- **Right drawer / bottom sheet:** `role="dialog"` + `aria-modal="true"` + `aria-labelledby` pointing to a visible heading.
- **File tree:** `role="tree"` with `role="treeitem"` for nodes; `aria-expanded` on folder nodes; `aria-selected` on active file.
- **Status pill:** colored dot is `aria-hidden="true"`; text label is always present.
- **Skeleton loaders:** `aria-busy="true"` on the loading container; removed when content is resolved.

## Focus management
- **Modal / drawer open:** focus moves to the first focusable element inside the overlay.
- **Modal / drawer close:** focus returns to the element that triggered the overlay.
- **Focus trap:** active for modals. Active for bottom sheets on mobile. Desktop drawers do not trap focus.

## Live regions
- Service status changes (Live ↔ Stopped): `aria-live="polite"` — e.g. "Finance API is now Live."
- Toast notifications: `role="alert"` for errors; `role="status"` for success/info.
- Notification badge count changes: `aria-live="polite"` on the badge element.

## Color contrast
All text/background combinations must meet WCAG 2.1 AA (4.5:1 normal text, 3:1 large text). Theme variants must be validated individually before shipping.

## `data-testid` convention
All interactive and key structural elements carry a `data-testid` attribute for automated testing. Convention: `kebab-case`, scoped to the component. `data-testid` values are never used for styling.

| Element | `data-testid` |
|---|---|
| Add Service button | `add-service-btn` |
| Service card (per service) | `service-card-{slug}` |
| Enable/disable toggle | `service-toggle-{slug}` |
| Mappings link on card | `service-mappings-link-{slug}` |
| Notification bell | `notification-bell` |
| Sidebar collapse button | `sidebar-collapse-btn` |
| Save button (file editor) | `file-editor-save-btn` |
| Discard button (file editor) | `file-editor-discard-btn` |
| Toast container | `toast-container` |

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

