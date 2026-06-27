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
lastSaved: '2026-06-27'
workflowType: 'testarch-test-design'
mode: 'epic-level'
epic: 3
epicTitle: 'Network Activity & Request Monitoring'
inputDocuments:
  - _bmad-output/project-context.md
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/test-artifacts/test-design-architecture.md
  - _bmad-output/test-artifacts/framework-setup-progress.md
---

# Test Design: Epic 3 — Network Activity & Request Monitoring

**Date:** 2026-06-27
**Author:** Murat (Master Test Architect)
**Status:** Draft
**Project:** Fishtank
**Epic Reference:** Epic 3 (v0.3.0)
**PRD FRs:** FR-7, FR-8, FR-9, FR-10, FR-11, FR-12, FR-13

---

## Executive Summary

**Scope:** Epic-level test design for Epic 3 — Network Activity & Request Monitoring

Epic 3 delivers the observability layer for Fishtank: a real-time activity log showing every HTTP request hitting mock services, with filtering, sorting, three row-detail display styles (Modal, Right Drawer, Bottom Panel), sensitive header redaction, auto-refresh controls, and a proxy counter pill. This epic builds on the SignalR infrastructure from Epic 2 and activates all three row-detail variants of the `<DataTable>` base component.

**Stories in Scope:**

| Story | Title | FRs |
|-------|-------|-----|
| **3-1** | Activity Log Backend — Request Capture and Header Redaction | FR-7, FR-10 |
| **3-2** | Network Activity Page — Real-time Log Display | FR-7, FR-12 |
| **3-3** | Activity Log Filtering, Sorting, Auto-refresh and Log Controls | FR-8, FR-11, FR-13 |
| **3-4** | Row Detail — All Three Display Styles | FR-9 |

**Risk Summary:**

- Total risks identified: **5**
- High-priority risks (≥6): **1**
- Medium-priority risks (3–5): **3**
- Low-priority risks (1–2): **1**
- Critical categories: PERF, TECH, SEC

**Coverage Summary:**

- P0 scenarios: 8 (~6–10 hours)
- P1 scenarios: 12 (~8–14 hours)
- P2/P3 scenarios: 6 (~3–6 hours)
- **Total effort**: ~17–30 hours (~2–4 days)

---

## Not in Scope

| Item | Reasoning | Mitigation |
|------|-----------|------------|
| **Record Mode (FR-16)** | Deferred to Epic 4 — Mock Capture & Recording | Tested in Epic 4 test design |
| **Save as Mock (FR-14–15)** | Deferred to Epic 4 — activity log provides the "Save as Mock" button but the modal logic is Epic 4 | Stub button present; Epic 4 tests cover full flow |
| **WCAG 2.1 AA full audit** | Spot-check only in Epic 3 per PRD; full audit is a pre-ship gate (PSG-2) after Epic 4 | Axe-core spot-check on high-density color surfaces |
| **Activity log DB persistence** | Activity log is intentionally in-memory only (cleared on container restart) | N/A — by design |

---

## Risk Assessment

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Prob | Impact | Score | Mitigation | Owner | Timeline |
|---------|----------|-------------|------|--------|-------|------------|-------|----------|
| **R-E3-001** | **PERF** | Virtual scrolling for 10,000+ rows at 60fps (NFR-4) — no library specified; wrong choice causes jank and scroll lag | 2 | 3 | **6** | Validate virtual scroll library choice (`react-window` vs `react-virtuoso` vs Tanstack Virtual) during Story 3-2 implementation with 10k-row stress test | Nico / Dev | Before Story 3-2 UI complete |

### Medium-Priority Risks (Score 3–5)

| Risk ID | Category | Description | Prob | Impact | Score | Mitigation | Owner |
|---------|----------|-------------|------|--------|-------|------------|-------|
| **R-E3-002** | TECH | SignalR `ActivityRowAdded` event races — row arrives before hub listener is registered in integration tests, causing flaky assertions | 2 | 2 | 4 | Use `TaskCompletionSource` await pattern (documented in system-level architecture test design R-003) with 3s timeout | Nico / Dev |
| **R-E3-003** | SEC | Header redaction bypass — sensitive header pattern matching (`secret`, `token`) is case-insensitive regex; edge cases could leak data | 2 | 2 | 4 | Unit tests for redaction service covering: exact headers (`Authorization`, `Cookie`), partial match (`X-Secret-Key`), mixed case (`x-AUTH-Token`), nested JSON body with sensitive keys (not redacted — body redaction out of scope) | Nico / QA |
| **R-E3-004** | PERF | SignalR <500ms push latency (NFR-3) not validated — no stopwatch instrumentation in existing test harness | 2 | 2 | 4 | Add latency assertion in integration test: timestamp request send → timestamp hub event receipt; assert ≤500ms on p95 over 100 requests | Nico / Dev |

### Low-Priority Risks (Score 1–2)

| Risk ID | Category | Description | Prob | Impact | Score | Action |
|---------|----------|-------------|------|--------|-------|--------|
| **R-E3-005** | OPS | Activity log in-memory cap reached — oldest rows evicted; no visibility to user that cap was hit | 1 | 2 | 2 | Document behaviour in README; add System Event when eviction occurs (deferred to Epic 2 enhancement backlog) |

### Risk Category Legend

- **TECH**: Technical/Architecture (flaws, integration, scalability)
- **SEC**: Security (access controls, auth, data exposure)
- **PERF**: Performance (SLA violations, degradation, resource limits)
- **DATA**: Data Integrity (loss, corruption, inconsistency)
- **BUS**: Business Impact (UX harm, logic errors)
- **OPS**: Operations (deployment, config, monitoring)

---

## NFR Planning

**Purpose:** Capture Epic 3–specific NFR thresholds, planned validation, and evidence expected for later `nfr-assess`.

| NFR Category | Requirement / Threshold | Risk Link | Planned Validation | Evidence Needed |
|--------------|-------------------------|-----------|-------------------|-----------------|
| **Performance** | UI initial load <2s (NFR-1) | — | Playwright Lighthouse audit on Network Activity page | Lighthouse report (nightly CI) |
| **Performance** | SignalR push <500ms (NFR-3) | R-E3-004 | Integration test with stopwatch: HTTP request → hub event | Test report with p95 latency |
| **Performance** | 10k rows at 60fps (NFR-4) | R-E3-001 | Playwright scroll performance test: `performance.measure()` during 10k-row scroll | FPS measurement report (nightly CI) |
| **Security** | Sensitive header redaction (NFR-9) | R-E3-003 | Unit tests on redaction service; integration test asserting `[REDACTED]` in activity log | Unit + integration test reports |
| **Accessibility** | Keyboard navigation (NFR-19) | — | Playwright keyboard-only E2E: Tab through filters, arrow keys in table, Enter to open row detail | E2E test pass |
| **Accessibility** | WCAG 2.1 AA spot-check (NFR-20) | — | Axe-core on Network Activity page per theme (Clean Light + Deep Ocean minimum) | Axe violation report (0 critical/serious) |
| **Accessibility** | prefers-reduced-motion (NFR-21) | — | Playwright with `prefers-reduced-motion: reduce` emulation; assert no CSS animations on refresh icon, LIVE pulse | E2E test pass |

**Unknown thresholds:** None — all thresholds are specified in PRD.

---

## Entry Criteria

- [x] Epic 2 complete — WireMock engine running, services can receive HTTP traffic
- [x] `ServicesHub.cs` + `EventsHub.cs` operational (SignalR infrastructure from Epic 2)
- [x] `<DataTable>` base component scaffolded (Epic 2 Story 2-3)
- [x] React Query + SignalR seam (`queryClient.ts` + `HUB_INVALIDATION_MAP`) established (Epic 1)
- [ ] Test environment: Fishtank container running at `http://localhost:5000/health` → 200
- [ ] At least one mock service created and receiving traffic (via WireMock proxy or direct mock)

## Exit Criteria

- [ ] All P0 tests passing
- [ ] All P1 tests passing (or failures triaged with fix stories)
- [ ] No open P0/P1 bugs related to FR-7 through FR-13
- [ ] SignalR latency (NFR-3) validated at ≤500ms p95
- [ ] Virtual scroll performance (NFR-4) validated at ≥60fps with 10k rows
- [ ] Header redaction (NFR-9) validated for all documented sensitive header patterns
- [ ] Axe-core spot-check on Network Activity page: 0 critical/serious violations

---

## Test Coverage Plan

### Story 3-1: Activity Log Backend — Request Capture and Header Redaction

**FRs:** FR-7 (request capture), FR-10 (header redaction)

| Test Level | Test Scenario | Priority | Risk Link | Owner | Notes |
|------------|---------------|----------|-----------|-------|-------|
| **Unit** | Redaction service redacts `Authorization` header | P0 | R-E3-003 | DEV | Exact match |
| **Unit** | Redaction service redacts `Cookie` / `Set-Cookie` headers | P0 | R-E3-003 | DEV | Exact match |
| **Unit** | Redaction service redacts `X-Api-Key`, `X-Auth-Token` | P0 | R-E3-003 | DEV | Exact match |
| **Unit** | Redaction service redacts headers containing `secret` (case-insensitive) | P1 | R-E3-003 | DEV | Partial match: `X-Secret-Value`, `my-secret` |
| **Unit** | Redaction service redacts headers containing `token` (case-insensitive) | P1 | R-E3-003 | DEV | Partial match: `X-Refresh-Token`, `csrf-token` |
| **Unit** | Redaction service does NOT redact non-sensitive headers | P1 | — | DEV | `Content-Type`, `Accept`, custom headers without keywords |
| **Integration** | `POST /api/activity/capture` stores row with redacted headers | P0 | R-E3-003 | QA | WebApplicationFactory; assert `[REDACTED]` values |
| **Integration** | Activity row includes: method, URL, status, type, service, datetime, duration | P1 | — | QA | Schema validation |
| **Integration** | Activity log respects per-service configurable maximum | P2 | R-E3-005 | QA | Seed max+1 rows; assert oldest evicted |

**Test Count:** 9 | **Effort:** ~4–6 hours

---

### Story 3-2: Network Activity Page — Real-time Log Display

**FRs:** FR-7 (real-time push), FR-12 (proxy counter pill)

| Test Level | Test Scenario | Priority | Risk Link | Owner | Notes |
|------------|---------------|----------|-----------|-------|-------|
| **Integration** | `ActivityRowAdded` SignalR event pushed within 500ms of HTTP request | P0 | R-E3-004 | DEV | Stopwatch assertion |
| **Integration** | `GET /api/activity` returns newest-first sorted rows | P1 | — | QA | Default sort order |
| **Component** | `<ActivityLog>` renders rows received via SignalR without React Query | P0 | R-E3-002 | DEV | Vitest + RTL + mock SignalR |
| **Component** | `<ActivityLog>` virtual scrolling handles 10,000 rows | P0 | R-E3-001 | DEV | Vitest performance assertion |
| **Component** | HTTP method chips render correct colors per method (GET, POST, PUT, DELETE, PATCH) | P1 | — | DEV | UX-DR7 |
| **Component** | Type column icon: `bi-database` for Mocked, `bi-arrow-repeat` for Proxied | P1 | — | DEV | UX-DR9 |
| **Component** | Proxied row from Live service shows amber left-border accent | P1 | — | DEV | UX-DR10 |
| **Component** | 5xx row shows red background (`--error-row-bg`) | P1 | — | DEV | UX-DR10 |
| **Component** | Proxy counter pill shows total proxied count | P1 | — | DEV | FR-12 |
| **Component** | Proxy counter pill click opens per-service breakdown popover | P2 | — | DEV | FR-12 |
| **E2E** | Navigate to Network Activity → rows appear in real time as service receives traffic | P0 | — | QA | Playwright; seed traffic via HTTP request to mock service |
| **E2E** | Proxy counter pill renders in error color if any row is 5xx | P2 | — | QA | FR-12 edge case |

**Test Count:** 12 | **Effort:** ~6–10 hours

---

### Story 3-3: Activity Log Filtering, Sorting, Auto-refresh and Log Controls

**FRs:** FR-8 (filter/sort), FR-11 (auto-refresh), FR-13 (clear log)

| Test Level | Test Scenario | Priority | Risk Link | Owner | Notes |
|------------|---------------|----------|-----------|-------|-------|
| **Integration** | `GET /api/activity?service={id}` filters by service | P1 | — | QA | |
| **Integration** | `GET /api/activity?type=Mocked` / `type=Proxied` filters by type | P1 | — | QA | |
| **Integration** | `GET /api/activity?search=payment` filters by URL path + method (case-insensitive) | P1 | — | QA | AND logic |
| **Integration** | `DELETE /api/activity` clears all rows | P0 | — | QA | FR-13 |
| **Component** | Filter controls: search input, service dropdown, type dropdown | P1 | — | DEV | FR-8 |
| **Component** | "Clear filters" button resets all filters + sort to DateTime descending | P1 | — | DEV | FR-8 |
| **Component** | LIVE/PAUSED indicator toggles auto-refresh state | P1 | — | DEV | FR-11 |
| **Component** | Manual refresh icon visible when paused; animates during fetch | P1 | — | DEV | FR-11 |
| **Component** | Refresh icon respects `prefers-reduced-motion` (no animation) | P2 | — | DEV | NFR-21 |
| **E2E** | Filter by service → only that service's rows displayed | P1 | — | QA | Playwright |
| **E2E** | Clear log button clears all rows + resets proxy counter pill | P0 | — | QA | FR-13 |

**Test Count:** 11 | **Effort:** ~5–8 hours

---

### Story 3-4: Row Detail — All Three Display Styles

**FRs:** FR-9 (row detail — Modal, Right Drawer, Bottom Panel)

| Test Level | Test Scenario | Priority | Risk Link | Owner | Notes |
|------------|---------------|----------|-----------|-------|-------|
| **Component** | Row detail Modal renders all fields: request ID, datetime, method, URL, service, port, type, status, headers, body (request + response) | P0 | — | DEV | FR-9 |
| **Component** | Row detail Right Drawer (320px) renders same fields | P1 | — | DEV | FR-9 |
| **Component** | Row detail Bottom Panel with tabs (Request / Response) renders same fields | P1 | — | DEV | FR-9 |
| **Component** | Headers display `[REDACTED]` for sensitive headers | P1 | R-E3-003 | DEV | FR-10 |
| **Component** | Mobile (<640px) always uses Modal regardless of preference | P1 | — | DEV | UX-DR6 |
| **E2E** | Click row → Modal opens (default style) | P0 | — | QA | Playwright |
| **E2E** | Change preference to Right Drawer in Settings → row click opens drawer | P1 | — | QA | FR-9 |
| **E2E** | Change preference to Bottom Panel in Settings → row click opens panel | P1 | — | QA | FR-9 |
| **E2E** | Keyboard navigation: arrow keys move row focus, Enter opens detail | P1 | — | QA | NFR-19, UX-DR11 |
| **E2E** | Proxied row shows "Save as Mock" action in detail panel | P2 | — | QA | FR-14 stub — full test in Epic 4 |

**Test Count:** 10 | **Effort:** ~4–6 hours

---

## Coverage Summary by Priority

### P0 (Critical) — Run on every commit

**Criteria:** Blocks core journey + High risk (≥6) + No workaround

| Requirement | Test Level | Risk Link | Test Count | Owner |
|-------------|------------|-----------|------------|-------|
| Header redaction (exact matches) | Unit | R-E3-003 | 3 | DEV |
| Activity row stored with redacted headers | Integration | R-E3-003 | 1 | QA |
| SignalR push <500ms | Integration | R-E3-004 | 1 | DEV |
| Virtual scroll 10k rows | Component | R-E3-001 | 1 | DEV |
| Activity log rows render | Component | R-E3-002 | 1 | DEV |
| Clear log clears all rows | Integration | — | 1 | QA |
| Row detail Modal renders all fields | Component | — | 1 | DEV |
| Real-time rows appear on page | E2E | — | 1 | QA |
| Row click opens Modal | E2E | — | 1 | QA |
| Clear log E2E | E2E | — | 1 | QA |

**Total P0:** 12 tests | **Effort:** ~6–10 hours

---

### P1 (High) — Run on PR to release branch

**Criteria:** Important features + Medium risk (3–4) + Common workflows

| Requirement | Test Level | Test Count | Owner |
|-------------|------------|------------|-------|
| Header redaction (partial matches, negative cases) | Unit | 3 | DEV |
| Activity row schema validation | Integration | 1 | QA |
| Filter by service/type/search | Integration | 3 | QA |
| Method chip colors, type icons, row highlights | Component | 4 | DEV |
| Filter controls, LIVE/PAUSED, refresh icon | Component | 4 | DEV |
| Row detail Drawer + Panel + mobile fallback | Component | 3 | DEV |
| Filter E2E, row detail preference E2E, keyboard nav E2E | E2E | 4 | QA |

**Total P1:** 22 tests | **Effort:** ~8–14 hours

---

### P2/P3 (Medium/Low) — Run nightly/weekly or on-demand

| Requirement | Test Level | Test Count | Priority | Owner |
|-------------|------------|------------|----------|-------|
| Activity log eviction at cap | Integration | 1 | P2 | QA |
| Proxy counter popover | Component | 1 | P2 | DEV |
| Proxy counter error color on 5xx | E2E | 1 | P2 | QA |
| Refresh icon `prefers-reduced-motion` | Component | 1 | P2 | DEV |
| "Save as Mock" stub in detail panel | E2E | 1 | P2 | QA |
| Full WCAG spot-check (4 themes) | E2E | 1 | P3 | QA |

**Total P2/P3:** 6 tests | **Effort:** ~3–6 hours

---

## Execution Order

### Smoke Tests (<3 min)

**Purpose:** Fast feedback after deployment; catch build-breaking issues.

1. [ ] `GET /health` → 200 (30s)
2. [ ] `GET /api/activity` → 200 with empty array (30s)
3. [ ] Navigate to Network Activity page → renders without JS errors (1min)

**Total:** 3 scenarios

### P0 Tests (<10 min)

**Purpose:** Critical path validation before merge.

1. [ ] Header redaction unit tests (3 scenarios)
2. [ ] SignalR push latency integration test
3. [ ] Activity row capture integration test
4. [ ] Clear log integration test
5. [ ] Virtual scroll component test
6. [ ] Activity log render component test
7. [ ] Row detail Modal component test
8. [ ] Real-time rows E2E
9. [ ] Row click Modal E2E
10. [ ] Clear log E2E

**Total:** 12 scenarios

### P1 Tests (<20 min)

**Purpose:** Feature coverage for release confidence.

1. [ ] Redaction edge cases (3 unit)
2. [ ] Filter API tests (3 integration)
3. [ ] UI components: chips, icons, highlights (4 component)
4. [ ] Filter controls + auto-refresh (4 component)
5. [ ] Row detail Drawer/Panel/mobile (3 component)
6. [ ] Filter E2E + preference E2E + keyboard nav E2E (4 E2E)

**Total:** 22 scenarios

---

## Execution Strategy

| Tier | Trigger | Suites | Max Duration |
|------|---------|--------|--------------|
| **PR** | Every push to `story/**`, `feature/**` | Smoke + P0 + P1 (unit, integration, component) | <15 min |
| **Nightly** | Scheduled 02:00 UTC | Full P0–P2 + Lighthouse + Axe-core | <30 min |
| **Weekly** | Scheduled Sunday 06:00 UTC | Full suite + 10k-row performance + all 4 themes WCAG | <60 min |

---

## Resource Estimates

| Priority | Test Count | Effort Range |
|----------|------------|--------------|
| P0 | 12 | 6–10 hours |
| P1 | 22 | 8–14 hours |
| P2/P3 | 6 | 3–6 hours |
| **Total** | **40** | **17–30 hours (~2–4 days)** |

**Assumptions:**

- One developer wearing QA hat (solo project)
- Unit + component tests written alongside implementation (dev-owned)
- Integration + E2E tests written post-implementation (QA-owned or dev when solo)
- Estimates exclude CI setup time (already in place from Epic 1)

---

## Quality Gates

| Gate | Threshold | Enforcement |
|------|-----------|-------------|
| P0 pass rate | **100%** | PR merge blocked |
| P1 pass rate | **≥95%** | PR merge blocked; failures triaged |
| High-risk mitigations | Complete before Story 3-2 closes | R-E3-001 (virtual scroll validation) |
| Code coverage (backend) | **≥80%** ActivityService, RedactionService | CI coverage report |
| Code coverage (frontend) | **≥80%** `features/activity/` | CI coverage report |
| SignalR latency (NFR-3) | **p95 ≤500ms** | Integration test assertion |
| Virtual scroll (NFR-4) | **≥60fps with 10k rows** | Nightly Playwright perf gate |
| Axe violations | **0 critical/serious** | Nightly axe-core scan |
| Header redaction (NFR-9) | All documented patterns pass | Unit test suite |

---

## Dependencies and Assumptions

### Dependencies

| Dependency | Source | Status |
|------------|--------|--------|
| WireMock engine serving traffic | Epic 2 | ✅ Complete |
| SignalR hubs (`ServicesHub`, `EventsHub`) | Epic 2 | ✅ Complete |
| `<DataTable>` base component | Epic 2 Story 2-3 | ✅ Complete |
| `queryClient.ts` + `HUB_INVALIDATION_MAP` | Epic 1 | ✅ Complete |
| `AuthTestHelper` for integration tests | System-level test design R-002 | ✅ Resolved in Epic 1-2 |
| SignalR test pattern (`TaskCompletionSource`) | System-level test design R-003 | ⚠️ To be documented in Story 3-2 |

### Assumptions

1. Activity log is in-memory only — no database persistence; cleared on container restart (per PRD)
2. Virtual scrolling library choice (`react-window` or `react-virtuoso`) will be validated during Story 3-2 implementation
3. "Save as Mock" button is rendered but disabled/stub in Epic 3; full functionality in Epic 4
4. Settings → Activity preference persistence uses existing Settings endpoint from Epic 2
5. E2E tests run against live stack (`http://localhost:5000`), not mocked backend (per CONTRIBUTING.md policy)

---

## Appendix: FR to Test Mapping

| FR | Description | Story | Test Scenarios |
|----|-------------|-------|----------------|
| FR-7 | Real-time activity log | 3-1, 3-2 | Capture, SignalR push, render, virtual scroll |
| FR-8 | Filter and sort activity log | 3-3 | Filter API, filter UI, clear filters |
| FR-9 | Row detail (Modal, Drawer, Panel) | 3-4 | All 3 styles, mobile fallback, keyboard nav |
| FR-10 | Sensitive header redaction | 3-1 | Redaction unit tests, integration assertion |
| FR-11 | Auto-refresh configuration | 3-3 | LIVE/PAUSED toggle, manual refresh |
| FR-12 | Proxy counter pill | 3-2 | Pill render, popover, error color on 5xx |
| FR-13 | Clear log | 3-3 | DELETE API, UI button, proxy counter reset |
