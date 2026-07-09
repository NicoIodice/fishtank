---
story_id: "5.1"
story_key: "5-1-feature-toggles-runtime-control-and-signalr-broadcast"
epic: 5
story_title: "Feature Toggles — Runtime Control & SignalR Broadcast"
status: ready-for-dev
priority: high
frs_covered:
  - FR-30 (All Fishtank features ship enabled by default. Each can be disabled at runtime via the Admin Console or at deploy time via environment variable without container restart. Toggle state persisted in database. Environment variable overrides take precedence. Toggling takes effect immediately for all active sessions via SignalR broadcast.)
ux_drs_covered:
  - UX-DR11 (Admin Console nav item — visible only to Admin-role users; sidebar conditional rendering)
  - EXPERIENCE.md Admin Console screen (Feature Toggles sub-section spec)
  - DESIGN.md Toggle switch states (32×20px track, disabled-but-visible state for env-var locked toggles)
nfrs_addressed:
  - NFR-8 (All API endpoints except /health and login require authentication — Admin endpoints require Admin role)
  - NFR-15 (Destructive actions require explicit confirmation — disabling a feature shows confirmation dialog)
architecture_items:
  - NEW src/Fishtank.Api/Hubs/TogglesHub.cs — SignalR hub for feature toggle broadcast
  - NEW src/Fishtank.Api/Data/Entities/FeatureToggle.cs — EF Core entity for toggle state persistence
  - NEW src/Fishtank.Api/Services/FeatureToggleService.cs — Business logic for toggle CRUD and broadcast
  - NEW src/Fishtank.Api/Endpoints/AdminEndpoints.cs — GET/PUT /api/admin/toggles endpoints
  - UPDATE src/Fishtank.Api/Data/FishtankDbContext.cs — Add FeatureToggles DbSet + migration
  - UPDATE src/Fishtank.Api/Program.cs — Register TogglesHub at /hubs/toggles, configure toggle env var loading
  - NEW src/client/src/features/admin/pages/AdminConsolePage.tsx — Admin Console container with sub-navigation
  - NEW src/client/src/features/admin/components/FeatureTogglesSection.tsx — Toggle list with switches
  - NEW src/client/src/features/admin/hooks/useToggles.ts — React Query hook for toggle CRUD
  - UPDATE src/client/src/lib/queryClient.ts — Add FeatureToggleChanged to HUB_INVALIDATION_MAP
  - UPDATE src/client/src/lib/signalr.ts — Connect to /hubs/toggles
  - UPDATE src/client/src/components/layout/Sidebar.tsx — Conditional Admin Console nav item
  - UPDATE src/client/src/router.tsx — Add /admin route with Admin role guard
risk_links:
  - R-E5-002 (Admin role escalation — Standard User crafts request to access /admin endpoints directly bypassing frontend route guard; HIGH priority score 6; mitigated by backend role enforcement on all admin endpoints)
  - R-E5-003 (SignalR toggle broadcast race — toggle state persisted to DB but SignalR broadcast fails; some sessions see stale state; MEDIUM priority score 4; mitigated by integration tests verifying both DB write and SignalR event)
  - R-E5-006 (Env var toggle override not visible — admin sees toggle as enabled in UI but env var override keeps it disabled; MEDIUM priority score 4; mitigated by "Locked by environment variable" UI indicator)
test_design_ref: "_bmad-output/test-artifacts/test-design/test-design-epic-5.md"
---

# Story 5.1: Feature Toggles — Runtime Control & SignalR Broadcast

## Story

**As an** admin,
**I want** to enable or disable any Fishtank feature from the Admin Console at runtime without restarting the container,
**So that** I can quickly respond to issues or manage capability rollout across all active sessions.

---

## Status

ready-for-dev

---

## Context

### Background

Epic 5 delivers the administrative layer for Fishtank. **This story (5.1)** establishes the foundational Admin Console infrastructure and implements the feature toggle system with real-time propagation via SignalR.

**Key infrastructure from previous epics consumed by this story:**
- **Epic 1 Story 1.2 (done):** JWT auth with `TokenVersion` column and middleware validation
- **Epic 1 Story 1.3 (done):** React Query + SignalR seam contract (`queryClient.ts` + `HUB_INVALIDATION_MAP`), `signalr.ts` hub connection factory
- **Epic 2 (done):** SignalR hub pattern established with `ServicesHub.cs`, `EventsHub.cs`
- **Epic 3 (done):** `ActivityHub.cs` pattern for real-time push
- **Epic 4 (done):** Navigation guards and state management patterns

**SignalR Hub Infrastructure (Architecture D7):**
This story adds `TogglesHub.cs` at `/hubs/toggles` — the fourth SignalR hub. The hub broadcasts `FeatureToggleChanged` events when any toggle state changes. The `HUB_INVALIDATION_MAP` in `queryClient.ts` maps this event to `[["toggles"]]` query invalidation.

### Scope Boundaries

- **This story (5.1):** Admin Console shell (page container + sub-navigation structure), Feature Toggles sub-section with CRUD, TogglesHub SignalR broadcast, env var override precedence, Admin role enforcement on all `/admin` endpoints.
- **Story 5.2 (later):** User Management sub-section (create, view, deactivate users).
- **Story 5.3 (later):** Health Dashboard and Audit Log sub-sections, Auto-Registration toggle.
- **Story 5.4 (later):** Structured file logging with rolling daily files.

### What Exists (consumable now)

**Authentication middleware** (`Program.cs`):
- JWT cookie auth with `TokenVersion` validation established in Epic 1
- All endpoints except `/health` and `/api/auth/*` require valid JWT

**SignalR hub connection factory** (`src/client/src/lib/signalr.ts`):
- Connection factory function that handles JWT cookie auth
- Reconnect logic with exponential backoff

**React Query seam contract** (`src/client/src/lib/queryClient.ts`):
```typescript
const HUB_INVALIDATION_MAP = {
  'ServiceStatusChanged': [['services']],
  'SystemEventCreated': [['events']],
  'ResyncCompleted': [['mappings', 'tree']],
  // FeatureToggleChanged will be added by this story
} satisfies Record<string, QueryKey[]>;
```

**Sidebar nav structure** (`src/client/src/components/layout/Sidebar.tsx`):
- Nav items: Services, Network Activity, Mappings, System Events, Settings
- Collapse toggle at bottom
- Responsive hamburger at < 768px
- Admin Console nav item will be added by this story (below divider, last item)

### What This Story Adds

**Backend:**
1. `src/Fishtank.Api/Data/Entities/FeatureToggle.cs` — Entity with Name, DisplayName, Description, Enabled, EnvVarOverride (nullable bool), UpdatedAt
2. `src/Fishtank.Api/Data/Migrations/*_AddFeatureToggles.cs` — EF Core migration
3. `src/Fishtank.Api/Services/FeatureToggleService.cs` — CRUD + env var loading + broadcast logic
4. `src/Fishtank.Api/Hubs/TogglesHub.cs` — SignalR hub for toggle events
5. `src/Fishtank.Api/Endpoints/AdminEndpoints.cs` — Admin endpoints with role enforcement

**Frontend:**
1. `src/client/src/features/admin/pages/AdminConsolePage.tsx` — Container with sub-nav tabs
2. `src/client/src/features/admin/components/FeatureTogglesSection.tsx` — Toggle list UI
3. `src/client/src/features/admin/hooks/useToggles.ts` — React Query CRUD hooks
4. Sidebar update — Admin Console nav item (Admin role only)
5. Router update — `/admin` route with role guard

---

## Acceptance Criteria

### AC-1: Admin Console route accessible to Admin-role users only (FR-30, R-E5-002)
**Given** the `/admin` route accessed by an Admin-role user,
**Then** the Admin Console page renders with the Feature Toggles sub-section visible.

**Given** a Standard User attempting to access `/admin` directly (via URL or programmatic navigation),
**Then** the user is redirected to `/services` — no Admin Console content is rendered.

### AC-2: Admin Console sidebar nav item visible to Admins only (UX-DR11)
**Given** an Admin-role user is authenticated,
**Then** the sidebar displays "Admin Console" nav item with `bi-shield-lock` icon, rendered below a visual divider, as the last nav item above the collapse toggle.

**Given** a Standard User is authenticated,
**Then** the sidebar does NOT display the Admin Console nav item — the nav item is not rendered at all (not hidden via CSS).

### AC-3: Backend admin endpoints require Admin role (R-E5-002, NFR-8)
**Given** a Standard User with a valid JWT,
**When** calling `GET /api/admin/toggles`,
**Then** HTTP 403 Forbidden is returned with error code `ADMIN_FORBIDDEN`.

**Given** a Standard User with a valid JWT,
**When** calling `PUT /api/admin/toggles/{name}`,
**Then** HTTP 403 Forbidden is returned with error code `ADMIN_FORBIDDEN`.

**Given** an Admin-role user with a valid JWT,
**When** calling `GET /api/admin/toggles`,
**Then** HTTP 200 is returned with all toggle states in the response envelope.

### AC-4: Feature toggles list displays all known toggles (FR-30)
**Given** the Feature Toggles sub-section is loaded,
**Then** a table displays all known toggles with columns:
- Toggle name (display name)
- Description (one line)
- Current state (enabled/disabled toggle switch)
- Last modified timestamp

**And** toggles are listed in alphabetical order by display name.

### AC-5: Toggle switch changes state and persists to database (FR-30)
**Given** an Admin clicks a toggle switch to change its state,
**When** the toggle is flipped,
**Then** `PUT /api/admin/toggles/{name}` is called with the new state; on success the state is persisted to the database; the switch reflects the new position; the `UpdatedAt` timestamp updates.

### AC-6: Disabling a feature requires confirmation dialog (NFR-15)
**Given** a feature toggle is currently ENABLED,
**When** an Admin clicks to disable it,
**Then** a confirmation dialog appears with:
- Title: "Disable {Feature Name}?"
- Body: "This will take effect immediately for all active sessions."
- Actions: **Cancel** (secondary) and **Disable** (primary, destructive styling)

**Given** the confirmation dialog is showing,
**When** "Disable" is clicked,
**Then** the `PUT` request fires; on success the dialog closes and the toggle reflects the disabled state.

**Given** the confirmation dialog is showing,
**When** "Cancel" is clicked or Escape is pressed,
**Then** the dialog closes; the toggle remains in its previous enabled state.

### AC-7: Enabling a feature requires no confirmation (FR-30)
**Given** a feature toggle is currently DISABLED and not env-var-locked,
**When** an Admin clicks to enable it,
**Then** the `PUT` request fires immediately — no confirmation dialog is shown.

### AC-8: Toggle change broadcasts via SignalR to all sessions (FR-30, Architecture D7)
**Given** an Admin changes a toggle state,
**When** the server confirms the change,
**Then** a `FeatureToggleChanged` event is broadcast via `TogglesHub.cs` to ALL connected sessions (not just the admin's session).

**Given** another browser session is connected,
**When** a `FeatureToggleChanged` event is received,
**Then** `queryClient.invalidateQueries([["toggles"]])` is called per `HUB_INVALIDATION_MAP`; the toggle list re-fetches and displays the updated state.

### AC-9: Env var override takes precedence and locks the toggle (FR-30, R-E5-006)
**Given** `FISHTANK_TOGGLE_NETWORK_ACTIVITY=false` is set as a container environment variable,
**Then** the Network Activity toggle appears as DISABLED in the Admin Console with:
- Toggle switch rendered as disabled (`aria-disabled="true"`, `cursor: not-allowed`, 50% opacity)
- "Overridden by env var" badge displayed next to the toggle name
- Tooltip on hover: "This toggle is locked by environment variable `FISHTANK_TOGGLE_NETWORK_ACTIVITY` and cannot be changed at runtime."

### AC-10: Env-var-locked toggle PUT returns error (FR-30, R-E5-006)
**Given** a toggle is locked by an environment variable,
**When** an Admin attempts to change it via `PUT /api/admin/toggles/{name}`,
**Then** HTTP 409 Conflict is returned with error code `ADMIN_TOGGLE_ENV_LOCKED` and message explaining the env var lock.

### AC-11: Unknown toggle name returns 404 (FR-30)
**Given** a `PUT /api/admin/toggles/{name}` request with an invalid/unknown toggle name,
**Then** HTTP 404 Not Found is returned with error code `ADMIN_TOGGLE_NOT_FOUND`.

### AC-12: HUB_INVALIDATION_MAP updated (Architecture)
**Given** `src/client/src/lib/queryClient.ts`,
**Then** `HUB_INVALIDATION_MAP` includes the entry:
```typescript
'FeatureToggleChanged': [['toggles']],
```

### AC-13: Admin Console sub-navigation structure (EXPERIENCE.md)
**Given** the Admin Console page,
**Then** sub-navigation displays three tabs: **Feature Toggles** / **Health** / **Audit Log**. Feature Toggles is the default active tab. Health and Audit Log tabs show placeholder content: "Coming in Story 5.3".

### AC-14: data-testid attributes (mandatory)
**Given** the implementation is complete,
**Then** all new interactive and structural elements carry canonical `data-testid` values:

| Element | `data-testid` |
|---|---|
| Admin Console page container | `page-admin-console` |
| Feature Toggles sub-nav tab | `tab-feature-toggles` |
| Health sub-nav tab | `tab-health` |
| Audit Log sub-nav tab | `tab-audit-log` |
| Feature Toggles section container | `section-feature-toggles` |
| Toggle table | `table-toggles` |
| Toggle row (dynamic) | `toggle-row-{toggle-name}` |
| Toggle switch (dynamic) | `toggle-switch-{toggle-name}` |
| Env var badge (dynamic) | `toggle-env-badge-{toggle-name}` |
| Disable confirmation dialog | `dialog-toggle-disable` |
| Disable confirmation cancel button | `dialog-toggle-disable-cancel` |
| Disable confirmation confirm button | `dialog-toggle-disable-confirm` |
| Sidebar Admin Console nav item | `nav-admin-console` |

---

## Technical Requirements

### Backend: FeatureToggle Entity

**`src/Fishtank.Api/Data/Entities/FeatureToggle.cs`:**
```csharp
public class FeatureToggle
{
    public Guid Id { get; set; }
    public required string Name { get; set; }        // e.g., "network_activity"
    public required string DisplayName { get; set; } // e.g., "Network Activity"
    public required string Description { get; set; } // One-line description
    public bool Enabled { get; set; } = true;        // Default enabled
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
```

**Known toggles to seed in migration:**
| Name | Display Name | Description |
|------|--------------|-------------|
| `network_activity` | Network Activity | Real-time request monitoring |
| `mappings_editor` | Mappings Editor | File explorer and editor |
| `record_mode` | Record Mode | Auto-capture proxied requests |
| `system_events` | System Events | Infrastructure event log |
| `services_management` | Services Management | Service CRUD operations |

### Backend: Env Var Override Logic

**`FeatureToggleService.cs`:**
1. On container startup, read all `FISHTANK_TOGGLE_{NAME}` env vars
2. Store override values in a `Dictionary<string, bool>` singleton
3. `GetToggles()` returns DB state overridden by env var where applicable
4. `SetToggle()` rejects changes if env var override exists for that toggle
5. Env var names are uppercase with underscores: `FISHTANK_TOGGLE_NETWORK_ACTIVITY`

### Backend: AdminEndpoints Role Enforcement

**`src/Fishtank.Api/Endpoints/AdminEndpoints.cs`:**
```csharp
app.MapGroup("/api/admin")
   .RequireAuthorization(policy => policy.RequireRole("Admin"))
   .WithTags("Admin");
```

All endpoints in the `/api/admin` group require the `Admin` role claim in the JWT. Standard Users receive HTTP 403.

### Backend: TogglesHub SignalR

**`src/Fishtank.Api/Hubs/TogglesHub.cs`:**
```csharp
[Authorize]
public class TogglesHub : Hub
{
    // No client-to-server methods required in v1
    // Server broadcasts via IHubContext<TogglesHub> from FeatureToggleService
}
```

**Broadcast pattern (in `FeatureToggleService.SetToggleAsync()`):**
```csharp
await _hubContext.Clients.All.SendAsync("FeatureToggleChanged", new
{
    Name = toggle.Name,
    Enabled = toggle.Enabled
});
```

### Frontend: Admin Console Page Structure

**`src/client/src/features/admin/pages/AdminConsolePage.tsx`:**
- Container with `data-testid="page-admin-console"`
- Sub-navigation tabs using shadcn/ui Tabs component
- Default tab: Feature Toggles
- Placeholder tabs: Health, Audit Log

### Frontend: Toggle List Component

**`src/client/src/features/admin/components/FeatureTogglesSection.tsx`:**
- Table with columns: Name, Description, State (switch), Last Modified
- Alphabetical sort by display name
- Disabled-but-visible switch for env-var-locked toggles (50% opacity, `aria-disabled="true"`)
- Tooltip on env-var-locked switches explaining the lock
- "Overridden by env var" badge next to locked toggle names

### Frontend: Confirmation Dialog

Use shadcn/ui `AlertDialog` for the disable confirmation:
- Title: "Disable {Feature Name}?"
- Body: "This will take effect immediately for all active sessions."
- Cancel action (secondary)
- Disable action (primary destructive)

### Frontend: Sidebar Update

**`src/client/src/components/layout/Sidebar.tsx`:**
- Add Admin Console nav item with `bi-shield-lock` icon
- Conditionally render based on user role from auth context
- Position: below a `<hr>` divider, last item before collapse toggle

### Frontend: Router Update

**`src/client/src/router.tsx`:**
```tsx
{
  path: "/admin",
  element: <AdminGuard><AdminConsolePage /></AdminGuard>,
}
```

`AdminGuard` component: checks user role, redirects Standard Users to `/services`.

### Frontend: SignalR Connection

Update `signalr.ts` to connect to `/hubs/toggles`:
```typescript
const togglesConnection = new HubConnectionBuilder()
  .withUrl("/hubs/toggles", { withCredentials: true })
  .withAutomaticReconnect()
  .build();

togglesConnection.on("FeatureToggleChanged", () => {
  queryClient.invalidateQueries({ queryKey: ["toggles"] });
});
```

---

## Developer Notes

### Previous Story Learnings

**Epic 4 SignalR patterns:**
- Hub connection setup must handle reconnection gracefully
- `queryClient.invalidateQueries()` is the standard pattern for SignalR → React Query bridge
- Test both the DB persistence AND the SignalR broadcast in integration tests

**Epic 2 role-based rendering:**
- Admin Console nav item follows the same conditional rendering pattern as any role-gated feature
- Backend enforcement is mandatory — never rely solely on frontend guards

### Key Constraints

1. **Env var precedence is immutable during container lifetime** — once the container starts with an env var override, that toggle cannot be changed via Admin Console until container restart.

2. **All features enabled by default** — migrations seed all toggles as `Enabled = true`. Disabling requires explicit admin action or env var.

3. **Toggle names are fixed** — v1 does not support user-defined toggles. Only the 5 known toggles exist.

### Test Scenarios from Test Design

See `_bmad-output/test-artifacts/test-design/test-design-epic-5.md` for comprehensive test scenarios including:
- P0: Backend role enforcement (4 tests)
- P0: Toggle SignalR broadcast (1 test)
- P0: Env var override validation (1 test)
- P1: UI component tests (4 tests)
- E2E: Cross-session toggle propagation (1 test)

---

## Definition of Done

All gates from `project-context.md` apply:

- [ ] All AC-1 through AC-14 acceptance criteria pass
- [ ] Backend integration tests: Admin role enforcement returns 403 for Standard User
- [ ] Backend integration tests: Toggle state persists to DB and broadcasts via SignalR
- [ ] Backend integration tests: Env-var-locked toggle returns 409 on PUT
- [ ] TypeScript builds clean — 0 errors
- [ ] .NET builds clean — 0 errors, 0 warnings
- [ ] All new interactive/structural elements have `data-testid`
- [ ] `HUB_INVALIDATION_MAP` updated with `FeatureToggleChanged: [["toggles"]]`
- [ ] msw handlers updated for toggle endpoints
- [ ] Story status set to `done` in sprint-status.yaml

---

## Files to Create/Update

### New Files
| File | Purpose |
|------|---------|
| `src/Fishtank.Api/Data/Entities/FeatureToggle.cs` | Toggle entity |
| `src/Fishtank.Api/Data/Migrations/*_AddFeatureToggles.cs` | EF migration |
| `src/Fishtank.Api/Services/FeatureToggleService.cs` | Toggle business logic |
| `src/Fishtank.Api/Hubs/TogglesHub.cs` | SignalR hub |
| `src/Fishtank.Api/Endpoints/AdminEndpoints.cs` | Admin API endpoints |
| `src/client/src/features/admin/pages/AdminConsolePage.tsx` | Admin Console page |
| `src/client/src/features/admin/components/FeatureTogglesSection.tsx` | Toggle list |
| `src/client/src/features/admin/hooks/useToggles.ts` | React Query hooks |
| `src/client/src/features/admin/types.ts` | TypeScript types |

### Updated Files
| File | Change |
|------|--------|
| `src/Fishtank.Api/Data/FishtankDbContext.cs` | Add `DbSet<FeatureToggle>` |
| `src/Fishtank.Api/Program.cs` | Register TogglesHub, configure env var loading |
| `src/client/src/lib/queryClient.ts` | Add `FeatureToggleChanged` to `HUB_INVALIDATION_MAP` |
| `src/client/src/lib/signalr.ts` | Connect to `/hubs/toggles` |
| `src/client/src/components/layout/Sidebar.tsx` | Admin Console nav item |
| `src/client/src/router.tsx` | Add `/admin` route with guard |

---

## Completion Note

Ultimate context engine analysis completed — comprehensive developer guide created. This story establishes the Admin Console foundation and feature toggle infrastructure that subsequent Epic 5 stories build upon.
