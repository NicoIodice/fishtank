# Code Review — Story 5.1: Feature Toggles — Runtime Control & SignalR Broadcast

| Field | Value |
|-------|-------|
| **Story** | 5.1 Feature Toggles — Runtime Control & SignalR Broadcast |
| **Branch** | `feature/5-1-feature-toggles-runtime-control-and-signalr-broadcast` |
| **Base** | `release/v0.5.0` |
| **Reviewer** | Nico (via bmad-code-review) |
| **Date** | 2026-07-01 |
| **Diff Stats** | ~1100 lines added across 18+ files |

---

## Gate Decision: ✅ PASS

| Severity | Count |
|----------|-------|
| BLOCKER | 0 |
| MAJOR | 0 |
| MINOR | 1 |

---

## Executive Summary

Story 5.1 implements the Admin Console foundation and feature toggle system with SignalR real-time propagation. The implementation is **security-compliant** and **functionally complete** against all 14 acceptance criteria. One minor defensive coding gap was identified for future hardening.

### Security Verification (OWASP Requirements)

| Requirement | Status | Evidence |
|-------------|--------|----------|
| **A01: Access Control** | ✅ PASS | `.RequireAuthorization(policy => policy.RequireRole("Admin"))` on admin group ([AdminEndpoints.cs:11](src/Fishtank.Api/Endpoints/AdminEndpoints.cs#L11)) |
| **A02: Cryptographic** | ✅ PASS | JWT middleware not bypassed; `[Authorize]` on TogglesHub ([TogglesHub.cs:6](src/Fishtank.Api/Hubs/TogglesHub.cs#L6)) |
| **A03: Injection** | ✅ PASS | Toggle names come from hardcoded `knownToggles` array; EF Core parameterizes DB queries |
| **A04: Insecure Design** | ✅ PASS | `_envVarOverrides` loaded once at construction, immutable dictionary; locked toggles throw 409 |

---

## Findings

### MINOR-001: URL Path Not Encoded in setToggle API Call

**File:** [src/client/src/features/admin/hooks/useToggles.ts](src/client/src/features/admin/hooks/useToggles.ts#L28)  
**Layer:** Edge Case Hunter  
**Category:** Defensive Coding

**Current Code:**
```typescript
const response = await fetch(`/api/admin/toggles/${name}`, {
```

**Issue:** Toggle `name` is interpolated directly into URL path without encoding. If toggle names ever contain URL-special characters (`/`, `?`, `#`, `%`), the request would break or target wrong endpoint.

**Current Risk:** LOW — seeded toggle names use only `[a-z_]` characters: `network_activity`, `mappings_editor`, `record_mode`, `system_events`, `services_management`.

**Recommended Fix:**
```typescript
const response = await fetch(`/api/admin/toggles/${encodeURIComponent(name)}`, {
```

**Verdict:** `PATCH` — one-line fix, good practice for defense-in-depth.

---

## Acceptance Criteria Verification

| AC | Description | Status | Evidence |
|----|-------------|--------|----------|
| AC-1 | Admin Console route guard | ✅ | `AdminPage.tsx:14-17` — useEffect redirect + render guard |
| AC-2 | Admin Console sidebar nav | ✅ | `Sidebar.tsx:132` — conditional on `user?.role === "Admin"` |
| AC-3 | Backend Admin role requirement | ✅ | `AdminEndpoints.cs:11` — `.RequireRole("Admin")` |
| AC-4 | Feature Toggles sub-nav tab default | ✅ | `AdminConsolePage.tsx` — Feature Toggles renders by default |
| AC-5 | Toggle table with state switches | ✅ | `FeatureTogglesSection.tsx:57-102` — table with checkbox switches |
| AC-6 | Disable confirmation dialog (NFR-15) | ✅ | `FeatureTogglesSection.tsx:102-133` — dialog with Cancel/Disable |
| AC-7 | Enable without confirmation | ✅ | `FeatureTogglesSection.tsx:28-29` — direct setToggle call |
| AC-8 | SignalR broadcast to all sessions | ✅ | `FeatureToggleService.cs:97-101` — `Clients.All.SendAsync` |
| AC-9 | Env var override UI badge | ✅ | `FeatureTogglesSection.tsx:70-76` — "Overridden by env var" badge |
| AC-10 | Env-var-locked returns 409 | ✅ | `FeatureToggleService.cs:72-76` — throws `ConflictException("ADMIN_TOGGLE_ENV_LOCKED")` |
| AC-11 | Unknown toggle returns 404 | ✅ | `FeatureToggleService.cs:79-82` — throws `NotFoundException("ADMIN_TOGGLE_NOT_FOUND")` |
| AC-12 | HUB_INVALIDATION_MAP updated | ✅ | `queryClient.ts:7` — `FeatureToggleChanged: [["toggles"]]` |
| AC-13 | Standard User cannot access admin endpoints | ✅ | Returns 403 with `ADMIN_FORBIDDEN` code (JsonAuthorizationMiddlewareResultHandler) |
| AC-14 | All data-testid attributes present | ✅ | Verified all 13 required testids present |

---

## Implementation Quality Notes

### Strengths

1. **Clean Authorization Pattern:** Single `.RequireRole("Admin")` on the route group ensures no endpoint bypass
2. **Proper Error Codes:** `ADMIN_FORBIDDEN`, `ADMIN_TOGGLE_ENV_LOCKED`, `ADMIN_TOGGLE_NOT_FOUND` — machine-readable
3. **Immutable Env Overrides:** `_envVarOverrides` dictionary populated once, never mutated — no runtime TOCTOU
4. **Frontend Guard Pattern:** Dual-layer (useEffect redirect + render guard) prevents flash of protected content
5. **SignalR Integration:** Proper hub authorization + broadcast pattern matching existing infrastructure

### Architecture Compliance

| Pattern | Status |
|---------|--------|
| Minimal API group + RequireAuthorization | ✅ Follows existing endpoint patterns |
| SignalR hub with `[Authorize]` | ✅ Matches EventsHub/ActivityHub |
| React Query + HUB_INVALIDATION_MAP | ✅ Extends existing real-time cache invalidation |
| Scoped service registration | ✅ FeatureToggleService registered correctly |

---

## Files Reviewed

### Backend (8 files)
- `src/Fishtank.Api/Data/Entities/FeatureToggle.cs` — NEW entity
- `src/Fishtank.Api/Endpoints/AdminEndpoints.cs` — NEW endpoints
- `src/Fishtank.Api/Hubs/TogglesHub.cs` — NEW SignalR hub
- `src/Fishtank.Api/Middleware/JsonAuthorizationMiddlewareResultHandler.cs` — NEW middleware
- `src/Fishtank.Api/Services/FeatureToggleService.cs` — NEW service
- `src/Fishtank.Api/Program.cs` — UPDATED registration + mapping
- `src/Fishtank.Api/Migrations/20260701*_AddFeatureToggles.cs` — NEW migration

### Frontend (7 files)
- `src/client/src/features/admin/pages/AdminPage.tsx` — NEW route guard
- `src/client/src/features/admin/components/AdminConsolePage.tsx` — NEW container
- `src/client/src/features/admin/components/FeatureTogglesSection.tsx` — NEW toggle UI
- `src/client/src/features/admin/hooks/useToggles.ts` — NEW React Query hooks
- `src/client/src/features/admin/hooks/useTogglesHub.ts` — NEW SignalR hook
- `src/client/src/lib/queryClient.ts` — UPDATED invalidation map
- `src/client/src/components/layout/Sidebar.tsx` — UPDATED nav item

---

## Triage Summary

| Finding | Severity | Disposition | Action |
|---------|----------|-------------|--------|
| MINOR-001: URL path encoding | MINOR | PATCH | Apply `encodeURIComponent(name)` fix |

---

## Reviewer Notes

This implementation demonstrates strong security hygiene:
- No authorization bypass vectors
- Proper segregation of Admin-only functionality  
- Defense-in-depth with frontend + backend guards
- Clean error handling with typed exceptions

The single MINOR finding is a defensive coding gap that poses no immediate risk given the controlled toggle name vocabulary, but should be patched for robustness.

---

**Review completed. Gate: PASS.**
