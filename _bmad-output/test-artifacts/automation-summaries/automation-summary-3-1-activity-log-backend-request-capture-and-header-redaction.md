---
story_key: 3-1-activity-log-backend-request-capture-and-header-redaction
generated: 2026-06-27
phase: automation-expansion
suite_integration_total: 79
suite_unit_total: 96
gate: PASS
---

# Automation Summary — Story 3-1: Activity Log Backend

## Coverage Table

| AC | Test File | Layer | Test Name | Status |
|----|-----------|-------|-----------|--------|
| AC-2 | `HeaderRedactionServiceTests.cs` | Unit | `Redact_ExactMatchSensitiveHeader_ReplacesValueWithRedacted` (5 cases) | ✅ GREEN |
| AC-2 | `HeaderRedactionServiceTests.cs` | Unit | `Redact_ExactMatchIsCaseInsensitive_ReplacesValueWithRedacted` (6 cases) | ✅ GREEN |
| AC-2 | `HeaderRedactionServiceTests.cs` | Unit | `Redact_HeaderContainsSecret_ReplacesValueWithRedacted` (4 cases) | ✅ GREEN |
| AC-2 | `HeaderRedactionServiceTests.cs` | Unit | `Redact_HeaderContainsToken_ReplacesValueWithRedacted` (4 cases) | ✅ GREEN |
| AC-2 | `HeaderRedactionServiceTests.cs` | Unit | `Redact_SafeHeader_PassesThroughUnchanged` (5 cases) | ✅ GREEN |
| AC-2 | `HeaderRedactionServiceTests.cs` | Unit | `Redact_MixedHeaders_RedactsOnlySensitiveKeys` | ✅ GREEN |
| AC-2 | `HeaderRedactionServiceTests.cs` | Unit | `Redact_EmptyDictionary_ReturnsEmptyDictionary` | ✅ GREEN |
| AC-2 | `HeaderRedactionServiceTests.cs` | Unit | `Constructor_EnvVarFalse_DBFalse_RedactionEnabled` (**NEW**) | ✅ GREEN |
| AC-3 | `HeaderRedactionServiceTests.cs` | Unit | `Redact_WhenCaptureFullHeadersEnabled_ReturnsOriginalValues` (5 cases) | ✅ GREEN |
| AC-3/4 | `HeaderRedactionServiceTests.cs` | Unit | `Constructor_EnvVarTrue_EnablesFullCapture` (**NEW**) | ✅ GREEN |
| AC-3/4 | `HeaderRedactionServiceTests.cs` | Unit | `Constructor_DBSettingTrue_EnablesFullCapture` (**NEW**) | ✅ GREEN |
| AC-1 | `ActivityStoreTests.cs` | Unit | `Add_SingleRow_IsReturnedByGetAll` | ✅ GREEN |
| AC-1 | `ActivityStoreTests.cs` | Unit | `GetAll_WithServiceIdFilter_ReturnsOnlyMatchingRows` | ✅ GREEN |
| AC-1 | `ActivityStoreTests.cs` | Unit | `GetAll_NoFilter_ReturnsAllRows` | ✅ GREEN |
| AC-5 | `ActivityStoreTests.cs` | Unit | `Add_BeyondCap_EvidesOldestRowFirst` | ✅ GREEN |
| AC-5 | `ActivityStoreTests.cs` | Unit | `Add_BeyondCap_EvictionDoesNotAffectOtherServices` | ✅ GREEN |
| AC-5 | `ActivityStoreTests.cs` | Unit | `Clear_RemovesAllEntries` | ✅ GREEN |
| AC-5 | `ActivityStoreTests.cs` | Unit | `Clear_ThenGetAllWithFilter_ReturnsEmpty` | ✅ GREEN |
| AC-1 | `ActivityServiceTests.cs` | Unit | `CaptureAsync_StoresRowInActivityStore` (**NEW**) | ✅ GREEN |
| AC-6 | `ActivityServiceTests.cs` | Unit | `CaptureAsync_BroadcastsViaSignalR` (**NEW**) | ✅ GREEN |
| AC-7 | `ActivityServiceTests.cs` | Unit | `QueryAsync_FiltersByServiceId` (**NEW**) | ✅ GREEN |
| AC-7 | `ActivityServiceTests.cs` | Unit | `QueryAsync_FiltersByType_ReturnsMockedOnly` (**NEW**) | ✅ GREEN |
| AC-7 | `ActivityServiceTests.cs` | Unit | `QueryAsync_FiltersByType_ReturnsProxiedOnly` (**NEW**) | ✅ GREEN |
| AC-7 | `ActivityServiceTests.cs` | Unit | `QueryAsync_FiltersBySearchOnPath` (**NEW**) | ✅ GREEN |
| AC-7 | `ActivityServiceTests.cs` | Unit | `QueryAsync_PaginationSkipTake` (**NEW**) | ✅ GREEN |
| AC-8 | `ActivityServiceTests.cs` | Unit | `ClearAsync_CallsActivityStoreClear` (**NEW**) | ✅ GREEN |
| AC-7 | `Story3_1_ActivityTests.cs` | Integration | `GetActivity_Unauthenticated_Returns401` | ✅ GREEN |
| AC-7 | `Story3_1_ActivityTests.cs` | Integration | `GetActivity_Authenticated_NoActivity_Returns200WithEmptyArray` | ✅ GREEN |
| AC-7 | `Story3_1_ActivityTests.cs` | Integration | `GetActivity_TypeInvalid_Returns400WithActivityInvalidType` (**NEW**) | ✅ GREEN |
| AC-7 | `Story3_1_ActivityTests.cs` | Integration | `GetActivity_ServiceIdNotFound_Returns404WithActivityServiceNotFound` (**NEW**) | ✅ GREEN |
| AC-8 | `Story3_1_ActivityTests.cs` | Integration | `DeleteActivity_Authenticated_Returns200WithSuccess` | ✅ GREEN |
| AC-8 | `Story3_1_ActivityTests.cs` | Integration | `DeleteActivity_Unauthenticated_Returns401` | ✅ GREEN |
| AC-10 | `Story3_1_ActivityTests.cs` | Integration | `PutSettings_CaptureHeaders_UpdatesSetting` (**NEW**) | ✅ GREEN |
| AC-10 | `Story3_1_ActivityTests.cs` | Integration | `GetSettings_IncludesCaptureFullHeaders` (**NEW**) | ✅ GREEN |

---

## Tests Added This Phase

### Task 1 — `Story3_1_ActivityTests.cs` (4 new integration tests)
| Test | AC | Description |
|------|----|-------------|
| `GetActivity_TypeInvalid_Returns400WithActivityInvalidType` | AC-7 | Invalid `type` query param → 400 + `ACTIVITY_INVALID_TYPE` |
| `GetActivity_ServiceIdNotFound_Returns404WithActivityServiceNotFound` | AC-7 | Non-existent `serviceId` → 404 + `ACTIVITY_SERVICE_NOT_FOUND` |
| `PutSettings_CaptureHeaders_UpdatesSetting` | AC-10 | `PUT /api/settings/capture-headers` → 200 with `captureFullHeaders:true` |
| `GetSettings_IncludesCaptureFullHeaders` | AC-10 | `GET /api/settings` → response body contains `captureFullHeaders` field |

### Task 2 — `ActivityServiceTests.cs` (7 new unit tests — file created)
| Test | AC | Description |
|------|----|-------------|
| `CaptureAsync_StoresRowInActivityStore` | AC-1 | Verifies `store.Add(serviceId, row)` is called |
| `CaptureAsync_BroadcastsViaSignalR` | AC-6 | Verifies `Clients.All.SendCoreAsync("ActivityRowAdded", ...)` is called |
| `QueryAsync_FiltersByServiceId` | AC-7 | Verifies serviceId is forwarded to `store.GetAll(serviceId)` |
| `QueryAsync_FiltersByType_ReturnsMockedOnly` | AC-7 | LINQ type filter returns only Mocked rows |
| `QueryAsync_FiltersByType_ReturnsProxiedOnly` | AC-7 | LINQ type filter returns only Proxied rows |
| `QueryAsync_FiltersBySearchOnPath` | AC-7 | LINQ search filter matches URL path case-insensitively |
| `QueryAsync_PaginationSkipTake` | AC-7 | skip/take pagination returns correct subset |
| `ClearAsync_CallsActivityStoreClear` | AC-8 | Verifies `store.Clear()` is delegated correctly |

### Task 3 — `HeaderRedactionServiceTests.cs` (3 new unit tests)
| Test | AC | Description |
|------|----|-------------|
| `Constructor_EnvVarTrue_EnablesFullCapture` | AC-3/4 | `FISHTANK_CAPTURE_FULL_HEADERS=true` → no redaction applied |
| `Constructor_DBSettingTrue_EnablesFullCapture` | AC-3/4 | `GetCaptureFullHeadersCached()=true` → no redaction applied |
| `Constructor_EnvVarFalse_DBFalse_RedactionEnabled` | AC-2 | Both false → redaction active |

---

## Total Test Counts

| Suite | Total Tests | Tests Added This Phase |
|-------|-------------|----------------------|
| `Fishtank.Api.IntegrationTests` | **79** | +4 |
| `Fishtank.Api.UnitTests` | **96** | +11 |

---

## Intentional Coverage Gaps

| Gap | Rationale |
|-----|-----------|
| AC-5 per-service row cap via `FISHTANK_ACTIVITY_LOG_MAX_ROWS` env var | The DI constructor path reads from `IConfiguration`; the int parsing logic is trivially covered by the existing `ActivityStore(maxRowsPerService:)` constructor tests and adds no new behavioral coverage. |
| AC-6 SignalR hub mapping (`/hubs/activity`) | Hub routing and JWT auth enforcement at the SignalR connection layer are infrastructure concerns shared with the already-tested `ServicesHub` and `EventsHub`; covered by the existing SignalR infrastructure tests in earlier stories. |
| AC-9 in-memory cleared on restart | By definition untestable in-process; in-memory semantics are implicitly validated by `Clear_RemovesAllEntries` and the fact that `ActivityStore` is registered as a singleton with no persistence layer. |
| WireMock `RequestObserver` integration (AC-1 capture path) | End-to-end capture via a live WireMock server requires spinning up a WireMock process; this is an infrastructure integration layer deferred to manual/E2E testing. The `CaptureAsync_StoresRowInActivityStore` unit test covers the contract at the service boundary. |
