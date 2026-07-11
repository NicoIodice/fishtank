---
story_key: 6-1-pipeline-reset-endpoint
epic_id: epic-6
title: Pipeline Reset Endpoint
status: done
created: 2026-07-11
frs: [FR-45, FR-36]
nfrs: [NFR-14]
risk_links: [R-E6-001, R-E6-002]
test_design: _bmad-output/test-artifacts/test-design/test-design-epic-6.md
---

# Story 6-1: Pipeline Reset Endpoint

## User Story

**As a** CI/CD pipeline operator,
**I want** a `POST /api/admin/reset` endpoint that clears the activity log and reloads all WireMock mappings from disk,
**So that** I can reset Fishtank to a clean state between automated test runs without restarting the container.

---

## Acceptance Criteria

### Authentication & Authorization

1. **Given** `FISHTANK_PIPELINE_RESET_KEY` is configured with a valid value,
   **When** `POST /api/admin/reset` is called with header `X-Pipeline-Key` matching the configured value,
   **Then** HTTP 200 is returned with the standard response envelope `{"success":true,"data":{"entriesCleared":<N>,"mappingsReloaded":<M>}}`.

2. **Given** `FISHTANK_PIPELINE_RESET_KEY` is configured,
   **When** `POST /api/admin/reset` is called with an invalid `X-Pipeline-Key` header value,
   **Then** HTTP 401 is returned with error code `ADMIN_RESET_INVALID_KEY` and the attempted key value is **not** present in the response body, headers, or logs.

3. **Given** `FISHTANK_PIPELINE_RESET_KEY` is configured,
   **When** `POST /api/admin/reset` is called without the `X-Pipeline-Key` header,
   **Then** HTTP 401 is returned with error code `ADMIN_RESET_KEY_MISSING`.

4. **Given** `FISHTANK_PIPELINE_RESET_KEY` is **not** set or is empty,
   **When** `POST /api/admin/reset` is called (with or without any key header),
   **Then** HTTP 403 is returned with error code `ADMIN_RESET_DISABLED` and message "Pipeline reset is disabled — configure FISHTANK_PIPELINE_RESET_KEY to enable this endpoint."

5. **Given** a user with a valid JWT cookie (Admin or Standard User role),
   **When** `POST /api/admin/reset` is called **without** the `X-Pipeline-Key` header,
   **Then** HTTP 401 is returned — JWT auth alone is **not** sufficient for this endpoint.

### Reset Behavior

6. **Given** a successful reset request,
   **When** the endpoint executes,
   **Then** all in-memory activity log entries are cleared across all services.

7. **Given** a successful reset request,
   **When** the endpoint executes,
   **Then** in-memory proxy counters for all services are reset to zero.

8. **Given** a successful reset request,
   **When** the endpoint executes,
   **Then** WireMock mappings for all services are reloaded from disk (equivalent to Resync for all services).

9. **Given** a successful reset request,
   **When** the endpoint executes,
   **Then** running services remain running — no restart, no port rebinding, no interruption to the mock engine.

10. **Given** a successful reset request,
    **When** `GET /health` is called immediately after,
    **Then** HTTP 200 is returned — the container health is unaffected.

### Response Contract

11. **Given** a successful reset,
    **Then** the response body contains `{"success":true,"data":{"entriesCleared":<int>,"mappingsReloaded":<int>}}` where `entriesCleared` is the count of activity log rows cleared and `mappingsReloaded` is the total count of mapping files reloaded across all services.

12. **Given** any error response (401 or 403),
    **Then** the response uses the standard error envelope `{"success":false,"error":{"code":"ADMIN_*","message":"..."}}`.

### Idempotency

13. **Given** multiple consecutive `POST /api/admin/reset` requests with valid API key,
    **Then** all succeed with HTTP 200 — the endpoint is idempotent.

---

## Implementation Notes

### Endpoint Registration

Register in `AdminEndpoints.cs` (existing file from Epic 5):

```csharp
group.MapPost("/reset", ResetHandler)
    .WithName("PipelineReset")
    .WithSummary("Clears activity log and reloads all mappings from disk")
    .WithDescription("Requires API key authentication via X-Pipeline-Key header. JWT auth is not accepted.")
    .Produces<ResetResponse>(StatusCodes.Status200OK)
    .Produces<ErrorResponse>(StatusCodes.Status401Unauthorized)
    .Produces<ErrorResponse>(StatusCodes.Status403Forbidden);
```

### Authentication Strategy

This endpoint uses a **dedicated API key mechanism**, separate from JWT authentication:

1. **Read env var at startup:** `IConfiguration.GetValue<string>("FISHTANK_PIPELINE_RESET_KEY")` — inject via `IOptions<PipelineResetOptions>` registered in DI.

2. **Endpoint handler checks:**
   - If `PipelineResetOptions.ApiKey` is null/empty → 403 `ADMIN_RESET_DISABLED`
   - If `X-Pipeline-Key` header missing → 401 `ADMIN_RESET_KEY_MISSING`
   - If header value ≠ configured key → 401 `ADMIN_RESET_INVALID_KEY`
   - Otherwise → proceed with reset

3. **No `[Authorize]` attribute** — this endpoint explicitly bypasses JWT auth middleware. The API key check happens inline in the handler.

4. **Do NOT use middleware** — implement key validation inline in the handler to keep this endpoint self-contained and avoid adding complexity to the auth pipeline.

### Service Layer

Create `IPipelineResetService` in `Services/`:

```csharp
public interface IPipelineResetService
{
    Task<ResetResult> ResetAsync(CancellationToken ct = default);
}

public record ResetResult(int EntriesCleared, int MappingsReloaded);
```

Implementation calls:
- `IActivityLogService.ClearAll()` — clear in-memory activity log
- `IServiceManager.ReloadAllMappingsAsync()` — reload WireMock mappings for all services

### Response DTOs

Add to `Models/Admin/`:

```csharp
public record ResetResponse(int EntriesCleared, int MappingsReloaded);
```

### Configuration

Add to `appsettings.json` (template — actual value comes from env var):

```json
{
  "Fishtank": {
    "PipelineResetKey": ""
  }
}
```

Bind via `builder.Configuration.Bind("Fishtank", options)` pattern already established.

### Error Codes

| Code | HTTP | Condition |
|------|------|-----------|
| `ADMIN_RESET_DISABLED` | 403 | `FISHTANK_PIPELINE_RESET_KEY` not configured |
| `ADMIN_RESET_KEY_MISSING` | 401 | `X-Pipeline-Key` header not present |
| `ADMIN_RESET_INVALID_KEY` | 401 | `X-Pipeline-Key` value does not match |

### Logging

- Log at `Information` level: "Pipeline reset initiated" (no key value)
- Log at `Information` level: "Pipeline reset complete: {EntriesCleared} entries cleared, {MappingsReloaded} mappings reloaded"
- Log at `Warning` level: "Pipeline reset attempt with invalid key" (no key value in log)
- **Never log the API key value** — not on success, not on failure, not in any structured property

### Existing Code References

| Component | Location | Usage |
|-----------|----------|-------|
| `IActivityLogService` | `Services/ActivityLogService.cs` | Call `ClearAll()` |
| `IServiceManager` | `Engine/ServiceManager.cs` | Call `ReloadAllMappingsAsync()` (may need to add if not present) |
| `AdminEndpoints.cs` | `Endpoints/AdminEndpoints.cs` | Add `/reset` route to existing group |
| `ErrorResponse` | `Models/ErrorResponse.cs` | Standard error envelope |

---

## Out of Scope

- **Rate limiting on `/admin/reset`** — API key authentication is sufficient for v1; rate limiting is documented as v2 security hardening (per test design risk assessment).
- **JWT auth for this endpoint** — This endpoint is explicitly API-key-only by design (CI/CD pipelines don't have JWT tokens).
- **Partial reset** — Cannot reset a single service; always resets all services.
- **Async/background reset** — Reset is synchronous; response returns after completion.
- **SignalR broadcast after reset** — Activity log clear does not push to connected UIs; they will see empty log on next poll/reconnect.

---

## Test Notes

### Integration Tests (xUnit + WebApplicationFactory)

Reference: [test-design-epic-6.md](..\..\test-artifacts\test-design\test-design-epic-6.md) — Story 6-1 section

**P0 (Release Gate):**
- Valid API key → 200 with envelope
- Invalid API key → 401
- Missing header → 401
- Env var not set → 403 with explicit message
- Reset clears activity log (verify via `GET /api/activity`)
- Reset doesn't affect `/health`

**P1:**
- Mappings reloaded (modify mapping file, reset, verify new mapping active)
- API key value not in error response
- Standard User JWT cannot substitute for API key
- CI workflow: reset before test run cleans log

**Test Setup:**
- Set `FISHTANK_PIPELINE_RESET_KEY=test-reset-key-32chars-minimum!!` in test configuration
- Create activity log entries before reset
- Verify entries are gone after reset

### Unit Tests

- `PipelineResetService.ResetAsync()` — calls `ClearAll()` and `ReloadAllMappingsAsync()`
- `ResetResult` — correct counts returned
- API key validation logic (extract to helper for testability)

---

## Dependencies

- **Story 3-1** (Activity Log Backend) — `IActivityLogService.ClearAll()` must exist
- **Story 2-1** (WireMock Engine Layer) — `IServiceManager` must support `ReloadAllMappingsAsync()` or equivalent
- **Story 5-1** (Feature Toggles) — `AdminEndpoints.cs` already exists from Epic 5

---

## Definition of Done

- [ ] `POST /api/admin/reset` endpoint registered in `AdminEndpoints.cs`
- [ ] API key auth implemented (not JWT) with correct 401/403 responses
- [ ] Activity log cleared on successful reset
- [ ] Mappings reloaded for all services on successful reset
- [ ] Running services unaffected by reset
- [ ] Response envelope with `entriesCleared` and `mappingsReloaded` counts
- [ ] All P0 integration tests passing
- [ ] All P1 integration tests passing
- [ ] API key value never logged or exposed in error responses
- [ ] OpenAPI spec updated to include `/admin/reset` endpoint
- [ ] Code review passed with no blocking issues
