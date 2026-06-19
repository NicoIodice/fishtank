---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-Fishtank-2026-06-19/prd.md
  - _bmad-output/planning-artifacts/prds/prd-Fishtank-2026-06-19/addendum.md
  - _bmad-output/planning-artifacts/ux-designs/ux-Fishtank-2026-06-04/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-Fishtank-2026-06-04/EXPERIENCE.md
  - _bmad-output/planning-artifacts/briefs/brief-Fishtank-2026-06-02/brief.md
  - _bmad-output/planning-artifacts/implementation-readiness-report-2026-06-19.md
workflowType: 'architecture'
lastStep: 8
status: 'complete'
completedAt: '2026-06-19'
project_name: 'Fishtank'
user_name: 'Nico'
date: '2026-06-19'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

---

## Project Context Analysis

### Requirements Overview

**Functional Requirements (45 total across 9 areas):**
Services Management (FR-1–6), Network Activity (FR-7–13), Mock Suggestions & Recording (FR-14–16), Mappings & Responses (FR-17–21), System Events (FR-22–23), Authentication & Users (FR-24–29), Admin Console & Feature Toggles (FR-30–33), Deployment & Distribution (FR-34–42), Management API (FR-43–45).

**Non-Functional Requirements (21 total):**
- Performance: Sub-500ms activity log push (NFR-3); 10,000 rows at 60fps (NFR-4); 2s UI initial load (NFR-1); 1s Resync under 200 files (NFR-2)
- Reliability: Per-service fault isolation (NFR-5); 10s container start (NFR-6)
- Security: JWT in httpOnly cookies (NFR-16); CORS self-origin default (NFR-11); non-root container (NFR-12); rate-limited login (NFR-10)
- Observability: Structured JSON logs to stdout + rolling files (NFR-17–18)
- Accessibility: WCAG 2.1 AA across all 4 themes; prefers-reduced-motion (NFR-19–21)

**Scale & Complexity:**
- Primary domain: Full-stack Docker-native web application
- Complexity level: Medium-high
- Estimated architectural components: 10–12

### Technical Constraints & Dependencies

- **WireMock.NET spike gate: RESOLVED** — Multi-service in-process hosting is proven via existing `ServerManager` implementation. A single .NET process can host N independent `WireMockServer` instances on separate ports with independent fault boundaries. Key evolution required: dynamic per-service start/stop at runtime (vs. startup-only in existing code).
- **SQLite v1 hard constraint:** Single-instance only; no shared volume across multiple Fishtank instances. Postgres is a post-v1 substitution path; ORM/data layer must not foreclose it.
- **TLS responsibility:** v1 serves plain HTTP; reverse proxy handles TLS.
- **Port range fixed:** 30100–30199 (max 100 services in v1).
- **No CDN at runtime:** All UI assets served from the container.
- **No service deletion in v1.**
- **Team size:** Solo developer (PO + PM + TM + Dev + Tester).

### Cross-Cutting Concerns Identified

1. **Real-time communication** — affects Network Activity, System Events, Notification Panel, and Recording indicator simultaneously. WebSocket or SSE required (NFR-3: <500ms row latency).
2. **Filesystem bridge** — Mappings/Responses live on the user's volume; the backend must read, write, and detect external changes reliably (conflict detection in FR-20).
3. **Authentication boundary** — Every endpoint except `/health` and `/login` requires auth; middleware must be consistently applied across all REST and WebSocket/SSE endpoints.
4. **Feature toggle propagation** — Toggle changes must take effect immediately for all active sessions; requires server-side broadcast mechanism.
5. **Audit trail threading** — User actions and system events both feed the audit log; must be consistently applied through the service layer.
6. **OSS contributor experience** — Architecture must be comprehensible in ≤10 minutes; OpenAPI spec enables frontend-only contributors to work without .NET knowledge.

---

## Starter Template Evaluation

### Primary Technology Domain

Full-stack Docker-native web application. Two starters composed under one monorepo, unified by a single multi-stage Dockerfile. No single CLI generator spans the full stack.

### Project Repository Structure

```
fishtank/
├── src/                                  # All source code — consistent root
│   ├── Fishtank.sln
│   ├── Fishtank.Api/                     # ASP.NET Core host (API + SignalR + SPA static serving)
│   │   ├── Endpoints/                    # Minimal API endpoint groups (per feature area)
│   │   ├── Services/                     # Application services
│   │   ├── Engine/                       # WireMock.NET orchestration layer
│   │   ├── Hubs/                         # SignalR hubs (real-time activity log + events)
│   │   ├── Data/                         # EF Core DbContext + migrations (SQLite)
│   │   ├── wwwroot/                      # Compiled SPA output (production only)
│   │   └── Fishtank.Api.csproj
│   ├── Fishtank.Api.UnitTests/           # xUnit — fast, no I/O dependencies
│   ├── Fishtank.Api.IntegrationTests/    # xUnit + WebApplicationFactory + SQLite :memory:
│   └── client/                           # Vite + React + TypeScript SPA
│       ├── src/
│       │   ├── components/ui/            # shadcn/ui components
│       │   ├── features/                 # Feature-scoped modules
│       │   ├── lib/                      # queryClient.ts (RQ+SignalR seam), API client, utils
│       │   └── main.tsx
│       ├── vite.config.ts
│       └── package.json
├── .github/
│   └── workflows/                        # CI: build, test, Docker publish
├── Dockerfile                            # Multi-stage: build client → build server → runtime
├── docker-compose.yml                    # Dev: .NET API + Vite dev server
├── docker-compose.example.yml            # User-facing: end-user deployment
├── docker-compose.test.yml               # CI: full image smoke test (Playwright)
├── .devcontainer/                        # devcontainer for OSS contributors
├── CONTRIBUTING.md
├── SECURITY.md
└── README.md
```

### Frontend Starter

**Initialization Commands:**
```bash
cd src
npm create vite@latest client -- --template react-ts
cd client
npx shadcn@latest init -t vite
```

**Architectural Decisions Provided:**
- **Language & Runtime:** TypeScript strict mode, React 18, Node.js ≥20.19
- **Build Tooling:** Vite (Rolldown bundler, HMR, native ES modules)
- **Styling:** Tailwind CSS v4 + shadcn/ui (CSS variable theming — maps to DESIGN.md token system)
- **Path Alias:** `@/` → `./src/`

**Additional packages:**
```bash
npm install @microsoft/signalr           # Real-time activity log + events
npm install @uiw/react-codemirror @codemirror/lang-json @codemirror/theme-one-dark  # FR-19 Raw JSON editor
npm install react-router-dom             # SPA routing
npm install @tanstack/react-query        # Server state + cache management

# Testing
npm install -D vitest @testing-library/react @testing-library/user-event jsdom
npm install -D msw                       # Fetch interception for React Query hook tests — mandatory
npm install -D @vitest/coverage-v8       # Coverage gate in CI
```

**React Query + SignalR seam contract** (documented in `src/client/src/lib/queryClient.ts`):
- Activity log feed → SignalR only; React Query not involved
- CRUD operations → React Query only
- SignalR state-change events → `queryClient.invalidateQueries([...])` in hub listener
- Explicit invalidation mappings defined before first component is written to prevent cache/push races

### Backend Starter

**Initialization Commands:**
```bash
dotnet new sln -n Fishtank
dotnet new webapi -n Fishtank.Api --use-minimal-apis -o src/Fishtank.Api
dotnet new xunit -n Fishtank.Api.UnitTests -o src/Fishtank.Api.UnitTests
dotnet new xunit -n Fishtank.Api.IntegrationTests -o src/Fishtank.Api.IntegrationTests
dotnet sln add src/Fishtank.Api src/Fishtank.Api.UnitTests src/Fishtank.Api.IntegrationTests
```

**Architectural Decisions Provided:**
- **Language & Runtime:** C# 13, .NET 10.0 LTS (SDK 10.0.301, released June 2026)
- **API Style:** Minimal APIs with endpoint groups per feature area
- **OpenAPI:** `Microsoft.AspNetCore.OpenApi` (built-in, served at `/openapi/v1.json`)

**Additional NuGet packages:**
```bash
# ORM + persistence
dotnet add src/Fishtank.Api package Microsoft.EntityFrameworkCore.Sqlite
dotnet add src/Fishtank.Api package Microsoft.EntityFrameworkCore.Design

# Real-time
dotnet add src/Fishtank.Api package Microsoft.AspNetCore.SignalR

# WireMock engine
dotnet add src/Fishtank.Api package WireMock.Net

# Structured logging (console only — Docker logs go to stdout)
dotnet add src/Fishtank.Api package Serilog.AspNetCore
dotnet add src/Fishtank.Api package Serilog.Sinks.Console
dotnet add src/Fishtank.Api package Serilog.Formatting.Compact

# Auth (FR-24–29 — required by PRD MVP scope)
dotnet add src/Fishtank.Api package Microsoft.AspNetCore.Authentication.JwtBearer

# Integration testing
dotnet add src/Fishtank.Api.IntegrationTests package Microsoft.AspNetCore.Mvc.Testing
dotnet add src/Fishtank.Api.IntegrationTests package Respawn
dotnet add src/Fishtank.Api.IntegrationTests package FluentAssertions
```

### Selected Approach: Dual-Starter Monorepo

**Rationale:** Single-container constraint requires the .NET backend to serve the compiled Vite SPA in production. Multi-stage Dockerfile: `client/` builds to `dist/` → copied to `Fishtank.Api/wwwroot/` → `app.UseStaticFiles()` + `app.MapFallbackToFile("index.html")` serve the SPA. In development, Vite dev server runs independently; .NET API proxies API calls.

**Validated adjustments from architectural review:**
- `client/` placed under `src/` for structural consistency (all source under one root)
- `Serilog.Sinks.File` removed — Docker containers log to stdout; file sinks are anti-pattern without explicit log-volume mount
- Single `Fishtank.Tests/` project split into `UnitTests` + `IntegrationTests` — separate CI steps, fast unit feedback before slower integration pass
- `msw` added as non-negotiable for React Query hook testing
- `Serilog.Formatting.Compact` added for structured JSON stdout
- `JwtBearer` retained — explicitly required by FR-24–29 (MVP auth scope), not template residue

**Note:** Project initialization (running the above commands and verifying the dev environment starts cleanly) is the first implementation story.

**`InternalsVisibleTo` must be added in story 1:** Add to `Fishtank.Api.csproj` before the first integration test story:
```xml
<ItemGroup>
  <InternalsVisibleTo Include="Fishtank.Api.IntegrationTests" />
</ItemGroup>
```
Without this, `WebApplicationFactory<Program>` cannot see `Program.cs` (which is `internal` by default in top-level statement style). Retrofitting this after story 4 is a time sink.

---

## Core Architectural Decisions

### Decision Summary

| # | Category | Decision | Rationale |
|---|---|---|---|
| D1 | Data | EF Core auto-migrate at startup | Zero ops friction for self-hosted tool; `MigrateAsync()` on startup |
| D2 | API | Custom response envelope | Consistent API surface across all endpoints |
| D3 | Security | ASP.NET Core built-in rate limiting | No extra package; covers FR-25/NFR-10 |
| D4 | Data | GUID primary keys | Future-proof; slug retained as stable import identity |
| D5 | Frontend | History mode routing | Clean URLs; .NET fallback to `index.html` |
| D6 | Filesystem | FileSystemWatcher per service folder | Real-time conflict detection for FR-20 |
| D7 | Real-time | SignalR broadcast for feature toggles | Reuses existing hub; instant propagation |
| D8 | Infra | Alpine base image | Minimal attack surface for public Docker Hub image |

---

### Data Architecture

#### D1 — EF Core Migration Strategy: Auto-migrate at startup

```csharp
// Program.cs — runs on every container start
using var scope = app.Services.CreateScope();
var db = scope.ServiceProvider.GetRequiredService<FishtankDbContext>();
await db.Database.MigrateAsync();
```

- Applies all pending migrations automatically on startup
- Zero operator intervention on version upgrades — pull new image, restart container
- Consistent with self-hosted OSS tools (Gitea, Forgejo pattern)
- Migration files live in `src/Fishtank.Api/Data/Migrations/` and are committed to source control

**Startup failure handling:** Wrap `MigrateAsync()` in a `try/catch`. On failure: log a structured Serilog error with `{DbPath}` and `{Exception}` context, then re-throw to let the app terminate with a non-zero exit code. Docker’s `restart: unless-stopped` and health check both depend on observable failure — a silently swallowed exception produces a healthy-looking container that serves nothing.

**Cascade:** Migration conflicts on a corrupted database surface as a startup failure → written as a System Event before any Service starts (consistent with FR-22 startup check requirement).

#### D4 — Entity IDs: GUID primary keys

- All database entities use `Guid` primary keys generated by EF Core
- **Service slug** remains the stable external identity for seed file import (FR-5: additive import matches by slug)
- API URL pattern: `/api/services/{guid}` — GUID in REST URLs
- Slug used as secondary lookup: `GET /api/services/by-slug/{slug}` for seed file tooling
- EF Core SQLite handles GUID storage as `TEXT` (16-char hex); acceptable performance for v1 scale
- **Slug uniqueness enforced at DB level** via unique index on `Services.Slug` — not application code. Prevents duplicate slugs from concurrent imports.
- **Soft-delete ready:** `Service.cs` entity includes `DeletedAt DateTimeOffset?` (nullable, null = active). “No service deletion in v1” means the deletion UI is not exposed, not that the deleted state doesn’t exist. All queries filter `WHERE DeletedAt IS NULL`. Soft-delete is retrofittable without a breaking migration.

**Cascade:** Seed file import resolves slug → GUID for upsert logic. API clients reference services by GUID; human-readable slug is display/path metadata only.

---

### Authentication & Security

#### Auth stack (from PRD FR-24–29 + NFR-8–16)

- **JWT tokens** issued on login, stored in **httpOnly cookies** (NFR-16 — not localStorage/sessionStorage)
- Cookie settings: `HttpOnly: true`, `SameSite: Strict`, `Secure: true` (when behind TLS reverse proxy)
- Token lifetime: configurable via env var; default = container lifetime (invalidated on restart — FR-24)
- No refresh token endpoint in v1 (ASSUMPTION documented in PRD)

**SignalR WebSocket authentication with cookies:** httpOnly cookies are included by browsers in WebSocket upgrade requests. Standard ASP.NET Core JWT cookie auth works with SignalR WebSockets natively — no `accessTokenFactory` or query-string token workaround needed. `SameSite: Strict` is safe because in production the SPA and API are served from the same origin (same container). In development, the Vite proxy ensures requests arrive same-origin to the browser.

#### D3 — Rate Limiting: ASP.NET Core built-in

```csharp
builder.Services.AddRateLimiter(options =>
    options.AddFixedWindowLimiter("login", cfg => {
        cfg.PermitLimit = /* FISHTANK_LOGIN_RATE_LIMIT env var */;
        cfg.Window = /* FISHTANK_LOGIN_RATE_WINDOW env var */;
        cfg.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        cfg.QueueLimit = 0;
    }));
```

- Applied to `POST /api/auth/login` only
- Threshold and window configurable via environment variables (FR-36)
- Returns HTTP 429 with `Retry-After` header (FR-25)
- No extra NuGet package required (.NET 7+ built-in)

#### CORS Policy

- Default: allow only the origin serving the bundled React SPA (`http://localhost:{MANAGEMENT_PORT}`)
- Additional origins via `FISHTANK_ALLOWED_ORIGINS` env var (comma-separated)
- NFR-11: CORS locked to self-origin by default

#### API Key (pipeline reset endpoint FR-45)

- Pre-shared secret configured via `FISHTANK_PIPELINE_RESET_KEY` env var
- Distinct from user JWT tokens — CI/CD automation only
- No key configured → `POST /admin/reset` returns HTTP 403 with descriptive message

---

### API & Communication Patterns

#### D2 — Response Envelope: Custom wrapper

All API responses (except `/health`, `/openapi`, and static SPA assets) use a consistent envelope:

```json
// Success
{ "success": true, "data": { /* payload */ } }

// Error
{ "success": false, "error": { "code": "SERVICE_PORT_CONFLICT", "message": "Port 30101 is already in use by 'Payments API'.", "details": "..." } }
```

- `code`: machine-readable string constant (screaming snake case, feature-prefixed e.g. `SERVICE_*`, `AUTH_*`, `MAPPING_*`)
- `message`: human-readable, safe to display in UI
- `details`: optional stack context for debugging (omitted in production unless debug mode)
- The OpenAPI spec documents the envelope as a generic wrapper type; typed per-endpoint responses defined inside `data`

**Cascade:** Frontend API client (`src/client/src/lib/api.ts`) implements a single `apiFetch<T>()` wrapper that unwraps `data` on success and throws a typed `ApiError` on `success: false`. All React Query `queryFn` implementations use this wrapper — never raw `fetch`.

#### REST endpoint structure

```
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/services
POST   /api/services
GET    /api/services/{guid}
PUT    /api/services/{guid}
POST   /api/services/{guid}/start
POST   /api/services/{guid}/stop
POST   /api/services/import          # seed file import
GET    /api/activity                 # query log
DELETE /api/activity                 # clear log
GET    /api/mappings                 # folder tree
POST   /api/mappings                 # create file
PUT    /api/mappings/{path}          # save file
DELETE /api/mappings/{path}          # delete file
POST   /api/resync
GET    /api/events                   # system events
GET    /api/users                    # admin only
POST   /api/users
PUT    /api/users/{guid}/deactivate
GET    /api/admin/toggles
PUT    /api/admin/toggles/{name}
GET    /api/admin/health
GET    /api/admin/audit
GET    /api/settings                 # read-only runtime config (port range, rate limit config, version)
POST   /admin/reset                  # pipeline reset — API key auth
GET    /health                       # no auth
GET    /openapi/v1.json              # no auth
```

#### SignalR Hubs

```
/hubs/activity     # Activity log rows pushed in real-time (NFR-3: <500ms)
/hubs/events       # System Events + Notification Panel badge updates
/hubs/services     # Service status changes (start/stop confirmation)
/hubs/toggles      # Feature toggle state changes (D7)
```

All hubs require JWT authentication (cookie forwarded via `HttpContext`).

**Activity log is ephemeral and session-bound by design.** If a WebSocket disconnects and reconnects, missed `ActivityRowAdded` events are gone — there is no re-fetch on reconnect. Refreshing the page starts a fresh log. Historical activity log access is explicitly out of scope for v1. This is a documented trade-off, not an oversight.

#### D5 — Frontend Routing: History mode

- react-router-dom v6+ with `createBrowserRouter`
- ASP.NET Core: `app.MapFallbackToFile("index.html")` serves SPA for all non-API paths
- API paths prefixed `/api/` and `/hubs/` are excluded from fallback

---

### Frontend Architecture

#### Component architecture

- **UI primitives:** `src/client/src/components/ui/` — shadcn/ui generated components only (never hand-edited)
- **Feature modules:** `src/client/src/features/{feature}/` — each feature owns its routes, components, hooks, and types
- **Shared lib:** `src/client/src/lib/` — `api.ts` (fetch wrapper), `queryClient.ts` (RQ + SignalR seam contract), `signalr.ts` (hub connection factory)

#### React Query + SignalR seam (documented in `queryClient.ts`)

```typescript
// Explicit invalidation mappings — defined before first component is written
const HUB_INVALIDATION_MAP: Record<string, QueryKey[]> = {
  "ServiceStatusChanged": [["services"]],
  "FeatureToggleChanged":  [["toggles"]],
  "ResyncCompleted":       [["mappings"]],
};
// Activity log rows → SignalR append only, React Query not involved
// All CRUD → React Query only
```

---

### Infrastructure & Deployment

#### D6 — File System Change Detection: FileSystemWatcher

- One `FileSystemWatcher` per Service folder, watching `mappings/` and `responses/` subdirectories
- Events captured: `Created`, `Changed`, `Deleted`, `Renamed`
- In-memory store: `Dictionary<string, DateTimeOffset> _lastKnownModified` per service
- Resync (FR-20) compares file `LastWriteTime` against stored value to detect external modifications
- Conflict banner triggers when: file open in editor + `LastWriteTime` changed since editor load
- Linux/Docker: inotify-backed; ~200 watchers for 100 services — well within kernel defaults (8192)

**Conflict definition (unambiguous):** A conflict is: file open in the Fishtank editor + that file’s `LastWriteTime` on disk has advanced beyond the timestamp recorded when the editor loaded it. This catches external editor writes and CLI modifications. It does NOT flag byte-identical rewrites. WireMock route conflicts (two files defining the same method+path+priority) are a separate validation error, not an FSW conflict.

**IFileWatcher abstraction:** `TrackingFileSystemHandler.cs` implements `IFileWatcher` (interface in `Engine/`). Tests inject a fake watcher and trigger callbacks synchronously — no `Task.Delay` or OS timing required. Without this abstraction, FSW tests are inherently flaky.

**inotify ceiling:** Linux default `fs.inotify.max_user_watches` is 8192. 100 services at ~2 watchers each = 200 — safe under normal conditions. If a host machine runs heavy tooling (VS Code, JetBrains IDEs) that consumes thousands of watches, the ceiling can be hit. README must document: add `--sysctl fs.inotify.max_user_watches=65536` to the `docker run` command if watch exhaustion is observed.

**Cascade:** FSW events also drive the folder tree refresh signal (sent via `/hubs/activity` or dedicated hub event). Avoids needing full Resync for a simple folder tree update.

#### D8 — Docker base image: Alpine

```dockerfile
# Multi-stage build
FROM node:22-alpine AS client-build
WORKDIR /app/client
COPY src/client/package*.json ./
RUN npm ci
COPY src/client/ .
RUN npm run build

FROM mcr.microsoft.com/dotnet/sdk:10.0-alpine AS server-build
WORKDIR /app
COPY src/Fishtank.sln .
COPY src/Fishtank.Api/ src/Fishtank.Api/
RUN dotnet publish src/Fishtank.Api -c Release -o /publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine AS runtime
RUN apk add --no-cache libgcc libstdc++          # Required by Microsoft.Data.Sqlite native SQLite binary
RUN addgroup -S fishtank && adduser -S fishtank -G fishtank   # NFR-12: non-root
WORKDIR /app
COPY --from=server-build /publish .
COPY --from=client-build /app/client/dist ./wwwroot
USER fishtank
ENTRYPOINT ["dotnet", "Fishtank.Api.dll"]
```

- Build context: Alpine throughout (smaller layers, minimal attack surface)
- Non-root user `fishtank` (NFR-12)
- WireMock.NET is pure managed .NET — no native dependencies, Alpine compatible
- **Version policy:** Pin `WireMock.Net` to a specific minor version at project init. WireMock.Net has breaking changes between major versions. Upgrade path: patch-only automatically; minor version requires changelog review before bumping.

#### D7 — Feature Toggle Broadcast: SignalR

```csharp
// FeatureToggleService — on toggle update:
await _hub.Clients.All.SendAsync("FeatureToggleChanged", toggleName, isEnabled);
```

- Reuses existing `/hubs/toggles` — no additional infrastructure
- Frontend: hub listener calls `queryClient.invalidateQueries([["toggles"]])` immediately
- Takes effect for all active sessions within one SignalR round-trip

### Decision Impact Analysis

**Implementation sequence (order matters):**
1. DB schema + EF Core migrations (GUIDs, SQLite) — blocks everything else
2. Auth endpoints + JWT cookie middleware — blocks all protected endpoints
3. WireMock.NET engine layer (Service start/stop, dynamic management) — blocks FR-1–6
4. REST API endpoint groups (one per feature area) — blocks frontend integration
5. SignalR hubs setup — blocks real-time features
6. React Query + SignalR seam contract (`queryClient.ts`) — blocks all frontend components
7. FileSystemWatcher setup — blocks Resync conflict detection (FR-20)

**Cross-component dependencies:**
- Auth middleware → applied to all REST endpoints + SignalR hub connections
- Response envelope → applied by all endpoint handlers; unwrapped by `apiFetch<T>()`
- FSW → feeds SignalR hub events + Resync conflict state
- Feature toggles → persisted in DB + broadcast via SignalR + read by every feature on load

---

## Implementation Patterns & Consistency Rules

### Naming Patterns

#### Database (EF Core / SQLite)

| Element | Convention | Example |
|---|---|---|
| Table names | Plural, PascalCase (EF convention) | `Services`, `Users`, `SystemEvents` |
| Column names | PascalCase (EF property names) | `ExternalUrl`, `MocksRoot`, `CreatedAt` |
| Primary keys | `Id` (GUID, EF default) | `Id` |
| Foreign keys | `{Entity}Id` | `ServiceId`, `UserId` |
| Index naming | EF fluent API — no manual naming convention required in v1 | |

#### REST API endpoints

| Pattern | Rule | Example |
|---|---|---|
| Resource nouns | Plural | `/api/services`, `/api/users`, `/api/mappings` |
| Path parameters | GUID as `{id}` | `/api/services/{id}` |
| Action sub-paths | Verb after resource | `/api/services/{id}/start`, `/api/services/{id}/stop` |
| Query parameters | camelCase | `?serviceId=`, `?type=mocked` |
| Admin endpoints | `/api/admin/` prefix | `/api/admin/toggles`, `/api/admin/audit` |
| Pipeline reset | `/admin/reset` (no `/api/` prefix — distinct auth mechanism) | |

#### JSON field naming

- **All JSON (request bodies, response `data` fields):** camelCase — System.Text.Json default
- **Error codes:** SCREAMING_SNAKE_CASE, feature-prefixed
  - `SERVICE_*` — Services management errors
  - `AUTH_*` — Authentication errors
  - `MAPPING_*` — Mapping/Response file errors
  - `ENGINE_*` — WireMock engine errors
  - `SYSTEM_*` — Infrastructure/startup errors
  - `ADMIN_*` — Admin Console errors

#### C# code

| Element | Convention |
|---|---|
| Types, methods, properties | PascalCase |
| Parameters, locals, fields | camelCase |
| Private fields | `_camelCase` (underscore prefix) |
| Constants | PascalCase |
| Async methods | `{Name}Async` suffix |
| Endpoint group classes | `{Feature}Endpoints` (e.g. `ServicesEndpoints`) |

#### TypeScript / React

| Element | Convention | Example |
|---|---|---|
| React components | PascalCase | `ServiceCard.tsx`, `ActivityLogRow.tsx` |
| Hooks | `use` prefix, camelCase | `useServices.ts`, `useActivityLog.ts` |
| Utility files | camelCase | `api.ts`, `queryClient.ts`, `signalr.ts` |
| Types/interfaces | PascalCase | `Service`, `ActivityLogRow`, `ApiError` |
| Constants | SCREAMING_SNAKE_CASE | `DEFAULT_PORT_RANGE_START` |
| CSS approach | Tailwind utility classes only — no custom CSS classes unless absolutely necessary | |

---

### Structure Patterns

#### Backend — where things live

```
src/Fishtank.Api/
├── Endpoints/              # One file per feature group: ServicesEndpoints.cs, ActivityEndpoints.cs
├── Engine/                 # WireMock.NET orchestration: ServiceManager.cs, ServicesRegistry.cs
├── Hubs/                   # SignalR: ActivityHub.cs, EventsHub.cs, ServicesHub.cs, TogglesHub.cs
├── Data/
│   ├── FishtankDbContext.cs
│   ├── Migrations/         # EF Core generated — never hand-edited
│   └── Entities/           # One file per entity: Service.cs, User.cs, SystemEvent.cs
├── Services/               # Application services: IServiceManager, IMappingService, IRecordingService, etc.
├── Middleware/              # Auth middleware, error handling, rate limiting
└── Models/                 # Request/response DTOs: ServiceDto.cs, CreateServiceRequest.cs
└── Exceptions/             # FishtankException.cs (base) + typed subclasses
```

**Rules:**
- Endpoints register routes only — no business logic in endpoint handlers
- Business logic lives in `Services/` — endpoints call services, services call EF Core directly
- EF Core entities (`Data/Entities/`) are never returned directly from endpoints — always map to DTOs (`Models/`)

#### Frontend — where things live

```
src/client/src/
├── components/ui/          # shadcn/ui generated — never hand-edited
├── components/shared/      # Shared non-shadcn components: Layout.tsx, PageHeader.tsx
├── features/
│   ├── services/           # ServicesPage.tsx, ServiceCard.tsx, useServices.ts, services.types.ts
│   ├── activity/           # ActivityPage.tsx, ActivityLogRow.tsx, useActivityLog.ts
│   ├── mappings/           # MappingsPage.tsx, FileTree.tsx, JsonEditor.tsx
│   ├── events/             # EventsPage.tsx, NotificationPanel.tsx
│   ├── auth/               # LoginPage.tsx, SetupPage.tsx, useAuth.ts
│   ├── settings/           # SettingsPage.tsx
│   └── admin/              # AdminPage.tsx, ToggleList.tsx
├── lib/
│   ├── api.ts              # apiFetch<T>() — single entry point for all HTTP calls
│   ├── queryClient.ts      # React Query client + SignalR invalidation map
│   └── signalr.ts          # Hub connection factory + reconnect logic
└── router.tsx              # createBrowserRouter — all routes defined here
```

**Rules:**
- Each feature folder is self-contained: page, components, hooks, types — no cross-feature imports
- Shared components go in `components/shared/`, not in feature folders
- All API calls go through `lib/api.ts` — never raw `fetch` in components or hooks
- All routes defined in `router.tsx` — features export page components only

---

### Format Patterns

#### API response envelope — always use the wrapper

```json
// Success
{ "success": true, "data": { /* typed payload */ } }

// Error
{ "success": false, "error": { "code": "SERVICE_PORT_CONFLICT", "message": "...", "details": "..." } }

// Empty success (DELETE, POST /start, POST /stop)
{ "success": true, "data": null }
```

**Rules:**
- `data` is always present on success, even if `null` for void operations
- `error.code` is always a defined constant — never a free-form string
- `details` omitted in production unless `FISHTANK_DEBUG_ERRORS=true`
- `/health` and `/openapi/v1.json` return plain responses — no envelope

#### Frontend API client pattern

```typescript
// lib/api.ts — all API calls go through this
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, { credentials: 'include', ...options });
  const body = await res.json();
  if (!body.success) throw new ApiError(body.error.code, body.error.message);
  return body.data as T;
}
```

**Rules:**
- `credentials: 'include'` always set — JWT in httpOnly cookie
- Callers receive typed `T` directly — envelope unwrapping happens here only
- `401` from any call → redirect to `/login` (handled here, not in components)

#### Date/time format

- **All API fields:** ISO 8601 UTC — `"2026-06-19T14:32:00.000Z"`
- **Display:** formatted in frontend via `Intl.DateTimeFormat` (user local timezone)
- **Never:** Unix timestamps or non-UTC strings in API payloads

---

### Communication Patterns

#### SignalR hub events

| Hub | Event name | Payload | Triggers |
|---|---|---|---|
| `/hubs/activity` | `ActivityRowAdded` | `ActivityRow` DTO | New request received by any Service |
| `/hubs/events` | `SystemEventCreated` | `SystemEvent` DTO | Any System Event written |
| `/hubs/events` | `UnreadCountChanged` | `{ count: number }` | Unread count changes |
| `/hubs/services` | `ServiceStatusChanged` | `{ id: string, status: "live" \| "stopped" }` | Service toggled |
| `/hubs/toggles` | `FeatureToggleChanged` | `{ name: string, enabled: boolean }` | Toggle updated |

**Rules:**
- Event names: PascalCase past-tense verb+noun (`ActivityRowAdded`, not `activity_row`)
- Payloads: camelCase JSON — same convention as REST responses
- All hubs require JWT auth (cookie forwarded via `withCredentials`)
- Reconnect logic lives in `lib/signalr.ts` only — never in feature hooks

#### SignalR → React Query invalidation map

```typescript
// queryClient.ts — single source of truth
const HUB_INVALIDATION_MAP = {
  'ServiceStatusChanged': [['services']],
  'FeatureToggleChanged':  [['toggles']],
  'ResyncCompleted':       [['mappings', 'tree']],
} satisfies Record<string, QueryKey[]>;
// Activity log → SignalR append only — React Query NOT used for live feed
```

**Rule:** Never invalidate React Query cache inside a component — always via this map.

---

### Error Handling Patterns

#### Backend

- Global exception handler middleware registered before all other middleware
- Unhandled exceptions → `500` with `{ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' } }`
- Business rule violations → typed exception thrown from services, caught by `GlobalExceptionMiddleware`
- Exception hierarchy: `FishtankException` (base) → `NotFoundException` (404), `ConflictException` (409), `ValidationException` (400), `ForbiddenException` (403); all carry `errorCode` + `message`
- HTTP status mapping: `400` validation, `401` unauthenticated, `403` forbidden, `404` not found, `409` conflict, `429` rate limited, `500` unexpected

#### Frontend

- React Query `onError` receives typed `ApiError` — components display `error.message` directly
- Global error boundary at router level for unhandled render errors
- Toast notifications for transient errors (save failed, Resync failed)
- `401` → redirect to `/login` handled in `apiFetch<T>()`, not in components

---

### Loading State Patterns

- Server data loading → React Query `isLoading` / `isFetching` — never manual `useState(false)`
- Optimistic updates: **Service enable/disable toggle only** (FR-3 — explicitly documented exception)
- All other mutations: wait for server confirmation before UI update
- SignalR connection state: `connecting | connected | reconnecting | disconnected` — managed in `lib/signalr.ts`
- **Activity log (`features/activity/useActivityLog.ts`):** Uses SignalR append ONLY — `// DO NOT useQuery here`. Every other feature hook calls `apiFetch<T>()` + React Query. This is the single intentional exception. A `useQuery` call on the activity feed would poll stale data and break the push model.

---

### Testing Patterns

| Layer | Tool | Location | Rule |
|---|---|---|---|
| Backend unit | xUnit | `src/Fishtank.Api.UnitTests/` | Mirrors source structure; no I/O; fast |
| Backend integration | xUnit + WebApplicationFactory | `src/Fishtank.Api.IntegrationTests/` | SQLite `:memory:`; Respawn; FluentAssertions |
| Frontend component | Vitest + Testing Library | Co-located `*.test.tsx` in feature folders | msw for API mocking; test behaviour not implementation |
| E2E smoke | Playwright | `.github/e2e/` | Runs against built Docker image via `docker-compose.test.yml` |

**Rules:**
- Integration tests use `WebApplicationFactory<Program>` — never spin up a real HTTP server manually
- Every new endpoint → minimum one integration test (happy path + one error path)
- msw handlers must be updated in the same PR as any API contract change
- Playwright smoke suite: home page loads, create a service, hit the mock — that's all v1 needs
- **Rate limiter:** `FishtankWebApplicationFactory` disables `FixedWindowLimiter` via `IOptions<RateLimiterOptions>` override — prevents non-deterministic `429` in CI when login is called repeatedly
- **Cookie auth in tests:** Use `TestAuthHandler` to inject a pre-built JWT cookie into requests — do NOT call the real login endpoint in every test; use it in exactly one test to verify the auth endpoint end-to-end
- **SignalR hub tests:** Use `HubConnectionTestHelper` with WAF `CreateHandler()`. One connect→receive→disconnect test per hub before any hub implementation story ships. Cookies are forwarded natively — no query-string token workaround needed
- **WireMock in tests:** Use `WireMockTestFixture` (`IClassFixture`) with port-0 dynamic allocation; always dispose via `IDisposable`. Never share a `WireMockServer` instance across parallel test classes — port collision will produce intermittent failures
- **FSW tests:** Inject `IFileWatcher` fake; trigger callbacks synchronously. Never use `Task.Delay` to wait for OS events — this produces flaky tests that erode trust in the suite
- **HUB_INVALIDATION_MAP drift guard:** Unit test asserts every hub event string referenced in `lib/signalr.ts` has a corresponding key in `HUB_INVALIDATION_MAP`. Catches silent stale-cache bugs at zero runtime cost
- **FR-3 optimistic toggle rollback:** Integration test must cover: toggle fires → server returns 500 → UI state reverts. Happy-path-only coverage leaves the rollback handler as untested dead weight
- **E2E activity log:** Playwright test: create a service → wait for `ActivityRowAdded` SignalR event → assert at least one row appears. Tests the FSW → ActivityService → ActivityHub chain end-to-end

---

## Project Structure & Boundaries

### Complete Project Directory Structure

```
fishtank/
├── .devcontainer/
│   └── devcontainer.json              # OSS contributor dev environment
├── .github/
│   ├── e2e/                           # Playwright smoke tests (run against built image)
│   │   ├── fixtures/
│   │   └── smoke.spec.ts
│   ├── workflows/
│   │   ├── ci.yml                     # Build, test, lint on PR
│   │   └── release.yml                # Docker Hub publish on tag
│   └── PULL_REQUEST_TEMPLATE.md
├── src/
│   ├── Fishtank.sln
│   │
│   ├── Fishtank.Api/
│   │   ├── Fishtank.Api.csproj
│   │   ├── Program.cs                 # App bootstrap, DI, middleware pipeline
│   │   ├── appsettings.json           # Base config (no secrets)
│   │   ├── appsettings.Development.json
│   │   │
│   │   ├── Data/
│   │   │   ├── FishtankDbContext.cs
│   │   │   ├── Migrations/            # EF Core generated — never hand-edited
│   │   │   └── Entities/
│   │   │       ├── Service.cs         # FR-1–6
│   │   │       ├── User.cs            # FR-24–29
│   │   │       ├── AuditEntry.cs      # FR-33
│   │   │       ├── SystemEvent.cs     # FR-22–23
│   │   │       └── FeatureToggle.cs   # FR-30
│   │   │
│   │   ├── Models/                    # Request/response DTOs (never return entities directly)
│   │   │   ├── Services/
│   │   │   │   ├── ServiceDto.cs
│   │   │   │   ├── CreateServiceRequest.cs
│   │   │   │   └── UpdateServiceRequest.cs
│   │   │   ├── Activity/
│   │   │   │   └── ActivityRowDto.cs
│   │   │   ├── Mappings/
│   │   │   │   ├── FileTreeNodeDto.cs
│   │   │   │   └── SaveFileRequest.cs
│   │   │   ├── Recording/
│   │   │   │   └── SuggestionDto.cs       # FR-14–16: { Id, ActivityRowId, ServiceId, SuggestedFilePath, Payload: CreateMappingRequest }
│   │   │   ├── Auth/
│   │   │   │   ├── LoginRequest.cs
│   │   │   │   └── LoginResponse.cs
│   │   │   ├── Admin/
│   │   │   │   ├── UserDto.cs
│   │   │   │   ├── AuditEntryDto.cs
│   │   │   │   └── FeatureToggleDto.cs
│   │   │   └── Shared/
│   │   │       ├── ApiResponse.cs     # Generic envelope: { success, data, error }
│   │   │       └── ApiError.cs        # { code, message, details }
│   │   │
│   │   ├── Endpoints/                 # Minimal API route registration only
│   │   │   ├── ServicesEndpoints.cs   # FR-1–6
│   │   │   ├── ActivityEndpoints.cs   # FR-7–13
│   │   │   ├── MappingsEndpoints.cs   # FR-17–21
│   │   │   ├── RecordingEndpoints.cs  # FR-14–16
│   │   │   ├── EventsEndpoints.cs     # FR-22–23
│   │   │   ├── AuthEndpoints.cs       # FR-24–29
│   │   │   ├── AdminEndpoints.cs      # FR-30–33
│   │   │   ├── SettingsEndpoints.cs   # GET /api/settings — read-only runtime config
│   │   │   ├── ManagementApiEndpoints.cs  # FR-43–45
│   │   │   └── HealthEndpoints.cs     # FR-38
│   │   │
│   │   ├── Services/                  # Business logic
│   │   │   ├── IServiceManager.cs
│   │   │   ├── IMappingService.cs
│   │   │   ├── IActivityService.cs
│   │   │   ├── ISystemEventService.cs
│   │   │   ├── IFeatureToggleService.cs
│   │   │   ├── IAuthService.cs
│   │   │   ├── IAuditService.cs
│   │   │   ├── IRecordingService.cs
│   │   │   ├── ServiceManager.cs      # Orchestrates WireMock engine layer
│   │   │   ├── MappingService.cs      # File CRUD, Resync, conflict detection
│   │   │   ├── ActivityService.cs     # In-memory log, cap management
│   │   │   ├── SystemEventService.cs
│   │   │   ├── FeatureToggleService.cs
│   │   │   ├── AuthService.cs
│   │   │   ├── AuditService.cs
│   │   │   └── RecordingService.cs    # FR-14–16: debounce, suggestion generation, AcceptSuggestionAsync → auto-saves via MappingService
│   │   │
│   │   ├── Engine/                    # WireMock.NET orchestration
│   │   │   ├── IServicesRegistry.cs
│   │   │   ├── ServicesRegistry.cs    # Dict<Guid, WireMockServer>
│   │   │   ├── IFileWatcher.cs        # Abstraction for FSW — injected in tests for synchronous triggering
│   │   │   ├── EngineStartup.cs       # Startup: load services from DB, start listeners
│   │   │   └── TrackingFileSystemHandler.cs  # implements IFileWatcher; per-service FSW + last-modified tracking
│   │   │
│   │   ├── Hubs/
│   │   │   ├── ActivityHub.cs         # /hubs/activity — ActivityRowAdded
│   │   │   ├── EventsHub.cs           # /hubs/events  — SystemEventCreated, UnreadCountChanged
│   │   │   ├── ServicesHub.cs         # /hubs/services — ServiceStatusChanged
│   │   │   └── TogglesHub.cs          # /hubs/toggles  — FeatureToggleChanged
│   │   │
│   │   ├── Middleware/
│   │   │   ├── GlobalExceptionMiddleware.cs  # Catches all unhandled exceptions → 500 envelope
│   │   │   └── ApiKeyMiddleware.cs           # FR-45 pipeline reset auth
│   │   │
│   │   ├── Exceptions/
│   │   │   ├── FishtankException.cs   # Base: FishtankException(string errorCode, string message)
│   │   │   ├── NotFoundException.cs   # → HTTP 404
│   │   │   ├── ConflictException.cs   # → HTTP 409
│   │   │   ├── ValidationException.cs # → HTTP 400
│   │   │   └── ForbiddenException.cs  # → HTTP 403
│   │   │
│   │   └── wwwroot/                   # Compiled SPA (production only, gitignored)
│   │
│   ├── Fishtank.Api.UnitTests/
│   │   ├── Fishtank.Api.UnitTests.csproj
│   │   ├── Services/
│   │   │   ├── ServiceManagerTests.cs
│   │   │   ├── MappingServiceTests.cs
│   │   │   └── ActivityServiceTests.cs
│   │   └── Engine/
│   │       └── ServicesRegistryTests.cs
│   │
│   ├── Fishtank.Api.IntegrationTests/
│   │   ├── Fishtank.Api.IntegrationTests.csproj
│   │   ├── FishtankWebApplicationFactory.cs  # WebApplicationFactory<Program> + :memory: SQLite + rate limiter disabled
│   │   ├── DatabaseFixture.cs                # Respawn DB reset between tests
│   │   ├── TestAuthHandler.cs                # Injects pre-built JWT cookie — bypasses login for integration tests
│   │   ├── HubConnectionTestHelper.cs        # HubConnection factory using WAF handler; connect→receive→disconnect
│   │   ├── WireMockTestFixture.cs            # IClassFixture; port-0 WireMockServer; IDisposable cleanup
│   │   └── Endpoints/
│   │       ├── ServicesEndpointsTests.cs
│   │       ├── ActivityEndpointsTests.cs
│   │       ├── AuthEndpointsTests.cs
│   │       └── AdminEndpointsTests.cs
│   │
│   └── client/
│       ├── package.json
│       ├── vite.config.ts             # Proxy /api and /hubs to .NET in dev
│       ├── tsconfig.json
│       ├── tsconfig.app.json
│       ├── index.html
│       └── src/
│           ├── main.tsx
│           ├── router.tsx             # All routes — createBrowserRouter
│           ├── App.tsx                # Root layout with auth guard
│           ├── vite-env.d.ts          # Vite env var types (VITE_* prefix)
│           │
│           ├── components/
│           │   ├── ui/                # shadcn/ui generated — never hand-edited
│           │   └── shared/
│           │       ├── Layout.tsx     # Top bar + sidebar shell
│           │       ├── PageHeader.tsx
│           │       └── ErrorBoundary.tsx
│           │
│           ├── features/
│           │   ├── services/
│           │   │   ├── ServicesPage.tsx
│           │   │   ├── ServiceCard.tsx
│           │   │   ├── ServiceTable.tsx
│           │   │   ├── AddServiceModal.tsx
│           │   │   ├── EditServiceModal.tsx
│           │   │   ├── useServices.ts
│           │   │   ├── services.types.ts
│           │   │   └── services.test.tsx
│           │   ├── activity/
│           │   │   ├── ActivityPage.tsx
│           │   │   ├── ActivityLogRow.tsx
│           │   │   ├── ActivityRowDetail.tsx  # Modal / Drawer / BottomPanel
│           │   │   ├── MockSuggestionModal.tsx
│           │   │   ├── useActivityLog.ts      # SignalR append — no React Query
│           │   │   ├── activity.types.ts
│           │   │   └── activity.test.tsx
│           │   ├── mappings/
│           │   │   ├── MappingsPage.tsx
│           │   │   ├── FileTree.tsx
│           │   │   ├── JsonEditor.tsx         # @uiw/react-codemirror
│           │   │   ├── FormEditor.tsx
│           │   │   ├── useMappings.ts
│           │   │   ├── mappings.types.ts
│           │   │   └── mappings.test.tsx
│           │   ├── events/
│           │   │   ├── EventsPage.tsx
│           │   │   ├── NotificationPanel.tsx
│           │   │   ├── useSystemEvents.ts
│           │   │   └── events.types.ts
│           │   ├── auth/
│           │   │   ├── LoginPage.tsx
│           │   │   ├── SetupPage.tsx
│           │   │   ├── useAuth.ts
│           │   │   └── auth.types.ts
│           │   ├── settings/
│           │   │   ├── SettingsPage.tsx
│           │   │   └── useSettings.ts
│           │   └── admin/
│           │       ├── AdminPage.tsx
│           │       ├── ToggleList.tsx
│           │       ├── UserList.tsx
│           │       ├── AuditLog.tsx
│           │       └── useAdmin.ts
│           │
│           └── lib/
│               ├── api.ts             # apiFetch<T>() — all HTTP, envelope unwrapping, 401 redirect
│               ├── queryClient.ts     # QueryClient + HUB_INVALIDATION_MAP
│               ├── signalr.ts         # Hub factory, reconnect, connection state
│               └── constants.ts       # SCREAMING_SNAKE_CASE shared constants
│
├── Dockerfile                         # Multi-stage: node:22-alpine → sdk:10.0-alpine → aspnet:10.0-alpine
├── docker-compose.yml                 # Dev: .NET on :5000, Vite on :5173
├── docker-compose.example.yml         # User-facing: production deployment template
├── docker-compose.test.yml            # CI: full image smoke (Playwright)
├── .env.example                       # All supported env vars with inline comments
├── .gitignore
├── CONTRIBUTING.md
├── SECURITY.md
└── README.md
```

### Requirements to Structure Mapping

| FR Area | Backend | Frontend |
|---|---|---|
| Services Management (FR-1–6) | `Endpoints/ServicesEndpoints.cs`, `Services/ServiceManager.cs`, `Engine/` | `features/services/` |
| Network Activity (FR-7–13) | `Endpoints/ActivityEndpoints.cs`, `Services/ActivityService.cs`, `Hubs/ActivityHub.cs` | `features/activity/` |
| Mock Suggestions & Recording (FR-14–16) | `Endpoints/RecordingEndpoints.cs`, `Services/RecordingService.cs`, `Engine/TrackingFileSystemHandler.cs` | `features/activity/MockSuggestionModal.tsx` → navigates to `features/mappings/MappingEditor.tsx` on accept |
| Mappings & Responses (FR-17–21) | `Endpoints/MappingsEndpoints.cs`, `Services/MappingService.cs`, `Engine/TrackingFileSystemHandler.cs` | `features/mappings/` |
| System Events (FR-22–23) | `Endpoints/EventsEndpoints.cs`, `Services/SystemEventService.cs`, `Hubs/EventsHub.cs` | `features/events/` |
| Auth & Users (FR-24–29) | `Endpoints/AuthEndpoints.cs`, `Services/AuthService.cs`, `Middleware/` | `features/auth/` |
| Admin Console (FR-30–33) | `Endpoints/AdminEndpoints.cs`, `Services/FeatureToggleService.cs`, `Hubs/TogglesHub.cs` | `features/admin/` |
| Deployment (FR-34–42) | `Dockerfile`, `docker-compose*.yml`, `Program.cs` (startup, health) | `vite.config.ts`, `index.html` |
| Settings | `Endpoints/SettingsEndpoints.cs` (`GET /api/settings` — read-only runtime config) | `features/settings/` |
| Management API (FR-43–45) | `Endpoints/ManagementApiEndpoints.cs`, `Endpoints/HealthEndpoints.cs`, `Middleware/ApiKeyMiddleware.cs` | (API consumers — no UI) |

### FR-14–16 Mock Suggestion Acceptance Flow (Decision)

**UX Decision:** Option (b) pre-fill editor with auto-save.

**Flow:**
1. `TrackingFileSystemHandler` captures an unmatched request → calls `RecordingService.GenerateSuggestionAsync()` → stores `SuggestionDto` in-memory, pushes `ActivityRowAdded` event via `ActivityHub`
2. User sees the suggestion badge in the activity log (`MockSuggestionModal.tsx`)
3. User clicks **Accept** → frontend calls `POST /api/services/{serviceId}/recordings/suggestions/{id}/accept`
4. `RecordingService.AcceptSuggestionAsync()` calls `MappingService.SaveAsync(suggestion.Payload, suggestion.SuggestedFilePath)` — the file is **auto-saved immediately**; no user-initiated save step
5. Endpoint returns `{ filePath: string }` (the written path)
6. Frontend navigates to `MappingEditor` with that path — file is already saved; user can inspect and edit further if desired

**`SuggestionDto` shape:**
```csharp
public record SuggestionDto(
    Guid Id,
    Guid ActivityRowId,
    Guid ServiceId,
    string SuggestedFilePath,          // e.g. "GET_api_users_200.json"
    CreateMappingRequest Payload        // ready-to-write WireMock mapping
);
```

**`RecordingEndpoints.cs` routes:**
- `GET  /api/services/{serviceId}/recordings/suggestions` — list pending suggestions
- `POST /api/services/{serviceId}/recordings/suggestions/{id}/accept` — auto-save + return `{ filePath }`
- `DELETE /api/services/{serviceId}/recordings/suggestions/{id}` — dismiss without saving

**Invariants:**
- `AcceptSuggestionAsync` must be idempotent: if suggestion already accepted, return the existing file path (do not overwrite)
- Suggestions are ephemeral in-memory (not persisted to DB); cleared on service restart
- `SuggestedFilePath` is sanitised by `RecordingService` before passing to `MappingService` (no path traversal)

---

### Cross-Cutting Concern Locations

| Concern | Location |
|---|---|
| Response envelope | `Models/Shared/ApiResponse.cs` (backend), `lib/api.ts` (frontend) |
| Auth middleware | `Middleware/` + `Program.cs` JWT setup |
| Global error handling | `Middleware/GlobalExceptionMiddleware.cs` |
| SignalR ↔ RQ seam | `lib/queryClient.ts` `HUB_INVALIDATION_MAP` |
| Audit trail | `Services/AuditService.cs` — called by all mutating service methods |
| Feature toggle reads | `Services/IFeatureToggleService.cs` — injected into any service that gates on a toggle |
| Structured logging | `Program.cs` Serilog setup; injected via `ILogger<T>` throughout |
| EF Core migrations | `Data/Migrations/` — auto-applied via `MigrateAsync()` in `Program.cs` |

### Development Workflow

**Dev server startup:**
```bash
# Terminal 1 — .NET API (port 5000)
cd src/Fishtank.Api && dotnet run

# Terminal 2 — Vite SPA (port 5173, proxies /api and /hubs to :5000)
cd src/client && npm run dev
```

**vite.config.ts proxy (dev only):**
```typescript
server: {
  proxy: {
    '/api': 'http://localhost:5000',
    '/hubs': { target: 'ws://localhost:5000', ws: true }
  }
}
```

**Production (single container):**
Vite builds to `src/client/dist/` → Dockerfile copies to `wwwroot/` → `app.UseStaticFiles()` + `app.MapFallbackToFile("index.html")` serve the SPA from the .NET process.

### Environment Variables (.env.example reference)

| Variable | Required | Default | Description |
|---|---|---|---|
| `FISHTANK_MOCKS_ROOT` | ✅ | — | Absolute path to mocks directory (volume mount target) |
| `FISHTANK_JWT_SECRET` | ✅ | — | JWT HMAC-SHA256 signing key (min 32 chars) |
| `FISHTANK_PORT` | No | `5000` | Management UI + API port |
| `FISHTANK_DB_PATH` | No | `/app/data/fishtank.db` | SQLite database file path |
| `FISHTANK_JWT_EXPIRY_MINUTES` | No | `1440` | JWT token lifetime (24h default; invalidated on restart) |
| `FISHTANK_PORT_RANGE_START` | No | `30100` | First port in service port range |
| `FISHTANK_PORT_RANGE_END` | No | `30199` | Last port in service port range (max 100 services) |
| `FISHTANK_LOGIN_RATE_LIMIT` | No | `5` | Max login attempts per window |
| `FISHTANK_LOGIN_RATE_WINDOW_SECONDS` | No | `60` | Rate limit window size in seconds |
| `FISHTANK_ALLOWED_ORIGINS` | No | _(self-origin only)_ | Comma-separated extra CORS origins |
| `FISHTANK_PIPELINE_RESET_KEY` | No | _(disabled)_ | API key for `POST /admin/reset`; endpoint returns 403 if unset |
| `FISHTANK_DEBUG_ERRORS` | No | `false` | Include `details` field in error responses |

**Rules:**
- `FISHTANK_MOCKS_ROOT` and `FISHTANK_JWT_SECRET` are required at runtime; container exits with a descriptive error if either is missing
- Secrets (`FISHTANK_JWT_SECRET`, `FISHTANK_PIPELINE_RESET_KEY`) must never be committed — use Docker secrets or `.env` excluded from version control
- `GET /api/settings` returns a read-only view of non-secret configuration (port range, rate limit config, version, uptime) — no write API in v1

---

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:** All technology choices are mutually compatible. React 18 + Vite + TypeScript + shadcn/ui + Tailwind v4 are a well-tested frontend stack. .NET 10 + EF Core + ASP.NET Core SignalR + WireMock.NET are all pure managed .NET — no native dependency conflicts in Alpine. JWT httpOnly cookies integrate natively with the built-in `AddAuthentication(JwtBearer)` + `AddRateLimiter` pipeline. SQLite `:memory:` is EF Core’s official integration test pattern and does not conflict with GUID-as-TEXT storage.

**Pattern Consistency:** Naming conventions are internally consistent across all layers (DB, API, frontend). The `apiFetch<T>()` → `HUB_INVALIDATION_MAP` seam is structurally enforced — a single `lib/api.ts` and `lib/queryClient.ts` own their respective concerns. `FishtankException` subclasses → `GlobalExceptionMiddleware` → HTTP status → `ApiError` → component forms a complete, unambiguous error chain across all layers.

**Structure Alignment:** Every FR category maps to exactly one `Endpoints/` file (routing), one or more `Services/` implementations (business logic), and one `features/` folder (frontend). `Engine/` is isolated — `ServiceManager.cs` coordinates WireMock instances through `IServicesRegistry` without leaking engine details into the application service layer. `Exceptions/` is co-located in the API project with typed subclasses mapping directly to HTTP status codes.

### Requirements Coverage Validation ✅

| FR Area | Architectural Support | Status |
|---|---|---|
| Services Management (FR-1–6) | ServicesEndpoints + ServiceManager + Engine/ + features/services/ | ✅ |
| Network Activity (FR-7–13) | ActivityEndpoints + ActivityService + ActivityHub + features/activity/ | ✅ |
| Mock Suggestions & Recording (FR-14–16) | RecordingEndpoints + RecordingService + TrackingFileSystemHandler + MockSuggestionModal | ✅ |
| Mappings & Responses (FR-17–21) | MappingsEndpoints + MappingService + FSW conflict detection + features/mappings/ | ✅ |
| System Events (FR-22–23) | EventsEndpoints + SystemEventService + EventsHub + features/events/ | ✅ |
| Auth & Users (FR-24–29) | AuthEndpoints + AuthService + JWT middleware + features/auth/ | ✅ |
| Admin Console (FR-30–33) | AdminEndpoints + FeatureToggleService + TogglesHub + features/admin/ | ✅ |
| Deployment (FR-34–42) | Dockerfile + docker-compose* + Program.cs startup + health endpoint | ✅ |
| Management API (FR-43–45) | ManagementApiEndpoints + HealthEndpoints + ApiKeyMiddleware | ✅ |
| Settings (read-only config) | SettingsEndpoints (`GET /api/settings`) + features/settings/ | ✅ |

**NFR Coverage:** NFR-3 (<500ms activity push) → SignalR direct hub push, no polling. NFR-5 (per-service fault isolation) → independent `WireMockServer` instances per `ServicesRegistry` entry. NFR-6 (10s container start) → Alpine minimal image + SQLite auto-migrate completes in milliseconds. NFR-10/NFR-16 (rate limit + httpOnly cookie) → explicitly configured in `Program.cs`. NFR-17/18 (structured JSON stdout) → Serilog `Compact` formatter. NFR-19–21 (WCAG 2.1 AA, 4 themes, reduced motion) → shadcn/ui CSS variable token system + Tailwind v4 supports theme switching at component level.

### Implementation Readiness Validation ✅

**Decision Completeness:** All 8 decisions documented with version-pinned packages, code snippets, and rationale. Implementation sequence in Decision Impact Analysis gives a safe ordering that avoids blocked stories (DB → Auth → Engine → REST → SignalR → RQ seam → FSW).

**Structure Completeness:** Every file expected in v1 is named. FR-to-directory mapping covers all 9 FR areas plus settings. All `Exceptions/` subclasses map to documented HTTP status codes. All `Models/` DTO subfolders are defined. `Exceptions/`, `Models/Admin/`, `IRecordingService`, `SettingsEndpoints`, and `.env.example` content were identified and resolved during validation before saving.

**Pattern Completeness:** Naming, structure, format, communication, error handling, loading state, and testing patterns are all specified. The SignalR → React Query seam is explicitly contracted via `HUB_INVALIDATION_MAP`. All `FISHTANK_*` environment variables are enumerated with required flags and defaults.

### Gap Analysis Results

All gaps identified during validation were resolved before this section was saved:

- ✅ `IRecordingService.cs` + `RecordingService.cs` added to `Services/`
- ✅ `SettingsEndpoints.cs` + `GET /api/settings` added; `features/settings/` already present
- ✅ `Models/Admin/` subfolder added with `UserDto.cs`, `AuditEntryDto.cs`, `FeatureToggleDto.cs`
- ✅ `.env.example` content fully enumerated (12 `FISHTANK_*` vars with required flags and defaults)
- ✅ `Exceptions/` folder added with typed subclasses (`NotFoundException`, `ConflictException`, `ValidationException`, `ForbiddenException`) mapping to HTTP status codes
- ✅ `vite-env.d.ts` added to `src/client/src/`

**No remaining gaps.**

### Architecture Completeness Checklist

**Requirements Analysis**

- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**Architectural Decisions**

- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**Implementation Patterns**

- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**Project Structure**

- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High

**Key Strengths:**
- Single responsibility enforced at every layer boundary (Endpoints / Services / Engine / Exceptions / Data / Models)
- Real-time seam explicitly contracted — no ambiguity in how SignalR events interact with React Query cache
- Zero-ops deployment model (auto-migrate + single container) matches the self-hosted tool use case exactly
- Error handling chain is fully typed end-to-end: typed exception → middleware → HTTP status → `ApiError` → component
- Environment variables fully enumerated before first implementation story
- Testing strategy is layered (fast unit → integration → smoke) matching solo developer CI cadence

**Areas for Future Enhancement:**
- Postgres substitution path (post-v1): swap EF Core SQLite provider, run migration comparison test
- Horizontal scaling (post-v1): replace SQLite with Postgres + move SignalR to Redis backplane
- OIDC/SSO (post-v1): extend `AuthService` to accept external identity tokens
- Refresh token endpoint (post-v1): currently tokens invalidate on container restart by design

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented — do not introduce patterns not defined here
- Use naming conventions from Implementation Patterns for every new file, class, method, and field
- Respect the Endpoints → Services → Engine → Data dependency direction — no skipping layers
- Throw typed exceptions from `Exceptions/` — never raw `Exception` or magic HTTP status codes in service layer
- Consult this document for all architectural questions before introducing new patterns

**First Implementation Story:** Initialize the repository — run all starter template commands, install all packages, verify both dev servers start cleanly, commit the empty-but-wired project structure as the baseline for all subsequent stories.
