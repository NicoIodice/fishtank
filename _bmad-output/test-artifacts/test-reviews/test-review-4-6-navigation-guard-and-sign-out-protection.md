---
story_id: "4.6"
story_key: "4-6-navigation-guard-and-sign-out-protection"
review_date: "2026-07-09"
reviewer: "TEA (Test Engineer Agent)"
status: "PASS_WITH_MAJORS"
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-review-tests']
lastStep: 'step-03-review-tests'
lastSaved: '2026-07-09'
inputDocuments:
  - '_bmad-output/implementation-artifacts/stories/4-6-navigation-guard-and-sign-out-protection.md'
  - '_bmad-output/test-artifacts/test-design/test-design-epic-4.md'
  - '_bmad-output/project-context.md'
  - 'src/client/tests/unit/lib/useUnsavedChanges.test.tsx'
  - 'src/client/tests/unit/components/SignOutConfirmDialog.test.tsx'
  - 'src/client/tests/e2e/story-4-6-navigation-guard-and-sign-out-protection.spec.ts'
---

# Test Review: Story 4-6 Navigation Guard & Sign-Out Protection

## Executive Summary

| Metric | Value |
|--------|-------|
| **Total Findings** | 7 |
| **BLOCKERs** | 0 |
| **MAJORs** | 2 |
| **MINORs** | 5 |
| **AC Coverage** | 13/13 (100%) |
| **Verdict** | ✅ PASS — No blockers; majors relate to NFR-19 accessibility gaps flagged in code review |

---

## Scope Reviewed

| Test File | Test Count | Type | Purpose |
|-----------|------------|------|---------|
| [useUnsavedChanges.test.tsx](src/client/tests/unit/lib/useUnsavedChanges.test.tsx) | 9 | Unit (hook) | Global unsaved state context and message generation |
| [SignOutConfirmDialog.test.tsx](src/client/tests/unit/components/SignOutConfirmDialog.test.tsx) | 10 | Component | Sign-out confirmation dialog rendering + actions |
| [story-4-6-navigation-guard-and-sign-out-protection.spec.ts](src/client/tests/e2e/story-4-6-navigation-guard-and-sign-out-protection.spec.ts) | 34 | E2E scaffolds | Full-stack acceptance tests (RED phase) |

**Total: 53 tests**

---

## AC Coverage Matrix

| AC | Description | Unit | Component | E2E | Covered |
|----|-------------|:----:|:---------:|:---:|:-------:|
| AC-1 | Navigation guard triggers on unsaved Mapping edits | — | — | ✅ | ✅ |
| AC-2 | "Discard and navigate" proceeds | — | — | ✅ | ✅ |
| AC-3 | "Stay" cancels navigation | — | — | ✅ | ✅ |
| AC-4 | Sign-out with unsaved Mapping edits shows dialog | ✅ | ✅ | ✅ | ✅ |
| AC-5 | Sign-out with pending Mocks Root path* | ✅ | — | ✅ | ✅ |
| AC-6 | Sign-out with both Mapping + Mocks Root | ✅ | — | ✅ | ✅ |
| AC-7 | Sign-out with in-progress Service modal* | ✅ | — | ✅ | ✅ |
| AC-8 | Sign-out with all three unsaved states | ✅ | — | ✅ | ✅ |
| AC-9 | No unsaved state → immediate sign-out | ✅ | — | ✅ | ✅ |
| AC-10 | Cancel keeps user signed in | — | ✅ | ✅ | ✅ |
| AC-11 | "Sign out" proceeds with logout | — | ✅ | ✅ | ✅ |
| AC-12 | Navigation guard covers ALL 5 trigger types | — | — | ✅ | ✅ |
| AC-13 | data-testid attributes | — | ✅ | ✅ | ✅ |

\* AC-5 (Mocks Root) and AC-7 (Service modal) depend on Epic 5 features for full implementation. Tests are scaffolded correctly for when those features ship.

**Coverage: 13/13 ACs = 100%**

---

## Findings

### MAJORs (2)

#### M-1: Missing focus trap test for SignOutConfirmDialog (NFR-19)

**File:** [SignOutConfirmDialog.test.tsx](src/client/tests/unit/components/SignOutConfirmDialog.test.tsx)

**Issue:** NFR-19 requires dialog keyboard accessibility including focus trap (Tab cycles within modal). No test verifies that focus is trapped inside the dialog when open.

**Linked Code Review Finding:** M-2 from code review identified focus trap + Enter-to-submit missing from implementation.

**Recommended Fix:**
```typescript
it("traps focus within dialog when open", async () => {
  // NFR-19: Focus trap — Tab cycles within modal
  const user = userEvent.setup();
  render(<SignOutConfirmDialog {...defaultProps} />);

  const cancelBtn = screen.getByTestId("dialog-signout-cancel");
  const signOutBtn = screen.getByTestId("dialog-signout-confirm-btn");

  // Tab should cycle between cancel and sign-out buttons
  cancelBtn.focus();
  await user.tab();
  expect(signOutBtn).toHaveFocus();
  await user.tab();
  expect(cancelBtn).toHaveFocus(); // Wraps back
});
```

**Severity:** MAJOR — Accessibility requirement; aligns with implementation gap from code review.

---

#### M-2: Missing Enter-to-submit test for SignOutConfirmDialog (NFR-19)

**File:** [SignOutConfirmDialog.test.tsx](src/client/tests/unit/components/SignOutConfirmDialog.test.tsx)

**Issue:** NFR-19 requires Enter to submit the default action. No test verifies that pressing Enter triggers the primary action (Cancel in this case, as it should be the safe default for destructive dialogs).

**Linked Code Review Finding:** M-2 from code review identified this gap.

**Note:** For destructive confirmation dialogs, the design pattern typically requires the *non-destructive* action (Cancel) as the default focused button, not the destructive action. Verify with UX spec whether Enter should:
- A) Close the dialog (Cancel), or
- B) Not trigger any action (require explicit click on Sign out)

**Recommended Fix:**
```typescript
it("Enter key on default-focused button closes dialog", async () => {
  // NFR-19: Enter submits — default should be non-destructive action
  const onOpenChange = vi.fn();
  const user = userEvent.setup();

  render(<SignOutConfirmDialog {...defaultProps} onOpenChange={onOpenChange} />);

  // Verify Cancel button has focus by default (safe for destructive dialogs)
  await user.keyboard("{Enter}");

  expect(onOpenChange).toHaveBeenCalledWith(false);
});
```

**Severity:** MAJOR — Accessibility requirement; implementation gap confirmed.

---

### MINORs (5)

#### N-1: Backdrop click test uses fragile selector

**File:** [SignOutConfirmDialog.test.tsx#L143](src/client/tests/unit/components/SignOutConfirmDialog.test.tsx#L143)

**Issue:** Test uses `role="presentation"` to find backdrop element. This is implementation-dependent and may break if the dialog library changes DOM structure.

**Current:**
```typescript
const backdrop = screen.getByRole("presentation");
await user.click(backdrop);
```

**Recommended:** Use a `data-testid` on the backdrop/overlay element for stability:
```typescript
const backdrop = screen.getByTestId("dialog-overlay");
await user.click(backdrop);
```

**Severity:** MINOR — Fragile but functional.

---

#### N-2: Missing clearAll() convenience method test

**File:** [useUnsavedChanges.test.tsx](src/client/tests/unit/lib/useUnsavedChanges.test.tsx)

**Issue:** The hook does not expose a `clearAll()` method, but if one is added later for sign-out cleanup (clearing all sources at once), a test should cover it.

**Recommendation:** If implementation adds `clearAll()`, add test:
```typescript
it("clearAll removes all registered sources", () => {
  const { result } = renderHook(() => useUnsavedChanges(), { wrapper });

  act(() => {
    result.current.registerUnsaved("mappings-editor");
    result.current.registerUnsaved("service-modal");
    result.current.clearAll();
  });

  expect(result.current.hasAnyUnsaved).toBe(false);
});
```

**Severity:** MINOR — Enhancement, not a gap.

---

#### N-3: E2E test AC-5 depends on deferred Epic 5 feature

**File:** [story-4-6-navigation-guard-and-sign-out-protection.spec.ts#L386](src/client/tests/e2e/story-4-6-navigation-guard-and-sign-out-protection.spec.ts#L386)

**Issue:** Test clicks `[data-testid="settings-btn-edit-mocks-root"]` which may not exist until Epic 5 ships. Test is correctly scaffolded but will fail until that feature lands.

**Recommendation:** Add a skip condition or mark as `test.fixme()` until Epic 5:
```typescript
test.fixme("AC-5: Sign-out with unsaved Mocks Root path shows confirmation", async ({ page }) => {
  // Depends on Epic 5 — Settings page Mocks Root edit UI
});
```

**Severity:** MINOR — Known dependency; test scaffolding is correct.

---

#### N-4: No explicit assertion for dialog focus management in E2E

**File:** [story-4-6-navigation-guard-and-sign-out-protection.spec.ts](src/client/tests/e2e/story-4-6-navigation-guard-and-sign-out-protection.spec.ts)

**Issue:** E2E tests verify dialog visibility and actions but do not assert that focus moves to the dialog when it opens. This is covered at the component level by M-1/M-2 recommendations, but E2E could add a spot-check.

**Recommendation (low priority):**
```typescript
// After dialog opens:
await expect(page.locator('[data-testid="dialog-signout-confirm"]')).toBeFocused();
// Or verify a button inside has focus
```

**Severity:** MINOR — Nice-to-have; component tests are the correct level for focus behavior.

---

#### N-5: Missing test for provider unmount cleanup

**File:** [useUnsavedChanges.test.tsx](src/client/tests/unit/lib/useUnsavedChanges.test.tsx)

**Issue:** No test verifies that the context state is properly cleaned up when the provider unmounts. In practice, provider unmount means app shutdown, so this is low risk.

**Recommendation:** Not strictly necessary, but could add for completeness:
```typescript
it("clears state when provider unmounts", () => {
  const { result, unmount } = renderHook(() => useUnsavedChanges(), { wrapper });

  act(() => {
    result.current.registerUnsaved("mappings-editor");
  });

  unmount();
  // Re-mount should have fresh state
  const { result: result2 } = renderHook(() => useUnsavedChanges(), { wrapper });
  expect(result2.current.hasAnyUnsaved).toBe(false);
});
```

**Severity:** MINOR — Defensive test; low practical impact.

---

## Quality Assessment

### Strengths

1. **Comprehensive AC coverage** — All 13 ACs have corresponding tests at appropriate levels
2. **Clear RED phase scaffolding** — E2E tests are correctly marked as scaffolds with `// RED PHASE` comments explaining expected vs actual behavior
3. **Good test isolation** — Unit tests use proper `renderHook` with wrapper, component tests reset between runs
4. **Proper user-event usage** — Component tests use `userEvent.setup()` instead of fireEvent
5. **Helper functions** — E2E tests define reusable `seedService()` and `createMappingFile()` helpers
6. **Message format coverage** — Unit tests cover all 3 message combinations (1 source, 2 sources, 3 sources)

### Opportunities

1. Add focus trap and Enter-key tests per NFR-19 (MAJORs M-1, M-2)
2. Consider adding `test.fixme()` for Epic 5-dependent E2E tests
3. Replace `role="presentation"` selector with data-testid for stability

---

## Recommendations

### Before Story Sign-Off

1. **Add focus trap test** (M-1) — Required for NFR-19 compliance
2. **Add Enter-key behavior test** (M-2) — Required for NFR-19 compliance

### After Implementation

1. Verify E2E tests pass when `SignOutConfirmDialog` implements focus trap
2. Update AC-5/AC-7 tests when Epic 5 features ship
3. Consider adding explicit `aria-modal="true"` assertion in component test

---

## Verdict

| Check | Result |
|-------|--------|
| All ACs have test coverage | ✅ |
| No BLOCKER findings | ✅ |
| Assertions verify expected behavior | ✅ |
| data-testid attributes used correctly | ✅ |
| Tests align with test-design-epic-4.md priorities | ✅ |
| NFR-19 accessibility tests present | ⚠️ MAJOR gaps (M-1, M-2) |

**Final Verdict: ✅ PASS WITH MAJORS**

Tests provide adequate coverage of all ACs. Two MAJOR findings relate to NFR-19 accessibility tests that align with the code review's M-2 finding. Once the implementation adds focus trap + Enter handling, corresponding tests should be added.

---

*Report generated by TEA (Test Engineer Agent) — bmad-testarch-test-review skill*
