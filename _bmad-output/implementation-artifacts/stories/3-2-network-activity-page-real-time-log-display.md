---
story_id: "3.2"
story_key: "3-2-network-activity-page-real-time-log-display"
epic: 3
story_title: "Network Activity Page — Real-Time Log Display"
status: ready-for-dev
priority: critical
frs_covered:
  - FR-7
  - FR-12
ux_drs_covered:
  - UX-DR7
  - UX-DR9
  - UX-DR10
  - UX-DR11 (backend-unreachable banner, DataTable extension)
  - UX-DR12 (spot-check on new color surfaces)
  - UX-DR13 (prefers-reduced-motion stubs)
nfrs_addressed:
  - NFR-1
  - NFR-3
  - NFR-4
  - NFR-19
  - NFR-20 (spot-check)
  - NFR-21
---

# Story 3.2: Network Activity Page — Real-Time Log Display

## Story

**As a** developer,
**I want** to see all HTTP requests arriving at my mock services in a live-updating table with method chips, type icons, and row highlights,
**So that** I can instantly understand what traffic is flowing and whether it was served from a mock or proxied to the upstream.

---

## Status

Ready for Dev

---

## Context

### Background

Story 3.1 delivered the complete **backend observability layer**: `ActivityStore` (in-memory, per-service, FIFO-capped), `ActivityHub.cs` at `/hubs/activity` broadcasting `ActivityRowAdded` events within 500ms, `GET /api/activity` with filtering/pagination, `DELETE /api/activity` for clearing, and the `HeaderRedactionService`. The backend is fully operational.

This story delivers the **frontend Network Activity page** — the React UI that subscribes to the hub, renders rows in a high-performance virtual-scrolling table, applies the exact visual treatments from DESIGN.md (method chips, type icons, row highlights), and renders the proxy counter pill in the page header. Filtering, sorting, auto-refresh controls, row detail, and the Clear log action are **deferred to Story 3.3 and 3.4** — they are **stubbed** here with the correct `data-testid` attributes and element order so the layout is complete.

**What this story delivers:**
- `/activity` route — `ActivityPage.tsx` with full page layout and page header structure
- `useActivityLog.ts` — SignalR `ActivityRowAdded` append-only hook (no React Query)
- `ActivityTable.tsx` — extends `<DataTable>` base (Epic 2 Story 2.2); virtual scrolling; default columns; keyboard navigation
- `MethodChip.tsx` — HTTP method chips with DESIGN.md token colors
- `TypeIcon.tsx` — Bootstrap Icon type column with tooltip (UX-DR9)
- Row highlight rules — amber left-border + `--error-row-bg` backgrounds (UX-DR10)
- `ProxyCounterPill.tsx` — proxy count pill with per-service popover (FR-12)
- Backend-unreachable banner (UX-DR11) — wired to the SignalR connection state from `lib/signalr.ts`
- **Stubs** (correct layout position + `data-testid`, non-functional): Refresh icon, LIVE/PAUSED indicator, Recording badge, Record button, Clear log button

**What this story does NOT deliver (deferred):**
- Story 3.3: Search field, service dropdown, type filter, sort, LIVE/PAUSED logic, auto-refresh interval, Clear log action
- Story 3.4: Row detail — Modal, Right Drawer, Bottom Panel
- Epic 4 Story 4.4: "Save as Mock" modal and action logic (stub button only here)

### Current State Entering This Story

**Backend — all done in Story 3.1:**

- **`ActivityHub.cs`** (`src/Fishtank.Api/Hubs/ActivityHub.cs`) — SignalR hub at `/hubs/activity`, `[Authorize]` attribute, broadcasts `ActivityRowAdded` with `ActivityRowDto` payload
- **`ActivityStore`** (`src/Fishtank.Api/Engine/ActivityStore.cs`) — `ConcurrentDictionary<Guid, ConcurrentQueue<ActivityRow>>` singleton; per-service FIFO cap via `FISHTANK_ACTIVITY_LOG_MAX_ROWS` (default 5000)
- **`ActivityService`** (`src/Fishtank.Api/Services/ActivityService.cs`) — `CaptureAsync` (stores + broadcasts), `QueryAsync` (filters: serviceId, type, search; pagination: skip/take), `ClearAsync`
- **`ActivityRow.cs`** / **`ActivityRowDto.cs`** / **`ActivityType.cs`** — model in `src/Fishtank.Api/Models/`
- **`ActivityEndpoints.cs`** — `GET /api/activity` (filters, pagination, newest-first), `DELETE /api/activity`; both `.RequireAuthorization()`
- **WireMock observer** — configured in `DefaultWireMockServerFactory.cs` or `EngineStartup.cs`; determines `ActivityType.Mocked` (mapping != null) or `ActivityType.Proxied` (mapping == null)
- **`SettingsEndpoints.cs`** — updated with `captureFullHeaders` field and `PUT /api/settings/capture-headers`

**Frontend — established in prior epics:**

- **`lib/queryClient.ts`** — `HUB_INVALIDATION_MAP` has `ServiceStatusChanged`, `SystemEventCreated`. Activity log will NOT add an entry here — append-only via SignalR
- **`lib/signalr.ts`** — hub connection factory with reconnect logic; connection state `connecting | connected | reconnecting | disconnected` managed here
- **`lib/api.ts`** — `apiFetch<T>()` with `credentials: 'include'`, error handling, 401 → `/login` redirect
- **`<DataTable>` base component** (`src/client/src/components/shared/DataTable.tsx`) — from Epic 2 Story 2.2; provides `table-layout: fixed`, `<colgroup>`, sticky headers, row hover, keyboard arrow-key navigation, three row-detail style variant stubs (Modal, Right Drawer, Bottom Panel)
- **`router.tsx`** — already has `/activity` route placeholder (added in Epic 1 Story 1.3 as sidebar nav item)

### ActivityRowDto (API Contract)

The backend `GET /api/activity` response envelope data and SignalR `ActivityRowAdded` payload:

```typescript
// src/client/src/features/activity/types.ts
export interface ActivityRow {
  id: string;           // GUID
  timestamp: string;    // ISO 8601
  method: string;       // "GET", "POST", etc.
  urlPath: string;      // Full path
  statusCode: number;
  type: "Mocked" | "Proxied";
  serviceId: string;    // GUID
  serviceName: string;
  servicePort: number;
  durationMs: number;
  requestHeaders: Record<string, string>;
  requestBody: string | null;
  responseHeaders: Record<string, string>;
  responseBody: string | null;
}
```

### Frontend Architecture — Activity Feature

```
src/client/src/features/activity/
  ActivityPage.tsx          ← page component exported from here
  ActivityTable.tsx         ← extends DataTable; virtual scrolling
  MethodChip.tsx            ← HTTP method colored chip
  TypeIcon.tsx              ← bi-database / bi-arrow-repeat + tooltip
  ProxyCounterPill.tsx      ← proxy pill + popover
  useActivityLog.ts         ← SignalR append-only hook (NO useQuery)
  useProxyCounter.ts        ← derives proxy counts from rows state
  api.ts                    ← apiFetch wrappers for activity endpoints
  types.ts                  ← ActivityRow, ActivityRowDto interfaces
```

**Critical constraint — no React Query for activity:**
```typescript
// src/client/src/features/activity/useActivityLog.ts
// DO NOT useQuery here — activity is SignalR append-only
// React Query would poll stale data and break the push model
```

Initial rows are loaded via `apiFetch` directly (not `useQuery`) on mount, then new rows arrive via SignalR `ActivityRowAdded` prepended to local state.

### Virtual Scrolling — Library Decision

NFR-4 requires 10,000+ rows at 60fps. Three options:
- `@tanstack/react-virtual` (Tanstack Virtual) — preferred; maintained by same team as React Query; zero-dependency approach
- `react-window` — battle-tested, minimal API
- `react-virtuoso` — rich feature set but heavier

**Decision at implementation time:** validate with a 10k-row benchmark before committing. If Tanstack Virtual is already a project dependency (check `package.json`), use it. Otherwise prefer `react-window` for minimal footprint. Document the decision in code comments.

### Page Header Layout (EXPERIENCE.md canonical order)

Left → right:
1. Hamburger icon (`bi-list`) — visible only at `< 768px` — wired from app shell
2. Page title `<h1>Network Activity</h1>`
3. `bi-arrow-clockwise` Refresh icon stub — `data-testid="activity-btn-refresh"` — non-functional (Story 3.3)
4. LIVE/PAUSED indicator stub — `data-testid="activity-btn-live-paused"` — non-functional (Story 3.3); shows "LIVE" text with green dot initially
5. Recording badge stub — `data-testid="activity-badge-recording"` — hidden (Story 4.5)
6. `[flex spacer]`
7. Proxy counter pill — `data-testid="activity-pill-proxy-count"` — **functional in this story**
8. Record button stub — `data-testid="activity-btn-record"` — non-functional (Story 4.5)
9. Clear log button — `data-testid="activity-btn-clear-log"` — non-functional stub (Story 3.3)

### Row Highlight Rules (Both May Apply Simultaneously)

| Condition | Highlight |
|---|---|
| Proxied request AND Service is currently Live | Amber left-border accent: `2px solid #f59e0b` on **first cell only** |
| HTTP 5xx response status | Subtle red background: `var(--error-row-bg)` on **all cells** |

Proxied rows for **Stopped** services: no amber border. Both highlights may apply to the same row simultaneously.

To determine if a service is "currently Live", the `ActivityTable` component must access service status. Use the `useServices` hook (or equivalent) to get current service statuses from the React Query cache — do not re-fetch services; read from cache only.

### Backend-Unreachable Banner (UX-DR11)

When the SignalR connection to **any** hub (`/hubs/services`, `/hubs/events`, `/hubs/activity`) is in `reconnecting` or `disconnected` state:
- Fixed-position banner: `position: fixed; top: 44px; width: 100%`
- Content: "Connection to Fishtank server lost — retrying…"
- The main content area adds `padding-top` equal to the banner height (use a CSS class toggled on/off)
- Banner hides automatically when connection is restored
- No manual dismiss

This banner is managed by `lib/signalr.ts` connection state and rendered in the **app shell** (not inside `ActivityPage`) so it appears across all screens. If it does not already exist from a prior story, implement it in the app shell layout component.

### Method Chip Colors (UX-DR7 — from DESIGN.md token pairs)

| Method | Text Color | Background |
|---|---|---|
| GET | `#3b82f6` (blue-500) | `#eff6ff` (blue-50 / blue-100) |
| POST | `#10b981` (emerald-500) | `#ecfdf5` (emerald-50 / emerald-100) |
| PUT | `#d97706` (amber-600) | `#fef3c7` (amber-100 / amber-200) |
| DELETE | `#ef4444` (red-500) | `#fee2e2` (red-100) |
| PATCH | `#8b5cf6` (violet-500) | `#ede9fe` (violet-100) |
| Other | `#475569` (slate-600) | `#f1f5f9` (slate-100) |

Chips have: text (method label) + colored background. **Not** icon-only. WCAG contrast must be validated across all 4 themes.

### Type Column Icons (UX-DR9)

| Type | Icon | Color | Tooltip |
|---|---|---|---|
| Proxied | `bi-arrow-repeat` | `#10b981` (emerald-500) | "Proxied" |
| Mocked | `bi-database` | `#3b82f6` (blue-500) | "Mocked" |

Column header: `bi-funnel` filter icon — no sort arrow. (Filter interaction deferred to Story 3.3.)

**Per-theme override:** in Deep Ocean theme, `bi-arrow-repeat` must use `#34d399` (emerald-400) to meet WCAG 4.5:1 on `#0f2233` background (emerald-500 `#10b981` ≈ 4.3:1 — fails). Apply via CSS `data-theme="deep-ocean"` scoped override.

### Empty States (DESIGN.md)

| Trigger | Content |
|---|---|
| No activity yet (never had traffic) | `bi-activity` 48px muted + "No activity yet" + "Requests will appear here once a service is live and receiving traffic." |
| Log was just cleared | `bi-activity` 48px muted + "Log cleared" + "New requests will appear as they arrive." |

### Proxy Counter Pill (FR-12)

- Format: `[bi-arrow-repeat icon] Proxied: N` where N = total proxied count in **full unfiltered log**
- `data-testid="activity-pill-proxy-count"`
- `role="button"`, `aria-label="Proxied request count — {N} total"`, `aria-live="polite"`, `aria-expanded` reflects popover state
- Click → popover with list of `{serviceName} — {count}` entries; services with 0 proxied count omitted
- Empty popover state: `bi-arrow-repeat` 24px muted + "No proxied requests recorded."
- Popover dismiss: click outside, `Esc`, or second click on pill
- N renders in `#ef4444` if **any** proxied row in the full unfiltered log has 5xx status; resets to default after log clear
- Proxy count is derived from local state (rows array) — not a separate API call

### Actions Column

| Icon | Tooltip | When shown | Behavior |
|---|---|---|---|
| `bi-eye` | "View detail" | Always | No-op stub — wired fully in Story 3.4 |
| `bi-lightning-charge` (brand color) | "Save as Mock" | Proxied rows only | No-op stub — wired fully in Story 4.4 |

---

## Acceptance Criteria

**AC-1 — Page loads with existing rows newest-first:**
**Given** the `/activity` route,
**When** the page loads,
**Then** existing log entries are fetched via `GET /api/activity` (not `useQuery` — direct `apiFetch` on mount) and displayed newest-first (DateTime descending default) (FR-7).

**AC-2 — Real-time SignalR row prepend:**
**Given** an `ActivityRowAdded` event received via the `/hubs/activity` SignalR hub,
**Then** the new row is prepended to the top of the table within 500ms of the request being received by the mock service (NFR-3, FR-7).

**AC-3 — No React Query on activity feed:**
**Given** `src/client/src/features/activity/useActivityLog.ts`,
**Then** it contains `// DO NOT useQuery here` comment and uses SignalR append-only pattern with local `useState` for the rows array; `HUB_INVALIDATION_MAP` in `queryClient.ts` is NOT updated with an `ActivityRowAdded` entry.

**AC-4 — Default visible columns:**
**Given** the activity table (extends `<DataTable>` base from Epic 2 Story 2.2),
**Then** default visible columns in order: Method · URL Path · Status · Type · Service · Actions; `ms` (duration) and DateTime columns are hidden by default but available via the Columns selector (`data-testid="activity-btn-columns"`) (EXPERIENCE.md).

**AC-5 — Method chips with DESIGN.md token colors:**
**Given** the Method column,
**Then** each row renders an HTTP method chip with colored text + colored background per DESIGN.md token pairs: GET (blue-500/blue-100), POST (emerald-500/emerald-100), PUT (amber-600/amber-200), DELETE (red-500/red-100), PATCH (violet-500/violet-100), other (slate-600/slate-100); chips have text + background (not icon-only) (UX-DR7).

**AC-6 — Type column Bootstrap Icons + tooltips:**
**Given** the Type column,
**Then** it renders a Bootstrap Icon only (no text chip): `bi-database` in `#3b82f6` for Mocked with tooltip "Mocked"; `bi-arrow-repeat` in `#10b981` for Proxied with tooltip "Proxied"; column header shows `bi-funnel` icon only (no sort arrow); Deep Ocean theme applies `#34d399` override for `bi-arrow-repeat` (UX-DR9, FR-7).

**AC-7 — Amber left-border on proxied + Live service rows:**
**Given** a row where `type === "Proxied"` AND the row's service is currently in Live status (read from React Query services cache),
**Then** the first cell has `2px solid #f59e0b` (amber-500) left-border accent; rows for Proxied requests where the service is Stopped have no amber border (UX-DR10, FR-7).

**AC-8 — Red background on 5xx rows:**
**Given** a row where `statusCode >= 500 && statusCode <= 599`,
**Then** all cells have `var(--error-row-bg)` background (theme-aware CSS variable, not hardcoded rgba) (UX-DR10, FR-7).

**AC-9 — Both row highlights apply simultaneously:**
**Given** a row that is both Proxied (with Live service) AND has a 5xx status code,
**Then** both the amber left-border on the first cell AND the red `--error-row-bg` on all cells are applied simultaneously.

**AC-10 — Proxy counter pill (FR-12):**
**Given** the proxy counter pill in the page header,
**Then** it shows `[bi-arrow-repeat] Proxied: N` where N = total proxied-request count from the full rows state (unfiltered); `data-testid="activity-pill-proxy-count"`; clicking opens a per-service popover (max-width 240px) listing `{serviceName} — {count}` for services with count > 0; empty state shows `bi-arrow-repeat` muted + "No proxied requests recorded."; N renders in `#ef4444` if any row in state has `type === "Proxied"` and `statusCode >= 500`; error color resets after log clear; `aria-live="polite"` on the pill (FR-12).

**AC-11 — Page header element order and stubs:**
**Given** the Network Activity page header,
**Then** elements appear left-to-right as: (< 768px only) Hamburger → Page title `<h1>` → Refresh icon stub (`data-testid="activity-btn-refresh"`, `bi-arrow-clockwise`, visible only when paused — stub is hidden initially) → LIVE indicator stub (`data-testid="activity-btn-live-paused"`, shows "LIVE" with green dot) → Recording badge stub (`data-testid="activity-badge-recording"`, hidden) → [flex spacer] → Proxy counter pill → Record button stub (`data-testid="activity-btn-record"`, label "● Record") → Clear log button stub (`data-testid="activity-btn-clear-log"`, non-functional in this story); all stub buttons render at the correct position and carry correct `data-testid` attributes (EXPERIENCE.md, UX-DR11).

**AC-12 — Virtual scrolling for 10,000+ rows:**
**Given** the activity table with 10,000+ rows,
**When** the user scrolls,
**Then** scroll performance stays at or above 60fps using virtual scrolling via a documented library choice (preferred: `@tanstack/react-virtual`; acceptable: `react-window`); the choice is documented in a code comment in `ActivityTable.tsx` (NFR-4, risk R-E3-001).

**AC-13 — Keyboard navigation:**
**Given** the activity table,
**Then** arrow keys (`ArrowUp`/`ArrowDown`) move row focus; `Tab` moves between interactive elements (toolbar controls, column headers, action icons) in logical DOM order; all action icon buttons have `aria-label` attributes: `bi-eye` → `"View detail"`, `bi-lightning-charge` → `"Save as Mock"` (NFR-19, UX-DR11).

**AC-14 — Backend-unreachable banner:**
**Given** the SignalR connection to `/hubs/activity` (or any hub) is in `reconnecting` or `disconnected` state,
**When** the connection error is detected by `lib/signalr.ts`,
**Then** a fixed-position banner renders: `position: fixed; top: 44px; width: 100%` with message "Connection to Fishtank server lost — retrying…"; the content area gains `padding-top` equal to banner height; banner hides automatically on reconnection; no manual dismiss; rendered in app shell so it appears on all screens (UX-DR11).

**AC-15 — Empty states:**
**Given** the activity table has never received any rows (initial empty state),
**Then** shows: `bi-activity` 48px muted + "No activity yet" + "Requests will appear here once a service is live and receiving traffic."
**Given** rows existed and the log was cleared (`rows` state set to `[]` after clear),
**Then** shows: `bi-activity` 48px muted + "Log cleared" + "New requests will appear as they arrive."

**AC-16 — data-testid attributes:**
**Given** all interactive and structural elements in the activity feature,
**Then** every element carries the correct `data-testid` per DESIGN.md canon: `activity-input-search`, `activity-select-service`, `activity-btn-type-filter`, `activity-checkbox-type-mocked`, `activity-btn-clear-filters`, `activity-btn-columns`, `activity-row-{request-id}`, `activity-btn-record`, `activity-btn-clear-log`, `activity-btn-live-paused`, `activity-badge-recording`, `activity-btn-refresh`, `activity-pill-proxy-count`, `activity-btn-save-as-mock`; any newly added elements not in DESIGN.md follow the `activity-{component-type}-{identifier}` pattern.

**AC-17 — WCAG spot-check on color surfaces:**
**Given** the Network Activity page across Clean Light and Deep Ocean themes,
**Then** method chips (all 6 color variants), type icons (`bi-database` blue, `bi-arrow-repeat` emerald/deep-ocean-override), proxy counter pill, and LIVE indicator all pass WCAG 2.1 AA contrast thresholds (4.5:1 normal text, 3:1 UI components); spot-check is not the full audit (deferred to PSG-2) but specifically validates the new high-density color surfaces introduced by this story (UX-DR12, NFR-20).

---

## Tasks / Subtasks

### Frontend

- [ ] **Task F1: ActivityRow types and API client** (AC: 1)
  - [ ] Create `src/client/src/features/activity/types.ts`
    - `ActivityRow` interface with all fields (see Context section above)
    - `ActivityType` type: `"Mocked" | "Proxied"`
  - [ ] Create `src/client/src/features/activity/api.ts`
    - `fetchActivityRows(params?: ActivityQueryParams): Promise<ActivityRow[]>` — calls `GET /api/activity`
    - `ActivityQueryParams`: `{ serviceId?: string; type?: string; search?: string; skip?: number; take?: number }`
    - Use `apiFetch<{ items: ActivityRow[]; total: number }>` (or whatever envelope shape Story 3.1 returns — verify against actual API response shape)
  - [ ] Update `src/client/src/lib/signalr.ts` — add type-safe handler for `ActivityRowAdded` event if not already present

- [ ] **Task F2: useActivityLog hook** (AC: 2, 3)
  - [ ] Create `src/client/src/features/activity/useActivityLog.ts`
  - [ ] Comment: `// DO NOT useQuery here — activity is SignalR append-only`
  - [ ] `useState<ActivityRow[]>([])` for rows
  - [ ] On mount: call `fetchActivityRows({ take: 200 })` via direct `apiFetch` to pre-populate initial state; update state
  - [ ] Subscribe to `ActivityRowAdded` SignalR event via hub connection from `lib/signalr.ts`
  - [ ] On `ActivityRowAdded`: prepend new `ActivityRow` to state: `setRows(prev => [newRow, ...prev])`
  - [ ] Expose: `rows`, `clearRows` (sets state to `[]`, used by Clear log button in Story 3.3), `isLoading` (initial fetch), `hadRows` (bool — true if rows were ever non-empty, used for empty-state variant)
  - [ ] Unsubscribe on unmount

- [ ] **Task F3: MethodChip component** (AC: 5)
  - [ ] Create `src/client/src/features/activity/MethodChip.tsx`
  - [ ] Props: `method: string`
  - [ ] Method → color mapping from DESIGN.md token pairs (see Context section); default to slate-600/slate-100 for unknown methods
  - [ ] Renders: `<span>` with colored text + background; text = method label (e.g. "GET")
  - [ ] Tailwind classes for each method color pair; use `data-theme` CSS variable overrides if needed for theme compatibility

- [ ] **Task F4: TypeIcon component** (AC: 6)
  - [ ] Create `src/client/src/features/activity/TypeIcon.tsx`
  - [ ] Props: `type: "Mocked" | "Proxied"`
  - [ ] Mocked: `<i className="bi bi-database" />` in `#3b82f6`; Proxied: `<i className="bi bi-arrow-repeat" />` in `#10b981`
  - [ ] Deep Ocean theme override: Proxied uses `#34d399` (apply via `data-theme="deep-ocean"` CSS or inline style; document the reason)
  - [ ] Tooltip via `title` prop or shadcn Tooltip component: "Mocked" or "Proxied"
  - [ ] `aria-label` matches tooltip text

- [ ] **Task F5: ProxyCounterPill component** (AC: 10)
  - [ ] Create `src/client/src/features/activity/ProxyCounterPill.tsx`
  - [ ] Props: `rows: ActivityRow[]` (full unfiltered rows from useActivityLog)
  - [ ] Derives proxy count from `rows.filter(r => r.type === "Proxied").length`
  - [ ] Derives per-service counts: `Map<serviceId, { name, count }>` from rows
  - [ ] Derives error color: `rows.some(r => r.type === "Proxied" && r.statusCode >= 500)`
  - [ ] Render: `[bi-arrow-repeat] Proxied: {N}` pill; N in `#ef4444` if error condition
  - [ ] `data-testid="activity-pill-proxy-count"`, `role="button"`, `aria-live="polite"`, `aria-expanded`
  - [ ] Click → Popover with service breakdown; services with 0 proxied omitted; empty state per spec
  - [ ] Popover dismiss: click outside, `Esc`, second click on pill
  - [ ] `aria-label="Proxied request count — {N} total"` updated dynamically

- [ ] **Task F6: ActivityTable component** (AC: 4, 7, 8, 9, 12, 13, 16)
  - [ ] Create `src/client/src/features/activity/ActivityTable.tsx`
  - [ ] Extends `<DataTable>` base from Epic 2; configure columns via `<colgroup>` prop
  - [ ] Default visible columns: Method · URL Path · Status · Type · Service · Actions (in order)
  - [ ] Hidden columns available via Columns selector: `ms` (duration) and DateTime
  - [ ] `table-layout: fixed`, sticky headers, `<colgroup>` column widths
  - [ ] Virtual scrolling implementation (document library choice in comment)
    - Option A: `@tanstack/react-virtual` (if already in package.json)
    - Option B: `react-window` FixedSizeList (install if needed)
    - Document: `// Virtual scrolling: using {library} — selected for NFR-4 (10k rows at 60fps)`
  - [ ] Row render: `data-testid="activity-row-{row.id}"`
  - [ ] Row highlight logic (see Context → Row Highlight Rules):
    - Read service statuses from React Query cache via `useQueryClient().getQueryData(['services'])`
    - If `row.type === "Proxied"` AND service is Live → apply `2px solid #f59e0b` border-left to first cell
    - If `row.statusCode >= 500` → apply `var(--error-row-bg)` background to all cells
    - Both can apply simultaneously
  - [ ] Keyboard: `onKeyDown` handler — `ArrowUp`/`ArrowDown` move `focusedRowIndex` state; `Enter` triggers row detail (no-op stub until Story 3.4)
  - [ ] Actions column: `bi-eye` always shown (`aria-label="View detail"`, `data-testid="activity-btn-view-{row.id}"`); `bi-lightning-charge` shown for Proxied rows only (`aria-label="Save as Mock"`, brand color, `data-testid="activity-btn-save-as-mock"`)
  - [ ] Empty states: "No activity yet" and "Log cleared" variants based on `hadRows` prop

- [ ] **Task F7: ActivityPage component** (AC: 1, 11, 14, 15, 16)
  - [ ] Create `src/client/src/features/activity/ActivityPage.tsx`
  - [ ] Wire `useActivityLog` hook for rows state
  - [ ] Wire `useProxyCounter.ts` helper or inline proxy count derivation (can be in ProxyCounterPill)
  - [ ] Page header (left → right):
    - Page title: `<h1>Network Activity</h1>`
    - Refresh icon stub: `<button data-testid="activity-btn-refresh" aria-label="Manual refresh" disabled>` + `bi-arrow-clockwise`; hidden initially (visible only when paused — Story 3.3 will wire)
    - LIVE/PAUSED stub: `<button data-testid="activity-btn-live-paused" aria-label="Pause auto-refresh">LIVE</button>` — non-functional stub showing "LIVE" with green dot; green dot: `inline-block w-2 h-2 rounded-full bg-green-500`
    - Recording badge stub: `<span data-testid="activity-badge-recording" className="hidden">● Recording</span>` — hidden (Story 4.5)
    - Flex spacer: `<div className="flex-1" />`
    - `<ProxyCounterPill rows={rows} />`
    - Record button stub: `<button data-testid="activity-btn-record" disabled>● Record</button>` — non-functional (Story 4.5)
    - Clear log button stub: `<button data-testid="activity-btn-clear-log" disabled>Clear log</button>` — non-functional (Story 3.3 will wire)
  - [ ] Toolbar stubs (render with correct `data-testid`, non-functional — Story 3.3):
    - Search input: `<input data-testid="activity-input-search" placeholder="Search..." disabled />`
    - Service dropdown: `<select data-testid="activity-select-service" disabled>` `<option>All Services</option>` `</select>`
    - Type filter: `<button data-testid="activity-btn-type-filter" disabled>` with `bi-funnel` icon
    - Clear filters: `<button data-testid="activity-btn-clear-filters" disabled>Clear filters</button>`
  - [ ] Render `<ActivityTable rows={rows} hadRows={hadRows} />`
  - [ ] Backend-unreachable banner: check if already implemented in app shell; if not, implement here with a SignalR connection state subscription from `lib/signalr.ts`
  - [ ] Export from `index.ts` or directly for `router.tsx` import

- [ ] **Task F8: Register route** (AC: 1)
  - [ ] Verify `/activity` route in `src/client/src/router.tsx` points to `ActivityPage`
  - [ ] Route should be within the authenticated layout (requires JWT cookie)
  - [ ] If already a placeholder, replace with the real `ActivityPage` component

- [ ] **Task F9: msw handler** (AC: 1)
  - [ ] Update `src/client/src/test/msw/handlers.ts` (or equivalent MSW handler file)
  - [ ] Add `GET /api/activity` handler returning `{ success: true, data: { items: [], total: 0 } }` (or actual response shape — verify from Story 3.1 implementation)
  - [ ] This handler is required by project-context.md DoD gate #6

### Tests

- [ ] **Task T1: SignalR push latency integration test** (AC: 2) — P0, risk R-E3-004
  - [ ] Add to `src/Fishtank.Api.IntegrationTests/Api/Story3_2_ActivityHubTests.cs`
  - [ ] Test: HTTP request hits mock service → `ActivityRowAdded` SignalR event received ≤500ms (p95 over 10 requests)
  - [ ] Use `TaskCompletionSource` await pattern with 3s timeout (documented in test-design R-E3-002)
  - [ ] Record timestamp before HTTP request, record timestamp when hub event received, assert difference ≤500ms

- [ ] **Task T2: GET /api/activity sort order integration test** (AC: 1) — P1
  - [ ] Add to `src/Fishtank.Api.IntegrationTests/Api/Story3_2_ActivityHubTests.cs` (or Story3_1 file)
  - [ ] Test: Seed 3 rows with different timestamps → `GET /api/activity` → verify newest-first order

- [ ] **Task T3: ActivityLog component test — real-time rows** (AC: 2, 3) — P0, risk R-E3-002
  - [ ] Create `src/client/src/features/activity/__tests__/ActivityLog.test.tsx`
  - [ ] Test: `<ActivityLog>` renders rows received via mock SignalR (mock hub connection)
  - [ ] Test: Rows are prepended (newest first) when new `ActivityRowAdded` is triggered
  - [ ] Use Vitest + RTL + mock SignalR connection (not real WebSocket)
  - [ ] Verify no `useQuery` calls in component tree for activity data

- [ ] **Task T4: Virtual scrolling performance test** (AC: 12) — P0, risk R-E3-001
  - [ ] Add to `src/client/src/features/activity/__tests__/ActivityTable.test.tsx`
  - [ ] Test: Render `<ActivityTable>` with 10,000 generated rows
  - [ ] Assert: DOM does not contain 10,000 `activity-row-*` elements (virtual — only visible rows rendered)
  - [ ] Assert: Performance mark during scroll stays within acceptable frame budget (or use `performance.measure()` if JSDOM supports)

- [ ] **Task T5: Method chip colors component test** (AC: 5) — P1
  - [ ] Test: `<MethodChip method="GET" />` renders with blue-500 text color class
  - [ ] Test: `<MethodChip method="POST" />` renders with emerald-500 text color class
  - [ ] Test: `<MethodChip method="DELETE" />` renders with red-500 text color class
  - [ ] Test: `<MethodChip method="UNKNOWN" />` renders with slate-600 fallback

- [ ] **Task T6: Type icon component test** (AC: 6) — P1
  - [ ] Test: `<TypeIcon type="Mocked" />` renders `bi-database` icon with tooltip "Mocked"
  - [ ] Test: `<TypeIcon type="Proxied" />` renders `bi-arrow-repeat` icon with tooltip "Proxied"

- [ ] **Task T7: Row highlight component tests** (AC: 7, 8, 9) — P1
  - [ ] Test: Proxied row + service Live → first cell has amber border class
  - [ ] Test: Proxied row + service Stopped → no amber border
  - [ ] Test: 5xx row → all cells have `--error-row-bg` background class
  - [ ] Test: Proxied + 5xx row → both amber border AND red background applied

- [ ] **Task T8: Proxy counter pill component test** (AC: 10) — P1
  - [ ] Test: `<ProxyCounterPill rows={[]} />` renders "Proxied: 0"
  - [ ] Test: `<ProxyCounterPill rows={[...3 proxied rows]}/>` renders "Proxied: 3"
  - [ ] Test: 5xx proxied row → count renders in error color (`#ef4444`)
  - [ ] Test: Click opens popover; service breakdown shown; services with 0 omitted
  - [ ] Test: Popover dismisses on Esc

- [ ] **Task T9: E2E — real-time rows appear** (AC: 1, 2) — P0
  - [ ] Add to `src/client/e2e/story-3-2-activity-page.spec.ts` (or equivalent)
  - [ ] Navigate to `/activity`
  - [ ] Trigger HTTP request to a running mock service (via `fetch` or Playwright request interception)
  - [ ] Assert: new row appears in table within 1500ms (generous bound over the 500ms NFR to account for test overhead)
  - [ ] Assert: `[data-testid^="activity-row-"]` count increases

---

## Dependencies

- **Story 3.1 (done):** `ActivityHub.cs`, `ActivityStore`, `ActivityService`, `GET /api/activity`, `DELETE /api/activity`, `ActivityRow`/`ActivityRowDto` models — all required
- **Epic 2 Story 2.2 (done):** `<DataTable>` base component — this story extends it for the activity table
- **Epic 1 Story 1.3 (done):** `lib/queryClient.ts`, `lib/signalr.ts`, `lib/api.ts`, `router.tsx`, app shell with `/activity` sidebar nav item

---

## Dev Notes

### Architecture Constraints — Mandatory

- **No React Query for activity data.** `useActivityLog.ts` must use direct `apiFetch` (initial load) + `useState` (ongoing). Add `// DO NOT useQuery here` comment. This is explicitly called out in `project-context.md`.
- **HUB_INVALIDATION_MAP not updated.** Activity is SignalR-only — do NOT add `ActivityRowAdded` to `HUB_INVALIDATION_MAP` in `queryClient.ts`.
- **No business logic in endpoint handlers** — backend is already implemented; this story is frontend-only with one integration test addition.
- **Never raw `fetch` in components** — always use `apiFetch<T>()` from `lib/api.ts` for the initial load call.
- **All interactive elements need `data-testid`** — Playwright E2E tests depend on these exclusively. Missing `data-testid` = E2E failures.
- **Feature folder self-containment** — `features/activity/` must not import from `features/services/` or other feature folders. Read service statuses from React Query cache via `useQueryClient()` (accessing cached data is acceptable; importing service hooks is not).

### Virtual Scrolling Library Selection

Check `src/client/package.json` before installing:
- If `@tanstack/react-virtual` is already present → use it (consistent with Tanstack React Query already in use)
- If `react-window` is present → use it
- If neither → install `@tanstack/react-virtual` (lighter, same vendor as React Query)

Document the choice prominently: `// Virtual scrolling: @tanstack/react-virtual chosen for NFR-4 (10k rows @ 60fps). Consistent with TanStack React Query already in project.`

### Stub Buttons — Non-Functional but Layout-Complete

Story 3.3 will wire the Clear log, search, service dropdown, type filter, clear filters, LIVE/PAUSED, and auto-refresh. Story 4.5 will wire Record mode. Story 3.4 will wire row detail.

For this story: render all stub elements at their correct DOM positions with correct `data-testid` attributes. Use `disabled` attribute to prevent interaction. Do NOT use `hidden` unless the element is conditionally visible by spec (Recording badge = always hidden until Story 4.5; Refresh icon = hidden until paused state is wired).

### Row Height and Virtual Scrolling

Decide on fixed row height for virtual scrolling. Suggested: `48px` per row. Document this in a constant:
```typescript
const ACTIVITY_ROW_HEIGHT_PX = 48;
```
Variable height rows require more complex virtual scrolling configuration — avoid if possible.

### Service Status Lookup for Row Highlights

Services are already in the React Query cache from Epic 2. Access without refetch:
```typescript
import { useQueryClient } from '@tanstack/react-query';
const queryClient = useQueryClient();
const services = queryClient.getQueryData<Service[]>(['services']) ?? [];
const isServiceLive = (serviceId: string) =>
  services.find(s => s.id === serviceId)?.status === 'Live';
```

Do NOT call `useServices()` hook inside `ActivityTable` — that would trigger a fetch. Read from cache only.

### File Locations — New Files

```
src/client/src/features/activity/
  ActivityPage.tsx         ← NEW
  ActivityTable.tsx        ← NEW
  MethodChip.tsx           ← NEW
  TypeIcon.tsx             ← NEW
  ProxyCounterPill.tsx     ← NEW
  useActivityLog.ts        ← NEW
  api.ts                   ← NEW
  types.ts                 ← NEW
  __tests__/
    ActivityLog.test.tsx   ← NEW
    ActivityTable.test.tsx ← NEW

src/Fishtank.Api.IntegrationTests/
  Api/
    Story3_2_ActivityHubTests.cs  ← NEW
```

### File Locations — Updated Files

- `src/client/src/router.tsx` — wire `/activity` to `ActivityPage` (if placeholder)
- `src/client/src/test/msw/handlers.ts` — add `GET /api/activity` handler
- `src/client/src/lib/signalr.ts` — add `ActivityRowAdded` type-safe handler (if not already)
- App shell layout component — add backend-unreachable banner (if not already from prior story)

### Test Design Reference

See `_bmad-output/test-artifacts/test-design-epic-3.md` for:
- Story 3-2 test scenarios (P0 and P1 coverage plan)
- Risk R-E3-001: Virtual scroll library selection — benchmark required
- Risk R-E3-002: SignalR race conditions in tests — use `TaskCompletionSource` with 3s timeout
- Risk R-E3-004: SignalR <500ms latency — integration test with stopwatch instrumentation

### Previous Story Learnings

From Epic 3 Story 3.1:
- `ActivityRowDto` shape — verify exact JSON field names from `ActivityService.cs` before writing TypeScript types
- `GET /api/activity` response envelope: `{ "success": true, "data": { "items": [...], "total": N } }` — verify actual shape against `ActivityEndpoints.cs` implementation
- `ActivityHub.cs` broadcasts `ActivityRowAdded` with full `ActivityRowDto` payload (not just ID)
- `ServerConfigService` key for header capture: `"CaptureFullHeaders"` (string comparison)

From Epic 2 Story 2.2 (DataTable):
- `<DataTable>` base component API — check `DataTable.tsx` props interface before extending
- Row detail variant stubs are props: `detailStyle?: "modal" | "drawer" | "panel"` (or similar — check actual implementation)
- `table-layout: fixed` is applied via a Tailwind class; `<colgroup>` widths set via a `columns` prop

---

## Definition of Done

Per `project-context.md`:

| # | Gate |
|---|---|
| 1 | All ATDD acceptance tests pass (green) |
| 2 | All backend integration tests pass (`dotnet test src/Fishtank.Api.IntegrationTests`) |
| 3 | TypeScript builds clean — 0 errors (`npm run build` in `src/client`) |
| 4 | .NET builds clean — 0 errors, 0 warnings (`dotnet build src/Fishtank.slnx`) |
| 5 | Every new interactive/structural element has `data-testid` per DESIGN.md canon |
| 6 | msw handlers updated for `GET /api/activity` |
| 7 | No new critical anti-patterns |
| 8 | Story status set to `done` in `sprint-status.yaml` when complete |
