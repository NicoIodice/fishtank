# Code Review: Story 4.5 — Record Mode & Cross-Screen Recording Indicator

**Reviewer:** GitHub Copilot (bmad-code-review)
**Date:** 2026-07-08
**Branch:** `feature/4-5-record-mode-and-cross-screen-recording-indicator`
**Diff base:** `release/v0.4.0`
**Review mode:** full (spec + context loaded)
**Spec file:** `_bmad-output/implementation-artifacts/stories/4-5-record-mode-and-cross-screen-recording-indicator.md`

---

## Re-Review Result (2026-07-08)

### Verdict: ✅ PASS — Both blockers resolved, no new issues introduced

| Blocker | Status | Assessment |
|---|---|---|
| B-1: Wrong slug in `CaptureAsync` | ✅ FIXED | Correct DB read, consistent tuple type throughout |
| B-2: `null` renders warning badge | ✅ FIXED | All 3 `isConnected` states handled correctly |

**B-1 assessment:** `_serviceInfo` is now typed `ConcurrentDictionary<Guid, (string Name, int Port, string Slug)>`, consistent with the updated `FetchServiceInfoAsync` return type `(string Name, int Port, string Slug)` which reads `svc.Slug` directly from the DB. The `CaptureAsync` call passes `info.Slug` with an inline comment confirming intent. The `default` guard (`if (info == default) return;`) remains correct — the three-field tuple default `(null, 0, null)` is unreachable given DB constraints on `Slug`. No new issues.

**B-2 assessment:** Changed from `{isConnected ? ... }` (falsy on `null` and `false`) to `{isConnected !== false ? ... }` (warning only on confirmed `false`). All three states are correctly handled: `null` (initial connecting) → "● Recording"; `true` (connected) → "● Recording"; `false` (disconnected) → warning badge. The badge is already gated by `{isRecording && ...}` so there is no rendering risk when not recording. No new issues.

The remaining MAJOR and MINOR items from the original review are unchanged and unaffected by these fixes.

---

## Original Review — Verdict: ❌ FAIL — 2 BLOCKERS found

| Category | Count |
|---|---|
| BLOCKER | 2 |
| MAJOR | 3 |
| MINOR | 4 |
| Dismissed | 2 |

---

## BLOCKER Items

### B-1: Wrong service slug passed to `CaptureAsync` — files written to incorrect directory

**File:** `src/Fishtank.Api/Engine/ActivityPollingService.cs:131`
**Violates:** AC-4

**Detail:** In `ProcessLogEntryAsync`, the `serviceSlug` argument passed to `recordingService.CaptureAsync()` is:

```csharp
info.Name.ToLowerInvariant().Replace(" ", "-")  // serviceSlug
```

However, `_serviceInfo` is typed `ConcurrentDictionary<Guid, (string Name, int Port)>` and is populated from `FetchServiceInfoAsync`, which only reads `(svc.Name, svc.Port)` from the DB — it does **not** read `svc.Slug`.

The `Service` entity has a separate `Slug` property with a unique-index enforcement. The DB slug is generated during service creation and may differ from this naive name derivation in the following cases:

- Service name contains characters other than letters, digits, and spaces (e.g. `"My.API v2"` → derived: `"my.api-v2"` with a `.` remaining, actual DB slug might be `"myapi-v2"`)
- A service name conflicts with an existing slug and receives a numeric suffix (e.g. first `"My API"` → slug `"my-api"`, second `"My API"` → slug `"my-api-1"`; but both derive to `"my-api"`)

**Consequence:** Auto-captured Mapping and Response files are written under a directory path that may not match the actual `{serviceSlug}/mappings/` tree visible in the Mappings explorer. AC-4 explicitly requires "identical file path and naming logic as Story 4.4", where Story 4.4 used the actual service slug.

**Fix:** Extend `FetchServiceInfoAsync` to return `(svc.Name, svc.Port, svc.Slug)`, update the `_serviceInfo` cache type accordingly, and pass `info.Slug` to `CaptureAsync`:

```csharp
// FetchServiceInfoAsync
return svc is null ? default : (svc.Name, svc.Port, svc.Slug);

// ProcessLogEntryAsync
await recordingService.CaptureAsync(
    serviceId,
    info.Slug,          // use DB slug, not name derivation
    row.Method,
    ...
);
```

---

### B-2: `isConnected === null` renders warning badge during initial SignalR connection

**File:** `src/client/src/features/activity/pages/ActivityPage.tsx:352`
**Violates:** AC-7, AC-2

**Detail:** `useActivityLog` initializes `isConnected` as `null` (`useState<boolean | null>(null)`) and only sets it to `true` after `connection.start()` resolves. In `ActivityPage`, the badge text uses:

```tsx
{isConnected ? (
  "● Recording"
) : (
  <>
    <i className="bi bi-exclamation-triangle" aria-hidden="true" />{" "}
    Recording paused — connection lost
  </>
)}
```

Since `null` is falsy in JavaScript, the warning variant (`⚠ Recording paused — connection lost`) is rendered on every initial render and for the entire duration of SignalR connection establishment (typically 200ms–1s). This means any user who navigates to `/activity` while recording is active will see a false warning state before the connection is confirmed.

**Consequence:** AC-7 says the warning badge should appear "when the SignalR connection to `/hubs/activity` drops" — not on initial load. AC-2 requires the badge to show `● Recording` when recording. The null case violates both.

**Fix:**

```tsx
{isConnected !== false ? (
  "● Recording"
) : (
  <>
    <i className="bi bi-exclamation-triangle" aria-hidden="true" />{" "}
    Recording paused — connection lost
  </>
)}
```

This renders the normal recording state while still initializing (`null`) and only flips to the warning variant on confirmed disconnect (`false`).

---

## MAJOR Items

### M-1: `startMutation`/`stopMutation` have no `onError` handler — errors silently swallowed

**File:** `src/client/src/features/activity/hooks/useRecordingState.ts:24–35`

**Detail:** Both `useMutation` calls lack an `onError` callback:

```ts
const startMutation = useMutation({
  mutationFn: startRecording,
  onSuccess: () => qc.invalidateQueries({ queryKey: ["recording", "status"] }),
  // no onError
});
```

If `POST /api/recording/start` returns `409` (already recording), `apiFetch` throws an `ApiError`. React Query catches it and sets `mutation.error`, but without `onError` nothing is surfaced to the user. The button click appears to do nothing — no toast, no alert, no button state change. The same applies to `stopRecording`.

This is especially visible in the 409 case, which is a **defined** error code (`RECORDING_ALREADY_ACTIVE` / `RECORDING_NOT_ACTIVE`) and should give the user actionable feedback.

**Fix:** Add `onError` handlers (e.g., a toast notification or console error at minimum):

```ts
const startMutation = useMutation({
  mutationFn: startRecording,
  onSuccess: () => qc.invalidateQueries({ queryKey: ["recording", "status"] }),
  onError: (err) => {
    console.error("[useRecordingState] startRecording failed:", err);
    // TODO: surface toast notification
  },
});
```

---

### M-2: `window.matchMedia` called inline in render without SSR guard

**File:** `src/client/src/components/layout/TopBar.tsx:124–127`

**Detail:** The cross-screen indicator's `transition` style is computed directly in JSX during render:

```tsx
style={{
  transition: window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "none"
    : "opacity 150ms ease",
  ...
}}
```

This call:
1. **Has no `typeof window !== "undefined"` guard** — will throw in SSR/test environments that don't mock `window.matchMedia`. The TopBar unit tests do mock it, but any test that forgets to mock will crash.
2. **Is called on every render** — firing a `window.matchMedia()` call on each render cycle is wasteful; the preference doesn't change during a session.
3. **Deviates from the established project pattern** — `ActivityPage.tsx` correctly uses:
   ```ts
   const prefersReducedMotion =
     typeof window !== "undefined" && typeof window.matchMedia === "function"
       ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
       : false;
   ```

**Fix:** Extract the preference check to the component body, matching the `ActivityPage.tsx` pattern:

```tsx
const prefersReducedMotion =
  typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

// Then in JSX:
style={{
  transition: prefersReducedMotion ? "none" : "opacity 150ms ease",
  ...
}}
```

---

### M-3: `GetUniquePathAsync` has a read-then-write TOCTOU race under concurrent captures

**Files:** `src/Fishtank.Api/Services/RecordingService.cs:163–198`  
`src/Fishtank.Api/Engine/ActivityPollingService.cs:125–145`

**Detail:** `ActivityPollingService` fires `CaptureAsync` as a `Task.Run` fire-and-forget for every proxied request while recording is active. Under high traffic, multiple concurrent `CaptureAsync` invocations for requests with the same method+path+status could race:

1. Task A calls `GetUniquePathAsync("service/mappings/GET_users_200.json")`  
2. Task B calls `GetUniquePathAsync("service/mappings/GET_users_200.json")` concurrently  
3. Both call `ReadFileAsync` and get `NotFoundException` (file doesn't exist yet)  
4. Both return the base path `"service/mappings/GET_users_200.json"`  
5. Task A calls `CreateFileAsync` → creates the file  
6. Task B calls `CreateFileAsync` → overwrites the file (data loss)

The `_lock` in `RecordingService` only guards `_isRecording`/`_startedAt` and is not held during `CaptureAsync` (it's async and the lock is released before the I/O). `GetUniquePathAsync` is a static method with no synchronization.

**Consequence:** Under moderate WireMock traffic (multiple concurrent proxied requests to the same route), auto-captured mapping files may be silently overwritten. The story spec says "if file already exists with same generated name, append numeric suffix" — this guarantee is broken under concurrency.

**Note:** This is a statistically unlikely race in typical usage (requires multiple concurrent requests to the exact same path), but the story spec explicitly requires idempotent numeric-suffix behavior.

---

## MINOR Items

### m-1: `role="button"` redundant on native `<button>` element

**File:** `src/client/src/components/layout/TopBar.tsx:103-109`

The cross-screen indicator is a `<button>` element with `role="button"` explicitly set. Native `<button>` has an implicit ARIA role of `button`, so the explicit attribute is redundant. Additionally, `tabIndex={0}` is the default for buttons and the `onKeyDown` handler for Enter/Space is unnecessary (native buttons already respond to both). These are harmless but generate lint warnings and add noise.

---

### m-2: `RecordingStatusResponse` record defined in endpoints file, not `Models/`

**File:** `src/Fishtank.Api/Endpoints/RecordingEndpoints.cs:65`

```csharp
public record RecordingStatusResponse(bool IsRecording, DateTimeOffset? StartedAt);
```

Per project conventions, DTOs/models belong in `Models/`. All other endpoint response types are defined there. This record should be in `src/Fishtank.Api/Models/RecordingStatusResponse.cs`.

---

### m-3: Fire-and-forget `Task.Run` in `ActivityPollingService` has no cancellation token

**File:** `src/Fishtank.Api/Engine/ActivityPollingService.cs:126–144`

```csharp
_ = Task.Run(async () =>
{
    await recordingService.CaptureAsync(
        serviceId, info.Slug, row.Method, row.UrlPath, row.StatusCode, row.ResponseBody ?? string.Empty);
        // No CancellationToken passed
});
```

If `ActivityPollingService.StopAsync` is called (graceful shutdown), in-flight capture tasks are neither awaited nor cancelled. Captures that are mid-flight during shutdown will attempt to access scoped services after the DI container is disposed. This is low probability (requires a request arriving exactly at shutdown) but worth tracking.

---

### m-4: `TopBar.module.css` missing `.recordingIndicator` class — spec deviation

**File:** `src/client/src/components/layout/TopBar.module.css`

The story spec explicitly calls for a `.recordingIndicator` CSS class in `TopBar.module.css` with the `prefers-reduced-motion` media query block. The implementation uses only inline styles instead. Functionally equivalent, but:

- Makes the `prefers-reduced-motion` behavior harder to test via CSS (the test inspects the `style` attribute, which works but is more fragile)
- Deviates from the project's CSS convention (CSS modules for layout components)
- The TopBar unit test for AC-9 (`TopBar-RecordingIndicator.test.tsx:222`) explicitly checks for `"transition: none"` in the `style` attribute — this test effectively forces inline-style implementation and makes CSS refactoring brittle

---

## Items Dismissed as Noise

- **`role="button"` on a `<button>` is accessible-invalid**: Technically it's listed as a redundancy, not an ARIA violation (the implicit and explicit roles match). Kept as `m-1` minor.
- **AC-4 integration test is `[Fact(Skip="...")]`**: The skip reason is valid — the test explicitly notes this requires a live WireMock engine and is covered by the Playwright E2E spec. Deferred coverage is acceptable.

---

## AC Coverage Verification

| AC | Status | Notes |
|---|---|---|
| AC-1: Record button activates via POST /start | ✅ Pass | `ActivityPage.tsx` wires button correctly |
| AC-2: Recording badge amber pill | ⚠️ See B-2 | Badge renders correct style but shows false warning on mount |
| AC-3: Stop hides badge immediately (no animation) | ✅ Pass | Badge removed from DOM via `isRecording && (...)` conditional |
| AC-4: Auto-capture writes files | ❌ Blocked B-1 | Wrong slug path used |
| AC-5: Cross-screen indicator in TopBar | ✅ Pass | `showCrossScreenIndicator` logic correct |
| AC-6: Indicator absent on /login and /setup | ✅ Pass | `isAuthScreen` guard correct |
| AC-7: SignalR disconnect → warning badge | ⚠️ See B-2 | Warning also fires on initial null state |
| AC-8: Reconnect resumes (System Event deferred) | ✅ Pass | Badge text driven by `isConnected !== false` after B-2 fix |
| AC-9: `transition: none` (not `animation: none`) | ✅ Pass | Correct `transition` property used |
| AC-10: Status persists across navigation | ✅ Pass | React Query `staleTime: 0` handles this |
| AC-11: Status loaded on mount | ✅ Pass | `useQuery` in `useRecordingState` fires on mount |
| AC-12: `data-testid` canonical values | ✅ Pass | All three values present |

---

## Security Observations

- **Auth protection:** All three recording endpoints are correctly protected via `.RequireAuthorization()` on the group. ✅
- **Path traversal in auto-capture:** `MappingService.CreateFileAsync` has its own path sanitization (rejects `../` and absolute paths, validates full path is under `_mocksRoot`). Even if the slug computation in B-1 produced an unusual path, `MappingService` would reject traversal attempts. ✅

---

## Findings Written to Story File

See `_bmad-output/implementation-artifacts/stories/4-5-record-mode-and-cross-screen-recording-indicator.md` — `### Review Findings` section (appended below in the story file format).
