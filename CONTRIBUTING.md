# Contributing to Fishtank

Thank you for your interest in contributing! This document covers everything you need to get started.

## Architecture Overview (< 10 minutes)

Fishtank is a Docker-native WireMock.NET management UI. The high-level architecture:

| Layer | Technology |
|---|---|
| Backend | C# 13 · .NET 10.0 LTS · ASP.NET Core Minimal APIs · SignalR · EF Core + SQLite |
| Frontend | React 19 · TypeScript · Vite 8 · Tailwind CSS v4 · shadcn/ui · React Query |
| Mock engine | WireMock.NET 2.x |
| Auth | JWT in httpOnly cookies |
| Logging | Serilog → structured JSON stdout |
| Container | Multi-stage Alpine Docker; non-root user `fishtank` |

Full architectural decisions are documented in [`_bmad-output/planning-artifacts/architecture.md`](_bmad-output/planning-artifacts/architecture.md).

## Project Structure

```
fishtank/
├── src/
│   ├── Fishtank.slnx                      # .NET solution
│   ├── Fishtank.Api/                      # ASP.NET Core host — API + SPA + SignalR
│   ├── Fishtank.Api.UnitTests/            # xUnit — fast, no I/O
│   ├── Fishtank.Api.IntegrationTests/     # xUnit + WebApplicationFactory
│   └── client/                            # Vite + React + TypeScript SPA
├── Dockerfile                             # Multi-stage Alpine build
├── docker-compose.yml                     # Dev environment
├── docker-compose.example.yml             # End-user deployment reference
└── .github/workflows/
    ├── test.yml                           # CI: lint + tests
    └── docker.yml                         # CI: Docker build + smoke test + publish
```

## Local Dev Setup

### Option 1: DevContainer (recommended)

Open the repository in VS Code and choose **Dev Containers: Reopen in Container**. The devcontainer installs .NET 10, Node 22, and Docker CLI automatically.

### Option 2: Manual Setup

**Prerequisites:**
- [.NET SDK 10.0.301](https://dotnet.microsoft.com/download)
- [Node.js ≥ 22](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/)

**Run locally:**
```bash
# Backend
dotnet run --project src/Fishtank.Api

# Frontend (separate terminal)
cd src/client && npm run dev
```

## Running Tests

```bash
# Backend unit tests
dotnet test src/Fishtank.Api.UnitTests

# Backend integration tests
dotnet test src/Fishtank.Api.IntegrationTests

# Frontend unit tests
cd src/client && npm test

# Frontend E2E (requires running API + client)
cd src/client && npm run test:e2e

# All tests
dotnet test src/Fishtank.slnx
```

### E2E mocking rules (Playwright)

E2E tests run against the **live stack** (Vite dev server + .NET API). **Do not mock the backend** in E2E tests except for these specific cases:

- `GET /api/setup/status → needsSetup:true` — the zero-user DB state is not reproducible against a shared test backend that has already gone through first-run setup.
- **Fault injection** (500, network error, timeout) — intentional failure scenarios that cannot be triggered deterministically from a real backend in CI.
- **Non-deterministic real-time data** (network activity sniffing, SignalR push with external service traffic) — source data is live and unpredictable.

For everything else — `auth/me`, `login`, `logout`, `setup`, any CRUD endpoint — hit the real backend. Use `storageState` (via `global-setup.ts` / `seedAuthStorageState()`) to pre-authenticate test sessions rather than mocking `auth/me`.

See [project-context.md](_bmad-output/project-context.md) (Testing › E2E Playwright — Backend Mocking Policy) for the full reference.

## PR Workflow

Fishtank uses a **release branch model**. Each epic maps to a release version (see `releases.yaml` and `ROADMAP.md`).

### For feature / story work

1. Branch from the **release branch** (`release/vX.Y.Z`), not from `main`:
   ```bash
   git checkout release/v0.1.0
   git checkout -b feature/1-2-auth-backend
   git push -u origin feature/1-2-auth-backend
   ```
2. Make your changes, ensuring all tests pass locally.
3. Open a PR: `feature/**` → `release/vX.Y.Z` (not `main`).
4. CI runs full tests + Docker build/smoke test on push.
5. Update `CHANGELOG.md` under `[Unreleased]` for any user-facing change.
6. Request a review from a maintainer.

### For a full release (all epic stories done)

1. Open a PR: `release/vX.Y.Z` → `main`.
2. CI runs smoke test only (full tests already passed on the release branch).
3. After merge, CI automatically tags `vX.Y.Z`, publishes the Docker image, and creates the GitHub Release. **No manual `git tag` needed.**

### For hotfixes

1. Branch from `main` and push immediately: `git checkout -b hotfix/v0.1.1` then `git push -u origin hotfix/v0.1.1`
2. Apply the fix; add a `CHANGELOG.md` entry under a new `## [v0.1.1]` section.
3. Add a hotfix entry to `releases.yaml` (see schema comments in that file).
4. Open a PR: `hotfix/v0.1.1` → `main`.
5. CI auto-tags `v0.1.1`, publishes the Docker image, and creates the GitHub Release after merge.

### CHANGELOG Guidelines

**Include** user-facing changes: new features, API endpoints, UI screens/components, bug fixes with observable impact, security fixes, new config options, Docker image or CI pipeline behavior changes.

**Exclude** (never mention in CHANGELOG entries):
- Test files, unit tests, E2E tests, ATDD scaffolds, test framework configuration
- Internal refactors or code-quality improvements with no observable behavior change
- Documentation-only changes
- BMad AI workflow files (`.agents/skills/**`, `_bmad/**`, lifecycle skill files, TOML config) — these are invisible to end users

**Internal-only changes** — when a release or hotfix contains *only* internal tooling changes (e.g. bmad skills, workflow config, dev scripts) with nothing user-facing, write exactly one generic entry under `### Changed`:

```
- **Developer tooling** — Minor fixes and improvements (`branch-name`)
```

Do not name skill files, lifecycle phases, TOML configuration, or AI workflow mechanics in any CHANGELOG entry.

## Commit Message Convention

All commits must follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>

[optional body — explain WHY, not WHAT]

[optional footer — feature/1-2, Closes #N, BREAKING CHANGE: ...]
```

### Types

| Type | When to use | Appears in CHANGELOG? |
|---|---|---|
| `feat` | New user-visible feature | ✅ Added |
| `fix` | Bug fix | ✅ Fixed |
| `security` | Security vulnerability fix | ✅ Security |
| `perf` | Performance improvement | ✅ Changed |
| `refactor` | Code restructure, no behavior change | ❌ |
| `test` | Test-only changes | ❌ |
| `ci` | CI/CD pipeline changes | ✅ Infrastructure |
| `chore` | Tooling, build, dependency bumps | ✅ Dependencies (if user-facing) |
| `docs` | Documentation only | ❌ |
| `revert` | Reverts a previous commit | ✅ Fixed |

### Scopes (use the closest match)

`api` · `client` · `auth` · `docker` · `ci` · `db` · `services` · `mappings` · `activity` · `admin` · `health` · `config` · `deps`

### Examples

```bash
feat(auth): add JWT httpOnly cookie login endpoint
fix(api): exclude /api path from SPA fallback handler
ci(docker): add smoke test to story and release branch triggers
chore(deps): bump WireMock.Net to 2.11.1
security(auth): enforce rate limiting on POST /api/auth/login
```

> PR titles follow the same convention — GitHub uses them to build the auto-generated release notes.

## Good First Issues

New contributors should look for issues labelled [`good first issue`](https://github.com/NicoIodice/fishtank/labels/good%20first%20issue) in the issue tracker. These are scoped, well-defined tasks suitable for first contributions.

> **Note to maintainers:** After repository creation, manually add `good first issue`, `bug`, `enhancement`, `documentation`, and `security` labels via GitHub's label editor.
