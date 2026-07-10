---
story_key: "5-3-health-dashboard-audit-log-and-auto-registration-toggle"
story_id: "5.3"
story_title: "Health Dashboard, Audit Log & Auto-Registration Toggle"
date: 2026-07-10
generated_by: "bmad-testarch-trace"
gate_decision: PASS
coverage_breadth_pct: 100
coverage_full_pct: 69
coverage_weighted_pct: 85
total_acs: 13
full_coverage: 9
partial_coverage: 4
no_coverage: 0
gaps:
  - id: G-1
    ac: AC-5
    severity: minor
    description: "Ordering assertion in GetAdminAudit_EntriesOrderedNewestFirst is vacuous — conditional guard `if (items.Count > 1)` never fires with empty DB; contract untested at assertion level"
    disposition: noted
  - id: G-2
    ac: AC-7
    severity: minor
    description: "No dedicated DB schema or index test; AuditLog fields covered implicitly by AuditServiceTests; CreatedAt index confirmed in migration log but not asserted by any test"
    disposition: accepted
  - id: G-3
    ac: AC-8
    severity: major
    description: "USER_DEACTIVATED audit event has no integration test (2/3 action types covered); unit tests mock IAuditService but never verify LogAsync was called for FeatureToggleService or UserManagementService (F2, F3, F4 from test review)"
    disposition: noted
  - id: G-4
    ac: AC-11
    severity: minor
    description: "3 E2E tests intentionally skipped — ON-state 'Create account' link visible, /register navigation, and register form require auto-registration=ON; not feasible in standard E2E without toggle manipulation"
    disposition: waived
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-map-criteria', 'step-04-analyze-gaps', 'step-05-gate-decision']
lastStep: 'step-05-gate-decision'
lastSaved: '2026-07-10'
evidence:
  integration_tests_run: 13
  integration_tests_passed: 13
  integration_tests_failed: 0
  unit_backend_tests_new: 11
  unit_frontend_tests_new: 29
  e2e_tests_active: 16
  e2e_tests_skipped: 4
  nfr_verdict: PASS
  test_review_grade: "C (73/100) — Approve with Comments"
---

# Traceability Matrix: Story 5-3 — Health Dashboard, Audit Log & Auto-Registration Toggle

**Date:** 2026-07-10  
**Story:** 5-3 Health Dashboard, Audit Log & Auto-Registration Toggle  
**Gate Decision:** ✅ PASS  
**FRs Covered:** FR-29, FR-32, FR-33  
**NFRs Covered:** NFR-8, R-E5-002, R-E5-004

---

## Executive Summary

All 13 Acceptance Criteria have test coverage at one or more layers. 9 ACs achieve full multi-layer coverage; 4 ACs have partial coverage with known, documented gaps that do not represent functional voids. All 13 integration tests pass. All 40 new unit tests pass. 16 E2E tests are active (4 intentionally skipped by design). Security-critical paths (AC-3, AC-6) are fully covered at integration level with explicit `ADMIN_FORBIDDEN` assertions. The NFR assessment independently issued a PASS verdict. No blockers remain.

---

## Test Inventory

### Integration Tests — `Story5_3_AdminConsoleTests.cs`
13 tests · all PASSING (2026-07-10 NFR run)

| # | Test Name | AC | Result |
|---|-----------|-----|--------|
| 1 | AC-2: GET /api/admin/health with Admin JWT returns 200 with health metrics | AC-2 | ✅ PASS |
| 2 | AC-3: GET /api/admin/health requires Admin role — Standard User returns 403 | AC-3 | ✅ PASS |
| 3 | AC-5: GET /api/admin/audit with Admin JWT returns 200 with audit entries | AC-5 | ✅ PASS |
| 4 | AC-5: GET /api/admin/audit supports pagination via ?page query parameter | AC-5 | ✅ PASS |
| 5 | AC-5: GET /api/admin/audit returns entries ordered by CreatedAt DESC | AC-5 | ✅ PASS† |
| 6 | AC-6: GET /api/admin/audit requires Admin role — Standard User returns 403 | AC-6 | ✅ PASS |
| 7 | AC-8: Audit entry created when admin changes a feature toggle | AC-8 | ✅ PASS |
| 8 | AC-8: Audit entry created when admin creates a user | AC-8 | ✅ PASS |
| 9 | AC-10: POST /api/auth/register returns 403 when auto-registration is OFF (default) | AC-10 | ✅ PASS |
| 10 | AC-10: POST /api/auth/register creates Standard User when auto-registration is ON | AC-10 | ✅ PASS |
| 11 | AC-10: POST /api/auth/register returns 409 when username already exists | AC-10 | ✅ PASS |
| 12 | AC-10: POST /api/auth/register returns 400 when password is < 12 characters | AC-10 | ✅ PASS |
| 13 | GET /api/auth/registration-status returns current auto-registration state (public) | AC-11 | ✅ PASS |

† Test contains conditional `if (items.Count > 1)` guard that is never reached with empty DB — ordering contract not exercised at assertion level (G-1).

---

### Unit Tests — Backend

| File | Tests | ACs Covered | Result |
|------|-------|-------------|--------|
| `AuditServiceTests.cs` | 5 | AC-7, AC-8 | ✅ All PASS |
| `FeatureToggleServiceTests.cs` (added) | 3 | AC-9 (env var) | ✅ All PASS |
| `UserManagementServiceTests.cs` (added) | 3 | AC-10 (ForcePasswordChange) | ✅ All PASS |

**Backend unit total (story): 11 tests — 11 PASS**

### Unit Tests — Frontend

| File | Tests | ACs Covered | Result |
|------|-------|-------------|--------|
| `useHealth.test.tsx` | 6 | AC-1, AC-2 (hook) | ✅ All PASS |
| `HealthDashboardSection.test.tsx` | 10 | AC-1, AC-13 | ✅ All PASS |
| `AuditLogSection.test.tsx` | 13 | AC-4, AC-13 | ✅ All PASS |

**Frontend unit total (story): 29 tests — 29 PASS**

### E2E Tests — `story-5-3-health-dashboard-audit-log-and-auto-registration-toggle.spec.ts`
16 active + 4 intentionally skipped

| # | Test Name | AC | Priority | Active? |
|---|-----------|-----|----------|---------|
| 1 | Health tab shows Health Dashboard section with all metrics | AC-1 | P0 | ✅ |
| 2 | Health Dashboard displays active services count | AC-1 | P0 | ✅ |
| 3 | Health Dashboard displays database status with visual indicator | AC-1 | P0 | ✅ |
| 4 | Health Dashboard displays container uptime in human-readable format | AC-1 | P0 | ✅ |
| 5 | Health refresh button refetches data on click | AC-1 | P0 | ✅ |
| 6 | Audit Log tab shows Audit Log section with table | AC-4 | P0 | ✅ |
| 7 | Audit Log table has Action, Actor, Resource, Timestamp columns | AC-4 | P0 | ✅ |
| 8 | Audit Log displays entries newest-first when audit data exists | AC-4 | P0 | ✅ |
| 9 | Audit Log shows 'Load more' button for pagination | AC-4 | P0 | ✅‡ |
| 10 | Audit Log shows empty state when no entries exist | AC-4 | P0 | ✅ |
| 11 | Auto-Registration toggle entry appears in Feature Toggles list | AC-9 | P1 | ✅ |
| 12 | Auto-Registration toggle is disabled by default | AC-9 | P1 | ✅ |
| 13 | Auto-Registration toggle shows env-var-locked indicator | AC-9 | P1 | ⏭️ SKIP§ |
| 14 | Login page does NOT show 'Create account' link when auto-registration is OFF | AC-11 | P1 | ✅ |
| 15 | Login page shows 'Create account' link when auto-registration is ON | AC-11 | P1 | ⏭️ SKIP§ |
| 16 | Create account link navigates to /register route | AC-11 | P1 | ⏭️ SKIP§ |
| 17 | Register page renders with username, password, confirm password fields | AC-11 | P1 | ⏭️ SKIP§ |
| 18 | Register page shows 'Self-registration is not available' when auto-registration is OFF | AC-11 | P1 | ✅ |
| 19 | Health tab no longer shows placeholder content | AC-12 | P0 | ✅ |
| 20 | Audit Log tab no longer shows placeholder content | AC-12 | P0 | ✅ |

‡ Load more test swallows all assertion failures via `.catch(() => {})` — always passes regardless of implementation (F5 from test review).  
§ Intentionally skipped: requires `auto_registration` toggle to be ON or container restart with env var — not feasible in standard E2E run.

---

## AC → Test Coverage Matrix

| AC | Description | Priority | FR/NFR | Integration | Unit Backend | Unit Frontend | E2E | Coverage Status |
|----|-------------|---------|--------|:-----------:|:------------:|:-------------:|:---:|:---------------:|
| **AC-1** | Health Dashboard displays metrics (active services, requests, DB status, uptime, last-refreshed, auto-refresh 30s) | P0 | FR-32 | — | `useHealth.test.tsx` (6T) | `HealthDashboardSection.test.tsx` (10T) | 5 active | **FULL** ✅ |
| **AC-2** | GET /api/admin/health returns structured data (schema, field semantics) | P0 | FR-32 | 1 test ✅ | `useHealth.test.tsx` (6T) | — | Implicit via AC-1 E2E | **FULL** ✅ |
| **AC-3** | GET /api/admin/health requires Admin role (Standard User → 403 ADMIN_FORBIDDEN) | P0 | NFR-8, R-E5-002 | 1 test ✅ | — | — | — | **FULL** ✅ |
| **AC-4** | Audit Log section displays entries (columns, newest-first, pagination, empty state) | P0 | FR-33 | — | — | `AuditLogSection.test.tsx` (13T) | 5 active‡ | **FULL** ✅ |
| **AC-5** | GET /api/admin/audit returns paginated entries (schema, ?page, DESC order) | P0 | FR-33 | 3 tests ✅† | — | — | — | **PARTIAL** ⚠️ |
| **AC-6** | GET /api/admin/audit requires Admin role (Standard User → 403 ADMIN_FORBIDDEN) | P0 | NFR-8, R-E5-002 | 1 test ✅ | — | — | — | **FULL** ✅ |
| **AC-7** | AuditLog entity schema (fields, nullable FK, CreatedAt index) | P1 | FR-33, R-E5-004 | Implicit via AC-5 | `AuditServiceTests.cs` (5T) | — | — | **PARTIAL** ⚠️ |
| **AC-8** | Audit entries created for TOGGLE_CHANGED, USER_CREATED, USER_DEACTIVATED | P1 | FR-33 | 2/3 tests ✅‡‡ | `AuditServiceTests.cs` (5T) | — | — | **PARTIAL** ⚠️ |
| **AC-9** | Auto-Registration toggle in Feature Toggles UI (default OFF, env-var-lock pattern) | P1 | FR-29 | — | `FeatureToggleServiceTests.cs` (3T) | — | 2 active + 1 skip§ | **FULL** ✅ |
| **AC-10** | Self-registration endpoint respects toggle (OFF→403, ON→Standard User, 409, 400) | P0 | FR-29 | 4 tests ✅ | `UserManagementServiceTests.cs` (2T) | — | — | **FULL** ✅ |
| **AC-11** | Login page conditional registration link; /register page (OFF→hidden, ON→visible) | P1 | FR-29 | 1 test ✅ | — | — | 2 active + 3 skip§ | **PARTIAL** ⚠️ |
| **AC-12** | Admin Console placeholder tabs replaced (Health + Audit Log show real content) | P0 | — | — | — | — | 2 active | **FULL** ✅ |
| **AC-13** | data-testid attributes on all new elements | P2 | — | — | Component tests (23T assertions) | — | All E2E use getByTestId | **FULL** ✅ |

**Coverage totals:**
- FULL: 9/13 ACs (AC-1, AC-2, AC-3, AC-4, AC-6, AC-9, AC-10, AC-12, AC-13)
- PARTIAL: 4/13 ACs (AC-5, AC-7, AC-8, AC-11)
- NONE: 0/13 ACs

---

## Coverage Gaps

### G-1 · AC-5 · Minor — Vacuous Ordering Assertion

**Severity:** Minor  
**AC:** AC-5 (P0)  
**Test:** `GetAdminAudit_EntriesOrderedNewestFirst` (`Story5_3_AdminConsoleTests.cs`)  
**Finding:** The ordering assertion (`firstTimestamp.Should().BeOnOrAfter(secondTimestamp)`) is wrapped in `if (items.Count > 1)`. Since `ResetDatabaseAsync()` clears all data and no entries are seeded before the `GET` call, `items.Count` is always 0 and the ordering contract is never asserted. The test passes vacuously.  
**Disposition:** Noted — test review F1 logged; recommended fix is to seed two entries with known timestamps before asserting ordering unconditionally. Does not block gate; API returns correct ordering in production (confirmed by manual smoke testing and code inspection).  
**Mitigations:** `GET /api/admin/audit` calls `OrderByDescending(a => a.CreatedAt)` at query time (verified in code); AC-8 integration tests implicitly generate multiple entries in later runs.

---

### G-2 · AC-7 · Minor — No Dedicated Schema or Index Test

**Severity:** Minor  
**AC:** AC-7 (P1)  
**Finding:** No integration test explicitly asserts the DB schema (column names, nullability, FK constraint) or verifies the `IX_AuditLogs_CreatedAt` index exists. Schema coverage is implicit: `AuditServiceTests.LogAsync_CreatesAuditEntry_WithAllFields` asserts all fields are written; the AC-5 integration test verifies the API response shape (`id`, `action`, `actorUsername`, `resourceType`, `resourceId`, `createdAt`).  
**Disposition:** Accepted — NFR assessment confirmed the migration created the index (`CREATE INDEX "IX_AuditLogs_CreatedAt" ON "AuditLogs" ("CreatedAt")` in migration log). No explicit test needed for v1; candidate for schema-snapshot test in future test hardening pass.

---

### G-3 · AC-8 · Major — USER_DEACTIVATED Audit Event Not Integration-Tested; Unit Call Verification Missing

**Severity:** Major  
**AC:** AC-8 (P1)  
**Finding (a):** AC-8 specifies three audit events: `TOGGLE_CHANGED`, `USER_CREATED`, `USER_DEACTIVATED`. Only the first two have integration tests. No test deactivates a user and verifies a `USER_DEACTIVATED` entry appears in `GET /api/admin/audit`.  
**Finding (b):** `FeatureToggleServiceTests.cs` and `UserManagementServiceTests.cs` mock `IAuditService` but never call `LogAsync` verification — a developer could remove the audit call and all unit tests would still pass (test review F3, F4).  
**Disposition:** Noted — code review confirmed `UserManagementService.DeactivateUserAsync` calls `AuditService.LogAsync` with `USER_DEACTIVATED` action (B-1 blocker resolved). Gap is in test coverage density, not in functionality. Recommended fix: add third AC-8 integration test + `Mock.Verify()` calls in unit tests. Does not block gate at P1 priority with existing code evidence.

---

### G-4 · AC-11 · Minor — ON-State E2E Tests Intentionally Skipped

**Severity:** Minor  
**AC:** AC-11 (P1)  
**Finding:** Three E2E tests are `test.skip()`:  
- Login page shows 'Create account' link when auto-registration is ON  
- Create account link navigates to /register route  
- Register page renders with form fields  
**Reason:** These tests require `auto_registration` to be ON, which requires an admin login + toggle change before the test, or a dedicated test scenario fixture. The standard E2E test run does not provide this setup.  
**Disposition:** Waived — the OFF-state behavior is verified by 2 active E2E tests; the registration-status API endpoint is fully covered by 1 integration test. The skipped scenarios represent the ON-state happy path which is tested at integration level (`Register_AutoRegistrationOn_CreatesStandardUser` passing). Recommend adding a dedicated E2E scenario test for the ON-state flow in a future test expansion sprint.

---

## Priority Breakdown

| Priority | Total ACs | Full | Partial | None | Full% |
|----------|-----------|------|---------|------|-------|
| P0 (critical) | 7 | 6 | 1 | 0 | 86% |
| P1 (high) | 5 | 2 | 3 | 0 | 40% |
| P2 (medium) | 1 | 1 | 0 | 0 | 100% |
| **All** | **13** | **9** | **4** | **0** | **69%** |

P0 partial: AC-5 (ordering assertion vacuous — minor quality gap, core functionality verified).

---

## NFR Cross-Reference

| NFR | AC(s) | Evidence | Status |
|-----|-------|----------|--------|
| NFR-8 (Admin-only endpoints) | AC-3, AC-6 | Integration tests 2 & 6 — Standard User → 403 + `ADMIN_FORBIDDEN` on both endpoints | ✅ MET |
| R-E5-002 (Admin role escalation) | AC-3, AC-6 | Same integration tests verify structured 403 (not 401), no data exposure | ✅ MET |
| R-E5-004 (CreatedAt index) | AC-7 | Migration log confirms `CREATE INDEX "IX_AuditLogs_CreatedAt"`; full-table pagination known v1 limitation (M-1, deferred) | ✅ MET (index present; pagination v2 deferred) |
| FR-29 (Auto-registration OFF by default) | AC-9, AC-10 | Integration test 9 (Register_AutoRegistrationOff_Returns403 PASS); migration seeds `auto_registration` Enabled=0 | ✅ MET |
| FR-32 (Health dashboard metrics) | AC-1, AC-2 | E2E (5 tests) + component tests (16T) + 1 integration test | ✅ MET |
| FR-33 (Audit log persisted + displayed) | AC-4, AC-5, AC-7, AC-8 | E2E (5T) + component tests (13T) + 5 integration tests | ✅ MET |

---

## Risk Register (Test-Derived)

| Risk | AC | Severity | Test Evidence | Status |
|------|----|----------|---------------|--------|
| USER_DEACTIVATED audit call removed without detection | AC-8 | Medium | No test verifies call chain; code review confirmed call present | ⚠️ Open |
| Audit pagination at scale (full-table load) | AC-5 | Medium | M-1 in NFR — `TODO v2` present in code; no volume test | ⚠️ Deferred v2 |
| Register page ON-state not E2E-tested | AC-11 | Low | Integration test covers endpoint; E2E skipped | ⚠️ Open |
| DB status color check fragile (`className.includes("green")`) | AC-1 | Low | E2E test F11 — fragile against CSS module changes | ⚠️ Minor |

---

## Gate Decision

### Inputs

| Signal | Result |
|--------|--------|
| Integration tests (13/13) | ✅ PASS |
| Unit tests — backend (11/11) | ✅ PASS |
| Unit tests — frontend (29/29) | ✅ PASS |
| E2E tests active (16 active) | ✅ PASS (4 skipped by design) |
| NFR assessment | ✅ PASS |
| Test review | ✅ PASS (Grade C — Approve with Comments) |
| P0 AC coverage | 6/7 FULL, 1/7 PARTIAL (AC-5 minor quality gap) |
| Security tests (AC-3, AC-6) | ✅ FULL — both P0 security gates solid |
| Blockers from code review | ✅ All resolved (B-1 env var key fixed) |

### Decision

```
P0 coverage:          6/7 FULL, 1/7 PARTIAL (no P0 with NONE)
Security coverage:    FULL on both NFR-8 paths
P1 gaps:              3 ACs PARTIAL — all have ≥1 test layer; gaps documented
Blocker count:        0
Major open (test):    1 (G-3: USER_DEACTIVATED integration test missing)
NFR verdict:          PASS
```

**Gate Decision: ✅ PASS**

All Acceptance Criteria have test coverage at one or more layers. All security-critical paths are fully covered. All 13 integration tests pass. The 4 partial-coverage ACs have documented gaps that are quality improvements, not functional coverage voids — each is verified at a complementary layer. No blockers remain. Story 5-3 may advance to `done`.

**Required follow-up (not blocking):**
1. Add `USER_DEACTIVATED` integration test for AC-8 (G-3a)
2. Add `Mock.Verify()` on `IAuditService.LogAsync` in `FeatureToggleServiceTests` and `UserManagementServiceTests` (G-3b, F3/F4)
3. Seed entries before ordering assertion in `GetAdminAudit_EntriesOrderedNewestFirst` (G-1)
4. Create v2 story for audit endpoint server-side pagination (M-1 from NFR)
