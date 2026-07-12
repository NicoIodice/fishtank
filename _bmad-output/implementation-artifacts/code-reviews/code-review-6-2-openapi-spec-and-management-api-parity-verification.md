# Code Review: Story 6-2 — OpenAPI Spec & Management API Parity Verification

**Date:** 2026-07-11 (Re-review pass 2)  
**Reviewer:** bmad-code-review (adversarial, 3-layer — Blind Hunter · Edge Case Hunter · Acceptance Auditor)  
**Story:** `6-2-openapi-spec-and-management-api-parity-verification`  
**Branch:** `feature/6-2-openapi-spec-and-management-api-parity-verification`  
**Base:** `origin/release/v1.0.0`  
**Re-review trigger:** QuickDev fix cycle applied addressing B-1, B-2, M-1, M-2 from first review (2026-07-11)

---

## Summary

| Severity | Count |
|----------|-------|
| 🔴 BLOCKER | 0 |
| 🟠 MAJOR | 4 |
| 🟡 MINOR | 3 |
| ✅ RESOLVED | 4 (B-1, B-2, M-1, M-2) |
| ✅ PASS | 11 |

**Overall verdict: PASS — no blockers remain. MAJORs are carried as action items.**

---

## ✅ Resolved Blockers

### B-1: ✅ RESOLVED — `docs/openapi.json` committed

**Verification:** `git show HEAD:docs/openapi.json` → valid JSON, OpenAPI 3.1.1, 41 paths. All AC-7 required endpoints present — verified programmatically: **NONE missing**.

---

### B-2: ✅ RESOLVED — CI parity check step added

**Verification:** Step added to `.github/workflows/test.yml` after the `Build` step, conditioned on `matrix.suite.name == 'Integration Tests'`. Runner is `ubuntu-latest` (default shell: bash — process substitution `<(...)` works). `--no-build` is safe since `dotnet build src/Fishtank.slnx` precedes this step. YAML syntax is valid.

```yaml
- name: Validate OpenAPI spec parity
  if: matrix.suite.name == 'Integration Tests'
  run: |
    ASPNETCORE_ENVIRONMENT=Testing ... dotnet run --project src/Fishtank.Api --no-build &
    APP_PID=$!
    sleep 10
    curl --fail --silent http://localhost:5000/openapi/v1.json -o /tmp/served-openapi.json || ...
    diff <(jq --sort-keys . docs/openapi.json) <(jq --sort-keys . /tmp/served-openapi.json) || ...
    kill $APP_PID
```

---

## ✅ Resolved Majors

### M-1: ✅ RESOLVED — `.RequireAuthorization()` restored on `/api/activity/test-seed`

**Evidence:**
```diff
-            }).RequireAuthorization();
+            })
+            .RequireAuthorization()
+            .WithTags("Test")
+            .WithSummary("Seed an activity row for testing");
```
Authorization correctly chained before `.WithTags()` and `.WithSummary()`. No residual issue.

---

### M-2: ✅ RESOLVED — `/api/services/import` returns 501 Not Implemented

**Evidence:**
```diff
+        // Note: For now, this is a placeholder that returns 501 Not Implemented.
+        return Results.StatusCode(501);
```
The misleading 200 + internal jargon message is gone. N-1 (internal FR-43 reference in body) also resolved as side-effect.

---

## 🟠 MAJOR (Carried from first review — not fixed by QuickDev cycle)

### M-3: `GetServiceAsync` performs full list scan for single-entity lookup

**Location:** `src/Fishtank.Api/Endpoints/ServicesEndpoints.cs` — new `GetServiceAsync` method  
**Evidence:**
```csharp
private static async Task<IResult> GetServiceAsync(Guid id, IServiceManager manager, CancellationToken ct)
{
    var services = await manager.ListAsync(ct);            // fetches ALL services
    var service = services.FirstOrDefault(s => s.Id == id);
```
Every other single-service endpoint (`UpdateAsync`, `StartAsync`, `StopAsync`, `DeleteAsync`) accepts `Guid id` directly on `IServiceManager`. `GetServiceAsync` is the only outlier — O(n) for every `GET /api/services/{id}`. Concurrent delete between list fetch and LINQ filter produces stale-read risk.

**Fix:** Extend `IServiceManager` with `GetAsync(Guid id, CancellationToken ct)` or use an existing equivalent.

---

### M-4: `/health` endpoint — response format is a breaking change

**Location:** `src/Fishtank.Api/Program.cs`  
**Evidence:**
```diff
-app.MapHealthChecks("/health");
+app.MapGet("/health", async (HealthCheckService healthCheckService, CancellationToken ct) =>
+{
+    var report = await healthCheckService.CheckHealthAsync(ct);
+    return report.Status == HealthStatus.Healthy
+        ? Results.Ok(new { status = "Healthy", checks = report.Entries.Select(...) })
+        : Results.StatusCode(503);
+})
```
Replaces standard ASP.NET Core health middleware (plain-text body, `Content-Type: text/plain`) with custom JSON. Docker healthcheck is unaffected (tests status code only). External monitoring tools that parse the plain-text format are silently broken.

**Fix:** If JSON is intentional, document in `CHANGELOG.md`/`releases.yaml`. If the purpose was only OpenAPI documentation, add OpenAPI metadata to the existing `MapHealthChecks()` call instead.

---

### M-5: AC-1 integration test does not verify Production environment

**Location:** `src/Fishtank.Api.IntegrationTests/OpenApi/OpenApiSpecTests.cs`  
**Evidence:** `GetOpenApiSpec_ReturnsOk` runs under `ASPNETCORE_ENVIRONMENT=Testing`. The AC-1 fix moved `MapOpenApi()` outside the env guard, but the guard already included Testing — the test was already green before the fix. A regression that re-adds the Production guard would pass all current tests.

**Fix:**
```csharp
[Fact]
public async Task GetOpenApiSpec_IsServedInProductionEnvironment()
{
    await using var factory = _factory.WithWebHostBuilder(b =>
        b.UseEnvironment("Production"));
    using var client = factory.CreateClient();
    var response = await client.GetAsync("/openapi/v1.json");
    response.StatusCode.Should().Be(HttpStatusCode.OK);
}
```

---

### M-6: `FISHTANK_SERVICES_ROOT` and `FISHTANK_ACTIVITY_MAX_ENTRIES` are phantom env vars *(upgraded from N-3)*

**Location:** `README.md` (added by this story)  
**Escalation rationale:** Confirmed phantom — search of all `.cs` files under `src/` returns **no matches** for either variable name. Neither is bound anywhere in the .NET application.

**Evidence (diff):**
```diff
+| `FISHTANK_SERVICES_ROOT` | `/mocks` | Root directory for service instance directories (WireMock processes). |
+| `FISHTANK_ACTIVITY_MAX_ENTRIES` | `10000` | Maximum number of activity log entries to retain in memory. |
```
Operators who set `FISHTANK_SERVICES_ROOT` expecting it to control the WireMock root directory will see no effect. The actual binding is likely `FISHTANK_MOCKS_ROOT` (already documented).

**Fix:** Remove both phantom rows from README. File as deferred backlog if they should eventually be implemented.

---

## 🟡 MINOR (New findings from fix cycle)

### N-1: `/api/services/import` OpenAPI spec documents `200 OK` but code returns `501`

**Location:** `docs/openapi.json` + `ServicesEndpoints.cs`  
**Evidence:**
- `docs/openapi.json`: `"responses": { "200": { "description": "OK" } }` for `/api/services/import`
- Runtime: `Results.StatusCode(501)` with no body
- No `.Produces<>(501)` decorator → framework generates 200 in served spec

The CI parity check will pass (both committed and served specs show 200), but the spec is factually wrong — API consumers will receive an unexpected 501.

**Fix:** Add `.Produces(501)` to the import route, then re-export `docs/openapi.json` to match.

---

### N-2: Inconsistent `.Produces<>()` decorator coverage *(carried from first review)*

**Location:** `src/Fishtank.Api/Endpoints/ServicesEndpoints.cs`  
Only `ListServicesAsync` has `.Produces<ApiResponseSchema<object>>(200)` and `.Produces<ApiErrorResponseSchema>(404)`. All other 30+ endpoint registrations have no decorators. Response schema documentation in the spec relies entirely on framework inference — typed response schemas won't appear for most endpoints.

---

### N-3: `docs/openapi.json` committed in Testing mode includes test-only endpoints

**Location:** `docs/openapi.json`  
The committed spec contains `/api/test/reset-db`, `/api/test/reset-services`, `/api/test/seed-event`, and `/api/activity/test-seed` — all guarded by `IsDevelopment || IsEnvironment("Testing")` in Program.cs. These endpoints do not exist in Production. CI parity check always runs in Testing mode, so parity always passes. However, any SDK generated from `docs/openapi.json` will include non-Production endpoints.

**Fix option:** Add a comment/note to `docs/openapi.json` clarifying it represents the Testing-mode spec. Or re-export in Production mode for a cleaner consumer-facing spec.

---

## ✅ PASS (Confirmed — no regressions from first review)

1. **`app.MapOpenApi()` correctly moved outside env guard** — Confirmed in diff. `MapTestEndpoints()` stays inside guard.
2. **Complete `.WithTags()` coverage across all endpoint groups** — All 11 endpoint files.
3. **Complete `.WithSummary()` coverage** — Every route has non-empty summary.
4. **`OpenApiSchemas.cs` types correct and well-documented** — `ApiResponseSchema<T>`, `ApiErrorResponseSchema`, `ApiErrorDetail` intact.
5. **`/api/system-events` → `/api/events` rename** — Consistently applied in all test files.
6. **`docker-compose.example.yml` env vars** — All 5 previously-missing vars present.
7. **`OpenApiSpecTests.cs` — 10 tests, correct structure** — ATDD scaffolding valid.
8. **`GET /api/services/{id}` endpoint added** — Present in spec and implementation.
9. **Route registration order safe** — `next-port` (literal) before `{id:guid}` (constrained).
10. **All AC-7 required endpoints in `docs/openapi.json`** — Verified programmatically: 0 missing.
11. **`docs/openapi.json` is valid JSON** — OpenAPI 3.1.1, 41 paths, parseable.

---

## Acceptance Criteria Coverage Matrix

| AC | Description | Status |
|----|-------------|--------|
| AC-1 | OpenAPI served in all environments | ✅ Fixed — ⚠️ test gap for Production (M-5) |
| AC-2 | No auth required for spec | ✅ Framework-enforced; test covers it |
| AC-3 | Response envelope in schemas | ✅ `ApiResponseSchema<T>` registered |
| AC-4 | Error codes documented | ✅ `ApiErrorDetail` with code field |
| AC-5 | All endpoints have tags | ✅ All 11 files updated |
| AC-6 | All endpoints have summary | ✅ All routes have non-empty summary |
| AC-7 | FR-43 parity: 35+ endpoints | ✅ All required paths present in committed spec |
| AC-8 | `docs/openapi.json` committed | ✅ RESOLVED (was B-1) |
| AC-9 | CI parity check step | ✅ RESOLVED (was B-2) |
| AC-10 | FR-36 env vars in README + docker-compose | ⚠️ 2 phantom vars added (M-6) |

---

## Prioritized Action Items

| # | Severity | Item |
|---|----------|------|
| 1 | 🟠 MAJOR | M-6: Remove phantom `FISHTANK_SERVICES_ROOT` and `FISHTANK_ACTIVITY_MAX_ENTRIES` from README |
| 2 | 🟠 MAJOR | M-3: Replace `ListAsync + FirstOrDefault` in `GetServiceAsync` with direct `GetAsync(Guid)` |
| 3 | 🟠 MAJOR | M-5: Add Production-mode integration test for `/openapi/v1.json` |
| 4 | 🟠 MAJOR | M-4: Document `/health` format change in CHANGELOG or revert to `MapHealthChecks()` |
| 5 | 🟡 MINOR | N-1: Add `.Produces(501)` to import route and re-export `docs/openapi.json` |
| 6 | 🟡 MINOR | N-2: Add `.Produces<>()` decorators to remaining endpoint registrations |
| 7 | 🟡 MINOR | N-3: Add note to `docs/openapi.json` clarifying Testing-mode export |

---

*Report generated: 2026-07-11 (pass 2) by bmad-code-review adversarial workflow (Blind Hunter · Edge Case Hunter · Acceptance Auditor)*  
*Previous review: 2026-07-11 (pass 1) — 2 BLOCKERs, 5 MAJORs, 3 MINORs*
