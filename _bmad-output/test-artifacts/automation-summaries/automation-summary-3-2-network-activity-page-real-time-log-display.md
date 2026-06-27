---
story_key: 3-2-network-activity-page-real-time-log-display
generated: 2026-06-27
phase: automation-expansion
suite_unit_total: 33
suite_e2e_total: 5
gate: PASS
note: Artifact reconstructed — automation-summary was not saved by the lifecycle version that ran story 3-2. Test files and coverage are accurate.
---

# Automation Summary — Story 3-2: Network Activity Page — Real-Time Log Display

## Coverage Table

| AC | Test File | Layer | Test Name | Status |
|----|-----------|-------|-----------|--------|
| AC-1 | `story-3-2-activity-page.spec.ts` | E2E | `AC-1: /activity page loads and displays activity table` | ✅ GREEN |
| AC-2 | `story-3-2-activity-page.test.tsx` | Unit | `AC-2: ActivityPage subscribes to ActivityRowAdded on mount` | ✅ GREEN |
| AC-2 | `story-3-2-activity-page.spec.ts` | E2E | `AC-2: New activity row appears in real-time via SignalR` | ✅ GREEN |
| AC-3 | `story-3-2-activity-page.test.tsx` | Unit | `AC-3: useActivityLog.ts contains mandatory DO NOT useQuery comment` | ✅ GREEN |
| AC-4 | `story-3-2-activity-table.test.tsx` | Unit | `AC-4: renders default visible columns in correct order` | ✅ GREEN |
| AC-5 | `story-3-2-activity-table.test.tsx` | Unit | `AC-5: GET method chip renders with blue color` | ✅ GREEN |
| AC-5 | `story-3-2-activity-table.test.tsx` | Unit | `AC-5: POST method chip renders with emerald color` | ✅ GREEN |
| AC-5 | `story-3-2-activity-table.test.tsx` | Unit | `AC-5: DELETE method chip renders with red color` | ✅ GREEN |
| AC-5 | `story-3-2-activity-table.test.tsx` | Unit | `AC-5: unknown method chip renders with slate fallback color` | ✅ GREEN |
| AC-5 | `story-3-2-activity-table.test.tsx` | Unit | `AC-5: PUT method chip renders with amber color` | ✅ GREEN |
| AC-5 | `story-3-2-activity-table.test.tsx` | Unit | `AC-5: PATCH method chip renders with purple color` | ✅ GREEN |
| AC-6 | `story-3-2-activity-table.test.tsx` | Unit | `AC-6: Mocked row renders bi-database icon with tooltip` | ✅ GREEN |
| AC-6 | `story-3-2-activity-table.test.tsx` | Unit | `AC-6: Proxied row renders bi-arrow-repeat icon with tooltip` | ✅ GREEN |
| AC-7 | `story-3-2-activity-table.test.tsx` | Unit | `AC-7: proxied row with Live service has amber border-left on first cell` | ✅ GREEN |
| AC-7 | `story-3-2-activity-table.test.tsx` | Unit | `AC-7: proxied row with Stopped service has NO amber border` | ✅ GREEN |
| AC-8 | `story-3-2-activity-table.test.tsx` | Unit | `AC-8: 5xx row applies error-row-bg CSS variable to all cells` | ✅ GREEN |
| AC-8 | `story-3-2-activity-table.test.tsx` | Unit | `AC-8: 2xx row does NOT have error background` | ✅ GREEN |
| AC-9 | `story-3-2-activity-table.test.tsx` | Unit | `AC-9: Proxied+Live+5xx row gets both amber border AND red background` | ✅ GREEN |
| AC-10 | `story-3-2-proxy-counter-pill.test.tsx` | Unit | `AC-10: renders data-testid=activity-pill-proxy-count` | ✅ GREEN |
| AC-10 | `story-3-2-proxy-counter-pill.test.tsx` | Unit | `AC-10: shows 0 count when no rows` | ✅ GREEN |
| AC-10 | `story-3-2-proxy-counter-pill.test.tsx` | Unit | `AC-10: counts only Proxied rows (ignores Mocked)` | ✅ GREEN |
| AC-10 | `story-3-2-proxy-counter-pill.test.tsx` | Unit | `AC-10: renders error color (#ef4444) when a proxied row has 5xx status` | ✅ GREEN |
| AC-10 | `story-3-2-proxy-counter-pill.test.tsx` | Unit | `AC-10: no error color when all proxied rows are 2xx` | ✅ GREEN |
| AC-10 | `story-3-2-proxy-counter-pill.test.tsx` | Unit | `AC-10: has aria-live=polite for screen-reader announcement` | ✅ GREEN |
| AC-10 | `story-3-2-proxy-counter-pill.test.tsx` | Unit | `AC-10: clicking pill opens popover` | ✅ GREEN |
| AC-10 | `story-3-2-proxy-counter-pill.test.tsx` | Unit | `AC-10: popover shows per-service breakdown with count` | ✅ GREEN |
| AC-10 | `story-3-2-proxy-counter-pill.test.tsx` | Unit | `AC-10: popover shows empty state when no proxied requests` | ✅ GREEN |
| AC-10 | `story-3-2-proxy-counter-pill.test.tsx` | Unit | `AC-10: Escape key closes popover` | ✅ GREEN |
| AC-11 | `story-3-2-activity-page.spec.ts` | E2E | `AC-11: Page header renders all elements in correct order` | ✅ GREEN |
| AC-11 | `story-3-2-activity-page.spec.ts` | E2E | `AC-11: Toolbar filter controls render as disabled stubs` | ✅ GREEN |
| AC-12 | `story-3-2-activity-table.test.tsx` | Unit | `AC-12: renders far fewer than 10,000 rows in DOM (virtual scrolling)` | ✅ GREEN |
| AC-13 | `story-3-2-activity-table.test.tsx` | Unit | `AC-13: table container has role=grid and tabIndex=0 for keyboard focus` | ✅ GREEN |
| AC-15 | `story-3-2-activity-table.test.tsx` | Unit | `AC-15: renders 'No activity yet' when hadRows=false` | ✅ GREEN |
| AC-15 | `story-3-2-activity-table.test.tsx` | Unit | `AC-15: renders 'Log cleared' when hadRows=true but rows=[]` | ✅ GREEN |
| AC-16 | `story-3-2-activity-table.test.tsx` | Unit | `AC-16: every row has data-testid=activity-row-{id}` | ✅ GREEN |
| AC-16 | `story-3-2-activity-table.test.tsx` | Unit | `AC-16: Proxied row has Save as Mock action button with correct testid` | ✅ GREEN |
| AC-16 | `story-3-2-activity-page.spec.ts` | E2E | `AC-16: All interactive elements have correct data-testid attributes` | ✅ GREEN |

---

## Tests by File

### `src/client/tests/unit/features/story-3-2-activity-page.test.tsx` (2 tests)

| Test | AC | Description |
|------|----|-------------|
| `AC-3: useActivityLog.ts contains mandatory DO NOT useQuery comment` | AC-3 | Meta-test: enforces architectural constraint — activity feed must NOT use React Query |
| `AC-2: ActivityPage subscribes to ActivityRowAdded on mount` | AC-2 | SignalR `connection.on("ActivityRowAdded", handler)` called on component mount |

### `src/client/tests/unit/features/story-3-2-activity-table.test.tsx` (21 tests)

| Test | AC | Description |
|------|----|-------------|
| `AC-4: renders default visible columns in correct order` | AC-4 | Timestamp, Method, Path, Service, Type, Duration column headers in order |
| `AC-5: GET/POST/DELETE/PUT/PATCH/unknown method chips` | AC-5 (×6) | Each HTTP method maps to its correct DESIGN.md token color |
| `AC-6: Mocked row renders bi-database icon with tooltip` | AC-6 | Mocked type column shows Bootstrap Icons `bi-database` + tooltip |
| `AC-6: Proxied row renders bi-arrow-repeat icon with tooltip` | AC-6 | Proxied type column shows `bi-arrow-repeat` + tooltip |
| `AC-7: proxied row with Live service has amber border-left` | AC-7 | `border-l-2 border-amber-400` on first cell for Proxied + Live service rows |
| `AC-7: proxied row with Stopped service has NO amber border` | AC-7 | No amber class when service is stopped |
| `AC-8: 5xx row applies error-row-bg CSS variable` | AC-8 | Background uses `var(--error-row-bg)` on 5xx status rows |
| `AC-8: 2xx row does NOT have error background` | AC-8 | 2xx rows are not styled with error background |
| `AC-9: Proxied+Live+5xx row gets both amber border AND red background` | AC-9 | Both highlights applied simultaneously |
| `AC-12: renders far fewer than 10,000 rows in DOM` | AC-12 | Virtual scrolling — only ≤50 rows in DOM despite 10k dataset |
| `AC-15: renders 'No activity yet'` | AC-15 | Empty state when `hadRows=false` |
| `AC-15: renders 'Log cleared'` | AC-15 | Empty state when `hadRows=true` but `rows=[]` |
| `AC-16: every row has data-testid=activity-row-{id}` | AC-16 | Row testid attribute format |
| `AC-16: Proxied row has Save as Mock action button` | AC-16 | Stub action button present with correct testid |
| `AC-13: table has role=grid and tabIndex=0` | AC-13 | Keyboard navigation accessibility attributes |

### `src/client/tests/unit/features/story-3-2-proxy-counter-pill.test.tsx` (10 tests)

| Test | AC | Description |
|------|----|-------------|
| `AC-10: renders data-testid=activity-pill-proxy-count` | AC-10 | testid presence |
| `AC-10: shows 0 count when no rows` | AC-10 | Empty row list → "0" |
| `AC-10: counts only Proxied rows` | AC-10 | Mocked rows excluded from count |
| `AC-10: renders error color (#ef4444) on 5xx` | AC-10 | Red color applied when proxied row has 5xx status |
| `AC-10: no error color when all 2xx` | AC-10 | No red when all proxied rows are 2xx |
| `AC-10: has aria-live=polite` | AC-10 | Screen reader announcement attribute |
| `AC-10: clicking pill opens popover` | AC-10 | Popover trigger on click |
| `AC-10: popover shows per-service breakdown` | AC-10 | Per-service count in popover content |
| `AC-10: popover shows empty state` | AC-10 | Empty message when no proxied requests |
| `AC-10: Escape key closes popover` | AC-10 | Keyboard dismissal |

### `src/client/tests/e2e/story-3-2-activity-page.spec.ts` (5 tests)

| Test | AC | Description |
|------|----|-------------|
| `AC-1: /activity page loads and displays activity table` | AC-1 | Page navigates and renders activity table |
| `AC-2: New activity row appears in real-time via SignalR` | AC-2 | E2E real-time row prepend via SignalR |
| `AC-11: Page header renders all elements in correct order` | AC-11 | Header layout: title, Recording badge, LIVE indicator, Refresh, Clear, Proxy Pill |
| `AC-11: Toolbar filter controls render as disabled stubs` | AC-11 | Stub controls (search, service dropdown, type filter) rendered as disabled |
| `AC-16: All interactive elements have correct data-testid` | AC-16 | All key elements have `data-testid` for E2E targeting |

---

## Coverage Gaps

| AC | Reason |
|----|--------|
| AC-14 | Keyboard `ArrowUp`/`ArrowDown` navigation — deferred (UX preference), not in ATDD checklist |

No integration tests for story 3-2. This story is **frontend-only** — the backend observability layer (SignalR hub, activity API) was delivered by Story 3-1 and covered by `Story3_1_ActivityTests.cs`.
