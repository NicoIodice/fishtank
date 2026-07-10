---
story_key: "5-2-user-management-create-view-and-deactivate"
date: "2026-07-10"
verdict: PASS
round: 2
blockers: 0
majors: 0
minors: 0
dismissed: 1
reviewers:
  - "Blind Hunter (adversarial)"
  - "Edge Case Hunter"
  - "Acceptance Auditor"
round_1:
  date: "2026-07-10"
  verdict: FAIL
  blockers: 2
  majors: 3
  minors: 2
---

# Code Review: Story 5-2 User Management — Create, View & Deactivate

## Summary (Round 2)

| Severity | Count |
|----------|-------|
| BLOCKER  | 0     |
| MAJOR    | 0     |
| MINOR    | 0     |
| INFO     | 0     |
| Dismissed| 1     |

**Verdict:** ✅ **PASS** — All issues from Round 1 have been resolved.

---

## Round 1 Summary (Historical)

| Severity | Count |
|----------|-------|
| BLOCKER  | 2     |
| MAJOR    | 3     |
| MINOR    | 2     |
| INFO     | 0     |
| Dismissed| 1     |

**Round 1 Verdict:** ❌ **FAIL** — 2 BLOCKER issues required resolution before merge.

---

## BLOCKER Findings

### B1: Missing Self-Deactivation Guard (AC-9)

**Source:** Acceptance Auditor + Edge Case Hunter  
**File:** [src/client/src/features/admin/components/UserManagementSection.tsx](../../../src/client/src/features/admin/components/UserManagementSection.tsx#L56-L66)  
**Violated:** AC-9

**Description:**  
The UserManagementSection component renders the "Deactivate" button for ALL active users, including the currently logged-in admin. Per AC-9:

> "the 'Deactivate' action is disabled for their own row (no button rendered, or button with `aria-disabled="true"` and tooltip 'You cannot deactivate your own account')"

**Current Code:**
```tsx
cell: (row) =>
  row.isActive ? (
    <button
      data-testid={`user-deactivate-${row.username}`}
      className={styles.deactivateBtn}
      onClick={() => handleDeactivateClick(row)}
    >
      Deactivate
    </button>
  ) : null,
```

**Required Fix:**
1. Import `useAuth` from `@/features/auth/hooks/useAuth`
2. Get current user's ID: `const { user: currentUser } = useAuth();`
3. Disable or hide button when `row.id === currentUser?.userId`

```tsx
const { user: currentUser } = useAuth();
// ...
cell: (row) =>
  row.isActive && row.id !== currentUser?.userId ? (
    <button
      data-testid={`user-deactivate-${row.username}`}
      className={styles.deactivateBtn}
      onClick={() => handleDeactivateClick(row)}
    >
      Deactivate
    </button>
  ) : row.isActive && row.id === currentUser?.userId ? (
    <span 
      aria-disabled="true" 
      title="You cannot deactivate your own account"
      className={styles.deactivateBtnDisabled}
    >
      Deactivate
    </span>
  ) : null,
```

**Security Impact:** Without this guard, an admin can accidentally lock themselves out of the system. While the backend has a "last admin" guard, a solo admin CAN deactivate themselves if they're the only admin, causing complete lockout.

---

### B2: Missing `user-row-{username}` data-testid (AC-14)

**Source:** Acceptance Auditor  
**File:** [src/client/src/features/admin/components/UserManagementSection.tsx](../../../src/client/src/features/admin/components/UserManagementSection.tsx)  
**Violated:** AC-14

**Description:**  
AC-14 mandates `data-testid="user-row-{username}"` for each user row, but the DataTable component doesn't support row-level data-testid and the implementation doesn't provide it.

**Required `data-testid` per AC-14:**
| Element | Required `data-testid` | Status |
|---------|------------------------|--------|
| User row (dynamic) | `user-row-{username}` | ❌ **MISSING** |

All other 15 data-testid values are present. This one is missing.

**Required Fix:**
Either extend DataTable to accept a `getRowTestId` prop, or render a custom table in UserManagementSection. Example with custom table:

```tsx
<tbody>
  {users.map((user) => (
    <tr key={user.id} data-testid={`user-row-${user.username}`}>
      {/* cells */}
    </tr>
  ))}
</tbody>
```

**Impact:** E2E tests cannot select individual user rows for verification. This blocks all Playwright tests that target specific user rows.

---

## MAJOR Findings

### M1: useUsers Hooks Incorrectly Double-Wrap apiFetch Response

**Source:** Blind Hunter  
**File:** [src/client/src/features/admin/hooks/useUsers.ts](../../../src/client/src/features/admin/hooks/useUsers.ts#L14-L21)  

**Description:**  
The `apiFetch<T>` function already unwraps the `ApiResponse` envelope and returns `body.data` directly. It throws `ApiError` on failure. The hooks incorrectly expect `apiFetch` to return the full envelope and manually check `response.success`.

**Current (incorrect):**
```typescript
queryFn: async () => {
  const response = await apiFetch<ApiResponse<User[]>>('/api/users');
  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to fetch users');
  }
  return response.data;
},
```

**Correct:**
```typescript
queryFn: () => apiFetch<User[]>('/api/users'),
```

**Same issue in all three hooks:**
- `useUsers()` — line 14
- `useCreateUser()` — line 30
- `useDeactivateUser()` — line 52

The `ApiResponse<T>` type import from `../types/user.ts` is also unnecessary and should be removed.

**Impact:** The code works by accident because `apiFetch` returns the data and the destructuring `response.success` evaluates to `undefined` which is falsy... wait, actually this would FAIL in practice because `response.success` would be `undefined` on the unwrapped data. This is a runtime bug waiting to happen.

---

### M2: Date Format Incorrect (AC-1)

**Source:** Acceptance Auditor  
**File:** [src/client/src/features/admin/components/UserManagementSection.tsx](../../../src/client/src/features/admin/components/UserManagementSection.tsx#L48)  
**Violated:** AC-1

**Description:**  
AC-1 specifies:
> "Created date (formatted as YYYY-MM-DD)"

**Current:**
```typescript
cell: (row) => new Date(row.createdAt).toLocaleDateString(),
```

`toLocaleDateString()` produces locale-specific formats (e.g., "7/10/2026" in en-US), not ISO 8601 YYYY-MM-DD.

**Required Fix:**
```typescript
cell: (row) => new Date(row.createdAt).toISOString().split('T')[0],
// or
cell: (row) => row.createdAt.slice(0, 10), // if already ISO string
```

---

### M3: Tab Order Incorrect (AC-13)

**Source:** Acceptance Auditor  
**File:** [src/client/src/features/admin/pages/AdminConsolePage.tsx](../../../src/client/src/features/admin/pages/AdminConsolePage.tsx#L22-L61)  
**Violated:** AC-13

**Description:**  
AC-13 specifies:
> "sub-navigation displays four tabs: **Feature Toggles** / **Users** / **Health** / **Audit Log**. And Users tab is the second tab."

**Current order:** Users / Feature Toggles / Health / Audit Log  
**Required order:** Feature Toggles / Users / Health / Audit Log

Also, `useState<Tab>("users")` should be `useState<Tab>("feature-toggles")` since Feature Toggles is the default first tab.

---

## MINOR Findings

### N1: Status Badge Colors Don't Match Spec CSS Classes (AC-2)

**Source:** Acceptance Auditor  
**File:** [src/client/src/features/admin/components/UserManagementSection.module.css](../../../src/client/src/features/admin/components/UserManagementSection.module.css#L45-L52)  
**Violated:** AC-2

**Description:**  
AC-2 specifies Tailwind-style class names for badge colors:
- Active: `bg-green-100 text-green-700`
- Deactivated: `bg-slate-100 text-slate-500`

The CSS uses hardcoded hex colors (`#16a34a`, `#9ca3af`) without backgrounds. While functionally similar, this doesn't match the spec's expected visual styling (colored backgrounds + text).

**Suggested Fix:**
```css
.statusActive {
  background-color: #dcfce7; /* green-100 */
  color: #15803d;            /* green-700 */
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-weight: 500;
}

.statusInactive {
  background-color: #f1f5f9; /* slate-100 */
  color: #64748b;            /* slate-500 */
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
}
```

---

### N2: Deactivated Row Missing 50% Opacity (AC-2)

**Source:** Acceptance Auditor  
**File:** [src/client/src/features/admin/components/UserManagementSection.tsx](../../../src/client/src/features/admin/components/UserManagementSection.tsx)  
**Violated:** AC-2

**Description:**  
AC-2 states:
> "the row has 50% opacity"

No opacity is applied to deactivated user rows. The DataTable component would need to accept a `getRowClassName` callback, or the feature needs a custom table implementation.

---

## Dismissed Findings

### D1: ApiResponse Type in user.ts

**Source:** Blind Hunter  
**Reason:** Low-impact, the type itself is fine — it's the incorrect usage in hooks that matters (covered by M1).

---

## Backend Verification ✅

The following backend items were verified as correctly implemented:

| Item | Status |
|------|--------|
| `IUserManagementService` interface | ✅ Correct |
| Password hashing via `IPasswordHasher` | ✅ Uses injected interface |
| `AUTH_USERNAME_EXISTS` error code (409) | ✅ Correct |
| `ADMIN_LAST_ADMIN_DEACTIVATE` guard | ✅ Correct logic |
| TokenVersion increment on deactivation | ✅ Line 83 `user.TokenVersion++` |
| Idempotent deactivation (already inactive → success) | ✅ Lines 67-70 |
| Admin role enforcement via policy | ✅ `.RequireAuthorization(policy => policy.RequireRole("Admin"))` |
| Deactivated user login check | ✅ AuthEndpoints.cs lines 127-131 |
| Response envelope format | ✅ `ApiResponse.Ok(...)` / `ApiResponse.Fail(...)` |
| ForcePasswordChange = true for new users | ✅ Line 47 |
| MSW handlers for /api/users | ✅ All three endpoints covered |

---

## Gate Decision

| Gate | Status |
|------|--------|
| Security | ❌ FAIL — Self-deactivation guard missing |
| Correctness | ❌ FAIL — Hook implementation will crash at runtime |
| API Contract | ✅ PASS |
| React Patterns | ⚠️ WARNING — apiFetch usage incorrect |
| data-testid Coverage | ❌ FAIL — 15/16 present, 1 missing |
| Code Quality | ✅ PASS |

**Final Verdict:** ❌ **FAIL**

---

## Recommended Fix Order

1. **B1** — Self-deactivation guard (security)
2. **M1** — Fix useUsers hooks before testing (will crash otherwise)
3. **B2** — Add user-row data-testid (E2E tests depend on this)
4. **M2** — Date format fix
5. **M3** — Tab order fix
6. **N1, N2** — CSS polish (can be deferred to follow-up)

---

## Checklist for Re-Review

- [x] Self-deactivation button disabled for current user
- [x] `user-row-{username}` data-testid on each row
- [x] useUsers hooks use `apiFetch<User[]>` directly (remove double-wrap)
- [x] Date formatted as YYYY-MM-DD
- [x] Tab order: Feature Toggles / Users / Health / Audit Log
- [x] Badge CSS matches spec colors
- [x] Deactivated rows have 50% opacity

---

# Round 2: Re-Review (2026-07-10)

## Summary

| Severity | Count |
|----------|-------|
| BLOCKER  | 0     |
| MAJOR    | 0     |
| MINOR    | 0     |
| INFO     | 0     |

**Verdict:** ✅ **PASS** — All previously identified issues have been correctly resolved.

---

## Fix Verification

### B1: Self-Deactivation Guard ✅ FIXED

**File:** [UserManagementSection.tsx](../../../src/client/src/features/admin/components/UserManagementSection.tsx#L19)

**Verification:**
- Imports `useAuth` from `@/features/auth/hooks/useAuth` (line 9)
- Extracts `currentUser` via `const { user: currentUser } = useAuth();` (line 19)
- Actions column checks `const isSelf = currentUser?.username === row.username;` (line 58)
- Button has `disabled={isSelf}`, `aria-disabled={isSelf}`, and tooltip `"You cannot deactivate your own account"` (lines 63-66)

**Result:** Self-deactivation is properly blocked with accessible disabled state and tooltip.

---

### B2: `user-row-{username}` data-testid ✅ FIXED

**Files:**
- [UserManagementSection.tsx](../../../src/client/src/features/admin/components/UserManagementSection.tsx#L96)
- [DataTable.tsx](../../../src/client/src/components/ui/DataTable.tsx#L148)

**Verification:**
- DataTable extended with `getRowTestId` prop (DataTable.tsx line 21)
- Row element applies `data-testid={getRowTestId?.(row)}` (DataTable.tsx line 148)
- UserManagementSection passes `getRowTestId={(row) => \`user-row-${row.username}\`}` (line 96)

**Result:** All user rows now have dynamic `user-row-{username}` data-testid for E2E testing.

---

### M1: useUsers Hooks ✅ FIXED

**File:** [useUsers.ts](../../../src/client/src/features/admin/hooks/useUsers.ts)

**Verification:**
- `useUsers()` returns `apiFetch<User[]>('/api/users')` directly (line 16)
- `useCreateUser()` uses `apiFetch<User>('/api/users', {...})` (lines 28-32)
- `useDeactivateUser()` uses `apiFetch<User>(...)` directly (lines 45-46)
- No `ApiResponse<>` double-wrapping or manual `.success` checks
- Removed unnecessary `ApiResponse` type import from types/user.ts

**Result:** Hooks correctly use apiFetch which handles envelope unwrapping internally.

---

### M2: Date Format ✅ FIXED

**File:** [UserManagementSection.tsx](../../../src/client/src/features/admin/components/UserManagementSection.tsx#L54)

**Verification:**
- Date cell now uses `new Date(row.createdAt).toISOString().slice(0, 10)` (line 54)
- This produces ISO 8601 format: `YYYY-MM-DD`

**Result:** Created date displays in YYYY-MM-DD format per AC-1.

---

### M3: Tab Order ✅ FIXED

**File:** [AdminConsolePage.tsx](../../../src/client/src/features/admin/pages/AdminConsolePage.tsx)

**Verification:**
- Default state is `useState<Tab>("feature-toggles")` (line 10)
- Tab buttons render in order: Feature Toggles → Users → Health → Audit Log (lines 24-63)

**Result:** Tab order matches spec: Feature Toggles / Users / Health / Audit Log (AC-13).

---

### N1: Status Badge Colors ✅ FIXED

**File:** [UserManagementSection.module.css](../../../src/client/src/features/admin/components/UserManagementSection.module.css#L57-L66)

**Verification:**
- `.statusActive` uses `background-color: #dcfce7` (green-100) and `color: #15803d` (green-700)
- `.statusInactive` uses `background-color: #f1f5f9` (slate-100) and `color: #64748b` (slate-500)

**Result:** Badge colors match Tailwind spec classes per AC-2.

---

### N2: Deactivated Row Opacity ✅ FIXED

**Files:**
- [UserManagementSection.module.css](../../../src/client/src/features/admin/components/UserManagementSection.module.css#L68-L70)
- [UserManagementSection.tsx](../../../src/client/src/features/admin/components/UserManagementSection.tsx#L97)

**Verification:**
- CSS defines `.deactivatedRow { opacity: 0.5; }` (line 68-70)
- DataTable receives `getRowClassName={(row) => !row.isActive ? styles.deactivatedRow : ''}` (line 97)

**Result:** Deactivated user rows display at 50% opacity per AC-2.

---

## Gate Decision (Round 2)

| Gate | Status |
|------|--------|
| Security | ✅ PASS — Self-deactivation guard implemented |
| Correctness | ✅ PASS — Hooks correctly use apiFetch |
| API Contract | ✅ PASS |
| React Patterns | ✅ PASS — Clean hook implementations |
| data-testid Coverage | ✅ PASS — All 16 testids present |
| Code Quality | ✅ PASS |

**Final Verdict:** ✅ **PASS**

---

## Additional Verification

| Item | Status |
|------|--------|
| UserManagementService registered in Program.cs | ✅ Line 190 |
| UsersEndpoints mapped in Program.cs | ✅ Line 267 |
| Admin role enforcement on all endpoints | ✅ `.RequireRole("Admin")` |
| MSW handlers for all 3 endpoints | ✅ handlers.ts lines 114-161 |
| Module exports updated | ✅ admin/index.ts |
| AUTH_ACCOUNT_DEACTIVATED check in login | ✅ AuthEndpoints.cs lines 130-134 |

---

## Conclusion

All 2 BLOCKER, 3 MAJOR, and 2 MINOR issues identified in Round 1 have been correctly resolved. The implementation now fully satisfies all acceptance criteria (AC-1 through AC-14) and passes all quality gates.

**Recommendation:** Merge approved.
