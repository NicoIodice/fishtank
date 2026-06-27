# Test Automation Summary — Story 2.4: System Events Screen & Notification Panel

**Phase:** `bmad-testarch-automate` (Create mode)
**Scope:** Story 2.4 new code paths only.
**Date:** 2026-06-26
**Baseline commit:** 74a2b59 (branch `release/v0.2.0`)

---

## Outcome

Story 2.4 entered this phase **already well-covered** — the implementation team shipped ATDD
integration tests (11) plus frontend component tests (NotificationBadge, NotificationPanel) and an
E2E spec. The code review confirmed all 10 ACs PASS with only quality findings (1 HIGH/3 MED/4 LOW),
none of which is a missing-test gap inside the 2.4 P0/P1 matrix.

Two genuine, low-redundancy gaps were identified and filled:

1. **Service-layer broadcast semantics (AC-3 negative path).** The integration suite proves `info`
   does not increment the unread *count*, but never asserts that `SystemEventCreated` /
   `UnreadCountChanged` are **not sent** for `info` — the actual SignalR send/no-send is invisible at
   the HTTP layer. Added a `SystemEventService` unit test (NSubstitute `IHubContext<EventsHub>`) that
   asserts the broadcast fires for warning/error and is suppressed for info, plus the DTO payload
   (verbatim message, lowercased severity), pagination `hasMore=false` boundary, and mark-read
   idempotency/unknown-id no-broadcast.
2. **Read-state visual cue (AC-5).** `NotificationPanel.test` asserts the `POST /{id}/read` fires but
   not the resulting read-state transition. Added a `SystemEventItem` component test asserting the
   severity-icon opacity cue (1 → 0.6), stopPropagation on link/✕, and the screen-variant verbatim
   message / omitted service tag.

No product bugs found. No regressions introduced. No pre-existing tests required fixing.

---

## Coverage Table (AC → test file → layer → status)

| AC | Behavior | Test file | Layer | Status |
|----|----------|-----------|-------|--------|
| AC-1 | List newest-first, 2 tabs, total badge, paginate 20 + Load more | `Story2_4_SystemEventsTests.cs` (`List_WarningsErrors_PagedAndFiltered`, `List_Info_ReturnsOnlyInfo`, `List_OrderedNewestFirst`) | Integration | Pre-existing |
| AC-1 | Pagination `hasMore=false` last-page **boundary** + info filter bound | `SystemEventServiceTests.cs` (`ListAsync_LastPage_HasMoreFalse`, `ListAsync_Info_FiltersAndBounds`) | Unit | **Added** |
| AC-2 | Engine-crash root cause rendered verbatim, never "stopped" | `SystemEventServiceTests.cs` (`AddAsync_BroadcastsDtoWithVerbatimMessage`); `SystemEventItem.test.tsx` (screen variant verbatim) | Unit / Component | **Added** |
| AC-3 | Broadcast `SystemEventCreated`+`UnreadCountChanged` for warn/err only; info never broadcasts / never affects badge | `SystemEventServiceTests.cs` (`AddAsync_WarningOrError_BroadcastsCreatedAndCount`, `AddAsync_Info_DoesNotBroadcast`); `Story2_4_SystemEventsTests.cs` (`UnreadCount_OnlyWarningsAndErrors`) | Unit + Integration | **Added** (negative broadcast) + Pre-existing (count) |
| AC-3 | `HUB_INVALIDATION_MAP` has `SystemEventCreated:[["events"]]`; hub auth 401/negotiate | `Story2_4_SystemEventsTests.cs` (`EventsHub_*`); `story-2-3-toast-hub.test.tsx` (map); E2E | Integration / Component / E2E | Pre-existing |
| AC-4 | Panel warn/err only, 20 on open, Load more → +20, hides when loaded; service tag | `NotificationPanel.test.tsx` (20-on-open, Load-more→25, service tag) | Component | Pre-existing |
| AC-5 | Mark-read on body click → `POST /{id}/read`; dismiss = view-only + marked read | `NotificationPanel.test.tsx` (body-click POST, ✕ removes from view); `MarkRead_DecrementsUnreadCount` | Component / Integration | Pre-existing |
| AC-5 | Read-state cue: icon opacity 1→0.6, no re-fire when read, stopPropagation on link/✕ | `SystemEventItem.test.tsx` (read-state cues block) | Component | **Added** |
| AC-5 | Mark-read unknown-id → false/no-broadcast; idempotent on already-read | `SystemEventServiceTests.cs` (`MarkReadAsync_UnknownId_*`, `MarkReadAsync_AlreadyRead_*`); `Story2_4_SystemEventsTests.cs` (`MarkRead_UnknownId_Returns404`) | Unit + Integration | **Added** + Pre-existing |
| AC-6 | Mark-all-read zeroes unread (incl. unpaginated); info untouched; button hidden at 0 | `SystemEventServiceTests.cs` (`MarkAllReadAsync_ZeroesUnreadAcrossAllPages`); `Story2_4_SystemEventsTests.cs` (`MarkAllRead_ZeroesUnreadCount`, `MarkAllRead_LeavesInfoEvents`); `NotificationPanel.test.tsx` (hidden at 0) | Unit + Integration + Component | **Added** (unpaginated) + Pre-existing |
| AC-7 | Prepend-while-open + "N new" pill, scroll preserved | (design-covered; diff approach) | — | Intentional gap (see below) |
| AC-8 | "99+" overflow, `#ef4444`/white, aria-labels, hidden at 0 | `NotificationBadge.test.tsx` (42 / 150 / 99 / 0) | Component | Pre-existing |
| AC-9 | Panel closes on nav / Esc / outside-click / second bell click | `story-2-4-system-events.spec.ts` (sidebar nav closes panel) | E2E | Pre-existing |
| AC-10 | Deep-link tab+scroll+amber 1s, reduced-motion | `story-2-4-system-events.spec.ts`; `SystemEventItem.test.tsx` (link href contract) | E2E / Component | Pre-existing + **Added** (link target) |

---

## Tests Added This Phase

**Backend unit — `src/Fishtank.Api.UnitTests/Services/SystemEventServiceTests.cs` (NEW, 9 tests)**
- `AddAsync_WarningOrError_BroadcastsCreatedAndCount` (Theory: Warning, Error)
- `AddAsync_Info_DoesNotBroadcast`
- `AddAsync_BroadcastsDtoWithVerbatimMessage`
- `ListAsync_LastPage_HasMoreFalse`
- `ListAsync_Info_FiltersAndBounds`
- `MarkReadAsync_UnknownId_ReturnsFalseNoBroadcast`
- `MarkReadAsync_AlreadyRead_NoExtraBroadcast`
- `MarkAllReadAsync_ZeroesUnreadAcrossAllPages`

**Frontend component — `src/client/tests/unit/features/events/SystemEventItem.test.tsx` (NEW, 7 tests)**
- unread item → icon full opacity
- read item → icon opacity 0.6 + no re-fire on body click
- unread body click → `onMarkRead(id)` once
- inline deep-link → no bubble to `onMarkRead`, href `=/events?tab=warnings-errors&id={id}`
- ✕ dismiss → `onDismiss` only (not `onMarkRead`)
- screen variant → `events-item-{id}` testid, verbatim message, no link wrapper
- screen variant → service tag omitted when `serviceName` null

Total added: **16 tests** (9 backend unit + 7 frontend component).

---

## Test Counts Per Suite (final)

| Suite | Before | After | Delta |
|-------|--------|-------|-------|
| `Fishtank.Api.UnitTests` | 49 | **58** | +9 |
| `Fishtank.Api.IntegrationTests` | 70 | **70** | 0 |
| Frontend unit (vitest) | 108 (11 files) | **115 (12 files)** | +7 |

All suites GREEN. Frontend `npm run build` → 0 TS errors; `tsc -p tsconfig.e2e.json` → exit 0.

---

## Coverage Gaps Intentionally Left

- **AC-7 ("N new" prepend pill):** Not unit-tested. Implemented via the story's preferred
  single-socket diff approach (`seenIdsRef` against invalidated query data). Asserting it
  deterministically requires driving a live SignalR push + controlled scroll geometry, which is an
  E2E/visual concern rather than a unit concern; the code review accepted it as design-covered. Not
  worth a brittle jsdom scroll/observer simulation.
- **Clear-all (cross-session H1, MED M2):** Explicitly **out of scope** for the 2.4 P0/P1 test matrix
  (test-design-epic-2.md 226–242). Clear-all has working local-session coverage via mutation
  `onSuccess`; cross-session staleness (review H1) is a documented accepted limitation for the
  deferred feature, not a 2.4 AC. No tests added.
- **Deep-link beyond page 1 (review M3):** Known partial-AC gap — a deep link to an event past the
  first 20 in its group silently no-ops (no "load until found"). The review accepted this for 2.4
  (panel links target recent/page-1 events). The link-target *contract* is now asserted in
  `SystemEventItem.test.tsx`; the page-1 scroll/highlight is E2E-covered. Auto-load-until-found is a
  product hardening item, not a test gap, and is left to a follow-up.
- **E2E spec (`story-2-4-system-events.spec.ts`):** Not executed this phase (per instructions);
  typechecks clean.

---

## Regressions / Product Bugs

None. No pre-existing test broke; no product behavior was changed; no new product bug discovered.
The new tests confirm the existing implementation behaves per AC-1/2/3/5/6.
