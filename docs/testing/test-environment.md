# Test Environment — Running tests against the Fishtank Docker container

> **Read this before running any E2E or container-dependent test.**
> Unit, component (Vitest), and backend integration (xUnit) tests run in-process and need **no**
> container. **E2E (Playwright)** and any test that hits the live stack require the Fishtank
> container running and healthy at `http://localhost:5000`.

This file is loaded as a **persistent fact** by `bmad-story-lifecycle` and is referenced by the
E2E test gate, so every automated test run has this context available.

---

## Which tests need the container?

| Test layer | Tool | Needs container? | Command |
|---|---|---|---|
| Backend unit | xUnit | ❌ | `dotnet test src/Fishtank.Api.UnitTests` |
| Backend integration | xUnit + WebApplicationFactory | ❌ (in-process host) | `dotnet test src/Fishtank.Api.IntegrationTests` |
| Frontend unit/component | Vitest + RTL + MSW | ❌ | `cd src/client && npm run test:unit -- --run` |
| **Frontend E2E** | **Playwright** | ✅ **live stack required** | see below |

---

## The container lives inside WSL2 + Docker Desktop

Fishtank runs on Windows via **WSL2 (Ubuntu) + Docker Desktop**. The Docker daemon is shared with
WSL. **Docker Desktop must be running** before any `docker` command works (from Windows or WSL).
If `docker ps` errors with `dockerDesktopLinuxEngine: The system cannot find the file specified`,
the daemon is **down** — start Docker Desktop first.

The **support tool** (`support/tools/fishtank-helper-tool/`) wraps all container lifecycle commands
and is the preferred way to start/stop the stack. Everything it runs is scoped to
`--project-name fishtank`, so it never touches other Compose projects.

### Start the stack (preferred — support tool)

```powershell
# From Windows (PowerShell), interactive menu — choose [3] Start Fishtank
cd support\tools\fishtank-helper-tool
.\run.ps1
```

Support-tool menu reference:

| Option | Action | Underlying command |
|---|---|---|
| `[3] Start Fishtank` | start + health check | `docker compose --project-name fishtank up -d` |
| `[4] Stop Fishtank` | stop (keep volumes) | `docker compose --project-name fishtank stop` |
| `[6] Health check` | `GET /health` | — |
| `[7] Teardown` | remove containers (project-scoped) | `docker compose --project-name fishtank down` |

### Start the stack (non-interactive — direct, via WSL)

```bash
wsl -d Ubuntu -- bash -c "cd /mnt/c/GIT/_Personal/fishtank/support/tools/fishtank-helper-tool && docker compose --project-name fishtank up -d --build"
```

### Confirm health (gate precondition)

```powershell
(Invoke-WebRequest -Uri 'http://localhost:5000/health' -UseBasicParsing -ErrorAction SilentlyContinue).StatusCode
# Must return 200 before E2E tests run.
```

### Stop the stack

```bash
wsl -d Ubuntu -- bash -c "cd /mnt/c/GIT/_Personal/fishtank/support/tools/fishtank-helper-tool && docker compose --project-name fishtank stop"
```

---

## Running the E2E suite

Once `/health` returns `200`:

```powershell
cd src\client
$env:BASE_URL = 'http://localhost:5000'
$env:API_URL  = 'http://localhost:5000'
npx playwright test --project=chromium tests/e2e/story-<story_key>.spec.ts --reporter=list
```

- E2E tests run against the **live stack** — **do not mock the backend** except for the documented
  exceptions in [`CONTRIBUTING.md`](../../CONTRIBUTING.md) (zero-user setup state, fault injection,
  non-deterministic real-time data). Pre-authenticate with `storageState` via `global-setup.ts`.
- The shared backend is reset once in `global-setup.ts`; specs that assert exact counts must scope
  to their own seeded markers (Playrwright runs `fullyParallel`).

---

## E2E gate behaviour in the lifecycle

The `bmad-story-lifecycle` **E2E test gate** (end of the `test-automate` phase) enforces this:

1. If no `tests/e2e/story-<story_key>.spec.ts` exists → gate skipped.
2. Else it checks `http://localhost:5000/health`. If **not 200** → **HALT (blocked)** with
   instructions to start the container (commands above), then re-run the lifecycle.
3. With the stack healthy → run the story's E2E spec; on failure, enter the QuickDev fix cycle
   (budget 2) — fixing code bugs in `src/` or spec bugs in `tests/e2e/`.

> **CI note:** the GitHub Actions pipeline starts its own stack and runs the full E2E + Docker smoke
> test on every push to `story/**` and `release/**`. Local E2E execution can be waived in favour of
> CI when Docker Desktop is unavailable locally — but the gate still records the decision.
