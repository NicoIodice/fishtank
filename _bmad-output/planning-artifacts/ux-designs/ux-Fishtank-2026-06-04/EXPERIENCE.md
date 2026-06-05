---
name: Fishtank
version: "1.0"
status: draft
updated: 2026-06-05
design-ref: DESIGN.md
---

# Foundation

**Form factor:** Web SPA (React 18 + TypeScript). Primary surface: desktop browser (1280px+). Fully responsive: tablet (768–1279px) and mobile phone (< 768px) supported.

**UI system:** shadcn/ui + Tailwind CSS. Visual identity tokens defined in `DESIGN.md`. This document specifies behavioral delta only — shadcn defaults apply where not overridden.

**Rendering target:** Single Docker-hosted container, accessed via browser. No native shell, no Electron. No CDN dependency at runtime — all assets served from the container.

**Responsive behavior summary:**
- Desktop: full sidebar expanded, 3-col card grid, right-drawer and bottom-panel detail styles available
- Tablet: sidebar collapsible (default collapsed), 2-col card grid, drawer becomes full-width
- Mobile: sidebar hidden behind hamburger, 1-col stack, row detail always modal

---

# Information Architecture

## App shell

```
┌─ Top bar (always visible) ───────────────────────────────┐
│  [🐠 Fishtank]              [ℹ About] [🔔 Bell] [Avatar] │
├─ Sidebar (collapsible) ─┬─ Main content area ────────────┤
│  Services               │  Page header                   │
│  Network Activity       │  Toolbar (search, filters, CTA)│
│  Mappings               │  Content (table / grid / form) │
│  ─────────────────────  │                                │
│  System Events  [badge] │                                │
│  Settings               │                                │
│  ─────────────────────  │                                │
│  [◀ Collapse]           │                                │
└─────────────────────────┴────────────────────────────────┘
```

## Screens

| Route | Screen | Primary action |
|---|---|---|
| `/services` | Services | View / add / edit / toggle services |
| `/activity` | Network Activity | Monitor live requests, save mocks |
| `/mappings` | Mappings (file explorer) | Browse / edit / create mapping + response files |
| `/events` | System Events | Review warnings, errors, info |
| `/settings` | Settings | Configure appearance, behavior, auth |
| `/login` | Login | Authenticate |
| `/setup` | First-run setup | Create admin account |

## Sidebar badge
System Events item shows a red badge with the count of unread **warnings and errors only** (info events do not contribute to the badge count).

---

# Voice and Tone

**Principles:** Direct, technical, no fluff. Use the exact term the user knows from WireMock and HTTP. Never anthropomorphize the tool ("Fishtank is thinking…" ✗). Prefer active voice. Keep UI copy short — labels, not sentences.

| Context | Tone | Example |
|---|---|---|
| Empty states | Helpful, neutral | "No mappings yet. Add one or resync from disk." |
| Errors | Precise, non-alarming | "Mapping load failed — missing `request.method` in `refund.json`" |
| Success confirmations | Brief | "Mapping saved." |
| Destructive confirmations | Direct | "Delete this mapping? This removes the file from disk." |
| Loading states | Minimal | "Loading mappings…" |
| Record mode on | Factual | "Record mode active — proxied requests auto-save as mappings." |

---

# Component Patterns

All behavioral specs below. Visual token references use `{path.to.token}` from `DESIGN.md`.

## Top bar
Always visible, never scrolls away. Fixed `z-index` above sidebar and content. Logo links to `/services`. About icon opens an About modal (version, Docker image tag, GitHub link). Notification bell opens the Notification panel (see below). User avatar opens a dropdown.

**User avatar dropdown:** shows account name + role (read-only). Single action: **Sign out**. Does not include a Settings link — Settings is accessed via sidebar nav only.

## Sidebar
- **Expanded** (default desktop): icons + labels visible
- **Collapsed** (default mobile, toggle on desktop): icons only; hovering a nav item shows a tooltip with the label
- Collapse/expand toggle: chevron icon at sidebar bottom; persisted to `localStorage`
- Active item: highlighted per `DESIGN.md {colors.sidebar-active-*}`; route-driven
- System Events badge: shows unread warning+error count; hidden when count = 0

## Notification panel (bell dropdown)
- Opens on bell click; closes on click outside, Esc, or second bell click
- **Content: warnings and errors only.** `info` and `success` events are deliberately excluded — the bell is an attention signal, not a general event feed. A footer note in the panel links to System Events for the full log.
- **Pagination:** 10 items on open; scroll to bottom loads next 10 (infinite scroll pattern)
- **Per-item:** severity icon + message + timestamp + service tag (if applicable) + dismiss (✕) button
- **Mark as read:** clicking an item marks it read; ✕ dismisses it from the panel
- **"Mark all read" button** in panel header
- **Badge:** counts unread warnings+errors only; decrements on mark-as-read; never shown for info/success events

## Tables (Network Activity, Services table view)
- `table-layout: fixed`; column widths defined via `<colgroup>`; no horizontal scroll
- Vertical scroll within a fixed-height container (not full-page scroll)
- Sticky headers
- Row hover state
- Keyboard: arrow keys move focus between rows; Enter opens row detail
- Click row → opens detail per user's configured preference (Modal / Right Drawer / Bottom Panel)
- All three detail styles must be functionally equivalent — same content, different container

## Network Activity screen

### Toolbar
Left to right:
1. **Search field** — magnifying glass icon on left, clear (×) button on right, filters URL path + method
2. **Service dropdown** — filters rows to one service; default "All Services"
3. **Type filter button** — label shows current filter state: `All` (both checked), `Mock only`, or `Proxy only`. Opens a small dropdown with two checkboxes: Mock / Proxy. Icon: `bi-funnel`.
4. **Clear filters button** — resets search, service filter, type filter, and sort to defaults (datetime ascending)
5. *(right side)* **Columns button** — opens a column selector dropdown; checkboxes per column

### Column definitions
Default visible columns (in order): Method · URL Path · Status · Type · Service · Actions.

The `ms` (duration) column is hidden by default but available via the Columns selector.

| Column | Notes |
|---|---|
| Method | HTTP method chip (colored) |
| URL Path | Monospace, truncated; renamed from "Path" |
| Status | HTTP status code, monospace |
| Type | Icon only + tooltip (see below); has filter icon in header — not a sort arrow |
| Service | Service display name |
| Actions | Icon-only buttons (see below); no sort arrow |

**Column sorting:** all columns except Type and Actions have up/down sort arrows in the header. Click cycles: unsorted → ascending → descending. Only one column sorted at a time.

### Type column
- Not a text chip. Rendered as a **Bootstrap Icon with a tooltip**:
  - Proxied request: `bi-arrow-repeat` in `#10b981` (emerald), tooltip "Proxied to external"
  - Mock request: `bi-database` in `#3b82f6` (blue), tooltip "Served from mock"
- There is no "error" type tag. Errors are indicated by row highlight, not a type label.
- Type column header: shows a `bi-funnel` filter icon only (no sort arrow). Clicking opens the Type filter dropdown.

### Row highlight rules
Both highlights can apply simultaneously.

| Condition | Highlight |
|---|---|
| Proxied request AND service is currently **Live** | Amber left-border (`2px solid #f59e0b`) on first cell |
| HTTP 5xx response OR unhandled exception | Subtle red background (`rgba(239,68,68,.04)`) on all cells |

Proxied rows for **stopped** services are **not** highlighted — the amber highlight signals active proxying only.

### Actions column
Icon-only buttons, no text labels. Each has a tooltip.

| Icon | Tooltip | When shown |
|---|---|---|
| `bi-eye` | "View detail" | Always |
| `bi-lightning-charge` (brand color) | "Save mapping & response files" | Proxied rows only |

### Proxy counter
A pill widget in the page header (right side, before Record/Clear buttons):
- Format: `↺ Proxied: N` where N = total proxied-to-external request count in current log
- Click → dropdown/popover showing per-service proxied counts
- If any proxied row has a 5xx status, the count number renders in error color (`#ef4444`)

### Record mode
- "● Record" button in page header; click starts recording. Label changes to "⏹ Stop".
- While recording: persistent amber "● Recording" badge visible in page header
- A `bi-arrow-clockwise` spinner icon beside the page title acts as a manual refresh trigger when auto-refresh is disabled

### Row detail (Network Activity)
Three styles, all showing the same data. Default: Modal. User sets preference in Settings → Appearance.

**Shared content (all three styles):**
- Request ID (GUID), DateTime (ISO 8601)
- Method, URL path, Service name + port badge
- Type (proxied / mock)
- HTTP status code
- Request headers (redacted per settings)
- Request body (pretty-printed JSON if parseable, raw otherwise)
- Response body (pretty-printed JSON if parseable, raw otherwise)
- Response headers
- **"Mock" button** — shown only for proxied requests; opens Mock Suggestion modal
- **Close button** — always positioned on the right of the modal/drawer header

**Modal:** centered, max-width 560px, backdrop, focus-trapped, Esc to close. Close (✕) button top-right of header.
**Right drawer:** slides from right 320px (desktop) / full-width (mobile), Esc to close, click outside to close. Close (✕) button top-right of header.
**Bottom panel:** split-view below table, tab bar (Request / Response / Headers), close collapses panel.

### Mock Suggestion modal
Opened from the "Mock" button in row detail, or directly from the `bi-lightning-charge` action in the table.

**Content:**
1. **Mapping section** — label "Mapping", shows generated WireMock.NET JSON (editable `contenteditable` block or textarea). Auto-populated from the proxied request:
   - `Guid`: newly generated
   - `Request.Path.Matchers`: WildcardMatcher on the request path
   - `Request.Methods`: the HTTP method
   - `Response.StatusCode`: the proxied response status
   - `Response.BodyAsFile`: relative path `../responses/{method}_{path}_body.json`
   - `Response.UseTransformer: true`

2. **Response Body section** — label "Response Body — `{filename}`", shows the proxied response body (editable). Filename follows the `{method}_{path}_body.json` convention.

Both blocks are editable before saving.

**Footer actions:** `Save` (writes mapping + response files to disk, closes modal, updates folder tree) and `Close`.

## Service cards & grid
- Default: 3-col grid (desktop) → 2-col (tablet) → 1-col (mobile)
- Toggle to table view: persisted per session
- Each card: name, description, port badge, **External URL** (monospace, truncated with full value in tooltip), **Mocks Root** path (`/mocks/{service-slug}`, monospace), **mock file count** (mapping + response files combined), status pill (Live/Stopped), enable/disable toggle, action links
- Toggle enable/disable: immediate optimistic UI update; rollback with error toast on failure — **exception to no-optimistic-update rule**: the toggle state is visually cheap to revert and the operation is non-destructive
- Status pill always shows dot + text (never dot alone)
- Stopped service cards: 72% opacity

**Port assignment:** all services occupy ports in the range **30100–30110**. When adding a service, the next available port is pre-filled and editable. Warn if all 11 slots are in use.

**"External URL" naming:** the field was previously labelled "Upstream URL". It is now consistently **"External URL"** everywhere — cards, table, Add/Edit modal, form labels.

**Mocks Root (display only):** shown as `/mocks/{service-slug}` — not the full `/mappings` or `/responses` sub-path. The full paths appear as read-only fields in the Add/Edit modal.

**Add Service modal fields:**
- Service Name (text)
- Port (number, pre-filled with next available in 30100–30110, editable)
- Description (text, optional)
- External URL (text)
- Mocks Root Folder — read-only, auto-generated: `/mocks/{service-slug}`
- Mappings Path — read-only, auto-generated: `/mocks/{service-slug}/mappings`
- Responses Path — read-only, auto-generated: `/mocks/{service-slug}/responses`

The three path fields update in real time as the user types the service name. They are never editable directly.

## Mappings — file explorer

**Layout:**
```
┌─ Toolbar: [+ New Mapping] [+ New Response] [↺ Resync] ─────────────────────────┐
├─ Folder tree (240px) ───────┬─ File editor (flex-1) ──────────────────────────┤
│ 📁 Finance API   [Live]     │  /mocks/finance-api/mappings/acct-get-200.json   │
│  ├ 📁 mappings/             │  ┌─ Tabs: [Form] [Raw JSON] ─────────────────┐   │
│  │  ├ 📄 acct-get-200.json  │  │ Form / Raw editor content                 │   │
│  │  └ 📄 acct-post-201.json●│  └───────────────────────────────────────────┘   │
│  └ 📁 responses/            │  [Copy] [Delete]  [Discard*] [Save*]             │
│ 📁 Social Security  [Live]  │                                                   │
│  ├ 📁 mappings/             │  ● = unsaved indicator (italic + dot in tree)    │
│  └ 📁 responses/            │  * = enabled only per save/discard rules         │
└─────────────────────────────┴───────────────────────────────────────────────────┘
```

**Folder tree behavior:**
- Nodes: volume root (path label) → service folders (display name, real path in tooltip) → `mappings/` + `responses/` sub-folders → individual `.json` files
- Expand/collapse: click folder node or arrow key
- Select file: click → loads content in editor pane; active file highlighted with brand left-border
- Keyboard navigation: ↑↓ move focus, → expand, ← collapse, Enter open
- Context menu (right-click / long-press): Rename, Copy, Delete

**File actions:**
- **View:** single click on file node loads read-only preview
- **Edit:** any keystroke in editor activates edit mode; the filename node in the folder tree shows a `●` dot (italic style) as an unsaved indicator
- **Save:** enabled only when the file is **newly created** (not yet persisted to disk) or has **unsaved changes**. Disabled for clean existing files. Writes immediately to filesystem; confirms success or shows error — no optimistic update.
- **Discard:** enabled only for **existing files with unsaved changes**. Disabled for new (unsaved) files and for clean files. Reverts to last saved state after confirmation.
- **Delete:** confirmation dialog → delete → file removed from tree
- **New Mapping:** "+ New Mapping" button → naming modal → creates empty file in `mappings/` sub-folder → opens in editor with Save enabled
- **New Response:** "+ New Response" button → naming modal → creates empty file in `responses/` sub-folder → opens in editor with Save enabled. These are **always separate buttons** — never merged into a single "+ New File" action.
- **Copy from existing:** "Copy" button in editor footer → modal: source filename pre-filled, user enters new name → copies file to same sub-folder → opens copy in editor in edit mode
- **Network Activity → Mappings:** when "Save" is triggered in the Mock Suggestion modal, the mapping file is written to `mappings/` and the response file to `responses/`; the folder tree re-fetches that service's file list immediately

**File naming conventions:**
- Mapping files: `{method-lowercase}-{path-slugified}-{status}.json` — e.g. `account-get-200.json`, `transfer-post-201.json`
- Response files: `{method-lowercase}_{path-slugified}_body.json` — e.g. `get_account_body.json`, `post_transfer_body.json`
- The `_body` suffix on response files is required — it matches the `BodyAsFile` relative reference in the corresponding mapping (`../responses/{filename}_body.json`)

**Editor — Form tab:**
Fields: Method (select), URL Pattern (text, monospace), Response Status (quick-pick buttons: 200 / 201 / 400 / 404 / 500), Response Body (textarea, monospace), Content-Type (text), Priority (number), Response Delay ms (number), Header Filter (optional, monospace — maps to `Request.Headers` matcher array), Body Matcher (optional, monospace — maps to `Request.Body.Matcher`), Use Transformer (toggle). All fields map 1:1 to WireMock.NET JSON mapping structure.

**Editor — Raw JSON tab:**
Syntax-highlighted display. Editable textarea with JSON validation on save (surface parse error inline, block save). "Copy" button. Monospace font `{typography.mono}`. Line numbers optional (implementation decision).

## System Events screen
Two tabs: **Warnings & Errors** | **Info**. Tab headers show item count badges.

**Warnings & Errors tab:** errors (red icon) and warnings (orange icon). Each item: icon + message (with inline code references for file paths, GUIDs) + timestamp + service tag + dismiss (✕). "Mark all read" and "Clear all" in page header.

**Info tab:** success events (Mock saved, Resync completed) and operational info (Record mode enabled, container startup, service restarts). Same item structure. Softer icons (✅ 🔄 🚀).

Both tabs: flat list, newest first, no sub-grouping by type. Scroll to load more (10/batch).

**Relationship to notification bell:** the bell panel is a filtered view of warnings+errors only. The System Events screen is the full log — a footer note in the bell panel always links here.

## Settings screen
Sub-navigation: **Appearance / Network Activity / Paths / Cache / Auth & Users / Feature Flags**.

**Appearance section:**
- Theme: 4 swatch buttons (split-circle showing sidebar + accent color); selected swatch has brand ring
- Row detail style: segmented button group (Modal / Right Drawer / Bottom Panel)
- Sidebar default state: select (Expanded / Collapsed)

**Network Activity section:**
- Auto-refresh interval: select (1s / 2s / 5s / Disabled)
- Max log entries per service: select (500 / 1000 / 5000)
- Sensitive header redaction: toggle (on by default)

**Paths section:** Mocks Root path — single text input. Changing this affects where all services look for their files.

**Cache section:**
- "Clear all caches" row: description + red `Clear All` button → confirmation dialog → clears all in-memory cached mappings and responses
- Named caches list: each service cache shown as a row with name, entry count, estimated size, and individual `Clear` button → confirmation dialog

**Auth & Users section:** user list table (username, role, last login), add user button, change password, auto-registration toggle.

**Feature Flags section:** Record Mode toggle, Pipeline Reset API toggle (`POST /admin/reset`).

## Login screen
Centered card on plain background (sidebar hidden). Fields: username, password. Primary CTA: "Sign in". No "forgot password" (self-hosted, admin resets via env var). Shows Fishtank logo + version.

## First-run setup screen
Shown when no admin account exists. Single step: choose admin username + password + confirm password. CTA: "Create admin account". After submit: redirects to `/services`.

---

# State Patterns

| State | Pattern |
|---|---|
| Loading (initial data fetch) | Skeleton loaders — table rows show grey shimmer bars; card grid shows ghost cards |
| Loading (action in progress) | Button shows spinner + disabled; label unchanged |
| Empty state | Illustration-free — concise message + primary action (e.g. "No services yet. Add your first service.") |
| Error (data fetch failed) | Inline error banner in content area with retry button; does not block navigation |
| Success (save / create) | Brief toast notification bottom-right, auto-dismiss 3s: "Mapping saved." |
| Success (destructive undo window) | Not provided — file deletes are confirmed before execution, no undo |
| File unsaved changes | Dot indicator (●) in editor tab/title + "Unsaved changes" label; navigation away prompts confirmation |
| Service stopped | Card dims slightly (sidebar bg color bleeds into card); toggle shows off state; status pill shows "Stopped" |
| Record mode active | Network Activity toolbar shows persistent "● Recording" badge in warning/amber color; Record Mode toggle button active state |
| Notification bell unread | Red badge with count; animates in when new events arrive (scale pulse) |

---

# Interaction Primitives

**Keyboard navigation:**
- Tab / Shift+Tab: move focus between interactive elements
- Arrow keys: navigate within sidebar, tables, folder tree, segmented controls
- Enter / Space: activate focused element (open row detail, toggle, expand folder)
- Esc: close modal, drawer, panel, dropdown

**Focus rings:** always visible; use `ring-2 ring-offset-2 ring-{brand}` (Tailwind) — never hidden with `outline: none` without a replacement

**Hover states:** all interactive elements have a distinct hover state (background shift or border color change)

**Drag:** folder tree items are not draggable in v1. Draggable divider handle for bottom-panel split view only.

**Tooltips:** shown on hover for truncated text (paths, URLs), collapsed sidebar nav items, theme swatches, port badges. Delay: 400ms. No tooltip on touch devices (use long-press context menu instead).

**Toasts:** bottom-right, stack vertically (newest on top), max 3 visible, auto-dismiss 3s (errors persist until dismissed manually).

**Confirmations:** destructive actions (delete file, delete service, clear all events) always require a confirmation dialog — never execute on single click.

**Auto-refresh (Network Activity):** polling interval configurable in Settings. Live indicator (green dot + "LIVE" label) shown in page header. User can pause refresh via toggle in toolbar without leaving the page.

---

# Accessibility Floor

Behavioral requirements. Visual contrast requirements live in `DESIGN.md`.

- All interactive elements reachable and operable by keyboard alone
- Focus never trapped outside intended modal/drawer contexts
- All icons used as interactive controls have `aria-label` or associated visible label
- Status indicators (Live/Stopped, severity icons) use text alongside color — never color alone
- HTTP method chips include method text — never color alone
- Tables use `<thead>`, `<th scope="col">`, `<caption>` (visually hidden if decorative)
- Folder tree implemented as `role="tree"` / `role="treeitem"` with `aria-expanded`
- Modal: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to modal title; focus trapped
- Notification badge: `aria-label="N unread notifications"` updated dynamically
- Toggle switches: `role="switch"`, `aria-checked`
- Skeleton loaders: `aria-busy="true"` on container while loading
- Error messages associated with form fields via `aria-describedby`
- WCAG AA minimum contrast for all text against its background — verified per theme

---

# Key Flows

## Flow 1 — "The proxied request becomes a mock" (Sara, QA engineer)

Sara is running a test suite against a staging environment. A test keeps failing. She opens Fishtank — Network Activity, Finance API filter active. She spots a `POST /api/finance/transfer` returning `500` from the real upstream. The test expects a `201`. She clicks the row. The detail modal opens showing the real response body. She clicks "Save as Mock". A naming modal appears pre-filled with the method and path. She confirms. The modal closes. In the Network Activity toolbar, a brief "Mock saved." toast appears. She navigates to Mappings → Finance API → mappings/ — the new file `transfer-post-201.json` is in the tree. She clicks it, switches to Form tab, changes the status from `500` to `201`, edits the response body, saves. Runs the test again. It passes. **Total context switches: zero.** She never left the browser.

## Flow 2 — "Adding a new service" (Marco, backend developer)

Marco is starting a new microservice that depends on a Logistics API he hasn't mocked yet. He opens Services → clicks "+ Add Service". A modal form opens: Name, Description, Port, Upstream URL, Mapping path. He fills in "Logistics API", port `8084`, real upstream URL. Saves. The modal closes. The new service card appears in the grid — status pill shows "Live". He navigates to Mappings — the Logistics API folder is already in the tree with empty `mappings/` and `responses/` sub-folders. He clicks "+ New Mapping", names the file `shipment-get-200.json`, fills in the Form fields, saves. Done in under two minutes.

## Flow 3 — "Investigating a warning before standup" (Priya, Tech Lead)

Priya opens Fishtank five minutes before standup. The System Events bell badge shows `2`. She clicks the bell — the dropdown shows two warning items: a duplicate GUID in Finance API and a malformed response in Social Security. She clicks the Social Security warning — the item expands (or routes to System Events) showing the exact file path and line number. She copies the path, pings the QA engineer who owns that file. She clicks "Mark all read". The badge clears. Standup starts. **She needed no terminal, no grep, no curl.**

## Flow 4 — "DevOps checks service health before a deployment" (Alex, DevOps)

Alex needs to confirm all mock services are live before a deployment pipeline runs. He opens Fishtank — Services page. At a glance: 5 green "Live" pills, 1 grey "Stopped" pill on Legacy Auth. That's expected — Legacy Auth is disabled in this environment. He screenshots the grid for the deployment ticket. No login required if the team has configured auto-registration on this instance. **One screen, ten seconds.**

## Flow 5 — "Switching to dark mode on a late-night debugging session" (Sara, same engineer, 11pm)

Sara's eyes hurt. She clicks the gear icon → Settings → Appearance. She clicks the Deep Ocean swatch. The entire app transitions instantly — sidebar goes dark navy, content area goes `#0f2233`, table rows show in muted white text. The theme is persisted to `localStorage` — next time she opens Fishtank it loads in Deep Ocean. No page reload.

