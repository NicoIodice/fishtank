---
stepsCompleted: ['step-04-generate-report']
lastStep: 'step-04-generate-report'
lastSaved: '2026-06-27'
story: 3-3-activity-log-filtering-sorting-auto-refresh-and-log-controls
reviewer: bmad-testarch-test-review
---

# Test Quality Review — Story 3-3
## Activity Log Filtering, Sorting, Auto-refresh & Log Controls

**Reviewed:** 2026-06-27  
**Reviewer:** Master Test Architect (bmad-testarch-test-review)  
**Story:** `3-3-activity-log-filtering-sorting-auto-refresh-and-log-controls`

---

## Verdict: PASS

> 0 BLOCKER items found. Test quality is acceptable for GREEN-phase execution.

---

## Score Summary

| Severity | Count |
|----------|-------|
| **BLOCKER** | **0** |
| **MAJOR** | **6** |
| **MINOR** | **7** |

| Layer | Files | Tests | Quality |
|-------|-------|-------|---------|
| Unit — Component (Vitest + RTL) | `story-3-3-activity-filters.test.tsx`, `story-3-3-activity-settings.test.tsx` | 32 + 11 = 43 | Mostly sound; 4 MAJOR, 3 MINOR |
| Unit — Hook (Vitest) | `useActivitySettings.test.ts`, `useActivityLog.refreshRows.test.ts` | 8 + 3 = 11 | Good; 1 MAJOR, 1 MINOR |
| Integration (xUnit) | `Story3_3_ActivityFilterTests.cs` | 12 | Good structure; 2 MAJOR, 1 MINOR |
| E2E (Playwright) | `story-3-3-activity-filters.spec.ts` | 3 | Adequate; 0 MAJOR, 2 MINOR |

---

## Coverage Map

| AC | Description | Unit | Integration | E2E | Overall |
|----|-------------|------|-------------|-----|---------|
| AC-1 | Search (URL path + method, OR, case-insensitive) | ✅ 3 tests | ✅ 3 tests | — | ✅ |
| AC-2 | Service filter | ✅ 3 tests | ✅ 3 tests | ✅ T13 | ✅ |
| AC-3 | Type filter (Mocked/Proxied checkboxes) | ⚠️ 3 tests (Mocked only; Proxied case missing) | ✅ 3 tests | — | ⚠️ |
| AC-4 | AND logic across filters | ✅ 1 test | ✅ T5 | — | ✅ |
| AC-5 | Clear filters (state + sort reset) | ✅ 3 tests | — | — | ✅ |
| AC-6 | Column sort (null→asc→desc→**null**) | ⚠️ 2 tests (missing 3rd-click reset) | — | — | ⚠️ |
| AC-7 | LIVE/PAUSED toggle — freeze + resume | ⚠️ 4 tests (freeze tested; **resume/flush missing**) | — | — | ⚠️ |
| AC-8 | Manual refresh | ✅ 1 test | — | — | ✅ |
| AC-9 | Disabled interval → PAUSED on mount | ✅ 4 tests | — | — | ✅ |
| AC-10 | Clear log (P0) | ✅ 4 tests | ✅ 3 tests | ✅ T14, T14b | ✅ |
| AC-11 | Settings Activity section | ✅ 11 tests (ActivitySettings) + 8 hook tests | — | — | ✅ |
| AC-12 | Proxy counter (unfiltered count) | ⚠️ 1 test (weak assertion — see M2) | — | — | ⚠️ |

> **Coverage note**: This review does not score line/branch coverage — direct coverage
> findings should be directed to the `trace` workflow.

---

## BLOCKER Findings

*None.*

---

## MAJOR Findings

### M1 — Misleading test name and assertion in stale-schema-guard test
**File:** `src/client/tests/unit/features/activity/useActivitySettings.test.ts`  
**Test:** `"falls back to defaults when localStorage has unexpected schema (stale schema guard)"`

**Issue:** The test name says "falls back to defaults" but the assertion shows the hook accepts invalid values without fallback. The assertion uses confusing TypeScript syntax:

```ts
expect(result.current.settings.autoRefreshInterval).toBe(9999 as unknown as 1000);
```

`9999 as unknown as 1000` is a TypeScript type cast; at runtime this evaluates to `9999`. The assertion is functionally `toBe(9999)`, but looks like `toBe(1000)` at a glance. This creates a false appearance of schema validation and misleads future maintainers about the hook's contract.

**Fix:** Rename the test to reflect actual documented behaviour, and remove the confusing cast:

```ts
it("accepts out-of-range numeric values as-is (no schema validation in v1)", async () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ autoRefreshInterval: 9999, maxEntries: 9999 }));
  const { useActivitySettings } = await import("@/features/settings/hooks/useActivitySettings");
  const { result } = renderHook(() => useActivitySettings());
  // No schema validation yet — arbitrary values pass through unchanged.
  expect(result.current.settings.autoRefreshInterval).toBe(9999);
});
```

---

### M2 — AC-12 proxy counter test cannot distinguish "filter active + counter correct" from "filter broken + counter trivially correct"
**File:** `src/client/tests/unit/features/story-3-3-activity-filters.test.tsx`  
**Test:** `"AC-12: proxy counter shows total proxied count even when search filter is active"`

**Issue:** The test types `"payment"` into the search input and then checks `expect(pill).toHaveTextContent("2")`. It does **not** assert that the non-matching row (`activity-row-proxied-orders`) has been hidden. In GREEN phase this creates ambiguity:

- **Scenario A** (correct): filter works → only 1 row visible → counter reads unfiltered → shows 2 ✅
- **Scenario B** (broken filter): filter not wired → both rows visible → counter shows 2 trivially ✅ ← same result

Because both scenarios produce an identical assertion result, the test cannot confirm AC-12 is genuinely implemented. The test comment even acknowledges: *"passes for wrong reason"* in RED phase, but this concern extends to GREEN.

**Fix:** Add a complementary assertion that confirms the filter IS active before testing the counter:

```ts
// Confirm filter is active: orders row should no longer be visible
await waitFor(() => {
  expect(screen.queryByTestId("activity-row-proxied-orders")).not.toBeInTheDocument();
});

// With filter active, proxy counter must still show the unfiltered count
const pill = screen.getByTestId("activity-pill-proxy-count");
expect(pill).toHaveTextContent("2");
```

---

### M3 — AC-6 sort cycle missing third-click (desc→null reset) test
**File:** `src/client/tests/unit/features/story-3-3-activity-filters.test.tsx`  
**Tests:** `"AC-6: clicking Method column header sorts rows ascending"` and `"AC-6: clicking same column header twice cycles to descending"`

**Issue:** The AC explicitly specifies a **4-state cycle**: null → asc → desc → **null**. Two tests cover clicks 1 (null→asc) and 2 (asc→desc). No test covers click 3 (desc→null reset). A regression where the third click wraps to ascending again (or gets stuck) would not be caught.

**Fix:** Add a third test:

```ts
it("AC-6: clicking same column header three times resets sort to unsorted", async () => {
  mockFetchActivityRows.mockResolvedValueOnce([
    makeRow({ id: "post-row", method: "POST" }),
    makeRow({ id: "get-row", method: "GET" }),
  ]);
  // ... render, waitFor rows ...

  const methodHeader = screen.getByRole("columnheader", { name: /method/i });
  await user.click(methodHeader); // → asc
  await user.click(methodHeader); // → desc
  await user.click(methodHeader); // → null (unsorted)

  // When unsorted, original arrival order should be restored (POST before GET based on seed order)
  const rows = screen.getAllByTestId(/^activity-row-/);
  expect(rows[0]).toHaveAttribute("data-testid", "activity-row-post-row");
});
```

---

### M4 — AC-7 resume behavior (PAUSED→LIVE flushes buffered rows) not tested
**File:** `src/client/tests/unit/features/story-3-3-activity-filters.test.tsx`  
**Gap:** ATDD checklist item `AC-7 live-paused: clicking PAUSED button flushes buffered rows`

**Issue:** AC-7 specifies two behaviors: (a) freeze table while paused, and (b) resume and flush buffered rows on second click. Test #19 (`"when paused, new SignalR rows do NOT appear in the table"`) covers behavior (a). Behavior (b) — clicking LIVE/PAUSED again to resume and display buffered rows — has **no test at any layer**. A regression where clicking back to LIVE does not flush the buffer would go undetected.

**Fix:** Add a resume test:

```ts
it("AC-7: clicking LIVE/PAUSED again resumes and flushes buffered rows into the table", async () => {
  // ... render, wait for SignalR subscription ...
  
  // Pause
  await user.click(screen.getByTestId("activity-btn-live-paused"));

  // A new row arrives while paused — should NOT appear yet
  const bufferedRow = makeRow({ id: "buffered-row", urlPath: "/buffered" });
  capturedHandlers["ActivityRowAdded"]!(bufferedRow);
  expect(screen.queryByTestId("activity-row-buffered-row")).not.toBeInTheDocument();

  // Resume
  await user.click(screen.getByTestId("activity-btn-live-paused"));

  // Buffered row should now appear
  await waitFor(() => {
    expect(screen.getByTestId("activity-row-buffered-row")).toBeInTheDocument();
  });
});
```

---

### M5 — Integration: missing `search` no-match edge case
**File:** `src/Fishtank.Api.IntegrationTests/Api/Story3_3_ActivityFilterTests.cs`  
**Gap:** ATDD checklist item `FilterBySearch_NoMatch_ReturnsEmpty`

**Issue:** Three search tests exist (URL path match, method match, OR logic), but there is no test for a search query that matches **nothing**. Without this test, a bug where the API returns all rows instead of `[]` when `?search=zzz-no-match` is not caught at the integration layer.

**Fix:** Add:

```csharp
[Fact(DisplayName = "T3: GET /api/activity?search=zzz-no-match returns empty array (P1)")]
public async Task GetActivity_FilterBySearch_NoMatch_ReturnsEmptyArray()
{
    await SeedRowAsync(urlPath: "/api/orders", method: "GET");
    await SeedRowAsync(urlPath: "/api/payment", method: "POST");

    var client = await GetAuthenticatedClientAsync();
    var response = await client.GetAsync("/api/activity?search=zzz-no-match");

    response.StatusCode.Should().Be(HttpStatusCode.OK);
    var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
    body.GetProperty("data").GetArrayLength().Should().Be(0,
        because: "no row has 'zzz-no-match' in path or method");
}
```

---

### M6 — Integration: missing `serviceId` unknown-ID edge case
**File:** `src/Fishtank.Api.IntegrationTests/Api/Story3_3_ActivityFilterTests.cs`  
**Gap:** ATDD checklist item `FilterByServiceId_UnknownId_ReturnsEmpty`

**Issue:** The integration tests have `GetActivity_FilterByServiceId_ReturnsOnlyMatchingRows` and `GetActivity_NoServiceIdFilter_ReturnsAllRows` but no test for a `?serviceId=` value that matches **zero rows**. A bug where unknown serviceIds return all rows (missing null check) would be undetected.

**Fix:** Add:

```csharp
[Fact(DisplayName = "T1: GET /api/activity?serviceId={unknown} returns empty array (P1)")]
public async Task GetActivity_FilterByUnknownServiceId_ReturnsEmpty()
{
    await SeedRowAsync(serviceId: Guid.NewGuid(), urlPath: "/some-path");

    var client = await GetAuthenticatedClientAsync();
    var response = await client.GetAsync($"/api/activity?serviceId={Guid.NewGuid()}");

    response.StatusCode.Should().Be(HttpStatusCode.OK);
    var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
    body.GetProperty("data").GetArrayLength().Should().Be(0,
        because: "no row belongs to the unknown serviceId");
}
```

---

## MINOR Findings

### m1 — AC-3: symmetric type filter (Proxied-only) test missing
**File:** `story-3-3-activity-filters.test.tsx`  
Only "Mocked only → Proxied hidden" is tested. The symmetric case ("Proxied only → Mocked hidden") is absent. Advisory: add one test for completeness.

---

### m2 — AC-7 pause-freeze test uses raw `setTimeout` for negative assertion
**File:** `story-3-3-activity-filters.test.tsx`  
**Test:** `"when paused, new SignalR rows do NOT appear in the table"`

```ts
await new Promise((r) => setTimeout(r, 100));
expect(screen.queryByTestId("activity-row-late-row")).not.toBeInTheDocument();
```

Raw `setTimeout` is fragile in slow CI environments. For negative assertions, a small fixed timeout is acceptable but `waitFor` with a short `timeout` option is preferable because it integrates with Vitest's async retry logic:

```ts
// Preferred approach:
await expect(
  async () => expect(screen.queryByTestId("activity-row-late-row")).not.toBeInTheDocument()
).not.toThrow();
// Or simply: give React a tick to flush, then assert
await new Promise((r) => setTimeout(r, 0));
await waitFor(() => {
  expect(screen.queryByTestId("activity-row-late-row")).not.toBeInTheDocument();
}, { timeout: 200 });
```

---

### m3 — AC-1 method-match search test missing positive assertion
**File:** `story-3-3-activity-filters.test.tsx`  
**Test:** `"AC-1: search 'post' matches POST method rows (OR logic — method match)"`

The test only asserts `activity-row-get-row` is NOT in the document. It does not assert that `activity-row-post-row` IS still visible. A bug where the search filter hides the matching row as well as the non-matching row would not be caught.

**Fix:** Add `expect(screen.getByTestId("activity-row-post-row")).toBeInTheDocument()` before or alongside the negative assertion.

---

### m4 — AC-6 sort tests use `data-sort-column` attribute outside the `data-testid` contract
**File:** `story-3-3-activity-filters.test.tsx`  
**Test:** `"AC-6: clicking Method column header sorts rows ascending by method"`

```ts
expect(methodHeader).toHaveAttribute("data-sort-column", "method");
```

`data-sort-column` is not in the canonical `data-testid` contract defined in the ATDD checklist. If the implementation uses a different attribute name or mechanism, this assertion creates a false negative. Use `data-testid="activity-col-method"` (consistent with the `activity-col-timestamp` pattern from the ATDD checklist) rather than a custom `data-sort-column` attribute.

---

### m5 — E2E T13: unnecessary `waitForTimeout` before locator assertion
**File:** `story-3-3-activity-filters.spec.ts`  
**Test:** T13

```ts
await page.waitForTimeout(300);
const rows = page.locator('[data-testid^="activity-row-"]');
await expect(rows).toHaveCount(1, { timeout: 2000 });
```

`waitForTimeout(300)` + `{ timeout: 2000 }` means the test waits a fixed 300ms, then polls for up to 2000ms more — but if the UI updates in 100ms, the test wastes 200ms. Playwright's locator assertions are self-polling; the `waitForTimeout` is redundant.

**Fix:** Remove `waitForTimeout` and rely on the assertion's timeout:
```ts
await expect(page.locator('[data-testid^="activity-row-"]')).toHaveCount(1, { timeout: 2500 });
```

---

### m6 — `useActivitySettings.test.ts`: test name "stale schema guard" contradicts assertion
**File:** `useActivitySettings.test.ts`  
*(Overlaps with M1 — the name should be fixed as part of the M1 fix.)*

The section comment `// ─── Invalid localStorage value falls back to defaults ───` is accurate for the `invalid JSON` test but misleading for the `9999` test. Separate these into distinct `describe` blocks or name them clearly.

---

### m7 — Integration: no explicit `GET /api/activity?type=<any>` returns-all test
**File:** `Story3_3_ActivityFilterTests.cs`  
ATDD checklist included `FilterByType_All_ReturnsAllRows` (no type param → all rows returned). This is implicitly covered by other tests that seed and query across types, but an explicit test improves documentation value and would immediately flag a regression where omitting `?type=` accidentally filters to empty. Advisory only — risk is low given existing coverage.

---

## Recommendations

1. **Address M2 (AC-12) before marking the story done** — add the complementary row-visibility assertion to make the proxy-counter test self-verifying.
2. **Address M4 (AC-7 resume)** — the buffered-rows-flush path is a core interaction with no test coverage at any layer.
3. **Address M3 & M6 (integration edge cases)** — add the no-match search and unknown-serviceId tests to complete the T1/T3 coverage promised in the ATDD checklist.
4. **Address M1 (misleading assertion)** — fix the confusing `as unknown as 1000` cast to avoid maintainer confusion.
5. **M3 (AC-6 3rd-click)** — add a test to guarantee the sort cycle fully resets.

---

## Artifact References

| Artifact | Path |
|----------|------|
| Story implementation spec | `_bmad-output/implementation-artifacts/3-3-activity-log-filtering-sorting-auto-refresh-and-log-controls.md` |
| Test design (Epic 3) | `_bmad-output/test-artifacts/test-design-epic-3.md` |
| ATDD checklist | `_bmad-output/test-artifacts/atdd-checklist-3-3-activity-log-filtering-sorting-auto-refresh-and-log-controls.md` |
| Automation summary | `_bmad-output/test-artifacts/automation-summary-3-3-activity-log-filtering-sorting-auto-refresh-and-log-controls.md` |

---

## Next Steps

- Run `npx vitest run` to confirm 54/54 passing
- Apply M2 fix (AC-12 assertion) and M4 fix (AC-7 resume test) before story sign-off
- After GREEN phase, run `npm run test:e2e` against live stack for E2E validation
- Consider `trace` workflow to measure branch coverage delta introduced by Story 3.3
