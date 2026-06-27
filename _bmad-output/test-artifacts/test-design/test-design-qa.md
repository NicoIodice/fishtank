---
workflowStatus: 'complete'
totalSteps: 5
stepsCompleted:
  - step-01-detect-mode
  - step-02-load-context
  - step-03-risk-and-testability
  - step-04-coverage-plan
  - step-05-generate-output
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-06-20'
workflowType: 'testarch-test-design'
mode: 'system-level'
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-Fishtank-2026-06-19/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/epics.md
---

# Test Design for QA: Fishtank v1

**Purpose:** Test execution recipe. Defines what to test, how to test it, and what must be in place before each test tier can begin.

**Date:** 2026-06-20
**Author:** Murat (Master Test Architect)
**Status:** Draft — Ready for Implementation
**Project:** Fishtank

**Related:** See `test-design-architecture.md` for testability concerns and architectural blockers.

---

## Executive Summary

**Scope:** Full-stack Docker-native WireMock management app — all 46 FRs and 21 NFRs across 6 epics and one pre-ship gate.

**Risk Summary:**

- Total risks: 9 (2 high-priority score ≥6, 5 medium 3–5, 2 low 1–2)
- Critical categories: TECH (engine interface gaps), OPS (port allocation), PERF (virtual scroll, real-time latency)

**Coverage Summary:**

- P0 tests: ~16 (critical paths, security, core engine)
- P1 tests: ~17 (important features, real-time, filesystem, admin)
- P2 tests: ~14 (accessibility, performance, edge cases, OPS)
- P3 tests: ~6 (OpenAPI, k8s, demo image, exploratory)
- **Total: ~53 tests** (~33–59 hours for 1 developer wearing QA hat)

---

## Not in Scope

| Item                                         | Reasoning                                                    | Mitigation                                                       |
|----------------------------------------------|--------------------------------------------------------------|------------------------------------------------------------------|
| **WireMock.Net internal behavior**           | Third-party library; covered by WireMock.Net own test suite  | Pin specific minor version; review changelog on minor upgrade    |
| **SQLite engine correctness**                | BCL / third-party; not Fishtank's responsibility             | Use in-memory SQLite for isolation; trust EF Core integration    |
| **Docker Desktop / Docker engine itself**    | Platform-level concern                                       | Document supported versions in README                            |
| **TLS termination (reverse proxy)**          | v1 delegates TLS to reverse proxy; Fishtank serves plain HTTP | Document proxy requirement; not tested here                     |
| **Post-v1 Postgres migration**               | Explicitly deferred post-v1                                  | ORM/data layer must not foreclose Postgres — reviewed in arch    |
| **Service deletion UI**                      | No deletion in v1 (soft-delete schema only)                  | Soft-delete filter tested; UI action not present                 |

---

## Dependencies & Test Blockers

**CRITICAL:** Testing cannot proceed in the affected epic without these items.

### Backend/Dev Dependencies (Pre-Story)

| Dependency                       | Required By       | What It Enables                                                     |
|----------------------------------|-------------------|---------------------------------------------------------------------|
| `IWireMockServerManager` interface | Before Story 2-1 | Engine layer unit tests without live WireMock ports (R-001)        |
| `AuthTestHelper` + seeded admin in `TestWebAppFactory` | Before Story 1-2 | All protected-endpoint integration tests (R-002) |
| `IFileWatcher` abstraction       | Before Story 4-1  | Resync and conflict-detection unit tests without real filesystem (R-004) |
| `HubTestHelper` (SignalR `TaskCompletionSource` pattern) | Before Story 2-3 | Reliable SignalR event assertions in integration tests (R-003) |
| Virtual scroll library selected  | Before Story 3-2  | NFR-4 (10k rows at 60fps) can be validated in E2E                  |

### QA Infrastructure Setup (Alongside Epic 1)

1. **`TestWebAppFactory` base class** (IntegrationTests project)
   - Creates `WebApplicationFactory<Program>` with SQLite :memory:
   - Seeds default admin user (`admin` / configurable password) via EF Core before each test class
   - Exposes `CreateAuthenticatedClient()` method using `AuthTestHelper`
   - Calls `Respawn.ResetAsync()` in `IAsyncLifetime.DisposeAsync()`

2. **Vitest + msw setup** (client project)
   - `vitest.config.ts` with jsdom environment, coverage V8, threshold ≥80% for `src/features/` and `src/lib/`
   - `src/mocks/server.ts` — msw node server for unit/component tests
   - `src/mocks/handlers.ts` — shared handler base (per-test overrides via `server.use(...)`)

3. **Playwright config** (`playwright.config.ts` in project root)
   - Target: `http://localhost:5000` (or `docker-compose.test.yml` URL)
   - Projects: `chromium` (primary), `firefox`, `webkit` (smoke only)
   - Reporters: HTML + GitHub CI reporter
   - Axe plugin: `@axe-core/playwright` (for WCAG E2E tests)
   - Test tag convention: `@p0`, `@p1`, `@p2`, `@p3` in test names

---

## Risk Assessment

**Note:** Full risk details and mitigation plans in `test-design-architecture.md`. This section summarizes QA-relevant impact.

### High-Priority Risks (Score ≥6)

| Risk ID   | Category | Description                                                          | Score   | QA Test Coverage                                                                    |
|-----------|----------|----------------------------------------------------------------------|---------|------------------------------------------------------------------------------------|
| **R-001** | TECH     | No `IWireMockServerManager` interface; engine tests require live WireMock | **6** | P0-006 to P0-010: service CRUD, start/stop, fault isolation — need interface first |
| **R-002** | TECH     | JWT httpOnly cookie not injectable in WebApplicationFactory          | **6**   | P0-001 to P0-003 and all protected endpoint tests — blocked without `AuthTestHelper` |

### Medium/Low-Priority Risks

| Risk ID   | Category | Description                                              | Score | QA Test Coverage                                               |
|-----------|----------|----------------------------------------------------------|-------|----------------------------------------------------------------|
| **R-003** | TECH     | SignalR assertion race conditions                        | 4     | P1-001, P1-002, P1-009: use `HubTestHelper` with 3s timeout   |
| **R-004** | TECH     | `FileSystemWatcher` not behind interface                 | 4     | P1-005 to P1-008: use temp directories + `IFileWatcher` mock   |
| **R-005** | OPS      | WireMock port 30100+ collides in CI parallel runs        | 4     | Engine integration tests: use port 0 or test-only range 31000+ |
| **R-006** | PERF     | Virtual scroll library not yet chosen (NFR-4)            | 4     | P2-004: Playwright performance.measure FPS; add CI perf gate   |
| **R-007** | BUS      | WCAG 2.1 AA across 4 themes — manual spot-check insufficient | 4  | P2-001: axe-core Playwright scan per theme; post-Epic 4        |
| **R-008** | OPS      | Login rate-limit global counter shared across tests      | 2     | P0-014: configure per-client rate limit in test environment    |
| **R-009** | OPS      | Cross-platform Docker volume permission edge cases       | 2     | P2-011, P3-003: CI matrix smoke tests on Linux/macOS/Windows  |

---

## NFR Test Coverage Plan

| NFR Category    | Requirement / Threshold                         | Planned Validation                                                       | Tool / Level                          | Evidence Artifact                                        | Priority |
|-----------------|-------------------------------------------------|--------------------------------------------------------------------------|---------------------------------------|----------------------------------------------------------|----------|
| Security        | JWT in httpOnly cookie only (NFR-16)            | Playwright: assert `localStorage` has no token; assert cookie present    | E2E (Playwright)                      | Test result: P0-011                                      | P0       |
| Security        | All endpoints except /health + /login need auth (NFR-8) | Unauthenticated sweep: all route groups return 401              | Integration (xUnit)                   | Test result: P0-003                                      | P0       |
| Security        | Sensitive header redaction (NFR-9)              | POST request with `Authorization` header → activity log row shows `[REDACTED]` | Integration (xUnit)              | Test result: P2-010                                      | P2       |
| Security        | Login rate limiting (NFR-10)                    | POST /api/auth/login × (threshold+1) → 429 with Retry-After             | Integration (xUnit)                   | Test result: P0-014                                      | P0       |
| Security        | CORS self-origin only (NFR-11)                  | Integration test: cross-origin request → CORS rejection headers          | Integration (xUnit)                   | Test result: P2-009                                      | P2       |
| Performance     | UI initial load <2s (NFR-1)                     | Playwright Lighthouse audit on `/login` and `/services`                  | E2E (Playwright + Lighthouse)         | Lighthouse report in `test-artifacts/perf/` (nightly)    | P2       |
| Performance     | Resync <1s for <200 files (NFR-2)               | Seed 200 temp files; POST /api/resync; `Stopwatch` assertion             | Integration (xUnit)                   | Test result: P1-007                                      | P1       |
| Performance     | SignalR push <500ms (NFR-3)                     | `Stopwatch` from HTTP request receipt to hub event arrival (integration) | Integration (xUnit + HubTestHelper)   | Test result: P1-001                                      | P1       |
| Performance     | 10k rows at 60fps scroll (NFR-4)                | Playwright `page.evaluate(() => performance.measure(...))` during scroll  | E2E (Playwright)                      | Performance trace in `test-artifacts/perf/` (nightly)    | P2       |
| Performance     | /health <500ms (NFR-7)                          | Integration test: `Stopwatch` on GET /health                             | Integration (xUnit)                   | Test result: P1-011                                      | P1       |
| Reliability     | Per-service fault isolation (NFR-5)             | Kill service A's WireMock → POST to service B and GET /services both succeed | Integration (xUnit)               | Test result: P0-010                                      | P0       |
| Reliability     | Container start <10s (NFR-6)                    | `docker-compose up --wait`; assert readiness within 10s                  | OPS (CI step)                         | CI step timing log                                       | P2       |
| Accessibility   | WCAG 2.1 AA all 4 themes (NFR-20)               | Axe-core Playwright scan on each theme's `/services` + `/activity` pages | E2E (Playwright + @axe-core/playwright) | Axe report per theme (post-Epic 4, PSG-2 gate)         | P2       |
| Accessibility   | Keyboard navigation (NFR-19)                    | Playwright: Tab through primary workflows; assert focus order + aria labels | E2E (Playwright)                    | Test result: P2-002                                      | P2       |
| Accessibility   | prefers-reduced-motion (NFR-21)                 | Playwright: emulate `prefers-reduced-motion: reduce`; assert no animation CSS | E2E (Playwright)                  | Test result: P2-003                                      | P2       |

**Missing thresholds:** None. All NFR thresholds are explicitly stated in PRD and architecture doc.

---

## Entry Criteria

**Testing for each epic cannot begin until ALL of the following are met:**

- [ ] `TestWebAppFactory` base class implemented and seeding admin user
- [ ] `AuthTestHelper` implemented and validated (POST /api/auth/login round-trip)
- [ ] `IWireMockServerManager` interface defined (before Epic 2)
- [ ] `IFileWatcher` interface defined (before Epic 4)
- [ ] `HubTestHelper` pattern documented and implemented (before first SignalR story)
- [ ] Vitest + msw setup complete (before first frontend component story)
- [ ] Playwright baseline config established (before first E2E test)
- [ ] Feature deployed to local/CI environment for the test target story

## Exit Criteria

**Test phase complete for a story when ALL of the following are met:**

- [ ] All P0 tests for the story passing
- [ ] All P1 tests for the story passing (or failures triaged and accepted)
- [ ] No open P0/P1 bugs without approved workaround
- [ ] Vitest coverage ≥80% for touched `src/features/` modules
- [ ] xUnit coverage ≥80% for touched service/engine layer

---

## Project Team

| Name    | Role              | Testing Responsibilities                                             |
|---------|-------------------|----------------------------------------------------------------------|
| **Nico** | Dev + QA + PO   | All unit, integration, component, and E2E test authoring and execution |

---

## Test Coverage Plan

> **Note:** P0/P1/P2/P3 = **priority and risk level** (what to focus on when time-constrained). See "Execution Strategy" for _when_ each tier runs.

---

### P0 — Critical

**Criteria:** Blocks core functionality + high risk (≥6) + no workaround + affects majority of users

| Test ID    | Requirement                                                      | Test Level                    | Risk Link | Notes                                                               |
|------------|------------------------------------------------------------------|-------------------------------|-----------|---------------------------------------------------------------------|
| **P0-001** | POST /api/auth/login valid credentials → 200, httpOnly cookie   | Integration (xUnit)           | R-002     | Requires `AuthTestHelper`; validate `Set-Cookie` header present     |
| **P0-002** | POST /api/auth/login invalid credentials → 401                   | Integration (xUnit)           | R-002     | —                                                                   |
| **P0-003** | All protected route groups → 401 without auth cookie            | Integration (xUnit)           | R-002     | Sweep: `/api/services`, `/api/activity`, `/api/mappings`, `/api/admin` |
| **P0-004** | No users in DB → GET / redirects to first-run setup screen      | Integration (xUnit) + E2E     | —         | Must happen before any other auth test; teardown cleans users       |
| **P0-005** | First-run creates admin account → subsequent login succeeds     | Integration (xUnit)           | —         | Validates FR-26 and FR-27 setup flow                                |
| **P0-006** | POST /api/services → service created, WireMock starts on port   | Integration (xUnit)           | R-001     | Requires `IWireMockServerManager`; verify `IsRunning(port)` true    |
| **P0-007** | PUT /api/services/{id}/stop → WireMock stops; `IsRunning` false | Integration (xUnit)           | R-001     | Verify service status updated in DB                                 |
| **P0-008** | PUT /api/services/{id}/start → WireMock restarts; `IsRunning` true | Integration (xUnit)        | R-001     | Verify optimistic UI path: status pill updates after confirmation   |
| **P0-009** | Port conflict on start → System Event written, service Stopped  | Integration (xUnit)           | R-001     | Start two services on same port; verify System Event + DB status    |
| **P0-010** | Service A WireMock crash → service B and `/services` unaffected | Integration (xUnit)           | R-001     | Fault isolation (NFR-5); kill WireMock via `IWireMockServerManager` |
| **P0-011** | JWT token NOT in `localStorage`; httpOnly cookie present        | E2E (Playwright)              | R-002     | After login: `localStorage.getItem('token')` null; cookie in request |
| **P0-012** | GET /health → 200 with all services running                     | Integration (xUnit)           | —         | Validates FR-38                                                     |
| **P0-013** | GET /health → 503 when DB inaccessible                          | Integration (xUnit)           | —         | Simulate with bad connection string in `TestWebAppFactory`          |
| **P0-014** | Login rate limit → 429 + Retry-After after threshold            | Integration (xUnit)           | R-008     | Configure per-client rate limit in test env (NFR-10)                |
| **P0-015** | `apiFetch<T>()` throws `ApiError` on `success: false` response  | Unit (Vitest)                 | —         | Mock msw handler returning `{ success: false, error: {...} }`       |
| **P0-016** | Response envelope on all API endpoints (sample sweep)           | Integration (xUnit)           | —         | Spot-check /api/services, /api/activity, /api/mappings responses    |

**Total P0: ~16 tests**

---

### P1 — High

**Criteria:** Important features + medium risk (3–4) + common workflows + workaround exists but difficult

| Test ID    | Requirement                                                                  | Test Level                           | Risk Link | Notes                                                                    |
|------------|------------------------------------------------------------------------------|--------------------------------------|-----------|--------------------------------------------------------------------------|
| **P1-001** | HTTP request to WireMock → activity log row appears within 500ms            | Integration (xUnit + HubTestHelper)  | R-003     | `Stopwatch` from HTTP dispatch to hub event; assert ≤500ms (NFR-3)      |
| **P1-002** | SignalR ActivityHub → client receives new row event                          | Integration (xUnit + HubTestHelper)  | R-003     | `TaskCompletionSource` await; max 3s timeout before fail                 |
| **P1-003** | Filter activity log: by service, by type, by search query                   | Integration (xUnit)                  | —         | AND logic across filter types (FR-8)                                     |
| **P1-004** | Clear all activity log rows → 0 rows returned; proxy counter resets          | Integration (xUnit)                  | —         | FR-13                                                                    |
| **P1-005** | Save as Mock → Mapping + Response files written to temp dir filesystem      | Integration (xUnit)                  | R-004     | Use temp directory; assert file contents match WireMock format           |
| **P1-006** | Mappings CRUD: create/edit/rename/duplicate/delete                          | Integration (xUnit)                  | R-004     | Temp directory; verify file content and System Events on failure         |
| **P1-007** | Resync completes in <1s for 200 pre-seeded temp files (NFR-2)               | Integration (xUnit)                  | R-004     | `Stopwatch` assertion; assert all files visible in folder tree response  |
| **P1-008** | External file change while Mapping open → conflict detection triggered      | Integration (xUnit)                  | R-004     | Requires `IFileWatcher` mock to fire event; assert conflict signal       |
| **P1-009** | Feature toggle disabled → SignalR broadcast to all connected clients        | Integration (xUnit + HubTestHelper)  | R-003     | Toggle via Admin API; assert `FeatureToggleChanged` event received       |
| **P1-010** | Admin creates user → user can login; Admin deactivates user → JWT invalid   | Integration (xUnit)                  | —         | FR-31; deactivation: subsequent request with old cookie → 401            |
| **P1-011** | GET /health responds in <500ms (NFR-7)                                       | Integration (xUnit)                  | —         | `Stopwatch` assertion                                                    |
| **P1-012** | Services card grid and table view render with mock data                     | Component (Vitest + RTL + msw)       | —         | msw handler returns 3 services; assert card count and table rows         |
| **P1-013** | Service toggle optimistic UI → reverts on server failure                    | Component (Vitest + RTL + msw)       | —         | msw handler returns 500; assert pill reverts to original state           |
| **P1-014** | Navigate away with unsaved Mapping edits → confirmation dialog shown        | E2E (Playwright)                     | —         | FR-21; assert dialog; cancel keeps edits; confirm navigates away         |
| **P1-015** | Record mode → proxied request auto-creates Mapping + Response on disk       | Integration (xUnit)                  | R-004     | Enable record mode via API; fire proxied request; assert files created   |
| **P1-016** | System Events screen → engine port conflict event surfaces                  | Integration (xUnit)                  | —         | Trigger port conflict; GET /api/events; assert event in response         |
| **P1-017** | Notification bell badge count reflects unread warnings/errors               | Component (Vitest + RTL + msw)       | —         | msw returns 3 unread warnings; assert badge = "3"; mark-all-read → 0    |

**Total P1: ~17 tests**

---

### P2 — Medium

**Criteria:** Secondary features + low risk (1–2) + edge cases + regression prevention

| Test ID    | Requirement                                                                   | Test Level                               | Risk Link | Notes                                                                  |
|------------|-------------------------------------------------------------------------------|------------------------------------------|-----------|------------------------------------------------------------------------|
| **P2-001** | WCAG 2.1 AA scan across all 4 themes (NFR-20)                                | E2E (Playwright + @axe-core/playwright)  | R-007     | One axe scan per theme on `/services` + `/activity`; PSG-2 gate       |
| **P2-002** | Keyboard-only navigation through primary workflows                            | E2E (Playwright)                         | —         | Tab through: login → services → add service → activity; assert focus   |
| **P2-003** | `prefers-reduced-motion` → all 8 animated elements show no CSS animation     | E2E (Playwright)                         | —         | Emulate media query; assert `animation-duration: 0` on each element   |
| **P2-004** | 10,000 activity log rows — scroll at 60fps (NFR-4)                           | E2E (Playwright)                         | R-006     | Seed 10k rows via API; measure FPS during virtualized scroll           |
| **P2-005** | UI initial load <2s on `/services` (NFR-1)                                   | E2E (Playwright + Lighthouse)            | —         | Lighthouse performance audit; assert LCP ≤2s                          |
| **P2-006** | Notification panel: mark-as-read, dismiss, mark-all-read, load-more         | Component (Vitest + RTL + msw)           | —         | FR-23; assert badge count updates after each action                    |
| **P2-007** | Seed file import → additive; existing slugs skipped; conflicts → System Event | Integration (xUnit)                     | —         | FR-5; POST /api/admin/seed with partial-overlap file                   |
| **P2-008** | Audit trail → user actions recorded with correct user/timestamp              | Integration (xUnit)                      | —         | FR-33; create service as user A; GET /api/admin/audit; assert entry    |
| **P2-009** | CORS policy blocks foreign origin (NFR-11)                                   | Integration (xUnit)                      | —         | Request with `Origin: http://evil.com` → CORS headers absent          |
| **P2-010** | Sensitive header redaction: `Authorization` → `[REDACTED]` in activity log  | Integration (xUnit)                      | —         | NFR-9; proxied request with `Authorization: Bearer xyz`; assert stored value |
| **P2-011** | Container starts and serves management UI within 10s (NFR-6)                | OPS (CI `docker-compose up --wait`)      | R-009     | Measure `docker-compose up` wall time; assert ≤10s                    |
| **P2-012** | Container runs as non-root user (NFR-12)                                     | OPS (`docker inspect`)                   | —         | `docker inspect --format '{{.Config.User}}'`; assert non-empty/non-root |
| **P2-013** | Row detail: all three display styles (modal/drawer/panel) render correctly   | Component (Vitest + RTL + msw)           | —         | FR-9; simulate preference setting; assert correct component mounts     |
| **P2-014** | Activity log row count per service capped at configured maximum              | Integration (xUnit)                      | —         | Seed N+1 rows; assert row count = cap; assert oldest row dropped       |

**Total P2: ~14 tests**

---

### P3 — Low

**Criteria:** Nice-to-have + exploratory + OPS validation + distribution checks

| Test ID    | Requirement                                                     | Test Level                    | Notes                                                             |
|------------|-----------------------------------------------------------------|-------------------------------|-------------------------------------------------------------------|
| **P3-001** | GET /openapi/v1.json → valid parseable OpenAPI JSON             | Integration (xUnit)           | FR-44; assert response is valid JSON with `openapi` key present   |
| **P3-002** | POST /admin/reset without API key → 403; with key → 200        | Integration (xUnit)           | FR-45, NFR-14                                                     |
| **P3-003** | Docker smoke tests on Linux, macOS (Apple Silicon), Windows     | OPS (CI matrix)               | `docker-compose.test.yml` + Playwright login smoke on each runner |
| **P3-004** | k8s `deployment.yaml` valid manifest; deploys to cluster        | OPS (kubectl dry-run)         | FR-41; `kubectl apply --dry-run=client`                           |
| **P3-005** | `fishtank-demo` image: zero-config docker run + browser access  | OPS (docker run smoke)        | FR-42; assert `/services` loads with pre-seeded data              |
| **P3-006** | Soft-delete filter: services with `DeletedAt IS NOT NULL` hidden | Integration (xUnit)          | Architecture constraint; set `DeletedAt` directly via EF Core; assert excluded from GET /api/services |

**Total P3: ~6 tests**

---

## Execution Strategy

**Philosophy:** Maximize fast feedback. All unit and integration tests run on every PR. E2E is nightly (or triggered on milestone merges). OPS/smoke tests run on release.

### Every PR: Unit + Integration + Component (~5–10 min total)

**Runs in CI on every pull request to `main`:**

- `dotnet test src/Fishtank.Api.UnitTests` — pure logic, no I/O (~<1 min)
- `dotnet test src/Fishtank.Api.IntegrationTests` — WebApplicationFactory + SQLite :memory: (~2–4 min)
- `npm run test -- --coverage` in `src/client/` — Vitest + RTL + msw (~<1 min)

**Includes:** All P0 functional tests, all P1 integration and component tests.
**Coverage gates:** Vitest ≥80% for `src/features/` and `src/lib/`; xUnit ≥80% for `Services/` and `Engine/`.

---

### Nightly: Playwright E2E (~15–30 min)

**Runs nightly on `main` (or on milestone merge):**

- Full Playwright suite against `docker-compose.test.yml` stack
- Includes: P0-011 (JWT cookie), P1-014 (navigation guard), P2-001 (WCAG), P2-002 (keyboard nav), P2-003 (reduced motion), P2-004 (10k rows FPS), P2-005 (Lighthouse)
- Browser matrix: Chromium (full), Firefox (P0/P1 only), WebKit (smoke only)

---

### Pre-Release / Milestone: OPS Smoke Tests

**Runs before release tag is cut:**

- `docker-compose.test.yml` on Linux CI runner — `time docker-compose up --wait` (P2-011)
- `docker inspect` non-root assertion (P2-012)
- Cross-platform matrix (P3-003): GitHub Actions runners — `ubuntu-latest`, `macos-14`, `windows-latest`
- `kubectl apply --dry-run=client -f deployment.yaml` (P3-004)
- `fishtank-demo` smoke run (P3-005)

---

### Manual (Not Automated in v1)

- Visual review of all 4 themes (supplement axe scan)
- First-run experience on fresh Docker volume (FR-26)
- README and CONTRIBUTING.md walkthrough (OSS contributor readiness)

---

## QA Effort Estimate

**Solo developer (Nico) wearing QA hat — includes test design, implementation, debugging, CI wiring.**

| Priority  | Count | Effort Range      | Notes                                                               |
|-----------|-------|-------------------|---------------------------------------------------------------------|
| P0        | ~16   | ~12–18 hours      | Complex setup: `AuthTestHelper`, `TestWebAppFactory`, engine interface wiring |
| P1        | ~17   | ~12–20 hours      | Standard integration + component coverage; SignalR async patterns   |
| P2        | ~14   | ~10–18 hours      | WCAG tooling setup, Playwright perf measurement, OPS scripts        |
| P3        | ~6    | ~3–6 hours        | Smoke, OpenAPI check, k8s dry-run                                   |
| **Total** | ~53   | **~37–62 hours**  | **~1–1.5 weeks alongside implementation**                           |

**Assumptions:**
- Test infrastructure (factories, fixtures, Playwright config) built once in Epic 1; reused across all epics.
- ~10% ongoing maintenance effort not included.
- No separate QA environment; tests run against local Docker or CI.

---

## Implementation Planning Handoff

**Recommended order for test authoring alongside Epic implementation:**

| Epic          | Required Test Infrastructure                                     | Estimated Test Authoring           |
|---------------|------------------------------------------------------------------|------------------------------------|
| Epic 1 (Foundation) | `TestWebAppFactory`, `AuthTestHelper`, Vitest + msw setup, Playwright baseline | P0-001 to P0-005, P0-011 to P0-016 |
| Epic 2 (Services) | `IWireMockServerManager` interface, `HubTestHelper`          | P0-006 to P0-010, P1-001, P1-002, P1-009, P1-012, P1-013 |
| Epic 3 (Activity) | Seed utility for 10k rows, Playwright perf setup             | P1-003, P1-004, P2-004, P2-005     |
| Epic 4 (Mappings) | `IFileWatcher` abstraction, temp dir fixtures                | P1-005 to P1-008, P1-015           |
| Epic 5 (Admin) | User management seed helpers                                  | P1-010, P1-016, P1-017, P2-006 to P2-010 |
| Epic 6 (Release) | Docker CI matrix, k8s dry-run step                           | P2-011, P2-012, P3-001 to P3-006   |
| Post-Epic 4   | Axe-core Playwright setup                                        | P2-001 (PSG-2 gate), P2-002, P2-003 |
