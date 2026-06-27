# ATDD Checklist — Story 2.5: Settings — Service Cache Management

**Story:** `2-5-settings-service-cache-management`
**Epic:** 2 — Services Management & System Health
**Phase:** ATDD (RED-phase acceptance test scaffolds)
**Role:** Master Test Architect (Murat)
**Date:** 2026-06-27

---

## Phase-Gate Status

| Gate | Status | Evidence |
|---|---|---|
| Test files created | ✅ | 2 acceptance scaffolds (backend integration + E2E Playwright) |
| ACs referenced | ✅ | AC-1, AC-2, AC-3, AC-4, AC-5 (all ACs covered) |
| Backend tests compile | ✅ | `dotnet build` → Build succeeded, 0 errors |
| Backend tests RED | ✅ | `Failed! - Failed: 3, Passed: 1, Skipped: 0, Total: 4` (1 passing = GREEN-ALREADY auth regression guard) |
| E2E spec typechecks | ✅ | `npx tsc --noEmit -p tsconfig.e2e.json` → exit 0, no output |
| E2E spec RED | ✅ by construction | Selectors target unimplemented UI (`settings-btn-clear-cache-*`, `settings-btn-clear-all-caches`, etc.). Not executed — requires the live stack (Vite :5173 + API :5000). |
| No production/feature code written | ✅ | Only test files + this artifact created |

**Exact backend RED proof:**

```
Failed!  - Failed:     3, Passed:     1, Skipped:     0, Total:     4, Duration: 4 s - Fishtank.Api.IntegrationTests.dll (net10.0)
```

The 1 passing test is an intentional regression guard (GREEN-ALREADY):
`GetCache_Unauthenticated_Returns401` — the Fishtank API applies a global auth fallback policy returning 401 for all unauthenticated requests regardless of route existence. When the actual endpoint is registered with `.RequireAuthorization()`, this behavior is preserved — the test becomes a permanent regression guard for the auth contract.

The 3 failing tests assert the new endpoints/contract that Story 2.5 must implement.

---

## Scaffold File Paths

| Layer | File (absolute) |
|---|---|
| Backend integration | `c:\GIT\_Personal\fishtank\src\Fishtank.Api.IntegrationTests\Api\Story2_5_CacheTests.cs` |
| E2E Playwright | `c:\GIT\_Personal\fishtank\src\client\tests\e2e\story-2-5-settings-service-cache.spec.ts` |

> Frontend component tests for `CacheSettings.tsx` are intentionally deferred to the dev / test-automate phase, matching the established ATDD split used in Stories 2.2–2.4. The acceptance layer for this story is the E2E + backend-integration pair.

---

## Backend Integration Tests — AC Mapping

File: `Story2_5_CacheTests.cs` (namespace `Fishtank.Api.IntegrationTests.Api`, `[Collection("Integration")]`, extends `IntegrationTestBase`). Uses `TestAuthHelper.CreateAuthenticatedClientAsync`.

| Test | AC | Status | Expected RED reason |
|---|---|---|---|
| `GetCache_Unauthenticated_Returns401` | AC-5 | GREEN-ALREADY | Global auth fallback returns 401 for all unauthenticated requests (regression guard) |
| `GetCache_Authenticated_NoServices_Returns200WithEmptyArray` | AC-1 | 🔴 RED | `GET /api/cache` not mapped → routing returns 404; test asserts 200 OK |
| `DeleteCache_NonExistentId_Returns404WithServiceNotFound` | AC-2 | 🔴 RED | `DELETE /api/cache/{id}` not mapped → routing 404 with plain-text body; `ReadFromJsonAsync<JsonElement>` fails because the body is not a valid `ApiEnvelope` |
| `DeleteAllCaches_Authenticated_Returns200WithSuccess` | AC-3 | 🔴 RED | `DELETE /api/cache` not mapped → routing returns 404; test asserts 200 OK |

---

## E2E Playwright Tests — AC Mapping

File: `story-2-5-settings-service-cache.spec.ts` (imports `test`/`expect` from `../support/fixtures`, `apiFetch` from `../support/helpers/api-client`; live stack, `storageState` auth from `playwright.config.ts`). Services seeded via `POST /api/services`. Empty-state reset via `POST /api/test/reset-services`.

| Test (describe → title) | Priority | AC | RED reason |
|---|---|---|---|
| `Story 2.5 — P0: AC-1` → lists each service with name, entry count, and size | P0 | AC-1 | `CacheSettings` component not wired into `SettingsPage.tsx`; `settings-btn-clear-cache-{slug}` not found |
| `Story 2.5 — P0: AC-2` → per-service Clear with confirmation calls DELETE | P0 | AC-2 | `settings-btn-clear-cache-{slug}` not found; component not implemented |
| `Story 2.5 — P1: AC-3` → Clear All with confirmation calls DELETE /api/cache | P1 | AC-3 | `settings-btn-clear-all-caches` not found; component not implemented |
| `Story 2.5 — P1: AC-4` → empty state with icon and message | P1 | AC-4 | "No service caches yet." text not present; placeholder "Configured in a later story." shown |
| `Story 2.5 — P1: AC-5` → authenticated user sees cache management UI | P1 | AC-5 | `settings-btn-clear-cache-{slug}` not found; `CacheSettings` not implemented |

---

## Activation Instructions for `dev-story`

When implementing Story 2.5, the developer activates these scaffolds by:

1. **Remove `test.skip()`** — N/A: these E2E scaffolds use active (non-skipped) tests that fail while RED.

2. **Backend (xUnit):** All 4 tests activate automatically once:
   - `CacheEndpoints.cs` is created with `GET /api/cache`, `DELETE /api/cache/{id}`, `DELETE /api/cache`
   - `ICacheService` / `CacheService` is registered and `MapCacheEndpoints()` is called in `Program.cs`

3. **E2E (Playwright):** All 5 tests activate once:
   - `CacheSettings.tsx` component is implemented and wired in `SettingsPage.tsx`
   - All canonical `data-testid` values from `DESIGN.md` are applied to the rendered elements
   - `settings-nav-cache` sub-nav button has `data-testid="settings-nav-cache"` added (if missing)

---

## Story Integration Metadata

- **Story ID:** `2.5`
- **Story Key:** `2-5-settings-service-cache-management`
- **Story File:** `c:\GIT\_Personal\fishtank\_bmad-output\implementation-artifacts\2-5-settings-service-cache-management.md`
- **Checklist Path:** `c:\GIT\_Personal\fishtank\_bmad-output\test-artifacts\atdd-checklist-2-5-settings-service-cache-management.md`
- **Generated Test Files:**
  - `c:\GIT\_Personal\fishtank\src\Fishtank.Api.IntegrationTests\Api\Story2_5_CacheTests.cs`
  - `c:\GIT\_Personal\fishtank\src\client\tests\e2e\story-2-5-settings-service-cache.spec.ts`
