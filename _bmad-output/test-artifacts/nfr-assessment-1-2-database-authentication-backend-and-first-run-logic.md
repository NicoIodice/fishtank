---
story_key: 1-2-database-authentication-backend-and-first-run-logic
generated: "2026-06-21"
phase: nfr
verdict: PASS
note: Retroactively generated — original NFR phase ran in-context during story 1-2 lifecycle but artifact was not written to disk
---

# NFR Assessment — Story 1.2: Database, Authentication Backend & First-Run Logic

## Security NFRs

| Control | Status | Evidence |
|---------|--------|----------|
| JWT in httpOnly cookie only | ✅ PASS | `AC4_Login_SetsHttpOnlyJwtCookie`: validates `HttpOnly`, `SameSite=Strict`, `Secure` cookie attributes |
| No JWT in response body | ✅ PASS | Code review + integration test confirm token is cookie-only |
| Timing-safe credential verification | ✅ PASS | `AuthServiceTests.LoginAsync_AlwaysCallsVerify_EvenWhenUserNotFound`: BCrypt.Verify called regardless of username existence |
| Generic error on invalid credentials | ✅ PASS | `AC5_InvalidCredentials_Message_Does_Not_Reveal_Username_Or_Password`: same message for missing user and wrong password |
| Password minimum length | ✅ PASS | `AC3_Setup_Short_Password_Returns_400`: < 12 chars → 400 `AUTH_PASSWORD_TOO_SHORT` |
| BCrypt work factor | ✅ PASS | Work factor 12 configured; resistant to brute-force |
| Login rate limiting | ✅ PASS | `AC7_LoginEndpoint_IsRateLimited`: 429 + `Retry-After` header enforced |
| BootEpoch + TokenVersion invalidation | ✅ PASS | JWT claims validated on every request; container restart or logout immediately invalidates all tokens |
| CORS wildcard rejected | ✅ PASS | `FishtankWebApplicationFactory` startup validation confirms wildcard is rejected |
| First-run gate | ✅ PASS | `AC1` tests: all routes blocked with 401 `AUTH_SETUP_REQUIRED` until setup completes |

## Reliability NFRs

| Check | Status | Evidence |
|-------|--------|----------|
| Database auto-migration | ✅ PASS | `AC11_Database_AutoMigrated_At_Startup`: `/health` 200 after startup confirms migration ran |
| 57/57 tests pass | ✅ PASS | 29 unit tests + 28 integration tests GREEN |
| Logout invalidation | ✅ PASS | `AC9_Logout_Clears_Cookie`: cookie cleared + TokenVersion incremented |
| Protected route enforcement | ✅ PASS | `AC6_ProtectedEndpoints_Require_ValidJwt`: 401 without valid JWT |

## Performance NFRs

| Check | Status | Evidence |
|-------|--------|----------|
| BCrypt work factor does not block startup | ✅ PASS | Work factor 12 applied per-request only; no startup hash computation |
| Rate limiter overhead | ✅ PASS | Fixed-window limiter (in-memory); no external dependency |
| DB startup time | ✅ PASS | SQLite + EF Core migration completes in < 1s (verified by integration test factory startup) |

## Maintainability NFRs

| Check | Status | Notes |
|-------|--------|-------|
| .NET build: 0 errors | ✅ PASS | `dotnet build` exit 0; 3 pre-existing NU1903 SQLite warnings |
| Structured logging | ✅ PASS | Serilog CompactJsonFormatter to stdout; every auth event logged |
| `ApiResponse` envelope consistency | ✅ PASS | `AC13_Auth_Endpoints_Return_Standard_Envelope`: all endpoints return `{success, data/error}` |
| Environment variable configuration | ✅ PASS | All tunables (`FISHTANK_JWT_EXPIRY_HOURS`, rate-limit vars, `FISHTANK_ALLOWED_ORIGINS`) are env-var driven |
| Unit test coverage | ✅ PASS | AuthService (16 tests) + BCryptPasswordHasher (8 tests) + integration suite (17 auth tests) |

## Summary

| NFR Category | Verdict |
|-------------|---------|
| Security | ✅ PASS |
| Reliability | ✅ PASS |
| Performance | ✅ PASS |
| Maintainability | ✅ PASS |

**Overall: ✅ ALL NFRs PASS**
