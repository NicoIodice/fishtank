---
story_id: "1.3"
epic: 1
story_key: 1-3-react-app-shell-login-and-first-run-setup-screens
story_title: "React App Shell, Login & First-Run Setup Screens"
status: done
priority: critical
baseline_commit: "9e84d02f32374ec82f105e8c171b720d94976c26"
---

# Story 1.3: React App Shell, Login & First-Run Setup Screens

## Story

**As a** developer using Fishtank,  
**I want** a complete application shell with responsive navigation, the Clean Light theme, and functional login and setup screens,  
**So that** I can access the management UI securely and navigate between all sections.

---

## Status

Ready for Dev

---

## Context

### Background

Story 1.2 established the complete backend authentication system (JWT in httpOnly cookies, first-run setup gate, rate limiting, password hashing). This story builds the React SPA shell that consumes those endpoints: routing infrastructure, login form, first-run setup screen, responsive app layout (top bar, collapsible sidebar, content area), CSS variable theme system, `queryClient.ts` / `signalr.ts` seam contracts, and all supporting UI chrome. By the end of this story, a user can load the app, complete first-run setup or log in, and see the authenticated shell with sidebar navigation ready for subsequent feature stories.

### What Story 1.2 Left In Place

**Backend endpoints (all implemented, tested, and merged):**
- `POST /api/auth/setup` — creates the first admin account on a fresh instance; returns `{success: true, data: {username, role}}`
- `POST /api/auth/login` — 200 on success with `fishtank_auth` httpOnly cookie set; 401 on invalid credentials (generic message); 429 when rate limit exceeded
- `POST /api/auth/logout` — clears `fishtank_auth` cookie; returns `{success: true, data: null}`
- `PUT /api/auth/change-password` — updates password and resets `ForcePasswordChange` flag; returns `{success: true, data: null}`
- First-run middleware: returns `401 AUTH_SETUP_REQUIRED` for ALL routes (except `/api/auth/setup`, `/health`, `/openapi/…`) when no users exist in the DB

**JWT cookie name:** `fishtank_auth` — httpOnly, SameSite=Strict, Secure (production only)

**Response envelope (mandatory pattern — always use `apiFetch<T>()`):**
```json
{ "success": true, "data": { } }
{ "success": false, "error": { "code": "AUTH_INVALID_CREDENTIALS", "message": "…" } }
```

**Existing frontend scaffold (Story 1.1):**
- `src/client/package.json` has React 19, TypeScript strict, Vite (Rolldown), react-router-dom v7, @tanstack/react-query, @microsoft/signalr, shadcn/ui + Tailwind CSS v4, Vitest + RTL + msw, Playwright
- `src/client/index.html` entry point with `<div id="root"></div>`
- `src/client/src/main.tsx` and `App.tsx` are placeholder counter demo — REPLACE both
- `src/client/vite.config.ts` is configured with React plugin and HMR
- `@/` → `./src/` path alias is NOT yet configured — must be added in this story

### What This Story Does NOT Touch

- SignalR hub connections — `signalr.ts` exports factory but no hub is started; wired in Epic 2
- Actual mock-service features — Services, Network Activity, Mappings, Settings, Admin pages are placeholder stubs only
- Themes 2–4 (Deep Ocean, Emerald Terminal, Ink & Amber) — non-blocking Story 1.4; all 4 theme CSS blocks are written in this story but only Clean Light is exercised
- Custom SVG logo — PSG-1 pre-ship gate; use `bi-droplet-half` Bootstrap Icon as placeholder throughout
- Sign-out guard dialog for unsaved state — deferred to Story 4.6; sign-out in this story has no guard

### Architecture Mandates (DO NOT DEVIATE)

- All API calls go through `apiFetch<T>()` in `src/client/src/lib/api.ts` — never raw `fetch()` in components or hooks
- `credentials: 'include'` on every API call — JWT lives in httpOnly cookie
- 401 response from any API call → redirect to `/login` — handle in `apiFetch<T>()`, not in components
- Each feature folder (`features/{feature}/`) is self-contained — no cross-feature imports
- `components/ui/` is shadcn/ui generated — never hand-edit
- All routes defined in `router.tsx` — feature folders export page components only
- `data-testid` mandatory on every interactive and structural element
- Only use CSS custom properties for colors — never hardcode hex values in components
- Use `--topbar-icon-fg` (not `--content-fg`) for topbar icon colors — dark-theme topbars require the per-theme override

---

## Acceptance Criteria

**AC-1 — Unauthenticated redirect:**
**Given** the app loads at any protected route without a valid JWT cookie,
**Then** the browser redirects to `/login` (FR-24).

**AC-2 — First-run gate:**
**Given** a fresh instance with no registered users,
**When** the app loads at any route,
**Then** the browser redirects to `/setup` regardless of the requested route (FR-26).

**AC-3 — Login: valid credentials:**
**Given** the `/login` screen and a valid admin account exists,
**When** valid credentials are submitted,
**Then** the JWT cookie is set and the browser navigates to `/services` (FR-24).

**AC-4 — Login: invalid credentials:**
**Given** the `/login` screen,
**When** invalid credentials are submitted,
**Then** an inline error message is shown below the password field; the username field retains its value; the password field is cleared (FR-24).

**AC-5 — Setup screen: create admin account:**
**Given** the `/setup` screen on a fresh instance,
**When** a valid admin username and password (≥12 chars) are submitted,
**Then** the admin account is created, the JWT cookie is set, and the browser navigates to `/services` (FR-26).

**AC-6 — Setup screen: password validation:**
**Given** the `/setup` screen,
**When** the user submits with password < 12 characters,
**Then** an inline validation error displays ("Password must be at least 12 characters."); the form does not submit to the API.

**AC-7 — Forced-password-change state:**
**Given** a forced-password-change state (`forcePasswordChange: true` in login response),
**When** the user logs in,
**Then** a password-change form is shown (`/setup/change-password`) and `/services` is blocked until the password is changed via `PUT /api/auth/change-password` (FR-27).

**AC-8 — Top bar renders:**
**Given** the authenticated app shell,
**Then** the top bar renders at fixed 44px height with: logo slot (`bi-droplet-half` placeholder + "Fishtank" wordmark), About icon (`bi-info-circle`), notification bell stub (`bi-bell`, unread badge hidden), user avatar with sign-out dropdown (UX-DR5).

**AC-9 — Sign-out:**
**Given** the "Sign out" option in the user avatar dropdown is clicked (no unsaved-state guard in this story),
**Then** `POST /api/auth/logout` is called; on success the JWT cookie is cleared server-side and the browser navigates to `/login`; on network failure an error toast is shown and the session remains active (FR-24).

**AC-10 — About modal:**
**Given** the About icon (`bi-info-circle`) is clicked,
**Then** the About modal opens showing: app name, version (`FISHTANK_VERSION` env var), Docker tag (`FISHTANK_DOCKER_TAG`), build hash (`FISHTANK_BUILD_HASH`), docs link (`FISHTANK_DOCS_URL`), changelog link (`FISHTANK_CHANGELOG_URL`); any item whose env var is unset is hidden — not rendered as a broken or empty link (UX-DR11).

**AC-11 — Sidebar (desktop ≥1024px):**
**Given** desktop viewport (≥1024px),
**Then** the sidebar is expanded (200px) with all nav items and correct Bootstrap Icons: Services (`bi-server`), Network Activity (`bi-activity`), Mappings (`bi-file-earmark-code`), System Events (`bi-journal-text`), Settings (`bi-gear`), collapse toggle (`bi-chevron-double-left`) at bottom (UX-DR5, UX-DR15).

**AC-12 — Sidebar collapsed (768–1023px):**
**Given** mid-size tablet viewport (768–1023px),
**Then** the sidebar defaults to collapsed (52px icon-only), expand/collapse works, state persisted to localStorage.

**AC-13 — Sidebar hidden — hamburger (<768px):**
**Given** viewport < 768px,
**Then** the sidebar is hidden and a hamburger button (`bi-list`, `aria-label="Open navigation"` when closed / `"Close navigation"` when open, `aria-controls="main-sidebar"`, `aria-expanded` mirroring state) is visible; the sidebar element carries `id="main-sidebar"`; opening the sidebar shows a `rgba(0,0,0,0.4)` backdrop; tapping the backdrop closes the sidebar (UX-DR5).

**AC-14 — Responsive breakpoints:**
**Given** any viewport,
**Then** the 4 canonical responsive breakpoints function correctly: 3-col card grid (≥1024px) → 2-col (640–1023px) → 1-col (<640px); sidebar 200px expanded (≥1024px) → 52px collapsed (768–1023px) → hidden hamburger (<768px); Settings sub-nav left-nav (≥768px) → `<select>` (<768px) (UX-DR6).

**AC-15 — Settings route:**
**Given** the `/settings` route,
**Then** the Settings page renders with its sub-navigation structure (4 sections): Appearance, Activity, Cache, Mocks Root — sub-nav is a left-nav panel at ≥768px and a `<select>` at <768px; each section shows a placeholder ("Configured in a later story") until populated by the responsible story (UX-DR5, UX-DR6).

**AC-16 — Clean Light theme:**
**Given** the Clean Light theme (`data-theme="clean-light"` on `<html>`),
**Then** all CSS custom properties from DESIGN.md Clean Light token block resolve correctly including `--topbar-icon-fg: #1e293b`, `--error-row-bg: rgba(239,68,68,.04)`, `--success-subtle: #dcfce7`, `--brand-fg: #ffffff` (UX-DR1).

**AC-17 — queryClient and signalr stubs:**
**Given** `src/client/src/lib/queryClient.ts`,
**Then** it exports a configured `QueryClient` instance and defines `HUB_INVALIDATION_MAP` as a typed `Record<string, QueryKey[]>` constant (initially empty — populated in subsequent epics); `src/client/src/lib/signalr.ts` exports a `createHubConnection(url: string)` factory function returning a `HubConnection`.

**AC-18 — prefers-reduced-motion:**
**Given** the global stylesheet,
**Then** a `@media (prefers-reduced-motion: reduce)` block is present disabling transitions/animations on all 8 animated element classes: `.sidebar`, `.collapse-chevron`, `.live-pulse`, `.bottom-sheet`, `.toast`, `.notification-badge`, `.refresh-icon`, `.recording-cross-screen` (UX-DR13).

**AC-19 — Typography tokens:**
**Given** all typography,
**Then** table column headers: `0.6875rem` + bold + uppercase + letter-spacing 0.05em; page titles: `1rem` + extrabold; nav items: `0.875rem` + medium; timestamps: `0.75rem` + muted (UX-DR4).

**AC-20 — Z-index stack:**
**Given** the z-index stack,
**Then** sidebar=20, top bar=30, notification-panel=40, right-drawer=50, modal-backdrop=60, modal=70, toast=80, tooltip=90 (UX-DR14).

**AC-21 — NFR-1 initial load:**
**Given** all assets served from the container (container already running),
**When** the initial page renders,
**Then** it completes within 2 seconds on a standard broadband connection (NFR-1).

---

## Tasks / Subtasks

- [x] **Task 1: Configure path aliases and verify build**
  - [x] Update `vite.config.ts`: add `resolve.alias: { '@': path.resolve(__dirname, './src') }`
  - [x] Update `tsconfig.app.json`: add `"paths": { "@/*": ["./src/*"] }` under `compilerOptions`
  - [x] Verify `npm run build` compiles with 0 errors

- [x] **Task 2: Create lib directory with API client, QueryClient, and SignalR stubs**
  - [x] Create `src/client/src/lib/api.ts` — `apiFetch<T>()` with `credentials: 'include'`, unwrap envelope, throw `ApiError` on `success: false`, redirect to `/login` on 401
  - [x] Create `src/client/src/lib/queryClient.ts` — `QueryClient` configured with 1-min staleTime + `HUB_INVALIDATION_MAP` typed as `Record<string, QueryKey[]>` (initially `{}` — DO NOT populate; subsequent epics own this)
  - [x] Create `src/client/src/lib/signalr.ts` — `createHubConnection(url: string): HubConnection` factory; do NOT start any connection (wired in Epic 2)
  - [x] Create `src/client/src/lib/useBreakpoint.ts` — hook returning `{ desktop: boolean, mid: boolean, midNarrow: boolean, mobile: boolean }` using `useMediaQuery` or `window.matchMedia` listeners at 1024px, 768px, 640px

- [x] **Task 3: Global styles and all 4 theme CSS variable blocks**
  - [x] Create `src/client/src/styles/theme.css`:
    - CSS custom property declarations (`:root` defaults = Clean Light values)
    - `[data-theme="clean-light"]` override block (full set from DESIGN.md)
    - `[data-theme="deep-ocean"]` override block (full set from DESIGN.md)
    - `[data-theme="emerald-terminal"]` override block (full set from DESIGN.md)
    - `[data-theme="ink-amber"]` override block (full set from DESIGN.md)
    - `@media (prefers-reduced-motion: reduce)` block disabling 8 animated element classes
  - [x] Create `src/client/src/styles/globals.css`:
    - Base font-family (`Inter, ui-sans-serif, …`)
    - Z-index custom properties (`--z-sidebar: 20; --z-topbar: 30; …` through `--z-tooltip: 90`)
    - Typography utility classes for table headers, page titles, nav items, timestamps
  - [x] Update `src/client/src/main.tsx` (or `index.css`) to import both files
  - [x] Set `<html data-theme="clean-light">` as the default on first load (switch to `prefers-color-scheme` logic; see AC-16)

- [x] **Task 4: Router infrastructure (all routes)**
  - [x] Create `src/client/src/router.tsx` with `createBrowserRouter`:
    - `/login` → `LoginPage`
    - `/setup` → `SetupPage`
    - `/setup/change-password` → `ChangePasswordPage`
    - `/*` (protected, via AppShell layout route):
      - `/services` → `ServicesPage`
      - `/activity` → `ActivityPage`
      - `/mappings` → `MappingsPage`
      - `/events` → `EventsPage`
      - `/settings` → `SettingsPage` (with sub-routing for 4 sections)
      - `/admin` → `AdminPage`
  - [x] Create `src/client/src/components/router/ProtectedRoute.tsx` — checks auth (calls `GET /api/auth/me`); redirects to `/login` if 401; redirects to `/setup/change-password` if `forcePasswordChange: true`
  - [x] Create `src/client/src/components/router/FirstRunGate.tsx` — calls `GET /api/setup/status`; if `needsSetup: true` redirects all non-setup routes to `/setup`

- [x] **Task 5: Auth types, hooks, and pages**
  - [x] Create `src/client/src/features/auth/types/auth.ts` — `AuthUser`, `LoginRequest`, `LoginResponse`, `SetupRequest`, `ChangePasswordRequest` interfaces
  - [x] Create `src/client/src/features/auth/hooks/useAuth.ts` — wraps `GET /api/auth/me` with React Query; exposes `{ user, isLoading, isAuthenticated }`
  - [x] Create `src/client/src/features/auth/hooks/useLogin.ts` — `useMutation` for `POST /api/auth/login`
  - [x] Create `src/client/src/features/auth/hooks/useSetup.ts` — `useMutation` for `POST /api/auth/setup`
  - [x] Create `src/client/src/features/auth/hooks/useChangePassword.ts` — `useMutation` for `PUT /api/auth/change-password`
  - [x] Create `src/client/src/features/auth/pages/LoginPage.tsx` (AC-1, AC-3, AC-4):
    - `data-testid="login-page"`, `data-testid="login-username-input"`, `data-testid="login-password-input"`, `data-testid="login-submit-button"`, `data-testid="login-error-message"`
    - On 401: show inline error, retain username, clear password
    - On success: navigate to `/services`
  - [x] Create `src/client/src/features/auth/pages/SetupPage.tsx` (AC-2, AC-5, AC-6):
    - `data-testid="setup-page"`, `data-testid="setup-username-input"`, `data-testid="setup-password-input"`, `data-testid="setup-submit-button"`, `data-testid="setup-error-message"`
    - Client-side validation: password ≥12 chars before submit
    - On success: navigate to `/services`
  - [x] Create `src/client/src/features/auth/pages/ChangePasswordPage.tsx` (AC-7):
    - `data-testid="change-password-page"`, all form field testids
    - On success: clear forcePasswordChange state, navigate to `/services`

- [x] **Task 6: Top bar component**
  - [x] Create `src/client/src/components/layout/TopBar.tsx` (AC-8, AC-9, AC-10):
    - Fixed 44px height, `z-index: var(--z-topbar)`, `background: var(--topbar-bg)`, border-bottom `var(--topbar-border)`
    - Logo: `bi-droplet-half` icon + "Fishtank" wordmark; all text/icon colors use `var(--topbar-icon-fg)` (NOT `--content-fg`)
    - `data-testid` on every element: `topbar`, `topbar-logo`, `topbar-about-button`, `topbar-bell-button`, `topbar-avatar-button`, `topbar-signout-button`
    - ARIA: `aria-label="About Fishtank"` on About button, `aria-label="Notifications"` on Bell, `aria-label="{username}, {role}"` on avatar
    - Hamburger button (visible <768px only): `data-testid="hamburger-button"`, `aria-label="Open navigation"` / `"Close navigation"`, `aria-controls="main-sidebar"`, `aria-expanded` mirrors sidebar open state

- [x] **Task 7: About modal**
  - [x] Create `src/client/src/components/modals/AboutModal.tsx` (AC-10):
    - Reads env vars injected as Vite `import.meta.env.VITE_*` (see Dev Notes for injection pattern)
    - Hides each item if the env var is empty/undefined — never renders a broken link
    - `aria-labelledby="about-modal-title"`, `id="about-modal-title"` on title
    - `data-testid="about-modal"` on dialog, `data-testid="about-version"`, `data-testid="about-docs-link"`, etc.

- [x] **Task 8: Sidebar component**
  - [x] Create `src/client/src/components/layout/Sidebar.tsx` (AC-11, AC-12, AC-13):
    - `id="main-sidebar"` (required for `aria-controls`)
    - `z-index: var(--z-sidebar)`, `background: var(--sidebar-bg)`
    - Nav items with `data-testid`: `sidebar-nav-services`, `sidebar-nav-activity`, `sidebar-nav-mappings`, `sidebar-nav-events`, `sidebar-nav-settings`
    - Active item: `aria-current="page"`, active colors from `--sidebar-active-bg` / `--sidebar-active-fg`
    - Collapse toggle: `bi-chevron-double-left`, `data-testid="sidebar-collapse-toggle"`, rotates 180° when collapsed; transition `transform 200ms ease`
    - Sidebar width transition: `width 200ms ease`; suppress both with `prefers-reduced-motion` (add `.sidebar` and `.collapse-chevron` to the reduce-motion block)
    - Collapse state persisted to `localStorage` key `fishtank-sidebar-collapsed`
    - Mobile (<768px): overlay mode with `rgba(0,0,0,0.4)` backdrop div; `data-testid="sidebar-backdrop"`

- [x] **Task 9: App shell layout**
  - [x] Create `src/client/src/components/layout/AppShell.tsx` (AC-8, AC-11–AC-14):
    - Outer flex layout: TopBar (fixed top 44px) + flex row (Sidebar | main content)
    - Main content `flex: 1`, `padding: var(--page-py) var(--page-px)`, `background: var(--content-bg)`
    - `data-testid="app-shell"`, `data-testid="main-content"`
    - Renders `<Outlet />` for child route content
    - First-run gate check on mount (uses FirstRunGate logic or ProtectedRoute)

- [x] **Task 10: Placeholder pages for all feature routes**
  - [x] `src/client/src/features/services/pages/ServicesPage.tsx` — `data-testid="page-services"`
  - [x] `src/client/src/features/activity/pages/ActivityPage.tsx` — `data-testid="page-activity"`
  - [x] `src/client/src/features/mappings/pages/MappingsPage.tsx` — `data-testid="page-mappings"`
  - [x] `src/client/src/features/events/pages/EventsPage.tsx` — `data-testid="page-events"`
  - [x] `src/client/src/features/settings/pages/SettingsPage.tsx` (AC-15): sub-nav with 4 sections (Appearance, Activity, Cache, Mocks Root); left-nav ≥768px, `<select>` <768px; each section shows placeholder text — `data-testid="page-settings"`
  - [x] `src/client/src/features/admin/pages/AdminPage.tsx` — `data-testid="page-admin"`

- [x] **Task 11: Update main.tsx — remove placeholder counter, wire QueryClient + router**
  - [x] Replace placeholder `App.tsx` counter content
  - [x] Wrap `RouterProvider` with `QueryClientProvider` using `queryClient` from `lib/queryClient.ts`
  - [x] Apply initial theme: read `localStorage('fishtank-theme')` → if set use it; else use `prefers-color-scheme` (dark → `deep-ocean`, else `clean-light`); set `document.documentElement.dataset.theme`

- [x] **Task 12: Playwright E2E tests for auth flows**
  - [x] Create `src/client/tests/e2e/story-1-3-shell.spec.ts` (completed in ATDD phase):
    - `AC-1`: unauthenticated → redirect to `/login` ✅
    - `AC-2`: fresh instance (no users) → redirect to `/setup` ✅
    - `AC-3`: valid login → cookie set → navigate to `/services` ✅
    - `AC-4`: invalid login → inline error, username retained, password cleared ✅
    - `AC-5`: valid setup → admin created → navigate to `/services` ✅
    - `AC-8`: top bar renders (logo, about icon, bell, avatar) ✅
    - `AC-10`: About modal opens ✅
    - `AC-9`: sign-out → `POST /api/auth/logout` called → navigate to `/login` ✅
    - `AC-11`: sidebar visible with all 5 nav items on desktop ✅
    - `AC-13`: hamburger visible on mobile viewport (375px wide) ✅

- [x] **Task 13: Verify all DoD gates**
  - [x] Gate 1: `dotnet test src/Fishtank.Api.IntegrationTests` — 28/28 PASS (no regressions)
  - [x] Gate 2: `npm run build` in `src/client` — 0 TypeScript errors, built in 2.41s
  - [x] Gate 3: `dotnet build src/Fishtank.slnx` — 0 errors, 6 pre-existing NU1903 warnings only
  - [x] Gate 4: All Story1_3 Playwright ATDD tests GREEN (10/10 pass)

---

## Dev Agent Record

### Completion Notes
Implementation complete. All 32 new files created. All DoD gates verified:
- **Gate 1**: `dotnet test` → 28/28 PASS, no regressions
- **Gate 2**: `npm run build` → 0 TypeScript errors, built in 2.41s
- **Gate 3**: `dotnet build` → 0 errors (6 pre-existing NU1903 SQLitePCLRaw warnings only)
- **Gate 4**: `npx playwright test tests/e2e/story-1-3-shell.spec.ts` → 10/10 PASS

### Notable Decisions
- Bootstrap Icons installed via npm (`bootstrap-icons` pkg) — was not pre-installed
- Used `ignoreDeprecations: "6.0"` in tsconfig.app.json for TypeScript 6 `baseUrl` deprecation
- Used `erasableSyntaxOnly`-compatible pattern for `ApiError` (class field declaration instead of constructor parameter property)
- CSS Modules used for component-scoped styles; global design tokens in `theme.css` / `globals.css`
- Task 12 (Playwright tests) satisfied by ATDD phase scaffold at `tests/e2e/story-1-3-shell.spec.ts`
- `apiFetch` extended with `redirectOn401` option so login endpoint errors surface as inline messages rather than full-page redirects
- `useAuth` `isLoading` also covers `isFetching && !user` to prevent premature redirect during query invalidation after login
- Sidebar mobile hidden state uses both `transform: translateX(-100%)` and `visibility: hidden` for Playwright `toBeVisible()` compatibility

### Review Findings

#### Patches Applied (9)
- [x] [Review][Patch] `api.ts`: non-401 HTTP errors threw SyntaxError when body was non-JSON — fixed by parsing body once with `.catch(() => null)` and using `res.ok` check [api.ts]
- [x] [Review][Patch] `useAuth`: called `apiFetch` without `redirectOn401:false`, causing hard redirect on session expiry instead of soft React Router redirect with `state.from` [useAuth.ts]
- [x] [Review][Patch] `useSetup`: missing `redirectOn401:false` on the setup endpoint POST [useSetup.ts]
- [x] [Review][Patch] `useChangePassword`: missing `redirectOn401:false` on the change-password PUT [useChangePassword.ts]
- [x] [Review][Patch] `main.tsx`: `localStorage.getItem` at module scope with no try/catch — wrapped in try/catch [main.tsx]
- [x] [Review][Patch] `Sidebar`: both `localStorage.getItem` in `useState` initializer and `localStorage.setItem` in `useEffect` lacked try/catch — both wrapped [Sidebar.tsx]
- [x] [Review][Patch] `AppShell`: `mobileSidebarOpen` did not reset when breakpoint changed from mobile to desktop — added `useEffect([mobile])` to reset state [AppShell.tsx]
- [x] [Review][Patch] `LoginPage`: ignored `state.from` — now consumes `location.state.from.pathname` for redirect-back after session expiry [LoginPage.tsx]
- [x] [Review][Patch] `TopBar.handleSignOut`: no double-click guard — added `signingOut` state flag; also added `redirectOn401:false` to logout call [TopBar.tsx]

#### Deferred
- [x] [Review][Defer] `FirstRunGate`: query failure on error silently passes to children — deferred, acceptable trade-off (ProtectedRoute catches unauthenticated users; setup error on first boot is edge case)
- [x] [Review][Defer] CSRF protection: POST calls have no anti-CSRF header — deferred, pre-existing (server sets SameSite=Strict; client-only app)
- [x] [Review][Defer] `body.data as T` unchecked cast — deferred, architecture pattern (server contract guarantees data presence when success=true)
- [x] [Review][Defer] `ChangePasswordPage`: no confirm-password field — deferred, out of story scope
- [x] [Review][Defer] `AboutModal`: href not validated for protocol scheme — deferred, build-time env var, low risk
- [x] [Review][Defer] `useBreakpoint`: resize handler not debounced — deferred, minor perf, non-blocking
- [x] [Review][Defer] `/setup` route accessible to authenticated users — deferred, server-side validation is the authoritative guard
- [x] [Review][Defer] SignalR reconnect does not handle 401 — deferred, out of story scope (SignalR consumers not yet implemented)

---

## Dev Notes

### File Structure to Create

```
src/client/src/
  lib/
    api.ts               # apiFetch<T>() — always import from here, never raw fetch
    queryClient.ts       # QueryClient + empty HUB_INVALIDATION_MAP
    signalr.ts           # createHubConnection() factory — NOT started here
    useBreakpoint.ts     # useBreakpoint() hook
  styles/
    theme.css            # 4 theme CSS variable blocks + prefers-reduced-motion
    globals.css          # z-index custom properties, base typography, resets
  components/
    layout/
      TopBar.tsx         # 44px fixed bar — logo, about, bell, avatar, hamburger
      Sidebar.tsx        # 200px/52px collapsible + mobile overlay
      AppShell.tsx       # Layout wrapper with Outlet
    modals/
      AboutModal.tsx     # Env-var driven content, hidden if unset
    router/
      ProtectedRoute.tsx # Auth gate + forcePasswordChange redirect
      FirstRunGate.tsx   # Redirects to /setup if needsSetup: true
  features/
    auth/
      pages/
        LoginPage.tsx
        SetupPage.tsx
        ChangePasswordPage.tsx
      hooks/
        useAuth.ts
        useLogin.ts
        useSetup.ts
        useChangePassword.ts
      types/
        auth.ts
    services/pages/ServicesPage.tsx
    activity/pages/ActivityPage.tsx
    mappings/pages/MappingsPage.tsx
    events/pages/EventsPage.tsx
    settings/pages/SettingsPage.tsx
    admin/pages/AdminPage.tsx
  router.tsx             # createBrowserRouter — all 8 routes
  main.tsx               # Replace: QueryClientProvider + RouterProvider
```

### lib/api.ts — Full Reference Implementation

```typescript
class ApiError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, { credentials: 'include', ...options });
  if (res.status === 401) {
    window.location.href = '/login';
    throw new ApiError('AUTH_UNAUTHORIZED', 'Redirecting to login');
  }
  const body = await res.json();
  if (!body.success) throw new ApiError(body.error.code, body.error.message);
  return body.data as T;
}

export { apiFetch, ApiError };
```

### lib/queryClient.ts — Full Reference Implementation

```typescript
import { QueryClient, type QueryKey } from '@tanstack/react-query';

export const HUB_INVALIDATION_MAP: Record<string, QueryKey[]> = {
  // Populated by subsequent epics — DO NOT add entries in this story
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
});
```

### lib/signalr.ts — Full Reference Implementation

```typescript
import { HubConnectionBuilder, type HubConnection } from '@microsoft/signalr';

export function createHubConnection(url: string): HubConnection {
  return new HubConnectionBuilder()
    .withUrl(url, { withCredentials: true })
    .withAutomaticReconnect()
    .build();
  // DO NOT call .start() here — each feature that needs real-time wires its own hub in Epic 2+
}
```

### Bootstrap Icon Names (DO NOT GUESS)

| Element | Icon class |
|---|---|
| Logo placeholder | `bi-droplet-half` |
| About | `bi-info-circle` |
| Notification bell | `bi-bell` |
| Services nav | `bi-server` |
| Network Activity nav | `bi-activity` |
| Mappings nav | `bi-file-earmark-code` |
| System Events nav | `bi-journal-text` |
| Settings nav | `bi-gear` |
| Sidebar collapse toggle | `bi-chevron-double-left` |
| Hamburger | `bi-list` |

Bootstrap Icons are included via the `bootstrap-icons` npm package — check `package.json`. If not present: `npm install bootstrap-icons` and import the CSS in `main.tsx`: `import 'bootstrap-icons/font/bootstrap-icons.css'`.

### Environment Variables for About Modal

The About modal reads build-time env vars injected by Docker/CI as Vite variables. The convention:

```
FISHTANK_VERSION       → import.meta.env.VITE_VERSION
FISHTANK_DOCKER_TAG    → import.meta.env.VITE_DOCKER_TAG
FISHTANK_BUILD_HASH    → import.meta.env.VITE_BUILD_HASH
FISHTANK_DOCS_URL      → import.meta.env.VITE_DOCS_URL
FISHTANK_CHANGELOG_URL → import.meta.env.VITE_CHANGELOG_URL
```

Vite exposes env vars with `VITE_` prefix. These are set via Docker build args (in Dockerfile `ARG VITE_VERSION` → `--build-arg`). For local dev with no vars set, all values will be `undefined` — the About modal must hide those items entirely (not render as `undefined` or empty).

In E2E tests, set via Playwright `VITE_VERSION=test` etc. if needed.

### CSS Custom Properties — Critical Reference

**All 4 theme blocks are written in `theme.css` for completeness, but only Clean Light is exercised in this story.**

Key: use `var(--topbar-icon-fg)` — NOT `var(--content-fg)` — for ALL icons/text in the top bar. In Deep Ocean, Emerald Terminal, and Ink & Amber, `--content-fg` targets the light content area and is near-invisible on dark topbars. `--topbar-icon-fg` is defined per-theme to guarantee contrast.

```css
/* Clean Light — topbar-icon-fg is dark (content-fg) because topbar is white */
[data-theme="clean-light"] { --topbar-icon-fg: #1e293b; }

/* Dark-topbar themes — topbar-icon-fg is white/light */
[data-theme="deep-ocean"]         { --topbar-icon-fg: #cbd5e1; }
[data-theme="emerald-terminal"]   { --topbar-icon-fg: #ffffff; }
[data-theme="ink-amber"]          { --topbar-icon-fg: #ffffff; }
```

Hover backgrounds on the top bar:
- Dark topbar (Deep Ocean, Emerald, Ink & Amber): `rgba(255,255,255,.08)`
- Light topbar (Clean Light): `rgba(0,0,0,.05)`

### The 8 Animated Element Classes (prefers-reduced-motion)

```css
@media (prefers-reduced-motion: reduce) {
  .sidebar { transition: none; }
  .collapse-chevron { transition: none; }
  .live-pulse { animation: none; box-shadow: 0 0 0 2px var(--success-subtle); }
  .bottom-sheet { transition: none; }
  .toast { transition: none; }
  .notification-badge { animation: none; }
  .refresh-icon { animation: none; }
  .recording-cross-screen { transition: none; opacity: 1; }
}
```

Note: `.live-pulse` and `.recording-cross-screen` are not rendered in this story but the CSS must be present now so Epic 2 and 3 can use the class names immediately.

### Sidebar Animation Classes

Apply these CSS classes to the sidebar element and chevron:
- `.sidebar` → `transition: width 200ms ease;` (normal mode)
- `.collapse-chevron` → `transition: transform 200ms ease;` and `transform: rotate(180deg)` when sidebar is collapsed

### Responsive Breakpoints (Canonical — DO NOT DEVIATE)

| Breakpoint | Viewport | Sidebar | Card grid | Settings sub-nav |
|---|---|---|---|---|
| Desktop | ≥1024px | Expanded 200px | 3-col | Left nav 170px |
| Mid-wide | 768–1023px | Collapsible 52px (default collapsed) | 2-col | Left nav 170px |
| Mid-narrow | 640–767px | Hidden / hamburger | 2-col | `<select>` |
| Mobile | <640px | Hidden / hamburger | 1-col | `<select>` |

Use `useBreakpoint()` hook in components where needed. In CSS, use `@media` queries at 1024px, 768px, 640px.

### ARIA Attributes Mandatory Checklist

| Element | Required ARIA |
|---|---|
| Logo | `aria-label="Fishtank — go to services"` |
| About button | `aria-label="About Fishtank"` |
| Bell button | `aria-label="Notifications"`, `aria-expanded` when panel opens |
| Avatar button | `aria-label="{username}, {role}"` |
| Sign out button | `aria-label="Sign out"` |
| Sidebar `<nav>` | `id="main-sidebar"` |
| Active nav item | `aria-current="page"` |
| Hamburger button | `aria-label="Open navigation"` / `"Close navigation"`, `aria-controls="main-sidebar"`, `aria-expanded` |
| About modal dialog | `role="dialog"`, `aria-labelledby="about-modal-title"` |
| About modal title | `id="about-modal-title"` |

### API Endpoints Reference (All from Story 1.2)

```
POST /api/auth/login         → LoginResponse { username, role, forcePasswordChange }
POST /api/auth/setup         → { username, role }
POST /api/auth/logout        → null (data)
PUT  /api/auth/change-password → null (data)
GET  /api/auth/me            → AuthUser { userId, username, role, forcePasswordChange }
GET  /api/setup/status       → { needsSetup: boolean }
```

All responses use the envelope: `{ success: true, data: T }` or `{ success: false, error: { code, message } }`.
Always unwrap via `apiFetch<T>()` — never parse the envelope manually in components.

### What NOT to Do

- DO NOT store JWT in localStorage — httpOnly cookie only; the browser handles it automatically
- DO NOT call `credentials: 'include'` directly in components — use `apiFetch<T>()` which sets it
- DO NOT clear username field on login error — keep for user convenience
- DO NOT use CSS class names as test selectors — use `data-testid` only in Playwright
- DO NOT render broken/empty links for unset About modal env vars — hide the entire row
- DO NOT use non-standard z-index values — follow the documented 8-layer stack
- DO NOT use `--content-fg` on the top bar — use `--topbar-icon-fg`
- DO NOT hardcode hex colors — always use CSS custom properties
- DO NOT start any SignalR hub connection — `signalr.ts` exports the factory only; Epic 2 wires it
- DO NOT populate `HUB_INVALIDATION_MAP` — leave it empty `{}`; subsequent epics own each entry
- DO NOT hand-edit files in `components/ui/` — that is shadcn/ui generated code
- DO NOT add cross-feature imports between `features/` subfolders

### First-Run Check Strategy

On app startup, `ProtectedRoute` / `FirstRunGate` should call `GET /api/setup/status`. If `needsSetup: true`, redirect to `/setup`. Otherwise check `GET /api/auth/me` to determine auth state. Use React Query with a short cache (or `staleTime: 0`) so the status is always fresh on mount. This avoids races where a token exists but the first-run gate is re-checked.

---

## Dev Agent Record

### Implementation Plan

_To be populated by the dev agent during implementation._

### Debug Log

_To be populated by the dev agent if issues arise._

### Completion Notes

_To be populated by the dev agent on completion._

---

### File List

**New files:**
_To be populated by the dev agent on completion._

**Modified files:**
_To be populated by the dev agent on completion._

---

### Change Log

_To be populated by the dev agent on completion._
