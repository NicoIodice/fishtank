# Deferred Work

## Deferred from: exploratory testing session (2026-06-27)

- [EX-1] `ServiceManager.StopAsync` and `StartAsync` do not emit `Info` system events on success. The UX spec (EXPERIENCE.md — System Events screen, Info tab) explicitly lists "service restarts" as an expected Info tab entry. Neither stop nor start writes a `SystemEvent` with `severity=info` today. Add `systemEvents.AddAsync(SystemEventSeverity.Info, ...)` calls at the successful-exit paths of both methods in a future story.

## Deferred from: test-review of 2-1-wiremock-engine-layer-and-services-api-backend (2026-06-22)

- [TR-W1] `Story2_1_ServicesTests.cs` is 640 lines — split into `Story2_1_CreateServiceTests.cs`, `Story2_1_UpdateStopStartTests.cs`, `Story2_1_SystemEventsAndPortTests.cs` when tests grow beyond 20.
- [TR-W2] `ThrowingWireMockFactory` lives inside the main test file — move to `src/Fishtank.Api.IntegrationTests/Support/ThrowingWireMockFactory.cs` when splitting.
- [TR-W3] AC-1 TCP polling timeout is 2000ms — bump to 5000ms if CI flakiness observed.

## Deferred from: code review of 2-1-wiremock-engine-layer-and-services-api-backend (2026-06-22)

- [B3] TOCTOU port conflict: two concurrent POST requests can both pass the port-uniqueness check since there is no UNIQUE constraint on `Services.Port`. Adding a DB-level constraint requires a migration; acceptable for single-admin tool.
- [B4] Raw `ex.Message` in SystemEvents: OS exception messages (file paths, hostnames) could be exposed to authenticated admins via `/api/system-events`. Admin-only surface — acceptable for now; sanitize in a future story.
- [E2] Concurrent Stop+Start race: two concurrent calls can produce DB state inconsistent with WireMock process state (no optimistic concurrency token). Out of scope for this story; add EF row-version token in a future story.
- [E4] `UpdateAsync` doesn't restart WireMock: changing port/URL via PUT leaves the running WireMock instance on the old port/URL. User must manually stop/start. Document this in UI; auto-restart is a future story.
- [E6] `TryTcpConnectAsync` 500ms timeout is CI-flaky on slow agents. Increase to 2000ms or add retry if flakiness is observed.
- [E7] `GetNextPortAsync` port-reclaim test missing: no test verifies that a deleted service's port is reclaimed by next-port. Add to future test-automate pass.
- [E8] AC-3b test doesn't assert first creation success: minor test quality gap — acceptable.
- [A3] AC-8 seed-file import not unit tested: `TryLoadSeedFileAsync` is covered only indirectly. Add dedicated integration test in test-automate pass.
- [A5] `/api/system-events` unauthenticated access not tested: add auth guard test in test-automate pass.
- [A6] AC-9 port-exhausted path now returns structured 400 (`SERVICE_PORT_RANGE_EXHAUSTED`) but no test covers the full-range boundary. Add in test-automate pass.
- [A7] `mocksRootChanged` is `null` (not `false`) when slug is unchanged. Client must treat absent/null as `false`. Document in API contract.
- [A8] `/hubs/services` unauthenticated WebSocket upgrade not tested. Add when SignalR consumers are implemented.

## Deferred from: code review of 1-3-react-app-shell-login-and-first-run-setup-screens (2026-06-22)

- `FirstRunGate`: query failure on error silently passes to children — acceptable trade-off (ProtectedRoute catches unauthenticated; setup error on first boot is edge case); consider adding retry + error UI in a future story
- CSRF: POST calls have no anti-CSRF header — server sets SameSite=Strict; acceptable for same-origin SPA
- `body.data as T` unchecked cast in `apiFetch` — architecture pattern; add runtime validation (zod) in future
- `ChangePasswordPage`: no confirm-password field — UX improvement for future story
- `AboutModal`: href not validated for protocol scheme — build-time env var; add `https://` assertion in CI
- `useBreakpoint`: resize handler not debounced — minor performance; add 50ms debounce in future
- `/setup` route accessible to authenticated users — server-side guard is authoritative; add client redirect in future
- SignalR: reconnect loop does not handle 401 (expired session) — add `onclose` 401 detection when SignalR consumers are implemented

## Deferred from: test-review + NFR + trace of 4-1-mappings-file-backend-crud-ifilewatcher-and-resync-engine (2026-06-29)

- ~~[4-1-T1] **AC-12 concurrent guard test false-positive**~~ ✅ Fixed 2026-06-28
- ~~[4-1-T2] **AC-5 I/O failure → System Event**~~ ✅ Fixed 2026-06-28
- ~~[4-1-T3] **NFR-2 performance test** uses 0-file fixture~~ ✅ Fixed 2026-06-28 (200 seeded files, ≤5s)
- ~~[4-1-T4] **AC-7 HTTP 409** and **AC-8 HTTP 404** missing integration tests~~ ✅ Fixed 2026-06-28
- [4-1-T5] **AC-16** (`POST /api/services/import`) deferred to future story; integration test has `[Skip]` attribute.
- ~~[4-1-T6] **FakeFileWatcher `Simulate*` methods** not directly tested~~ ✅ Fixed 2026-06-28 (6 tests added to FileWatcherContractTests)
- [4-1-T7] **AC-15 SignalR broadcast** only verified via HTTP response (not actual hub event). Full verification requires cookie-forwarded HubConnection or Playwright E2E test.
