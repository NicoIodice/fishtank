using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Fishtank.Api.Data;
using Fishtank.Api.Data.Entities;
using Fishtank.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Fishtank.Api.IntegrationTests.Support;

namespace Fishtank.Api.IntegrationTests.Api;

/// <summary>
/// ATDD acceptance test scaffolds for Story 5.3:
/// Health Dashboard, Audit Log & Auto-Registration Toggle.
///
/// RED PHASE — these tests define the expected end-state behaviour.
/// They FAIL before implementation and PASS once all ACs are complete.
///
/// AC-2:  GET /api/admin/health returns structured health data (FR-32)
/// AC-3:  GET /api/admin/health requires Admin role (NFR-8, R-E5-002)
/// AC-5:  GET /api/admin/audit returns paginated audit entries (FR-33)
/// AC-6:  GET /api/admin/audit requires Admin role (NFR-8, R-E5-002)
/// AC-7:  AuditLog entity schema (FR-33)
/// AC-8:  Audit entries created for user-initiated actions (FR-33)
/// AC-10: Self-registration endpoint respects toggle state (FR-29)
///
/// RED reasons:
///   - /api/admin/health endpoint not mapped → 404
///   - /api/admin/audit endpoint not mapped → 404
///   - /api/auth/register endpoint not mapped → 404
///   - /api/auth/registration-status endpoint not mapped → 404
///   - AuditLog table does not exist → DbSet<AuditLog> missing
///   - AuditService does not exist
///   - HealthDto, AuditEntryDto, RegistrationStatusDto models do not exist
///   - AdminEndpoints.cs does not have health/audit endpoints
///   - AuthEndpoints.cs does not have register/registration-status endpoints
/// </summary>
[Collection("Integration")]
public class Story5_3_AdminConsoleTests : IntegrationTestBase
{
    private const string AdminUsername = "admin";
    private const string AdminPassword = "adminpassword123";
    private const string StdUsername = "standarduser";
    private const string StdPassword = "standardpassword123";

    public Story5_3_AdminConsoleTests(FishtankWebApplicationFactory factory) : base(factory) { }

    /// <summary>Ensures admin account exists and returns an authenticated admin HttpClient.</summary>
    private async Task<HttpClient> GetAdminClientAsync()
    {
        await Client.PostAsJsonAsync("/api/auth/setup", new { username = AdminUsername, password = AdminPassword });
        return await TestAuthHelper.CreateAuthenticatedClientAsync(Factory, AdminUsername, AdminPassword);
    }

    /// <summary>Seeds a Standard User directly in the DB and returns an authenticated HttpClient.</summary>
    private async Task<HttpClient> GetStandardUserClientAsync()
    {
        await Client.PostAsJsonAsync("/api/auth/setup", new { username = AdminUsername, password = AdminPassword });

        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<FishtankDbContext>();
            var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();

            if (!await db.Users.AnyAsync(u => u.Username == StdUsername))
            {
                db.Users.Add(new User
                {
                    Username = StdUsername,
                    PasswordHash = hasher.Hash(StdPassword),
                    Role = UserRole.StandardUser,
                    IsActive = true,
                    ForcePasswordChange = false,
                });
                await db.SaveChangesAsync();
            }
        }

        return await TestAuthHelper.CreateAuthenticatedClientAsync(Factory, StdUsername, StdPassword);
    }

    // -------------------------------------------------------------------------
    // AC-2 — GET /api/admin/health returns structured health data
    // RED:  Returns 404 (endpoint not mapped yet)
    // GREEN: Admin user gets health metrics with correct schema
    // Priority: P0
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AC-2: GET /api/admin/health with Admin JWT returns 200 with health metrics")]
    public async Task GetAdminHealth_AdminUser_ReturnsHealthData()
    {
        var adminClient = await GetAdminClientAsync();

        // GREEN: endpoint returns structured health data
        var response = await adminClient.GetAsync("/api/admin/health");

        response.StatusCode.Should().Be(HttpStatusCode.OK,
            "Admin user must access health dashboard data");

        var body = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(body).RootElement;
        json.GetProperty("success").GetBoolean().Should().BeTrue();

        var data = json.GetProperty("data");
        data.GetProperty("activeServicesCount").GetInt32().Should().BeGreaterThanOrEqualTo(0,
            "active services count must be non-negative");
        data.GetProperty("totalRequestCount").GetInt64().Should().BeGreaterThanOrEqualTo(0,
            "total request count must be non-negative");
        data.GetProperty("databaseStatus").GetString().Should().BeOneOf("accessible", "inaccessible");
        data.GetProperty("uptimeSeconds").GetInt64().Should().BeGreaterThan(0,
            "uptime must be positive");
    }

    // -------------------------------------------------------------------------
    // AC-3 — GET /api/admin/health requires Admin role
    // RED:  Returns 404 (endpoint not mapped yet)
    // GREEN: Standard User gets HTTP 403 with ADMIN_FORBIDDEN error code
    // Risk: R-E5-002 (Admin role escalation)
    // Priority: P0 (security critical)
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AC-3: GET /api/admin/health requires Admin role — Standard User returns 403")]
    public async Task GetAdminHealth_StandardUser_Returns403()
    {
        var stdClient = await GetStandardUserClientAsync();

        // GREEN: endpoint returns 403 for Standard User
        var response = await stdClient.GetAsync("/api/admin/health");

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden,
            "Standard User must not access admin health endpoint");

        var body = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(body).RootElement;
        json.GetProperty("success").GetBoolean().Should().BeFalse();
        json.GetProperty("error").GetProperty("code").GetString()
            .Should().Be("ADMIN_FORBIDDEN");
    }

    // -------------------------------------------------------------------------
    // AC-5 — GET /api/admin/audit returns paginated audit entries
    // RED:  Returns 404 (endpoint not mapped yet)
    // GREEN: Admin user gets paginated audit log with correct schema
    // Priority: P0
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AC-5: GET /api/admin/audit with Admin JWT returns 200 with audit entries")]
    public async Task GetAdminAudit_AdminUser_ReturnsAuditEntries()
    {
        var adminClient = await GetAdminClientAsync();

        // GREEN: endpoint returns paginated audit entries
        var response = await adminClient.GetAsync("/api/admin/audit");

        response.StatusCode.Should().Be(HttpStatusCode.OK,
            "Admin user must access audit log");

        var body = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(body).RootElement;
        json.GetProperty("success").GetBoolean().Should().BeTrue();

        var data = json.GetProperty("data");
        data.TryGetProperty("items", out _).Should().BeTrue("items property must exist");
        data.GetProperty("total").GetInt32().Should().BeGreaterThanOrEqualTo(0);
        data.GetProperty("page").GetInt32().Should().Be(1);
        data.GetProperty("pageSize").GetInt32().Should().Be(20);

        // If entries exist, verify first entry schema
        var items = data.GetProperty("items").EnumerateArray().ToList();
        if (items.Count > 0)
        {
            var entry = items.First();
            entry.TryGetProperty("id", out _).Should().BeTrue();
            entry.GetProperty("action").GetString().Should().NotBeNullOrEmpty();
            entry.GetProperty("resourceType").GetString().Should().NotBeNullOrEmpty();
            entry.TryGetProperty("createdAt", out _).Should().BeTrue();
        }
    }

    [Fact(DisplayName = "AC-5: GET /api/admin/audit supports pagination via ?page query parameter")]
    public async Task GetAdminAudit_WithPageParameter_ReturnsPaginatedResults()
    {
        var adminClient = await GetAdminClientAsync();

        // GREEN: endpoint respects pagination query parameter
        var response = await adminClient.GetAsync("/api/admin/audit?page=2");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(body).RootElement;
        var data = json.GetProperty("data");
        data.GetProperty("page").GetInt32().Should().Be(2);
    }

    [Fact(DisplayName = "AC-5: GET /api/admin/audit returns entries ordered by CreatedAt DESC (newest-first)")]
    public async Task GetAdminAudit_EntriesOrderedNewestFirst()
    {
        // Note: This test requires multiple audit entries to exist
        // Will implement once audit entry creation is working

        var adminClient = await GetAdminClientAsync();
        var response = await adminClient.GetAsync("/api/admin/audit");

        // GREEN: endpoint returns ordered entries
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(body).RootElement;
        var items = json.GetProperty("data").GetProperty("items").EnumerateArray().ToList();

        if (items.Count > 1)
        {
            var firstTimestamp = DateTimeOffset.Parse(items[0].GetProperty("createdAt").GetString()!);
            var secondTimestamp = DateTimeOffset.Parse(items[1].GetProperty("createdAt").GetString()!);
            firstTimestamp.Should().BeOnOrAfter(secondTimestamp, "entries must be ordered newest-first");
        }
    }

    // -------------------------------------------------------------------------
    // AC-6 — GET /api/admin/audit requires Admin role
    // RED:  Returns 404 (endpoint not mapped yet)
    // GREEN: Standard User gets HTTP 403 with ADMIN_FORBIDDEN error code
    // Risk: R-E5-002 (Admin role escalation)
    // Priority: P0 (security critical)
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AC-6: GET /api/admin/audit requires Admin role — Standard User returns 403")]
    public async Task GetAdminAudit_StandardUser_Returns403()
    {
        var stdClient = await GetStandardUserClientAsync();

        // GREEN: endpoint returns 403 for Standard User
        var response = await stdClient.GetAsync("/api/admin/audit");

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden,
            "Standard User must not access admin audit log endpoint");

        var body = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(body).RootElement;
        json.GetProperty("success").GetBoolean().Should().BeFalse();
        json.GetProperty("error").GetProperty("code").GetString()
            .Should().Be("ADMIN_FORBIDDEN");
    }

    // -------------------------------------------------------------------------
    // AC-8 — Audit entries created for user-initiated actions
    // RED:  AuditLog table does not exist, AuditService does not exist
    // GREEN: Audit entries are created when admin performs actions
    // Priority: P1
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AC-8: Audit entry created when admin changes a feature toggle")]
    public async Task ToggleChange_CreatesAuditEntry()
    {
        // Note: This test requires FeatureToggleService to call AuditService
        // Deferred until AuditService and retroactive audit calls are implemented

        var adminClient = await GetAdminClientAsync();

        // GREEN: audit entry created on toggle change
        // Arrange — change toggle state
        await adminClient.PutAsJsonAsync("/api/admin/toggles/network_activity", new { enabled = true });
        await adminClient.PutAsJsonAsync("/api/admin/toggles/network_activity", new { enabled = false });

        // Assert — audit entry created
        var auditResponse = await adminClient.GetAsync("/api/admin/audit");
        var body = await auditResponse.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(body).RootElement;
        var items = json.GetProperty("data").GetProperty("items").EnumerateArray().ToList();

        var toggleEntry = items.FirstOrDefault(e =>
            e.GetProperty("action").GetString() == "TOGGLE_CHANGED" &&
            e.GetProperty("resourceType").GetString() == "Toggle");

        toggleEntry.ValueKind.Should().NotBe(JsonValueKind.Undefined,
            "audit entry must exist for toggle change");
    }

    [Fact(DisplayName = "AC-8: Audit entry created when admin creates a user")]
    public async Task UserCreate_CreatesAuditEntry()
    {
        // Note: This test requires UserManagementService to call AuditService
        // Deferred until AuditService is implemented

        var adminClient = await GetAdminClientAsync();

        // GREEN: audit entry created on user create
        // Act — create a new user
        await adminClient.PostAsJsonAsync("/api/users", new
        {
            username = "testuser123",
            password = "TestPassword123"
        });

        // Assert — audit entry created
        var auditResponse = await adminClient.GetAsync("/api/admin/audit");
        var body = await auditResponse.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(body).RootElement;
        var items = json.GetProperty("data").GetProperty("items").EnumerateArray().ToList();

        var userEntry = items.FirstOrDefault(e =>
            e.GetProperty("action").GetString() == "USER_CREATED" &&
            e.GetProperty("resourceType").GetString() == "User");

        userEntry.ValueKind.Should().NotBe(JsonValueKind.Undefined,
            "audit entry must exist for user creation");
    }

    // -------------------------------------------------------------------------
    // AC-10 — Self-registration endpoint respects toggle state
    // RED:  POST /api/auth/register endpoint does not exist (404)
    // GREEN: Self-registration blocked when toggle is OFF (default)
    // Priority: P0
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AC-10: POST /api/auth/register returns 403 when auto-registration is OFF (default)")]
    public async Task Register_AutoRegistrationOff_Returns403()
    {
        // Ensure admin exists so FirstRunMiddleware allows through (auto_registration is OFF by default)
        await GetAdminClientAsync();

        // GREEN: endpoint returns 403 when auto-registration is OFF
        var response = await Client.PostAsJsonAsync("/api/auth/register", new
        {
            username = "newuser",
            password = "NewPassword123"
        });

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden,
            "self-registration must be blocked when toggle is OFF");

        var body = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(body).RootElement;
        json.GetProperty("success").GetBoolean().Should().BeFalse();
        json.GetProperty("error").GetProperty("code").GetString()
            .Should().Be("AUTH_REGISTRATION_DISABLED");
    }

    [Fact(DisplayName = "AC-10: POST /api/auth/register creates Standard User when auto-registration is ON")]
    public async Task Register_AutoRegistrationOn_CreatesStandardUser()
    {
        // Note: This test requires auto_registration toggle to be enabled
        // Must toggle auto_registration ON before calling register endpoint

        var adminClient = await GetAdminClientAsync();

        // GREEN: self-registration succeeds when toggle is ON
        // Arrange — enable auto_registration toggle
        await adminClient.PutAsJsonAsync("/api/admin/toggles/auto_registration", new { enabled = true });

        // Act — call register endpoint
        var response = await Client.PostAsJsonAsync("/api/auth/register", new
        {
            username = "selfregistered",
            password = "SelfPassword123"
        });

        // Assert — user created with Standard User role
        response.StatusCode.Should().Be(HttpStatusCode.OK,
            "self-registration must succeed when toggle is ON");

        var body = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(body).RootElement;
        json.GetProperty("success").GetBoolean().Should().BeTrue();
        json.GetProperty("data").GetProperty("username").GetString().Should().Be("selfregistered");
        json.GetProperty("data").GetProperty("role").GetString().Should().Be("StandardUser");
    }

    [Fact(DisplayName = "AC-10: POST /api/auth/register returns 409 when username already exists")]
    public async Task Register_DuplicateUsername_Returns409()
    {
        // Note: This test requires auto_registration toggle to be ON and admin user to exist

        var adminClient = await GetAdminClientAsync();

        // GREEN: duplicate username returns 409
        // Arrange — enable auto_registration toggle
        await adminClient.PutAsJsonAsync("/api/admin/toggles/auto_registration", new { enabled = true });

        // Act — attempt to register with existing username (admin)
        var response = await Client.PostAsJsonAsync("/api/auth/register", new
        {
            username = AdminUsername,
            password = "DifferentPassword123"
        });

        // Assert — returns 409 conflict
        response.StatusCode.Should().Be(HttpStatusCode.Conflict,
            "duplicate username must be rejected");

        var body = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(body).RootElement;
        json.GetProperty("success").GetBoolean().Should().BeFalse();
        json.GetProperty("error").GetProperty("code").GetString()
            .Should().Be("AUTH_USERNAME_EXISTS");
    }

    [Fact(DisplayName = "AC-10: POST /api/auth/register returns 400 when password is < 12 characters")]
    public async Task Register_ShortPassword_Returns400()
    {
        // Note: This test requires auto_registration toggle to be ON

        var adminClient = await GetAdminClientAsync();

        // GREEN: short password returns 400
        // Arrange — enable auto_registration toggle
        await adminClient.PutAsJsonAsync("/api/admin/toggles/auto_registration", new { enabled = true });

        // Act — attempt to register with short password
        var response = await Client.PostAsJsonAsync("/api/auth/register", new
        {
            username = "newuser",
            password = "short"
        });

        // Assert — returns 400 validation error
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest,
            "short password must be rejected");
    }

    // -------------------------------------------------------------------------
    // Additional test: GET /api/auth/registration-status public endpoint
    // RED:  Endpoint does not exist (404)
    // GREEN: Public endpoint returns registration status (no auth required)
    // Priority: P1
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "GET /api/auth/registration-status returns current auto-registration state (public)")]
    public async Task GetRegistrationStatus_NoAuth_ReturnsStatus()
    {
        // GREEN: public endpoint returns registration status
        var response = await Client.GetAsync("/api/auth/registration-status");

        response.StatusCode.Should().Be(HttpStatusCode.OK,
            "registration status endpoint must be public (no auth required)");

        var body = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(body).RootElement;
        json.GetProperty("success").GetBoolean().Should().BeTrue();
        json.GetProperty("data").GetProperty("enabled").GetBoolean().Should().BeFalse(
            "auto-registration is OFF by default");
    }
}
