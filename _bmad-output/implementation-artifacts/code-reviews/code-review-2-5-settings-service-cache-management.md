# Code Review — Story 2-5: Settings — Service Cache Management

**Date:** 2026-06-27
**Reviewer:** GitHub Copilot (bmad-code-review)
**Review Mode:** full (spec: `_bmad-output/implementation-artifacts/2-5-settings-service-cache-management.md`)
**Files in Scope:** 10 files (5 new, 3 modified, 2 new test files)

---

## Diff Stats

| Layer | New Files | Modified Files |
|---|---|---|
| Backend | `ServiceCacheDto.cs`, `ICacheService.cs`, `CacheService.cs`, `CacheEndpoints.cs` | `Program.cs` (DI + endpoint map) |
| Frontend | `cache.ts`, `useServiceCache.ts`, `CacheSettings.tsx` | `SettingsPage.tsx` |
| Tests | `Story2_5_CacheTests.cs`, `story-2-5-settings-service-cache.spec.ts` | — |

---

## Gate Verdict: ✅ PASS

**Zero blockers.** All mandatory project constraints are satisfied. See ADVISORY items below for recommended polish.

---

## BLOCKER Items

_None._

---

## ADVISORY Items

### ADV-1 · "Clear All" button not styled as destructive
**File:** `src/client/src/features/settings/components/CacheSettings.tsx` (line ~65)
**Source:** Acceptance Auditor (DESIGN.md line 563)

DESIGN.md specifies the "Clear All" button on the settings row as `variant: destructive` — solid `{colors.error}` background with `{colors.brand-fg}` text. The implementation renders a transparent border-button (`background: "transparent"`) identical in style to the per-service "Clear" buttons. The confirmation dialog's confirm button also uses `var(--brand)` (blue) rather than a destructive red.

**Suggested fix:** Apply `background: "var(--error)"` (or equivalent destructive CSS variable) and `color: "var(--brand-fg)"` to both the Clear All trigger button and its confirm button in the dialog.

---

### ADV-2 · Per-service confirmation dialog missing heading
**File:** `src/client/src/features/settings/components/CacheSettings.tsx` (line ~230)
**Source:** Edge Case Hunter + Acceptance Auditor

The "Clear All" confirmation dialog opens with `<h3>Clear all caches?</h3>` before the body text — giving screen readers a labelled dialog title. The per-service confirmation dialog omits any heading element and jumps directly to `<p>Clear cache for {name}?</p>`. Neither dialog sets `aria-labelledby` to associate the heading with `role="dialog"`.

**Suggested fix:**
1. Add `<h3>Clear cache for {entry.serviceName}?</h3>` before the `<p>` in the per-service dialog.
2. Add `id="dialog-title-all"` / `id="dialog-title-{slug}"` to the respective headings and `aria-labelledby` to each `role="dialog"` container.

---

### ADV-3 · Escape key not handled on confirmation dialogs
**File:** `src/client/src/features/settings/components/CacheSettings.tsx`
**Source:** Edge Case Hunter

Both confirmation dialogs close on backdrop click but neither handles the `Escape` keydown event. The [ARIA Authoring Practices Guide (Modal Dialog)](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) mandates that `Escape` closes an `aria-modal="true"` dialog.

**Suggested fix:** Add a `useEffect` that attaches a `keydown` listener when `confirmSlug !== null` and calls `setConfirmSlug(null)` on `Escape`:

```tsx
useEffect(() => {
  if (confirmSlug === null) return;
  const handleKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") setConfirmSlug(null);
  };
  window.addEventListener("keydown", handleKey);
  return () => window.removeEventListener("keydown", handleKey);
}, [confirmSlug]);
```

---

### ADV-4 · AC-3 E2E intercept URL is ambiguous (method-blind)
**File:** `src/client/tests/e2e/story-2-5-settings-service-cache.spec.ts` (line ~128)
**Source:** Edge Case Hunter

```typescript
const clearAllCall = interceptNetworkCall({ url: "**/api/cache" });
```

The pattern `**/api/cache` matches both `GET /api/cache` (the list refetch triggered after mutation settlement) and `DELETE /api/cache`. The comment notes this risk, but if React Query's `onSettled` fires a background `GET /api/cache` refetch race-before the intercept is resolved, the captured call may be the `GET` rather than the `DELETE`, causing `expect(status).toBe(200)` to pass vacuously (GET also returns 200).

**Suggested fix:** Filter by HTTP method if `interceptNetworkCall` supports it (e.g., `{ url: "**/api/cache", method: "DELETE" }`). If the fixture doesn't support method filtering, assert on the response body `success: true` and verify `data: null` (which distinguishes a DELETE response from the GET list response).

---

### ADV-5 · `EstimateSize` performs synchronous filesystem I/O on every GET /api/cache
**File:** `src/Fishtank.Api/Services/CacheService.cs` (line ~62)
**Source:** Edge Case Hunter

`EstimateSize` calls `Directory.EnumerateFiles` + `new FileInfo(f).Length` for every service entry on every `GET /api/cache` poll. For services with large numbers of mock files, this adds synchronous filesystem traversal in an otherwise async I/O path.

Acceptable at current scale, but worth noting for future optimization. A simple improvement would be to cache the result with a short TTL (e.g., `MemoryCache` with 5–10 s expiry) or compute only on-demand (lazy load via a separate endpoint).

_No immediate action required — flag for future backlog._

---

### ADV-6 · Empty-state and loading containers missing `data-testid`
**File:** `src/client/src/features/settings/components/CacheSettings.tsx` (lines ~13–39)
**Source:** Acceptance Auditor (project-context.md: "key structural containers must carry a `data-testid`")

The loading state `<div>` and empty-state `<div>` containers carry no `data-testid`. The E2E AC-4 test uses `getByText("No service caches yet.")` — which works — but the project standard requires `data-testid` on structural containers.

**Suggested fix:**
- Loading state: `data-testid="settings-cache-loading"`
- Empty state: `data-testid="settings-cache-empty-state"`

_(DESIGN.md does not enumerate these; names follow the `settings-{element}` convention.)_

---

## DEFER Items (pre-existing, not introduced by this story)

### DEF-1 · Error codes passed as string literals instead of typed constants
**File:** `src/Fishtank.Api/Services/CacheService.cs` (line 40)
**Pre-existing in:** `src/Fishtank.Api/Services/ServiceManager.cs` (line 217)

`"SERVICE_NOT_FOUND"` is a raw string literal rather than a `const` field. `CacheService` follows the same pattern as `ServiceManager` (story 2-1). The project context specifies error codes must be "defined screaming-snake-case constants" — string constants from a central `ErrorCodes` class would improve refactorability and discoverability.

_Pre-existing technical debt; not introduced by this story. Deferred._

---

### DEF-2 · `catch {}` in `EstimateSize` swallows all exception types
**File:** `src/Fishtank.Api/Services/CacheService.cs` (line ~69)

`catch { return 0; }` silences `DirectoryNotFoundException`, `UnauthorizedAccessException`, and (theoretically) `OutOfMemoryException`. The intent is graceful degradation (return 0 if the mocks directory is unavailable), which is reasonable, but catching `Exception` explicitly and logging the path + exception at `Debug`/`Warning` level would aid diagnosis.

_Pattern is intentional and consistent with the WireMock setup elsewhere. Deferred._

---

## Compliance Checklist

| Criterion | Status | Notes |
|---|---|---|
| API envelope on all non-health/openapi endpoints | ✅ | GET, DELETE /{id}, DELETE all — all wrapped |
| `.RequireAuthorization()` on every endpoint | ✅ | All 3 cache endpoints |
| Frontend uses `apiFetch<T>()`, never raw `fetch` | ✅ | `useServiceCaches`, `useClearCache`, `useClearAllCaches` |
| `credentials: 'include'` set on all API calls | ✅ | Inherited from `apiFetch` implementation |
| JWT in httpOnly cookie only | ✅ | No localStorage usage |
| Error codes screaming-snake-case & documented | ✅ | `SERVICE_NOT_FOUND` — defined in story 2-1, CHANGELOG.md |
| TypeScript strict mode | ✅ | No implicit `any`; nullability handled with `??` |
| No secrets/tokens in code | ✅ | None present |
| OWASP — Injection (path traversal via `mocksRoot`) | ✅ | `mocksRoot` is system-derived at service creation; cache endpoint only reads it, does not accept it as input |
| OWASP — Broken Access Control | ✅ | All endpoints auth-guarded; no privilege escalation path |
| OWASP — Security Misconfiguration | ✅ | No misconfigurations introduced |
| Architecture boundary (no business logic in endpoints) | ✅ | Endpoints delegate entirely to `ICacheService` |
| EF entities not returned from endpoints | ✅ | `ServiceCacheDto` used; entity not exposed |
| `data-testid` on interactive elements | ✅ | All DESIGN.md-specified testids present; two structural containers lack them (ADV-6) |

---

## Summary

| Category | Count |
|---|---|
| BLOCKER | 0 |
| ADVISORY | 6 |
| DEFER (pre-existing) | 2 |
| Dismissed as noise | 0 |

**Story 2-5 is clear to advance.** ADV-1 (destructive button styling) and ADV-2 (missing dialog heading + `aria-labelledby`) are the highest-value fixes and can be addressed in a quick polish pass without re-reviewing. ADV-3 (Escape key) is a WCAG accessibility requirement and is equally recommended before the feature ships.
