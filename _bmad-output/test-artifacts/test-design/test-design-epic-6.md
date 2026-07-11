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
lastSaved: '2026-07-11'
workflowType: 'testarch-test-design'
mode: 'epic-level'
epic: 6
epicTitle: 'Release Polish & Distribution'
inputDocuments:
  - _bmad-output/project-context.md
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/test-artifacts/test-design/test-design-epic-5.md
---

# Test Design: Epic 6 — Release Polish & Distribution

**Date:** 2026-07-11
**Author:** Murat (Master Test Architect)
**Status:** Draft
**Project:** Fishtank
**Epic Reference:** Epic 6 (v1.0.0 Release)
**PRD FRs:** FR-34, FR-36, FR-40, FR-41, FR-42, FR-43, FR-44, FR-45

---

## Executive Summary

**Scope:** Epic-level test design for Epic 6 — Release Polish & Distribution

Epic 6 delivers the final polish layer for Fishtank v1: a pipeline reset endpoint (`POST /admin/reset`) for CI/CD automation, OpenAPI specification served at `/openapi/v1.json` with full Management API parity verification, a pre-seeded demo Docker image (`fishtank/fishtank:demo`) for first-time evaluators, and a complete automated release pipeline with multi-arch builds, Kubernetes manifest, and community resources (README, CONTRIBUTING.md, SECURITY.md, good-first-issue backlog). This epic does not introduce new domain features but rather validates and packages the complete v1 product.

**Stories in Scope:**

| Story | Title | FRs |
|-------|-------|-----|
| **6-1** | Pipeline Reset Endpoint (`POST /admin/reset`) | FR-45, FR-36 |
| **6-2** | OpenAPI Spec & Management API Parity Verification | FR-43, FR-44 |
| **6-3** | Fishtank Demo Pre-seeded Docker Image | FR-42 |
| **6-4** | Automated Release Pipeline, K8s Manifest & Community Resources | FR-34, FR-40, FR-41 |

**Risk Summary:**

- Total risks identified: **7**
- High-priority risks (≥6): **2**
- Medium-priority risks (3–5): **4**
- Low-priority risks (1–2): **1**
- Critical categories: SEC, TECH, OPS, DATA

**Coverage Summary:**

- P0 scenarios: 16 (~6–10 hours)
- P1 scenarios: 22 (~10–14 hours)
- P2/P3 scenarios: 8 (~4–6 hours)
- **Total effort**: ~20–30 hours (~3–4 days)

---

## Not in Scope

| Item | Reasoning | Mitigation |
|------|-----------|------------|
| **Helm chart** | v1 uses raw K8s manifest; Helm is post-v1 | Document as v2 enhancement |
| **ARM64-only builds** | Multi-arch covers linux/amd64 + linux/arm64; no ARM-only image | Multi-arch build includes ARM64 |
| **Automated E2E in CI** | E2E runs locally only; CI does container smoke tests | Smoke test validates `/health` |
| **Demo image auto-refresh** | Demo seed data is static; no scheduled rebuild | Manual rebuild when seed data changes |
| **Windows container images** | CI smoke tests run on Windows but build Linux images | Document Linux-only container support |
| **Pipeline reset rate limiting** | API key authentication is sufficient for v1 | Document as security hardening for v2 |

---

## Risk Assessment

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Prob | Impact | Score | Mitigation | Owner | Timeline |
|---------|----------|-------------|------|--------|-------|------------|-------|----------|
| **R-E6-001** | **SEC** | Pipeline reset API key brute force — attacker iterates through potential API key values to gain unauthorized access to `/admin/reset` | 2 | 3 | **6** | Integration test: 5 consecutive invalid API keys → HTTP 401 (no lockout but rate limiting can be added v2); API key must be ≥32 chars (documented requirement); env var not logged or exposed in error messages | Nico / Dev | Before Story 6-1 complete |
| **R-E6-002** | **SEC** | Pipeline reset without API key configured — if `FISHTANK_PIPELINE_RESET_KEY` is missing or empty, the endpoint could be accidentally enabled or disabled in ambiguous state | 2 | 3 | **6** | Integration test: env var not set → `POST /admin/reset` returns HTTP 403 with explicit message "Pipeline reset is disabled — configure FISHTANK_PIPELINE_RESET_KEY to enable this endpoint."; endpoint never silently open | Nico / Dev | Before Story 6-1 complete |

### Medium-Priority Risks (Score 3–5)

| Risk ID | Category | Description | Prob | Impact | Score | Mitigation | Owner |
|---------|----------|-------------|------|--------|-------|------------|-------|
| **R-E6-003** | TECH | OpenAPI spec drift — served `/openapi/v1.json` diverges from actual controller endpoints; integrators receive inaccurate API documentation | 2 | 2 | 4 | CI step: validate OpenAPI spec against actual endpoints (Swashbuckle or NSwag generates spec; diff against committed `docs/openapi.json`); parity audit in Story 6-2 | Nico / Dev |
| **R-E6-004** | OPS | Multi-arch build failure on macOS/Windows runners — platform-specific toolchain differences cause CI failures on non-Linux runners | 2 | 2 | 4 | CI workflow: cross-platform smoke tests (Linux, macOS/Apple Silicon, macOS/Intel, Windows) each run `docker run` + `GET /health` = 200; build failures isolated to specific runner, others continue | Nico / DevOps |
| **R-E6-005** | DATA | Demo image seed data incomplete or invalid — pre-seeded services/mappings fail to load or demonstrate realistic workflows | 2 | 2 | 4 | Integration test: demo image starts → 3+ services visible in UI → sample mapping `GET /weather/current` returns expected response; seed data validated at image build time | Nico / Dev |
| **R-E6-006** | OPS | K8s manifest misconfiguration — incorrect port, missing health probe, or resource limits prevent successful deployment | 2 | 2 | 4 | Manual validation: `kubectl apply -f deployment.yaml` in test cluster → pod starts → readiness probe passes → service accessible; document required placeholders clearly | Nico / DevOps |

### Low-Priority Risks (Score 1–2)

| Risk ID | Category | Description | Prob | Impact | Score | Action |
|---------|----------|-------------|------|--------|-------|--------|
| **R-E6-007** | OPS | README animated demo recording outdated — GIF/video shows old UI after future updates | 1 | 1 | 1 | Document recording process; re-record before major UI changes; accept minor drift as acceptable |

### Risk Category Legend

- **SEC**: Security (access controls, auth, data exposure)
- **TECH**: Technical/Architecture (flaws, integration, scalability)
- **DATA**: Data Integrity (loss, corruption, inconsistency)
- **OPS**: Operations (deployment, config, monitoring)
- **UX**: User Experience (navigation, state management)

---

## NFR Planning

**Purpose:** Capture Epic 6–specific NFR thresholds, planned validation, and evidence expected for later `nfr-assess`.

| NFR Category | Requirement / Threshold | Risk Link | Planned Validation | Evidence Needed |
|--------------|-------------------------|-----------|-------------------|-----------------|
| **Security** | Pipeline reset requires valid API key (FR-45) | R-E6-001 | Integration tests: invalid key → 401; valid key → 200 | Test report |
| **Security** | Pipeline reset disabled when env var not set (FR-36) | R-E6-002 | Integration test: missing env var → 403 with explicit message | Test report |
| **Security** | API key not logged or exposed in errors | R-E6-001 | Code review + integration test: error responses contain no key values | Test report |
| **Performance** | Container starts <10s after pipeline reset (NFR-6) | — | Integration test: `POST /admin/reset` → `GET /health` response time <10s | Test report |
| **Reliability** | Pipeline reset does not restart services (FR-45) | — | Integration test: reset → services still running → `/health` returns 200 | Test report |
| **Documentation** | OpenAPI spec complete and accurate (FR-44) | R-E6-003 | CI parity check: served spec matches committed spec | CI report |
| **Documentation** | All env vars documented in README and docker-compose.example.yml (FR-36) | — | Manual audit: compare FR-36 list against README table and compose file | Checklist |
| **Accessibility** | README accessible on GitHub (alt text, heading structure) | — | Manual review: images have alt text, sections use proper headings | Manual review |

**Unknown thresholds:** None — all thresholds are specified in PRD or derived from existing NFRs.

---

## Entry Criteria

- [x] Epic 5 complete — Admin Console, User Management, Feature Toggles, Audit Log operational
- [x] All REST endpoints from Epics 2–5 operational (Services, Mappings, Activity, Users, Toggles)
- [x] SignalR hubs operational (`ServicesHub`, `EventsHub`, `ActivityHub`, `TogglesHub`)
- [x] JWT auth with httpOnly cookies operational
- [x] Structured logging (Serilog) operational
- [ ] Test environment: Docker build succeeds locally
- [ ] GitHub Actions workflow exists with build + test steps
- [ ] Admin account exists with known credentials for test automation

## Exit Criteria

- [ ] All P0 tests passing
- [ ] All P1 tests passing (or failures triaged with fix stories)
- [ ] No open P0/P1 bugs related to FR-34, FR-36, FR-40, FR-41, FR-42, FR-43, FR-44, FR-45
- [ ] Pipeline reset endpoint authorization tests passing (R-E6-001, R-E6-002)
- [ ] OpenAPI spec parity audit complete (R-E6-003)
- [ ] Demo image validated with seed data (R-E6-005)
- [ ] Multi-arch CI smoke tests passing on all runners (R-E6-004)
- [ ] K8s manifest validated in test cluster (R-E6-006)
- [ ] README, CONTRIBUTING.md, SECURITY.md present and complete
- [ ] At least 5 `good first issue` labels in GitHub Issues

---

## Test Coverage Plan

### Story 6-1: Pipeline Reset Endpoint (`POST /admin/reset`)

**FRs:** FR-45 (pipeline reset), FR-36 (env var configuration)

| Test Level | Test Scenario | Priority | Risk Link | Owner | Notes |
|------------|---------------|----------|-----------|-------|-------|
| **Unit** | Activity log cleared by reset service | P1 | — | DEV | FR-45 |
| **Unit** | In-memory counters reset to zero | P1 | — | DEV | FR-45 |
| **Unit** | Mappings reloaded from disk | P1 | — | DEV | FR-45 |
| **Unit** | API key validation (≥32 chars recommended) | P1 | R-E6-001 | DEV | FR-45 |
| **Integration** | `POST /admin/reset` with valid API key → HTTP 200 `{"success":true,"data":null}` | P0 | — | QA | FR-45 |
| **Integration** | `POST /admin/reset` with invalid API key → HTTP 401 | P0 | R-E6-001 | QA | FR-45 |
| **Integration** | `POST /admin/reset` without API key header → HTTP 401 | P0 | R-E6-001 | QA | FR-45 |
| **Integration** | `POST /admin/reset` when `FISHTANK_PIPELINE_RESET_KEY` not set → HTTP 403 with explicit message | P0 | R-E6-002 | QA | FR-36 |
| **Integration** | Reset clears activity log → `GET /api/activity` returns empty array | P0 | — | QA | FR-45 |
| **Integration** | Reset does not affect running services → `GET /health` still returns 200 | P0 | — | QA | FR-45 |
| **Integration** | Reset reloads mappings → modified mapping file reflected after reset | P1 | — | QA | FR-45 |
| **Integration** | API key value not present in error response body or headers | P1 | R-E6-001 | QA | Security |
| **Integration** | Standard User cannot access `/admin/reset` (endpoint is API key only, not role-based) | P1 | — | QA | FR-45 |
| **E2E** | CI workflow: reset before test run → clean activity log verified | P1 | — | QA | FR-45 |
| **E2E** | Multiple consecutive resets → all succeed with no side effects | P2 | — | QA | Idempotency |

**Test Count:** 15 | **Effort:** ~6–10 hours

---

### Story 6-2: OpenAPI Spec & Management API Parity Verification

**FRs:** FR-43 (API parity), FR-44 (OpenAPI spec)

| Test Level | Test Scenario | Priority | Risk Link | Owner | Notes |
|------------|---------------|----------|-----------|-------|-------|
| **Integration** | `GET /openapi/v1.json` returns valid OpenAPI 3.x spec | P0 | — | QA | FR-44 |
| **Integration** | `GET /openapi/v1.json` requires no authentication | P0 | — | QA | FR-44 |
| **Integration** | OpenAPI spec includes all Service CRUD endpoints | P0 | R-E6-003 | QA | FR-43 |
| **Integration** | OpenAPI spec includes Mapping/Response file endpoints | P1 | R-E6-003 | QA | FR-43 |
| **Integration** | OpenAPI spec includes Activity log endpoints | P1 | R-E6-003 | QA | FR-43 |
| **Integration** | OpenAPI spec includes User management endpoints | P1 | R-E6-003 | QA | FR-43 |
| **Integration** | OpenAPI spec includes Feature toggle endpoints | P1 | R-E6-003 | QA | FR-43 |
| **Integration** | OpenAPI spec documents standard response envelope with typed `data` fields | P1 | — | QA | FR-44 |
| **Integration** | OpenAPI spec documents all error codes as enum values | P1 | — | QA | FR-44 |
| **Manual** | Audit: served spec matches committed `docs/openapi.json` | P0 | R-E6-003 | QA | FR-44 |
| **Manual** | Audit: every UI operation has corresponding documented REST endpoint (FR-43 checklist) | P0 | R-E6-003 | QA | FR-43 |
| **Manual** | Audit: all FR-36 env vars documented in README and docker-compose.example.yml | P1 | — | QA | FR-36 |
| **E2E** | OpenAPI spec accessible from running container via browser | P2 | — | QA | FR-44 |

**Test Count:** 13 | **Effort:** ~6–8 hours

---

### Story 6-3: Fishtank Demo Pre-seeded Docker Image

**FRs:** FR-42 (demo image)

| Test Level | Test Scenario | Priority | Risk Link | Owner | Notes |
|------------|---------------|----------|-----------|-------|-------|
| **Integration** | Demo image starts and `/health` returns 200 | P0 | — | QA | FR-42 |
| **Integration** | Demo image shows 3+ pre-seeded services in `GET /api/services` | P0 | R-E6-005 | QA | FR-42 |
| **Integration** | Demo service "Weather API" has functional mapping → `GET /weather/current` returns sample JSON | P0 | R-E6-005 | QA | FR-42 |
| **Integration** | Demo service "Payments Gateway" has functional mapping → `POST /payments/charge` returns confirmation | P1 | R-E6-005 | QA | FR-42 |
| **Integration** | Demo image uses same base as production image (Dockerfile inspection) | P1 | — | QA | FR-42 |
| **Integration** | Default demo credentials allow login | P1 | — | QA | FR-42 |
| **Manual** | Demo credentials documented in README with security warning | P0 | — | QA | FR-42 |
| **Manual** | Docker Hub tags: `fishtank/fishtank:demo` distinct from `fishtank/fishtank:latest` | P1 | — | QA | FR-42 |
| **E2E** | `docker run -p 9090:9090 fishtank/fishtank:demo` → UI accessible → services visible | P1 | R-E6-005 | QA | FR-42 |
| **E2E** | Demo image first-run experience: zero configuration required | P2 | — | QA | FR-42 |

**Test Count:** 10 | **Effort:** ~4–6 hours

---

### Story 6-4: Automated Release Pipeline, K8s Manifest & Community Resources

**FRs:** FR-34 (CI/CD), FR-40 (cross-platform), FR-41 (K8s manifest)

| Test Level | Test Scenario | Priority | Risk Link | Owner | Notes |
|------------|---------------|----------|-----------|-------|-------|
| **Integration** | Release workflow triggers on `v*.*.*` tag push | P0 | — | QA | FR-34 |
| **Integration** | Release workflow runs: build → unit tests → integration tests | P0 | — | QA | FR-34 |
| **Integration** | Linux runner smoke test: `docker run` + `GET /health` = 200 | P0 | R-E6-004 | QA | FR-40 |
| **Integration** | macOS/Apple Silicon runner smoke test: `docker run` + `GET /health` = 200 | P1 | R-E6-004 | QA | FR-40 |
| **Integration** | macOS/Intel runner smoke test: `docker run` + `GET /health` = 200 | P1 | R-E6-004 | QA | FR-40 |
| **Integration** | Windows runner smoke test: `docker run` + `GET /health` = 200 | P1 | R-E6-004 | QA | FR-40 |
| **Integration** | Docker Hub publish step: `latest` and version tag published | P0 | — | QA | FR-34 |
| **Manual** | `deployment.yaml` is valid K8s manifest (kubectl validate) | P0 | R-E6-006 | QA | FR-41 |
| **Manual** | `deployment.yaml` includes readiness probe on `GET /health` | P1 | R-E6-006 | QA | FR-41 |
| **Manual** | `deployment.yaml` has documented placeholders (image tag, env vars, volumes) | P1 | R-E6-006 | QA | FR-41 |
| **Manual** | `CONTRIBUTING.md` contains: architecture overview, tech stack, local dev setup, PR workflow | P0 | — | QA | FR-34 |
| **Manual** | `SECURITY.md` contains: vulnerability reporting process, disclosure policy | P0 | — | QA | FR-34 |
| **Manual** | GitHub Issues: at least 5 issues with `good first issue` label | P0 | — | QA | FR-34 |
| **Manual** | `README.md` contains: animated demo, quick-start command, env var table, `fs.inotify` note | P1 | — | QA | FR-34 |
| **Manual** | `.devcontainer/` provides working dev environment for frontend contributors | P2 | — | QA | FR-34 |
| **E2E** | Full release workflow: tag push → all checks pass → Docker Hub image available | P1 | R-E6-004 | QA | FR-34 |
| **E2E** | K8s deployment: `kubectl apply -f deployment.yaml` → pod starts → service accessible | P2 | R-E6-006 | QA | FR-41 |

**Test Count:** 17 | **Effort:** ~8–12 hours

---

## Coverage Summary by Priority

### P0 (Critical) — Run on every commit / release gate

**Criteria:** Blocks release + High risk (≥6) + No workaround

| Requirement | Test Level | Risk Link | Test Count | Owner |
|-------------|------------|-----------|------------|-------|
| Pipeline reset with valid API key → 200 | Integration | — | 1 | QA |
| Pipeline reset with invalid API key → 401 | Integration | R-E6-001 | 2 | QA |
| Pipeline reset when env var missing → 403 | Integration | R-E6-002 | 1 | QA |
| Reset clears activity log | Integration | — | 1 | QA |
| Reset doesn't affect running services | Integration | — | 1 | QA |
| OpenAPI spec returns valid spec | Integration | — | 1 | QA |
| OpenAPI spec no auth required | Integration | — | 1 | QA |
| OpenAPI spec includes all Service endpoints | Integration | R-E6-003 | 1 | QA |
| OpenAPI parity audit | Manual | R-E6-003 | 2 | QA |
| Demo image starts with health check | Integration | — | 1 | QA |
| Demo image 3+ services visible | Integration | R-E6-005 | 1 | QA |
| Demo service mapping functional | Integration | R-E6-005 | 1 | QA |
| Demo credentials documented | Manual | — | 1 | QA |
| Release workflow triggers on tag | Integration | — | 1 | QA |
| Release workflow runs build + tests | Integration | — | 1 | QA |
| Linux smoke test passes | Integration | R-E6-004 | 1 | QA |
| Docker Hub publish succeeds | Integration | — | 1 | QA |
| K8s manifest valid | Manual | R-E6-006 | 1 | QA |
| CONTRIBUTING.md complete | Manual | — | 1 | QA |
| SECURITY.md complete | Manual | — | 1 | QA |
| 5+ good first issues | Manual | — | 1 | QA |

**Total P0:** 22 tests | **Effort:** ~6–10 hours

---

### P1 (High) — Run on PR to release branch

**Criteria:** Important features + Medium risk (3–4) + Common workflows

| Requirement | Test Level | Test Count | Owner |
|-------------|------------|------------|-------|
| Activity log cleared unit tests | Unit | 1 | DEV |
| In-memory counters reset | Unit | 1 | DEV |
| Mappings reloaded from disk | Unit | 1 | DEV |
| API key validation unit | Unit | 1 | DEV |
| Reset reloads mappings (integration) | Integration | 1 | QA |
| API key not exposed in errors | Integration | 1 | QA |
| Standard User cannot access reset | Integration | 1 | QA |
| CI workflow reset before tests | E2E | 1 | QA |
| OpenAPI spec Mapping endpoints | Integration | 1 | QA |
| OpenAPI spec Activity endpoints | Integration | 1 | QA |
| OpenAPI spec User endpoints | Integration | 1 | QA |
| OpenAPI spec Toggle endpoints | Integration | 1 | QA |
| OpenAPI response envelope documented | Integration | 1 | QA |
| OpenAPI error codes documented | Integration | 1 | QA |
| Env vars documented audit | Manual | 1 | QA |
| Demo Payments mapping functional | Integration | 1 | QA |
| Demo uses same base image | Integration | 1 | QA |
| Demo credentials allow login | Integration | 1 | QA |
| Demo Docker Hub tag distinct | Manual | 1 | QA |
| Demo E2E first-run | E2E | 1 | QA |
| macOS/Apple Silicon smoke | Integration | 1 | QA |
| macOS/Intel smoke | Integration | 1 | QA |
| Windows smoke | Integration | 1 | QA |
| K8s readiness probe | Manual | 1 | QA |
| K8s placeholders documented | Manual | 1 | QA |
| README complete | Manual | 1 | QA |
| Full release workflow E2E | E2E | 1 | QA |

**Total P1:** 27 tests | **Effort:** ~10–14 hours

---

### P2/P3 (Medium/Low) — Run nightly/weekly or on-demand

| Requirement | Test Level | Test Count | Priority | Owner |
|-------------|------------|------------|----------|-------|
| Multiple consecutive resets | E2E | 1 | P2 | QA |
| OpenAPI accessible via browser | E2E | 1 | P2 | QA |
| Demo zero-config experience | E2E | 1 | P2 | QA |
| Devcontainer works | Manual | 1 | P2 | QA |
| K8s deployment E2E | E2E | 1 | P2 | QA |

**Total P2/P3:** 5 tests | **Effort:** ~4–6 hours

---

## Test Environment Requirements

### Infrastructure

| Component | Requirement | Notes |
|-----------|-------------|-------|
| Docker | Docker Desktop or Docker Engine | Required for container testing |
| Fishtank container | Running at `http://localhost:5000` | `/health` → 200 |
| Demo image | `fishtank/fishtank:demo` available locally | For demo-specific tests |
| GitHub Actions | Access to runners (Linux, macOS, Windows) | For CI smoke tests |
| K8s cluster | Optional: test cluster for manifest validation | Kind, Minikube, or cloud |

### Test Data

| Data Item | Requirement | Owner |
|-----------|-------------|-------|
| Admin user | Username: `testadmin`, Password: `TestPassword123!` | Global setup |
| Pipeline reset key | `FISHTANK_PIPELINE_RESET_KEY=test-reset-key-32chars!` | Test env var |
| Demo seed data | 3+ services with realistic mappings | Pre-built in demo image |

### Environment Variables for Testing

| Variable | Test Value | Purpose |
|----------|------------|---------|
| `FISHTANK_PIPELINE_RESET_KEY` | `test-reset-key-32chars-minimum!!` | Reset endpoint tests |
| `FISHTANK_PIPELINE_RESET_KEY` | (unset) | Test disabled state |

---

## Appendix: API Key Authentication Pattern

Story 6-1 introduces a distinct authentication mechanism for the pipeline reset endpoint:

```
POST /admin/reset
X-Pipeline-Key: {FISHTANK_PIPELINE_RESET_KEY value}
```

This is **not** the same as JWT-based user authentication:
- No cookie required
- No user session
- API key passed in `X-Pipeline-Key` header
- Endpoint returns 401 (invalid key) or 403 (feature disabled) without logging the attempted key value

---

## Appendix: Parity Audit Checklist (FR-43)

The following UI operations must have corresponding REST endpoints documented in OpenAPI spec:

| UI Operation | Expected Endpoint | Epic |
|--------------|------------------|------|
| Service CRUD | `GET/POST/PUT /api/services`, `DELETE /api/services/{id}` | Epic 2 |
| Service start/stop | `POST /api/services/{id}/start`, `POST /api/services/{id}/stop` | Epic 2 |
| Service import | `POST /api/services/import` | Epic 2 |
| Mapping CRUD | `GET/POST/PUT/DELETE /api/mappings` | Epic 4 |
| Response file CRUD | `GET/POST/PUT/DELETE /api/responses` | Epic 4 |
| Resync | `POST /api/mappings/resync` | Epic 4 |
| Activity log query | `GET /api/activity` | Epic 3 |
| Activity log clear | `DELETE /api/activity` | Epic 3 |
| System Events | `GET /api/events` | Epic 3 |
| User management | `GET/POST /api/users`, `PUT /api/users/{id}/deactivate` | Epic 5 |
| Feature toggles | `GET /api/admin/toggles`, `PUT /api/admin/toggles/{name}` | Epic 5 |
| Health dashboard | `GET /api/admin/health` | Epic 5 |
| Audit log | `GET /api/admin/audit` | Epic 5 |
| Pipeline reset | `POST /admin/reset` | Epic 6 |
| OpenAPI spec | `GET /openapi/v1.json` | Epic 6 |

---

## Appendix: Cross-Platform CI Matrix

| Runner | OS | Architecture | Smoke Test |
|--------|----|--------------|-----------| 
| `ubuntu-latest` | Linux | x64 | `docker run` + `GET /health` |
| `macos-latest` | macOS | ARM64 (Apple Silicon) | `docker run` + `GET /health` |
| `macos-13` | macOS | x64 (Intel) | `docker run` + `GET /health` |
| `windows-latest` | Windows | x64 | `docker run` + `GET /health` |

All runners must pass for Docker Hub publish to proceed.
