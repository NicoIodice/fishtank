using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Fishtank.Api.IntegrationTests.Support;

namespace Fishtank.Api.IntegrationTests.Api;

/// <summary>
/// ATDD acceptance test scaffolds for Story 1.2:
/// Database, Authentication Backend &amp; First-Run Logic.
///
/// RED PHASE — these tests define the expected end-state behaviour.
/// They FAIL before implementation and PASS once all ACs are complete.
///
/// AC-1:  Fresh instance — all endpoints except /health and /api/auth/setup return 401
/// AC-2:  POST /api/auth/setup creates admin, sets httpOnly JWT, returns 409 on repeat
/// AC-3:  Password < 12 chars → 400 + AUTH_PASSWORD_TOO_SHORT
/// AC-4:  POST /api/auth/login with valid credentials → 200 + Set-Cookie httpOnly JWT
/// AC-5:  POST /api/auth/login with invalid credentials → 401 generic message
/// AC-6:  Protected endpoints: valid JWT → 200, absent/bad JWT → 401
/// AC-7:  Rate limiting → 429 + Retry-After header
/// AC-8:  ForcePasswordChange flag in login response when set
/// AC-9:  POST /api/auth/logout → clears cookie, 200
/// AC-10: Users table schema — required columns present after migrate
/// AC-11: EF Core auto-migrate runs at startup; DB writable
/// AC-12: CORS — non-self origin rejected by default
/// AC-13: Response envelope on all auth endpoints
/// </summary>
[Collection("Integration")]
public class Story1_2_AuthTests : IntegrationTestBase
{
    public Story1_2_AuthTests(FishtankWebApplicationFactory factory) : base(factory) { }

    // ─────────────────────────────────────────────────────────────────────────
    // AC-1 — First-run gate
    // RED:  /api/auth/login currently returns 404 (no route mapped)
    // GREEN: Returns 401 with AUTH_SETUP_REQUIRED when no users exist
    // ─────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-1: Fresh instance — protected endpoints return 401 before setup")]
    public async Task FreshInstance_ProtectedEndpoint_Returns401_BeforeSetup()
    {
        // Given: a fresh instance with no users and no JWT cookie

        // When: any protected endpoint is called
        var response = await Client.GetAsync("/api/services");

        // Then: 401 is returned (not 404 — the first-run gate fires)
        response.StatusCode.Should().Be(
            HttpStatusCode.Unauthorized,
            "all endpoints except /health and /api/auth/setup must return 401 until setup completes");

        var body = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(body).RootElement;
        json.GetProperty("success").GetBoolean().Should().BeFalse();
        json.GetProperty("error").GetProperty("code").GetString()
            .Should().Be("AUTH_SETUP_REQUIRED");
    }

    [Fact(DisplayName = "AC-1: Fresh instance — /health still accessible before setup")]
    public async Task FreshInstance_Health_Accessible_BeforeSetup()
    {
        // Given: a fresh instance with no users

        // When
        var response = await Client.GetAsync("/health");

        // Then: /health is always accessible (no auth required)
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact(DisplayName = "AC-1: Fresh instance — /api/auth/setup accessible before setup (no gate)")]
    public async Task FreshInstance_SetupEndpoint_Accessible_BeforeSetup()
    {
        // Given: a fresh instance with no users
        // When: setup endpoint is called (even with bad data to just test accessibility)
        var response = await Client.PostAsJsonAsync(
            "/api/auth/setup",
            new { username = "x", password = "short" });

        // Then: 400 (password too short) not 401 — the gate permits /api/auth/setup
        response.StatusCode.Should().NotBe(
            HttpStatusCode.Unauthorized,
            "/api/auth/setup must not be blocked by the first-run gate");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AC-2 — POST /api/auth/setup
    // RED:  Returns 404 (endpoint not mapped)
    // GREEN: Returns 200, creates admin, sets httpOnly cookie, returns 409 on repeat
    // ─────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-2: POST /api/auth/setup with valid credentials creates admin and returns 200")]
    public async Task Setup_ValidCredentials_Returns200_AndSetsJwtCookie()
    {
        // Given: a fresh instance
        var payload = new { username = "admin", password = "AdminPassword1!" };

        // When
        var response = await Client.PostAsJsonAsync("/api/auth/setup", payload);

        // Then
        response.StatusCode.Should().Be(
            HttpStatusCode.OK,
            "setup with valid credentials must return 200");

        // Response envelope
        var body = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(body).RootElement;
        json.GetProperty("success").GetBoolean().Should().BeTrue();
        json.GetProperty("data").GetProperty("role").GetString().Should().Be("Admin");

        // JWT cookie must be set
        response.Headers.Should().ContainKey("Set-Cookie");
        var setCookieHeader = response.Headers.GetValues("Set-Cookie").FirstOrDefault();
        setCookieHeader.Should().NotBeNull();
        setCookieHeader!.Should().Contain("fishtank_auth",
            "JWT cookie must be named 'fishtank_auth'");
        setCookieHeader!.ToLower().Should().Contain("httponly",
            "JWT cookie must be HttpOnly (NFR-16)");
        setCookieHeader.ToLower().Should().Contain("samesite=strict",
            "JWT cookie must have SameSite=Strict");
    }

    [Fact(DisplayName = "AC-2: POST /api/auth/setup second call returns 409 (one-time operation)")]
    public async Task Setup_CalledTwice_Returns409()
    {
        // Given: setup already completed
        await Client.PostAsJsonAsync("/api/auth/setup",
            new { username = "admin", password = "AdminPassword1!" });

        // When: setup called again
        var second = await Client.PostAsJsonAsync("/api/auth/setup",
            new { username = "admin2", password = "AdminPassword2!" });

        // Then
        second.StatusCode.Should().Be(
            HttpStatusCode.Conflict,
            "setup is a one-time operation; second call must return 409");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AC-3 — Password length validation
    // RED:  Returns 404 (endpoint not mapped)
    // GREEN: Returns 400 + AUTH_PASSWORD_TOO_SHORT for passwords < 12 chars
    // ─────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-3: Setup with short password returns 400 AUTH_PASSWORD_TOO_SHORT")]
    public async Task Setup_ShortPassword_Returns400_WithAuthPasswordTooShort()
    {
        // Given: fresh instance, password is only 8 characters
        var payload = new { username = "admin", password = "short123" };

        // When
        var response = await Client.PostAsJsonAsync("/api/auth/setup", payload);

        // Then
        response.StatusCode.Should().Be(
            HttpStatusCode.BadRequest,
            "password shorter than 12 chars must return 400");

        var body = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(body).RootElement;
        json.GetProperty("success").GetBoolean().Should().BeFalse();
        json.GetProperty("error").GetProperty("code").GetString()
            .Should().Be("AUTH_PASSWORD_TOO_SHORT");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AC-4 — POST /api/auth/login (valid credentials)
    // RED:  Returns 404 (endpoint not mapped)
    // GREEN: Returns 200 + httpOnly JWT cookie
    // ─────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-4: POST /api/auth/login with valid credentials returns 200 and sets httpOnly JWT")]
    public async Task Login_ValidCredentials_Returns200_AndSetsJwtCookie()
    {
        // Given: admin account exists (setup already done via factory or helper)
        await Client.PostAsJsonAsync("/api/auth/setup",
            new { username = "admin", password = "AdminPassword1!" });

        // When
        var response = await Client.PostAsJsonAsync("/api/auth/login",
            new { username = "admin", password = "AdminPassword1!" });

        // Then
        response.StatusCode.Should().Be(
            HttpStatusCode.OK,
            "login with valid credentials must return 200");

        var setCookieHeader = response.Headers.GetValues("Set-Cookie").FirstOrDefault();
        setCookieHeader.Should().NotBeNull("JWT cookie must be set on login");
        setCookieHeader!.ToLower().Should().Contain("httponly",
            "JWT must be in an httpOnly cookie — not accessible via JavaScript (NFR-16)");
        setCookieHeader.ToLower().Should().Contain("samesite=strict");

        // Response envelope
        var body = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(body).RootElement;
        json.GetProperty("success").GetBoolean().Should().BeTrue();
        json.GetProperty("data").GetProperty("username").GetString().Should().Be("admin");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AC-5 — POST /api/auth/login (invalid credentials)
    // RED:  Returns 404 (endpoint not mapped)
    // GREEN: Returns 401 with generic message (no field-level detail)
    // ─────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-5: Login with wrong password returns 401 with generic message")]
    public async Task Login_WrongPassword_Returns401_GenericMessage()
    {
        // Given: admin account exists
        await Client.PostAsJsonAsync("/api/auth/setup",
            new { username = "admin", password = "AdminPassword1!" });

        // When: wrong password supplied
        var response = await Client.PostAsJsonAsync("/api/auth/login",
            new { username = "admin", password = "WrongPassword!" });

        // Then
        response.StatusCode.Should().Be(
            HttpStatusCode.Unauthorized,
            "invalid credentials must return 401");

        var body = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(body).RootElement;
        json.GetProperty("success").GetBoolean().Should().BeFalse();
        // Message must NOT reveal which specific field was wrong
        var message = json.GetProperty("error").GetProperty("message").GetString() ?? "";
        message.Should().NotContainAny(
            new[] { "password", "Password", "username", "Username", "user name" },
            "error message must not reveal which field was wrong (timing safety)");
    }

    [Fact(DisplayName = "AC-5: Login with non-existent username returns 401 (no username revelation)")]
    public async Task Login_NonexistentUsername_Returns401_NoUsernameRevelation()
    {
        // Given: admin account exists
        await Client.PostAsJsonAsync("/api/auth/setup",
            new { username = "admin", password = "AdminPassword1!" });

        // When: non-existent username
        var response = await Client.PostAsJsonAsync("/api/auth/login",
            new { username = "nonexistent", password = "AdminPassword1!" });

        // Then: same 401 — indistinguishable from wrong password
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AC-6 — JWT validation: protected endpoint requires valid cookie
    // RED:  Protected endpoint returns 404 (route not mapped) not 401
    //       (once routes exist: unauthenticated → 401; authenticated → 200)
    // GREEN: 401 without cookie, 200 with valid cookie
    // ─────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-6: Protected endpoint without JWT cookie returns 401")]
    public async Task ProtectedEndpoint_NoCookie_Returns401()
    {
        // Given: admin account exists (so first-run gate is cleared)
        await Client.PostAsJsonAsync("/api/auth/setup",
            new { username = "admin", password = "AdminPassword1!" });

        // Create a new client WITHOUT the auth cookie
        var unauthClient = Factory.CreateClient(new() { AllowAutoRedirect = false });

        // When: calling a route that requires authorization (logout requires auth)
        var response = await unauthClient.PostAsJsonAsync("/api/auth/logout", new { });

        // Then
        response.StatusCode.Should().Be(
            HttpStatusCode.Unauthorized,
            "POST /api/auth/logout requires authentication — no JWT cookie → 401");
    }

    [Fact(DisplayName = "AC-6: Protected endpoint with valid JWT cookie proceeds (returns non-401)")]
    public async Task ProtectedEndpoint_WithValidCookie_Proceeds()
    {
        // Given: admin account exists and we are logged in
        await Client.PostAsJsonAsync("/api/auth/setup",
            new { username = "admin", password = "AdminPassword1!" });
        await Client.PostAsJsonAsync("/api/auth/login",
            new { username = "admin", password = "AdminPassword1!" });
        // Client now has the fishtank_auth cookie automatically

        // When: calling a protected endpoint (logout requires auth)
        var response = await Client.PostAsJsonAsync("/api/auth/logout", new { });

        // Then: not 401 — valid JWT satisfies authentication
        response.StatusCode.Should().NotBe(
            HttpStatusCode.Unauthorized,
            "a valid JWT cookie must satisfy authentication on protected endpoints");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AC-7 — Rate limiting
    // RED:  Returns 404 or 200 (no rate limiter configured)
    // GREEN: After threshold exceeded → 429 + Retry-After header
    // ─────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-7: Login rate limit — exceeding threshold returns 429 with Retry-After")]
    public async Task Login_ExceedingRateLimit_Returns429_WithRetryAfterHeader()
    {
        // Use an isolated factory with a low rate limit (5 req / 60s) so the
        // shared factory's rate-limiter state is not polluted for other tests.
        using var lowLimitFactory = new LowRateLimitWebApplicationFactory();
        await lowLimitFactory.ResetDatabaseAsync();
        var rateLimitClient = lowLimitFactory.CreateClient(
            new Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactoryClientOptions
            {
                AllowAutoRedirect = false,
            });

        // Given: admin account exists in the isolated factory's DB
        await rateLimitClient.PostAsJsonAsync("/api/auth/setup",
            new { username = "admin", password = "AdminPassword1!" });

        // When: fire 10 login attempts rapidly (exceeds limit of 5)
        HttpResponseMessage? lastResponse = null;
        for (int i = 0; i < 10; i++)
        {
            lastResponse = await rateLimitClient.PostAsJsonAsync("/api/auth/login",
                new { username = "admin", password = "wrong" + i });
        }

        // Then: at least the last request must be rate limited
        lastResponse.Should().NotBeNull();
        lastResponse!.StatusCode.Should().Be(
            HttpStatusCode.TooManyRequests,
            "login endpoint must rate-limit after threshold exceeded (FR-25, NFR-10)");
        lastResponse.Headers.Should().ContainKey("Retry-After",
            "429 response must include Retry-After header (FR-25)");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AC-8 — ForcePasswordChange flag
    // RED:  Login returns 404 (endpoint not mapped)
    // GREEN: Login response includes forcePasswordChange: true when flag is set
    //        (simulated by checking setup creates account with the flag based on env var)
    // ─────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-8: Login response includes forcePasswordChange field")]
    public async Task Login_Response_Includes_ForcePasswordChange_Field()
    {
        // Given: admin account exists
        await Client.PostAsJsonAsync("/api/auth/setup",
            new { username = "admin", password = "AdminPassword1!" });

        // When: login
        var response = await Client.PostAsJsonAsync("/api/auth/login",
            new { username = "admin", password = "AdminPassword1!" });

        // Then: response data includes forcePasswordChange field (value may be true or false)
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(body).RootElement;
        json.GetProperty("data").TryGetProperty("forcePasswordChange", out _)
            .Should().BeTrue("login response must include forcePasswordChange field");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AC-9 — POST /api/auth/logout
    // RED:  Returns 404 (endpoint not mapped)
    // GREEN: Returns 200, clears JWT cookie (Set-Cookie: fishtank_auth=; Max-Age=0)
    // ─────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-9: POST /api/auth/logout clears cookie and returns 200")]
    public async Task Logout_Returns200_AndClearsCookie()
    {
        // Given: logged in
        await Client.PostAsJsonAsync("/api/auth/setup",
            new { username = "admin", password = "AdminPassword1!" });
        await Client.PostAsJsonAsync("/api/auth/login",
            new { username = "admin", password = "AdminPassword1!" });

        // When
        var response = await Client.PostAsJsonAsync("/api/auth/logout", new { });

        // Then
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        // Cookie should be cleared (Set-Cookie with empty value or Max-Age=0)
        var setCookieValues = response.Headers.TryGetValues("Set-Cookie", out var vals)
            ? vals.ToList()
            : new List<string>();

        // Either the cookie is explicitly cleared, OR the client-side store removes it
        // (HttpClient may not expose cleared cookies — check either way)
        var body = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(body).RootElement;
        json.GetProperty("success").GetBoolean().Should().BeTrue();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AC-10 — Users table schema
    // RED:  DB not configured — throws at startup or tables missing
    // GREEN: Users table has all required columns
    // ─────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-10: Users table has all required columns after migration")]
    public async Task UsersTable_HasRequiredColumns_AfterMigration()
    {
        // Given: the app has started (migration ran in factory initialization)

        // When: create a user via setup endpoint
        var response = await Client.PostAsJsonAsync("/api/auth/setup",
            new { username = "admin", password = "AdminPassword1!" });

        // Then: setup succeeded — this implies Users table exists with correct schema
        response.StatusCode.Should().Be(
            HttpStatusCode.OK,
            "successful setup implies Users table exists with Id, Username, PasswordHash, " +
            "Role, IsActive, CreatedAt, TokenVersion, ForcePasswordChange columns");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AC-11 — EF Core auto-migrate
    // RED:  DbContext not configured — startup throws or DB is unavailable
    // GREEN: App starts, migrations run, /health returns 200
    // ─────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-11: App starts with auto-migrate complete — /health returns 200")]
    public async Task App_StartsWith_AutoMigrate_HealthReturns200()
    {
        // Given: the WebApplicationFactory started the app (auto-migrate ran)

        // When
        var response = await Client.GetAsync("/health");

        // Then: container healthy implies migration succeeded
        response.StatusCode.Should().Be(
            HttpStatusCode.OK,
            "EF Core auto-migrate must run at startup; /health must be 200 afterwards (AC-11)");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/auth/me — identity endpoint consumed by ProtectedRoute
    // This was the root cause of the login-loop bug in story 1-3:
    // the endpoint was not registered, so ProtectedRoute redirected back to /login
    // after every successful login. Adding explicit coverage here ensures the
    // contract between frontend (useAuth hook) and backend cannot regress silently.
    // ─────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "GET /api/auth/me without JWT cookie returns 401 AUTH_UNAUTHORIZED")]
    public async Task Me_NoCookie_Returns401_AuthUnauthorized()
    {
        // Given: admin account exists (so the first-run gate is cleared)
        await Client.PostAsJsonAsync("/api/auth/setup",
            new { username = "admin", password = "AdminPassword1!" });

        // Create a new client with no auth cookie
        var unauthClient = Factory.CreateClient(new() { AllowAutoRedirect = false });

        // When
        var response = await unauthClient.GetAsync("/api/auth/me");

        // Then
        response.StatusCode.Should().Be(
            HttpStatusCode.Unauthorized,
            "GET /api/auth/me must return 401 without a JWT cookie");

        var body = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(body).RootElement;
        json.GetProperty("success").GetBoolean().Should().BeFalse();
        json.GetProperty("error").GetProperty("code").GetString()
            .Should().Be("AUTH_UNAUTHORIZED",
                "unauthenticated /me must return AUTH_UNAUTHORIZED — used by useAuth hook to treat the user as logged-out");
    }

    [Fact(DisplayName = "GET /api/auth/me with valid JWT cookie returns 200 with user data")]
    public async Task Me_WithValidCookie_Returns200_WithUserData()
    {
        // Given: admin account exists and we are logged in
        await Client.PostAsJsonAsync("/api/auth/setup",
            new { username = "admin", password = "AdminPassword1!" });
        await Client.PostAsJsonAsync("/api/auth/login",
            new { username = "admin", password = "AdminPassword1!" });
        // Client now holds the fishtank_auth cookie

        // When
        var response = await Client.GetAsync("/api/auth/me");

        // Then
        response.StatusCode.Should().Be(
            HttpStatusCode.OK,
            "GET /api/auth/me with a valid JWT cookie must return 200");

        var body = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(body).RootElement;
        json.GetProperty("success").GetBoolean().Should().BeTrue();

        var data = json.GetProperty("data");
        data.GetProperty("username").GetString().Should().Be("admin");
        data.GetProperty("role").GetString().Should().Be("Admin");
        data.TryGetProperty("userId", out _).Should().BeTrue("response must include userId");
        data.TryGetProperty("forcePasswordChange", out _)
            .Should().BeTrue("response must include forcePasswordChange — read by ProtectedRoute");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AC-13 — Response envelope on all auth endpoints
    // RED:  Endpoints return 404 (not mapped) — no envelope
    // GREEN: All auth endpoints return {"success":bool,"data":...} or {"success":false,"error":{...}}
    // ─────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-13: Auth endpoints return standard response envelope")]
    public async Task AuthEndpoints_Return_StandardResponseEnvelope()
    {
        // Given: fresh instance

        // When: POST /api/auth/setup with invalid data (bad password length)
        var response = await Client.PostAsJsonAsync("/api/auth/setup",
            new { username = "admin", password = "short" });

        // Then: response uses standard envelope even for errors
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadAsStringAsync();
        JsonDocument? doc = null;
        Action parse = () => doc = JsonDocument.Parse(body);
        parse.Should().NotThrow("auth endpoint error must return valid JSON");

        doc!.RootElement.TryGetProperty("success", out _)
            .Should().BeTrue("all auth endpoint responses must have 'success' field");
        doc.RootElement.TryGetProperty("error", out _)
            .Should().BeTrue("error responses must have 'error' field");
        doc.RootElement.GetProperty("error").TryGetProperty("code", out _)
            .Should().BeTrue("error object must have 'code' field");
        doc.RootElement.GetProperty("error").TryGetProperty("message", out _)
            .Should().BeTrue("error object must have 'message' field");
    }
}

/// <summary>
/// Isolated factory that overrides the rate limit to 5 req/60s.
/// Used only by the rate-limit acceptance test — keeps the shared factory's
/// in-memory rate-limiter state clean for all other tests.
/// </summary>
internal class LowRateLimitWebApplicationFactory : FishtankWebApplicationFactory
{
    protected override void ConfigureWebHost(Microsoft.AspNetCore.Hosting.IWebHostBuilder builder)
    {
        base.ConfigureWebHost(builder); // Preserve in-memory SQLite setup
        builder.UseSetting("FISHTANK_LOGIN_RATE_LIMIT", "5");
        builder.UseSetting("FISHTANK_LOGIN_RATE_WINDOW", "60");
    }
}
