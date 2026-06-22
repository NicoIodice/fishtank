# Changelog

All notable changes to Fishtank are documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).  
Versions follow [Semantic Versioning](https://semver.org/).

> For automated release notes (grouped by PR type), see the
> [GitHub Releases](https://github.com/NicoIodice/fishtank/releases) page.

---

## [Unreleased] — v0.2.0 (Services Management)

_Theme: Define mock services and have WireMock start serving requests immediately._

### Added

- **WireMock engine layer** — `EngineStartup` hosted service auto-starts all Live services on container boot; per-service fault isolation (catch per service, continue loop); port-binding failures recorded as `SystemEvent` with `severity=error` (`story/2-1`)
- **Services CRUD API** — `POST /api/services` (create + WireMock start), `GET /api/services` (list), `PUT /api/services/{id}` (update), `POST /api/services/{id}/stop`, `POST /api/services/{id}/start`; all require JWT auth (`story/2-1`)
- **`GET /api/services/next-port`** — returns lowest available port in 30100–30199; reclaims ports from soft-deleted services (`story/2-1`)
- **System Events API** — `GET /api/system-events` returns all system events ordered by `CreatedAt` desc; auth-required (`story/2-1`)
- **`Services` and `SystemEvents` EF entities + migration** — `Services` (Id, Name, Slug unique, ExternalUrl, Port, MocksRoot, Status, IsActive, DeletedAt, TagsJson, CreatedAt); `SystemEvents` (Id, Severity, Message, ServiceId nullable FK, CreatedAt, IsRead) (`story/2-1`)
- **`IServicesRegistry`** — thread-safe singleton `ConcurrentDictionary<Guid, WireMockServer>` for in-process WireMock instances (`story/2-1`)
- **`IWireMockServerFactory`** — abstraction over `WireMockServer.Start()` enabling fault injection in tests (`story/2-1`)
- **SSRF guard** — `ExternalUrl` blocks loopback (127.0.0.1, localhost, ::1) and cloud-metadata (169.254.169.254, 100.100.100.200) endpoints with `SERVICE_URL_INVALID` (`story/2-1`)
- **Structured error codes** — `SERVICE_NAME_REQUIRED`, `SERVICE_NAME_INVALID`, `SERVICE_SLUG_CONFLICT`, `SERVICE_PORT_OUT_OF_RANGE`, `SERVICE_PORT_RANGE_EXHAUSTED`, `SERVICE_URL_INVALID`, `SERVICE_NOT_FOUND` (`story/2-1`)
- **ServicesHub** — SignalR hub skeleton at `/hubs/services` with `[Authorize]`; real-time push implemented in later stories (`story/2-1`)
- **100 tests** — 51 integration (xUnit + `Microsoft.AspNetCore.Mvc.Testing`) and 49 unit (xUnit + NSubstitute + FluentAssertions + EF InMemory) (`story/2-1`)

---

## [v0.1.0] — 2026-06-20 (Foundation)

_Theme: Pull the image, log in, confirm the container is healthy._

### Added

- **Docker image** — multi-stage Alpine build (`node:22-alpine` → `sdk:10.0-alpine` → `aspnet:10.0-alpine`); non-root `fishtank` user; published to Docker Hub as `nicoiodice/fishtank` (`story/1-1`)
- **`GET /health`** — returns HTTP 200 `Healthy`; excluded from SPA fallback; usable as Docker Compose healthcheck and Kubernetes readiness probe (`story/1-1`)
- **SPA fallback** — React shell served at `/`; `/api/**`, `/hubs/**`, `/openapi/**`, `/health` routes excluded from fallback to prevent masking backend errors (`story/1-1`)
- **CI pipeline** — GitHub Actions `test.yml`: lint, unit tests, integration tests; `docker.yml`: Docker build + smoke test on `story/**` and `release/**` branches; auto-publish to Docker Hub on PR merge from `release/v*.*.*` to `main` (`story/1-1`)
- **DevContainer** — `.devcontainer/devcontainer.json` with .NET 10 + Node 22 + Docker-in-Docker; one-click contributor environment in VS Code (`story/1-1`)
- **`CONTRIBUTING.md`** — architecture overview, local dev setup, test commands, PR workflow, commit conventions (`story/1-1`)
- **`SECURITY.md`** — vulnerability reporting process and scope (`story/1-1`)
- **`docker-compose.yml`** — local development environment using SDK images with hot reload (`story/1-1`)
- **`docker-compose.example.yml`** — end-user deployment reference with all environment variables documented (`story/1-1`)
- **`CHANGELOG.md`** — this file; Keep a Changelog format (`story/1-1`)
- **Release workflow** — `docker.yml` auto-tags on PR merge from `release/v*.*.*` to `main`; creates GitHub Release; no manual `git tag` needed (`chore`)
- **`releases.yaml`** — machine-readable release manifest read/written by BMad lifecycle orchestrator (`chore`)
- **SQLite database + EF Core** — auto-migrated at startup; `Users` table (Id, Username, PasswordHash, Role, IsActive, CreatedAt, TokenVersion, ForcePasswordChange) and `ServerConfig` table (BootEpoch GUID for container-lifetime JWT invalidation) (`story/1-2`)
- **JWT Bearer authentication** — httpOnly `fishtank_auth` cookie; `OnTokenValidated` checks BootEpoch + TokenVersion to support instant token invalidation; configurable expiry via `FISHTANK_JWT_EXPIRY_HOURS` (`story/1-2`)
- **`POST /api/auth/setup`** — first-run admin creation; rejects password < 12 chars; returns 409 if already set up (`story/1-2`)
- **`POST /api/auth/login`** — timing-safe BCrypt verification (work factor 12); returns JWT cookie + `forcePasswordChange` field; rate-limited via `FISHTANK_LOGIN_RATE_LIMIT`/`FISHTANK_LOGIN_RATE_WINDOW`; returns 429 + `Retry-After` on breach (`story/1-2`)
- **`POST /api/auth/logout`** — increments TokenVersion (invalidates all existing JWTs); clears `fishtank_auth` cookie (`story/1-2`)
- **`PUT /api/auth/change-password`** — validates new password length; clears `ForcePasswordChange` flag; increments TokenVersion (`story/1-2`)
- **`FirstRunMiddleware`** — blocks all routes except `/health`, `/api/auth/setup`, and `/openapi*` with 401 `AUTH_SETUP_REQUIRED` until first admin is created (`story/1-2`)
- **CORS policy** — configurable origins via `FISHTANK_ALLOWED_ORIGINS`; wildcard `*` rejected at startup (`story/1-2`)
- **Rate limiter** — fixed-window rate limiting on `POST /api/auth/login`; `ForwardedHeaders` middleware ensures per-IP accuracy behind reverse proxies (`story/1-2`)
- **`ApiResponse` envelope** — all auth endpoints return `{success, data}` or `{success:false, error:{code, message}}` (`story/1-2`)
- **Serilog structured logging** — CompactJsonFormatter to stdout from startup through request pipeline (`story/1-2`)
- **React SPA shell** — Vite 8 + React 19 + TypeScript 6 (strict); `react-router-dom` v7 with lazy-loaded routes; `@tanstack/react-query` v5 for server state; SignalR v10 seam factory (`story/1-3`)
- **Authentication UI** — Login page with credential validation, inline error messages, and redirect-back-to-origin support; First-Run Setup page creating the initial admin; Change Password page for forced-rotation flow (`story/1-3`)
- **ProtectedRoute + FirstRunGate** — client-side routing guards: unauthenticated users redirected to `/login`; setup-required users redirected to `/setup`; forced-password-change users redirected to `/setup/change-password` (`story/1-3`)
- **AppShell layout** — responsive top bar (logo, About modal, notification bell, avatar, sign-out), collapsible sidebar (5 nav items, localStorage-persisted collapse state), mobile hamburger overlay (`story/1-3`)
- **4-theme CSS system** — `clean-light` (default), `clean-dark`, `high-contrast-light`, `high-contrast-dark`; CSS custom properties (`--color-*`, `--z-*`); theme persisted to localStorage; system-preference fallback (`story/1-3`)
- **`apiFetch` utility** — typed API client with `credentials: 'include'`, `ApiError` class with typed error codes, non-JSON body handling (nginx 502 HTML), configurable `redirectOn401` (`story/1-3`)
- **Theme picker in Settings → Appearance** — `useTheme` hook reads/writes `data-theme` on `<html>` + `localStorage["fishtank-theme"]`; `AppearanceSettings` component renders 4 radio options (Clean Light, Deep Ocean, Emerald Terminal, Ink & Amber); switching theme is instant with no page reload (`story/1-4`)
- **`support/tools/` Python CLI** — interactive 8-option menu (`fishtank_tool.py`) for managing the Fishtank Docker environment on Windows/WSL2; covers prerequisites check, dependency install, container start/stop, log viewing, health check, project-scoped teardown, and WSL setup guide; launchers for CMD (`run.bat`), PowerShell (`run.ps1`), and bash (`run.sh`); `docker-compose.yml` scoped to `--project-name fishtank`; `.env.example` documents all configurable variables (`story/1-5`)

---

## How to update this file

- **Each story PR** to a release branch should include a CHANGELOG entry under `[Unreleased]`.
- **Each hotfix PR** to `main` should include a `[vX.Y.Z] — YYYY-MM-DD` entry.
- **On release**: move `[Unreleased]` entries to the versioned section (e.g., `[v0.1.0] — 2026-XX-XX`) as part of the final story or the PR to `main`.

### Entry format

```
### Added       — new features
### Changed     — changes to existing functionality
### Deprecated  — features to be removed in a future version
### Removed     — features removed in this version
### Fixed       — bug fixes
### Security    — security fixes (always include CVE/GHSA reference if applicable)
### Dependencies — library/runtime version changes (include old → new)
```

### Linking to stories

Add `(story/X-Y)` at the end of each entry to link it to the originating story. Example:

```markdown
- **Feature name** — description (`story/1-2`)
```