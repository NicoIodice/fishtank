# Good First Issues for Fishtank v1.0.0

This file contains templates for 5+ GitHub Issues to be created manually with the `good first issue` label. These issues are scoped, well-defined tasks suitable for first-time contributors.

**Instructions:** After v1.0.0 release, create these issues manually in the GitHub repository issue tracker. Each issue should be labeled with `good first issue` plus the relevant area label(s).

---

## Issue 1: [Docs] Add API endpoint examples to OpenAPI descriptions

**Title:** Add example request/response payloads to OpenAPI spec

**Description:**

The OpenAPI spec at `/openapi/v1.json` and `docs/openapi.json` contains all API endpoints, but most operations lack `example` fields for request bodies and responses.

**Task:**
Add realistic example payloads to improve API documentation and interactive API explorers (Swagger UI, Redoc).

**Scope:**
- Update `docs/openapi.json` to add `example` fields to:
  - Request body schemas (e.g., `POST /api/auth/login`, `POST /api/services`)
  - Response schemas (e.g., `GET /api/services`, `GET /api/activity`)
- Use realistic data (e.g., service names like "payments-api", mock port numbers like 30100)
- Follow OpenAPI 3.0 specification for examples

**Acceptance Criteria:**
- At least 5 API operations have `example` fields in request/response schemas
- Examples are valid JSON matching the schema types
- Running API serves updated spec at `/openapi/v1.json`

**Labels:** `good first issue`, `documentation`

**Estimated effort:** 1-2 hours

**Helpful resources:**
- OpenAPI 3.0 Examples: https://swagger.io/docs/specification/adding-examples/
- Existing spec: `docs/openapi.json`

---

## Issue 2: [Frontend] Add loading skeleton to Services page

**Title:** Replace spinner with skeleton loader on Services page

**Description:**

The Services page (`/services`) currently shows a spinning loader while fetching services. Replace this with skeleton cards that match the final card layout for a smoother perceived performance.

**Task:**
Create skeleton placeholders that animate while data loads, then smoothly transition to real service cards.

**Scope:**
- Update `src/client/src/pages/Services.tsx`
- Use shadcn/ui Skeleton component or create custom skeleton cards
- Show 3 skeleton cards during loading
- Match the card dimensions and spacing of real service cards

**Acceptance Criteria:**
- Loading state shows 3 skeleton cards instead of spinner
- Skeleton cards animate (shimmer or pulse effect)
- Transition from skeleton to real cards is smooth (no flash or jump)
- Works on mobile and desktop layouts

**Labels:** `good first issue`, `frontend`, `enhancement`

**Estimated effort:** 2-3 hours

**Helpful resources:**
- shadcn/ui Skeleton: https://ui.shadcn.com/docs/components/skeleton
- Current implementation: `src/client/src/pages/Services.tsx`

---

## Issue 3: [Frontend] Add keyboard shortcut for global search

**Title:** Implement Ctrl+K / Cmd+K global search shortcut

**Description:**

Add a keyboard shortcut (Ctrl+K on Windows/Linux, Cmd+K on macOS) to open the global search modal from anywhere in the app, similar to VS Code's command palette.

**Task:**
Implement a global keyboard listener that opens the search modal when the user presses Ctrl+K (or Cmd+K on macOS).

**Scope:**
- Add keyboard event listener in `src/client/src/App.tsx` or layout component
- Detect Ctrl+K / Cmd+K (platform-aware)
- Open the search modal (if one exists; otherwise, focus the search input in navigation)
- Prevent default browser behavior (Ctrl+K normally opens browser address bar in some browsers)

**Acceptance Criteria:**
- Pressing Ctrl+K (Windows/Linux) or Cmd+K (macOS) triggers search
- Works on all pages (global listener)
- Does not conflict with existing keyboard shortcuts
- Focus is set to the search input after opening

**Labels:** `good first issue`, `frontend`, `enhancement`

**Estimated effort:** 2-3 hours

**Helpful resources:**
- React keyboard events: https://react.dev/learn/responding-to-events
- Platform detection: `navigator.platform` or use a library like `react-hotkeys-hook`

---

## Issue 4: [Backend] Add request body size to activity log

**Title:** Include request content length in activity log entries

**Description:**

The activity log currently captures HTTP method, path, status code, and duration. Add the request body size (content length) to help diagnose issues with large payloads.

**Task:**
Add a `ContentLength` field to activity log entries and populate it from the incoming HTTP request.

**Scope:**
- Update `ActivityLogEntry` model in `src/Fishtank.Api/Models/ActivityLogEntry.cs` to add `long? ContentLength { get; set; }`
- Capture `HttpContext.Request.ContentLength` in activity logging middleware
- Update activity log display in frontend to show content length (optional, not required for this issue)

**Acceptance Criteria:**
- Activity log entries include `ContentLength` field
- Value is captured from `HttpContext.Request.ContentLength`
- NULL for requests with no body (GET, DELETE without body)
- Activity log API returns `contentLength` in JSON responses
- Existing activity log entries (before this change) have NULL content length

**Labels:** `good first issue`, `backend`, `enhancement`

**Estimated effort:** 1-2 hours

**Helpful resources:**
- Activity logging: Search for `ActivityLog` in `src/Fishtank.Api/`
- HttpContext reference: https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.http.httpcontext

---

## Issue 5: [Docs] Document all error codes in README

**Title:** Add error code reference table to README

**Description:**

The API returns structured error responses with error codes (e.g., `INVALID_CREDENTIALS`, `SERVICE_NAME_TAKEN`). Document all error codes in the README so users understand what each code means.

**Task:**
Create an error code reference table in README.md listing all error codes with descriptions and example scenarios.

**Scope:**
- Search codebase for all error codes returned by the API
- Create a new "Error Codes" section in `README.md`
- Document each error code with:
  - Code string
  - HTTP status code
  - Description
  - Example scenario

**Acceptance Criteria:**
- "Error Codes" section exists in README.md
- At least 10 error codes documented
- Table format: Code | HTTP Status | Description | Example
- All error codes found in `src/Fishtank.Api/` are included

**Labels:** `good first issue`, `documentation`

**Estimated effort:** 2-3 hours

**Helpful resources:**
- Search for error codes: `git grep "new ProblemDetails" src/Fishtank.Api/`
- ProblemDetails RFC: https://datatracker.ietf.org/doc/html/rfc7807

---

## Issue 6 (Bonus): [Backend] Add health check endpoint details

**Title:** Expand /health endpoint to include service status details

**Description:**

The `/health` endpoint currently returns a simple "Healthy" string. Expand it to return a JSON response with detailed status of SQLite database, WireMock processes, and disk space.

**Scope:**
- Return JSON structure: `{ status: "Healthy", checks: { database: "OK", services: "OK", diskSpace: "OK" } }`
- Check SQLite connection (simple query)
- Check running WireMock process count
- Check available disk space for `/data` volume

**Acceptance Criteria:**
- `/health` returns JSON (not plain text)
- Response includes individual component status
- Overall status is "Healthy" only if all checks pass
- If any check fails, return HTTP 503 and status "Degraded"

**Labels:** `good first issue`, `backend`, `enhancement`

**Estimated effort:** 3-4 hours

---

## Creating the issues

1. Go to https://github.com/NicoIodice/fishtank/issues/new
2. Copy the title and description from each template above
3. Add labels: `good first issue` + area label (`documentation`, `frontend`, `backend`)
4. Add to milestone: `v1.1.0` (or `Future` if no specific milestone exists)
5. Optionally add difficulty label: `E-easy`, `E-medium`
