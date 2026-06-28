---
story_id: "2.5"
epic: 2
story_key: 2-5-settings-service-cache-management
story_title: "Settings — Service Cache Management"
status: review
priority: medium
---

# Story 2.5: Settings — Service Cache Management

## Story

**As a** developer,
**I want** to view and clear the in-memory mapping and response caches for individual services or all services from Settings,
**So that** I can force the mock engine to reload fresh configurations without restarting the container.

---

## Status

Review

---

## Context

### Background

This story delivers the **Settings → Cache** sub-section of the Settings page (FR-46). The Settings page (`SettingsPage.tsx`) already has the "cache" section id wired in the sub-nav and the section renders a placeholder "Configured in a later story." — this story replaces that placeholder with the real Cache UI.

The Cache section provides:
- A **"Clear all caches" row** at the top (description + `Clear All` button → confirmation dialog → clears all running WireMock server in-memory mappings and immediately reloads from disk)
- A **named caches list**: each configured service shown as a row with name, entry count, estimated size, and an individual `Clear` button (with its own confirmation dialog)
- An **empty state** when no services are configured

Cache clearing works by calling `server.ResetMappings()` followed by `server.ReadStaticMappings()` on each relevant `WireMockServer` instance held in `IServicesRegistry`. This clears the WireMock engine's in-memory rule set and immediately reloads from the configured `MocksRoot` folder on disk — no container restart or Resync needed.

**Backend state entering this story (verified):**

- **`IServicesRegistry`** (`src/Fishtank.Api/Engine/IServicesRegistry.cs`) — exposes `GetAll()` returning `IReadOnlyDictionary<Guid, WireMockServer>`. Keyed by `serviceId`. For `CacheService`, this is the primary source of running WireMock instances.
- **`ServicesRegistry`** (`src/Fishtank.Api/Engine/ServicesRegistry.cs`) — concrete `ConcurrentDictionary<Guid, WireMockServer>` implementation. Registered as **singleton** in `Program.cs`. `CacheService` depends on it.
- **`WireMockServer`** instances — each has `.Mappings` (returns in-memory rule set), `.ResetMappings()` (clears all), and `.ReadStaticMappings()` (reloads from disk via the `LocalFileSystemHandler` set at startup to `service.MocksRoot`). These are concrete-class methods accessible from the registry without any additional abstraction.
- **`SettingsEndpoints.cs`** (`src/Fishtank.Api/Endpoints/SettingsEndpoints.cs`) — currently has a single `GET /api/settings` endpoint. Cache endpoints go into a **new** `CacheEndpoints.cs`, following the `SystemEventsEndpoints` pattern.
- **`Program.cs`** lines 152–160 — `AddScoped` DI registrations; lines 231–233 — `MapXxx` endpoint calls. New `CacheService` and `CacheEndpoints` go here.
- **`FishtankDbContext`** — used to look up service names/slugs for the cache DTOs. `Services` DbSet with `DeletedAt` soft-delete filter.
- **No schema migrations needed** — cache state is purely in-memory (WireMock).

**Frontend state entering this story (verified):**

- **`SettingsPage.tsx`** (`src/client/src/features/settings/pages/SettingsPage.tsx`) — already has `sections` array with `{ id: "cache", label: "Cache" }`. The `active === "cache"` branch currently falls through to `<p className="text-muted">Configured in a later story.</p>`. **This file is an UPDATE** — add a branch `active === "cache" ? <CacheSettings /> : ...`.
- **`useBreakpoint()`** hook is already imported and used in `SettingsPage.tsx` for the mobile select vs desktop nav rendering pattern.
- **`apiFetch<T>()`** from `lib/api.ts` — wraps all API calls. Never use raw `fetch`.
- **`useQuery` / `useMutation` / `useQueryClient`** from `@tanstack/react-query` — standard patterns in `features/settings/hooks/useAppSettings.ts`.
- **`features/settings/` folder structure** — `pages/`, `components/`, `hooks/` sub-folders already exist (verified files present).
- **No SignalR hub events** for cache operations — no `HUB_INVALIDATION_MAP` entries needed. React Query invalidation in mutation `onSettled` is correct here (the rule about `HUB_INVALIDATION_MAP` applies only to SignalR hub event handlers, not mutation callbacks).
- **Confirmation dialogs** — the project does NOT use shadcn `Dialog` component for these (they haven't been introduced yet). Implement as a simple inline conditional render of a modal overlay using CSS variables, following the destructive-confirmation pattern introduced in Story 2.2 (Service delete). Reference `services/components/DeleteServiceModal.tsx` if it exists; otherwise use a `<div role="dialog">` with inline styles matching the project's CSS-variable theming.

### Canonical `data-testid` values (DESIGN.md — use verbatim)

| Element | testid |
|---|---|
| Settings page | `page-settings` (existing) |
| Settings sub-nav item (Cache section) | `settings-nav-cache` |
| Settings clear all caches button | `settings-btn-clear-all-caches` |
| Settings clear all caches confirmation dialog | `settings-modal-clear-all-caches-confirm` |
| Settings clear all caches confirm button | `settings-btn-clear-all-caches-confirm` |
| Settings clear all caches cancel button | `settings-btn-clear-all-caches-cancel` |
| Settings clear cache (per service) | `settings-btn-clear-cache-{slug}` |
| Settings clear cache confirmation dialog (per service) | `settings-modal-clear-cache-confirm-{slug}` |
| Settings clear cache confirm button (per service) | `settings-btn-clear-cache-confirm-{slug}` |
| Settings clear cache cancel button (per service) | `settings-btn-clear-cache-cancel-{slug}` |

> **Note on sub-nav testid:** The `settings-nav-{section-slug}` pattern is defined in DESIGN.md for all sub-nav items. Check `SettingsPage.tsx` — if the sub-nav `<button>` elements don't already have `data-testid="settings-nav-{id}"`, add them as part of this story. These are required per the DESIGN.md convention.

### UX / Confirmation dialog text (EXPERIENCE.md — use verbatim)

**Clear All confirmation:**
- Title: "Clear all caches?"
- Body: "Clear all service caches? Cached mappings will be cleared for all services and reloaded from disk on the next request. This cannot be undone."
- Actions: **Cancel** | **Clear all caches**

**Per-service Clear confirmation:**
- Title: implicit (dialog body is the confirm message)
- Body: "Clear cache for {service-name}? Cached mappings will be cleared and reloaded from disk on the next request."
- Actions: **Cancel** | **Clear cache**

**Empty state (no services configured):**
- Icon: `bi-database` (32px, muted)
- Primary: "No service caches yet."
- Secondary: "Caches appear here once services are created and receive requests."

---

## Acceptance Criteria

**AC-1 — Cache list shows all configured services with stats (FR-46):**
**Given** Settings → Cache with at least one configured service,
**When** the section renders,
**Then** each service is listed with its service name, current in-memory cache entry count (number of WireMock mapping rules loaded), and estimated size (best-effort byte estimate derived from disk file sizes of `.json` mappings in the service's `MocksRoot`).

**AC-2 — Per-service Clear with confirmation (FR-46, NFR-15):**
**Given** a per-service "Clear" button (`settings-btn-clear-cache-{slug}`) is clicked,
**When** the confirmation dialog (`settings-modal-clear-cache-confirm-{slug}`) is confirmed,
**Then** `DELETE /api/cache/{serviceId}` is called; the cache for that service is cleared (WireMock `ResetMappings()`) and immediately reloaded from disk (`ReadStaticMappings()`); no container restart or Resync is required; the list refreshes to show the updated (post-reload) entry count.

**AC-3 — "Clear All" with confirmation (FR-46, NFR-15):**
**Given** the "Clear All" button (`settings-btn-clear-all-caches`) is clicked,
**When** the confirmation dialog (`settings-modal-clear-all-caches-confirm`) is confirmed,
**Then** `DELETE /api/cache` is called; caches for ALL running services are cleared and immediately reloaded from disk simultaneously; the list refreshes.

**AC-4 — Empty state when no services are configured (FR-46):**
**Given** no services are configured (no entries in the `Services` table with `DeletedAt IS NULL`),
**Then** the Cache sub-section shows: `bi-database` icon (32px, muted) + "No service caches yet." + "Caches appear here once services are created and receive requests."

**AC-5 — Standard User access (FR-46):**
**Given** a Standard User (non-Admin) is authenticated,
**When** Settings → Cache is accessed,
**Then** the cache management UI is visible and fully functional; the `GET /api/cache`, `DELETE /api/cache/{id}`, and `DELETE /api/cache` endpoints accept any authenticated user — no Admin-role check.

---

## Tasks / Subtasks

### Backend

- [x] **Task B1: `ServiceCacheDto` model** (AC: 1, 2, 3)
  - [x] Create `src/Fishtank.Api/Models/ServiceCacheDto.cs`
  - [x] Record: `(Guid ServiceId, string ServiceName, string Slug, int EntryCount, long EstimatedBytes)`

- [x] **Task B2: `ICacheService` + `CacheService`** (AC: 1–5)
  - [x] Create `src/Fishtank.Api/Services/ICacheService.cs`
  - [x] Create `src/Fishtank.Api/Services/CacheService.cs`
  - [x] `GetAllAsync`: query `db.Services.Where(s => s.DeletedAt == null).ToListAsync()` → for each, if service is in registry → read `server.Mappings.Count()` for entry count + `EstimateSize(mocksRoot)` for bytes; if not in registry (stopped) → 0 / 0
  - [x] `ClearAsync(Guid serviceId)`: find service in DB (throw `NotFoundException("SERVICE_NOT_FOUND", ...)` if missing); if in registry → `server.ResetMappings()` then `server.ReadStaticMappings()`; if not in registry → no-op (service is stopped, no in-memory cache to clear)
  - [x] `ClearAllAsync()`: iterate `registry.GetAll()` values; for each server → `server.ResetMappings()` then `server.ReadStaticMappings()`
  - [x] Private `EstimateSize(string mocksRoot)`: `Directory.EnumerateFiles(mocksRoot, "*.json", SearchOption.TopDirectoryOnly).Sum(f => new FileInfo(f).Length)` wrapped in try/catch returning 0 on any exception

- [x] **Task B3: `CacheEndpoints.cs`** (AC: 1–5)
  - [x] Create `src/Fishtank.Api/Endpoints/CacheEndpoints.cs`
  - [x] `GET /api/cache` → `GetCachesAsync(ICacheService)` → `Results.Ok(ApiResponse.Ok(list))` — `.RequireAuthorization()`
  - [x] `DELETE /api/cache/{id}` → `ClearCacheAsync(Guid id, ICacheService)` → `Results.Ok(ApiResponse.Ok<object?>(null))` — `.RequireAuthorization()`
  - [x] `DELETE /api/cache` → `ClearAllCachesAsync(ICacheService)` → `Results.Ok(ApiResponse.Ok<object?>(null))` — `.RequireAuthorization()`
  - [x] No Admin-role policy — `.RequireAuthorization()` only (any authenticated user)

- [x] **Task B4: Register in `Program.cs`** (AC: all)
  - [x] Add `builder.Services.AddScoped<ICacheService, CacheService>();` after the existing `AddScoped<IServiceManager, ServiceManager>()` line (line 160)
  - [x] Add `app.MapCacheEndpoints();` after the existing `app.MapSystemEventsEndpoints()` line (line 233)

### Frontend

- [x] **Task F1: `cache.ts` types** (AC: 1)
  - [x] Create `src/client/src/features/settings/types/cache.ts`
  - [x] `export interface ServiceCacheEntry { serviceId: string; serviceName: string; slug: string; entryCount: number; estimatedBytes: number; }`
  - [x] `export function formatBytes(bytes: number): string` — human-readable (e.g. "0 B", "4.2 KB", "1.1 MB")

- [x] **Task F2: `useServiceCache.ts` hook** (AC: 1–5)
  - [x] Create `src/client/src/features/settings/hooks/useServiceCache.ts`
  - [x] `export const SERVICE_CACHE_QUERY_KEY = ['service-caches'] as const`
  - [x] `useServiceCaches()` — `useQuery({ queryKey: SERVICE_CACHE_QUERY_KEY, queryFn: () => apiFetch<ServiceCacheEntry[]>('/api/cache') })`
  - [x] `useClearCache()` — `useMutation({ mutationFn: (serviceId: string) => apiFetch<null>('/api/cache/' + serviceId, { method: 'DELETE' }), onSettled: () => queryClient.invalidateQueries({ queryKey: SERVICE_CACHE_QUERY_KEY }) })`
  - [x] `useClearAllCaches()` — `useMutation({ mutationFn: () => apiFetch<null>('/api/cache', { method: 'DELETE' }), onSettled: () => queryClient.invalidateQueries({ queryKey: SERVICE_CACHE_QUERY_KEY }) })`

- [x] **Task F3: `CacheSettings.tsx` component** (AC: 1–5)
  - [x] Create `src/client/src/features/settings/components/CacheSettings.tsx`
  - [x] Use `useServiceCaches()`, `useClearCache()`, `useClearAllCaches()`
  - [x] Loading state: React Query `isLoading` (skeleton/spinner — NOT `useState(false)`)
  - [x] Empty state: when `data.length === 0` → `bi-database` icon (32px, muted) + "No service caches yet." + "Caches appear here once services are created and receive requests."
  - [x] "Clear all caches" row at top: visible when `data.length > 0`; button `data-testid="settings-btn-clear-all-caches"`; opens confirmation dialog `data-testid="settings-modal-clear-all-caches-confirm"` with verbatim EXPERIENCE.md text; confirm button `data-testid="settings-btn-clear-all-caches-confirm"`; cancel button `data-testid="settings-btn-clear-all-caches-cancel"`
  - [x] Per-service rows: each shows service name, entry count, `formatBytes(estimatedBytes)`; Clear button `data-testid="settings-btn-clear-cache-{slug}"`; confirmation dialog `data-testid="settings-modal-clear-cache-confirm-{slug}"` with verbatim text; confirm `data-testid="settings-btn-clear-cache-confirm-{slug}"`; cancel `data-testid="settings-btn-clear-cache-cancel-{slug}"`
  - [x] Confirmation dialogs: manage open state with `useState<string | null>(null)` (null = closed; value = slug/serviceId of the one being confirmed; `"__all__"` for clear-all)
  - [x] Clearing in progress: button shows spinner + disabled state while mutation `isPending`

- [x] **Task F4: Update `SettingsPage.tsx`** (AC: 1–5)
  - [x] UPDATE `src/client/src/features/settings/pages/SettingsPage.tsx`
  - [x] Import `CacheSettings` from `../components/CacheSettings`
  - [x] In the section render: change the fallback `<p>Configured in a later story.</p>` to properly branch: `active === "appearance" ? <AppearanceSettings /> : active === "cache" ? <CacheSettings /> : <p className="text-muted">Configured in a later story.</p>`
  - [x] Add `data-testid="settings-nav-{s.id}"` to sub-nav `<button>` elements if not already present (check SettingsPage.tsx — they are missing and must be added now per DESIGN.md convention)

### Tests

- [x] **Task T1: Integration tests** (AC: 1–5)
  - [x] Create `src/Fishtank.Api.IntegrationTests/Api/Story2_5_CacheTests.cs`
  - [x] Extends `IntegrationTestBase`
  - [x] Test: `GET /api/cache` → 401 for unauthenticated
  - [x] Test: `GET /api/cache` → 200 with `[]` for authenticated user with no configured services
  - [x] Test: `DELETE /api/cache/{nonExistentId}` → 404 with `SERVICE_NOT_FOUND` error code
  - [x] Test: `DELETE /api/cache` → 200 with `{"success":true,"data":null}` for authenticated user
  - [x] Use `TestAuthHelper.CreateAuthenticatedClientAsync` for auth setup (same pattern as all `Story2_x` tests)

- [ ] **Task T2: E2E tests** (AC: 1–3, 4, 5)
  - [ ] Create `src/client/tests/e2e/story-2-5-settings-service-cache.spec.ts`
  - [ ] **P0:** `Settings → Cache lists all services with cache entry count and estimated size` — navigate to `/settings`, click Cache sub-nav, assert service rows visible with entry count and size
  - [ ] **P0:** `Per-service "Clear" with confirmation → cache cleared` — click `settings-btn-clear-cache-{slug}`, confirm, assert mutation succeeds and list refreshes
  - [ ] **P1:** `"Clear All" with confirmation → all caches cleared` — click `settings-btn-clear-all-caches`, confirm, assert list refreshes
  - [ ] **P1:** `No services → empty state message` — in a clean DB, navigate to Settings → Cache, assert empty state text visible
  - [ ] **P1:** `Standard User can access and use cache management` — authenticate as non-admin, navigate to Settings → Cache, assert controls visible and functional
  - [ ] Follow E2E mocking policy: use `storageState` for auth, hit real backend for all flows. No `page.route()` mocking for cache endpoints.

---

## Dev Notes

### Architecture Constraints — Mandatory

- **No business logic in endpoint handlers** — `CacheEndpoints.cs` calls `ICacheService` methods only. All WireMock interaction lives in `CacheService`.
- **Never return EF entities** — `CacheService` maps to `ServiceCacheDto` records.
- **`ICacheService` registration** — use `AddScoped` (same as `IServiceManager`). `IServicesRegistry` is singleton; `FishtankDbContext` is scoped — this is fine as `CacheService` is scoped.
- **`IServicesRegistry` is already singleton** — `CacheService` receives it via DI ctor injection; access is thread-safe (`ConcurrentDictionary`).
- **SQLite `ORDER BY DateTimeOffset`** — follow the established pattern from `ServiceManager.ListAsync` (line 84): `ToListAsync()` first, then `.OrderBy(s => s.CreatedAt)` in C#. Apply this in `CacheService.GetAllAsync`.
- **Error codes** — use `CACHE_*` prefix: `CACHE_NOT_FOUND` (404), or reuse `SERVICE_NOT_FOUND` since the entity is still a service.

### WireMock.Net API — Cache Operations

The `WireMockServer` concrete class (not an interface in the registry) provides:
```csharp
// Clear all in-memory mapping rules
server.ResetMappings();

// Reload from the FileSystemHandler's folder (MocksRoot for this service)
// No-arg overload uses the handler already configured at startup
server.ReadStaticMappings();

// Get count of in-memory mappings (IEnumerable<IMapping>)
int count = server.Mappings.Count();
```
`ReadStaticMappings()` without arguments uses the `FileSystemHandler` that was set in `WireMockServerSettings` at startup (`LocalFileSystemHandler(service.MocksRoot)`). This means re-reading the same folder — no path needs to be passed.

**Verify at implementation time:** Check `WireMock.Server.WireMockServer.Mappings` property type and `ReadStaticMappings()` signature in the installed `WireMock.Net` version's source. The NuGet version can be found in `src/Fishtank.Api/Fishtank.Api.csproj`. If the method signature differs, adapt accordingly and note in Dev Agent Record.

### File Locations — New Files

```
src/
  Fishtank.Api/
    Models/
      ServiceCacheDto.cs                          ← NEW
    Services/
      ICacheService.cs                            ← NEW
      CacheService.cs                             ← NEW
    Endpoints/
      CacheEndpoints.cs                           ← NEW
  Fishtank.Api.IntegrationTests/
    Api/
      Story2_5_CacheTests.cs                      ← NEW
  client/src/
    features/settings/
      types/
        cache.ts                                  ← NEW
      hooks/
        useServiceCache.ts                        ← NEW
      components/
        CacheSettings.tsx                         ← NEW
      pages/
        SettingsPage.tsx                          ← UPDATE
  client/tests/e2e/
    story-2-5-settings-service-cache.spec.ts      ← NEW
```

### `SettingsPage.tsx` — What to Preserve

The existing `SettingsPage.tsx` contains:
1. `useState<SettingsSection>("appearance")` — preserve
2. Mobile `<select>` / desktop `<nav>` sub-nav rendering — preserve
3. `active === "appearance" ? <AppearanceSettings /> : <p ...>Configured in later story</p>` — **change** to add `active === "cache"` branch
4. Sub-nav `<button>` elements — add `data-testid="settings-nav-{s.id}"` if missing (check before editing)

Do NOT refactor the layout or mobile/desktop breakpoint logic.

### Hook Pattern from `useAppSettings.ts` (Existing)

```typescript
// Existing pattern in src/client/src/features/settings/hooks/useAppSettings.ts
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export const APP_SETTINGS_QUERY_KEY = ["app-settings"] as const;

export function useAppSettings() {
  return useQuery<AppSettings>({
    queryKey: APP_SETTINGS_QUERY_KEY,
    queryFn: () => apiFetch<AppSettings>("/api/settings"),
    staleTime: Infinity,
  });
}
```
Mirror this pattern in `useServiceCache.ts`. Note: `staleTime: Infinity` is appropriate for settings that rarely change (app settings). For cache stats, use default staleTime (0) so the list always refreshes when the component mounts, to show current counts.

### Confirmation Dialog Pattern

No pre-built confirmation dialog exists in `components/ui/` or `components/shared/` for this project. Implement inline:

```typescript
// State pattern (in CacheSettings.tsx)
const [confirmSlug, setConfirmSlug] = useState<string | null>(null);
// null = closed, "__all__" = clear-all confirm open, "{slug}" = per-service confirm open
```

For the dialog overlay itself, use a simple `<div role="dialog" aria-modal="true">` with:
- `position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 50` for the backdrop
- `background: var(--content-bg); border-radius: var(--radius-lg); padding: var(--section-gap)` for the dialog box
- Buttons using `var(--brand)` for the destructive confirm action (consistent with other confirm patterns in story 2.2/2.4)

### Integration Test Seeding Pattern (from `Story2_4_SystemEventsTests.cs`)

```csharp
// All Story2_x tests use this pattern for auth setup:
private async Task<HttpClient> GetAuthenticatedClientAsync()
{
    await Client.PostAsJsonAsync("/api/auth/setup",
        new { username = "admin", password = "adminpassword123" });
    return await TestAuthHelper.CreateAuthenticatedClientAsync(
        Factory, "admin", "adminpassword123");
}
```
Use the same pattern in `Story2_5_CacheTests.cs`. To test `DELETE /api/cache/{id}` with a valid service, seed a service via `POST /api/services` with the authenticated client, then use the returned `id`.

### Story 2.4 Dev Notes / Learnings Relevant to This Story

- The `IServicesRegistry` is a singleton — `CacheService` can take it as a ctor dependency safely.
- **Auth pattern:** `.RequireAuthorization()` on endpoints = any valid JWT cookie. No Admin-only policy applies to cache operations (FR-46 explicitly states non-Admin users can use this).
- **APIResponse envelope:** all endpoints return `ApiResponse.Ok(data)` — see `src/Fishtank.Api/Endpoints/ApiResponse.cs`. DELETE endpoints return `ApiResponse.Ok<object?>(null)`.
- **apiFetch<T>()** in frontend: always use `credentials: 'include'`; redirects to `/login` on 401 automatically.
- **CSS variables** for theming: `var(--content-bg)`, `var(--content-fg)`, `var(--content-muted)`, `var(--border)`, `var(--sidebar-active-bg)`, `var(--sidebar-active-fg)`. No hardcoded colors except `#ef4444` for the notification badge (unrelated to this story).
- `data-testid` values are defined in DESIGN.md — **always check there first** before inventing a new value. The full list of cache testids is in the table above; use those verbatim.

### Project Structure Notes

- `CacheService` goes in `Services/` alongside `ServiceManager`, `AuthService`, etc.
- No new EF entity or migration is needed — cache is in-memory only.
- `CacheEndpoints.cs` follows the same pattern as `SettingsEndpoints.cs`, `SystemEventsEndpoints.cs`.
- Frontend: `features/settings/types/` folder may not exist yet — create it alongside `cache.ts`.

### References

- FR-46 definition: [_bmad-output/planning-artifacts/epics.md#line-66](..//planning-artifacts/epics.md)
- NFR-15 (destructive confirmations): [_bmad-output/planning-artifacts/epics.md#line-84](..//planning-artifacts/epics.md)
- Story 2.5 ACs: [_bmad-output/planning-artifacts/epics.md#line-724](..//planning-artifacts/epics.md)
- UX Cache section spec: [_bmad-output/planning-artifacts/ux-designs/ux-Fishtank-2026-06-04/EXPERIENCE.md#line-470](..//planning-artifacts/ux-designs/ux-Fishtank-2026-06-04/EXPERIENCE.md)
- data-testid values: [_bmad-output/planning-artifacts/ux-designs/ux-Fishtank-2026-06-04/DESIGN.md#line-752](..//planning-artifacts/ux-designs/ux-Fishtank-2026-06-04/DESIGN.md)
- Test design: [_bmad-output/test-artifacts/test-design-epic-2.md#line-248](..//test-artifacts/test-design-epic-2.md)
- Architecture rules: [_bmad-output/project-context.md](..//project-context.md)
- IServicesRegistry: [src/Fishtank.Api/Engine/IServicesRegistry.cs](../../src/Fishtank.Api/Engine/IServicesRegistry.cs)
- ServicesRegistry: [src/Fishtank.Api/Engine/ServicesRegistry.cs](../../src/Fishtank.Api/Engine/ServicesRegistry.cs)
- SettingsPage.tsx (UPDATE): [src/client/src/features/settings/pages/SettingsPage.tsx](../../src/client/src/features/settings/pages/SettingsPage.tsx)
- SettingsEndpoints.cs (reference): [src/Fishtank.Api/Endpoints/SettingsEndpoints.cs](../../src/Fishtank.Api/Endpoints/SettingsEndpoints.cs)
- Story 2.4 (prior art): [_bmad-output/implementation-artifacts/2-4-system-events-screen-and-notification-panel.md](./2-4-system-events-screen-and-notification-panel.md)
- Program.cs (registration): [src/Fishtank.Api/Program.cs](../../src/Fishtank.Api/Program.cs)
- IntegrationTestBase: [src/Fishtank.Api.IntegrationTests/Support/IntegrationTestBase.cs](../../src/Fishtank.Api.IntegrationTests/Support/IntegrationTestBase.cs)
- Story2_4_SystemEventsTests (pattern): [src/Fishtank.Api.IntegrationTests/Api/Story2_4_SystemEventsTests.cs](../../src/Fishtank.Api.IntegrationTests/Api/Story2_4_SystemEventsTests.cs)

---

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (create-story) / Claude Sonnet 4.6 (dev-story)

### Debug Log References

### Completion Notes List

- Story file created by `bmad-create-story` on 2026-06-27. Ultimate context engine analysis completed — comprehensive developer guide created.
- Note: `WireMockServer.ReadStaticMappings()` no-arg overload must be verified against the installed WireMock.Net version at implementation time.
- Note: `SettingsPage.tsx` sub-nav `<button>` elements need `data-testid="settings-nav-{s.id}"` added — verify if present before editing.
- Note: Confirmation dialog UI pattern has no shared component precedent yet in this project — implement inline in `CacheSettings.tsx` as described in Dev Notes.
- ✅ Implemented by `bmad-dev-story` on 2026-06-27. All 4 integration tests pass (GREEN). `tsc --noEmit` produces zero errors. `dotnet build` produces 0 errors (6 pre-existing NU1903 NuGet advisory warnings unrelated to this story). `npm run build` exit code 1 is pre-existing — exclusively from `[INVALID_ANNOTATION]` warnings in `@microsoft/signalr` node_modules, not from code introduced in this story.
- `WireMockServer.ReadStaticMappings()` confirmed working with installed WireMock.Net version — no-arg overload calls the already-configured `LocalFileSystemHandler`.
- Confirmation dialog implemented inline using `useState<string | null>(null)` pattern as specified: `null` = closed, `"__all__"` = clear-all, `"{slug}"` = per-service.
- `data-testid="settings-nav-{s.id}"` added to sub-nav buttons in `SettingsPage.tsx` (were missing as predicted).
- `features/settings/types/` folder created (did not exist); `cache.ts` placed there.

### File List

- `src/Fishtank.Api/Models/ServiceCacheDto.cs` — CREATED
- `src/Fishtank.Api/Services/ICacheService.cs` — CREATED
- `src/Fishtank.Api/Services/CacheService.cs` — CREATED
- `src/Fishtank.Api/Endpoints/CacheEndpoints.cs` — CREATED
- `src/Fishtank.Api/Program.cs` — UPDATED (DI registration + endpoint mapping)
- `src/client/src/features/settings/types/cache.ts` — CREATED
- `src/client/src/features/settings/hooks/useServiceCache.ts` — CREATED
- `src/client/src/features/settings/components/CacheSettings.tsx` — CREATED
- `src/client/src/features/settings/pages/SettingsPage.tsx` — UPDATED

### Change Log

- 2026-06-27: Implemented Story 2.5 — Settings Service Cache Management. Created backend cache service layer (`ServiceCacheDto`, `ICacheService`, `CacheService`), cache endpoints (`GET /api/cache`, `DELETE /api/cache/{id}`, `DELETE /api/cache`), registered in DI and endpoint routing. Created frontend types (`cache.ts`), React Query hooks (`useServiceCache.ts`), and `CacheSettings` component with loading state, empty state, per-service rows, Clear/Clear All buttons with confirmation dialogs. Updated `SettingsPage.tsx` to add `CacheSettings` branch and `data-testid` attributes to sub-nav buttons.
