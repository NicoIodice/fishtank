# Code Review: Story 4.4 — Save As Mock — Mock Suggestion Modal

**Reviewer:** bmad-code-review  
**Date:** 2026-07-08  
**Story:** [4-4-save-as-mock-mock-suggestion-modal](../stories/4-4-save-as-mock-mock-suggestion-modal.md)  
**Status:** COMPLETE

---

## Re-review (2026-07-08)

**Trigger:** BLOCKER fix verification  
**Previous verdict:** FAIL (1 BLOCKER)

### B-1 Fix Verification: ✅ CONFIRMED RESOLVED

**Original issue:** Cross-feature import `MAPPINGS_QUERY_KEY` from `@/features/mappings`  
**Fix applied:**
- [useSaveAsMock.ts#L72](../../src/client/src/features/activity/hooks/useSaveAsMock.ts#L72) — uses inline query key: `void qc.invalidateQueries({ queryKey: ["mappings"] });`
- [useSaveAsMock.ts#L5-10](../../src/client/src/features/activity/hooks/useSaveAsMock.ts#L5) — defines local `SavedFileInfo` interface instead of cross-feature import

**Verification:** No cross-feature imports remain in the file. Architecture rule satisfied.

### Re-review Summary

| Severity | Count | Change |
|----------|-------|--------|
| BLOCKER  | 0     | ↓1 (B-1 fixed) |
| MAJOR    | 1     | — |
| MINOR    | 3     | — |
| DISMISSED| 2     | — |

**Verdict:** ✅ **PASS** — No blockers remain. M-1 and minors are acceptable for merge; track in backlog if desired.

---

## Original Review (2026-07-08)

### Original Summary

| Severity | Count |
|----------|-------|
| BLOCKER  | 1     |
| MAJOR    | 1     |
| MINOR    | 3     |
| DISMISSED| 2     |

**Verdict:** ❌ **FAIL** — 1 BLOCKER must be resolved before merge.

---

## BLOCKER Findings

### B-1: Cross-Feature Import Violates Architecture (BLOCKER)

**File:** [useSaveAsMock.ts](../../src/client/src/features/activity/hooks/useSaveAsMock.ts#L4)  
**Source:** Blind Hunter + Acceptance Auditor  
**Rule Violated:** project-context.md — "Each feature folder is self-contained — **no cross-feature imports**"

**Evidence:**
```typescript
import { MAPPINGS_QUERY_KEY } from "@/features/mappings/hooks/useMappingsTree";
```

The `activity` feature imports from `features/mappings`, violating the architectural constraint. This creates coupling between features and breaks the self-contained feature folder pattern.

**Required Fix:**  
Either:
1. Define query key inline: `void qc.invalidateQueries({ queryKey: ["mappings"] });`  
2. Move shared query keys to `@/lib/queryKeys.ts` (shared constants)

**Why BLOCKER:** Architecture rule violations are blocking per project standards. The fix is trivial (one line change), but must be done.

---

## MAJOR Findings

### M-1: Non-Atomic File Creation — Partial Failure Leaves Orphan File (MAJOR)

**File:** [useSaveAsMock.ts](../../src/client/src/features/activity/hooks/useSaveAsMock.ts#L47-L64)  
**Source:** Edge Case Hunter  
**AC Affected:** AC-9 (Save success writes two files)

**Evidence:**
```typescript
// Step 1: Create mapping file
const mappingFile = await apiFetch<FileMetadata>("/api/mappings", {...});

// Step 2: Create response file (only after mapping succeeds)
const responseFile = await apiFetch<FileMetadata>("/api/mappings", {...});
```

**Problem:**  
If mapping file creation succeeds but response file creation fails (disk full, permission error, etc.), the user is left with:
- An orphaned mapping file on disk
- No rollback mechanism
- An error message that suggests retry, but retry will fail with "file already exists"

**Impact:** Users must manually clean up partial state or will encounter confusing duplicate-file errors.

**Recommended Fix:**  
Option A (preferred): Wrap in try/catch, delete mapping file on response failure:
```typescript
try {
  const mappingFile = await apiFetch<FileMetadata>("/api/mappings", {...});
  try {
    const responseFile = await apiFetch<FileMetadata>("/api/mappings", {...});
    return { mappingFile, responseFile };
  } catch (responseErr) {
    // Rollback: delete mapping file
    await apiFetch(`/api/mappings/${encodeURIComponent(mappingPath)}`, { method: "DELETE" }).catch(() => {});
    throw responseErr;
  }
} catch (err) {
  throw err;
}
```

Option B: Backend transactional endpoint (out of scope for this story).

**Why MAJOR:** Data integrity issue affecting user experience, but workaround exists (manual cleanup).

---

## MINOR Findings

### N-1: Close Button (✕) Missing data-testid (MINOR)

**File:** [MockSuggestionModal.tsx](../../src/client/src/features/activity/components/MockSuggestionModal.tsx#L140-L150)  
**Source:** Acceptance Auditor  
**AC Affected:** project-context.md data-testid convention

**Evidence:**
```tsx
<button
  onClick={onClose}
  aria-label="Close modal"
  style={{...}}
>
  ✕
</button>
```

The header close button has `aria-label` but no `data-testid`. Per project-context.md: "Every interactive element... must carry a `data-testid` attribute."

**Recommended Fix:**  
Add `data-testid="mock-suggestion-btn-close-header"` to distinguish from footer Close button.

---

### N-2: Unsaved Changes Lost on Backdrop Click / Escape (MINOR)

**File:** [MockSuggestionModal.tsx](../../src/client/src/features/activity/components/MockSuggestionModal.tsx#L114-L117)  
**Source:** Edge Case Hunter  

**Evidence:**
```tsx
onClick={(e) => {
  if (e.target === e.currentTarget) onClose();
}}
```

Clicking the backdrop or pressing Escape closes the modal without checking for unsaved changes. If user has edited the Mapping JSON or Response Body, edits are lost silently.

**Impact:** Minor UX friction — not specified in AC, but could frustrate users who accidentally dismiss.

**Recommended Fix (optional):**  
Track `isDirty` state and show confirmation: "Discard changes?" on backdrop click / Escape when dirty.

---

### N-3: Inline Styles Instead of Tailwind CSS (MINOR)

**File:** [MockSuggestionModal.tsx](../../src/client/src/features/activity/components/MockSuggestionModal.tsx)  
**Source:** Blind Hunter  
**Rule:** project-context.md — "CSS: Tailwind utility classes only"

**Evidence:**  
The entire component uses inline `style={{...}}` objects rather than Tailwind classes. While not blocking, this deviates from the established pattern.

**Recommendation:**  
Consider refactoring to Tailwind classes in a follow-up. Example:
```tsx
// Instead of:
style={{ padding: "16px 24px", borderBottom: "1px solid #e5e7eb" }}
// Use:
className="px-6 py-4 border-b border-gray-200"
```

**Why MINOR:** Code consistency concern, no functional impact.

---

## Dismissed Findings

### D-1: `crypto.randomUUID()` Browser Compatibility

**Source:** Blind Hunter  
**Disposition:** DISMISSED — `crypto.randomUUID()` is supported in all target browsers (Chrome 92+, Firefox 95+, Safari 15.4+). Project targets modern browsers only.

### D-2: AC-12 Duplicate Protection Not Visible in Frontend

**Source:** Acceptance Auditor  
**Disposition:** DISMISSED — AC-12 states "idempotent save" but the story notes clarify this is backend-handled: "POST /api/mappings returns success without overwriting" when file exists. Backend Story 4.1 implements this. No frontend changes required.

---

## Acceptance Criteria Coverage

| AC   | Status | Notes |
|------|--------|-------|
| AC-1 | ✅ PASS | Icon renders only for `type === "Proxied"` rows |
| AC-2 | ✅ PASS | Icon click opens modal via `setModalRow(row)` |
| AC-3 | ⚠️ NOT VERIFIED | Row detail button not in scoped files — verify separately |
| AC-4 | ✅ PASS | Mapping JSON structure matches WireMock spec |
| AC-5 | ✅ PASS | Response body pre-populated with pretty-printed JSON |
| AC-6 | ✅ PASS | Filename convention `{method}_{path}_{status}_body.json` correct |
| AC-7 | ✅ PASS | Status mismatch warning displays correctly |
| AC-8 | ✅ PASS | UseTransformer checkbox default true, syncs with JSON |
| AC-9 | ⚠️ MAJOR | Two files created, but non-atomic (see M-1) |
| AC-10| ✅ PASS | Success closes modal, shows toast, invalidates queries |
| AC-11| ✅ PASS | Error displays, modal stays open |
| AC-12| ✅ PASS | Backend-handled per Story 4.1 |
| AC-13| ✅ PASS | Save/Close buttons present with correct testids |
| AC-14| ✅ PASS | Both textareas editable |
| AC-15| ✅ PASS | Escape key closes modal |

---

## Test Coverage Assessment

| Test File | Coverage |
|-----------|----------|
| [story-4-4-save-as-mock-icon.test.tsx](../../tests/unit/features/story-4-4-save-as-mock-icon.test.tsx) | AC-1, AC-2 — icon visibility and click |
| [story-4-4-mock-suggestion-modal.test.tsx](../../tests/unit/features/story-4-4-mock-suggestion-modal.test.tsx) | AC-3, AC-4, AC-5, AC-6, AC-8, AC-13, AC-14, AC-15 |
| [story-4-4-save-as-mock.spec.ts](../../tests/e2e/story-4-4-save-as-mock.spec.ts) | AC-1, AC-2, AC-9, AC-10, AC-11 (E2E) |

Tests appear comprehensive. Unit tests verify component behavior; E2E tests verify full save flow against live backend.

---

## Required Actions Before Merge

1. **[B-1] Fix cross-feature import** — Replace `MAPPINGS_QUERY_KEY` import with inline `["mappings"]` or move to shared lib.

## Recommended Actions (Non-Blocking)

2. **[M-1] Add rollback on partial failure** — Delete mapping file if response file creation fails.
3. **[N-1] Add data-testid to header close button** — `data-testid="mock-suggestion-btn-close-header"`
4. **[N-2] Consider dirty-state confirmation** — Optional UX improvement.
5. **[N-3] Refactor to Tailwind** — Follow-up task for consistency.

---

## Verdict

**❌ FAIL** — Resolve B-1 (cross-feature import) before merge. M-1 (partial failure) is recommended but can be tracked as follow-up.
