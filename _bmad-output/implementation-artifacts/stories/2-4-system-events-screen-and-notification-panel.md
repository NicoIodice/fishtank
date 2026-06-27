---
story_id: "2.4"
epic: 2
story_key: 2-4-system-events-screen-and-notification-panel
story_title: "System Events Screen & Notification Panel"
status: done
priority: high
baseline_commit: 74a2b59
---

# Story 2.4: System Events Screen & Notification Panel

## Story

**As a** developer,
**I want** to see infrastructure warnings and errors on a dedicated System Events screen and as a real-time notification badge in the top bar,
**So that** I can quickly diagnose when services fail to start, volumes are unavailable, or file writes fail.

---

## Status

Review

---

## Context

### Background

This story delivers two surfaces over the existing `SystemEvent` data: a dedicated **System Events screen** at `/events`, and a real-time **notification bell + Notification Panel** in the top bar. The backend already creates `SystemEvent` rows on engine failures, exposes a single read endpoint, and a fully-wired `EventsHub` skeleton exists from Story 2.3 (no broadcast yet). Everything else — the mark-as-read / unread-count / pagination / severity-filter endpoints, the broadcast on creation, the frontend panel, the events page, and the bell wiring — is new.

**Backend state entering this story (verified):**

- **Entity** `src/Fishtank.Api/Data/Entities/SystemEvent.cs` (lines 3–14) — already has every field the UI needs:
  `Id (Guid)`, `Severity (SystemEventSeverity enum: Info | Warning | Error)`, `Message (string)`, `ServiceId (Guid?)`, `Service (nav)`, `CreatedAt (DateTimeOffset)`, `IsRead (bool, default false)`. **No schema change is required** for the core flow — `IsRead` already exists, so mark-as-read needs no migration.
- **Service** `src/Fishtank.Api/Services/ISystemEventService.cs` (lines 5–12) + `SystemEventService.cs` (lines 6–22) — exposes only `AddAsync(severity, message, serviceId, ct)`. It does **NOT** inject `IHubContext<EventsHub>` and does **NOT** broadcast. There are **no** read/query/mark-read methods. **Missing for 2.4:** broadcast on warning/error creation, `ListAsync` with pagination + severity filter, `MarkReadAsync(id)`, `MarkAllReadAsync()`, `GetUnreadCountAsync()`, `DismissAsync(id)` (= mark read), and `ClearAllAsync(severityGroup)`.
- **Endpoint** `src/Fishtank.Api/Endpoints/SystemEventsEndpoints.cs` (lines 9–34) — single route `GET /api/system-events` (`.RequireAuthorization()`), returns ALL events sorted desc by `CreatedAt` (sorted **client-side in C#** because SQLite can't `ORDER BY` a `DateTimeOffset` — line 18–19), projecting `{ id, severity (lowercased string), message, serviceId, createdAt, isRead }`. **No pagination, no severity filter, no service name, no mark-read/unread-count/clear endpoints.**
- **Creation sites** `src/Fishtank.Api/Services/ServiceManager.cs` — `CreateAsync` (lines 73–77) and `StartAsync` (lines 175–178) call `systemEvents.AddAsync(SystemEventSeverity.Error, …, service.Id, ct)` when WireMock fails to start. These are the "engine-crash" events the AC references (message already includes the exception text).
- **Hub** `src/Fishtank.Api/Hubs/EventsHub.cs` (lines 6–11) — `[Authorize]`-decorated `Hub` skeleton, mapped at `/hubs/events` in `Program.cs` line 235. No events broadcast yet — wiring those is THIS story.
- **The `ServiceStatusChanged` broadcast pattern to mirror** lives in `ServiceManager.cs` lines 141–144 (in `StopAsync`) and 184–188 (in `StartAsync`): `IHubContext<ServicesHub>` is a primary-constructor param (line 23, registered automatically by `builder.Services.AddSignalR()` — `Program.cs` line 156) and broadcasts via `await servicesHub.Clients.All.SendAsync("ServiceStatusChanged", new { … }, ct);`. We mirror this exactly with `IHubContext<EventsHub>` injected into `SystemEventService`.
- **DI registration** `Program.cs` line 159 — `builder.Services.AddScoped<ISystemEventService, SystemEventService>();` (no change needed; the new ctor param is injected automatically).
- `ApiResponse.Ok(data)` / `ApiResponse.Fail(code, message)` envelope helper at `src/Fishtank.Api/Endpoints/ApiResponse.cs` — every endpoint returns `{ success, data }` or `{ success, error }`.

**Frontend state entering this story (verified):**

- **Bell placeholder** `src/client/src/components/layout/TopBar.tsx` lines 81–87 — an inert `<button>` with `data-testid="topbar-bell-button"`, `aria-label="Notifications"`, icon `bi-bell`. It has **no badge, no panel, no click handler**. Per DESIGN.md the canonical testids are `topbar-btn-bell` (button), `topbar-badge-bell` (badge), `topbar-panel-notifications` (panel) — the existing `topbar-bell-button` testid must be **renamed to `topbar-btn-bell`** to match the canonical convention.
- **Router** `src/client/src/router.tsx` line 50 — `{ path: "events", element: <EventsPage /> }` already exists inside the authenticated `AppShell` outlet. The `EventsPage` at `src/client/src/features/events/pages/EventsPage.tsx` is a placeholder stub (8 lines, "Configured in a later story.") — **replace it**.
- **Sidebar** `src/client/src/components/layout/Sidebar.tsx` lines 34–39 — `/events` nav item already present (`bi-journal-text`, testid `sidebar-nav-events`, label "System Events"). No change needed; per EXPERIENCE.md line 57 the sidebar shows **no badge**.
- **`HUB_INVALIDATION_MAP`** `src/client/src/lib/queryClient.ts` lines 3–5 — currently `{ ServiceStatusChanged: [["services"]] }`. Add `SystemEventCreated: [["events"]]`.
- **`createHubConnection(url)`** `src/client/src/lib/signalr.ts` — factory with `withCredentials` + `withAutomaticReconnect`; "DO NOT call .start() here". Mirror for the new hub hook.
- **`useServicesHub`** `src/client/src/features/services/hooks/useServicesHub.ts` (lines 11–33) — the exact pattern to mirror for a new `useEventsHub`.
- **`apiFetch<T>`** `src/client/src/lib/api.ts` (lines 11–47) — unwraps `{ success, data }`, throws `ApiError`, redirects on 401. All API calls go through it (never raw `fetch`).
- **`useShowToast`** `src/client/src/lib/ToastContext.tsx` (lines 22–27) — toast hook (returns a no-op outside provider, so component tests don't need the provider). `ToastProvider` is already mounted in `main.tsx` lines 33–35.
- **`DataTable<T>`** `src/client/src/components/ui/DataTable.tsx` — generic sortable table (story 2.2). The System Events screen is a **flat list, newest-first, with custom per-item layout (icon + message + service tag + dismiss)** per DESIGN.md line 402, NOT a tabular grid — so the events screen uses a bespoke list component, **not** `DataTable`. `DataTable` is reused elsewhere (services table) and is left untouched.
- **`AppShell`** `src/client/src/components/layout/AppShell.tsx` mounts `useServicesHub()` (line 15). We add `useEventsHub()` here too (mount once).
- React Query patterns to mirror: `src/client/src/features/services/hooks/useServices.ts` (query keys as `const`, `useQuery`/`useMutation`, optimistic `onMutate`/`onError`/`onSettled` with rollback snapshot).

### Implementation Sequence for This Story

1. **Backend**: Extend `ISystemEventService` + `SystemEventService` — inject `IHubContext<EventsHub>`; add `ListAsync` (paged + severity-group filter), `MarkReadAsync`, `MarkAllReadAsync`, `GetUnreadCountAsync`, `ClearAllAsync`; broadcast `SystemEventCreated` + `UnreadCountChanged` from `AddAsync` when severity is Warning/Error.
2. **Backend**: Add the `SystemEventDto` (Models/) with `serviceName` resolved.
3. **Backend**: Extend `SystemEventsEndpoints` — paged list with `?severity=warnings-errors|info`, `take`/`skip`, plus `POST /{id}/read`, `POST /read-all`, `GET /unread-count`, `DELETE /clear`.
4. **Frontend**: `src/client/src/features/events/types/systemEvent.ts` — DTO type + helpers (severity icon/color map).
5. **Frontend**: `useSystemEvents` hooks (`features/events/hooks/useSystemEvents.ts`) — paged list query, unread-count query, mark-read / mark-all-read / dismiss / clear mutations.
6. **Frontend**: `useEventsHub` hook (`features/events/hooks/useEventsHub.ts`) — mirror `useServicesHub`; on `SystemEventCreated` invalidate via `HUB_INVALIDATION_MAP`, on `UnreadCountChanged` set the unread-count cache.
7. **Frontend**: Update `HUB_INVALIDATION_MAP` with `SystemEventCreated: [["events"]]`.
8. **Frontend**: `NotificationPanel` component + `SystemEventItem` (shared between panel and events screen) + the bell badge in `TopBar`.
9. **Frontend**: Wire bell open/close + navigation-close + outside-click + Esc in `TopBar`; mount `useEventsHub()` in `AppShell`.
10. **Frontend**: Build the `/events` screen (`EventsPage`) — two tabs (Warnings & Errors | Info), flat list newest-first, Load more, deep-link highlight, mark-all-read, clear-all (confirm dialog).
11. **Backend integration tests**: `Story2_4_SystemEventsTests.cs`.
12. **Frontend component tests**: `NotificationBadge.test.tsx`, `NotificationPanel.test.tsx`.
13. **E2E**: `src/client/tests/e2e/story-2-4-system-events.spec.ts`.

### Event Contracts (from `project-context.md#SignalR Hub Events`, lines 108–115)

```
Hub:   /hubs/events
Event: SystemEventCreated   Payload: SystemEvent DTO   (broadcast only for severity warning|error)
Event: UnreadCountChanged   Payload: { count: number }
```

- `SystemEventCreated` is broadcast **only** when a `warning` or `error` event is created (info/success never increment the bell — EXPERIENCE.md line 108, DESIGN.md line 462).
- `HUB_INVALIDATION_MAP` gets `SystemEventCreated: [["events"]]` (AC source, epics.md line 697).
- `UnreadCountChanged` is broadcast alongside `SystemEventCreated` and after every server-side read/clear mutation so the badge stays authoritative on all sessions.

### Notification Panel & Badge Rules (from DESIGN.md / EXPERIENCE.md)

- **Scope:** warnings + errors **only**; info/success excluded (EXPERIENCE.md line 102; DESIGN.md line 462).
- **Pagination:** 20 on open; "Load more" loads next 20 per click; **no infinite scroll** (not keyboard-operable); button hidden once all loaded; pagination state resets on close/reopen (EXPERIENCE.md line 103; DESIGN.md line 464).
- **Per-item:** severity icon + message (message contains an inline hyperlink to `/events?tab=warnings-errors&id={event-id}`) + timestamp + service tag (if applicable) + dismiss (✕) (EXPERIENCE.md line 104).
- **Mark as read (click body):** badge decrements, unread background removed, **item stays visible** in read state (EXPERIENCE.md line 105). Unread item = elevated background (`var(--content-surface)`) + full-opacity icon; read item = standard background + icon at `opacity: 0.6` (the icon-opacity is a non-color secondary cue — DESIGN.md line 466).
- **Dismiss (✕):** removes from panel view only; underlying event **stays in DB and is marked read** (EXPERIENCE.md line 106). Tooltip: "Dismiss — removes from this panel; event remains in System Events and is marked read." `aria-label` on the dismiss button.
- **Mark all read:** marks ALL server-side unread warnings+errors (incl. unpaginated) read; badge → 0 immediately; displayed items stay visible in read state; **button hidden when unread = 0** (EXPERIENCE.md line 107; DESIGN.md line 460/107). `aria-label="Mark all notifications as read"`.
- **Prepend-while-open:** new warning/error events arriving while the panel is open are **prepended**; badge increments; scroll position unchanged; when scrolled below top a sticky **"N new"** pill appears at the top — clicking it scrolls to top and dismisses the pill; N resets to 0 when the user reaches the top (EXPERIENCE.md line 103).
- **Badge:** counts unread warnings+errors only; 1–99 shows the number; **"99+" above 99**; `min-width` accommodates three chars at `2xs` (10px) scale; badge color is **always `#ef4444`** with white text, never themed (DESIGN.md lines 219–225, 108; `topbar-badge-size: 16px` height, min-width ≥ 24px — DESIGN.md line 123). New-event pulse `scale 1.0→1.3→1.0` 150ms (DESIGN.md line 322); suppressed under `prefers-reduced-motion` (DESIGN.md line 333).
- **Panel:** opens on bell click; closes on click outside, Esc, second bell click, **and any navigation event** (sidebar click, logo click, browser back/forward) (EXPERIENCE.md line 101). Right-aligned, max-width 360px, `z-index: 40` (DESIGN.md line 302 z-index stack: Notification panel = 40). On < 640px: `width: calc(100vw - 16px)`, centered (DESIGN.md line 460).
- **Empty state:** `bi-bell-slash` (32px, muted) + "No warnings or errors — all caught up." (EXPERIENCE.md line 110; DESIGN.md line 602).
- **Footer:** `1px var(--border)` top border + center-aligned muted link "See all events in System Events →" → `/events` (DESIGN.md line 462), testid `topbar-link-notification-panel-footer`.
- **Bell ARIA:** button `aria-label="Notifications — warnings and errors"` + `aria-haspopup="true"` + `aria-expanded` (DESIGN.md line 617). Badge `aria-label="{N} unread warnings and errors"` (≤99) / `"More than 99 unread warnings and errors"` (>99), `aria-live="polite"` (DESIGN.md line 561, 633).

### System Events Screen Rules (from DESIGN.md lines 399–420, EXPERIENCE.md lines 399–420)

- **Two tabs:** "Warnings & Errors" (`events-tab-warnings`) | "Info" (`events-tab-info`); tab headers show **total** count badges (all items in tab, not just unread — DESIGN.md line 408).
- **Both tabs:** flat list, newest-first, no sub-grouping; "Load more" loads 20 more per click; hidden when all loaded (DESIGN.md line 408).
- **Item layout:** severity icon + message (file paths/GUIDs in inline `<code>`) + timestamp + service tag (if applicable) + dismiss (✕). Item testid `events-item-{id}`.
- **Severity icons** (Warnings & Errors tab): error → red icon, warning → orange. (Info tab: success `bi-check-circle-fill`; operational/Resync `bi-arrow-repeat`; container startup `bi-rocket-takeoff` — DESIGN.md line 404.) Use a shared severity→icon/color map.
- **Deep-link:** `?id={event-id}` scrolls the matching item into view + 1s amber highlight (`animation: amber-highlight 1s ease-out forwards`), suppressed under `prefers-reduced-motion` (DESIGN.md line 406). `?tab=warnings-errors` selects the tab.
- **Engine-crash events** must always surface the failure reason (root cause / stack-trace excerpt / offending mapping path) — the backend already writes the exception text into `Message` at the failure sites; the screen renders `Message` verbatim and never reduces a crash to "stopped" (AC source epics.md line 692–693).
- **Page header actions** show only the active tab's buttons: Warnings & Errors → "Mark all read" (`events-btn-mark-all-read`) + "Clear all" (`events-btn-clear-all-warnings`); Info → "Clear all" only (`events-btn-clear-all-info`). "Mark all read" has identical server-side scope to the bell panel's (DESIGN.md line 410).
- **Clear all** is a permanent server-side delete requiring a confirmation dialog (`events-modal-clear-all-warnings-confirm` / `events-modal-clear-all-info-confirm`). **Scope note:** Clear-all is included for completeness of a working screen, but the P0/P1 test scenarios (test-design-epic-2.md lines 226–242) cover list/badge/read/dismiss/mark-all/navigation — clear-all is not in the 2.4 test matrix and may be deferred to a follow-up if scope must be cut; if deferred, the buttons must be hidden, not shown-inert.
- **Empty state:** `bi-journal-text` (48px, muted) + "No events yet" + "System events will appear here as services start and stop." (DESIGN.md line 601).
- `?id=` deep link and `?tab=` are read via `useSearchParams` from `react-router-dom`.

### Canonical `data-testid` values (DESIGN.md lines 687–694, 776–786 — use verbatim)

| Element | testid |
|---|---|
| Notification bell button | `topbar-btn-bell` |
| Notification badge | `topbar-badge-bell` |
| Notification panel | `topbar-panel-notifications` |
| Notification item (per item) | `topbar-notification-item-{id}` |
| Notification item dismiss button | `topbar-notification-item-dismiss-{id}` |
| Notification panel "Load more" | `topbar-btn-notification-load-more` |
| Notification panel footer link | `topbar-link-notification-panel-footer` |
| Notification panel "N new" pill | `topbar-btn-notification-new-pill` |
| Notification panel "Mark all read" | `topbar-btn-notification-mark-all-read` (not in the canonical table — added per project-context.md line 105 naming rule; note in PR) |
| Events page | `page-events` (existing stub already uses this) |
| Events warnings tab | `events-tab-warnings` |
| Events info tab | `events-tab-info` |
| Events mark-all-read button | `events-btn-mark-all-read` |
| Events clear-all (warnings) button | `events-btn-clear-all-warnings` |
| Events clear-all (info) button | `events-btn-clear-all-info` |
| Events event item (per item) | `events-item-{id}` |
| Events load-more button | `events-btn-load-more` |
| Events clear-all warnings confirm dialog / button | `events-modal-clear-all-warnings-confirm` / `events-btn-clear-all-warnings-confirm` |
| Events clear-all info confirm dialog / button | `events-modal-clear-all-info-confirm` / `events-btn-clear-all-info-confirm` |

### Previous Story Learnings (Story 2.3)

- `IHubContext<T>` is auto-registered by `builder.Services.AddSignalR()` (already called, `Program.cs` line 156) — **do not** register it manually; just add the constructor parameter (Story 2.3 added `IHubContext<ServicesHub>` to `ServiceManager` ctor, line 23).
- Broadcast from the **service layer**, never from endpoint handlers (architecture boundary, project-context.md line 129). `await hub.Clients.All.SendAsync("EventName", new { … }, ct);`.
- **SQLite cannot `ORDER BY` a `DateTimeOffset`** — the list endpoint sorts client-side in C# after `.ToListAsync()` (`SystemEventsEndpoints.cs` line 18, `ServiceManager.ListAsync` line 84). Pagination must therefore materialize-then-sort-then-page in memory (the 1000-event retention cap, EXPERIENCE.md line 416, keeps this cheap).
- Hub auth: cookies ride the WebSocket upgrade natively — `withCredentials: true` in `createHubConnection`, no `accessTokenFactory`. `[Authorize]` on the hub rejects unauthenticated negotiate with `401` (Story 2.3 integration tests assert `GET /hubs/events` → 401).
- Frontend hub hooks: mount **once** in `AppShell`, never per-component; reconnect lives in `lib/signalr.ts`; invalidation goes through `HUB_INVALIDATION_MAP`, never a direct `invalidateQueries` inside a SignalR component handler (project-context.md line 117; story 2.3 Dev Notes).
- `useShowToast()` returns a no-op outside `ToastProvider`, so component tests can render without wrapping in the provider (`ToastContext.tsx` lines 24–26).
- `data-testid` pattern for dynamic elements: `{element-type}-{id}` (e.g. `topbar-notification-item-{id}`). Use canonical DESIGN.md values verbatim; never used for styling.
- All CSS uses CSS-variable theming (`var(--brand)`, `var(--content-surface)`, `var(--border)`, `var(--content-muted)`) — **except the notification badge**, which is hard-coded `#ef4444` / white per DESIGN.md line 219 (the one documented exception to "no hardcoded colors").
- Integration tests extend `IntegrationTestBase`, seed via `POST /api/auth/setup` then `TestAuthHelper.CreateAuthenticatedClientAsync`, and assert hub auth via `GET /hubs/<name>` → 401 and `POST /hubs/<name>/negotiate?negotiateVersion=1` (authenticated) → 200 with `connectionId` (Story2_3 pattern). `ResetDatabaseAsync` wipes `SystemEvents` first (factory line 72).
- E2E specs are RED-phase ATDD scaffolds against the **live stack** — no backend mocking except the allowed exceptions (project-context.md lines 273–291). SignalR push sequences are an allowed `page.route()` exception (line 281); badge real-time can be triggered by hitting a real endpoint that creates a warning/error event.

---

## Acceptance Criteria

**AC-1 — System Events screen lists events newest-first (FR-22):**
**Given** the `/events` route,
**When** the page loads,
**Then** all System Events are displayed ordered by `CreatedAt` **descending**, each showing severity icon, message, associated service name (when `serviceId` is set), and timestamp; the screen has two tabs "Warnings & Errors" (default) and "Info", each tab header shows a total count badge, and each tab list paginates 20-at-a-time via a "Load more" button (`events-btn-load-more`) that hides once all items are loaded.

**AC-2 — Engine-crash root cause is always present (FR-22):**
**Given** a System Event created by an engine start/restart failure,
**Then** its `message` includes the failure reason (the exception text / offending detail captured at `ServiceManager.CreateAsync` line 73–76 and `StartAsync` line 175–178); the System Events screen renders the message verbatim (file paths and GUIDs in inline `<code>`) and a crashed service is never surfaced as merely "stopped" — the failure reason is always shown.

**AC-3 — `SystemEventCreated` broadcast increments the badge in real time on all sessions (FR-23):**
**Given** `EventsHub` is wired to the frontend via `useEventsHub` mounted in `AppShell`,
**When** a new System Event of severity `warning` or `error` is created,
**Then** `EventsHub` broadcasts `SystemEventCreated` (payload = SystemEvent DTO) **and** `UnreadCountChanged` (`{ count }`) to all connected clients; the notification bell badge (`topbar-badge-bell`) increments in real time on every session; `HUB_INVALIDATION_MAP` contains `SystemEventCreated: [["events"]]` so the events list re-fetches; `info`/`success` events do **not** broadcast `SystemEventCreated` and do **not** affect the badge.

**AC-4 — Notification Panel content & pagination (FR-23, UX-DR11):**
**Given** the notification bell (`topbar-btn-bell`) is clicked,
**When** the Notification Panel (`topbar-panel-notifications`) opens,
**Then** it shows **warnings and errors only** (no info/success); 20 items on initial open; a "Load more" button (`topbar-btn-notification-load-more`) loads the next 20 per click (no infinite scroll) and hides when all are loaded; each item (`topbar-notification-item-{id}`) shows severity icon, message with an inline hyperlink to `/events?tab=warnings-errors&id={event-id}`, timestamp, and a service tag when `serviceName` is present; pagination state resets on close/reopen.

**AC-5 — Per-item mark-as-read and dismiss (FR-23, UX-DR11):**
**Given** the Notification Panel is open with unread items,
**When** anywhere on an item body is clicked,
**Then** that item is marked read server-side (`POST /api/system-events/{id}/read`), the badge decrements, the unread background is removed and the severity icon drops to `opacity: 0.6`, and the item **remains visible** in read state;
**When** the dismiss (✕) button (`topbar-notification-item-dismiss-{id}`) is clicked,
**Then** the item is removed from the panel view only, the underlying System Event remains in the database and is marked read (same `POST /{id}/read` server call), and it does not reappear unless the condition recurs.

**AC-6 — "Mark all read" (FR-23):**
**Given** "Mark all read" (`topbar-btn-notification-mark-all-read`) in the panel header,
**When** clicked,
**Then** all server-side unread warnings+errors (including unpaginated items) are marked read via `POST /api/system-events/read-all`, the badge resets to zero, the displayed items remain visible in read state, and the button is **hidden whenever the unread count is 0** (re-renders when new unread items arrive).

**AC-7 — Prepend-while-open with "N new" pill (FR-23, UX-DR11):**
**Given** the panel is open and the user is scrolled below the top,
**When** new warning/error events arrive (via `SystemEventCreated`),
**Then** they are prepended to the list, the badge increments, the scroll position is unchanged, and a sticky "N new" pill (`topbar-btn-notification-new-pill`) appears at the top of the list area; clicking it scrolls to top and dismisses the pill; N resets to 0 when the user reaches the top.

**AC-8 — Badge overflow & color (FR-23, DESIGN.md):**
**Given** the unread count exceeds 99,
**Then** the badge (`topbar-badge-bell`) displays `"99+"` with `min-width` accommodating three characters at the `2xs` (10px) scale; the badge background is always `#ef4444` with white text regardless of the active theme; the badge `aria-label` is `"{N} unread warnings and errors"` for N ≤ 99 and `"More than 99 unread warnings and errors"` for N > 99, with `aria-live="polite"`; the badge is not rendered when the count is 0.

**AC-9 — Panel closes on navigation (FR-23):**
**Given** the Notification Panel is open,
**When** any navigation event occurs (sidebar nav click, logo click, browser back/forward, or any route change),
**Then** the panel closes automatically; it also closes on Esc, click-outside, and a second bell click.

**AC-10 — Deep-link from panel to events screen (UX-DR11, FR-22):**
**Given** an item's inline hyperlink to `/events?tab=warnings-errors&id={event-id}` is followed,
**When** the events screen loads with `?id=`,
**Then** the "Warnings & Errors" tab is selected and the matching event item (`events-item-{id}`) is scrolled into view and highlighted with a 1-second amber fade (`amber-highlight`), suppressed under `prefers-reduced-motion` (item still scrolled into view).

---

## Tasks / Subtasks

### Task 1: Add `SystemEventDto` (AC: #1, #3, #4)

- [x] Create `src/Fishtank.Api/Models/SystemEventDto.cs`:
  ```csharp
  namespace Fishtank.Api.Models;

  public record SystemEventDto(
      Guid Id,
      string Severity,          // "info" | "warning" | "error" (lowercased)
      string Message,
      Guid? ServiceId,
      string? ServiceName,      // resolved display name, null when no service
      DateTimeOffset CreatedAt,
      bool IsRead);

  public record SystemEventPageDto(
      IReadOnlyList<SystemEventDto> Items,
      int Total,                // total matching the severity filter
      bool HasMore);            // more pages available beyond Items
  ```

### Task 2: Extend `ISystemEventService` + `SystemEventService` with broadcast & queries (AC: #1, #3, #5, #6)

- [x] Update `src/Fishtank.Api/Services/ISystemEventService.cs`:
  ```csharp
  using Fishtank.Api.Data.Entities;
  using Fishtank.Api.Models;

  namespace Fishtank.Api.Services;

  public enum SystemEventGroup { WarningsErrors, Info }

  public interface ISystemEventService
  {
      Task AddAsync(SystemEventSeverity severity, string message,
          Guid? serviceId = null, CancellationToken ct = default);

      Task<SystemEventPageDto> ListAsync(SystemEventGroup group, int skip, int take,
          CancellationToken ct = default);

      Task<bool> MarkReadAsync(Guid id, CancellationToken ct = default);
      Task<int> MarkAllReadAsync(CancellationToken ct = default);   // warnings+errors only
      Task<int> GetUnreadCountAsync(CancellationToken ct = default); // warnings+errors only
      Task ClearAllAsync(SystemEventGroup group, CancellationToken ct = default);
  }
  ```

- [x] Rewrite `src/Fishtank.Api/Services/SystemEventService.cs` — inject `IHubContext<EventsHub>` (mirror `ServiceManager` ctor line 17–23) and broadcast on warning/error creation. Key points: severity-group maps `WarningsErrors → {Warning, Error}`, `Info → {Info}`; sort client-side after `ToListAsync` (SQLite limitation); resolve `ServiceName` via a join/lookup; broadcast `SystemEventCreated` + `UnreadCountChanged` only for Warning/Error.
  ```csharp
  using Fishtank.Api.Data;
  using Fishtank.Api.Data.Entities;
  using Fishtank.Api.Hubs;
  using Fishtank.Api.Models;
  using Microsoft.AspNetCore.SignalR;
  using Microsoft.EntityFrameworkCore;

  namespace Fishtank.Api.Services;

  public class SystemEventService(
      FishtankDbContext db,
      IHubContext<EventsHub> eventsHub) : ISystemEventService
  {
      private static readonly SystemEventSeverity[] WarnErr =
          [SystemEventSeverity.Warning, SystemEventSeverity.Error];

      public async Task AddAsync(SystemEventSeverity severity, string message,
          Guid? serviceId = null, CancellationToken ct = default)
      {
          var entity = new SystemEvent { Severity = severity, Message = message, ServiceId = serviceId };
          db.SystemEvents.Add(entity);
          await db.SaveChangesAsync(ct);

          // Bell only reacts to warnings + errors (DESIGN.md line 462)
          if (severity is SystemEventSeverity.Warning or SystemEventSeverity.Error)
          {
              var serviceName = serviceId is null
                  ? null
                  : await db.Services.Where(s => s.Id == serviceId)
                      .Select(s => s.Name).FirstOrDefaultAsync(ct);

              var dto = new SystemEventDto(entity.Id,
                  severity.ToString().ToLowerInvariant(), message,
                  serviceId, serviceName, entity.CreatedAt, entity.IsRead);

              await eventsHub.Clients.All.SendAsync("SystemEventCreated", dto, ct);
              await BroadcastUnreadCountAsync(ct);
          }
      }

      public async Task<SystemEventPageDto> ListAsync(SystemEventGroup group, int skip, int take,
          CancellationToken ct = default)
      {
          var severities = SeveritiesFor(group);
          // SQLite can't ORDER BY DateTimeOffset — materialise then sort/page in memory.
          var all = (await db.SystemEvents
                  .Where(e => severities.Contains(e.Severity))
                  .Include(e => e.Service)
                  .ToListAsync(ct))
              .OrderByDescending(e => e.CreatedAt)
              .ToList();

          var page = all.Skip(skip).Take(take)
              .Select(e => new SystemEventDto(e.Id, e.Severity.ToString().ToLowerInvariant(),
                  e.Message, e.ServiceId, e.Service?.Name, e.CreatedAt, e.IsRead))
              .ToList();

          return new SystemEventPageDto(page, all.Count, skip + page.Count < all.Count);
      }

      public async Task<bool> MarkReadAsync(Guid id, CancellationToken ct = default)
      {
          var e = await db.SystemEvents.FirstOrDefaultAsync(x => x.Id == id, ct);
          if (e is null) return false;
          if (!e.IsRead) { e.IsRead = true; await db.SaveChangesAsync(ct); await BroadcastUnreadCountAsync(ct); }
          return true;
      }

      public async Task<int> MarkAllReadAsync(CancellationToken ct = default)
      {
          var unread = await db.SystemEvents
              .Where(e => WarnErr.Contains(e.Severity) && !e.IsRead).ToListAsync(ct);
          foreach (var e in unread) e.IsRead = true;
          if (unread.Count > 0) { await db.SaveChangesAsync(ct); await BroadcastUnreadCountAsync(ct); }
          return unread.Count;
      }

      public Task<int> GetUnreadCountAsync(CancellationToken ct = default) =>
          db.SystemEvents.CountAsync(e => WarnErr.Contains(e.Severity) && !e.IsRead, ct);

      public async Task ClearAllAsync(SystemEventGroup group, CancellationToken ct = default)
      {
          var severities = SeveritiesFor(group);
          var toRemove = await db.SystemEvents.Where(e => severities.Contains(e.Severity)).ToListAsync(ct);
          db.SystemEvents.RemoveRange(toRemove);
          await db.SaveChangesAsync(ct);
          if (group == SystemEventGroup.WarningsErrors) await BroadcastUnreadCountAsync(ct);
      }

      private async Task BroadcastUnreadCountAsync(CancellationToken ct)
      {
          var count = await GetUnreadCountAsync(ct);
          await eventsHub.Clients.All.SendAsync("UnreadCountChanged", new { count }, ct);
      }

      private static SystemEventSeverity[] SeveritiesFor(SystemEventGroup g) =>
          g == SystemEventGroup.WarningsErrors ? WarnErr : [SystemEventSeverity.Info];
  }
  ```
  - **Verify** `IServiceManager`/`ServiceManager` need no change — `ServiceManager.cs` already calls `systemEvents.AddAsync(...)` (lines 73, 175); the new broadcast happens transparently inside `AddAsync`.
  - **No migration needed** — `IsRead` already exists on the entity (line 11).

### Task 3: Extend `SystemEventsEndpoints` (AC: #1, #5, #6, #8)

- [x] Rewrite `src/Fishtank.Api/Endpoints/SystemEventsEndpoints.cs` to a route group, keeping the existing `GET /api/system-events` behavior but adding the filter+pagination and the mutation routes. All `.RequireAuthorization()`.
  ```csharp
  using Fishtank.Api.Services;

  namespace Fishtank.Api.Endpoints;

  public static class SystemEventsEndpoints
  {
      public static void MapSystemEventsEndpoints(this IEndpointRouteBuilder app)
      {
          var group = app.MapGroup("/api/system-events").RequireAuthorization();

          group.MapGet("", ListAsync);                       // ?severity=warnings-errors|info&skip=&take=
          group.MapGet("unread-count", UnreadCountAsync);    // { count }
          group.MapPost("{id:guid}/read", MarkReadAsync);
          group.MapPost("read-all", MarkAllReadAsync);
          group.MapDelete("", ClearAllAsync);                // ?severity=warnings-errors|info
      }

      private static SystemEventGroup ParseGroup(string? severity) =>
          string.Equals(severity, "info", StringComparison.OrdinalIgnoreCase)
              ? SystemEventGroup.Info : SystemEventGroup.WarningsErrors; // default = warnings-errors

      private static async Task<IResult> ListAsync(ISystemEventService svc,
          string? severity, int? skip, int? take, CancellationToken ct)
      {
          var page = await svc.ListAsync(ParseGroup(severity),
              Math.Max(0, skip ?? 0), Math.Clamp(take ?? 20, 1, 100), ct);
          return Results.Ok(ApiResponse.Ok(page));
      }

      private static async Task<IResult> UnreadCountAsync(ISystemEventService svc, CancellationToken ct)
          => Results.Ok(ApiResponse.Ok(new { count = await svc.GetUnreadCountAsync(ct) }));

      private static async Task<IResult> MarkReadAsync(ISystemEventService svc, Guid id, CancellationToken ct)
          => await svc.MarkReadAsync(id, ct)
              ? Results.Ok(ApiResponse.Ok(new { id }))
              : Results.NotFound(ApiResponse.Fail("SYSTEM_EVENT_NOT_FOUND", $"System event '{id}' not found."));

      private static async Task<IResult> MarkAllReadAsync(ISystemEventService svc, CancellationToken ct)
          => Results.Ok(ApiResponse.Ok(new { marked = await svc.MarkAllReadAsync(ct) }));

      private static async Task<IResult> ClearAllAsync(ISystemEventService svc, string? severity, CancellationToken ct)
      {
          await svc.ClearAllAsync(ParseGroup(severity), ct);
          return Results.Ok(ApiResponse.Ok(new { cleared = true }));
      }
  }
  ```
  - **Note (backward-compat):** the old `GET /api/system-events` returned a bare array. The new shape returns `SystemEventPageDto`. The events frontend is brand-new this story, so there is no existing consumer of the array shape (the only call site was the placeholder `EventsPage` stub which had none). Confirm no other caller via grep before changing.

### Task 4: Frontend — DTO type + severity map (AC: #1, #2, #4)

- [x] Create `src/client/src/features/events/types/systemEvent.ts`:
  ```typescript
  export type SystemEventSeverity = "info" | "warning" | "error";

  export interface SystemEvent {
    id: string;
    severity: SystemEventSeverity;
    message: string;
    serviceId: string | null;
    serviceName: string | null;
    createdAt: string;
    isRead: boolean;
  }

  export interface SystemEventPage {
    items: SystemEvent[];
    total: number;
    hasMore: boolean;
  }

  // Bootstrap Icons + semantic color var per severity (DESIGN.md lines 33, 404, 466)
  export const SEVERITY_ICON: Record<SystemEventSeverity, string> = {
    error: "bi-x-circle-fill",
    warning: "bi-exclamation-triangle-fill",
    info: "bi-info-circle-fill",
  };
  export const SEVERITY_COLOR: Record<SystemEventSeverity, string> = {
    error: "var(--error, #ef4444)",
    warning: "var(--warning, #f59e0b)",
    info: "var(--info, #3b82f6)",
  };
  ```

### Task 5: Frontend — React Query hooks (AC: #1, #4, #5, #6)

- [x] Create `src/client/src/features/events/hooks/useSystemEvents.ts` (mirror `useServices.ts` conventions):
  ```typescript
  import {
    useQuery, useInfiniteQuery, useMutation, useQueryClient,
  } from "@tanstack/react-query";
  import { apiFetch } from "@/lib/api";
  import type { SystemEventPage } from "../types/systemEvent";

  export const EVENTS_QUERY_KEY = ["events"] as const;
  export const UNREAD_COUNT_KEY = ["events", "unread-count"] as const;
  const PAGE_SIZE = 20;

  type Group = "warnings-errors" | "info";

  /** Paginated list for a severity group ("Load more" via fetchNextPage). */
  export function useSystemEvents(group: Group) {
    return useInfiniteQuery({
      queryKey: [...EVENTS_QUERY_KEY, group],
      initialPageParam: 0,
      queryFn: ({ pageParam }) =>
        apiFetch<SystemEventPage>(
          `/api/system-events?severity=${group}&skip=${pageParam}&take=${PAGE_SIZE}`,
        ),
      getNextPageParam: (last, all) =>
        last.hasMore ? all.reduce((n, p) => n + p.items.length, 0) : undefined,
    });
  }

  export function useUnreadCount() {
    return useQuery({
      queryKey: UNREAD_COUNT_KEY,
      queryFn: () => apiFetch<{ count: number }>("/api/system-events/unread-count"),
      select: (d) => d.count,
    });
  }

  export function useMarkRead() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: (id: string) =>
        apiFetch<{ id: string }>(`/api/system-events/${id}/read`, { method: "POST" }),
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: EVENTS_QUERY_KEY });
        // UnreadCountChanged hub event also refreshes the badge; invalidate as a fallback.
      },
    });
  }

  export function useMarkAllRead() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: () =>
        apiFetch<{ marked: number }>("/api/system-events/read-all", { method: "POST" }),
      onSuccess: () => void qc.invalidateQueries({ queryKey: EVENTS_QUERY_KEY }),
    });
  }

  export function useClearAll() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: (group: Group) =>
        apiFetch<{ cleared: boolean }>(`/api/system-events?severity=${group}`, { method: "DELETE" }),
      onSuccess: () => void qc.invalidateQueries({ queryKey: EVENTS_QUERY_KEY }),
    });
  }
  ```
  - Note: `EVENTS_QUERY_KEY = ["events"]` is the key the `HUB_INVALIDATION_MAP` targets — invalidating `["events"]` invalidates both the warnings-errors and info infinite queries (prefix match) and the unread-count query.

### Task 6: Frontend — `useEventsHub` hook (AC: #3, #7)

- [x] Create `src/client/src/features/events/hooks/useEventsHub.ts` (mirror `useServicesHub.ts` exactly):
  ```typescript
  import { useEffect } from "react";
  import { useQueryClient } from "@tanstack/react-query";
  import { createHubConnection } from "@/lib/signalr";
  import { HUB_INVALIDATION_MAP } from "@/lib/queryClient";
  import { UNREAD_COUNT_KEY } from "./useSystemEvents";

  /**
   * Manages the /hubs/events SignalR connection.
   * Mount once in AppShell — do NOT call per-component.
   */
  export function useEventsHub() {
    const queryClient = useQueryClient();

    useEffect(() => {
      const connection = createHubConnection("/hubs/events");

      connection.on("SystemEventCreated", () => {
        const keys = HUB_INVALIDATION_MAP["SystemEventCreated"] ?? [];
        keys.forEach((key) => void queryClient.invalidateQueries({ queryKey: key }));
      });

      connection.on("UnreadCountChanged", (payload: { count: number }) => {
        queryClient.setQueryData(UNREAD_COUNT_KEY, { count: payload.count });
      });

      void connection.start().catch((err: unknown) => {
        console.warn("[EventsHub] connection failed:", err);
      });

      return () => { void connection.stop(); };
    }, [queryClient]);
  }
  ```
  - The open panel listens to the same `SystemEventCreated` to prepend (Task 8); the badge is driven by `UnreadCountChanged` cache write + `useUnreadCount`.

### Task 7: Update `HUB_INVALIDATION_MAP` (AC: #3)

- [x] Update `src/client/src/lib/queryClient.ts`:
  ```typescript
  export const HUB_INVALIDATION_MAP: Record<string, QueryKey[]> = {
    ServiceStatusChanged: [["services"]],
    SystemEventCreated: [["events"]],
  };
  ```

### Task 8: Frontend — `SystemEventItem` + `NotificationPanel` components (AC: #4, #5, #7, #10)

- [x] Create a shared item renderer `src/client/src/features/events/components/SystemEventItem.tsx` used by both the panel and the events screen. Props: `event`, `variant: "panel" | "screen"`, `onMarkRead?`, `onDismiss?`. Renders:
  - severity icon (`SEVERITY_ICON`/`SEVERITY_COLOR`), full opacity when `!isRead`, `opacity:0.6` when read (DESIGN.md line 466);
  - message — in `panel` variant the message is wrapped in a `<Link to={\`/events?tab=warnings-errors&id=${event.id}\`}>` inline hyperlink (EXPERIENCE.md line 104); in `screen` variant rendered as text (file paths/GUIDs may be wrapped in `<code>`);
  - timestamp (formatted), service tag when `serviceName` (muted label: `rgba(var(--brand-rgb),0.12)` bg, `var(--border)` border, `rounded.md` — DESIGN.md line 468) — omit entirely when null;
  - dismiss (✕) button when `onDismiss` provided (`topbar-notification-item-dismiss-{id}` in panel / events screen dismiss is view-only per DESIGN.md line 420 but out of 2.4 test scope);
  - container testid: `topbar-notification-item-{id}` (panel) or `events-item-{id}` (screen);
  - clicking the item body (panel variant) calls `onMarkRead(id)` (AC-5). Ensure clicks on the inline link and the ✕ button `stopPropagation` so they don't double-trigger mark-read.

- [x] Create `src/client/src/features/events/components/NotificationPanel.tsx` + `.module.css`. Behavior:
  - Props: `onClose: () => void`. Uses `useSystemEvents("warnings-errors")`, `useMarkRead`, `useMarkAllRead`.
  - Local state: `dismissedIds: Set<string>` (view-only removal), `newCount` + `prependedIds` for the "N new" pill, a `scrollRef`.
  - Renders flattened `data.pages[].items`, filtered to exclude `dismissedIds`.
  - Header: title "Notifications — warnings and errors" + "Mark all read" button (`topbar-btn-notification-mark-all-read`, `aria-label="Mark all notifications as read"`, ghost style) **shown only when unread count > 0** (use `useUnreadCount`).
  - Body: items via `SystemEventItem variant="panel"`; "Load more" button (`topbar-btn-notification-load-more`) calls `fetchNextPage()`, hidden when `!hasNextPage`; empty state `bi-bell-slash` + "No warnings or errors — all caught up." when no visible items.
  - Footer: `1px var(--border)` top border, center muted `<Link to="/events" data-testid="topbar-link-notification-panel-footer">See all events in System Events →</Link>`.
  - **Prepend-while-open (AC-7):** subscribe to `SystemEventCreated` for the lifetime of the open panel (a local `useEffect` creating its own `createHubConnection("/hubs/events")` listener OR — preferred to avoid a second socket — a lightweight pub/sub: have `useEventsHub` also `queryClient.invalidateQueries(["events"])`, and detect newly-arrived ids by diffing the query data against a ref of previously-seen ids). When new ids appear and `scrollRef.scrollTop > threshold`, increment `newCount` and show the sticky `topbar-btn-notification-new-pill` ("N new"); clicking it scrolls `scrollRef` to top and resets `newCount = 0`; reset to 0 when `scrollTop` reaches 0. Scroll position must not jump on prepend.
  - `role="dialog"`/`aria-label="Notifications"`; container testid `topbar-panel-notifications`; `z-index: 40` via CSS module (DESIGN.md line 302). On < 640px `width: calc(100vw - 16px)` centered (DESIGN.md line 460).

### Task 9: Frontend — bell badge + panel wiring in `TopBar` (AC: #3, #4, #8, #9)

- [x] Update `src/client/src/components/layout/TopBar.tsx`:
  - Replace the inert bell button (lines 81–87): keep `bi-bell`, change `data-testid` to **`topbar-btn-bell`**, set `aria-label="Notifications — warnings and errors"`, `aria-haspopup="true"`, `aria-expanded={panelOpen}`, and `onClick={() => setPanelOpen(v => !v)}`.
  - Add local `const [panelOpen, setPanelOpen] = useState(false)` and `const { data: unread = 0 } = useUnreadCount();`.
  - Render the badge inside/over the bell button when `unread > 0` — new `NotificationBadge` component (Task 9b), testid `topbar-badge-bell`.
  - Render `{panelOpen && <NotificationPanel onClose={() => setPanelOpen(false)} />}` anchored below the bell.
  - **Close on navigation (AC-9):** the existing logo click already calls `navigate`/is a `Link`; add a `useEffect` keyed on `useLocation().pathname` that calls `setPanelOpen(false)` on every pathname change (covers sidebar clicks, logo, browser back/forward). Also: Esc key listener and an outside-click backdrop (mirror the avatar dropdown backdrop pattern, TopBar lines 101–106).

- [x] Task 9b — Create `src/client/src/features/events/components/NotificationBadge.tsx` + `.module.css`:
  - Props: `count: number`. Renders nothing when `count <= 0`.
  - Display: `count > 99 ? "99+" : String(count)`.
  - `data-testid="topbar-badge-bell"`, `aria-live="polite"`, `aria-label={count > 99 ? "More than 99 unread warnings and errors" : \`${count} unread warnings and errors\`}`.
  - CSS: `background: #ef4444; color: #fff;` (hard-coded, the documented theming exception — DESIGN.md line 219), `border-radius: var(--radius-full, 9999px)`, height 16px, `min-width: 24px` (fits "99+" at 10px — DESIGN.md line 123), font-size `var(--font-2xs, 0.625rem)`. New-event pulse `@keyframes` `scale(1)→scale(1.3)→scale(1)` 150ms; wrap in `@media (prefers-reduced-motion: reduce) { animation: none; }`.

### Task 10: Frontend — mount `useEventsHub` in `AppShell` (AC: #3)

- [x] Update `src/client/src/components/layout/AppShell.tsx`:
  ```tsx
  import { useEventsHub } from "@/features/events/hooks/useEventsHub";
  // …inside AppShell(), beside the existing useServicesHub():
  useServicesHub();
  useEventsHub();   // Story 2.4
  ```

### Task 11: Frontend — build the `/events` screen (AC: #1, #2, #10)

- [x] Replace `src/client/src/features/events/pages/EventsPage.tsx` (currently the 8-line stub). Keep `data-testid="page-events"` on the root. Build:
  - Tabs "Warnings & Errors" (`events-tab-warnings`, default) | "Info" (`events-tab-info`); tab read from `useSearchParams()` `?tab=warnings-errors|info` (default warnings-errors). Each tab header shows a total count badge from `page.total`.
  - Per-tab: `useSystemEvents(group)` infinite list; render `SystemEventItem variant="screen"` newest-first; "Load more" button `events-btn-load-more` → `fetchNextPage()`, hidden when `!hasNextPage`.
  - Active-tab header actions: Warnings & Errors → "Mark all read" (`events-btn-mark-all-read`, `useMarkAllRead`) + "Clear all" (`events-btn-clear-all-warnings`); Info → "Clear all" (`events-btn-clear-all-info`). Clear-all opens a confirmation dialog (`events-modal-clear-all-warnings-confirm` / `events-modal-clear-all-info-confirm`, confirm button `events-btn-clear-all-*-confirm`) before calling `useClearAll(group)`. (See "System Events Screen Rules" scope note — if cutting scope, hide clear-all buttons, don't render inert.)
  - Empty state: `bi-journal-text` (48px, muted) + "No events yet" + "System events will appear here as services start and stop." (DESIGN.md line 601).
  - **Deep-link (AC-10):** read `?id=` via `useSearchParams`; in a `useEffect` after items render, `scrollIntoView` the `events-item-{id}` element and add an `amber-highlight` animation class for 1s; under `prefers-reduced-motion` only scroll. Add the `@keyframes amber-highlight` to the page CSS module (`background var(--warning-subtle, #fef3c7) → transparent`, 1s ease-out forwards).
- [x] Create `src/client/src/features/events/pages/EventsPage.module.css` for the tabs, list, header actions, and `amber-highlight` keyframes.

### Task 12: Backend integration tests (AC: #1, #3, #5, #6)

- [x] Create `src/Fishtank.Api.IntegrationTests/Api/Story2_4_SystemEventsTests.cs` (extend `IntegrationTestBase`, seed via `POST /api/auth/setup` + `TestAuthHelper.CreateAuthenticatedClientAsync`, mirror Story2_1/2_3). To create warning/error events deterministically without a live WireMock failure, resolve `ISystemEventService` from a DI scope and call `AddAsync` directly (the in-memory DB is shared via the kept-open SQLite connection — factory lines 46–55).
  ```csharp
  using System.Net;
  using System.Net.Http.Json;
  using System.Text.Json;
  using FluentAssertions;
  using Fishtank.Api.Data.Entities;
  using Fishtank.Api.IntegrationTests.Support;
  using Fishtank.Api.Services;
  using Microsoft.Extensions.DependencyInjection;
  using Xunit;

  namespace Fishtank.Api.IntegrationTests.Api;

  [Collection("Integration")]
  public class Story2_4_SystemEventsTests : IntegrationTestBase
  {
      public Story2_4_SystemEventsTests(FishtankWebApplicationFactory factory) : base(factory) { }

      private async Task<HttpClient> AuthAsync()
      {
          await Client.PostAsJsonAsync("/api/auth/setup",
              new { username = "admin", password = "adminpassword123" });
          return await TestAuthHelper.CreateAuthenticatedClientAsync(Factory, "admin", "adminpassword123");
      }

      private async Task SeedAsync(SystemEventSeverity sev, string msg)
      {
          using var scope = Factory.Services.CreateScope();
          var svc = scope.ServiceProvider.GetRequiredService<ISystemEventService>();
          await svc.AddAsync(sev, msg);
      }

      // AC-4b regression: /hubs/events unauthenticated → 401
      [Fact(DisplayName = "GET /hubs/events without auth → 401")]
      public async Task EventsHub_Unauthenticated_401()
          => (await Client.GetAsync("/hubs/events")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);

      [Fact(DisplayName = "AC-1: list returns warnings+errors desc, paginated")]
      public async Task List_WarningsErrors_PagedDesc()
      {
          var client = await AuthAsync();
          for (var i = 0; i < 25; i++) await SeedAsync(SystemEventSeverity.Error, $"err-{i}");
          await SeedAsync(SystemEventSeverity.Info, "info-should-be-excluded");

          var res = await client.GetAsync("/api/system-events?severity=warnings-errors&skip=0&take=20");
          res.StatusCode.Should().Be(HttpStatusCode.OK);
          var data = (await res.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
          data.GetProperty("items").GetArrayLength().Should().Be(20);
          data.GetProperty("total").GetInt32().Should().Be(25);   // info excluded
          data.GetProperty("hasMore").GetBoolean().Should().BeTrue();
      }

      [Fact(DisplayName = "AC-3/8: unread-count counts only unread warnings+errors")]
      public async Task UnreadCount_OnlyWarnErr()
      {
          var client = await AuthAsync();
          await SeedAsync(SystemEventSeverity.Warning, "w1");
          await SeedAsync(SystemEventSeverity.Error, "e1");
          await SeedAsync(SystemEventSeverity.Info, "i1");
          var data = (await (await client.GetAsync("/api/system-events/unread-count"))
              .Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
          data.GetProperty("count").GetInt32().Should().Be(2);
      }

      [Fact(DisplayName = "AC-5: POST {id}/read marks one read; unread-count drops")]
      public async Task MarkRead_DecrementsUnread() { /* seed, list to get an id, POST read, assert count */ }

      [Fact(DisplayName = "AC-6: POST read-all marks all warnings+errors read")]
      public async Task MarkAllRead_ZeroesUnread()
      {
          var client = await AuthAsync();
          await SeedAsync(SystemEventSeverity.Warning, "w"); await SeedAsync(SystemEventSeverity.Error, "e");
          (await client.PostAsync("/api/system-events/read-all", null)).EnsureSuccessStatusCode();
          var data = (await (await client.GetAsync("/api/system-events/unread-count"))
              .Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
          data.GetProperty("count").GetInt32().Should().Be(0);
      }

      [Fact(DisplayName = "AC-3: POST /hubs/events/negotiate (auth) → 200 (regression after wiring)")]
      public async Task EventsHub_AuthNegotiate_200()
      {
          var client = await AuthAsync();
          var res = await client.PostAsync("/hubs/events/negotiate?negotiateVersion=1", new StringContent(""));
          res.StatusCode.Should().Be(HttpStatusCode.OK);
          (await res.Content.ReadAsStringAsync()).Should().Contain("connectionId");
      }
  }
  ```
  - The `SystemEventCreated` / `UnreadCountChanged` broadcast plumbing is asserted end-to-end in Playwright (badge real-time) — integration tests cover the HTTP surface + hub auth, matching the Story 2.3 split.

### Task 13: Frontend component tests (AC: #5, #8)

- [x] Create `src/client/src/features/events/components/__tests__/NotificationBadge.test.tsx` (covers the P1 "99+" component scenario, test-design-epic-2.md line 241):
  ```tsx
  import { render, screen } from "@testing-library/react";
  import { describe, it, expect } from "vitest";
  import { NotificationBadge } from "../NotificationBadge";

  describe("NotificationBadge", () => {
    it("renders the number for 1..99", () => {
      render(<NotificationBadge count={42} />);
      expect(screen.getByTestId("topbar-badge-bell")).toHaveTextContent("42");
    });
    it('renders "99+" above 99', () => {
      render(<NotificationBadge count={150} />);
      const b = screen.getByTestId("topbar-badge-bell");
      expect(b).toHaveTextContent("99+");
      expect(b).toHaveAttribute("aria-label", "More than 99 unread warnings and errors");
    });
    it("renders nothing when count is 0", () => {
      render(<NotificationBadge count={0} />);
      expect(screen.queryByTestId("topbar-badge-bell")).toBeNull();
    });
  });
  ```
- [x] Create `src/client/src/features/events/components/__tests__/NotificationPanel.test.tsx` — with msw (mirror the Story 2.3 `ServiceCard.toggle.test.tsx` pattern: `setupServer`, `QueryClientProvider`, render within a `MemoryRouter`): assert initial 20 items render, "Load more" fetches the next page, clicking an item body fires `POST /api/system-events/{id}/read` and the item drops to read state, clicking ✕ removes it from the view, and "Mark all read" is hidden when unread-count is 0.

### Task 14: E2E Playwright spec (AC: #1, #3, #4, #5, #6, #9)

- [x] Create `src/client/tests/e2e/story-2-4-system-events.spec.ts` (RED-phase ATDD scaffold, live stack, mirror `story-2-3-toggle.spec.ts`). Cover the P0/P1 scenarios from test-design-epic-2.md lines 226–242:
  - **P0** `/events` lists all System Events descending by CreatedAt (create services that fail to start to seed error events, or use the seeded warnings; assert order).
  - **P0** notification bell badge increments in real time when a warning/error SystemEvent is created (SignalR push is an allowed `page.route()`-free real-stack flow; trigger by an action that creates a warning/error event, assert `topbar-badge-bell` count increments without reload).
  - **P1** panel shows only warnings+errors; initial 20; "Load more" loads next 20.
  - **P1** click item body → marked read, badge decrements.
  - **P1** dismiss (✕) → removed from panel view; event still present on `/events` after reload.
  - **P1** "Mark all read" → badge = 0; items stay visible.
  - **P1** navigation event (sidebar click) → panel closes.
  - Document the data-testid contract in the spec header comment (`topbar-btn-bell`, `topbar-badge-bell`, `topbar-panel-notifications`, `topbar-notification-item-{id}`, `topbar-btn-notification-load-more`, `topbar-btn-notification-mark-all-read`, `events-item-{id}`, `events-btn-load-more`).

---

## Dev Notes

### Architecture Compliance

- All event logic stays in `SystemEventService.cs` (service layer) — endpoints register routes and call the service only (project-context.md line 129). No business logic in `SystemEventsEndpoints`.
- EF entities are never returned from endpoints — map to `SystemEventDto` / `SystemEventPageDto` in `Models/` (project-context.md line 131).
- `IHubContext<EventsHub>` is injected via DI (auto-registered by `AddSignalR()`, `Program.cs` line 156) — do not `new` it. Mirror the `ServiceManager` injection (line 23).
- Frontend hub hooks mount once in `AppShell`; reconnect logic stays in `lib/signalr.ts`; SignalR-driven invalidation goes through `HUB_INVALIDATION_MAP` (project-context.md line 117). The `UnreadCountChanged` handler writes the cache directly (it's a value push, not an invalidation) — acceptable since it sets authoritative server state, not a refetch trigger.
- The notification badge is the **one** sanctioned hardcoded-color element (`#ef4444`/white) per DESIGN.md line 219 — everything else uses CSS variables.
- SQLite cannot `ORDER BY DateTimeOffset` — list/paginate materialize-then-sort-in-memory (consistent with the existing endpoint, `SystemEventsEndpoints.cs` line 18, and `ServiceManager.ListAsync` line 84). The 1000-event retention cap keeps in-memory paging cheap (EXPERIENCE.md line 416).
- Notification panel `z-index: 40` (DESIGN.md line 302 stack); it sits below modals (60) and drawers (50), above the top bar (30).

### Open Questions / Risks

- **Breaking change to `GET /api/system-events`:** the response shape changes from a bare array to `SystemEventPageDto`. The only prior consumer was the placeholder `EventsPage` stub (no fetch). Grep confirms no other caller before changing — verify during implementation.
- **Server-side retention cap (1000 events) and pruning** (EXPERIENCE.md line 416) is **not** implemented by Story 2.1's `AddAsync` and is not an AC of 2.4 — flagged for a future story; without it the in-memory sort grows unbounded over a very long-lived container. Low risk for v1.
- **"N new" prepend detection (AC-7):** the cleanest implementation avoids a second WebSocket by diffing query data against a previously-seen-id ref inside the open panel rather than opening its own `createHubConnection`. Either is acceptable; the diff approach is preferred to keep a single events socket.
- **Clear-all scope:** included for a complete, working screen but outside the 2.4 P0/P1 test matrix (test-design-epic-2.md lines 226–242). If scope must be cut, hide the clear-all buttons rather than ship inert controls; the confirm-dialog + permanent-delete semantics (DESIGN.md line 412) are the most complex part of the screen.
- **`topbar-btn-bell` rename:** the existing bell uses `topbar-bell-button` (TopBar.tsx line 84). Renaming to the canonical `topbar-btn-bell` will break any test currently asserting the old id — grep `topbar-bell-button` across `src/client/tests` before renaming (story 1.3 shell spec is the likely holder).
- **`topbar-btn-notification-mark-all-read`** is not in the canonical DESIGN.md testid table (only `events-btn-mark-all-read` for the screen). Added per the project-context.md line 105 rule ("add one following the naming pattern, note it in the PR").

### References

- [Source: src/Fishtank.Api/Data/Entities/SystemEvent.cs#L3-L14] — entity (Id/Severity/Message/ServiceId/CreatedAt/IsRead); no migration needed
- [Source: src/Fishtank.Api/Services/ISystemEventService.cs#L5-L12] — interface to extend
- [Source: src/Fishtank.Api/Services/SystemEventService.cs#L6-L22] — impl to rewrite (add IHubContext + queries)
- [Source: src/Fishtank.Api/Endpoints/SystemEventsEndpoints.cs#L9-L34] — single GET to expand
- [Source: src/Fishtank.Api/Services/ServiceManager.cs#L17-L23,L141-L144,L184-L188] — IHubContext injection + broadcast pattern to mirror
- [Source: src/Fishtank.Api/Services/ServiceManager.cs#L73-L77,L175-L178] — engine-crash event creation sites (root-cause message)
- [Source: src/Fishtank.Api/Hubs/EventsHub.cs] — skeleton hub (wired this story)
- [Source: src/Fishtank.Api/Program.cs#L156,L159,L235] — AddSignalR, ISystemEventService registration, /hubs/events mapping
- [Source: src/Fishtank.Api/Endpoints/ApiResponse.cs] — envelope helper
- [Source: src/client/src/lib/queryClient.ts#L3-L5] — HUB_INVALIDATION_MAP
- [Source: src/client/src/lib/signalr.ts] — createHubConnection factory
- [Source: src/client/src/features/services/hooks/useServicesHub.ts] — hub hook to mirror as useEventsHub
- [Source: src/client/src/features/services/hooks/useServices.ts] — React Query conventions
- [Source: src/client/src/components/layout/TopBar.tsx#L81-L87] — bell placeholder to upgrade
- [Source: src/client/src/components/layout/AppShell.tsx#L15] — useServicesHub mount point
- [Source: src/client/src/router.tsx#L50] — /events route (exists)
- [Source: src/client/src/features/events/pages/EventsPage.tsx] — stub to replace
- [Source: src/client/src/lib/api.ts] — apiFetch
- [Source: src/client/src/lib/ToastContext.tsx] — useShowToast (no-op outside provider)
- [Source: _bmad-output/project-context.md#SignalR Hub Events] — event contract (lines 108-115)
- [Source: _bmad-output/project-context.md#data-testid] — testid rules (lines 100-106)
- [Source: _bmad-output/project-context.md#E2E Playwright Backend Mocking Policy] — lines 273-291
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-Fishtank-2026-06-04/EXPERIENCE.md#Notification panel] — lines 100-110
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-Fishtank-2026-06-04/EXPERIENCE.md#System Events screen] — lines 399-420
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-Fishtank-2026-06-04/DESIGN.md#Notification badge] — lines 219-225
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-Fishtank-2026-06-04/DESIGN.md#Notification bell dropdown] — lines 459-468
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-Fishtank-2026-06-04/DESIGN.md#z-index stack] — line 302 (panel = 40)
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-Fishtank-2026-06-04/DESIGN.md#data-testid] — lines 687-694, 776-786
- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.4] — acceptance criteria (lines 680-720)
- [Source: _bmad-output/test-artifacts/test-design-epic-2.md#Story 2.4] — P0/P1 test matrix (lines 222-244)
- [Source: src/Fishtank.Api.IntegrationTests/Api/Story2_3_ServicesHubTests.cs] — integration test + hub-auth pattern
- [Source: src/Fishtank.Api.IntegrationTests/Support/FishtankWebApplicationFactory.cs] — DI scope + in-memory SQLite + ResetDatabaseAsync

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.8 (1M context)

### Debug Log References

- Frontend component tests must live under `src/client/tests/unit/**` (vitest `include` glob), NOT in the story's suggested `src/.../__tests__/` path — the latter is never picked up by the runner.
- The project does NOT install `@testing-library/jest-dom`; component tests use plain DOM assertions (`.textContent`, `.getAttribute`, `toBeNull`/`not.toBeNull`/`toBeTruthy`) per the existing Story 2.3 test convention.
- testid prefix collision: the canonical dismiss testid `topbar-notification-item-dismiss-{id}` shares the `topbar-notification-item-` prefix with the item-container testid, so a broad `[data-testid^="topbar-notification-item-"]` selector double-counts (item + dismiss). Fixed by excluding dismiss in both the component test regex and the e2e locators (`:not([data-testid*="-dismiss-"])`).

### Completion Notes List

**Backend**
- Added `SystemEventDto` + `SystemEventPageDto` (`Models/SystemEventDto.cs`).
- Extended `ISystemEventService` with `SystemEventGroup` enum + `ListAsync`/`MarkReadAsync`/`MarkAllReadAsync`/`GetUnreadCountAsync`/`ClearAllAsync`.
- Rewrote `SystemEventService` to inject `IHubContext<EventsHub>` (auto-registered by `AddSignalR()`, no manual DI change). `AddAsync` now broadcasts `SystemEventCreated` (DTO) + `UnreadCountChanged` `{count}` ONLY for Warning/Error severities; Info never broadcasts and never affects the badge. List materialises-then-sorts-then-pages in memory (SQLite cannot ORDER BY DateTimeOffset). `ServiceName` resolved via `Include`/join.
- Expanded `SystemEventsEndpoints` into a `MapGroup("/api/system-events").RequireAuthorization()` route group: `GET ""` (`?severity=warnings-errors|info&skip=&take=`, default group = warnings-errors, take clamped 1–100), `GET unread-count`, `POST {id:guid}/read` (404 `SYSTEM_EVENT_NOT_FOUND` on unknown id), `POST read-all`, `DELETE ""` (clear-all).
- **Breaking change** (documented in story): `GET /api/system-events` now returns the `{items,total,hasMore}` envelope instead of a bare array. The only pre-existing consumer was `Story2_1_ServicesTests.CreateService_PortAlreadyBound...` which read `data` as an array — updated it to query `?severity=warnings-errors` and read `data.items` (AC coverage preserved).

**Frontend**
- `features/events/types/systemEvent.ts` — DTO types + `SEVERITY_ICON`/`SEVERITY_COLOR` maps.
- `features/events/hooks/useSystemEvents.ts` — `useInfiniteQuery` paged list (`["events", group]`), `useUnreadCount`, `useMarkRead`/`useMarkAllRead`/`useClearAll` mutations. `EVENTS_QUERY_KEY = ["events"]` is the prefix the hub invalidation targets.
- `features/events/hooks/useEventsHub.ts` — mirrors `useServicesHub`; `SystemEventCreated` → invalidate via `HUB_INVALIDATION_MAP`; `UnreadCountChanged` → `setQueryData(UNREAD_COUNT_KEY,…)` direct cache write.
- `HUB_INVALIDATION_MAP` gains `SystemEventCreated: [["events"]]`.
- `NotificationBadge` (+css) — hard-coded `#ef4444`/white (the one sanctioned theming exception), `99+` overflow, `aria-live="polite"`, count>99 vs ≤99 aria-labels, 150ms pulse suppressed under reduced-motion, renders null at 0.
- `SystemEventItem` (+css) — shared panel/screen renderer; panel variant wraps message in a deep-link `<Link>` and marks read on body click (link + ✕ `stopPropagation`); read items drop icon to `opacity:0.6`; unread items get elevated surface; service tag omitted when null.
- `NotificationPanel` (+css) — warnings+errors only, 20-on-open + `Load more`, header `Mark all read` shown only when unread>0, footer deep-link, empty state `bi-bell-slash`, `z-index:40`, `<640px` full-width centered. **Prepend/"N new" pill (AC-7)** implemented via the preferred single-socket approach: diffing the invalidated query data against a `seenIds` ref (no second WebSocket).
- `TopBar` — bell rewired: **testid renamed `topbar-bell-button` → `topbar-btn-bell`** (canonical), `aria-haspopup`/`aria-expanded`, badge overlay, panel toggle, outside-click backdrop, Esc listener, and a `useLocation().pathname` effect that closes the panel on any navigation (AC-9). Updated `story-1-3-shell.spec.ts` (~line 279) to the new testid in the same change to keep that suite green.
- `AppShell` mounts `useEventsHub()` once beside `useServicesHub()`.
- `EventsPage` — full screen: two tabs (warnings-errors default | info) read from `?tab`, per-tab total count badge, infinite list newest-first + `Load more`, active-tab header actions (`Mark all read` warnings-only + `Clear all` with confirm dialog per group), empty state `bi-journal-text`, and deep-link `?id=` scroll-into-view + 1s `amber-highlight` (suppressed under reduced-motion).
- `topbar-btn-notification-mark-all-read` testid added (not in the canonical DESIGN.md table) per the project-context naming rule — noted here for the PR.

**Tests**
- Backend: the ATDD `Story2_4_SystemEventsTests` (10 tests) are now GREEN (kept as-is). Full integration suite 70/70.
- Frontend component tests: `tests/unit/features/events/NotificationBadge.test.tsx` (number / "99+" / boundary 99 / null at 0) and `NotificationPanel.test.tsx` (20-on-open, Load-more→25, body-click POSTs `/{id}/read`, ✕ removes from view, Mark-all-read visible→hidden + hidden at 0, service tag). Full unit suite 108/108.

**Test-review remediation (quick-dev cycle, 2026-06-26)**
- **H1 (product code, `SystemEventService.ListAsync`):** added a stable secondary sort `ThenByDescending(e => e.Id)` after `OrderByDescending(e => e.CreatedAt)`. `SystemEvent.Id` is a random `Guid` (not monotonic), so it cannot restore *chronological* order when two events share a `CreatedAt` tick, but it is a deterministic tiebreaker — guaranteeing newest-first paging is stable (a row never flips order or appears on two pages between calls). CreatedAt remains the primary key. The integration `List_OrderedNewestFirst` test dropped its `Task.Delay(15)` wall-clock hack and now seeds two events with explicit distinct `CreatedAt` values (via a new `SeedEventAtAsync` DbContext helper), so the chronological assertion is deterministic without sleeping.
- **B1 (E2E):** AC-4 panel pagination test no longer asserts an exact `toHaveCount(20)` against the shared/parallel backend; it asserts the page-size invariant (`<= 20` on open) and that Load more strictly increases the count.
- **H2 (E2E):** replaced the error-swallowing `seedFailingService(.catch(()=>{}))` with `fireFailingService` (returns HTTP status) + `seedFailingServices(n)` which polls the unread-count until it rises by `n`, so under-seeding fails loudly instead of silently.
- **M1/M2 + L1/L2 (tests):** AC-3 badge assertion now asserts the server unread count incremented by exactly +1 (not just "changed"); `NotificationPanel.test.tsx` mock state encapsulated in a per-call closure (no module-level mutable bleed); stale RED-phase comments/headers removed from both the E2E spec and the integration test.

### Definition-of-Code Gate Results (test-review re-verify, 2026-06-26)

- `dotnet build src/Fishtank.slnx` → Build succeeded. 0 Error(s), 6 Warning(s) (all pre-existing NU1903 SQLite advisory).
- `dotnet test src/Fishtank.Api.IntegrationTests` → Passed! Failed: 0, Passed: 70.
- `dotnet test src/Fishtank.Api.UnitTests` → Passed! Failed: 0, Passed: 58.
- `npm run build` → `✓ built`, 0 errors.
- `npm run test:unit -- --run` → Test Files 12 passed; Tests 115 passed.
- `npx tsc --noEmit -p tsconfig.e2e.json` → exit 0.

### Definition-of-Done Gate Results

- Gate 1 (backend): `dotnet test src/Fishtank.Api.IntegrationTests` → **Passed! Failed: 0, Passed: 70**. `dotnet test src/Fishtank.Api.UnitTests` → **Passed! Failed: 0, Passed: 49**.
- Gate 2 (frontend build): `npm run build` → tsc 0 errors, `✓ built`.
- Gate 3 (.NET build): `dotnet build src/Fishtank.slnx` → **Build succeeded. 0 Error(s)**, 6 Warning(s) (all pre-existing transitive NU1903 `SQLitePCLRaw.lib.e_sqlite3` advisories, also present on the untouched UnitTests project — not introduced by this story, not code warnings).
- Gate 4 (frontend unit): `npm run test:unit` → **Test Files 11 passed; Tests 108 passed**.
- E2E typecheck: `npx tsc --noEmit -p tsconfig.e2e.json` → exit 0 (0 errors).

### File List

**Created (backend)**
- `src/Fishtank.Api/Models/SystemEventDto.cs`

**Modified (backend)**
- `src/Fishtank.Api/Services/ISystemEventService.cs`
- `src/Fishtank.Api/Services/SystemEventService.cs`
- `src/Fishtank.Api/Endpoints/SystemEventsEndpoints.cs`
- `src/Fishtank.Api.IntegrationTests/Api/Story2_1_ServicesTests.cs` (updated for new list contract)
- `src/Fishtank.Api.IntegrationTests/Api/Story2_4_SystemEventsTests.cs` (H1 stable-sort: dropped `Task.Delay`, deterministic `CreatedAt` seeding; RED-comment cleanup)

**Created (frontend)**
- `src/client/src/features/events/types/systemEvent.ts`
- `src/client/src/features/events/hooks/useSystemEvents.ts`
- `src/client/src/features/events/hooks/useEventsHub.ts`
- `src/client/src/features/events/components/NotificationBadge.tsx`
- `src/client/src/features/events/components/NotificationBadge.module.css`
- `src/client/src/features/events/components/SystemEventItem.tsx`
- `src/client/src/features/events/components/SystemEventItem.module.css`
- `src/client/src/features/events/components/NotificationPanel.tsx`
- `src/client/src/features/events/components/NotificationPanel.module.css`
- `src/client/src/features/events/pages/EventsPage.module.css`
- `src/client/tests/unit/features/events/NotificationBadge.test.tsx`
- `src/client/tests/unit/features/events/NotificationPanel.test.tsx`

**Modified (frontend)**
- `src/client/src/lib/queryClient.ts`
- `src/client/src/components/layout/TopBar.tsx`
- `src/client/src/components/layout/TopBar.module.css`
- `src/client/src/components/layout/AppShell.tsx`
- `src/client/src/features/events/pages/EventsPage.tsx`
- `src/client/tests/e2e/story-1-3-shell.spec.ts` (testid rename `topbar-bell-button` → `topbar-btn-bell`)
- `src/client/tests/e2e/story-2-4-system-events.spec.ts` (item locators exclude dismiss-button prefix collision)

**Modified (process)**
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (2-4 → review)
