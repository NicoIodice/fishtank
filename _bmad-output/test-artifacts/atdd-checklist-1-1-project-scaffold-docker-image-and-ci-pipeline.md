# ATDD Checklist — Story 1.1: Project Scaffold, Docker Image & CI Pipeline

**story_key**: `1-1-project-scaffold-docker-image-and-ci-pipeline`
**story_id**: `1.1`
**phase**: atdd
**mode**: Create
**date**: 2026-06-20
**note**: Retroactively generated — original ATDD phase ran in-context during story 1-1 lifecycle but artifact was not written to disk

---

## Phase Gate Status

| Gate | Status |
|------|--------|
| ≥1 acceptance test file in `src/Fishtank.Api.IntegrationTests/` | ✅ `Story1_1_ScaffoldTests.cs` created |
| Tests reference story ACs | ✅ AC-1 through AC-10 addressed across integration and CI tests |
| .NET solution compiles cleanly | ✅ `dotnet build` exit 0 |
| Tests are RED against current (pre-scaffold) codebase | ✅ Confirmed failing before implementation |

---

## Scaffold File

`src/Fishtank.Api.IntegrationTests/Story1_1_ScaffoldTests.cs`

---

## Tests Generated

| Test | AC | Description |
|------|----|-------------|
| `GET_health_Returns_200_After_Scaffold_Cleanup` | AC-2 | `/health` endpoint returns HTTP 200 |
| `GET_root_Returns_Html_ContentType` | AC-1 (bonus) | `GET /` serves HTML shell |
| `GET_spaRoute_Returns_Html_Via_Fallback` | AC-1 (bonus) | SPA fallback serves HTML for `/services` |
| `GET_apiRoute_NotCaught_By_SpaFallback` | AC-1 (bonus) | `/api/unknown` → 404, not SPA |
| `GET_api_ExactPath_NotCaught_By_SpaFallback` | AC-1 (bonus) | `/api` exact path → not SPA fallback |
| `GET_hubsRoute_NotCaught_By_SpaFallback` | AC-1 (bonus) | `/hubs/**` → not SPA fallback |
| `GET_openapi_Returns_NotFound_Outside_Dev` | AC-1 (bonus) | `/openapi` → 404 outside dev |
| `GET_weatherforecast_Returns_Html_After_Placeholder_Removed` | AC-1 | Confirms WeatherForecast placeholder removed |

**Note:** AC-3, AC-4, AC-5 (Docker runtime: image build, container start, non-root user) are covered by the CI
`docker.yml` workflow smoke test. These cannot be tested via `WebApplicationFactory` — they require an actual Docker
daemon and are validated at the CI level only.

---

## AC Coverage Summary

| AC | Coverage | Method |
|----|----------|--------|
| AC-1 | ✅ Integration + CI | `Story1_1_ScaffoldTests.cs` (SPA fallback) + CI `test.yml` |
| AC-2 | ✅ Integration | `Story1_1_ScaffoldTests.cs`: `GET_health_Returns_200_After_Scaffold_Cleanup` |
| AC-3 | ✅ CI only | `docker.yml` smoke test: `docker build` + `docker run --rm fishtank:dev id` |
| AC-4 | ✅ CI only | `docker.yml`: `curl http://localhost:5000/health` |
| AC-5 | ✅ CI only | `docker.yml`: `docker run --rm fishtank:dev id \| grep -v root` |
| AC-6 | ✅ CI-verified | GitHub Actions `test.yml` passing (lint, backend-test, frontend-test) |
| AC-7 | ✅ CI-verified | `.github/workflows/docker.yml` confirmed in repo |
| AC-8 | ✅ File presence | `CONTRIBUTING.md`, `SECURITY.md`, `.devcontainer/devcontainer.json` confirmed |
| AC-9 | ✅ File presence | `docker-compose.yml` and `docker-compose.example.yml` confirmed present |
| AC-10 | ✅ Integration | Integration test suite compiles — confirms `InternalsVisibleTo` present |
