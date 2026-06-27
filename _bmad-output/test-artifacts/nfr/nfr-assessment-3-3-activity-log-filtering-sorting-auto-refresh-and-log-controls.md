---
story_key: 3-3-activity-log-filtering-sorting-auto-refresh-and-log-controls
generated: 2026-06-27
verdict: PASS
---

# NFR Evidence Audit — Story 3-3

**Activity Log Filtering, Sorting, Auto-Refresh and Log Controls**

---

## Summary

| Severity | Count |
|----------|-------|
| BLOCKER  | 0     |
| MAJOR    | 0     |
| MINOR    | 1     |

**Overall gate: PASS** — 0 BLOCKER items.

---

## Evidence Table

### Accessibility (NFR-19, NFR-21)

| # | Requirement | File | Evidence | Result |
|---|-------------|------|----------|--------|
| A-1 | LIVE/PAUSED button uses `aria-disabled="true"` (not HTML `disabled`) when interval disabled | `ActivityPage.tsx` | Line ~243: `isIntervalDisabled` branch renders `<button aria-disabled="true">` with no `disabled` attribute; cursor `not-allowed` via CSS only | ✅ PASS |
| A-2 | All sortable `<th>` have `aria-sort` attribute | `ActivityTable.tsx` | All 6 sortable columns (method, urlPath, statusCode, durationMs, timestamp, serviceName) have `aria-sort={... "ascending" \| "descending" \| "none"}` | ✅ PASS |
| A-3 | Non-sortable `<th>` (Type, Actions) omit `aria-sort` | `ActivityTable.tsx` | Type column uses icon `aria-label="Type"`, Actions column has no `aria-sort` — correct per spec | ✅ PASS |
| A-4 | Type-filter button has `aria-expanded` | `ActivityPage.tsx` | `aria-expanded={typeFilterOpen}` on `data-testid="activity-btn-type-filter"` button; toggles correctly on click | ✅ PASS |
| A-5 | `prefers-reduced-motion` respected in refresh icon | `ActivityPage.tsx` | `prefersReducedMotion` computed from `window.matchMedia("(prefers-reduced-motion: reduce)").matches`; `spinClass = isManualRefreshing && !prefersReducedMotion ? "animate-spin" : ""`; when reduced-motion is active, icon never receives `animate-spin` | ✅ PASS |
| A-6 | `prefersReducedMotion` is a snapshot (no `addEventListener`) | `ActivityPage.tsx` | Value is read once at render time. If user changes OS preference mid-session, the icon could animate. Harmless — icon spin is decorative; no re-subscribe needed by spec | ⚠️ MINOR |

---

### Security (OWASP — no raw fetch, credentials via apiFetch)

| # | Requirement | File | Evidence | Result |
|---|-------------|------|----------|--------|
| S-1 | No raw `fetch()` in api.ts | `api.ts` | `fetchActivityRows` uses `apiFetch<ActivityRow[]>(...)`; `clearActivityLog` uses `apiFetch<null>(...)` — no bare `fetch()` present | ✅ PASS |
| S-2 | `clearActivityLog` uses `apiFetch` with correct HTTP method | `api.ts` | `apiFetch<null>("/api/activity", { method: "DELETE" })` — method is DELETE, path is `/api/activity` | ✅ PASS |
| S-3 | No raw `fetch()` in ActivitySettings.tsx | `ActivitySettings.tsx` | `handleCaptureHeadersToggle` uses `apiFetch<{ captureFullHeaders: boolean }>("/api/settings/capture-headers", { method: "PUT", ... })` | ✅ PASS |
| S-4 | No raw `fetch()` in ActivityPage.tsx or useActivityLog.ts | `ActivityPage.tsx`, `useActivityLog.ts` | Both consume `fetchActivityRows` / `clearActivityLog` from `api.ts`; no direct `fetch()` calls in either file | ✅ PASS |

---

### Reliability (mountedRef, error handling)

| # | Requirement | File | Evidence | Result |
|---|-------------|------|----------|--------|
| R-1 | `mountedRef` prevents state-after-unmount in `useActivityLog` | `useActivityLog.ts` | `mountedRef = useRef(true)` set at effect start; cleanup sets `mountedRef.current = false` and stops SignalR connection; SignalR handler guards `if (!mountedRef.current) return`; fetch `.then()` guards `if (!mountedRef.current) return`; `refreshRows()` guards `if (mountedRef.current) setRows(freshRows)` | ✅ PASS |
| R-2 | `handleClearLog` has error handling | `ActivityPage.tsx` | Wrapped in `try { await clearActivityLog(); clearRows(); ... } catch (err) { console.error("Clear log failed:", err); }` | ✅ PASS |
| R-3 | `handleCaptureHeadersToggle` has error handling | `ActivitySettings.tsx` | Wrapped in `try { ... await apiFetch(...); await queryClient.invalidateQueries(...); } catch (err) { console.error(...); } finally { setIsTogglingHeaders(false); }` — `finally` block ensures loading state resets even on failure | ✅ PASS |
| R-4 | `handleManualRefresh` has error handling | `ActivityPage.tsx` | `try { ... await fetchActivityRows(...); setPauseSnapshot(freshRows); } catch (err) { console.error("Manual refresh failed:", err); } finally { setIsManualRefreshing(false); }` | ✅ PASS |

---

### Performance (NFR-4)

| # | Requirement | File | Evidence | Result |
|---|-------------|------|----------|--------|
| P-1 | `filteredRows` computed via `useMemo` | `ActivityPage.tsx` | `const filteredRows = useMemo(() => { ... }, [sourceRows, searchQuery, selectedServiceId, typeMockedChecked, typeProxiedChecked, sort])` — full filter+sort pipeline memoized; re-runs only when a dependency changes | ✅ PASS |
| P-2 | Dependency array is correct and minimal | `ActivityPage.tsx` | All six deps are the exact state/derived values that influence the computation; no unstable object references (sort is state, not inline object) | ✅ PASS |

---

### Maintainability (localStorage schema)

| # | Requirement | File | Evidence | Result |
|---|-------------|------|----------|--------|
| M-1 | `useActivitySettings` reads localStorage under correct key | `useActivitySettings.ts` | `STORAGE_KEY = "fishtank-activity-settings"` (const); `localStorage.getItem(STORAGE_KEY)` used in `useState` initializer | ✅ PASS |
| M-2 | Read path falls back to defaults and swallows parse errors | `useActivitySettings.ts` | `try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) as ActivitySettings : DEFAULT_ACTIVITY_SETTINGS; } catch { return DEFAULT_ACTIVITY_SETTINGS; }` | ✅ PASS |
| M-3 | Write path serializes full settings object | `useActivitySettings.ts` | `updateInterval`: `const next = { ...settings, autoRefreshInterval: value }; setSettings(next); localStorage.setItem(STORAGE_KEY, JSON.stringify(next));` — same pattern in `updateMaxEntries` | ✅ PASS |
| M-4 | Schema matches `ActivitySettings` interface | `useActivitySettings.ts` | Interface defines `autoRefreshInterval: 1000 \| 2000 \| 5000 \| "disabled"` and `maxEntries: 500 \| 1000 \| 5000`; defaults and update functions are type-correct | ✅ PASS |

---

## MINOR Findings Detail

### MINOR-1 — `prefersReducedMotion` is a point-in-time snapshot

**File:** `src/client/src/features/activity/pages/ActivityPage.tsx`

**Description:** `prefersReducedMotion` is read once via `window.matchMedia(...).matches` at render time. If the user toggles their OS reduced-motion preference while the page is open, the refresh icon could animate until the next full re-render.

**Impact:** Cosmetic/decorative only. The icon spin conveys no information and causes no functional harm. No AC or spec requirement mandates live subscription.

**Recommendation (advisory):** If live subscription is desired in a future story, add a `useSyncExternalStore` or `useEffect` with `matchMedia.addEventListener("change", ...)`. Not required for this story.

**Action required:** None — advisory only.

---

## Gate Decision

| Gate | Result |
|------|--------|
| Accessibility | ✅ PASS |
| Security | ✅ PASS |
| Reliability | ✅ PASS |
| Performance | ✅ PASS |
| Maintainability | ✅ PASS |

**NFR audit PASSED — 0 BLOCKER items.**

Story 3-3 satisfies all audited non-functional requirements. The single MINOR finding (reduced-motion snapshot) is advisory and requires no code change prior to release.
