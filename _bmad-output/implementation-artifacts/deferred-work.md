# Deferred Work

## Deferred from: code review of 1-3-react-app-shell-login-and-first-run-setup-screens (2026-06-22)

- `FirstRunGate`: query failure on error silently passes to children — acceptable trade-off (ProtectedRoute catches unauthenticated; setup error on first boot is edge case); consider adding retry + error UI in a future story
- CSRF: POST calls have no anti-CSRF header — server sets SameSite=Strict; acceptable for same-origin SPA
- `body.data as T` unchecked cast in `apiFetch` — architecture pattern; add runtime validation (zod) in future
- `ChangePasswordPage`: no confirm-password field — UX improvement for future story
- `AboutModal`: href not validated for protocol scheme — build-time env var; add `https://` assertion in CI
- `useBreakpoint`: resize handler not debounced — minor performance; add 50ms debounce in future
- `/setup` route accessible to authenticated users — server-side guard is authoritative; add client redirect in future
- SignalR: reconnect loop does not handle 401 (expired session) — add `onclose` 401 detection when SignalR consumers are implemented
