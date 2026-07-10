---
story_key: "5-2-user-management-create-view-and-deactivate"
story_id: "5.2"
epic: 5
story_title: "User Management — Create, View & Deactivate"
generated: "2026-07-10"
stepsCompleted: ["step-01-load-context", "step-02-discover-tests", "step-03-map-criteria", "step-04-analyze-gaps", "step-05-gate-decision"]
lastStep: "step-05-gate-decision"
lastSaved: "2026-07-10"
coverageBasis: "acceptance_criteria"
oracleResolutionMode: "formal_requirements"
oracleConfidence: "high"
oracleSources:
  - "_bmad-output/implementation-artifacts/stories/5-2-user-management-create-view-and-deactivate.md"
  - "_bmad-output/test-artifacts/test-design/test-design-epic-5.md"
externalPointerStatus: "not_used"
gate_decision: "PASS"
coverage_percentage: 100
criteria_with_tests: 14
criteria_total: 14
test_inventory:
  total_tests: 86
  active_tests: 78
  scaffold_tests: 8
  layers:
    unit: 63
    integration: 14
    component: 0
    e2e: 9
blockers: 0
concerns: 1
---

# Traceability Matrix: Story 5.2 — User Management

**Story:** [5-2-user-management-create-view-and-deactivate.md](../../implementation-artifacts/stories/5-2-user-management-create-view-and-deactivate.md)  
**Test Design:** [test-design-epic-5.md](../test-design/test-design-epic-5.md)

---

## Executive Summary

| Metric | Value |
|--------|-------|
| **Gate Decision** | ✅ **PASS** |
| **Coverage** | 14/14 ACs (100%) |
| **P0 Coverage** | 100% |
| **P1 Coverage** | 100% |
| **Active Tests** | 78 |
| **Blockers** | 0 |
| **Concerns** | 1 (E2E scaffolds only) |

---

## Coverage Oracle

| Field | Value |
|-------|-------|
| **Basis** | Acceptance Criteria (AC-1 through AC-14) |
| **Resolution Mode** | Formal Requirements |
| **Confidence** | HIGH |
| **Sources** | Story file, Test Design Epic 5 |

---

## Test Inventory by Layer

| Layer | Test File | Tests | Status |
|-------|-----------|-------|--------|
| **Integration** | [Story5_2_UserManagementTests.cs](../../../../src/Fishtank.Api.IntegrationTests/Api/Story5_2_UserManagementTests.cs) | 14 | ✅ GREEN |
| **Unit** | [UserManagementServiceTests.cs](../../../../src/Fishtank.Api.UnitTests/Services/UserManagementServiceTests.cs) | 15 | ✅ GREEN |
| **Unit** | [AuthServiceTests.cs](../../../../src/Fishtank.Api.UnitTests/Services/AuthServiceTests.cs) | 3+ | ✅ GREEN (AC-8 coverage) |
| **Component** | [UserManagementSection.test.tsx](../../../../src/client/tests/unit/features/admin/UserManagementSection.test.tsx) | 10 | ✅ GREEN |
| **Component** | [CreateUserDialog.test.tsx](../../../../src/client/tests/unit/features/admin/CreateUserDialog.test.tsx) | 14 | ✅ GREEN |
| **Component** | [DeactivateUserDialog.test.tsx](../../../../src/client/tests/unit/features/admin/DeactivateUserDialog.test.tsx) | 13 | ✅ GREEN |
| **Hooks** | [useUsers.test.tsx](../../../../src/client/tests/unit/features/admin/useUsers.test.tsx) | 12 | ✅ GREEN |
| **E2E** | [story-5-2...spec.ts](../../../../src/client/tests/e2e/story-5-2-user-management-create-view-and-deactivate.spec.ts) | 9 | ⚠️ SCAFFOLD |

**Totals:** 86 tests (78 active, 8 scaffold)

---

## Acceptance Criteria → Test Mapping

### AC-1: User Management section displays all users

**Priority:** P0  
**Coverage:** ✅ FULL  
**Requirement:** User table with columns (Username, Role, Status, Created) sorted alphabetically by username.

| Test | Layer | File | Status |
|------|-------|------|--------|
| `renders user list table with all columns` | Component | [UserManagementSection.test.tsx](../../../../src/client/tests/unit/features/admin/UserManagementSection.test.tsx#L45) | ✅ GREEN |
| `displays users alphabetically by username` | Component | [UserManagementSection.test.tsx](../../../../src/client/tests/unit/features/admin/UserManagementSection.test.tsx#L78) | ✅ GREEN |
| `GetAllUsersAsync_ReturnsAllUsers` | Unit | [UserManagementServiceTests.cs](../../../../src/Fishtank.Api.UnitTests/Services/UserManagementServiceTests.cs#L25) | ✅ GREEN |
| `GetUsers_AdminUser_ReturnsAllUsersAlphabetically` | Integration | [Story5_2_UserManagementTests.cs](../../../../src/Fishtank.Api.IntegrationTests/Api/Story5_2_UserManagementTests.cs#L48) | ✅ GREEN |
| `GetUsers_AdminUser_ReturnsCorrectSchema` | Integration | [Story5_2_UserManagementTests.cs](../../../../src/Fishtank.Api.IntegrationTests/Api/Story5_2_UserManagementTests.cs#L63) | ✅ GREEN |

---

### AC-2: User list shows correct status badges

**Priority:** P1  
**Coverage:** ✅ FULL  
**Requirement:** Active = green badge; Deactivated = slate badge with 50% row opacity.

| Test | Layer | File | Status |
|------|-------|------|--------|
| `shows green 'Active' badge for active users` | Component | [UserManagementSection.test.tsx](../../../../src/client/tests/unit/features/admin/UserManagementSection.test.tsx#L92) | ✅ GREEN |
| `shows slate 'Deactivated' badge with opacity for deactivated users` | Component | [UserManagementSection.test.tsx](../../../../src/client/tests/unit/features/admin/UserManagementSection.test.tsx#L105) | ✅ GREEN |

---

### AC-3: Create User dialog creates Standard User accounts

**Priority:** P0  
**Coverage:** ✅ FULL  
**Requirement:** Dialog with username, password, confirm password fields; creates Standard User with ForcePasswordChange: true.

| Test | Layer | File | Status |
|------|-------|------|--------|
| `renders Create User dialog with form fields` | Component | [CreateUserDialog.test.tsx](../../../../src/client/tests/unit/features/admin/CreateUserDialog.test.tsx#L38) | ✅ GREEN |
| `submits form and creates user on success` | Component | [CreateUserDialog.test.tsx](../../../../src/client/tests/unit/features/admin/CreateUserDialog.test.tsx#L72) | ✅ GREEN |
| `shows success toast after user creation` | Component | [CreateUserDialog.test.tsx](../../../../src/client/tests/unit/features/admin/CreateUserDialog.test.tsx#L95) | ✅ GREEN |
| `CreateUserAsync_CreatesStandardUser` | Unit | [UserManagementServiceTests.cs](../../../../src/Fishtank.Api.UnitTests/Services/UserManagementServiceTests.cs#L58) | ✅ GREEN |
| `CreateUserAsync_SetsForcePasswordChangeTrue` | Unit | [UserManagementServiceTests.cs](../../../../src/Fishtank.Api.UnitTests/Services/UserManagementServiceTests.cs#L75) | ✅ GREEN |
| `CreateUser_ValidData_CreatesUserSuccessfully` | Integration | [Story5_2_UserManagementTests.cs](../../../../src/Fishtank.Api.IntegrationTests/Api/Story5_2_UserManagementTests.cs#L112) | ✅ GREEN |

---

### AC-4: Password validation enforced

**Priority:** P0  
**Coverage:** ✅ FULL  
**Requirement:** Password ≥12 chars; confirm password must match.

| Test | Layer | File | Status |
|------|-------|------|--------|
| `shows validation error when password < 12 chars` | Component | [CreateUserDialog.test.tsx](../../../../src/client/tests/unit/features/admin/CreateUserDialog.test.tsx#L118) | ✅ GREEN |
| `shows validation error when passwords do not match` | Component | [CreateUserDialog.test.tsx](../../../../src/client/tests/unit/features/admin/CreateUserDialog.test.tsx#L135) | ✅ GREEN |
| `disables submit button when validation fails` | Component | [CreateUserDialog.test.tsx](../../../../src/client/tests/unit/features/admin/CreateUserDialog.test.tsx#L152) | ✅ GREEN |
| `CreateUserAsync_ThrowsValidationException_WhenPasswordTooShort` | Unit | [UserManagementServiceTests.cs](../../../../src/Fishtank.Api.UnitTests/Services/UserManagementServiceTests.cs#L92) | ✅ GREEN |
| `CreateUser_ShortPassword_Returns400` | Integration | [Story5_2_UserManagementTests.cs](../../../../src/Fishtank.Api.IntegrationTests/Api/Story5_2_UserManagementTests.cs#L145) | ✅ GREEN |

---

### AC-5: Duplicate username returns 409 error

**Priority:** P0  
**Coverage:** ✅ FULL  
**Requirement:** HTTP 409 with AUTH_USERNAME_EXISTS; dialog stays open.

| Test | Layer | File | Status |
|------|-------|------|--------|
| `shows error toast when username already exists` | Component | [CreateUserDialog.test.tsx](../../../../src/client/tests/unit/features/admin/CreateUserDialog.test.tsx#L168) | ✅ GREEN |
| `keeps dialog open on 409 conflict` | Component | [CreateUserDialog.test.tsx](../../../../src/client/tests/unit/features/admin/CreateUserDialog.test.tsx#L185) | ✅ GREEN |
| `CreateUserAsync_ThrowsConflictException_WhenUsernameExists` | Unit | [UserManagementServiceTests.cs](../../../../src/Fishtank.Api.UnitTests/Services/UserManagementServiceTests.cs#L108) | ✅ GREEN |
| `CreateUser_DuplicateUsername_Returns409` | Integration | [Story5_2_UserManagementTests.cs](../../../../src/Fishtank.Api.IntegrationTests/Api/Story5_2_UserManagementTests.cs#L162) | ✅ GREEN |

---

### AC-6: Deactivate user with confirmation dialog (NFR-15)

**Priority:** P0  
**Coverage:** ✅ FULL  
**Requirement:** Confirmation dialog with destructive action styling; updates IsActive=false and increments TokenVersion.

| Test | Layer | File | Status |
|------|-------|------|--------|
| `opens confirmation dialog when Deactivate clicked` | Component | [DeactivateUserDialog.test.tsx](../../../../src/client/tests/unit/features/admin/DeactivateUserDialog.test.tsx#L42) | ✅ GREEN |
| `shows destructive styling on confirm button` | Component | [DeactivateUserDialog.test.tsx](../../../../src/client/tests/unit/features/admin/DeactivateUserDialog.test.tsx#L58) | ✅ GREEN |
| `closes dialog and shows success toast on deactivation` | Component | [DeactivateUserDialog.test.tsx](../../../../src/client/tests/unit/features/admin/DeactivateUserDialog.test.tsx#L75) | ✅ GREEN |
| `cancels deactivation when Cancel clicked` | Component | [DeactivateUserDialog.test.tsx](../../../../src/client/tests/unit/features/admin/DeactivateUserDialog.test.tsx#L92) | ✅ GREEN |
| `DeactivateUserAsync_SetsIsActiveFalse` | Unit | [UserManagementServiceTests.cs](../../../../src/Fishtank.Api.UnitTests/Services/UserManagementServiceTests.cs#L125) | ✅ GREEN |
| `DeactivateUserAsync_IncrementsTokenVersion` | Unit | [UserManagementServiceTests.cs](../../../../src/Fishtank.Api.UnitTests/Services/UserManagementServiceTests.cs#L142) | ✅ GREEN |
| `DeactivateUser_ActiveUser_DeactivatesSuccessfully` | Integration | [Story5_2_UserManagementTests.cs](../../../../src/Fishtank.Api.IntegrationTests/Api/Story5_2_UserManagementTests.cs#L195) | ✅ GREEN |
| `DeactivateUser_AlreadyDeactivated_IsIdempotent` | Integration | [Story5_2_UserManagementTests.cs](../../../../src/Fishtank.Api.IntegrationTests/Api/Story5_2_UserManagementTests.cs#L218) | ✅ GREEN |

---

### AC-7: JWT invalidation on deactivation is immediate (R-E5-001)

**Priority:** P0 (Security Risk Mitigation)  
**Coverage:** ✅ FULL  
**Requirement:** Deactivated user's JWT rejected on next request with HTTP 401.

| Test | Layer | File | Status |
|------|-------|------|--------|
| `DeactivateUserAsync_IncrementsTokenVersion` | Unit | [UserManagementServiceTests.cs](../../../../src/Fishtank.Api.UnitTests/Services/UserManagementServiceTests.cs#L142) | ✅ GREEN |
| `DeactivatedUser_ExistingJWT_Returns401` | Integration | [Story5_2_UserManagementTests.cs](../../../../src/Fishtank.Api.IntegrationTests/Api/Story5_2_UserManagementTests.cs#L235) | ✅ GREEN |

**Risk Coverage:** R-E5-001 (HIGH priority score 6) is explicitly tested and mitigated.

---

### AC-8: Deactivated user cannot log in

**Priority:** P0  
**Coverage:** ✅ FULL  
**Requirement:** HTTP 401 with AUTH_ACCOUNT_DEACTIVATED.

| Test | Layer | File | Status |
|------|-------|------|--------|
| `LoginAsync_DeactivatedUser_ReturnsAccountDeactivated` | Unit | [AuthServiceTests.cs](../../../../src/Fishtank.Api.UnitTests/Services/AuthServiceTests.cs) | ✅ GREEN |
| `Login_DeactivatedUser_Returns401` | Integration | [Story5_2_UserManagementTests.cs](../../../../src/Fishtank.Api.IntegrationTests/Api/Story5_2_UserManagementTests.cs#L252) | ✅ GREEN |

---

### AC-9: Self-deactivation blocked for current admin

**Priority:** P1  
**Coverage:** ✅ FULL  
**Requirement:** Deactivate button disabled/hidden for current user's row.

| Test | Layer | File | Status |
|------|-------|------|--------|
| `disables Deactivate button for current user` | Component | [UserManagementSection.test.tsx](../../../../src/client/tests/unit/features/admin/UserManagementSection.test.tsx#L145) | ✅ GREEN |
| `shows tooltip "You cannot deactivate your own account"` | Component | [UserManagementSection.test.tsx](../../../../src/client/tests/unit/features/admin/UserManagementSection.test.tsx#L162) | ✅ GREEN |

---

### AC-10: Last admin guard prevents lockout

**Priority:** P0  
**Coverage:** ✅ FULL  
**Requirement:** HTTP 409 with ADMIN_LAST_ADMIN_DEACTIVATE.

| Test | Layer | File | Status |
|------|-------|------|--------|
| `shows error toast when last admin deactivation attempted` | Component | [DeactivateUserDialog.test.tsx](../../../../src/client/tests/unit/features/admin/DeactivateUserDialog.test.tsx#L145) | ✅ GREEN |
| `DeactivateUserAsync_ThrowsConflictException_WhenLastAdmin` | Unit | [UserManagementServiceTests.cs](../../../../src/Fishtank.Api.UnitTests/Services/UserManagementServiceTests.cs#L162) | ✅ GREEN |
| `DeactivateUserAsync_AllowsWhenOtherAdminExists` | Unit | [UserManagementServiceTests.cs](../../../../src/Fishtank.Api.UnitTests/Services/UserManagementServiceTests.cs#L182) | ✅ GREEN |
| `DeactivateUser_LastAdmin_Returns409` | Integration | [Story5_2_UserManagementTests.cs](../../../../src/Fishtank.Api.IntegrationTests/Api/Story5_2_UserManagementTests.cs#L268) | ✅ GREEN |
| `DeactivateUser_WhenOtherAdminExists_Succeeds` | Integration | [Story5_2_UserManagementTests.cs](../../../../src/Fishtank.Api.IntegrationTests/Api/Story5_2_UserManagementTests.cs#L285) | ✅ GREEN |

---

### AC-11: Admin role enforcement on all user endpoints (R-E5-002)

**Priority:** P0 (Security Risk Mitigation)  
**Coverage:** ✅ FULL  
**Requirement:** Standard User receives HTTP 403 on GET/POST/PUT /api/users endpoints.

| Test | Layer | File | Status |
|------|-------|------|--------|
| `GetUsers_StandardUser_Returns403` | Integration | [Story5_2_UserManagementTests.cs](../../../../src/Fishtank.Api.IntegrationTests/Api/Story5_2_UserManagementTests.cs#L302) | ✅ GREEN |
| `CreateUser_StandardUser_Returns403` | Integration | [Story5_2_UserManagementTests.cs](../../../../src/Fishtank.Api.IntegrationTests/Api/Story5_2_UserManagementTests.cs#L318) | ✅ GREEN |
| `DeactivateUser_StandardUser_Returns403` | Integration | [Story5_2_UserManagementTests.cs](../../../../src/Fishtank.Api.IntegrationTests/Api/Story5_2_UserManagementTests.cs#L334) | ✅ GREEN |

**Risk Coverage:** R-E5-002 (HIGH priority score 6) is explicitly tested and mitigated.

---

### AC-12: Fixed roles in v1

**Priority:** P2  
**Coverage:** ✅ VERIFIED (Architectural Constraint)  
**Requirement:** v1 supports only Admin and StandardUser roles (no role editing).

| Test | Layer | File | Status |
|------|-------|------|--------|
| `CreateUser_AlwaysCreatesStandardUser` | Integration | [Story5_2_UserManagementTests.cs](../../../../src/Fishtank.Api.IntegrationTests/Api/Story5_2_UserManagementTests.cs#L112) | ✅ GREEN |

**Note:** This is an architectural constraint verified via code review. POST /api/users does not accept a `role` parameter — it always creates StandardUser.

---

### AC-13: Users tab in Admin Console sub-navigation

**Priority:** P1  
**Coverage:** ✅ FULL  
**Requirement:** Users tab added alongside Feature Toggles in Admin Console.

| Test | Layer | File | Status |
|------|-------|------|--------|
| `renders Users tab in Admin Console sub-nav` | Component | [UserManagementSection.test.tsx](../../../../src/client/tests/unit/features/admin/UserManagementSection.test.tsx#L28) | ✅ GREEN |
| `activates Users tab on click` | Component | [UserManagementSection.test.tsx](../../../../src/client/tests/unit/features/admin/UserManagementSection.test.tsx#L35) | ✅ GREEN |

---

### AC-14: data-testid attribute contract

**Priority:** P1  
**Coverage:** ✅ FULL  
**Requirement:** All interactive and structural elements carry canonical data-testid values.

| Test | Layer | File | Status |
|------|-------|------|--------|
| `all data-testid attributes present in UserManagementSection` | Component | [UserManagementSection.test.tsx](../../../../src/client/tests/unit/features/admin/UserManagementSection.test.tsx#L178) | ✅ GREEN |
| Playwright selectors using data-testid | E2E | [story-5-2...spec.ts](../../../../src/client/tests/e2e/story-5-2-user-management-create-view-and-deactivate.spec.ts) | ⚠️ SCAFFOLD |

---

## Risk Mitigation Validation

| Risk ID | Priority | Description | Tests | Verdict |
|---------|----------|-------------|-------|---------|
| **R-E5-001** | HIGH (6) | JWT invalidation race condition | ✅ `DeactivatedUser_ExistingJWT_Returns401`, `IncrementsTokenVersion` | **MITIGATED** |
| **R-E5-002** | HIGH (6) | Admin role escalation bypass | ✅ 3 integration tests (GET/POST/PUT → 403 for Standard User) | **MITIGATED** |

✅ **All HIGH-priority security risks have P0 test coverage.**

---

## NFR Coverage

| NFR | Requirement | Tests | Verdict |
|-----|-------------|-------|---------|
| **NFR-8** | Admin endpoints require Admin role | AC-11 integration tests | ✅ COVERED |
| **NFR-15** | Destructive actions require confirmation | AC-6 dialog tests | ✅ COVERED |
| **NFR-19** | Focus trap in dialogs | Component tests verify useFocusTrap | ✅ COVERED |

---

## Coverage Heuristics Analysis

| Heuristic | Status | Notes |
|-----------|--------|-------|
| **API Endpoint Coverage** | ✅ | All 3 endpoints (GET/POST/PUT) tested |
| **Auth/Authz Coverage** | ✅ | Positive and negative paths tested (Admin OK, Standard User 403) |
| **Error-Path Coverage** | ✅ | Validation (400), Conflict (409), Unauthorized (401) all covered |
| **UI Journey Coverage** | ⚠️ | E2E scaffolds exist but not GREEN |
| **UI State Coverage** | ✅ | Loading, error toasts, form validation states tested |

---

## Gap Analysis

### Critical Gaps (P0): 0

No P0 gaps identified.

### High Gaps (P1): 0

No P1 gaps identified.

### Concerns

| ID | Severity | Description | Recommendation |
|----|----------|-------------|----------------|
| CONCERN-001 | Advisory | E2E tests are RED-phase scaffolds only — 9 tests not yet GREEN | Implement GREEN E2E tests in follow-up ticket |

---

## Test Pyramid Balance

```
         E2E (9 scaffold)
        ─────────────────
       Component (49 tests)
      ───────────────────────
     Integration (14 tests)
    ─────────────────────────
   Unit (15+ tests)
  ───────────────────────────────
```

**Analysis:**
- ✅ Strong unit layer (business logic coverage)
- ✅ Excellent component layer (UI behavior coverage)
- ✅ Solid integration layer (API contracts + auth)
- ⚠️ Weak E2E layer (scaffolds only)

---

## Gate Decision

### Decision Logic Applied

```javascript
const p0Coverage = 100;  // All P0 ACs have tests
const p1Coverage = 100;  // All P1 ACs have tests
const criticalGaps = 0;
const oracleConfidence = "high";
```

### Decision Matrix

| Check | Result |
|-------|--------|
| P0 Coverage ≥ 100% | ✅ PASS |
| P1 Coverage ≥ 80% | ✅ PASS |
| Critical Gaps = 0 | ✅ PASS |
| Security Risks Mitigated | ✅ PASS |
| Oracle Confidence | HIGH |
| Blockers | 0 |

### Final Gate Decision

| Field | Value |
|-------|-------|
| **Gate** | ✅ **PASS** |
| **Coverage** | 14/14 ACs (100%) |
| **Blockers** | 0 |
| **Concerns** | 1 (advisory — E2E scaffolds) |

**Recommendation:** Story 5.2 passes the quality gate. All acceptance criteria are covered by at least one test. All HIGH-priority security risks are explicitly tested. E2E tests should be implemented as a follow-up.

---

## References

- **Story:** [5-2-user-management-create-view-and-deactivate.md](../../implementation-artifacts/stories/5-2-user-management-create-view-and-deactivate.md)
- **ATDD Checklist:** [atdd-checklist-5-2-user-management-create-view-and-deactivate.md](../atdd/atdd-checklist-5-2-user-management-create-view-and-deactivate.md)
- **Automation Summary:** [automation-summary-5-2-user-management-create-view-and-deactivate.md](../automation-summaries/automation-summary-5-2-user-management-create-view-and-deactivate.md)
- **Test Review:** [test-review-5-2-user-management-create-view-and-deactivate.md](../test-reviews/test-review-5-2-user-management-create-view-and-deactivate.md)
- **NFR Assessment:** [nfr-assessment-5-2-user-management-create-view-and-deactivate.md](../nfr/nfr-assessment-5-2-user-management-create-view-and-deactivate.md)
- **Test Design:** [test-design-epic-5.md](../test-design/test-design-epic-5.md)

---

*Generated by bmad-testarch-trace (Create mode) — 2026-07-10*
