---
story_id: "2.1"
epic: 2
story_key: 2-1-wiremock-engine-layer-and-services-api-backend
story_title: "WireMock Engine Layer & Services API Backend"
status: done
priority: critical
baseline_commit: ceb16fc
---

# Story 2.1: WireMock Engine Layer & Services API Backend

## Story

**As a** developer or operator,  
**I want** the WireMock mock engine and Services REST API to be in place,  
**So that** services can be created, configured, and managed programmatically with the mock engine starting immediately on creation.

---

## Status

Review

---

## Context

### Background

Stories 1.1–1.5 established the authenticated ASP.NET Core host with JWT cookie auth, EF Core + SQLite (Users + ServerConfig tables), Serilog, CORS, rate limiting, and the full React SPA shell.

This story wires in **the entire backend for Services Management**: the WireMock.NET engine orchestration layer, the `Services` and `SystemEvents` DB tables, the Services REST API, and the seed file import. No frontend is built here — Story 2.2 builds the React services page that calls these endpoints.

`WireMock.Net 2.11.0` is **already installed** in `Fishtank.Api.csproj`. Do not add it again.

### Current State of `Program.cs`

The following registrations already exist — **do NOT re-add or modify them** unless the story explicitly requires it:

```csharp
// Already registered
builder.Services.AddDbContext<FishtankDbContext>(...)   // SQLite
builder.Services.AddSingleton<IServerConfigService, ServerConfigService>()
builder.Services.AddScoped<IPasswordHasher, BCryptPasswordHasher>()
builder.Services.AddScoped<IAuthService, AuthService>()
builder.Services.AddOpenApi()
builder.Services.AddHealthChecks()
app.UseForwardedHeaders(...)
app.UseRateLimiter()
app.UseCors()
app.UseDefaultFiles()
app.UseStaticFiles()
app.UseMiddleware<FirstRunMiddleware>()
app.UseAuthentication()
app.UseAuthorization()
app.MapHealthChecks("/health")
app.MapAuthEndpoints()
app.MapFallback(...)
```

New registrations this story adds go **after** existing ones in the middleware pipeline (exact positions documented in each task below).

### Existing Files NOT to Modify (Unless Explicitly Listed in Tasks)

- `Program.cs` — modify only in Task 7 (add SignalR, Engine services, startup)
- `Data/FishtankDbContext.cs` — modify only in Task 2 (add new DbSets)
- All files in `Endpoints/Auth*`, `Services/Auth*`, `Services/Password*`, `Middleware/`, `Data/Entities/User.cs`, `Data/Entities/ServerConfig.cs`
- All files in `Fishtank.Api.IntegrationTests/Support/` — do not modify existing test infrastructure

### Implementation Sequence for This Story

Architecture mandates this exact order:
1. **DB entities + migration** (Service, SystemEvent) — blocks everything
2. **FishtankDbContext update** — add new DbSets, configure indexes
3. **Engine layer** (IServicesRegistry, ServicesRegistry, EngineStartup) — manages WireMock instances
4. **Services/SystemEventService** — business logic
5. **ServicesEndpoints** — API surface
6. **Program.cs wiring** — register and start everything
7. **Integration tests** — verify all ACs

### WireMock.Net 2.11.0 API (pinned — do not upgrade to 2.12+)

```csharp
using WireMock.Server;
using WireMock.Settings;

// Create and start a WireMock server on a specific port
var server = WireMockServer.Start(new WireMockServerSettings
{
    Port = service.Port,
    ReadStaticMappings = true,           // Reads from MappingsFolder on start
    WatchStaticMappings = false,         // No FSW here — Epic 4 handles that
    WatchStaticMappingsInSubdirectories = false,
    MappingsFolder = service.MocksRoot,  // Absolute path to service mappings dir
    ProxyAndRecordSettings = new ProxyAndRecordSettings
    {
        Url = service.ExternalUrl,       // Upstream to proxy to when no mapping matches
        SaveMapping = false,
        SaveMappingToFile = false,
    },
});

// Stop a WireMock server
server.Stop();
server.Dispose();

// Check if server is running
bool running = server.IsStarted;
```

**WireMock port conflict detection:**
```csharp
// WireMock.Net throws SocketException (or wraps in its own exception) when port is taken.
// Use try/catch around WireMockServer.Start() per-service.
// A SocketException or any startup exception → status=Stopped, emit SystemEvent.
```

### Engine Architecture

The Engine layer (to be created at `src/Fishtank.Api/Engine/`) manages the mapping of Service DB records to live WireMockServer instances:

```
ServicesRegistry.cs    → ConcurrentDictionary<Guid, WireMockServer>
                          singleton — one per process lifetime
                          methods: TryAdd, TryRemove, TryGet, GetAll

EngineStartup.cs       → IHostedService that runs at application startup
                          loads all Services with Status=Live from DB
                          starts each via ServicesRegistry
                          port conflict → sets status=Stopped + writes SystemEvent
```

`IServiceManager` is in `Services/` (not `Engine/`) — it orchestrates between DB and Engine per the architecture file. ServiceManager is scoped (per-request), ServicesRegistry is singleton.

### Services Slug Rules (from Architecture + Epics)

```
Slug = Name.ToLowerInvariant()
           .Replace(" ", "-")
           .Replace(Regex: "[^a-z0-9-]", "")
           .Trim('-')

Minimum length: 2 characters
Must be unique (unique index on DB)
```

### MocksRoot Path Convention

```
MocksRoot = Path.Combine(mocksRootBase, service.Slug)
// where mocksRootBase = FISHTANK_MOCKS_ROOT env var (default: "/app/mocks")
```

The MocksRoot directory is **not created by this story** — Story 4.1 handles filesystem setup. This story only stores the path string and passes it to WireMock for reading (if it exists). WireMock.Net handles a non-existent MappingsFolder gracefully (no error).

### SignalR (Epic 2 requires ServicesHub skeleton only)

Story 2.3 fully wires ServicesHub. This story only needs to:
1. Add `builder.Services.AddSignalR()` to `Program.cs`
2. Create `Hubs/ServicesHub.cs` skeleton (empty hub with JWT cookie auth)
3. Map it with `app.MapHub<ServicesHub>("/hubs/services")`

No events are broadcast in this story.

### Deferred Items from Previous Stories (Not Blocking This Story)

From `deferred-work.md`:
- SignalR reconnect 401 handling — deferred to when SignalR consumers exist (Story 2.3+)
- All other deferred items are frontend concerns

---

## Acceptance Criteria

**AC-1 — Create service, WireMock starts immediately:**  
**Given** a new Service is created via `POST /api/services`,  
**When** the service is saved successfully,  
**Then** the WireMock engine instance starts listening on the assigned port immediately.  
**And** a row is persisted in `Services` with all required fields.

**AC-2 — Port binding failure handling:**  
**Given** the assigned port is already in use on the host,  
**When** the port binding fails,  
**Then** the Service is persisted in `Stopped` status with the failure reason recorded, and a `SystemEvent` entry is written with severity `error`.

**AC-3 — Validation errors:**  
**Given** invalid Service data (blank name, name >64 chars, emoji in slug, duplicate slug, port outside 30100–30199, port already assigned to another Service, ExternalUrl not starting with http:// or https://),  
**Then** HTTP 400 is returned with an appropriate `SERVICE_*` error code.

**AC-4 — List services:**  
**Given** `GET /api/services`,  
**Then** all non-deleted Services (`DeletedAt IS NULL`) are returned with all fields including runtime status.

**AC-5 — Edit service with slug change:**  
**Given** `PUT /api/services/{id}` with a name change that generates a different Slug,  
**Then** the response includes a flag `mocksRootChanged: true` indicating the Mocks Root path has changed.

**AC-6 — Start/stop service:**  
**Given** `POST /api/services/{id}/stop` and `POST /api/services/{id}/start`,  
**Then** stop halts the WireMock listener immediately; start restarts the listener and re-reads Mappings from disk; both return the updated Service object in the standard envelope.

**AC-7 — SystemEvents table schema:**  
**Given** the `SystemEvents` table,  
**Then** it contains: `Id` (GUID), `Severity` (info|warning|error), `Message`, `ServiceId` (nullable FK), `CreatedAt`, `IsRead` (bool, default false).

**AC-8 — Seed file import:**  
**Given** a seed file configured via `FISHTANK_SEED_FILE` env var,  
**When** the container starts,  
**Then** the file is read (mounted read-only), new services imported, existing (by Slug) skipped, port collisions written as System Event warnings; if absent or unreadable, a System Event info entry is written and startup proceeds.

**AC-9 — Next port endpoint:**  
**Given** `GET /api/services/next-port`,  
**Then** the next available port in 30100–30199 (lowest unassigned active service port) is returned.

**AC-10 — Engine fault isolation (NFR-5):**  
**Given** a WireMock engine instance for Service A throws an unhandled exception or fails to start,  
**Then** the management API remains accessible (`GET /health` returns 200) and all other running Services continue serving mock requests unaffected. Verified in an integration test that injects a startup failure on Service A while asserting `GET /api/services/{serviceBId}` returns `status: live` and a test request to Service B's port returns expected mock response.

---

## Tasks / Subtasks

### Task 1: Create DB entities and new migration (AC: #1, #7)

- [ ] Create `src/Fishtank.Api/Data/Entities/Service.cs`:
  ```csharp
  using System.Text.Json;

  namespace Fishtank.Api.Data.Entities;

  public class Service
  {
      public Guid Id { get; set; } = Guid.NewGuid();
      public string Name { get; set; } = string.Empty;
      public string Slug { get; set; } = string.Empty;         // unique
      public string? Description { get; set; }
      public string ExternalUrl { get; set; } = string.Empty;
      public int Port { get; set; }
      public string MocksRoot { get; set; } = string.Empty;    // auto-generated, stored as string
      public ServiceStatus Status { get; set; } = ServiceStatus.Live;
      public bool IsActive { get; set; } = true;
      public DateTimeOffset? DeletedAt { get; set; }
      public string TagsJson { get; set; } = "[]";             // JSON-serialised string[]
      public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

      // Computed convenience — not mapped to DB column
      [System.ComponentModel.DataAnnotations.Schema.NotMapped]
      public string[] Tags
      {
          get => JsonSerializer.Deserialize<string[]>(TagsJson) ?? [];
          set => TagsJson = JsonSerializer.Serialize(value);
      }
  }

  public enum ServiceStatus { Live, Stopped }
  ```

- [ ] Create `src/Fishtank.Api/Data/Entities/SystemEvent.cs`:
  ```csharp
  namespace Fishtank.Api.Data.Entities;

  public class SystemEvent
  {
      public Guid Id { get; set; } = Guid.NewGuid();
      public SystemEventSeverity Severity { get; set; }
      public string Message { get; set; } = string.Empty;
      public Guid? ServiceId { get; set; }
      public Service? Service { get; set; }      // navigation property
      public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
      public bool IsRead { get; set; } = false;
  }

  public enum SystemEventSeverity { Info, Warning, Error }
  ```

- [ ] Run `dotnet ef migrations add ServicesAndSystemEvents -p src/Fishtank.Api` to generate migration
  - Migration must create `Services` table with unique index on `Slug`
  - Migration must create `SystemEvents` table with nullable FK to `Services`

### Task 2: Update FishtankDbContext (AC: #1, #7)

- [ ] Modify `src/Fishtank.Api/Data/FishtankDbContext.cs`:
  - Add `public DbSet<Service> Services => Set<Service>();`
  - Add `public DbSet<SystemEvent> SystemEvents => Set<SystemEvent>();`
  - In `OnModelCreating`:
    ```csharp
    modelBuilder.Entity<Service>()
        .HasIndex(s => s.Slug).IsUnique();

    modelBuilder.Entity<SystemEvent>()
        .HasOne(e => e.Service)
        .WithMany()
        .HasForeignKey(e => e.ServiceId)
        .IsRequired(false)
        .OnDelete(DeleteBehavior.SetNull);
    ```

### Task 3: Create Engine layer (AC: #1, #2, #8, #10)

- [ ] Create `src/Fishtank.Api/Engine/IServicesRegistry.cs`:
  ```csharp
  namespace Fishtank.Api.Engine;

  public interface IServicesRegistry
  {
      bool TryAdd(Guid serviceId, WireMock.Server.WireMockServer server);
      bool TryRemove(Guid serviceId, out WireMock.Server.WireMockServer? server);
      bool TryGet(Guid serviceId, out WireMock.Server.WireMockServer? server);
      IReadOnlyDictionary<Guid, WireMock.Server.WireMockServer> GetAll();
  }
  ```

- [ ] Create `src/Fishtank.Api/Engine/ServicesRegistry.cs`:
  - `ConcurrentDictionary<Guid, WireMockServer>` — registered as **singleton**
  - Implements all interface methods thread-safely

- [ ] Create `src/Fishtank.Api/Engine/EngineStartup.cs`:
  - Implements `IHostedService` (registered as hosted service — starts on app boot)
  - In `StartAsync`:
    1. Resolve `FishtankDbContext` via `IServiceScopeFactory` (do NOT inject scoped DbContext into singleton/hosted service — use scope factory)
    2. Load all `Service` rows where `Status == Live && DeletedAt == null`
    3. For each: call `WireMockServer.Start(new WireMockServerSettings { Port = service.Port, ... })`
    4. On success: add to `ServicesRegistry`
    5. On exception: catch per-service — update `service.Status = Stopped`, write `SystemEvent` (severity Error), `SaveChangesAsync()`, log with Serilog, continue to next service
  - In `StopAsync`: call `server.Stop()` + `server.Dispose()` for each entry in registry

### Task 4: Create SystemEventService (AC: #2, #7, #8)

- [ ] Create `src/Fishtank.Api/Services/ISystemEventService.cs`:
  ```csharp
  namespace Fishtank.Api.Services;

  public interface ISystemEventService
  {
      Task AddAsync(SystemEventSeverity severity, string message, Guid? serviceId = null, CancellationToken ct = default);
  }
  ```

- [ ] Create `src/Fishtank.Api/Services/SystemEventService.cs`:
  - Inject `FishtankDbContext`
  - Creates and saves a `SystemEvent` record
  - Registered as **scoped**

### Task 5: Create ServiceManager (AC: #1–#6, #9, #10)

- [ ] Create `src/Fishtank.Api/Services/IServiceManager.cs` with methods:
  - `Task<ServiceDto> CreateAsync(CreateServiceRequest request, CancellationToken ct)`
  - `Task<IReadOnlyList<ServiceDto>> ListAsync(CancellationToken ct)`
  - `Task<ServiceDto> UpdateAsync(Guid id, UpdateServiceRequest request, CancellationToken ct)`
  - `Task<ServiceDto> StopAsync(Guid id, CancellationToken ct)`
  - `Task<ServiceDto> StartAsync(Guid id, CancellationToken ct)`
  - `Task<int> GetNextPortAsync(CancellationToken ct)`

- [ ] Create `src/Fishtank.Api/Services/ServiceManager.cs`:
  - Inject: `FishtankDbContext`, `IServicesRegistry`, `ISystemEventService`, `IConfiguration`
  - Registered as **scoped**

  **Slug generation helper (private method):**
  ```csharp
  private static string GenerateSlug(string name)
  {
      var slug = name.ToLowerInvariant()
                     .Replace(" ", "-");
      slug = System.Text.RegularExpressions.Regex.Replace(slug, "[^a-z0-9-]", "");
      slug = slug.Trim('-');
      return slug;
  }
  ```

  **MocksRoot helper (private method):**
  ```csharp
  private string GetMocksRoot(string slug)
  {
      var mocksRootBase = _config["FISHTANK_MOCKS_ROOT"] ?? "/app/mocks";
      return Path.Combine(mocksRootBase, slug);
  }
  ```

  **CreateAsync behaviour:**
  1. Validate: name not blank, ≤64 chars, no emoji; port in 30100–30199; ExternalUrl starts with `http://` or `https://`; slug ≥2 chars
  2. Check slug uniqueness and port uniqueness in DB
  3. Save `Service` record (status=Live initially)
  4. Try `WireMockServer.Start(...)` — on exception: update status=Stopped, write SystemEvent(Error), save, return DTO with status=stopped
  5. On success: add to `ServicesRegistry`, return DTO with status=live
  6. Validation failures throw `ValidationException` with appropriate `SERVICE_*` code

  **Validation error codes:**
  - `SERVICE_NAME_REQUIRED` — blank name
  - `SERVICE_NAME_TOO_LONG` — >64 chars
  - `SERVICE_NAME_INVALID` — emoji or other invalid chars in name
  - `SERVICE_PORT_OUT_OF_RANGE` — not in 30100–30199
  - `SERVICE_PORT_CONFLICT` — port assigned to another active service
  - `SERVICE_URL_INVALID` — ExternalUrl missing http/https prefix
  - `SERVICE_SLUG_CONFLICT` — duplicate slug
  - `SERVICE_NOT_FOUND` — referenced ID doesn't exist

  **StopAsync behaviour:**
  1. Find service (404 if not found or deleted)
  2. `ServicesRegistry.TryGet` → `server.Stop()` + `server.Dispose()` + `ServicesRegistry.TryRemove`
  3. Update `service.Status = Stopped`, save
  4. Return updated DTO

  **StartAsync behaviour:**
  1. Find service (404 if not found or deleted)
  2. If already in registry: stop existing instance first
  3. `WireMockServer.Start(...)` with same settings as Create
  4. On success: add to registry, update status=Live, save, return DTO
  5. On failure: update status=Stopped, write SystemEvent(Error), save, return DTO

### Task 6: Create DTOs and Models (AC: #1–#6)

- [ ] Create `src/Fishtank.Api/Models/` directory

- [ ] Create `src/Fishtank.Api/Models/ServiceDto.cs`:
  ```csharp
  namespace Fishtank.Api.Models;

  public record ServiceDto(
      Guid Id,
      string Name,
      string Slug,
      string? Description,
      string ExternalUrl,
      int Port,
      string MocksRoot,
      string Status,           // "live" | "stopped"
      bool IsActive,
      string[] Tags,
      DateTimeOffset CreatedAt,
      bool? MocksRootChanged = null   // AC-5: present only on PUT response when slug changed
  );
  ```

- [ ] Create `src/Fishtank.Api/Models/CreateServiceRequest.cs`:
  ```csharp
  namespace Fishtank.Api.Models;

  public record CreateServiceRequest(
      string Name,
      string? Description,
      string ExternalUrl,
      int Port,
      string[]? Tags
  );
  ```

- [ ] Create `src/Fishtank.Api/Models/UpdateServiceRequest.cs`:
  ```csharp
  namespace Fishtank.Api.Models;

  public record UpdateServiceRequest(
      string Name,
      string? Description,
      string ExternalUrl,
      int Port,
      string[]? Tags
  );
  ```

- [ ] Create `src/Fishtank.Api/Exceptions/` directory with base + typed exceptions (needed for GlobalExceptionMiddleware in future stories; only ValidationException needed this story):
  - `FishtankException.cs` — `public abstract class FishtankException(string errorCode, string message) : Exception(message) { public string ErrorCode { get; } = errorCode; }`
  - `ValidationException.cs` — `: FishtankException`, `HttpStatusCode = 400`
  - `NotFoundException.cs` — `: FishtankException`, `HttpStatusCode = 404`

  > **Note:** GlobalExceptionMiddleware will be wired in Story 2.2+ or as part of this story's Program.cs if time permits. For now, endpoint handlers catch `FishtankException` directly and return appropriate responses.

### Task 7: Create ServicesEndpoints (AC: #1–#6, #9)

- [ ] Create `src/Fishtank.Api/Endpoints/ServicesEndpoints.cs`:
  ```csharp
  namespace Fishtank.Api.Endpoints;

  public static class ServicesEndpoints
  {
      public static void MapServicesEndpoints(this IEndpointRouteBuilder app)
      {
          var group = app.MapGroup("/api/services").RequireAuthorization();

          group.MapGet("", ListServicesAsync);
          group.MapPost("", CreateServiceAsync);
          group.MapPut("{id:guid}", UpdateServiceAsync);
          group.MapPost("{id:guid}/stop", StopServiceAsync);
          group.MapPost("{id:guid}/start", StartServiceAsync);
          group.MapGet("next-port", GetNextPortAsync);
      }
      // ... handler implementations using IServiceManager
  }
  ```

  All handlers:
  - Inject `IServiceManager` via DI
  - Wrap successful results in `ApiResponse.Ok(result)`
  - Catch `ValidationException` → 400 with `ApiResponse.Error(ex.ErrorCode, ex.Message)`
  - Catch `NotFoundException` → 404 with `ApiResponse.Error(ex.ErrorCode, ex.Message)`

  Check `src/Fishtank.Api/Endpoints/ApiResponse.cs` — it already exists from Story 1.2. Reuse the same pattern.

### Task 8: Create ServicesHub skeleton (for Program.cs wiring — Story 2.3 fully implements)

- [ ] Create `src/Fishtank.Api/Hubs/` directory

- [ ] Create `src/Fishtank.Api/Hubs/ServicesHub.cs`:
  ```csharp
  using Microsoft.AspNetCore.Authorization;
  using Microsoft.AspNetCore.SignalR;

  namespace Fishtank.Api.Hubs;

  [Authorize]  // JWT cookie auth — unauthenticated connections rejected (NFR-8)
  public class ServicesHub : Hub
  {
      // Story 2.3 wires ServiceStatusChanged broadcast.
      // This skeleton accepts connections and maintains them — no events yet.
  }
  ```

### Task 9: Wire everything in Program.cs (AC: all)

Add in `Program.cs` in the order specified:

**After existing `builder.Services.AddScoped<IAuthService, AuthService>()` line — add new registrations:**
```csharp
// ─── 6b. Engine + Services layer (Epic 2) ─────────────────────────────────
builder.Services.AddSignalR();
builder.Services.AddSingleton<IServicesRegistry, ServicesRegistry>();
builder.Services.AddScoped<ISystemEventService, SystemEventService>();
builder.Services.AddScoped<IServiceManager, ServiceManager>();
builder.Services.AddHostedService<EngineStartup>();
```

**After `app.MapAuthEndpoints()` — add:**
```csharp
app.MapServicesEndpoints();
app.MapHub<ServicesHub>("/hubs/services");
```

**Update `FishtankWebApplicationFactory.ResetDatabaseAsync()` to also clear the new tables:**
- Do NOT modify the existing factory file. Instead, the `ResetDatabaseAsync` already calls `db.Database.MigrateAsync()` which will pick up the new migration automatically. The Dispose call on `ServicesRegistry` and hosted services is handled by the host shutdown.
- **Important:** In tests, `EngineStartup` will try to start WireMock servers. For integration tests, you must ensure no services exist in DB when tests start (ResetDatabaseAsync handles this) so no WireMock ports are bound. For Story 2.1 tests that explicitly create services, the WireMock server will actually start on the test machine — use the 30100–30199 range which should be free on CI machines.

**FishtankWebApplicationFactory update needed — add Services table clearing to ResetDatabaseAsync:**
```csharp
// In ResetDatabaseAsync(), after db.Users.RemoveRange(...) add:
db.SystemEvents.RemoveRange(await db.SystemEvents.ToListAsync());
db.Services.RemoveRange(await db.Services.ToListAsync());
await db.SaveChangesAsync();
```

**Also dispose WireMock servers in FishtankWebApplicationFactory (prevent port leaks across tests):**
```csharp
// In Dispose(bool disposing), before _connection?.Dispose():
// Stop all running WireMock servers so ports are freed between test classes
var registry = Services.GetService<IServicesRegistry>();
if (registry is not null)
{
    foreach (var (_, server) in registry.GetAll())
    {
        server.Stop();
        server.Dispose();
    }
}
```

### Task 10: Implement seed file import (AC: #8)

- [ ] Add seed file loading to `EngineStartup.StartAsync()` after loading existing services:
  ```csharp
  var seedFilePath = _config["FISHTANK_SEED_FILE"];
  if (!string.IsNullOrEmpty(seedFilePath))
  {
      if (!File.Exists(seedFilePath))
      {
          // SystemEvent info: seed file path configured but not found
      }
      else
      {
          // Read seed JSON: array of { name, externalUrl, port, description?, tags? }
          // For each entry: check if slug exists in DB — if yes, skip (write SystemEvent info)
          // If no: create service (same logic as CreateAsync, without HTTP context)
          // Port conflict during start → SystemEvent warning (not error — expected for seeds)
      }
  }
  ```

  Seed file JSON schema:
  ```json
  [
    {
      "name": "Weather API",
      "externalUrl": "https://api.weather.example.com",
      "port": 30100,
      "description": "Example weather service",
      "tags": ["demo", "weather"]
    }
  ]
  ```

### Task 11: Create integration tests (AC: #1–#10)

- [ ] Create `src/Fishtank.Api.IntegrationTests/Api/Story2_1_ServicesTests.cs`

  > **Testing WireMock in integration tests:** See `architecture.md` line 757: "Use `WireMockTestFixture` (`IClassFixture`) with port-0 dynamic allocation; always dispose via `IDisposable`. Never share a `WireMockServer` instance across parallel test classes."
  >
  > For fault isolation tests: inject a startup failure by using a port that is already bound (bind it in test setup, release after assertion).

  Tests to implement (map directly to ACs and test-design-epic-2.md P0 scenarios):

  ```
  AC-1: POST /api/services (valid) → 201, service created, WireMock port responds to GET
  AC-2: POST /api/services with bound port → 201 with status=stopped, SystemEvent created
  AC-3a: POST with blank name → 400 SERVICE_NAME_REQUIRED
  AC-3b: POST with duplicate slug → 400 SERVICE_SLUG_CONFLICT
  AC-3c: POST with port outside 30100–30199 → 400 SERVICE_PORT_OUT_OF_RANGE
  AC-3d: POST with ExternalUrl missing http → 400 SERVICE_URL_INVALID
  AC-4: GET /api/services → all non-deleted services returned
  AC-5: PUT /api/services/{id} with name that changes slug → mocksRootChanged: true
  AC-6a: POST /api/services/{id}/stop → WireMock port no longer responding, status=stopped
  AC-6b: POST /api/services/{id}/start after stop → WireMock port responds again, status=live
  AC-7: After migration, SystemEvents table exists with correct schema
  AC-8: Seed import: new services created, duplicates by slug skipped, SystemEvent written
  AC-9: GET /api/services/next-port → returns 30100 when no services exist
  AC-10: Fault isolation: Service A startup fails, GET /health=200, Service B port still responds
  ```

  Authentication: All `/api/services` endpoints require auth. Use `TestAuthHelper.LoginAsync(client)` (creates admin via `/api/auth/setup` first, then logs in). The test setup pattern from `Story1_2_AuthTests.cs` shows how.

---

## Dev Notes

### Critical Architecture Rules to Follow

1. **Endpoints = routing only.** All business logic is in `ServiceManager`, not in endpoint handlers.
2. **EF entities ≠ DTOs.** Never return `Service` entity directly — always map to `ServiceDto`.
3. **Singleton vs Scoped:**
   - `ServicesRegistry` → singleton (lives for process lifetime; holds WireMock instances)
   - `ServiceManager`, `SystemEventService` → scoped (per-request; access DbContext)
   - `EngineStartup` → hosted service (use `IServiceScopeFactory` to resolve scoped services)
4. **WireMock is already pinned to 2.11.0.** Do not call `dotnet add package WireMock.Net` — it is already in the `.csproj`.
5. **MocksRoot directory is NOT created by this story.** WireMock.Net handles a missing MappingsFolder gracefully. No `Directory.CreateDirectory()` in this story.
6. **Tags stored as JSON string** in the DB (not a separate table) — consistent with PRD "JSON stored in database" for Tags.
7. **Slug validation:** After generating the slug, validate it is ≥2 characters. If the name produces a slug shorter than 2 chars, return `SERVICE_NAME_INVALID`.
8. **`DeletedAt IS NULL` filter** must be applied on all `GET /api/services` queries. Services are never hard-deleted in v1.

### ApiResponse Pattern (already established in Story 1.2)

```csharp
// In Endpoints/ApiResponse.cs (already exists — check its exact shape before using)
// Expected to have: ApiResponse.Ok<T>(T data), ApiResponse.Error(string code, string message)
// The envelope is: { "success": true, "data": ... } / { "success": false, "error": { "code": ..., "message": ... } }
```

Read `src/Fishtank.Api/Endpoints/ApiResponse.cs` before implementing endpoint handlers.

### SignalR Hub Auth Configuration

SignalR hubs use JWT cookie auth configured in the JwtBearer `OnMessageReceived` handler in Program.cs:
```csharp
// Already in Program.cs:
OnMessageReceived = ctx =>
{
    ctx.Token = ctx.Request.Cookies["fishtank_auth"];
    return Task.CompletedTask;
}
```
This means all hubs decorated with `[Authorize]` will accept the same JWT cookie that API endpoints use. No additional configuration needed.

### FishtankWebApplicationFactory: EngineStartup and Test Isolation

`EngineStartup` runs as a hosted service and will attempt to load services from the (in-memory) test DB on app start. Since `ResetDatabaseAsync()` is called before each test and clears all services, and since the factory starts the app host once per collection (not per test), be aware:

- On first app start (before any `ResetDatabaseAsync`): no services in DB → no WireMock instances started → safe.
- After each test that creates a service and starts a WireMock instance: the `ResetDatabaseAsync` clears DB data, but the WireMock server keeps running until `FishtankWebApplicationFactory.Dispose()`. The port is still bound.
- **Implication:** Integration tests for services must use **different ports** or must explicitly stop the server after creating it. The safest approach: always clean up via `POST /api/services/{id}/stop` at the end of tests that create live services, or accept that ports may be transiently occupied.
- The `FishtankWebApplicationFactory.Dispose()` modification in Task 9 stops all WireMock servers when the entire test collection finishes.

### Project Structure (New Files This Story Creates)

```
src/Fishtank.Api/
├── Data/
│   ├── Entities/
│   │   ├── Service.cs          NEW
│   │   └── SystemEvent.cs      NEW
│   ├── FishtankDbContext.cs     MODIFIED (add new DbSets + model config)
│   └── Migrations/
│       └── {timestamp}_ServicesAndSystemEvents.cs   NEW (generated)
├── Engine/
│   ├── IServicesRegistry.cs    NEW
│   └── ServicesRegistry.cs     NEW
│   └── EngineStartup.cs        NEW
├── Endpoints/
│   └── ServicesEndpoints.cs    NEW
├── Exceptions/
│   ├── FishtankException.cs    NEW
│   ├── ValidationException.cs  NEW
│   └── NotFoundException.cs    NEW
├── Hubs/
│   └── ServicesHub.cs          NEW
├── Models/
│   ├── ServiceDto.cs           NEW
│   ├── CreateServiceRequest.cs NEW
│   └── UpdateServiceRequest.cs NEW
├── Services/
│   ├── IServiceManager.cs      NEW
│   ├── ServiceManager.cs       NEW
│   ├── ISystemEventService.cs  NEW
│   └── SystemEventService.cs   NEW
└── Program.cs                  MODIFIED (add SignalR, Engine services, hub route)

src/Fishtank.Api.IntegrationTests/
├── Api/
│   └── Story2_1_ServicesTests.cs   NEW
└── Support/
    └── FishtankWebApplicationFactory.cs   MODIFIED (add table clears + WireMock dispose)
```

### DoD Gates (Must Pass Before Story is "Done")

1. `dotnet test src/Fishtank.Api.IntegrationTests` — all tests GREEN (including all existing Story 1.x tests)
2. `dotnet build src/Fishtank.slnx` — 0 errors, 0 warnings
3. `GET /health` returns 200 when running locally
4. All AC integration tests GREEN (see Task 11)

---

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

### Completion Notes List

### Review Findings

- [x] [Review][Patch] B1: SSRF via ExternalUrl — loopback/metadata guard added to `ValidateRequest` [ServiceManager.cs]
- [x] [Review][Patch] B2: WireMock server leaked on TryAdd collision — orphaned server stopped+disposed [ServiceManager.cs:CreateAsync, StartAsync]
- [x] [Review][Patch] B5: Unhandled JsonException on malformed TagsJson → 500 — Tags getter now guarded [Service.cs]
- [x] [Review][Patch] B6: GetNextPortAsync throws InvalidOperationException → unhandled 500 — now throws ValidationException(SERVICE_PORT_RANGE_EXHAUSTED) [ServiceManager.cs]
- [x] [Review][Patch] E3: Registry not cleared on test teardown — stale disposed entries accumulated [FishtankWebApplicationFactory.cs]
- [x] [Review][Patch] E5: Seed loop emits misleading info event even when engine start failed — now gated on service.Status == Live [EngineStartup.cs]
- [x] [Review][Patch] A1: AC-4 ordering not asserted in test — added names[0]/names[1] ordering assertions [Story2_1_ServicesTests.cs]
- [x] [Review][Patch] A2: AC-7 schema partially validated — added id, serviceId, createdAt, isRead assertions to AC-2 test [Story2_1_ServicesTests.cs]
- [x] [Review][Defer] B3: TOCTOU port race — no UNIQUE on Services.Port column — deferred, pre-existing design gap
- [x] [Review][Defer] B4: Raw ex.Message in SystemEvents — admin-only surface, acceptable — deferred
- [x] [Review][Defer] E2: Concurrent Stop+Start race (no optimistic concurrency) — deferred, out of scope
- [x] [Review][Defer] E4: UpdateAsync doesn't restart WireMock when port/URL changes — deferred, future story
- [x] [Review][Defer] E6: TryTcpConnectAsync 500ms CI-flaky — deferred, increase if observed
- [x] [Review][Defer] E7: GetNextPortAsync port-reclaim test missing — deferred, test-automate pass
- [x] [Review][Defer] A3: AC-8 seed file import untested — deferred, test-automate pass
- [x] [Review][Defer] A5: /api/system-events unauth test missing — deferred, test-automate pass
- [x] [Review][Defer] A6: AC-9 port-exhausted test missing — deferred, test-automate pass
- [x] [Review][Defer] A7: mocksRootChanged null vs false — deferred, document in API contract
- [x] [Review][Defer] A8: /hubs/services auth not tested — deferred, when SignalR consumers implemented

### File List
