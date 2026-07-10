---
story_id: "5.2"
story_key: "5-2-user-management-create-view-and-deactivate"
epic: 5
story_title: "User Management — Create, View & Deactivate"
test_phase: "RED (ATDD scaffolds created)"
date_created: "2026-07-09"
created_by: "Murat (Master Test Architect)"
test_design_ref: "_bmad-output/test-artifacts/test-design/test-design-epic-5.md"
---

# ATDD Checklist: Story 5.2 — User Management

## Story Summary

**As an** admin,
**I want** to view all user accounts, create new Standard User accounts, and deactivate existing users with immediate JWT invalidation,
**So that** I can control who has access to the Fishtank instance.

**Status:** RED-phase test scaffolds complete ✅

---

## Test Artifacts Created

### 1. E2E Test Scaffold (Playwright)

**File:** `src/client/tests/e2e/story-5-2-user-management-create-view-and-deactivate.spec.ts`

**Test Suites:**
- ✅ P0: Users tab in Admin Console (AC-13)
- ✅ P0: User list displays users with status badges (AC-1, AC-2)
- ✅ P0: Create User dialog and validation (AC-3, AC-4)
- ✅ P0: Deactivate user with JWT invalidation (AC-6, AC-7)
- ✅ P1: Self-deactivation guard (AC-9)
- ✅ P1: data-testid attributes (AC-14)

**Total E2E Tests:** 13 scenarios
- P0 scenarios: 9
- P1 scenarios: 4

**Current State:** 🔴 RED (all tests failing — implementation does not exist yet)

---

### 2. Integration Test Scaffold (xUnit + FluentAssertions)

**File:** `src/Fishtank.Api.IntegrationTests/Api/Story5_2_UserManagementTests.cs`

**Test Suites:**
- ✅ AC-11: Backend user endpoints require Admin role (R-E5-002) — 3 tests
- ✅ AC-1: GET /api/users returns all users — 2 tests
- ✅ AC-3: POST /api/users creates Standard User — 1 test
- ✅ AC-4: Password validation (≥12 chars) — 1 test
- ✅ AC-5: Duplicate username returns 409 — 1 test
- ✅ AC-6: PUT /api/users/{id}/deactivate — 2 tests (deactivate + idempotent)
- ✅ AC-7: JWT invalidation on deactivation (R-E5-001) — 1 test
- ✅ AC-8: Deactivated user cannot log in — 1 test
- ✅ AC-10: Last admin guard — 2 tests (prevent + allow)

**Total Integration Tests:** 14 scenarios
- P0 scenarios: 10
- P1 scenarios: 4

**Current State:** 🔴 RED (all tests failing — API endpoints do not exist yet)

---

## Acceptance Criteria Coverage

| AC | Description | E2E | Integration | Status |
|----|-------------|-----|-------------|--------|
| **AC-1** | User table displays all users (username, role, status, created date, alphabetical) | ✅ | ✅ | 🔴 RED |
| **AC-2** | Status badges (green Active / slate Deactivated with opacity) | ✅ | ➖ | 🔴 RED |
| **AC-3** | Create User dialog and form submission | ✅ | ✅ | 🔴 RED |
| **AC-4** | Password validation (≥12 chars, confirm match) | ✅ | ✅ | 🔴 RED |
| **AC-5** | Duplicate username → 409 Conflict | ✅ | ✅ | 🔴 RED |
| **AC-6** | Deactivate with confirmation dialog (NFR-15) | ✅ | ✅ | 🔴 RED |
| **AC-7** | JWT invalidation on deactivation → 401 (R-E5-001) | ✅ | ✅ | 🔴 RED |
| **AC-8** | Deactivated user cannot log in → 401 | ➖ | ✅ | 🔴 RED |
| **AC-9** | Self-deactivation blocked in UI | ✅ | ➖ | 🔴 RED |
| **AC-10** | Last admin guard → 409 | ➖ | ✅ | 🔴 RED |
| **AC-11** | Backend enforces Admin role → 403 for Standard User (R-E5-002) | ➖ | ✅ | 🔴 RED |
| **AC-12** | v1 roles are fixed | ➖ | ➖ | ℹ️ Architectural constraint (no test) |
| **AC-13** | Users tab added to Admin Console sub-nav | ✅ | ➖ | 🔴 RED |
| **AC-14** | data-testid attributes present | ✅ | ➖ | 🔴 RED |

**Coverage Summary:**
- **14 ACs total**
- **13 ACs with test coverage** (93%)
- **AC-12 (v1 roles fixed)** is an architectural constraint verified via code review, not automated tests

---

## Risk Coverage

| Risk ID | Category | Description | Priority | Tests |
|---------|----------|-------------|----------|-------|
| **R-E5-001** | SEC | JWT invalidation race condition — user deactivation increments TokenVersion but existing request in-flight with old token completes | **HIGH (6)** | ✅ Integration: AC-7 test validates immediate JWT rejection |
| **R-E5-002** | SEC | Admin role escalation — Standard User crafts request to access `/admin` endpoints directly bypassing frontend route guard | **HIGH (6)** | ✅ Integration: AC-11 tests (3 tests) validate backend role enforcement |

**All HIGH-priority risks (≥6) are covered with P0 tests.**

---

## Test Execution Strategy

### TDD Red-Green-Refactor Cycle

**Current Phase:** 🔴 **RED**

**What exists now:**
- ✅ Test scaffolds written and committed
- ✅ Tests compile successfully
- ✅ Tests fail with expected errors (404s, missing components)

**Next Phase:** 🟢 **GREEN**

**Implementation checklist** (from story file):

**Backend Implementation:**
1. [ ] Create `src/Fishtank.Api/Endpoints/UsersEndpoints.cs`
   - [ ] `GET /api/users` — returns all users alphabetically
   - [ ] `POST /api/users` — creates Standard User with password validation
   - [ ] `PUT /api/users/{id}/deactivate` — deactivates user, increments TokenVersion
2. [ ] Create `src/Fishtank.Api/Services/UserManagementService.cs`
   - [ ] User CRUD logic
   - [ ] Last admin guard (AC-10)
   - [ ] TokenVersion increment on deactivation (AC-7)
3. [ ] Create `src/Fishtank.Api/Models/UserDto.cs` — User response DTO
4. [ ] Create `src/Fishtank.Api/Models/CreateUserRequest.cs` — Create user request DTO
5. [ ] Update `src/Fishtank.Api/Endpoints/AuthEndpoints.cs`
   - [ ] Add `IsActive` check in `LoginAsync` (AC-8)
6. [ ] Update `src/Fishtank.Api/Program.cs`
   - [ ] Register `UsersEndpoints` group

**Frontend Implementation:**
1. [ ] Create `src/client/src/features/admin/components/UserManagementSection.tsx`
   - [ ] User list table with all columns (AC-1)
   - [ ] Status badges (AC-2)
   - [ ] Self-deactivation guard (AC-9)
2. [ ] Create `src/client/src/features/admin/components/CreateUserDialog.tsx`
   - [ ] Form with username, password, confirm password (AC-3)
   - [ ] Password validation (AC-4)
   - [ ] Error handling for duplicates (AC-5)
3. [ ] Create `src/client/src/features/admin/components/DeactivateUserDialog.tsx`
   - [ ] Confirmation dialog (NFR-15, AC-6)
   - [ ] Destructive action styling
4. [ ] Create `src/client/src/features/admin/hooks/useUsers.ts`
   - [ ] `useUsers()` query hook
   - [ ] `useCreateUser()` mutation hook
   - [ ] `useDeactivateUser()` mutation hook
5. [ ] Update `src/client/src/features/admin/pages/AdminConsolePage.tsx`
   - [ ] Add Users tab to sub-navigation (AC-13)

**All data-testid values defined in story file AC-14 must be implemented exactly as specified.**

---

## Expected Test Results After Implementation

### Integration Tests (Backend)

**Expected:** 14/14 passing (100%)

**Key assertions that will pass:**
- Standard User → 403 on all `/api/users` endpoints (R-E5-002)
- Admin → 200 on GET /api/users with correct schema
- POST /api/users creates Standard User with `ForcePasswordChange: true`
- Password <12 chars → 400 validation error
- Duplicate username → 409 Conflict with `AUTH_USERNAME_EXISTS`
- PUT /api/users/{id}/deactivate → `IsActive: false`, `TokenVersion++`
- Deactivated user's JWT → 401 on next request (R-E5-001)
- Deactivated user login → 401 with `AUTH_ACCOUNT_DEACTIVATED`
- Last admin deactivation → 409 with `ADMIN_LAST_ADMIN_DEACTIVATE`
- Idempotent deactivation succeeds without incrementing `TokenVersion`

### E2E Tests (Frontend)

**Expected:** 13/13 passing (100%)

**Note:** Some E2E tests are currently marked as `.skip()` because they depend on:
- User creation flow being implemented (AC-3)
- Deactivation flow being implemented (AC-6)

**These skipped tests will be unskipped once the respective flows are GREEN:**
- `test("Deactivated user shows slate 'Deactivated' badge...")` — requires deactivated user
- `test("Users are listed alphabetically...")` — requires multiple users
- `test("Deactivate button opens confirmation dialog...")` — requires non-admin user
- `test("Confirming deactivation changes user status...")` — requires deactivation API
- `test("Deactivated user's existing JWT is immediately invalidated...")` — complex integration

**Once implementation is complete, all skipped tests will be unskipped and validated.**

---

## Test Pattern Notes

### Backend Test Patterns (from IntegrationTestBase)

**Test base class:** `IntegrationTestBase`
- Per-test database reset via `ResetDatabaseAsync()`
- Shared `FishtankWebApplicationFactory` (one instance per collection)
- Helper: `GetAdminClientAsync()` — creates authenticated admin client
- Helper: `GetStandardUserClientAsync()` — seeds Standard User and returns authenticated client

**Response envelope assertions:**
```csharp
json.GetProperty("success").GetBoolean().Should().BeTrue();
json.GetProperty("data").// ... validate data

json.GetProperty("success").GetBoolean().Should().BeFalse();
json.GetProperty("error").GetProperty("code").GetString().Should().Be("ERROR_CODE");
```

### E2E Test Patterns (from Playwright)

**Test base:** `test` and `expect` from `../support/fixtures`
- Helper: `apiFetch<T>()` for API calls
- All interactive elements use `data-testid` selectors (NEVER CSS classes)
- Dynamic testids: `user-row-{username}`, `user-status-{username}`, etc.

**data-testid naming convention:**
- Structural: `page-*`, `section-*`, `table-*`
- Interactive: `btn-*`, `dialog-*`, `input-*`
- Dynamic: `{element-type}-{entity-slug}` (e.g., `user-row-admin`)

---

## Known Test Blockers

### Before GREEN Phase

**None** — all test scaffolds are complete and ready for implementation.

### During GREEN Phase

**Watch for:**
1. **JWT middleware TokenVersion validation** — ensure JWT middleware checks `TokenVersion` on **every request**, not just at login (R-E5-001)
2. **Last admin guard logic** — must count active admins in DB, not just total admins (AC-10)
3. **Self-deactivation UI guard** — ensure current user's row has disabled or hidden Deactivate button (AC-9)
4. **data-testid consistency** — all testid values must match the canonical list in story AC-14 **exactly**

---

## Test Maintenance Notes

### When to Update Tests

**If requirements change:**
- Update both test scaffolds AND story file ACs
- Re-run test design validation

**If additional edge cases discovered:**
- Add new test cases to existing suites
- Document in this checklist

**If schema changes:**
- Update DTO assertions in integration tests
- Update E2E assertions for table columns

---

## Sign-Off Criteria

**Before marking Story 5.2 as DONE:**

- [ ] All 14 integration tests passing
- [ ] All 13 E2E tests passing (0 skipped)
- [ ] Code coverage ≥80% on new backend services
- [ ] All data-testid attributes present and verified
- [ ] Manual smoke test: admin creates user → user forced to change password on first login
- [ ] Manual smoke test: admin deactivates user → user's active session ends on next action
- [ ] No P0/P1 bugs open related to Story 5.2

---

## References

- **Story file:** `_bmad-output/implementation-artifacts/stories/5-2-user-management-create-view-and-deactivate.md`
- **Test design:** `_bmad-output/test-artifacts/test-design/test-design-epic-5.md`
- **Architecture:** `_bmad-output/planning-artifacts/architecture.md`
- **Project context:** `_bmad-output/project-context.md`

---

**Generated by:** bmad-testarch-atdd (Create mode)
**Workflow phase:** RED → GREEN → REFACTOR
**Next action:** Begin implementation (bmad-dev-story or bmad-quick-dev)
