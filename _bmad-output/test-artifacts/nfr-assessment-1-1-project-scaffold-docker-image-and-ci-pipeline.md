---
story_key: 1-1-project-scaffold-docker-image-and-ci-pipeline
generated: "2026-06-20"
phase: nfr
verdict: PASS
note: Retroactively generated — original NFR phase ran in-context during story 1-1 lifecycle but artifact was not written to disk
---

# NFR Assessment — Story 1.1: Project Scaffold, Docker Image & CI Pipeline

## Performance NFRs

| Check | Status | Evidence |
|-------|--------|----------|
| Container startup < 10s | ✅ PASS | CI smoke test: `curl http://localhost:5000/health` within health-check timeout (10s retries in docker-compose) |
| `/health` response time | ✅ PASS | Returns immediately — in-memory check with no DB or external dependency |
| SPA asset build size | ✅ PASS | Vite scaffold produces minimal bundle (React placeholder only); no large dependencies yet |

## Security NFRs

| Control | Status | Evidence |
|---------|--------|----------|
| Non-root container user | ✅ PASS | Dockerfile creates `fishtank` user; CI smoke test: `docker run --rm fishtank:dev id \| grep -v root` |
| No sensitive files in image | ✅ PASS | `.dockerignore` excludes `.git`, `*.env`, local user files; multi-stage build discards SDK layer |
| `/health` requires no auth | ✅ PASS | Integration test: `AC2` confirms unauthenticated access returns 200 |
| API routes excluded from SPA fallback | ✅ PASS | Integration tests: `/api/**`, `/hubs/**`, `/openapi/**` do not fall through to SPA |

## Reliability NFRs

| Check | Status | Evidence |
|-------|--------|----------|
| Build reproducibility | ✅ PASS | `global.json` pins .NET SDK version; `package-lock.json` locks Node dependencies |
| CI pipeline gates | ✅ PASS | `test.yml`: lint + unit + integration run on every push; `docker.yml`: build + smoke on story/release branches |
| No placeholder code shipped | ✅ PASS | Integration test `GET_weatherforecast_Returns_Html_After_Placeholder_Removed` confirms WeatherForecast removed |
| SPA 404 isolation | ✅ PASS | Integration tests confirm `/api`, `/hubs`, `/openapi` routes are NOT caught by SPA fallback |

## Maintainability NFRs

| Check | Status | Notes |
|-------|--------|-------|
| .NET build: 0 errors | ✅ PASS | `dotnet build` exit 0 |
| TypeScript build: 0 errors | ✅ PASS | `npm run build` exit 0 |
| Integration test coverage | ✅ PASS | 9 integration tests covering all story ACs + bonus SPA routing |
| CI workflow YAML valid | ✅ PASS | Both workflows (`test.yml`, `docker.yml`) pass GitHub Actions lint |
| DevContainer functional | ✅ PASS | `.devcontainer/devcontainer.json` with .NET 10 + Node 22 + Docker-in-Docker |

## Summary

| NFR Category | Verdict |
|-------------|---------|
| Performance | ✅ PASS |
| Security | ✅ PASS |
| Reliability | ✅ PASS |
| Maintainability | ✅ PASS |

**Overall: ✅ ALL NFRs PASS**
