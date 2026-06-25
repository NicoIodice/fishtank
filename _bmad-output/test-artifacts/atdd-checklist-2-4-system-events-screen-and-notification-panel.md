# ATDD Checklist — Story 2.4: System Events Screen & Notification Panel

**Story:** `2-4-system-events-screen-and-notification-panel`
**Epic:** 2 — Services Management & System Health
**Phase:** ATDD (RED-phase acceptance test scaffolds)
**Role:** Master Test Architect
**Date:** 2026-06-25
**Baseline commit:** `74a2b59`

---

## Phase-Gate Status

| Gate | Status | Evidence |
|---|---|---|
| Test files created | ✅ | 2 acceptance scaffolds (backend integration + E2E Playwright) |
| ACs referenced | ✅ | AC-1, AC-3, AC-4, AC-5, AC-6, AC-9 (+ AC-8 via unread-count contract) |
| Backend tests compile | ✅ | `dotnet test` built the project; tests compiled against the current (unimplemented) codebase |
| Backend tests RED | ✅ | `Failed! - Failed: 8, Passed: 3, Skipped: 0, Total: 11` (3 passing = GREEN-ALREADY hub-auth + unauthenticated-list regression guards) |
| E2E spec typechecks | ✅ | `npx tsc --noEmit -p tsconfig.e2e.json` → exit 0 |
| E2E spec RED | ✅ by construction | Selectors target unimplemented UI (`topbar-btn-bell`, `topbar-panel-notifications`, `events-item-*`, new endpoints). Not executed — requires the live stack (Vite :5173 + API :5000). |
| No production/feature code written | ✅ | Only test files + this artifact were created |

**Exact backend RED proof:**

```
Failed!  - Failed:     8, Passed:     3, Skipped:     0, Total:    11, Duration: 14 s - Fishtank.Api.IntegrationTests.dll (net10.0)
```

The 3 passing tests are intentional regression guards that are GREEN-ALREADY (the `/hubs/events` hub was registered in Story 2.3, and `GET /api/system-events` already requires auth). The 8 failing tests assert the new endpoints/contract that Story 2.4 must implement.

---

## Scaffold File Paths

| Layer | File (absolute) |
|---|---|
| Backend integration | `c:\GIT\_Personal\fishtank\src\Fishtank.Api.IntegrationTests\Api\Story2_4_SystemEventsTests.cs` |
| E2E Playwright | `c:\GIT\_Personal\fishtank\src\client\tests\e2e\story-2-4-system-events.spec.ts` |

> Frontend component tests (`NotificationBadge.test.tsx`, `NotificationPanel.test.tsx` — story Tasks 13) are intentionally **deferred** to the dev / test-automate phase. The ATDD acceptance layer for this story is the E2E + backend-integration pair, matching the Story 2.3 ATDD split. The "99+" badge component scenario (test-design P1) is covered there.

---

## Backend Integration Tests — AC Mapping

File: `Story2_4_SystemEventsTests.cs` (namespace `Fishtank.Api.IntegrationTests.Api`, `[Collection("Integration")]`, extends `IntegrationTestBase`). Events are seeded by resolving `ISystemEventService` from a DI scope and calling `AddAsync` (no ports required).

| Test | AC | Expected RED reason |
|---|---|---|
| `EventsHub_Unauthenticated_Returns401` | AC-3 | GREEN-ALREADY (hub auth, Story 2.3 regression guard) |
| `EventsHub_AuthenticatedNegotiate_Returns200` | AC-3 | GREEN-ALREADY (hub wired in Story 2.3; confirms broadcast plumbing target) |
| `List_WarningsErrors_PagedAndFiltered` | AC-1 | Endpoint returns bare array — no `items`/`total`/`hasMore` page shape, no `?severity`/`?skip`/`?take` |
| `List_Info_ReturnsOnlyInfo` | AC-1 | No severity-group filtering exists |
| `List_OrderedNewestFirst` | AC-1 | No page-shape envelope to read `items[0].message` from |
| `UnreadCount_OnlyWarningsAndErrors` | AC-3 / AC-8 | `GET /api/system-events/unread-count` → 404 (route not mapped) |
| `MarkRead_DecrementsUnreadCount` | AC-5 | `POST /api/system-events/{id}/read` → 404; list shape missing |
| `MarkRead_UnknownId_Returns404` | AC-5 | Route not mapped → no `SYSTEM_EVENT_NOT_FOUND` envelope |
| `MarkAllRead_ZeroesUnreadCount` | AC-6 | `POST /api/system-events/read-all` → 404 |
| `MarkAllRead_LeavesInfoEvents` | AC-6 | `read-all` + info-filter not implemented |
| `List_Unauthenticated_Returns401` | — | GREEN-ALREADY (auth regression guard) |

---

## E2E Playwright Tests — AC Mapping

File: `story-2-4-system-events.spec.ts` (imports `test`/`expect` from `../support/fixtures`, `apiFetch` from `../support/helpers/api-client`; live stack, storageState auth). Warning/error events are seeded by creating a service on a reserved/invalid port so the engine fails to start and writes an `error` SystemEvent (the existing engine-crash creation path — no test-only seed route exists yet).

| Test (describe → title) | AC | RED reason |
|---|---|---|
| P0 AC-1 → lists newest-first with Load more | AC-1 | `EventsPage` is a stub; no tabs/items |
| P0 AC-3 → badge increments in real time | AC-3 | Bell still uses old `topbar-bell-button`; no badge/panel; no broadcast |
| P1 AC-4 → panel opens, warnings+errors only, 20 + Load more | AC-4 | `NotificationPanel` does not exist |
| P1 AC-5 → click body marks read, badge decrements | AC-5 | No mark-read flow; `/unread-count` 404 |
| P1 AC-5 → dismiss removes from panel, survives /events reload | AC-5 | No dismiss control; `events-item-*` not rendered |
| P1 AC-6 → "Mark all read" zeroes badge, items remain | AC-6 | No mark-all-read button / endpoint |
| P1 AC-9 → sidebar nav click closes panel | AC-9 | No panel; no close-on-navigation effect |
| P1 AC-9 → Escape closes panel | AC-9 | No panel; no Esc handler |

---

## data-testid Contract Table

Canonical values from DESIGN.md (lines 687–694, 776–786), used verbatim in the scaffolds.

| Element | testid |
|---|---|
| Notification bell button | `topbar-btn-bell` (renames the existing inert `topbar-bell-button`) |
| Notification badge | `topbar-badge-bell` |
| Notification panel | `topbar-panel-notifications` |
| Notification item (per item) | `topbar-notification-item-{id}` |
| Notification item dismiss (✕) | `topbar-notification-item-dismiss-{id}` |
| Panel "Load more" | `topbar-btn-notification-load-more` |
| Panel "Mark all read" | `topbar-btn-notification-mark-all-read` (added per project-context.md naming rule; note in PR) |
| Panel footer link | `topbar-link-notification-panel-footer` |
| Events page root | `page-events` (existing stub) |
| Events warnings tab | `events-tab-warnings` |
| Events info tab | `events-tab-info` |
| Events item (per item) | `events-item-{id}` |
| Events "Load more" | `events-btn-load-more` |
| Sidebar nav (events) | `sidebar-nav-events` (existing; used for AC-9 navigation-close) |

---

## Verification Commands

Backend (RED):

```
dotnet test src/Fishtank.Api.IntegrationTests --filter "FullyQualifiedName~Story2_4"
# → Failed! - Failed: 8, Passed: 3, Skipped: 0, Total: 11
```

E2E typecheck (clean):

```
cd src/client && npx tsc --noEmit -p tsconfig.e2e.json
# → exit 0 (tests/e2e + tests/support are in tsconfig.e2e.json, not tsconfig.app.json)
```

> The E2E spec is **not** executed in this phase (requires a live app at :5173/:5000). Its RED state is by construction — the selectors and endpoints target unimplemented UI/API.

---

## Notes & Blockers

- **No blockers.** Backend tests compile and only the new-feature assertions fail; the project build is intact.
- **Deterministic event seeding (E2E):** there is no public "create arbitrary SystemEvent" route, so the E2E spec seeds `error` events via the engine-crash path (service create on reserved port `30100`). If implementation adds a test-only seed endpoint, swap `seedFailingService` to use it for determinism.
- **`topbar-btn-bell` rename:** Story 1.3 shell spec (`story-1-3-shell.spec.ts` line 279) still asserts the OLD `topbar-bell-button`. Implementation must update that reference when renaming to the canonical id (flagged in the story's Open Questions / Risks).
- **Component tests deferred:** `NotificationBadge.test.tsx` / `NotificationPanel.test.tsx` are left for the dev/test-automate phase per the ATDD scope decision above.
