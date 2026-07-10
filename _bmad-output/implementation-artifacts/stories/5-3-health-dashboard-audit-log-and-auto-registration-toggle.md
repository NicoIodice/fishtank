---
story_id: "5.3"
story_key: "5-3-health-dashboard-audit-log-and-auto-registration-toggle"
epic: 5
story_title: "Health Dashboard, Audit Log & Auto-Registration Toggle"
status: ready-for-dev
version: v0.5.0
priority: high
frs_covered:
  - FR-29 (Auto-registration is an explicit opt-in via environment variable or Admin Console toggle. OFF by default. New self-created accounts are Standard User role.)
  - FR-32 (Health dashboard shows active services count, total request count, database status, and container uptime.)
  - FR-33 (Audit log displays user-initiated and system actions: action type, actor, timestamp, affected resource. Persisted to AuditLog DB table.)
ux_drs_covered:
  - EXPERIENCE.md Admin Console screen (Health Dashboard and Audit Log sub-section spec; Auto-Registration toggle placement)
  - UX-DR11 (Admin Console accessible to Admin-role only — established in Story 5-1)
nfrs_addressed:
  - NFR-8 (All API endpoints except /health and login require authentication — Admin endpoints require Admin role; GET /api/admin/health and GET /api/admin/audit enforce Admin role)
  - NFR-15 (No destructive actions in this story — audit log is read-only; health dashboard is read-only)
  - R-E5-004 (Audit log volume growth mitigated by index on CreatedAt for query performance)
architecture_items:
  - NEW src/Fishtank.Api/Data/Entities/AuditLog.cs — AuditLog entity with Id, Action, ActorId, ResourceType, ResourceId, Details, CreatedAt
  - NEW src/Fishtank.Api/Data/Migrations/*_AddAuditLogAndAutoRegistration.cs — EF Core migration adding AuditLog table + auto_registration toggle seed
  - NEW src/Fishtank.Api/Services/AuditService.cs — Service for creating audit entries
  - UPDATE src/Fishtank.Api/Endpoints/AdminEndpoints.cs — Add GET /api/admin/health and GET /api/admin/audit endpoints
  - NEW src/Fishtank.Api/Models/HealthDto.cs — Response DTO for health endpoint
  - NEW src/Fishtank.Api/Models/AuditEntryDto.cs — Response DTO for audit log entries
  - UPDATE src/Fishtank.Api/Services/FeatureToggleService.cs — Call AuditService.LogAsync on toggle change
  - UPDATE src/Fishtank.Api/Services/UserManagementService.cs — Call AuditService.LogAsync on user create/deactivate
  - UPDATE src/Fishtank.Api/Data/FishtankDbContext.cs — Add DbSet<AuditLog>, configure CreatedAt index
  - UPDATE src/Fishtank.Api/Program.cs — Register AuditService as scoped; update auto-registration check in register endpoint
  - UPDATE src/Fishtank.Api/Endpoints/AuthEndpoints.cs — Add POST /api/auth/register + public GET /api/auth/registration-status endpoints
  - NEW src/Fishtank.Api/Models/RegistrationStatusDto.cs — Public registration status DTO
  - NEW src/client/src/features/admin/components/HealthDashboardSection.tsx — Health metrics display
  - NEW src/client/src/features/admin/components/AuditLogSection.tsx — Audit log table with pagination
  - NEW src/client/src/features/admin/hooks/useHealth.ts — React Query hook for health data
  - NEW src/client/src/features/admin/hooks/useAuditLog.ts — React Query hook for audit log with pagination
  - NEW src/client/src/features/auth/hooks/useRegistrationStatus.ts — Public React Query hook (no auth required) for auto-registration state
  - UPDATE src/client/src/features/admin/pages/AdminConsolePage.tsx — Replace placeholder Health + Audit Log tabs with real sections
  - UPDATE src/client/src/features/auth/pages/LoginPage.tsx — Add conditional "Create account" link using useRegistrationStatus() hook (NOT useToggles — unauthenticated page)
risk_links:
  - R-E5-002 (Admin role escalation — Standard User calling /api/admin/health or /api/admin/audit returns 403; MEDIUM priority score 6; backend enforces role check)
  - R-E5-004 (Audit log volume growth — no pruning in v1; mitigated by CreatedAt index and documentation; HIGH DATA risk score 4)
test_design_ref: "_bmad-output/test-artifacts/test-design/test-design-epic-5.md"
---

# Story 5.3: Health Dashboard, Audit Log & Auto-Registration Toggle

## Story

**As an** admin,
**I want** to monitor system health, review the audit trail, and control whether users can self-register,
**So that** I have full operational visibility and control over the Fishtank instance.

---

## Status

ready-for-dev

---

## Context

### Background

Epic 5 delivers the administrative layer for Fishtank. **Story 5-1 (done)** established the Admin Console infrastructure with sub-navigation tabs and the Feature Toggles section. **Story 5-2 (done)** added the User Management sub-section.

**This story (5.3)** replaces the two placeholder tabs in the Admin Console (Health and Audit Log) with real content, introduces the AuditLog DB table, retroactively wires audit logging into the existing service layer, and adds the Auto-Registration Toggle.

**Critical context from previous stories:**

- **Story 5-1 (done):** `FeatureToggleService.cs` handles toggle state, env var overrides, and broadcasts via `TogglesHub`. The `FeatureToggles` table has five entries; this story adds `auto_registration` (seeded as `Enabled = false`).
- **Story 5-2 (done):** `UserManagementService.CreateUserAsync` and `UserManagementService.DeactivateUserAsync` need retroactive calls to `AuditService` — the note in Story 5-2's developer section explicitly flagged this.
- **Epic 1 Story 1.2 (done):** `GET /health` endpoint already implemented for Docker health checks. This story adds `GET /api/admin/health` which returns the same data with additional service-level detail, requiring Admin auth.

### Scope Boundaries

- **This story (5.3):** Health Dashboard UI + endpoint, Audit Log entity + service + UI + endpoint, retroactive audit logging in existing services, Auto-Registration toggle, self-registration endpoint.
- **Story 5-1 (done):** Feature toggle infrastructure — reused here for `auto_registration`.
- **Story 5-2 (done):** User management — `UserManagementService` updated here to call `AuditService`.
- **Story 5.4 (later):** Structured file logging (Serilog file sink) — NOT part of this story.

### What Exists (consumable now)

**Admin Console page** (`src/client/src/features/admin/pages/AdminConsolePage.tsx`):
- Sub-navigation tabs: Feature Toggles / Users / Health / Audit Log
- Feature Toggles and Users tabs contain real content
- **Health tab shows placeholder: "Coming in Story 5.3"**
- **Audit Log tab shows placeholder: "Coming in Story 5.3"**
- This story fills both placeholder tabs

**FeatureToggle entity + service** (established in Story 5-1):
```csharp
// FeatureTogglesTable — add auto_registration entry via migration:
// Name: "auto_registration" | DisplayName: "User Self-Registration" | Enabled: false (default OFF)
// Env var: FISHTANK_AUTO_REGISTRATION
```
- `FeatureToggleService.GetToggles()` already handles env var override and returns all toggles
- Auto-registration toggle reuses this infrastructure — no new toggle system needed

**GET /health endpoint** (`AuthEndpoints.cs` or `HealthEndpoints.cs`):
- Already returns container health status for Docker health checks
- `GET /api/admin/health` exposes the same data + service-level detail, requires Admin JWT

**SignalR + React Query seam** (established in Epic 1 + Story 5-1):
- `HUB_INVALIDATION_MAP` in `queryClient.ts` handles hub event → query invalidation
- No SignalR events needed for this story (health and audit log are polling-based)

**Response envelope pattern** (established in Epic 1):
```json
{ "success": true, "data": <typed payload> }
```

**Error code conventions** (established in Epics 1–5):
- `ADMIN_FORBIDDEN` — Standard User accesses admin endpoint
- `AUTH_*` prefix for auth errors
- `ADMIN_*` prefix for admin errors

### What This Story Adds

**Backend:**
1. `AuditLog` entity + EF Core migration with `CreatedAt` index
2. `AuditService.cs` — writes audit entries
3. Retroactive calls to `AuditService` in `FeatureToggleService` and `UserManagementService`
4. `GET /api/admin/health` endpoint — returns structured health metrics
5. `GET /api/admin/audit` endpoint — returns paginated audit log (newest-first)
6. Migration seed: `auto_registration` toggle (Enabled = false) added to FeatureToggles table
7. `POST /api/auth/register` — self-registration endpoint gated by `auto_registration` toggle

**Frontend:**
1. `HealthDashboardSection.tsx` — active services, request count, DB status, uptime
2. `AuditLogSection.tsx` — audit log table with pagination
3. `useHealth.ts` — React Query polling hook for health data
4. `useAuditLog.ts` — React Query paginated hook for audit entries
5. Admin Console page — replace Health + Audit Log placeholder tabs with real sections
6. Login page — conditional "Create account" link when auto-registration is enabled

---

## Acceptance Criteria

### AC-1: Health Dashboard section displays operational metrics (FR-32)
**Given** the Admin Console → Health tab is loaded,
**Then** the Health Dashboard section displays:
- **Active Services:** count of services currently in `live` status
- **Total Requests:** cumulative request count from the in-memory activity log
- **Database:** status pill — "Accessible" (green) or "Inaccessible" (red)
- **Uptime:** human-readable container uptime (e.g., "2h 34m", "3d 12h")

**And** a "Last refreshed" timestamp is shown below the metrics with a manual refresh icon.
**And** the data auto-refreshes every 30 seconds (React Query `refetchInterval: 30_000`).

### AC-2: GET /api/admin/health returns structured health data (FR-32)
**Given** an Admin-role user calls `GET /api/admin/health`,
**Then** HTTP 200 is returned with:
```json
{
  "success": true,
  "data": {
    "activeServicesCount": 3,
    "totalRequestCount": 1542,
    "databaseStatus": "accessible",
    "uptimeSeconds": 9241
  }
}
```

**And** `activeServicesCount` matches the count of services with `Status = "live"` in the DB.
**And** `totalRequestCount` reflects the in-memory activity log total (same source as `GET /health`).
**And** `databaseStatus` is `"accessible"` if the DB can be queried, `"inaccessible"` otherwise.
**And** `uptimeSeconds` is measured from container process start time.

### AC-3: GET /api/admin/health requires Admin role (NFR-8, R-E5-002)
**Given** a Standard User with a valid JWT,
**When** calling `GET /api/admin/health`,
**Then** HTTP 403 Forbidden is returned with error code `ADMIN_FORBIDDEN`.

### AC-4: Audit Log section displays entries (FR-33)
**Given** the Admin Console → Audit Log tab is loaded,
**Then** a table displays audit entries with columns:
- **Action** (e.g., TOGGLE_CHANGED, USER_CREATED, USER_DEACTIVATED, SERVICE_CREATED, SERVICE_EDITED)
- **Actor** (username, or "system" for system-generated entries)
- **Resource** (resource type + ID/name, e.g., "Toggle: network_activity", "User: developer")
- **Timestamp** (formatted as ISO 8601, local timezone)

**And** entries are displayed newest-first.
**And** the table shows 20 entries per page with a "Load more" button.
**And** an empty state is shown when no audit entries exist: "No audit entries yet."

### AC-5: GET /api/admin/audit returns paginated audit entries (FR-33)
**Given** an Admin-role user calls `GET /api/admin/audit`,
**Then** HTTP 200 is returned with:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "action": "USER_DEACTIVATED",
        "actorUsername": "admin",
        "resourceType": "User",
        "resourceId": "7fa85f64-5717-4562-b3fc-2c963f66afa7",
        "details": { "username": "developer" },
        "createdAt": "2026-07-10T14:22:00Z"
      }
    ],
    "total": 42,
    "page": 1,
    "pageSize": 20
  }
}
```

**And** query parameter `?page=N` controls pagination (default `page=1`, `pageSize=20`).
**And** entries are ordered by `CreatedAt DESC`.

### AC-6: GET /api/admin/audit requires Admin role (NFR-8, R-E5-002)
**Given** a Standard User with a valid JWT,
**When** calling `GET /api/admin/audit`,
**Then** HTTP 403 Forbidden is returned with error code `ADMIN_FORBIDDEN`.

### AC-7: AuditLog entity schema (FR-33)
**Given** the database schema,
**Then** the `AuditLog` table contains:
- `Id` — GUID, primary key
- `Action` — string (e.g., "TOGGLE_CHANGED", "USER_CREATED", "USER_DEACTIVATED", "SERVICE_CREATED", "SERVICE_EDITED")
- `ActorId` — nullable GUID, FK to Users.Id (null for system-generated entries)
- `ResourceType` — string (e.g., "Toggle", "User", "Service")
- `ResourceId` — nullable string (toggle name, user GUID, service GUID)
- `Details` — nullable string (JSON blob for additional context)
- `CreatedAt` — DateTimeOffset, UTC

**And** a non-clustered index exists on `CreatedAt DESC` for query performance (R-E5-004).

### AC-8: Audit entries are created for user-initiated actions (FR-33)
**Given** an Admin changes a feature toggle state,
**Then** an audit entry is created: `Action = "TOGGLE_CHANGED"`, `ResourceType = "Toggle"`, `ResourceId = toggle.Name`, `ActorId = admin.Id`, `Details = { "from": false, "to": true }`.

**Given** an Admin creates a new user,
**Then** an audit entry is created: `Action = "USER_CREATED"`, `ResourceType = "User"`, `ResourceId = newUser.Id.ToString()`, `ActorId = admin.Id`, `Details = { "username": "newuser" }`.

**Given** an Admin deactivates a user,
**Then** an audit entry is created: `Action = "USER_DEACTIVATED"`, `ResourceType = "User"`, `ResourceId = deactivatedUser.Id.ToString()`, `ActorId = admin.Id`, `Details = { "username": "deactivateduser" }`.

**Implementation note:** `AuditService.LogAsync(...)` is called from the service layer (`FeatureToggleService`, `UserManagementService`). These are retroactive additions to code created in Stories 5-1 and 5-2. The actor's user ID must be passed from the endpoint handler into the service method.

### AC-9: Auto-Registration Toggle in Admin Console (FR-29)
**Given** the Feature Toggles section of the Admin Console,
**Then** an `auto_registration` toggle entry appears with:
- Display name: "User Self-Registration"
- Description: "Allow new accounts to be created via the registration page. New accounts are Standard User role."
- Default state: **disabled** (OFF)
- Toggle switch disabled for env-var-locked entries (same pattern as Story 5-1)

**Given** `FISHTANK_AUTO_REGISTRATION=true` is set as a container environment variable,
**Then** the User Self-Registration toggle shows as enabled and env-var-locked:
- Toggle switch rendered as `aria-disabled="true"`, 50% opacity, `cursor: not-allowed`
- "Overridden by env var" badge displayed next to the toggle name
- Tooltip: "This toggle is locked by environment variable `FISHTANK_AUTO_REGISTRATION` and cannot be changed at runtime."

**Note:** This reuses the full existing toggle infrastructure from Story 5-1. Only a new migration seed and env var mapping are required — no new toggle components.

### AC-10: Self-registration endpoint respects toggle state (FR-29)
**Given** auto-registration is **OFF** (default),
**When** `POST /api/auth/register` is called with a username and password,
**Then** HTTP 403 is returned with error code `AUTH_REGISTRATION_DISABLED` and message "Self-registration is disabled for this instance."

**Given** auto-registration is **ON** (toggled or env var),
**When** `POST /api/auth/register` is called with a valid username (non-duplicate) and password (≥12 chars),
**Then** a new Standard User account is created with `ForcePasswordChange = false` (user chose their own password);
**And** HTTP 200 is returned with a JWT cookie set (user is logged in immediately);
**And** the response envelope includes the created user's DTO.

**Given** auto-registration is ON but the username already exists,
**Then** HTTP 409 is returned with error code `AUTH_USERNAME_EXISTS`.

**Given** auto-registration is ON but the password is shorter than 12 characters,
**Then** HTTP 400 is returned with validation error.

### AC-11: Login page shows conditional registration link (FR-29)
**Given** auto-registration is OFF,
**Then** the login page does NOT display a "Create account" or "Register" link.

**Given** auto-registration is ON,
**Then** the login page displays a "Create account" link below the login form that navigates to `/register`.

(The login page fetches registration state from the **public** `GET /api/auth/registration-status` endpoint via `useRegistrationStatus()`. It does NOT call `/api/admin/toggles` — that endpoint requires Admin auth.)

**Given** the `/register` route,
**Then** it renders a registration form with:
- Username field (required)
- Password field (required, ≥12 characters)
- Confirm Password field
- "Create account" submit button
- Link back to login: "Already have an account? Sign in"

**Given** `/register` is accessed when auto-registration is OFF,
**Then** the page displays: "Self-registration is not available for this instance." with a "Sign in" link.

### AC-12: Admin Console placeholder tabs replaced (AC from Stories 5-1 and 5-2)
**Given** the Admin Console page,
**Then** the Health tab renders `HealthDashboardSection` (no longer shows "Coming in Story 5.3").
**And** the Audit Log tab renders `AuditLogSection` (no longer shows "Coming in Story 5.3").
**And** the Feature Toggles section now includes the `auto_registration` toggle entry.

### AC-13: data-testid attributes (mandatory)
**Given** the implementation is complete,
**Then** all new interactive and structural elements carry canonical `data-testid` values:

| Element | `data-testid` |
|---|---|
| Health Dashboard section container | `section-health` |
| Active services metric | `health-active-services` |
| Total requests metric | `health-total-requests` |
| Database status metric | `health-db-status` |
| Uptime metric | `health-uptime` |
| Health refresh button | `btn-health-refresh` |
| Audit Log section container | `section-audit-log` |
| Audit Log table | `table-audit-log` |
| Audit Log row (dynamic) | `audit-row-{id}` |
| Audit Log load more button | `btn-audit-load-more` |
| Auto-registration toggle entry | `toggle-row-auto_registration` |
| Auto-registration toggle switch | `toggle-switch-auto_registration` |
| Register page container | `page-register` |
| Register username input | `input-register-username` |
| Register password input | `input-register-password` |
| Register confirm password input | `input-register-confirm-password` |
| Register submit button | `btn-register-submit` |
| Login page register link | `link-login-register` |

---

## Technical Requirements

### Backend: AuditLog Entity

**`src/Fishtank.Api/Data/Entities/AuditLog.cs`:**
```csharp
public class AuditLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public required string Action { get; set; }           // e.g., "TOGGLE_CHANGED"
    public Guid? ActorId { get; set; }                    // FK to Users.Id; null = system
    public required string ResourceType { get; set; }     // e.g., "Toggle", "User", "Service"
    public string? ResourceId { get; set; }               // toggle name, user GUID, service GUID
    public string? Details { get; set; }                  // JSON string for extra context
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    // Navigation
    public User? Actor { get; set; }
}
```

**`FishtankDbContext.cs` update:**
```csharp
public DbSet<AuditLog> AuditLog { get; set; }

protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    // ... existing config ...

    modelBuilder.Entity<AuditLog>(entity =>
    {
        entity.HasIndex(a => a.CreatedAt);  // R-E5-004 perf index
        entity.HasOne(a => a.Actor)
              .WithMany()
              .HasForeignKey(a => a.ActorId)
              .OnDelete(DeleteBehavior.SetNull);
    });
}
```

### Backend: AuditService

**`src/Fishtank.Api/Services/AuditService.cs`:**
```csharp
public class AuditService(FishtankDbContext db)
{
    public async Task LogAsync(
        string action,
        Guid? actorId,
        string resourceType,
        string? resourceId = null,
        object? details = null)
    {
        var entry = new AuditLog
        {
            Action = action,
            ActorId = actorId,
            ResourceType = resourceType,
            ResourceId = resourceId,
            Details = details is null ? null : JsonSerializer.Serialize(details)
        };
        db.AuditLog.Add(entry);
        await db.SaveChangesAsync();
    }
}
```

**Register in Program.cs:**
```csharp
builder.Services.AddScoped<AuditService>();
```

### Backend: Audit Action Constants

**`src/Fishtank.Api/Services/AuditActions.cs` (new file):**
```csharp
public static class AuditActions
{
    public const string ToggleChanged  = "TOGGLE_CHANGED";
    public const string UserCreated    = "USER_CREATED";
    public const string UserDeactivated = "USER_DEACTIVATED";
    public const string ServiceCreated = "SERVICE_CREATED";
    public const string ServiceEdited  = "SERVICE_EDITED";
}
```

### Backend: Retroactive Audit Calls

**`FeatureToggleService.SetToggleAsync()` update** (Story 5-1 file):
```csharp
// After saving toggle change to DB:
await _auditService.LogAsync(
    AuditActions.ToggleChanged,
    actorId,
    "Toggle",
    toggle.Name,
    new { from = oldEnabled, to = toggle.Enabled }
);
```
→ Add `actorId` parameter to `SetToggleAsync(string name, bool enabled, Guid actorId)`.

**`UserManagementService.CreateUserAsync()` update** (Story 5-2 file):
```csharp
// After creating user:
await _auditService.LogAsync(
    AuditActions.UserCreated,
    actorId,
    "User",
    newUser.Id.ToString(),
    new { username = newUser.Username }
);
```

**`UserManagementService.DeactivateUserAsync()` update** (Story 5-2 file):
```csharp
// After deactivating user:
await _auditService.LogAsync(
    AuditActions.UserDeactivated,
    actorId,
    "User",
    user.Id.ToString(),
    new { username = user.Username }
);
```

**Note:** The `actorId` (current user's GUID) must be extracted from the JWT claims in the endpoint handler and passed into the service methods. Use `httpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value` parsed as `Guid`.

### Backend: GET /api/admin/health Response DTO

**`src/Fishtank.Api/Models/HealthDto.cs`:**
```csharp
public record HealthDto
{
    public required int ActiveServicesCount { get; init; }
    public required long TotalRequestCount { get; init; }
    public required string DatabaseStatus { get; init; }   // "accessible" | "inaccessible"
    public required long UptimeSeconds { get; init; }
}
```

**Endpoint (added to `AdminEndpoints.cs`):**
```csharp
group.MapGet("/health", async (
    FishtankDbContext db,
    IActivityLogService activityLog,
    IHostApplicationLifetime lifetime) =>
{
    var activeServices = await db.Services.CountAsync(s => s.Status == "live");
    var totalRequests = activityLog.GetTotalRequestCount();
    var dbOk = await CheckDatabaseAsync(db);
    var uptime = (long)(DateTime.UtcNow - Process.GetCurrentProcess().StartTime.ToUniversalTime()).TotalSeconds;

    return Results.Ok(new ResponseEnvelope<HealthDto>(new HealthDto
    {
        ActiveServicesCount = activeServices,
        TotalRequestCount = totalRequests,
        DatabaseStatus = dbOk ? "accessible" : "inaccessible",
        UptimeSeconds = uptime
    }));
});
```

### Backend: GET /api/admin/audit Response DTO

**`src/Fishtank.Api/Models/AuditEntryDto.cs`:**
```csharp
public record AuditEntryDto
{
    public required Guid Id { get; init; }
    public required string Action { get; init; }
    public required string? ActorUsername { get; init; }   // null → "system"
    public required string ResourceType { get; init; }
    public required string? ResourceId { get; init; }
    public required object? Details { get; init; }         // deserialized JSON or null
    public required DateTimeOffset CreatedAt { get; init; }
}

public record AuditPageDto
{
    public required IReadOnlyList<AuditEntryDto> Items { get; init; }
    public required int Total { get; init; }
    public required int Page { get; init; }
    public required int PageSize { get; init; }
}
```

**Endpoint (added to `AdminEndpoints.cs`):**
```csharp
group.MapGet("/audit", async (
    FishtankDbContext db,
    [FromQuery] int page = 1,
    [FromQuery] int pageSize = 20) =>
{
    var query = db.AuditLog
        .Include(a => a.Actor)
        .OrderByDescending(a => a.CreatedAt);

    var total = await query.CountAsync();
    var items = await query
        .Skip((page - 1) * pageSize)
        .Take(pageSize)
        .Select(a => new AuditEntryDto
        {
            Id = a.Id,
            Action = a.Action,
            ActorUsername = a.Actor != null ? a.Actor.Username : null,
            ResourceType = a.ResourceType,
            ResourceId = a.ResourceId,
            Details = a.Details != null
                ? JsonSerializer.Deserialize<object>(a.Details)
                : null,
            CreatedAt = a.CreatedAt
        })
        .ToListAsync();

    return Results.Ok(new ResponseEnvelope<AuditPageDto>(new AuditPageDto
    {
        Items = items,
        Total = total,
        Page = page,
        PageSize = pageSize
    }));
});
```

### Backend: Auto-Registration Migration Seed

**New migration adds `auto_registration` toggle to the `FeatureToggles` table:**
```csharp
migrationBuilder.InsertData(
    table: "FeatureToggles",
    columns: new[] { "Id", "Name", "DisplayName", "Description", "Enabled", "UpdatedAt" },
    values: new object[] {
        Guid.NewGuid(),
        "auto_registration",
        "User Self-Registration",
        "Allow new accounts to be created via the registration page. New accounts are Standard User role.",
        false,   // OFF by default — unlike other toggles which default to true
        DateTimeOffset.UtcNow
    }
);
```

**`FeatureToggleService` env var mapping update:**
```csharp
// In the env var override loading startup code:
private static readonly Dictionary<string, string> EnvVarMap = new()
{
    ["network_activity"]  = "FISHTANK_TOGGLE_NETWORK_ACTIVITY",
    ["mappings_editor"]   = "FISHTANK_TOGGLE_MAPPINGS_EDITOR",
    ["record_mode"]       = "FISHTANK_TOGGLE_RECORD_MODE",
    ["system_events"]     = "FISHTANK_TOGGLE_SYSTEM_EVENTS",
    ["services_management"] = "FISHTANK_TOGGLE_SERVICES_MANAGEMENT",
    ["auto_registration"] = "FISHTANK_AUTO_REGISTRATION",   // NEW
};
```

### Backend: GET /api/auth/registration-status — Public Endpoint (no auth required)

**Added to `AuthEndpoints.cs`:**
```csharp
app.MapGet("/api/auth/registration-status", async (FeatureToggleService toggleService) =>
{
    var toggle = await toggleService.GetToggleAsync("auto_registration");
    return Results.Ok(new ResponseEnvelope<RegistrationStatusDto>(new RegistrationStatusDto
    {
        RegistrationEnabled = toggle?.Enabled ?? false
    }));
});
// No .RequireAuthorization() — must remain public (used by unauthenticated login page)
```

**`src/Fishtank.Api/Models/RegistrationStatusDto.cs`:**
```csharp
public record RegistrationStatusDto
{
    public required bool RegistrationEnabled { get; init; }
}
```

**Frontend hook `useRegistrationStatus.ts`:**
```typescript
// src/client/src/features/auth/hooks/useRegistrationStatus.ts
export function useRegistrationStatus() {
  return useQuery({
    queryKey: ['auth', 'registration-status'],
    queryFn: () => apiFetch<RegistrationStatusDto>('/api/auth/registration-status'),
    staleTime: 30_000,
  });
}
```

**Login page usage** (replaces the `useToggles()` reference):
```tsx
// In LoginPage.tsx — use the PUBLIC hook, not useToggles()
const { data: regStatus } = useRegistrationStatus();
const autoRegistrationEnabled = regStatus?.registrationEnabled ?? false;
```

**Note:** Do NOT use `useToggles()` on the login page — that hook calls `/api/admin/toggles` which requires Admin auth. The login page is rendered before any authentication.

---

### Backend: POST /api/auth/register Endpoint

**Added to `AuthEndpoints.cs`:**
```csharp
app.MapPost("/api/auth/register", async (
    RegisterRequest request,
    FishtankDbContext db,
    FeatureToggleService toggleService,
    IPasswordHasher<User> hasher) =>
{
    // Check auto-registration toggle
    var autoReg = await toggleService.GetToggleAsync("auto_registration");
    if (autoReg is null || !autoReg.Enabled)
        throw new ForbiddenException("AUTH_REGISTRATION_DISABLED",
            "Self-registration is disabled for this instance.");

    // Validate
    if (string.IsNullOrWhiteSpace(request.Username))
        return Results.ValidationProblem(...);
    if (request.Password.Length < 12)
        return Results.ValidationProblem(...);

    // Check uniqueness
    if (await db.Users.AnyAsync(u => u.Username == request.Username))
        throw new ConflictException("AUTH_USERNAME_EXISTS",
            "A user with this username already exists.");

    // Create user (ForcePasswordChange = false — user chose their own password)
    var user = new User
    {
        Username = request.Username,
        PasswordHash = hasher.HashPassword(null!, request.Password),
        Role = "StandardUser",
        ForcePasswordChange = false,
        IsActive = true,
        TokenVersion = 0
    };
    db.Users.Add(user);
    await db.SaveChangesAsync();

    // Issue JWT cookie (auto-login after registration)
    var token = _jwtService.GenerateToken(user);
    return Results.Ok(/* set cookie + return UserDto */);
});
```

**Request DTO:**
```csharp
public record RegisterRequest
{
    public required string Username { get; init; }
    public required string Password { get; init; }
}
```

### Frontend: HealthDashboardSection Component

**`src/client/src/features/admin/components/HealthDashboardSection.tsx`:**
- Grid layout (2 columns, 2 rows) for 4 metric cards
- Each card: icon + label + value
- Database status: green "Accessible" badge or red "Inaccessible" badge
- Uptime formatted as `Xd Xh Xm` using utility function
- Manual refresh button calls `refetch()` from `useHealth()`
- "Last refreshed" timestamp updates on each successful fetch
- Auto-refresh via `refetchInterval: 30_000` in the query hook

**`src/client/src/features/admin/hooks/useHealth.ts`:**
```typescript
export function useHealth() {
  return useQuery({
    queryKey: ['admin', 'health'],
    queryFn: () => apiFetch<HealthDto>('/api/admin/health'),
    refetchInterval: 30_000,
  });
}
```

### Frontend: AuditLogSection Component

**`src/client/src/features/admin/components/AuditLogSection.tsx`:**
- Table with columns: Action, Actor, Resource, Timestamp
- Actor column: username or "system" (italic) when `actorUsername` is null
- Resource column: `{resourceType}: {resourceId or name from Details}`
- Timestamp column: `toLocaleString()` in local timezone
- "Load more" button at bottom of table (increments page, appends to existing results)
- Empty state when `total === 0`

**`src/client/src/features/admin/hooks/useAuditLog.ts`:**
```typescript
export function useAuditLog() {
  const [page, setPage] = useState(1);
  const [allItems, setAllItems] = useState<AuditEntryDto[]>([]);

  const query = useQuery({
    queryKey: ['admin', 'audit', page],
    queryFn: () => apiFetch<AuditPageDto>(`/api/admin/audit?page=${page}`),
  });

  useEffect(() => {
    if (query.data) {
      setAllItems(prev =>
        page === 1 ? query.data!.items : [...prev, ...query.data!.items]
      );
    }
  }, [query.data, page]);

  const loadMore = () => setPage(p => p + 1);
  const hasMore = allItems.length < (query.data?.total ?? 0);

  return { items: allItems, isLoading: query.isLoading, loadMore, hasMore };
}
```

### Frontend: Login Page Update

**`src/client/src/features/auth/pages/LoginPage.tsx`:**
- Fetch auto-registration toggle state via `useToggles()` (already has the data)
- Conditionally render "Create account" link:
```tsx
{autoRegistrationEnabled && (
  <p className="mt-4 text-center text-sm text-muted-foreground">
    Don't have an account?{' '}
    <Link
      to="/register"
      data-testid="link-login-register"
      className="underline"
    >
      Create account
    </Link>
  </p>
)}
```
- Add `/register` route in `router.tsx` pointing to `RegisterPage` component

### Frontend: Register Page

**`src/client/src/features/auth/pages/RegisterPage.tsx`:**
- Same layout/styling as `LoginPage.tsx`
- On submit: calls `POST /api/auth/register` via a `useRegister()` mutation
- On success: `navigate('/')` (JWT cookie set, app shell loads)
- If auto-registration is disabled at page load, shows "not available" message instead of form
- Back-to-login link always visible

---

## Developer Notes

### Previous Story Learnings (from Stories 5-1 and 5-2)

**Admin Console patterns (5-1):**
- Sub-navigation tabs use shadcn/ui `Tabs` component; each tab section component is self-contained
- Toggle infrastructure is fully reusable — adding `auto_registration` to the seed migration is the only backend change needed in the toggles domain
- Admin role enforcement is at the route group level in `AdminEndpoints.cs`

**Service method signature evolution:**
- When adding `actorId` parameter to `SetToggleAsync`, `CreateUserAsync`, `DeactivateUserAsync` — update all call sites in the endpoint handlers
- The actor's GUID is available in the JWT as the `sub` claim (or `NameIdentifier` claim type)

**EF Core migration hygiene:**
- Single migration for both the `AuditLog` table and the `auto_registration` toggle seed
- Migration class name: `AddAuditLogAndAutoRegistration`
- Always run `dotnet ef migrations add` from the `Fishtank.Api` project directory

### Key Constraints

1. **AuditService is scoped, not singleton** — it wraps `FishtankDbContext` which is also scoped. Do not inject into singletons.

2. **Auto-registration defaults to OFF** — unlike the other 5 feature toggles that default to `true`, the `auto_registration` toggle seeds with `Enabled = false`. Verify the migration seed is correct.

3. **Self-registered users do NOT get ForcePasswordChange** — they chose their password at registration. Only admin-created users get `ForcePasswordChange = true`.

4. **Health endpoint is NOT the same as GET /health** — `GET /health` is the Docker health check (unauthenticated, minimal). `GET /api/admin/health` is the Admin Console data endpoint (requires Admin JWT, returns richer data).

5. **Audit log is write-only from services, read-only from UI** — no UI for deleting audit entries. No endpoint for deleting entries. v1 only.

6. **Actor resolution in endpoints** — the `actorId` must come from the JWT claim, not from a request body. Use `HttpContext.User.FindFirstValue(ClaimTypes.NameIdentifier)` and parse as `Guid`.

7. **Audit calls should not fail the main operation** — use `try/catch` around `AuditService.LogAsync` to prevent audit failures from rolling back the primary operation. Log a warning to stdout if audit logging fails.

### Test Scenarios from Test Design

See `_bmad-output/test-artifacts/test-design/test-design-epic-5.md` Story 5-3 section:

**P0 (Critical):**
- `GET /api/admin/health` returns active services count, request count, DB status, uptime (Integration)
- `GET /api/admin/audit` returns audit entries newest-first (Integration)
- Auto-registration OFF by default → self-registration returns 403 (Integration)
- Health Dashboard shows active services count (Component)
- Audit Log displays entries (Component)

**P1 (High):**
- AuditLog entity schema validation (Unit)
- Audit entry created on toggle change (Unit)
- Audit entry created on user deactivate (Unit)
- Audit entry created on user create (Unit)
- `GET /api/admin/health` requires Admin role → Standard User gets 403 (Integration)
- Audit log pagination — 20 items per page (Integration)
- Auto-registration ON → self-registration succeeds (Integration)
- Auto-registration env var override takes precedence (Integration)
- Health Dashboard shows total request count (Component)
- Health Dashboard shows database status (Component)
- Health Dashboard shows container uptime (Component)
- Audit Log entries link to affected resource where applicable (Component)
- Auto-Registration toggle reflects current state (Component)
- Auto-Registration env-var-locked shows indicator (Component)
- Admin views Health Dashboard → data matches `/health` endpoint (E2E)
- Admin creates service → audit entry appears in Audit Log (E2E)
- Admin enables auto-registration → new user can self-register (E2E)

### Security Considerations

1. **Audit log is append-only** — no DELETE endpoint or admin UI for clearing audit entries. This is by design for accountability.

2. **Self-registration input validation** — sanitize username input at validation layer; EF Core handles parameterization. Never echo raw user input in error messages.

3. **Register endpoint does not require auth** — it is explicitly unauthenticated (self-registration creates the account + issues cookie). Ensure it is placed outside the authenticated route group.

4. **Auto-registration check must be server-side** — never rely on the client-side toggle state to gate self-registration. Always check `FeatureToggleService.GetToggleAsync("auto_registration")` in the endpoint.

---

## Definition of Done

All gates from `project-context.md` apply:

- [ ] All AC-1 through AC-13 acceptance criteria pass
- [ ] Backend unit tests: AuditLog entity schema matches spec
- [ ] Backend unit tests: AuditService creates entry with correct fields
- [ ] Backend integration tests: `GET /api/admin/health` returns correct structure
- [ ] Backend integration tests: `GET /api/admin/health` → 403 for Standard User
- [ ] Backend integration tests: `GET /api/admin/audit` returns entries newest-first
- [ ] Backend integration tests: `GET /api/admin/audit` → 403 for Standard User
- [ ] Backend integration tests: `POST /api/auth/register` → 403 when auto-registration is OFF
- [ ] Backend integration tests: `POST /api/auth/register` → creates Standard User when ON
- [ ] Backend integration tests: Audit entry created on toggle change
- [ ] Backend integration tests: Audit entry created on user create and deactivate
- [ ] TypeScript builds clean — 0 errors
- [ ] .NET builds clean — 0 errors, 0 warnings
- [ ] All new interactive/structural elements have `data-testid`
- [ ] msw handlers updated for `/api/admin/health`, `/api/admin/audit`, `/api/auth/register`
- [ ] EF Core migration runs cleanly: `dotnet ef database update`
- [ ] Story status set to `done` in sprint-status.yaml

---

## Files to Create/Update

### New Files
| File | Purpose |
|------|---------|
| `src/Fishtank.Api/Data/Entities/AuditLog.cs` | AuditLog entity |
| `src/Fishtank.Api/Data/Migrations/*_AddAuditLogAndAutoRegistration.cs` | EF Core migration |
| `src/Fishtank.Api/Services/AuditService.cs` | Audit entry creation service |
| `src/Fishtank.Api/Services/AuditActions.cs` | Audit action string constants |
| `src/Fishtank.Api/Models/HealthDto.cs` | Health endpoint response DTO |
| `src/Fishtank.Api/Models/AuditEntryDto.cs` | Audit log response DTO |
| `src/Fishtank.Api/Models/AuditPageDto.cs` | Paginated audit response DTO |
| `src/Fishtank.Api/Models/RegisterRequest.cs` | Self-registration request DTO |
| `src/client/src/features/admin/components/HealthDashboardSection.tsx` | Health metrics display |
| `src/client/src/features/admin/components/AuditLogSection.tsx` | Audit log table |
| `src/client/src/features/admin/hooks/useHealth.ts` | React Query health hook |
| `src/client/src/features/admin/hooks/useAuditLog.ts` | React Query audit log hook |
| `src/client/src/features/auth/pages/RegisterPage.tsx` | Self-registration form page |

### Updated Files
| File | Change |
|------|--------|
| `src/Fishtank.Api/Data/FishtankDbContext.cs` | Add `DbSet<AuditLog>`, configure index |
| `src/Fishtank.Api/Program.cs` | Register `AuditService`; add register endpoint |
| `src/Fishtank.Api/Endpoints/AdminEndpoints.cs` | Add health + audit endpoints |
| `src/Fishtank.Api/Endpoints/AuthEndpoints.cs` | Add `POST /api/auth/register` endpoint |
| `src/Fishtank.Api/Services/FeatureToggleService.cs` | Add `actorId` param + audit call |
| `src/Fishtank.Api/Services/UserManagementService.cs` | Add audit calls on create + deactivate |
| `src/client/src/features/admin/pages/AdminConsolePage.tsx` | Replace placeholder Health + Audit Log tabs |
| `src/client/src/features/auth/pages/LoginPage.tsx` | Conditional register link |
| `src/client/src/router.tsx` | Add `/register` route |
| `src/client/tests/mocks/handlers.ts` | Add msw handlers for health, audit, register |

---

## Completion Note

Ultimate context engine analysis completed — comprehensive developer guide created. This story completes the Admin Console feature set (replacing the last two placeholder tabs) and introduces the audit trail infrastructure. The retroactive audit calls to Stories 5-1 and 5-2 service files are explicitly scoped and constrained to minimize regression risk.
