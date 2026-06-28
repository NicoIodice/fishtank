# ATDD Checklist — Story 1.2: Database, Authentication Backend & First-Run Logic

**story_key**: `1-2-database-authentication-backend-and-first-run-logic`
**story_id**: `1.2`
**phase**: atdd
**mode**: Create
**date**: 2026-06-21
**note**: Retroactively generated — original ATDD phase ran in-context during story 1-2 lifecycle but artifact was not written to disk

---

## Phase Gate Status

| Gate | Status |
|------|--------|
| ≥1 acceptance test file in `src/Fishtank.Api.IntegrationTests/` | ✅ `Story1_2_AuthTests.cs` created |
| Tests reference story ACs | ✅ AC-1 through AC-13 + NFR-8, NFR-10, NFR-16 |
| .NET solution compiles cleanly | ✅ `dotnet build` exit 0 |
| Tests are RED against current (pre-auth) codebase | ✅ Confirmed failing before implementation |

---

## Scaffold File

`src/Fishtank.Api.IntegrationTests/Story1_2_AuthTests.cs`

---

## Tests Generated

| Test | AC | Description |
|------|----|-------------|
| `AC1_Before_Setup_Non_Permitted_Paths_Return_AuthSetupRequired` | AC-1 | All non-permitted routes return 401 `AUTH_SETUP_REQUIRED` before setup |
| `AC1_Permitted_Paths_Accessible_Before_Setup` | AC-1 | `/health`, `/api/auth/setup`, `/openapi*` are accessible before setup |
| `AC2_Setup_Creates_Admin_User_And_Returns_Cookie` | AC-2 | First-run setup creates admin and returns JWT cookie |
| `AC2_Setup_Second_Call_Returns_Conflict` | AC-2 | Second setup call returns 409 Conflict |
| `AC3_Setup_Short_Password_Returns_400` | AC-3 | Password < 12 chars → 400 `AUTH_PASSWORD_TOO_SHORT` |
| `AC4_Login_Returns_200_With_HttpOnly_Cookie` | AC-4 | Successful login returns 200 + httpOnly JWT cookie |
| `AC4_Login_SetsHttpOnlyJwtCookie` | AC-4 | Validates `fishtank_auth` cookie attributes (httpOnly, SameSite) |
| `AC5_Login_WrongPassword_Returns_Generic_Error` | AC-5 | Wrong password → generic error (no username/password enumeration) |
| `AC5_InvalidCredentials_Message_Does_Not_Reveal_Username_Or_Password` | AC-5 | Timing-safe error message regardless of username existence |
| `AC6_InvalidJwt_Returns_401` | AC-6 | Invalid/expired JWT → 401 |
| `AC6_ProtectedEndpoints_Require_ValidJwt` | AC-6 | Protected routes require valid JWT |
| `AC7_LoginEndpoint_IsRateLimited` | AC-7 | Login rate-limited; 429 + `Retry-After` on breach |
| `AC8_Login_Response_Includes_ForcePasswordChange_Field` | AC-8 | Login response includes `forcePasswordChange` field |
| `AC9_Logout_Clears_Cookie` | AC-9 | Logout clears `fishtank_auth` cookie |
| `AC10_User_Entity_HasRequired_Columns` | AC-10 | User schema has all required columns (via setup + login flow) |
| `AC11_Database_AutoMigrated_At_Startup` | AC-11 | DB auto-migrated at startup; `/health` returns 200 |
| `AC13_Auth_Endpoints_Return_Standard_Envelope` | AC-13 | All auth endpoints return `{success, data/error}` envelope |

**Unit tests also generated** (`src/Fishtank.Api.UnitTests/`):

| Test | AC | Description |
|------|----|-------------|
| `AuthServiceTests.SetupAsync_CreatesAdminUser_OnFirstCall` | AC-10 | Unit: admin user created correctly |
| `AuthServiceTests.SetupAsync_ReturnsPasswordTooShort_WhenPasswordUnder12Chars` | AC-3 | Unit: password length validation |
| `AuthServiceTests.LoginAsync_AlwaysCallsVerify_EvenWhenUserNotFound` | AC-5 | Unit: timing-attack prevention |
| + 13 additional AuthService unit tests | Various | BCrypt hasher, TokenVersion, ForcePasswordChange logic |

---

## AC Coverage Summary

| AC | Coverage | Method |
|----|----------|--------|
| AC-1 | ✅ FULL | `Story1_2_AuthTests.cs`: 2 tests |
| AC-2 | ✅ FULL | `Story1_2_AuthTests.cs`: 2 tests |
| AC-3 | ✅ FULL | Integration + Unit: `AuthServiceTests` |
| AC-4 | ✅ FULL | `Story1_2_AuthTests.cs`: 2 tests |
| AC-5 | ✅ FULL | Integration + Unit (timing-attack prevention) |
| AC-6 | ✅ FULL | `Story1_2_AuthTests.cs`: 2 tests |
| AC-7 | ✅ FULL | `Story1_2_AuthTests.cs`: rate-limit factory override |
| AC-8 | ✅ FULL | `Story1_2_AuthTests.cs`: field presence check |
| AC-9 | ✅ FULL | `Story1_2_AuthTests.cs`: cookie cleared |
| AC-10 | ✅ FULL | Integration + Unit |
| AC-11 | ✅ FULL | `Story1_2_AuthTests.cs` |
| AC-12 | ⚠️ PARTIAL | CORS enforcement — no explicit origin-blocked integration test; middleware behavior |
| AC-13 | ✅ FULL | `Story1_2_AuthTests.cs`: envelope structure validated |
| NFR-8 | ✅ FULL | Covered by AC-6 tests |
| NFR-10 | ✅ FULL | Covered by AC-7 rate-limit test |
| NFR-16 | ✅ FULL | Covered by AC-4 httpOnly cookie test |
