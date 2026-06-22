---
project_name: 'Fishtank'
user_name: 'Nico'
date: '2026-06-19'
sections_completed: ['technology_stack', 'api_patterns', 'frontend', 'backend', 'testing', 'naming', 'structure', 'error_handling', 'anti_patterns']
source: '_bmad-output/planning-artifacts/architecture.md'
---

# Project Context for AI Agents

_Critical rules and patterns for implementing Fishtank v1. Focuses on unobvious details that agents might otherwise miss. All decisions are final unless explicitly reopened._

---

## Technology Stack & Versions

### Backend
- **Language:** C# 13, .NET 10.0 LTS — SDK `10.0.301`
- **API style:** ASP.NET Core Minimal APIs with endpoint groups (no controllers)
- **ORM:** EF Core + `Microsoft.EntityFrameworkCore.Sqlite` — auto-migrate at startup via `MigrateAsync()`
- **Real-time:** `Microsoft.AspNetCore.SignalR`
- **Mock engine:** `WireMock.Net` — pinned to a specific **minor** version at init; patch upgrades automatic, minor requires changelog review
- **Auth:** `Microsoft.AspNetCore.Authentication.JwtBearer` — tokens in **httpOnly cookies only**
- **Logging:** Serilog — `Serilog.AspNetCore` + `Serilog.Sinks.Console` + `Serilog.Formatting.Compact` (JSON stdout). No file sinks — Docker logs to stdout
- **Testing:** xUnit + `Microsoft.AspNetCore.Mvc.Testing` + Respawn + FluentAssertions

### Frontend
- **Runtime:** Node.js ≥20.19
- **Language:** TypeScript — strict mode always on
- **Build:** Vite (Rolldown bundler) — `npm create vite@latest client -- --template react-ts`
- **UI:** React 18 + shadcn/ui + Tailwind CSS v4 (CSS variable theming)
- **Path alias:** `@/` → `./src/`
- **Real-time:** `@microsoft/signalr`
- **State:** `@tanstack/react-query` (server state); no global client-state library
- **Editor widget:** `@uiw/react-codemirror` + `@codemirror/lang-json` + `@codemirror/theme-one-dark`
- **Routing:** `react-router-dom` v6+ with `createBrowserRouter` (history mode)
- **Testing:** Vitest + `@testing-library/react` + `@testing-library/user-event` + jsdom + `msw` (mandatory) + `@vitest/coverage-v8`

---

## API Patterns

### Response Envelope — always wrap
```json
{ "success": true, "data": { } }
{ "success": false, "error": { "code": "SERVICE_PORT_CONFLICT", "message": "...", "details": "..." } }
{ "success": true, "data": null }   // void operations (DELETE, POST /start, POST /stop)
```
- `data` is always present on success, even when `null`
- `error.code` is always a defined screaming-snake-case constant — never free-form
- `details` omitted in production unless `FISHTANK_DEBUG_ERRORS=true`
- **Exceptions:** `/health` and `/openapi/v1.json` return plain responses (no envelope)

### Error Code Prefixes
`SERVICE_*` · `AUTH_*` · `MAPPING_*` · `ENGINE_*` · `SYSTEM_*` · `ADMIN_*`

### HTTP Status Mapping
`400` validation · `401` unauthenticated · `403` forbidden · `404` not found · `409` conflict · `429` rate limited · `500` unexpected

### Frontend `apiFetch<T>()` — always use this, never raw `fetch`
```typescript
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, { credentials: 'include', ...options });
  const body = await res.json();
  if (!body.success) throw new ApiError(body.error.code, body.error.message);
  return body.data as T;
}
```
- `credentials: 'include'` always set — JWT lives in httpOnly cookie
- `401` from any call → redirect to `/login` handled here, not in components

---

## Frontend Rules

### React Query + SignalR Seam (`lib/queryClient.ts`)
```typescript
const HUB_INVALIDATION_MAP = {
  'ServiceStatusChanged': [['services']],
  'FeatureToggleChanged':  [['toggles']],
  'ResyncCompleted':       [['mappings', 'tree']],
} satisfies Record<string, QueryKey[]>;
```
- **Never** invalidate React Query cache inside a component — always via `HUB_INVALIDATION_MAP`
- This map must be defined before the first component is written
- **Activity log is the single exception:** `features/activity/useActivityLog.ts` uses SignalR append only — `// DO NOT useQuery here`. A `useQuery` call on the activity feed would poll stale data and break the push model

### Loading State
- Server data loading → React Query `isLoading` / `isFetching` — **never** `useState(false)`
- Optimistic updates: **Service enable/disable toggle only** (FR-3) — all other mutations wait for server confirmation
- SignalR connection state `connecting | connected | reconnecting | disconnected` managed in `lib/signalr.ts` only

### Component Structure
- Each feature folder (`features/{feature}/`) is self-contained: page, components, hooks, types — **no cross-feature imports**
- `components/ui/` — shadcn/ui generated — **never hand-edit**
- `components/shared/` — shared non-shadcn components
- All routes defined in `router.tsx` — features export page components only
- All API calls go through `lib/api.ts` — never raw `fetch` in components or hooks

### `data-testid` — mandatory on every interactive and structural element
- **Every** interactive element (buttons, inputs, toggles, links, form fields) and every key structural container (list containers, cards, drawers, modals, banners, page headers, empty states) **must** carry a `data-testid` attribute
- `data-testid` values are **never** used for styling — CSS classes only for style, `data-testid` only for test selectors
- Canonical `data-testid` values are defined in `_bmad-output/planning-artifacts/ux-designs/ux-Fishtank-2026-06-04/DESIGN.md` under `## data-testid convention` — use those values verbatim; do **not** invent new names
- **Pattern for dynamic elements:** `{element-type}-{entity-slug-or-id}` (e.g. `service-card-payments-mock`, `service-toggle-payments-mock`)
- If a story's DESIGN.md spec omits a `data-testid` for an element you are implementing, **add one** following the naming pattern and note it in the PR — never skip silently
- Playwright E2E tests rely exclusively on `data-testid` selectors — missing attributes will cause E2E test failures

### SignalR Hub Events (PascalCase past-tense)
| Hub | Event | Payload |
|---|---|---|
| `/hubs/activity` | `ActivityRowAdded` | `ActivityRow` DTO |
| `/hubs/events` | `SystemEventCreated` | `SystemEvent` DTO |
| `/hubs/events` | `UnreadCountChanged` | `{ count: number }` |
| `/hubs/services` | `ServiceStatusChanged` | `{ id: string, status: "live" \| "stopped" }` |
| `/hubs/toggles` | `FeatureToggleChanged` | `{ name: string, enabled: boolean }` |

- Reconnect logic lives in `lib/signalr.ts` only — never in feature hooks
- All hubs require JWT auth via cookie (`withCredentials`) — no query-string token

---

## Backend Rules

### Startup
- `MigrateAsync()` in `Program.cs` wrapped in `try/catch` — on failure: structured Serilog error with `{DbPath}` + `{Exception}`, then re-throw for non-zero exit. Never swallow silently
- `FISHTANK_MOCKS_ROOT` and `FISHTANK_JWT_SECRET` are required — container exits with descriptive error if missing

### Architecture Boundaries
- Endpoints register routes only — **no business logic in endpoint handlers**
- Business logic lives in `Services/` — endpoints call services, services call EF Core directly
- EF Core entities (`Data/Entities/`) are **never** returned from endpoints — always map to DTOs (`Models/`)

### Auth
- JWT stored in **httpOnly cookies** — not localStorage, not sessionStorage, not Authorization header
- Cookie: `HttpOnly: true`, `SameSite: Strict`, `Secure: true` (behind TLS proxy)
- **SignalR + cookies:** httpOnly cookies are included in WebSocket upgrade requests natively — **no `accessTokenFactory` or query-string token workaround needed**. `SameSite: Strict` is safe because SPA and API serve from same origin in production

### Rate Limiting
- `FixedWindowLimiter` applied to `POST /api/auth/login` only
- Threshold + window configurable via `FISHTANK_LOGIN_RATE_LIMIT` / `FISHTANK_LOGIN_RATE_WINDOW_SECONDS`
- Returns `429` with `Retry-After` header

### EF Core / SQLite
- All PKs are `Guid` — EF generates; stored as `TEXT` in SQLite
- Slug unique index enforced at **DB level** (unique index on `Services.Slug`) — not only application code
- `Service.cs` entity has `DeletedAt DateTimeOffset?` (null = active) — all queries filter `WHERE DeletedAt IS NULL`
- Migrations live in `Data/Migrations/` — committed to source control, **never hand-edited**

### InternalsVisibleTo — must be added in story 1
```xml
<ItemGroup>
  <InternalsVisibleTo Include="Fishtank.Api.IntegrationTests" />
</ItemGroup>
```
Without this, `WebApplicationFactory<Program>` cannot see `Program.cs` (internal by default in top-level statement style).

### FileSystemWatcher
- One `IFileWatcher` per Service folder — implemented by `TrackingFileSystemHandler.cs`
- Conflict definition: file open in editor + `LastWriteTime` on disk advanced past the timestamp recorded at editor load. Byte-identical rewrites do NOT trigger a conflict. WireMock route conflicts (duplicate method+path) are a separate validation error
- README must document: `--sysctl fs.inotify.max_user_watches=65536` on `docker run` if watch exhaustion is observed (default 8192; 100 services ≈ 200 watches — safe normally, but heavy IDE usage on the host can exhaust the pool)

### FR-14–16 Mock Suggestion Acceptance Flow
1. User clicks Accept on a suggestion in the activity log
2. Frontend calls `POST /api/services/{serviceId}/recordings/suggestions/{id}/accept`
3. `RecordingService.AcceptSuggestionAsync()` calls `MappingService.SaveAsync()` — file is **auto-saved immediately**
4. Endpoint returns `{ filePath: string }`
5. Frontend navigates to `MappingEditor` with that path — file already saved; user can edit further
- `AcceptSuggestionAsync` must be idempotent — if already accepted, return existing file path (no overwrite)
- Suggestions are ephemeral in-memory — not persisted to DB; cleared on service restart
- `SuggestedFilePath` is sanitised by `RecordingService` before passing to `MappingService` (no path traversal)

---

## Naming Conventions

### C#
| Element | Convention |
|---|---|
| Types, methods, properties | PascalCase |
| Parameters, locals | camelCase |
| Private fields | `_camelCase` |
| Async methods | `{Name}Async` suffix |
| Endpoint group classes | `{Feature}Endpoints` |

### TypeScript / React
| Element | Convention |
|---|---|
| React components | PascalCase (`ServiceCard.tsx`) |
| Hooks | `use` prefix, camelCase (`useServices.ts`) |
| Utility files | camelCase (`api.ts`, `queryClient.ts`) |
| Types/interfaces | PascalCase (`Service`, `ApiError`) |
| Constants | SCREAMING_SNAKE_CASE |
| CSS | Tailwind utility classes only — no custom CSS classes unless absolutely necessary |

### REST & JSON
- Resource nouns: plural (`/api/services`, `/api/users`)
- Path params: GUID as `{id}`
- Action sub-paths: verb after resource (`/api/services/{id}/start`)
- Query params: camelCase
- All JSON fields: camelCase (System.Text.Json default)
- Error codes: SCREAMING_SNAKE_CASE, feature-prefixed

### Database
- Tables: plural PascalCase (`Services`, `Users`)
- Columns: PascalCase (EF property names)
- FKs: `{Entity}Id` (`ServiceId`, `UserId`)

---

## Error Handling

### Backend Exception Hierarchy
`FishtankException` (base, carries `errorCode` + `message`) →
- `NotFoundException` → 404
- `ConflictException` → 409
- `ValidationException` → 400
- `ForbiddenException` → 403

- Global exception middleware registered **before all other middleware**
- Business rule violations: throw typed exception from services; `GlobalExceptionMiddleware` maps to envelope

### Frontend
- React Query `onError` receives typed `ApiError` — components display `error.message` directly
- Global error boundary at router level for unhandled render errors
- Toast notifications for transient errors (save failed, Resync failed)
- `401` → redirect to `/login` handled in `apiFetch<T>()` — not in components or hooks

---

## Definition of Done — Per Story

A story is `done` only when **all** of the following are true:

| # | Gate | Verified by |
|---|---|---|
| 1 | All ATDD acceptance tests pass (green) | `playwright test` / `dotnet test` |
| 2 | All backend integration tests pass | `dotnet test src/Fishtank.Api.IntegrationTests` |
| 3 | TypeScript builds clean — 0 errors | `npm run build` in `src/client` |
| 4 | .NET builds clean — 0 errors, 0 warnings | `dotnet build src/Fishtank.slnx` |
| 5 | Every new interactive/structural UI element has a `data-testid` | Code review — see Frontend Rules |
| 6 | msw handlers updated in the same PR if any API contract changed | Code review |
| 7 | No new critical anti-patterns from the Anti-Patterns table below | Code review |
| 8 | Story status set to `done` in `_bmad-output/implementation-artifacts/sprint-status.yaml` | Manual / agent |
| 9 | If last story in an epic: epic status set to `done` in `sprint-status.yaml` | Manual / agent |

**Story status lifecycle** (edit `sprint-status.yaml` at each transition):
- `backlog` → story only exists in `epics.md`
- `ready-for-dev` → story file created by `bmad-create-story`; epic flips to `in-progress`
- `in-progress` → set when `bmad-dev-story` is activated; ATDD scaffold must exist first
- `review` → set when implementation complete; triggers `bmad-code-review` (fresh context recommended)
- `ready-for-testing` → set when code review passes with no blockers; story waits for `bmad-testarch-automate` to be activated (by agent or manually)
- `in-test` → set by `bmad-testarch-automate` at activation; test automation runs, coverage and ATDD assertions evaluated
- `done` → set after all DoD gates pass; if last story in epic, set epic to `done`

**Bug-fix loop** (after test failures in `in-test`):
- Analyze failing tests → root cause
- Use `bmad-quick-dev` (targeted fix) — or reopen `bmad-dev-story` if rework is significant (agent decides based on scope)
- Status reverts: `in-test` → `in-progress` → `review` → `ready-for-testing` → `in-test`
- Max 2 `bmad-quick-dev` cycles before marking story `blocked` and escalating to Nico

---

## Testing Rules

### Layers
| Layer | Tool | Location |
|---|---|---|
| Backend unit | xUnit | `src/Fishtank.Api.UnitTests/` — no I/O |
| Backend integration | xUnit + WebApplicationFactory | `src/Fishtank.Api.IntegrationTests/` — SQLite `:memory:`, Respawn |
| Frontend component | Vitest + Testing Library | Co-located `*.test.tsx` in feature folders — msw for API mocking |
| E2E smoke | Playwright | `src/client/tests/e2e/` — runs against live stack (Vite dev server + .NET API) |

### E2E Playwright — Backend Mocking Policy

**Default: no mocking.** E2E tests (`src/client/tests/e2e/`) run against the live stack. `page.route()` interceptors are **only permitted** for the specific cases below.

| ✅ Legitimate `page.route()` use | Reason |
|---|---|
| Forcing `GET /api/setup/status → needsSetup:true` | Requires zero-user DB — can't be reproduced against a shared test backend that has already completed setup |
| Fault injection: 500, timeout, network error | Hard/impossible to trigger deterministically from a real backend in CI |
| Non-deterministic real-time data (network activity sniffing, SignalR push sequences) | The source data is live traffic — not reproducible without a real target service making real requests |

| ❌ Forbidden `page.route()` use | Use instead |
|---|---|
| Simulating an authenticated session | `storageState` from `global-setup.ts` / `seedAuthStorageState()` |
| Mocking `GET /api/auth/me` to appear logged in | `storageState` |
| Mocking `POST /api/auth/login` (happy path) | Hit the real backend — this is the core flow |
| Mocking `POST /api/auth/logout` | Hit the real backend |
| Mocking `POST /api/auth/setup` (happy path) | Hit the real backend |
| Mocking `GET /api/setup/status → needsSetup:false` | Real backend returns this naturally once setup is done |
| Mocking any CRUD endpoint (services, mappings, users…) | Hit the real backend |

**Why this matters:** Mocking the backend in E2E tests is the same as not running them end-to-end. A test that mocks `auth/me` to return 200 does not verify that the JWT cookie is valid, that the backend is running, or that auth middleware is wired correctly. The bug where the first-run setup page returned empty fields was caused by exactly this — the AC-5 E2E test mocked the backend and passed as a false positive.

**Required infrastructure (enable before writing real E2E tests):**
- Uncomment `await seedAuthStorageState()` in `src/client/tests/support/global-setup.ts`
- Uncomment `storageState: './playwright/.auth/user.json'` in `src/client/playwright.config.ts`
- Set `TEST_USER`, `TEST_PASS`, and `API_URL` in the test environment (`.env.test` or CI secrets)
- E2E tests must run against a backend that has already completed `POST /api/auth/setup` (seeded in global-setup)

### Critical Rules
- Integration tests use `WebApplicationFactory<Program>` — **never** spin up a real HTTP server manually
- Every new endpoint → minimum one integration test (happy path + one error path)
- msw handlers must be updated in the **same PR** as any API contract change
- **Rate limiter:** `FishtankWebApplicationFactory` disables `FixedWindowLimiter` via `IOptions<RateLimiterOptions>` override — prevents non-deterministic `429` in CI
- **Cookie auth in tests:** Use `TestAuthHandler` to inject pre-built JWT cookie — do NOT call the real login endpoint in every test; one test verifies the auth endpoint end-to-end
- **SignalR hub tests:** Use `HubConnectionTestHelper` with WAF `CreateHandler()`. One connect→receive→disconnect test per hub before any hub story ships. Cookies forwarded natively — no query-string workaround
- **WireMock in tests:** Use `WireMockTestFixture` (`IClassFixture`) with port-0 dynamic allocation + `IDisposable` cleanup. **Never** share a `WireMockServer` across parallel test classes
- **FSW tests:** Inject `IFileWatcher` fake; trigger callbacks synchronously. **Never** `Task.Delay` to wait for OS events
- **HUB_INVALIDATION_MAP drift guard:** Unit test asserts every hub event string in `lib/signalr.ts` has a corresponding key in `HUB_INVALIDATION_MAP`
- **FR-3 optimistic rollback:** Integration test must cover toggle fires → server 500 → UI reverts (not just happy path)
- **E2E activity log:** Playwright: create service → wait for `ActivityRowAdded` → assert ≥1 row (tests FSW → ActivityService → ActivityHub chain)

---

## Critical Anti-Patterns (Never Do These)

| ❌ Anti-pattern | ✅ Correct |
|---|---|
| Raw `fetch()` in component or hook | `apiFetch<T>()` from `lib/api.ts` |
| `useState(false)` for server-loading state | React Query `isLoading` / `isFetching` |
| `useQuery` in `useActivityLog.ts` | SignalR append only — `// DO NOT useQuery here` |
| `queryClient.invalidateQueries()` inside a component | Always via `HUB_INVALIDATION_MAP` in `lib/queryClient.ts` |
| Cross-feature imports in `features/` | Shared code goes in `components/shared/` or `lib/` |
| Hand-editing `components/ui/` (shadcn) | Regenerate via `npx shadcn@latest` |
| Business logic in endpoint handlers | Move to `Services/` layer |
| Returning EF entities directly from endpoints | Map to DTOs in `Models/` |
| Silently swallowing `MigrateAsync()` failure | `try/catch` → Serilog error → re-throw |
| `accessTokenFactory` for SignalR auth | httpOnly cookies work natively with WebSocket upgrades |
| `Task.Delay` in FSW tests | Inject `IFileWatcher` fake; trigger synchronously |
| Sharing `WireMockServer` across parallel test classes | Use `WireMockTestFixture` per class with port-0 |
| `page.route()` to mock auth/me, auth/login, or CRUD endpoints in E2E tests | Use `storageState` for session; hit real backend for flows |
| Adding test entries to `CHANGELOG.md` (unit tests added, integration tests, E2E tests, test coverage) | CHANGELOG records user-facing changes only — endpoints, features, behavior, entities; never test implementation details |
| Storing JWT in localStorage or sessionStorage | httpOnly cookie only |
| File sinks in Serilog | Console sink only — Docker logs to stdout |
| Slug uniqueness enforced only in application code | DB-level unique index on `Services.Slug` |

---

## Date / Time
- All API fields: ISO 8601 UTC — `"2026-06-19T14:32:00.000Z"`
- Display: `Intl.DateTimeFormat` in frontend (user local timezone)
- Never: Unix timestamps or non-UTC strings in API payloads

## Docker Notes
- Multi-stage Alpine throughout: `node:22-alpine` → `mcr.microsoft.com/dotnet/sdk:10.0-alpine` → `mcr.microsoft.com/dotnet/aspnet:10.0-alpine`
- Runtime stage requires: `RUN apk add --no-cache libgcc libstdc++` (SQLite native binary dependency)
- Non-root user `fishtank` — `addgroup -S fishtank && adduser -S fishtank -G fishtank`
- v1 serves plain HTTP — TLS is the reverse proxy's responsibility

## Development Server
```bash
# Terminal 1 — .NET API (port 5000)
cd src/Fishtank.Api && dotnet run

# Terminal 2 — Vite SPA (port 5173, proxies /api and /hubs to :5000)
cd src/client && npm run dev
```
Vite proxy config (dev only): `/api` → `http://localhost:5000`; `/hubs` → `ws://localhost:5000` (ws: true)
