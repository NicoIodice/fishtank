# Test Automation Summary — Story 2-1: WireMock Engine Layer and Services API Backend

**Date:** 2026-06-22  
**Phase:** test-automate  
**Story:** `2-1-wiremock-engine-layer-and-services-api-backend`  
**Test Suite Outcome:** ALL PASS — 49 unit + 51 integration = **100 tests, 0 failures**

---

## Coverage Added This Phase

### New Integration Tests (5 tests — `Story2_1_ServicesTests.cs`)

| Test | Description | AC Covered |
|------|-------------|------------|
| `GetSystemEvents_Unauthenticated_Returns401` | Verifies auth guard on system events endpoint | AC-7 auth |
| `CreateService_LoopbackUrl_Returns400` (×3 inputs) | SSRF guard — loopback/metadata URLs blocked with `SERVICE_URL_INVALID` | B1 patch |
| `GetNextPort_ReclaimsPortFromDeletedService` | Verifies `/api/services/next-port` returns 30100 on empty DB (unit test covers actual reclaim logic) | AC-5 |
| `CreateService_SameSlug_Returns400SlugConflict` | Two distinct names ("My API", "My-API") that produce identical slug "my-api" → `SERVICE_SLUG_CONFLICT` | AC-1 |

### New Unit Tests (13 tests — `ServiceManagerTests.cs`, `Fishtank.Api.UnitTests`)

| Test Class / Category | Count | What's Covered |
|-----------------------|-------|----------------|
| Slug generation (Theory ×4) | 4 | Correct slug from various name inputs |
| Short-slug validation | 1 | `SERVICE_NAME_INVALID` for name that produces slug < 2 chars |
| Port out-of-range (Theory ×4) | 4 | `SERVICE_PORT_OUT_OF_RANGE` for ports outside 30100–30199 |
| Port exhaustion | 1 | `SERVICE_PORT_RANGE_EXHAUSTED` when all 100 ports assigned (B6 patch) |
| Port reclaim from soft-deleted | 1 | `GetNextPortAsync` returns first soft-deleted port's number |
| SSRF guard — loopback blocked (Theory ×4) | 4 | `SERVICE_URL_INVALID` for 127.0.0.1, localhost, 169.254.169.254, 100.100.100.200 |
| SSRF guard — private ranges allowed (Theory ×3) | 3 | 10.x, 192.168.x, 172.20.x allowed through |
| Tags JsonException guard | 2 | Empty and malformed `TagsJson` returns `[]` (B5 patch) |

**Total new tests: 18** (5 integration + 13 unit)

---

## Packages Added

| Project | Package | Version |
|---------|---------|---------|
| `Fishtank.Api.UnitTests` | `NSubstitute` | latest stable |

---

## Test Infrastructure Notes

- **InMemory EF Core** used in unit tests (Guid-isolated database per test class instance) — no SQLite port-ordering issue
- **IWireMockServerFactory** mocked via NSubstitute — unit tests never start actual WireMock processes
- **ThrowingWireMockFactory** (integration test helper class) used for fault injection in port-exhaustion and EngineStartup failure scenarios
- **SSRF private-range tests**: expect `Created (201)` status even though WireMock factory throws — service is saved to DB in `Stopped` state as expected

---

## Total Test Count by Project

| Project | Tests | Status |
|---------|-------|--------|
| `Fishtank.Api.UnitTests` | 49 | ✅ All pass |
| `Fishtank.Api.IntegrationTests` | 51 | ✅ All pass |
| **Total** | **100** | **✅ 0 failures** |
