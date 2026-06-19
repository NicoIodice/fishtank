---
title: "PRD: Fishtank v1"
status: draft
created: 2026-06-19
updated: 2026-06-19
---

# PRD: Fishtank v1

## 0. Document Purpose

This PRD defines the v1 requirements for Fishtank — a self-hosted, containerized mock server manager. It is the authoritative requirements source for the engineering team, open-source contributors, and downstream artifact owners (architecture, epics and stories).

The PRD uses a Glossary-anchored vocabulary (§4), features with globally-numbered FRs (§5), and inline `[ASSUMPTION: ...]` tags indexed in §12. It builds on — and does not duplicate — the following companion documents:

- **Product Brief** (`_bmad-output/planning-artifacts/briefs/brief-Fishtank-2026-06-02/brief.md`) — problem, solution, differentiation, vision, community strategy
- **UX Design** (`_bmad-output/planning-artifacts/ux-designs/ux-Fishtank-2026-06-04/DESIGN.md`) — design tokens, visual component specs, themes
- **UX Experience** (`_bmad-output/planning-artifacts/ux-designs/ux-Fishtank-2026-06-04/EXPERIENCE.md`) — behavioral specs for every screen and component

Architectural decisions, technical rationale, and the community/contributor strategy are captured in `addendum.md` alongside this file.

---

## 1. Vision

**Your application's external dependencies, visible and controllable during development.**

Fishtank is a self-hosted, containerized mock server manager. A developer pulls a single Docker image, mounts a volume, and has fully operational mock infrastructure — a browser-accessible management UI, live request monitoring, and zero dependency on external services or cloud subscriptions.

The product solves a specific pain: teams building applications with multiple external API dependencies have no coherent management layer for their mocks. Raw WireMock setups are capable but operationally hostile — one container per service, no browser UI when containerized, proxy-to-mock promotion that requires manual API calls or file authoring. The cost of this friction compounds as the number of external dependencies grows.

Fishtank eliminates the context switch. When a request behaves unexpectedly during development or in a test run, the answer is in the browser — the activity log shows what fired, what matched, and what was returned. One UI, one container, all your external service mocks.

**WireMock Cloud is the only tool with comparable browser-managed mock capabilities — Fishtank is what you choose when you need that experience self-hosted, with mappings in source control, at zero cost.**

---

## 2. Why Now

Docker-first development is the default for teams building applications that depend on external services. The volume of third-party API dependencies per application has grown steadily. The cost of managing mock infrastructure without a dedicated management layer has become visible and painful in a way it wasn't three years ago.

No existing OSS tool combines a browser-accessible management UI, multi-service management from a single container, proxy-to-mock promotion, and Docker Hub-first distribution *(verified via Docker Hub, GitHub, Product Hunt, and broad web search, June 2026)*. WireMock's architecture is fundamentally one-process-per-service; building a management layer on top requires non-trivial orchestration that has no obvious commercial return for an independent vendor, which is why no funded product has filled the gap.

Community adoption in OSS accretes quickly — the dominant tool in a niche accumulates Stack Overflow answers, blog posts, `docker-compose.yml` templates, and contributor muscle memory. Fishtank's window to become the obvious default before a better-resourced alternative notices the gap is now.

---

## 3. Target Users

### 3.1 Jobs To Be Done

**Backend / full-stack developer:**
- Stand up mock infrastructure for a new project in under five minutes, reproducibly across team members' machines
- Know in real time whether an outgoing request hit a mock or the real upstream
- Fix a broken mapping and see it take effect without restarting the container
- Capture real API traffic and promote it to a permanent stub in the UI, without writing JSON by hand

**QA / test engineer:**
- Deploy identical, deterministic mock configurations across dev, QA, staging, and UAT environments, with differences managed as source-controlled files
- Reset mock state between test runs from the CI pipeline without container restarts
- Diagnose why a test failed by inspecting which request arrived and which mapping matched — or didn't

**Team debugging together:**
- Collaboratively inspect live mock traffic in a shared browser UI — turning a guessing game about "which mock returned what" into a thirty-second diagnosis

### 3.2 Non-Users (v1)

- Teams requiring multi-tenant SaaS or cloud-hosted mock infrastructure (Fishtank is self-hosted only)
- Teams requiring GraphQL or gRPC mocking (HTTP/REST only in v1)
- Teams requiring OpenAPI/Swagger-driven mock generation (proxy capture and manual mapping authoring only in v1)
- Mobile-first users (desktop browser is the primary surface; responsive down to mobile but not mobile-optimized in v1)

### 3.3 Key User Journeys

**UJ-1: Luca gets Fishtank running on a new project in under five minutes.**
- **Persona + context:** Luca, backend developer, starting a new microservice project with three external API dependencies and existing WireMock mapping files in a `mocks/` folder.
- **Entry state:** Docker installed; unauthenticated; no prior Fishtank instance.
- **Path:** Pulls the Fishtank image; copies `docker-compose.example.yml` from the repo; mounts the `mocks/` volume and Fishtank data directory; starts the container; navigates to the UI on the management port; completes first-run admin setup; adds three Services via the Add Service modal or imports them from a JSON seed file; each Service starts in Live state.
- **Climax:** All three Services are active on their assigned ports. Luca's application sends a request and sees it appear in the Network Activity log — confirming mock traffic is flowing.
- **Resolution:** Luca adds Fishtank to the project's `docker-compose.yml` and commits the seed file and mapping folders to source control.
- **Edge case:** A host port is already occupied → Fishtank writes a System Event with the Service name, port, and a documented troubleshooting step; the Service is recorded as stopped with the reason shown.

**UJ-2: Ava promotes a proxied API response to a permanent mock.**
- **Persona + context:** Ava, QA engineer, building a mock library by capturing real API traffic against a Finance API Service configured in proxy mode.
- **Entry state:** Authenticated; Finance API Service running and Live.
- **Path:** Triggers an API call from her test suite; opens Network Activity; locates the proxied request row; clicks "Save as Mock"; reviews the auto-generated WireMock JSON in the suggestion modal; edits the response body to remove environment-specific data; clicks Save.
- **Climax:** Mapping and response files appear in the Mappings folder tree under `mocks/finance-api/`. The next test run resolves the request against the mock; the Type column shows "Mocked."
- **Resolution:** Ava commits the new mapping files. She repeats for the remaining endpoints she needs to stub.

**UJ-3: Marco and Priya debug a failing integration test in real time.**
- **Persona + context:** Marco (developer) and Priya (QA engineer) pair-debugging an intermittently failing integration test against a shared QA Fishtank instance.
- **Entry state:** Both authenticated to the same Fishtank instance; test is failing but the cause is unclear.
- **Path:** Priya runs the test; Marco watches the Network Activity log update in real time. They spot a request row where Type = Proxied — the mapping isn't matching. Marco opens the row detail and compares the incoming path against the mapping file in the Raw JSON editor; identifies a wildcard pattern mismatch; fixes the mapping; clicks Save; clicks Resync. Priya re-runs the test.
- **Climax:** The test passes. The activity log shows Type = Mocked for the previously failing request.
- **Resolution:** Marco commits the corrected mapping file. The fix is live across the QA environment without a container restart.

**UJ-4: Sofia disables a broken mock without redeployment.**
- **Persona + context:** Sofia, QA team lead, receives reports of cascading test failures after a mapping was updated on the shared QA Fishtank instance.
- **Entry state:** Authenticated; multiple Services running.
- **Path:** Navigates to Services; locates the affected Service; flips the enable/disable toggle to Stopped. Tests immediately stop hitting the broken mapping. She navigates to Mappings, finds the offending file, reverts it in the Raw JSON editor, clicks Save, then Resync; flips the toggle back to Live.
- **Climax:** Services restored. Tests pass. Sofia never touched the host, restarted the container, or involved the deployment pipeline.
- **Resolution:** Sofia commits the reverted mapping file and opens a PR with a description of what changed.

---

## 4. Glossary

- **Service** — A named mock/proxy entry representing one real external HTTP dependency. Has a display name, description, External URL, assigned port (30100–30199 range), auto-generated Mocks Root path, runtime status (Live / Stopped), and optional tags. A single Fishtank instance manages multiple Services.
- **External URL** — The real upstream URL a Service proxies unmatched requests to (e.g. `https://api.finance.gov`). Canonical term throughout Fishtank v1 (previously "Upstream URL").
- **Mapping** — A WireMock-format JSON file defining request matching rules (path, method, headers) and the response to return. Lives under `{Mocks Root}/{service-slug}/mappings/`.
- **Response file** — A file (typically JSON) containing the response body referenced by a Mapping via `BodyAsFile`. Lives under `{Mocks Root}/{service-slug}/responses/`.
- **Mocks Root** — The volume-mounted directory Fishtank uses as the root for all Service folders. Configurable in Settings; `/mocks` by convention.
- **Service folder** — A subdirectory of Mocks Root for one Service, containing `mappings/` and `responses/` sub-folders. Path: `{Mocks Root}/{service-slug}/`.
- **Slug** — A machine-generated identifier derived from a Service's display name. Used in file paths and API routes. Must be at least 2 characters and unique across all Services.
- **Record mode** — A mode where all proxied requests are automatically promoted to Mapping and Response files on disk as they arrive.
- **Proxy mode** — The behavior of forwarding unmatched requests to a Service's External URL. Available on any Live Service with an External URL configured.
- **Activity log** — The in-memory, per-session log of HTTP requests received and processed by Fishtank's Services. Rows are retained up to a configurable cap per Service; not persisted between container restarts.
- **Resync** — A server-side reload of all Mapping and Response files from disk into the mock engine, followed by a folder tree refresh in the UI. Does not restart the container or Services.
- **Seed file** — A JSON file used to bootstrap Service configuration at startup (additive import — new Services imported, existing Services skipped, conflicts surfaced as warnings). Also serves as a recovery mechanism if the database is corrupted.
- **System Event** — A warning, error, or info entry generated by Fishtank's infrastructure layer (startup failures, config conflicts, write errors, engine crashes, recording gaps, etc.). Displayed in the System Events screen and the Notification Panel.
- **Feature toggle** — A named flag stored in the database that enables or disables a Fishtank capability at runtime. All toggles default to ON in every release; overridable via environment variable at deploy time and via the Admin Console without restart.
- **Admin Console** — The privileged section of the UI covering user management, feature toggles, system metrics, health dashboard, audit log, and warnings viewer. Accessible only to Admin-role users.
- **JWT token** — The authentication token issued on login, persisted in the browser, and required for all authenticated API and UI interactions. Valid until container restart by default; expiry configurable via environment variable.
- **Pipeline reset** — A `POST /admin/reset` API call that clears the runtime Activity log and in-memory counters for all Services, then reloads Mappings from disk, without restarting the container. Intended for CI/CD pipelines.

---

## 5. Features

### 5.1 Services Management

**Description:** Services are the core organizing unit of Fishtank. Each Service represents one external HTTP dependency the user's application calls — a Finance API, a Social Security service, a Payments gateway. Users define and manage Services through the management UI or the Management API. A Service has a display name, optional description, External URL, assigned port (30100–30199), optional tags, and auto-generated Mocks Root, Mappings, and Responses paths derived from its Slug. New Services start in Live state immediately on creation. Realizes UJ-1, UJ-4.

**Functional Requirements:**

#### FR-1: Define a Service

A user can create a new Service by providing a display name (required), optional description, External URL (required), and an assigned port. The port is pre-filled with the next available value in the 30100–30199 range and is editable. Service paths (Mocks Root, Mappings, Responses) are auto-generated from the Slug and displayed read-only in the modal.

**Consequences (testable):**
- A new Service is persisted to the database upon successful creation.
- The mock engine begins listening on the assigned port immediately after the Service is saved. Realizes UJ-1.
- If the assigned port is already in use on the host, a System Event is written with the Service name, port, and a documented troubleshooting step; the Service is persisted in Stopped state with the failure reason recorded.
- Service name validation: required; max 64 characters; no emoji characters; generated Slug must be at least 2 characters; Slug must be unique across all Services. Validated on field blur and on submit.
- Port validation: required; integer in 30100–30199; must not be in use by another Service. Validated on field blur and on submit.
- External URL validation: must begin with `http://` or `https://`. `ws://` and `wss://` are not accepted in v1. Validated on field blur and on submit.
- The three read-only path fields update on a 200 ms debounce after each keystroke in the Service Name field.

**Out of scope:** Service deletion is not available in v1.

#### FR-2: Assign Service tags

A user can assign one or more free-form text tags to a Service. Tags are stored in the database and used for grouping and filtering in the Services view.

**Consequences (testable):**
- The Services view can be filtered to show only Services matching a selected tag.
- Tags carry no special meaning to the mock engine.

#### FR-3: Enable/disable a Service at runtime

A user can stop or start a Service without restarting the Fishtank container. Realizes UJ-4.

**Consequences (testable):**
- Toggling a Service to Stopped halts the mock engine listener on that Service's port immediately.
- Toggling a Service to Live restarts the listener and re-reads Mappings from disk.
- The UI applies an optimistic update to the toggle position immediately on click. The Status pill updates only after server confirmation. On failure, the toggle reverts to its previous position and an error toast is shown.
- During the optimistic update window (toggle clicked, server not yet confirmed), the Status pill retains its previous value.

#### FR-4: Edit a Service

A user can edit a Service's display name, description, External URL, and port.

**Consequences (testable):**
- If the display name change generates a different Slug, the Mocks Root path changes. An inline warning is shown in the Edit modal before saving, instructing the user to rename the directory on disk and run Resync. The save proceeds regardless; filesystem migration is the user's responsibility.
- Port validation is identical to Service creation (FR-1). A port already used by a *different* Service produces an inline error; editing a Service's own current port value without changing it is not an error.
- Slug uniqueness is validated identically to Service creation. Editing a Service's name to produce the same Slug as a *different* Service produces an inline error.

#### FR-5: Import Services from a seed file

Fishtank reads a JSON seed file at container startup (if configured) and on-demand from the Admin Console. Import is additive: new Services are created; existing Services (matched by Slug) are skipped; conflicts (e.g. port collision) are surfaced as System Event warnings.

**Consequences (testable):**
- Services imported from the seed file are indistinguishable from manually-created Services after import.
- Fishtank never writes to the seed file. The seed file is mounted read-only at the container level. `[ASSUMPTION: the seed file JSON schema is consistent with the Management API's service creation payload schema.]`
- If the seed file is not present or not readable at startup, a System Event info entry is written and startup proceeds normally.

#### FR-6: Browse Services (card grid and table view)

A user can view all defined Services in a card grid (default) or a sortable table view. Both views surface: display name, description, port, External URL, Mocks Root path, mock file count (Mappings + Responses combined), status pill, and enable/disable toggle. View mode preference is persisted per session.

**Consequences (testable):**
- Stopped Services are rendered at reduced opacity in both views.
- The card grid adapts: 3 columns at ≥ 1024 px; 2 columns at 640–1023 px; 1 column at < 640 px.
- An empty state is shown when no Services exist, with a primary Add Service button. Realizes UJ-1.
- Clicking a service card's name or description area has no action. Only the explicit **Edit** link opens the Edit modal.

**Feature-specific NFR:** The Services page must load and render all Service cards for a 50-Service instance within 1 second of navigation.

---

### 5.2 Network Activity

**Description:** The Network Activity screen is Fishtank's real-time request monitor. Every HTTP request received by any Service is logged — the user can see what fired, whether it was served from a Mapping or proxied to the upstream, its status code and duration, and the full request/response detail. The activity log is the primary diagnostic surface for solo and collaborative debugging. Realizes UJ-2, UJ-3.

**Functional Requirements:**

#### FR-7: Real-time request log

The activity log displays each received request with: HTTP method, URL path, HTTP status code, Type (Mocked / Proxied), Service name, DateTime, and response duration. New rows are pushed to the UI in real time via WebSocket or SSE. Realizes UJ-2, UJ-3.

**Consequences (testable):**
- New rows are prepended to the top (newest-first default sort).
- Type = Mocked: the request matched a Mapping and was served from it. Type = Proxied: no Mapping matched and the request was forwarded to the External URL.
- The log is in-memory only; it is not written to disk and is cleared on container restart.
- Row count per Service is capped at a configurable maximum; oldest entries are pruned automatically when the cap is reached.
- A proxied request row from a currently Live Service shows an amber left-border accent. Proxied rows from Stopped Services do not.
- HTTP 5xx response rows show a subtle red background. Both highlights may apply simultaneously to the same row.

#### FR-8: Activity log filtering and sorting

A user can filter the activity log by: search query (case-insensitive contains-match across URL path and HTTP method label simultaneously), Service, and Type (All / Mocked only / Proxied only). Filters can be cleared in a single action, which also resets sort order to DateTime descending.

**Consequences (testable):**
- All active filters are applied simultaneously (AND logic across filter types; OR logic within the search field across URL path and method).
- Typing "post" in the search field returns both rows where method = POST and rows where the URL path contains "post".
- The Proxy counter pill (FR-12) always reflects the full unfiltered log total regardless of active filters.

#### FR-9: Row detail

A user can open the full request/response detail for any logged row. Detail includes: request ID, datetime, method, URL path, Service name and port, Type, HTTP status, request headers (redacted per FR-11), request body, response headers, and response body. Proxied request detail includes a "Save as Mock" action.

**Consequences (testable):**
- Three display styles: Modal (default), Right Drawer, Bottom Panel. User preference is persisted in Settings.
- On mobile (< 640 px), detail is always shown as a Modal, overriding the user's saved preference.
- When the Right Drawer is open and the user activates a different row, the drawer updates in-place without closing. Realizes UJ-3.
- The Bottom Panel uses a **Request** tab and a **Response** tab. Modal and Right Drawer use a single scrollable section.

#### FR-10: Sensitive header redaction

The following headers are redacted by default in all activity log entries stored and displayed: `Authorization`, `Cookie`, `Set-Cookie`, `X-Api-Key`, `X-Auth-Token`, and any header whose name contains the substring `secret` or `token` (case-insensitive). An explicit opt-in setting in Settings enables full header capture for debugging purposes. `[ASSUMPTION: redaction is applied at storage time; captured log entries cannot be un-redacted after the fact.]`

**Consequences (testable):**
- Redacted header values display as `[REDACTED]` in row detail.
- The opt-in capture setting requires an explicit toggle action; the secure default is redaction.
- Header name matching for the `secret`/`token` pattern is case-insensitive and applies to the header name only, not the header value.

#### FR-11: Auto-refresh configuration

A user can configure activity log auto-refresh at a defined interval (in milliseconds) or disable auto-refresh and refresh manually.

**Consequences (testable):**
- A LIVE / PAUSED indicator in the page header reflects the current auto-refresh state.
- When auto-refresh is disabled, a refresh icon is visible in the page header. Clicking it triggers a single manual fetch; the icon animates during the fetch and is non-interactive until the fetch completes.
- When `prefers-reduced-motion` is active, the refresh icon does not animate.

#### FR-12: Proxy counter pill

A pill widget in the Network Activity page header shows the total proxied request count for the full unfiltered log. Clicking the pill opens a popover listing per-Service proxied counts.

**Consequences (testable):**
- The count does not change when filters are applied or cleared — it reflects the full unfiltered log total.
- If any proxied row in the unfiltered log has a 5xx status code, the count number renders in error color. This reverts to default when the log is cleared or when no 5xx proxied rows exist in the unfiltered log.
- Services with 0 proxied requests are omitted from the popover list.
- Empty state in popover: "No proxied requests recorded."

#### FR-13: Clear log

A user can clear all rows from the activity log. No confirmation is required. The Proxy counter pill resets to zero. If Record mode (FR-16) is active, it remains active and continues capturing new rows from zero.

---

### 5.3 Mock Suggestions & Recording

**Description:** Fishtank's fastest path from real API traffic to a permanent stub. A user can save any proxied request as a Mapping + Response file pair directly from the activity log, or enable Record mode to auto-promote all proxied requests as they arrive. The generated WireMock JSON is editable before saving. Realizes UJ-2.

**Functional Requirements:**

#### FR-14: Save a proxied request as a mock

A user can initiate "Save as Mock" from any proxied request row (table action icon or row detail panel). This opens the Mock Suggestion modal.

**Consequences (testable):**
- The "Save as Mock" action is visible only on proxied request rows; it is never shown on Mocked rows.
- Clicking Save in the modal writes a Mapping file and a Response file to the appropriate Service's directory on disk and updates the Mappings folder tree. Realizes UJ-2.
- On successful save, the originating row detail modal or drawer closes automatically.
- On write failure, an immediate System Event entry is created; the modal remains open.

#### FR-15: Edit mock before saving

The Mock Suggestion modal presents an editable Mapping JSON block and an editable Response body block, both pre-populated from the proxied request. The user can modify either before saving.

**Consequences (testable):**
- The Mapping JSON uses the standard WireMock format: `WildcardMatcher` on the request path, the proxied HTTP method, `BodyAsFile` pointing to the auto-generated Response filename, and `UseTransformer: true` by default.
- The Response file naming convention is `{method}_{path}_{status}_body.json`, where `{status}` is the proxied response status code.
- If the user changes `Response.StatusCode` in the Mapping JSON to a value different from the proxied status code, a non-blocking inline note advises renaming the Response file after saving. This does not block saving.
- `Response.UseTransformer` defaults to `true`; the user can uncheck it before saving.

#### FR-16: Record mode

A user can enable Record mode from the Network Activity screen. While active, every proxied request is automatically promoted to a Mapping + Response file pair on disk without individual "Save as Mock" actions.

**Consequences (testable):**
- A persistent Recording badge in the Network Activity page header signals active recording.
- Recording continues across all screens. When the user navigates away from Network Activity, a cross-screen recording indicator appears in the top bar; clicking it navigates back to the Network Activity screen.
- On mobile (`/login` and `/setup` screens): the cross-screen indicator does not appear — recording cannot be active on auth screens.
- If the real-time connection drops while recording is active, the badge changes to a warning state ("Recording paused — connection lost"). Proxied requests received before the drop are retained; requests during the gap are lost. On reconnection, recording resumes automatically and a System Event records the gap duration and an explicit note that requests during the gap may not have been captured.

---

### 5.4 Mappings & Responses Management

**Description:** The Mappings screen is a browser-based file editor for Mapping and Response files. Users can browse, create, edit, rename, duplicate, and delete files in the volume-mounted Service folders without touching the filesystem directly. All writes are real filesystem operations on the mounted volume — changes appear as uncommitted modifications in the user's project repository by design. Realizes UJ-3, UJ-4.

**Functional Requirements:**

#### FR-17: File explorer

The Mappings screen presents a folder tree (Mocks Root → Service folders → `mappings/` → `responses/` → individual files) alongside a file editor pane. Selecting a file in the tree loads its content in the editor.

**Consequences (testable):**
- The folder tree root label displays the currently configured Mocks Root path value (not a hardcoded string). The label updates when the Mocks Root setting is changed, effective after services are restarted and a Resync is run.
- Active file is highlighted with a brand-color left border in the folder tree.
- Folder expand/collapse state is preserved for the session.

#### FR-18: Create, edit, rename, duplicate, and delete files

A user can perform full file operations on Mapping and Response files from the Mappings screen. All operations write directly to the volume-mounted filesystem.

**Consequences (testable):**
- Delete operations require a confirmation dialog with copy stating the file will be removed from disk. No optimistic delete.
- Unsaved changes are tracked: an indicator (● dot beside the filename in the tree; italic filename) marks edited files. Save and Discard actions are enabled only when unsaved changes exist.
- All file writes wait for server confirmation before the UI updates. A failed write produces an immediate System Event entry.
- Creating a new Mapping or Response file when no Service folder is selected presents a Service-selection dropdown before the naming modal.
- Renaming a Service (FR-4) changes its Slug and therefore its Mocks Root path; an inline modal warning advises the user to rename the directory on disk and run Resync. The save proceeds; filesystem migration is the user's responsibility. Realizes UJ-4.

#### FR-19: Dual-mode file editor

The file editor provides two tab views: a **Form** view for guided field editing of common Mapping fields, and a **Raw JSON** tab with syntax-highlighted direct JSON editing.

**Consequences (testable):**
- Switching between Form and Raw JSON tabs preserves unsaved changes.
- Advanced WireMock mapping fields not surfaced in Form view are always accessible via the Raw JSON tab. `[ASSUMPTION: the Form view covers the most-used WireMock mapping fields for v1; the exact field set is defined during implementation scoping — see Open Question 7.]`
- The Raw JSON editor uses a code editor component with syntax highlighting (e.g. CodeMirror). `[ASSUMPTION: the Mock Suggestion modal uses a lighter syntax-highlighting library (e.g. Prism.js) than the full editor used in the Mappings screen.]`

#### FR-20: Resync

A user can trigger a Resync from the Mappings toolbar. Resync reloads all Mapping and Response files from disk for all Services and refreshes the folder tree.

**Consequences (testable):**
- During Resync: the Resync button shows a spinner and is disabled; a persistent in-progress toast is shown.
- On success: the in-progress toast is dismissed; a success toast reports M mappings and R responses loaded and the elapsed duration. Duration format: < 10,000 ms → `{N}ms`; ≥ 10,000 ms → `{N}s`; ≥ 60,000 ms → `{N}m {N}s`. The success toast auto-dismisses after 4 s.
- Zero-value case: if M = 0 and R = 0, the toast reads "0 files loaded in {duration} — check your Mocks Root path and volume configuration."
- On failure: the Resync button re-enables; an error toast appears with the reason; the folder tree retains its previous state.
- Partial success: files that loaded are counted in the success toast; each failed file generates a separate error toast with filename and reason.
- If the currently open file was deleted externally: an inline banner shows "File no longer exists on disk." with a Close action that clears the editor pane.
- If the currently open file was modified externally *with* local unsaved changes: an inline conflict banner shows "This file was modified on disk since you started editing." with options "View disk version" (secondary confirmation required before discarding) and "Keep my edits."
- If the currently open file was modified externally *without* local changes: the editor silently reloads to the new disk version.
- Unsaved changes are *never* silently discarded by Resync.
- If a file save and a Resync complete in the same request window (save acknowledgment arrives after the Resync last-modified check), the save acknowledgment takes precedence and no conflict banner appears for that file.
- The editor remains interactive during an in-progress Resync. Realizes UJ-3.

#### FR-21: Unsaved change protection on navigation

Navigating away from the Mappings screen or signing out while unsaved Mapping edits exist triggers a confirmation prompt before the action proceeds.

---

### 5.5 System Events

**Description:** System Events is a dedicated screen for all infrastructure-level warnings, errors, and info events generated by Fishtank. It is the audit and diagnostics feed for events outside a user's direct action — startup failures, config conflicts, engine crashes, write errors, recording connection gaps. A notification bell in the top bar surfaces unread warnings and errors as a cross-screen badge count. Realizes UJ-1, UJ-4.

**Functional Requirements:**

#### FR-22: System Events log

The System Events screen displays all events with severity (warning / error / info), message, associated Service (when applicable), and timestamp. Events are persisted to the database across container sessions.

**Consequences (testable):**
- Engine crash events include the root cause: a stack trace excerpt and the offending Mapping file path where determinable. A crashed or failed-to-start Service is never surfaced as merely "stopped" — the failure reason is always included.
- Startup checks surface immediately: if the Mocks Root volume is not readable/writable at startup, or the SQLite database is inaccessible, a warning System Event is written before any Service attempts to start. Realizes UJ-1.
- All filesystem write operations (save Mapping, save Response, Record mode captures) confirm success or failure explicitly via System Events. Failed writes are never silently ignored.

#### FR-23: Notification Panel

The top bar displays a notification bell with a badge counting unread warnings and errors across all Services. Clicking the bell opens a Notification Panel.

**Consequences (testable):**
- Panel scope: warnings and errors only. Info and success events are excluded. A footer link navigates to System Events for the full log.
- Panel opens with 20 most recent items; a "Load more" button loads the next 20 per click. Infinite scroll is not used.
- New events arriving while the panel is open are prepended; the badge increments in real time; the user's scroll position is unchanged. A "N new" sticky pill appears at the top of the list when the user is scrolled below the top.
- Per-item actions: mark as read (item remains visible in read state) and dismiss ✕ (removes from panel; event remains in System Events and is marked read).
- "Mark all read" marks all server-side unread warnings and errors as read, including items not yet loaded by pagination. The badge resets to zero immediately. Currently displayed items remain visible in their read state.
- "Mark all read" is hidden when the unread count is 0.
- Badge displays 1–99; shows "99+" when count exceeds 99.
- Empty state: "No warnings or errors — all caught up."
- The panel closes automatically on any navigation event (sidebar click, logo click, browser back/forward).
- Each item's message contains an inline hyperlink to the corresponding System Events entry, pre-filtered by event ID. URL format: `/events?tab=warnings-errors&id={event-id}`.

---

### 5.6 Authentication & User Management

**Description:** Fishtank uses username/password authentication with JWT tokens. It ships with secure defaults: auto-registration off, header redaction on, forced password change when no admin password is configured, and configurable session lifetime for regulated deployments. Realizes UJ-1.

**Functional Requirements:**

#### FR-24: Login

Users authenticate with a username and password. On success, a JWT token is issued and persisted in the browser.

**Consequences (testable):**
- The JWT token is valid until container restart by default.
- Token expiry is configurable via environment variable.
- A container restart invalidates all active sessions simultaneously. This behavior is documented in the deployment guide. `[ASSUMPTION: there is no token refresh endpoint in v1; users re-authenticate after token expiry or container restart.]`

#### FR-25: Login rate limiting

The login endpoint is rate-limited to prevent brute-force credential attacks.

**Consequences (testable):**
- Requests exceeding the threshold receive HTTP 429 with a `Retry-After` header.
- Rate limit threshold and window are configurable via environment variables.

#### FR-26: First-run admin setup

A fresh Fishtank instance with no registered users redirects all traffic to a setup screen that prompts for an admin account username and password. No other access is permitted until setup is complete.

**Consequences (testable):**
- The setup screen creates exactly one admin account.
- Auto-registration is OFF by default; subsequent self-registration is not available unless explicitly enabled (FR-29).

#### FR-27: Default admin credentials

The default admin account username is `admin`. The admin password is configurable via environment variable at deploy time.

**Consequences (testable):**
- If no admin password is configured via environment variable, the first login forces a password change before any other access is granted.

#### FR-28: Sign-out with unsaved change protection

Triggering sign-out while the user has unsaved Mapping edits, an in-progress Add/Edit Service modal form, or an unsaved Mocks Root path value in Settings surfaces a confirmation dialog before sign-out proceeds.

**Consequences (testable):**
- Dialog title: "Sign out?" The body copy specifies the exact unsaved state(s) present.
- Persisted unsaved work (Mapping file edits, pending Mocks Root path) is guarded. Transient form data (in-progress Add/Edit Service modal) is mentioned in the warning but does not independently block sign-out.

#### FR-29: Auto-registration toggle

Auto-registration (allowing any new username to self-create an account) is an explicit opt-in via environment variable or Admin Console toggle.

**Consequences (testable):**
- Auto-registration is OFF by default.
- When enabled, new self-created accounts are Standard User role (not Admin).

---

### 5.7 Admin Console & Feature Toggles

**Description:** The Admin Console is accessible only to Admin-role users. It provides runtime control of Feature toggles, user accounts, system metrics, health monitoring, audit log access, and the warnings viewer. Feature toggles let any Fishtank capability be disabled at runtime without a container restart. Realizes UJ-4.

**Functional Requirements:**

#### FR-30: Feature toggles

All Fishtank features ship enabled by default in every release. Each feature can be disabled at runtime via the Admin Console, or at deploy time via environment variable, without container restart.

**Consequences (testable):**
- Toggle state is persisted in the database.
- Environment variable overrides take precedence over database state on container startup.
- A feature disabled via environment variable cannot be re-enabled via the Admin Console for the current container lifetime.
- Toggling a feature takes effect immediately for all active sessions.

#### FR-31: User management

Admin users can view, create, and deactivate user accounts.

**Consequences (testable):**
- v1 supports two roles: Admin and Standard User.
- Deactivating a user invalidates their active JWT tokens.

#### FR-32: Health dashboard and system metrics

The Admin Console surfaces a health dashboard showing active Services, request counts, database status, and uptime.

**Consequences (testable):**
- The health dashboard reflects the same state exposed by the `/health` endpoint (FR-38).

#### FR-33: Audit log viewer

The Admin Console provides a viewer for the audit trail of user-initiated and system-generated actions.

---

### 5.8 Deployment & Distribution

**Description:** Fishtank ships as a single Docker image on Docker Hub. The image is designed for zero-config pull-and-run — a developer can be operational in under five minutes on Linux, macOS (including Apple Silicon), or Windows with Docker Desktop, without reading documentation. All runtime behavior is configurable via environment variables. Realizes UJ-1.

**Functional Requirements:**

#### FR-34: Docker Hub distribution

Fishtank is published as a Docker image on Docker Hub under a public namespace, with semantic versioning tags (`latest` + version tags). The source and automated release pipeline live in a public GitHub repository.

**Consequences (testable):**
- A cross-platform CI smoke test runs on every release: automated `docker run` validation on Linux, macOS, and Windows runners confirms the image starts, serves the UI, and accepts a basic request before publication.
- The GitHub repository is publicly accessible and includes `CONTRIBUTING.md`, `SECURITY.md`, and a curated `good first issue` backlog at v1 launch.

#### FR-35: Volume configuration

Fishtank requires two volume mounts: the project Mocks folder (Service subdirectories containing Mappings and Responses) and the Fishtank data directory (SQLite database, logs).

**Consequences (testable):**
- The container runs as a non-root user. The UID is documented so operators can set correct volume permissions without running as root.
- The seed file, if used, must be mounted read-only. Fishtank reads it at startup only and never writes to it.
- If the Mocks Root volume is not readable/writable at startup, a System Event warning is created before any Service starts. Realizes UJ-1.

#### FR-36: Environment variable configuration

All runtime behaviors are configurable via environment variables, including: management port, database path, Mocks Root path, JWT expiry, admin password, auto-registration toggle, login rate-limit parameters, CORS allowed origins, sensitive header capture opt-in, feature toggle overrides, and the API key for the pipeline reset endpoint.

**Consequences (testable):**
- All environment variable defaults and acceptable values are documented in the README and `docker-compose.example.yml`.
- `docker-compose.example.yml` ships in the repository root: a complete, copy-pasteable setup with both required volume mounts, all common environment variables with inline comments, and a seed file reference. Realizes UJ-1.

#### FR-37: SQLite persistence

Fishtank persists Services, users, JWT tokens, activity log metadata, audit trail, feature toggle state, and System Events to a SQLite database on the volume-mounted data directory. Mapping and Response files remain on the user's volume-mounted project filesystem — never in the database.

**Consequences (testable):**
- The SQLite data file is a single portable file; backing it up is a file copy operation.
- Multiple simultaneous Fishtank instances must not share the same SQLite data volume. This constraint is documented prominently in the README and deployment guide.

#### FR-38: Health and readiness endpoint

A `/health` endpoint returns HTTP 200 when the container is fully initialized and all configured Services are running; HTTP 503 with a structured JSON error body if the database is inaccessible or the Mocks Root volume is unreadable.

**Consequences (testable):**
- The endpoint is usable as a Docker Compose `healthcheck` target and a Kubernetes readiness probe.
- The HTTP 503 body includes a machine-readable `reason` code and a human-readable `message`.

#### FR-39: Structured logging

Fishtank writes structured (JSON) logs to stdout and rolling daily log files. All errors, Service start/stop events, Resync outcomes, and System Events are logged.

**Consequences (testable):**
- Log volume path and retention period are configurable via environment variable.

#### FR-40: Cross-platform validation

The Fishtank image is validated on Linux, macOS (Apple Silicon and Intel), and Windows via Docker Desktop on every release.

**Consequences (testable):**
- Host-networking differences and volume permission edge cases are documented in the README.
- First-run volume and port errors produce human-readable messages with a documented fix, not a raw stack trace.

#### FR-41: Kubernetes compatibility

The Fishtank Docker image deploys as a standard Kubernetes workload without modification.

**Consequences (testable):**
- A reference `deployment.yaml` manifest ships in the repository for teams running shared K8s environments.

#### FR-42: Demo Docker image

A `fishtank-demo` tag on Docker Hub ships pre-seeded with realistic example Services (e.g. a weather API, a payments gateway, a user profile service). Zero configuration required — `docker run` and open the browser to explore a fully operational Fishtank instance with sample data. `[ASSUMPTION: the example Service set and mock data for the demo image are finalized during implementation — see Open Question 5.]`

**Consequences (testable):**
- The demo image is built from the same base image as the production release.
- The demo image is intended for first-time evaluation, developer training, and API integration workshops.

---

### 5.9 Management API

**Description:** Every management operation available in the Fishtank UI is also available via a REST API. Teams that prefer headless, automation-first workflows can script Service configuration, trigger Resyncs, query Activity logs, and manage Feature toggles without opening a browser. Realizes UJ-1, UJ-4.

**Functional Requirements:**

#### FR-43: Full management surface via REST API

The Management API exposes endpoints for all UI operations: Service CRUD, Mapping/Response file CRUD, Resync, Activity log query and clear, System Events query, User management, and Feature toggle management.

**Consequences (testable):**
- All endpoints (except `/health` and the login endpoint) require a valid JWT token or configured API key.
- All responses are JSON.
- Unauthenticated requests return HTTP 401.

#### FR-44: OpenAPI specification

An OpenAPI specification for the Management API ships with the repository and is served from the running container at a documented path.

**Consequences (testable):**
- The OpenAPI spec enables frontend-only contributors to understand and extend the API boundary without reading .NET source code.
- The spec is versioned alongside the application and updated with every API change.

#### FR-45: Pipeline reset endpoint

A `POST /admin/reset` endpoint clears the runtime Activity log and in-memory counters for all Services, then reloads Mappings from disk — without restarting the container.

**Consequences (testable):**
- The endpoint requires a valid pre-shared API key, configured via environment variable. Unauthenticated requests return HTTP 401.
- If no API key is configured, the endpoint returns HTTP 403 with a message indicating that API key configuration is required.
- The API key is distinct from user JWT tokens; it is a pre-shared secret for CI/CD automation only.

---

### 5.10 Cache Management

**Description:** Users can inspect and clear the in-memory mapping and response caches for individual Services or all Services simultaneously from the Settings screen. Cache clearing takes effect immediately without a container restart or Resync.

**Functional Requirements:**

#### FR-46: Service cache management

A user can view the current in-memory cache state for each Service (entry count and estimated size) and clear caches at the individual Service level or globally from Settings → Cache.

**Consequences (testable):**
- The Cache sub-section in Settings lists each configured Service with its current cache entry count and estimated in-memory size.
- A "Clear All" action clears the in-memory cached mappings and responses for all Services simultaneously; a confirmation dialog is required before execution.
- A per-Service "Clear" action clears the cache for that Service only; a confirmation dialog is required.
- Cleared caches are reloaded from disk on the next incoming request to the affected Service — no Resync or container restart is required.
- If no Services are configured, the Cache sub-section shows an empty state: "No service caches yet — caches appear here once services are created and receive requests."
- Admin Console access: cache management is available to all authenticated users (Standard User and Admin), not Admin-only.

---

## 6. Cross-Cutting NFRs

### Performance
- **NFR-1:** Management UI initial load (first paint, container already running) completes within 2 seconds on a standard broadband connection. `[ASSUMPTION: all UI assets are served from the container; no CDN dependency at runtime.]`
- **NFR-2:** Resync completes in under 1 second for a typical mapping set (< 200 files total across all Services), with a progress indicator shown for larger sets.
- **NFR-3:** Activity log rows appear in the UI within 500 ms of the corresponding HTTP request being received by the Service.
- **NFR-4:** The Activity log supports at least 10,000 rows without degrading UI scroll performance below 60 fps. `[ASSUMPTION: virtual scrolling or an equivalent technique is used for large log sets.]`

### Reliability
- **NFR-5:** A crash or unresponsiveness in one Service's mock engine must not affect other running Services or the management UI. Each Service runs with an independent fault boundary.
- **NFR-6:** The container starts and serves the management UI within 10 seconds on a standard developer machine (4-core CPU, 8 GB RAM, Docker Desktop).
- **NFR-7:** The `/health` endpoint (FR-38) responds within 500 ms under normal operating conditions.

### Security
- **NFR-8:** All API endpoints except `/health` and the login endpoint require authentication. Unauthenticated requests return HTTP 401.
- **NFR-9:** `Authorization`, `Cookie`, `Set-Cookie`, `X-Api-Key`, `X-Auth-Token`, and headers whose name contains `secret` or `token` (case-insensitive) are redacted by default at storage time (FR-10). Full header capture is opt-in only.
- **NFR-10:** The login endpoint is rate-limited (FR-25). Threshold and window are configurable.
- **NFR-11:** The CORS policy allows only the origin serving the bundled React UI by default. Additional origins require explicit `ALLOWED_ORIGINS` environment variable configuration.
- **NFR-12:** The Fishtank container image runs as a non-root user (FR-35).
- **NFR-13:** The seed file mount is read-only at the container level (FR-35). Fishtank never writes to it.
- **NFR-14:** The pipeline reset endpoint (FR-45) requires a pre-shared API key. Calls without a valid key return HTTP 401 or HTTP 403.
- **NFR-15:** All destructive UI actions (Mapping file delete, Service disable, bulk log clear) require an explicit confirmation step. No silent or optimistic destructive operations. Exception: the enable/disable Service toggle uses optimistic UI — this is the explicit documented exception because the state is visually cheap to revert and the operation is non-destructive.
- **NFR-16:** JWT tokens must not be stored in `localStorage`. `[ASSUMPTION: tokens are stored in a secure, `httpOnly` cookie or equivalent browser-secure storage — not `localStorage` or `sessionStorage`.]`

### Observability
- **NFR-17:** Fishtank writes structured (JSON) logs to stdout and rolling daily files (FR-39). All errors, Service lifecycle events, and Resync outcomes are logged.
- **NFR-18:** Every System Event generated by the infrastructure layer is also written to the structured log.

### Accessibility
- **NFR-19:** All interactive elements are keyboard-navigable and carry meaningful `aria-label` attributes where visible text labels are absent. Icon-only buttons always have `aria-label`. Destructive and primary actions are reachable via keyboard without mouse interaction.
- **NFR-20:** The UI meets WCAG 2.1 AA contrast requirements across all supported themes. Color-coded indicators (HTTP method chips, Status pills, Type icons) are supplemented with text labels or tooltips — color is never the sole signal. `[ASSUMPTION: the four supported themes are Clean Light, Dark, Deep Ocean, and one additional — final list subject to confirmation; see Open Question 2.]`
- **NFR-21:** Animated UI elements (sidebar collapse animation, recording badge, spinner) respect `prefers-reduced-motion` — static fallbacks are provided for all animations.

---

## 7. Constraints & Guardrails

### Security Constraints
- **TLS:** Fishtank v1 serves plain HTTP. TLS termination is the responsibility of a reverse proxy (nginx, Traefik, Caddy) placed in front of Fishtank for any non-localhost deployment. A recommended reverse-proxy deployment pattern is documented in the README at v1 launch. `[NOTE FOR PM: evaluate built-in TLS support or a Traefik sidecar reference pattern for v2.]`
- **Multi-instance:** The SQLite data volume must not be shared across multiple simultaneous Fishtank instances. Multi-instance deployments require Postgres (post-v1). This constraint is prominently documented.

### Scope Constraints
- **Service deletion:** Not available in v1. Services can be stopped but not removed from the database. The port range (30100–30199) supports a maximum of 100 Services. If the range is exhausted, there is no in-app path to free a port in v1; port exhaustion UI messaging does not instruct users to "remove a service." Service deletion is targeted for v2. `[NOTE FOR PM: flag immediately if any known use case is expected to exceed 100 Services.]`
- **Port range:** 30100–30199 is fixed in v1; the range is not user-configurable.
- **WebSocket proxying:** `ws://` and `wss://` External URLs are not accepted in v1.

### Platform Constraints
- **Browser target:** Desktop browser (≥ 1024 px) is the primary surface. Fully responsive at mid (640–1023 px) and mobile (< 640 px), but not mobile-optimized. On mobile, row detail is always Modal; Right Drawer and Bottom Panel are not available below 640 px.
- **No runtime CDN dependency:** All UI assets are served from the container. No external CDN calls at runtime.
- **No native shell, no Electron:** Web SPA served from the Docker container, accessed via browser.

---

## 8. Non-Goals (Explicit)

- **No SaaS or cloud-hosted tier** — Fishtank is self-hosted only.
- **No GraphQL or gRPC mocking** — HTTP/REST only in v1.
- **No OpenAPI/Swagger mock import** — Proxy capture and manual mapping authoring only.
- **No AI-powered mock inference** — Mock suggestions are deterministic captures; not ML-generated.
- **No RBAC beyond Admin / Standard User** — Fine-grained permissions and team-level isolation are post-v1.
- **No cross-repository mock synchronization** — One Fishtank instance manages one project's volume.
- **No Helm chart** — A reference `deployment.yaml` ships; a Helm chart is a post-v1 community contribution.
- **No Postgres in v1** — SQLite only; Postgres via `DATABASE_URL` is a post-v1 addition.
- **No WebSocket proxying** — `ws://`/`wss://` upstream URLs are not supported.
- **No service deletion in v1** — Services can be stopped but not removed.
- **No built-in TLS** — Reverse proxy responsibility at v1.
- **No mobile-optimized UI** — Responsive down to mobile but not mobile-optimized.
- **No plugin or extension system.**
- **No multi-tenant or per-team isolation within a single instance.**

---

## 9. MVP Scope

### 9.1 In Scope

- Services management: define, edit, enable/disable, tag, seed file import, card grid and table view
- Network Activity: real-time log, filtering and sorting, row detail (modal/drawer/panel), sensitive header redaction, auto-refresh, clear, Proxy counter pill
- Mock Suggestions: Save as Mock modal (editable mapping + response), Record mode auto-promote, cross-screen recording indicator
- Mappings & Responses: file explorer (folder tree + editor), create/edit/rename/duplicate/delete, dual-mode editor (Form + Raw JSON), Resync with conflict detection, unsaved change protection
- System Events screen and Notification Panel (bell + badge)
- Authentication: username/password login, JWT, first-run setup, admin credentials, rate limiting, sign-out protection
- Admin Console: feature toggles, user management, health dashboard, audit log
- Management REST API with full UI surface parity
- OpenAPI specification (served from container + in repository)
- Pipeline reset endpoint (FR-45)
- Settings cache management — per-Service and global in-memory cache clear (FR-46)
- Docker Hub image + public GitHub repository with automated release pipeline
- `docker-compose.example.yml` and reference K8s `deployment.yaml`
- `/health` readiness endpoint
- Structured (JSON) logging
- `fishtank-demo` pre-seeded Docker image
- Cross-platform CI smoke tests (Linux, macOS, Windows)
- All supported UI themes (Clean Light default + additional — see Open Question 2)
- Full keyboard navigation and WCAG 2.1 AA compliance across all themes
- `CONTRIBUTING.md`, `SECURITY.md`, and curated `good first issue` backlog at launch
- A public demo (animated GIF or screen recording) at the top of the README

### 9.2 Out of Scope for v1

- Service deletion (v2)
- Postgres persistence backend (post-v1)
- OpenAPI/Swagger mock import (post-v1)
- GraphQL / gRPC mocking (post-v1)
- RBAC beyond Admin / Standard User (post-v1)
- WebSocket proxying (post-v1)
- Cross-repository mock synchronization (post-v1)
- Helm chart (post-v1 community contribution)
- Built-in TLS (post-v1; reverse proxy recommended at v1)
- Plugin / extension system (post-v1)
- Cloud-hosted or SaaS tier
- AI-powered mock inference

---

## 10. Success Metrics

**Primary**

- **SM-1: Internal daily use.** The team that built Fishtank uses it daily across all active projects; no raw WireMock.NET JSON config files are authored by hand. Target: achieved within 30 days of v1 launch. *Measured by team self-report and absence of hand-authored WireMock config commits.* Validates FR-1 through FR-21.
- **SM-2: External team adoption.** At least 3 development teams outside the originating organisation are actively using Fishtank in a project within 6 months of launch. Target: 3 external teams by month 6. *Measured by: Docker Hub pulls from non-team accounts, GitHub stars from non-team accounts, direct community reports via GitHub Discussions or Discord.* Validates product-market fit.
- **SM-3: External contribution.** At least 1 non-team contributor opens a merged PR within 6 months of launch. Target: 1 merged external PR by month 6. *Measured by: GitHub PR history.* Validates FR-34, contributor accessibility.
- **SM-4: Zero-config onboarding.** A developer unfamiliar with Fishtank is operational within 5 minutes on Linux, macOS (including Apple Silicon), and Windows with Docker Desktop. *Measured by: first-time user feedback, informal usability test within 60 days of launch.* Validates FR-34, FR-36, UJ-1.

**Secondary**

- **SM-5: Docker Hub pull milestones.** 100 pulls by end of month 1; 1,000 pulls by end of month 3. Validates distribution reach. Validates FR-34, FR-42.
- **SM-6: GitHub stars.** 50 stars by end of month 1. Proxy for developer awareness and intent. Validates FR-34.
- **SM-7: Issue triage SLA.** 100% of reported bugs triaged within 48 hours for the first 6 months post-launch. Validates community commitment. Validates FR-34.
- **SM-8: UI polish at ship.** Zero placeholder text, zero unlabelled icon-only buttons, and all tested destructive flows show a confirmation dialog at v1 ship. Validates NFR-15, NFR-19.

**Counter-metrics (do not optimize)**

- **SM-C1:** Do not inflate Docker Hub pull counts via marketing campaigns that do not result in genuine installations. SM-5 counts mean nothing if SM-2 is not also moving. Counterbalances SM-5.
- **SM-C2:** Do not close GitHub issues to meet the SM-7 SLA. Closed means resolved or explicitly deferred with a reason. An auto-response resets the clock but does not substitute for triage. Counterbalances SM-7.
- **SM-C3:** Do not add new features to boost SM-6 (stars) beyond the team's maintenance capacity. Every new feature must ship with documentation and at least one test. Counterbalances SM-6.

---

## 11. Open Questions

1. **Architectural gate (pre-implementation blocker):** Multi-service in-process management via WireMock.NET must be validated by a proof-of-concept spike before v1 scope is locked. If WireMock.NET requires separate OS processes per Service instance, the container architecture and API surface require redesign. *Owner: engineering lead. Due: before implementation begins.*
2. **UI theme count and names:** The PRD assumes 4 supported UI themes. The final list (e.g. Clean Light, Dark, Deep Ocean, and one additional) needs confirmation before implementation. *Owner: design lead.*
3. **JWT token storage mechanism:** NFR-16 requires tokens are not stored in `localStorage`. The exact mechanism (`httpOnly` cookie vs. `sessionStorage` vs. other) must be decided and documented. *Owner: engineering lead.*
4. **Activity log retention default:** The default max-entries cap per Service is not specified in the brief. A concrete default value must be established. *Owner: PM / engineering lead.*
5. **Demo image Service set:** The `fishtank-demo` image (FR-42) needs a finalized set of example Services and realistic mock data. *Owner: PM / UX.*
6. **Seed file JSON schema:** The seed file format is referenced but not formally specified. The schema must be documented before implementation. *Owner: engineering lead.*
7. **Mapping Form view field coverage (FR-19):** The set of WireMock mapping fields surfaced in the Form tab must be scoped for v1. *Owner: PM / engineering.*
8. **CORS on first-run:** On a fresh container before the management port is known, what is the default CORS allowed origin? Does first-run setup require manual CORS configuration, or is the origin auto-detected? *Owner: engineering lead.*

---

## 12. Assumptions Index

- **A-1** (§5.1 FR-5): The seed file JSON schema is consistent with the Management API's service creation payload schema.
- **A-2** (§5.2 FR-10): Sensitive header redaction is applied at storage time; log entries cannot be un-redacted after the fact.
- **A-3** (§5.4 FR-19): The Form view covers the most-used WireMock mapping fields for v1; the exact field set is defined during implementation scoping (see OQ-7).
- **A-4** (§5.4 FR-19): The Mock Suggestion modal uses a lighter syntax-highlighting library (e.g. Prism.js) than the full code editor in the Mappings screen (e.g. CodeMirror).
- **A-5** (§5.6 FR-24): There is no token refresh endpoint in v1; users re-authenticate after token expiry or container restart.
- **A-6** (§5.8 FR-42): The example Service set and mock data for the demo image are finalized during implementation (see OQ-5).
- **A-7** (§6 NFR-1): All UI assets are served from the container; no CDN dependency at runtime.
- **A-8** (§6 NFR-4): Virtual scrolling or an equivalent technique is used for the Activity log to handle ≥ 10,000 rows without degrading performance.
- **A-9** (§6 NFR-16): JWT tokens are stored in a secure, `httpOnly` cookie or equivalent browser-secure storage — not `localStorage` or `sessionStorage`.
- **A-10** (§6 NFR-20): The four supported UI themes are Clean Light, Dark, Deep Ocean, and one additional theme — final list to be confirmed (see OQ-2).
