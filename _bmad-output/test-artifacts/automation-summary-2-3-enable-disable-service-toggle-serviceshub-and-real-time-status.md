---
date: 2026-06-26
phase: test-automate
story_id: "2.3"
story_key: 2-3-enable-disable-service-toggle-serviceshub-and-real-time-status
story_title: "Enable/Disable Service Toggle, ServicesHub & Real-Time Status"
reconstructed: true
reconstructed_on: 2026-06-26
reconstructed_note: >
  This summary was retroactively reconstructed on 2026-06-26 from the test suite
  that actually exists in the repo. The base `bmad-testarch-automate` skill wrote a
  generic `automation-summary.md` and never persisted a per-story copy. Test counts
  and coverage below reflect the real test files on disk, not the original run.
---

# Test Automation Summary — Story 2-3: Enable/Disable Service Toggle, ServicesHub & Real-Time Status

**Date:** 2026-06-26
**Phase:** test-automate (retroactively reconstructed)
**Story:** `2-3-enable-disable-service-toggle-serviceshub-and-real-time-status`
**Test Suite Outcome:** 15 tests across optimistic toggle UI, hub auth/registration, and real-time status — 6 integration + 5 component/unit + 4 E2E

---

## Test Files

| File | Suite | Layer | Tests |
|------|-------|-------|-------|
| `src/Fishtank.Api.IntegrationTests/Api/Story2_3_ServicesHubTests.cs` | xUnit (WebApplicationFactory) | integration | 6 |
| `src/client/tests/unit/features/story-2-3-toggle.test.tsx` | Vitest + @testing-library/react (jsdom) | component/unit | 5 |
| `src/client/tests/e2e/story-2-3-toggle.spec.ts` | Playwright | e2e | 4 |

**Total: 15 tests** (6 integration + 5 component/unit + 4 E2E)

---

## Coverage Table (AC → test → layer → status)

| AC | Description | Covering test(s) | Layer | Status |
|----|-------------|------------------|-------|--------|
| AC-1 | Optimistic toggle UI: position flips immediately, status pill retains previous value during pending window, pill updates on success, revert + error toast on failure | Component: `toggle flips isActive immediately before server responds`; `status pill does NOT change during optimistic update`; `reverts toggle to original state when server returns 500`; `shows error toast when server returns 500`; `toggle input has data-testid='service-toggle-{id}'`. E2E: `toggle input has data-testid and clicking it flips the toggle immediately`; `server error reverts toggle and shows error toast` | component + e2e | FULL |
| AC-2 | `ServiceStatusChanged` broadcast on start/stop; frontend listener invalidates `["services"]` via `HUB_INVALIDATION_MAP` | Integration: `ServicesHub_AuthenticatedNegotiate_Returns200`; `StopService_ReturnsStoppedStatus` (status='stopped', isActive=false); `StartService_ReturnsLiveStatus` (status='live', isActive=true). E2E: `ServiceStatusChanged event refreshes services list without page reload`; `stopping a service via API eventually shows 'stopped' status in the UI` | integration + e2e | FULL |
| AC-3 | `EventsHub` skeleton at `/hubs/events` accepts authenticated connections | Integration: `EventsHub_AuthenticatedNegotiate_Returns200` (200 + connectionId) | integration | FULL |
| AC-4 | Hub auth enforcement — unauthenticated requests to `/hubs/services` and `/hubs/events` rejected | Integration: `ServicesHub_UnauthenticatedRequest_Returns401`; `EventsHub_UnauthenticatedRequest_Returns401_WhenRegistered` | integration | FULL |

---

## Per-Suite Test Breakdown

### Integration — `src/Fishtank.Api.IntegrationTests/Api/Story2_3_ServicesHubTests.cs` (6 tests)

| # | Test (DisplayName) | What it verifies | AC |
|---|--------------------|------------------|----|
| 1 | `AC-4a: GET /hubs/services without auth → 401 (regression guard)` | ServicesHub rejects unauthenticated requests | AC-4 |
| 2 | `AC-4b: GET /hubs/events without auth → 401 (hub must be registered)` | EventsHub registered + rejects unauthenticated requests | AC-3, AC-4 |
| 3 | `AC-3: POST /hubs/events/negotiate (authenticated) → 200 with connectionId` | EventsHub accepts authenticated negotiate | AC-3 |
| 4 | `AC-2: POST /hubs/services/negotiate (authenticated) → 200` | ServicesHub negotiate plumbing after IHubContext wiring | AC-2 |
| 5 | `AC-2: POST /api/services/{id}/stop → status='stopped', isActive=false` | Stop API returns correct status (broadcast payload source) | AC-2 |
| 6 | `AC-2: POST /api/services/{id}/start → status='live', isActive=true` | Start API returns correct status (broadcast payload source) | AC-2 |

### Component/Unit — `src/client/tests/unit/features/story-2-3-toggle.test.tsx` (5 tests)

| # | Test | What it verifies | AC |
|---|------|------------------|----|
| 1 | `AC-1c: toggle input has data-testid='service-toggle-{id}'` | Toggle testid contract present | AC-1 |
| 2 | `AC-1a: toggle flips isActive immediately before server responds` | Optimistic flip during pending fetch | AC-1 |
| 3 | `status pill (service.status) does NOT change during optimistic update` | Status pill retains "Live" during pending window | AC-1 |
| 4 | `AC-1b: reverts toggle to original state when server returns 500` | Error revert | AC-1 |
| 5 | `AC-1b: shows error toast when server returns 500` | Error toast (`role="alert"`) shown | AC-1 |

### E2E — `src/client/tests/e2e/story-2-3-toggle.spec.ts` (4 tests)

| # | Test | What it verifies | AC |
|---|------|------------------|----|
| 1 | `toggle input has data-testid and clicking it flips the toggle immediately` | Optimistic flip in real browser | AC-1 |
| 2 | `server error reverts toggle and shows error toast` | Revert + `toast-container` visible with error text | AC-1 |
| 3 | `ServiceStatusChanged event refreshes services list without page reload` | Two-context SignalR real-time: stop in Tab A → Tab B status pill updates | AC-2 |
| 4 | `stopping a service via API eventually shows 'stopped' status in the UI` | API stop → SignalR invalidation → pill shows "stopped" | AC-2 |

---

## Coverage Summary

| AC | Status |
|----|--------|
| AC-1 | FULL |
| AC-2 | FULL |
| AC-3 | FULL |
| AC-4 | FULL |

**FULL: 4 · PARTIAL: 0 · NONE: 0**

---

## Gaps

- **`ServiceStatusChanged` payload shape not asserted in C#:** The integration suite verifies hub negotiation (auth + connectionId) and that the stop/start *API* returns the correct `status`/`isActive` values that feed the broadcast, but no C# test subscribes to the hub and asserts the exact broadcast payload `{ id, status }`. The actual end-to-end broadcast → invalidation path is validated only in the Playwright E2E suite (two-context test). This is a deliberate layering choice noted in the story (Task 10 "broadcast correctness is tested in Playwright E2E").
- **Reconnect behaviour untested:** SignalR `withAutomaticReconnect()` reconnect/resync behaviour is not exercised by any automated test.
- **Toast auto-dismiss timeout:** The 4000ms auto-dismiss in `useToast` is not asserted (tests only assert the toast appears).

All four ACs have direct passing coverage at an appropriate layer; the gaps above are depth/edge refinements rather than uncovered acceptance criteria.
