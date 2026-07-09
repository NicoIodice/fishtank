---
story_id: "4.4"
story_key: "4-4-save-as-mock-mock-suggestion-modal"
epic: 4
story_title: "Save As Mock — Mock Suggestion Modal"
status: ready-for-dev
priority: high
frs_covered:
  - FR-14 (User can initiate "Save as Mock" from any proxied request row or its detail panel, opening the Mock Suggestion modal. "Save as Mock" action shown only on proxied rows. Successful save writes Mapping and Response files to disk, updates folder tree, and closes the detail. Write failure creates a System Event; modal remains open.)
  - FR-15 (Mock Suggestion modal presents an editable Mapping JSON block — WireMock format: WildcardMatcher, method, BodyAsFile, UseTransformer: true — and an editable Response body block pre-populated from the proxied request. User can modify either before saving.)
ux_drs_covered:
  - UX-DR11 (Actions column icons — bi-eye always, bi-lightning-charge proxied rows only)
  - UX-DR9 (icon button styling for Save as Mock action)
nfrs_addressed:
  - NFR-8 (All API endpoints require authentication — mock save endpoint is protected)
  - NFR-15 (Destructive actions require confirmation — not applicable here; saving creates new files, does not overwrite without confirmation)
architecture_items:
  - POST /api/mappings for file creation — already established in Story 4.1
  - Mappings folder tree refresh via queryClient.invalidateQueries([["mappings"]]) after successful save
  - System Events integration on write failure (error path)
risk_links:
  - R-E4-004 (File write failure surfacing — write failure creates System Event AND shows error in modal)
---

# Story 4.4: Save As Mock — Mock Suggestion Modal

## Story

**As a** developer,
**I want** to save any proxied request as a permanent WireMock mapping directly from the activity log,
**So that** I can build my mock library from real API traffic without writing JSON by hand.

---

## Status

ready-for-dev

---

## Context

### Background

Epic 4 delivers the file management and mock-capture layer for Fishtank. **Story 4.1 (done)** shipped the backend file CRUD infrastructure: `POST /api/mappings`, `PUT /api/mappings/{path}`, `DELETE /api/mappings/{path}`, `ResyncService`, and `IFileWatcher` abstraction. **Story 4.2 (done)** built the Mappings file explorer and dual-mode editor with unsaved change tracking. **Story 4.3 (done)** added the Resync button, toast feedback, and conflict banners.

**Story 4.4 (this story)** enables users to save any proxied request as a permanent WireMock mapping via the Mock Suggestion modal. This is triggered from the `bi-lightning-charge` action icon in the Network Activity table or from the "Save as Mock" button in row detail (Modal, Right Drawer, or Bottom Panel).

### Scope Boundaries Within Epic 4

- **This story (4.4):** Mock Suggestion modal, Save As Mock action icon, file generation logic, success/failure handling.
- **Story 4.5 (next):** Record mode — auto-promotes proxied requests using the same file generation logic; depends on this story's backend path.
- **Story 4.6:** Sign-out protection — generalizes navigation guard; no direct dependency.

### What Exists (consumable now — shipped by Stories 3.4, 4.1, 4.2, 4.3)

**Activity Row Detail (Story 3.4):**
- Row detail opens in user's preferred style: Modal, Right Drawer, or Bottom Panel.
- Proxied rows display "Save as Mock" button placeholder (`bi-lightning-charge`) — currently a no-op stub.
- `src/client/src/features/activity/components/RowDetailModal.tsx` (and corresponding Drawer/Panel components) render the detail.
- Full request/response data available in the detail view: method, URL path, headers, body, response status, response body.

**Activity Table (Story 3.2):**
- `src/client/src/features/activity/components/ActivityTable.tsx` renders the table.
- Actions column renders `bi-eye` (view detail) for all rows.
- `bi-lightning-charge` "Save as Mock" action should appear ONLY for proxied rows (FR-14) — currently not rendered.

**Backend File CRUD (Story 4.1):**
- `POST /api/mappings` creates a new file on disk. Body: `{ path: string, content: string }`.
- Returns `201` on success; `400`/`500` on failure with error code `MAPPING_*`.
- Write failures create System Event entries.
- Files are created in the service's `mappings/` or `responses/` directory based on path.

**Mappings Folder Tree (Story 4.2):**
- `GET /api/mappings` returns the folder tree.
- `queryClient.invalidateQueries([["mappings"]])` refreshes the tree.

**Activity Log Store:**
- Each activity row has a unique `id` (GUID).
- Proxied rows contain: `method`, `urlPath`, `requestHeaders`, `requestBody`, `responseStatus`, `responseHeaders`, `responseBody`, `serviceId`, `serviceName`, `serviceSlug`, `type` (`"proxied"` | `"mocked"`).

### What This Story Adds

1. **`bi-lightning-charge` action icon** in the Activity table Actions column — visible ONLY for proxied rows.
2. **Mock Suggestion modal** — two editable blocks: Mapping JSON and Response Body.
3. **Auto-generated Mapping JSON** — WildcardMatcher on path, method, BodyAsFile reference, UseTransformer checkbox.
4. **Auto-generated Response filename** — `{method}_{path-slugified}_{status}_body.json`.
5. **Save action** — writes two files via `POST /api/mappings`: one `.json` Mapping in `mappings/`, one `_body.json` Response in `responses/`.
6. **Success behavior** — closes modal AND originating row detail, refreshes folder tree, shows brief toast.
7. **Failure behavior** — modal stays open, shows error message, creates System Event.
8. **Duplicate protection** — idempotent save (same suggestion ID returns existing file path).

---

## Acceptance Criteria

### AC-1: Save as Mock action visible only on proxied rows (FR-14)
**Given** the Network Activity table,
**When** a row has `type === "proxied"`,
**Then** the Actions column renders `bi-lightning-charge` with `data-testid="activity-btn-save-as-mock-{rowId}"`, `aria-label="Save as Mock"`, and brand color styling.
**And** when a row has `type === "mocked"`, the `bi-lightning-charge` icon is NOT rendered — only `bi-eye` (view detail) appears.

### AC-2: Save as Mock action opens Mock Suggestion modal (FR-14)
**Given** a proxied request row,
**When** `bi-lightning-charge` is clicked,
**Then** the Mock Suggestion modal (`data-testid="mock-suggestion-modal"`) opens pre-populated with the request data.

### AC-3: Save as Mock from row detail opens modal (FR-14)
**Given** row detail is open for a proxied request (Modal, Right Drawer, or Bottom Panel),
**When** the "Save as Mock" button is clicked,
**Then** the Mock Suggestion modal opens pre-populated with the same request data.

### AC-4: Mapping JSON block pre-populated (FR-15)
**Given** the Mock Suggestion modal is open,
**Then** the Mapping section displays a label "Mapping" and an editable `<textarea>` (`data-testid="mock-suggestion-mapping-json"`) with monospace font and lightweight syntax highlighting (e.g., Prism.js — NOT full CodeMirror).
**And** the JSON is auto-generated with this structure:
```json
{
  "Guid": "<newly-generated-uuid>",
  "Request": {
    "Path": {
      "Matchers": [
        { "Name": "WildcardMatcher", "Pattern": "<urlPath>" }
      ]
    },
    "Methods": [ "<HTTP_METHOD>" ]
  },
  "Response": {
    "StatusCode": <proxied_status_code>,
    "BodyAsFile": "../responses/<method>_<path-slugified>_<status>_body.json",
    "UseTransformer": true
  }
}
```

### AC-5: Response Body block pre-populated (FR-15)
**Given** the Mock Suggestion modal is open,
**Then** the Response Body section displays a label "Response Body — `{filename}`" where filename = `{method}_{path-slugified}_{status}_body.json`, and an editable `<textarea>` (`data-testid="mock-suggestion-response-body"`) with monospace font and syntax highlighting.
**And** the content is the raw proxied response body (pretty-printed if valid JSON).

### AC-6: Default Response filename convention (FR-15)
**Given** the auto-generated Response filename,
**Then** it follows: `{method}_{path-slugified}_{status}_body.json`
- `{method}` = lowercase HTTP method (e.g., `post`, `get`)
- `{path-slugified}` = URL path with `/` replaced by `_`, leading underscore removed, lowercased, max 64 chars truncated
- `{status}` = proxied response status code (e.g., `200`, `500`)

**Example:** `POST /api/v1/users/123` with `500` response → `post_api_v1_users_123_500_body.json`

### AC-7: Status mismatch inline note (FR-15)
**Given** the user edits `Response.StatusCode` in the Mapping JSON to a value different from the original proxied status,
**Then** a non-blocking inline note (`data-testid="mock-suggestion-status-warning"`) appears below the footer: "Filename reflects the original proxied status (`{originalStatus}`). Consider renaming after saving if the response status has changed."
**And** this does NOT block the Save action.

### AC-8: UseTransformer checkbox (FR-15)
**Given** the Mock Suggestion modal,
**Then** a checkbox (`data-testid="mock-suggestion-use-transformer"`) labeled "Enable WireMock response templating" appears above the footer.
**And** it is checked by default (`UseTransformer: true` in JSON).
**When** unchecked, `Response.UseTransformer` is set to `false` in the Mapping JSON.

### AC-9: Save success writes two files (FR-14)
**Given** the Save button is clicked and both `POST /api/mappings` calls succeed,
**Then:**
1. A Mapping file is created at `{serviceSlug}/mappings/{method}_{path-slugified}_{status}.json` with the edited Mapping JSON.
2. A Response file is created at `{serviceSlug}/responses/{method}_{path-slugified}_{status}_body.json` with the Response Body content.

### AC-10: Save success closes modal and row detail (FR-14)
**Given** Save succeeds,
**Then:**
1. The Mock Suggestion modal closes.
2. The originating row detail (Modal, Right Drawer, or Bottom Panel) also closes.
3. A brief success toast appears: "Mock saved." — auto-dismisses after 2s.
4. `queryClient.invalidateQueries([["mappings"]])` is called to refresh the folder tree.

### AC-11: Write failure handling (FR-14, FR-22, R-E4-004)
**Given** `POST /api/mappings` fails (disk error, permission denied, path conflict),
**Then:**
1. A System Event entry is created by the backend (already handled by Story 4.1).
2. The modal stays open.
3. An inline error message appears above the footer: "Failed to save mock — {reason}. Check System Events for details."
4. The Save button remains enabled for retry.

### AC-12: Duplicate save is idempotent (Architecture)
**Given** the same proxied request is saved multiple times,
**When** the generated filename already exists in the target directory,
**Then:**
- If the existing file was created from the same source request ID → return success without overwriting, show toast "Mock already saved."
- If the existing file has a different origin → append a numeric suffix to the filename (e.g., `post_api_users_200_body_1.json`) and save as a new file.

### AC-13: Modal footer actions (FR-14)
**Given** the Mock Suggestion modal,
**Then** the footer contains:
- "Save" button (`data-testid="mock-suggestion-btn-save"`) — primary action, initiates save.
- "Close" button (`data-testid="mock-suggestion-btn-close"`) — secondary action, closes modal without saving.

### AC-14: Both blocks editable (FR-15)
**Given** the Mock Suggestion modal,
**Then** both the Mapping JSON and Response Body blocks are fully editable before saving.
**And** JSON syntax errors in the Mapping block show inline validation (red border) but do NOT block Save — the backend handles validation.

### AC-15: Modal closes on Escape key (UX)
**Given** the Mock Suggestion modal is open,
**When** the Escape key is pressed,
**Then** the modal closes (same as clicking Close).

### AC-16: Row detail "Save as Mock" button placement (EXPERIENCE.md)
**Given** row detail is open in Bottom Panel style,
**Then** the "Save as Mock" button is pinned at the top-right of the panel header, immediately left of the Close (✕) button.
**Given** row detail is open in Modal or Right Drawer style,
**Then** the "Save as Mock" button appears in the footer actions, left of the Close button.

---

## Technical Requirements

### File Paths

**Mapping file:** `{serviceSlug}/mappings/{method}_{path-slugified}_{status}.json`
**Response file:** `{serviceSlug}/responses/{method}_{path-slugified}_{status}_body.json`

**Path resolution:** `BodyAsFile` in the Mapping JSON uses relative path `../responses/...` — WireMock.NET resolves this relative to the directory containing the mapping file (`mappings/` → up one level to service root → into `responses/`).

### API Calls

**Create Mapping file:**
```http
POST /api/mappings
Content-Type: application/json
Authorization: (JWT cookie)

{
  "path": "{serviceSlug}/mappings/{filename}.json",
  "content": "{mappingJsonString}"
}
```

**Create Response file:**
```http
POST /api/mappings
Content-Type: application/json
Authorization: (JWT cookie)

{
  "path": "{serviceSlug}/responses/{filename}_body.json",
  "content": "{responseBodyString}"
}
```

### Service Context

The service is identified from the activity row's `serviceId` / `serviceSlug`. This determines the target directory for the saved files.

### Syntax Highlighting

Use a lightweight syntax highlighter (Prism.js or similar) for the modal textareas — NOT the full CodeMirror instance used in the Mappings file editor. This keeps the modal bundle size smaller and provides sufficient highlighting for review/edit purposes.

---

## Dev Notes

### What to Use from Previous Stories

**From Story 3.4 (Row Detail):**
- `RowDetailModal.tsx`, `RowDetailDrawer.tsx`, `RowDetailBottomPanel.tsx` — add the "Save as Mock" button to these components. Currently a no-op stub.
- Activity row data structure is already typed and available.

**From Story 4.1 (Mappings Backend):**
- `POST /api/mappings` endpoint handles file creation with proper error handling and System Event creation.
- Import `features/mappings/hooks/useMappingMutations.ts` → `useCreateMapping()` mutation.

**From Story 4.2 (Mappings UI):**
- `queryClient.invalidateQueries([["mappings"]])` refreshes the folder tree after save.
- Existing file structure patterns in `features/mappings/types/mappings.ts`.

**From Story 4.3 (Toast/Feedback):**
- `useToast()` hook for showing success/error toasts.

### New Components to Create

1. `src/client/src/features/activity/components/MockSuggestionModal.tsx` — the modal component with both editable blocks.
2. `src/client/src/features/activity/hooks/useSaveAsMock.ts` — React Query mutation hook that calls `POST /api/mappings` twice (mapping + response files).
3. `src/client/src/features/activity/utils/mockSuggestionGenerator.ts` — generates the default Mapping JSON and Response filename from activity row data.

### Path Slugification Logic

```typescript
function slugifyPath(urlPath: string): string {
  return urlPath
    .toLowerCase()
    .replace(/^\//, '')      // remove leading slash
    .replace(/\//g, '_')     // replace slashes with underscores
    .replace(/[^a-z0-9_]/g, '') // remove non-alphanumeric except underscore
    .substring(0, 64);       // truncate to 64 chars
}

function generateFilename(method: string, urlPath: string, status: number): string {
  const slugged = slugifyPath(urlPath);
  return `${method.toLowerCase()}_${slugged}_${status}`;
}
```

### Mapping JSON Generation

```typescript
function generateMappingJson(row: ActivityRow): string {
  const mapping = {
    Guid: crypto.randomUUID(),
    Request: {
      Path: {
        Matchers: [{ Name: "WildcardMatcher", Pattern: row.urlPath }]
      },
      Methods: [row.method]
    },
    Response: {
      StatusCode: row.responseStatus,
      BodyAsFile: `../responses/${generateFilename(row.method, row.urlPath, row.responseStatus)}_body.json`,
      UseTransformer: true
    }
  };
  return JSON.stringify(mapping, null, 2);
}
```

### Error Handling

If the first file (mapping) writes successfully but the second (response) fails:
- The mapping file remains on disk (partial state).
- The error message should indicate which file failed.
- User can retry — the mutation should be idempotent and handle existing files gracefully.

### ARIA & Accessibility

- Modal must be focus-trapped.
- Escape key closes modal.
- "Save as Mock" icon buttons in the table must have `aria-label="Save as Mock"`.
- All form controls must have associated labels.

---

## Test Design Reference

**From test-design-epic-4.md (Story 4-4 section):**

| Test Level | Test Scenario | Priority |
|------------|---------------|----------|
| Component | `bi-lightning-charge` "Save as Mock" visible only on proxied rows | P0 |
| Component | "Save as Mock" not visible on Mocked rows | P1 |
| Component | Modal opens pre-populated with proxied request data | P0 |
| Component | Mapping JSON block: WildcardMatcher, method, BodyAsFile, UseTransformer: true | P1 |
| Component | Response body block pre-populated from proxied response | P1 |
| Component | Default Response filename: `{method}_{path-slugified}_{status}_body.json` | P1 |
| Component | Status mismatch shows non-blocking inline note | P2 |
| Component | UseTransformer checkbox toggles `Response.UseTransformer` value | P2 |
| Component | Both blocks have syntax highlighting (lighter than CodeMirror) | P2 |
| Integration | Save mock writes Mapping + Response files to disk | P0 |
| Integration | Duplicate save (same suggestion ID) returns existing file path — idempotent | P1 |
| E2E | Proxied row → Save as Mock → modal opens → Save → files on disk + folder tree updates | P0 |
| E2E | Save failure → System Event created + modal stays open with error | P1 |
| E2E | Row detail panel "Save as Mock" action opens modal | P1 |

**Total Test Count:** 14 | **Effort:** ~6–10 hours

---

## Tasks / Subtasks

- [ ] **Task 1: Add Save as Mock action icon to Activity table** (AC: 1)
  - [ ] 1.1 Update `ActivityTable.tsx` — render `bi-lightning-charge` in Actions column ONLY for `type === "proxied"` rows
  - [ ] 1.2 Add `data-testid="activity-btn-save-as-mock-{rowId}"` and `aria-label="Save as Mock"`
  - [ ] 1.3 Style icon with brand color per DESIGN.md

- [ ] **Task 2: Create Mock Suggestion Modal component** (AC: 2, 4, 5, 8, 13, 14, 15)
  - [ ] 2.1 Create `MockSuggestionModal.tsx` with two sections: Mapping JSON and Response Body
  - [ ] 2.2 Add lightweight syntax highlighting (Prism.js) to both textareas
  - [ ] 2.3 Add UseTransformer checkbox with default checked state
  - [ ] 2.4 Wire Escape key to close modal
  - [ ] 2.5 Implement focus trap for accessibility

- [ ] **Task 3: Implement mock suggestion generation logic** (AC: 4, 5, 6)
  - [ ] 3.1 Create `mockSuggestionGenerator.ts` with `generateMappingJson()` and `generateFilename()` functions
  - [ ] 3.2 Implement path slugification with truncation
  - [ ] 3.3 Generate WireMock-compatible Mapping JSON structure

- [ ] **Task 4: Create useSaveAsMock mutation hook** (AC: 9, 10, 11, 12)
  - [ ] 4.1 Create `useSaveAsMock.ts` mutation hook
  - [ ] 4.2 Call `POST /api/mappings` twice (mapping file + response file)
  - [ ] 4.3 Handle partial failure (first succeeds, second fails)
  - [ ] 4.4 Invalidate `["mappings"]` query on success
  - [ ] 4.5 Show success toast "Mock saved." on success

- [ ] **Task 5: Wire table icon click to open modal** (AC: 2)
  - [ ] 5.1 Add state for selected activity row in Activity page
  - [ ] 5.2 Render `MockSuggestionModal` when row selected for save-as-mock
  - [ ] 5.3 Pass row data to modal for pre-population

- [ ] **Task 6: Wire row detail "Save as Mock" button to open modal** (AC: 3, 16)
  - [ ] 6.1 Update `RowDetailModal.tsx` — wire "Save as Mock" button click
  - [ ] 6.2 Update `RowDetailDrawer.tsx` — wire "Save as Mock" button click
  - [ ] 6.3 Update `RowDetailBottomPanel.tsx` — wire "Save as Mock" button with correct placement (left of Close)

- [ ] **Task 7: Implement save success behavior** (AC: 10)
  - [ ] 7.1 Close Mock Suggestion modal on save success
  - [ ] 7.2 Close originating row detail (modal/drawer/panel) on save success
  - [ ] 7.3 Show brief toast "Mock saved."

- [ ] **Task 8: Implement save failure handling** (AC: 11)
  - [ ] 8.1 Display inline error message in modal footer
  - [ ] 8.2 Keep modal open for retry
  - [ ] 8.3 Verify System Event is created by backend (integration test)

- [ ] **Task 9: Add status mismatch warning** (AC: 7)
  - [ ] 9.1 Parse Mapping JSON to detect `Response.StatusCode` changes
  - [ ] 9.2 Display non-blocking inline note when status differs from original

- [ ] **Task 10: Unit and component tests** (Test Design)
  - [ ] 10.1 Test `bi-lightning-charge` renders only for proxied rows
  - [ ] 10.2 Test modal opens with correct pre-populated data
  - [ ] 10.3 Test filename generation edge cases
  - [ ] 10.4 Test UseTransformer checkbox toggles JSON value

- [ ] **Task 11: E2E tests** (Test Design)
  - [ ] 11.1 E2E: Full save flow from table action → modal → save → files on disk
  - [ ] 11.2 E2E: Save from row detail → modal closes both
  - [ ] 11.3 E2E: Save failure shows error, modal stays open

---

## Definition of Done

- [ ] All acceptance criteria verified
- [ ] Unit tests passing (vitest)
- [ ] Component tests passing (vitest + testing-library)
- [ ] E2E tests passing (Playwright)
- [ ] Code review completed
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Accessibility audit: modal focus trap, ARIA labels on action buttons
- [ ] Manual QA: test with proxied requests from live service

---

## Files to Create / Modify

### New Files
- `src/client/src/features/activity/components/MockSuggestionModal.tsx`
- `src/client/src/features/activity/hooks/useSaveAsMock.ts`
- `src/client/src/features/activity/utils/mockSuggestionGenerator.ts`

### Modified Files
- `src/client/src/features/activity/components/ActivityTable.tsx` — add `bi-lightning-charge` action for proxied rows
- `src/client/src/features/activity/components/RowDetailModal.tsx` — wire "Save as Mock" button
- `src/client/src/features/activity/components/RowDetailDrawer.tsx` — wire "Save as Mock" button
- `src/client/src/features/activity/components/RowDetailBottomPanel.tsx` — wire "Save as Mock" button
- `src/client/src/features/activity/pages/NetworkActivityPage.tsx` — add modal state management

---

## Related Documentation

- **PRD:** FR-14, FR-15 (Mock Suggestions & Recording section)
- **UX Design:** EXPERIENCE.md §Mock Suggestion modal
- **Architecture:** D2 Response Envelope, File CRUD patterns from Story 4.1
- **Test Design:** test-design-epic-4.md §Story 4-4

---

## Previous Story Learnings (from Story 4.3)

1. **Toast persistence patterns:** Error toasts persist until dismissed; success toasts auto-dismiss after 4s. For this story, use a brief 2s toast for "Mock saved." success.
2. **Folder tree refresh:** Call `queryClient.invalidateQueries([["mappings"]])` after successful file creation — pattern already established.
3. **System Events integration:** Backend automatically creates System Events on file write failures — no additional frontend work needed for that path.
4. **Modal close on success:** When a modal triggers successful save, close related modals/drawers automatically to reduce user cleanup.

---

## Story Ready Confirmation

✅ This story has all context required for implementation:
- Detailed acceptance criteria covering all FR-14/FR-15 requirements
- Technical implementation guidance with code examples
- Clear file structure and API contracts
- Test design reference with prioritized scenarios
- Previous story learnings incorporated
