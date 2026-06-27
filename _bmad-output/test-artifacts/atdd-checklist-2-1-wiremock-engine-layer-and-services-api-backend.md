---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-06-22'
storyId: '2.1'
storyKey: '2-1-wiremock-engine-layer-and-services-api-backend'
storyFile: '_bmad-output/implementation-artifacts/2-1-wiremock-engine-layer-and-services-api-backend.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-2-1-wiremock-engine-layer-and-services-api-backend.md'
generatedTestFiles:
  - 'src/Fishtank.Api.IntegrationTests/Api/Story2_1_ServicesTests.cs'
redPhaseVerified: true
redPhaseResult: 'Failed: 15, Passed: 0, Skipped: 0, Total: 15'
---

# ATDD Checklist — Story 2.1: WireMock Engine Layer & Services API Backend

**Generated:** 2026-06-22  
**Story:** `2-1-wiremock-engine-layer-and-services-api-backend`  
**Story ID:** 2.1  
**Mode:** Create (Red Phase)  
**Stack:** fullstack (backend-focused, xUnit integration tests)

---

## Preflight Checklist

- [x] Story `2-1-wiremock-engine-layer-and-services-api-backend.md` exists and is `ready-for-dev`
- [x] Acceptance criteria AC-1 through AC-10 clearly defined in story file
- [x] Test framework present: xUnit + `Microsoft.AspNetCore.Mvc.Testing` + FluentAssertions
- [x] `IntegrationTestBase` and `FishtankWebApplicationFactory` available in Support/
- [x] Development environment available (dotnet 10.0.301, xUnit runner)

---

## Stack Detection Result

| Property | Value |
|---|---|
| Detected stack | `fullstack` |
| Backend test type | xUnit integration tests (HTTP-level) |
| Frontend ATDD | Deferred to story implementation (no UI AC in story 2.1) |
| Primary test file | `src/Fishtank.Api.IntegrationTests/Api/Story2_1_ServicesTests.cs` |

---

## Acceptance Criteria → Test Mapping

| AC | Description | Test Method | Level | Priority | Red? |
|---|---|---|---|---|---|
| AC-1 | POST /api/services (valid) → 201, WireMock starts | `CreateService_ValidRequest_CreatesServiceAndStartsWireMock` | Integration/E2E | P0 | ✅ |
| AC-2 | Port already bound → status=stopped, SystemEvent written | `CreateService_PortAlreadyBound_CreatesServiceStoppedAndSystemEvent` | Integration | P0 | ✅ |
| AC-3a | Blank name → 400 SERVICE_NAME_REQUIRED | `CreateService_BlankName_Returns400ServiceNameRequired` | Integration | P1 | ✅ |
| AC-3b | Duplicate slug → 400 SERVICE_SLUG_CONFLICT | `CreateService_DuplicateSlug_Returns400ServiceSlugConflict` | Integration | P1 | ✅ |
| AC-3c | Port outside 30100-30199 → 400 SERVICE_PORT_OUT_OF_RANGE | `CreateService_PortOutOfRange_Returns400` | Integration | P1 | ✅ |
| AC-3d | ExternalUrl not http/https → 400 SERVICE_URL_INVALID | `CreateService_InvalidExternalUrl_Returns400` | Integration | P1 | ✅ |
| AC-3e | Port already assigned → 400 SERVICE_PORT_CONFLICT | `CreateService_PortAlreadyAssigned_Returns400ServicePortConflict` | Integration | P1 | ✅ |
| AC-4 | GET /api/services → all non-deleted | `GetServices_ReturnsAllNonDeletedServices` | Integration | P0 | ✅ |
| AC-5 | PUT slug-changing name → mocksRootChanged: true | `UpdateService_SlugChangingName_ReturnsMocksRootChanged` | Integration | P1 | ✅ |
| AC-6a | POST /stop → WireMock halted | `StopService_HaltsWireMockListener` | Integration/E2E | P0 | ✅ |
| AC-6b | POST /start → WireMock restarts | `StartService_RestartsWireMockListener` | Integration/E2E | P0 | ✅ |
| AC-9 | GET /next-port → 30100 on empty DB | `GetNextPort_NoServices_Returns30100` | Integration | P1 | ✅ |
| AC-9+ | GET /next-port skips assigned ports | `GetNextPort_WithExistingServices_ReturnsNextAvailable` | Integration | P1 | ✅ |
| AC-10 | Fault isolation: A broken → B+health unaffected | `EngineFaultIsolation_ServiceAFails_ServiceBAndHealthUnaffected` | Integration/NFR | P0 | ✅ |
| Auth | Unauthenticated access → 401 | `GetServices_Unauthenticated_Returns401` | Integration | P0 | ✅ |

**ACs with deferred coverage:**
- AC-7 (SystemEvents DB schema) — covered implicitly via AC-2 (SystemEvent assertion) and via `bmad-testarch-automate` phase
- AC-8 (Seed file import) — deferred to `bmad-testarch-automate` phase (requires seed file format to be finalized in implementation)

---

## Red-Phase Verification

| Metric | Result |
|---|---|
| Build result | ✅ Succeeded (0 errors, 2 pre-existing NU1903 warnings) |
| Test run command | `dotnet test --filter FullyQualifiedName~Story2_1_ServicesTests` |
| Failed | **15** |
| Passed | 0 |
| Total | 15 |
| Red phase? | ✅ **CONFIRMED** |

**Failure reason:** `/api/services`, `/api/system-events`, and `/api/services/next-port` endpoints are not registered in the current `Program.cs`. All assertions against 201/200 fail with mismatched status codes (401 from `FirstRunMiddleware` or 404 from SPA fallback).

---

## Test Strategy Decisions

### Level Selection (fullstack / backend-focused)

- **Integration tests only** for story 2.1 — this story has no frontend ACs
- **TCP connectivity probes** used as E2E substitute to verify WireMock engine lifecycle (AC-1, AC-6a/b, AC-10) without a browser
- **Unit tests** for `ServicesRegistry`, `ServiceManager` slug logic, port validation — deferred to `bmad-testarch-automate` (green phase)

### Priority Assignment

- **P0**: Service creation (AC-1), engine lifecycle (AC-6), fault isolation (AC-10), list services (AC-4), auth guard
- **P1**: Validation rules (AC-3a–3e), update/rename (AC-5), next-port (AC-9)
- **P2**: Seed import (AC-8) — deferred to automate phase
- **P3**: SignalR real-time notifications — deferred to automate phase (test-design epic-2 risk R-002)

### Risks Addressed

| Risk (from test-design-epic-2.md) | Covered by |
|---|---|
| R-001: Engine isolation (WireMock process leak) | `EngineFaultIsolation...`, TCP probes in AC-6 |
| R-002: SignalR auth | Auth guard test (unauthenticated → 401) |
| R-003: Seed idempotency | Deferred to automate phase (AC-8) |
| R-004: 50-service perf | Deferred to NFR phase |

---

## Checklist Items

- [x] Prerequisites satisfied (story approved, test framework configured)
- [x] Test files created correctly: `Story2_1_ServicesTests.cs` in `Fishtank.Api.IntegrationTests/Api/`
- [x] Checklist matches acceptance criteria (15 test methods mapped to 15 ACs / edge cases)
- [x] Tests are RED-phase scaffolds (all fail, none skip)
- [x] No `test.skip()` / `[Fact(Skip=...)]` used — tests are designed to fail, not skip
- [x] Story metadata captured (storyKey, storyFile, storyId)
- [x] No orphaned browser sessions (not applicable — xUnit integration tests only)
- [x] Temp artifacts in `_bmad-output/test-artifacts/` not random locations
- [x] CLI sessions cleaned up (not applicable)

---

## Completion Summary

**Test files created:**
- `src/Fishtank.Api.IntegrationTests/Api/Story2_1_ServicesTests.cs` — 15 RED-phase acceptance tests

**Checklist output path:**
- `_bmad-output/test-artifacts/atdd-checklist-2-1-wiremock-engine-layer-and-services-api-backend.md`

**Story handoff path:**
- `_bmad-output/implementation-artifacts/2-1-wiremock-engine-layer-and-services-api-backend.md`

**Key risks and assumptions:**
1. TCP connectivity probes assume the test host network allows loopback connections on ports 30190–30192
2. `EngineStartup` hosted service must not attempt to bind WireMock on those ports during test execution (test host is in-memory; ports only bind when `ServiceManager.StartAsync` is called explicitly via API)
3. Port 30100 in `GetNextPort_WithExistingServices_*` test — EngineStartup must not claim this port during app startup (it should only process services persisted in DB, and the test DB is empty at startup)

**Next recommended workflow:** `bmad-dev-story` — implement all ACs to turn RED tests GREEN
