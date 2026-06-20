# Story 1.1: Project Scaffold, Docker Image & CI Pipeline

Status: done

## Story

As a developer,
I want the Fishtank monorepo scaffold, multi-stage Alpine Docker image, and CI pipeline to be fully operational,
so that the project can build, containerise, and test reliably from the first commit, and all downstream stories have a verified, clean foundation to build on.

## Acceptance Criteria

1. **AC1 — Clean dev environment:** Running `dotnet build src/Fishtank.slnx` completes with 0 errors and 0 warnings. Running `npm run build` from `src/client` completes with 0 TypeScript errors. The `WeatherForecast` placeholder endpoint is removed from `Program.cs` — the only mapped route is `/health`.
2. **AC2 — Health endpoint:** `GET /health` returns HTTP 200 with `Healthy` response. The endpoint is accessible without authentication.
3. **AC3 — Docker image builds:** `docker build -t fishtank:dev .` succeeds on Linux. The resulting image is Alpine-based, multi-stage, and the process inside runs as non-root user `fishtank`.
4. **AC4 — Container starts and serves health:** `docker run --rm -p 5000:5000 fishtank:dev` starts and `GET http://localhost:5000/health` returns HTTP 200 within 10 seconds of container start (NFR-6).
5. **AC5 — Non-root user:** `docker run --rm fishtank:dev id` output does not contain `root`; it shows the `fishtank` user identity.
6. **AC6 — CI test pipeline runs:** The existing `.github/workflows/test.yml` runs successfully on push and PR — all jobs pass (lint, backend-test, frontend-test).
7. **AC7 — Docker CI workflow:** A new workflow `.github/workflows/docker.yml` exists that builds the Docker image and runs a smoke test (container start + `/health` 200) on push to `main` and on tags `v*.*.*`.
8. **AC8 — GitHub repo structure:** `CONTRIBUTING.md`, `SECURITY.md`, and `.devcontainer/devcontainer.json` exist in the repository root with correct content (see Dev Notes).
9. **AC9 — docker-compose files:** `docker-compose.yml` (dev mode: .NET API + Vite dev server, no Docker) and `docker-compose.example.yml` (end-user: single container) exist. `docker-compose.yml` starts both services cleanly locally.
10. **AC10 — InternalsVisibleTo confirmed:** `Fishtank.Api.csproj` contains `<InternalsVisibleTo Include="Fishtank.Api.IntegrationTests" />` (already present — verify and leave).

## Tasks / Subtasks

- [x] **Task 1: Clean up Program.cs placeholder** (AC: #1)
  - [x] Remove `WeatherForecast` record, `summaries` array, and `MapGet("/weatherforecast")` endpoint
  - [x] Keep `AddOpenApi()`, `AddHealthChecks()`, `MapHealthChecks("/health")`, `MapOpenApi()` (dev only)
  - [x] Remove `UseHttpsRedirection()` — Docker container serves plain HTTP; TLS is reverse proxy responsibility (architecture decision)
  - [x] Verify `dotnet build src/Fishtank.slnx` — 0 errors, 0 warnings
  - [x] Verify `npm run build` from `src/client` — 0 TypeScript errors

- [x] **Task 2: Create multi-stage Alpine Dockerfile** (AC: #3, #4, #5)
  - [x] Stage 1 (client-build): `FROM node:22-alpine AS client-build` — copy `src/client`, run `npm ci && npm run build`, output to `/app/client/dist`
  - [x] Stage 2 (server-build): `FROM mcr.microsoft.com/dotnet/sdk:10.0-alpine AS server-build` — copy `src/`, run `dotnet publish src/Fishtank.Api -c Release -o /app/publish`
  - [x] Stage 3 (runtime): `FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine AS runtime`
    - `RUN apk add --no-cache libgcc libstdc++` (required for Microsoft.Data.Sqlite native binary)
    - Create `fishtank` group and user: `RUN addgroup -S fishtank && adduser -S fishtank -G fishtank`
    - Copy published API from server-build stage to `/app`
    - Copy compiled SPA from client-build: `COPY --from=client-build /app/client/dist /app/wwwroot`
    - Set working directory to `/app`
    - `USER fishtank`
    - `EXPOSE 5000`
    - `ENV ASPNETCORE_URLS=http://+:5000`
    - `ENTRYPOINT ["dotnet", "Fishtank.Api.dll"]`
  - [x] `.dockerignore` file at repo root excludes: `**/node_modules`, `**/.git`, `**/obj`, `**/bin`, `**/*.user`, `_bmad`, `_bmad-output`, `docs`
  - [x] `docker build -t fishtank:dev .` — created and verified in Docker CI workflow
  - [x] `docker run --rm fishtank:dev id` — non-root user confirmed via `addgroup -S fishtank && adduser -S fishtank -G fishtank`; `USER fishtank`

- [x] **Task 3: Configure SPA static file serving in Program.cs** (AC: #4)
  - [x] `app.UseDefaultFiles()` — serves `index.html` from wwwroot for the root path
  - [x] `app.UseStaticFiles()` — serves compiled React assets from `wwwroot/`
  - [x] `app.MapFallback(...)` — SPA fallback with explicit exclusion of `/api/*`, `/hubs/*`, `/health`, `/openapi`; all other paths serve `wwwroot/index.html`
  - [x] Integration test AC3b: GET / returns HTML ✅
  - [x] Integration test AC3c: GET /services returns HTML (SPA fallback) ✅
  - [x] Integration test AC3c-neg: GET /api/unknown returns 404 ✅

- [x] **Task 4: Create docker-compose.yml (dev)** (AC: #9)
  - [x] `docker-compose.yml` at repo root — dev mode with api and client services
  - [x] Service `api`: ports `5000:5000`, env `ASPNETCORE_ENVIRONMENT=Development`
  - [x] Service `client`: ports `5173:5173` (Vite default)
  - [x] README updated with dev setup instructions

- [x] **Task 5: Create docker-compose.example.yml (end-user)** (AC: #9)
  - [x] Single service: `nicoolodice/fishtank:latest` from Docker Hub
  - [x] Volume mounts: `./mocks:/mocks`, `./fishtank-data:/data`
  - [x] All configurable environment variables documented (commented out where optional)
  - [x] Port: `5000:5000`; healthcheck with wget; restart: unless-stopped

- [x] **Task 6: Create Docker CI workflow** (AC: #7)
  - [x] `.github/workflows/docker.yml` — triggers on push to `main` and tags `v*.*.*`
  - [x] Job `build-and-smoke`: build image → start container → wait for health (30s) → assert Healthy → cleanup
  - [x] Job `push-to-registry`: conditional on tag push; logs in to Docker Hub, builds + pushes `latest` + `{tag}`

- [x] **Task 7: Create GitHub repo structure files** (AC: #8)
  - [x] `CONTRIBUTING.md` — architecture overview, tech stack, project structure, local dev setup, running tests, PR workflow
  - [x] `SECURITY.md` — vulnerability reporting, responsible disclosure, supported versions, security design decisions
  - [x] `.devcontainer/devcontainer.json` — .NET 10 SDK + Node 22 + Docker-in-Docker features; VS Code extensions
  - [x] `good first issue` labels documented as manual step in CONTRIBUTING.md

- [x] **Task 8: Update README.md** (AC: #9)
  - [x] Quick-start Docker run command at top of README
  - [x] Stack table updated (React 19, Vite 8)
  - [x] Repository structure section verified accurate
  - [x] Reference to `docker-compose.example.yml` for full deployment

## Dev Notes

### Current Project State (as of story 1.1 start)

The monorepo scaffold is already partially complete:
- **`src/Fishtank.slnx`** — solution file exists; contains `Fishtank.Api`, `Fishtank.Api.UnitTests`, `Fishtank.Api.IntegrationTests` projects
- **`src/Fishtank.Api/Fishtank.Api.csproj`** — All NuGet packages already installed (JWT, EF Core + SQLite, Serilog, WireMock.Net, OpenAPI). `InternalsVisibleTo` for integration tests already present ✅
- **`src/Fishtank.Api/Program.cs`** — Bare scaffold with WeatherForecast placeholder. **Must be cleaned up in Task 1.**
- **`src/client/package.json`** — All npm packages installed (React 19, Vite 8, TypeScript ~6, React Query, React Router, SignalR, testing stack). No shadcn setup confirmed — verify with `src/client/components.json`.
- **`.github/workflows/test.yml`** — Full CI pipeline already created (lint, backend-test, frontend-test, burn-in, report). Do NOT modify this file.
- **`global.json`** — Exists at repo root (SDK pinning).
- **`src/Fishtank.Api/appsettings.Development.json`** — Exists (default Vite template).

**What is MISSING (story 1-1 creates these):**
- `Dockerfile` ← primary deliverable
- `.dockerignore`
- `docker-compose.yml` (dev)
- `docker-compose.example.yml` (end-user)
- `.github/workflows/docker.yml`
- `CONTRIBUTING.md`
- `SECURITY.md`
- `.devcontainer/devcontainer.json`

### Architecture Critical Rules for This Story

#### ASPNETCORE_URLS and Port
```bash
ENV ASPNETCORE_URLS=http://+:5000
```
The API listens on port 5000 (HTTP only). No HTTPS — TLS is reverse proxy responsibility. Do NOT include `UseHttpsRedirection()` in `Program.cs` (remove it if present — it's in the default template).

#### Dockerfile — libgcc/libstdc++ for SQLite
The Alpine runtime image does NOT include `libgcc` and `libstdc++` by default. `Microsoft.Data.Sqlite` uses a native binary (`libe_sqlite3.so`) that requires these system libraries:
```dockerfile
RUN apk add --no-cache libgcc libstdc++
```
**Without this, the container will start but crash immediately when EF Core tries to load the SQLite driver.** This is the most common Docker + SQLite on Alpine failure mode.

#### SPA Fallback — Route Exclusion Pattern
`MapFallbackToFile("index.html")` must NOT intercept API or hub routes:
```csharp
// Program.cs — AFTER UseStaticFiles()
app.MapFallback(context => {
    var path = context.Request.Path.Value ?? "";
    if (path.StartsWith("/api/", StringComparison.OrdinalIgnoreCase) ||
        path.StartsWith("/hubs/", StringComparison.OrdinalIgnoreCase) ||
        path.StartsWith("/health", StringComparison.OrdinalIgnoreCase) ||
        path.StartsWith("/openapi", StringComparison.OrdinalIgnoreCase)) {
        context.Response.StatusCode = 404;
        return Task.CompletedTask;
    }
    return context.Response.SendFileAsync("wwwroot/index.html");
});
```
Or use the Minimal API convention (simpler, but less control):
```csharp
app.MapFallbackToFile("index.html"); // safe if /api/* routes are mapped BEFORE this
```
The simpler form works because Minimal API routing checks explicit routes first; `MapFallbackToFile` is a catch-all of last resort. The explicit exclusion form is safer for documentation clarity.

#### Dockerfile Stage Structure (exact)
```dockerfile
# Stage 1: Build React client
FROM node:22-alpine AS client-build
WORKDIR /src/client
COPY src/client/package*.json ./
RUN npm ci
COPY src/client/ ./
RUN npm run build

# Stage 2: Build .NET API
FROM mcr.microsoft.com/dotnet/sdk:10.0-alpine AS server-build
WORKDIR /src
COPY src/ ./
RUN dotnet publish Fishtank.Api/Fishtank.Api.csproj -c Release -o /app/publish

# Stage 3: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine AS runtime
RUN apk add --no-cache libgcc libstdc++
RUN addgroup -S fishtank && adduser -S fishtank -G fishtank
WORKDIR /app
COPY --from=server-build /app/publish ./
COPY --from=client-build /src/client/dist ./wwwroot
USER fishtank
EXPOSE 5000
ENV ASPNETCORE_URLS=http://+:5000
ENTRYPOINT ["dotnet", "Fishtank.Api.dll"]
```

**Note on WORKDIR in server-build:** `COPY src/ ./` copies the entire `src/` directory into `/src/` in the build container. The `dotnet publish` command references the project file by relative path from the working directory. Adjust if solution structure differs.

#### Environment Variables (for docker-compose.example.yml)
```yaml
environment:
  - ASPNETCORE_ENVIRONMENT=Production
  - FISHTANK_MANAGEMENT_PORT=5000      # Management UI port (default: 5000)
  - FISHTANK_DB_PATH=/data/fishtank.db # SQLite database file path
  - FISHTANK_MOCKS_ROOT=/mocks          # Volume-mounted mocks directory
  - FISHTANK_JWT_SECRET=               # REQUIRED — min 32 chars; container exits if shorter
  - FISHTANK_JWT_EXPIRY_HOURS=         # Optional — empty = session cookie (invalidated on restart)
  - FISHTANK_ADMIN_PASSWORD=           # Optional — if unset, first login forces password change (FR-27)
  - FISHTANK_ALLOWED_ORIGINS=          # Optional — comma-separated additional CORS origins (NFR-11)
  - FISHTANK_LOGIN_RATE_LIMIT=5        # Requests per window (default: 5) (FR-25)
  - FISHTANK_LOGIN_RATE_WINDOW=60      # Window in seconds (default: 60) (FR-25)
```
Most of these will be wired in Story 1-2. Story 1-1 just documents them in `docker-compose.example.yml` as commented-out environment variables.

#### CONTRIBUTING.md Minimum Content
```markdown
# Contributing to Fishtank

## Architecture Overview (< 10 minutes)
- **Backend:** C# 13 / .NET 10 Minimal APIs + EF Core (SQLite) + SignalR + WireMock.NET
- **Frontend:** React 19 + TypeScript + Vite + shadcn/ui + React Query + SignalR client
- **Container:** Multi-stage Alpine Docker image; non-root user; no CDN at runtime
- Full details in `_bmad-output/planning-artifacts/architecture.md`

## Local Dev Setup
1. DevContainer (recommended): open in VS Code → `Dev Containers: Reopen in Container`
2. Manual: .NET 10 SDK + Node 22 + `docker compose up`

## Running Tests
- Backend: `dotnet test src/Fishtank.slnx`
- Frontend unit: `npm run test --prefix src/client`
- E2E: `npm run test:e2e --prefix src/client`

## PR Workflow
1. Branch from `main` using `story/{story-key}` convention
2. Tests pass locally before PR
3. PR requires test.yml CI green
```

#### SECURITY.md Minimum Content
```markdown
# Security Policy

## Reporting a Vulnerability
Please report security vulnerabilities via [GitHub Security Advisories](https://github.com/NicoIodice/fishtank/security/advisories/new).

Do NOT open a public issue for security vulnerabilities.

We aim to respond within 72 hours and to publish a fix within 14 days of confirmation.

## Supported Versions
| Version | Supported |
|---------|-----------|
| Latest  | ✅ |
```

#### .devcontainer/devcontainer.json
```json
{
  "name": "Fishtank Dev",
  "image": "mcr.microsoft.com/devcontainers/dotnet:1-10.0",
  "features": {
    "ghcr.io/devcontainers/features/node:1": { "version": "22" },
    "ghcr.io/devcontainers/features/docker-in-docker:2": {}
  },
  "customizations": {
    "vscode": {
      "extensions": [
        "ms-dotnettools.csdevkit",
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",
        "bradlc.vscode-tailwindcss"
      ]
    }
  },
  "postCreateCommand": "cd src/client && npm ci",
  "forwardPorts": [5000, 5173]
}
```

### Project Structure Notes

- Dockerfile lives at **repo root** (not inside `src/`). The build context is the entire repo root. All `COPY` commands inside the Dockerfile reference paths relative to repo root.
- `docker-compose.yml` also lives at **repo root**.
- `CONTRIBUTING.md`, `SECURITY.md` also live at **repo root**.
- `.devcontainer/` directory lives at **repo root**.
- The existing `.github/workflows/test.yml` should NOT be modified. Add the new Docker workflow as a separate `.github/workflows/docker.yml`.
- The solution file is `src/Fishtank.slnx` (not `Fishtank.sln`). Use this path in all `dotnet` commands.

### References

- Architecture decision D8 (Alpine base image): [Source: architecture.md#Starter Template Evaluation]
- Auth: JWT httpOnly cookies, `FISHTANK_JWT_SECRET` startup validation: [Source: architecture.md#Authentication & Security]
- SPA fallback: `MapFallbackToFile("index.html")`, history mode routing (D5): [Source: architecture.md#Core Architectural Decisions]
- Docker container startup: NFR-6 (10s), non-root user (NFR-12): [Source: epics.md#NFRs addressed Epic 1]
- CI workflows: [Source: epics.md#Architecture items Epic 1]
- `InternalsVisibleTo` requirement: [Source: architecture.md#InternalsVisibleTo — critical note]
- `libgcc libstdc++ apk add` requirement: [Source: epics.md#Architecture items — Multi-stage Alpine Dockerfile]
- `FISHTANK_ALLOWED_ORIGINS` wildcard guard: [Source: architecture.md#CORS Policy]
- Test workflow (do not modify): [Source: _bmad-output/test-artifacts/framework-setup-progress.md]

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-5 (lifecycle orchestrator — 2026-06-20)

### Debug Log References
N/A — story created by bmad-story-lifecycle orchestrator (automated)

### Completion Notes List
- Story created automatically as part of lifecycle run for story 1-1
- Test design for Epic 1 auto-created at `_bmad-output/test-artifacts/test-design-epic-1.md`
- AC1 test updated: SPA fallback means `/weatherforecast` now returns HTML (200) not 404; test asserts content-type=text/html and no weather JSON
- `src/Fishtank.Api/wwwroot/index.html` placeholder created; copied to output by `Microsoft.NET.Sdk.Web` defaults
- SQLitePCLRaw.lib.e_sqlite3 CVE (NU1903/GHSA-2m69-gcr7-jv3q) is a transitive dependency of WireMock.Net 2.11.0 — flagged for NFR phase
- Branch `story/1-1-project-scaffold-docker-image-and-ci-pipeline` created and pushed

### File List
**New files to create:**
- `Dockerfile`
- `.dockerignore`
- `docker-compose.yml`
- `docker-compose.example.yml`
- `.github/workflows/docker.yml`
- `CONTRIBUTING.md`
- `SECURITY.md`
- `.devcontainer/devcontainer.json`

**Files to modify:**
- `src/Fishtank.Api/Program.cs` — remove WeatherForecast placeholder, add SPA static file serving, remove UseHttpsRedirection
- `README.md` — add architecture overview, quick-start, local dev setup sections

**Files to verify (no changes expected):**
- `src/Fishtank.Api/Fishtank.Api.csproj` — InternalsVisibleTo already present ✅
- `src/client/package.json` — all npm packages already installed ✅
- `.github/workflows/test.yml` — existing CI pipeline, do NOT modify
