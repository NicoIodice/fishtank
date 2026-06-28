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

# Test Design for Architecture: Fishtank v1

**Purpose:** Architectural concerns, testability gaps, and NFR requirements for review. Serves as the contract between QA and Engineering on what must be addressed before test development begins.

**Date:** 2026-06-20
**Author:** Murat (Master Test Architect)
**Status:** Architecture Review Pending
**Project:** Fishtank
**PRD Reference:** `_bmad-output/planning-artifacts/prds/prd-Fishtank-2026-06-19/prd.md`
**Architecture Reference:** `_bmad-output/planning-artifacts/architecture.md`

---

## Executive Summary

**Scope:** Full-stack Docker-native WireMock management application. C# 13 / .NET 10 backend (Minimal APIs, EF Core, SignalR, WireMock.Net), React 18 / Vite / TypeScript frontend. 46 functional requirements, 21 NFRs across 6 epics.

**Architecture Key Decisions:**

- **Auth:** JWT in httpOnly cookie (no localStorage); all endpoints except `/health` + `/login` require auth
- **Mock engine:** WireMock.Net — N independent server instances per service, dynamic start/stop at runtime
- **Persistence:** EF Core + SQLite (in-memory for tests), Respawn for test DB reset
- **Real-time:** SignalR (activity log push, feature toggle broadcast, recording indicator)
- **Filesystem bridge:** FileSystemWatcher for external mapping change detection
- **Frontend state:** React Query (CRUD) + SignalR (push events); explicit invalidation map in `queryClient.ts`

**Expected Scale:** Single-container, single developer machine. Up to 100 services, ~10,000 activity log rows, <200 mapping files.

**Risk Summary:**

- **Total risks:** 9
- **High-priority (score ≥6):** 2 — require resolution before Epic 2 implementation
- **Medium-priority (score 3–5):** 5
- **Low-priority (score 1–2):** 2
- **Test effort:** ~53 tests (~33–59 hours, 1 developer wearing QA hat)

---

## Quick Guide

### 🚨 BLOCKERS — Must Resolve Before Epic 2 Implementation

**Pre-Implementation Critical Path** — These must be complete before integration tests of the engine layer can be written:

1. **R-001: WireMock.Net engine testability** — Define `IWireMockServerManager` interface in `Engine/` before Epic 2 stories begin. Without it, unit tests of engine orchestration require live WireMockServer instances and are unrunnable in isolation. _(Owner: Nico / Dev)_

2. **R-002: JWT httpOnly cookie in integration tests** — Build an `AuthTestHelper` that calls `/api/auth/login`, captures the `Set-Cookie` response header, and injects it into subsequent integration test requests. Without it, all protected-endpoint integration tests require a workaround or are untestable. _(Owner: Nico / Dev+QA)_

**What is needed:** Resolve both items in Epic 1 Story 1-2 (auth backend story) before any integration test for Stories 2-x is written.

---

### ⚠️ HIGH PRIORITY — Should Validate Before Epic 4 Implementation

1. **R-004: IFileWatcher abstraction** — `FileSystemWatcher` is not behind an interface in the current design. Resync conflict detection and external change detection become difficult to unit test without hitting a real filesystem. Define `IFileWatcher` in `Engine/` before Epic 4 stories. _(Owner: Nico / Dev)_

2. **R-003: SignalR assertion pattern** — Document and consistently apply the `TaskCompletionSource` await pattern for integration tests that assert on SignalR events. Race conditions in hub tests are the most common source of flakiness in this stack. _(Owner: Nico / Dev+QA)_

---

### 📋 INFO ONLY — Solutions Provided

1. **Test strategy:** Unit (xUnit) + Integration (xUnit + WebApplicationFactory + SQLite :memory: + Respawn) + Component (Vitest + RTL + msw) + E2E (Playwright)
2. **Tooling:** All tools already in architecture spec — xUnit, Respawn, FluentAssertions, Vitest, msw, Playwright
3. **Execution tiers:** PR (unit + integration + component), Nightly (Playwright E2E + WCAG), Weekly (Docker smoke, OPS)
4. **Coverage:** ~53 test scenarios, P0–P3, risk-based priorities
5. **Quality gates:** P0 100%, P1 ≥95%, coverage ≥80% service/engine + frontend features layers

---

## For Architects and Devs — Open Topics 👷

### Risk Assessment

**Total risks:** 9 (2 high-priority ≥6, 5 medium 3–5, 2 low 1–2)

#### High-Priority Risks (Score ≥6) — IMMEDIATE ATTENTION

| Risk ID   | Category | Description                                                                        | Prob | Impact | Score   | Mitigation                                                | Owner      | Timeline        |
|-----------|----------|------------------------------------------------------------------------------------|------|--------|---------|-----------------------------------------------------------|------------|-----------------|
| **R-001** | **TECH** | WireMock.Net engine layer has no interface boundary; unit tests require live server | 2    | 3      | **6**   | Define `IWireMockServerManager` in `Engine/` before E2     | Nico / Dev | Before Epic 2   |
| **R-002** | **TECH** | JWT httpOnly cookie not injectable in WebApplicationFactory integration tests      | 2    | 3      | **6**   | Build `AuthTestHelper` (login + Set-Cookie extraction) in E1 | Nico / Dev | Before Epic 1-2 |

#### Medium-Priority Risks (Score 3–5)

| Risk ID   | Category | Description                                                                     | Prob | Impact | Score | Mitigation                                                            | Owner      |
|-----------|----------|---------------------------------------------------------------------------------|------|--------|-------|-----------------------------------------------------------------------|------------|
| **R-003** | TECH     | SignalR hub assertions race conditions (event arrives before listener registered) | 2    | 2      | 4     | Establish `TaskCompletionSource` await pattern with 3s timeout as standard | Nico / Dev |
| **R-004** | TECH     | `FileSystemWatcher` has no interface; Resync/conflict unit tests hit real disk  | 2    | 2      | 4     | Wrap in `IFileWatcher` before Epic 4 stories                          | Nico / Dev |
| **R-005** | OPS      | WireMock port allocation (30100–30199) conflicts with parallel CI workers       | 2    | 2      | 4     | Use port 0 (OS-assigned) for test WireMock instances; override in test config | Nico / Dev |
| **R-006** | PERF     | NFR-4: 10,000-row activity log — no virtual scrolling library specified         | 2    | 2      | 4     | Validate virtual scroll choice before Epic 3 UI story; add Playwright perf gate | Nico / Dev |
| **R-007** | BUS      | WCAG 2.1 AA across 4 themes — manual spot-check insufficient                   | 2    | 2      | 4     | Axe-core via Playwright E2E, scoped per theme; scheduled post-Epic 4  | Nico / QA  |

#### Low-Priority Risks (Score 1–2)

| Risk ID   | Category | Description                                                                 | Prob | Impact | Score | Action  |
|-----------|----------|-----------------------------------------------------------------------------|------|--------|-------|---------|
| **R-008** | OPS      | Login rate-limit tests share global counter; tests can interfere each other | 1    | 2      | 2     | Configure rate limit in test environment to per-client IP scope |
| **R-009** | OPS      | Cross-platform Docker volume permission edge cases (Linux vs macOS vs Windows) | 1    | 2      | 2     | CI matrix in `docker-compose.test.yml` + Playwright smoke on all 3 platforms |

#### Risk Category Legend

- **TECH**: Technical/Architecture (design gaps, integration, scalability)
- **SEC**: Security (access controls, auth, data exposure)
- **PERF**: Performance (SLA violations, degradation)
- **DATA**: Data integrity (loss, corruption, inconsistency)
- **BUS**: Business impact (UX harm, logic errors)
- **OPS**: Operations (deployment, config, CI/CD)

---

### NFR Testability Requirements

| NFR Category    | Requirement / Threshold                                         | Architecture Support            | Gap / Decision Needed                                   | Planned Evidence                                                                  |
|-----------------|-----------------------------------------------------------------|---------------------------------|---------------------------------------------------------|-----------------------------------------------------------------------------------|
| Security        | JWT in httpOnly cookie only (NFR-16)                           | Supported (JwtBearer + cookie)  | Integration test cookie injection (R-002)               | Playwright assertion: `localStorage` has no token; cookie present in DevTools     |
| Security        | Auth required on all endpoints except /health + /login (NFR-8) | Supported (middleware)          | Systematic endpoint sweep automation needed             | Integration test: unauthenticated 401 sweep for all route groups                  |
| Security        | Sensitive header redaction at storage time (NFR-9)             | Supported (redaction constants) | Needs integration test with known sensitive headers      | Integration test: activity log row assertions on `[REDACTED]` values              |
| Security        | Login rate limiting (NFR-10)                                   | Supported (configurable)        | Test-env config must use per-client scope (R-008)       | Integration test: 429 + Retry-After header after threshold                        |
| Security        | CORS self-origin only (NFR-11)                                 | Supported (env var)             | None                                                    | Integration test: cross-origin request → CORS rejection                           |
| Performance     | UI initial load <2s (NFR-1)                                    | Supported (SPA in container)    | No CDN; measure with Playwright Lighthouse               | Playwright Lighthouse audit report (nightly)                                      |
| Performance     | Resync <1s for <200 files (NFR-2)                              | Supported (planned)             | No timing instrumentation yet                           | Integration test: `Stopwatch` around Resync API call with temp dir of 200 files   |
| Performance     | SignalR push <500ms (NFR-3)                                    | Supported (SignalR)             | Race condition risk in tests (R-003)                    | Integration test: `Stopwatch` from HTTP request to hub event receipt              |
| Performance     | 10k rows at 60fps (NFR-4)                                      | Partial (virtual scroll unspecified) | Must confirm virtual scrolling library before Epic 3 UI | Playwright `performance.measure()` FPS during 10k-row scroll (nightly)           |
| Performance     | /health <500ms (NFR-7)                                         | Supported (simple endpoint)     | None                                                    | Integration test: `Stopwatch` on GET /health                                      |
| Reliability     | Per-service fault isolation (NFR-5)                            | Supported (independent WireMock instances) | Requires testable interface (R-001)              | Integration test: kill service A's WireMock → service B and management API respond |
| Reliability     | Container start <10s (NFR-6)                                   | Supported (small image, SQLite) | Needs docker-compose smoke test timing                  | CI step: `docker-compose up --wait` with `time` measurement                       |
| Accessibility   | WCAG 2.1 AA all 4 themes (NFR-20)                              | Supported (CSS variable tokens) | 4 themes = 4 separate axe scans needed                 | Playwright + axe-core per theme, post-Epic 4 (PSG-2 gate)                         |
| Accessibility   | Keyboard navigation (NFR-19)                                   | Supported (shadcn/ui base)      | Custom components need manual verification              | Playwright keyboard-only E2E flows for primary workflows                           |
| Accessibility   | prefers-reduced-motion (NFR-21)                                | Supported (CSS media query)     | 8 animated elements to verify                           | Playwright: emulate `prefers-reduced-motion: reduce`, assert no CSS animations    |

**Unknown thresholds:** None — all NFR thresholds are explicitly specified in the PRD and architecture doc. No guessed values needed.

**Assessment boundary:** Final PASS/CONCERNS/FAIL status belongs in `bmad-testarch-nfr` after implementation evidence exists.

---

### Testability Concerns and Architectural Gaps

#### 1. Blockers to Fast Feedback

| Concern                                | Impact on Testing                                                               | What Architecture Must Provide                                                     | Owner | Timeline      |
|----------------------------------------|---------------------------------------------------------------------------------|------------------------------------------------------------------------------------|-------|---------------|
| **No WireMock engine interface (R-001)** | Engine-layer unit tests require a running `WireMockServer`; slow, port-hungry | `IWireMockServerManager` with `Start(port)`, `Stop()`, `GetStatus()`, `IsRunning` | Nico  | Before Epic 2 |
| **JWT cookie in tests (R-002)**        | Protected endpoint integration tests can't authenticate without cookie injection | `AuthTestHelper`: POST /api/auth/login → extract `Set-Cookie` → reuse on HttpClient | Nico  | Before Epic 1-2 |

#### 2. Architectural Improvements Needed

1. **`IFileWatcher` abstraction**
   - **Current problem:** `FileSystemWatcher` is a sealed BCL class; Resync and conflict-detection logic can't be unit-tested without real filesystem events.
   - **Required change:** Introduce `IFileWatcher` with `FileChanged`, `FileCreated`, `FileDeleted` events; inject in Resync service.
   - **Impact if not fixed:** Resync and conflict-detection tests hit temp directories on disk; slow and environment-sensitive.
   - **Owner:** Nico / Dev
   - **Timeline:** Before Epic 4 (Mappings stories)

2. **SignalR hub test pattern document**
   - **Current problem:** No documented pattern for awaiting hub events in integration tests; risk of flaky tests from race conditions.
   - **Required change:** Add a `HubTestHelper` with `TaskCompletionSource<T>` subscription pattern and 3s timeout to `Fishtank.Api.IntegrationTests`.
   - **Impact if not fixed:** SignalR integration tests pass/fail intermittently depending on thread scheduling.
   - **Owner:** Nico / Dev
   - **Timeline:** Before first SignalR integration test (Story 2-3)

---

### Testability Assessment Summary

#### What Works Well

- ✅ **WebApplicationFactory + SQLite :memory:** Excellent API testability; full app stack in-process with controlled DB state.
- ✅ **Respawn:** Clean DB isolation per test; no cross-test contamination.
- ✅ **msw (mandatory):** React Query hook testing is fully isolated from real network; seeded correctly in architecture.
- ✅ **FluentAssertions:** Human-readable assertion errors; significantly reduces debug time.
- ✅ **Response envelope:** Consistent `{ success, data/error }` structure makes automated API assertions predictable.
- ✅ **Error code constants:** Screaming-snake-case codes are assertion-friendly; no free-form string matching needed.
- ✅ **`apiFetch<T>()`:** Single fetch wrapper means authentication, error handling, and credential injection are testable in one place.
- ✅ **GUID primary keys:** No slug collisions in test data; stable entity identity in multi-step test flows.

#### Accepted Trade-offs

- **No staging environment** — Solo developer; local Docker + CI-matrix smoke tests are the full test surface. Acceptable for v1.
- **SQLite in-memory for all integration tests** — Exact production DB is SQLite-on-disk; behavior difference is minimal. Accepted.
- **No dedicated test data API** — Using Respawn + EF Core seeding directly; sufficient for this scale.

---

### Risk Mitigation Plans (High-Priority Risks ≥6)

#### R-001: WireMock.Net Engine Testability (Score: 6) — PRE-IMPLEMENTATION BLOCKER

**Mitigation Strategy:**

1. Define `IWireMockServerManager` interface in `src/Fishtank.Api/Engine/`:
   ```csharp
   public interface IWireMockServerManager
   {
       Task StartAsync(int port, string mappingsPath, CancellationToken ct = default);
       Task StopAsync(int port, CancellationToken ct = default);
       bool IsRunning(int port);
       Task<IEnumerable<ServiceStatus>> GetAllStatusesAsync();
   }
   ```
2. Implement `WireMockServerManager : IWireMockServerManager` backed by real WireMock.Net.
3. Register via DI: `builder.Services.AddSingleton<IWireMockServerManager, WireMockServerManager>();`
4. In tests: mock with `NSubstitute` or `Moq` for unit tests; use real implementation (test port range 31000+) for integration tests.

**Owner:** Nico / Dev
**Timeline:** Story 1-1 (project scaffold) or Story 2-1 (WireMock engine layer)
**Status:** Planned
**Verification:** Engine layer unit test suite runs in <10s without any WireMock ports allocated.

---

#### R-002: JWT httpOnly Cookie Integration Test Injection (Score: 6) — PRE-IMPLEMENTATION BLOCKER

**Mitigation Strategy:**

1. Create `AuthTestHelper` class in `Fishtank.Api.IntegrationTests/Helpers/`:
   ```csharp
   public static class AuthTestHelper
   {
       public static async Task<string> LoginAndGetCookieAsync(HttpClient client, string username, string password)
       {
           var res = await client.PostAsJsonAsync("/api/auth/login", new { username, password });
           res.EnsureSuccessStatusCode();
           return res.Headers.GetValues("Set-Cookie").First(); // Carries httpOnly JWT cookie
       }

       public static HttpClient WithAuthCookie(this HttpClient client, string cookie)
       {
           client.DefaultRequestHeaders.Add("Cookie", cookie);
           return client;
       }
   }
   ```
2. Use in every protected endpoint test: `await client.WithAuthCookie(await AuthTestHelper.LoginAndGetCookieAsync(client, "admin", "password"))...`
3. Create a `TestWebAppFactory` base class that seeds a default admin user via EF Core before each test class.

**Owner:** Nico / Dev
**Timeline:** Story 1-2 (auth backend story) — before any other endpoint integration tests
**Status:** Planned
**Verification:** Protected endpoint returns 200 with auth cookie; 401 without it — both verified in integration test suite.

---

### Assumptions and Dependencies

#### Assumptions

1. Solo developer (Nico) wears all hats (Dev, QA, PO); test effort estimates are for the same person.
2. SQLite in-memory behavior is sufficiently close to SQLite on-disk for all integration test purposes.
3. WireMock.Net port 0 (OS-assigned) is supported by the library for test instances. _Verify during Epic 1 spike._
4. Playwright is available in CI environment (GitHub Actions); `docker-compose.test.yml` provides the full stack for E2E.
5. `@vitest/coverage-v8` threshold enforcement is configured in `vitest.config.ts` as a CI gate.

#### Dependencies

1. `IWireMockServerManager` interface — required before Story 2-1 implementation
2. `AuthTestHelper` + seeded admin user in `TestWebAppFactory` — required before Story 1-2 integration tests
3. `IFileWatcher` interface — required before Story 4-1 implementation
4. Virtual scroll library selected and added — required before Story 3-2 UI implementation (NFR-4 gate)
5. Axe-core Playwright plugin (`@axe-core/playwright`) — required before WCAG E2E tests (post-Epic 4)

#### Risks to Plan

- **Risk:** WireMock.Net port 0 not supported → test instances require fixed ports → CI parallelization constrained.
  - **Contingency:** Reserve test-only port range 31000–31099; allocate sequentially in `TestWebAppFactory`.

---

**End of Architecture Document**

**Next Steps for Nico (Dev hat):**

1. Implement `IWireMockServerManager` interface in Story 1-1 or 2-1 scaffold.
2. Implement `AuthTestHelper` + `TestWebAppFactory` in Story 1-2.
3. Implement `IFileWatcher` before Epic 4 stories.
4. Confirm WireMock.Net port-0 support in Epic 1 spike.

**Next Steps for Nico (QA hat):**

1. Refer to companion doc `test-design-qa.md` for the full test coverage matrix.
2. Begin test infrastructure setup (factories, fixtures) alongside Epic 1.
3. Run `bmad-testarch-framework` next to scaffold Playwright + Vitest configuration.
