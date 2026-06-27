---
story_id: "3.3"
story_key: "3-3-activity-log-filtering-sorting-auto-refresh-and-log-controls"
epic: 3
story_title: "Activity Log Filtering, Sorting, Auto-Refresh & Log Controls"
status: ready-for-dev
priority: high
frs_covered:
  - FR-8
  - FR-11
  - FR-13
ux_drs_covered:
  - UX-DR5 (Settings sub-nav)
  - UX-DR11 (LIVE/PAUSED indicator, refresh icon behavior)
  - UX-DR13 (prefers-reduced-motion on refresh icon)
nfrs_addressed:
  - NFR-19 (keyboard navigation — filter controls)
  - NFR-21 (prefers-reduced-motion)
---

# Story 3.3: Activity Log Filtering, Sorting, Auto-Refresh & Log Controls

## Story

**As a** developer,
**I want** to filter the activity log by search query, service, and type, sort by any column, configure auto-refresh, and clear the log,
**So that** I can quickly isolate the specific requests I'm investigating.

---

## Status

Ready for Dev

---

## Context

### Background

Story 3.2 delivered the complete **Network Activity page**: real-time SignalR row append, `ActivityTable` with virtual scrolling, all visual treatments (method chips, type icons, row highlights), `ProxyCounterPill`, and the backend-unreachable banner. All toolbar controls (search, service dropdown, type filter, clear filters) and all page-header controls (LIVE/PAUSED, Clear log, Columns) were scaffolded as **disabled stubs** with the correct `data-testid` attributes and DOM positions, ready to be wired in this story.

This story activates all those stubs:
- **Filter controls** — wire search, service dropdown, type filter, and clear filters to client-side in-memory filtering
- **Column sorting** — wire sort arrows in column headers; cycles: unsorted → ascending → descending → unsorted; one column at a time
- **LIVE/PAUSED toggle** — wires the indicator; LIVE = SignalR rows arrive live; PAUSED = row display freezes, Refresh icon appears
- **Manual refresh** — Refresh icon (`bi-arrow-clockwise`) triggers `fetchActivityRows()`, spins during fetch, respects `prefers-reduced-motion`
- **Clear log** — calls `DELETE /api/activity`, then `clearRows()`; no confirmation; proxy counter resets automatically
- **Settings → Network Activity section** — implements the Activity sub-section in Settings: auto-refresh interval (1s/2s/5s/Disabled), header redaction toggle (wires to existing `PUT /api/settings/capture-headers`), max log entries display

This story is **frontend-only**. The backend endpoints (`GET /api/activity` with filter params, `DELETE /api/activity`, `PUT /api/settings/capture-headers`) all exist from prior stories.

### What was delivered in Story 3.2

**All files created in `src/client/src/features/activity/`:**
- `types.ts` — `ActivityRow`, `ActivityType`, `ActivityQueryParams`
- `api.ts` — `fetchActivityRows(params?: ActivityQueryParams): Promise<ActivityRow[]>` using `apiFetch`
- `useActivityLog.ts` — SignalR append-only hook; exposes `{ rows, clearRows, isLoading, hadRows }`. Uses `createHubConnection("/hubs/activity")`. Buffers SignalR rows during initial fetch to prevent race condition.
- `MethodChip.tsx`, `TypeIcon.tsx`, `ProxyCounterPill.tsx`
- `ActivityTable.tsx` — uses `@tanstack/react-virtual`; props: `{ rows: ActivityRow[], hadRows: boolean }`; virtual rows at `ACTIVITY_ROW_HEIGHT_PX = 48`; reads service statuses from React Query cache; keyboard ArrowUp/ArrowDown navigation
- `pages/ActivityPage.tsx` — page component; all stubs present at correct DOM positions with `data-testid`; calls `useActivityLog()`; renders `ProxyCounterPill` with full `rows`; renders `ActivityTable` with `rows`

**Backend already implemented (Stories 3.1, 2.5):**
- `GET /api/activity?serviceId=&type=&search=&skip=&take=` — filter + pagination; cap: `take` max 200; `skip` ≥ 0
- `DELETE /api/activity` — clears all rows; returns `ApiResponse.Ok(null)`
- `PUT /api/settings/capture-headers` — body: `{ enabled: bool }`; updates `captureFullHeaders`
- `GET /api/settings` — returns `{ mocksHostPath, captureFullHeaders }`

**Test files created in Story 3.2:**
- `src/client/src/features/activity/__tests__/ActivityLog.test.tsx`
- `src/client/src/features/activity/__tests__/ActivityTable.test.tsx`

### Existing Settings Feature Structure

```
src/client/src/features/settings/
  pages/SettingsPage.tsx           ← SettingsSection = "appearance" | "activity" | "cache" | "mocks-root"
  components/AppearanceSettings.tsx
  components/CacheSettings.tsx
  hooks/useAppSettings.ts          ← useQuery for GET /api/settings; returns { mocksHostPath }
  hooks/useServiceCache.ts
  types/cache.ts
```

`SettingsPage.tsx` already has `"activity"` as a valid `SettingsSection`. Currently it renders `<p className="text-muted">Configured in a later story.</p>` for the activity case. **This story replaces that placeholder with `<ActivitySettings />`.**

### Current ActivityPage Stub State

In `pages/ActivityPage.tsx`, the following elements are rendered but fully disabled:
```tsx
// Refresh icon — display:none (visibility controlled by LIVE/PAUSED state in this story)
<button data-testid="activity-btn-refresh" disabled style={{ display: "none" }}>

// LIVE/PAUSED — disabled button showing "LIVE" with green dot
<button data-testid="activity-btn-live-paused" disabled>

// Clear log — disabled
<button data-testid="activity-btn-clear-log" disabled>Clear log</button>

// Toolbar: all disabled
<input data-testid="activity-input-search" disabled placeholder="Search..." />
<select data-testid="activity-select-service" disabled>...</select>
<button data-testid="activity-btn-type-filter" disabled>...</button>
<button data-testid="activity-btn-clear-filters" disabled>Clear filters</button>
<button data-testid="activity-btn-columns" disabled>Columns</button>
<input data-testid="activity-checkbox-type-mocked" type="checkbox" disabled />
```

The `ProxyCounterPill` receives `rows` (full unfiltered) — **this must not change**. The `ActivityTable` currently receives `rows` — **this story changes that to `filteredRows`** (derived from `rows` by applying active filters and sort).

### Filter Architecture — Client-Side, In-Memory

Filtering is **not** via API query params. All rows are in memory from the SignalR append-only hook. Filters are React state derived from `rows`:

```typescript
// In ActivityPage.tsx
const [searchQuery, setSearchQuery] = useState("");
const [selectedServiceId, setSelectedServiceId] = useState<string | "all">("all");
const [typeFilter, setTypeFilter] = useState<"all" | "mocked" | "proxied">("all");
const [sort, setSort] = useState<{ column: SortableColumn | null; direction: "asc" | "desc" | null }>({
  column: null,
  direction: null,
});

// filteredRows is the view passed to ActivityTable
const filteredRows = useMemo(() => {
  let result = rows;
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    result = result.filter(r =>
      r.urlPath.toLowerCase().includes(q) ||
      r.method.toLowerCase().includes(q)
    );
  }
  if (selectedServiceId !== "all") {
    result = result.filter(r => r.serviceId === selectedServiceId);
  }
  if (typeFilter !== "all") {
    result = result.filter(r => r.type.toLowerCase() === typeFilter);
  }
  if (sort.column && sort.direction) {
    result = [...result].sort((a, b) => { /* column-specific comparator */ });
  }
  return result;
}, [rows, searchQuery, selectedServiceId, typeFilter, sort]);

// ProxyCounterPill still receives unfiltered rows:
<ProxyCounterPill rows={rows} />
// ActivityTable receives filtered rows:
<ActivityTable rows={filteredRows} hadRows={hadRows} />
```

**Clear filters resets**: `searchQuery → ""`, `selectedServiceId → "all"`, `typeFilter → "all"`, `sort → { column: null, direction: null }` (restoring DateTime descending default sort).

### Sort Architecture

Default sort: DateTime descending (newest first). This is the initial state and the "cleared" state.

```typescript
type SortableColumn = "method" | "urlPath" | "statusCode" | "serviceName" | "durationMs" | "timestamp";
// NOT sortable: "type" and "actions"
```

Sort cycle per column: `null → "asc" → "desc" → null` (clicking a third time removes sort, returns to default DateTime descending).

When `sort.column === null`, apply default DateTime descending sort implicitly (no indicator in any header).

```typescript
// Sort comparators in filteredRows useMemo
const compareRows = (a: ActivityRow, b: ActivityRow) => {
  if (!sort.column || !sort.direction) {
    // Default: newest first (timestamp descending)
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  }
  let valA: string | number, valB: string | number;
  switch (sort.column) {
    case "method": valA = a.method; valB = b.method; break;
    case "urlPath": valA = a.urlPath; valB = b.urlPath; break;
    case "statusCode": valA = a.statusCode; valB = b.statusCode; break;
    case "serviceName": valA = a.serviceName; valB = b.serviceName; break;
    case "durationMs": valA = a.durationMs; valB = b.durationMs; break;
    case "timestamp": valA = new Date(a.timestamp).getTime(); valB = new Date(b.timestamp).getTime(); break;
  }
  const cmp = typeof valA === "number" ? valA - valB : String(valA).localeCompare(String(valB));
  return sort.direction === "asc" ? cmp : -cmp;
};
```

**Pass `onSort` and `sort` props to `ActivityTable`** so it can render sort indicators in column headers and call back on click.

### LIVE/PAUSED State Architecture

```typescript
// In ActivityPage.tsx
const [isPaused, setIsPaused] = useState(false);
const [isManualRefreshing, setIsManualRefreshing] = useState(false);
// Snapshot used when PAUSED — table shows rows as of when user paused
const [pauseSnapshot, setPauseSnapshot] = useState<ActivityRow[] | null>(null);

// Display rows for the table (before filter/sort):
const sourceRows = isPaused && pauseSnapshot !== null ? pauseSnapshot : rows;
// Then apply filters/sort to sourceRows to get filteredRows.
```

**Pause behavior:**
- User clicks LIVE/PAUSED indicator → `isPaused = true`, `pauseSnapshot = [...rows]` (snapshot current rows)
- New rows still arrive in `rows` via `useActivityLog` but table shows `pauseSnapshot`
- Refresh icon appears (`display: block` instead of `none`)

**Resume (back to LIVE):**
- User clicks LIVE/PAUSED indicator again → `isPaused = false`, `pauseSnapshot = null`
- Table immediately shows live `rows` (no lag)

**Manual refresh while paused:**
- User clicks Refresh icon (`activity-btn-refresh`)
- `setIsManualRefreshing(true)`
- Call `fetchActivityRows({ take: 200 })` directly (not via `clearRows`/SignalR)
- On resolve: update `pauseSnapshot` with freshly fetched rows; `setIsManualRefreshing(false)`
- On error: `setIsManualRefreshing(false)`; log error

**`prefers-reduced-motion`:**
```typescript
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
// In JSX: apply spin animation class only if !prefersReducedMotion
className={`bi bi-arrow-clockwise ${isManualRefreshing && !prefersReducedMotion ? "spin" : ""}`}
```

**Settings interval disabled case (EXPERIENCE.md):**
If the auto-refresh interval is set to "Disabled" in Settings → Activity:
- LIVE/PAUSED indicator shows "PAUSED" state, `aria-disabled="true"`, `cursor: not-allowed`
- Do NOT use HTML `disabled` attribute — use `aria-disabled` + suppress click/keyboard in JS
- Element must remain in tab order and be discoverable by screen readers
- Screen reader announcement: "Refresh paused (disabled)"
- Refresh icon is always visible in this mode

**Navigate away and return:** `isPaused` is component-local state → resets to `false` (LIVE) automatically when navigating back to `/activity` and remounting.

### Auto-Refresh Interval — Settings Persistence

The auto-refresh interval is a **client-side preference** stored in `localStorage` under key `"fishtank-activity-settings"`. No new backend endpoint needed.

```typescript
// src/client/src/features/settings/hooks/useActivitySettings.ts
interface ActivitySettings {
  autoRefreshInterval: 1000 | 2000 | 5000 | "disabled"; // ms or "disabled"
}
const DEFAULT_ACTIVITY_SETTINGS: ActivitySettings = { autoRefreshInterval: 2000 };
const STORAGE_KEY = "fishtank-activity-settings";

export function useActivitySettings() {
  const [settings, setSettings] = useState<ActivitySettings>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : DEFAULT_ACTIVITY_SETTINGS;
    } catch { return DEFAULT_ACTIVITY_SETTINGS; }
  });

  function updateInterval(value: ActivitySettings["autoRefreshInterval"]) {
    const next = { ...settings, autoRefreshInterval: value };
    setSettings(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  return { settings, updateInterval };
}
```

**How `ActivityPage` consumes the interval:**
- Read `autoRefreshInterval` from `useActivitySettings()` (or a simpler `useActivitySettingsStore`)
- If interval !== "disabled" AND `isPaused === false`: use `useInterval(interval, () => { ... refresh logic ... })` or a `useEffect` with `setInterval`
- If "disabled": start in PAUSED state, `aria-disabled` on LIVE/PAUSED button
- The periodic re-fetch (when interval is set) calls `fetchActivityRows()` and replaces rows — but since `useActivityLog` owns rows state via SignalR append, the periodic refresh should call `refreshRows()` (see below)

**`useActivityLog` update — expose `refreshRows`:**
Add a `refreshRows` function to `useActivityLog` that re-fetches all rows and replaces state (complements the append-only SignalR):

```typescript
// Add to useActivityLog.ts
async function refreshRows() {
  try {
    const freshRows = await fetchActivityRows({ take: 200 });
    if (mounted) setRows(freshRows);
  } catch (err) {
    console.error("Failed to refresh activity rows:", err);
  }
}
return { rows, clearRows, refreshRows, isLoading, hadRows };
```

**Note:** `useActivityLog` needs the `mounted` ref accessible from `refreshRows`. Refactor using a `mountedRef` ref so `refreshRows` can close over it:

```typescript
const mountedRef = useRef(true);
useEffect(() => {
  mountedRef.current = true;
  return () => { mountedRef.current = false; };
}, []);
// Replace internal `mounted` bool with `mountedRef.current` checks
async function refreshRows() {
  const fresh = await fetchActivityRows({ take: 200 });
  if (mountedRef.current) setRows(fresh);
}
```

### Service Dropdown Hydration

The service dropdown must show all services. Use `useQueryClient().getQueryData<ServiceStatus[]>(["services"])` to read from React Query cache — same pattern as the amber border highlight. Do NOT call `useServices()` hook or trigger a new fetch.

```typescript
// In ActivityPage
const queryClient = useQueryClient();
const cachedServices = queryClient.getQueryData<Array<{ id: string; name: string }>>(["services"]) ?? [];
// Populate <select>:
// <option value="all">All Services</option>
// {cachedServices.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
```

### Type Filter UI (EXPERIENCE.md)

The type filter button `activity-btn-type-filter` shows a dropdown with **two checkboxes**: Mocked / Proxied. Button label reflects state:
- Both checked or both unchecked → "All" (default)
- Only Mocked checked → "Mocked only"
- Only Proxied checked → "Proxied only"

The `data-testid` canon:
- `activity-btn-type-filter` — the trigger button
- `activity-checkbox-type-mocked` — Mocked checkbox (already exists as stub)
- Add `activity-checkbox-type-proxied` — Proxied checkbox (missing from 3.2 stubs)

Implement as a controlled popover/dropdown. Use shadcn Popover or a simple `useRef` + portal approach, consistent with `ProxyCounterPill`'s popover pattern.

### Clear Log Flow

```typescript
// In ActivityPage
async function handleClearLog() {
  await apiFetch("/api/activity", { method: "DELETE" });
  clearRows(); // sets rows = [] in useActivityLog
  if (isPaused) setPauseSnapshot([]); // also clear the snapshot
}
```

No confirmation dialog. No loading state required (but disabling the button during the call is good UX). Proxy counter pill resets automatically because it reads from `rows` which is now `[]`.

The `clearActivityLog()` helper belongs in `src/client/src/features/activity/api.ts`:
```typescript
export async function clearActivityLog(): Promise<void> {
  await apiFetch<null>("/api/activity", { method: "DELETE" });
}
```

### ActivitySettings Component

New file: `src/client/src/features/settings/components/ActivitySettings.tsx`

```
Settings → Activity section renders:

1. Auto-refresh interval
   Label: "Auto-refresh interval"
   Control: <select data-testid="settings-select-activity-refresh-interval">
     <option value="1000">1 second</option>
     <option value="2000">2 seconds (default)</option>
     <option value="5000">5 seconds</option>
     <option value="disabled">Disabled</option>
   </select>
   Persisted in localStorage via useActivitySettings().updateInterval()

2. Max log entries per service
   Label: "Max log entries per service"
   Control: <select data-testid="settings-select-activity-max-entries">
     <option value="500">500</option>
     <option value="1000">1 000 (default)</option>
     <option value="5000">5 000</option>
   </select>
   For v1: display the value but note this is configurable via FISHTANK_ACTIVITY_LOG_MAX_ROWS env var.
   Persist selection in localStorage (display-only — does not call a backend API; backend uses env var).
   Add explanatory helper text: "To change the runtime maximum, set FISHTANK_ACTIVITY_LOG_MAX_ROWS in docker-compose.yml."

3. Sensitive header redaction
   Label: "Capture full request headers"
   Sub-label: "Disables redaction of Authorization, Cookie, and other sensitive headers"
   Control: <input type="checkbox" data-testid="settings-toggle-capture-full-headers" />
   Reads captureFullHeaders from GET /api/settings (via useAppSettings)
   On change: calls PUT /api/settings/capture-headers with { enabled: !current }
   Show loading spinner on checkbox while mutation is in-flight
   On success: invalidate APP_SETTINGS_QUERY_KEY in React Query
```

**Wire into SettingsPage.tsx:**
```tsx
// In SettingsPage.tsx, replace the activity placeholder:
} : active === "activity" ? (
  <ActivitySettings />
) : active === "cache" ? (
```

---

## Acceptance Criteria

**AC-1 — Search filters URL path and method (FR-8):**
**Given** the search field (`data-testid="activity-input-search"`) and rows in the table,
**When** a query is typed,
**Then** only rows where `urlPath` OR `method` label contains the query (case-insensitive, OR logic) are shown; the full `urlPath` value is searched (not the truncated display); typing "post" returns both POST-method rows and rows where the path contains "post".
**And** the proxy counter pill always shows the count from the full unfiltered `rows` — not `filteredRows`.

**AC-2 — Service filter (FR-8):**
**Given** the Service dropdown (`data-testid="activity-select-service"`) populated from React Query cache,
**When** a specific service is selected,
**Then** only rows where `serviceId` matches the selected service are shown; switching back to "All Services" shows all rows.

**AC-3 — Type filter with checkboxes (FR-8):**
**Given** the Type filter button (`data-testid="activity-btn-type-filter"`),
**When** clicked,
**Then** a dropdown opens showing two checkboxes: Mocked (`data-testid="activity-checkbox-type-mocked"`) and Proxied (`data-testid="activity-checkbox-type-proxied"`); the button label reflects the current state ("All" / "Mocked only" / "Proxied only").
**And** the filter is applied immediately on checkbox change without requiring a separate "Apply" step.

**AC-4 — AND logic across filters (FR-8):**
**Given** multiple filters active simultaneously (e.g. service filter + type filter + search),
**Then** all filters are applied with AND logic — a row must satisfy ALL active filters to appear in the table.

**AC-5 — Clear filters resets all filters and sort (FR-8):**
**Given** the Clear filters button (`data-testid="activity-btn-clear-filters"`),
**When** clicked,
**Then** search query clears, service filter resets to "All Services", type filter resets to "All", and sort resets to DateTime descending (newest first — the default).

**AC-6 — Column sort (EXPERIENCE.md):**
**Given** column headers for Method, URL Path, Status, Service, `ms`, and DateTime,
**When** a header is clicked,
**Then** sort cycles: unsorted → ascending → descending → unsorted; a sort indicator (up/down arrow or class) appears in the active header; only one column may be sorted at a time; clicking a different column resets the previous sort; Type and Actions column headers do NOT have sort indicators.
**And** the default sort (no column selected) is DateTime descending.

**AC-7 — LIVE indicator shows live state; PAUSED freezes display (FR-11):**
**Given** the LIVE/PAUSED indicator (`data-testid="activity-btn-live-paused"`),
**When** the indicator shows "LIVE",
**Then** new rows from SignalR `ActivityRowAdded` are immediately prepended to the table (inherited from Story 3.2).
**When** the indicator is clicked (toggled to PAUSED),
**Then** the table freezes at the current snapshot; new SignalR arrivals do NOT appear in the table until LIVE is re-enabled; the state label changes to "PAUSED"; the Refresh icon (`data-testid="activity-btn-refresh"`) becomes visible.
**When** the indicator is clicked again (back to LIVE),
**Then** the table shows the current live `rows`; the Refresh icon is hidden.

**AC-8 — Manual refresh when paused (FR-11):**
**Given** the activity log is in PAUSED state and the Refresh icon (`data-testid="activity-btn-refresh"`) is visible,
**When** the icon is clicked,
**Then** `GET /api/activity` is called (direct `fetchActivityRows`, not `useQuery`); the icon rotates (`animation: spin 1s linear infinite`) during the fetch and becomes `pointer-events: none`; on completion, the table updates to the freshly fetched rows; the icon stops rotating.
**And** when `prefers-reduced-motion: reduce` is active, the icon does NOT rotate — it remains static during the fetch.

**AC-9 — Settings → Activity: disabled interval sets PAUSED (FR-11):**
**Given** the auto-refresh interval in Settings → Activity is set to "Disabled",
**When** the user navigates to the Network Activity page,
**Then** the LIVE/PAUSED indicator shows "PAUSED" state; the indicator has `aria-disabled="true"` (NOT the HTML `disabled` attribute) and `cursor: not-allowed`; clicking/keyboard activation has no effect; the Refresh icon is always visible; screen readers announce the element as "Refresh paused (disabled)".

**AC-10 — Clear log calls DELETE /api/activity and resets state (FR-13):**
**Given** the Clear log button (`data-testid="activity-btn-clear-log"`),
**When** clicked (no confirmation required),
**Then** `DELETE /api/activity` is called via `clearActivityLog()` in `api.ts`; on success: `clearRows()` is called (sets `rows = []`); if the log was paused, the pause snapshot is also cleared; the table shows the "Log cleared" empty state; the proxy counter pill resets to "Proxied: 0"; Record mode remains active if running (FR-13).

**AC-11 — Settings → Activity section is implemented (FR-11, FR-10):**
**Given** the Settings page, Network Activity sub-section,
**When** the user navigates to Settings → Network Activity,
**Then** three controls are present:
1. "Auto-refresh interval" select (`data-testid="settings-select-activity-refresh-interval"`) with options: 1s, 2s (default), 5s, Disabled; selection is persisted in `localStorage` and respected by `ActivityPage`
2. "Max log entries per service" select (`data-testid="settings-select-activity-max-entries"`) with options: 500, 1000 (default), 5000; persisted in `localStorage`; helper text notes it can be overridden via `FISHTANK_ACTIVITY_LOG_MAX_ROWS`
3. "Capture full request headers" checkbox (`data-testid="settings-toggle-capture-full-headers"`); reads from `GET /api/settings` (`captureFullHeaders` field); toggling calls `PUT /api/settings/capture-headers`; invalidates React Query `APP_SETTINGS_QUERY_KEY` on success.

**AC-12 — Proxy counter unaffected by filters (FR-8, FR-12):**
**Given** active filters that reduce the visible rows in the table,
**Then** the proxy counter pill (`data-testid="activity-pill-proxy-count"`) and its popover always reflect the full unfiltered `rows` — not the `filteredRows` passed to `ActivityTable`.

---

## Tasks / Subtasks

### Frontend

- [ ] **Task F1: Add `clearActivityLog` and `refreshRows` to api.ts / useActivityLog.ts** (AC: 8, 10)
  - [ ] Add to `src/client/src/features/activity/api.ts`:
    ```typescript
    export async function clearActivityLog(): Promise<void> {
      await apiFetch<null>("/api/activity", { method: "DELETE" });
    }
    ```
  - [ ] Update `src/client/src/features/activity/useActivityLog.ts`:
    - Replace internal `mounted` boolean with `mountedRef = useRef(true)` (set true on mount, false on unmount)
    - Add exported `refreshRows(): Promise<void>` that calls `fetchActivityRows({ take: 200 })` and sets `rows` if `mountedRef.current`
    - Return `refreshRows` from the hook alongside existing `{ rows, clearRows, isLoading, hadRows }`

- [ ] **Task F2: Filter and sort state in ActivityPage** (AC: 1–6, 12)
  - [ ] Add to `ActivityPage.tsx`:
    - `searchQuery`, `setSearchQuery` — string, initial ""
    - `selectedServiceId`, `setSelectedServiceId` — string, initial `"all"`
    - `typeFilter`, `setTypeFilter` — `"all" | "mocked" | "proxied"`, initial `"all"`
    - `sort`, `setSort` — `{ column: SortableColumn | null; direction: "asc" | "desc" | null }`, initial `{ column: null, direction: null }`
    - `filteredRows` — `useMemo` over `rows` applying search + service + type + sort (see Context)
    - `isPaused`, `setIsPaused`, `pauseSnapshot`, `setPauseSnapshot`
    - `isManualRefreshing`, `setIsManualRefreshing`
  - [ ] `sourceRows = isPaused && pauseSnapshot ? pauseSnapshot : rows`
  - [ ] Apply filters + sort to `sourceRows` to produce `filteredRows` passed to `ActivityTable`
  - [ ] `ProxyCounterPill` continues to receive unfiltered `rows` (NOT `filteredRows` or `sourceRows`)
  - [ ] `handleClearFilters()` resets all filter state + sort to defaults

- [ ] **Task F3: Wire toolbar controls** (AC: 1–5)
  - [ ] Enable `activity-input-search`: remove `disabled`, attach `value={searchQuery}` + `onChange`; add clear (×) button on right per EXPERIENCE.md (`aria-label="Clear search"`)
  - [ ] Enable `activity-select-service`: remove `disabled`; populate `<option>` list from `queryClient.getQueryData(["services"])` (do NOT call `useServices()` hook); attach `value={selectedServiceId}` + `onChange`
  - [ ] Enable `activity-btn-type-filter`: remove `disabled`; implement controlled popover with Mocked / Proxied checkboxes; update button label to reflect state; add `activity-checkbox-type-proxied` checkbox (was missing in 3.2 stubs)
  - [ ] Enable `activity-btn-clear-filters`: remove `disabled`; attach `onClick={handleClearFilters}`
  - [ ] Leave `activity-btn-columns` as a stub (Story 3.4 or deferred — columns selector is complex; confirm if in scope); if not wiring, note this is deferred

- [ ] **Task F4: Wire LIVE/PAUSED and manual refresh** (AC: 7–9)
  - [ ] Read `autoRefreshInterval` from `useActivitySettings().settings.autoRefreshInterval`
  - [ ] If `autoRefreshInterval === "disabled"`: render LIVE/PAUSED button with `aria-disabled="true"`, suppress click/keyboard events, label "PAUSED", cursor not-allowed; Refresh icon always visible
  - [ ] Else: render LIVE/PAUSED button as fully interactive toggle
    - On toggle to PAUSED: `setIsPaused(true)`, `setPauseSnapshot([...rows])`
    - On toggle to LIVE: `setIsPaused(false)`, `setPauseSnapshot(null)`
  - [ ] Refresh icon (`activity-btn-refresh`):
    - Visible when `isPaused === true || autoRefreshInterval === "disabled"`
    - `pointer-events: none` and spin animation while `isManualRefreshing`
    - `onClick={handleManualRefresh}` where `handleManualRefresh` sets `isManualRefreshing=true`, calls `refreshRows()`, updates `pauseSnapshot`, sets `isManualRefreshing=false`
    - Spin CSS: add `.spin { animation: spin 1s linear infinite; }` and `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }` (or Tailwind `animate-spin`)
    - `prefers-reduced-motion`: check `window.matchMedia("(prefers-reduced-motion: reduce)").matches` — do NOT apply spin class if true
  - [ ] LIVE button label: "LIVE" with green dot (`inline-flex w-2 h-2 rounded-full bg-green-500`); PAUSED label: "PAUSED" (remove green dot or use muted dot)

- [ ] **Task F5: Wire Clear log button** (AC: 10)
  - [ ] Remove `disabled` from `activity-btn-clear-log`
  - [ ] Add `onClick={handleClearLog}` which:
    1. Calls `clearActivityLog()` from `api.ts` (`DELETE /api/activity`)
    2. On success: calls `clearRows()`; if `isPaused`, also `setPauseSnapshot([])`
    3. Disable button while in-flight (optional loading state)
  - [ ] No confirmation dialog required (FR-13 explicit)

- [ ] **Task F6: Column sort props for ActivityTable** (AC: 6)
  - [ ] Update `ActivityTableProps` to add:
    ```typescript
    sort: { column: SortableColumn | null; direction: "asc" | "desc" | null };
    onSort: (column: SortableColumn) => void;
    ```
  - [ ] In `ActivityTable.tsx`, render sort indicators in column headers (up/down arrows or classes) based on `sort` prop
  - [ ] Call `onSort(column)` on column header click
  - [ ] Type and Actions column headers: no sort indicator, no `onSort` call
  - [ ] In `ActivityPage.tsx`, implement `handleSort(column: SortableColumn)`:
    ```typescript
    setSort(prev => {
      if (prev.column !== column) return { column, direction: "asc" };
      if (prev.direction === "asc") return { column, direction: "desc" };
      return { column: null, direction: null }; // back to default
    });
    ```

- [ ] **Task F7: ActivitySettings component** (AC: 11)
  - [ ] Create `src/client/src/features/settings/hooks/useActivitySettings.ts`
    - Reads/writes `localStorage["fishtank-activity-settings"]`
    - Exports `{ settings: ActivitySettings, updateInterval, updateMaxEntries }`
    - `ActivitySettings`: `{ autoRefreshInterval: 1000 | 2000 | 5000 | "disabled"; maxEntries: 500 | 1000 | 5000 }`
    - Default: `{ autoRefreshInterval: 2000, maxEntries: 1000 }`
  - [ ] Create `src/client/src/features/settings/components/ActivitySettings.tsx`
    - Three controls per spec (see Context → ActivitySettings Component section above)
    - For redaction toggle: use `useAppSettings()` for current value; call `useMutation` or direct `apiFetch` on toggle; invalidate `APP_SETTINGS_QUERY_KEY`
    - Add `data-testid` attributes as specified
  - [ ] Update `src/client/src/features/settings/pages/SettingsPage.tsx`
    - Import `ActivitySettings`
    - Replace `} : (` with `} : active === "activity" ? ( <ActivitySettings /> ) : active === "cache" ? (`

- [ ] **Task F8: Update MSW handler** (AC: 10)
  - [ ] Update `src/client/src/test/msw/handlers.ts`
  - [ ] Add `http.delete("/api/activity", () => HttpResponse.json({ success: true, data: null }))` (or equivalent MSW v2 syntax)
  - [ ] Add `http.put("/api/settings/capture-headers", () => HttpResponse.json({ success: true, data: { captureFullHeaders: true } }))` if not already present

### Integration Tests (Backend)

- [ ] **Task T1: Filter by service integration test** (AC: 2) — P1
  - [ ] Add to `src/Fishtank.Api.IntegrationTests/Api/Story3_3_ActivityFilterTests.cs`
  - [ ] Seed 3 rows for service A, 2 rows for service B
  - [ ] `GET /api/activity?serviceId={serviceA.Id}` → assert 3 rows returned, all `ServiceId == serviceA.Id`

- [ ] **Task T2: Filter by type integration test** (AC: 3) — P1
  - [ ] `GET /api/activity?type=Mocked` → assert all rows have `Type == "Mocked"`
  - [ ] `GET /api/activity?type=Proxied` → assert all rows have `Type == "Proxied"`

- [ ] **Task T3: Filter by search integration test** (AC: 1) — P1
  - [ ] Seed row with `UrlPath = "/api/payment/process"` and row with `Method = "POST"` and path `"/health"`
  - [ ] `GET /api/activity?search=payment` → first row returned (path match)
  - [ ] `GET /api/activity?search=post` → both rows returned (method match + path match)
  - [ ] Assert case-insensitive: `search=PAYMENT` returns same as `search=payment`

- [ ] **Task T4: DELETE /api/activity clears all rows** (AC: 10) — P0
  - [ ] Add to `Story3_3_ActivityFilterTests.cs`
  - [ ] Seed 5 rows; `DELETE /api/activity` → 204/200; `GET /api/activity` → 0 rows

### Component Tests (Frontend Vitest + RTL)

- [ ] **Task T5: Filter controls component tests** (AC: 1–4) — P1
  - [ ] Add to `src/client/src/features/activity/__tests__/ActivityFilters.test.tsx`
  - [ ] Test: typing in search input filters displayed rows by URL path (case-insensitive)
  - [ ] Test: typing in search input filters displayed rows by method
  - [ ] Test: selecting a service in dropdown shows only that service's rows
  - [ ] Test: selecting "Mocked only" type filter shows only Mocked rows
  - [ ] Test: selecting "Proxied only" type filter shows only Proxied rows
  - [ ] Test: all filters simultaneously (AND logic) — only rows matching all filters shown
  - [ ] Test: clicking "Clear filters" resets all filters to default

- [ ] **Task T6: Clear filters resets sort** (AC: 5) — P1
  - [ ] Test: apply a sort (Method ascending), then "Clear filters" → sort indicator removed, rows back to DateTime descending default

- [ ] **Task T7: Column sort tests** (AC: 6) — P1
  - [ ] Test: clicking "Method" header once → rows sorted ascending by method
  - [ ] Test: clicking "Method" header twice → rows sorted descending
  - [ ] Test: clicking "Method" header three times → unsorted (DateTime descending default)
  - [ ] Test: clicking "Status" header while "Method" is sorted → only "Status" is active; "Method" sort is cleared

- [ ] **Task T8: LIVE/PAUSED toggle test** (AC: 7) — P1
  - [ ] Test: initial state = LIVE; clicking LIVE/PAUSED → shows PAUSED, Refresh icon appears
  - [ ] Test: while PAUSED, new row added to `rows` state → table does NOT update
  - [ ] Test: clicking PAUSED → LIVE; table updates to show new rows

- [ ] **Task T9: Manual refresh test** (AC: 8) — P1
  - [ ] Test: while PAUSED, click Refresh → `fetchActivityRows` called (mock MSW); table updates after resolve; isManualRefreshing transitions true→false
  - [ ] Test: `prefers-reduced-motion: reduce` → Refresh icon does NOT get spin class during fetch

- [ ] **Task T10: Proxy counter unaffected by filters** (AC: 12) — P1
  - [ ] Test: 5 proxied rows total; apply service filter that matches only 2; `ProxyCounterPill` still shows 5

- [ ] **Task T11: ActivitySettings component test** (AC: 11) — P1
  - [ ] Test: renders auto-refresh interval select with options 1s/2s/5s/Disabled
  - [ ] Test: changing interval persists to localStorage
  - [ ] Test: redaction toggle calls `PUT /api/settings/capture-headers` with correct body

- [ ] **Task T12: Clear log component test** (AC: 10) — P0
  - [ ] Test: clicking "Clear log" → `DELETE /api/activity` called (MSW handler); table shows "Log cleared" empty state; proxy counter shows 0

### E2E Tests (Playwright)

- [ ] **Task T13: Filter by service E2E** (AC: 2) — P1
  - [ ] File: `src/client/e2e/story-3-3-activity-filters.spec.ts`
  - [ ] Navigate to `/activity`; send traffic to service A and service B
  - [ ] Select service A in dropdown → assert only service A rows visible
  - [ ] Select "All Services" → assert all rows visible

- [ ] **Task T14: Clear log E2E** (AC: 10) — P0
  - [ ] Navigate to `/activity` with rows present
  - [ ] Click `[data-testid="activity-btn-clear-log"]`
  - [ ] Assert `[data-testid^="activity-row-"]` count = 0
  - [ ] Assert proxy counter pill shows "Proxied: 0"

---

## Dependencies

- **Story 3.1 (done):** `DELETE /api/activity`, `GET /api/activity?search=&type=&serviceId=` — all exist and working
- **Story 3.2 (done):** `ActivityPage`, `ActivityTable`, `useActivityLog`, `ProxyCounterPill`, all stubs with correct `data-testid` — this story activates them
- **Story 2.5 (done):** `PUT /api/settings/capture-headers`, `GET /api/settings` (`captureFullHeaders` field) — used for redaction toggle in ActivitySettings
- **Epic 1 Story 1.3 (done):** `lib/api.ts` (`apiFetch`), `lib/signalr.ts` (`createHubConnection`), React Query setup

---

## Dev Notes

### Architecture Constraints — Mandatory

- **No new API endpoints for auto-refresh interval or max log entries** — these are client-side preferences, stored in `localStorage`. The backend's `FISHTANK_ACTIVITY_LOG_MAX_ROWS` env var controls the runtime cap; the Settings UI merely displays the configured value.
- **Proxy counter MUST always use unfiltered `rows`** — `ProxyCounterPill` receives `rows` from `useActivityLog`, never `filteredRows`.
- **No React Query for activity data** — the `// DO NOT useQuery here` constraint from Story 3.2 is unchanged. `refreshRows()` uses direct `apiFetch`, not `useQuery`.
- **Feature folder self-containment** — `features/activity/` must not import from `features/settings/` or `features/services/`. Service list for the dropdown comes from React Query cache (`getQueryData(["services"])`), not from importing service hooks.
- **HTML `disabled` vs `aria-disabled`** — for the LIVE/PAUSED button when interval is "disabled": use `aria-disabled="true"` + JS event suppression. Do NOT use the HTML `disabled` attribute (it removes the element from tab order).
- **Never `window.matchMedia` in a test environment** — mock it: `Object.defineProperty(window, 'matchMedia', { value: jest.fn().mockReturnValue({ matches: false }) })` in test setup.

### ActivityTable Prop Changes

Story 3.2's `ActivityTable` signature: `{ rows: ActivityRow[], hadRows: boolean }`.

This story adds:
```typescript
interface ActivityTableProps {
  rows: ActivityRow[];           // NOW receives filteredRows (not all rows)
  hadRows: boolean;
  sort: { column: SortableColumn | null; direction: "asc" | "desc" | null };
  onSort: (column: SortableColumn) => void;
}
```

Existing tests in `ActivityTable.test.tsx` must be updated to pass the new required props (supply `sort={{ column: null, direction: null }}` and `onSort={() => {}}` as minimal values).

### Sorting in ActivityPage, not ActivityTable

Sorting comparisons happen in `ActivityPage`'s `useMemo` (the `filteredRows` derivation). `ActivityTable` only renders indicators and fires `onSort` callbacks — it does not sort internally. This keeps the table as a pure display component.

### Integration Test File Pattern

From prior stories: integration tests follow `Story{Epic}_{Story}_{Description}Tests.cs` naming. For Story 3.3:
- `src/Fishtank.Api.IntegrationTests/Api/Story3_3_ActivityFilterTests.cs`

Use the existing `WebApplicationFactory<Program>` pattern. Seed `ActivityRow` objects via `IActivityService.CaptureAsync()` or directly via `ActivityStore` if accessible.

### Settings → Activity: Row Detail Style Preference

EXPERIENCE.md mentions a "Row detail style preference" (Modal / Right Drawer / Bottom Panel) in Settings → Activity. **This is deferred to Story 3.4** (which implements row detail). Do NOT add the row detail style control in this story. Add a `// TODO: Story 3.4 — add row detail style selector here` comment in `ActivitySettings.tsx`.

### Columns Selector (`activity-btn-columns`)

The Columns selector (show/hide columns) is in scope per EXPERIENCE.md but complex (requires per-column visibility state, DataTable colgroup updates). If it cannot be cleanly delivered within story scope, keep it as a disabled stub and note it as deferred. **Minimum required for AC-16**: the `data-testid="activity-btn-columns"` element must be present (already is from 3.2).

### LIVE/PAUSED Aria Pattern (Exact)

Per EXPERIENCE.md exact wording for screen reader: "Refresh paused (disabled)" when interval = "disabled". Implement via `aria-label` on the button:
```tsx
aria-label={autoRefreshInterval === "disabled" ? "Refresh paused (disabled)" : (isPaused ? "Resume auto-refresh" : "Pause auto-refresh")}
```

### MSW handler for `clearActivityLog`

Check whether `http.delete` is already registered in `handlers.ts` for the activity endpoint. If Story 3.2 only added a `http.get` handler, add the delete handler now.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.3]
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-Fishtank-2026-06-04/EXPERIENCE.md#Network Activity screen]
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-Fishtank-2026-06-04/EXPERIENCE.md#Settings screen (Network Activity section)]
- [Source: _bmad-output/test-artifacts/test-design-epic-3.md#Story 3-3 test coverage]
- [Source: _bmad-output/implementation-artifacts/3-2-network-activity-page-real-time-log-display.md]
- [Source: src/client/src/features/activity/pages/ActivityPage.tsx — current stub state]
- [Source: src/client/src/features/activity/useActivityLog.ts — hook interface]
- [Source: src/client/src/features/activity/api.ts — existing API helpers]
- [Source: src/Fishtank.Api/Endpoints/ActivityEndpoints.cs — DELETE /api/activity]
- [Source: src/Fishtank.Api/Endpoints/SettingsEndpoints.cs — PUT /api/settings/capture-headers]
- [Source: src/client/src/features/settings/pages/SettingsPage.tsx — activity placeholder]
- [Source: src/client/src/features/settings/hooks/useAppSettings.ts — APP_SETTINGS_QUERY_KEY]

---

## Dev Agent Record

### Agent Model Used

_To be filled by dev agent_

### Debug Log References

### Completion Notes List

### File List
