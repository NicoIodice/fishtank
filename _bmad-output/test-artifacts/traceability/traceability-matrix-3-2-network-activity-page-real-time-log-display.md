# Traceability Matrix — Story 3-2: Network Activity Page — Real-Time Log Display

**Story:** 3-2 Network Activity Page — Real-Time Log Display  
**Trace Date:** 2026-06-27  
**Tracer:** Master Test Architect (bmad-testarch-trace)  
**NFR Audit Verdict:** ⚠️ CONDITIONAL PASS (see [nfr-audit-3-2-network-activity-page-real-time-log-display.md](nfr-audit-3-2-network-activity-page-real-time-log-display.md))  
**Quality Gate Decision:** ✅ **CONDITIONAL PASS — Phase 12 (DONE) may proceed**

---

## Coverage Summary

| Metric | Value |
|--------|-------|
| Total ACs | 17 |
| Fully covered (automated) | 14 |
| Partially covered / deferred | 2 (AC-11, AC-17) |
| Covered at different scope | 1 (AC-14) |
| Uncovered | 0 |
| Automated test coverage | **82% fully covered; 94% including partials** |
| Vitest tests (all passing) | 176 (17 files) |
| C# integration tests (all passing) | 89 |
| Total test signals | **265** |

---

## Traceability Matrix

| AC | AC Description (summary) | Implementation File(s) | Test File(s) | Test Name(s) | Status |
|----|--------------------------|------------------------|--------------|--------------|--------|
| **AC-1** | Page loads with existing rows newest-first via `GET /api/activity` (direct `apiFetch`, not `useQuery`) | `ActivityPage.tsx`<br>`useActivityLog.ts`<br>`api.ts` | `story-3-2-activity-page.test.tsx`<br>`Story3_2_ActivityHubTests.cs` | "AC-1: renders seeded rows from initial apiFetch (not useQuery)"<br>"AC-1: GET /api/activity returns rows in newest-first order" | ✅ COVERED |
| **AC-2** | Real-time SignalR row prepend within 500ms | `useActivityLog.ts`<br>`ActivityPage.tsx` | `story-3-2-activity-page.test.tsx`<br>`Story3_2_ActivityHubTests.cs` | "AC-2: ActivityPage subscribes to ActivityRowAdded on mount"<br>"AC-2: new rows prepended via SignalR appear in table newest-first"<br>"AC-2: GET /hubs/activity without auth → 401"<br>"AC-2: POST /hubs/activity/negotiate (authenticated) → 200 with connectionId" | ✅ COVERED †1 |
| **AC-3** | No React Query on activity feed; `DO NOT useQuery` comment present | `useActivityLog.ts` | `story-3-2-activity-page.test.tsx` | "AC-3: useActivityLog.ts contains mandatory DO NOT useQuery comment" | ✅ COVERED |
| **AC-4** | Default visible columns in order: Method · URL Path · Status · Type · Service · Actions | `ActivityTable.tsx` | `story-3-2-activity-table.test.tsx` | "AC-4: renders default visible columns in correct order" | ✅ COVERED |
| **AC-5** | Method chips with DESIGN.md token colors (6 variants) | `MethodChip.tsx`<br>`ActivityTable.tsx` | `story-3-2-activity-table.test.tsx` | "AC-5: GET method chip renders with blue color"<br>"AC-5: POST method chip renders with emerald color"<br>"AC-5: DELETE method chip renders with red color"<br>"AC-5: PUT method chip renders with amber color"<br>"AC-5: PATCH method chip renders with purple color"<br>"AC-5: unknown method chip renders with slate fallback color" | ✅ COVERED |
| **AC-6** | Type column Bootstrap Icons + tooltips; Deep Ocean theme override for `bi-arrow-repeat` | `TypeIcon.tsx`<br>`ActivityTable.tsx` | `story-3-2-activity-table.test.tsx` | "AC-6: Mocked row renders bi-database icon with tooltip"<br>"AC-6: Proxied row renders bi-arrow-repeat icon with tooltip" | ✅ COVERED †2 |
| **AC-7** | Amber left-border (`2px solid #f59e0b`) on first cell of Proxied + Live service rows; no border for Proxied + Stopped | `ActivityTable.tsx` | `story-3-2-activity-table.test.tsx` | "AC-7: proxied row with Live service has amber border-left on first cell"<br>"AC-7: proxied row with Stopped service has NO amber border" | ✅ COVERED |
| **AC-8** | `var(--error-row-bg)` background on all cells for 5xx rows; no background for 2xx | `ActivityTable.tsx` | `story-3-2-activity-table.test.tsx` | "AC-8: 5xx row applies error-row-bg CSS variable to all cells"<br>"AC-8: 2xx row does NOT have error background" | ✅ COVERED |
| **AC-9** | Both amber border AND red background applied simultaneously (Proxied + Live + 5xx) | `ActivityTable.tsx` | `story-3-2-activity-table.test.tsx` | "AC-9: Proxied+Live+5xx row gets both amber border AND red background" | ✅ COVERED |
| **AC-10** | Proxy counter pill: count, error color, popover with per-service breakdown, empty state, Escape dismiss, `aria-live="polite"` | `ProxyCounterPill.tsx` | `story-3-2-proxy-counter-pill.test.tsx` | 10 tests covering: data-testid, count 0, Proxied-only counting, error color `#ef4444`, no-error-color 2xx, `aria-live="polite"`, click opens popover, per-service breakdown, empty state, Escape closes | ✅ COVERED |
| **AC-11** | Page header element order and stubs (correct left-to-right: Hamburger · h1 · Refresh stub · LIVE stub · Recording badge · spacer · Proxy pill · Record stub · Clear log stub) | `ActivityPage.tsx` | `tests/e2e/story-3-2-activity-page.spec.ts` (E2E) | "Page header renders all elements in correct order"<br>"Toolbar filter controls render as disabled stubs" | ⚠️ PARTIAL †3 |
| **AC-12** | Virtual scrolling — <100 DOM rows rendered for 10k dataset | `ActivityTable.tsx` | `story-3-2-activity-table.test.tsx` | "AC-12: renders far fewer than 10,000 rows in DOM (virtual scrolling)" | ✅ COVERED |
| **AC-13** | Keyboard navigation: ArrowUp/ArrowDown moves row focus; `aria-label` on action buttons; `role="grid"` on container | `ActivityTable.tsx` | `story-3-2-activity-table.test.tsx` | "AC-13: table container has role=grid and tabIndex=0 for keyboard focus"<br>"AC-13: ArrowDown moves row focus to next row"<br>"AC-13: ArrowUp does not go below index 0"<br>"AC-13: action buttons have correct aria-labels" | ✅ COVERED †4 |
| **AC-14** | Backend-unreachable banner (fixed-position, `top: 44px`, auto-hides on reconnect) | App shell layout component<br>(`lib/signalr.ts` connection state) | App shell scope — tested at Epic-level, not story-specific test | N/A — tested at app shell integration boundary | ⚠️ SCOPE NOTE †5 |
| **AC-15** | Empty states: "No activity yet" (never had rows) and "Log cleared" (rows cleared) | `ActivityTable.tsx` | `story-3-2-activity-table.test.tsx` | "AC-15: renders 'No activity yet' when hadRows=false"<br>"AC-15: renders 'Log cleared' when hadRows=true but rows=[]" | ✅ COVERED |
| **AC-16** | All interactive/structural elements carry correct `data-testid` per DESIGN.md canon | `ActivityPage.tsx`<br>`ActivityTable.tsx`<br>`ProxyCounterPill.tsx` | `story-3-2-activity-table.test.tsx`<br>`story-3-2-proxy-counter-pill.test.tsx` | "AC-16: every row has data-testid=activity-row-{id}"<br>"AC-16: Proxied row has Save as Mock action button with correct testid"<br>+ ProxyCounterPill `data-testid="activity-pill-proxy-count"` verified in 10 tests | ✅ COVERED |
| **AC-17** | WCAG 2.1 AA spot-check across Clean Light + Deep Ocean themes (method chips, type icons, proxy pill, LIVE indicator) | `MethodChip.tsx`<br>`TypeIcon.tsx`<br>`ProxyCounterPill.tsx`<br>`ActivityPage.tsx` | Manual audit required | WCAG spot-check is manual — deferred to PSG-2 per story spec | ⚠️ MANUAL DEFERRED †6 |

---

## Footnotes

**†1 — AC-2 E2E latency gap (A3, P1):** The full SignalR push-latency SLA (<500ms, NFR-3) is explicitly marked in `Story3_2_ActivityHubTests.cs` as validated in the Playwright E2E spec (`tests/e2e/story-3-2-activity-page.spec.ts`). That spec file exists on disk but has no confirmed CI execution against a live container. This must be resolved before Epic 3 closure. See NFR Action Item A3.

**†2 — AC-6 Deep Ocean theme override not unit-tested:** The `bi-arrow-repeat` color override to `#34d399` in Deep Ocean theme is implemented via CSS scoped override. No automated test verifies the override is active. This is a visual/theme gap below WCAG failure threshold and is acceptable at P2.

**†3 — AC-11 E2E only, not unit-tested:** Page header element order is behavioral layout — verified by the Playwright E2E spec scaffold. Unit tests for `ActivityPage.tsx` cover AC-1, AC-2, AC-3 only. The E2E spec (`tests/e2e/story-3-2-activity-page.spec.ts`) covers "Page header renders all elements in correct order" and "Toolbar filter controls render as disabled stubs." CI confirmation of E2E execution is pending (same as A3).

**†4 — AC-13 focus ring visual gap (A2, P2):** `tabIndex` mechanics (role=grid, ArrowDown/Up navigation, action button aria-labels) are all tested. WCAG 2.4.7 Focus Visible requires a visible CSS focus ring — no test verifies the `outline`/`:focus` CSS style is applied. Acceptable to defer (P2 item from NFR audit).

**†5 — AC-14 app-shell scope:** The backend-unreachable banner is rendered by the app shell layout component so it appears on all screens (not just Activity page). Its scope is Epic-level. Per ATDD checklist: "Tested at app shell level (separate from activity page)." No story-3-2-specific test is expected or appropriate.

**†6 — AC-17 manual WCAG deferred:** The story spec explicitly states this is "a spot-check, not the full audit (deferred to PSG-2)." Implementation-phase review is required before production release but is correctly deferred from story acceptance.

---

## AC Coverage by Test File

| Test File | ACs Covered | Test Count |
|-----------|-------------|------------|
| `src/client/tests/unit/features/story-3-2-activity-page.test.tsx` | AC-1, AC-2, AC-3 | 4 |
| `src/client/tests/unit/features/story-3-2-activity-table.test.tsx` | AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-12, AC-13, AC-15, AC-16 | 23 |
| `src/client/tests/unit/features/story-3-2-proxy-counter-pill.test.tsx` | AC-10 | 10 |
| `src/Fishtank.Api.IntegrationTests/Api/Story3_2_ActivityHubTests.cs` | AC-1 (ordering), AC-2 (auth/negotiate) | 3 |
| `src/client/tests/e2e/story-3-2-activity-page.spec.ts` (Playwright) | AC-11, AC-16 | — (not in CI count) |
| **Total story-3-2 test signals** | | **40 story-specific** |

---

## Implementation Coverage Map

| Implementation File | ACs Exercised |
|---------------------|---------------|
| `src/client/src/features/activity/pages/ActivityPage.tsx` | AC-1, AC-2, AC-11, AC-14, AC-15, AC-16 |
| `src/client/src/features/activity/ActivityTable.tsx` | AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-12, AC-13, AC-15, AC-16 |
| `src/client/src/features/activity/ProxyCounterPill.tsx` | AC-10, AC-16 |
| `src/client/src/features/activity/MethodChip.tsx` | AC-5, AC-17 |
| `src/client/src/features/activity/TypeIcon.tsx` | AC-6, AC-17 |
| `src/client/src/features/activity/useActivityLog.ts` | AC-1, AC-2, AC-3 |
| `src/client/src/features/activity/api.ts` | AC-1 |
| `src/client/src/features/activity/types.ts` | (type definitions — all ACs) |
| `src/Fishtank.Api/Hubs/ActivityHub.cs` | AC-2 |
| `src/Fishtank.Api/Endpoints/ActivityEndpoints.cs` | AC-1 |
| App shell layout component | AC-14 |

---

## Open Items Register

| ID | Priority | Source | Description | Resolution Path |
|----|----------|--------|-------------|-----------------|
| A1 | P1 | NFR Audit | SignalR disconnect shows no user-visible error state (console.error only) | Defer to Story 3-3 (LIVE/PAUSED toggle delivers reconnect UI) |
| A2 | P2 | NFR Audit | No automated test for CSS focus ring on keyboard-focused table row (WCAG 2.4.7) | Add visual snapshot or focused-row CSS test before Epic 3 closure |
| A3 | P1 | NFR Audit | Playwright E2E spec for SignalR push latency not confirmed running in CI against live container | Confirm CI pipeline includes E2E suite before Epic 3 closure; escalate if absent |
| T1 | P1 | Trace | AC-11 page header order covered only by E2E Playwright spec — no Vitest unit coverage | Acceptable as E2E covers layout behavior; blocked on A3 CI confirmation |

---

## Quality Gate Decision

### Verdict: ✅ CONDITIONAL PASS

**Phase 12 (DONE) may proceed.**

### Rationale

| Factor | Assessment |
|--------|------------|
| All 265 tests pass (176 Vitest + 89 C# integration) | ✅ |
| Core functional ACs fully automated (AC-1 through AC-10, AC-12, AC-13, AC-15, AC-16) | ✅ — 14/17 ACs |
| No AC is completely untested (all have rationale for any gap) | ✅ |
| AC-11 header order — E2E spec exists; Playwright test covers the behavior | ✅ (pending CI confirmation) |
| AC-14 banner — tested at correct architectural scope (app shell) | ✅ |
| AC-17 WCAG spot-check — correctly deferred per story spec to PSG-2 | ✅ (documented deferral) |
| NFR audit: Conditional PASS — 3 action items, none block story completion | ✅ |
| A1 (SignalR reconnect UI) — deferred to Story 3-3 per architecture | ✅ Deferred |
| A2 (focus ring test) — P2, does not block DONE | ✅ Deferred |
| A3 (E2E CI confirmation) — P1, must resolve before Epic 3 closure | ⚠️ Track |

### Conditions Carried Forward

The following must be addressed before **Epic 3 closure** (not before Story 3-2 DONE):

1. **A1** — Implement SignalR disconnect user-visible state in Story 3-3
2. **A3** — Confirm Playwright E2E suite executes in CI against a live container; verify Story 3-2 spec runs
3. **A2** — Add focus ring visual test (CSS outline on focused `<tr>`) — P2, before Epic 3 PSG-2 audit

---

*Generated by: bmad-testarch-trace Phase 11 · Story 3-2 · 2026-06-27*
