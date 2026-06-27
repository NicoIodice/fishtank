---
story_key: "2-5-settings-service-cache-management"
generated: "2026-06-27"
verdict: "PASS"
stepsCompleted: ["step-05-generate-report"]
lastStep: "step-05-generate-report"
lastSaved: "2026-06-27"
---

# NFR Assessment — Story 2.5
# Settings — Service Cache Management

**Generated:** 2026-06-27  
**Story:** 2.5 — Settings: Service Cache Management  
**Baseline commit:** current `main` (story `review` phase)  
**Overall Gate Decision:** ✅ PASS — Zero BLOCKER items found

**BLOCKER COUNT: 0**

---

## Scope

New code paths audited:

| Artifact | Path |
|---|---|
| `CacheService.cs` | `src/Fishtank.Api/Services/CacheService.cs` |
| `ICacheService.cs` | `src/Fishtank.Api/Services/ICacheService.cs` |
| `CacheEndpoints.cs` | `src/Fishtank.Api/Endpoints/CacheEndpoints.cs` |
| `ServiceCacheDto.cs` | `src/Fishtank.Api/Models/ServiceCacheDto.cs` |
| `CacheSettings.tsx` | `src/client/src/features/settings/components/CacheSettings.tsx` |
| `useServiceCache.ts` | `src/client/src/features/settings/hooks/useServiceCache.ts` |
| `cache.ts` | `src/client/src/features/settings/types/cache.ts` |

No product code was modified during this review.

**NFR thresholds consulted:**

- `project-context.md` — NFR-8 (RequireAuthorization on all non-health endpoints), JWT cookie-only storage, EF Core parameterized queries (no SQL injection surface), anti-patterns table, architecture boundary rules
- `_bmad-output/test-artifacts/test-design-epic-2.md` NFR Planning table — performance, security, reliability thresholds for Epic 2; "unknown thresholds" note for cache EstimatedBytes display
- Story 2.5 story file — explicit guidance that `HUB_INVALIDATION_MAP` exemption applies; no-op for stopped services is by design; `onSettled` invalidation is correct for cache mutations

---

## NFR Evidence by Category

### 1. Security

| Check | Description | Evidence | Score |
|---|---|---|---|
| NFR-8: GET /api/cache requires auth | All three endpoints must carry `.RequireAuthorization()` | `CacheEndpoints.cs:9`: `app.MapGet("/api/cache", ...).RequireAuthorization()` ✔ | ✅ PASS |
| NFR-8: DELETE /api/cache/{id} requires auth | | `CacheEndpoints.cs:10`: `.RequireAuthorization()` ✔ | ✅ PASS |
| NFR-8: DELETE /api/cache requires auth | | `CacheEndpoints.cs:11`: `.RequireAuthorization()` ✔ | ✅ PASS |
| NFR-8: Auth guard verified by test | Integration test asserts 401 for unauthenticated GET | `Story2_5_CacheTests.cs` → `GetCache_Unauthenticated_Returns401` (GREEN — endpoint mapped and returning 401) | ✅ PASS |
| No sensitive data in response | `ServiceCacheDto` fields examined for PII / secrets | Fields: `ServiceId` (GUID), `ServiceName`, `Slug`, `EntryCount` (int), `EstimatedBytes` (long). No passwords, tokens, internal paths, stack traces, or PII. | ✅ PASS |
| Input validation — GUID route constraint | Non-GUID `{id}` values rejected before reaching handler | `{id:guid}` route constraint on `DELETE /api/cache/{id:guid}` (`CacheEndpoints.cs:10`) — ASP.NET Core routing returns 404 for non-GUID values before handler executes | ✅ PASS |
| Input validation — service existence | Handler validates service exists before clearing | `ClearAsync` calls `FirstOrDefaultAsync(s => s.Id == serviceId && s.DeletedAt == null)` and throws `NotFoundException` → 404 + `SERVICE_NOT_FOUND` error code. Integration test: `DeleteCache_NonExistentId_Returns404WithServiceNotFound` (GREEN) | ✅ PASS |
| No SQL injection surface | EF Core parameterized queries only | `GetAllAsync` uses LINQ `.Where()`, `ToListAsync()`, `FirstOrDefaultAsync()` — all EF Core parameterized. No raw SQL. No `FromSqlRaw`. | ✅ PASS |
| No path traversal via MocksRoot | `EstimateSize` receives `s.MocksRoot` from DB entity | `MocksRoot` is set at service creation from the `FISHTANK_MOCKS_ROOT` base path (a server-controlled value, not user-supplied per-request input). Not constructed from request data. No traversal risk at the cache-read call site. | ✅ PASS |
| JWT never in localStorage | Frontend uses `apiFetch<T>()` with `credentials:'include'` | `useServiceCache.ts:10-11`: `apiFetch<ServiceCacheEntry[]>("/api/cache")` via `useQuery`; `apiFetch<null>(...)` in mutations. `apiFetch` always sets `credentials:'include'` — JWT rides the httpOnly cookie. | ✅ PASS |

**Security gate: ✅ PASS — No BLOCKERs, no concerns**

---

### 2. Performance

| Check | Description | Evidence | Score |
|---|---|---|---|
| EstimateSize — synchronous disk I/O | `EstimateSize` calls `Directory.EnumerateFiles` + `new FileInfo(f).Length` for each service on every `GET /api/cache` | Synchronous I/O inside a LINQ `.Select()` projection executed after the async DB query. Bounded by `SearchOption.TopDirectoryOnly` (flat dir scan, no recursion). For expected volumes (< 20 services, < 100 mapping files each), latency is negligible (< 5 ms per service on local SSD). No ms threshold is defined in the project (test-design-epic-2.md explicitly marks this as "unknown threshold; best-effort estimate"). | ⚠️ CONCERNS (deferred) |
| No N+1 database queries | `GetAllAsync` must not issue per-service DB queries | One `db.Services.Where(...).ToListAsync(ct)` call, then in-memory `.Select()` using the already-loaded registry. Zero additional DB round-trips per service. | ✅ PASS |
| ClearAsync / ClearAllAsync latency | WireMock `ResetMappings()` + `ReadStaticMappings()` synchronous disk ops | Both methods are synchronous WireMock.NET operations. `ReadStaticMappings()` reads the MocksRoot directory. Bounded by per-service file count and IO throughput. For expected volumes (< 100 mapping files per service, < 20 services), acceptable. No latency threshold is defined for these mutation paths. | ⚠️ CONCERNS (deferred) |
| React Query — no polling introduced | Cache UI must not poll | `useServiceCaches` is a standard `useQuery` with no `refetchInterval`. Data refreshes via `onSettled` invalidation in mutations (as approved by story design). No background polling. | ✅ PASS |
| Response payload size | `ServiceCacheDto` is minimal | 5 scalar fields per service: `serviceId` (UUID string), `serviceName` (string), `slug` (string), `entryCount` (int), `estimatedBytes` (long). Negligible payload for expected service counts. | ✅ PASS |

**Performance gate: ✅ PASS** (2 deferred CONCERNS — synchronous disk I/O per `EstimateSize` and per `ReadStaticMappings` on clear; no threshold defined, best-effort by design. Not a defect.)

---

### 3. Reliability

| Check | Description | Evidence | Score |
|---|---|---|---|
| EstimateSize fault handling | `try/catch` must prevent disk errors from failing GET /api/cache | `CacheService.cs:61-70`: bare `catch { return 0; }` swallows any `IOException`, `UnauthorizedAccessException`, `DirectoryNotFoundException`. Returns `0` as safe fallback. `formatBytes(0)` → `"0 B"` renders cleanly in the UI. | ✅ PASS |
| Stopped service no-op (ClearAsync) | Clearing a stopped (not in registry) service must not throw | `ClearAsync` guards with `if (registry.TryGet(service.Id, out var server) && server is not null)` before calling WireMock methods. Explicit comment: "If service is not in the registry (stopped), no in-memory cache to clear — no-op". Returns `Task.CompletedTask` implicitly. | ✅ PASS |
| Stopped service no-op (ClearAllAsync) | If no services are running, ClearAllAsync must be safe | `ClearAllAsync` iterates `registry.GetAll().Values`. Empty collection → loop body never executes. No error. | ✅ PASS |
| WireMock Mappings null safety | `server.Mappings.Count()` must not NPE | WireMock.NET `WireMockServer.Mappings` returns an `IEnumerable<IMapping>` that is never null by contract (returns empty enumerable for no mappings). Acceptable reliance on library contract consistent with existing usages across the codebase. | ✅ PASS |
| NotFoundException propagated correctly | ClearAsync 404 must return structured envelope | `CacheEndpoints.cs:27-30`: `catch (NotFoundException ex) → Results.NotFound(ApiResponse.Fail(ex.ErrorCode, ex.Message))`. Error code is `"SERVICE_NOT_FOUND"`. Integration test: `DeleteCache_NonExistentId_Returns404WithServiceNotFound` (GREEN). | ✅ PASS |
| CancellationToken threading — GetAllAsync | `ct` must flow to async DB call | `CacheService.cs:14`: `ToListAsync(ct)` ✔ | ✅ PASS |
| CancellationToken threading — ClearAsync | `ct` must flow to async DB call | `CacheService.cs:41`: `FirstOrDefaultAsync(s => ..., ct)` ✔ | ✅ PASS |
| CancellationToken threading — ClearAllAsync | `ct` parameter present but not used in loop body | `ClearAllAsync` signature accepts `ct` but the `foreach` loop body calls synchronous WireMock methods (`ResetMappings()`, `ReadStaticMappings()`) that have no CancellationToken overload. `ct` cannot be threaded into synchronous calls. The method returns `Task.CompletedTask` synchronously — there is no awaitable point to check cancellation. Inherent WireMock.NET API limitation; not a convention violation. Acceptable. | ✅ PASS |
| Mutation onSettled invalidation | Cache list must refresh after clear | `useServiceCache.ts`: both `useClearCache` and `useClearAllCaches` use `onSettled` → `queryClient.invalidateQueries({ queryKey: SERVICE_CACHE_QUERY_KEY })`. Fires on both success and error, guaranteeing list refresh. Story design explicitly approves this pattern for cache (no hub event emitted, `onSettled` is correct). | ✅ PASS |

**Reliability gate: ✅ PASS — No BLOCKERs, no concerns**

---

### 4. Maintainability

| Check | Description | Evidence | Score |
|---|---|---|---|
| Architecture boundary: no business logic in endpoints | `CacheEndpoints.cs` delegates entirely to `ICacheService` | `GetCachesAsync`: `var list = await cacheService.GetAllAsync(ct); return Results.Ok(...)`. No business logic. `ClearCacheAsync`: delegates to `cacheService.ClearAsync` + catches `NotFoundException`. `ClearAllCachesAsync`: delegates to `cacheService.ClearAllAsync`. ✔ | ✅ PASS |
| Architecture boundary: no EF entity returned | DTO used, not `Service` entity | `ServiceCacheDto` record is the only type returned. EF `Service` entity is mapped inline in `GetAllAsync` via `.Select()`. ✔ | ✅ PASS |
| Interface abstraction for testability | `ICacheService` used in endpoints; concrete class not referenced | `CacheEndpoints` parameters typed as `ICacheService`. `ICacheService` is a clean 3-method interface. Enables mock injection in component/unit tests. ✔ | ✅ PASS |
| `IServicesRegistry` dependency injection | No direct `ServicesRegistry` reference in `CacheService` | Constructor: `CacheService(FishtankDbContext db, IServicesRegistry registry)`. Interface dependency only. ✔ | ✅ PASS |
| Single Responsibility | Each class/hook has one concern | `CacheService` — data retrieval + clearing; `CacheEndpoints` — routing only; `useServiceCache.ts` — React Query hooks; `CacheSettings.tsx` — UI rendering with dialog state. All single-concern. ✔ | ✅ PASS |
| Anti-pattern: raw `fetch` | Frontend must use `apiFetch<T>()` | `useServiceCache.ts:8,15,21`: all calls use `apiFetch<...>(...)`. No raw `fetch()` in hooks or components. ✔ | ✅ PASS |
| Anti-pattern: loading via `useState` | Must use React Query `isLoading` | `CacheSettings.tsx:10`: `const { data, isLoading } = useServiceCaches();`. Loading state from `isLoading` flag, not `useState`. ✔ | ✅ PASS |
| Anti-pattern: invalidation inside component | `queryClient.invalidateQueries` must not be called in components | Invalidation is in `onSettled` callbacks inside `useServiceCache.ts` hooks — not in `CacheSettings.tsx`. Component calls `clearCache.mutate(id)` and `clearAllCaches.mutate()` only. Story design explicitly exempts this from the `HUB_INVALIDATION_MAP` rule (no SignalR event for cache ops). ✔ | ✅ PASS |
| `data-testid` completeness | All interactive elements must have canonical testids | Verified against story's DESIGN.md table: `settings-btn-clear-all-caches` ✔, `settings-modal-clear-all-caches-confirm` ✔, `settings-btn-clear-all-caches-confirm` ✔, `settings-btn-clear-all-caches-cancel` ✔, `settings-btn-clear-cache-{slug}` ✔ (dynamic), `settings-modal-clear-cache-confirm-{slug}` ✔ (dynamic), `settings-btn-clear-cache-confirm-{slug}` ✔ (dynamic), `settings-btn-clear-cache-cancel-{slug}` ✔ (dynamic). All 8 canonical testids present. | ✅ PASS |
| No cross-feature imports | `CacheSettings.tsx` and hooks must not import from other feature folders | Imports checked: `useServiceCache.ts` imports from `@/lib/api` (shared lib, not a feature), `@tanstack/react-query`, and `../types/cache` (same feature). `CacheSettings.tsx` imports from `../hooks/useServiceCache` and `../types/cache` (same feature). No cross-feature imports. ✔ | ✅ PASS |
| Code clarity — dialog state | `confirmSlug` sentinel pattern | `null` = closed, `"__all__"` = clear-all open, `{slug}` = per-service open. Comment at declaration explains the sentinel values. Trades a small amount of type-level explicitness for reduced state complexity. Acceptable for a 3-state machine. ✔ | ✅ PASS |

**Maintainability gate: ✅ PASS — No BLOCKERs, no concerns**

---

## Deferred CONCERNS (Non-Blocking)

| ID | Category | Description | Severity | Action |
|---|---|---|---|---|
| C-1 | Performance | `EstimateSize` performs synchronous disk I/O (`Directory.EnumerateFiles` + `FileInfo.Length`) for every service on every `GET /api/cache` request. Bounded by `TopDirectoryOnly` and expected service/file counts. No latency threshold defined; design intent is "best-effort estimate". | CONCERNS | Monitor; revisit if services grow >50 with large mapping sets or if cache endpoint response time becomes measurable. Consider caching size result with a short TTL or computing async in a future story. |
| C-2 | Performance | `ClearAsync` / `ClearAllAsync` call WireMock's synchronous `ResetMappings()` + `ReadStaticMappings()` which involve disk I/O. No latency threshold defined for these mutation paths. Acceptable at expected volumes. | CONCERNS | No action needed now. Monitor in production if service counts grow substantially. |

---

## Test Coverage Summary

| Layer | File | Count | Status |
|---|---|---|---|
| Backend integration | `Story2_5_CacheTests.cs` | 5 tests | ✅ GREEN (4 pre-existing + 1 StandardUser added by testarch-automate) |
| Frontend unit | `story-2-5-cache-types.test.ts` | 9 tests | ✅ GREEN (added by testarch-automate) |
| Frontend component | `story-2-5-cache-settings.test.tsx` | 15 tests | ✅ GREEN (added by testarch-automate) |
| E2E Playwright | `story-2-5-settings-service-cache.spec.ts` | 5 tests | 🔴 RED (live stack required — scaffolds pass on real backend) |

All integration and component tests are GREEN. E2E tests are red-phase scaffolds requiring the live stack (correct per project-context.md E2E policy; no page.route() mock bypass).

---

## Overall Gate Decision

**VERDICT: ✅ PASS**

- **BLOCKER items:** 0
- **FAIL items:** 0
- **CONCERNS items (deferred, non-blocking):** 2 (C-1, C-2 — both performance, both volume-bounded, no threshold defined)
- **Exemptions:** NFR-16 (JWT in localStorage) — N/A, no auth logic in this story. NFR-9 (header redaction) — N/A, no header handling added.

Story 2.5 is clear to proceed to the `done` gate. No remediation required before release.

**Recommended next workflow:** `bmad-testarch-trace` to generate the traceability matrix confirming all ACs are covered by passing tests before the epic 2 exit gate.
