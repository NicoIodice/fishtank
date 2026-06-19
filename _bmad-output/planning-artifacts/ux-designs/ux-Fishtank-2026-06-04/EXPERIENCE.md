---
name: Fishtank
version: "1.0"
status: draft
updated: 2026-06-05
design-ref: DESIGN.md
---

# Foundation

**Form factor:** Web SPA (React 18 + TypeScript). Primary surface: desktop browser (≥ 1024px). Fully responsive across breakpoints — see canonical breakpoint table in DESIGN.md Layout & Spacing. Form factors: desktop (≥ 1024px), mid (640–1023px), mobile (< 640px).

**UI system:** shadcn/ui + Tailwind CSS. Visual identity tokens defined in `DESIGN.md`. This document specifies behavioral delta only — shadcn defaults apply where not overridden.

**Rendering target:** Single Docker-hosted container, accessed via browser. No native shell, no Electron. No CDN dependency at runtime — all assets served from the container.

**Responsive behavior summary** (see canonical breakpoint table in DESIGN.md Layout & Spacing for exact pixel thresholds):
- Desktop (≥ 1024px): full sidebar expanded, 3-col card grid, right-drawer and bottom-panel detail styles available
- Mid (640px–1023px): sidebar collapsible (default collapsed, 52px), 2-col card grid; Settings sub-nav collapses to `<select>` at < 768px; main sidebar hidden behind hamburger at < 768px
- Mobile (< 640px): sidebar hidden behind hamburger, 1-col stack, row detail always modal (overrides right drawer and bottom panel regardless of user preference), right drawer component becomes bottom sheet for other uses

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
│  System Events          │                                │
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
Unread event counts are surfaced via the notification bell in the top bar only. Sidebar nav items do not show badges.

---

# Voice and Tone

**Principles:** Direct, technical, no fluff. Use the exact term the user knows from WireMock and HTTP. Never anthropomorphize the tool ("Fishtank is thinking…" ✗). Prefer active voice. Keep UI copy short — labels, not sentences.

| Context | Tone | Example |
|---|---|---|
| Empty states | Helpful, neutral | "No mappings yet." / "Create a new mapping or run Resync to load files from disk." |
| Errors | Precise, non-alarming | "Mapping load failed — missing `request.method` in `post_refund_500.json`." |
| Success confirmations | Brief | "Mapping saved." |
| Destructive confirmations | Direct | "Delete this mapping? This removes the file from disk." |
| Loading states | Minimal | "Loading mappings…" |
| Record mode on | Factual | "Recording active — proxied requests are captured in the activity log." |

---

# Component Patterns

All behavioral specs below. Visual token references use `{path.to.token}` from `DESIGN.md`.

## Top bar
Always visible, never scrolls away. Fixed `z-index` above sidebar and content. Logo links to `/services`. About icon opens an About modal — see DESIGN.md About modal spec for canonical field list (includes: version number, Docker image tag, build hash, documentation link, changelog link). Notification bell opens the Notification panel (see below). User avatar opens a dropdown.

**User avatar dropdown:** shows account name + role (read-only; role label: "Admin" — the only role in v1, hardcoded). Single action: **Sign out**. Does not include a Settings link — Settings is accessed via sidebar nav only.

**Sign out with unsaved changes:** if the user has unsaved mapping edits when Sign out is triggered, a confirmation dialog is shown before the session is terminated. **Dialog title: "Sign out?"** — identical across all three body-copy variants; distinction is carried in the body text only. **Body:** "You have unsaved changes in the Mappings editor. Sign out now? Unsaved changes will be lost." Actions: **Cancel** (dismisses dialog, returns to current state) and **Sign out** (proceeds, discards unsaved changes). Additionally, if the Settings Mocks Root input has a pending (not yet saved) value, that pending value is included in the warning: "You have unsaved changes in the Mappings editor and an unsaved Mocks Root path. Sign out now? Unsaved changes will be lost." If only the Mocks Root input has a pending value and there are no mapping edits: "You have an unsaved Mocks Root path. Sign out now? Unsaved changes will be lost." Actions: **Cancel** (dismisses dialog, returns to current state) and **Sign out** (proceeds, pending Mocks Root value discarded). Sign out never silently discards **persisted** unsaved work (mapping file edits, pending Settings Mocks Root path). Transient form data (in-progress Add/Edit Service modal) is not guarded but is warned about in the sign-out confirmation message.

**In-progress Add/Edit Service modal:** modal form data is transient — sign out closes the modal without a secondary guard, but the sign-out confirmation includes the note: "Any unsaved form data will be lost." No data is persisted from an in-progress modal.

## Sidebar
- **Expanded** (default desktop): icons + labels visible
- **Collapsed** (default mobile, toggle on desktop): icons only; hovering a nav item shows a tooltip with the label
- **Collapsed on touch devices:** tapping a nav item navigates; the sidebar **remains collapsed** — it does not expand on navigation. On touch devices in collapsed state, nav items display a brief bottom-label below the icon (in place of hover tooltips, which are not available on touch).
- Collapse/expand toggle: chevron icon at sidebar bottom; persisted to `localStorage`
- **Hamburger button** (`bi-list`, visible at < 768px — top-left of every applicable screen): `aria-label="Open navigation"` when sidebar is closed; `aria-label="Close navigation"` when sidebar is open; `aria-controls="main-sidebar"`; `aria-expanded` mirrors the sidebar’s current open state. The main sidebar <nav> element carries id="main-sidebar" so the `aria-controls` association resolves correctly.
- **Mobile sidebar overlay:** when the sidebar is open on mobile (< 768px) via the hamburger, a `rgba(0,0,0,0.4)` full-screen backdrop sits between the sidebar and the page content. Tapping the backdrop closes the sidebar. The sidebar overlays content — it does not push it.
- Active item: highlighted per `DESIGN.md {colors.sidebar-active-*}`; route-driven
- System Events: no badge on nav item — unread counts surface only via the notification bell

## Notification panel (bell dropdown)
- Opens on bell click; closes on click outside, Esc, or second bell click. Keyboard: `Enter` and `Space` open or close the panel when the bell button is focused. The notification panel closes automatically on any navigation event (sidebar click, logo click, browser back/forward).
- **Content: warnings and errors only.** `info` and `success` events are deliberately excluded — the bell is an attention signal, not a general event feed. A footer note in the panel links to System Events for the full log — copy: "See all events in System Events →". On close and reopen, the panel resets to the initial 20 items; the "Load more" pagination state is not persisted between opens.
- **Pagination:** 20 items on open; a **"Load more" button** at the bottom of the list loads the next 20 items per click. Infinite scroll (auto-load on scroll) is not used — it is not keyboard-operable. The button is hidden once all items are loaded. **New events arriving while the panel is open** are prepended to the top of the list; the badge count increments in real time; the user’s scroll position does not change. When new items arrive and the panel is scrolled below the top, a sticky **“N new”** pill appears at the top of the list area; clicking it scrolls to the top of the list and dismisses the pill. (N = the count of new items prepended since the user last was at the top of the panel; existing items shift down by N positions when new items are prepended — the pill signals this shift. N resets to 0 when the user reaches the top or clicks the pill.)
- **Per-item:** severity icon + message text (contains an inline hyperlink to the corresponding System Events entry, pre-filtered to that specific event — URL format: `/events?tab=warnings-errors&id={event-id}`) + timestamp + service tag (if applicable) + dismiss (✕) button. **Service tag format:** a non-interactive muted text label showing the service display name, styled as `{typography.scale.sm}`, `rgba(var(--brand-rgb), 0.12)` background, `{colors.border}` border, `{rounded.md}`. Omitted entirely when no service is associated — never shown as empty.
- **Mark as read:** clicking anywhere on an item body marks it read (badge decrements, unread background removed) — the item **remains visible** in the panel in its read state.
- **Dismiss (✕):** removes the item from the panel view only — the event **remains in System Events** and is considered read. Dismissed items do not reappear unless the underlying system condition recurs and generates a new event.
- **"Mark all read" button** in panel header — marks **all** server-side unread warnings and errors as read, including items not yet loaded via "Load more". Badge resets to zero immediately. All currently displayed items remain visible in their read state (same behavior as per-item mark-as-read — the panel is not emptied; use Dismiss ✕ to remove individual items from view). **ARIA:** `aria-label="Mark all notifications as read"` — no tooltip needed (visible text label is sufficient). **“Mark all read” visibility:** the button is hidden when the unread count is 0 (all items have been read individually). It re-renders when new unread items arrive. This prevents it from being a no-op control.
- **Badge:** counts unread warnings+errors only; decrements on mark-as-read; never shown for info/success events. Displays the count as a number (1–99); displays `"99+"` when count exceeds 99 — badge minimum width accommodates three characters.
- **Dismiss vs. Mark as read:** these are two distinct actions. Mark as read keeps the item visible in the panel in a read state (matching email convention). Dismiss removes it from the panel view entirely (the underlying event is still in System Events). The dismiss (✕) button carries a tooltip: "Dismiss — removes from this panel; event remains in System Events and is marked read."
- **Empty state:** when there are no unread warnings or errors, the panel body shows `bi-bell-slash` (32px, muted) + “No warnings or errors — all caught up.” — this label accurately reflects the panel’s scope (warnings+errors only) rather than implying no notifications of any kind exist.

## Tables (Network Activity, Services table view)
- `table-layout: fixed`; column widths defined via `<colgroup>`; no horizontal scroll
- Vertical scroll within a fixed-height container (not full-page scroll)
- Sticky headers
- Row hover state
- Keyboard: arrow keys move focus between rows; Enter opens row detail
- Click row → opens detail per user's configured preference (Modal / Right Drawer / Bottom Panel)
- All three detail styles display the same data fields, but layout differs: the Bottom Panel uses a tab bar to organise content; Modal and Right Drawer display content in a single scrollable section.

## Network Activity screen

**Page header element order (left → right):** Hamburger icon (`bi-list`, visible only at < 768px) → Page title (`<h1>`) → Refresh icon (`bi-arrow-clockwise`, visible only when polling is paused) → LIVE / PAUSED indicator → Recording badge (visible only while recording is active) → [flex spacer] → Proxy counter pill → Record button → Clear log button.

### Toolbar
Left to right:
1. **Search field** — magnifying glass icon on left, clear (×) button on right (`aria-label="Clear search"`), filters URL path + method. **Matching semantics:** case-insensitive, contains-match; OR logic across fields — a row matches if the URL path **or** the HTTP method label contains the query string. Searches the full URL path value, not the truncated display. Example: typing “post” returns rows where method = POST and rows where the path contains “post”.
2. **Service dropdown** — filters rows to one service; default "All Services"
3. **Type filter button** — label shows current filter state: `All` (both checked), `Mocked only`, or `Proxied only`. Opens a small dropdown with two checkboxes: **Mocked** / **Proxied**. Icon: `bi-funnel`.
4. **Clear filters button** — resets search, service filter, type filter, and sort to defaults (datetime descending — newest first)
5. *(right side)* **Columns button** — opens a column selector dropdown; checkboxes per column

### Column definitions
Default visible columns (in order): Method · URL Path · Status · Type · Service · Actions.

The `ms` (duration) and `DateTime` columns are hidden by default but available via the Columns selector.

| Column | Notes |
|---|---|
| Method | HTTP method chip (colored) |
| URL Path | Monospace, truncated; renamed from “Path” |
| Status | HTTP status code, monospace |
| Type | Icon only + tooltip (see below); has filter icon in header — not a sort arrow |
| Service | Service display name |
| Actions | Icon-only buttons (see below); no sort arrow |
| ms | Response duration in milliseconds; displayed as `{N}ms` for values < 10 000ms; displayed as `{N}s` (integer seconds) for ≥ 10 000ms; displayed as `{N}m {N}s` for ≥ 60 000ms; monospace; no truncation needed. Column header tooltip: "Total response duration (request received → response sent)". Sortable when visible (up/down sort arrows in header). Hidden by default. |
| DateTime | ISO 8601 timestamp; monospace, truncated to `HH:MM:SS` in table (full ISO value on hover tooltip); hidden by default |

**Default sort order:** on initial page load, rows are sorted by DateTime **descending** (newest first). This matches the Clear filters reset default.

**Column sorting:** all columns except Type and Actions have up/down sort arrows in the header — including `ms` and DateTime when visible. Click cycles: unsorted → ascending → descending. Only one column sorted at a time.

### Type column
- Not a text chip. Rendered as a **Bootstrap Icon with a tooltip**:
  - Proxied request: `bi-arrow-repeat` in `#10b981` (emerald), tooltip "Proxied"
  - Mock request: `bi-database` in `#3b82f6` (blue), tooltip "Mocked"
- There is no "error" type tag. Errors are indicated by row highlight, not a type label.
- Type column header: shows a `bi-funnel` filter icon only (no sort arrow). Clicking opens the Type filter dropdown.

**Known limitation:** OR logic for the search field is intentional for simplicity; method/path scoping (e.g. `method:GET path:/api`) is out of v1 scope. The search applies case-insensitive contains-match across both URL path and HTTP method label simultaneously — typing `ge` matches both `GET` method rows and any rows with `ge` in the path.

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
| `bi-eye` | "View detail" | Always — provides a direct keyboard-accessible Tab + Enter path to row detail, complementing the click-anywhere-on-row interaction |
| `bi-lightning-charge` (brand color — `{colors.brand}`) | "Save as Mock" | Proxied rows only |

### Proxy counter
A pill widget in the page header (right side, before Record/Clear buttons):
- Format: `[bi-arrow-repeat icon] Proxied: N` where N = total proxied-to-external request count in the full unfiltered log. The count and popover always reflect the unfiltered log total — they do **not** update when search, service, or type filters are applied.
- Click → popover anchored below-left of the pill, max-width 240px, `{rounded.card}`, elevation level 2. Content: list of service display names with their individual proxied counts (e.g. "Finance API — 14"). Services with 0 proxied requests are omitted. **Empty state:** if all services have 0 proxied requests (e.g. after log clear), the popover shows `bi-arrow-repeat` (24px, muted) + "No proxied requests recorded." Dismiss: click outside, Esc, or second click on the pill.
- If any proxied row has a 5xx status, the count number renders in error color (`#ef4444`). This error color **reverts to default** when the activity log is cleared (Clear button) or when no 5xx proxied rows exist in the **full unfiltered log**.
- **ARIA:** `role="button"`, `aria-label="Proxied request count — {N} total"` (updated dynamically as count changes; `aria-live="polite"` on the element so count changes are announced without interrupting the user), `aria-expanded` reflects popover open state.

### Record mode
- "● Record" button in page header; click starts recording. Label changes to "⏹ Stop".
- While recording: persistent amber "● Recording" badge visible in page header
- Clicking "⏹ Stop" ends recording, returns the button label to "● Record", and immediately hides the Recording badge (no animation).
- **Recording on other screens:** recording continues across all screens. When active and the user navigates away from the Network Activity screen, a persistent amber pill indicator appears in the top bar (between the brand logo area and the About icon) as a cross-screen recording reminder. Clicking the indicator navigates back to the Network Activity screen. **ARIA:** `role="button"`, `aria-label="Recording active — return to Network Activity"`; keyboard: `Enter` and `Space` navigate to `/activity`. The indicator does not appear on `/login` or `/setup` screens — recording cannot be active on auth screens.
- **Connection loss during Record mode:** if the WebSocket/SSE connection drops while recording, the "● Recording" badge changes to an amber warning: "⚠ Recording paused — connection lost" (the `●` dot is replaced by `bi-exclamation-triangle` per DESIGN.md Recording badge connection-loss variant). Proxied requests that arrived before the drop are retained in the log; requests during the gap are lost (no server-side buffering). When the connection is restored, recording resumes automatically and the badge returns to "● Recording." A System Events info entry is written for both the disconnection and the reconnection, and the reconnection entry includes: "Requests received during the {N} seconds gap may not have been captured."
- A `bi-arrow-clockwise` **refresh icon** beside the page title acts as a manual refresh trigger when auto-refresh is disabled. While the triggered fetch is in progress, the icon rotates (`animation: spin 1s linear infinite`) and is non-interactive (pointer-events: none) until the fetch completes. When `prefers-reduced-motion` is active, the icon does not rotate — a static icon is shown instead.
- **Clear log button** (`activity-btn-clear-log`) in the page header: removes all in-memory request rows from the current log view for all services. No confirmation required — log rows are transient (no disk writes) and easily re-generated by repeating the same requests. The table shows the empty state immediately. The proxy counter pill resets to 0. Rows are not recoverable after clearing — if Record mode is active, it remains active and continues capturing new rows from zero.

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
- **"Save as Mock" button** — shown only for proxied requests; opens Mock Suggestion modal
- **Close button** — always positioned on the right of the modal/drawer header

**Bottom Panel tab content:**
- **Request tab:** method, URL path, request headers, request body
- **Response tab:** HTTP status code, response headers, response body

**Modal:** centered, max-width 560px, backdrop, focus-trapped, Esc to close. Close (✕) button top-right of header.
**Right drawer:** slides from right 320px (desktop, ≥ 640px). Not available on mobile — see mobile override below. Esc to close, click outside to close. Close (✕) button top-right of header. When the right drawer is open and the user activates a different row (click or keyboard Enter), the drawer **updates in-place** to show the new row's data — it does not close and reopen.
**Bottom panel:** split-view below table, tab bar (**Request** / **Response**), close collapses panel. **Closing the bottom panel also clears the selected table row** — the panel does not reopen automatically on the next row click; the user must click a row again to open it. For proxied requests, the "Save as Mock" button is pinned at the top-right of the panel header, beside the Close button. **Button order (right-to-left):** Close (✕) rightmost, Save as Mock immediately to its left.

**Mobile override (< 640px):** the user’s row detail style preference is overridden on mobile — row detail is always displayed as a Modal, regardless of the Settings → Appearance selection. Right Drawer and Bottom Panel styles are not available below 640px. The Settings control still shows and persists the user’s saved preference; it only takes effect on ≥ 640px viewports.

### Mock Suggestion modal
Opened from the "Save as Mock" button in row detail, or directly from the `bi-lightning-charge` action in the table.

**Content:**
1. **Mapping section** — label "Mapping", shows generated WireMock.NET JSON as an editable `<textarea>` with monospace font and a lightweight syntax-highlighting overlay (e.g. Prism.js — intentionally lighter than the full CodeMirror instance used in the file editor Raw JSON tab). Auto-populated from the proxied request:
   - `Guid`: newly generated
   - `Request.Path.Matchers`: WildcardMatcher on the request path
   - `Request.Methods`: the HTTP method
   - `Response.StatusCode`: the proxied response status
   - `Response.BodyAsFile`: relative path `../responses/{method}_{path}_{status}_body.json` (where `{status}` is the proxied response status code, used as the auto-generated variant)
   - `Response.UseTransformer: true`

   **Generated JSON skeleton example:**
   ```json
   {
     "Guid": "<newly-generated-uuid>",
     "Request": {
       "Path": {
         "Matchers": [
           { "Name": "WildcardMatcher", "Pattern": "/api/v1/example/**" }
         ]
       },
       "Methods": [ "POST" ]
     },
     "Response": {
       "StatusCode": 500,
       "BodyAsFile": "../responses/post_api_v1_example_500_body.json",
       "UseTransformer": true
     }
   }
   ```
   > `BodyAsFile` is resolved relative to the **directory containing the mapping file** (i.e., `../responses/` from `mappings/` navigates up one level to the service root, then into `responses/`). This is WireMock.NET’s file-relative resolution mode. Re-verify on WireMock.NET major version upgrades.

2. **Response Body section** — label "Response Body — `{filename}`", shows the proxied response body (editable). Filename follows the `{method}_{path}_{status}_body.json` convention, where `{status}` is the proxied response status code.

Both blocks are editable before saving.

**Footer actions:** `Save` (writes mapping + response files to disk, closes modal, **also closes the originating row detail modal or drawer if open**, updates folder tree) and `Close`.

**Use Transformer:** the Mock Suggestion modal defaults `Response.UseTransformer: true` for compatibility with `BodyAsFile` response serving. Users who do not use WireMock.NET response templating may uncheck this before saving — doing so reduces server-side overhead for simple static responses.

**Filename advisory:** if the user changes `Response.StatusCode` in the Mapping section to a value different from the proxied status code used in the auto-generated filename, a non-blocking inline note appears below the footer actions: “Filename reflects the original proxied status (`{status}`). Consider renaming after saving if the response status has changed.” Informational only — does not block saving.

## Service cards & grid
- Default: 3-col grid (≥ 1024px) → 2-col (640–1023px) → 1-col (< 640px)
- Toggle to table view: persisted per session
- Each card: name, description, port badge, **External URL** (monospace, truncated with full value in tooltip), **Mocks Root** path (`/mocks/{service-slug}`, monospace), **mock file count** (mapping + response files combined, displayed as `bi-file-earmark N file` when N = 1, `bi-file-earmark N files` otherwise; shows `0 files` when N = 0 — never hidden — uses `bi-file-earmark` not `bi-file-earmark-code` to avoid implying it is a nav link to Mappings), status pill (Live/Stopped), enable/disable toggle, action links: **Edit** and **View mappings**
- Clicking the card name or description area has no action — only the explicit **Edit** link opens the Edit modal.
- Toggle enable/disable: immediate optimistic UI update; rollback with error toast on failure — **exception to the default write pattern**: all other write operations wait for server confirmation before updating UI; this toggle is the explicit exception because the state is visually cheap to revert and the operation is non-destructive. **During the optimistic update window** (after toggle click, before server confirmation), the Status pill retains its previous state — only the toggle position updates optimistically; the Status pill updates when the server confirms.
- Status pill always shows dot + text (never dot alone)
- Stopped service cards: `{components.service-card-stopped-opacity}` opacity

**Port assignment:** all services occupy ports in the range **30100–30199**. When adding a service, the next available port is pre-filled and editable. The range supports up to 100 services. This is an intentional v1 constraint — the range is not user-configurable in v1 (see port exhaustion states below and in `DESIGN.md`).

> **v1 scope note:** service deletion is not implemented in v1. If the port range becomes exhausted, there is no in-app path to free a port — the user must update the container configuration directly. Service deletion (with confirmation dialog) is targeted for v2. Until then, the port exhaustion banner message should not instruct users to “remove a service.”

**"External URL" naming:** the field was previously labelled "Upstream URL". It is now consistently **"External URL"** everywhere — cards, table, Add/Edit modal, form labels.

**Mocks Root (display only):** shown as `/mocks/{service-slug}` — not the full `/mappings` or `/responses` sub-path. The full paths appear as read-only fields in the Add/Edit modal.

**Add Service modal fields:**
- Service Name (text, required; max 64 characters (inline error on blur: "Service name must be 64 characters or fewer."); any printable characters excluding emojis (inline error on blur: "Service name must not contain emoji characters."); the generated slug must produce at least 2 characters after slugification — inline error: "Service name is too short to generate a valid identifier."; must produce a unique slug — if the generated slug collides with an existing service, inline error: "A service with this name already exists."; validated on blur and on submit)
- Port (number, pre-filled with next available in 30100–30199, editable; port collision validated on blur: "Port {N} is already in use by {service-name}."; re-validated on submit)
- Description (text, optional; max 200 characters; displayed on the service card as a single line with `text-overflow: ellipsis`)
- External URL (text, client-side blur validation: must be a valid URL beginning with `http://` or `https://`; inline error on blur if invalid: “External URL must start with http:// or https://”. Note: `ws://` and `wss://` WebSocket upstream URLs are not accepted in v1 — WebSocket proxying is out of v1 scope.)
- Mocks Root Folder — read-only, auto-generated: `/mocks/{service-slug}`
- Mappings Path — read-only, auto-generated: `/mocks/{service-slug}/mappings`
- Responses Path — read-only, auto-generated: `/mocks/{service-slug}/responses`

New services are created in **Live** state — the mock server starts listening on the assigned port immediately after the modal closes. If the server cannot bind the port (e.g. already in use by a non-Fishtank process), a Warning System Event is written: "Service `{name}` failed to start — port {N} is already in use. Check for port conflicts on the host."

The three path fields update on a 200ms debounce after the last keystroke in the Service Name field. They are never editable directly.

**Edit Service modal:** opens when clicking “Edit” on a service card or the `bi-pencil` action in the services table view. Fields are identical to Add Service (Name, Port, Description, External URL) with current values pre-filled. The three read-only path fields update on a 200ms debounce after the last keystroke in the Service Name field — identical to Add Service behavior. **Renaming a service changes its slug**, which changes the Mocks Root path. If the service has existing files on disk, an inline warning is shown in the modal before saving: “Renaming this service will change its Mocks Root path from `/mocks/{old-slug}/` to `/mocks/{new-slug}/`. Existing mapping and response files will **not** be moved automatically — you must rename the directory on disk and run Resync to reload. If running in Docker: `docker exec {container} mv /mocks/{old-slug} /mocks/{new-slug}`, then run Resync.” The save proceeds regardless; the user is responsible for migrating files on disk. Port validation is identical to Add Service (30100–30199, must not collide with another service’s port — if a collision is detected, inline error: “Port {N} is already in use by {service-name}.”). **Slug uniqueness** is also validated identically to Add Service — if the new name produces a slug already used by a **different** service, inline error: “A service with this name already exists.” (Editing a service’s own name without changing its slug is not an error.)

**Services table view:** toggled by the table-view button in the page header (`services-btn-table-view`); state persisted per session. The same service data renders as a sortable table with the following columns:

| Column | Notes |
|---|---|
| Name | Service display name (bold) + description (muted, second line) |
| Port | Port badge (monospace pill) |
| External URL | Monospace, truncated; full value on hover tooltip |
| Mock Count | Total mapping + response files combined |
| Status | Status pill (Live / Stopped) |
| Enabled | Enable/disable toggle showing the service’s current on/off state — same optimistic behavior and rollback rules as card toggle |
| Actions | `bi-pencil` (`aria-label="Edit"`, tooltip: "Edit") + `bi-folder2-open` (`aria-label="View mappings"`, tooltip: "View mappings") — icon-only buttons; `aria-label` is required since there is no visible text label |

> **Description in the Name column:** rendered as a second line in muted text below the service display name. Single line, `text-overflow: ellipsis`, `overflow: hidden`, `white-space: nowrap`, max-width = column width. Full description text shown on hover tooltip.

- **Default sort order on initial page load:** Name ascending (alphabetical). Column sorting: Name, Port, Mock Count, Status columns are sortable. External URL is not sortable — URLs are not semantically orderable in a useful way. Enabled is not sortable — toggle state is an ephemeral operational value, not a meaningful sort dimension. **Status column sort semantics:** ascending = Live rows first, then Stopped; descending = Stopped rows first, then Live. Click cycles: unsorted → ascending → descending. One column sorted at a time.
- Stopped service rows: `{components.service-card-stopped-opacity}` opacity (matches card behavior).
- Empty state: same as card grid — `bi-server` (48px, muted) + “No services yet” heading + “Add your first service.” body text + primary **Add Service** button.
> **Note:** the Description field is not shown as a column in the services table view in v1 — it is visible only in card view. Consider adding as an optional hidden column in a future release.
## Mappings — file explorer

**Layout:**
```
┌─ Toolbar: [+ New Mapping] [+ New Response] [↺ Resync] ─────────────────────────┐
├─ Folder tree (240px) ───────┬─ File editor (flex-1) ──────────────────────────┤
│ 📁 Finance API              │  /mocks/finance-api/mappings/acct-get-200.json   │
│  ├ 📁 mappings/             │  ┌─ Tabs: [Form] [Raw JSON] ─────────────────┐   │
│  │  ├ 📄 acct-get-200.json  │  │ Form / Raw editor content                 │   │
│  │  └ 📄 acct-post-201.json●│  └───────────────────────────────────────────┘   │
│  └ 📁 responses/            │  [Duplicate] [Rename] [Delete]  [Discard*] [Save*]    │
│ 📁 Social Security          │                                                   │
│  ├ 📁 mappings/             │  ● = unsaved indicator (italic + dot in tree)    │
│  └ 📁 responses/            │  * = enabled only per save/discard rules         │
└─────────────────────────────┴───────────────────────────────────────────────────┘
```

If no service folder is active when the user clicks **+ New Mapping** or **+ New Response**, a service-selection dropdown appears before the naming modal to establish which service's sub-folder will receive the new file.

**Resync behavior:** triggers a server-side reload of all mapping and response files from disk for all services, then refreshes the folder tree. While in progress: the Resync button shows a spinner and is disabled; an info toast appears — “Resyncing mappings…” — that persists until Resync completes (no auto-dismiss while in progress). On completion: the in-progress toast is dismissed, and a new success toast appears — “M mappings, R responses loaded in {duration}.” (The separate N-total file count is omitted — N=M+R, so stating it alongside M and R is redundant.) **Zero-value case:** if both M and R are 0, the toast reads “0 files loaded in {duration} — check your Mocks Root path and volume configuration.” instead. (duration format: values < 10 000ms display as `{N}ms`; ≥ 10 000ms display as `{N}s` (floor — truncate to nearest whole second); ≥ 60 000ms display as `{N}m {N}s` — matching the `ms` column format rule in Network Activity) — auto-dismissed after 4s.

**On Resync failure:** the spinner stops, the Resync button re-enables, and an error toast appears: “Resync failed — {reason}. Try again.” The folder tree retains its previous state.

**On partial Resync (some files load, others fail):** if the server loads some files successfully but others fail to parse (e.g. invalid JSON), the operation is treated as a partial success: the success toast fires with the count of files that loaded (“M mappings, R responses loaded in {duration}.”); a separate error toast appears for each failed file — “Failed to load `{filename}` — {reason}.” The folder tree reflects only the files that loaded successfully.


On Resync completion, the server returns the last-modified timestamp for every file. If the currently open file:
- **Was deleted externally:** the editor shows an inline error banner: "File no longer exists on disk." with a **Close** button that clears the editor pane.
- **Was modified externally AND has unsaved local changes:** the editor shows an inline warning banner: "This file was modified on disk since you started editing. Your unsaved changes may conflict — review before saving. [View disk version] [Keep my edits]" — clicking “View disk version” shows a secondary confirmation — “Discard unsaved changes in `{filename}` and reload the disk version? This cannot be undone.” Actions: **Cancel** (returns to the banner) and **Reload from disk** (discards local edits and reloads the file from disk). Clicking “Keep my edits” dismisses the banner and leaves the editor buffer unchanged.
- **Was modified externally with no local changes:** the editor silently reloads to the new disk version.

Unsaved changes are never silently discarded by Resync. The unsaved indicator (●) remains whenever local changes are present. Resync only affects the folder tree and server state, not the editor buffer, unless the user explicitly chooses to reload. The editor remains interactive during Resync — the Resync spinner does not block editor interaction. Resync banners appear after Resync completes, not during.

**Resync and save concurrency:** if a file save and a Resync complete within the same request window (the save acknowledgment arrives after the Resync last-modified check), the save acknowledgment takes precedence — the file is treated as the user's current version and the 'modified externally' conflict banner does not appear for that file.

**Folder tree behavior:**
- Nodes: volume root (path label) → service folders (display name, real path in tooltip) → `mappings/` + `responses/` sub-folders → individual `.json` files. **Root node label:** displays the currently configured Mocks Root path value (e.g. `/mocks`) — not a hardcoded string. The root node label updates when the Mocks Root path is changed in Settings (takes effect after services are restarted and a Resync is run).
- Expand/collapse: click folder node or arrow key
- Select file: click → loads content in editor pane; active file highlighted with brand left-border
- Keyboard navigation: ↑↓ move focus, → expand, ← collapse (← on an already-collapsed node moves focus to its parent folder node — standard ARIA tree navigation), Enter open
- **Context menu (right-click / long-press, file nodes only):** **Rename**, **Duplicate** (copies the file to the same sub-folder), **Delete**. Folder nodes have no context menu. "Duplicate" opens the same naming modal as the editor footer Duplicate button.

**File actions:**
- **View:** single click on file node loads read-only preview. **In read-only preview state, the editor background uses a subtle `{colors.content-surface}` tint. Both Form and Raw JSON tabs are accessible in read-only state — the tint applies to the active tab’s editor area. The first keystroke in either tab clears the tint and activates edit mode.** While the file is loading, the editor pane shows a single-line skeleton placeholder (file loads in < 100ms for typical mapping files — no spinner is needed)
- **Edit:** any keystroke in editor activates edit mode; the filename node in the folder tree shows a `●` dot (italic style) as an unsaved indicator
- **Save:** enabled only when the file is **newly created** (not yet persisted to disk) or has **unsaved changes**. Disabled for clean existing files. Writes immediately to filesystem; confirms success or shows error — no optimistic update.
- **Discard:** enabled only for **existing files with unsaved changes**. Disabled for new (unsaved) files and for clean files. Reverts to last saved state after confirmation. Confirmation dialog — title: "Discard changes?"; body: "Revert `{filename}` to its last saved version? Unsaved changes will be lost."; actions: **Cancel** and **Discard changes**.
- **Delete:** confirmation dialog (title: "Delete file?"; body: "Delete `{filename}` from disk? This cannot be undone."; actions: **Cancel** and **Delete**) → delete → file removed from tree
- **New Mapping:** "+ New Mapping" button → naming modal (user types the base name only — `.json` is auto-appended; the modal shows a preview of the full filename) → creates a file pre-populated with a minimal WireMock.NET skeleton (newly generated `Guid`, placeholder `WildcardMatcher` on `/**`, `Response.StatusCode: 200`, no body) in `mappings/` sub-folder → opens in editor with Save enabled. **Advisory:** the `/**` WildcardMatcher skeleton matches all requests to the service (valid for WireMock.NET ≥ 4.x — re-verify on major version upgrades); an inline note appears in the editor: "This URL pattern matches all requests — refine `Request.Path.Matchers` before saving to production."
- **New Response:** "+ New Response" button → naming modal (user types the base name only — `.json` is auto-appended; the modal shows a preview of the full filename) → creates a file with default content `{}` (empty JSON object) in `responses/` sub-folder → opens in editor with Save enabled. For non-JSON responses, clear the default content before saving. These are **always separate buttons** — never merged into a single "+ New File" action.
- **File name collision:** if the name entered in the naming modal matches an existing file in the same sub-folder, an inline validation error is shown on the filename input: "A file with this name already exists in this folder." Save is blocked until the name is changed. This applies to both the naming modal (New Mapping / New Response / Duplicate) and the Mock Suggestion modal auto-generated filename — if the generated name collides, a rename prompt is shown before saving (the rename prompt is the standard naming modal, pre-populated with the auto-generated filename; the user edits it and confirms before the save proceeds). **The system never auto-increments filenames** (e.g. does not generate `_500_2.json`) — the user must always manually enter a unique name. This prevents silent overwrites and maintains predictable naming.
- **File name OS-character validation:** the filename input rejects names containing OS-reserved characters: `/`, `\`, `:`, `*`, `?`, `"`, `<`, `>`, `|`. Inline error on blur: "Filename contains an invalid character. Remove all occurrences of: / \ : * ? \" < > |". Save is blocked until all invalid characters are removed. This validation applies to all filename entry points (New Mapping, New Response, Duplicate, Rename — both the editor actions bar and the context menu).
- **Copy from existing:** "Duplicate" button in editor footer → modal: source filename pre-filled with `_copy` appended to the base name (the `.json` extension is stripped before appending `_copy` — e.g. source `get_account_happy-path.json` → pre-filled base `get_account_happy-path_copy`; the modal auto-appends `.json` so the preview shows `get_account_happy-path_copy.json`), user confirms or edits → copies file to same sub-folder → opens copy in editor in edit mode
- **Rename:** available via context menu (right-click / long-press on a file node in the tree) and via a **Rename** button in the editor actions bar (`[Duplicate] [Rename] [Delete] [Discard*] [Save*]`) when a file is open. A modal opens with the current filename pre-filled in an editable input. Validation: must be unique in its sub-folder (same inline error as new-file collision), must end in `.json`, must not be empty. On confirm: file is renamed on disk, folder tree node updates, and the editor breadcrumb updates if that file is currently open. **The breadcrumb is informational only — no click interaction.** It updates when a different file is selected or when a file is renamed. **If the file being renamed is a response file** referenced by a `BodyAsFile` field in a mapping, a warning banner is shown after saving: “This file is referenced as `BodyAsFile` in one or more mappings. Update those mappings manually to use the new filename.” No automatic reference update occurs.
**Network Activity → Mappings:** when “Save” is triggered in the Mock Suggestion modal, the mapping file is written to `mappings/` and the response file to `responses/`; the folder tree re-fetch is **scheduled** — it runs the next time the user navigates to the Mappings screen, not immediately from the Network Activity screen. The re-fetch is **blocking** — the Mappings screen renders the folder tree skeleton loader while the fetch is in flight, then renders the updated tree; the user does not see a flash of the stale tree state.

**File naming conventions:**
- Mapping files: `{method-lowercase}_{path-slugified}_{variant}.json` — `{variant}` is either a scenario descriptor for manually created files (e.g. `happy-path`, `not-found`, `server-error`, `unauthorized`) or the HTTP status code as a string (e.g. `500`) for auto-generated files from Mock Suggestion. Example manual: `get_account_happy-path.json`. Example auto-generated: `post_api_finance_transfer_500.json`.
- Response files: `{method-lowercase}_{path-slugified}_{variant}_body.json` — example manual: `get_account_happy-path_body.json`. Example auto-generated: `post_api_finance_transfer_500_body.json`.
- The `_body` suffix on response files is required — it matches the `BodyAsFile` relative reference in the corresponding mapping (`../responses/{method}_{path}_{variant}_body.json`)

**Path slugification rule:** strip query strings (everything from `?` onward) before slugification. Then: strip query strings (everything from `?` onward) before slugification. Then: replace `/` with `_`, strip leading `_`, replace path parameters (`{id}`, `:id`, `{id:type}` [strip `:type` suffix], `<id>`) with the literal string `param`; replace wildcard segments `*` with `wildcard`; replace `**` with `doublestar`; collapse consecutive `_` to single `_`, lowercase all. Example: `/api/v1/users/{id}/orders` → `api_v1_users_param_orders`.

**Duplicate GUID detection:** the system checks for duplicate `Guid` values at two points:

1. **Pre-save inline check (client-side):** before writing a mapping file to disk, the editor verifies the current `Guid` value against all known loaded mapping GUIDs. If a collision is detected, the **save is blocked** with an inline editor error: "This GUID is already used by `{filename}` in `{service}`. Edit the `Guid` field (Raw JSON tab) to use a unique value before saving." The file is not written until the collision is resolved. If any service has no loaded mappings (e.g. it is stopped), a caveat is appended: "GUIDs in unloaded services were not checked."

2. **Post-load server check (on startup, Resync, and after each file save):** the server checks all loaded mappings across all services. If a duplicate is found, a **Warning** System Event is written: "Duplicate mapping GUID `{guid}` found in `{service-name}` — `{filename1}` and `{filename2}`. The second mapping loaded will shadow the first." This acts as a safety net for GUIDs introduced outside the UI (e.g. manual file edits). No automatic resolution occurs — the user must manually edit one of the files to assign a unique GUID.

**Editor — Form tab:**
Fields: Method (select), URL Pattern (text, monospace), Response Status (quick-pick buttons: 200 / 201 / 204 / 400 / 401 / 403 / 500; custom codes may be typed directly in the accompanying number input; the number input accepts integers 100–599 only — inline error on blur if out of range: “Status code must be between 100 and 599.”), Response Body (textarea, monospace), Content-Type (text), Priority (number), Response Delay ms (number), Header Filter (optional, monospace — maps to `Request.Headers` matcher array), Body Matcher (optional, monospace — maps to `Request.Body.Matcher`), Use Transformer (toggle). All fields map 1:1 to WireMock.NET JSON mapping structure.

**Editor — Raw JSON tab:**
Syntax-highlighted code editor (e.g. CodeMirror) — not a plain `<textarea>`. The editor is fully editable with JSON validation on save (surface parse error inline, block save). **"Copy JSON"** button (copies raw content to clipboard). Monospace font `{typography.mono}`. Line numbers are displayed.

**Switching from Raw JSON to Form tab with invalid JSON:** if the Raw JSON tab contains a syntax error when the user clicks the Form tab, the Form tab shows an inline error banner: “Cannot display form — the JSON is invalid. Fix the error in the Raw JSON tab first.” The form fields are disabled until the JSON is valid.

**Navigation-away guard (unsaved changes):** when the current file has unsaved changes, a confirmation dialog — **title: "Unsaved changes"**; body: "Discard unsaved changes in `{filename}`? Unsaved changes will be lost." — is shown before any of the following:
1. Clicking a different file node in the folder tree
2. Clicking a sidebar nav item that navigates away from the Mappings screen
3. Clicking the logo link in the top bar (navigates to `/services`)
4. Browser tab close or page refresh (`beforeunload` event — browser-native prompt; browsers restrict custom `beforeunload` messages, so this case produces a generic browser dialog rather than the custom confirmation used for cases 1–3. This is expected and intentional.)

Expanding or collapsing a folder node in the tree does **not** trigger the guard. The guard applies only when an actual file selection change or full navigation event would discard the current editor buffer.

## System Events screen
Two tabs: **Warnings & Errors** | **Info**. Tab headers show item count badges.

**Warnings & Errors tab:** errors (red icon) and warnings (orange icon). Each item: icon + message (with inline code references for file paths, GUIDs) + timestamp + service tag (if applicable) + dismiss (✕). **Service tag format:** same as in the notification panel — a non-interactive muted text label showing the service display name, `{typography.scale.sm}`, `rgba(var(--brand-rgb), 0.12)` background, `{colors.border}` border, `{rounded.md}`. Omitted when no service is associated. "Mark all read" and "Clear all" in page header.

**Info tab:** success events (Mock saved, Resync completed) and operational info (Record mode enabled, container startup, service restarts). Same item structure. Bootstrap Icons: success → `bi-check-circle-fill` (`{colors.success}`); operational/Resync → `bi-arrow-repeat` (`{colors.info}`); container startup → `bi-rocket-takeoff` (`{colors.brand}`). Each icon carries an `aria-label` matching its event type.

**Deep-link behavior:** when the URL includes `?id={event-id}` (e.g. from a notification panel item link), the matching System Events entry is scrolled into view and highlighted with a 1-second amber background fade (`animation: amber-highlight 1s ease-out forwards`). Under `prefers-reduced-motion`, the animation is suppressed but the item is still scrolled into view.

Both tabs: flat list, newest first, no sub-grouping by type. A **"Load more" button** at the bottom of each list loads 20 additional items per click — same pattern as the notification panel. Infinite scroll (auto-load on scroll) is not used: it is not keyboard-operable. The button is hidden once all items are loaded. **Tab count badges show the total event count** (all items in the tab), not just unread items — this contrasts with the notification bell badge which counts only unread warnings and errors.

**"Mark all read"** (Warnings & Errors tab header): marks **all** server-side unread warnings and errors as read, including items not yet loaded via “Load more” — identical scope to the bell panel “Mark all read”. Badge resets to zero immediately.

**"Clear all"** (each tab has its own button; the page header shows **only the action buttons for the currently active tab** — Warnings & Errors tab: shows "Mark all read" + "Clear all"; Info tab: shows "Clear all" only): removes all events from the **server-side event log** for that tab — this is a permanent, irreversible, server-side operation, not a view-only action. A confirmation dialog is required before execution. **Warnings & Errors tab:** “Clear all Warnings & Errors events? This cannot be undone.” **Info tab:** “Clear all Info events? This cannot be undone.” Actions (both): **Cancel** and **Clear all**. Events previously dismissed from the notification bell are also cleared. **Clearing Warnings & Errors events also resets the notification badge count to zero for those cleared events immediately.** If new events are generated after clearing (e.g. a service restarts), they appear in System Events as fresh items and in the notification bell as new unread notifications.

**If the notification bell panel is open when Warnings & Errors events are cleared:** the panel does not auto-refresh — it retains its currently-loaded items until the user closes and reopens it, at which point the updated (empty or reduced) state is shown.

> **Server-side event retention:** the server retains a maximum of 1000 System Events total (across both tabs). Oldest events are pruned automatically when the cap is exceeded. This cap is not user-configurable in v1.

**Relationship to notification bell:** the bell panel is a filtered view of warnings+errors only. The System Events screen is the full log — a footer note in the bell panel always links here.

**Per-item dismiss (✕):** dismissing an item in System Events removes it from the current view only — the server-side event log is unchanged and the event reappears on page reload. The dismiss (✕) button carries `aria-label="Remove from view"` and a tooltip: “Removes from this view — event remains in the server log and reappears on reload.” Use "Clear all" to permanently remove events from the server log.

## Settings screen
Sub-navigation: **Appearance / Network Activity / Paths / Cache / Auth & Users / Feature Flags**.

**Minimum settings content width:** 280px. If the combined sidebar (expanded 200px) + sub-nav (170px) width would reduce the settings content area below 280px, the main sidebar auto-collapses to its 52px icon-only state to recover space.

**Appearance section:**
- Theme: 4 swatch buttons (split-circle showing sidebar + accent color); selected swatch has brand ring
- Row detail style: segmented button group (Modal / Right Drawer / Bottom Panel)
- **Sidebar default state:** select (Expanded / Collapsed). Defines the initial sidebar state on first visit or after localStorage is cleared — applies at the **Desktop breakpoint (≥ 1024px) only**; at Mid and Mobile breakpoints the sidebar follows the canonical breakpoint visibility rules in DESIGN.md regardless of this setting. **Resolution order:** (1) localStorage value, if present; (2) this sidebar default state setting; (3) hardcoded default = Expanded. The localStorage value is checked on every page load — including new tabs in the same browser session. When the user has manually toggled the sidebar (state persisted in localStorage), the localStorage value takes precedence over this setting on all subsequent loads.

**Network Activity section:**
- Auto-refresh interval: select (1s / 2s / 5s / Disabled)
- Max log entries per service: select (500 / 1000 / 5000). When the per-service limit is reached, the oldest entries are dropped as new ones arrive (circular buffer). No warning is shown when the limit is approached or exceeded.
- Sensitive header redaction: toggle (on by default). When on, the following headers are redacted in row detail views: `Authorization`, `Cookie`, `Set-Cookie`, `X-Api-Key`, `X-Auth-Token`, and any header whose name contains the substring `secret` or `token` (case-insensitive). Redacted values display as `[REDACTED]`.

**Paths section:** Mocks Root path — single text input showing the current configured path. **No-op save:** if the submitted value is identical to the current configured path, the save is a no-op — no confirmation dialog, no server call, no toast. The Save button reverts to disabled state. Before applying a change (when the submitted value differs from the current path):
- Client-side format validation on blur: the path must begin with `/` and must not be empty. Inline error: “Mocks Root path must be an absolute path starting with /.”
- A destructive confirmation dialog must be shown: "Changing the Mocks Root path will update where all services look for their files. Existing files at the old path will not be moved automatically. This may break all active mappings if the new path does not contain the expected folder structure. Continue?"
- The new path is validated server-side for existence and write permission before saving. After the user confirms the destructive dialog, the Save button shows a spinner and is disabled while server-side validation runs; the path input is read-only during validation. If the path does not exist or is not writable, an inline error is shown: "Path not found or not writable — check the container volume configuration."
- On success, a toast confirms: "Mocks Root updated to `{new-path}`."
- There is no automatic migration or rollback — the user is responsible for ensuring the new path contains the correct folder structure.
- **Running service behavior:** services that are currently Live continue to serve mappings from the **old path** until they are restarted. A persistent info toast is shown after a successful path change: "Mocks Root updated. Restart services to apply the new path." Services must be manually stopped and re-enabled from the Services screen to pick up the new path. No automatic restart occurs.
- **Mocks Root + Resync:** Resync reads from the path currently used by running services (the old path) until services are restarted. After updating the Mocks Root and restarting services, run Resync again to reload files from the new path.
**Cache section:**
- "Clear all caches" row: description + `Clear All` button → confirmation dialog (title: "Clear all caches?"; body: "Clear all service caches? Cached mappings will be cleared for all services and reloaded from disk on the next request. This cannot be undone."; actions: **Cancel** and **Clear all caches**) → clears all in-memory cached mappings and responses
- Named caches list: each service cache shown as a row with name, entry count, estimated size, and individual `Clear` button → confirmation dialog (“Clear cache for {service-name}? Cached mappings will be cleared and reloaded from disk on the next request.” Actions: **Cancel** and **Clear cache**)

If no services are configured, the named caches list shows an empty state: `bi-database` (32px, muted) + “No service caches yet.” + “Caches appear here once services are created and receive requests.”

> **Auth & Users — not in v1 scope.** See DESIGN.md Settings layout for the canonical placeholder visual spec and the v2 removal gate.

**Feature Flags section:** **Record Mode enabled** toggle (enables/disables the Record Mode feature globally — when off, the Record button is hidden from the Network Activity page header), **Pipeline Reset API** toggle (enables the `POST /admin/reset` HTTP endpoint on the Fishtank server, allowing clients to trigger a full in-memory state reset equivalent to a service restart without a container restart; disabled by default — enable only in controlled environments. **API contract:** requires valid session cookie; returns `204 No Content`; no request body; idempotent. **v1 limitation:** CI/CD pipelines must first authenticate via `POST /login` to obtain a session cookie before calling this endpoint — a dedicated API-key authentication mode is v2 scope.). **If Record Mode is active when the feature flag is toggled off**, recording stops immediately: the Recording badge is hidden, the activity log retains all rows captured so far, and a warning toast appears: "Record Mode was disabled. Recording stopped."

**Pipeline Reset API + active recording:** if the Pipeline Reset API endpoint is called while Record Mode is active, recording stops immediately as part of the reset. The Recording badge is hidden, captured rows are retained in the log, and a warning toast appears: "Pipeline reset triggered. Recording stopped."

## Login screen
Centered card on plain background (sidebar hidden). Fields: username (`autocomplete="username"`), password (`autocomplete="current-password"`). Primary CTA: "Sign in". **On submit:** CTA shows a spinner + disabled state until the server responds. No "forgot password" (self-hosted; admin resets by setting `FISHTANK_ADMIN_PASSWORD_RESET='{new-bcrypt-hash}'` as a container environment variable and restarting — the system replaces the stored hash on startup). Shows Fishtank logo + version. **Logo gate:** the logo on the login card uses the same placeholder (`bi-droplet-half`) subject to the hard v1 release gate in DESIGN.md Brand & Style — the final custom SVG must be in place before this screen ships. Both fields: `aria-required="true"`. Error on failed login: inline message below the form — "Invalid username or password." Never indicate which field is wrong (prevents username enumeration). On network-level failure (request timeout, server unreachable, 5xx response): inline message — "Unable to connect — check your network and try again." (No enumeration risk — this error carries no field-specific information.) **Rate limiting and account lockout are out of v1 scope** — this is a developer tool deployed on trusted internal networks. **PRD Non-Goal:** “Fishtank v1 does not implement login rate limiting or account lockout — restricted to trusted internal networks.”

## First-run setup screen
Shown when no admin account exists. Single step: choose admin username + password + confirm password. CTA: "Create admin account". **On submit:** CTA shows a spinner + disabled state until the server responds. After successful submit: redirects to `/services`.

**Maximum admin accounts:** Fishtank v1 supports exactly one admin account. Multi-user management is v2 scope.

**Password reset:** admin sets the `FISHTANK_ADMIN_PASSWORD_RESET='{new-bcrypt-hash}'` container environment variable and restarts the container. The system replaces the stored hash on startup and removes the env var from the runtime configuration.

**Guard:** if an admin account already exists, accessing `/setup` redirects immediately to `/login`. No setup form is rendered.

**Field validation** (applies when no admin account exists and the setup form is rendered):
- Username: required, 3–32 characters, alphanumeric + hyphens + underscores only. Inline error on blur: “Username must be 3–32 characters (letters, numbers, hyphens, underscores).”
- Password: required, minimum 12 characters (`autocomplete="new-password"`). Inline error: “Password must be at least 12 characters.” No complexity rules beyond length.
- Confirm password: must match password (`autocomplete="off"` on the confirm field — using `new-password` on both fields allows password managers to silently fill both, masking a mismatch; client-side match validation still runs on blur). Inline error on blur: "Passwords do not match."
- All validation re-runs on submit before the request is sent.
- On server error during account creation, an inline error is shown below the form: "Account creation failed — {reason}. Try again." The form remains active. Possible `{reason}` values from the server: “Username already exists”; “Username format invalid”; “Server error — check container logs.” These are the only reason codes surfaced in v1. **On network-level failure** (request timeout, server unreachable, 5xx not matching a known reason code): the CTA re-enables and an inline error appears below the form — “Unable to create account — check your network and try again.”
---

# State Patterns

**Default write pattern:** all write operations wait for server confirmation before updating UI state. Optimistic updates are the explicit exception, noted at the component level where they apply.

| State | Pattern |
|---|---|
| Loading (initial data fetch) | Skeleton loaders — table rows show grey shimmer bars; card grid shows ghost cards |
| Loading (action in progress) | Button shows spinner + disabled; label unchanged |
| Empty state | Illustration-free — concise message + primary action (e.g. "No services yet. Add your first service.") |
| Error (data fetch failed) | Inline error banner in content area with retry button; does not block navigation |
| Success (save / create) | Brief toast notification bottom-right, auto-dismiss 4s: "Mapping saved." |
| Success (destructive undo window) | Not provided — file deletes are confirmed before execution, no undo |
| File unsaved changes | Dot indicator (●) appended to the filename in the folder tree node (italic style) + "Unsaved changes" label in the editor breadcrumb; navigation away prompts confirmation |
| Service stopped | Card renders at `{components.service-card-stopped-opacity}` opacity (see DESIGN.md service card visual spec); toggle shows off state; status pill shows "Stopped" |
| Record mode active | Network Activity **page header** shows persistent “● Recording” badge in warning/amber color; **Record button** shows active state (label: “⏹ Stop”). Cross-screen recording indicator appears in the top bar when the user navigates away from Network Activity — see Record mode spec. |
| Notification bell unread | Red badge with count; animates in when new events arrive (scale pulse) |
| Backend unreachable | Persistent amber banner in top bar: "Backend unreachable — retrying…"; write operations disabled (buttons disabled, tooltip: "Offline — changes cannot be saved"); tables and cards show last-known data with a muted "Last updated N ago" suffix in the page header (`N ago` format: `< 1m ago` when under one minute; `{N}m ago` when under one hour; `{N}h ago` when one hour or more; updated every 30 seconds while unreachable); banner auto-dismisses when connection is restored and a **Success** toast (auto-dismisses after 4s) confirms "Reconnected." If any write was blocked while offline, no automatic retry occurs — users with unsaved mapping changes will still see the `●` unsaved indicator; other blocked writes (service toggles, settings changes) are lost silently and must be re-applied. **Toggle sequence:** when the backend-unreachable state is detected, all write-initiating buttons — including the enable/disable toggle — are disabled immediately; no new toggle requests are possible while the banner is visible. **Exception:** if a toggle request was already sent before the unreachable state was detected (i.e. the response arrives after the banner appears), a rollback fires immediately and an error toast appears: "Service state change failed — connection lost. Previous state restored." |
| Session expired | Full-screen session-expired overlay replaces the current page: "Your session has expired. Please sign in again." Single CTA: **Sign in** — navigates to `/login`. Triggered when any API call returns `401 Unauthorized`. Any unsaved mapping changes are lost — no guard is shown (the session is already terminated). If Record Mode is active when the 401 is received, recording stops immediately (same behavior as feature-flag-off) — the Recording badge is hidden before the session-expired overlay renders. |

---

# Interaction Primitives

**Keyboard navigation:**
- Tab / Shift+Tab: move focus between interactive elements
- Arrow keys: navigate within sidebar, tables, folder tree, segmented controls, and notification panel items (within the panel: ↑↓ move focus between items; Tab exits the panel)
- Enter / Space: activate focused element (open row detail, toggle, expand folder); both keys also open or close the notification panel when the bell button is focused
- Esc: close modal, drawer, panel, dropdown

**Focus rings:** always visible; use `ring-2 ring-offset-2 ring-{brand}` (Tailwind) — never hidden with `outline: none` without a replacement

**Hover states:** all interactive elements have a distinct hover state (background shift or border color change)

**Drag:** folder tree items are not draggable in v1. Draggable divider handle for bottom-panel split view only.

**Bottom panel keyboard resize:** when the divider handle is focused (Tab navigates to it; focus ring visible), **Up/Down arrows** resize the panel by 10px increments; **Home** snaps to minimum height (100px); **End** snaps to maximum height (60% of viewport). The divider element uses `role="separator"`, `aria-orientation="horizontal"`, `aria-valuenow` (current panel height in px), `aria-valuemin="100"`, `aria-valuemax` (60% viewport height in px), and `aria-label="Resize panel"`. Screen readers announce the updated height on each arrow-key step. `aria-valuemax` recalculates on `window.resize` and `visualViewport` change events (covers browser resizing and mobile soft keyboard appearance); if the panel’s current height exceeds the new max, the panel height is immediately clamped to the new `aria-valuemax`.

**Tooltips:** shown on hover for truncated text (paths, URLs), collapsed sidebar nav items, theme swatches, port badges. Delay: 400ms. No tooltip on touch devices (use long-press context menu instead).

**Toasts:** bottom-right, stack vertically (newest on top), max 3 visible, auto-dismiss 4s for success/info (info toasts may be pinned for in-progress operations — see DESIGN.md toast table; warning toasts may also be pinned for ongoing conditions such as connection loss during save — see DESIGN.md toast table), 6s for standard auto-dismiss warnings (errors persist until dismissed manually).

**Confirmations:** destructive actions (delete file, delete service, clear System Events log) always require a confirmation dialog — never execute on single click. **Exception:** Network Activity log clear (`activity-btn-clear-log`) requires no confirmation — log rows are transient, not written to disk, and are easily re-generated.

**Auto-refresh (Network Activity):** controlled by two independent settings. (1) **Interval** (Settings → Network Activity): sets the polling cadence (1s / 2s / 5s / Disabled). Setting to Disabled stops all automatic polling globally. (2) **LIVE/PAUSED indicator (pause toggle):** clicking the LIVE/PAUSED indicator in the page header temporarily pauses polling for the current session without changing the Settings interval; the toggle state is not persisted. Navigating away from the Network Activity screen and returning resets the indicator to LIVE — the paused state applies only to the current page visit. This includes returning via the cross-screen recording indicator in the top bar. **Default state on page load:** the indicator shows LIVE (polling runs at the configured interval). If the Settings interval is Disabled, the indicator shows PAUSED and is non-interactive — `aria-disabled="true"` is set, `cursor: not-allowed` is applied, and click/keyboard activation is suppressed. Screen readers should announce it as “Refresh paused (disabled)”. Do **not** use the HTML `disabled` attribute — use `aria-disabled` and suppress events in JavaScript so the element remains in the tab order and is discoverable. The **manual refresh icon** (`bi-arrow-clockwise`) beside the page title is visible **only when the effective refresh state is paused** — i.e. either the Settings interval is Disabled, or the LIVE/PAUSED indicator is toggled to paused. Clicking it triggers a single immediate fetch.

---

# Accessibility Floor

Behavioral requirements. Visual contrast requirements live in `DESIGN.md`.

- All interactive elements reachable and operable by keyboard alone
- Focus never trapped outside intended modal/drawer contexts
- All icons used as interactive controls have `aria-label` or associated visible label
- Status indicators (Live/Stopped, severity icons) use text alongside color — never color alone
- HTTP method chips include method text — never color alone
- Tables use `<thead>`, `<th scope="col">`, `<caption>` (visually hidden via `sr-only` — Network Activity table caption: "Request log"; Services table caption: "Configured services")
- Folder tree implemented as `role="tree"` / `role="treeitem"` with `aria-expanded`; file nodes carry `aria-selected="true"` when active or `aria-selected="false"` when not — the attribute is always present on file nodes so screen readers can report selection state reliably. Folder nodes do not carry `aria-selected`.
- Modal: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to modal title; focus trapped
- Notification badge: `aria-label="{N} unread warnings and errors"` when count ≤ 99; `aria-label="More than 99 unread warnings and errors"` when count > 99. Updated dynamically on badge change. **Note:** the bell **button** (`topbar-btn-bell`) separately carries the static `aria-label="Notifications — warnings and errors"`. Both annotations are required — the button describes its purpose; the badge describes its current count.
- Proxy counter pill: `role="button"`, `aria-label="Proxied request count — {N} total"` (updated dynamically), `aria-expanded` reflects popover open state; `aria-live="polite"` on the element so count changes are announced without interrupting the user.
- Toggle switches: `role="switch"`, `aria-checked`
- Skeleton loaders: `aria-busy="true"` on container while loading
- Error messages associated with form fields via `aria-describedby`
- WCAG AA minimum contrast for all text against its background — validated per theme (see contrast status table in `DESIGN.md`)
- **Route-change focus management:** on any client-side navigation (sidebar nav click, logo click, programmatic redirect), focus moves to the page `<h1>` element. The `<h1>` carries `tabindex="-1"` to accept programmatic focus without entering the natural tab order. This ensures keyboard and screen-reader users are immediately oriented after each screen transition.

---

# Key Flows

## Flow 1 — "The proxied request becomes a mock" (Sara, QA engineer)

Sara is running a test suite against a staging environment. A test keeps failing. She opens Fishtank — Network Activity, Finance API filter active. She spots a `POST /api/finance/transfer` returning `500` from the real upstream. The test expects a `201`. She clicks the row. The detail modal opens showing the real response body. She clicks "Save as Mock". The Mock Suggestion modal opens — pre-filled with the mapping JSON (method, path, and proxied response status auto-populated) and the raw response body. She reviews both, makes no changes, and clicks Save. The Mock Suggestion modal closes and the originating row detail modal also closes. A brief “Mock saved.” toast appears at the bottom-right of the viewport. She navigates to Mappings → Finance API → mappings/ — the new file `post_api_finance_transfer_500.json` is in the tree. She clicks it, switches to Form tab, changes the status from `500` to `201`, edits the response body, saves. Runs the test again. It passes. **Total context switches: zero.** She never left the browser.

## Flow 2 — "Adding a new service" (Marco, backend developer)

Marco is starting a new microservice that depends on a Logistics API he hasn't mocked yet. He opens Services → clicks "+ Add Service". A modal form opens: Service Name, Port (pre-filled with the next available in 30100–30199), Description, External URL — plus three read-only auto-generated path fields (Mocks Root, Mappings Path, Responses Path) that update on a 200ms debounce after the last keystroke. He fills in "Logistics API", port `30105` (pre-filled — he has four existing services already running on ports 30100–30104, so this is the next available port; he accepts the default), real external URL. Saves. The modal closes. The new service card appears in the grid — status pill shows "Live". He navigates to Mappings — the Logistics API folder is already in the tree with empty `mappings/` and `responses/` sub-folders. He clicks "+ New Mapping", names the file `get_shipment_happy-path.json`, fills in the Form fields, saves. Done in under two minutes.

## Flow 3 — "Investigating a warning before standup" (Priya, Tech Lead)

Priya opens Fishtank five minutes before standup. The System Events bell badge shows `2`. She clicks the bell — the dropdown shows two warning items: a duplicate GUID in Finance API and a malformed response in Social Security. She clicks the Social Security warning — the notification item’s message text contains a link that navigates to the System Events screen, pre-filtered to show that specific event. She is taken to System Events where the linked event is scrolled into view and briefly highlighted with a 1-second amber background fade. She sees the exact file path in the event detail message (events include inline code references for file paths and GUIDs — line numbers are not available). She copies the path, pings the QA engineer who owns that file. She clicks "Mark all read". The badge clears. Standup starts. **She needed no terminal, no grep, no curl.**

## Flow 4 — "DevOps checks service health before a deployment" (Alex, DevOps)

Alex needs to confirm all mock services are live before a deployment pipeline runs. He opens Fishtank — Services page. At a glance: 5 green "Live" pills, 1 grey "Stopped" pill on Legacy Auth. That's expected — Legacy Auth is disabled in this environment. He screenshots the grid for the deployment ticket. **One screen, ten seconds.**

## Flow 5 — "Switching to dark mode on a late-night debugging session" (Sara, same engineer, 11pm)

Sara's eyes hurt. She clicks the gear icon → Settings → Appearance. She clicks the Deep Ocean swatch. The entire app transitions instantly — sidebar goes dark navy, content area goes `#0f2233`, table rows show in muted white text. The theme is persisted to `localStorage` — next time she opens Fishtank it loads in Deep Ocean. No page reload.

