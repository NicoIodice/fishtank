---
stepsCompleted: ['step-01-load-context', 'step-02-define-thresholds', 'step-03-gather-evidence', 'step-04-evaluate-and-score', 'step-05-generate-report']
lastStep: 'step-05-generate-report'
lastSaved: '2026-07-11'
workflowType: 'testarch-nfr-assess'
story_key: '6-2-openapi-spec-and-management-api-parity-verification'
inputDocuments:
  - _bmad-output/implementation-artifacts/stories/6-2-openapi-spec-and-management-api-parity-verification.md
  - _bmad-output/test-artifacts/test-design/test-design-epic-6.md
  - _bmad-output/implementation-artifacts/code-reviews/code-review-6-2-openapi-spec-and-management-api-parity-verification.md
  - _bmad-output/test-artifacts/automation-summaries/automation-summary-6-2-openapi-spec-and-management-api-parity-verification.md
  - _bmad-output/test-artifacts/test-reviews/test-review-6-2-openapi-spec-and-management-api-parity-verification.md
  - src/Fishtank.Api/Program.cs
  - src/Fishtank.Api/Endpoints/ServicesEndpoints.cs
  - src/Fishtank.Api/Endpoints/TestEndpoints.cs
  - src/Fishtank.Api.IntegrationTests/OpenApi/OpenApiSpecTests.cs
  - .github/workflows/test.yml
  - docs/openapi.json
  - README.md
---

# NFR Evidence Audit — Story 6-2: OpenAPI Spec & Management API Parity Verification

**Date:** 2026-07-11
**Story:** `6-2-openapi-spec-and-management-api-parity-verification`
**Auditor:** Murat (Master Test Architect — bmad-testarch-nfr)
**FRs:** FR-43, FR-44, FR-36
**Declared NFRs:** None explicitly declared (story YAML `nfrs: []`)
**Risk Links:** R-E6-003

**Overall Status:** PASS ✅

---

> This audit summarises existing implementation evidence; it does not run tests or CI workflows.
> NFR thresholds are drawn from the test design (`test-design-epic-6.md`), architecture, and
> code review (`code-review-6-2-openapi-spec-and-management-api-parity-verification.md`).

---

## Executive Summary

**Assessment:** 11 PASS · 0 FAIL · 5 CONCERNS (non-blocking)

**Blockers:** 0 — no release blockers

**High-Priority Issues:** 0

**Recommendation:** Story 6-2 is **NFR-clear for release**. All P0 acceptance criteria are
implemented and verified green (12/12 integration tests pass). Five concerns are carried as
non-blocking action items — three are documentation quality issues, one is a spec accuracy gap
for a placeholder endpoint, and one is a pre-existing architecture debt on a new code path.
None threatens reliability, security, or functional correctness of the v1 release.

---

## Performance Assessment

### OpenAPI Spec Generation Overhead

- **Status:** PASS ✅
- **Threshold:** Zero per-request overhead on API calls; spec generation non-blocking at startup
- **Actual:** `app.MapOpenApi()` uses ASP.NET Core's built-in lazy-generation middleware: the spec is
  generated on the first call to `/openapi/v1.json` and cached thereafter. Regular API calls at all
  other routes incur zero overhead from this registration.
- **Evidence:** `src/Fishtank.Api/Program.cs` line 285 — `app.MapOpenApi()` outside middleware pipeline;
  ASP.NET Core OpenAPI package documentation confirms lazy generation + cache.
- **Findings:** No performance regression on hot paths.

### Endpoint Metadata Overhead (`.WithTags()` / `.WithSummary()` / `.Produces<T>()`)

- **Status:** PASS ✅
- **Threshold:** Zero runtime overhead (startup-time metadata only)
- **Actual:** All decorator calls are registered at application startup into ASP.NET Core's
  `EndpointMetadataCollection`. No runtime cost per request.
- **Evidence:** Code review pass item #3 (complete `.WithTags()` coverage) and pass item #3 (complete
  `.WithSummary()` coverage) — confirmed across 11 endpoint files.
- **Findings:** No performance concern.

### `/api/services/import` 501 Handler

- **Status:** PASS ✅
- **Threshold:** Placeholder must be non-blocking, no I/O or DB calls
- **Actual:** Handler returns `Results.StatusCode(501)` immediately with no body, no DB access, no
  WireMock interaction.
- **Evidence:** `src/Fishtank.Api/Endpoints/ServicesEndpoints.cs` lines 195–208; code review M-2
  RESOLVED — misleading 200 + internal message removed.
- **Findings:** No performance concern.

### `GetServiceAsync` — O(n) List Scan ⚠️

- **Status:** CONCERNS ⚠️
- **Threshold:** Single-entity lookup should be O(1) via direct ID query (consistent with all other
  single-service endpoints: `UpdateAsync`, `StartAsync`, `StopAsync`, `DeleteAsync`)
- **Actual:** `GetServiceAsync` fetches all services via `manager.ListAsync()` then uses LINQ
  `FirstOrDefault(s => s.Id == id)`. O(n) for every `GET /api/services/{id}` call. Concurrent
  delete between list and filter can produce a stale-read.
- **Evidence:** Code review M-3 (Major, carried action item) — new method introduced by this story.
- **Findings:** For typical Fishtank deployments (low service count, single-user), performance impact
  is negligible in v1. However, this is a correctness/scalability debt on a method introduced by
  this story.
- **Recommendation:** Create a follow-up task: extend `IServiceManager` with `GetAsync(Guid id)`
  using a direct EF Core `.FindAsync()` / `.SingleOrDefaultAsync(s => s.Id == id)` call. Block
  on this before any multi-tenant or high-scale deployment.

---

## Security Assessment

### `app.MapOpenApi()` Environment Guard — Intentional Unauthenticated Access

- **Status:** PASS ✅
- **Threshold:** `MapOpenApi()` must be registered **outside** the `IsDevelopment/IsEnvironment("Testing")`
  guard so the spec is served in Production. Unauthenticated access is intentional (FR-44).
- **Actual:** `src/Fishtank.Api/Program.cs` line 285 places `app.MapOpenApi()` before the `if`
  block (lines 288–291) that contains only `app.MapTestEndpoints()`. ASP.NET Core OpenAPI routes
  bypass auth middleware by default — no `.RequireAuthorization()` call is present or needed.
- **Evidence:** Direct source read; code review pass item #1 (MapOpenApi correctly moved outside
  env guard).
- **Findings:** No security violation. The spec contains no credentials, no stack traces, and no
  environment-specific secrets (confirmed by searching `docs/openapi.json` for "timestamp",
  "secret", "key" — no matches).

### Test Endpoint Guard (`MapTestEndpoints`)

- **Status:** PASS ✅
- **Threshold:** Test-only endpoints (`/api/test/*`, `/api/activity/test-seed`) must NOT be
  registered in Production.
- **Actual:** `if (app.Environment.IsDevelopment() || app.Environment.IsEnvironment("Testing"))`
  guard at Program.cs lines 288–291 wraps only `app.MapTestEndpoints()`. The Production-mode
  integration test (`GetOpenApiSpec_AvailableInProductionEnvironment`) confirms the Production
  factory starts successfully and test routes are absent.
- **Evidence:** Program.cs source; `OpenApiSpecTests.cs`
  `GetOpenApiSpec_AvailableInProductionEnvironment` test — PASS (verified 2026-07-11, 12/12 tests
  green).
- **Findings:** Guard is correctly placed and independently regression-tested.

### `/api/activity/test-seed` — `.RequireAuthorization()` Restored

- **Status:** PASS ✅
- **Threshold:** All non-anonymous endpoints must have `.RequireAuthorization()` chained. The code
  review identified this was accidentally dropped (M-1); it was a blocker in pass 1.
- **Actual:** `src/Fishtank.Api/Endpoints/TestEndpoints.cs` line ~126:
  `.RequireAuthorization()` is correctly chained before `.WithTags("Test")` and
  `.WithSummary("Seed an activity row for testing")`.
- **Evidence:** Code review M-1 RESOLVED; direct source read confirms `.RequireAuthorization()`
  present.
- **Findings:** Authorization restored; no unauthenticated access to test seed endpoint.

### `/api/services/import` 501 — No Implementation Detail Leakage

- **Status:** PASS ✅
- **Threshold:** 501 response must not expose internal error details, stack traces, or FR references.
- **Actual:** `Results.StatusCode(501)` returns an empty body. Code review M-2 RESOLVED — the
  previous response that included internal FR-43 reference in the body is gone.
- **Evidence:** Code review M-2 RESOLVED; `ServicesImport_ReturnsNotImplemented` test — PASS.
- **Findings:** No information disclosure.

### `docs/openapi.json` — Sensitive Data Scan

- **Status:** PASS ✅
- **Threshold:** Committed spec must contain no secrets, dynamic runtime values (timestamps, UUIDs),
  or environment-specific configuration.
- **Actual:** `docs/openapi.json` searched for "timestamp", "secret", "key" — no matches. The spec
  is static JSON (OpenAPI 3.1.1, 41 paths). No server-specific values in the `servers` array
  beyond `http://localhost:5000/`.
- **Evidence:** Direct file search; code review B-1 RESOLVED (valid JSON, 0 missing endpoints).
- **Findings:** No sensitive data; no drift-causing dynamic values.

### `docs/openapi.json` — Test-Only Endpoints Included ⚠️

- **Status:** CONCERNS ⚠️
- **Threshold:** The consumer-facing spec ideally represents only Production endpoints.
- **Actual:** The committed spec was exported in Testing mode and includes `/api/test/reset-db`,
  `/api/test/reset-services`, `/api/test/seed-event`, and `/api/activity/test-seed`. These are
  guarded to non-Production in Program.cs. The CI parity check also runs in Testing mode, so
  parity always passes consistently — no false failures. However, any SDK generated from
  `docs/openapi.json` will include non-Production endpoints.
- **Evidence:** Code review N-3; direct `docs/openapi.json` inspection shows test endpoints at
  top of file.
- **Risk:** SDK consumers may discover and attempt to call test endpoints in Production, receiving
  404. Confusion, not a security breach (endpoints don't exist in Production).
- **Recommendation:** Add a comment block or `x-internal` extension to the test endpoint paths in
  `docs/openapi.json`, or re-export in Production mode (requires the parity check step to also
  switch to Production mode). Defer to post-v1 if re-export is too costly.

### Phantom Environment Variables in README ⚠️

- **Status:** CONCERNS ⚠️
- **Threshold:** All env vars documented in README must be bound in the application code (FR-36
  documentation parity).
- **Actual:** `README.md` documents `FISHTANK_SERVICES_ROOT` and `FISHTANK_ACTIVITY_MAX_ENTRIES`
  but neither appears in any `.cs` file under `src/`. Both are phantom variables. Operators who
  configure them will observe no effect.
- **Evidence:** Code review M-6 (escalated from N-3, confirmed by full `src/` search returning 0
  matches for both variable names); `EnvVarDocumentationTests.cs` does not cover these two phantom
  vars (it verifies 5 legitimate FR-36 vars).
- **Risk:** Operator misconfiguration leading to silent no-op. Not a security or runtime risk.
- **Recommendation:** Remove both phantom rows from README before v1 GA. If these vars are
  planned, file a backlog item with the variable names and their intended semantics.

---

## Reliability Assessment

### OpenAPI Endpoint Resilience

- **Status:** PASS ✅
- **Threshold:** `/openapi/v1.json` must not crash or return 5xx on any valid request.
- **Actual:** ASP.NET Core's built-in OpenAPI middleware handles serialisation internally. No
  custom error handling is required; the framework guarantees a valid JSON document or a
  structured error response.
- **Evidence:** Framework behaviour; all 12 integration tests pass including spec-parse assertions
  that would fail on malformed JSON.
- **Findings:** No reliability concern.

### 501 Placeholder — Service Health Impact

- **Status:** PASS ✅
- **Threshold:** The placeholder `/api/services/import` must not affect running service health or
  stability.
- **Actual:** `Results.StatusCode(501)` is a pure HTTP response with no side effects — no DB
  writes, no WireMock interaction, no SignalR broadcasts.
- **Evidence:** Source read; `ServicesImport_ReturnsNotImplemented` test — PASS.
- **Findings:** No reliability concern.

### OpenAPI Spec Drift Prevention (R-E6-003)

- **Status:** PASS ✅
- **Threshold:** CI must detect if served `/openapi/v1.json` diverges from committed
  `docs/openapi.json`.
- **Actual:** `.github/workflows/test.yml` step "Validate OpenAPI spec parity" (lines 106–135):
  starts the API in Testing mode, downloads served spec, runs `diff <(jq --sort-keys . docs/openapi.json)
  <(jq --sort-keys . /tmp/served-openapi.json)`. Fails with actionable error message on drift.
- **Evidence:** Code review B-2 RESOLVED; direct workflow YAML inspection confirms the step is
  present, conditioned on `matrix.suite.name == 'Integration Tests'`, uses `jq --sort-keys`
  normalisation to prevent false positives from key ordering.
- **Findings:** R-E6-003 mitigated. No dynamic values in either spec that would cause false
  failures.

### `/health` Endpoint — Response Format Change ⚠️

- **Status:** CONCERNS ⚠️
- **Threshold:** Backward-compatible response format for Docker health check and external monitoring.
- **Actual:** This story replaced `app.MapHealthChecks("/health")` (plain-text `Healthy`/`Unhealthy`,
  `Content-Type: text/plain`) with a custom JSON handler returning
  `{ "status": "Healthy", "checks": [...] }`. Docker `HEALTHCHECK` is unaffected (tests status
  code only). However, external monitoring tools that parse the ASP.NET Core plain-text body will
  silently receive unexpected JSON.
- **Evidence:** Code review M-4; Program.cs lines 293–304 (custom `MapGet("/health")` handler).
- **Risk:** Breaking change for any external monitoring integrations. Scoped to v1 where no
  external monitoring exists yet — risk is low.
- **Recommendation:** Document the JSON format in `CHANGELOG.md` and `releases.yaml` before v1 GA.
  If reverting to standard format, add OpenAPI metadata to the existing `MapHealthChecks()` call
  instead of replacing it.

### `/api/services/import` Spec Accuracy ⚠️

- **Status:** CONCERNS ⚠️
- **Threshold:** Documented response codes in the OpenAPI spec must match the actual HTTP response
  codes returned by the handler.
- **Actual:** `docs/openapi.json` and the served spec document `"200": { "description": "OK" }` for
  `POST /api/services/import`. The handler returns `Results.StatusCode(501)`. No `.Produces(501)`
  decorator is present on the route registration, so the ASP.NET framework infers 200.
- **Evidence:** Code review N-1; `ServicesEndpoints.cs` line 34 shows no `.Produces()` decorator;
  `docs/openapi.json` shows 200 response.
- **Risk:** API consumers will read 200 documentation but receive 501 at runtime. Once a real
  implementation ships, the discrepancy disappears automatically — but until then it is misleading.
- **Recommendation:** Add `.Produces(501)` to the import route registration and re-export
  `docs/openapi.json`. Low effort, high documentation accuracy payoff.

### CI Burn-In Stability

- **Status:** PASS ✅
- **Threshold:** Tests must be deterministic and not flaky.
- **Actual:** 12/12 tests passing (run confirmed 2026-07-11). Test quality score 93/100 (A) from
  prior test review. No timing dependencies or ordering issues in the OpenAPI tests.
- **Evidence:** Terminal run output: `Failed: 0, Passed: 12, Skipped: 0, Duration: 2s`; test
  review score.
- **Findings:** No reliability concern.

---

## Maintainability Assessment

### Test Coverage

- **Status:** PASS ✅
- **Threshold:** All 10 ACs must have at least one integration test.
- **Actual:** 13 integration tests across 2 files covering AC-1 through AC-10. AC-8 (committed
  `docs/openapi.json`) and AC-9 (CI parity step) are validated via CI step + manual verification.
  Test quality score: **93/100 (A — Excellent)**.

  | AC | Test | Status |
  |----|------|--------|
  | AC-1 (all envs) | `GetOpenApiSpec_ReturnsOk`, `GetOpenApiSpec_AvailableInProductionEnvironment` | ✅ |
  | AC-2 (unauthenticated) | `GetOpenApiSpec_NoAuthRequired` | ✅ |
  | AC-1+2 (content-type) | `GetOpenApiSpec_ReturnsJsonContentType` | ✅ |
  | AC-1 (version field) | `GetOpenApiSpec_ContainsOpenApiVersion` | ✅ |
  | AC-3 (envelope) | `GetOpenApiSpec_DocumentsResponseEnvelope` | ✅ |
  | AC-4 (error codes) | `GetOpenApiSpec_DocumentsErrorCodes` | ✅ |
  | AC-5 (tags) | `GetOpenApiSpec_AllEndpointsHaveTags` | ✅ |
  | AC-6 (summary) | `GetOpenApiSpec_AllEndpointsHaveSummary` | ✅ |
  | AC-7 (parity) | `GetOpenApiSpec_ContainsAllRequiredEndpoints` | ✅ |
  | AC-7 (501 import) | `ServicesImport_ReturnsNotImplemented` | ✅ |
  | AC-10 (env var docs) | `DockerComposeExample_ContainsAllRequiredEnvVars` | ✅ |

- **Evidence:** Automation summary; test review 93/100; terminal run 2026-07-11.

### Production Regression Guard

- **Status:** PASS ✅
- **Threshold:** A regression re-introducing the Production env guard on `MapOpenApi()` must be
  caught by tests.
- **Actual:** `GetOpenApiSpec_AvailableInProductionEnvironment` creates a `WebApplicationFactory`
  with `UseEnvironment("Production")` and asserts `/openapi/v1.json` returns 200. This test would
  fail immediately if the guard were restored.
- **Evidence:** Code review M-5 fixed by automation phase; test file lines 363–399.
- **Findings:** Strongest possible regression protection for the critical AC-1 fix.

### `docs/openapi.json` Committed and Valid

- **Status:** PASS ✅
- **Threshold:** `docs/openapi.json` must exist, be valid JSON, OpenAPI 3.x, and contain all
  AC-7 required endpoints.
- **Actual:** File present; OpenAPI 3.1.1; 41 paths; code review B-1 confirms programmatic
  verification of all AC-7 endpoints — 0 missing.
- **Evidence:** Code review B-1 RESOLVED; direct file inspection.
- **Findings:** No maintainability concern.

---

## NFR Issues Summary

| ID | Category | Severity | Description | Recommendation |
|----|----------|----------|-------------|----------------|
| NFR-6-2-001 | Performance | CONCERN ⚠️ | `GetServiceAsync` O(n) list scan instead of direct lookup | Extend `IServiceManager` with `GetAsync(Guid id)` using EF Core `SingleOrDefaultAsync` |
| NFR-6-2-002 | Security | CONCERN ⚠️ | `docs/openapi.json` includes test-only endpoints (not exposed in Production) | Add `x-internal` extension or re-export in Production mode post-v1 |
| NFR-6-2-003 | Reliability | CONCERN ⚠️ | `/health` changed from plain-text to JSON — silent breaking change for external monitoring | Document format change in `CHANGELOG.md`/`releases.yaml` before GA |
| NFR-6-2-004 | Reliability | CONCERN ⚠️ | `/api/services/import` spec documents 200 but handler returns 501 | Add `.Produces(501)` decorator and re-export `docs/openapi.json` |
| NFR-6-2-005 | Documentation | CONCERN ⚠️ | `FISHTANK_SERVICES_ROOT` and `FISHTANK_ACTIVITY_MAX_ENTRIES` in README are phantom vars (not bound in code) | Remove from README or implement the bindings |

**Blockers:** 0
**PASS:** 11 (Performance: 3, Security: 4, Reliability: 3, Maintainability: 3)
**CONCERNS:** 5 (all non-blocking, no P0/P1 issues)
**FAIL:** 0

---

## Gate-Ready Decision

```yaml
nfr_gate:
  story: 6-2-openapi-spec-and-management-api-parity-verification
  date: '2026-07-11'
  status: PASS
  blocker_count: 0
  concern_count: 5
  release_recommendation: CLEAR_FOR_RELEASE
  action_items:
    - id: NFR-6-2-001
      priority: P2
      description: "Replace GetServiceAsync O(n) scan with direct GetAsync(Guid id)"
    - id: NFR-6-2-002
      priority: P3
      description: "Annotate test-only endpoints in docs/openapi.json or re-export in Production mode"
    - id: NFR-6-2-003
      priority: P2
      description: "Document /health JSON format change in CHANGELOG.md before GA"
    - id: NFR-6-2-004
      priority: P2
      description: "Add .Produces(501) to import route and re-export docs/openapi.json"
    - id: NFR-6-2-005
      priority: P2
      description: "Remove phantom FISHTANK_SERVICES_ROOT and FISHTANK_ACTIVITY_MAX_ENTRIES from README"
  next_workflow: trace
```

---

## Evidence Inventory

| Artifact | Type | Status |
|----------|------|--------|
| `src/Fishtank.Api/Program.cs` | Source — MapOpenApi placement, env guards | ✅ Reviewed |
| `src/Fishtank.Api/Endpoints/ServicesEndpoints.cs` | Source — import handler, GetServiceAsync | ✅ Reviewed |
| `src/Fishtank.Api/Endpoints/TestEndpoints.cs` | Source — test-seed .RequireAuthorization() | ✅ Reviewed |
| `src/Fishtank.Api.IntegrationTests/OpenApi/OpenApiSpecTests.cs` | Tests — 12 AC tests | ✅ 12/12 PASS |
| `src/Fishtank.Api.IntegrationTests/Documentation/EnvVarDocumentationTests.cs` | Tests — FR-36 doc audit | ✅ PASS |
| `docs/openapi.json` | Committed spec — 41 paths, OpenAPI 3.1.1 | ✅ Present, valid |
| `.github/workflows/test.yml` | CI — parity check step | ✅ R-E6-003 mitigated |
| `README.md` | Documentation — env vars | ⚠️ Phantom vars present |
| Code review (pass 2) | Adversarial review — 0 blockers, 4 majors, 3 minors | ✅ Reviewed |
| Test review | Quality score 93/100 | ✅ Reviewed |
| Test run (2026-07-11) | `dotnet test` — OpenApiSpecTests + EnvVarDocumentation | ✅ 12/12 PASS |
