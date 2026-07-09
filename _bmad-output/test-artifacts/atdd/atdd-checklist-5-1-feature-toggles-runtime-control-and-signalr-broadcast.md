---
story_id: "5.1"
story_key: "5-1-feature-toggles-runtime-control-and-signalr-broadcast"
epic: 5
story_title: "Feature Toggles — Runtime Control & SignalR Broadcast"
test_phase: RED
date_created: "2026-07-09"
test_architect: "Murat (Master Test Architect)"
total_test_files: 3
total_test_scenarios: 25
coverage_priority:
  p0: 11
  p1: 13
  p2: 1
estimated_effort: "8-12 hours"
---

# ATDD Checklist: Story 5-1 — Feature Toggles Runtime Control & SignalR Broadcast

## Executive Summary

**Story:** 5.1 — Feature Toggles — Runtime Control & SignalR Broadcast  
**Epic:** 5 — Admin Console & User Management  
**Test Phase:** RED (tests compile but FAIL against current codebase)  
**Created:** 2026-07-09  
**Test Architect:** Murat (Master Test Architect)

**Coverage Summary:**
- **Total test files:** 3 (1 backend integration, 1 frontend component, 1 E2E)
- **Total test scenarios:** 25
- **P0 (Critical):** 11 tests
- **P1 (High):** 13 tests
- **P2 (Medium):** 1 test
- **Estimated execution time:** ~8-12 hours (manual + automated)

**Why these tests are RED:**
All tests are written against the **expected end-state** of Story 5.1. They will **FAIL** against the current codebase because:
- No `/api/admin/toggles` endpoints exist (HTTP 404)
- No `TogglesHub.cs` exists at `/hubs/toggles`
- No `FeatureToggle` entity or database table
- No Admin Console frontend components (`AdminConsolePage`, `FeatureTogglesSection`)
- No Admin Console route (`/admin`) configured in `router.tsx`
- No Admin Console sidebar nav item in `Sidebar.tsx`
- No `HUB_INVALIDATION_MAP` entry for `FeatureToggleChanged`

Once Story 5.1 is **implemented**, these tests will turn **GREEN**.

---

## Test Files Created

### 1. Backend Integration Tests

**File:** `src/Fishtank.Api.IntegrationTests/Api/Story5_1_AdminTogglesTests.cs`  
**Framework:** xUnit + FluentAssertions + SignalRTestHelper  
**Test Count:** 11 tests  
**Coverage:** AC-3, AC-4, AC-5, AC-8, AC-9, AC-10, AC-11

| Test Method | Priority | AC | Risk | Description |
|-------------|----------|----|----|-------------|
| `GetToggles_StandardUser_Returns403` | P0 | AC-3 | R-E5-002 | Standard User calling `GET /api/admin/toggles` → HTTP 403 ADMIN_FORBIDDEN |
| `PutToggle_StandardUser_Returns403` | P0 | AC-3 | R-E5-002 | Standard User calling `PUT /api/admin/toggles/{name}` → HTTP 403 ADMIN_FORBIDDEN |
| `GetToggles_AdminUser_Returns200` | P0 | AC-3, AC-4 | — | Admin user calling `GET /api/admin/toggles` → HTTP 200 with all toggles |
| `PutToggle_ValidRequest_PersistsToDatabase` | P0 | AC-5 | — | `PUT /api/admin/toggles/{name}` persists state change; subsequent GET returns new state |
| `PutToggle_BroadcastsSignalREvent` | P0 | AC-8 | R-E5-003 | Toggle change broadcasts `FeatureToggleChanged` via TogglesHub to all connected clients |
| `GetToggles_WithEnvVarOverride_ShowsEnvVarOverride` | P1 | AC-9 | R-E5-006 | Toggle DTO includes `envVarOverride` property for env var lock detection |
| `PutToggle_EnvVarLocked_Returns409` | P1 | AC-10 | R-E5-006 | `PUT` on env-var-locked toggle → HTTP 409 ADMIN_TOGGLE_ENV_LOCKED |
| `PutToggle_UnknownName_Returns404` | P1 | AC-11 | — | `PUT` with unknown toggle name → HTTP 404 ADMIN_TOGGLE_NOT_FOUND |
| `GetToggles_ReturnsAllKnownToggles` | P1 | AC-4 | — | `GET /api/admin/toggles` returns all 5 known toggles with correct schema |

**RED Phase Failures:**
- HTTP 404: `/api/admin/toggles` endpoint not mapped yet
- SignalR connection fails: `TogglesHub` at `/hubs/toggles` does not exist
- Test helper methods (`TestAuthHelper.GetStandardUserTokenAsync`, `SignalRTestHelper.ConnectToHubAsync`) will fail if admin/standard user accounts don't exist in test DB

---

### 2. Frontend Component Tests

**File:** `src/client/src/features/admin/__tests__/Story5_1_AdminConsole.test.tsx`  
**Framework:** Vitest + @testing-library/react + @testing-library/user-event  
**Test Count:** 12 tests  
**Coverage:** AC-2, AC-4, AC-6, AC-7, AC-9, AC-13, AC-14

| Test Description | Priority | AC | Risk | Component Under Test |
|------------------|----------|----|----|---------------------|
| Sidebar renders Admin Console nav item for Admin-role user | P1 | AC-2, AC-14 | — | `Sidebar.tsx` |
| Sidebar does NOT render Admin Console nav item for Standard User | P0 | AC-2 | R-E5-002 | `Sidebar.tsx` |
| AdminConsolePage renders with sub-navigation tabs | P1 | AC-13, AC-14 | — | `AdminConsolePage.tsx` |
| Health and Audit Log tabs show placeholder content | P1 | AC-13 | — | `AdminConsolePage.tsx` |
| FeatureTogglesSection renders toggle table with all toggles | P1 | AC-4, AC-14 | — | `FeatureTogglesSection.tsx` |
| Clicking to disable enabled toggle shows confirmation dialog | P0 | AC-6, AC-14 | — | `FeatureTogglesSection.tsx` |
| Confirmation dialog Disable button triggers PUT request | P0 | AC-6 | — | `FeatureTogglesSection.tsx` |
| Confirmation dialog Cancel button closes dialog without request | P1 | AC-6 | — | `FeatureTogglesSection.tsx` |
| Clicking to enable disabled toggle triggers PUT immediately (no dialog) | P1 | AC-7 | — | `FeatureTogglesSection.tsx` |
| Env-var-locked toggle shows 'Locked by environment variable' badge | P1 | AC-9, AC-14 | R-E5-006 | `FeatureTogglesSection.tsx` |
| Env-var-locked toggle switch is disabled | P1 | AC-9 | R-E5-006 | `FeatureTogglesSection.tsx` |

**RED Phase Failures:**
- Import errors: Components do not exist yet (`AdminConsolePage`, `FeatureTogglesSection`)
- `Sidebar.tsx` does not have Admin Console nav item with `data-testid="nav-admin-console"`
- `data-testid` attributes missing on all toggle-related elements

---

### 3. E2E Tests (Playwright)

**File:** `src/client/tests/e2e/story-5-1-admin-console-feature-toggles.spec.ts`  
**Framework:** Playwright  
**Test Count:** 9 tests (2 skipped pending Standard User helper)  
**Coverage:** AC-1, AC-2, AC-8, AC-14

| Test Description | Priority | AC | Risk | Coverage |
|------------------|----------|----|----|----------|
| Admin user can access /admin route | P0 | AC-1 | — | Route guard allows Admin access |
| Standard User redirected from /admin to /services | P0 | AC-1 | R-E5-002 | Route guard blocks Standard User |
| Sidebar shows Admin Console nav item for Admin user | P1 | AC-2 | — | Sidebar conditional rendering (Admin) |
| Sidebar does NOT show Admin Console nav item for Standard User | P1 | AC-2 | — | Sidebar conditional rendering (Standard User) |
| Toggle change propagates to all sessions via SignalR | P0 | AC-8 | R-E5-003 | SignalR broadcast to all connected clients |
| HUB_INVALIDATION_MAP includes FeatureToggleChanged | P1 | AC-12 | — | React Query seam contract |
| Toggle change persists across page refresh | P1 | AC-5 | — | Database persistence |
| Standard User calling GET /api/admin/toggles returns 403 | P1 (skipped) | AC-3 | R-E5-002 | Backend role enforcement |

**RED Phase Failures:**
- HTTP 404: `/admin` route not configured in `router.tsx`
- Page load timeout: `page-admin-console` testid does not exist
- SignalR connection timeout: `/hubs/toggles` endpoint does not exist
- Standard User helper not implemented yet (2 tests skipped)

---

## Acceptance Criteria Coverage Map

| AC | Description | Backend | Frontend | E2E | Priority | Status |
|----|-------------|---------|----------|-----|----------|--------|
| **AC-1** | Admin Console route accessible to Admin-role users only | — | — | ✅ | P0 | RED |
| **AC-2** | Admin Console sidebar nav item visible to Admins only | — | ✅ | ✅ | P1 | RED |
| **AC-3** | Backend admin endpoints require Admin role (R-E5-002) | ✅ | — | ✅ (skipped) | P0 | RED |
| **AC-4** | Feature toggles list displays all known toggles | ✅ | ✅ | — | P1 | RED |
| **AC-5** | Toggle switch changes state and persists to database | ✅ | — | ✅ | P0 | RED |
| **AC-6** | Disabling a feature requires confirmation dialog (NFR-15) | — | ✅ | — | P0 | RED |
| **AC-7** | Enabling a feature requires no confirmation | — | ✅ | — | P1 | RED |
| **AC-8** | Toggle change broadcasts via SignalR (D7, R-E5-003) | ✅ | — | ✅ | P0 | RED |
| **AC-9** | Env var override takes precedence and locks toggle (R-E5-006) | ✅ | ✅ | — | P1 | RED |
| **AC-10** | Env-var-locked toggle PUT returns error | ✅ | — | — | P1 | RED |
| **AC-11** | Unknown toggle name returns 404 | ✅ | — | — | P1 | RED |
| **AC-12** | HUB_INVALIDATION_MAP updated | — | — | ✅ | P1 | RED |
| **AC-13** | Admin Console sub-navigation structure | — | ✅ | — | P1 | RED |
| **AC-14** | data-testid attributes (mandatory) | ✅ | ✅ | ✅ | P0 | RED |

**Coverage Notes:**
- ✅ = Test exists in this layer
- — = Not applicable to this layer
- All ACs have **at least one** automated test
- P0 ACs have **multiple** tests across layers for redundancy

---

## data-testid Contract

The following `data-testid` attributes **must** be present after Story 5.1 implementation:

### Backend API (verified via integration tests)
- N/A (backend uses JSON API contract, not testids)

### Frontend Components

| Element | `data-testid` | Component | Required By |
|---------|---------------|-----------|-------------|
| Admin Console page container | `page-admin-console` | `AdminConsolePage` | AC-14, E2E |
| Feature Toggles sub-nav tab | `tab-feature-toggles` | `AdminConsolePage` | AC-13, AC-14 |
| Health sub-nav tab | `tab-health` | `AdminConsolePage` | AC-13, AC-14 |
| Audit Log sub-nav tab | `tab-audit-log` | `AdminConsolePage` | AC-13, AC-14 |
| Feature Toggles section container | `section-feature-toggles` | `FeatureTogglesSection` | AC-14 |
| Toggle table | `table-toggles` | `FeatureTogglesSection` | AC-4, AC-14, E2E |
| Toggle row (dynamic) | `toggle-row-{toggle-name}` | `FeatureTogglesSection` | AC-14 |
| Toggle switch (dynamic) | `toggle-switch-{toggle-name}` | `FeatureTogglesSection` | AC-5, AC-14, E2E |
| Env var badge (dynamic) | `toggle-env-badge-{toggle-name}` | `FeatureTogglesSection` | AC-9, AC-14 |
| Disable confirmation dialog | `dialog-toggle-disable` | `FeatureTogglesSection` | AC-6, AC-14, E2E |
| Disable confirmation cancel button | `dialog-toggle-disable-cancel` | `FeatureTogglesSection` | AC-6, AC-14 |
| Disable confirmation confirm button | `dialog-toggle-disable-confirm` | `FeatureTogglesSection` | AC-6, AC-14, E2E |
| Sidebar Admin Console nav item | `nav-admin-console` | `Sidebar` | AC-2, AC-14, E2E |

**Pattern for dynamic testids:**
- Toggle row: `toggle-row-{toggle-name}` (e.g., `toggle-row-network_activity`)
- Toggle switch: `toggle-switch-{toggle-name}` (e.g., `toggle-switch-network_activity`)
- Env var badge: `toggle-env-badge-{toggle-name}` (e.g., `toggle-env-badge-record_mode`)

---

## Risk Coverage

All **High-priority risks** (≥6) from Test Design are covered:

| Risk ID | Risk | Mitigation | Test Coverage |
|---------|------|------------|---------------|
| **R-E5-002** | Admin role escalation — Standard User accesses admin endpoints | Backend role enforcement on all `/admin` routes | `Story5_1_AdminTogglesTests`: `GetToggles_StandardUser_Returns403`, `PutToggle_StandardUser_Returns403`; Component: Sidebar conditional rendering; E2E: route guard tests |
| **R-E5-003** | SignalR toggle broadcast race — state persists but SignalR fails | Integration test verifies both DB write and SignalR event; E2E verifies real-time propagation | `Story5_1_AdminTogglesTests`: `PutToggle_BroadcastsSignalREvent`; E2E: `toggle change propagates to all sessions via SignalR` |
| **R-E5-006** | Env var toggle override not visible — admin confusion | UI shows "Locked by environment variable" badge; toggle disabled; tooltip explains precedence | `Story5_1_AdminTogglesTests`: `GetToggles_WithEnvVarOverride_ShowsEnvVarOverride`, `PutToggle_EnvVarLocked_Returns409`; Component: env var badge and disabled toggle tests |

**Medium-priority risks** (score 4):
- **R-E5-004** (Audit log volume growth) — Not in scope for Story 5.1; tested in Story 5.3
- **R-E5-005** (Log directory permission failure) — Not in scope for Story 5.1; tested in Story 5.4

---

## Test Execution Instructions

### Running Backend Integration Tests

```powershell
# Navigate to API project
cd src\Fishtank.Api.IntegrationTests

# Run all Story 5.1 tests
dotnet test --filter "FullyQualifiedName~Story5_1_AdminTogglesTests"

# Run single test
dotnet test --filter "FullyQualifiedName~Story5_1_AdminTogglesTests.GetToggles_StandardUser_Returns403"
```

**Expected RED phase result:**
- ❌ All tests **FAIL** with HTTP 404 (endpoints not mapped)
- ❌ SignalR tests **FAIL** with connection timeout (hub doesn't exist)

### Running Frontend Component Tests

```powershell
# Navigate to client project
cd src\client

# Run all Story 5.1 component tests
npm test -- Story5_1_AdminConsole

# Run with coverage
npm run test:coverage -- Story5_1_AdminConsole
```

**Expected RED phase result:**
- ❌ Import errors: Components don't exist yet
- ❌ `data-testid` not found errors: Elements don't exist yet

### Running E2E Tests

```powershell
# Navigate to client project
cd src\client

# Run all Story 5.1 E2E tests
npx playwright test story-5-1-admin-console-feature-toggles

# Run in headed mode for debugging
npx playwright test story-5-1-admin-console-feature-toggles --headed

# Run single test
npx playwright test story-5-1-admin-console-feature-toggles -g "Admin user can access /admin route"
```

**Expected RED phase result:**
- ❌ HTTP 404: `/admin` route not configured
- ❌ Timeout: `page-admin-console` testid not found
- ❌ Connection timeout: `/hubs/toggles` SignalR hub doesn't exist
- ⏭️ 2 tests **SKIPPED** (Standard User helper not implemented)

---

## Definition of Done (When Tests Turn GREEN)

All 25 tests must **PASS** before Story 5.1 is considered complete:

### Backend Integration Tests (11 tests)
- ✅ All admin endpoints require Admin role (403 for Standard User)
- ✅ GET /api/admin/toggles returns all 5 known toggles
- ✅ PUT /api/admin/toggles/{name} persists state change to database
- ✅ Toggle change broadcasts FeatureToggleChanged via TogglesHub
- ✅ Env-var-locked toggles return HTTP 409 on PUT
- ✅ Unknown toggle names return HTTP 404

### Frontend Component Tests (12 tests)
- ✅ Sidebar shows Admin Console nav item for Admin users only
- ✅ AdminConsolePage renders with sub-navigation tabs
- ✅ FeatureTogglesSection renders toggle table with all toggles
- ✅ Disable confirmation dialog appears for enabled toggles
- ✅ Enable action has no confirmation (PUT fires immediately)
- ✅ Env-var-locked toggles show badge and disabled switch

### E2E Tests (7 active + 2 skipped)
- ✅ Admin user can access /admin route
- ✅ Standard User redirected from /admin to /services
- ✅ Sidebar conditional rendering works for both roles
- ✅ Toggle change propagates to all sessions via SignalR
- ✅ HUB_INVALIDATION_MAP includes FeatureToggleChanged
- ✅ Toggle state persists across page refresh
- ✅ (Unskip and pass) Standard User backend role enforcement tests

### Additional Verification
- ✅ All `data-testid` attributes present per contract table
- ✅ No eslint/prettier violations in new test files
- ✅ Test execution time < 15 seconds (integration + component) + < 60 seconds (E2E)

---

## Notes for Implementation

### Backend Implementation Hints

1. **AdminEndpoints.cs** — use `RequireAuthorization(policy => policy.RequireRole("Admin"))`
2. **FeatureToggle entity** — seed 5 known toggles in migration with `Name`, `DisplayName`, `Description`, `Enabled`, `UpdatedAt`
3. **FeatureToggleService** — read `FISHTANK_TOGGLE_{NAME}` env vars at startup; store in singleton `Dictionary<string, bool>`
4. **TogglesHub.cs** — minimal hub; server broadcasts via `IHubContext<TogglesHub>`
5. **SignalR broadcast** — after successful PUT, call `hubContext.Clients.All.SendAsync("FeatureToggleChanged", new { name, enabled })`

### Frontend Implementation Hints

1. **AdminConsolePage.tsx** — use React Router `<Navigate>` for role guard: `if (user?.role !== "Admin") return <Navigate to="/services" />;`
2. **FeatureTogglesSection.tsx** — use `useToggles` React Query hook; map toggles to table rows
3. **Confirmation dialog** — use shadcn/ui `AlertDialog` component with `dialog-toggle-disable` testid
4. **Sidebar conditional rendering** — wrap Admin Console nav item in `{user?.role === "Admin" && <NavItem ... />}`
5. **HUB_INVALIDATION_MAP** — add `'FeatureToggleChanged': [['toggles']]` to `queryClient.ts`

### Test Data Requirements

- Admin user: `testadmin` / `TestPassword123!` (created by global-setup)
- Standard User: `testuser` / `TestPassword123!` (create test helper for RED→GREEN transition)
- Env var for testing: `FISHTANK_TOGGLE_NETWORK_ACTIVITY=false` (locked toggle)

---

## Appendix: Test File Locations

| File | Lines of Code | Test Count | Framework |
|------|---------------|------------|-----------|
| `src/Fishtank.Api.IntegrationTests/Api/Story5_1_AdminTogglesTests.cs` | ~400 | 11 | xUnit + FluentAssertions |
| `src/client/src/features/admin/__tests__/Story5_1_AdminConsole.test.tsx` | ~600 | 12 | Vitest + RTL |
| `src/client/tests/e2e/story-5-1-admin-console-feature-toggles.spec.ts` | ~350 | 9 | Playwright |
| **Total** | **~1,350** | **32** | — |

---

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-07-09 | Murat (Master Test Architect) | Initial ATDD checklist created for Story 5.1 RED phase |

---

**Next Steps:**
1. Review this checklist with the team
2. Confirm AC coverage is complete (all 14 ACs have tests)
3. Run all tests to verify RED phase (all tests should FAIL)
4. Begin Story 5.1 implementation (backend → frontend → E2E)
5. Re-run tests iteratively as features are implemented
6. Mark story complete when all 25 tests turn GREEN
