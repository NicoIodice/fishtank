# ATDD Checklist — Story 1-3: React App Shell, Login & First-Run Setup Screens

**story_key**: `1-3-react-app-shell-login-and-first-run-setup-screens`
**story_id**: `1.3`
**phase**: atdd
**mode**: Create
**date**: 2026-06-21

---

## Phase Gate Status

| Gate | Status |
|------|--------|
| ≥1 acceptance test file in `src/client/tests/e2e/` | ✅ `story-1-3-shell.spec.ts` created |
| Tests reference story ACs | ✅ AC-1, AC-2, AC-3, AC-4, AC-5, AC-8, AC-9, AC-10, AC-11, AC-13 |
| TypeScript compiles cleanly | ✅ `tsc --noEmit` exit 0 |
| Tests are RED against current codebase | ✅ 10/10 fail (ERR_CONNECTION_REFUSED — no app shell) |

---

## Scaffold File

`src/client/tests/e2e/story-1-3-shell.spec.ts`

---

## Tests Generated (10 total)

| Test | AC | Description |
|------|----|-------------|
| AC-1: unauthenticated navigation to /services redirects to /login | AC-1 | ProtectedRoute guard |
| AC-2: fresh instance (needsSetup=true) redirects any route to /setup | AC-2 | FirstRunGate |
| AC-3: valid login credentials set cookie and navigate to /services | AC-3 | Login success flow |
| AC-4: invalid credentials show inline error and retain username | AC-4 | Login failure flow |
| AC-5: valid setup form creates admin account and navigates to /services | AC-5 | Setup success flow |
| AC-8: authenticated app shell renders top bar with all elements | AC-8 | TopBar component |
| AC-9: sign-out calls logout endpoint and redirects to /login | AC-9 | Sign-out flow |
| AC-10: About modal opens on button click | AC-10 | AboutModal component |
| AC-11: authenticated app shell renders sidebar with 5 nav items on desktop | AC-11 | Sidebar component |
| AC-13: hamburger menu visible and sidebar hidden on mobile viewport | AC-13 | Responsive layout |

---

## Data-testid Contract

The following `data-testid` values are required by these tests and must be implemented:

| Element | `data-testid` | Component |
|---------|---------------|-----------|
| Login page wrapper | `login-page` | `LoginPage` |
| Setup page wrapper | `setup-page` | `SetupPage` |
| Login username input | `login-username-input` | `LoginPage` |
| Login password input | `login-password-input` | `LoginPage` |
| Login submit button | `login-submit-button` | `LoginPage` |
| Login error message | `login-error-message` | `LoginPage` |
| Setup username input | `setup-username-input` | `SetupPage` |
| Setup password input | `setup-password-input` | `SetupPage` |
| Setup submit button | `setup-submit-button` | `SetupPage` |
| Top bar container | `top-bar` | `TopBar` |
| Logo in top bar | `topbar-logo` | `TopBar` |
| About button | `topbar-about-button` | `TopBar` |
| Notification bell | `topbar-bell-button` | `TopBar` |
| Avatar button | `topbar-avatar-button` | `TopBar` |
| Sign-out menu item | `topbar-signout-button` | `TopBar` avatar dropdown |
| About modal | `about-modal` | `AboutModal` |
| Sidebar nav | `sidebar` | `Sidebar` |
| Services nav item | `sidebar-nav-services` | `Sidebar` |
| Activity nav item | `sidebar-nav-activity` | `Sidebar` |
| Mappings nav item | `sidebar-nav-mappings` | `Sidebar` |
| Events nav item | `sidebar-nav-events` | `Sidebar` |
| Settings nav item | `sidebar-nav-settings` | `Sidebar` |
| Hamburger button | `hamburger-button` | `TopBar` or `Layout` |

---

## API Mocking Contract

Tests mock these endpoints via `page.route()`:

| Endpoint | Mocked Response |
|----------|-----------------|
| `GET /api/setup/status` | `{ success: true, data: { needsSetup: false \| true } }` |
| `GET /api/auth/me` | `{ success: true, data: { userId, username, role, forcePasswordChange } }` or 401 |
| `POST /api/auth/login` | 200 with user data or 401 with error |
| `POST /api/auth/setup` | 200 with user data |
| `POST /api/auth/logout` | 200 |

---

## Notes

- AC-6 (forced-password-change) and AC-7 (change-password form) are not scaffolded here as they have more complex flow; covered in story dev notes.
- AC-12 (tablet layout), AC-14 (sidebar open/close hamburger), AC-15–AC-21 (CSS tokens, animations, z-index, NFR-1) are integration/visual concerns better covered in the `test-automate` phase.
- Story-1-1 ATDD scaffolds (`story-1-1-scaffold.spec.ts`) already cover the shell-level ACs (top bar, sidebar) and will turn GREEN when Story 1-3 implements the shell.
