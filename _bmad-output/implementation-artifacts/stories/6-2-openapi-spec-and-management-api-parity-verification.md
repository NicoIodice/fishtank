---
story_key: 6-2-openapi-spec-and-management-api-parity-verification
epic_id: epic-6
title: OpenAPI Spec & Management API Parity Verification
status: ready-for-dev
created: 2026-07-11
frs: [FR-43, FR-44, FR-36]
nfrs: []
risk_links: [R-E6-003]
test_design: _bmad-output/test-artifacts/test-design/test-design-epic-6.md
---

# Story 6-2: OpenAPI Spec & Management API Parity Verification

## User Story

**As an** open-source contributor or API integrator,
**I want** a complete and accurate OpenAPI specification served from the running container,
**So that** I can understand and integrate with the Fishtank Management API without reading .NET source code.

---

## Acceptance Criteria

### OpenAPI Endpoint Availability

1. **Given** the running Fishtank container (any environment — Development, Testing, **or Production**),
   **When** `GET /openapi/v1.json` is called,
   **Then** a valid OpenAPI 3.x specification is returned with `Content-Type: application/json` (FR-44).
   > **⚠️ Critical fix required:** `app.MapOpenApi()` is currently registered inside `if (app.Environment.IsDevelopment() || app.Environment.IsEnvironment("Testing"))` in `Program.cs` (line ~284–287). It must be moved **outside** this block so the spec is served in Production. Only `app.MapTestEndpoints()` should stay inside the dev/test guard.

2. **Given** `GET /openapi/v1.json`,
   **Then** no authentication is required — the endpoint responds to unauthenticated requests (FR-44).
   > This is already enforced by the framework since OpenAPI routes bypass auth middleware. Verify with an integration test.

### Response Envelope Documentation

3. **Given** the OpenAPI spec,
   **Then** the standard response envelope is documented as a generic wrapper type. Every endpoint's `200` response references a typed `ApiResponse<T>` schema, not a raw payload:
   ```json
   // Success
   { "success": true, "data": { /* typed per-endpoint */ } }
   // Error
   { "success": false, "error": { "code": "SERVICE_*", "message": "..." } }
   // Void success
   { "success": true, "data": null }
   ```
   All `4xx` responses reference a shared `ApiErrorResponse` schema.

4. **Given** the OpenAPI spec error schemas,
   **Then** all error codes for each endpoint are documented. Codes follow feature-prefixed screaming snake case:
   - `SERVICE_*` — Services management errors
   - `AUTH_*` — Authentication errors
   - `MAPPING_*` — Mapping/Response file errors
   - `ENGINE_*` — WireMock engine errors
   - `SYSTEM_*` — Infrastructure/startup errors
   - `ADMIN_*` — Admin Console errors

### OpenAPI Tagging & Descriptions

5. **Given** the OpenAPI spec,
   **Then** every endpoint has a non-empty `.WithTags(...)` tag assignment grouping it with its feature area:
   - `Auth` — `/api/auth/*`
   - `Services` — `/api/services/*`
   - `Activity` — `/api/activity`
   - `Mappings` — `/api/mappings/*`, `/api/resync`
   - `Events` — `/api/events`
   - `Users` — `/api/users/*`
   - `Admin` — `/api/admin/*`
   - `Settings` — `/api/settings`
   - `Cache` — `/api/cache/*` (if present)

6. **Given** the OpenAPI spec,
   **Then** every endpoint has a non-empty `.WithSummary(...)` (one-line description, sentence-case) and `.WithDescription(...)` where behavior is non-obvious (auth requirements, side effects, idempotency, etc.).

### FR-43 Parity Audit

7. **Given** the full list of UI operations implemented in Epics 2–5 plus Story 6-1,
   **When** audited against the complete endpoint list in the Architecture doc,
   **Then** every UI operation has a corresponding documented REST endpoint in the served OpenAPI spec. The following endpoints must all be present and documented:

   | Method | Path | Feature |
   |--------|------|---------|
   | `POST` | `/api/auth/login` | Auth — login |
   | `POST` | `/api/auth/logout` | Auth — logout |
   | `POST` | `/api/auth/setup` | Auth — first-run setup |
   | `PUT` | `/api/auth/change-password` | Auth — forced password change |
   | `GET` | `/api/services` | Services — list |
   | `POST` | `/api/services` | Services — create |
   | `GET` | `/api/services/{id}` | Services — get by GUID |
   | `PUT` | `/api/services/{id}` | Services — update |
   | `POST` | `/api/services/{id}/start` | Services — start engine |
   | `POST` | `/api/services/{id}/stop` | Services — stop engine |
   | `POST` | `/api/services/import` | Services — seed file import |
   | `GET` | `/api/services/next-port` | Services — next available port |
   | `GET` | `/api/activity` | Activity — query log |
   | `DELETE` | `/api/activity` | Activity — clear log |
   | `GET` | `/api/mappings` | Mappings — folder tree |
   | `GET` | `/api/mappings/{path}` | Mappings — read file |
   | `POST` | `/api/mappings` | Mappings — create file |
   | `PUT` | `/api/mappings/{path}` | Mappings — save file |
   | `DELETE` | `/api/mappings/{path}` | Mappings — delete file |
   | `POST` | `/api/resync` | Mappings — resync from disk |
   | `GET` | `/api/events` | System Events — query |
   | `GET` | `/api/users` | Users — list (Admin only) |
   | `POST` | `/api/users` | Users — create (Admin only) |
   | `PUT` | `/api/users/{id}/deactivate` | Users — deactivate (Admin only) |
   | `GET` | `/api/admin/toggles` | Admin — list feature toggles |
   | `PUT` | `/api/admin/toggles/{name}` | Admin — set feature toggle |
   | `GET` | `/api/admin/health` | Admin — health dashboard |
   | `GET` | `/api/admin/audit` | Admin — audit log |
   | `POST` | `/api/admin/reset` | Admin — pipeline reset (API key auth) |
   | `GET` | `/api/settings` | Settings — runtime config |
   | `GET` | `/api/cache` | Cache — list (if implemented) |
   | `DELETE` | `/api/cache/{id}` | Cache — clear service (if implemented) |
   | `DELETE` | `/api/cache` | Cache — clear all (if implemented) |
   | `GET` | `/health` | Health check (no auth) |
   | `GET` | `/openapi/v1.json` | OpenAPI spec (no auth) |

   > **Audit process:** Call `GET /openapi/v1.json` from a running container and check that every path above appears in the `paths` object. Any missing endpoint = parity gap to fix before closing this story.

### Committed Spec & CI Parity Check

8. **Given** the OpenAPI spec file,
   **Then** it is exported and committed to the repository as `docs/openapi.json`. This file is kept in sync with the served spec.

9. **Given** a CI run on any branch,
   **Then** a CI step validates that `docs/openapi.json` (committed) matches the spec served by the running container. Diff detected → CI step fails with a clear message: "OpenAPI spec has changed — run `dotnet run` + export to `docs/openapi.json` and commit the updated file."
   > Implementation approach: During CI, start the app, download `/openapi/v1.json`, `diff` against `docs/openapi.json`. A non-empty diff fails the step.

### FR-36 Environment Variable Documentation Audit

10. **Given** the complete list of runtime env vars from FR-36,
    **When** audited against `README.md`'s env var reference table AND `docker-compose.example.yml`,
    **Then** every env var listed below appears as a documented comment-or-entry in **both** places:

    | Env Var | Description |
    |---------|-------------|
    | `FISHTANK_JWT_SECRET` | JWT signing secret (≥32 chars required) |
    | `FISHTANK_MANAGEMENT_PORT` | Management UI port (default: 5000) |
    | `FISHTANK_DB_PATH` | SQLite database file path |
    | `FISHTANK_MOCKS_ROOT` | WireMock mappings root path |
    | `FISHTANK_MOCKS_HOST_PATH` | Display-only host-side mocks path |
    | `FISHTANK_JWT_EXPIRY_HOURS` | JWT token lifetime in hours (empty = session) |
    | `FISHTANK_ADMIN_PASSWORD` | Default admin password |
    | `FISHTANK_AUTO_REGISTER` | Enable self-registration (default: false) |
    | `FISHTANK_ALLOWED_ORIGINS` | Additional CORS origins (comma-separated) |
    | `FISHTANK_LOGIN_RATE_LIMIT` | Login rate limit (requests per window, default: 5) |
    | `FISHTANK_LOGIN_RATE_WINDOW` | Rate limit window in seconds (default: 60) |
    | `FISHTANK_CAPTURE_FULL_HEADERS` | Enable full header capture opt-in (default: false) |
    | `FISHTANK_TOGGLE_{NAME}` | Feature toggle override (e.g., `FISHTANK_TOGGLE_RECORDINGS`) |
    | `FISHTANK_PIPELINE_RESET_KEY` | API key for `POST /admin/reset` (empty = endpoint disabled) |
    | `FISHTANK_LOG_PATH` | Rolling log file path (default: /data/logs) |
    | `FISHTANK_LOG_RETENTION_DAYS` | Log file retention days (default: 7) |
    | `FISHTANK_DEBUG_ERRORS` | Include stack trace in error `details` field (default: false) |

    > **Currently missing from `docker-compose.example.yml`:** `FISHTANK_AUTO_REGISTER`, `FISHTANK_CAPTURE_FULL_HEADERS`, `FISHTANK_PIPELINE_RESET_KEY`, `FISHTANK_TOGGLE_{NAME}`. These must be added as commented-out entries with inline documentation.

---

## Dev Notes

### Critical: `app.MapOpenApi()` Environment Guard — Fix This First

In `src/Fishtank.Api/Program.cs`, `app.MapOpenApi()` is currently guarded:

```csharp
// CURRENT (wrong — OpenAPI not served in Production):
if (app.Environment.IsDevelopment() || app.Environment.IsEnvironment("Testing"))
{
    app.MapOpenApi();          // ← needs to move OUTSIDE the if-block
    app.MapTestEndpoints();    // ← stays inside (dev/test only)
}
```

Change to:

```csharp
// CORRECT — OpenAPI served in all environments per FR-44:
app.MapOpenApi();  // Move outside; no auth required, safe to expose

if (app.Environment.IsDevelopment() || app.Environment.IsEnvironment("Testing"))
{
    app.MapTestEndpoints();    // Dev/test scaffolding only
}
```

The `AddOpenApi()` call at line ~225 is already unconditional — only the `MapOpenApi()` needs to move.

### Endpoint Tag Strategy

Add `.WithTags("...")` to every endpoint group's `MapGroup(...)` call. Groups that call `.RequireAuthorization()` must chain `.WithTags(...)` after it. Individual endpoint routes that need tags different from the group can override with their own `.WithTags(...)`.

Pattern for endpoint group classes:

```csharp
// ServicesEndpoints.cs
var group = app.MapGroup("/api/services")
    .RequireAuthorization()
    .WithTags("Services");

// Each route in group inherits "Services" tag automatically
group.MapGet("", ListServicesAsync).WithSummary("List all services");
group.MapPost("", CreateServiceAsync).WithSummary("Create a new service");
group.MapGet("{id:guid}", GetServiceAsync).WithSummary("Get service by ID");
group.MapPut("{id:guid}", UpdateServiceAsync).WithSummary("Update a service");
group.MapPost("{id:guid}/start", StartServiceAsync).WithSummary("Start the WireMock engine for a service");
group.MapPost("{id:guid}/stop", StopServiceAsync).WithSummary("Stop the WireMock engine for a service");
group.MapPost("import", ImportServicesAsync).WithSummary("Import services from a seed JSON file");
group.MapGet("next-port", GetNextPortAsync).WithSummary("Get the next available port in the 30100–30199 range");
```

Similarly for all other endpoint classes. See the full endpoint map in AC #7.

### `AdminEndpoints.cs` — Tags on Both Group and Reset Endpoint

The `AdminEndpoints` class has two registration sites (the JWT-protected group + the separately registered reset endpoint). Both need tags:

```csharp
// JWT-protected group (already has .WithTags("Admin"))
var group = app.MapGroup("/api/admin")
    .RequireAuthorization(policy => policy.RequireRole("Admin"))
    .WithTags("Admin");

// Pipeline reset — registered at app level, not in group
app.MapPost("/api/admin/reset", ResetHandler)
    .AllowAnonymous()
    .WithTags("Admin")   // ← already present in story 6-1 impl
    .WithName("PipelineReset")
    .WithSummary("Reset pipeline state — clears activity log and reloads all mappings")
    .WithDescription("Requires API key authentication via X-Pipeline-Key header. JWT auth is not accepted. " +
                     "Returns HTTP 403 if FISHTANK_PIPELINE_RESET_KEY is not configured.");
```

### Response Schema Registration with `Microsoft.AspNetCore.OpenApi`

.NET 10 `Microsoft.AspNetCore.OpenApi` infers response schemas from `.Produces<T>()` calls or from return type inference. To document the envelope wrapper:

1. Create a `ApiResponseSchema<T>` record in `Models/`:
   ```csharp
   public record ApiResponseSchema<T>(bool Success, T? Data);
   public record ApiErrorResponseSchema(bool Success, ApiErrorDetail Error);
   public record ApiErrorDetail(string Code, string Message, string? Details = null);
   ```

2. Add `.Produces<ApiResponseSchema<ServiceDto>>(200)` to each success route and `.Produces<ApiErrorResponseSchema>(4xx)` for error codes. The OpenAPI generator will emit typed schemas from these.

3. For void operations (DELETE, POST /start, POST /stop), use:
   ```csharp
   .Produces<ApiResponseSchema<object?>>(200)
   ```

4. The auth-required endpoints should also declare:
   ```csharp
   .Produces<ApiErrorResponseSchema>(StatusCodes.Status401Unauthorized)
   ```

This is additive — it does not change runtime behavior. The actual response envelope is still constructed by `ApiResponse.Ok(...)` / `ApiResponse.Fail(...)`.

### Exporting `docs/openapi.json`

After implementing the above changes, export the spec for commit:

```bash
# Start the container (or dotnet run in the project directory)
dotnet run --project src/Fishtank.Api

# In another terminal — export the spec
curl http://localhost:5000/openapi/v1.json | jq . > docs/openapi.json

# Commit
git add docs/openapi.json
git commit -m "docs: add committed OpenAPI spec (FR-44)"
```

The `docs/` directory already exists (see `docs/ci-secrets-checklist.md`, `docs/ci.md`).

### CI Parity Check Step

Add to `.github/workflows/build.yml` (or a dedicated `openapi.yml` workflow) — run after the build step:

```yaml
- name: OpenAPI parity check
  run: |
    # Start the app in background
    ASPNETCORE_ENVIRONMENT=Testing \
    FISHTANK_JWT_SECRET=test-secret-for-openapi-check-32chars \
    dotnet run --project src/Fishtank.Api &
    APP_PID=$!
    
    # Wait for startup
    sleep 8
    
    # Download served spec
    curl --fail http://localhost:5000/openapi/v1.json -o /tmp/served-openapi.json
    
    # Compare to committed spec
    diff docs/openapi.json /tmp/served-openapi.json || \
      (echo "❌ OpenAPI spec drift detected. Regenerate docs/openapi.json and commit." && kill $APP_PID && exit 1)
    
    kill $APP_PID
    echo "✅ OpenAPI spec is in sync"
```

> **Note on ordering:** Run this step AFTER unit tests and integration tests but BEFORE Docker build — it requires a working build but not a containerized image.

### FR-36 Env Var Documentation Gaps

Current `docker-compose.example.yml` is missing these commented entries (add after `FISHTANK_LOG_RETENTION_DAYS`):

```yaml
      # Optional — allow new users to self-register (default: false; set to "true" to enable)
      # - FISHTANK_AUTO_REGISTER=false
      # Optional — capture full request/response headers (default: false; sensitive headers redacted when false)
      # - FISHTANK_CAPTURE_FULL_HEADERS=false
      # Optional — API key for POST /api/admin/reset (empty = endpoint disabled; recommended ≥32 chars)
      # - FISHTANK_PIPELINE_RESET_KEY=
      # Optional — override individual feature toggle state at deploy time (NAME = screaming_snake feature name)
      # Example: FISHTANK_TOGGLE_RECORDINGS=false disables the recording feature
      # - FISHTANK_TOGGLE_{NAME}=true
      # Optional — include stack traces in API error details (default: false; only for debugging)
      # - FISHTANK_DEBUG_ERRORS=false
```

The `README.md` env var reference table must also be audited and updated to include these same entries with descriptions. Check the current README table against the FR-36 list in AC #10.

### Existing Code — What Already Works

| Component | Location | Status |
|-----------|----------|--------|
| `AddOpenApi()` | `Program.cs` ~line 225 | ✅ Already unconditional |
| `MapOpenApi()` | `Program.cs` ~line 286 | ❌ Guarded — move outside dev/test block |
| Admin reset `.WithTags("Admin")` | `AdminEndpoints.cs` | ✅ Already present (story 6-1) |
| Admin reset `.WithSummary(...)` | `AdminEndpoints.cs` | ✅ Already present |
| Users `.WithTags("Users")` | `UsersEndpoints.cs` | ✅ Already present |
| Services endpoint tags | `ServicesEndpoints.cs` | ❌ No `.WithTags()` on group |
| Activity endpoint tags | `ActivityEndpoints.cs` | ❌ No `.WithTags()` on routes |
| Mappings endpoint tags | `MappingsEndpoints.cs` | ❌ No `.WithTags()` on group |
| Events endpoint tags | `SystemEventsEndpoints.cs` | ❌ No `.WithTags()` on group |
| Auth endpoint tags | `AuthEndpoints.cs` | ❌ No `.WithTags()` on group |
| Settings endpoint tags | `SettingsEndpoints.cs` | ❌ No `.WithTags()` on group |
| Cache endpoint tags | `CacheEndpoints.cs` | ❌ No `.WithTags()` on group |
| `docs/openapi.json` | `docs/` | ❌ Does not exist yet |

### FR-43 Parity Audit — Endpoints to Verify Exist

Run the parity audit against the architecture's canonical endpoint list (architecture.md §REST endpoint structure). Items to explicitly verify in `GET /openapi/v1.json`:

- `/api/auth/login`, `/api/auth/logout`, `/api/auth/setup`, `/api/auth/change-password` (check AuthEndpoints.cs)
- `/api/services/import` — verify this exists in ServicesEndpoints.cs (the architecture lists it; check the file)
- `/api/settings` — verify SettingsEndpoints.cs is wired and tagged
- `/api/cache` endpoints (CacheEndpoints.cs) — verify they are in the spec
- Recording endpoints (RecordingEndpoints.cs) — verify `/api/recording/start`, `/api/recording/stop` (or equivalent) are present
- `/api/admin/reset` — verify it appears in the spec (AllowAnonymous + custom auth means it must be explicitly registered without requiring JWT to view in spec)

### Project Structure Notes

- `src/Fishtank.Api/Endpoints/` — all endpoint group files live here; update `.WithTags()` + `.WithSummary()` in-place
- `src/Fishtank.Api/Program.cs` — move `app.MapOpenApi()` outside env guard
- `docs/openapi.json` — create this file by exporting the served spec
- `docker-compose.example.yml` — add missing env var entries
- `README.md` — audit env var table and add missing entries
- `.github/workflows/` — add OpenAPI parity check step

### No Frontend Changes Required

This story is entirely backend + documentation. No React components, hooks, or UI changes.

### References

- FR-43 (Management API parity): [epics.md](../../planning-artifacts/epics.md#FR-43)
- FR-44 (OpenAPI spec): [epics.md](../../planning-artifacts/epics.md#FR-44)
- FR-36 (env var documentation): [epics.md](../../planning-artifacts/epics.md#FR-36)
- Architecture REST endpoint map: [architecture.md](../../planning-artifacts/architecture.md#REST-endpoint-structure)
- Test design Story 6-2 section: [test-design-epic-6.md](../../test-artifacts/test-design/test-design-epic-6.md)
- Previous story (6-1): [6-1-pipeline-reset-endpoint.md](./6-1-pipeline-reset-endpoint.md)
- Risk R-E6-003 (OpenAPI spec drift): test-design-epic-6.md

---

## Out of Scope

- **Swagger UI** — Only the JSON spec is required; no HTML UI endpoint needed in v1. The raw JSON at `/openapi/v1.json` satisfies FR-44.
- **NSwag / Swashbuckle** — Use `Microsoft.AspNetCore.OpenApi` (already installed, built-in); do not add third-party OpenAPI libraries.
- **WebSocket / SignalR hub documentation** — OpenAPI only covers REST; SignalR hub event contracts are documented separately in `architecture.md` and `project-context.md`.
- **Service-by-slug lookup** — `GET /api/services/by-slug/{slug}` is mentioned in architecture for seed file tooling but is not a UI operation in FR-43; include only if it already exists in the codebase.

---

## Test Notes

Reference: [test-design-epic-6.md](../../test-artifacts/test-design/test-design-epic-6.md) — Story 6-2 section

### Integration Tests (xUnit + WebApplicationFactory)

**P0 (Release Gate):**
- `GET /openapi/v1.json` → 200 with valid JSON, unauthenticated
- Response contains `openapi: "3.*"` version field
- All Service CRUD paths present in spec `paths` object
- `GET /openapi/v1.json` accessible in all environments (test with `ASPNETCORE_ENVIRONMENT=Production` in `WebApplicationFactory` options)

**P1:**
- Mapping/Response file endpoints in spec
- Activity log endpoints in spec
- User management endpoints in spec
- Feature toggle endpoints in spec
- Response envelope documented with `success` and `data` fields
- Error responses reference shared schema with `code` and `message` fields

**Manual Audit (P0):**
- Served spec matches committed `docs/openapi.json` (manual diff before merge)
- Every UI operation has a corresponding documented REST endpoint (FR-43 checklist from AC #7)
- All FR-36 env vars documented in README and docker-compose.example.yml (AC #10)

**E2E (P2):**
- `GET /openapi/v1.json` accessible from running container via browser

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-5 (GitHub Copilot)

### Debug Log References

### Completion Notes List

### File List
