# ATDD Checklist — Story 2.3: Enable/Disable Service Toggle, ServicesHub & Real-Time Status

**Status**: RED-PHASE COMPLETE — scaffolds created, red/green confirmed  
**Date**: 2026-06-23

---

## Test Files Created

| File | Layer | Framework |
|------|-------|-----------|
| `src/Fishtank.Api.IntegrationTests/Api/Story2_3_ServicesHubTests.cs` | Integration | xUnit + FluentAssertions |
| `src/client/tests/unit/features/story-2-3-toggle.test.tsx` | Component | Vitest + RTL + MSW |
| `src/client/tests/e2e/story-2-3-toggle.spec.ts` | E2E | Playwright |

---

## Integration Tests (xUnit) — Run Results

| Test | AC | Status | Reason |
|------|----|--------|--------|
| `ServicesHub_UnauthenticatedRequest_Returns401` | AC-4a | ✅ GREEN (regression guard) | ServicesHub already has [Authorize] |
| `ServicesHub_AuthenticatedNegotiate_Returns200` | AC-2 | ✅ GREEN (regression guard) | ServicesHub already mapped at /hubs/services |
| `StartService_ReturnsLiveStatus` | AC-2 | ✅ GREEN (regression guard) | Start already returns status=live |
| `EventsHub_UnauthenticatedRequest_Returns401_WhenRegistered` | AC-4b | ❌ RED | EventsHub.cs not yet created + mapped |
| `EventsHub_AuthenticatedNegotiate_Returns200` | AC-3 | ❌ RED | EventsHub.cs not yet created + mapped |
| `StopService_ReturnsStoppedStatus` | AC-2 | ❌ RED | Stop API returns isActive=true (not updated) |

**Result**: 3 passed / 3 failed — correct RED-PHASE state

---

## Component Tests (Vitest) — Compile Status

| Test | AC | Status | Reason |
|------|----|--------|--------|
| `toggle input has data-testid` | AC-1c | ❌ RED (import error) | `@/components/ui/Toast` does not exist yet |
| `toggle flips isActive immediately` | AC-1a | ❌ RED | `useToggleService` lacks optimistic `onMutate` |
| `status pill does NOT change while optimistic` | AC-1a | ❌ RED | No optimistic logic + ToastProvider missing |
| `reverts toggle to original on 500` | AC-1b | ❌ RED | No `onError` revert handler in `useToggleService` |
| `shows error toast on 500` | AC-1b | ❌ RED | Toast infrastructure does not exist |

**Compile status**: TypeScript error: `Cannot find module '@/components/ui/Toast'`  
This is the expected RED state — tests will compile and pass once Task 4 (ToastProvider) is implemented.

---

## E2E Tests (Playwright) — Static Analysis

| Test | AC | Status | Reason |
|------|----|--------|--------|
| `toggle input has data-testid and clicking flips toggle immediately` | AC-1 | ❌ RED | `data-testid` missing on toggle; no optimistic UI |
| `server error reverts toggle and shows error toast` | AC-1 | ❌ RED | Toast infrastructure missing; no revert logic |
| `ServiceStatusChanged refreshes services list without reload` | AC-2 | ❌ RED | `useServicesHub` hook not created; HUB_INVALIDATION_MAP empty |
| `stopping via API shows stopped status in UI` | AC-2 | ❌ RED | No SignalR wiring in frontend |

---

## AC Coverage

| Acceptance Criterion | Test Layer | Tests Covering |
|---------------------|------------|----------------|
| AC-1a: Optimistic toggle flip | Component + E2E | `story-2-3-toggle.test.tsx`, `story-2-3-toggle.spec.ts` |
| AC-1b: Revert + error toast on 500 | Component + E2E | `story-2-3-toggle.test.tsx`, `story-2-3-toggle.spec.ts` |
| AC-1c: data-testid on toggle input | Component + E2E | `story-2-3-toggle.test.tsx`, `story-2-3-toggle.spec.ts` |
| AC-2: ServiceStatusChanged broadcast | Integration + E2E | `Story2_3_ServicesHubTests.cs`, `story-2-3-toggle.spec.ts` |
| AC-3: EventsHub skeleton registered | Integration | `Story2_3_ServicesHubTests.cs` |
| AC-4: Both hubs reject unauthenticated | Integration | `Story2_3_ServicesHubTests.cs` |

---

## Exit Criteria

- [x] At least one acceptance test file per layer (integration, component, E2E)
- [x] Tests reference story ACs explicitly
- [x] At least one test fails against current codebase (confirms RED phase)
- [x] At least one test passes as regression guard
- [x] Test file paths follow project conventions
