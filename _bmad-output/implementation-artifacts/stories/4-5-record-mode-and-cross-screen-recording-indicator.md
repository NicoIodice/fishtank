---
story_id: "4.5"
story_key: "4-5-record-mode-and-cross-screen-recording-indicator"
epic: 4
story_title: "Record Mode & Cross-Screen Recording Indicator"
status: ready-for-dev
priority: high
frs_covered:
  - FR-16 (User can activate Record mode from Network Activity page. While active, every proxied request is automatically promoted to a Mapping + Response file pair on disk. A persistent Recording badge appears in the Network Activity header. A cross-screen indicator appears in the top bar when the user navigates away from /activity while recording. Indicator absent on /login and /setup. On SignalR disconnect: badge changes to warning state; on reconnect: recording resumes + System Event created with gap duration.)
ux_drs_covered:
  - UX-DR13 (prefers-reduced-motion: Recording badge and cross-screen indicator use transition:none — this is a CSS transition, NOT an @keyframes animation; animation:none would NOT suppress it)
  - EXPERIENCE.md Record mode section (Page header element order, cross-screen indicator ARIA, connection-loss badge state)
  - DESIGN.md Recording badge spec (amber pill, colors.warning-subtle, colors.warning, typography tokens)
  - DESIGN.md Cross-screen indicator spec (entrance opacity 0→1 150ms ease, hidden on /login /setup)
nfrs_addressed:
  - NFR-19 (Cross-screen indicator: role="button", aria-label, keyboard-accessible Enter/Space)
  - NFR-21 (prefers-reduced-motion: transition:none on Recording badge and cross-screen indicator)
architecture_items:
  - NEW Endpoints/RecordingEndpoints.cs — FR-16 toggle routes (POST /api/recording/start, POST /api/recording/stop, GET /api/recording/status)
  - NEW Services/IRecordingService.cs and Services/RecordingService.cs — FR-16 auto-capture via MappingService.SaveAsync
  - UPDATE features/activity/api.ts — add startRecording, stopRecording, getRecordingStatus
  - NEW features/activity/hooks/useRecordingState.ts — React Query ["recording","status"] shared hook
  - UPDATE features/activity/pages/ActivityPage.tsx — wire Record button and Recording badge stubs
  - UPDATE components/layout/TopBar.tsx — add cross-screen recording indicator
risk_links:
  - R-E4-006 (Record mode gap — SignalR disconnect during recording causes missed requests; mitigated by System Event with gap duration + badge warning state)
---

# Story 4.5: Record Mode & Cross-Screen Recording Indicator

## Story

**As a** developer,
**I want** to enable Record mode to automatically capture all proxied requests as Mapping and Response files,
**So that** I can build a complete mock library from a real API session without manually saving each request.

---

## Status

ready-for-dev

---

## Context

### Background

Epic 4 delivers the file management and mock-capture layer for Fishtank. **Story 4.1 (done)** shipped the backend file CRUD infrastructure: `POST /api/mappings`, `PUT /api/mappings/{path}`, `DELETE /api/mappings/{path}`, `ResyncService`, and `IFileWatcher` abstraction. **Story 4.2 (done)** built the Mappings file explorer and dual-mode editor. **Story 4.3 (done)** added Resync UI with toast feedback and conflict banners. **Story 4.4 (done)** delivered the Mock Suggestion modal — single-click save of a proxied request as a Mapping + Response file pair via `POST /api/mappings`, with the file path and naming convention fully established.

**Story 4.5 (this story)** completes the recording layer (FR-16): a global Record mode toggle that automatically promotes every proxied request to a Mapping + Response file pair on disk without user intervention. It also adds the cross-screen recording indicator in the top bar so users never lose track of an active recording session when navigating away from the Network Activity screen.

### Scope Boundaries Within Epic 4

- **Story 4.4 (done):** Mock Suggestion modal — single-click save from activity log row. Established `POST /api/mappings` for file writes and the slug-based filename convention.
- **This story (4.5):** Record mode toggle (global, not per-service), auto-capture on every proxied request while active, Recording badge in Activity header, cross-screen indicator in top bar, SignalR disconnect handling with gap-duration System Event.
- **Story 4.6 (next):** Navigation guard and sign-out protection — no direct dependency on this story.

### What Exists (consumable now)

**Record button stub** (`ActivityPage.tsx`, ~line 349):
```tsx
<button
  data-testid="activity-btn-record"
  disabled
  style={{ cursor: "not-allowed", ... }}
>
  Record
</button>
```
This is a fully disabled no-op. This story wires it.

**Recording badge stub** (`ActivityPage.tsx`, ~line 336):
```tsx
<span
  data-testid="activity-badge-recording"
  style={{ display: "none" }}
>
  Recording
</span>
```
This is hidden. This story makes it functional.

**File write infrastructure (Story 4.1):**
- `POST /api/mappings` — body: `{ path: string, content: string }` — writes to volume-mounted filesystem, creates System Event on failure.
- `MappingService.SaveAsync(path, content)` — the service method Story 4.4 uses for single-click save. Record mode uses the same method.

**Story 4.4 filename convention (already established):**
- Mapping file: `{serviceSlug}/mappings/{method}_{path-slugified}_{status}.json`
- Response file: `{serviceSlug}/responses/{method}_{path-slugified}_{status}_body.json`
- `BodyAsFile` in Mapping JSON: `../responses/{method}_{path-slugified}_{status}_body.json`
- Slugification: lowercase, `/` → `_`, leading `_` removed, non-alphanumeric removed, max 64 chars.

**SignalR activity hub** (`useActivityLog.ts`):
- `createHubConnection("/hubs/activity")` with `withCredentials: true`
- The hub already exists. The SignalR connection state for the activity hub is what drives the "connection lost" badge variant.

**TopBar.tsx** (existing):
- Structure: `<header>` → `<div className={styles.left}>` (logo area) + `<div className={styles.right}>` (About, bell, avatar)
- The cross-screen indicator slot goes **between** `.left` and `.right` — a new center/flex element.

### What This Story Adds

**Backend (all new files):**
1. `Endpoints/RecordingEndpoints.cs` — FR-16 toggle routes
2. `Services/IRecordingService.cs` — interface for record mode
3. `Services/RecordingService.cs` — auto-capture implementation

**Frontend (mix of new and update):**
1. `features/activity/api.ts` — add `startRecording()`, `stopRecording()`, `getRecordingStatus()`
2. `features/activity/hooks/useRecordingState.ts` (NEW) — React Query shared state hook
3. `features/activity/pages/ActivityPage.tsx` — wire Record button + Recording badge stubs
4. `components/layout/TopBar.tsx` — add cross-screen recording indicator

---

## Acceptance Criteria

### AC-1: Record mode activates on "● Record" button click (FR-16)
**Given** the Network Activity page (`/activity`) with Record mode inactive,
**When** the `activity-btn-record` button is clicked,
**Then** `POST /api/recording/start` is called; on success the button label changes to "⏹ Stop" and the Recording badge (`activity-badge-recording`) becomes visible with amber pill styling.

### AC-2: Recording badge visible and styled while recording (FR-16, UX-DR13)
**Given** Record mode is active,
**Then** `data-testid="activity-badge-recording"` is visible, styled as amber pill: `background: var(--warning-subtle)`, `color: var(--warning)`, `border-radius: var(--rounded-full)`, `font-size: var(--text-sm)`, `font-weight: var(--font-semibold)`, content: `● Recording`.
**And** the badge is positioned after the LIVE/PAUSED indicator and before the flex spacer (per EXPERIENCE.md page header element order).

### AC-3: Stop button deactivates Record mode (FR-16)
**Given** Record mode is active and the button reads "⏹ Stop",
**When** the button is clicked,
**Then** `POST /api/recording/stop` is called; on success the button returns to "● Record" and the Recording badge is **immediately** hidden — no animation, no fade.

### AC-4: Auto-capture writes Mapping + Response files without user action (FR-16)
**Given** Record mode is active,
**When** a proxied request arrives via WireMock,
**Then** the backend `RecordingService` automatically calls `MappingService.SaveAsync` to write a Mapping file to `{serviceSlug}/mappings/{method}_{path-slugified}_{status}.json` and a Response file to `{serviceSlug}/responses/{method}_{path-slugified}_{status}_body.json` — using **identical file path and naming logic as Story 4.4** — without any user-initiated action.

### AC-5: Cross-screen indicator appears in top bar when navigated away (FR-16, EXPERIENCE.md)
**Given** Record mode is active and the user navigates away from `/activity` (to any route other than `/login` or `/setup`),
**Then** a persistent amber pill appears in the top bar with `data-testid="topbar-badge-recording-active"`, content `● Recording`, positioned between the brand logo area and the About icon.
**And** it is interactive: `role="button"`, `aria-label="Recording active — return to Network Activity"`, `tabIndex={0}`, keyboard `Enter` and `Space` navigate to `/activity`.
**When** the user is on `/activity`, the cross-screen indicator is hidden.

### AC-6: Cross-screen indicator absent on /login and /setup (FR-16)
**Given** Record mode is active (e.g., due to a server-side state persisted across navigation),
**When** the user is on `/login` or `/setup`,
**Then** `data-testid="topbar-badge-recording-active"` is NOT rendered — recording cannot be active on auth screens.

### AC-7: SignalR disconnect changes badge to warning state (FR-16, R-E4-006)
**Given** Record mode is active and the SignalR connection to `/hubs/activity` drops,
**Then** the Recording badge changes to `⚠ Recording paused — connection lost` with `bi-exclamation-triangle` replacing the `●` dot; the amber pill **colors remain unchanged** (same `warning-subtle` / `warning` tokens); the badge does **not** disappear.

### AC-8: SignalR reconnect resumes recording and creates System Event (FR-16, FR-22, R-E4-006)
**Given** Record mode was active, SignalR dropped, and the connection is restored,
**Then** recording resumes automatically; the badge returns to `● Recording` (no animation on revert); a System Event info entry is created with the gap duration and message: `"Requests received during the {N} seconds gap may not have been captured."` (backend-side event).

### AC-9: prefers-reduced-motion disables animations on badge and cross-screen indicator (NFR-21)
**Given** `@media (prefers-reduced-motion: reduce)`,
**Then** the Recording badge does not pulse or animate.
**And** the cross-screen indicator's entrance uses `transition: none` — **NOT** `animation: none` (the entrance is a CSS `opacity` transition, not a `@keyframes` animation; only `transition: none` suppresses it correctly per DESIGN.md).

### AC-10: Recording status persists across page reloads / navigation (FR-16)
**Given** Record mode is active,
**When** the user navigates between routes (e.g., `/activity` → `/mappings` → `/activity`),
**Then** the recording state is consistent — UI reflects the server's `GET /api/recording/status` response; the button state and badge visibility are re-derived from server state on each render of ActivityPage.

### AC-11: Record button state loaded on ActivityPage mount (FR-16)
**Given** the user navigates to `/activity`,
**Then** `GET /api/recording/status` is called (via `useRecordingState` hook) and the Record button is rendered with the correct initial label (`● Record` or `⏹ Stop`) and the badge is shown/hidden accordingly — no flicker from an incorrect default.

### AC-12: data-testid attributes (mandatory)
**Given** the implementation is complete,
**Then** all new interactive and structural elements carry the canonical `data-testid` values from DESIGN.md:

| Element | `data-testid` |
|---|---|
| Record / Stop button | `activity-btn-record` _(existing stub, keep this value)_ |
| Recording badge in Activity header | `activity-badge-recording` _(existing stub, keep this value)_ |
| Cross-screen indicator in top bar | `topbar-badge-recording-active` |

---

## Technical Requirements

### Backend API Contract

**New endpoints in `RecordingEndpoints.cs`:**

```http
POST /api/recording/start
Authorization: JWT cookie (required)
Response 200: { "success": true, "data": { "isRecording": true } }
Response 409: RECORDING_ALREADY_ACTIVE (if already recording)

POST /api/recording/stop
Authorization: JWT cookie (required)
Response 200: { "success": true, "data": { "isRecording": false } }
Response 409: RECORDING_NOT_ACTIVE (if not recording)

GET /api/recording/status
Authorization: JWT cookie (required)
Response 200: { "success": true, "data": { "isRecording": bool, "startedAt": ISO8601 | null } }
```

**Note on scope:** Record mode is **global** (not per-service). A single boolean flag in `RecordingService` controls whether auto-capture is active for all proxied requests across all services.

**`IRecordingService.cs` interface:**
```csharp
public interface IRecordingService
{
    Task StartAsync(CancellationToken ct = default);
    Task StopAsync(CancellationToken ct = default);
    Task<(bool IsRecording, DateTimeOffset? StartedAt)> GetStatusAsync(CancellationToken ct = default);
    // Called by TrackingFileSystemHandler (or equivalent) on every proxied request when IsRecording
    Task CaptureAsync(Guid serviceId, string serviceSlug, string method, string urlPath, int statusCode, string responseBody, CancellationToken ct = default);
}
```

**`RecordingService.cs` responsibilities:**
- Thread-safe boolean flag with `DateTimeOffset? _startedAt`
- `CaptureAsync` → uses **same slug/filename logic as Story 4.4** → calls `MappingService.SaveAsync` twice (mapping file + response file)
- On `MappingService.SaveAsync` failure: creates System Event via `ISystemEventService` (same error path as Story 4.4's write failure)
- On capture: idempotent — if file already exists with same generated name, append numeric suffix (same rule as AC-12 in Story 4.4)
- `StartAsync` → throws `ConflictException("RECORDING_ALREADY_ACTIVE")` if already recording
- `StopAsync` → throws `ConflictException("RECORDING_NOT_ACTIVE")` if not recording

**Integration with WireMock auto-capture:**
The backend must hook into the proxied-request pipeline. `TrackingFileSystemHandler.cs` (or a WireMock.NET `IRequestMatcher` / callback registered during service start) is the seam. When Record mode is active, after a proxied request is logged (Activity row), `IRecordingService.CaptureAsync(...)` is called with the request details. This hook must be non-blocking with respect to the WireMock response — capture is fire-and-forget from the request path.

### Frontend State Architecture

**Do NOT use a global client-state library.** Record mode status is server state. Use React Query:

```typescript
// features/activity/hooks/useRecordingState.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getRecordingStatus, startRecording, stopRecording } from "../api";

export function useRecordingState() {
  const qc = useQueryClient();

  const { data: status } = useQuery({
    queryKey: ["recording", "status"],
    queryFn: getRecordingStatus,
    staleTime: 0,         // always re-fetch on focus (recording state changes)
    refetchOnWindowFocus: true,
  });

  const isRecording = status?.isRecording ?? false;

  const startMutation = useMutation({
    mutationFn: startRecording,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recording", "status"] }),
  });

  const stopMutation = useMutation({
    mutationFn: stopRecording,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recording", "status"] }),
  });

  return {
    isRecording,
    startedAt: status?.startedAt ?? null,
    startRecording: () => startMutation.mutate(),
    stopRecording: () => stopMutation.mutate(),
    isStarting: startMutation.isPending,
    isStopping: stopMutation.isPending,
  };
}
```

Both `ActivityPage` and `TopBar` call `useRecordingState()`. React Query deduplicates the requests — only one `GET /api/recording/status` is in-flight at a time.

**Add to `features/activity/api.ts`:**
```typescript
export interface RecordingStatus {
  isRecording: boolean;
  startedAt: string | null;  // ISO 8601 or null
}

export async function getRecordingStatus(): Promise<RecordingStatus> {
  return apiFetch<RecordingStatus>("/api/recording/status");
}

export async function startRecording(): Promise<RecordingStatus> {
  return apiFetch<RecordingStatus>("/api/recording/start", { method: "POST" });
}

export async function stopRecording(): Promise<RecordingStatus> {
  return apiFetch<RecordingStatus>("/api/recording/stop", { method: "POST" });
}
```

### ActivityPage.tsx — Record Button Wiring

Replace the current disabled stub (approx. lines 349–360) with:

```tsx
const { isRecording, startRecording, stopRecording, isStarting, isStopping } = useRecordingState();
const isTransitioning = isStarting || isStopping;

// Recording badge — replace the display:none stub (approx. lines 336–340)
<span
  data-testid="activity-badge-recording"
  style={{
    display: isRecording ? "inline-flex" : "none",
    alignItems: "center",
    gap: "4px",
    padding: "2px 10px",
    borderRadius: "9999px",
    backgroundColor: "var(--warning-subtle)",
    color: "var(--warning)",
    fontSize: "var(--text-sm)",
    fontWeight: "var(--font-semibold)",
  }}
>
  {isConnected
    ? "● Recording"
    : <><i className="bi bi-exclamation-triangle" aria-hidden="true" /> Recording paused — connection lost</>
  }
</span>

// Record button — replace the disabled stub (approx. lines 341–360)
<button
  data-testid="activity-btn-record"
  onClick={isRecording ? stopRecording : startRecording}
  disabled={isTransitioning}
  aria-pressed={isRecording}
  style={{ /* same styling as existing action buttons */ }}
>
  {isRecording ? "⏹ Stop" : "● Record"}
</button>
```

**SignalR connection state for badge variant:** The `useActivityLog` hook already holds the activity hub connection. Expose `isConnected` (a `boolean | null` state driven by `connection.onclose` and `connection.onreconnected` callbacks in `useActivityLog`). Wire the badge text to this state. When `isConnected === false` and `isRecording === true` → warning variant.

### TopBar.tsx — Cross-Screen Indicator

Import `useRecordingState` and `useLocation` (already imported):

```tsx
// Inside TopBar component
const { isRecording } = useRecordingState();
const location = useLocation();  // already imported
const navigate = useNavigate();  // already imported

const isAuthScreen = location.pathname === "/login" || location.pathname === "/setup";
const isOnActivity = location.pathname === "/activity";
const showCrossScreenIndicator = isRecording && !isAuthScreen && !isOnActivity;
```

Add between `<div className={styles.left}>` and `<div className={styles.right}>` in the header JSX:

```tsx
{showCrossScreenIndicator && (
  <button
    data-testid="topbar-badge-recording-active"
    role="button"
    aria-label="Recording active — return to Network Activity"
    tabIndex={0}
    onClick={() => navigate("/activity")}
    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate("/activity"); } }}
    className={styles.recordingIndicator}  /* add CSS class in TopBar.module.css */
    style={{
      /* Entrance animation: opacity 0→1 150ms ease */
      /* prefers-reduced-motion: transition: none (CSS, not animation) */
    }}
  >
    ● Recording
  </button>
)}
```

**CSS in `TopBar.module.css`** — add:
```css
.recordingIndicator {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  border-radius: 9999px;
  background: var(--warning-subtle);
  color: var(--warning);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  border: none;
  cursor: pointer;
  transition: opacity 150ms ease;
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .recordingIndicator {
    transition: none;  /* NOT animation: none — this is a CSS transition, not @keyframes */
    opacity: 1;
  }
}
```

---

## Dev Notes

### Critical: Files to Read Before Implementing

1. **`src/client/src/features/activity/pages/ActivityPage.tsx`** — contains both stubs (Record button ~line 349, Recording badge ~line 336). Read the full file to understand the existing state variables and render structure before modifying.
2. **`src/client/src/components/layout/TopBar.tsx`** — read the full file before adding the cross-screen indicator. The `.left` / `.right` div structure must be preserved. The indicator goes between them.
3. **`src/client/src/features/activity/useActivityLog.ts`** — read before modifying to expose `isConnected`. Understand the hub lifecycle to add connection-state callbacks safely without breaking the existing append-only push model.
4. **`src/Fishtank.Api/Services/MappingService.cs`** — read `SaveAsync` (the file write method used by Story 4.4) before implementing `RecordingService.CaptureAsync`. Reuse that exact method.
5. **`src/Fishtank.Api/Endpoints/MappingsEndpoints.cs`** — read for the DI registration pattern used by other endpoint groups, to follow the same pattern in `RecordingEndpoints.cs`.

### Reuse Story 4.4's File Generation Logic

The slug/filename logic in `RecordingService.CaptureAsync` is **not** new — it is the same algorithm established in Story 4.4:
- `{method}_{path-slugified}_{status}.json` (mapping)
- `{method}_{path-slugified}_{status}_body.json` (response)
- Slugification: `urlPath.toLowerCase().replace(/^\//, '').replace(/\//g, '_').replace(/[^a-z0-9_]/g, '').substring(0, 64)`
- Both write calls are `POST /api/mappings` on the frontend, or `MappingService.SaveAsync` on the backend (same service method)

**Do not invent new naming logic.** If `RecordingService` and Story 4.4's `SaveAsync` use different slug logic, you have a bug.

### SignalR Connection State in useActivityLog

The current `useActivityLog` hook only tracks `isLoading` and the row array. This story requires exposing the SignalR connection state (`connected` / `disconnected`). Extend carefully:

1. Add `const [isConnected, setIsConnected] = useState<boolean | null>(null);` (null = still initializing)
2. In the `useEffect`, after `connection.start().then(...)` succeeds, call `setIsConnected(true)`
3. Register `connection.onclose(() => setIsConnected(false))` and `connection.onreconnected(() => setIsConnected(true))`
4. Return `isConnected` from the hook
5. **Do NOT change the existing SignalR subscription logic** — the `ActivityRowAdded` handler and the buffering logic must remain untouched.

### Backend: Where Auto-Capture Is Triggered

The architecture states `TrackingFileSystemHandler` is responsible for capturing proxied requests. WireMock.NET supports request log callbacks. The recommended approach:

- When `RecordingService.StartAsync()` is called, register a WireMock.NET `RequestProcessed` callback (or equivalent) on each `WireMockServer` instance in `IServicesRegistry` that calls `IRecordingService.CaptureAsync(...)` for proxied (unmatched) requests.
- When `RecordingService.StopAsync()` is called, de-register the callback.
- This keeps the record-mode logic in `RecordingService` without modifying `TrackingFileSystemHandler`.

Alternatively, if WireMock.NET doesn't support per-request callbacks easily:
- Add a flag check in the proxied-request handling path: `if (await _recordingService.IsRecordingAsync()) await _recordingService.CaptureAsync(...)`.

**Consult the WireMock.NET documentation or existing `TrackingFileSystemHandler.cs` code to determine the correct integration point.**

### msw Handlers Must Be Updated

When `RecordingEndpoints.cs` adds new endpoints (`GET /api/recording/status`, `POST /api/recording/start`, `POST /api/recording/stop`), the msw handler file used in frontend component tests must be updated in the **same PR**.

Location: look for `handlers.ts` or similar in `src/client/src/test/` or co-located `__tests__/` directories. Add handlers for all three new endpoints.

### DI Registration

Register `IRecordingService` → `RecordingService` in `Program.cs`. Follow the existing singleton pattern used by `IActivityService`, `IMappingService`, etc. `RecordingService` holds in-memory state and must be **singleton-scoped** to persist recording state across requests.

### Error Codes for New Endpoints

Following `RECORDING_*` prefix convention:
- `RECORDING_ALREADY_ACTIVE` → HTTP 409
- `RECORDING_NOT_ACTIVE` → HTTP 409

---

## Test Design Reference

**From test-design-epic-4.md (Story 4-5 section):**

| Test Level | Test Scenario | Priority | Risk Link | Notes |
|------------|---------------|----------|-----------|-------|
| **Component** | "● Record" button activates Record mode; changes to "⏹ Stop" | P0 | — | AC-1, AC-11 |
| **Component** | Recording badge (amber) appears in Network Activity header | P0 | — | AC-2 |
| **Component** | "⏹ Stop" deactivates mode; badge hides immediately (no animation) | P1 | — | AC-3 |
| **Component** | Cross-screen indicator appears in top bar when navigated away from `/activity` | P0 | — | AC-5 |
| **Component** | Cross-screen indicator: `role="button"`, `aria-label`, keyboard-accessible | P1 | — | AC-5, NFR-19 |
| **Component** | SignalR disconnect → badge shows "⚠ Recording paused — connection lost" | P1 | R-E4-006 | AC-7 |
| **Component** | SignalR reconnect → badge returns to "● Recording" | P1 | R-E4-006 | AC-8 |
| **Component** | `prefers-reduced-motion` → Recording badge and cross-screen indicator do not animate | P1 | — | AC-9, NFR-21 |
| **Integration** | Record mode active + proxied request → Mapping + Response files auto-written | P0 | — | AC-4 |
| **Integration** | SignalR reconnect after disconnect → System Event with gap duration | P1 | R-E4-006 | AC-8 |
| **E2E** | Activate Record mode → make proxied request → files appear on disk without user action | P0 | — | AC-4 |
| **E2E** | Navigate away from `/activity` with Record mode active → top bar indicator visible | P1 | — | AC-5 |
| **E2E** | Click cross-screen indicator → navigates to `/activity` | P1 | — | AC-5 |
| **E2E** | Indicator not visible on `/login` or `/setup` | P2 | — | AC-6 |

**Total test count:** 14 | **Effort estimate:** ~6–10 hours

---

## Tasks / Subtasks

- [ ] **Task 1: Backend — Record mode service and endpoints** (AC: 1, 3, 4, 8, 10, 11)
  - [ ] 1.1 Create `Services/IRecordingService.cs` — `StartAsync`, `StopAsync`, `GetStatusAsync`, `CaptureAsync`
  - [ ] 1.2 Create `Services/RecordingService.cs` — thread-safe flag, `CaptureAsync` delegates to `MappingService.SaveAsync` (same slug logic as Story 4.4), `ConflictException` on invalid state transitions
  - [ ] 1.3 Register `IRecordingService` → `RecordingService` as **singleton** in `Program.cs`
  - [ ] 1.4 Create `Endpoints/RecordingEndpoints.cs` — `POST /api/recording/start`, `POST /api/recording/stop`, `GET /api/recording/status` (all require auth)
  - [ ] 1.5 Register `RecordingEndpoints` in `Program.cs` (follow the pattern of other endpoint group registrations)
  - [ ] 1.6 Wire `CaptureAsync` into the proxied-request pipeline (WireMock.NET callback or `TrackingFileSystemHandler` hook) — fire-and-forget, non-blocking
  - [ ] 1.7 On `CaptureAsync` file-write failure: create System Event via `ISystemEventService` (same error path as Story 4.4)
  - [ ] 1.8 On SignalR reconnect while recording: create System Event with gap duration message

- [ ] **Task 2: Frontend API and shared state hook** (AC: 1, 3, 10, 11)
  - [ ] 2.1 Add `getRecordingStatus()`, `startRecording()`, `stopRecording()` to `features/activity/api.ts`
  - [ ] 2.2 Create `features/activity/hooks/useRecordingState.ts` — `useQuery(["recording","status"])`, `useMutation` for start/stop, invalidates on success
  - [ ] 2.3 Add msw handlers for `GET /api/recording/status`, `POST /api/recording/start`, `POST /api/recording/stop` in the test handler file (same PR)

- [ ] **Task 3: Expose SignalR connection state from useActivityLog** (AC: 7, 8)
  - [ ] 3.1 Add `isConnected: boolean | null` state to `useActivityLog.ts`
  - [ ] 3.2 Set `isConnected(true)` on successful `connection.start()` and on `connection.onreconnected`
  - [ ] 3.3 Set `isConnected(false)` on `connection.onclose`
  - [ ] 3.4 Return `isConnected` from the hook

- [ ] **Task 4: Wire Record button and Recording badge in ActivityPage** (AC: 1, 2, 3, 7, 8, 11, 12)
  - [ ] 4.1 Import `useRecordingState` hook in `ActivityPage.tsx`
  - [ ] 4.2 Replace disabled Record button stub with functional button (● Record / ⏹ Stop labels, `aria-pressed`, `disabled` while transitioning)
  - [ ] 4.3 Replace `display:none` Recording badge stub with conditional amber pill (visible when `isRecording`)
  - [ ] 4.4 Wire badge text to SignalR connection state: `isConnected === false && isRecording` → warning variant with `bi-exclamation-triangle`
  - [ ] 4.5 Verify badge hides immediately on Stop (no CSS transition on hide — only entrance is animated on cross-screen indicator; badge hide is instant)

- [ ] **Task 5: Cross-screen indicator in TopBar** (AC: 5, 6, 9, 12)
  - [ ] 5.1 Import `useRecordingState` in `TopBar.tsx` and derive `showCrossScreenIndicator` condition
  - [ ] 5.2 Add `topbar-badge-recording-active` element between `.left` and `.right` — amber pill, `role="button"`, `aria-label`, keyboard handler
  - [ ] 5.3 Add `.recordingIndicator` CSS class to `TopBar.module.css` with `transition: opacity 150ms ease`
  - [ ] 5.4 Add `@media (prefers-reduced-motion: reduce)` block with `transition: none` (NOT `animation: none`)
  - [ ] 5.5 Verify indicator NOT rendered on `/login` and `/setup` — use `isAuthScreen` guard
  - [ ] 5.6 Verify indicator NOT rendered when on `/activity` (user is already on the screen)

- [ ] **Task 6: Backend integration tests** (AC: 4, 8)
  - [ ] 6.1 `POST /api/recording/start` → 200 + `{ isRecording: true }` (happy path)
  - [ ] 6.2 `POST /api/recording/start` when already active → 409 `RECORDING_ALREADY_ACTIVE`
  - [ ] 6.3 `POST /api/recording/stop` → 200 + `{ isRecording: false }`
  - [ ] 6.4 `POST /api/recording/stop` when not active → 409 `RECORDING_NOT_ACTIVE`
  - [ ] 6.5 `GET /api/recording/status` → correct state reflection
  - [ ] 6.6 Unauthenticated `GET /api/recording/status` → 401
  - [ ] 6.7 Record mode active + simulated proxied request → assert Mapping and Response files written to disk (using `IRecordingService.CaptureAsync` directly in the integration test)
  - [ ] 6.8 `CaptureAsync` with duplicate filename → numeric suffix appended, not overwritten

---

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
