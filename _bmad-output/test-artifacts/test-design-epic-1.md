---
workflowStatus: 'complete'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-06-20'
epicScope: 'epic-1'
---

# Test Design: Epic 1 — Foundation: Authenticated Shell & Running Container

**Date:** 2026-06-20
**Author:** Nico
**Mode:** Epic-Level
**Status:** Draft

---

## Executive Summary

**Scope:** Epic 1 test design covering all 5 stories:
- `1-1` Project Scaffold, Docker Image & CI Pipeline
- `1-2` Database, Authentication Backend & First-Run Logic
- `1-3` React App Shell, Login & First-Run Setup Screens
- `1-4` Additional UI Themes (non-blocking)
- `1-5` Developer Support Tool — Docker/WSL (non-blocking)

**Risk Summary:**
- Total risks identified: 10
- High-priority risks (score ≥6): 4
- Critical categories: SEC (×3), TECH (×3)

**Coverage Summary:**
- P0 scenarios: 8 (16 hours)
- P1 scenarios: 10 (10 hours)
- P2 scenarios: 8 (4 hours)
- P3 scenarios: 5 (1.25 hours)
- **Total effort**: 31 tests, ~31.25 hours (~4 days)

---

## Not in Scope

| Item | Reasoning | Mitigation |
|------|-----------|------------|
| **Themes 2–4 full contrast audit** | UX-DR12 full WCAG 2.1 AA audit is a pre-ship gate (PSG-2), scheduled after Epic 4 | Spot-check contrast values in P2 tests; full audit tracked separately |
| **WireMock engine start/stop** | WireMock engine layer is Epic 2 scope | Epic 1 only verifies Docker container health and DB connectivity |
| **SignalR hub connections** | Hub connections wired in Epic 2 onwards | `queryClient.ts` and `signalr.ts` seam contracts established but not activated |
| **PSG-1 Custom SVG Logo** | Pre-ship gate — tracked separately, worked in parallel | `bi-droplet-half` placeholder used throughout Epic 1 development |
| **Epic 5 token invalidation** | `TokenVersion` column required by Epic 5 user deactivation; Epic 1 only verifies the column is present in migration | Epic 5 test design covers invalidation flow |

---

## Risk Assessment

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
|---------|----------|-------------|-------------|--------|-------|------------|-------|----------|
| R-001 | SEC | JWT cookie flags misconfigured — httpOnly, SameSite: Strict, Secure not correctly applied, exposing tokens to XSS or CSRF | 2 | 3 | 6 | Integration test asserts `Set-Cookie` response header flags on login. OWASP cookie checklist enforced in code review | Dev/QA | Story 1-2 |
| R-002 | SEC | First-run setup gate bypass — direct API calls (e.g. POST /api/auth/login) succeed before any admin account exists, allowing unauthorized access | 2 | 3 | 6 | API test hits protected endpoints on a fresh (no-user) instance and asserts redirect/block. First-run middleware tested before any user exists | Dev/QA | Story 1-2 |
| R-003 | TECH | Alpine multi-stage Docker build fails on macOS Apple Silicon or Windows due to SQLite native binary (libgcc/libstdc++ not installed via `apk add`) | 2 | 3 | 6 | CI smoke test runs Docker build on Linux, macOS, and Windows matrix. Dockerfile `apk add libgcc libstdc++` verified in PR gate | Dev | Story 1-1 |
| R-004 | SEC | Login rate limit bypassed via parallel requests, header manipulation, or missing per-IP tracking | 2 | 3 | 6 | Integration test fires requests exceeding the configured threshold in a tight loop and asserts HTTP 429 + `Retry-After` header | Dev/QA | Story 1-2 |

### Medium-Priority Risks (Score 3–4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
|---------|----------|-------------|-------------|--------|-------|------------|-------|
| R-005 | TECH | EF Core `MigrateAsync()` failure at startup not caught → container reports healthy but DB is inaccessible; all API calls fail silently | 2 | 2 | 4 | Integration test mounts DB path pointing to read-only directory; asserts container exits non-zero (or /health returns 503). Code review verifies try/catch + re-throw | Dev |
| R-006 | PERF | Container cold-start exceeds 10s (NFR-6) due to cumulative overhead: DB migration + static asset compilation + WireMock init | 2 | 2 | 4 | Time cold-start in CI smoke test (`docker run` → first 200 from /health). Alert if ≥8s (buffer before hard limit) | Dev |
| R-007 | TECH | React SPA routing broken: `MapFallbackToFile("index.html")` misconfigured → direct URL navigation (e.g. `/services`) returns 404 instead of React shell | 2 | 2 | 4 | E2E test navigates directly to non-root routes and asserts React shell renders (not 404) | Dev/QA |
| R-008 | DATA | `TokenVersion` integer column absent from Epic 1 initial migration → Epic 5 auth invalidation requires a retrofit migration, risking data loss | 1 | 3 | 3 | Integration test query verifies `TokenVersion` column exists in `Users` table after auto-migrate. Schema snapshot test in xUnit | Dev |

### Low-Priority Risks (Score 1–2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
|---------|----------|-------------|-------------|--------|-------|--------|
| R-009 | OPS | CI workflows fail on Windows runners due to path separator differences in Dockerfile `COPY` commands or npm build scripts | 2 | 1 | 2 | Monitor CI matrix results; fix on first failure |
| R-010 | TECH | `InternalsVisibleTo` missing from `Fishtank.Api.csproj` → integration test assembly cannot access internal types; discovered late | 1 | 2 | 2 | Code review checklist item; verified in first xUnit test build |

### Risk Category Legend

- **TECH**: Technical/Architecture (flaws, integration, scalability)
- **SEC**: Security (access controls, auth, data exposure)
- **PERF**: Performance (SLA violations, degradation, resource limits)
- **DATA**: Data Integrity (loss, corruption, inconsistency)
- **BUS**: Business Impact (UX harm, logic errors, revenue)
- **OPS**: Operations (deployment, config, monitoring)

---

## NFR Planning

| NFR | Requirement / Threshold | Risk Link | Planned Validation | Evidence Needed |
|-----|------------------------|-----------|-------------------|----------------|
| NFR-6 | Container starts and serves management UI within 10s on 4-core/8GB machine with Docker Desktop | R-006 | Time `docker run` → first 200 from /health in CI smoke test | CI smoke test timing log showing start time ≤10s |
| NFR-8 | All API endpoints (except /health and login) require valid JWT; unauthenticated → HTTP 401 | R-001, R-002 | Integration test: hit each endpoint group without cookie, assert 401 | xUnit integration test results |
| NFR-10 | Login rate-limited; threshold and window configurable via env vars; returns 429 + `Retry-After` | R-004 | Integration test: burst requests > threshold, assert 429 and header | xUnit integration test results |
| NFR-11 | CORS allows only SPA origin by default; additional origins via `FISHTANK_ALLOWED_ORIGINS` | — | API test: request from non-SPA origin → CORS headers blocked; env var → allowed | xUnit integration test results |
| NFR-12 | Container runs as non-root user `fishtank` | — | Docker smoke test: `docker run --rm {image} id` → asserts not root | CI smoke test log |
| NFR-16 | JWT stored in httpOnly cookie only; no localStorage | R-001 | Integration test: assert `Set-Cookie` has `HttpOnly` flag; Playwright check `localStorage` has no token | xUnit + Playwright test results |

**Unknown thresholds:**
- Rate limit default threshold and window values not specified in architecture docs — assume sensible defaults (e.g. 5 attempts per 60s) until `FISHTANK_RATE_LIMIT_*` env vars are documented in README.
- JWT expiry default not specified — architecture says "valid until container restart by default" (session cookie behavior), configurable via env var.

---

## Entry Criteria

- [ ] Story 1-1 `ready-for-dev` status confirmed in `sprint-status.yaml`
- [ ] Framework scaffold complete (`framework-setup-progress.md` step-05 ✅)
- [ ] Test environment: Docker Desktop available in CI and locally
- [ ] Playwright installed (`npx playwright install --with-deps`)
- [ ] xUnit projects built clean (`dotnet build src/Fishtank.slnx`)

## Exit Criteria

- [ ] All P0 tests passing (100%)
- [ ] All P1 tests passing (≥95%)
- [ ] R-001, R-002, R-003, R-004 (all high-priority risks) mitigated with passing tests
- [ ] No open SEC category risks unmitigated
- [ ] Container starts within 10s confirmed in CI smoke test (NFR-6)
- [ ] `TokenVersion` column verified in Users migration (R-008)
- [ ] Story acceptance criteria checked in story files for 1-1, 1-2, 1-3

---

## Test Coverage Plan

### P0 (Critical) — Run on every commit

**Criteria:** Blocks core journey + high risk (≥6) + no workaround

| Requirement | Scenario | Test Level | Risk Link | Owner |
|-------------|----------|------------|-----------|-------|
| FR-35 + R-003 | Docker image builds successfully (multi-stage Alpine, all platforms) | Integration (CI matrix) | R-003 | Dev |
| NFR-6 + R-003 | Container starts and /health returns 200 within 10s | Integration (Docker) | R-003, R-006 | Dev |
| FR-24 + R-001 | POST /api/auth/login with valid credentials → 200 + httpOnly JWT cookie (`HttpOnly; SameSite=Strict`) | API (xUnit) | R-001 | Dev/QA |
| FR-26 + R-002 | Fresh instance (no users): all routes redirect to first-run setup; direct API calls blocked | API (xUnit) | R-002 | Dev/QA |
| FR-25 + R-004 | Login rate limit: requests > threshold in window → HTTP 429 + `Retry-After` header | API (xUnit) | R-004 | Dev/QA |
| NFR-8 + R-001 | Protected endpoints without JWT cookie → HTTP 401 | API (xUnit) | R-001 | Dev/QA |
| FR-24 + R-001 | POST /api/auth/login with invalid credentials → HTTP 401, no cookie set | API (xUnit) | R-001 | Dev/QA |
| FR-37 + R-005 | DB auto-migrates at startup; `Users` table exists with all required columns including `TokenVersion` | Integration (xUnit) | R-005, R-008 | Dev |

**Total P0:** 8 tests, ~16 hours

### P1 (High) — Run on PR to main

**Criteria:** Important features + medium risk (3–4) + common workflows

| Requirement | Scenario | Test Level | Risk Link | Owner |
|-------------|----------|------------|-----------|-------|
| FR-26 | First-run setup: POST creates admin account, subsequent requests no longer redirect | API (xUnit) | R-002 | Dev/QA |
| FR-24 | POST /api/auth/logout clears JWT cookie (Set-Cookie: empty, Max-Age=0) | API (xUnit) | R-001 | Dev/QA |
| FR-38 + R-005 | /health returns HTTP 503 when DB is inaccessible (simulated via read-only DB path) | API (xUnit) | R-005 | Dev/QA |
| NFR-12 | Container process runs as non-root (`id` output not `root`) | Docker smoke (CI) | — | Dev |
| NFR-11 | CORS: request from non-SPA origin → CORS response headers block; `FISHTANK_ALLOWED_ORIGINS` env var → allowed | API (xUnit) | — | Dev/QA |
| FR-24 | Login screen renders with username/password fields and submit button | E2E (Playwright) | R-007 | QA |
| FR-26 | First-run setup screen renders for fresh (no-user) instance | E2E (Playwright) | R-002, R-007 | QA |
| UX-DR5 + UX-DR6 | App shell (top bar 44px, sidebar 200px/52px) renders at all 4 breakpoints (≥1024px, 768–1023px, 640–767px, <640px) | E2E (Playwright) | R-007 | QA |
| FR-37 + R-007 | SPA routing: direct navigation to `/services` and `/settings` loads React shell (not 404) | E2E (Playwright) | R-007 | QA |
| R-008 | `TokenVersion` column exists in `Users` table after auto-migrate (schema assertion) | Integration (xUnit) | R-008 | Dev |

**Total P1:** 10 tests, ~10 hours

### P2 (Medium) — Run nightly

**Criteria:** Secondary features + low risk (1–2) + edge cases

| Requirement | Scenario | Test Level | Risk Link | Owner |
|-------------|----------|------------|-----------|-------|
| UX-DR1 | Clean Light theme CSS variables applied to `<html>` element (`data-theme="clean-light"`) | E2E (Playwright) | — | QA |
| UX-DR15 | Bootstrap Icons library available (icon element renders, not broken glyph) | E2E (Playwright) | — | QA |
| UX-DR4 | Typography system applied: Inter font stack, monospace for port numbers | E2E (Playwright CSS check) | — | QA |
| UX-DR14 | z-index: sidebar (20) < top bar (30) < modal (70) (CSS computed values) | E2E (Playwright) | — | QA |
| UX-DR13 | `@media (prefers-reduced-motion)` CSS block present in stylesheet | Unit (Vitest CSS snapshot) | — | Dev |
| FR-27 | Default admin password via `FISHTANK_ADMIN_PASSWORD` env var allows login | API (xUnit) | — | Dev/QA |
| FR-36 | JWT expiry configurable via env var; token still valid within expiry window | API (xUnit) | — | Dev/QA |
| FR-39 | Structured JSON logs written to stdout on login success, login failure, and startup | Integration (xUnit log capture) | — | Dev |

**Total P2:** 8 tests, ~4 hours

### P3 (Low) — Run on-demand

**Criteria:** Non-blocking stories, exploratory, theme infrastructure for later epics

| Requirement | Scenario | Test Level | Owner |
|-------------|----------|------------|-------|
| UX-DR1 (stories 1-4) | Themes 2–4 CSS variable blocks present in stylesheet | E2E (Playwright CSS check) | QA |
| UX-DR2 | Theme selection persists in `localStorage`; reload applies stored theme | E2E (Playwright) | QA |
| UX-DR2 | `prefers-color-scheme: dark` maps to Deep Ocean on cold load (no localStorage entry) | E2E (Playwright) | QA |
| Arch | `queryClient.ts` exports `queryClient` + `HUB_INVALIDATION_MAP` structure defined | Unit (Vitest import check) | Dev |
| Arch | `signalr.ts` hub connection factory exported (unused, no actual connection) | Unit (Vitest import check) | Dev |

**Total P3:** 5 tests, ~1.25 hours

---

## Execution Order

### Smoke Tests (<3 min)
**Purpose:** Fast feedback, catch build-breaking issues

- [ ] Docker image builds (< 60s, CI matrix: Linux, macOS, Windows)
- [ ] `dotnet build src/Fishtank.slnx` — 0 errors, 0 warnings
- [ ] `npm run build` in `src/client` — 0 TypeScript errors

**Total:** 3 checks

### P0 Tests (<10 min)
**Purpose:** Critical path — security + infrastructure gates

- [ ] Container start + /health 200 within 10s (Docker)
- [ ] Login happy path: JWT cookie flags (xUnit API)
- [ ] Login sad path: 401 no cookie (xUnit API)
- [ ] First-run gate: all routes blocked (xUnit API)
- [ ] Rate limiting: 429 + Retry-After (xUnit API)
- [ ] Auth gate: protected endpoints → 401 (xUnit API)
- [ ] DB auto-migrate + TokenVersion column (xUnit integration)

**Total:** 7 scenarios + 1 Docker check

### P1 Tests (<30 min)
**Purpose:** Feature completeness + regression coverage

- [ ] First-run setup creates admin (xUnit API)
- [ ] Logout clears cookie (xUnit API)
- [ ] /health 503 on DB failure (xUnit API)
- [ ] Non-root container (Docker smoke)
- [ ] CORS enforcement (xUnit API)
- [ ] Login screen render (Playwright E2E)
- [ ] First-run screen render (Playwright E2E)
- [ ] App shell breakpoints ×4 (Playwright E2E)
- [ ] SPA routing direct navigation (Playwright E2E)
- [ ] TokenVersion schema assertion (xUnit integration)

**Total:** 10 scenarios

### P2/P3 Tests (<60 min)
**Purpose:** Theme infrastructure + NFR evidence + edge cases

- [ ] CSS theme variables (Playwright)
- [ ] Bootstrap Icons (Playwright)
- [ ] Typography + z-index (Playwright)
- [ ] prefers-reduced-motion (Vitest)
- [ ] Env var config tests (xUnit)
- [ ] Structured logging (xUnit)
- [ ] Themes 2–4 CSS blocks (Playwright)
- [ ] Theme persistence (Playwright)
- [ ] queryClient.ts + signalr.ts contracts (Vitest)

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Hours/Test | Total Hours | Notes |
|----------|-------|------------|-------------|-------|
| P0 | 8 | 2.0 | 16h | Complex setup (Docker, DB seeding, security) |
| P1 | 10 | 1.0 | 10h | Standard coverage, Playwright page objects |
| P2 | 8 | 0.5 | 4h | CSS assertions, env var parameterization |
| P3 | 5 | 0.25 | 1.25h | Simple import/contract checks |
| **Total** | **31** | — | **31.25h** | **~4 working days** |

### Prerequisites

**Test Data:**
- `UserFactory` (faker-based): username, password, role — auto-cleanup via Respawn after each xUnit test
- Docker clean container per test class (WebApplicationFactory + isolated SQLite in-memory or temp file)

**Tooling:**
- `Microsoft.AspNetCore.Mvc.Testing` WebApplicationFactory — xUnit integration tests
- Respawn — DB reset between integration tests
- FluentAssertions — readable assertion chains
- Playwright — E2E browser automation (Chromium, Firefox, WebKit)
- `@testing-library/react` + Vitest — component/unit tests

**Environment:**
- Docker Desktop available in CI and locally
- `.env.test` or xUnit environment variable injection for configurable thresholds
- `ASPNETCORE_ENVIRONMENT=Test` for WebApplicationFactory

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate:** 100% (no exceptions)
- **P1 pass rate:** ≥95% (waivers require written justification)
- **P2/P3 pass rate:** ≥90% (informational)
- **All SEC-category risks (R-001, R-002, R-004):** 100% mitigated with passing tests

### Coverage Targets

- **Auth critical paths:** ≥90%
- **Security scenarios (SEC category):** 100%
- **Infrastructure/startup flows:** ≥80%
- **UI shell and routing:** ≥70%
- **Theme infrastructure (CSS):** ≥50% (Themes 2–4 non-blocking)

### Non-Negotiable Requirements

- [ ] All P0 tests pass
- [ ] R-001 (JWT cookie flags) — passing integration test required before story 1-2 ships
- [ ] R-002 (first-run gate) — passing integration test required before story 1-2 ships
- [ ] R-003 (Docker build) — CI matrix (Linux + macOS + Windows) green
- [ ] R-004 (rate limiting) — passing integration test required before story 1-2 ships
- [ ] NFR-12 (non-root container) — Docker smoke check green
- [ ] NFR-6 (10s start) — CI timing log confirms ≤10s cold start
- [ ] `TokenVersion` column exists in Users migration

---

## Mitigation Plans

### R-001: JWT Cookie Misconfiguration (Score: 6)

**Mitigation Strategy:** Assert `Set-Cookie` response header in integration test on POST /api/auth/login. Verified flags: `HttpOnly`, `SameSite=Strict`, `Secure` (when behind TLS). Code review checklist includes OWASP cookie attribute review. JWT is NOT stored in localStorage (Playwright assertion on `localStorage.getItem` after login).
**Owner:** Dev
**Timeline:** Story 1-2 implementation
**Status:** Planned
**Verification:** xUnit test `POST_Login_Valid_Returns_HttpOnly_Cookie_WithCorrectFlags` + Playwright `localStorage` assertion

### R-002: First-Run Setup Gate Bypass (Score: 6)

**Mitigation Strategy:** Middleware applied globally (before routing) that redirects all traffic to `/setup` when `Users` table has 0 rows. Integration test hits `/api/auth/login`, `/api/services`, `/health` (exempt), and the setup endpoint on a fresh instance. `MapFallbackToFile` and hub connections must also be gated.
**Owner:** Dev
**Timeline:** Story 1-2 implementation
**Status:** Planned
**Verification:** xUnit test `FreshInstance_AllRoutes_Blocked_Except_Setup_And_Health`

### R-003: Alpine Docker Build Failure (Score: 6)

**Mitigation Strategy:** Dockerfile explicitly includes `apk add libgcc libstdc++` in runtime stage before `dotnet` binary invocation. CI matrix validates build and `docker run` on Linux (ubuntu-latest), macOS (macos-latest), and Windows (windows-latest). PR gate requires green matrix before merge.
**Owner:** Dev
**Timeline:** Story 1-1 implementation
**Status:** Planned
**Verification:** CI matrix job `docker-smoke-test` must pass on all 3 OS runners

### R-004: Login Rate Limit Bypass (Score: 6)

**Mitigation Strategy:** ASP.NET Core built-in rate limiter applied to `POST /api/auth/login` only. Rate limiter keyed on client IP (forwarded IP header handling documented). Integration test fires N+1 requests synchronously and asserts HTTP 429 on the overflow request, plus `Retry-After` header. Threshold configurable via env var (tested with low threshold in integration env).
**Owner:** Dev
**Timeline:** Story 1-2 implementation
**Status:** Planned
**Verification:** xUnit test `Login_RateLimit_ExceedsThreshold_Returns429_WithRetryAfterHeader`

---

## Test Scenario Details

### Story 1-1: Project Scaffold, Docker Image & CI Pipeline

| ID | Scenario | Level | Priority | Pass Criteria |
|----|----------|-------|----------|---------------|
| T-1-1-01 | Docker image builds (multi-stage Alpine) — CI matrix Linux/macOS/Windows | Docker/CI | P0 | Exit code 0; image size < threshold |
| T-1-1-02 | Container starts + /health returns 200 within 10s | Docker | P0 | Time delta from `docker run` → 200 ≤ 10s |
| T-1-1-03 | Non-root container: process runs as `fishtank` user | Docker | P1 | `id` output contains `fishtank`, not `root` |
| T-1-1-04 | CI workflow: build + unit tests green | CI | P2 | Workflow run green on push to `story/*` |

### Story 1-2: Database, Authentication Backend & First-Run Logic

| ID | Scenario | Level | Priority | Pass Criteria |
|----|----------|-------|----------|---------------|
| T-1-2-01 | Login with valid credentials → 200, httpOnly JWT cookie with correct flags | API (xUnit) | P0 | HTTP 200; `Set-Cookie` has `HttpOnly`, `SameSite=Strict` |
| T-1-2-02 | Login with invalid credentials → 401, no cookie | API (xUnit) | P0 | HTTP 401; no `Set-Cookie` header |
| T-1-2-03 | Rate limit: >threshold login attempts → 429 + Retry-After | API (xUnit) | P0 | HTTP 429; `Retry-After` header present |
| T-1-2-04 | Fresh instance: all non-exempt routes redirect to first-run setup | API (xUnit) | P0 | /api/auth/login, /api/services → redirect or 403; /health → 200 |
| T-1-2-05 | Protected endpoints without JWT → 401 | API (xUnit) | P0 | All non-public routes return HTTP 401 |
| T-1-2-06 | DB auto-migrate: Users table + TokenVersion column exists | Integration (xUnit) | P0 | Schema assertion via EF Core model |
| T-1-2-07 | First-run: POST creates admin account; subsequent requests no longer gated | API (xUnit) | P1 | 200 on setup POST; subsequent login succeeds |
| T-1-2-08 | Logout clears JWT cookie (Max-Age=0 or expires past) | API (xUnit) | P1 | `Set-Cookie` on logout has `Max-Age=0` or expired `Expires` |
| T-1-2-09 | /health returns 503 when DB path is read-only | API (xUnit) | P1 | HTTP 503 with structured JSON error body |
| T-1-2-10 | CORS: non-SPA origin blocked; FISHTANK_ALLOWED_ORIGINS env var opens additional origin | API (xUnit) | P1 | Response headers confirm CORS policy |
| T-1-2-11 | Default admin password via env var FISHTANK_ADMIN_PASSWORD | API (xUnit) | P2 | Login with env-configured password succeeds |
| T-1-2-12 | JWT expiry: token valid within window; expired after configured duration | API (xUnit) | P2 | Token accepted before expiry; 401 after |
| T-1-2-13 | Structured logs: JSON lines on stdout for login success, failure, startup | Integration (xUnit) | P2 | Log entries captured contain expected fields |
| T-1-2-14 | TokenVersion column schema assertion (separate detailed check) | Integration (xUnit) | P1 | Column type int, default 0, not nullable |

### Story 1-3: React App Shell, Login & First-Run Setup Screens

| ID | Scenario | Level | Priority | Pass Criteria |
|----|----------|-------|----------|---------------|
| T-1-3-01 | Login screen renders: username field, password field, submit button visible | E2E (Playwright) | P1 | All 3 elements visible with correct labels |
| T-1-3-02 | First-run setup screen renders for fresh (no-user) instance | E2E (Playwright) | P1 | Setup form visible; login route redirects to /setup |
| T-1-3-03 | App shell: top bar 44px, sidebar 200px at ≥1024px breakpoint | E2E (Playwright) | P1 | CSS computed heights/widths match spec |
| T-1-3-04 | App shell: sidebar collapsed to 52px at 768–1023px | E2E (Playwright) | P1 | Sidebar width = 52px in computed style |
| T-1-3-05 | App shell: sidebar hidden behind hamburger at <768px | E2E (Playwright) | P1 | Sidebar not visible without hamburger click |
| T-1-3-06 | SPA routing: direct navigation to /services renders React shell | E2E (Playwright) | P1 | Page title or nav item present; no 404 |
| T-1-3-07 | Clean Light theme CSS variables on `<html data-theme="clean-light">` | E2E (Playwright) | P2 | `--brand` CSS variable resolves to non-empty value |
| T-1-3-08 | Bootstrap Icons renders: `bi-server` icon visible in sidebar | E2E (Playwright) | P2 | Icon element has non-zero clientWidth |
| T-1-3-09 | Typography: Inter font applied to body; monospace for port number elements | E2E (Playwright) | P2 | `font-family` computed style contains `Inter` |
| T-1-3-10 | z-index: sidebar 20, top bar 30 (computed CSS) | E2E (Playwright) | P2 | getComputedStyle z-index assertions |
| T-1-3-11 | prefers-reduced-motion CSS block present in loaded stylesheets | Unit (Vitest) | P2 | CSS content snapshot includes @media (prefers-reduced-motion) |

### Story 1-4: Additional UI Themes (Non-Blocking)

| ID | Scenario | Level | Priority | Pass Criteria |
|----|----------|-------|----------|---------------|
| T-1-4-01 | All 4 theme CSS variable blocks present in stylesheet | E2E (Playwright) | P3 | `[data-theme="deep-ocean"]`, `[data-theme="emerald-terminal"]`, `[data-theme="ink-amber"]` blocks present |
| T-1-4-02 | Theme persists in localStorage after selection | E2E (Playwright) | P3 | `localStorage.getItem('theme')` matches selected theme after reload |
| T-1-4-03 | prefers-color-scheme: dark → Deep Ocean on cold load (no localStorage) | E2E (Playwright media) | P3 | `data-theme` attribute = `deep-ocean` when media `(prefers-color-scheme: dark)` emulated |

### Story 1-5: Developer Support Tool (Non-Blocking)

| ID | Scenario | Level | Priority | Pass Criteria |
|----|----------|-------|----------|---------------|
| T-1-5-01 | `queryClient.ts` exports `queryClient` and `HUB_INVALIDATION_MAP` | Unit (Vitest) | P3 | Named exports exist and HUB_INVALIDATION_MAP is an object |
| T-1-5-02 | `signalr.ts` exports hub connection factory function | Unit (Vitest) | P3 | Default or named export is a function |

---

## Assumptions and Dependencies

### Assumptions

1. Docker Desktop is available in CI (GitHub Actions) with Linux, macOS, and Windows runners.
2. `ASPNETCORE_ENVIRONMENT=Test` is used for WebApplicationFactory runs; SQLite in-memory or temp-file DB used in tests (not shared file).
3. Rate limit threshold defaults: 5 login attempts per 60-second window (configurable; tests use env var override for fast triggering).
4. CORS `FISHTANK_ALLOWED_ORIGINS` is comma-separated (follows common env var conventions).
5. The `bi-droplet-half` Bootstrap Icon placeholder is acceptable for all Epic 1 stories; PSG-1 tracked separately.

### Dependencies

1. **Framework scaffold complete** — `framework-setup-progress.md` with `step-05` present (✅ confirmed) — Required before any story begins
2. **Docker Desktop available in CI** — Required by story 1-1 CI smoke test
3. **`appsettings.Development.json`** already present in `Fishtank.Api/` — xUnit WebApplicationFactory inherits config
4. **Playwright installed** (`npx playwright install --with-deps`) — Required before E2E tests in stories 1-3/1-4 run
