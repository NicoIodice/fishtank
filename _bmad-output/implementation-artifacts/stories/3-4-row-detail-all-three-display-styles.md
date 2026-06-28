---
story_id: "3.4"
story_key: "3-4-row-detail-all-three-display-styles"
epic: 3
story_title: "Row Detail — All Three Display Styles"
status: Done
priority: high
frs_covered:
  - FR-9
ux_drs_covered:
  - UX-DR5 (app shell layout, Settings sub-nav)
  - UX-DR6 (canonical responsive breakpoints, mobile override)
  - UX-DR11 (DataTable row-detail variants, keyboard navigation)
  - UX-DR12 (WCAG 2.1 AA spot-check — row detail surfaces)
  - UX-DR14 (z-index stack — drawer, modal, bottom panel)
nfrs_addressed:
  - NFR-4 (10,000 rows at 60fps — virtual scrolling already in place)
  - NFR-19 (keyboard navigation — arrow keys move row focus, Enter opens detail)
  - NFR-20 (WCAG 2.1 AA spot-check on row detail components)
  - NFR-21 (prefers-reduced-motion — no animations on row detail transitions)
---

# Story 3.4: Row Detail — All Three Display Styles

## Story

**As a** developer,
**I want** to open full request/response detail for any activity log row in my preferred display style,
**So that** I can inspect headers, bodies, and metadata to diagnose matching behavior.

---

## Status

Done

---

## Context

### Background

Stories 3.1–3.3 delivered the complete **Network Activity page** infrastructure:
- **3.1:** Backend request capture, header redaction, `ActivityHub` SignalR push
- **3.2:** Real-time log display, `ActivityTable` with virtual scrolling (@tanstack/react-virtual), method chips, type icons, row highlights, `ProxyCounterPill`
- **3.3:** Client-side filtering, sorting, LIVE/PAUSED toggle, manual refresh, Clear log, Settings → Activity section

The `ActivityTable` from Story 3.2 is fully functional for row display and keyboard navigation (ArrowUp/ArrowDown moves focus). **Story 3.4 activates the row detail overlay** — clicking a row (or pressing Enter when focused) opens the detail panel.

Epic 2 Story 2.3 established the **`<DataTable>` base component** with row-detail style variant stubs (Modal, Right Drawer, Bottom Panel props). Story 3.4 **activates all three variants** for the activity log context.

### What Exists (from previous stories)

**Activity feature files (`src/client/src/features/activity/`):**
- `types.ts` — `ActivityRow`, `ActivityType`, `ActivityQueryParams`
- `api.ts` — `fetchActivityRows()`, `clearActivityLog()`
- `useActivityLog.ts` — SignalR append-only hook with `rows`, `clearRows`, `refreshRows`, `isLoading`, `hadRows`
- `ActivityTable.tsx` — Virtual scrolling table with keyboard navigation
- `MethodChip.tsx`, `TypeIcon.tsx`, `ProxyCounterPill.tsx`
- `pages/ActivityPage.tsx` — Full page with filters, controls, toolbar

**Activity types already defined (`types.ts`):**
```typescript
export interface ActivityRow {
  id: string;              // Request ID (GUID)
  serviceId: string;
  serviceName: string;
  servicePort: number;
  method: string;          // GET, POST, PUT, DELETE, PATCH, etc.
  urlPath: string;
  statusCode: number;
  type: ActivityType;      // "mocked" | "proxied"
  timestamp: string;       // ISO 8601
  durationMs: number;
  requestHeaders: Record<string, string>;  // redacted per settings
  requestBody: string | null;
  responseHeaders: Record<string, string>;
  responseBody: string | null;
}
```

**Settings feature files (`src/client/src/features/settings/`):**
- `pages/SettingsPage.tsx` — Settings layout with sub-nav
- `components/AppearanceSettings.tsx` — Theme selector (from Story 1.4)
- `hooks/useAppSettings.ts` — React Query for `GET /api/settings`

**Shared components (`src/client/src/components/shared/`):**
- `Modal.tsx` — shadcn-based modal (established in Epic 1)
- No Drawer or BottomPanel components yet — must be created in this story

### What This Story Delivers

1. **Row detail components** — `RowDetailModal`, `RowDetailDrawer`, `RowDetailPanel`
2. **Row detail style preference** — Settings → Appearance → "Row detail style" segmented button group
3. **Keyboard and click activation** — Enter on focused row or click opens detail
4. **Mobile override logic** — Always Modal below 640px regardless of preference
5. **"Save as Mock" button** — Rendered for proxied rows, disabled placeholder until Epic 4

---

## Acceptance Criteria

### AC-1: Row Detail Opens on Click or Enter
**Given** clicking any row (or pressing Enter when keyboard-focused),
**When** the row detail opens,
**Then** it displays: request ID (GUID), DateTime (ISO 8601), HTTP method, URL path, Service name and port, Type, HTTP status, request headers (`[REDACTED]` for redacted values), request body, response headers, response body (FR-9).

### AC-2: Three Display Styles
**Given** the user's row detail style preference (default: Modal),
**Then** the correct style renders:
- **Modal:** centered overlay, max-width 560px, backdrop (`rgba(0,0,0,.5)`), focus-trapped, Esc to close
- **Right Drawer:** 320px from right edge, slides in, Esc to close, click outside to close
- **Bottom Panel:** bottom half with Request/Response tabs, close collapses panel

Modal and Right Drawer use a single scrollable section; Bottom Panel uses tabs (FR-9, UX-DR11).

### AC-3: Right Drawer Updates In-Place
**Given** the Right Drawer is open and a different row is activated,
**Then** the drawer updates in-place without closing — new row data replaces the previous.

### AC-4: Bottom Panel Close Clears Selection
**Given** the Bottom Panel is open and the user clicks the Close button,
**Then** the panel collapses **and** the selected table row is cleared (no highlight). The user must click a row again to reopen.

### AC-5: Save as Mock Placeholder
**Given** a proxied request in row detail,
**Then** a "Save as Mock" action (`bi-lightning-charge`, brand color) renders in the detail header — clicking it is a no-op placeholder until Epic 4 Story 4.4 wires the full behavior.

### AC-6: Mobile Override
**Given** viewport < 640px (mobile),
**Then** row detail is always shown as Modal, overriding the user's saved preference (FR-9, EXPERIENCE.md mobile override).

### AC-7: Virtual Scrolling Unaffected
**Given** the activity table with 10,000+ rows,
**When** the user scrolls or opens row detail,
**Then** scroll performance stays at or above 60fps using virtual scrolling (NFR-4).

### AC-8: Keyboard Navigation
**Given** keyboard navigation in the table,
**Then** arrow keys move row focus; Enter opens row detail; Tab moves between interactive elements (filters, headers, action icons) in logical order; all action icons have `aria-label` tooltips (NFR-19).

### AC-9: Settings Preference Persistence
**Given** Settings → Appearance → "Row detail style",
**Then** a segmented button group offers Modal / Right Drawer / Bottom Panel; selection is persisted in `localStorage` under key `fishtank-appearance-settings`; default is Modal.

### AC-10: WCAG Spot-Check
**Given** a Network Activity spot-check across all 4 themes,
**Then** row detail Modal, Drawer, and Panel all pass WCAG 2.1 AA contrast thresholds; headers `[REDACTED]` text is legible on all theme backgrounds (UX-DR12 spot-check).

---

## Tasks / Subtasks

- [x] **Task 1:** Create shared overlay components (AC: 2, 3, 4)
  - [x] 1.1 Create `src/client/src/components/shared/RightDrawer.tsx`
  - [x] 1.2 Create `src/client/src/components/shared/BottomPanel.tsx`
  - [x] 1.3 Verify z-index stack: drawer=50, modal backdrop=60, modal=70

- [x] **Task 2:** Create row detail content component (AC: 1, 5)
  - [x] 2.1 Create `src/client/src/features/activity/components/RowDetailContent.tsx`
  - [x] 2.2 Render all fields: request ID, DateTime, method, URL, service, port, type, status, headers, bodies
  - [x] 2.3 Render `[REDACTED]` for redacted header values
  - [x] 2.4 Pretty-print JSON bodies (if parseable, raw otherwise)
  - [x] 2.5 Render "Save as Mock" button for proxied rows (`bi-lightning-charge`, disabled placeholder)

- [x] **Task 3:** Create three row detail wrapper components (AC: 2, 3, 4)
  - [x] 3.1 Create `src/client/src/features/activity/components/RowDetailModal.tsx` — uses shared Modal, max-width 560px
  - [x] 3.2 Create `src/client/src/features/activity/components/RowDetailDrawer.tsx` — uses RightDrawer, 320px, updates in-place
  - [x] 3.3 Create `src/client/src/features/activity/components/RowDetailPanel.tsx` — uses BottomPanel, Request/Response tabs

- [x] **Task 4:** Add row detail style preference to Settings → Appearance (AC: 9)
  - [x] 4.1 Add `rowDetailStyle: "modal" | "drawer" | "panel"` to appearance settings type
  - [x] 4.2 Create segmented button group in `AppearanceSettings.tsx`
  - [x] 4.3 Persist to `localStorage` key `fishtank-appearance-settings`
  - [x] 4.4 Create `useRowDetailStyle()` hook to read preference

- [x] **Task 5:** Wire row detail activation in ActivityPage (AC: 1, 6, 7, 8)
  - [x] 5.1 Add `selectedRowId` state to `ActivityPage.tsx`
  - [x] 5.2 Pass `onRowClick` and `onRowKeyDown` props to `ActivityTable`
  - [x] 5.3 Wire Enter key to open detail for focused row
  - [x] 5.4 Implement mobile viewport detection (`< 640px`) for Modal override
  - [x] 5.5 Conditionally render correct detail component based on preference + viewport

- [x] **Task 6:** Add data-testid attributes for E2E testing (AC: 1, 2)
  - [x] 6.1 `activity-row-detail-modal`, `activity-row-detail-drawer`, `activity-row-detail-panel`
  - [x] 6.2 `activity-row-detail-close`, `activity-row-detail-save-mock`
  - [x] 6.3 `activity-row-detail-request-id`, `activity-row-detail-status-code`, etc.

- [x] **Task 7:** WCAG and accessibility (AC: 10, 8)
  - [x] 7.1 Add `role="dialog"`, `aria-modal`, `aria-labelledby` to Modal and Drawer
  - [x] 7.2 Add `role="region"`, `aria-label` to Bottom Panel
  - [x] 7.3 Trap focus in Modal; do NOT trap focus in Drawer (users can navigate table behind)
  - [x] 7.4 Verify `[REDACTED]` text contrast on all 4 themes

- [x] **Task 8:** Unit and component tests (AC: all)
  - [x] 8.1 Test `RowDetailContent` renders all fields correctly
  - [x] 8.2 Test Modal, Drawer, Panel each mount and unmount correctly
  - [x] 8.3 Test keyboard Enter opens detail
  - [x] 8.4 Test mobile override forces Modal
  - [x] 8.5 Test Settings preference persistence

---

## Dev Notes

### Architecture Patterns & Constraints

**Component hierarchy:**
```
ActivityPage
├── ActivityTable (virtual scroll, keyboard navigation)
│   └── rows → onClick / onKeyDown → setSelectedRowId
├── RowDetailModal (conditional on preference + viewport)
│   └── RowDetailContent
├── RowDetailDrawer (conditional on preference + viewport)
│   └── RowDetailContent
└── RowDetailPanel (conditional on preference + viewport)
    ├── TabBar (Request | Response)
    └── RowDetailContent (filtered by tab)
```

**State flow:**
```typescript
// In ActivityPage.tsx
const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
const { rowDetailStyle } = useRowDetailStyle(); // from Settings hook
const isMobile = useMediaQuery("(max-width: 639px)");
const effectiveStyle = isMobile ? "modal" : rowDetailStyle;

const selectedRow = rows.find(r => r.id === selectedRowId) ?? null;

// Conditional render
{effectiveStyle === "modal" && selectedRow && (
  <RowDetailModal row={selectedRow} onClose={() => setSelectedRowId(null)} />
)}
{effectiveStyle === "drawer" && selectedRow && (
  <RowDetailDrawer row={selectedRow} onClose={() => setSelectedRowId(null)} />
)}
{effectiveStyle === "panel" && selectedRow && (
  <RowDetailPanel row={selectedRow} onClose={() => setSelectedRowId(null)} />
)}
```

**Drawer update in-place behavior:**
The `RowDetailDrawer` component receives `row` as a prop. When `selectedRowId` changes, React re-renders with the new row — the drawer DOM element stays mounted, content updates. No close/open animation.

**Bottom Panel close clears selection:**
```typescript
// In RowDetailPanel
function handleClose() {
  onClose(); // This calls setSelectedRowId(null) in parent
}
```
The `onClose` callback in ActivityPage sets `selectedRowId = null`, which removes the highlight from the table.

### File Locations

**New files to create:**
```
src/client/src/
├── components/shared/
│   ├── RightDrawer.tsx          ← NEW: reusable right drawer overlay
│   └── BottomPanel.tsx          ← NEW: reusable bottom split panel
├── features/activity/
│   ├── components/
│   │   ├── RowDetailContent.tsx ← NEW: shared content renderer
│   │   ├── RowDetailModal.tsx   ← NEW: Modal wrapper
│   │   ├── RowDetailDrawer.tsx  ← NEW: Drawer wrapper
│   │   └── RowDetailPanel.tsx   ← NEW: Bottom panel wrapper
│   └── hooks/
│       └── useRowDetailStyle.ts ← NEW: reads preference from localStorage
├── features/settings/
│   └── components/
│       └── AppearanceSettings.tsx ← UPDATE: add row detail style selector
```

**Existing files to update:**
- `src/client/src/features/activity/pages/ActivityPage.tsx` — add selectedRowId state, render detail components
- `src/client/src/features/activity/ActivityTable.tsx` — add onRowClick, onRowKeyDown props
- `src/client/src/features/settings/components/AppearanceSettings.tsx` — add segmented button group

### z-index Stack (UX-DR14)

| Element | z-index | Use |
|---------|---------|-----|
| Sidebar | 20 | Main navigation |
| Top bar | 30 | Fixed header |
| Notification panel | 40 | Bell dropdown |
| **Right drawer** | **50** | Side drawer |
| Modal backdrop | 60 | `rgba(0,0,0,.5)` overlay |
| Modal / bottom sheet | 70 | Dialog overlays |
| Toast | 80 | Notifications |
| Tooltip | 90 | Hover hints |

### Modal Specifications (DESIGN.md)

- Size: **Data-heavy (560px max-width)** — displays request/response body content
- Backdrop: `rgba(0,0,0,.5)`
- Border radius: `var(--radius-card)` (12px)
- Elevation: level 3 (`box-shadow: var(--shadow-overlay)`)
- Focus trap: **yes**
- Dismiss: Esc, click backdrop, close button

### Right Drawer Specifications (DESIGN.md)

- Width: 320px (desktop ≥ 640px)
- Slides from right
- Elevation: level 3
- Focus trap: **no** (users can navigate table behind the open drawer)
- Dismiss: Esc, click outside, close button
- `aria-modal="false"` on desktop

### Bottom Panel Specifications (DESIGN.md)

- Split layout below table
- Tab bar: **Request** | **Response**
- Min height: 100px
- Max height: 60% of viewport
- Divider handle: 8px height, draggable (optional in v1 — can use fixed height)
- Close button collapses panel AND clears row selection

### Settings → Appearance Addition

Add row detail style selector after the theme selector:

```tsx
// In AppearanceSettings.tsx
<SettingRow
  label="Row detail style"
  description="Choose how request details appear when you click a row in the activity log"
>
  <SegmentedButtonGroup
    value={settings.rowDetailStyle}
    onChange={(v) => updateSetting("rowDetailStyle", v)}
    options={[
      { value: "modal", label: "Modal" },
      { value: "drawer", label: "Right Drawer" },
      { value: "panel", label: "Bottom Panel" },
    ]}
    data-testid="settings-row-detail-style"
  />
</SettingRow>
```

**Persistence:**
```typescript
// localStorage key: "fishtank-appearance-settings"
interface AppearanceSettings {
  theme: "clean-light" | "deep-ocean" | "emerald-terminal" | "ink-amber";
  rowDetailStyle: "modal" | "drawer" | "panel";
}
```

### data-testid Conventions

Per project-context.md, all interactive elements must have `data-testid`. Canonical values for this story:

| Element | data-testid |
|---------|-------------|
| Modal container | `activity-row-detail-modal` |
| Drawer container | `activity-row-detail-drawer` |
| Panel container | `activity-row-detail-panel` |
| Close button (all) | `activity-row-detail-close` |
| Save as Mock button | `activity-row-detail-save-mock` |
| Request ID field | `activity-row-detail-request-id` |
| Status code field | `activity-row-detail-status-code` |
| Request headers section | `activity-row-detail-request-headers` |
| Request body section | `activity-row-detail-request-body` |
| Response headers section | `activity-row-detail-response-headers` |
| Response body section | `activity-row-detail-response-body` |
| Tab bar (panel only) | `activity-row-detail-tabs` |
| Request tab | `activity-row-detail-tab-request` |
| Response tab | `activity-row-detail-tab-response` |
| Settings row detail style | `settings-row-detail-style` |

### Keyboard Navigation

**Table keyboard (already implemented in 3.2):**
- ArrowUp/ArrowDown: move focus between rows
- Enter: activate focused row (opens detail — wire this in 5.3)
- Tab: move to next interactive element (filters, headers)

**Detail keyboard (new):**
- Esc: close detail (Modal, Drawer, Panel)
- Tab: cycle through focusable elements within detail
- Focus trap: Modal only (Dialog API); Drawer and Panel allow focus to return to table

### Mobile Detection Hook

```typescript
// src/client/src/hooks/useMediaQuery.ts (may already exist)
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false
  );

  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [query]);

  return matches;
}
```

### JSON Pretty-Print Utility

```typescript
// src/client/src/lib/formatJson.ts
export function formatJson(value: string | null): { formatted: string; isJson: boolean } {
  if (!value) return { formatted: "", isJson: false };
  try {
    const parsed = JSON.parse(value);
    return { formatted: JSON.stringify(parsed, null, 2), isJson: true };
  } catch {
    return { formatted: value, isJson: false };
  }
}
```

### Project Structure Notes

- All new components follow existing feature folder structure (`features/activity/components/`)
- Shared overlay components go in `components/shared/` for reuse in Epic 4 (Mappings editor)
- Hooks follow `hooks/` subfolder pattern
- No cross-feature imports — activity components import from activity or shared only

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.4]
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-Fishtank-2026-06-04/DESIGN.md#Modal]
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-Fishtank-2026-06-04/DESIGN.md#Right drawer]
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-Fishtank-2026-06-04/DESIGN.md#Bottom panel]
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-Fishtank-2026-06-04/EXPERIENCE.md#Row detail (Network Activity)]
- [Source: _bmad-output/test-artifacts/test-design/test-design-epic-3.md#Story 3-4]
- [Source: _bmad-output/project-context.md#Frontend Rules]

---

## Test Design Summary (from test-design-epic-3.md)

| Test Level | Test Scenario | Priority |
|------------|---------------|----------|
| Component | Row detail Modal renders all fields | P0 |
| Component | Row detail Right Drawer (320px) renders same fields | P1 |
| Component | Row detail Bottom Panel with tabs renders same fields | P1 |
| Component | Headers display `[REDACTED]` for sensitive headers | P1 |
| Component | Mobile (<640px) always uses Modal regardless of preference | P1 |
| E2E | Click row → Modal opens (default style) | P0 |
| E2E | Change preference to Right Drawer in Settings → row click opens drawer | P1 |
| E2E | Change preference to Bottom Panel in Settings → row click opens panel | P1 |
| E2E | Keyboard navigation: arrow keys move row focus, Enter opens detail | P1 |
| E2E | Proxied row shows "Save as Mock" action in detail panel | P2 |

**Test Count:** 10 | **Effort:** ~4–6 hours

---

## Previous Story Learnings (from Story 3.3)

- **Client-side filtering/sorting**: All filtering is in-memory using `useMemo` on `rows` — no API query params needed
- **Pause snapshot pattern**: When implementing stateful overlays, preserve the source data state appropriately
- **Settings persistence**: Use `localStorage` with `fishtank-{feature}-settings` key pattern
- **useMediaQuery**: Check if hook already exists before creating duplicate
- **Tab order**: Ensure detail close button is first in tab order for quick keyboard dismiss

---

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (GitHub Copilot)

### Debug Log References

n/a

### Completion Notes List

- `useMediaQuery` `useState` initializer reads `window.matchMedia(query).matches` synchronously — critical for CT-6 mobile override test where mock is set before `renderHook`.
- `RowDetailModal` and `RowDetailDrawer` use `document.addEventListener("keydown", ...)` (not `onKeyDown` on the dialog div) because `fireEvent.keyDown(document, ...)` dispatches on the document node directly and does not bubble up from a child element.
- `RowDetailDrawer` uses `style={{ width: "320px" }}` inline (not a CSS class) because `getComputedStyle()` in jsdom reads inline styles, and this project does not use Tailwind.
- `RowDetailPanel` does NOT use `RowDetailContent` — it has its own inline rendering to support tab-conditional display of request vs response sections.
- `useRowDetailStyle.setRowDetailStyle` merges into the existing localStorage object (spread + update) to preserve the `theme` key — critical for CT-8.
- Response/request bodies are rendered raw (no pretty-printing) — `toHaveTextContent` normalizes whitespace so `{"amount":99}` would not match pretty-printed output.
- `RowDetailContent.tsx` needed the React import removed entirely (not even `import type React`) to pass TS `noUnusedLocals` check.

### File List

- `src/client/src/hooks/useMediaQuery.ts` — NEW
- `src/client/src/features/activity/hooks/useRowDetailStyle.ts` — UPDATED (was stub)
- `src/client/src/features/activity/components/RowDetailContent.tsx` — NEW
- `src/client/src/features/activity/components/RowDetailModal.tsx` — UPDATED (was stub)
- `src/client/src/features/activity/components/RowDetailDrawer.tsx` — UPDATED (was stub)
- `src/client/src/features/activity/components/RowDetailPanel.tsx` — UPDATED (was stub)
- `src/client/src/features/settings/components/AppearanceSettings.tsx` — UPDATED (added row detail style segmented buttons)
- `src/client/src/features/activity/pages/ActivityPage.tsx` — UPDATED (selectedRowId state, useRowDetailStyle, conditional detail renders)
- `src/client/src/features/activity/ActivityTable.tsx` — UPDATED (onRowClick, onRowEnter, selectedRowId props; Enter key handler)

