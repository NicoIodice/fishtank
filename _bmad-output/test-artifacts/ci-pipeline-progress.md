---
stepsCompleted: ['step-01-preflight', 'step-02-generate-pipeline', 'step-03-configure-quality-gates', 'step-04-validate-and-summary']
lastStep: 'step-04-validate-and-summary'
lastSaved: '2026-06-20'
---

# CI Pipeline Progress

## Step 1: Preflight Checks

**Date:** 2026-06-20

### Git Repository
- ✅ `.git/` exists
- ✅ Remote configured: `origin https://github.com/NicoIodice/fishtank.git`

### Test Stack Type
- **Detected:** `fullstack`
  - Backend indicators: `Fishtank.Api.csproj`, `Fishtank.Api.IntegrationTests.csproj`, `Fishtank.Api.UnitTests.csproj`
  - Frontend indicators: `src/client/playwright.config.ts`

### Test Framework
- **Backend:** xUnit + `Microsoft.AspNetCore.Mvc.Testing` (WebApplicationFactory — in-process)
- **Frontend:** Playwright (`@playwright/test`) — `src/client/tests/e2e/`

### Local Test Run
- ⚠️ **Pre-fix:** 2 integration tests failing — `GET_health_returns_200` and `GET_openapi_spec_returns_200_in_development` (both 404)
- **Root causes fixed:**
  1. `/health` endpoint not registered → added `builder.Services.AddHealthChecks()` + `app.MapHealthChecks("/health")` to `Program.cs`
  2. `MapOpenApi()` only ran in `Development` env; test factory uses `"Testing"` → extended condition to `IsDevelopment() || IsEnvironment("Testing")`
- ✅ **Post-fix:** All 4 tests pass (1 unit, 3 integration)

### CI Platform
- **Detected:** `github-actions` (inferred from git remote `github.com`)

### Environment Context
- **.NET SDK:** `10.0.301` (from `global.json`, `latestPatch` rollForward)
- **Node.js:** ≥20.19 (project context)
- **npm lockfile:** `src/client/package-lock.json`
- **Playwright browsers:** chromium, firefox

---

## Step 2: Generate Pipeline

**Date:** 2026-06-20

### Output
- **File created:** `.github/workflows/test.yml`

### Pipeline Architecture

| Job | Depends On | Trigger | Timeout |
|-----|-----------|---------|---------|
| `lint` | — | push, PR | 5 min |
| `backend-test` | — | push, PR | 15 min |
| `frontend-test` (×4 shards) | `lint` | push, PR | 30 min |
| `burn-in` | `backend-test`, `frontend-test` | PR + weekly cron | 60 min |
| `report` | all (always) | always | — |

### Key Configuration
- **Sharding:** 4 shards, `fail-fast: false`, `matrix.shard: [1, 2, 3, 4]`
- **Node version:** 20 (≥ project minimum 20.19)
- **.NET SDK:** `10.0.x` (GitHub Actions automatically gets ≥ `10.0.301` via latestPatch)
- **NuGet cache:** `~/.nuget/packages`, keyed on `*.csproj` + `global.json` hash
- **Playwright browser cache:** `~/.cache/ms-playwright`, keyed on `package-lock.json` hash
- **Vite dev server startup:** background `npm run dev` with 30×2s polling wait
- **Burn-in:** 10 iterations, `if: github.event_name == 'pull_request' || github.event_name == 'schedule'`
- **Concurrency:** `cancel-in-progress: true` per `workflow + ref`
- **Artifacts:** uploaded on failure only; 30-day retention; shard-specific names
- **Pact/contract testing:** disabled (`tea_use_pactjs_utils: false`)
- **Security:** script injection prevention comments included; all safe contexts used; no `${{ inputs.* }}` in run blocks

---

## Step 3: Quality Gates & Notifications

**Date:** 2026-06-20

### Quality Thresholds
| Tier | Threshold | Enforcement |
|------|-----------|-------------|
| P0 — Critical path | 100% pass | GitHub Actions fails job on any test failure |
| P1 — Standard | ≥95% | Currently all tests enforced at 100% |
| Flaky gate | 0 flakes / 10 iterations | `burn-in` job gates PRs and weekly schedule |

### Burn-In
- **Enabled:** yes (fullstack stack → UI flakiness detection applicable)
- **Iterations:** 10
- **Trigger:** PRs to `main`/`develop` + weekly Sunday 02:00 UTC cron
- **Failure behaviour:** `|| exit 1`, artifacts uploaded

### Contract Testing
- **Disabled** (`tea_use_pactjs_utils: false`) — no Pact gates

### Notifications
- **GitHub Step Summary:** ✅ — `report` job emits a markdown table with per-stage results and artifact pointers
- **Slack/email:** not configured (add `SLACK_WEBHOOK_URL` secret when needed; see `docs/ci-secrets-checklist.md`)

---

## Step 4: Validate & Summary

**Date:** 2026-06-20

### Checklist Validation

#### Prerequisites
- ✅ Git repository initialized
- ✅ Git remote configured
- ✅ Test framework configured (xUnit + Playwright)
- ✅ Local tests pass (fixed and verified — 4/4 pass)
- ✅ CI platform detected (GitHub Actions)

#### Pipeline Configuration
- ✅ `.github/workflows/test.yml` created
- ✅ Correct framework commands (dotnet test + npm run test:e2e)
- ✅ Node 20 matches project requirement (≥20.19)
- ✅ Browser install included (chromium + firefox — fullstack stack)
- ✅ Test directory paths correct (`src/Fishtank.slnx`, `src/client/tests/e2e`)

#### Sharding
- ✅ Matrix strategy with 4 shards
- ✅ `--shard=${{ matrix.shard }}/4` Playwright syntax
- ✅ `fail-fast: false`

#### Burn-In
- ✅ 10 iterations
- ✅ `|| exit 1` on failure
- ✅ PR + schedule triggers
- ✅ Failure artifacts uploaded

#### Caching
- ✅ NuGet cache with `*.csproj` + `global.json` hash key
- ✅ npm cache via `actions/setup-node` + lockfile path
- ✅ Playwright browser cache with `package-lock.json` hash key
- ✅ Restore-keys defined

#### Artifacts
- ✅ Uploaded on failure only
- ✅ `test-results/`, `playwright-report/` paths correct
- ✅ 30-day retention
- ✅ Unique per-shard names (`playwright-shard-1` … `playwright-shard-4`)

#### Helper Scripts
- ✅ `scripts/ci-local.sh` — local CI simulation (all stages or individual)
- ✅ `scripts/test-changed.sh` — runs only tests for changed files vs. base branch

#### Documentation
- ✅ `docs/ci.md` — pipeline guide with stages, troubleshooting, badge URL
- ✅ `docs/ci-secrets-checklist.md` — current (none) + future secrets

### Completion Summary

| Item | Value |
|------|-------|
| CI Platform | GitHub Actions |
| Config path | `.github/workflows/test.yml` |
| Stages | lint, backend-test, frontend-test (×4 shards), burn-in, report |
| Backend framework | xUnit + WebApplicationFactory |
| Frontend framework | Playwright (chromium + firefox) |
| Sharding | 4 parallel shards |
| Burn-in | 10 iterations — PRs + weekly cron |
| Artifacts | On failure — 30-day retention |
| Notifications | GitHub Step Summary |
| Required secrets | None currently |
| Helper scripts | `scripts/ci-local.sh`, `scripts/test-changed.sh` |
| Docs | `docs/ci.md`, `docs/ci-secrets-checklist.md` |
