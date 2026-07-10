---
story_id: "5.2"
story_key: "5-2-user-management-create-view-and-deactivate"
epic: 5
story_title: "User Management — Create, View & Deactivate"
status: done
priority: high
frs_covered:
  - FR-31 (Admin users can view, create, and deactivate user accounts. v1 supports two roles: Admin and Standard User. Deactivating a user invalidates their active JWT tokens.)
ux_drs_covered:
  - EXPERIENCE.md Admin Console screen (User Management sub-section spec)
  - UX-DR11 (Admin Console accessible to Admin-role only — established in Story 5-1)
  - NFR-15 (Destructive actions require explicit confirmation — deactivation confirmation dialog)
nfrs_addressed:
  - NFR-8 (All API endpoints except /health and login require authentication — Admin endpoints require Admin role)
  - NFR-15 (Destructive actions require explicit confirmation — user deactivation dialog)
architecture_items:
  - NEW src/Fishtank.Api/Endpoints/UsersEndpoints.cs — GET /api/users, POST /api/users, PUT /api/users/{id}/deactivate
  - NEW src/Fishtank.Api/Services/UserManagementService.cs — User CRUD and deactivation logic with TokenVersion increment
  - UPDATE src/Fishtank.Api/Data/Entities/User.cs — Verify IsActive, TokenVersion, ForcePasswordChange columns (established in Epic 1)
  - UPDATE src/Fishtank.Api/Program.cs — Register UsersEndpoints group
  - NEW src/client/src/features/admin/components/UserManagementSection.tsx — User list and CRUD UI
  - NEW src/client/src/features/admin/components/CreateUserDialog.tsx — Create user form dialog
  - NEW src/client/src/features/admin/components/DeactivateUserDialog.tsx — Deactivation confirmation dialog
  - NEW src/client/src/features/admin/hooks/useUsers.ts — React Query hooks for user CRUD
  - UPDATE src/client/src/features/admin/pages/AdminConsolePage.tsx — Add Users tab with UserManagementSection
risk_links:
  - R-E5-001 (JWT invalidation race condition — user deactivation increments TokenVersion but existing request in-flight with old token completes; HIGH priority score 6; mitigated by JWT middleware checking TokenVersion on every request, not just at session start)
  - R-E5-002 (Admin role escalation — Standard User crafts request to access /admin endpoints directly bypassing frontend route guard; HIGH priority score 6; mitigated by backend role enforcement on all admin endpoints; established in Story 5-1)
test_design_ref: "_bmad-output/test-artifacts/test-design/test-design-epic-5.md"
---

# Story 5.2: User Management — Create, View & Deactivate

## Story

**As an** admin,
**I want** to view all user accounts, create new Standard User accounts, and deactivate existing users with immediate JWT invalidation,
**So that** I can control who has access to the Fishtank instance.

---

## Status

ready-for-dev

---

## Context

### Background

Epic 5 delivers the administrative layer for Fishtank. **Story 5-1 (done)** established the Admin Console infrastructure with sub-navigation tabs and the Feature Toggles section. **This story (5.2)** adds the User Management sub-section, enabling admins to view all accounts, create new Standard Users, and deactivate users with immediate JWT invalidation.

**Critical dependency from Epic 1:**
The JWT invalidation mechanism via `TokenVersion` is already established:
- **Epic 1 Story 1.2 (done):** `Users` table includes `TokenVersion` (int, default 0). JWT middleware validates token version against DB on every request — tokens with mismatched version are rejected with HTTP 401.
- **Epic 1 Story 1.2 (done):** `ForcePasswordChange` (bool, default false) column enables forced password change flow for new users.

This story leverages the existing `TokenVersion` column — deactivating a user increments their `TokenVersion`, immediately invalidating all existing JWTs for that user.

### Scope Boundaries

- **This story (5.2):** User Management sub-section with view all users, create Standard User accounts, deactivate users with JWT invalidation, self-deactivation guard.
- **Story 5-1 (done):** Admin Console shell, Feature Toggles sub-section, TogglesHub, Admin role enforcement infrastructure.
- **Story 5.3 (later):** Health Dashboard, Audit Log, Auto-Registration toggle.
- **Story 5.4 (later):** Structured file logging with rolling daily files.

### What Exists (consumable now)

**User entity** (`src/Fishtank.Api/Data/Entities/User.cs`):
```csharp
public class User
{
    public Guid Id { get; set; }
    public required string Username { get; set; }        // Unique
    public required string PasswordHash { get; set; }
    public required string Role { get; set; }            // "Admin" | "StandardUser"
    public bool IsActive { get; set; } = true;
    public int TokenVersion { get; set; } = 0;           // Incremented on deactivation
    public bool ForcePasswordChange { get; set; } = false;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
```

**JWT middleware validation** (`Program.cs`):
- Checks `TokenVersion` claim against DB on every request
- Mismatched version → HTTP 401 immediately
- This is the hook for immediate JWT invalidation on user deactivation

**Admin Console page** (`src/client/src/features/admin/pages/AdminConsolePage.tsx`):
- Container with sub-navigation tabs: Feature Toggles / Health / Audit Log
- Health and Audit Log tabs show placeholder content
- This story adds Users tab alongside Feature Toggles

**Admin role enforcement** (established in Story 5-1):
- All `/api/admin/*` endpoints require Admin role via policy
- Frontend `/admin` route has AdminGuard redirecting Standard Users to `/services`

### What This Story Adds

**Backend:**
1. `src/Fishtank.Api/Endpoints/UsersEndpoints.cs` — User management REST endpoints
2. `src/Fishtank.Api/Services/UserManagementService.cs` — User CRUD business logic

**Frontend:**
1. `src/client/src/features/admin/components/UserManagementSection.tsx` — User list table
2. `src/client/src/features/admin/components/CreateUserDialog.tsx` — Create user form
3. `src/client/src/features/admin/components/DeactivateUserDialog.tsx` — Deactivation confirmation
4. `src/client/src/features/admin/hooks/useUsers.ts` — React Query CRUD hooks
5. Admin Console page update — Add Users tab

---

## Acceptance Criteria

### AC-1: User Management section displays all users (FR-31)
**Given** the Admin Console → Users tab is loaded,
**Then** a table displays all users with columns:
- Username
- Role (Admin | Standard User)
- Status (Active | Deactivated)
- Created date (formatted as YYYY-MM-DD)

**And** users are listed alphabetically by username.

### AC-2: User list shows correct status badges (FR-31)
**Given** an active user in the list,
**Then** the Status column shows "Active" with a green badge (`bg-green-100 text-green-700`).

**Given** a deactivated user in the list,
**Then** the Status column shows "Deactivated" with a slate badge (`bg-slate-100 text-slate-500`) and the row has 50% opacity.

### AC-3: Create User form creates Standard User accounts (FR-31)
**Given** the "Create User" button is clicked,
**Then** a dialog opens with:
- Title: "Create User"
- Username field (required, unique validation)
- Password field (required, ≥12 characters)
- Confirm Password field (must match Password)
- Actions: **Cancel** (secondary) and **Create** (primary)

**Given** valid username and password are submitted,
**Then** `POST /api/users` is called; on success:
- A new Standard User account is created with `ForcePasswordChange: true`
- The new user appears in the list immediately
- A success toast is shown: "User '{username}' created"
- The dialog closes

### AC-4: Password validation enforced (FR-31)
**Given** the Create User form,
**When** a password shorter than 12 characters is entered,
**Then** an inline validation error is shown: "Password must be at least 12 characters".

**Given** Confirm Password does not match Password,
**Then** an inline validation error is shown: "Passwords do not match".

### AC-5: Duplicate username returns error (FR-31)
**Given** an attempt to create a user with an existing username,
**When** `POST /api/users` is called,
**Then** HTTP 409 Conflict is returned with error code `AUTH_USERNAME_EXISTS` and message "A user with this username already exists".

**And** the frontend shows the error in an error toast and keeps the dialog open for correction.

### AC-6: Deactivate user with confirmation dialog (FR-31, NFR-15)
**Given** the "Deactivate" action is clicked on an active user,
**Then** a confirmation dialog appears with:
- Title: "Deactivate {Username}?"
- Body: "This user will be logged out immediately and unable to sign in again."
- Actions: **Cancel** (secondary) and **Deactivate** (primary, destructive styling)

**Given** "Deactivate" is confirmed,
**Then** `PUT /api/users/{id}/deactivate` is called; on success:
- `IsActive` is set to `false`
- `TokenVersion` is incremented
- The user's row updates to show "Deactivated" status
- A success toast is shown: "User '{username}' deactivated"

### AC-7: JWT invalidation on deactivation is immediate (FR-31, R-E5-001)
**Given** a user is deactivated,
**When** that user's existing JWT is used on the next request,
**Then** HTTP 401 Unauthorized is returned — the JWT is no longer valid.

**Implementation note:** The JWT middleware (established in Epic 1) already validates `TokenVersion` on every request. Incrementing `TokenVersion` on deactivation automatically invalidates all existing tokens.

### AC-8: Deactivated user cannot log in (FR-31)
**Given** a deactivated user,
**When** they attempt to log in via `POST /api/auth/login`,
**Then** HTTP 401 is returned with error code `AUTH_ACCOUNT_DEACTIVATED` and message "This account has been deactivated".

### AC-9: Self-deactivation blocked for current admin (Guard)
**Given** the currently authenticated admin user,
**Then** the "Deactivate" action is disabled for their own row (no button rendered, or button with `aria-disabled="true"` and tooltip "You cannot deactivate your own account").

### AC-10: Last admin guard prevents lockout (Architecture)
**Given** the last remaining active Admin account,
**When** an attempt to deactivate that admin is made via `PUT /api/users/{id}/deactivate`,
**Then** HTTP 409 Conflict is returned with error code `ADMIN_LAST_ADMIN_DEACTIVATE` and message "Cannot deactivate the last active administrator".

**And** the frontend shows the error in an error toast.

### AC-11: Backend user endpoints require Admin role (R-E5-002, NFR-8)
**Given** a Standard User with a valid JWT,
**When** calling `GET /api/users`,
**Then** HTTP 403 Forbidden is returned with error code `ADMIN_FORBIDDEN`.

**Given** a Standard User with a valid JWT,
**When** calling `POST /api/users`,
**Then** HTTP 403 Forbidden is returned with error code `ADMIN_FORBIDDEN`.

**Given** a Standard User with a valid JWT,
**When** calling `PUT /api/users/{id}/deactivate`,
**Then** HTTP 403 Forbidden is returned with error code `ADMIN_FORBIDDEN`.

### AC-12: v1 roles are fixed (FR-31)
**Given** v1 user management,
**Then** only two roles exist: Admin and Standard User.
**And** role cannot be changed after account creation — no role edit endpoint or UI exists in v1.

### AC-13: Admin Console sub-nav includes Users tab
**Given** the Admin Console page,
**Then** sub-navigation displays four tabs: **Feature Toggles** / **Users** / **Health** / **Audit Log**.
**And** Users tab is the second tab.
**And** Health and Audit Log tabs continue to show placeholder content: "Coming in Story 5.3".

### AC-14: data-testid attributes (mandatory)
**Given** the implementation is complete,
**Then** all new interactive and structural elements carry canonical `data-testid` values:

| Element | `data-testid` |
|---|---|
| Users sub-nav tab | `tab-users` |
| User Management section container | `section-users` |
| Users table | `table-users` |
| User row (dynamic) | `user-row-{username}` |
| User status badge (dynamic) | `user-status-{username}` |
| Deactivate button (dynamic) | `user-deactivate-{username}` |
| Create User button | `btn-create-user` |
| Create User dialog | `dialog-create-user` |
| Create User username input | `input-create-user-username` |
| Create User password input | `input-create-user-password` |
| Create User confirm password input | `input-create-user-confirm-password` |
| Create User cancel button | `dialog-create-user-cancel` |
| Create User submit button | `dialog-create-user-submit` |
| Deactivate confirmation dialog | `dialog-deactivate-user` |
| Deactivate cancel button | `dialog-deactivate-user-cancel` |
| Deactivate confirm button | `dialog-deactivate-user-confirm` |

---

## Technical Requirements

### Backend: UsersEndpoints

**`src/Fishtank.Api/Endpoints/UsersEndpoints.cs`:**
```csharp
public static class UsersEndpoints
{
    public static void MapUsersEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users")
            .RequireAuthorization(policy => policy.RequireRole("Admin"))
            .WithTags("Users");

        group.MapGet("/", GetAllUsersAsync);
        group.MapPost("/", CreateUserAsync);
        group.MapPut("/{id:guid}/deactivate", DeactivateUserAsync);
    }
}
```

### Backend: GET /api/users Response

**Response DTO (`src/Fishtank.Api/Models/UserDto.cs`):**
```csharp
public record UserDto
{
    public required Guid Id { get; init; }
    public required string Username { get; init; }
    public required string Role { get; init; }        // "Admin" | "StandardUser"
    public required bool IsActive { get; init; }
    public required DateTimeOffset CreatedAt { get; init; }
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "username": "admin",
      "role": "Admin",
      "isActive": true,
      "createdAt": "2026-06-19T10:30:00Z"
    },
    {
      "id": "7fa85f64-5717-4562-b3fc-2c963f66afa7",
      "username": "developer",
      "role": "StandardUser",
      "isActive": true,
      "createdAt": "2026-07-01T14:22:00Z"
    }
  ]
}
```

### Backend: POST /api/users Request/Response

**Request DTO (`src/Fishtank.Api/Models/CreateUserRequest.cs`):**
```csharp
public record CreateUserRequest
{
    public required string Username { get; init; }
    public required string Password { get; init; }
}
```

**Validation:**
- `Username`: required, non-empty, unique
- `Password`: required, ≥12 characters

**Business logic (in `UserManagementService.CreateUserAsync`):**
1. Check username uniqueness → 409 if exists
2. Hash password using ASP.NET Core Identity password hasher
3. Create user with:
   - `Role = "StandardUser"`
   - `ForcePasswordChange = true`
   - `IsActive = true`
   - `TokenVersion = 0`
4. Return created user DTO

**Success response:**
```json
{
  "success": true,
  "data": {
    "id": "new-guid-here",
    "username": "newuser",
    "role": "StandardUser",
    "isActive": true,
    "createdAt": "2026-07-09T10:00:00Z"
  }
}
```

### Backend: PUT /api/users/{id}/deactivate

**Business logic (in `UserManagementService.DeactivateUserAsync`):**
1. Find user by ID → 404 if not found
2. Check if user is already deactivated → return success (idempotent)
3. Check last admin guard:
   ```csharp
   if (user.Role == "Admin")
   {
       var activeAdminCount = await _db.Users
           .CountAsync(u => u.Role == "Admin" && u.IsActive);
       if (activeAdminCount <= 1)
           throw new ConflictException("ADMIN_LAST_ADMIN_DEACTIVATE", 
               "Cannot deactivate the last active administrator.");
   }
   ```
4. Set `IsActive = false`
5. Increment `TokenVersion` (this invalidates all existing JWTs)
6. Save changes
7. Return updated user DTO

**Success response:**
```json
{
  "success": true,
  "data": {
    "id": "user-guid",
    "username": "deactivateduser",
    "role": "StandardUser",
    "isActive": false,
    "createdAt": "2026-07-01T14:22:00Z"
  }
}
```

### Backend: Login check for deactivated users

**Update `AuthEndpoints.LoginAsync` (or `AuthService.LoginAsync`):**
```csharp
var user = await _db.Users.FirstOrDefaultAsync(u => u.Username == request.Username);

if (user == null || !_passwordHasher.VerifyPassword(user.PasswordHash, request.Password))
    return Results.Unauthorized();  // Generic error

if (!user.IsActive)
    throw new UnauthorizedException("AUTH_ACCOUNT_DEACTIVATED", 
        "This account has been deactivated");
```

### Frontend: UserManagementSection Component

**`src/client/src/features/admin/components/UserManagementSection.tsx`:**
- Table with columns: Username, Role, Status, Created, Actions
- Alphabetical sort by username
- Row opacity 50% for deactivated users
- "Create User" button in section header

### Frontend: Create User Dialog

**`src/client/src/features/admin/components/CreateUserDialog.tsx`:**
- shadcn/ui `Dialog` component
- Form fields with validation
- Password visibility toggle (optional enhancement)
- Inline validation errors
- Submit → `POST /api/users`

### Frontend: Deactivate Confirmation Dialog

**`src/client/src/features/admin/components/DeactivateUserDialog.tsx`:**
- shadcn/ui `AlertDialog` component
- Destructive primary action styling
- On confirm → `PUT /api/users/{id}/deactivate`

### Frontend: React Query Hooks

**`src/client/src/features/admin/hooks/useUsers.ts`:**
```typescript
// List all users
export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => apiFetch<UserDto[]>('/api/users'),
  });
}

// Create user
export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateUserRequest) => 
      apiFetch<UserDto>('/api/users', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

// Deactivate user
export function useDeactivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiFetch<UserDto>(`/api/users/${userId}/deactivate`, {
        method: 'PUT',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
```

---

## Developer Notes

### Previous Story Learnings (from Story 5-1)

**Admin Console patterns established:**
- Sub-navigation tabs structure using shadcn/ui Tabs component
- Admin role enforcement via route guard AND backend policy
- React Query invalidation patterns for admin data

**Backend pattern from Story 5-1:**
- AdminEndpoints group with `RequireRole("Admin")` policy
- Consistent error codes with `ADMIN_*` prefix
- Response envelope wrapper on all endpoints

### Key Constraints

1. **TokenVersion is the JWT invalidation mechanism** — incrementing it automatically rejects all existing tokens. No separate token revocation table needed.

2. **ForcePasswordChange = true for new users** — created users must change their password on first login. The forced-password-change flow is already implemented in Epic 1.

3. **Roles are immutable in v1** — new users are always Standard User. No role upgrade/downgrade UI or endpoint.

4. **Self-deactivation guard is UI-only for current user** — the backend last-admin guard handles the lockout prevention case.

### Test Scenarios from Test Design

See `_bmad-output/test-artifacts/test-design/test-design-epic-5.md` Story 5-2 section:

**P0 (Critical):**
- TokenVersion increment on deactivation (Unit)
- JWT validation rejects mismatched TokenVersion (Unit)
- GET /api/users returns all users (Integration)
- POST /api/users creates Standard User (Integration)
- PUT /api/users/{id}/deactivate works (Integration)
- Deactivated user JWT rejected → 401 (Integration) — R-E5-001
- Standard User → 403 on all user endpoints (Integration) — R-E5-002
- User list displays correctly (Component)
- Deactivate confirmation dialog (Component)
- Admin deactivates user → session ends (E2E) — R-E5-001
- Admin creates user → appears in list (E2E)

**P1 (High):**
- Password validation (Unit)
- ForcePasswordChange = true for new users (Unit)
- Deactivated user login fails → 401 (Integration)
- Duplicate username → 409 (Integration)
- Password validation inline error (Component)
- Self-deactivate disabled (Component)
- New user ForcePasswordChange screen (E2E)

### Security Considerations

1. **Password hashing:** Use ASP.NET Core Identity's `PasswordHasher<User>` — do not implement custom hashing.

2. **Username validation:** Sanitize username input; prevent injection via parameterized queries (EF Core handles this).

3. **Audit logging:** User creation and deactivation should create audit entries (to be consumed by Story 5-3's Audit Log section).

---

## Definition of Done

All gates from `project-context.md` apply:

- [ ] All AC-1 through AC-14 acceptance criteria pass
- [ ] Backend integration tests: Admin role enforcement returns 403 for Standard User on all user endpoints
- [ ] Backend integration tests: User creation with ForcePasswordChange = true
- [ ] Backend integration tests: Deactivation increments TokenVersion
- [ ] Backend integration tests: Deactivated user's JWT rejected on next request → 401
- [ ] Backend integration tests: Deactivated user login returns 401
- [ ] Backend integration tests: Last admin guard returns 409
- [ ] TypeScript builds clean — 0 errors
- [ ] .NET builds clean — 0 errors, 0 warnings
- [ ] All new interactive/structural elements have `data-testid`
- [ ] msw handlers updated for user endpoints
- [ ] Story status set to `done` in sprint-status.yaml

---

## Files to Create/Update

### New Files
| File | Purpose |
|------|---------|
| `src/Fishtank.Api/Endpoints/UsersEndpoints.cs` | User management REST endpoints |
| `src/Fishtank.Api/Services/UserManagementService.cs` | User CRUD business logic |
| `src/Fishtank.Api/Models/UserDto.cs` | User response DTO |
| `src/Fishtank.Api/Models/CreateUserRequest.cs` | Create user request DTO |
| `src/client/src/features/admin/components/UserManagementSection.tsx` | User list table |
| `src/client/src/features/admin/components/CreateUserDialog.tsx` | Create user form dialog |
| `src/client/src/features/admin/components/DeactivateUserDialog.tsx` | Deactivation confirmation |
| `src/client/src/features/admin/hooks/useUsers.ts` | React Query hooks |
| `src/client/src/features/admin/types/user.ts` | TypeScript types |

### Updated Files
| File | Change |
|------|--------|
| `src/Fishtank.Api/Program.cs` | Register UsersEndpoints |
| `src/Fishtank.Api/Endpoints/AuthEndpoints.cs` | Add deactivated user check on login |
| `src/client/src/features/admin/pages/AdminConsolePage.tsx` | Add Users tab |
| `src/client/src/features/admin/index.ts` | Export new components |
| `src/client/tests/mocks/handlers.ts` | Add msw handlers for user endpoints |

---

## Completion Note

Ultimate context engine analysis completed — comprehensive developer guide created. This story builds on the Admin Console infrastructure from Story 5-1, adding full user management capabilities with the critical JWT invalidation mechanism leveraging the TokenVersion column established in Epic 1.
