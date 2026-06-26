---
story_key: "2-4-system-events-screen-and-notification-panel"
generated: "2026-06-26"
verdict: "PASS"
stepsCompleted: ["step-05-generate-report"]
lastStep: "step-05-generate-report"
lastSaved: "2026-06-26"
---

# NFR Assessment — Story 2.4
# System Events Screen & Notification Panel

**Generated:** 2026-06-26  
**Story:** 2.4 — System Events Screen & Notification Panel  
**Baseline commit:** 74a2b59 (branch `release/v0.2.0`)  
**Overall Gate Decision:** ✅ PASS — Zero BLOCKER items found

**BLOCKER COUNT: 0**

---

## Scope

New code paths audited: `SystemEventService` (broadcast + paged queries + mark-read/clear), the five
`/api/system-events*` endpoints, `EventsHub` wiring, `useEventsHub`, `useSystemEvents`,
`NotificationPanel`, `NotificationBadge`, `SystemEventItem`, `TopBar` bell wiring, `AppShell` hub
mount, and `HUB_INVALIDATION_MAP`. No product code was modified during this review.

NFR thresholds: the epic-2 test design (`test-design-epic-2.md` NFR Planning, lines 96–103) defines
NFR-8 (hub auth) as the only mandated NFR gate touching this story; no specific latency/ms threshold
is defined for 2.4 (R-004's 1s render budget is scoped to Story 2.2).

---

## NFR Evidence by Category

### Security

| NFR | Description | Evidence | Score |
|-----|-------------|----------|-------|
| NFR-8 | Hub authentication enforcement | `[Authorize]` on `EventsHub` (`EventsHub.cs:6`); unauthenticated negotiate → 401, authenticated negotiate → 200. Tests: `Story2_4_SystemEventsTests.EventsHub_Unauthenticated_401`, `EventsHub_AuthNegotiate_200` | ✅ PASS |
| NFR-8 | All new endpoints require auth | `MapGroup("/api/system-events").RequireAuthorization()` (`SystemEventsEndpoints.cs:9`) covers list, unread-count, read, read-all, clear — no per-route opt-out. Integration test asserts 401 unauthenticated | ✅ PASS |
| Info leakage | Engine-crash stack/exception text in event messages | `ServiceManager.cs:73-76` (StartAsync) / 175-178 (CreateAsync) embed `ex.Message` into the `Message`. This is surfaced **only to authenticated users** (read endpoints + hub are all `[Authorize]`); broadcast goes to authenticated hub clients only. AC-2 explicitly mandates surfacing the failure reason. Acceptable per story design | ✅ PASS |
| Input validation | Severity / pagination params | `ParseGroup` defaults safely to warnings-errors for any non-"info" value (`SystemEventsEndpoints.cs:18-21`); `take` clamped 1–100, `skip` floored at 0 (`:27`); `{id:guid}` route constraint rejects non-GUID ids; no raw SQL / injection surface | ✅ PASS |
| No-leak error path | Mark-read 404 message | `MarkReadAsync` 404 echoes only the requested GUID (`SystemEventsEndpoints.cs:37`) — no internal state disclosed | ✅ PASS |

**Security gate: PASS**

---

### Performance

| NFR | Description | Evidence | Score |
|-----|-------------|----------|-------|
| Pagination bounded | Panel + screen page 20-at-a-time, no infinite scroll | `PAGE_SIZE = 20` (`useSystemEvents.ts:12`); `take` clamped server-side (`SystemEventsEndpoints.cs:27`); "Load more" button gated on `hasNextPage` (`NotificationPanel.tsx:136`) — explicit click, no scroll observer. Tests: `NotificationPanel.test.tsx` (20-on-open, Load-more→25) | ✅ PASS |
| Unread-count query efficiency | Badge count is a DB `COUNT`, not a materialization | `GetUnreadCountAsync` uses `db.SystemEvents.CountAsync(...)` (`SystemEventService.cs:110-111`) — set-based, no `ToListAsync` | ✅ PASS |
| Push not poll | Real-time badge via hub, no polling | `UnreadCountChanged` writes the count cache directly (`useEventsHub.ts:25-27`); `SystemEventCreated` invalidates `["events"]` via `HUB_INVALIDATION_MAP` — no polling interval introduced | ✅ PASS |
| Badge re-render cost | Badge is a trivial pure component | `NotificationBadge` renders null at 0 and a single `<span>` otherwise (`NotificationBadge.tsx:11-29`); no effects/subscriptions — re-render cost negligible | ✅ PASS |
| mark-all / clear materialization | Load-then-loop bound (review M2) | `MarkAllReadAsync` (`:97-108`) and `ClearAllAsync` (`:113-121`) `ToListAsync()` the full matching set before mutating. Bounded acceptably for expected event volumes (engine-failure events are low-frequency); the 1000-event retention cap is a documented future-story item. No ms threshold defined for 2.4. CONCERNS-level latent cost, not a defect | ⚠️ CONCERNS (deferred) |

**Performance gate: PASS** (1 deferred CONCERNS — M2, no current defect)

---

### Reliability

| NFR | Description | Evidence | Score |
|-----|-------------|----------|-------|
| Broadcast after commit | No partial-commit broadcast | `AddAsync` broadcasts `SystemEventCreated` + `UnreadCountChanged` **after** `await db.SaveChangesAsync(ct)` (`SystemEventService.cs:30,49-50`); `MarkReadAsync`/`MarkAllReadAsync`/`ClearAllAsync` likewise broadcast only post-save (`:91-92`, `:104-105`, `:119-120`). No DB transaction held across the hub round-trip | ✅ PASS |
| Best-effort hub | UI works if hub down | `connection.start().catch(...)` swallows connection failure as non-fatal (`useEventsHub.ts:29-32`); mutation `onSuccess` invalidations (`useSystemEvents.ts:48,60,71`) provide a fallback refresh independent of the socket | ✅ PASS |
| Connection cleanup | No socket leak on unmount | `useEventsHub` returns `() => void connection.stop()` (`useEventsHub.ts:34-36`); mounted once in `AppShell` (story Task 10), reconnect via `withAutomaticReconnect` in `signalr.ts` | ✅ PASS |
| Cancellation tokens | `ct` threaded end-to-end | `ct` passed through every async call in `SystemEventService` — `SaveChangesAsync`, `ToListAsync`, `CountAsync`, `FirstOrDefaultAsync`, `SendAsync` (`:30,49-50,66,86,91,100,111,117,119,126`) | ✅ PASS |
| Esc / outside-click / nav close | Panel lifecycle robust | `TopBar.tsx` closes panel on `location.pathname` change (`:34-36`), Esc keydown with listener cleanup (`:39-46`), and backdrop click (`:117-120`). AC-9 covered | ✅ PASS |
| Info events suppressed | Bell never reacts to info/success | `AddAsync` broadcast guarded by `severity is Warning or Error` (`SystemEventService.cs:33`). Tests: `SystemEventServiceTests.AddAsync_Info_DoesNotBroadcast`, `UnreadCount_OnlyWarningsAndErrors` | ✅ PASS |
| Cross-session clear-all staleness | Clear-all does not invalidate other sessions' lists (review H1) | `ClearAllAsync` broadcasts only `UnreadCountChanged`, not a list-invalidation event; other sessions keep ghost rows until next natural refetch (`SystemEventService.cs:113-121`). Clear-all is **outside the 2.4 P0/P1 test matrix** and the initiating session refreshes locally; documented accepted limitation for the deferred feature. Not an AC failure | ⚠️ CONCERNS (deferred) |

**Reliability gate: PASS** (1 deferred CONCERNS — H1, not an AC failure)

---

### Maintainability

| NFR | Description | Evidence | Score |
|-----|-------------|----------|-------|
| Pattern reuse | Mirrors established Story 2.3 conventions | `useEventsHub` mirrors `useServicesHub`; `useSystemEvents` mirrors `useServices` React Query conventions; `HUB_INVALIDATION_MAP` is the single hub→key mapping (`SystemEventCreated: [["events"]]`); broadcast lives in service layer not endpoints | ✅ PASS |
| DTO boundary | Entities never returned | `SystemEventDto` / `SystemEventPageDto` returned from all endpoints; EF entities mapped in the service (`SystemEventService.cs:40-47,70-79`) | ✅ PASS |
| CSS-variable theming | Single sanctioned exception | All styling uses `var(--…)` tokens except the sanctioned badge `#ef4444`/white (`NotificationBadge.tsx:9`, DESIGN.md line 219). One minor hardcoded hover-tint rgba noted in review (N2) — cosmetic nit | ✅ PASS |
| data-testid conventions | Canonical values verbatim | All canonical DESIGN.md testids present (`topbar-btn-bell`, `topbar-badge-bell`, `topbar-panel-notifications`, `events-*`); `topbar-bell-button` → `topbar-btn-bell` rename fully propagated (incl. `story-1-3-shell.spec.ts`); `topbar-btn-notification-mark-all-read` added per naming rule and noted in PR | ✅ PASS |
| Shared item renderer | One component for panel + screen | `SystemEventItem` with `variant: "panel" \| "screen"` avoids duplication; covered by `SystemEventItem.test.tsx` | ✅ PASS |
| Auth/context reuse | ToastContext / route group / apiFetch | All API calls go through `apiFetch` envelope unwrap; route group + `RequireAuthorization()` single declaration | ✅ PASS |

**Maintainability gate: PASS**

---

## Concerns & Suggested Mitigations (non-blocking)

| Ref | Category | Item | File:Line | Mitigation |
|-----|----------|------|-----------|------------|
| H1 | Reliability | `ClearAllAsync(WarningsErrors)` does not invalidate other sessions' lists — ghost rows until next refetch; cross-session interaction may 404 | `SystemEventService.cs:113-121` | Add an `EventsCleared` hub event wired into `HUB_INVALIDATION_MAP`, **or** accept as documented limitation for the deferred clear-all feature (out of 2.4 P0/P1 matrix). |
| M2 | Performance | `MarkAllReadAsync` / `ClearAllAsync` load-then-loop with no upper bound until retention cap exists | `SystemEventService.cs:97-108, 113-121` | Defer; replace with EF Core `ExecuteUpdateAsync` / `ExecuteDeleteAsync` set-based ops in a follow-up. Bounded by low event volume for v1. |
| M3 | Performance/UX | Deep-link highlight no-ops for events beyond page 1 (not auto-loaded) | `EventsPage.tsx:42-53` | Defer; panel links target recent (page-1) events. Hardening: `fetchNextPage()` until found; guard re-highlight with a ref keyed on `highlightId`. |
| L2 | Performance/UX | Badge pulse animation only plays on first render, not on each increment | `NotificationBadge.module.css:24` | Optional polish: `key={count}` to remount and replay the keyframe. |
| L3 | Reliability | `useUnreadCount` inherits 60s `staleTime`; if the socket is down, badge can be stale until a mutation invalidates | `useSystemEvents.ts:30-37` | Optional: shorter `staleTime` / `refetchOnWindowFocus` for the unread-count query. Acceptable degradation. |

All items above are quality/robustness improvements; none breaks an AC or the system. The code review
(`code-review-2-4-…md`) independently reported **BLOCKER COUNT: 0** with all 10 ACs PASS.

---

## Remediation Log

No remediation actions required for the gate. All findings are deferred quality items (above) with no
current defect. Two genuine test gaps were already filled in the automate phase (service-layer
broadcast no-send for info; read-state visual cue) per `automation-summary-2-4-…md`.

---

## Gate-Ready YAML

```yaml
nfr_gate:
  story_key: "2-4-system-events-screen-and-notification-panel"
  verdict: PASS
  categories:
    security: PASS
    performance: PASS        # 1 deferred CONCERNS (M2) — no current defect
    reliability: PASS        # 1 deferred CONCERNS (H1) — not an AC failure
    maintainability: PASS
  blockers: 0
  concerns: 2                # H1 (clear-all cross-session), M2 (load-then-loop) — both deferred
  generated: "2026-06-26"
```
