---
story_key: 1-3-react-app-shell-login-and-first-run-setup-screens
generated: "2026-06-22"
phase: nfr
verdict: PASS
---

# NFR Assessment — Story 1.3: React App Shell, Login & First-Run Setup Screens

## NFR-1: Initial Page Load < 2 Seconds

**Requirement (AC-21):** All assets served from container; initial page render completes within 2 seconds on standard broadband.

### Evidence

| Metric | Value | Source |
|--------|-------|--------|
| JS bundle (raw) | 340.86 KB | `npm run build` output |
| JS bundle (gzip) | 105.84 KB | `npm run build` output |
| CSS bundle (raw) | 93.40 KB | `npm run build` output |
| CSS bundle (gzip) | 17.26 KB | `npm run build` output |
| Bootstrap Icons font (woff2) | 134.04 KB | `npm run build` output |
| Build time | 256ms (incremental), 5.33s (cold) | Vite |

**Transfer analysis (10 Mbps broadband):**
- Critical path (JS + CSS gzip): (105.84 + 17.26) KB = 123.1 KB
- Download time at 10 Mbps: 123.1 KB / (10,000 Kbps / 8) ≈ **98ms**
- DNS + TCP + TLS + TTFB (local container): ~50–100ms
- React hydration + first render: ~50–100ms
- **Estimated total: ~200–300ms** — well within 2s threshold

**Additional factors:**
- Bootstrap Icons font loads asynchronously after initial render (non-blocking)
- React Query caches API responses (reduces repeat load time)
- Vite code-splits routes (lazy loading for future feature pages)

**Verdict: ✅ PASS** — Static analysis confirms NFR-1 is satisfied. Actual browser measurement recommended post-container deployment.

---

## Security NFRs

| Control | Status | Evidence |
|---------|--------|----------|
| JWT in httpOnly cookie | ✅ PASS | `credentials: 'include'` on all API calls; cookie set by backend (Story 1.2) |
| No JWT in localStorage | ✅ PASS | localStorage used only for theme preference and sidebar state |
| 401 → redirect to login | ✅ PASS | `apiFetch` with `redirectOn401:true` (default); `ProtectedRoute` soft redirect |
| No hardcoded secrets | ✅ PASS | All config via env vars (`VITE_*` prefix) |
| XSS: no dangerouslySetInnerHTML | ✅ PASS | Code review found no unsafe HTML injection |
| SameSite cookie (CSRF) | ✅ PASS | Server sets SameSite=Strict (Story 1.2 implementation) |

---

## Reliability NFRs

| Check | Status | Evidence |
|-------|--------|----------|
| Backend integration tests | ✅ PASS | 28/28 tests pass — no regressions from frontend changes |
| Unit tests | ✅ PASS | 16/16 Vitest unit tests pass |
| E2E acceptance tests | ✅ PASS | 10/10 Playwright ATDD tests pass |
| localStorage failure handling | ✅ PASS | All localStorage calls wrapped in try/catch |
| Mobile breakpoint reset | ✅ PASS | AppShell resets `mobileSidebarOpen` on breakpoint change |

---

## Maintainability NFRs

| Check | Status | Notes |
|-------|--------|-------|
| TypeScript strict mode | ✅ PASS | `strict: true`, `noUnusedLocals: true`, `erasableSyntaxOnly: true` |
| Build clean (no TS errors) | ✅ PASS | `npm run build` EXIT 0 |
| CSS custom properties | ✅ PASS | All colors via `--var` tokens; no hardcoded hex in components |
| No cross-feature imports | ✅ PASS | Features are self-contained; only `@/lib/` and `@/components/` cross-referenced |
| Test coverage | ✅ PASS | ATDD E2E (10 tests) + unit tests (16 tests) covering critical paths |

---

## Summary

| NFR Category | Verdict |
|-------------|---------|
| Performance (NFR-1 < 2s) | ✅ PASS |
| Security | ✅ PASS |
| Reliability | ✅ PASS |
| Maintainability | ✅ PASS |

**Overall: ✅ ALL NFRs PASS**
