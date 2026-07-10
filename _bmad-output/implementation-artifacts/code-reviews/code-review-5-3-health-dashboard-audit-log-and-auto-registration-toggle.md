---
story_key: "5-3-health-dashboard-audit-log-and-auto-registration-toggle"
date: "2026-07-10"
verdict: fail
blocker_count: 1
major_count: 4
minor_count: 4
dismissed_count: 0
---

# Code Review: Story 5-3 — Health Dashboard, Audit Log & Auto-Registration Toggle

**Reviewer:** GitHub Copilot (adversarial review)
**Date:** 2026-07-10
**Story:** Health Dashboard, Audit Log & Auto-Registration Toggle
**Verdict:** ❌ FAIL — 1 BLOCKER must be resolved before advancing.

---

## Overall Assessment

Solid implementation overall — the audit service, entity, migration, admin endpoints, and test scaffolds are well-structured and follow project conventions. The Auth + Admin endpoint security (role enforcement, `FirstRunMiddleware` allowlist) is correct. The `data-testid` coverage is complete. However, one **BLOCKER** env var mismatch breaks a spec-mandated AC, four **MAJOR** issues include a memory-scalability bomb in the audit endpoint and a pervasive violation of the project's mandatory `apiFetch` rule across all new frontend code.

---

## BLOCKER Findings (1)

### B-1: `auto_registration` toggle reads wrong env var key

**Location:** `src/Fishtank.Api/Services/FeatureToggleService.cs` — `LoadEnvVarOverrides()`

**Detail:** The `FeatureToggleService` uses a uniform formula to derive the env var name for all toggles:

```csharp
var envKey = $"FISHTANK_TOGGLE_{toggle.ToUpperInvariant()}";
```

For `auto_registration` this produces `FISHTANK_TOGGLE_AUTO_REGISTRATION`.

The story spec (AC-9, Technical Requirements env var map) explicitly specifies:
```csharp
["auto_registration"] = "FISHTANK_AUTO_REGISTRATION",   // NEW
```

The acceptance criterion is:
> **Given** `FISHTANK_AUTO_REGISTRATION=true` is set as a container environment variable, **Then** the User Self-Registration toggle shows as enabled and env-var-locked.

A container operator setting `FISHTANK_AUTO_REGISTRATION=true` (per docs/AC-9) will find the toggle is not locked — the env var override silently has no effect. The uniform formula applies to the five existing toggles but the spec intentionally uses a different key for `auto_registration` (consistent with how the app is documented to end users).

**Fix:** Special-case `auto_registration` in `LoadEnvVarOverrides()`, or replace the formula with a dictionary that maps toggle names to their correct env var keys.

```csharp
private static readonly Dictionary<string, string> _envVarKeys = new()
{
    ["network_activity"]    = "FISHTANK_TOGGLE_NETWORK_ACTIVITY",
    ["mappings_editor"]     = "FISHTANK_TOGGLE_MAPPINGS_EDITOR",
    ["record_mode"]         = "FISHTANK_TOGGLE_RECORD_MODE",
    ["system_events"]       = "FISHTANK_TOGGLE_SYSTEM_EVENTS",
    ["services_management"] = "FISHTANK_TOGGLE_SERVICES_MANAGEMENT",
    ["auto_registration"]   = "FISHTANK_AUTO_REGISTRATION",  // intentionally different
};
```

---

## MAJOR Findings (4)

### M-1: Audit endpoint loads the entire `AuditLogs` table into memory before paginating

**Location:** `src/Fishtank.Api/Endpoints/AdminEndpoints.cs` — `GetAuditAsync()`

**Detail:** The comment reads "sort in-memory to avoid SQLite DateTimeOffset ORDER BY limitation". This premise is incorrect — SQLite stores `DateTimeOffset` as ISO 8601 TEXT and ISO 8601 strings sort lexicographically in the same order as their chronological order. The current implementation:

```csharp
var allEntries = await db.AuditLogs
    .Include(a => a.Actor)
    .ToListAsync(ct);          // ← loads ENTIRE table into process memory

var entries = allEntries
    .OrderByDescending(a => a.CreatedAt)
    .Skip((page - 1) * pageSize)
    .Take(pageSize)
    ...
```

For 10,000 audit entries each with included Actor navigation, this allocates a large in-memory list for every request to page 1. As audit log grows (it has no pruning in v1 per R-E5-004), this will degrade to OOM conditions.

**Fix:** Push ordering and pagination to the database:

```csharp
var total = await db.AuditLogs.CountAsync(ct);

var items = await db.AuditLogs
    .Include(a => a.Actor)
    .OrderByDescending(a => a.CreatedAt)
    .Skip((page - 1) * pageSize)
    .Take(pageSize)
    .Select(a => new AuditEntryDto(...))
    .ToListAsync(ct);
```

EF Core translates `OrderByDescending` on a SQLite TEXT column correctly for ISO 8601 dates.

---

### M-2: All four new frontend API calls use raw `fetch` instead of `apiFetch`

**Locations:**
- `src/client/src/features/admin/hooks/useHealth.ts` — `fetchHealth()`
- `src/client/src/features/admin/hooks/useAuditLog.ts` — `fetchAuditLog()`
- `src/client/src/features/auth/hooks/useRegistrationStatus.ts` — `fetchRegistrationStatus()`
- `src/client/src/features/auth/pages/RegisterPage.tsx` — `registerUser()`

**Detail:** The project context states (non-negotiable rule):

> **All API calls go through `lib/api.ts` — never raw `fetch` in components or hooks**

Every new hook in this story uses raw `fetch` with hand-rolled envelope parsing and bespoke error handling. Each one also re-defines a local `interface ApiResponse<T>` inline — a duplication of what `apiFetch` already handles. The `apiFetch` function also handles `401 → redirect to /login`, which these hooks skip entirely.

**Fix:** Replace raw `fetch` + hand-rolled parsing with `apiFetch` from `@/lib/api`. Example for `useHealth.ts`:

```typescript
import { apiFetch } from "@/lib/api";
import type { HealthDto } from "../types";

export function useHealth() {
  return useQuery({
    queryKey: ["admin", "health"],
    queryFn: () => apiFetch<HealthDto>("/api/admin/health"),
    refetchInterval: 30_000,
  });
}
```

For `useRegistrationStatus.ts`, since the endpoint is public, use `apiFetch` with `redirectOn401: false` to prevent an unwanted login redirect:

```typescript
queryFn: () => apiFetch<RegistrationStatusDto>("/api/auth/registration-status", { redirectOn401: false })
    .catch(() => ({ enabled: false })),
```

---

### M-3: `RegisterHandler` two-step non-atomic `ForcePasswordChange` correction

**Location:** `src/Fishtank.Api/Endpoints/AuthEndpoints.cs` — `RegisterHandler()`

**Detail:** `IUserManagementService.CreateUserAsync` always sets `ForcePasswordChange = true` (Admin-created users must change on first login). The register handler then performs a second, separate DB transaction to correct it:

```csharp
var userDto = await userService.CreateUserAsync(req.Username, req.Password, null, ct);

// ← crash window here

var user = await db.Users.FindAsync(new object[] { userDto.Id }, ct);
if (user is not null)
{
    user.ForcePasswordChange = false;
    await db.SaveChangesAsync(ct);
}
```

If the process crashes between the two `SaveChangesAsync` calls, the newly self-registered user is permanently stuck with `ForcePasswordChange = true`. The user chose their own password and will immediately be prompted to change it — a broken UX that can only be resolved by an admin.

Additionally, this design leaks the Admin user-creation flow into the self-registration path by reusing an interface method that has a different semantic contract.

**Fix (option A — preferred):** Add an optional parameter to `CreateUserAsync`:
```csharp
Task<UserDto> CreateUserAsync(
    string username, string password, Guid? actorId,
    bool forcePasswordChange = true,
    CancellationToken ct = default);
```
Call it from `RegisterHandler` with `forcePasswordChange: false`.

**Fix (option B):** Add a dedicated `CreateSelfRegisteredUserAsync` method to `IUserManagementService` that encapsulates the different creation semantics.

---

### M-4: `AuditService.LogAsync` swallows exceptions with no observability trace

**Location:** `src/Fishtank.Api/Services/AuditService.cs`

**Detail:** The catch block is entirely empty:

```csharp
catch
{
    // Audit logging must not fail the main operation
    // Swallow exception (could log to Serilog in future)
}
```

Silently swallowing exceptions with no trace is an operational visibility risk. When audit writes fail (DB contention, constraint violation, etc.), operators have zero indication in logs. The project already uses Serilog structured logging everywhere; a `Log.Warning` here costs nothing.

**Fix:** Add a Serilog warning:

```csharp
catch (Exception ex)
{
    Log.Warning(ex, "Audit log write failed for action {Action} by actor {ActorId}. Entry dropped.",
        action, actorId);
}
```

This preserves the "never fail the caller" contract while maintaining operational visibility.

---

## MINOR Findings (4)

### N-1: `HealthDto` uses `int` for `TotalRequestCount` and `UptimeSeconds` — spec says `long`

**Location:** `src/Fishtank.Api/Models/HealthDto.cs`

**Detail:** Spec defines `long TotalRequestCount` and `long UptimeSeconds`. Implementation uses `int`. For `UptimeSeconds`, `int.MaxValue` ≈ 68 years — safe in practice, but for `TotalRequestCount` an active mock server can generate millions of requests; `int.MaxValue` (~2.1B) is reachable in high-traffic scenarios. The integration test already uses `GetInt64()` asserting the long semantic.

**Fix:** Change both to `long`:
```csharp
public record HealthDto(
    int ActiveServicesCount,
    long TotalRequestCount,
    string DatabaseStatus,
    long UptimeSeconds);
```

---

### N-2: `page` parameter in `GetAuditAsync` not validated as `>= 1`

**Location:** `src/Fishtank.Api/Endpoints/AdminEndpoints.cs` — `GetAuditAsync()`

**Detail:**
```csharp
var page = int.TryParse(httpContext.Request.Query["page"], out var p) ? p : 1;
```
`page=0` produces `Skip(-20)` which in LINQ to Objects silently returns all items (undefined pagination behavior). `page=-1` produces `Skip(-40)`, same outcome. Should validate and reject invalid inputs.

**Fix:**
```csharp
var page = int.TryParse(httpContext.Request.Query["page"], out var p) && p >= 1 ? p : 1;
```

---

### N-3: Migration seed uses `DateTimeOffset.UtcNow` (non-deterministic)

**Location:** `src/Fishtank.Api/Migrations/20260710134703_AddAuditLogAndAutoRegistration.cs`

**Detail:**
```csharp
values: new object[] { ..., false, DateTimeOffset.UtcNow }
```

Migration seed data should use deterministic, fixed values for reproducibility. Using `UtcNow` means the `UpdatedAt` value differs each time the migration is generated/replayed. EF Core migration snapshot comparisons also use the literal values, so this can produce spurious "pending migration" diagnostics in CI.

**Fix:** Use a fixed constant:
```csharp
new DateTimeOffset(2026, 7, 10, 0, 0, 0, TimeSpan.Zero)
```

---

### N-4: `useAuditLog.ts` calls `setState` during render — unconventional pattern

**Location:** `src/client/src/features/admin/hooks/useAuditLog.ts`

**Detail:**
```typescript
if (query.data && page !== prevPage) {
    setPrevPage(page);
    setAccumulatedItems((prev) => ...);
}
```

Calling `setState` directly in the render function body (not inside `useEffect`) is an unusual React pattern. React 18 tolerates it for synchronously derived state but it guarantees an additional render pass on every page change, and in Strict Mode it may cause double renders. The `prevPage` sentinel is functional but fragile.

**Fix:** Consider using a `useRef` for accumulation or restructuring to use `useMemo` to derive the items array from `page → data` query cache directly. At minimum, add a comment explaining why this pattern is intentional and safe here.

---

## Security Summary

| Check | Status |
|---|---|
| Admin role enforcement on `/api/admin/health` | ✅ Correct — `RequireRole("Admin")` on entire `/api/admin` group |
| Admin role enforcement on `/api/admin/audit` | ✅ Correct — inherited from group policy |
| Standard User gets 403 with `ADMIN_FORBIDDEN` | ✅ Via `JsonAuthorizationMiddlewareResultHandler` |
| `/api/auth/register` public access (no auth) | ✅ Not in `RequireAuthorization()` group |
| `/api/auth/registration-status` public access | ✅ Not in `RequireAuthorization()` group |
| `FirstRunMiddleware` allowlist includes `/api/auth/registration-status` | ✅ Present |
| `FirstRunMiddleware` blocks `/api/auth/register` before setup | ✅ Not in permit list (correct — can't register before setup) |
| JWT cookie for auto-login after registration | ✅ Correct — `SetJwtCookie()` used |
| `actorId = null` for self-registration (no impersonation) | ✅ Correct — nullability preserved throughout |
| SQL injection via username in register | ✅ Safe — EF Core parameterises all queries |
| Password validation on register endpoint | ✅ ≥12 chars enforced before user creation |

---

## Acceptance Criteria Coverage

| AC | Status | Notes |
|---|---|---|
| AC-1: Health dashboard displays metrics | ✅ | `HealthDashboardSection.tsx` complete with all 4 metrics + refresh |
| AC-2: GET /api/admin/health returns health data | ✅ | Correct schema and sources |
| AC-3: /api/admin/health requires Admin role | ✅ | Security critical — confirmed correct |
| AC-4: Audit log section displays entries | ✅ | Table + pagination + empty state |
| AC-5: GET /api/admin/audit returns paginated entries | ⚠️ MAJOR | Functionally correct but loads full table into memory (M-1) |
| AC-6: /api/admin/audit requires Admin role | ✅ | Security critical — confirmed correct |
| AC-7: AuditLog entity schema | ✅ | All fields, FK, index present |
| AC-8: Audit entries created for actions | ✅ | Toggle, UserCreate, UserDeactivate all wired |
| AC-9: auto_registration toggle in Admin Console | ❌ BLOCKER | Toggle seeded, env var key wrong (B-1) |
| AC-10: Self-registration respects toggle | ⚠️ MAJOR | Logic correct but ForcePasswordChange race condition (M-3) |
| AC-11: Login page shows conditional register link | ✅ | `useRegistrationStatus` + conditional link |
| AC-12: Placeholder tabs replaced | ✅ | Both Health and Audit Log sections wired |
| AC-13: data-testid attributes | ✅ | All canonical values present per spec table |

---

## Gate Decision

**❌ FAIL — Story must not advance to `done`.**

Required before closing:

1. **B-1 (BLOCKER):** Fix `auto_registration` env var key from `FISHTANK_TOGGLE_AUTO_REGISTRATION` → `FISHTANK_AUTO_REGISTRATION`
2. **M-1 (MAJOR):** Replace full-table `ToListAsync` with server-side `OrderByDescending + Skip/Take` in `GetAuditAsync`
3. **M-2 (MAJOR):** Replace all 4 raw `fetch` calls with `apiFetch` from `@/lib/api` (hooks: `useHealth`, `useAuditLog`, `useRegistrationStatus`; page: `RegisterPage.tsx`)
4. **M-3 (MAJOR):** Fix non-atomic `ForcePasswordChange` in `RegisterHandler`
5. **M-4 (MAJOR):** Add Serilog `Warning` log in `AuditService.LogAsync` catch block

Minors (N-1 through N-4) may be fixed in this pass or deferred — they do not block advancement.
