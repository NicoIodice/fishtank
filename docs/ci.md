# CI Pipeline Guide

## Overview

Fishtank uses **GitHub Actions** for CI. The pipeline is defined in [.github/workflows/test.yml](../.github/workflows/test.yml).

### Pipeline Stages

| Stage | Trigger | Timeout |
|-------|---------|---------|
| **Lint** — ESLint on the React client | Every push / PR | 5 min |
| **Backend Tests** — xUnit unit + integration | Every push / PR | 15 min |
| **E2E Tests** — Playwright (4 shards) | Every push / PR (after lint) | 30 min / shard |
| **Burn-In** — 10-iteration flaky detection | PRs to main/develop + weekly Sunday 02:00 UTC | 60 min |
| **Report** — GitHub Step Summary | Always (after all stages) | — |

### Concurrency

Push events to the same branch cancel any in-progress run (`cancel-in-progress: true`).

---

## Local Simulation

Use the helper scripts (from the repo root, in a bash shell):

```bash
# Run all CI stages locally
./scripts/ci-local.sh

# Run a specific stage
./scripts/ci-local.sh lint
./scripts/ci-local.sh backend
./scripts/ci-local.sh e2e
./scripts/ci-local.sh burn-in

# Run only tests for files changed vs. main
./scripts/test-changed.sh main
```

> **Windows:** Run these scripts inside WSL or Git Bash. See [developer support tool Docker/WSL](./../_bmad-output/implementation-artifacts/1-5-developer-support-tool-docker-wsl.md) for setup guidance.

---

## Required Secrets

None currently. See [ci-secrets-checklist.md](ci-secrets-checklist.md) for future additions.

---

## Caching Strategy

| Cache | Key | Path |
|-------|-----|------|
| NuGet packages | `runner.os + hash(*.csproj, global.json)` | `~/.nuget/packages` |
| npm (client) | `runner.os + hash(package-lock.json)` | auto (actions/setup-node) |
| Playwright browsers | `runner.os + hash(package-lock.json)` | `~/.cache/ms-playwright` |

---

## Artifacts

Artifacts are uploaded **only on failure** and retained for **30 days**.

| Artifact | Contents | Job |
|----------|----------|-----|
| `backend-test-results` | `.trx` files | `backend-test` |
| `playwright-shard-N` | `test-results/`, `playwright-report/` | `frontend-test` |
| `burn-in-failures` | `test-results/`, `playwright-report/` | `burn-in` |

---

## Quality Gates

| Tier | Threshold | Enforcement |
|------|-----------|-------------|
| P0 — Critical path | 100% pass | CI blocks merge on any failure |
| P1 — Standard | ≥95% pass | Currently all tests enforced at 100% |
| Flaky detection | 0 flakes over 10 iterations | Burn-in gates PRs to main/develop |

---

## Playwright Sharding

E2E tests are split across **4 parallel shards** using `--shard=N/4`. Each shard runs on an independent `ubuntu-latest` runner. Playwright is configured with `retries: 2` in CI (set in `playwright.config.ts`).

---

## Adding New Tests

- **Backend (.NET):** Add xUnit test files to `src/Fishtank.Api.UnitTests/` or `src/Fishtank.Api.IntegrationTests/`. No pipeline changes needed.
- **Frontend E2E:** Add `.spec.ts` files to `src/client/tests/e2e/`. No pipeline changes needed — sharding picks them up automatically.
- **New browser:** Add to the `projects` array in `src/client/playwright.config.ts`; also add the browser slug to the `Install Playwright browsers` step in `test.yml`.

---

## Troubleshooting

### Vite dev server doesn't start in CI

Check the "Wait for Vite dev server" step logs. If it consistently times out, the `src/client/node_modules` may be missing from cache — a cache miss triggers a fresh `npm ci`, which usually resolves it.

### NuGet restore fails

Ensure `global.json` pins an SDK version available on `ubuntu-latest`. The current pin is `10.0.301` with `latestPatch` rollForward. GitHub Actions runners update regularly; check [GitHub Actions runner images](https://github.com/actions/runner-images) for the available .NET SDK list.

### Burn-in never runs

Burn-in only triggers on `pull_request` events and the weekly `schedule`. It does **not** run on direct pushes.

---

## Status Badge

Add to `README.md` once the first pipeline run succeeds:

```markdown
[![Test Pipeline](https://github.com/NicoIodice/fishtank/actions/workflows/test.yml/badge.svg)](https://github.com/NicoIodice/fishtank/actions/workflows/test.yml)
```
