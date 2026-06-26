# Test Automation Summary — Story 1-2: Database, Authentication Backend & First-Run Logic

**Date:** 2026-06-26
**Phase:** test-automate (retroactive reconstruction)
**Story:** `1-2-database-authentication-backend-and-first-run-logic`
**Test Suite Outcome:** Tests covering this story currently PASS as part of the Epic 1 / Epic 2 suite.

> **Note — retroactively reconstructed:** This per-story automation summary was reconstructed on **2026-06-26** from the test suite that exists in the repository today. The base `bmad-testarch-automate` skill wrote only a generic `automation-summary.md`, so no per-story artifact was persisted at the time Story 1-2 was automated. The coverage below reflects the *actual* tests on disk, not a historical snapshot.

---

## Acceptance-Criteria Coverage

| AC | Description | Test(s) | Layer | Status |
|----|-------------|---------|-------|--------|
| AC-1 | First-run gate: all endpoints except `/health` & `/api/auth/setup` → 401 `AUTH_SETUP_REQUIRED` | `Story1_2_AuthTests.FreshInstance_ProtectedEndpoint_Returns401_BeforeSetup`, `.FreshInstance_Health_Accessible_BeforeSetup`, `.FreshInstance_SetupEndpoint_Accessible_BeforeSetup` | Integration | FULL |
| AC-2 | `POST /api/auth/setup` creates admin, httpOnly JWT cookie; 409 on repeat | `.Setup_ValidCredentials_Returns200_AndSetsJwtCookie`, `.Setup_CalledTwice_Returns409`; unit `AuthServiceTests.SetupAsync_CreatesAdminUser_OnFirstCall`, `.SetupAsync_ReturnsAlreadySetup_WhenUserExists` | Integration + Unit | FULL |
| AC-3 | Password ≥12 chars else 400 `AUTH_PASSWORD_TOO_SHORT` | `.Setup_ShortPassword_Returns400_WithAuthPasswordTooShort`; unit `AuthServiceTests.SetupAsync_ReturnsPasswordTooShort_WhenPasswordUnder12Chars` (Theory ×3), `.ChangePasswordAsync_ReturnsPasswordTooShort_WhenUnder12Chars` | Integration + Unit | FULL |
| AC-4 | `POST /api/auth/login` valid creds → 200 + httpOnly `SameSite=Strict` JWT | `.Login_ValidCredentials_Returns200_AndSetsJwtCookie`; unit `AuthServiceTests.LoginAsync_ReturnsSuccess_WithValidCredentials` | Integration + Unit | FULL |
| AC-5 | Invalid creds → 401 generic message (no field revelation; timing-safe) | `.Login_WrongPassword_Returns401_GenericMessage`, `.Login_NonexistentUsername_Returns401_NoUsernameRevelation`; unit `AuthServiceTests.LoginAsync_ReturnsInvalidCredentials_WhenUserNotFound`, `.LoginAsync_AlwaysCallsVerify_EvenWhenUserNotFound`, `.LoginAsync_ReturnsInvalidCredentials_WhenInactiveUser` | Integration + Unit | FULL |
| AC-6 | JWT validation: valid cookie → proceeds; absent/bad → 401 (incl. `TokenVersion`) | `.ProtectedEndpoint_NoCookie_Returns401`, `.ProtectedEndpoint_WithValidCookie_Proceeds`, `.Me_NoCookie_Returns401_AuthUnauthorized`, `.Me_WithValidCookie_Returns200_WithUserData`; unit `AuthServiceTests.IssueJwt_ContainsExpectedClaims` (token_version, boot_epoch, role, sub) | Integration + Unit | FULL |
| AC-7 | Rate limiting → 429 + `Retry-After`; configurable via env vars | `.Login_ExceedingRateLimit_Returns429_WithRetryAfterHeader` (uses `LowRateLimitWebApplicationFactory`, 5 req/60s) | Integration | FULL |
| AC-8 | `forcePasswordChange` flag in login response; cleared on change-password | `.Login_Response_Includes_ForcePasswordChange_Field`; unit `AuthServiceTests.ChangePasswordAsync_ClearsForcePasswordChange` | Integration + Unit | PARTIAL (field presence + clear-on-change covered; `FISHTANK_ADMIN_PASSWORD`-unset → `true` path not exercised) |
| AC-9 | `POST /api/auth/logout` clears cookie, 200 | `.Logout_Returns200_AndClearsCookie`; unit `AuthServiceTests.LogoutAsync_IncrementsTokenVersion`, `.LogoutAsync_DoesNotThrow_WhenUserNotFound` | Integration + Unit | FULL |
| AC-10 | Users table schema (Id, Username, PasswordHash, Role, IsActive, CreatedAt, TokenVersion, ForcePasswordChange) | `.UsersTable_HasRequiredColumns_AfterMigration` (successful setup implies schema); unit `AuthServiceTests.SetupAsync_CreatesAdminUser_OnFirstCall` (asserts Role/IsActive/ForcePasswordChange defaults) | Integration + Unit | PARTIAL (column existence inferred via successful insert, not introspected directly) |
| AC-11 | EF Core auto-migrate at startup; structured Serilog error + non-zero exit on failure | `.App_StartsWith_AutoMigrate_HealthReturns200` | Integration | PARTIAL (happy path only; failure → Serilog log + non-zero exit not automated) |
| AC-12 | CORS: non-self origin rejected; `FISHTANK_ALLOWED_ORIGINS` permitted; wildcard rejected at startup | — | — | NONE (no automated CORS/startup-wildcard test found) |
| AC-13 | Standard response envelope on auth endpoints | `.AuthEndpoints_Return_StandardResponseEnvelope` (success/error/code/message fields) | Integration | FULL |

### Password-hashing security (supports AC-3/AC-4/AC-5)

`BCryptPasswordHasherTests` (8 tests) covers BCrypt format, work factor 12, salt uniqueness, verify true/false, invalid hash, empty password:
`Hash_ReturnsNonEmptyString`, `Hash_ProducesBCryptFormat`, `Hash_UsesWorkFactor12`, `Hash_ReturnsDifferentHashEachCall`, `Verify_ReturnsTrueForMatchingPassword`, `Verify_ReturnsFalseForWrongPassword`, `Verify_ReturnsFalseForInvalidHash`, `Verify_ReturnsFalseForEmptyPassword`.

### JWT issuance (supports AC-6)

`AuthServiceTests.IssueJwt_*` (3 tests): claim payload, well-formed token when no expiry configured, expiry honoured when `FISHTANK_JWT_EXPIRY_HOURS` set.

---

## Test Counts per Suite

| Suite / File | Layer | Tests |
|--------------|-------|-------|
| `src/Fishtank.Api.IntegrationTests/Api/Story1_2_AuthTests.cs` | Integration (xUnit) | 19 |
| `src/Fishtank.Api.UnitTests/Services/AuthServiceTests.cs` | Unit (xUnit) | 18 methods (20 cases incl. Theory ×3) |
| `src/Fishtank.Api.UnitTests/Services/BCryptPasswordHasherTests.cs` | Unit (xUnit) | 8 |
| **Total automated tests directly tied to Story 1-2** | | **45 tests (47 cases incl. Theory expansion)** |

---

## Coverage Summary

- **FULL:** AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-9, AC-13 (9 ACs)
- **PARTIAL:** AC-8 (forced-change-on-unset-env path not exercised), AC-10 (schema inferred, not introspected), AC-11 (happy path only) (3 ACs)
- **NONE:** AC-12 (CORS policy + startup wildcard rejection) (1 AC)

---

## Gaps & Notes

- **AC-12 (CORS):** No automated test verifies that a non-self origin is rejected, that `FISHTANK_ALLOWED_ORIGINS` permits configured origins, or that a wildcard (`*`) origin throws at startup. This is the most significant uncovered AC for this story. Recommend an integration test issuing a cross-origin preflight, plus a startup-failure test for the wildcard guard.
- **AC-8 (forced password change):** The login response *field* and the *clear-on-change* behaviour are covered, but the scenario where `FISHTANK_ADMIN_PASSWORD` is unset and the default `admin` first login returns `forcePasswordChange: true` is not directly exercised (the test setup always supplies an explicit password).
- **AC-10 (schema introspection):** Column presence is asserted indirectly — a successful `POST /api/auth/setup` insert implies the columns exist. There is no direct schema/PRAGMA introspection test enumerating all eight columns.
- **AC-11 (migration failure path):** Only the success path (`/health` 200 after auto-migrate) is automated. The failure path — structured Serilog error with `{DbPath}`/`{Exception}` and non-zero process exit — is not covered by an automated test (hard to simulate under `WebApplicationFactory`).
- **Test infrastructure:** Integration tests use in-memory SQLite via `FishtankWebApplicationFactory` with per-test `ResetDatabaseAsync()`; unit tests use EF Core `UseInMemoryDatabase` (Guid-isolated) with a `FakePasswordHasher`. The rate-limit test uses a dedicated `LowRateLimitWebApplicationFactory` to avoid polluting the shared factory's rate-limiter state.
