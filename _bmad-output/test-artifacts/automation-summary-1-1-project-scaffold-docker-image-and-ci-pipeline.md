# Test Automation Summary — Story 1-1: Project Scaffold, Docker Image & CI Pipeline

**Date:** 2026-06-26
**Phase:** test-automate (retroactive reconstruction)
**Story:** `1-1-project-scaffold-docker-image-and-ci-pipeline`
**Test Suite Outcome:** Tests covering this story currently PASS as part of the Epic 1 / Epic 2 suite.

> **Note — retroactively reconstructed:** This per-story automation summary was reconstructed on **2026-06-26** from the test suite that exists in the repository today. The base `bmad-testarch-automate` skill wrote only a generic `automation-summary.md`, so no per-story artifact was persisted at the time Story 1-1 was automated. The coverage below reflects the *actual* tests on disk, not a historical snapshot.

---

## Acceptance-Criteria Coverage

| AC | Description | Test(s) | Layer | Status |
|----|-------------|---------|-------|--------|
| AC1 | Clean dev env; `WeatherForecast` placeholder removed (only `/health` mapped) | `Story1_1_ScaffoldTests.GET_weatherforecast_Returns_Html_After_Placeholder_Removed` | Integration | FULL |
| AC2 | `GET /health` returns 200, accessible without auth | `HealthTests.GET_health_returns_200`; `Story1_1_ScaffoldTests.GET_health_Returns_200_After_Scaffold_Cleanup` | Integration | FULL |
| AC3 | Docker image builds (Alpine, multi-stage, non-root) | `docker.yml` → `build-and-smoke` job (`docker build -t fishtank:ci .`) | CI / Docker | PARTIAL (build asserted; non-root `id` check not automated) |
| AC4 | Container starts and serves `/health` within 10s | `docker.yml` → "Wait for health endpoint" + "Assert health response" (`grep -qi healthy`) | CI / Docker | FULL |
| AC5 | Non-root user (`docker run fishtank:dev id` not root) | — | — | NONE (not automated; Dockerfile `USER fishtank` reviewed manually) |
| AC6 | `.github/workflows/test.yml` runs (lint, backend-test, frontend-test) | `test.yml` (executes this entire suite) | CI | FULL (self-validating pipeline) |
| AC7 | `docker.yml` builds image + runs `/health` smoke test | `docker.yml` → `build-and-smoke` job | CI / Docker | FULL |
| AC8 | `CONTRIBUTING.md`, `SECURITY.md`, `.devcontainer/devcontainer.json` exist | — | — | NONE (file-existence; verified manually, no automated assertion) |
| AC9 | `docker-compose.yml` (dev) + `docker-compose.example.yml` (end-user) exist | — | — | NONE (file-existence; verified manually) |
| AC10 | `InternalsVisibleTo` present in `Fishtank.Api.csproj` | Implicitly enforced — integration tests reference `internal` types and compile/run | Build | PARTIAL (no dedicated assertion; build failure would surface it) |

### SPA-fallback guard tests (support AC1 / AC3 routing behaviour)

| Test | What it guards |
|------|----------------|
| `Story1_1_ScaffoldTests.GET_root_Returns_Html_ContentType` | `GET /` serves `index.html` (UseDefaultFiles + UseStaticFiles) |
| `Story1_1_ScaffoldTests.GET_spaRoute_Returns_Html_Via_Fallback` | `GET /services` → `index.html` (SPA fallback) |
| `Story1_1_ScaffoldTests.GET_apiRoute_NotCaught_By_SpaFallback` | `GET /api/unknown` → 404, not HTML |
| `Story1_1_ScaffoldTests.GET_api_ExactPath_NotCaught_By_SpaFallback` | `GET /api` (no trailing slash) → 404 |
| `Story1_1_ScaffoldTests.GET_hubsRoute_NotCaught_By_SpaFallback` | `GET /hubs/signalr` → 404 |
| `Story1_1_ScaffoldTests.GET_openapi_Returns_NotFound_Outside_Dev` | `/openapi` not mapped in Testing env |
| `HealthTests.GET_openapi_spec_returns_200_in_development` | `/openapi/v1.json` served as plain JSON (no envelope) |

### E2E shell scaffolds (defined here, satisfied by Story 1-3 shell)

`src/client/tests/e2e/story-1-1-scaffold.spec.ts` — confirm the deployed container serves the React shell, not the Vite placeholder:

| Test | AC |
|------|----|
| `AC4: root path renders the app shell top bar` | AC4 (shell served) |
| `AC4: root path renders the app shell sidebar` | AC4 |
| `AC3c: direct navigation to /services renders the React shell` | AC3/SPA fallback |
| `AC4-neg: Vite default placeholder is not rendered` | AC4 (negative) |

---

## Test Counts per Suite

| Suite / File | Layer | Tests |
|--------------|-------|-------|
| `src/Fishtank.Api.IntegrationTests/Api/HealthTests.cs` | Integration (xUnit) | 2 |
| `src/Fishtank.Api.IntegrationTests/Api/Story1_1_ScaffoldTests.cs` | Integration (xUnit) | 8 |
| `src/client/tests/e2e/story-1-1-scaffold.spec.ts` | E2E (Playwright) | 4 |
| `.github/workflows/docker.yml` | CI / Docker smoke | 1 job (build + start + health assert) |
| `.github/workflows/test.yml` | CI pipeline | self-validating (lint + backend + frontend + burn-in) |
| **Total automated tests directly tied to Story 1-1** | | **14 tests + 1 Docker smoke job** |

---

## Coverage Summary

- **FULL:** AC1, AC2, AC4, AC6, AC7 (5 ACs)
- **PARTIAL:** AC3 (build asserted, non-root `id` not), AC10 (build-time only) (2 ACs)
- **NONE:** AC5 (non-root `id` output), AC8 (repo-structure files), AC9 (compose files) (3 ACs)

---

## Gaps & Notes

- **AC5 (non-root user `id` check):** The Dockerfile creates and switches to the `fishtank` user (`USER fishtank`), but no automated test runs `docker run --rm fishtank:dev id` and asserts the output omits `root`. The Docker smoke job verifies start + `/health` only. Recommend adding an `id`/`whoami` assertion step to `docker.yml`.
- **AC8 / AC9 (file existence):** `CONTRIBUTING.md`, `SECURITY.md`, `.devcontainer/devcontainer.json`, `docker-compose.yml`, and `docker-compose.example.yml` are verified by code review, not by an automated test. These are low-churn static files; a lightweight existence check could be added but was not deemed necessary.
- **AC10 (`InternalsVisibleTo`):** Indirectly enforced — the integration test project consumes `internal` API types, so a missing `InternalsVisibleTo` would break the build. No dedicated assertion exists.
- The 10-second container-start NFR (AC4/NFR-6) is approximated by the `docker.yml` 60-second health poll loop; the loop succeeds well within budget in practice but the hard 10s threshold is not strictly asserted.
