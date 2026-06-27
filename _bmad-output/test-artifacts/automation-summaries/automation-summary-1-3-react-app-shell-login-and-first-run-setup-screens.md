# Test Automation Summary — Story 1-3: React App Shell, Login & First-Run Setup Screens

**Date:** 2026-06-26
**Phase:** test-automate (retroactive reconstruction)
**Story:** `1-3-react-app-shell-login-and-first-run-setup-screens`
**Test Suite Outcome:** Tests covering this story currently PASS as part of the Epic 1 / Epic 2 suite.

> **Note — retroactively reconstructed:** This per-story automation summary was reconstructed on **2026-06-26** from the test suite that exists in the repository today. The base `bmad-testarch-automate` skill wrote only a generic `automation-summary.md`, so no per-story artifact was persisted at the time Story 1-3 was automated. The coverage below reflects the *actual* tests on disk, not a historical snapshot.

---

## Acceptance-Criteria Coverage

| AC | Description | Test(s) | Layer | Status |
|----|-------------|---------|-------|--------|
| AC-1 | Unauthenticated → redirect to `/login` | E2E `story-1-3-shell.spec.ts` "AC-1: unauthenticated navigation to /services redirects to /login"; unit `useAuth.test.tsx` "returns null user on 401", "does NOT redirect to /login on 401" | E2E + Unit | FULL |
| AC-2 | Fresh instance (`needsSetup=true`) → redirect to `/setup` | E2E "AC-2: fresh instance (needsSetup=true) redirects any route to /setup" | E2E | FULL |
| AC-3 | Valid login → cookie set → navigate to `/services` | E2E "AC-3: valid login credentials set cookie and navigate to /services"; unit `useAuth.test.tsx` "returns user data on successful /api/auth/me" | E2E + Unit | FULL |
| AC-4 | Invalid login → inline error, username retained, password cleared | E2E "AC-4: invalid credentials show inline error and retain username" | E2E | FULL |
| AC-5 | Setup create admin → navigate to `/services` | E2E "AC-5: valid setup form creates admin account and navigates to /services" (incl. stale-cache redirect-loop regression guard) | E2E | FULL |
| AC-6 | Setup password < 12 chars → inline validation, no API submit | — | — | NONE (client-side `<12` validation has no dedicated test) |
| AC-7 | Forced-password-change → `/setup/change-password`; `/services` blocked until changed | — | — | NONE (no automated test for the forced-change redirect flow) |
| AC-8 | Top bar renders (logo, About, bell, avatar, sign-out) | E2E "AC-8: authenticated app shell renders top bar with all elements" | E2E | FULL |
| AC-9 | Sign-out → `POST /api/auth/logout` → navigate to `/login` | E2E "AC-9: sign-out calls logout endpoint and redirects to /login" | E2E | FULL |
| AC-10 | About modal opens; env-var fields hidden when unset | E2E "AC-10: About modal opens on button click" | E2E | PARTIAL (open asserted; hide-when-unset behaviour not asserted) |
| AC-11 | Sidebar expanded with 5 nav items (desktop ≥1024px) | E2E "AC-11: authenticated app shell renders sidebar with 5 nav items on desktop" | E2E | FULL |
| AC-12 | Sidebar collapsed (768–1023px); state persisted to localStorage | — | — | NONE (mid-size collapse + persistence not automated) |
| AC-13 | Sidebar hidden + hamburger (<768px) | E2E "AC-13: hamburger menu visible and sidebar hidden on mobile viewport" | E2E | FULL |
| AC-14 | Responsive breakpoints (grid + sidebar + settings sub-nav) | partially via AC-11/AC-13 viewport tests | E2E | PARTIAL (sidebar breakpoints only; card-grid + settings `<select>` switch not asserted) |
| AC-15 | Settings route + 4-section sub-nav | — | — | NONE |
| AC-16 | Clean Light theme tokens resolve | unit `useTheme.test.ts` "reads initial theme", "falls back to 'clean-light'", + 4-theme coverage | Unit | PARTIAL (theme switching/persistence covered; specific CSS token *values* not asserted) |
| AC-17 | `queryClient.ts` + `signalr.ts` seam contracts | unit `seam-contracts.test.ts` (queryClient export, HUB_INVALIDATION_MAP, createHubConnection factory + HubConnection surface) | Unit | FULL |
| AC-18 | `prefers-reduced-motion` block | — | — | NONE (CSS media block not automated) |
| AC-19 | Typography tokens | — | — | NONE |
| AC-20 | Z-index stack values | — | — | NONE |
| AC-21 | NFR-1 initial load < 2s | — | — | NONE (no perf assertion) |

### apiFetch envelope contract (foundational for AC-1, AC-3, AC-4)

`api.test.ts` (11 tests) — the mandated `apiFetch<T>()` seam: `returns data on 200`, `sends credentials: include`, `throws ApiError with AUTH_UNAUTHORIZED on 401`, `redirects to /login on 401 (default)`, `does NOT redirect when redirectOn401:false`, `surfaces error code+message from 401 body`, `HTTP_404 on JSON body`, `HTTP_502 on non-JSON body`, `HTTP_500 on JSON error`, `throws when success=false on 200`, `ApiError class shape`.

### useTheme hook (supports AC-16)

`useTheme.test.ts` (6 tests): initial theme from `dataset.theme`, fallback to `clean-light`, `setTheme` updates DOM + localStorage (`fishtank-theme`), all 4 themes accepted, no-throw when localStorage unavailable.

### useAuth hook (supports AC-1, AC-3)

`useAuth.test.tsx` (5 tests): user data on success, null on 401, no hard redirect on 401, `isLoading` while fetching, non-401 error → error state.

---

## Test Counts per Suite

| Suite / File | Layer | Tests |
|--------------|-------|-------|
| `src/client/tests/e2e/story-1-3-shell.spec.ts` | E2E (Playwright) | 10 |
| `src/client/tests/unit/lib/api.test.ts` | Unit (Vitest) | 11 |
| `src/client/tests/unit/lib/useTheme.test.ts` | Unit (Vitest) | 6 |
| `src/client/tests/unit/features/auth/useAuth.test.tsx` | Unit (Vitest) | 5 |
| `src/client/tests/unit/lib/seam-contracts.test.ts` | Unit (Vitest) | 4 |
| **Total automated tests directly tied to Story 1-3** | | **36 tests** |

---

## Coverage Summary

- **FULL:** AC-1, AC-2, AC-3, AC-4, AC-5, AC-8, AC-9, AC-11, AC-13, AC-17 (10 ACs)
- **PARTIAL:** AC-10 (open only), AC-14 (sidebar breakpoints only), AC-16 (switching not token values) (3 ACs)
- **NONE:** AC-6, AC-7, AC-12, AC-15, AC-18, AC-19, AC-20, AC-21 (8 ACs)

---

## Gaps & Notes

- **Auth-flow gaps (AC-6, AC-7):** The client-side "password must be ≥12 chars" setup validation (AC-6) and the forced-password-change redirect to `/setup/change-password` with `/services` blocked (AC-7) have no automated coverage. These are user-visible auth behaviours and are the highest-value gaps to close; both are E2E-testable with stateful route mocks like those already used for AC-5.
- **Responsive / layout gaps (AC-12, AC-14, AC-15):** Mid-size sidebar collapse + localStorage persistence (AC-12), the card-grid column changes and Settings `<select>` switch (AC-14), and the Settings 4-section sub-nav (AC-15) are not automated. Viewport-based E2E tests cover only the desktop-expanded and mobile-hamburger sidebar states.
- **Static-CSS / design-token gaps (AC-16 values, AC-18, AC-19, AC-20):** Specific CSS custom-property *values* (e.g. `--topbar-icon-fg: #1e293b`), the `prefers-reduced-motion` block, typography token sizes, and the z-index stack are declarative CSS and are not assertion-tested. `useTheme` covers theme *selection/persistence* but not the resolved token values.
- **Performance (AC-21):** The NFR-1 "< 2s initial load" target has no automated assertion.
- **Test infrastructure:** E2E uses Playwright with a shared `storageState` JWT fixture (`tests/support/fixtures`); auth-negative tests call `page.context().clearCookies()` and several use `page.route` to mock `/api/setup/status`, `/api/auth/me`, and `/api/auth/setup` (notably the stateful mock in AC-5 that flips `needsSetup` to guard against the stale-cache redirect loop). Unit tests use Vitest + RTL with `globalThis.fetch` spies.
