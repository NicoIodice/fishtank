# Code Review — Story 2.4: System Events Screen & Notification Panel

**Reviewer:** Adversarial multi-lens review (blind bug hunter + edge-case hunter + acceptance auditor)
**Branch:** `story/2-4-system-events-screen-and-notification-panel` (uncommitted working tree)
**Baseline:** `release/v0.2.0`
**Date:** 2026-06-25

---

## BLOCKER COUNT: 0

---

## Summary

The implementation is high quality and faithful to the story spec, project conventions, and ACs. The backend service-layer broadcast, pagination, mark-read/mark-all-read semantics, and response envelopes are correct. The frontend hub lifecycle, badge overflow/color, panel behaviors, deep-link, and accessibility are well-implemented and match DESIGN.md/EXPERIENCE.md. All ACs (1–10) have implementation and test coverage. The `topbar-bell-button` → `topbar-btn-bell` rename is fully propagated (only documentation/comment references to the old id remain; no live consumer). The `Story2_1_ServicesTests` envelope migration is correct and still asserts the right thing (the error event with the "Blocked Service" message).

No blocking issues. Findings are quality/robustness improvements (1 HIGH, 3 MEDIUM, 4 LOW, 3 NIT).

**Scope reviewed:** `SystemEventService.cs`, `ISystemEventService.cs`, `SystemEventsEndpoints.cs`, `SystemEventDto.cs`, `useSystemEvents.ts`, `useEventsHub.ts`, `NotificationPanel.tsx`, `NotificationBadge.tsx`, `SystemEventItem.tsx`, `systemEvent.ts`, `EventsPage.tsx`, `TopBar.tsx`, `AppShell.tsx`, `queryClient.ts`, all related `.module.css`, `Story2_4_SystemEventsTests.cs`, `Story2_1_ServicesTests.cs` (diff), `story-1-3-shell.spec.ts` (diff), `story-2-4-system-events.spec.ts`, and the two unit test files.

---

## Findings by Severity

### HIGH

**H1 — `ClearAllAsync(WarningsErrors)` does not broadcast `SystemEventCreated`/list refresh to other sessions; clear-all clears reads but other clients keep stale list until something else invalidates.**
- **File:** `src/Fishtank.Api/Services/SystemEventService.cs:113-121`
- **What:** `ClearAllAsync` only broadcasts `UnreadCountChanged` (and only for the warnings-errors group). When one session permanently deletes all events, other connected sessions receive the new unread count (badge → 0) but their `/events` list and notification panel are **not** invalidated — there is no `SystemEventCreated` (or any list-targeting) broadcast, and `SystemEventCreated` is the only event wired into `HUB_INVALIDATION_MAP`. Other sessions will continue to show the now-deleted rows until they manually refetch.
- **Why it matters:** Cross-session consistency is an explicit design goal of the hub wiring ("the badge stays authoritative on all sessions"). After a clear-all, a second session's panel/list shows ghost rows that 404 on interaction (mark-read returns `SYSTEM_EVENT_NOT_FOUND`). It is not an AC failure (clear-all is explicitly outside the 2.4 P0/P1 test matrix, and the local initiating session invalidates via its own mutation `onSuccess`), which is why this is HIGH not BLOCKER.
- **Suggested fix:** Either broadcast a dedicated list-invalidation event after clear-all (and add it to `HUB_INVALIDATION_MAP`), or document the cross-session staleness as an accepted limitation for the deferred clear-all feature. Simplest: have `useClearAll.onSuccess` remain the local refresh and accept other sessions refresh on their next natural invalidation; if cross-session is required, add an `EventsCleared` hub event.

### MEDIUM

**M1 — Concurrent `AddAsync` for the same service can race on `db.SaveChangesAsync`; `ServiceManager` engine-crash sites may call `AddAsync` from parallel scopes sharing no scoped `DbContext` — verify no shared-context reentrancy.**
- **File:** `src/Fishtank.Api/Services/SystemEventService.cs:17-52`
- **What:** `SystemEventService` is `AddScoped`. `AddAsync` does `Add` + `SaveChangesAsync`, then (for warn/err) issues two `await ...SendAsync` calls and a follow-up `GetUnreadCountAsync` query on the same scoped `DbContext`. EF Core `DbContext` is not thread-safe; if two engine-failure events for the same scope were ever raised concurrently (they are not today — each request/operation gets its own scope), this would throw. Today's call sites (`ServiceManager.CreateAsync`/`StartAsync`) are sequential within a single request scope, so this is currently safe.
- **Why it matters:** The broadcast + unread-count query happen **after** `SaveChangesAsync` but still on the scoped context — fine for now, but a latent hazard if `AddAsync` is ever called from a background/parallel path. Not a current defect.
- **Suggested fix:** No change required for 2.4. Optionally add an XML-doc note that `AddAsync` must be called on a per-operation scope (not concurrently on a shared context). Confirm no parallel caller exists (verified: only sequential `ServiceManager` sites).

**M2 — `MarkAllReadAsync` loads all unread warn/err rows into memory and loops; `ClearAllAsync` loads all matching rows then `RemoveRange` — O(n) materialization with no upper bound until a retention cap exists.**
- **File:** `src/Fishtank.Api/Services/SystemEventService.cs:97-108, 113-121`
- **What:** Both methods `ToListAsync()` the full matching set before mutating. The story's own Open Questions note the 1000-event retention cap is **not** implemented, so over a very long-lived container these sets grow unbounded.
- **Why it matters:** Performance/memory only; correctness is fine. Low real-world risk for v1 (capped by event volume), already flagged in the story as a future-story concern.
- **Suggested fix:** Defer; when EF Core bulk ops are available (`ExecuteUpdateAsync`/`ExecuteDeleteAsync`) replace the load-then-loop with set-based statements. SQLite/EF Core 10 supports `ExecuteUpdate`/`ExecuteDelete` — consider for a follow-up. Not required for this story.

**M3 — Deep-link highlight effect depends on `items` identity and can fire repeatedly / miss the element on first paint.**
- **File:** `src/client/src/features/events/pages/EventsPage.tsx:42-53`
- **What:** The `useEffect` querying `[data-event-id="${highlightId}"]` runs on `[highlightId, items, reducedMotion]`. If the target event is on page 2+ (not yet loaded), `querySelector` returns null and the highlight never triggers — there is no "load until found" logic. Also, `items` changing (e.g. a hub-driven invalidation/refetch) re-runs the effect and re-triggers the 1s amber animation even if the user already saw it.
- **Why it matters:** AC-10 says the matching item is "scrolled into view and highlighted." If the deep-linked event is beyond the first 20 in its group, the highlight silently no-ops. Real-world deep links from the panel target recent events (page 1), so this is usually fine, but it is a partial AC gap for older events.
- **Suggested fix:** Acceptable for 2.4 (panel links target recent events). If hardening: when `highlightId` is set and not found in loaded items but `hasNextPage`, call `fetchNextPage()` until found or exhausted; and guard re-highlighting with a "已highlighted" ref keyed on `highlightId`.

### LOW

**L1 — `formatTimestamp` uses `month/day/hour/minute` only — no year; events crossing a year boundary are ambiguous.**
- **File:** `src/client/src/features/events/components/SystemEventItem.tsx:18-27`
- **What:** Timestamp format omits the year. project-context.md says "Display: `Intl.DateTimeFormat` in frontend (user local timezone)" — year omission is a display choice, not a violation, but old events show no year.
- **Suggested fix:** Optionally include `year: "numeric"` for events older than the current year, or accept compact format. Cosmetic.

**L2 — Badge pulse animation plays on the element's first render only, not on every increment.**
- **File:** `src/client/src/features/events/components/NotificationBadge.module.css:24, 27-37`
- **What:** `.badge { animation: badge-pulse 150ms ease-out; }` is unconditional on the class. The CSS animation runs when the element mounts (count 0→N). When the count changes N→N+1 the element re-renders but the `<span>` is not remounted, so the keyframe does not replay — the spec's "new-event pulse" only fires when the badge first appears, not on subsequent increments.
- **Why it matters:** DESIGN.md describes a per-new-event pulse. Minor visual-polish gap, not an AC (AC-8 only requires color/overflow/aria, which are correct).
- **Suggested fix:** Key the badge on count (`key={count}`) to remount and replay, or toggle an animation class via effect. Optional polish.

**L3 — `useUnreadCount` has `staleTime: 60_000` (global default) — on mount the badge may show a stale count for up to 60s if the hub push is missed.**
- **File:** `src/client/src/features/events/hooks/useSystemEvents.ts:30-37`, `src/client/src/lib/queryClient.ts:11`
- **What:** The unread-count query inherits the 60s `staleTime`. The hub `UnreadCountChanged` write keeps it fresh in the happy path, but if the socket failed to connect (best-effort, error swallowed in `useEventsHub`), the badge can be stale until a mutation invalidates `["events"]`.
- **Why it matters:** Edge case (hub down). The fallback path (mutation invalidation) covers user-initiated changes; only *other sessions'* new events would be missed while the socket is down. Acceptable degradation.
- **Suggested fix:** Optionally set a shorter `staleTime`/`refetchOnWindowFocus` for the unread-count query. Not required.

**L4 — `EventsPage` clear-all confirmation modal uses `z-index: var(--z-modal, 60)` but the notification panel/backdrop are not dismissed when navigating to `/events`; potential stacking only if both open — verify no overlap.**
- **File:** `src/client/src/features/events/pages/EventsPage.module.css:159`
- **What:** The clear-all modal sits at z-index 60 (correct per DESIGN.md modal layer). The notification panel closes on navigation (`TopBar` `useEffect` on `pathname`), so the panel (z-40) cannot coexist with the events-page modal. No actual conflict; noting for completeness.
- **Suggested fix:** None needed; confirmed correct layering.

### NIT

**N1 — `useMarkRead` invalidates `EVENTS_QUERY_KEY` (`["events"]`) which also invalidates `["events","unread-count"]` by prefix — the inline comment ("UnreadCountChanged hub event also refreshes the badge; invalidate as a fallback") is slightly misleading since the invalidation itself already refreshes the count.**
- **File:** `src/client/src/features/events/hooks/useSystemEvents.ts:46-50`
- **Suggested fix:** Clarify the comment; behavior is correct.

**N2 — `SEVERITY_COLOR` uses `var(--error, #ef4444)` etc. with fallbacks; the events screen `actionBtnDanger` hardcodes `rgba(239, 68, 68, 0.08)` on hover.**
- **File:** `src/client/src/features/events/pages/EventsPage.module.css:44`
- **What:** The hover background is a hardcoded red rgba rather than a CSS variable. Not the sanctioned badge exception. Very minor theming nit (a hover tint, not a semantic color).
- **Suggested fix:** Use a variable (e.g. derive from `--error` / a `--error-subtle` token) if one exists.

**N3 — Integration test `EventsHub_AuthenticatedNegotiate` and `List_OrderedNewestFirst` use `Task.Delay(15)` for ordering determinism.**
- **File:** `src/Fishtank.Api.IntegrationTests/Api/Story2_4_SystemEventsTests.cs:144`
- **What:** `await Task.Delay(15)` between two seeds to guarantee distinct `CreatedAt`. The anti-pattern table forbids `Task.Delay` specifically for **FSW tests** (waiting on OS events); this is a different use (timestamp separation) and is acceptable, but a small delay can be flaky under load. The project's MEMORY notes Windows timing sensitivity.
- **Suggested fix:** Optionally seed with explicit decreasing `CreatedAt` values via the entity rather than wall-clock delay. Low priority.

---

## Acceptance Criteria Audit

| AC | Status | Evidence |
|----|--------|----------|
| AC-1 list newest-first, 2 tabs, total badge, Load more | PASS | `ListAsync` sorts desc in-memory; `EventsPage` two tabs + `TabCount` from `page.total`; `events-btn-load-more` hides on `!hasNextPage`. Tests: `List_WarningsErrors_PagedAndFiltered`, `List_OrderedNewestFirst`. |
| AC-2 engine-crash root cause verbatim | PASS | `Message` rendered verbatim in `SystemEventItem` (screen variant `<span>`); backend stores exception text at creation sites (unchanged). |
| AC-3 broadcast warn/err only, badge real-time, map wired | PASS | `AddAsync` broadcasts only for Warning/Error; `HUB_INVALIDATION_MAP` has `SystemEventCreated: [["events"]]`; `useEventsHub` mounted once in `AppShell`. Tests: `UnreadCount_OnlyWarningsAndErrors`, e2e P0. |
| AC-4 panel warn/err only, 20+Load more, deep-link, service tag, resets on close | PASS | `NotificationPanel` uses `useSystemEvents("warnings-errors")`; infinite query resets on unmount (panel unmounts on close). Unit tests cover 20-on-open + Load-more→25. |
| AC-5 mark-read on body click; dismiss = view-only + marked read | PASS | `handleBodyClick`→`onMarkRead`; `handleDismiss`→`dismissedIds` + `markRead.mutate`; link/✕ `stopPropagation`. Unit tests cover both. |
| AC-6 mark-all-read, badge→0, button hidden at 0 | PASS | `useMarkAllRead`; button gated on `unread > 0`. Tests: `MarkAllRead_ZeroesUnreadCount`, unit hide-at-0. |
| AC-7 prepend "N new" pill, scroll preserved | PASS (diff approach) | `seenIdsRef` diff drives `newCount`; pill scrolls to top + resets; no second socket. Acceptable per story's preferred approach (not unit-tested — covered by design). |
| AC-8 "99+" overflow, `#ef4444`, aria-labels, hidden at 0 | PASS | `NotificationBadge` exact logic; CSS hardcoded `#ef4444`/white, min-width 24px, height 16px. Unit tests cover 42/150/99/0. |
| AC-9 close on nav/Esc/outside/second-click | PASS | `TopBar`: `pathname` effect, Esc listener, backdrop onClick, toggle. |
| AC-10 deep-link tab+scroll+amber 1s, reduced-motion | PARTIAL/PASS | `EventsPage` selects tab from `?tab`, scrolls + `amber-highlight` class, suppressed under reduced-motion. Gap (M3): events beyond page 1 not auto-loaded for highlight. |

---

## Convention Compliance

- **API envelope** `{success,data}` / `{success:false,error}`: consistent across all 5 endpoints. ✔
- **Auth on all endpoints:** `MapGroup("/api/system-events").RequireAuthorization()` covers all routes; `[Authorize]` on `EventsHub`. ✔ (test `List_Unauthenticated_Returns401`, `EventsHub_Unauthenticated_Returns401`)
- **Broadcast from service layer, not endpoints:** ✔ all `SendAsync` in `SystemEventService`.
- **No `accessTokenFactory`; `withCredentials`:** ✔ via `createHubConnection`.
- **HUB invalidation via map, not in-component `invalidateQueries`:** ✔ hub handler reads `HUB_INVALIDATION_MAP`; `UnreadCountChanged` is a direct cache write (sanctioned per Dev Notes, value push not refetch). Mutation `onSuccess` invalidations are in hooks (not components), which is the existing project pattern.
- **DTOs, not entities, returned:** ✔ `SystemEventDto`/`SystemEventPageDto`.
- **CSS variable theming:** ✔ except the sanctioned badge `#ef4444`/white (DESIGN.md line 219). One minor hover-tint hardcode noted (N2).
- **z-index:** panel 40, modal 60 — matches DESIGN.md stack. ✔
- **data-testid:** all canonical values present and verbatim; `topbar-btn-notification-mark-all-read` added per the naming rule and noted in the story. ✔
- **Reconnect in `signalr.ts` not the hook:** ✔ (`withAutomaticReconnect`).
- **SQLite `ORDER BY DateTimeOffset` avoided:** ✔ materialize-then-sort in `ListAsync`.
- **`topbar-bell-button` → `topbar-btn-bell` rename:** ✔ propagated to `story-1-3-shell.spec.ts`; grep confirms no other live consumer (remaining hits are doc/comment text only).
- **`Story2_1_ServicesTests` envelope migration:** ✔ updated to `?severity=warnings-errors&take=100` and reads `data.items`; still asserts the single error event with the "Blocked Service" message — correct and still meaningful.
- **Security:** no SSRF/injection surface; `MarkReadAsync` 404 message echoes the requested GUID only (no info leak); severity parsing defaults safely to warnings-errors; no raw SQL. ✔

---

## Cancellation Token Propagation

`ct` is threaded through every async call in `SystemEventService` (`SaveChangesAsync`, `ToListAsync`, `CountAsync`, `FirstOrDefaultAsync`, `SendAsync`). ✔

## Broadcast-Inside-Transaction Check

No explicit DB transaction wraps the `SendAsync` calls; broadcasts occur **after** `SaveChangesAsync` completes (no open transaction held across the hub round-trip). No deadlock surface. ✔

---

## Total Findings by Severity

- **BLOCKER:** 0
- **HIGH:** 1 (H1)
- **MEDIUM:** 3 (M1, M2, M3)
- **LOW:** 4 (L1, L2, L3, L4)
- **NIT:** 3 (N1, N2, N3)

**BLOCKER COUNT: 0**
