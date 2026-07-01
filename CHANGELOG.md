# Changelog

All notable changes to Fishtank are documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).  
Versions follow [Semantic Versioning](https://semver.org/).

> For automated release notes (grouped by PR type), see the
> [GitHub Releases](https://github.com/NicoIodice/fishtank/releases) page.

---

## [Unreleased] — v0.4.0 (Mappings & Mock Capture)

_Theme: Edit mock files in the browser and record real traffic into permanent stubs._

### Added

- **Mappings file CRUD backend** — `POST /api/mappings`, `GET /api/mappings`, `PUT /api/mappings/{path}`, `DELETE /api/mappings/{path}` for creating, listing, updating, and deleting WireMock mapping/response files via API (`feature/4-1-mappings-file-backend-crud-ifilewatcher-and-resync-engine`)
- **Path traversal protection** — `MappingService.SanitizePath` blocks `../`, URL-encoded traversal sequences, absolute paths, and any path resolving outside the configured mocks root (`feature/4-1-mappings-file-backend-crud-ifilewatcher-and-resync-engine`)
- **`IFileWatcher` abstraction** — `FakeFileWatcher` test double enabling synchronous, deterministic file-change simulation in integration tests without OS-level `FileSystemWatcher` noise (`feature/4-1-mappings-file-backend-crud-ifilewatcher-and-resync-engine`)
- **Resync engine** — `POST /api/resync` reloads all mapping and response files for every registered service; returns `{ mappingsLoaded, responsesLoaded, elapsedMs, failures[], conflicts[] }` (`feature/4-1-mappings-file-backend-crud-ifilewatcher-and-resync-engine`)
- **Conflict detection** — resync flags files that were externally modified (disk `LastWriteTimeUtc` newer than `_lastKnownModified` baseline set by the API) (`feature/4-1-mappings-file-backend-crud-ifilewatcher-and-resync-engine`)
- **Concurrent resync guard** — `SemaphoreSlim(1,1)` static lock returns HTTP 409 `RESYNC_IN_PROGRESS` if a resync is already running (`feature/4-1-mappings-file-backend-crud-ifilewatcher-and-resync-engine`)
- **ResyncCompleted SignalR broadcast** — on resync completion, `ServicesHub` broadcasts `ResyncCompleted` to all connected clients (`feature/4-1-mappings-file-backend-crud-ifilewatcher-and-resync-engine`)
- **Mappings file explorer** — new `/mappings` screen with a collapsible folder tree (Mocks Root → service folders → `mappings/`·`responses/` → files), session-persisted expand/collapse, active-file highlight, and full keyboard navigation (arrow keys + Enter) (`feature/4-2-mappings-file-explorer-and-dual-mode-editor`)
- **Dual-mode mapping editor** — Form view for common WireMock fields plus a Raw JSON tab (CodeMirror, `lang-json` + one-dark theme); edits are preserved across tab switches and advanced fields are never dropped (`feature/4-2-mappings-file-explorer-and-dual-mode-editor`)
- **In-browser file management** — create (New Mapping / New Response), edit & save, rename, duplicate, and delete mapping/response files directly from the UI; deletes require confirmation and every write waits for server confirmation with an error toast on failure (`feature/4-2-mappings-file-explorer-and-dual-mode-editor`)
- **`GET /api/mappings/{path}`** — single-file content-read endpoint returning file content plus metadata, guarded by the same path-traversal sanitisation and authentication as the rest of the Mappings API (`feature/4-2-mappings-file-explorer-and-dual-mode-editor`)
- **Unsaved-changes navigation guard** — leaving `/mappings` with unsaved edits prompts a confirmation dialog so changes are never lost silently (`feature/4-2-mappings-file-explorer-and-dual-mode-editor`)
- **Settings → Mocks Root** — read-only display of the configured Mocks Root path with guidance that changing it requires a service restart and resync (`feature/4-2-mappings-file-explorer-and-dual-mode-editor`)
- **Resync button with toast feedback** — toolbar button in the Mappings page triggers `POST /api/resync`; shows an in-progress spinner, a success toast (with formatted duration), a partial-success toast listing failed files, or a persistent error toast on network/API failure; 409 "already in progress" is handled gracefully (`feature/4-3-resync-ui-with-toast-feedback-and-conflict-banners`)
- **Conflict banner** — when Resync reports a file as externally modified and the editor has unsaved changes, an inline warning banner appears with "Keep my edits" and a guarded "View disk version" action (requires a confirmation step to prevent accidental discard) (`feature/4-3-resync-ui-with-toast-feedback-and-conflict-banners`)
- **Deleted-file banner** — when Resync reports the active file was deleted on disk, an inline banner prompts the user to close the now-orphaned editor tab (`feature/4-3-resync-ui-with-toast-feedback-and-conflict-banners`)
- **Silent reload for clean files** — when a conflicted file has no unsaved changes, Resync automatically reloads the latest content from disk without any user interaction (`feature/4-3-resync-ui-with-toast-feedback-and-conflict-banners`)

---

## [v0.3.0] — 2026-06-28 (Network Activity)

_Theme: See every request hitting your mock services in real time._

### Added

- **Activity log backend** — in-memory per-service request capture from WireMock mock services, with sensitive header redaction (`Authorization`, `Cookie`, `Set-Cookie`, `X-Api-Key`, `X-Auth-Token`, and any header containing `secret` or `token`) applied at storage time (`feature/3-1-activity-log-backend-request-capture-and-header-redaction`)
- **`GET /api/activity`** — query the activity log with filters: `serviceId`, `type` (Mocked/Proxied), `search` (URL path or method), and pagination (`skip`/`take`) (`feature/3-1-activity-log-backend-request-capture-and-header-redaction`)
- **`DELETE /api/activity`** — clear all in-memory activity log entries (`feature/3-1-activity-log-backend-request-capture-and-header-redaction`)
- **`PUT /api/settings/capture-headers`** — opt-in toggle to capture headers unredacted; instance-wide setting persisted in the database (`feature/3-1-activity-log-backend-request-capture-and-header-redaction`)
- **ActivityHub** — SignalR hub at `/hubs/activity` broadcasting `ActivityRowAdded` events to connected clients within 500 ms of each request (`feature/3-1-activity-log-backend-request-capture-and-header-redaction`)
- **Network Activity page** — real-time log display at `/activity` showing HTTP request/response rows streamed via SignalR append-only push with virtual scrolling (handles 10 k+ rows, ≤100 DOM nodes), method color chips (GET/POST/PUT/PATCH/DELETE), 5xx error row highlighting via CSS variable `--error-row-bg`, status code badge, URL truncation, and newest-first ordering (`feature/3-2-network-activity-page-real-time-log-display`)
- **Proxy counter pill** — live popover showing per-service proxied-request counts with error color (#ef4444) when any 5xx response is present (`feature/3-2-network-activity-page-real-time-log-display`)
- **Activity toolbar** — refresh, live/paused toggle, recording badge, search input, service filter, type filter (Mocked/Proxied), column picker, and clear-log controls (`feature/3-2-network-activity-page-real-time-log-display`)
- **Keyboard navigation** — ArrowUp/ArrowDown row focus within the activity grid with `role="grid"` and `aria-rowindex` for screen-reader compatibility (`feature/3-2-network-activity-page-real-time-log-display`)
- **Activity log filtering** — client-side search (URL path + method, case-insensitive OR logic), service dropdown filter (from React Query cache), and type filter (Mocked/Proxied checkboxes) with AND logic across all active filters; proxy counter pill always reflects unfiltered row count (`feature/3-3-activity-log-filtering-sorting-auto-refresh-and-log-controls`)
- **Activity log column sorting** — sortable column headers (Method, URL Path, Status, Service, Duration ms, DateTime); cycle: unsorted → ascending → descending → unsorted; one column at a time; default is DateTime descending (`feature/3-3-activity-log-filtering-sorting-auto-refresh-and-log-controls`)
- **LIVE/PAUSED toggle** — pauses the activity table at a snapshot; new SignalR rows continue arriving but are not displayed until LIVE is resumed; Refresh icon appears in PAUSED mode for manual re-fetch with `animate-spin` animation and `prefers-reduced-motion` respect (`feature/3-3-activity-log-filtering-sorting-auto-refresh-and-log-controls`)
- **Clear log** — calls `DELETE /api/activity` and clears the in-memory table and proxy counter pill in one action, no confirmation required (`feature/3-3-activity-log-filtering-sorting-auto-refresh-and-log-controls`)
- **Settings → Network Activity section** — auto-refresh interval (1 s / 2 s / 5 s / Disabled, persisted in `localStorage`), max log entries display (500 / 1 000 / 5 000), and capture full request headers toggle (wires to `PUT /api/settings/capture-headers`) (`feature/3-3-activity-log-filtering-sorting-auto-refresh-and-log-controls`)
- **Row detail overlays** — click (or press Enter on) any activity log row to open full request/response detail in your preferred style: Modal (560 px centered, focus-trapped), Right Drawer (320 px from right edge, updates in-place on row change), or Bottom Panel (tabbed Request/Response view, close collapses and clears selection); mobile viewports (< 640 px) always use Modal regardless of preference; redacted header values shown as `[REDACTED]`; request/response bodies pretty-printed when valid JSON; "Save as Mock" placeholder rendered for proxied rows (`feature/3-4-row-detail-all-three-display-styles`)
- **Settings → Appearance — Row detail style** — segmented button group (Modal / Right Drawer / Bottom Panel) lets users choose how row detail appears; preference persisted in `localStorage` and respected across sessions (`feature/3-4-row-detail-all-three-display-styles`)

---

## [v0.3.0] — 2026-06-28 (Network Activity)

### Changed

- **Developer tooling** — Minor fixes and improvements (`hotfix/v0.2.2`)

---

## [v0.2.1] — 2026-06-27 (Hotfix)

### Fixed

- **Dockerfile `HEALTHCHECK`** — added `HEALTHCHECK` instruction so `docker inspect` returns container health status when running via `docker compose` (support tool) (`hotfix/v0.2.1`)
- **Support tool start wait** — `Start Fishtank` now polls container health for up to 60 s and prints elapsed-time progress; shows `✔ Fishtank is up and ready → http://localhost:PORT` on success or a log-hint on timeout (`hotfix/v0.2.1`)

---

## [v0.2.0] — 2026-06-27 (Services Management)

_Theme: Define mock services and have WireMock start serving requests immediately._

### Added

- **WireMock engine layer** — `EngineStartup` hosted service auto-starts all Live services on container boot; per-service fault isolation (catch per service, continue loop); port-binding failures recorded as `SystemEvent` with `severity=error` (`story/2-1`)
- **Services CRUD API** — `POST /api/services` (create + WireMock start), `GET /api/services` (list), `PUT /api/services/{id}` (update), `POST /api/services/{id}/stop`, `POST /api/services/{id}/start`; all require JWT auth (`story/2-1`)
- **`GET /api/services/next-port`** — returns lowest available port in 30100–30199; reclaims ports from soft-deleted services (`story/2-1`)
- **System Events API** — `GET /api/system-events` returns all system events ordered by `CreatedAt` desc; auth-required (`story/2-1`)
- **`Services` and `SystemEvents` EF entities + migration** — `Services` (Id, Name, Slug unique, ExternalUrl, Port, MocksRoot, Status, IsActive, DeletedAt, TagsJson, CreatedAt); `SystemEvents` (Id, Severity, Message, ServiceId nullable FK, CreatedAt, IsRead) (`story/2-1`)
- **`IServicesRegistry`** — thread-safe singleton `ConcurrentDictionary<Guid, WireMockServer>` for in-process WireMock instances (`story/2-1`)
- **`IWireMockServerFactory`** — abstraction over `WireMockServer.Start()` enabling fault injection in tests (`story/2-1`)
- **SSRF guard** — `ExternalUrl` blocks loopback (127.0.0.1, localhost, ::1) and cloud-metadata (169.254.169.254, 100.100.100.200) endpoints with `SERVICE_URL_INVALID` (`story/2-1`)
- **Structured error codes** — `SERVICE_NAME_REQUIRED`, `SERVICE_NAME_INVALID`, `SERVICE_SLUG_CONFLICT`, `SERVICE_PORT_OUT_OF_RANGE`, `SERVICE_PORT_RANGE_EXHAUSTED`, `SERVICE_URL_INVALID`, `SERVICE_NOT_FOUND` (`story/2-1`)
- **ServicesHub** — SignalR hub skeleton at `/hubs/services` with `[Authorize]`; real-time push implemented in later stories (`story/2-1`)
- **Services page** — grid/table dual-view (persistent in sessionStorage) with `ServiceCard` components showing name, port badge, status pill, external URL, mock-file count, and tag chips; tag filter with AND logic; Add Service modal (port pre-filled from `next-port`, 200ms slug debounce, slug-change warning, tag chip input); Edit Service modal with field pre-population; toggle start/stop from card (`story/2-2`)
- **`DataTable<T>` component** — generic sortable table with `sortValue` accessor, `localeCompare` collation, sticky headers, keyboard navigation (ArrowDown/ArrowUp/Enter), and `aria-sort` attributes; `table-layout: fixed` with `<colgroup>` column widths (`story/2-2`)
- **`mockFileCount` on ServiceDto** — backend counts `.json` files in the service's mocks root directory; returns 0 when directory is missing or inaccessible (`story/2-2`)
- **System Events screen** — `/events` route lists all infrastructure events newest-first with severity icon, message, associated service, and timestamp; engine-crash events surface the failure reason/root cause; two-tab view (all events / warnings+errors) with deep-linkable items (`story/2-4`)
- **Notification bell + Notification Panel** — top-bar bell with live unread badge (warnings+errors only, "99+" overflow, fixed `#ef4444`); panel paginates 20-per-page with "Load more", per-item mark-as-read (click body) and dismiss (✕, removed from view but retained + marked read in DB), "Mark all read" (hidden at zero unread), "N new" sticky pill on prepend, and auto-close on navigation/Esc/outside-click (`story/2-4`)
- **Real-time System Events via `EventsHub`** — `SystemEventCreated` and `UnreadCountChanged` broadcast over `/hubs/events` on every new warning/error (info suppressed), incrementing the badge across all connected sessions; wired through `HUB_INVALIDATION_MAP` (`SystemEventCreated: [["events"]]`) (`story/2-4`)
- **System Events API** — paginated, severity-filtered `GET /api/system-events` (`{items,total,hasMore}` envelope); `GET /api/system-events/unread-count`; `POST /api/system-events/{id}/read`; `POST /api/system-events/read-all`; clear-all; all JWT-authorized; deterministic ordering (`CreatedAt` desc, `Id` tiebreaker) (`story/2-4`)
- **Settings → Cache management** — `GET /api/cache` lists all services with in-memory WireMock mapping entry count and estimated disk size; `DELETE /api/cache/{id}` clears and reloads the mapping cache for a single service (no restart required); `DELETE /api/cache` bulk-clears all running services; Settings → Cache sub-section with per-service rows, individual and global Clear buttons with confirmation dialogs, and empty state when no services exist; available to all authenticated users — not Admin-only (FR-46) (`story/2-5-settings-service-cache-management`)

---

## [v0.1.0] — 2026-06-20 (Foundation)

_Theme: Pull the image, log in, confirm the container is healthy._

### Added

- **Docker image** — multi-stage Alpine build (`node:22-alpine` → `sdk:10.0-alpine` → `aspnet:10.0-alpine`); non-root `fishtank` user; published to Docker Hub as `nicoiodice/fishtank` (`story/1-1`)
- **`GET /health`** — returns HTTP 200 `Healthy`; excluded from SPA fallback; usable as Docker Compose healthcheck and Kubernetes readiness probe (`story/1-1`)
- **SPA fallback** — React shell served at `/`; `/api/**`, `/hubs/**`, `/openapi/**`, `/health` routes excluded from fallback to prevent masking backend errors (`story/1-1`)
- **CI pipeline** — GitHub Actions `test.yml`: lint, unit tests, integration tests; `docker.yml`: Docker build + smoke test on `story/**` and `release/**` branches; auto-publish to Docker Hub on PR merge from `release/v*.*.*` to `main` (`story/1-1`)
- **DevContainer** — `.devcontainer/devcontainer.json` with .NET 10 + Node 22 + Docker-in-Docker; one-click contributor environment in VS Code (`story/1-1`)
- **`CONTRIBUTING.md`** — architecture overview, local dev setup, test commands, PR workflow, commit conventions (`story/1-1`)
- **`SECURITY.md`** — vulnerability reporting process and scope (`story/1-1`)
- **`docker-compose.yml`** — local development environment using SDK images with hot reload (`story/1-1`)
- **`docker-compose.example.yml`** — end-user deployment reference with all environment variables documented (`story/1-1`)
- **`CHANGELOG.md`** — this file; Keep a Changelog format (`story/1-1`)
- **Release workflow** — `docker.yml` auto-tags on PR merge from `release/v*.*.*` to `main`; creates GitHub Release; no manual `git tag` needed (`chore`)
- **`releases.yaml`** — machine-readable release manifest read/written by BMad lifecycle orchestrator (`chore`)
- **SQLite database + EF Core** — auto-migrated at startup; `Users` table (Id, Username, PasswordHash, Role, IsActive, CreatedAt, TokenVersion, ForcePasswordChange) and `ServerConfig` table (BootEpoch GUID for container-lifetime JWT invalidation) (`story/1-2`)
- **JWT Bearer authentication** — httpOnly `fishtank_auth` cookie; `OnTokenValidated` checks BootEpoch + TokenVersion to support instant token invalidation; configurable expiry via `FISHTANK_JWT_EXPIRY_HOURS` (`story/1-2`)
- **`POST /api/auth/setup`** — first-run admin creation; rejects password < 12 chars; returns 409 if already set up (`story/1-2`)
- **`POST /api/auth/login`** — timing-safe BCrypt verification (work factor 12); returns JWT cookie + `forcePasswordChange` field; rate-limited via `FISHTANK_LOGIN_RATE_LIMIT`/`FISHTANK_LOGIN_RATE_WINDOW`; returns 429 + `Retry-After` on breach (`story/1-2`)
- **`POST /api/auth/logout`** — increments TokenVersion (invalidates all existing JWTs); clears `fishtank_auth` cookie (`story/1-2`)
- **`PUT /api/auth/change-password`** — validates new password length; clears `ForcePasswordChange` flag; increments TokenVersion (`story/1-2`)
- **`FirstRunMiddleware`** — blocks all routes except `/health`, `/api/auth/setup`, and `/openapi*` with 401 `AUTH_SETUP_REQUIRED` until first admin is created (`story/1-2`)
- **CORS policy** — configurable origins via `FISHTANK_ALLOWED_ORIGINS`; wildcard `*` rejected at startup (`story/1-2`)
- **Rate limiter** — fixed-window rate limiting on `POST /api/auth/login`; `ForwardedHeaders` middleware ensures per-IP accuracy behind reverse proxies (`story/1-2`)
- **`ApiResponse` envelope** — all auth endpoints return `{success, data}` or `{success:false, error:{code, message}}` (`story/1-2`)
- **Serilog structured logging** — CompactJsonFormatter to stdout from startup through request pipeline (`story/1-2`)
- **React SPA shell** — Vite 8 + React 19 + TypeScript 6 (strict); `react-router-dom` v7 with lazy-loaded routes; `@tanstack/react-query` v5 for server state; SignalR v10 seam factory (`story/1-3`)
- **Authentication UI** — Login page with credential validation, inline error messages, and redirect-back-to-origin support; First-Run Setup page creating the initial admin; Change Password page for forced-rotation flow (`story/1-3`)
- **ProtectedRoute + FirstRunGate** — client-side routing guards: unauthenticated users redirected to `/login`; setup-required users redirected to `/setup`; forced-password-change users redirected to `/setup/change-password` (`story/1-3`)
- **AppShell layout** — responsive top bar (logo, About modal, notification bell, avatar, sign-out), collapsible sidebar (5 nav items, localStorage-persisted collapse state), mobile hamburger overlay (`story/1-3`)
- **4-theme CSS system** — `clean-light` (default), `clean-dark`, `high-contrast-light`, `high-contrast-dark`; CSS custom properties (`--color-*`, `--z-*`); theme persisted to localStorage; system-preference fallback (`story/1-3`)
- **`apiFetch` utility** — typed API client with `credentials: 'include'`, `ApiError` class with typed error codes, non-JSON body handling (nginx 502 HTML), configurable `redirectOn401` (`story/1-3`)
- **Theme picker in Settings → Appearance** — `useTheme` hook reads/writes `data-theme` on `<html>` + `localStorage["fishtank-theme"]`; `AppearanceSettings` component renders 4 radio options (Clean Light, Deep Ocean, Emerald Terminal, Ink & Amber); switching theme is instant with no page reload (`story/1-4`)
- **`support/tools/` Python CLI** — interactive 8-option menu (`fishtank_tool.py`) for managing the Fishtank Docker environment on Windows/WSL2; covers prerequisites check, dependency install, container start/stop, log viewing, health check, project-scoped teardown, and WSL setup guide; launchers for CMD (`run.bat`), PowerShell (`run.ps1`), and bash (`run.sh`); `docker-compose.yml` scoped to `--project-name fishtank`; `.env.example` documents all configurable variables (`story/1-5`)

---

## How to update this file

- **Each story PR** to a release branch should include a CHANGELOG entry under `[Unreleased]`.
- **Each hotfix PR** to `main` should include a `[vX.Y.Z] — YYYY-MM-DD` entry.
- **On release**: move `[Unreleased]` entries to the versioned section (e.g., `[v0.1.0] — 2026-XX-XX`) as part of the final story or the PR to `main`.

### Entry format

```
### Added       — new features
### Changed     — changes to existing functionality
### Deprecated  — features to be removed in a future version
### Removed     — features removed in this version
### Fixed       — bug fixes
### Security    — security fixes (always include CVE/GHSA reference if applicable)
### Dependencies — library/runtime version changes (include old → new)
```

### Linking to stories

Add `(story/X-Y)` at the end of each entry to link it to the originating story. Example:

```markdown
- **Feature name** — description (`story/1-2`)
```