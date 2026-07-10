---
story_id: "5.3"
story_key: "5-3-health-dashboard-audit-log-and-auto-registration-toggle"
test_phase: "RED"
atdd_complete: false
date_generated: "2026-07-10"
generated_by: "bmad-testarch-atdd"
---

# ATDD Checklist: Story 5.3 — Health Dashboard, Audit Log & Auto-Registration Toggle

## Phase Gate Status

| Phase | Status | Date | Notes |
|-------|--------|------|-------|
| **RED Phase** | ✅ COMPLETE | 2026-07-10 | Acceptance test scaffolds created; all tests compile but FAIL |
| **Implementation** | ⏳ PENDING | — | Story 5.3 implementation in progress |
| **GREEN Phase** | ⏳ PENDING | — | Tests will PASS once implementation complete |
| **Test Review** | ⏳ PENDING | — | Post-implementation review of test coverage |

---

## Scaffold Files Created

### 1. E2E Playwright Test Spec (RED Phase)

**File:** `src/client/tests/e2e/story-5-3-health-dashboard-audit-log-and-auto-registration-toggle.spec.ts`

**Status:** ✅ Created  
**Lines of Code:** ~550  
**Test Cases:** 19  
**Compile Status:** ✅ TypeScript valid  
**Runtime Status:** ❌ All tests FAIL (features not implemented)

**Coverage:**
- Health Dashboard metrics display (AC-1)
- Health Dashboard refresh functionality (AC-1)
- Audit Log table and entries display (AC-4)
- Audit Log pagination (AC-4)
- Auto-Registration toggle visibility (AC-9)
- Login page conditional registration link (AC-11)
- Register page form and validation (AC-11)
- Admin Console placeholder tabs replaced (AC-12)

### 2. Backend Integration Test (RED Phase)

**File:** `src/Fishtank.Api.IntegrationTests/Api/Story5_3_AdminConsoleTests.cs`

**Status:** ✅ Created  
**Lines of Code:** ~450  
**Test Cases:** 14  
**Compile Status:** ✅ C# 13 valid  
**Runtime Status:** ❌ All tests FAIL with `Assert.Fail()` (endpoints not implemented)

**Coverage:**
- GET /api/admin/health endpoint (AC-2)
- GET /api/admin/health authorization (AC-3, R-E5-002)
- GET /api/admin/audit endpoint (AC-5)
- GET /api/admin/audit pagination (AC-5)
- GET /api/admin/audit authorization (AC-6, R-E5-002)
- Audit entry creation for actions (AC-8)
- POST /api/auth/register endpoint (AC-10)
- POST /api/auth/register toggle gate (AC-10)
- POST /api/auth/register validation (AC-10)
- GET /api/auth/registration-status public endpoint (AC-11)

### 3. ATDD Checklist Artifact

**File:** `_bmad-output/test-artifacts/atdd/atdd-checklist-5-3-health-dashboard-audit-log-and-auto-registration-toggle.md`

**Status:** ✅ Created (this file)  
**Purpose:** Track ATDD workflow progress and provide test inventory

---

## Test Inventory by Acceptance Criteria

### AC-1: Health Dashboard displays operational metrics (FR-32)

**Priority:** P0

| Test | Level | File | Status |
|------|-------|------|--------|
| Health tab shows Health Dashboard section with all metrics | E2E | story-5-3...spec.ts | ❌ RED |
| Health Dashboard displays active services count | E2E | story-5-3...spec.ts | ❌ RED |
| Health Dashboard displays database status with visual indicator | E2E | story-5-3...spec.ts | ❌ RED |
| Health Dashboard displays container uptime in human-readable format | E2E | story-5-3...spec.ts | ❌ RED |
| Health refresh button refetches data on click | E2E | story-5-3...spec.ts | ❌ RED |

**Total:** 5 tests

### AC-2: GET /api/admin/health returns structured health data (FR-32)

**Priority:** P0

| Test | Level | File | Status |
|------|-------|------|--------|
| GET /api/admin/health with Admin JWT returns 200 with health metrics | Integration | Story5_3_AdminConsoleTests.cs | ❌ RED |

**Total:** 1 test

### AC-3: GET /api/admin/health requires Admin role (NFR-8, R-E5-002)

**Priority:** P0 (security critical)

| Test | Level | File | Status |
|------|-------|------|--------|
| GET /api/admin/health requires Admin role — Standard User returns 403 | Integration | Story5_3_AdminConsoleTests.cs | ❌ RED |

**Total:** 1 test

### AC-4: Audit Log section displays entries (FR-33)

**Priority:** P0

| Test | Level | File | Status |
|------|-------|------|--------|
| Audit Log tab shows Audit Log section with table | E2E | story-5-3...spec.ts | ❌ RED |
| Audit Log table has Action, Actor, Resource, Timestamp columns | E2E | story-5-3...spec.ts | ❌ RED |
| Audit Log displays entries newest-first when audit data exists | E2E | story-5-3...spec.ts | ❌ RED |
| Audit Log shows 'Load more' button for pagination | E2E | story-5-3...spec.ts | ❌ RED |
| Audit Log shows empty state when no entries exist | E2E | story-5-3...spec.ts | ❌ RED |

**Total:** 5 tests

### AC-5: GET /api/admin/audit returns paginated audit entries (FR-33)

**Priority:** P0

| Test | Level | File | Status |
|------|-------|------|--------|
| GET /api/admin/audit with Admin JWT returns 200 with audit entries | Integration | Story5_3_AdminConsoleTests.cs | ❌ RED |
| GET /api/admin/audit supports pagination via ?page query parameter | Integration | Story5_3_AdminConsoleTests.cs | ❌ RED |
| GET /api/admin/audit returns entries ordered by CreatedAt DESC | Integration | Story5_3_AdminConsoleTests.cs | ❌ RED |

**Total:** 3 tests

### AC-6: GET /api/admin/audit requires Admin role (NFR-8, R-E5-002)

**Priority:** P0 (security critical)

| Test | Level | File | Status |
|------|-------|------|--------|
| GET /api/admin/audit requires Admin role — Standard User returns 403 | Integration | Story5_3_AdminConsoleTests.cs | ❌ RED |

**Total:** 1 test

### AC-8: Audit entries created for user-initiated actions (FR-33)

**Priority:** P1

| Test | Level | File | Status |
|------|-------|------|--------|
| Audit entry created when admin changes a feature toggle | Integration | Story5_3_AdminConsoleTests.cs | ❌ RED |
| Audit entry created when admin creates a user | Integration | Story5_3_AdminConsoleTests.cs | ❌ RED |

**Total:** 2 tests

### AC-9: Auto-Registration toggle in Feature Toggles section (FR-29)

**Priority:** P1

| Test | Level | File | Status |
|------|-------|------|--------|
| Auto-Registration toggle entry appears in Feature Toggles list | E2E | story-5-3...spec.ts | ❌ RED |
| Auto-Registration toggle is disabled by default | E2E | story-5-3...spec.ts | ❌ RED |
| Auto-Registration toggle shows env-var-locked indicator (skipped) | E2E | story-5-3...spec.ts | ⏭️ SKIP |

**Total:** 2 active tests + 1 skipped (requires container restart with env var)

### AC-10: Self-registration endpoint respects toggle state (FR-29)

**Priority:** P0

| Test | Level | File | Status |
|------|-------|------|--------|
| POST /api/auth/register returns 403 when auto-registration is OFF | Integration | Story5_3_AdminConsoleTests.cs | ❌ RED |
| POST /api/auth/register creates Standard User when ON | Integration | Story5_3_AdminConsoleTests.cs | ❌ RED |
| POST /api/auth/register returns 409 when username exists | Integration | Story5_3_AdminConsoleTests.cs | ❌ RED |
| POST /api/auth/register returns 400 when password < 12 chars | Integration | Story5_3_AdminConsoleTests.cs | ❌ RED |

**Total:** 4 tests

### AC-11: Login page shows conditional registration link (FR-29)

**Priority:** P1

| Test | Level | File | Status |
|------|-------|------|--------|
| Login page does NOT show 'Create account' link when OFF | E2E | story-5-3...spec.ts | ❌ RED |
| Login page shows 'Create account' link when ON (skipped) | E2E | story-5-3...spec.ts | ⏭️ SKIP |
| Create account link navigates to /register (skipped) | E2E | story-5-3...spec.ts | ⏭️ SKIP |
| Register page renders with form fields (skipped) | E2E | story-5-3...spec.ts | ⏭️ SKIP |
| Register page shows 'not available' when OFF | E2E | story-5-3...spec.ts | ❌ RED |
| GET /api/auth/registration-status public endpoint | Integration | Story5_3_AdminConsoleTests.cs | ❌ RED |

**Total:** 3 active tests + 3 skipped (require toggle to be ON)

### AC-12: Admin Console placeholder tabs replaced (AC from Stories 5-1 and 5-2)

**Priority:** P0

| Test | Level | File | Status |
|------|-------|------|--------|
| Health tab no longer shows placeholder content | E2E | story-5-3...spec.ts | ❌ RED |
| Audit Log tab no longer shows placeholder content | E2E | story-5-3...spec.ts | ❌ RED |

**Total:** 2 tests

---

## Test Summary

### Overall Statistics

| Metric | Count |
|--------|-------|
| **Total Test Cases** | 33 |
| **E2E Tests** | 19 |
| **Integration Tests** | 14 |
| **Active Tests** | 29 |
| **Skipped Tests** | 4 |
| **P0 Priority** | 18 |
| **P1 Priority** | 11 |
| **Security Critical (R-E5-002)** | 2 |

### Test Distribution by Priority

| Priority | Count | Effort (est.) | Risk Coverage |
|----------|-------|---------------|---------------|
| P0 (Critical) | 18 | ~8–12 hours | High-risk security (R-E5-002), core journey |
| P1 (High) | 11 | ~6–8 hours | Medium-risk features, important workflows |
| P2/P3 (Low) | 0 | — | None in this story |

### Test Status Breakdown

| Status | Count | Percentage |
|--------|-------|------------|
| ❌ RED (failing) | 29 | 88% |
| ⏭️ SKIP (deferred) | 4 | 12% |
| ✅ GREEN (passing) | 0 | 0% (expected — implementation not started) |

---

## data-testid Contract Table

**Purpose:** Canonical `data-testid` attribute values that MUST be present after Story 5.3 implementation.

### Health Dashboard Section

| Element | `data-testid` | Required | Notes |
|---------|---------------|----------|-------|
| Health tab in Admin Console sub-nav | `tab-health` | ✅ | Already exists from Story 5-1 |
| Health Dashboard section container | `section-health` | ✅ | Replaces placeholder |
| Active services metric | `health-active-services` | ✅ | Numeric display |
| Total requests metric | `health-total-requests` | ✅ | Numeric display |
| Database status metric | `health-db-status` | ✅ | Status pill (green/red) |
| Uptime metric | `health-uptime` | ✅ | Human-readable duration |
| Health refresh button | `btn-health-refresh` | ✅ | Manual refresh icon |

### Audit Log Section

| Element | `data-testid` | Required | Notes |
|---------|---------------|----------|-------|
| Audit Log tab in Admin Console sub-nav | `tab-audit-log` | ✅ | Already exists from Story 5-1 |
| Audit Log section container | `section-audit-log` | ✅ | Replaces placeholder |
| Audit Log table | `table-audit-log` | ✅ | Table with headers |
| Audit Log row (dynamic) | `audit-row-{id}` | ✅ | `{id}` = AuditLog.Id GUID |
| Audit Log load more button | `btn-audit-load-more` | ✅ | Pagination control |

### Auto-Registration Toggle

| Element | `data-testid` | Required | Notes |
|---------|---------------|----------|-------|
| Auto-registration toggle entry row | `toggle-row-auto_registration` | ✅ | In Feature Toggles list |
| Auto-registration toggle switch | `toggle-switch-auto_registration` | ✅ | Interactive switch control |

### Register Page (new)

| Element | `data-testid` | Required | Notes |
|---------|---------------|----------|-------|
| Register page container | `page-register` | ✅ | New route `/register` |
| Register username input | `input-register-username` | ✅ | Text input |
| Register password input | `input-register-password` | ✅ | Password input |
| Register confirm password input | `input-register-confirm-password` | ✅ | Password input |
| Register submit button | `btn-register-submit` | ✅ | Primary action button |

### Login Page (updated)

| Element | `data-testid` | Required | Notes |
|---------|---------------|----------|-------|
| Login page register link | `link-login-register` | ✅ | Conditional — only when auto-registration ON |

**Total testids:** 18 (7 Health, 5 Audit Log, 2 Toggle, 5 Register, 1 Login)

---

## Risk Coverage Verification

### R-E5-002: Admin Role Escalation (Score 6, HIGH)

**Mitigation:** Backend enforces role check on all admin endpoints

**Tests Covering This Risk:**

| Test | Level | Status |
|------|-------|--------|
| GET /api/admin/health requires Admin role — Standard User returns 403 | Integration | ❌ RED |
| GET /api/admin/audit requires Admin role — Standard User returns 403 | Integration | ❌ RED |

**Coverage:** ✅ COMPLETE — 2 critical security tests for this risk

---

## Next Steps (Post-RED Phase)

### For Developers (Implementation Phase)

1. **Backend Implementation:**
   - Create `AuditLog.cs` entity
   - Create EF Core migration for `AuditLog` table + index + `auto_registration` toggle seed
   - Implement `AuditService.cs`
   - Add `GET /api/admin/health` endpoint in `AdminEndpoints.cs`
   - Add `GET /api/admin/audit` endpoint in `AdminEndpoints.cs`
   - Add `POST /api/auth/register` endpoint in `AuthEndpoints.cs`
   - Add `GET /api/auth/registration-status` public endpoint in `AuthEndpoints.cs`
   - Retroactively add `AuditService.LogAsync()` calls to `FeatureToggleService` and `UserManagementService`
   - Create `HealthDto`, `AuditEntryDto`, `RegistrationStatusDto` models

2. **Frontend Implementation:**
   - Create `HealthDashboardSection.tsx` component
   - Create `AuditLogSection.tsx` component
   - Create `useHealth.ts` React Query hook (polling, 30s interval)
   - Create `useAuditLog.ts` React Query hook (pagination)
   - Create `useRegistrationStatus.ts` React Query hook (public, no auth)
   - Update `AdminConsolePage.tsx` — replace Health and Audit Log placeholders
   - Create `RegisterPage.tsx` with form + validation
   - Update `LoginPage.tsx` — add conditional "Create account" link
   - Add `/register` route to `router.tsx`

3. **Enable Tests:**
   - Uncomment all `Assert.Fail()` assertions in `Story5_3_AdminConsoleTests.cs`
   - Uncomment all commented assertions in E2E spec
   - Remove `test.skip()` calls for tests that can now run

### For QA (GREEN Phase Validation)

1. **Run Test Suites:**
   ```bash
   # Backend integration tests
   cd src/Fishtank.Api.IntegrationTests
   dotnet test --filter "DisplayName~Story5_3"

   # E2E Playwright tests
   cd src/client
   npm run test:e2e -- story-5-3
   ```

2. **Expected Results:**
   - All 29 active tests PASS
   - 4 skipped tests remain skipped (require env var or toggle ON state)
   - No test failures
   - No TypeScript or C# compilation errors

3. **Manual Validation:**
   - Verify all `data-testid` attributes present in UI
   - Verify Health Dashboard auto-refreshes every 30 seconds
   - Verify Audit Log pagination works with >20 entries
   - Verify auto-registration toggle env var override (requires container restart)
   - Verify Standard User cannot access `/admin/health` or `/admin/audit` (403)

### For Test Architect (Review Phase)

1. **Coverage Review:**
   - Verify all ACs have test coverage
   - Verify all data-testid values are present
   - Verify security tests (R-E5-002) are passing
   - Verify audit entry creation tests are passing

2. **Test Quality:**
   - Review test assertions for completeness
   - Check for flaky tests (timing issues, race conditions)
   - Validate test isolation (no inter-test dependencies)

3. **Documentation:**
   - Update this checklist with GREEN phase results
   - Mark all tests as ✅ GREEN
   - Note any deferred tests or known issues
   - Update test-design-epic-5.md with actual test results

---

## Notes

### Test Skips and Deferrals

| Test | Reason | Resolution |
|------|--------|------------|
| Auto-registration env-var-locked indicator test | Requires container restart with `FISHTANK_AUTO_REGISTRATION=true` env var | Manual testing or dedicated CI job with env var |
| Login page shows 'Create account' link when ON | Requires auto-registration toggle to be ON | Scenario-based test after toggle is enabled |
| Create account link navigates to /register | Requires auto-registration toggle to be ON | Scenario-based test after toggle is enabled |
| Register page renders with form fields | Requires auto-registration toggle to be ON | Scenario-based test after toggle is enabled |

### Known Limitations

- **Audit log volume testing:** No tests for large audit log volumes (R-E5-004). Performance testing deferred to manual/load testing.
- **Multi-session toggle propagation:** No E2E test for SignalR toggle broadcast to multiple sessions (R-E5-003). Integration test validates SignalR event; full E2E requires multiple browser instances.
- **Log file rotation:** No tests for daily log file rollover (Story 5.4 scope).

### Test Maintenance Notes

- **E2E test stability:** Health Dashboard auto-refresh tests may be flaky due to polling timing. Use `waitForSelector` with generous timeout.
- **Integration test isolation:** Ensure audit log tests do not interfere with each other. Use unique usernames/resource IDs.
- **Test data cleanup:** Reset database between test runs to ensure consistent empty/populated states.

---

## References

- **Story File:** `_bmad-output/implementation-artifacts/stories/5-3-health-dashboard-audit-log-and-auto-registration-toggle.md`
- **Test Design:** `_bmad-output/test-artifacts/test-design/test-design-epic-5.md`
- **Project Context:** `_bmad-output/project-context.md`
- **Example E2E Spec:** `src/client/tests/e2e/story-5-2-user-management-create-view-and-deactivate.spec.ts`
- **Example Integration Test:** `src/Fishtank.Api.IntegrationTests/Api/Story5_2_UserManagementTests.cs`

---

**Generated:** 2026-07-10  
**ATDD Phase:** RED (Scaffolds Created)  
**Story Status:** ready-for-dev  
**Next Milestone:** Implementation → GREEN Phase
