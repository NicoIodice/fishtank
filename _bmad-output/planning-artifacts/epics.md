---
stepsCompleted: [1, 2, 3]
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-Fishtank-2026-06-19/prd.md
  - _bmad-output/planning-artifacts/prds/prd-Fishtank-2026-06-19/addendum.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-designs/ux-Fishtank-2026-06-04/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-Fishtank-2026-06-04/EXPERIENCE.md
---

# Fishtank - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Fishtank, decomposing the requirements from the PRD, UX Design, and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

FR-1: A user can create a new Service by providing a display name (required), optional description, External URL (required), and an assigned port (pre-filled with next available 30100–30199). Service paths (Mocks Root, Mappings, Responses) are auto-generated from the Slug and displayed read-only. A new Service starts in Live state on creation. Port collision writes a System Event and records the Service as Stopped with failure reason.
FR-2: A user can assign one or more free-form text tags to a Service. Tags are stored in the database and used for grouping and filtering in the Services view.
FR-3: A user can stop or start a Service without restarting the Fishtank container. Toggle uses optimistic UI on click; Status pill updates only after server confirmation and reverts on failure.
FR-4: A user can edit a Service's display name, description, External URL, and port. Slug change triggers an inline warning about directory rename. Port and slug uniqueness validation identical to creation.
FR-5: Fishtank reads a JSON seed file at container startup (if configured) and on-demand from the Admin Console. Import is additive: new Services created, existing (matched by Slug) skipped, conflicts surfaced as System Event warnings.
FR-6: A user can view all Services in a card grid (default) or sortable table. Both views surface: name, description, port, External URL, Mocks Root path, mock file count, status pill, and enable/disable toggle. Grid: 3 col (≥1024px) → 2 col (640–1023px) → 1 col (<640px). Empty state with Add Service button. Stopped Services at reduced opacity.
FR-7: The activity log displays each received request with: HTTP method, URL path, HTTP status code, Type (Mocked/Proxied), Service name, DateTime, and response duration. New rows are pushed to the UI in real time via SignalR. Newest-first. In-memory only, cleared on container restart. Row count per Service capped at a configurable maximum. Proxied rows from Live Services show amber left-border accent; 5xx rows show subtle red background.
FR-8: A user can filter the activity log by: search query (case-insensitive contains-match across URL path and HTTP method, AND logic across filter types), Service, and Type (All/Mocked only/Proxied only). Filters cleared in single action, which also resets sort to DateTime descending.
FR-9: A user can open full request/response detail for any logged row: request ID, datetime, method, URL path, Service name and port, Type, HTTP status, redacted request headers, request body, response headers, response body. Three display styles: Modal (default), Right Drawer, Bottom Panel. Preference persisted in Settings. Mobile (<640px): always Modal. Proxied rows include "Save as Mock" action.
FR-10: Headers `Authorization`, `Cookie`, `Set-Cookie`, `X-Api-Key`, `X-Auth-Token`, and any header whose name contains `secret` or `token` (case-insensitive) are redacted at storage time and display as `[REDACTED]`. Explicit opt-in setting in Settings enables full header capture.
FR-11: A user can configure activity log auto-refresh at a defined interval (ms) or disable it for manual refresh. LIVE/PAUSED indicator in page header. Manual refresh icon visible when paused; animates during fetch; respects prefers-reduced-motion.
FR-12: A pill in the Network Activity page header shows total proxied request count for the full unfiltered log. Clicking opens a per-Service proxied-count popover. Count renders in error color if any proxied row has a 5xx status. Services with 0 proxied requests omitted. Empty state: "No proxied requests recorded."
FR-13: A user can clear all rows from the activity log. No confirmation required. Proxy counter pill resets to zero. Record mode remains active if running.
FR-14: A user can initiate "Save as Mock" from any proxied request row or its detail panel, opening the Mock Suggestion modal. "Save as Mock" action shown only on proxied rows. Successful save writes Mapping and Response files to disk, updates folder tree, and closes the detail. Write failure creates a System Event; modal remains open.
FR-15: The Mock Suggestion modal presents an editable Mapping JSON block (WireMock format: WildcardMatcher, method, BodyAsFile, UseTransformer: true) and an editable Response body block pre-populated from the proxied request. User can modify either before saving.
FR-16: A user can enable Record mode from the Network Activity screen to auto-promote every proxied request to a Mapping + Response file pair on disk. Persistent amber Recording badge in page header. Cross-screen recording indicator in top bar when navigating away. Badge changes to warning state if connection drops during recording; resumes automatically on reconnect with a System Event recording the gap.
FR-17: The Mappings screen presents a folder tree (Mocks Root → Service folders → mappings/ → responses/ → files) alongside a file editor pane. Folder tree root label shows the configured Mocks Root path. Active file highlighted. Folder expand/collapse state preserved for session.
FR-18: A user can create, edit, rename, duplicate, and delete Mapping and Response files. All operations write to the volume-mounted filesystem. Delete requires confirmation dialog. Unsaved changes tracked (dot indicator + italic filename). All writes wait for server confirmation; failed writes create System Events. Creating a new file with no Service selected prompts a Service-selection dropdown.
FR-19: The file editor provides a Form view (guided editing of common Mapping fields) and a Raw JSON tab (syntax-highlighted CodeMirror editor). Switching tabs preserves unsaved changes. Advanced WireMock fields always accessible via Raw JSON tab.
FR-20: A user can trigger Resync from the Mappings toolbar to reload all Mapping and Response files from disk for all Services and refresh the folder tree. Resync button disabled during operation with spinner and in-progress toast. Success/failure/partial-success toasts. Conflict detection for externally modified open files. Unsaved changes are never silently discarded.
FR-21: Navigating away from the Mappings screen or signing out while unsaved Mapping edits exist triggers a confirmation prompt before the action proceeds.
FR-22: The System Events screen displays all infrastructure-level events with severity (warning/error/info), message, associated Service (when applicable), and timestamp. Events persisted to database. Engine crash events include root cause. Startup checks surface immediately if volume or DB is inaccessible. All filesystem write failures confirmed via System Events.
FR-23: The top bar displays a notification bell with a badge counting unread warnings and errors. Bell opens a Notification Panel: warnings and errors only, 20 items per page with "Load more" button, per-item mark-as-read and dismiss, "Mark all read" button. Badge: 1–99, "99+" above 99. Empty state: "No warnings or errors — all caught up." Panel closes on any navigation event.
FR-24: Users authenticate with username and password. JWT token issued on success, persisted in httpOnly cookie. Valid until container restart by default. Token expiry configurable via environment variable. No token refresh endpoint in v1.
FR-25: The login endpoint is rate-limited. Requests exceeding the threshold receive HTTP 429 with a Retry-After header. Threshold and window configurable via environment variables.
FR-26: A fresh Fishtank instance with no registered users redirects all traffic to a first-run setup screen that creates exactly one admin account. No other access permitted until setup is complete. Auto-registration is OFF by default.
FR-27: Default admin username is `admin`. Admin password configurable via environment variable. If no password configured, first login forces a password change before any other access.
FR-28: Triggering sign-out while the user has unsaved Mapping edits, an in-progress Add/Edit Service modal, or an unsaved Mocks Root value in Settings shows a confirmation dialog before sign-out proceeds. Dialog title: "Sign out?"
FR-29: Auto-registration (allowing new usernames to self-create accounts) is an explicit opt-in via environment variable or Admin Console toggle. OFF by default. New self-created accounts are Standard User role.
FR-30: All Fishtank features ship enabled by default. Each can be disabled at runtime via the Admin Console or at deploy time via environment variable without container restart. Toggle state persisted in database. Environment variable overrides take precedence. Toggling takes effect immediately for all active sessions (SignalR broadcast).
FR-31: Admin users can view, create, and deactivate user accounts. v1 supports two roles: Admin and Standard User. Deactivating a user invalidates their active JWT tokens.
FR-32: The Admin Console surfaces a health dashboard showing active Services, request counts, database status, and uptime — same state as the /health endpoint.
FR-33: The Admin Console provides a viewer for the audit trail of user-initiated and system-generated actions.
FR-34: Fishtank is published as a Docker image on Docker Hub under a public namespace with semantic versioning tags (latest + version tags). Public GitHub repository with CONTRIBUTING.md, SECURITY.md, and curated good-first-issue backlog at v1 launch. Cross-platform CI smoke tests on every release: Linux, macOS (Apple Silicon + Intel), Windows.
FR-35: Two volume mounts required: project Mocks folder and Fishtank data directory. Container runs as non-root user (UID documented). Seed file mounted read-only. Mocks Root volume unreadable/unwritable at startup → System Event written before any Service starts.
FR-36: All runtime behaviors configurable via environment variables: management port, database path, Mocks Root path, JWT expiry, admin password, auto-registration toggle, login rate-limit parameters, CORS allowed origins, sensitive header capture opt-in, feature toggle overrides, API key for pipeline reset. All defaults documented in README and docker-compose.example.yml.
FR-37: Fishtank persists Services, users, JWT tokens, activity log metadata, audit trail, feature toggle state, and System Events to a SQLite database on the volume-mounted data directory. Mapping and Response files remain on the user's filesystem — never in the database.
FR-38: A /health endpoint returns HTTP 200 when fully initialized and all Services running; HTTP 503 with structured JSON error body if database inaccessible or Mocks Root unreadable. Usable as Docker Compose healthcheck and Kubernetes readiness probe.
FR-39: Fishtank writes structured JSON logs to stdout and rolling daily log files. All errors, Service lifecycle events, and Resync outcomes are logged. Log volume path and retention configurable via environment variable.
FR-40: The Fishtank image is validated on Linux, macOS (Apple Silicon + Intel), and Windows via Docker Desktop on every release. Host-networking differences and volume permission edge cases documented in README. First-run errors produce human-readable messages, not raw stack traces.
FR-41: The Fishtank Docker image deploys as a standard Kubernetes workload. A reference deployment.yaml manifest ships in the repository.
FR-42: A fishtank-demo Docker Hub tag ships pre-seeded with realistic example Services (weather API, payments gateway, user profile service). Zero configuration required — docker run and open browser for a fully operational Fishtank instance with sample data. Built from the same base image as production.
FR-43: The Management API exposes endpoints for all UI operations: Service CRUD, Mapping/Response file CRUD, Resync, Activity log query and clear, System Events query, User management, Feature toggle management. All endpoints (except /health and login) require valid JWT or API key. All responses are JSON. Unauthenticated requests return HTTP 401.
FR-44: An OpenAPI specification for the Management API ships with the repository and is served from the running container at /openapi/v1.json. Versioned alongside the application and updated with every API change.
FR-45: A POST /admin/reset endpoint clears the runtime Activity log and in-memory counters for all Services, then reloads Mappings from disk without restarting the container. Requires a valid pre-shared API key configured via environment variable. No key configured → HTTP 403 with descriptive message.
FR-46: A user can view the current in-memory cache state for each Service (entry count, estimated size) and clear caches at individual Service or global level from Settings → Cache. Cleared caches reload from disk on next request. Admin Console access: available to all authenticated users, not Admin-only.

### Non-Functional Requirements

NFR-1: Management UI initial load (first paint, container already running) completes within 2 seconds on a standard broadband connection. All UI assets served from the container; no CDN dependency at runtime.
NFR-2: Resync completes in under 1 second for a typical mapping set (< 200 files total across all Services), with a progress indicator shown for larger sets.
NFR-3: Activity log rows appear in the UI within 500 ms of the corresponding HTTP request being received by the Service.
NFR-4: The Activity log supports at least 10,000 rows without degrading UI scroll performance below 60 fps. Virtual scrolling or equivalent technique required.
NFR-5: A crash or unresponsiveness in one Service's mock engine must not affect other running Services or the management UI. Each Service runs with an independent fault boundary.
NFR-6: The container starts and serves the management UI within 10 seconds on a standard developer machine (4-core CPU, 8 GB RAM, Docker Desktop).
NFR-7: The /health endpoint responds within 500 ms under normal operating conditions.
NFR-8: All API endpoints except /health and the login endpoint require authentication. Unauthenticated requests return HTTP 401.
NFR-9: Authorization, Cookie, Set-Cookie, X-Api-Key, X-Auth-Token, and headers whose name contains "secret" or "token" (case-insensitive) are redacted by default at storage time. Full header capture is opt-in only.
NFR-10: The login endpoint is rate-limited. Threshold and window are configurable via environment variables.
NFR-11: The CORS policy allows only the origin serving the bundled React UI by default. Additional origins require explicit ALLOWED_ORIGINS environment variable configuration.
NFR-12: The Fishtank container image runs as a non-root user.
NFR-13: The seed file mount is read-only at the container level. Fishtank never writes to it.
NFR-14: The pipeline reset endpoint requires a pre-shared API key. Calls without a valid key return HTTP 401 or HTTP 403.
NFR-15: All destructive UI actions (Mapping file delete, Service disable, bulk log clear) require an explicit confirmation step. Exception: the Service enable/disable toggle uses optimistic UI (the explicit documented exception).
NFR-16: JWT tokens must not be stored in localStorage. Tokens are stored in a secure httpOnly cookie — not localStorage or sessionStorage.
NFR-17: Fishtank writes structured JSON logs to stdout and rolling daily files. All errors, Service lifecycle events, and Resync outcomes are logged.
NFR-18: Every System Event generated by the infrastructure layer is also written to the structured log.
NFR-19: All interactive elements are keyboard-navigable and carry meaningful aria-label attributes where visible text labels are absent. Icon-only buttons always have aria-label. Destructive and primary actions reachable via keyboard without mouse.
NFR-20: The UI meets WCAG 2.1 AA contrast requirements across all four themes. Color-coded indicators are supplemented with text labels or tooltips — color is never the sole signal.
NFR-21: Animated UI elements respect prefers-reduced-motion — static fallbacks provided for all animations (sidebar collapse, live pulse, bottom sheet, toast, notification badge, refresh icon, recording indicator, notification new-pill).

### Additional Requirements (Architecture)

- **Project initialization story required:** Run dual-starter monorepo init commands (.NET minimal API + React/Vite) and verify the full dev environment starts cleanly as the first implementation story. This gates all downstream stories.
- **InternalsVisibleTo must be added to Fishtank.Api.csproj in story 1** (before first integration test story): `<InternalsVisibleTo Include="Fishtank.Api.IntegrationTests" />`. Retrofitting after story 4 is a time sink.
- **Implementation sequence constraint (order mandatory):** (1) DB schema + EF Core migrations — blocks everything; (2) Auth endpoints + JWT cookie middleware — blocks all protected endpoints; (3) WireMock.NET engine layer (dynamic per-service start/stop) — blocks FR-1–6; (4) REST API endpoint groups per feature area; (5) SignalR hubs setup; (6) React Query + SignalR seam contract (queryClient.ts) — blocks all frontend components; (7) FileSystemWatcher — blocks Resync conflict detection.
- **Response envelope** must be applied by all endpoint handlers (except /health, /openapi, static SPA assets); unwrapped by apiFetch<T>() in the frontend API client.
- **GUID primary keys** for all entities; Slug retained as stable external identity for seed file import. API URLs use GUID: /api/services/{guid}.
- **Slug uniqueness enforced at DB level** via unique index on Services.Slug — not application code only.
- **Soft-delete ready:** Service entity includes `DeletedAt DateTimeOffset?`. No deletion UI in v1, but schema must not foreclose it. All queries filter WHERE DeletedAt IS NULL.
- **EF Core auto-migrate at startup** via MigrateAsync(). Wrapped in try/catch; on failure: log Serilog error with {DbPath} and {Exception}, then re-throw for container to terminate with non-zero exit code.
- **JWT in httpOnly cookies only.** SameSite: Strict, Secure: true (when behind TLS). No accessTokenFactory or query-string token workaround needed for SignalR — cookies are included in WebSocket upgrade requests.
- **Rate limiting via ASP.NET Core built-in** (no extra NuGet package) applied to POST /api/auth/login only.
- **CORS:** allow only the origin serving the bundled React SPA by default; additional origins via FISHTANK_ALLOWED_ORIGINS env var.
- **Pipeline reset API key** configured via FISHTANK_PIPELINE_RESET_KEY env var. No key → HTTP 403 with descriptive message.
- **FileSystemWatcher per service folder** (one per Service, watching mappings/ and responses/). IFileWatcher abstraction required so tests can inject a fake watcher without OS timing. README must document inotify ceiling workaround (fs.inotify.max_user_watches=65536) for Linux hosts.
- **Multi-stage Alpine Dockerfile:** node:22-alpine → client build; mcr.microsoft.com/dotnet/sdk:10.0-alpine → server build; mcr.microsoft.com/dotnet/aspnet:10.0-alpine → runtime. Non-root user `fishtank`. apk add libgcc libstdc++ required for Microsoft.Data.Sqlite native binary.
- **WireMock.Net version pinning:** pin to a specific minor version at project init. Patch upgrades automatic; minor requires changelog review.
- **React Query + SignalR seam contract** documented in queryClient.ts before any component is written. Hub invalidation mappings: ServiceStatusChanged→[services], FeatureToggleChanged→[toggles], ResyncCompleted→[mappings]. Activity log rows → SignalR append only, React Query not involved.
- **HUB_INVALIDATION_MAP** defined in queryClient.ts explicitly to prevent cache/push races.
- **Feature toggle broadcast** via /hubs/toggles (SignalR) for immediate propagation to all active sessions.
- **GitHub repository structure** must include: CONTRIBUTING.md, SECURITY.md, curated good-first-issue backlog (minimum 5 issues at launch), .devcontainer/ for OSS contributors.
- **CI/CD workflows** in .github/workflows/: build, test, Docker publish + cross-platform smoke test (Linux, macOS, Windows).
- **OpenAPI spec** served at /openapi/v1.json (built-in Microsoft.AspNetCore.OpenApi). Enables frontend-only contributors to work without .NET knowledge.
- **App shell fallback:** app.MapFallbackToFile("index.html") for all non-API paths (/api/, /hubs/ excluded).
- **Error code prefixes:** SERVICE_*, AUTH_*, MAPPING_*, ENGINE_*, SYSTEM_*, ADMIN_* (screaming snake case).
- **Feature-specific NFR note:** Services page must load and render all Service cards for a 50-Service instance within 1 second of navigation.

### UX Design Requirements

UX-DR1: **Design token system** — Implement all 4 CSS theme classes (`data-theme="clean-light"`, `data-theme="deep-ocean"`, `data-theme="emerald-terminal"`, `data-theme="ink-amber"`) as complete CSS custom property sets matching the exact token values in DESIGN.md (brand, sidebar-bg/fg, topbar, content, border, input, status colors, method chip colors, port badge, type icon colors, row highlight colors, shadow variables, --topbar-icon-fg per theme, --error-row-bg per theme, --success-subtle and --brand-fg in every theme block). Theme system implemented as CSS classes on `<html>` element.
UX-DR2: **Theme persistence** — `prefers-color-scheme` maps to Clean Light (light) / Deep Ocean (dark) on first load only. Once user selects a theme in Settings → Appearance, preference written to `localStorage`. No live sync with prefers-color-scheme changes after selection. If localStorage is cleared, system default applies again on next cold load.
UX-DR3: **Custom SVG logo (hard v1 gate)** — `bi-droplet-half` placeholder must NOT ship as final identity. Custom SVG must be: single-color accepting CSS `fill`, legible at 16×16px (favicon), rendered at 20×20px beside wordmark. Favicon: 32×32px PNG (primary) + 16×16px ICO (fallback). Gate owner: product lead. Cannot ship v1 without this merged.
UX-DR4: **Typography system** — Inter font stack (system fallback — not loaded via CDN). Monospace (`Cascadia Code, Fira Code, Consolas`) for: paths, URLs, GUIDs, JSON bodies, port numbers. Type scale: 2xs(10px), xs(11px), sm(12px), base(14px), md(16px), lg(18px). Table column headers: xs + bold + uppercase + letter-spacing 0.05em. Page titles: md + extrabold. Status pill labels: sm + semibold. Nav items: base + medium. Button labels: base + medium.
UX-DR5: **App shell layout** — Fixed top bar at 44px. Sidebar: expanded 200px (default desktop) / collapsed 52px (icon only, tooltip on hover; touch devices: bottom-label instead of tooltip). Main content area fills available space. Tables: `table-layout: fixed`, `width: 100%`, no `overflow-x` on wrapper, column widths in `<colgroup>`. Content area max-width uncapped.
UX-DR6: **Canonical responsive breakpoints** (exact pixel thresholds from DESIGN.md): Desktop ≥1024px (3-col card grid, sidebar expanded 200px, right drawer), Mid-wide 768–1023px (2-col grid, sidebar collapsible default-collapsed 52px, right drawer, Settings left nav), Mid-narrow 640–767px (2-col grid, sidebar hidden behind hamburger, right drawer, Settings select), Mobile <640px (1-col grid, sidebar hidden behind hamburger, right drawer → bottom sheet, Settings select). These thresholds are independent and intentional — do not collapse into fewer breakpoints.
UX-DR7: **HTTP method chip colors** — All 8 token pairs from DESIGN.md (GET: blue-500/blue-100, POST: emerald-500/emerald-100, PUT: amber-600/amber-200, DELETE: red-500/red-100, PATCH: violet-500/violet-100, other: slate-600/slate-100). Chips are NOT icon-only — they have text + colored background. Contrast must be validated across all 4 themes before v1.
UX-DR8: **Service card** — rounded-card + 1px border. Hover: border → rgba(--brand-rgb, 0.3). Stopped: 72% opacity. Contains: name (bold) + description (muted), port badge (monospace pill, violet-100/violet-700), External URL, mock file count, status pill (Live: green-500 dot with pulse animation; Stopped: slate-500 dot no pulse), enable/disable toggle, Edit link. Only Edit link opens edit modal — clicking name/description area has no action.
UX-DR9: **Network Activity type column** — NOT a text chip. Bootstrap Icons ONLY: Proxied = `bi-arrow-repeat` in emerald-500; Mocked = `bi-database` in blue-500. Tooltip on hover: "Proxied" or "Mocked". Contrast of both colors must be validated against all 4 theme content backgrounds (specific known risk: emerald-500 on Deep Ocean #0f2233 ≈ 4.3:1 — may need per-theme override to #34d399 ≈ 6.8:1).
UX-DR10: **Activity log row highlights** — Both rules may apply simultaneously to the same row: (1) Proxied + Service is currently Live → amber left-border accent `2px solid #f59e0b` on first cell only; (2) HTTP 5xx response → subtle red background `var(--error-row-bg)` on ALL cells (theme variable, not hardcoded rgba). Proxied rows for Stopped services: no amber border.
UX-DR11: **5 component implementations with full spec compliance** from DESIGN.md + EXPERIENCE.md: (1) Top bar: About modal (version, Docker tag, build hash, docs/changelog links from env vars; links hidden if env vars unset), backend-unreachable banner (fixed position top:44px, conditional padding-top on content area); (2) Sidebar: hamburger button with correct ARIA (aria-label, aria-controls="main-sidebar", aria-expanded), mobile overlay backdrop, Admin Console nav item visible to Admin-role only; (3) Notification panel: exact "dismiss vs. mark-as-read" distinction (mark-as-read = item stays visible in read state; dismiss = removed from panel, event stays in System Events), "N new" sticky pill on scroll, correct "Mark all read" visibility logic; (4) Tables: keyboard navigation (arrow keys move focus, Enter opens detail), sticky headers, all three row-detail styles (Modal default, Right Drawer, Bottom Panel), correct Mobile override (always Modal <640px); (5) Network Activity page header element order: hamburger → page title → refresh icon → LIVE/PAUSED → recording badge → [spacer] → proxy pill → Record button → Clear log button.
UX-DR12: **WCAG 2.1 AA contrast audit** — All semantic color tokens must pass 4.5:1 (normal text) or 3:1 (large text / UI components) across all 4 themes. Specific known risks requiring validation and possible per-theme token overrides: (a) Deep Ocean: sidebar-fg raised to slate-400 (#94a3b8 ≈ 5.9:1 on #0d1b2a); (b) Deep Ocean: content-muted raised to slate-400 (#94a3b8 ≈ 5.9:1 on #0f2233); (c) Ink & Amber: sidebar-fg raised to zinc-400 (#a1a1aa ≈ 6.9:1); (d) Ink & Amber: content-muted raised to zinc-600 (#52525b ≈ 7.5:1); (e) icon-proxy-color (emerald-500) on Deep Ocean content background — may require override to #34d399 in Deep Ocean theme block. Gate owner: design lead.
UX-DR13: **prefers-reduced-motion overrides** — Static fallbacks required for all 8 animated elements: sidebar transition, collapse-chevron transform, live-pulse animation, bottom-sheet transition, toast transition, notification-badge animation, refresh-icon animation, cross-screen recording indicator (note: `transition: none` not `animation: none`), notification-new-pill animation. CSS `@media (prefers-reduced-motion: reduce)` block must target actual component class names — illustrative class names in DESIGN.md must be replaced with real Tailwind/shadcn class names before shipping.
UX-DR14: **z-index stack** — 8 layers in ascending order: Sidebar(20), Top bar + backend banner(30), Notification panel(40), Right drawer(50), Modal backdrop(60), Modal/bottom sheet(70), Toast(80), Tooltip(90). Cross-screen recording indicator and notification badge inherit top-bar z-index (30) — never above modals or drawers.
UX-DR15: **Bootstrap Icons** — Bootstrap Icons library (bi-*) required. 20+ specific icons used across components as identified in DESIGN.md and EXPERIENCE.md: bi-server, bi-activity, bi-file-earmark-code, bi-journal-text, bi-gear, bi-chevron-double-left, bi-droplet-half (placeholder logo), bi-info-circle, bi-bell, bi-bell-slash, bi-box-arrow-right, bi-list (hamburger), bi-eye, bi-lightning-charge, bi-arrow-clockwise, bi-arrow-repeat, bi-database, bi-exclamation-triangle, bi-exclamation-circle, bi-funnel. Integration method (CDN vs. npm package vs. SVG sprites) must be decided and implemented consistently.

### FR Coverage Map

FR-1: Epic 2 — Services Management & System Health (create service)
FR-2: Epic 2 — Services Management & System Health (service tags)
FR-3: Epic 2 — Services Management & System Health (enable/disable service)
FR-4: Epic 2 — Services Management & System Health (edit service)
FR-5: Epic 2 — Services Management & System Health (seed file import)
FR-6: Epic 2 — Services Management & System Health (browse services card grid + table)
FR-7: Epic 3 — Network Activity & Request Monitoring (real-time request log)
FR-8: Epic 3 — Network Activity & Request Monitoring (filtering and sorting)
FR-9: Epic 3 — Network Activity & Request Monitoring (row detail — Modal, Right Drawer, Bottom Panel)
FR-10: Epic 3 — Network Activity & Request Monitoring (sensitive header redaction)
FR-11: Epic 3 — Network Activity & Request Monitoring (auto-refresh configuration)
FR-12: Epic 3 — Network Activity & Request Monitoring (proxy counter pill)
FR-13: Epic 3 — Network Activity & Request Monitoring (clear log)
FR-14: Epic 4 — Mappings, Mock Capture & Recording (save proxied request as mock)
FR-15: Epic 4 — Mappings, Mock Capture & Recording (edit mock before saving)
FR-16: Epic 4 — Mappings, Mock Capture & Recording (record mode)
FR-17: Epic 4 — Mappings, Mock Capture & Recording (file explorer — folder tree + editor)
FR-18: Epic 4 — Mappings, Mock Capture & Recording (create, edit, rename, duplicate, delete files)
FR-19: Epic 4 — Mappings, Mock Capture & Recording (dual-mode editor — Form + Raw JSON)
FR-20: Epic 4 — Mappings, Mock Capture & Recording (Resync with conflict detection)
FR-21: Epic 4 — Mappings, Mock Capture & Recording (unsaved change protection on navigation)
FR-22: Epic 2 — Services Management & System Health (System Events log)
FR-23: Epic 2 — Services Management & System Health (notification panel + bell)
FR-24: Epic 1 — Foundation — Authenticated Shell & Running Container (login)
FR-25: Epic 1 — Foundation — Authenticated Shell & Running Container (login rate limiting)
FR-26: Epic 1 — Foundation — Authenticated Shell & Running Container (first-run admin setup)
FR-27: Epic 1 — Foundation — Authenticated Shell & Running Container (default admin credentials)
FR-28: Epic 4 — Mappings, Mock Capture & Recording (sign-out with unsaved change protection)
FR-29: Epic 5 — Admin Console & User Management (auto-registration toggle)
FR-30: Epic 5 — Admin Console & User Management (feature toggles)
FR-31: Epic 5 — Admin Console & User Management (user management)
FR-32: Epic 5 — Admin Console & User Management (health dashboard)
FR-33: Epic 5 — Admin Console & User Management (audit log viewer)
FR-34: Epic 1 (GitHub repo + CI structure) + Epic 6 (finalize Docker Hub publishing + automated release pipeline)
FR-35: Epic 1 — Foundation — Authenticated Shell & Running Container (volume config + non-root user)
FR-36: Epic 1 (core env vars) + Epic 6 (pipeline reset API key env var)
FR-37: Epic 1 — Foundation — Authenticated Shell & Running Container (SQLite + EF Core)
FR-38: Epic 1 — Foundation — Authenticated Shell & Running Container (health endpoint)
FR-39: Epic 1 — Foundation — Authenticated Shell & Running Container (structured logging)
FR-40: Epic 1 (cross-platform Docker base) + Epic 6 (cross-platform CI smoke tests on release)
FR-41: Epic 6 — Release Polish & Distribution (K8s deployment.yaml)
FR-42: Epic 6 — Release Polish & Distribution (demo Docker image)
FR-43: Epic 6 — Release Polish & Distribution (REST API surface parity verification — built progressively in Epics 2–5)
FR-44: Epic 6 — Release Polish & Distribution (OpenAPI spec)
FR-45: Epic 6 — Release Polish & Distribution (pipeline reset endpoint)
FR-46: Epic 2 — Services Management & System Health (service cache management in Settings)

## Epic List

### Epic 1: Foundation — Authenticated Shell & Running Container

A developer can pull the Fishtank Docker image, start the container, complete first-run admin setup, log in to the management UI, and confirm the container is healthy via the `/health` endpoint. The full project scaffold (dual-starter monorepo), CI pipeline, authentication system (JWT in httpOnly cookies, rate-limited login, first-run setup), SQLite persistence with EF Core auto-migrate, Alpine Docker image, and the complete app shell (top bar, sidebar, responsive layout, theme infrastructure, login + setup screens) are fully operational. The React Query + SignalR seam contract is established as infrastructure before any hub connections are wired.

**FRs covered:** FR-24, FR-25, FR-26, FR-27, FR-34 (GitHub repo + CI structure), FR-35 (volumes + non-root user), FR-36 (core env vars: management port, DB path, JWT expiry, admin password, rate-limit params, CORS), FR-37 (SQLite + EF Core auto-migrate), FR-38 (health endpoint), FR-39 (structured logging), FR-40 (cross-platform Docker base)

**Architecture items:**
- Dual-starter monorepo init: `dotnet new sln/webapi/xunit` + `npm create vite@latest client -- --template react-ts` + `npx shadcn@latest init -t vite`
- `InternalsVisibleTo` added to `Fishtank.Api.csproj` before first integration test story
- DB schema: Users table + EF Core migrations; `MigrateAsync()` at startup wrapped in try/catch
- **`TokenVersion` integer column on Users entity** — enables JWT invalidation in Epic 5 without auth layer retrofit; JWT validation middleware checks this column against the token claim
- Auth endpoints (`POST /api/auth/login`, `POST /api/auth/logout`) + JWT cookie middleware (httpOnly, SameSite: Strict)
- ASP.NET Core built-in rate limiting applied to login endpoint only
- CORS: self-origin default, `FISHTANK_ALLOWED_ORIGINS` env var for additional origins
- Alpine Dockerfile (multi-stage: `node:22-alpine` → `sdk:10.0-alpine` → `aspnet:10.0-alpine`); non-root user `fishtank`; `apk add libgcc libstdc++`
- CI workflows: build, unit tests, integration tests, Docker smoke test
- **`queryClient.ts` seam contract skeleton + `HUB_INVALIDATION_MAP` structure established** as infrastructure — no hub connections yet, but the contract is defined before any frontend component touches SignalR
- `signalr.ts` hub connection factory (also established here, unused until Epic 2)
- React app shell: top bar (logo slot with `bi-droplet-half` placeholder, About icon, notification bell stub, avatar stub), sidebar (nav items, collapse toggle, hamburger at < 768px), responsive layout (4 canonical breakpoints)
- Login screen + first-run setup screen

**UX-DRs covered:**
- UX-DR1: Theme CSS variable infrastructure + Clean Light theme fully implemented. **Themes 2–4 (Deep Ocean, Emerald Terminal, Ink & Amber) are non-blocking stories within Epic 1 — they do not gate Epic 2's critical path and can be completed in any order relative to Epic 2 stories.**
- UX-DR2: Theme persistence (localStorage + `prefers-color-scheme` first-load default)
- ~~UX-DR3~~: **Logo slot designed and placed (UX-DR5 app shell); `bi-droplet-half` placeholder used during all development. Custom SVG logo (UX-DR3) is a standalone pre-ship gate story — tracked separately, must complete before v1 tags, can be worked in parallel with any epic.**
- UX-DR4: Typography system (Inter stack, type scale, weight scale, monospace for paths/ports/JSON)
- UX-DR5: App shell layout (fixed top bar 44px, sidebar 200px/52px, main content)
- UX-DR6: Canonical responsive breakpoints (all 4 thresholds from DESIGN.md)
- UX-DR13: `@media (prefers-reduced-motion: reduce)` CSS block established with static fallbacks for all 8 animated elements (populated progressively as those elements are built in later epics)
- UX-DR14: z-index stack (8 layers, sidebar 20 → tooltip 90)
- UX-DR15: Bootstrap Icons library integration

**NFRs addressed:** NFR-6 (10s container start), NFR-8 (auth required on all endpoints), NFR-10 (login rate limiting), NFR-11 (CORS self-origin default), NFR-12 (non-root container), NFR-16 (JWT in httpOnly cookie)

---

### Epic 2: Services Management & System Health

Users can define, configure, tag, enable/disable, and browse all mock services from the management UI. The WireMock mock engine starts listening on assigned ports immediately on service creation. Infrastructure warnings (port conflicts, volume errors, startup failures) surface in the System Events screen and notification bell with real-time SignalR badge updates. Service in-memory caches are visible and clearable from Settings. **Epic 2 "done" = a user can import or create services with volume-mounted WireMock mappings, have the mock engine serve requests end-to-end, and see infrastructure events when things go wrong — without waiting for Epic 4.**

**FRs covered:** FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-22, FR-23, FR-46

**Architecture items:**
- WireMock.NET engine layer: `ServiceManager.cs` — dynamic per-service start/stop on separate ports, independent fault boundaries (NFR-5). WireMock.Net pinned to specific minor version.
- `ServicesEndpoints.cs`, `SystemEventsEndpoints.cs` — response envelope on all endpoints
- `EventsHub.cs` (SignalR) — notification badge real-time updates. **Connects to the `queryClient.ts` seam contract already established in Epic 1; `ServiceStatusChanged` and hub invalidation mappings wired immediately.**
- `ServicesHub.cs` (SignalR) — Service status change broadcasts
- Services + SystemEvents DB tables + EF Core migrations; GUID PKs; slug uniqueness DB index; soft-delete schema (`DeletedAt DateTimeOffset?` on Services)
- **`<DataTable>` base component story** — shared table anatomy: base `<DataTable>` React component, shared row behavior (hover, keyboard navigation, arrow keys / Enter for row detail), three row-detail style variant stubs (Modal, Right Drawer, Bottom Panel props — render empty at first). Each subsequent epic *activates* a variant rather than inventing one.
- Settings → Cache sub-section (FR-46): per-service in-memory cache entry count + estimated size, Clear and Clear All with confirmation dialogs
- `GET /api/services`, `POST /api/services`, `GET /api/services/{id}`, `PUT /api/services/{id}`, `POST /api/services/{id}/start`, `POST /api/services/{id}/stop`, `POST /api/services/import`, `GET /api/events`, `GET /api/settings` (partial)

**UX-DRs covered:**
- UX-DR8: Service card (full spec — Live pulse animation, Stopped opacity, hover brand-color border, port badge, Edit link)
- UX-DR11: Service card component + notification panel (full pagination, dismiss vs. mark-as-read distinction, "N new" sticky pill, "Mark all read" visibility logic) + `<DataTable>` base component (established here, extended in Epics 3–4)

**NFRs addressed:** NFR-5 (per-service fault isolation), NFR-7 (health endpoint response time), NFR-15 (destructive confirmations — cache clear, service toggle exception documented), NFR-17 (structured logging for service lifecycle events), NFR-18 (System Events → structured log)

---

### Epic 3: Network Activity & Request Monitoring

Users can monitor all HTTP requests hitting their mock services in real time, filter and sort the activity log by method/service/type, inspect full request/response detail in their preferred display style (Modal, Right Drawer, or Bottom Panel), configure auto-refresh, and understand exactly what matched vs. was proxied.

**FRs covered:** FR-7, FR-8, FR-9, FR-10, FR-11, FR-12, FR-13

**Architecture items:**
- `ActivityHub.cs` (SignalR) — activity rows pushed in real time (<500ms, NFR-3). **Extends the `queryClient.ts` seam contract** from Epic 1: activity log feed is SignalR-only (React Query not involved); `ResyncCompleted` → `[["mappings"]]` invalidation added to `HUB_INVALIDATION_MAP`.
- Activity log in-memory store (per-service, capped at configurable maximum, cleared on container restart — never persisted to disk)
- `ActivityEndpoints.cs` — `GET /api/activity`, `DELETE /api/activity`
- Header redaction at storage time (NFR-9) — `[REDACTED]` value, opt-in capture via Settings
- Virtual scrolling (NFR-4 — 10,000 rows at 60fps)
- All 3 row-detail styles fully activated: Modal (default), Right Drawer (320px desktop, bottom sheet mobile <640px), Bottom Panel (Request/Response tabs). Builds on `<DataTable>` base from Epic 2.
- Settings → Appearance: row detail style preference (persisted in Settings); Settings → Activity: auto-refresh interval, header redaction opt-in

**UX-DRs covered:**
- UX-DR7: HTTP method chip colors (all 8 token pairs — GET, POST, PUT, DELETE, PATCH, other; contrast validated)
- UX-DR9: Network Activity type column — Bootstrap Icons only (`bi-database` Mocked, `bi-arrow-repeat` Proxied), tooltips; per-theme contrast validation including Deep Ocean override if needed
- UX-DR10: Row highlight rules (amber left-border proxied+live; red background 5xx; both can apply simultaneously)
- UX-DR11: Tables — all 3 row-detail styles activated; keyboard navigation (arrow keys, Enter); sticky headers; Bottom Panel tabs
- UX-DR12: **WCAG spot-check** on Network Activity screen components (token system contrast spot-check was done at end of Epic 1; this epic adds the first high-density color surface). **Full WCAG 2.1 AA audit across all 4 themes is a standalone pre-ship gate story — scheduled after Epic 4 closes, before v1 tags.**
- UX-DR13: Refresh icon non-animation (`prefers-reduced-motion`), notification badge pulse suppression

**NFRs addressed:** NFR-1 (2s initial load), NFR-3 (500ms row push latency), NFR-4 (10k rows at 60fps), NFR-9 (header redaction), NFR-19 (keyboard navigation), NFR-20 (WCAG — spot-check here, full audit pre-ship), NFR-21 (prefers-reduced-motion)

---

### Epic 4: Mappings, Mock Capture & Recording

Users can browse, create, edit, rename, duplicate, and delete Mapping and Response files directly in the browser without touching the filesystem. From the activity log, users can save any proxied request as a permanent mock stub, or enable Record mode to auto-capture all proxied traffic. Resync reloads all file changes from disk with full conflict detection for externally modified files. Navigation and sign-out are guarded against unsaved edits.

**FRs covered:** FR-14, FR-15, FR-16, FR-17, FR-18, FR-19, FR-20, FR-21, FR-28

**Architecture items:**
- `MappingService.cs` — file CRUD backend (create, read, write, rename, duplicate, delete on volume-mounted filesystem)
- **`IFileWatcher` abstraction** (interface in `Engine/`) + **fake watcher test harness** (injected in xUnit tests — no OS timing / no flakiness) + **`_lastKnownModified Dictionary<string, DateTimeOffset>` per service** — all three consolidated here, not split across Epic 2. Conflict detection: file open in editor + `LastWriteTime` advanced since editor load → conflict banner.
- `MappingsEndpoints.cs` — `GET /api/mappings`, `POST /api/mappings`, `PUT /api/mappings/{path}`, `DELETE /api/mappings/{path}`, `POST /api/resync`
- Resync broadcast via `ServicesHub` (already wired in Epic 2)
- CodeMirror editor (`@uiw/react-codemirror` + `@codemirror/lang-json` + `@codemirror/theme-one-dark`) — Raw JSON tab in file editor
- Mock Suggestion modal (FR-14–15): editable Mapping JSON + Response body blocks, pre-populated from proxied request, lighter syntax highlighting (not full CodeMirror)
- Record mode (FR-16): Recording badge in Network Activity header, cross-screen recording indicator in top bar, connection-loss warning state, System Event on reconnect with gap duration
- Settings → Mocks Root path configuration (displayed read-only; change triggers inline warning and requires Resync)
- Navigation guard (React Router `useBlocker`) and sign-out guard (FR-28) for unsaved Mapping edits + pending Mocks Root path

**UX-DRs covered:**
- UX-DR11: Actions column icons (`bi-eye` always, `bi-lightning-charge` proxied rows only) — activates the last variant of the `<DataTable>` base component from Epic 2
- UX-DR13: Recording badge animation + cross-screen recording indicator (`transition: none` override, not `animation: none`)

**NFRs addressed:** NFR-2 (Resync <1s for <200 files), NFR-15 (file delete confirmation dialog), NFR-21 (recording badge + recording indicator prefers-reduced-motion)

---

### Epic 5: Admin Console & User Management

Admin-role users can manage user accounts (create, view, deactivate), control Fishtank feature availability via runtime toggles (no restart required), monitor system health metrics, and review the full audit trail. JWT tokens are invalidated immediately when a user is deactivated, using the `TokenVersion` mechanism established in Epic 1.

**FRs covered:** FR-29, FR-30, FR-31, FR-32, FR-33

**Architecture items:**
- `TogglesHub.cs` (SignalR) — feature toggle state broadcast to all active sessions immediately on toggle change (D7). `FeatureToggleChanged` → `[["toggles"]]` invalidation added to `HUB_INVALIDATION_MAP`.
- `AdminEndpoints.cs` — `GET/PUT /api/admin/toggles/{name}`, `GET /api/users`, `POST /api/users`, `PUT /api/users/{id}/deactivate`, `GET /api/admin/health`, `GET /api/admin/audit`
- AuditLog DB table + EF Core migration
- **User deactivation → JWT invalidation** via `TokenVersion` increment: middleware already validates token version against DB (established in Epic 1); deactivation increments the user's `TokenVersion` → all existing tokens immediately rejected on next request
- Feature toggle: DB state + env var override precedence (env var takes precedence on container startup; cannot be overridden via Admin Console for current container lifetime)
- Admin Console nav item: visible to Admin-role only (route `/admin` redirects Standard Users to `/services`)
- Settings → Appearance: theme selector (Settings → Appearance sub-section; themes 2–4 must be completed from Epic 1's non-blocking stories before this story closes)

**UX-DRs covered:**
- UX-DR11: Admin Console nav item — Admin-role visibility only (EXPERIENCE.md spec for sidebar conditional rendering)

**NFRs addressed:** NFR-8 (auth required), NFR-15 (user deactivation confirmation)

---

### Epic 6: Release Polish & Distribution

The Fishtank v1 image is published on Docker Hub with a pre-seeded demo image, the OpenAPI spec is finalized and served from the container, a pipeline reset endpoint enables automated CI/CD test environment cleanup, and the project ships with all community resources at launch. **Note: The REST API surface (FR-43) was built progressively in Epics 2–5 as each feature's REST endpoints were implemented. Epic 6 verifies completeness, publishes the spec, and adds the one discrete new API endpoint (pipeline reset) — it is not building a new API product.**

**FRs covered:** FR-34 (finalize Docker Hub publishing + automated release pipeline), FR-36 (pipeline reset API key env var), FR-40 (cross-platform CI smoke tests on every release), FR-41 (K8s deployment.yaml), FR-42 (fishtank-demo image), FR-43 (REST API surface parity verification), FR-44 (OpenAPI spec finalized + served), FR-45 (pipeline reset endpoint)

**Architecture items:**
- OpenAPI spec review: verify all endpoints documented, response schemas accurate, envelope wrapper typed correctly, served at `/openapi/v1.json`
- `POST /admin/reset` endpoint — `FISHTANK_PIPELINE_RESET_KEY` env var auth (distinct from JWT tokens); no key configured → HTTP 403 with descriptive message; clears in-memory activity log + reloads mappings from disk without container restart
- `fishtank-demo` Docker image: seed data (weather API, payments gateway, user profile service example services with realistic mappings), built from same base image as production
- Automated release CI workflow: build → test → cross-platform smoke test (Linux, macOS, Windows runners) → Docker Hub publish (`latest` + version tags)
- K8s `deployment.yaml` reference manifest in repository root
- `CONTRIBUTING.md`: architecture overview in ≤10 minutes, tech stack, project structure, local dev setup (devcontainer), PR workflow
- `SECURITY.md`: vulnerability reporting + responsible disclosure process
- Curated `good first issue` backlog (minimum 5 issues at launch)
- README: animated GIF or screen recording at top, architecture overview, quick-start (docker run in one command), environment variable reference table

**NFRs addressed:** NFR-1 (2s UI load confirmed at scale — validated in release smoke tests), NFR-7 (/health endpoint SLA), NFR-13 (seed file read-only mount), NFR-14 (pipeline reset API key required)

---

## Pre-Ship Gate Stories (tracked separately — block v1 tagging)

These two stories are not assigned to a specific epic's sequential delivery. They can be worked in parallel with any epic and must both be complete before v1 is tagged for release:

**PSG-1: Custom SVG Logo (UX-DR3)**
Design and merge a custom single-color SVG logo (replaces `bi-droplet-half` placeholder). Requirements: accepts CSS `fill` property for theme adaptation, legible at 16×16px (favicon use), rendered at 20×20px beside wordmark. Deliverables: final SVG merged to main, `favicon.png` (32×32px primary) + `favicon.ico` (16×16px fallback) generated and verified. Gate owner: product lead. **Cannot ship v1 without this.**

**PSG-2: Full WCAG 2.1 AA Contrast Audit (UX-DR12)**
Audit all color token combinations across all 4 themes against WCAG 2.1 AA thresholds (4.5:1 normal text, 3:1 large text/UI). Covers all components built in Epics 1–5. Known risks requiring specific validation: Deep Ocean sidebar-fg, Deep Ocean content-muted, Ink & Amber sidebar-fg, Ink & Amber content-muted, icon-proxy-color on Deep Ocean content background. Any failures result in per-theme token overrides added to the CSS blocks. Must be scheduled after Epic 4 closes when the full component surface area exists. **Cannot ship v1 without this.**

---

## Epic 1: Foundation — Authenticated Shell & Running Container

A developer can pull the Fishtank Docker image, start the container, complete first-run admin setup, log in to the management UI, and confirm the container is healthy via the `/health` endpoint. The full project scaffold (dual-starter monorepo), CI pipeline, authentication system (JWT in httpOnly cookies, rate-limited login, first-run setup), SQLite persistence with EF Core auto-migrate, Alpine Docker image, and the complete app shell (top bar, sidebar, theme infrastructure, responsive layout, login + setup screens) are fully operational. The React Query + SignalR seam contract is established as infrastructure before any hub connections are wired.

### Story 1.1: Project Scaffold, Docker Image & CI Pipeline

As a developer contributing to Fishtank,
I want a complete project monorepo with a working Docker build and CI pipeline,
So that all subsequent development has a clean, testable foundation with automated quality gates from day one.

**Acceptance Criteria:**

**Given** the repository is cloned and Docker is running,
**When** `docker compose up` is run from the repository root,
**Then** the container starts and `GET /health` responds HTTP 200 within 10 seconds (NFR-6).

**Given** the container is running,
**When** `GET /health` is called,
**Then** HTTP 200 is returned with a structured JSON body indicating healthy status (FR-38).

**Given** the database is inaccessible or the Mocks Root volume is unreadable at startup,
**When** `GET /health` is called,
**Then** HTTP 503 is returned with a JSON body containing a machine-readable `reason` code and human-readable `message` (FR-38).

**Given** the container is running,
**When** any application event occurs (startup, request, error, lifecycle),
**Then** structured JSON logs are written to stdout via Serilog with `Serilog.Formatting.Compact` (FR-39, NFR-17).

**Given** the Docker image is built,
**When** the running process is inspected,
**Then** it executes as the non-root user `fishtank` — not root (NFR-12, FR-35).

**Given** the multi-stage Dockerfile,
**When** the image is built,
**Then** the build sequence is: `node:22-alpine` (client build) → `sdk:10.0-alpine` (server build) → `aspnet:10.0-alpine` (runtime); `apk add libgcc libstdc++` is present in the runtime stage; compiled SPA output is copied to `wwwroot/`.

**Given** a push to the main branch,
**When** the CI pipeline runs,
**Then** it executes in order: build → unit tests → integration tests → Docker image build → smoke test (container starts and `/health` returns 200) — all must pass (FR-34 partial, FR-40 partial). **Note:** Epic 1 CI runs on Linux runners only; macOS (Apple Silicon + Intel) and Windows runner validation is added in Epic 6 Story 6.4 — cross-platform failures may not be caught until that story runs.

**Given** the project scaffold,
**When** `dotnet test` is run,
**Then** both `Fishtank.Api.UnitTests` and `Fishtank.Api.IntegrationTests` projects are discovered and all tests pass (0 tests initially — empty suites pass).
**And** `Fishtank.Api.csproj` contains `<InternalsVisibleTo Include="Fishtank.Api.IntegrationTests" />`.

**Given** `docker-compose.yml` (dev) and `docker-compose.example.yml` (user-facing) in the repository root,
**When** a user opens `docker-compose.example.yml`,
**Then** it contains both required volume mounts, all core environment variables with inline comments, and a seed file reference — ready to copy-paste (FR-36 partial, FR-35).

**Given** the Mocks Root or data directory volumes are not mounted,
**When** the container starts,
**Then** startup logs include a human-readable warning (not a raw stack trace) about the missing volume (FR-35, FR-40).

---

### Story 1.2: Database, Authentication Backend & First-Run Logic

As an admin,
I want the Fishtank backend to handle authentication securely with JWT tokens in httpOnly cookies,
So that the management UI is protected and I can set up the initial admin account on a fresh deployment.

**Acceptance Criteria:**

**Given** a fresh Fishtank instance with no registered users,
**When** any endpoint except `GET /health` and `POST /api/auth/setup` is called,
**Then** HTTP 401 is returned — setup is the only permitted action until the admin account exists (FR-26, NFR-8).

**Given** a fresh instance,
**When** `POST /api/auth/setup` is called with a valid username + password,
**Then** HTTP 200 is returned, exactly one admin account is created, and the response sets a `Set-Cookie` header with an `HttpOnly; SameSite=Strict` JWT token; a second call returns HTTP 409 — setup is a one-time operation (FR-26).

**Given** any password submitted to `POST /api/auth/setup`, `PUT /api/auth/change-password`, or `POST /api/users`,
**Then** it must be at least 12 characters; shorter passwords return HTTP 400 with error code `AUTH_PASSWORD_TOO_SHORT` and a human-readable message — no character-type requirements in v1 beyond length (FR-26, FR-27, FR-31 security baseline).

**Given** an existing admin account,
**When** `POST /api/auth/login` is called with correct credentials,
**Then** HTTP 200 is returned with a `Set-Cookie` header containing the JWT (httpOnly, SameSite: Strict) (FR-24, NFR-16).

**Given** `POST /api/auth/login` called with incorrect credentials,
**Then** HTTP 401 is returned with a generic message that does not reveal which field was wrong (FR-24).

**Given** a valid JWT cookie,
**When** any protected API endpoint is called,
**Then** the request proceeds; when the cookie is absent, expired, or the `TokenVersion` in the token does not match the Users table, HTTP 401 is returned (NFR-8, FR-24).

**Given** login attempts exceeding the configured rate limit,
**Then** HTTP 429 is returned with a `Retry-After` header; threshold and window configurable via `FISHTANK_LOGIN_RATE_LIMIT` and `FISHTANK_LOGIN_RATE_WINDOW` env vars (FR-25, NFR-10).

**Given** `FISHTANK_ADMIN_PASSWORD` is not set,
**When** the default `admin` account first logs in,
**Then** the API returns a forced-password-change flag before any other access is granted (FR-27).

**Given** `POST /api/auth/logout`,
**Then** the JWT cookie is cleared and HTTP 200 is returned (FR-24).

**Given** the `Users` table,
**Then** it contains: `Id` (GUID PK), `Username` (unique), `PasswordHash`, `Role` (Admin|StandardUser), `IsActive` (bool, default true), `CreatedAt` (DateTimeOffset), `TokenVersion` (int, default 0), `ForcePasswordChange` (bool, default false).
**And** when `ForcePasswordChange` is true, the login response includes `"forcePasswordChange": true`; the frontend redirects to the password-change form (consistent with the forced-password-change state in Story 1.3); `PUT /api/auth/change-password` resets the flag to false after a successful password update.
**And** EF Core auto-migrate runs at startup; on failure a structured Serilog error is logged and the app terminates with non-zero exit code (FR-37).

**Given** the CORS policy,
**When** a request arrives from an origin other than the management port,
**Then** it is rejected by default; origins in `FISHTANK_ALLOWED_ORIGINS` (comma-separated) are permitted (NFR-11, FR-36).

**Given** all API responses,
**Then** they use the standard response envelope `{"success":true,"data":{}}` / `{"success":false,"error":{"code":"AUTH_*","message":"..."}}` — applied to all endpoints except `/health`, `/openapi`, and static SPA assets.

---

### Story 1.3: React App Shell, Login & First-Run Setup Screens

As a developer using Fishtank,
I want a complete application shell with responsive navigation, the Clean Light theme, and functional login and setup screens,
So that I can access the management UI securely and navigate between all sections.

**Acceptance Criteria:**

**Given** the app loads at the management port URL without a valid JWT cookie,
**Then** the browser redirects to `/login` (FR-24).

**Given** a fresh instance with no registered users,
**When** the app loads,
**Then** the browser redirects to `/setup` regardless of the requested route (FR-26).

**Given** the `/login` screen,
**When** valid credentials are submitted,
**Then** the JWT cookie is set and the browser navigates to `/services`.
**When** invalid credentials are submitted,
**Then** an inline error message is shown without clearing the username field (FR-24).

**Given** the `/setup` screen,
**When** a valid admin username + password are submitted,
**Then** the account is created, the JWT cookie is set, and the browser navigates to `/services` (FR-26).

**Given** a forced-password-change state (FR-27),
**When** the user logs in,
**Then** a password-change form is shown and `/services` is blocked until the password is changed.

**Given** the authenticated app shell,
**Then** the top bar renders at fixed 44px with: logo slot (`bi-droplet-half` placeholder + "Fishtank" wordmark), About icon (`bi-info-circle`), notification bell stub (`bi-bell`, badge hidden), user avatar with sign-out dropdown (sign-out guard deferred to Epic 4 Story 4.6) (UX-DR5).

**Given** the "Sign out" option in the user avatar dropdown is clicked (with no unsaved state — guard is deferred to Story 4.6),
**Then** `POST /api/auth/logout` is called; on success the JWT cookie is cleared server-side and the browser navigates to `/login`; on network failure an error toast is shown and the session remains active (FR-24 frontend logout path).

**Given** the About icon (`bi-info-circle`) is clicked,
**Then** the About modal opens showing: Fishtank version (`FISHTANK_VERSION` env var, or "dev" if unset), Docker tag (`FISHTANK_DOCKER_TAG` env var), build hash (`FISHTANK_BUILD_HASH` env var), documentation link (`FISHTANK_DOCS_URL` env var), changelog link (`FISHTANK_CHANGELOG_URL` env var); any item whose env var is unset is hidden — not rendered as a broken or empty link (UX-DR11).

**Given** desktop (≥1024px),
**Then** the sidebar is expanded (200px) with all nav items and correct Bootstrap Icons: Services (`bi-server`), Network Activity (`bi-activity`), Mappings (`bi-file-earmark-code`), System Events (`bi-journal-text`), Settings (`bi-gear`), collapse toggle (`bi-chevron-double-left`) at bottom (UX-DR5, UX-DR15).

**Given** viewport < 768px,
**Then** the sidebar is hidden and a hamburger button (`bi-list`, `aria-label="Open navigation"` when closed / `aria-label="Close navigation"` when open, `aria-controls="main-sidebar"`, `aria-expanded` mirroring state) is visible; the sidebar element carries `id="main-sidebar"`; opening the sidebar shows a `rgba(0,0,0,0.4)` backdrop; tapping the backdrop closes the sidebar (UX-DR5).

**Given** any viewport,
**Then** the 4 canonical responsive breakpoints from DESIGN.md are functional: 3-col card grid (≥1024px) → 2-col (640–1023px) → 1-col (<640px); sidebar 200px expanded (≥1024px) → 52px default-collapsed (768–1023px) → hidden hamburger (<768px); Settings sub-nav left-nav (≥768px) → `<select>` (<768px) (UX-DR6).

**Given** the `/settings` route,
**Then** the Settings page renders with its sub-navigation structure (4 sections): Appearance, Activity, Cache, Mocks Root — sub-nav is a left-nav panel at ≥768px and a `<select>` at <768px; each section shows a placeholder ("Configured in a later story") until populated by the responsible story (Appearance → Story 1.4; Activity → Story 3.3; Cache → Story 2.5; Mocks Root → Story 4.2) (UX-DR5, UX-DR6 Settings sub-nav spec).

**Given** the Clean Light theme (`data-theme="clean-light"` on `<html>`),
**Then** all CSS custom properties from DESIGN.md Clean Light token block resolve correctly including `--topbar-icon-fg: #1e293b`, `--error-row-bg: rgba(239,68,68,.04)`, `--success-subtle`, `--brand-fg` (UX-DR1).

**Given** `src/client/src/lib/queryClient.ts`,
**Then** it exports a configured `QueryClient` instance and defines `HUB_INVALIDATION_MAP` as a typed `Record<string, QueryKey[]>` constant (initially empty — populated in subsequent epics); `src/client/src/lib/signalr.ts` exports a hub connection factory function.

**Given** the global stylesheet,
**Then** a `@media (prefers-reduced-motion: reduce)` block is present with `transition: none` / `animation: none` overrides for all 8 animated element classes from DESIGN.md — aligned to actual Tailwind/shadcn class names (UX-DR13).

**Given** all typography tokens,
**Then** table column headers: xs + bold + uppercase + letter-spacing 0.05em; page titles: md + extrabold; nav items: base + medium; timestamps: sm + muted (UX-DR4).

**Given** the z-index stack,
**Then** sidebar=20, top bar=30, notification panel=40, right drawer=50, modal backdrop=60, modal=70, toast=80, tooltip=90 (UX-DR14).

**Given** all assets served from the container,
**When** the initial page renders (container already running),
**Then** it completes within 2 seconds on a standard broadband connection (NFR-1).

---

### Story 1.4: Additional UI Themes — Deep Ocean, Emerald Terminal, Ink & Amber

*⚠️ Non-blocking — does not gate any Epic 2 story. Can be worked at any point after Story 1.3.*

As a user,
I want to switch between Deep Ocean, Emerald Terminal, and Ink & Amber themes in Settings → Appearance,
So that I can use Fishtank in a visual environment that suits my workflow and lighting conditions.

**Acceptance Criteria:**

**Given** the Settings → Appearance section,
**When** a user selects a theme from the 4-option selector,
**Then** the `data-theme` attribute on `<html>` updates immediately and all CSS custom properties resolve to that theme's tokens; the selection is written to `localStorage`; on reload that theme loads without reverting to `prefers-color-scheme` (UX-DR1, UX-DR2).

**Given** no theme in `localStorage` and `prefers-color-scheme: dark` on first load,
**Then** Deep Ocean is applied; with light or unset, Clean Light is applied — first-load only (UX-DR2).

**Given** the Deep Ocean theme,
**Then** all CSS properties from the DESIGN.md Deep Ocean block are applied: `sidebar-fg: #94a3b8` (~5.9:1 WCAG AA), `content-muted: #94a3b8`, `error-row-bg: rgba(239,68,68,.10)`, `--shadow-raised: 0 4px 16px rgba(0,0,0,.40)`, `--shadow-overlay: 0 8px 40px rgba(0,0,0,.60)` (UX-DR1).

**Given** the Emerald Terminal theme,
**Then** all CSS properties from the DESIGN.md Emerald Terminal block are applied including `topbar-icon-fg: #ffffff` (UX-DR1).

**Given** the Ink & Amber theme,
**Then** all CSS properties from the DESIGN.md Ink & Amber block are applied: `sidebar-fg: #a1a1aa` (~6.9:1), `content-muted: #52525b` (~7.5:1), `topbar-icon-fg: #ffffff` (UX-DR1).

**Given** any active theme,
**Then** `--success-subtle` and `--brand-fg` are defined in every theme block; `--topbar-icon-fg` correctly contrasts with `--topbar-bg`; hover background on dark topbars is `rgba(255,255,255,.08)`, on Clean Light topbar is `rgba(0,0,0,.05)` (UX-DR1).

---

## Epic 2: Services Management & System Health

Users can define, configure, tag, enable/disable, and browse all mock services from the management UI. The WireMock mock engine starts listening on assigned ports immediately on service creation. Infrastructure warnings surface in the System Events screen and notification bell with real-time SignalR badge updates. Service caches are manageable from Settings. **Epic 2 "done" = a user can import or create services with volume-mounted WireMock mappings, have the mock engine serve requests end-to-end, and see infrastructure events when things go wrong — without waiting for Epic 4.**

### Story 2.1: WireMock Engine Layer & Services API Backend

As a developer or operator,
I want the WireMock mock engine and Services REST API to be in place,
So that services can be created, configured, and managed programmatically with the mock engine starting immediately on creation.

**Acceptance Criteria:**

**Given** a new Service is created via `POST /api/services`,
**When** the service is saved successfully,
**Then** the WireMock engine instance starts listening on the assigned port immediately.
**And** a row is persisted in `Services` with: `Id` (GUID), `Name`, `Slug` (unique, ≥2 chars), `Description` (nullable), `ExternalUrl` (http:// or https://), `Port` (30100–30199), `MocksRoot` (auto-generated from slug), `Status` (Live), `IsActive` (true), `DeletedAt` (null), `Tags` (JSON), `CreatedAt` (FR-1).

**Given** the assigned port is already in use on the host,
**When** the port binding fails,
**Then** the Service is persisted in `Stopped` status with the failure reason recorded, and a `SystemEvent` entry is written with severity `error`, service name, port, and troubleshooting step (FR-1, FR-22 infrastructure).

**Given** invalid Service data (blank name, name > 64 chars, emoji, duplicate slug, port outside 30100–30199, port already assigned to another Service, ExternalUrl not starting with http:// or https://),
**Then** HTTP 400 is returned with an appropriate `SERVICE_*` error code (FR-1).

**Given** `GET /api/services`,
**Then** all non-deleted Services (`DeletedAt IS NULL`) are returned with all fields including runtime status (FR-6 backend).

**Given** `PUT /api/services/{id}` with a name change that generates a different Slug,
**Then** the response includes a flag indicating the Mocks Root path has changed and the user must rename the directory on disk and run Resync (FR-4).

**Given** `POST /api/services/{id}/stop` and `POST /api/services/{id}/start`,
**Then** stop halts the WireMock listener immediately; start restarts the listener and re-reads Mappings from disk; both return the updated Service object in the standard envelope (FR-3).

**Given** the `SystemEvents` table,
**Then** it contains: `Id` (GUID), `Severity` (info|warning|error), `Message`, `ServiceId` (nullable FK), `CreatedAt`, `IsRead` (bool, default false).

**Given** a seed file configured via `FISHTANK_SEED_FILE` env var,
**When** the container starts,
**Then** the file is read (mounted read-only — NFR-13), new services imported, existing (by Slug) skipped, port collisions written as System Event warnings; if absent or unreadable, a System Event info entry is written and startup proceeds (FR-5, FR-35).

**Given** `GET /api/services/next-port`,
**Then** the next available port in 30100–30199 (lowest unassigned) is returned for pre-filling the Add Service form.

**Given** a WireMock engine instance for Service A throws an unhandled exception or fails to start,
**Then** the management API remains accessible (`GET /health` returns 200) and all other running Services continue serving mock requests unaffected — the fault boundary is per-service (NFR-5). Verified in an integration test that injects a startup failure on Service A while asserting `GET /api/services/{serviceBId}` returns `status: Live` and a test request to Service B's port returns expected mock response.

---

### Story 2.2: Services Page — Browse, Create & Edit Services

As a developer,
I want to view all mock services in a card grid or table, and create or edit services through a guided modal,
So that I can manage my service definitions without writing JSON or using the command line.

**Acceptance Criteria:**

**Given** the `/services` route,
**When** the page loads,
**Then** services are displayed in a card grid (default); Stopped services render at 72% opacity; an empty state with a primary "Add Service" button is shown when no services exist (FR-6, UX-DR8).

**Given** the card grid,
**Then** 3 columns at ≥1024px, 2 columns at 640–1023px, 1 column at <640px (FR-6, UX-DR6).

**Given** a Service card,
**Then** it displays: name (bold), description (muted), port badge (monospace, violet-100/violet-700), External URL, mock file count, status pill (Live: green-500 dot + pulse animation; Stopped: slate-500 dot, no pulse), enable/disable toggle, and explicit "Edit" link; clicking name/description area has no action (UX-DR8).

**Given** the table view toggle in the Services toolbar,
**When** the user switches to table view,
**Then** services render in a sortable table using the `<DataTable>` base component: `table-layout: fixed`, `<colgroup>` column widths, sticky headers, row hover state, keyboard arrow-key navigation; view preference persisted per session (FR-6, UX-DR11 — DataTable base component established here for Epic 3 + 4 to extend).

**Given** the "Add Service" modal,
**Then** the port field is pre-filled with the next available port; the three read-only path fields update with a 200ms debounce after each keystroke in Service Name; all validation errors appear inline on field blur and on submit (FR-1).

**Given** the Add Service modal with a valid form submitted,
**Then** the service is created, the WireMock engine starts on the assigned port, the card grid shows the new card, and the modal closes (FR-1).

**Given** tags in the Add/Edit Service modal,
**Then** free-form text tags can be entered; tags are saved with the service; a tag filter in the Services page header filters to matching services (FR-2).

**Given** the "Edit" link on a service card,
**When** the Edit modal opens,
**Then** all fields are pre-populated; a Slug-change warning appears inline if the name change would alter the Slug (FR-4).

**Given** 50 configured services,
**When** the Services page loads,
**Then** all cards render within 1 second of navigation (feature-specific NFR from PRD §5.1).

---

### Story 2.3: Enable/Disable Service Toggle, ServicesHub & Real-Time Status

As a developer,
I want to start or stop individual mock services without restarting the container, with status updates reflected in real time across all browser sessions,
So that I can quickly control which mocks are active during development or incident response.

**Acceptance Criteria:**

**Given** a service card's enable/disable toggle is clicked,
**When** the click is registered,
**Then** the toggle position updates optimistically (immediately); the Status pill retains its previous value during the pending window; on server success the pill updates to the new state; on server failure the toggle reverts and an error toast is shown (FR-3).

**Given** `ServicesHub.cs` at `/hubs/services`,
**When** a service status changes (start or stop confirmed on the backend),
**Then** a `ServiceStatusChanged` event is broadcast to all connected clients; the frontend hub listener calls `queryClient.invalidateQueries([["services"]])` per `HUB_INVALIDATION_MAP`; `HUB_INVALIDATION_MAP` is updated with `ServiceStatusChanged: [["services"]]` (FR-3, Architecture D7).

**Given** `EventsHub.cs` skeleton at `/hubs/events`,
**When** a client connects,
**Then** the hub accepts the connection (JWT cookie auth) and maintains it — no events broadcast yet (full wiring in Story 2.4).

**Given** both hubs require authentication,
**Then** unauthenticated connections (no valid JWT cookie) are rejected — consistent with NFR-8 on SignalR endpoints.

---

### Story 2.4: System Events Screen & Notification Panel

As a developer,
I want to see infrastructure warnings and errors on a dedicated System Events screen and as a real-time notification badge in the top bar,
So that I can quickly diagnose when services fail to start, volumes are unavailable, or file writes fail.

**Acceptance Criteria:**

**Given** the `/events` route,
**When** the page loads,
**Then** all System Events are displayed ordered by `CreatedAt` descending, showing: severity icon, message, associated Service name (if applicable), and timestamp (FR-22).

**Given** an engine crash System Event,
**Then** the message includes the root cause: a stack trace excerpt and offending Mapping file path where determinable; crashed Services are never surfaced as merely "stopped" — the failure reason is always present (FR-22).

**Given** `EventsHub.cs` is fully wired to the frontend,
**When** a new System Event of severity `warning` or `error` is created,
**Then** the notification bell badge increments in real time on all connected sessions; `HUB_INVALIDATION_MAP` is updated with `SystemEventCreated: [["events"]]` (FR-23).

**Given** the notification bell is clicked,
**When** the Notification Panel opens,
**Then** it shows warnings and errors only (not info/success); 20 items on initial open; "Load more" button loads next 20 per click (no infinite scroll); each item: severity icon, message with inline hyperlink to `/events?tab=warnings-errors&id={event-id}`, timestamp, service tag (if applicable) (FR-23, UX-DR11).

**Given** per-item interactions,
**When** anywhere on an item body is clicked,
**Then** the item is marked as read (badge decrements, background removed) — item remains visible in read state.
**When** dismiss (✕) is clicked,
**Then** the item is removed from the panel view; the underlying System Event remains in the database and is marked read (FR-23, UX-DR11 — dismiss vs. mark-as-read distinction).

**Given** "Mark all read" in the panel header,
**When** clicked,
**Then** all server-side unread warnings+errors are marked read (including unpaginated items); badge resets to zero; displayed items remain visible in read state; the button is hidden when unread count = 0 (FR-23).

**Given** new events arrive while the panel is open and the user is scrolled below the top,
**Then** events are prepended; badge increments; scroll position unchanged; a sticky "N new" pill appears — clicking it scrolls to top and dismisses the pill (FR-23, UX-DR11).

**Given** unread count exceeds 99,
**Then** the badge displays "99+" with min-width for 3 characters at 2xs scale; badge color is always `#ef4444` regardless of theme (FR-23, DESIGN.md).

**Given** any navigation event (sidebar click, logo click, browser back/forward),
**Then** the Notification Panel closes automatically (FR-23).

---

### Story 2.5: Settings — Service Cache Management

As a developer,
I want to view and clear the in-memory mapping and response caches for individual services or all services from Settings,
So that I can force the mock engine to reload fresh configurations without restarting the container.

**Acceptance Criteria:**

**Given** Settings → Cache with configured services,
**Then** each service is listed with its current in-memory cache entry count and estimated size (FR-46).

**Given** a per-service "Clear" action,
**When** confirmed in the confirmation dialog,
**Then** the cache for that service is cleared; it reloads from disk on the next incoming request — no Resync or container restart needed (FR-46, NFR-15).

**Given** "Clear All",
**When** confirmed,
**Then** caches for all services are cleared simultaneously (FR-46, NFR-15).

**Given** no services are configured,
**Then** the Cache sub-section shows: "No service caches yet — caches appear here once services are created and receive requests." (FR-46).

**Given** a Standard User (non-Admin) is authenticated,
**When** Settings → Cache is accessed,
**Then** the cache management UI is visible and functional — this section is not Admin-only (FR-46).

---

## Epic 3: Network Activity & Request Monitoring

Users can monitor all HTTP requests hitting their mock services in real time, filter and sort the activity log by method/service/type, inspect full request/response detail in their preferred style (Modal, Right Drawer, Bottom Panel), configure auto-refresh, and understand exactly what matched vs. was proxied.

### Story 3.1: Activity Log Backend — Request Capture & Header Redaction

As a developer,
I want all HTTP requests received by mock services to be captured in an in-memory activity log with sensitive headers automatically redacted,
So that the activity data is available for real-time monitoring and programmatic queries.

**Acceptance Criteria:**

**Given** an HTTP request is received by any Live Service,
**When** the request is processed (matched or proxied),
**Then** an activity log entry is written to the per-service in-memory store with: request ID (GUID), datetime, HTTP method, URL path, HTTP status code, Type (Mocked|Proxied), service ID, response duration (ms), request headers (redacted), request body, response headers, response body (FR-7).

**Given** headers `Authorization`, `Cookie`, `Set-Cookie`, `X-Api-Key`, `X-Auth-Token`, and any header whose name contains "secret" or "token" (case-insensitive on the header name only),
**When** the log entry is created,
**Then** those values are stored as `[REDACTED]` — cannot be un-redacted after storage (FR-10, NFR-9).

**Given** `FISHTANK_CAPTURE_FULL_HEADERS` env var or opt-in setting is enabled,
**When** a request is logged,
**Then** header values are stored as-is (FR-10 opt-in path).

**Given** the header capture opt-in setting (Settings → Activity),
**Then** it is instance-wide — a single global flag persisted in the database, affecting all services and all authenticated users simultaneously; the setting state is visible to all authenticated users, not Admin-only; toggling it does not retroactively un-redact previously stored `[REDACTED]` values (FR-10 opt-in scope clarification).

**Given** the per-service row cap is reached (configurable default),
**When** a new entry arrives,
**Then** the oldest entry is pruned automatically (FR-7).

**Given** `ActivityHub.cs` at `/hubs/activity`,
**When** a new log entry is created,
**Then** an `ActivityRowAdded` event is broadcast to all connected clients within 500ms of the request being received (NFR-3, FR-7); the hub requires JWT cookie authentication (NFR-8).

**Given** `GET /api/activity` with optional filters (`serviceId`, `type`, `search`, `sort`) and `DELETE /api/activity`,
**Then** GET returns matching entries in the standard envelope; DELETE clears all in-memory entries for all services and returns `{"success":true,"data":null}` (FR-7, FR-13 backend).

**Given** a container restart,
**Then** all activity log entries are cleared — the log is in-memory only and not persisted (FR-7).

---

### Story 3.2: Network Activity Page — Real-Time Log Display

As a developer,
I want to see all HTTP requests arriving at my mock services in a live-updating table with method chips, type icons, and row highlights,
So that I can instantly understand what traffic is flowing and whether it was served from a mock or proxied to the upstream.

**Acceptance Criteria:**

**Given** the `/activity` route,
**When** the page loads,
**Then** existing log entries are fetched and displayed newest-first (DateTime descending default) (FR-7).

**Given** `ActivityRowAdded` received via SignalR,
**Then** the new row is prepended to the top of the table within 500ms (NFR-3, FR-7).

**Given** the activity table (extends `<DataTable>` base from Epic 2),
**Then** default visible columns: Method · URL Path · Status · Type · Service · Actions; `ms` (duration) and DateTime columns are hidden by default but available via a Columns selector (EXPERIENCE.md).

**Given** the Method column,
**Then** each row renders an HTTP method chip with colored text + background using DESIGN.md token pairs: GET (blue-500/blue-100), POST (emerald-500/emerald-100), PUT (amber-600/amber-200), DELETE (red-500/red-100), PATCH (violet-500/violet-100), other (slate-600/slate-100) (UX-DR7).

**Given** the Type column,
**Then** it renders a Bootstrap Icon only (no text chip): `bi-database` in `#3b82f6` for Mocked with tooltip "Mocked"; `bi-arrow-repeat` in `#10b981` for Proxied with tooltip "Proxied"; column header shows `bi-funnel` filter icon (no sort arrow) (UX-DR9, FR-7).

**Given** a proxied row where the Service is currently Live,
**Then** the first cell has `2px solid #f59e0b` (amber-500) left-border accent (UX-DR10, FR-7).

**Given** a response with HTTP 5xx status,
**Then** all cells have `var(--error-row-bg)` background (theme-aware CSS variable) (UX-DR10, FR-7).
**And** both row highlights may apply simultaneously to the same row.

**Given** the proxy counter pill in the page header,
**Then** it shows `[bi-arrow-repeat] Proxied: N` (N = full unfiltered log total proxied count); clicking opens a per-service popover; services with 0 proxied requests omitted; empty state: "No proxied requests recorded."; N renders in `#ef4444` if any proxied row in the current in-memory log has a 5xx status; after a log clear (FR-13) the pill resets to 0 and the error-color state also clears — there is no persistent error indicator separate from the current log rows (FR-12, EXPERIENCE.md).

**Given** the page header element order (EXPERIENCE.md spec),
**Then** left to right: Hamburger (< 768px only) → Page title (h1) → Refresh icon stub → LIVE/PAUSED stub → Recording badge stub → [flex spacer] → Proxy counter pill → Record button stub → Clear log button.

**Given** the SignalR connection to any hub (`/hubs/services`, `/hubs/events`, `/hubs/activity`) cannot be established or is lost,
**When** the connection error is detected by the hub connection factory (`signalr.ts`),
**Then** a fixed-position backend-unreachable banner renders directly below the top bar (`top: 44px`, `position: fixed`, full width) with message: "Connection to Fishtank server lost — retrying…"; the main content area gains `padding-top` equal to the banner height to prevent content overlap; the banner hides automatically when connection is restored — no manual dismiss required (UX-DR11).

---

### Story 3.3: Activity Log Filtering, Sorting, Auto-Refresh & Log Controls

As a developer,
I want to filter the activity log by search query, service, and type, sort by any column, configure auto-refresh, and clear the log,
So that I can quickly isolate the specific requests I'm investigating.

**Acceptance Criteria:**

**Given** the search field in the toolbar,
**When** a query is typed,
**Then** rows where the URL path OR the HTTP method label contains the query (case-insensitive, OR logic across both fields) are shown; typing "post" returns both POST method rows and rows where the path contains "post" (FR-8).
**And** the search applies to the full URL path value, not the truncated display (FR-8).

**Given** the Service dropdown (default "All Services") and Type filter button (`All` / `Mocked only` / `Proxied only`),
**Then** all active filters are applied simultaneously with AND logic; the Proxy counter pill always reflects the full unfiltered log total regardless of filters (FR-8, FR-12).

**Given** the "Clear filters" button,
**When** clicked,
**Then** search, service filter, type filter, and sort order reset to defaults (DateTime descending) (FR-8).

**Given** sortable column headers (Method, URL Path, Status, Service, ms, DateTime — not Type or Actions),
**When** a header is clicked,
**Then** sort cycles: unsorted → ascending → descending → unsorted; only one column sorted at a time (EXPERIENCE.md).

**Given** the LIVE/PAUSED indicator,
**When** auto-refresh is LIVE,
**Then** new rows arrive via SignalR; when paused, `bi-arrow-clockwise` refresh icon is visible in the page header; clicking triggers a single manual fetch; the icon spins during the fetch and is non-interactive until complete; when `prefers-reduced-motion` is active the icon does not animate (FR-11, NFR-21).

**Given** Settings → Activity,
**Then** the auto-refresh interval is configurable in ms; setting to 0/disabled switches to manual-refresh-only mode; header redaction opt-in toggle ("Capture full request headers — disables redaction") is present; the row detail style preference (Modal / Right Drawer / Bottom Panel) is present (FR-10, FR-11).

**Given** the Clear log button (no confirmation required),
**When** clicked,
**Then** `DELETE /api/activity` is called; the table shows the empty state immediately; the proxy counter pill resets to 0; Record mode remains active if running (FR-13).

---

### Story 3.4: Row Detail — All Three Display Styles

As a developer,
I want to open full request/response detail for any activity log row in my preferred display style,
So that I can inspect headers, bodies, and metadata to diagnose matching behavior.

**Acceptance Criteria:**

**Given** clicking any row (or pressing Enter when keyboard-focused),
**When** the row detail opens,
**Then** it displays: request ID (GUID), DateTime (ISO 8601), HTTP method, URL path, Service name and port, Type, HTTP status, request headers (`[REDACTED]` for redacted values), request body, response headers, response body (FR-9).

**Given** the user's row detail style preference (default: Modal),
**Then** the correct style renders: Modal (centered overlay), Right Drawer (320px from right), or Bottom Panel (bottom half with Request/Response tabs); Modal and Right Drawer use a single scrollable section; Bottom Panel uses tabs (FR-9, UX-DR11 — row-detail variants activated from DataTable base stubs created in Epic 2).

**Given** the Right Drawer is open and a different row is activated,
**Then** the drawer updates in-place without closing (FR-9, EXPERIENCE.md).

**Given** a proxied request in row detail,
**Then** a "Save as Mock" action (`bi-lightning-charge`, brand color) renders in the detail — clicking it is a no-op placeholder until Epic 4 Story 4.4 wires the full behavior (FR-9 action placement).

**Given** viewport < 640px (mobile),
**Then** row detail is always shown as Modal, overriding the user's saved preference (FR-9, EXPERIENCE.md mobile override).

**Given** the activity table with 10,000+ rows,
**When** the user scrolls,
**Then** scroll performance stays at or above 60fps using virtual scrolling (NFR-4).

**Given** keyboard navigation in the table,
**Then** arrow keys move row focus; Tab moves between interactive elements (filters, headers, action icons) in logical order; all action icons have `aria-label` tooltips (NFR-19).

**Given** a Network Activity spot-check across all 4 themes,
**Then** method chips, type icons (bi-database blue-500, bi-arrow-repeat emerald-500), proxy counter pill, and LIVE/PAUSED indicator all pass WCAG 2.1 AA contrast thresholds; emerald-500 on Deep Ocean #0f2233 is verified — use `#34d399` per-theme override in the Deep Ocean token block if below 4.5:1 (UX-DR12 spot-check, UX-DR9).

---

## Epic 4: Mappings, Mock Capture & Recording

Users can browse, create, edit, rename, duplicate, and delete Mapping and Response files directly in the browser. From the activity log, users can save any proxied request as a permanent mock stub or enable Record mode to auto-capture all proxied traffic. Resync reloads file changes from disk with full conflict detection. Navigation and sign-out are guarded against unsaved edits.

### Story 4.1: Mappings File Backend — CRUD, IFileWatcher & Resync Engine

As a developer,
I want the backend to support full file operations on Mapping and Response files and detect external file modifications reliably,
So that the UI can read, write, and sync mapping files from the volume-mounted filesystem.

**Acceptance Criteria:**

**Given** `GET /api/mappings`,
**Then** it returns the complete folder tree structure (Mocks Root → service folders → mappings/ → responses/ → files) with file metadata (name, path, last modified) in the standard envelope (FR-17 backend).

**Given** `POST /api/mappings`, `PUT /api/mappings/{path}`, `DELETE /api/mappings/{path}`,
**Then** each operation writes to the volume-mounted filesystem; failure (disk error, permission denied) creates a System Event entry and returns an error response — never silently ignored (FR-18, FR-22).

**Given** `POST /api/resync`,
**Then** all Mapping and Response files are reloaded from disk for all services; response includes loaded counts (M mappings, R responses), elapsed duration, and per-file failure details for partial failures (FR-20 backend).

**Given** the `IFileWatcher` interface in `Engine/IFileWatcher.cs`,
**Then** `TrackingFileSystemHandler.cs` implements it using OS `FileSystemWatcher`; `FakeFileWatcher` is available for tests — triggers callbacks synchronously, no `Task.Delay` or OS timing required in xUnit tests (Architecture D6, IFileWatcher abstraction consolidated here from earlier design).

**Given** the `_lastKnownModified Dictionary<string, DateTimeOffset>` per service,
**When** Resync is triggered,
**Then** each file's `LastWriteTime` is compared against the stored value; files that are currently open in an editor session AND whose `LastWriteTime` has advanced since load are flagged as conflicts in the Resync response (FR-20 conflict detection).

**Given** `POST /api/services/import` (on-demand seed import),
**Then** it accepts the seed file JSON schema; same additive import behavior as startup (new created, existing skipped, conflicts as System Events); requires authentication (FR-5 on-demand path — Admin Console UI wired in Epic 5).

---

### Story 4.2: Mappings File Explorer & Dual-Mode Editor

As a developer,
I want to browse, create, edit, rename, duplicate, and delete Mapping and Response files directly in the browser,
So that I can manage my mock configurations without leaving the Fishtank UI or touching the filesystem directly.

**Acceptance Criteria:**

**Given** the `/mappings` route,
**When** loaded,
**Then** a folder tree (left) shows: Mocks Root → service folders → mappings/ → responses/ → files; the root label displays the currently configured Mocks Root path (not hardcoded); the active file is highlighted with a brand-color left border; expand/collapse state is preserved for the session (FR-17, UX-DR11).

**Given** clicking a file in the folder tree,
**Then** its content loads in the editor pane; two tabs are available: "Form" (guided fields for common Mapping properties) and "Raw JSON" (CodeMirror editor with `@codemirror/lang-json` + `@codemirror/theme-one-dark`); switching tabs preserves unsaved changes; advanced WireMock fields not in Form view are accessible via Raw JSON (FR-19).

**Given** an unsaved change in the editor,
**Then** a `●` dot indicator appears beside the filename in the tree and the filename is shown in italic; Save and Discard actions are enabled only when unsaved changes exist (FR-18).

**Given** file operations (create via "+" toolbar, rename/duplicate/delete via context menu),
**Then** delete requires a confirmation dialog: "Delete this mapping? This removes the file from disk." — no optimistic delete (FR-18, NFR-15).
**And** creating a new file when no service folder is selected presents a service-selection dropdown before the naming modal (FR-18).

**Given** a file write operation (`PUT /api/mappings/{path}`),
**Then** the UI waits for server confirmation before updating; a failed write produces an immediate System Event entry and an error toast (FR-18, FR-22).

**Given** navigating away from `/mappings` while unsaved Mapping edits exist,
**Then** a confirmation prompt (React Router `useBlocker`) is shown; the user can discard and navigate or stay (FR-21).

**Given** Settings → Mocks Root path,
**Then** the current Mocks Root path is displayed; an Edit action allows entering a new path with an inline warning that changing it requires restarting services and running Resync (FR-20 Mocks Root context).

---

### Story 4.3: Resync UI with Toast Feedback & Conflict Banners

As a developer,
I want to trigger Resync from the Mappings toolbar and receive clear feedback on what loaded, what failed, and whether any of my open files were modified externally,
So that I can keep the in-memory mock engine in sync with the filesystem without restarting the container.

**Acceptance Criteria:**

**Given** the Resync button in the Mappings toolbar,
**When** clicked,
**Then** the button shows a spinner and is disabled; a persistent in-progress toast: "Resyncing…" is shown (FR-20).

**Given** Resync completes successfully,
**Then** the in-progress toast is dismissed; a success toast shows: "{M} mappings and {R} responses loaded in {duration}" — auto-dismisses after 4s. Duration format: <10,000ms → `{N}ms`; ≥10,000ms → `{N}s`; ≥60,000ms → `{N}m {N}s` (FR-20).
**And** if M=0 and R=0: "0 files loaded in {duration} — check your Mocks Root path and volume configuration." (FR-20).

**Given** a Resync failure,
**Then** the Resync button re-enables; an error toast shows the reason; the folder tree retains its previous state (FR-20).

**Given** partial success,
**Then** loaded files count in the success toast; each failed file generates a separate error toast with filename and reason (FR-20).

**Given** the currently open file was deleted externally and Resync runs,
**Then** an inline banner appears: "File no longer exists on disk." with a Close action that clears the editor pane (FR-20).

**Given** the currently open file was modified externally WITH local unsaved changes,
**Then** a conflict banner appears: "This file was modified on disk since you started editing." with "View disk version" (secondary confirmation before discarding) and "Keep my edits" (FR-20).

**Given** the currently open file was modified externally WITHOUT local changes,
**Then** the editor silently reloads to the new disk version — no banner shown (FR-20).

**Given** any Resync scenario,
**Then** unsaved changes are never silently discarded under any circumstances; the editor remains interactive during Resync (FR-20).

**Given** Resync for a mapping set < 200 files,
**Then** it completes in under 1 second (NFR-2).

**Given** `POST /api/resync` completes (full success, partial success, or zero-files outcome),
**Then** `ServicesHub` broadcasts a `ResyncCompleted` event to all connected clients; the frontend hub listener calls `queryClient.invalidateQueries([["mappings"]])` per `HUB_INVALIDATION_MAP`; `HUB_INVALIDATION_MAP` is updated with `ResyncCompleted: [["mappings"]]` — completing the seam contract established in Epic 1 Story 1.3 (Architecture D6, D7).

---

### Story 4.4: Save As Mock — Mock Suggestion Modal

As a developer,
I want to save any proxied request as a permanent WireMock mapping directly from the activity log,
So that I can build my mock library from real API traffic without writing JSON by hand.

**Acceptance Criteria:**

**Given** a proxied request row in the activity table,
**When** `bi-lightning-charge` "Save as Mock" is clicked (or triggered from row detail),
**Then** the Mock Suggestion modal opens pre-populated with the request data; this action is never shown on Mocked rows (FR-14).

**Given** the Mock Suggestion modal,
**Then** it contains two editable blocks: (1) Mapping JSON (WireMock format: `WildcardMatcher` on path, proxied method, `BodyAsFile` → auto-generated Response filename, `UseTransformer: true` by default) and (2) Response body (pre-populated from proxied response); both use syntax highlighting — lighter than full CodeMirror (FR-15).

**Given** the default Response filename,
**Then** it follows `{method}_{path-slugified}_{status}_body.json` where status = proxied response status code (FR-15).

**Given** the user changes `Response.StatusCode` in the Mapping JSON to a different value than the proxied status,
**Then** a non-blocking inline note advises renaming the Response file — does not block saving (FR-15).

**Given** Save is clicked and the write succeeds,
**Then** Mapping and Response files are written to the appropriate service directory; the Mappings folder tree updates; the originating row detail modal or drawer closes automatically (FR-14).

**Given** a write failure,
**Then** a System Event entry is created; the modal remains open with an error message — user can retry or cancel (FR-14, FR-22).

**Given** the `UseTransformer` checkbox (default: checked = true),
**Then** unchecking it sets `Response.UseTransformer: false` in the generated Mapping JSON (FR-15).

---

### Story 4.5: Record Mode & Cross-Screen Recording Indicator

As a developer,
I want to enable Record mode to automatically capture all proxied requests as Mapping and Response files,
So that I can build a complete mock library from a real API session without manually saving each request.

**Acceptance Criteria:**

**Given** the "● Record" button in the Network Activity page header,
**When** clicked,
**Then** Record mode activates; the button label changes to "⏹ Stop"; a persistent amber "● Recording" badge appears in the page header (FR-16).

**Given** Record mode is active and a proxied request arrives,
**Then** Mapping and Response files are automatically written to the appropriate service directory (same logic as Story 4.4) — without user action (FR-16).

**Given** "⏹ Stop" is clicked,
**Then** Record mode deactivates; the button returns to "● Record"; the Recording badge is hidden immediately — no animation on hide (FR-16).

**Given** Record mode is active and the user navigates away from `/activity`,
**Then** a persistent amber pill appears in the top bar: `role="button"`, `aria-label="Recording active — return to Network Activity"`, keyboard-accessible (Enter/Space navigates to `/activity`); this indicator does not appear on `/login` or `/setup` (FR-16, EXPERIENCE.md).

**Given** the SignalR connection drops while Record mode is active,
**Then** the badge changes to "⚠ Recording paused — connection lost" (`bi-exclamation-triangle` replaces the dot); on reconnection, recording resumes, the badge returns to "● Recording", and a System Event is written with the gap duration and note: "Requests received during the {N} seconds gap may not have been captured." (FR-16, FR-22).

**Given** `@media (prefers-reduced-motion: reduce)`,
**Then** the Recording badge does not pulse or animate; the cross-screen indicator uses `transition: none` (not `animation: none` — it's a CSS transition) (UX-DR13).

---

### Story 4.6: Navigation Guard & Sign-Out Protection

As a developer,
I want to be warned before navigating away or signing out when I have unsaved Mapping edits or a pending Mocks Root path change,
So that I never accidentally lose work I intended to save.

**Acceptance Criteria:**

**Given** unsaved Mapping edits exist and the user attempts to navigate to another route,
**Then** a confirmation prompt is shown (React Router `useBlocker`); the user can discard and navigate or stay (FR-21).

**Given** sign-out is triggered while unsaved Mapping edits exist,
**Then** a dialog appears with title "Sign out?" and body: "You have unsaved changes in the Mappings editor. Sign out now? Unsaved changes will be lost." Actions: Cancel and Sign out (FR-28, EXPERIENCE.md).

**Given** sign-out with a pending Mocks Root path value in Settings,
**Then** the dialog body reads: "You have an unsaved Mocks Root path. Sign out now? Unsaved changes will be lost." (FR-28).

**Given** sign-out with both unsaved Mapping edits AND pending Mocks Root path,
**Then** the body reads: "You have unsaved changes in the Mappings editor and an unsaved Mocks Root path. Sign out now? Unsaved changes will be lost." (FR-28).

**Given** an in-progress Add/Edit Service modal is open when sign-out is triggered,
**Then** the confirmation still appears; the body includes: "Any unsaved form data will be lost." — the modal is transient and does not independently block sign-out (FR-28, EXPERIENCE.md).

**Given** no unsaved state exists,
**When** sign-out is triggered,
**Then** sign-out proceeds immediately — no dialog (FR-28).

---

## Epic 5: Admin Console & User Management

Admin-role users can manage user accounts, control feature availability via runtime toggles, monitor system health metrics, and review the full audit trail.

### Story 5.1: Feature Toggles — Runtime Control & SignalR Broadcast

As an admin,
I want to enable or disable any Fishtank feature from the Admin Console at runtime without restarting the container,
So that I can quickly respond to issues or manage capability rollout across all active sessions.

**Acceptance Criteria:**

**Given** the `/admin` route accessed by an Admin-role user,
**Then** the Admin Console renders with the feature toggles section; a Standard User at `/admin` is redirected to `/services` (FR-30, EXPERIENCE.md).

**Given** the Admin Console sidebar nav item,
**Then** it is visible and clickable only for Admin-role users; Standard Users do not see it (EXPERIENCE.md, UX-DR11).

**Given** an Admin flips a feature toggle,
**When** `PUT /api/admin/toggles/{name}` is called and succeeds,
**Then** the state is persisted to the database; a `FeatureToggleChanged` event is broadcast via `TogglesHub.cs` to all connected sessions immediately; `HUB_INVALIDATION_MAP` is updated with `FeatureToggleChanged: [["toggles"]]`; all active sessions reflect the change within one SignalR round-trip (FR-30, Architecture D7).

**Given** a feature was disabled via env var at container startup (`FISHTANK_TOGGLE_{NAME}=false`),
**Then** that toggle appears as disabled and env-var-locked in the Admin Console; re-enabling it via the Admin Console returns an error — env var overrides take precedence for the current container lifetime (FR-30).

**Given** `GET /api/admin/toggles`,
**Then** all known toggles are returned with their current state (DB state overridden by env vars where applicable) (FR-30).

---

### Story 5.2: User Management — Create, View & Deactivate

As an admin,
I want to view all user accounts, create new Standard User accounts, and deactivate existing users with immediate JWT invalidation,
So that I can control who has access to the Fishtank instance.

**Acceptance Criteria:**

**Given** the User Management section of the Admin Console,
**When** loaded,
**Then** all users are listed with: username, role (Admin | Standard User), status (Active | Deactivated), and creation date (FR-31).

**Given** the "Create User" form,
**When** a new username + password is submitted,
**Then** a Standard User account is created with `ForcePasswordChange: true` — the new user must change their password on first login before accessing any other screen (consistent with the FR-27 forced-change pattern; `ForcePasswordChange` column established in Story 1.2); the new user appears in the list immediately (FR-31).

**Given** the "Deactivate" action on an active user,
**When** confirmed,
**Then** `PUT /api/users/{id}/deactivate` is called; `IsActive` is set to false; `TokenVersion` is incremented; any currently valid JWT for that user is rejected on their next request (JWT middleware validates token version against DB — hook established in Epic 1 Story 1.2); the deactivated user cannot log in (FR-31).

**Given** the currently authenticated admin,
**Then** the deactivate action is disabled/hidden for their own account — guard against self-lockout.

**Given** v1 roles,
**Then** only Admin and Standard User exist; role cannot be changed after account creation in v1 (FR-31).

---

### Story 5.3: Health Dashboard, Audit Log & Auto-Registration Toggle

As an admin,
I want to monitor system health, review the audit trail, and control whether users can self-register,
So that I have full operational visibility and control over the Fishtank instance.

**Acceptance Criteria:**

**Given** the Health Dashboard section,
**When** loaded,
**Then** it shows: active Services count, total request count (from in-memory activity log), database status (accessible/inaccessible), and container uptime — matching the data exposed by `GET /health` (FR-32).

**Given** `GET /api/admin/health`,
**Then** it returns the same structured data as `GET /health` with additional service-level detail and requires Admin authentication (FR-32).

**Given** the Audit Log section,
**When** loaded,
**Then** user-initiated actions (service create/edit, toggle change, file save, user deactivate) and system-generated actions are displayed newest-first from the `AuditLog` DB table; each entry shows: action type, actor (username or "system"), timestamp, affected resource (FR-33).
**And** the `AuditLog` table contains: `Id` (GUID), `Action`, `ActorId` (nullable FK to Users), `ResourceType`, `ResourceId`, `Details` (JSON), `CreatedAt`.

**Given** the Auto-Registration Toggle in Admin Console,
**Then** it reflects the current state (default OFF); toggling ON allows new usernames to self-register; new self-registered accounts are Standard User role (FR-29).
**And** if `FISHTANK_AUTO_REGISTRATION=true` is set, the toggle shows as enabled and env-var-locked (consistent with FR-30 env var precedence) (FR-29, FR-30).

---

## Epic 6: Release Polish & Distribution

The Fishtank v1 image is published on Docker Hub with a pre-seeded demo image, the OpenAPI spec is finalized and served from the container, a pipeline reset endpoint enables automated CI/CD test environment cleanup, and the project ships with all community resources. **The REST API surface (FR-43) was built progressively in Epics 2–5; Epic 6 verifies completeness, publishes the spec, and adds the one discrete new endpoint (pipeline reset).**

### Story 6.1: Pipeline Reset Endpoint

As a CI/CD pipeline engineer,
I want a dedicated endpoint to reset the Fishtank runtime state between test runs,
So that automated tests start from a clean activity log without restarting the container.

**Acceptance Criteria:**

**Given** `POST /admin/reset` (no `/api/` prefix — distinct auth mechanism) called with the correct `FISHTANK_PIPELINE_RESET_KEY` value,
**Then** the runtime Activity log is cleared for all services, in-memory counters are reset, and Mappings are reloaded from disk — without restarting the container or any Service; HTTP 200 `{"success":true,"data":null}` is returned (FR-45).

**Given** `POST /admin/reset` called without a valid API key,
**Then** HTTP 401 is returned (FR-45, NFR-14).

**Given** `FISHTANK_PIPELINE_RESET_KEY` is not configured,
**When** `POST /admin/reset` is called,
**Then** HTTP 403 is returned with: "Pipeline reset is disabled — configure FISHTANK_PIPELINE_RESET_KEY to enable this endpoint." (FR-45, FR-36).

**Given** the API key,
**Then** it is a pre-shared secret distinct from user JWT tokens — it grants access to `/admin/reset` only (FR-45, NFR-14).

**Given** `GET /health` after a pipeline reset,
**Then** it returns HTTP 200 — all services are still running; reset does not affect service status (FR-38).

---

### Story 6.2: OpenAPI Spec & Management API Parity Verification

As an open-source contributor or API integrator,
I want a complete and accurate OpenAPI specification served from the running container,
So that I can understand and integrate with the Fishtank Management API without reading .NET source code.

**Acceptance Criteria:**

**Given** the running container,
**When** `GET /openapi/v1.json` is called (no authentication required),
**Then** a valid OpenAPI 3.x specification is returned describing all Management API endpoints (FR-44).

**Given** the OpenAPI spec,
**Then** the standard response envelope is documented as a generic wrapper type with typed `data` fields per endpoint; all `SERVICE_*`, `AUTH_*`, `MAPPING_*`, `ENGINE_*`, `SYSTEM_*`, `ADMIN_*` error codes are documented as enum values (FR-44, Architecture response envelope).

**Given** the full list of UI operations implemented in Epics 2–5,
**When** audited against FR-43,
**Then** every UI operation has a corresponding documented REST endpoint: Service CRUD + start/stop + import, Mapping/Response file CRUD, Resync, Activity log query + clear, System Events query, User management, Feature toggle management (FR-43).

**Given** the complete list of runtime environment variables required by FR-36,
**When** audited against the README env var reference table and `docker-compose.example.yml`,
**Then** every env var is documented in both places: management port, database path, Mocks Root path, JWT expiry, admin password, auto-registration toggle, login rate-limit parameters (`FISHTANK_LOGIN_RATE_LIMIT`, `FISHTANK_LOGIN_RATE_WINDOW`), CORS allowed origins, sensitive header capture opt-in (`FISHTANK_CAPTURE_FULL_HEADERS`), feature toggle overrides (`FISHTANK_TOGGLE_{NAME}`), pipeline reset API key (`FISHTANK_PIPELINE_RESET_KEY`) — no env var listed in FR-36 is absent or undocumented (FR-36 completeness gate).

**Given** the OpenAPI spec file,
**Then** it is committed to the repository (e.g. `docs/openapi.json`) and updated as part of CI on every API change — the committed spec and the served spec are always in sync (FR-44).

---

### Story 6.3: fishtank-demo Pre-Seeded Docker Image

As a first-time evaluator or workshop participant,
I want to pull a `fishtank-demo` Docker image and immediately explore a fully operational Fishtank instance with realistic example services,
So that I can understand what Fishtank does in under 5 minutes without any configuration.

**Acceptance Criteria:**

**Given** `docker run -p 9090:9090 fishtank/fishtank:demo`,
**When** the container starts,
**Then** the management UI is accessible and shows 3+ pre-seeded example services (e.g. Weather API, Payments Gateway, User Profile Service) with realistic WireMock mappings and sample response files — zero configuration required (FR-42).

**Given** the demo image,
**Then** it is built from the same base image and Dockerfile as the production release — not a divergent build (FR-42).

**Given** the demo seed data,
**Then** example services have realistic mock mappings demonstrating Fishtank's range: `GET /weather/current → 200` with sample JSON, `POST /payments/charge → 200` with charge confirmation, etc. (FR-42).

**Given** the Docker Hub tags,
**Then** production image is `fishtank/fishtank:latest` and `fishtank/fishtank:{version}`; the demo image is `fishtank/fishtank:demo` — clearly distinct (FR-34, FR-42).

**Given** the demo image default credentials,
**Then** a default username and password are documented in the README for demo use; a clear note states these credentials are only appropriate for evaluation environments (FR-42 security note).

---

### Story 6.4: Automated Release Pipeline, K8s Manifest & Community Resources

As an open-source contributor, operator, or first-time user,
I want Fishtank to have a complete release pipeline, Kubernetes reference manifest, and comprehensive community resources,
So that the project is easy to adopt, deploy in any environment, and contribute to.

**Acceptance Criteria:**

**Given** a git tag matching `v*.*.*` is pushed,
**When** the release CI workflow runs,
**Then** it executes: build → unit tests → integration tests → cross-platform smoke tests (Linux, macOS/Apple Silicon, macOS/Intel, Windows runners each doing `docker run` + `GET /health` = 200) → Docker Hub publish (`latest` + version tag) — all steps must pass before publish (FR-34, FR-40).

**Given** `deployment.yaml` in the repository root,
**Then** it is a valid Kubernetes Deployment + Service manifest with documented placeholders for image tag, volume mounts, and env vars; includes a readiness probe pointing to `GET /health` (FR-41).

**Given** `CONTRIBUTING.md`,
**Then** it contains: architecture overview readable in ≤10 minutes, tech stack (.NET 10 + React 18 + WireMock.Net), project structure walkthrough, local dev setup (devcontainer option for frontend contributors without .NET SDK), PR workflow, 48-hour triage SLA note (FR-34, Addendum A6).

**Given** `SECURITY.md`,
**Then** it contains the vulnerability reporting process and responsible disclosure policy (FR-34).

**Given** GitHub Issues at v1 launch,
**Then** at least 5 issues are labeled `good first issue` with clear descriptions, scope, and acceptance criteria — curated by the maintainer (FR-34).

**Given** `README.md`,
**Then** it contains at the top: animated GIF or screen recording of core workflows; followed by: quick-start (`docker run` in one command), environment variable reference table, links to `CONTRIBUTING.md`, `SECURITY.md`, and the OpenAPI spec URL; and a Linux host configuration note: "`fs.inotify.max_user_watches` must be raised to at least 65536 on Linux hosts running many services — README includes the `sysctl` command to apply this temporarily (`sudo sysctl fs.inotify.max_user_watches=65536`) and persistently (via `/etc/sysctl.d/`)" (FR-34, Architecture D6 IFileWatcher note).

**Given** `.devcontainer/` in the repository,
**Then** it provides a working devcontainer configuration allowing frontend-only contributors to run the dev environment without the .NET SDK installed (FR-34, Addendum A6).

---

## Pre-Ship Gate Stories

### PSG-1: Custom SVG Logo

As a user and evaluator of Fishtank,
I want the application to have a distinctive custom logo rather than a generic Bootstrap Icon placeholder,
So that Fishtank has a professional identity that reflects the product's purpose.

**Acceptance Criteria:**

**Given** the custom SVG logo merged to main,
**Then** it is a single-color SVG accepting a CSS `fill` property — adapts to `--brand-fg` (white in all 4 default themes) (UX-DR3).
**And** it is legible when rendered at 16×16px (favicon use) (UX-DR3).
**And** it renders correctly at 20×20px beside the "Fishtank" wordmark in the top bar (UX-DR3).

**Given** the favicon assets,
**Then** `favicon.png` (32×32px primary) and `favicon.ico` (16×16px fallback) are generated from the final SVG and included in the Vite build output (UX-DR3).

**Given** the production Docker image,
**Then** the `bi-droplet-half` placeholder does not appear anywhere in the shipped UI — fully replaced by the custom SVG (UX-DR3 hard gate).

**Given** gate approval,
**Then** this story is marked complete only after explicit product lead approval of the final logo design (UX-DR3 gate owner: product lead).

---

### PSG-2: Full WCAG 2.1 AA Contrast Audit

As a user with accessibility needs,
I want all Fishtank UI elements to meet WCAG 2.1 AA contrast standards across all four themes,
So that the tool is usable regardless of visual ability or theme preference.

**Acceptance Criteria:**

**Given** the audit scope (all components built in Epics 1–5, all 4 themes),
**When** contrast ratios are measured for every text-on-background and UI-component combination,
**Then** all pass 4.5:1 for normal text and 3:1 for large text/UI components (UX-DR12, NFR-20).

**Given** the known risk items from DESIGN.md,
**Then** each is explicitly validated: Deep Ocean `sidebar-fg` (#94a3b8 on #0d1b2a ≈ 5.9:1 ✅), Deep Ocean `content-muted` (#94a3b8 on #0f2233 ≈ 5.9:1 ✅), Ink & Amber `sidebar-fg` (#a1a1aa on #18181b ≈ 6.9:1 ✅), Ink & Amber `content-muted` (#52525b on #ffffff ≈ 7.5:1 ✅), `icon-proxy-color` (emerald-500) on Deep Ocean content background — use `#34d399` per-theme override if below 4.5:1 (UX-DR12).

**Given** any failure found during the audit,
**Then** a per-theme token override is added to the CSS block; the failing element is re-audited after the fix before this story is closed (UX-DR12).

**Given** color-coded indicators (method chips, Status pills, Type icons),
**Then** each is supplemented with text labels or tooltips — color is never the sole signal (NFR-20).

**Given** this story's completion,
**Then** it is documented in the release notes and v1 Definition of Done that WCAG 2.1 AA has been validated across all 4 themes (NFR-20, PSG-2 gate).
