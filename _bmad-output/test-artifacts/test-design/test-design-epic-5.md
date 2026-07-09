---
workflowStatus: 'complete'
totalSteps: 5
stepsCompleted:
  - step-01-detect-mode
  - step-02-load-context
  - step-03-risk-and-testability
  - step-04-coverage-plan
  - step-05-generate-output
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-07-09'
workflowType: 'testarch-test-design'
mode: 'epic-level'
epic: 5
epicTitle: 'Admin Console & User Management'
inputDocuments:
  - _bmad-output/project-context.md
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/test-artifacts/test-design/test-design-epic-4.md
---

# Test Design: Epic 5 — Admin Console & User Management

**Date:** 2026-07-09
**Author:** Murat (Master Test Architect)
**Status:** Draft
**Project:** Fishtank
**Epic Reference:** Epic 5 (v0.5.0)
**PRD FRs:** FR-29, FR-30, FR-31, FR-32, FR-33, FR-39, NFR-17

---

## Executive Summary

**Scope:** Epic-level test design for Epic 5 — Admin Console & User Management

Epic 5 delivers the administrative layer for Fishtank: runtime feature toggles with SignalR broadcast to all active sessions, user account management (create/view/deactivate with immediate JWT invalidation), health dashboard with operational metrics, audit trail viewer for all user and system actions, auto-registration toggle, and structured file logging with rolling daily retention. This epic builds on the auth infrastructure from Epic 1 (TokenVersion-based JWT invalidation), the SignalR hub pattern from Epics 2–4, and introduces the `TogglesHub` for real-time toggle propagation.

**Stories in Scope:**

| Story | Title | FRs |
|-------|-------|-----|
| **5-1** | Feature Toggles — Runtime Control & SignalR Broadcast | FR-30 |
| **5-2** | User Management — Create, View & Deactivate | FR-31 |
| **5-3** | Health Dashboard, Audit Log & Auto-Registration Toggle | FR-29, FR-32, FR-33 |
| **5-4** | Structured File Logging — Rolling Daily Files | FR-39, NFR-17 |

**Risk Summary:**

- Total risks identified: **7**
- High-priority risks (≥6): **2**
- Medium-priority risks (3–5): **4**
- Low-priority risks (1–2): **1**
- Critical categories: SEC, DATA, TECH, OPS

**Coverage Summary:**

- P0 scenarios: 18 (~8–12 hours)
- P1 scenarios: 26 (~12–16 hours)
- P2/P3 scenarios: 8 (~4–6 hours)
- **Total effort**: ~24–34 hours (~3–5 days)

---

## Not in Scope

| Item | Reasoning | Mitigation |
|------|-----------|------------|
| **Role change after account creation** | v1 supports only Admin and Standard User roles; no role editing | Document as v2 enhancement |
| **User deletion** | v1 uses deactivation only; soft-delete pattern | Deactivation tested; deletion deferred |
| **Password reset by admin** | v1 requires users to use forced password change on first login | ForcePasswordChange flow tested |
| **Audit log export** | v1 provides viewing only; no CSV/JSON export | Manual query against DB for compliance |
| **Custom feature toggle definitions** | v1 ships with fixed feature set; no user-defined toggles | Fixed toggle list tested |
| **Multi-instance audit log aggregation** | SQLite single-instance constraint | N/A — by design for v1 |

---

## Risk Assessment

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Prob | Impact | Score | Mitigation | Owner | Timeline |
|---------|----------|-------------|------|--------|-------|------------|-------|----------|
| **R-E5-001** | **SEC** | JWT invalidation race condition — user deactivation increments TokenVersion but existing request in-flight with old token completes, allowing unauthorized action window | 2 | 3 | **6** | Integration test: deactivate user mid-request → assert subsequent request with same JWT returns 401; JWT middleware checks TokenVersion on every request, not just at session start; token validation is synchronous per-request | Nico / Dev | Before Story 5-2 complete |
| **R-E5-002** | **SEC** | Admin role escalation — Standard User crafts request to access `/admin` endpoints directly bypassing frontend route guard | 2 | 3 | **6** | Integration tests: Standard User calling `GET /api/admin/toggles`, `PUT /api/admin/toggles/{name}`, `GET /api/admin/health`, `GET /api/admin/audit`, `PUT /api/users/{id}/deactivate` → all return HTTP 403; backend enforces role check, not just frontend | Nico / Dev | Before Story 5-1 complete |

### Medium-Priority Risks (Score 3–5)

| Risk ID | Category | Description | Prob | Impact | Score | Mitigation | Owner |
|---------|----------|-------------|------|--------|-------|------------|-------|
| **R-E5-003** | TECH | SignalR toggle broadcast race — toggle state persisted to DB but SignalR broadcast fails; some sessions see stale state until page refresh | 2 | 2 | 4 | Integration test: toggle change → verify both DB write and SignalR event; frontend subscribes to `FeatureToggleChanged` and calls `queryClient.invalidateQueries([["toggles"]])` | Nico / Dev |
| **R-E5-004** | DATA | Audit log volume growth — high-traffic instance generates excessive audit entries; no pruning mechanism in v1 | 2 | 2 | 4 | Document audit log table growth in README; add index on `CreatedAt` for query performance; future: add retention policy | Nico / Dev |
| **R-E5-005** | OPS | Log directory permission failure — `FISHTANK_LOG_PATH` directory not writable; file logging silently fails | 2 | 2 | 4 | Integration test: simulate unwritable directory → assert stdout warning logged, app continues; E2E: verify app health endpoint returns 200 with unwritable log path | Nico / QA |
| **R-E5-006** | TECH | Env var toggle override not visible — admin sees toggle as enabled in UI but env var override keeps it disabled; user confusion | 2 | 2 | 4 | UI shows "Locked by environment variable" indicator; toggle control disabled; tooltip explains env var precedence | Nico / Dev |

### Low-Priority Risks (Score 1–2)

| Risk ID | Category | Description | Prob | Impact | Score | Action |
|---------|----------|-------------|------|--------|-------|--------|
| **R-E5-007** | OPS | Log file rotation timing — daily rollover happens at UTC midnight; may cause confusion for users in non-UTC timezones | 1 | 1 | 1 | Document UTC rollover behavior in README; no code change needed |

### Risk Category Legend

- **SEC**: Security (access controls, auth, data exposure)
- **TECH**: Technical/Architecture (flaws, integration, scalability)
- **DATA**: Data Integrity (loss, corruption, inconsistency)
- **OPS**: Operations (deployment, config, monitoring)
- **UX**: User Experience (navigation, state management)

---

## NFR Planning

**Purpose:** Capture Epic 5–specific NFR thresholds, planned validation, and evidence expected for later `nfr-assess`.

| NFR Category | Requirement / Threshold | Risk Link | Planned Validation | Evidence Needed |
|--------------|-------------------------|-----------|-------------------|-----------------|
| **Security** | Admin endpoints require Admin role (NFR-8) | R-E5-002 | Integration tests: Standard User → 403 on all admin endpoints | Test report |
| **Security** | JWT invalidation on user deactivation immediate (FR-31) | R-E5-001 | Integration test: deactivate → next request with old token → 401 | Test report |
| **Security** | Auto-registration default OFF (FR-29) | — | Integration test: fresh instance → self-registration endpoint returns 403 | Test report |
| **Performance** | Health dashboard loads <500ms | — | Integration test: `GET /api/admin/health` response time ≤500ms | Test report |
| **Reliability** | Feature toggle change propagates to all sessions immediately (FR-30) | R-E5-003 | Integration test: toggle change → SignalR event received by connected client | Test report |
| **Observability** | Structured JSON logs to stdout + rolling files (NFR-17) | R-E5-005 | Integration test: verify log file created with correct format | Log file sample |
| **Observability** | Audit trail records all user actions (FR-33) | — | Integration test: service create → audit entry exists; user deactivate → audit entry exists | Test report |
| **Accessibility** | Admin Console keyboard-navigable (NFR-19) | — | E2E: Tab through all Admin Console controls | E2E test pass |

**Unknown thresholds:** None — all thresholds are specified in PRD.

---

## Entry Criteria

- [x] Epic 4 complete — Mappings, Record mode, and navigation guards operational
- [x] `ServicesHub.cs`, `EventsHub.cs`, `ActivityHub.cs` operational (SignalR infrastructure from Epics 2–4)
- [x] JWT auth with `TokenVersion` column operational (Epic 1 Story 1.2)
- [x] React Query + SignalR seam (`queryClient.ts` + `HUB_INVALIDATION_MAP`) established (Epic 1)
- [x] Settings → Appearance theme selector placeholder exists (Epic 1 Story 1.4)
- [ ] Test environment: Fishtank container running at `http://localhost:5000/health` → 200
- [ ] Admin account exists with known credentials for test automation

## Exit Criteria

- [ ] All P0 tests passing
- [ ] All P1 tests passing (or failures triaged with fix stories)
- [ ] No open P0/P1 bugs related to FR-29, FR-30, FR-31, FR-32, FR-33, FR-39
- [ ] All admin endpoint authorization tests passing (R-E5-002)
- [ ] JWT invalidation on user deactivation validated (R-E5-001)
- [ ] SignalR toggle broadcast validated (R-E5-003)
- [ ] `HUB_INVALIDATION_MAP` updated with `FeatureToggleChanged: [["toggles"]]`
- [ ] Rolling log file creation validated with retention policy

---

## Test Coverage Plan

### Story 5-1: Feature Toggles — Runtime Control & SignalR Broadcast

**FRs:** FR-30 (feature toggles, immediate propagation, env var precedence)

| Test Level | Test Scenario | Priority | Risk Link | Owner | Notes |
|------------|---------------|----------|-----------|-------|-------|
| **Unit** | Toggle state persistence to database | P1 | — | DEV | FR-30 |
| **Unit** | Env var override takes precedence over DB state | P0 | R-E5-006 | DEV | FR-30 |
| **Unit** | Toggle name validation (known toggles only) | P1 | — | DEV | FR-30 |
| **Integration** | `GET /api/admin/toggles` returns all toggles with current state | P0 | — | QA | FR-30 backend |
| **Integration** | `PUT /api/admin/toggles/{name}` persists state change | P0 | — | QA | FR-30 |
| **Integration** | Toggle change broadcasts `FeatureToggleChanged` via SignalR | P0 | R-E5-003 | QA | Architecture D7 |
| **Integration** | Standard User calling `GET /api/admin/toggles` → HTTP 403 | P0 | R-E5-002 | QA | NFR-8 |
| **Integration** | Standard User calling `PUT /api/admin/toggles/{name}` → HTTP 403 | P0 | R-E5-002 | QA | NFR-8 |
| **Integration** | Env-var-locked toggle → `PUT` returns HTTP 409 with descriptive message | P1 | R-E5-006 | QA | FR-30 |
| **Component** | Admin Console renders toggle list with current states | P0 | — | DEV | FR-30 |
| **Component** | Toggle switch updates optimistically, reverts on failure | P1 | — | DEV | FR-30 |
| **Component** | Env-var-locked toggle shows "Locked by environment variable" indicator | P1 | R-E5-006 | DEV | FR-30 |
| **Component** | Toggle switch disabled for env-var-locked toggles | P1 | R-E5-006 | DEV | FR-30 |
| **Component** | Standard User at `/admin` route is redirected to `/services` | P0 | R-E5-002 | DEV | EXPERIENCE.md |
| **Component** | Admin Console nav item visible only to Admin role | P1 | — | DEV | UX-DR11 |
| **E2E** | Admin toggles feature OFF → all sessions reflect change immediately | P0 | R-E5-003 | QA | FR-30 |
| **E2E** | Toggle change persists across page refresh | P1 | — | QA | FR-30 |
| **E2E** | Standard User cannot access Admin Console via direct URL | P1 | R-E5-002 | QA | NFR-8 |

**Test Count:** 18 | **Effort:** ~8–12 hours

---

### Story 5-2: User Management — Create, View & Deactivate

**FRs:** FR-31 (user CRUD, JWT invalidation on deactivate)

| Test Level | Test Scenario | Priority | Risk Link | Owner | Notes |
|------------|---------------|----------|-----------|-------|-------|
| **Unit** | TokenVersion increment on user deactivation | P0 | R-E5-001 | DEV | FR-31 |
| **Unit** | JWT validation rejects token with mismatched TokenVersion | P0 | R-E5-001 | DEV | Epic 1 hook |
| **Unit** | Password validation (≥12 chars) for new user creation | P1 | — | DEV | FR-31 |
| **Unit** | New user created with `ForcePasswordChange: true` | P1 | — | DEV | FR-31 |
| **Integration** | `GET /api/users` returns all users with role, status, created date | P0 | — | QA | FR-31 |
| **Integration** | `POST /api/users` creates Standard User account | P0 | — | QA | FR-31 |
| **Integration** | `PUT /api/users/{id}/deactivate` sets IsActive=false, increments TokenVersion | P0 | R-E5-001 | QA | FR-31 |
| **Integration** | Deactivated user's existing JWT rejected on next request → 401 | P0 | R-E5-001 | QA | FR-31 |
| **Integration** | Deactivated user cannot log in → 401 | P1 | — | QA | FR-31 |
| **Integration** | Standard User calling `PUT /api/users/{id}/deactivate` → HTTP 403 | P0 | R-E5-002 | QA | NFR-8 |
| **Integration** | Standard User calling `POST /api/users` → HTTP 403 | P1 | R-E5-002 | QA | NFR-8 |
| **Integration** | Duplicate username on create → HTTP 409 | P1 | — | QA | FR-31 |
| **Component** | User list displays username, role, status, creation date | P0 | — | DEV | FR-31 |
| **Component** | "Create User" form with username and password fields | P1 | — | DEV | FR-31 |
| **Component** | Password validation shows inline error for <12 chars | P1 | — | DEV | FR-31 |
| **Component** | Deactivate button shows confirmation dialog | P0 | — | DEV | NFR-15 |
| **Component** | Self-deactivate action disabled for current admin | P1 | — | DEV | Guard |
| **Component** | Deactivated users show "Deactivated" status badge | P1 | — | DEV | FR-31 |
| **E2E** | Admin creates user → user appears in list immediately | P0 | — | QA | FR-31 |
| **E2E** | New user logs in → ForcePasswordChange screen appears | P1 | — | QA | FR-31 |
| **E2E** | Admin deactivates user → user's active session ends on next action | P0 | R-E5-001 | QA | FR-31 |
| **E2E** | Deactivated user attempts login → "Account deactivated" error | P1 | — | QA | FR-31 |

**Test Count:** 22 | **Effort:** ~10–14 hours

---

### Story 5-3: Health Dashboard, Audit Log & Auto-Registration Toggle

**FRs:** FR-29 (auto-registration), FR-32 (health dashboard), FR-33 (audit log)

| Test Level | Test Scenario | Priority | Risk Link | Owner | Notes |
|------------|---------------|----------|-----------|-------|-------|
| **Unit** | AuditLog entity schema: Id, Action, ActorId, ResourceType, ResourceId, Details, CreatedAt | P1 | — | DEV | FR-33 |
| **Unit** | Audit entry created on service create/edit action | P1 | — | DEV | FR-33 |
| **Unit** | Audit entry created on toggle change action | P1 | — | DEV | FR-33 |
| **Unit** | Audit entry created on user deactivate action | P1 | — | DEV | FR-33 |
| **Integration** | `GET /api/admin/health` returns active services count, request count, DB status, uptime | P0 | — | QA | FR-32 |
| **Integration** | `GET /api/admin/health` requires Admin role → Standard User gets 403 | P1 | R-E5-002 | QA | NFR-8 |
| **Integration** | `GET /api/admin/audit` returns audit entries newest-first | P0 | — | QA | FR-33 |
| **Integration** | Audit log pagination (20 items per page) | P1 | — | QA | FR-33 |
| **Integration** | Auto-registration OFF by default → self-registration returns 403 | P0 | — | QA | FR-29 |
| **Integration** | Auto-registration ON → self-registration succeeds, creates Standard User | P1 | — | QA | FR-29 |
| **Integration** | Auto-registration env var override takes precedence | P1 | — | QA | FR-29 |
| **Component** | Health Dashboard shows active services count | P0 | — | DEV | FR-32 |
| **Component** | Health Dashboard shows total request count | P1 | — | DEV | FR-32 |
| **Component** | Health Dashboard shows database status (accessible/inaccessible) | P1 | — | DEV | FR-32 |
| **Component** | Health Dashboard shows container uptime | P1 | — | DEV | FR-32 |
| **Component** | Audit Log displays action type, actor, timestamp, resource | P0 | — | DEV | FR-33 |
| **Component** | Audit Log entries link to affected resource where applicable | P2 | — | DEV | FR-33 |
| **Component** | Auto-Registration toggle reflects current state | P1 | — | DEV | FR-29 |
| **Component** | Auto-Registration env-var-locked shows indicator | P1 | — | DEV | FR-29 |
| **E2E** | Admin views Health Dashboard → data matches `/health` endpoint | P1 | — | QA | FR-32 |
| **E2E** | Admin creates service → audit entry appears in Audit Log | P1 | — | QA | FR-33 |
| **E2E** | Admin enables auto-registration → new user can self-register | P1 | — | QA | FR-29 |

**Test Count:** 22 | **Effort:** ~10–14 hours

---

### Story 5-4: Structured File Logging — Rolling Daily Files

**FRs:** FR-39 (structured logging), NFR-17 (JSON logs)

| Test Level | Test Scenario | Priority | Risk Link | Owner | Notes |
|------------|---------------|----------|-----------|-------|-------|
| **Unit** | Serilog file sink configured with `FISHTANK_LOG_PATH` | P1 | — | DEV | FR-39 |
| **Unit** | Default log path is `/data/logs` when env var not set | P1 | — | DEV | FR-39 |
| **Unit** | Log retention configured by `FISHTANK_LOG_RETENTION_DAYS` | P1 | — | DEV | FR-39 |
| **Unit** | Default retention is 7 days | P1 | — | DEV | FR-39 |
| **Integration** | Log file created in configured path with daily rolling filename | P0 | — | QA | FR-39 |
| **Integration** | Log entries are structured JSON (CompactJsonFormatter) | P0 | — | QA | NFR-17 |
| **Integration** | Service lifecycle event logged to file | P1 | — | QA | NFR-17 |
| **Integration** | System Event logged to both stdout and file | P1 | — | QA | NFR-18 |
| **Integration** | Unwritable log directory → stdout warning, app continues | P0 | R-E5-005 | QA | Graceful degradation |
| **Integration** | `/health` returns 200 even with unwritable log path | P1 | R-E5-005 | QA | App resilience |
| **Integration** | Log files older than retention period are deleted | P2 | — | QA | FR-39 |
| **E2E** | Container starts → log file appears in mounted volume | P1 | — | QA | FR-39 |
| **E2E** | Multiple days simulation → rollover creates new file | P2 | — | QA | FR-39 |
| **E2E** | docker-compose.example.yml includes `FISHTANK_LOG_PATH` and `FISHTANK_LOG_RETENTION_DAYS` | P1 | — | QA | Documentation |

**Test Count:** 14 | **Effort:** ~6–8 hours

---

## Coverage Summary by Priority

### P0 (Critical) — Run on every commit

**Criteria:** Blocks core journey + High risk (≥6) + No workaround

| Requirement | Test Level | Risk Link | Test Count | Owner |
|-------------|------------|-----------|------------|-------|
| Env var override precedence | Unit | R-E5-006 | 1 | DEV |
| TokenVersion increment on deactivate | Unit | R-E5-001 | 1 | DEV |
| JWT validation rejects mismatched TokenVersion | Unit | R-E5-001 | 1 | DEV |
| GET /api/admin/toggles returns all toggles | Integration | — | 1 | QA |
| PUT /api/admin/toggles persists change | Integration | — | 1 | QA |
| Toggle change SignalR broadcast | Integration | R-E5-003 | 1 | QA |
| Standard User → 403 on admin endpoints | Integration | R-E5-002 | 4 | QA |
| Deactivated user JWT rejected | Integration | R-E5-001 | 1 | QA |
| GET /api/users returns users | Integration | — | 1 | QA |
| POST /api/users creates user | Integration | — | 1 | QA |
| PUT /api/users/{id}/deactivate works | Integration | R-E5-001 | 1 | QA |
| GET /api/admin/health returns metrics | Integration | — | 1 | QA |
| GET /api/admin/audit returns entries | Integration | — | 1 | QA |
| Auto-registration OFF by default | Integration | — | 1 | QA |
| Log file created with JSON format | Integration | — | 2 | QA |
| Unwritable log dir → warning, app continues | Integration | R-E5-005 | 1 | QA |
| Admin Console renders toggle list | Component | — | 1 | DEV |
| Standard User redirect from /admin | Component | R-E5-002 | 1 | DEV |
| User list displays correctly | Component | — | 1 | DEV |
| Deactivate confirmation dialog | Component | — | 1 | DEV |
| Health Dashboard shows services count | Component | — | 1 | DEV |
| Audit Log displays entries | Component | — | 1 | DEV |
| Toggle change → all sessions update | E2E | R-E5-003 | 1 | QA |
| Admin creates user → appears in list | E2E | — | 1 | QA |
| Admin deactivates user → session ends | E2E | R-E5-001 | 1 | QA |

**Total P0:** 28 tests | **Effort:** ~8–12 hours

---

### P1 (High) — Run on PR to release branch

**Criteria:** Important features + Medium risk (3–4) + Common workflows

| Requirement | Test Level | Test Count | Owner |
|-------------|------------|------------|-------|
| Toggle state DB persistence | Unit | 1 | DEV |
| Toggle name validation | Unit | 1 | DEV |
| Password validation | Unit | 2 | DEV |
| Audit entry creation | Unit | 4 | DEV |
| Log configuration units | Unit | 4 | DEV |
| Env-var-locked toggle returns 409 | Integration | 1 | QA |
| Deactivated user login fails | Integration | 1 | QA |
| Duplicate username returns 409 | Integration | 1 | QA |
| Health endpoint authorization | Integration | 1 | QA |
| Audit pagination | Integration | 1 | QA |
| Auto-registration ON works | Integration | 1 | QA |
| Auto-registration env var override | Integration | 1 | QA |
| Service lifecycle logged | Integration | 2 | QA |
| Health returns 200 with bad log path | Integration | 1 | QA |
| UI components (toggles, forms, dashboard) | Component | 12 | DEV |
| Toggle persists across refresh | E2E | 1 | QA |
| Standard User direct URL blocked | E2E | 1 | QA |
| New user ForcePasswordChange | E2E | 1 | QA |
| Deactivated user login error | E2E | 1 | QA |
| Health Dashboard matches /health | E2E | 1 | QA |
| Audit entry appears on action | E2E | 1 | QA |
| Auto-registration toggle E2E | E2E | 1 | QA |
| Log file appears in volume | E2E | 1 | QA |
| docker-compose.example.yml documented | E2E | 1 | QA |

**Total P1:** 42 tests | **Effort:** ~12–16 hours

---

### P2/P3 (Medium/Low) — Run nightly/weekly or on-demand

| Requirement | Test Level | Test Count | Priority | Owner |
|-------------|------------|------------|----------|-------|
| Audit log links to resource | Component | 1 | P2 | DEV |
| Log files older than retention deleted | Integration | 1 | P2 | QA |
| Multiple days rollover | E2E | 1 | P2 | QA |
| Audit log high volume performance | Integration | 1 | P3 | QA |

**Total P2/P3:** 4 tests | **Effort:** ~4–6 hours

---

## Test Environment Requirements

### Infrastructure

| Component | Requirement | Notes |
|-----------|-------------|-------|
| Docker | Docker Desktop or Docker Engine | Required for container testing |
| Fishtank container | Running at `http://localhost:5000` | `/health` → 200 |
| Volume mount | Writable `/data` and `/data/logs` directories | For log file testing |
| Test database | SQLite with known seed data | Admin user with known credentials |

### Test Data

| Data Item | Requirement | Owner |
|-----------|-------------|-------|
| Admin user | Username: `testadmin`, Password: `TestPassword123!` | Global setup |
| Standard user | Username: `testuser`, Password: `TestPassword123!` | Created in tests |
| Feature toggles | All toggles enabled by default | Container default |
| Services | At least one mock service configured | Story 5-3 tests |

### Environment Variables for Testing

| Variable | Test Value | Purpose |
|----------|------------|---------|
| `FISHTANK_LOG_PATH` | `/data/logs` (default) | Log file tests |
| `FISHTANK_LOG_RETENTION_DAYS` | `7` (default) | Retention tests |
| `FISHTANK_AUTO_REGISTRATION` | `false` (default) | Auto-reg tests |
| `FISHTANK_TOGGLE_NETWORK_ACTIVITY` | not set | Env var override tests |

---

## Appendix: HUB_INVALIDATION_MAP Updates

Epic 5 adds the following entry to `queryClient.ts`:

```typescript
const HUB_INVALIDATION_MAP = {
  // ... existing entries from Epics 2-4 ...
  'FeatureToggleChanged': [['toggles']],
} satisfies Record<string, QueryKey[]>;
```

The `TogglesHub` at `/hubs/toggles` broadcasts `FeatureToggleChanged` events when any toggle state changes via the Admin Console.
