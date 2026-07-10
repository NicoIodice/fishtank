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
/// ATDD acceptance test scaffolds for Story 5.2:
/// User Management — Create, View & Deactivate.
///
/// RED PHASE — these tests define the expected end-state behaviour.
/// They FAIL before implementation and PASS once all ACs are complete.
///
/// AC-1:  User table displays all users (GET /api/users)
/// AC-3:  Create User creates Standard User accounts (POST /api/users)
/// AC-4:  Password validation (≥12 chars)
/// AC-5:  Duplicate username returns 409
/// AC-6:  Deactivate user (PUT /api/users/{id}/deactivate)
/// AC-7:  JWT invalidation on deactivation (TokenVersion increment, R-E5-001)
/// AC-8:  Deactivated user cannot log in
/// AC-10: Last admin guard prevents lockout
/// AC-11: Backend user endpoints require Admin role (R-E5-002)
///
/// RED reasons:
///   /api/users endpoints are not mapped → all requests return 404
///   UserManagementService does not exist
///   UsersEndpoints.cs does not exist
/// </summary>
[Collection("Integration")]
public class Story5_2_UserManagementTests : IntegrationTestBase
{
    private const string AdminUsername = "admin";
    private const string AdminPassword = "adminpassword123";
    private const string StdUsername = "standarduser";
    private const string StdPassword = "standardpassword123";

    public Story5_2_UserManagementTests(FishtankWebApplicationFactory factory) : base(factory) { }

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
    // AC-11 — Backend user endpoints require Admin role
    // RED:  Returns 404 (endpoints not mapped yet)
    // GREEN: Standard User gets HTTP 403 with ADMIN_FORBIDDEN error code
    // Risk: R-E5-002 (Admin role escalation)
    // Priority: P0 (security critical)
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AC-11: GET /api/users requires Admin role — Standard User returns 403")]
    public async Task GetUsers_StandardUser_Returns403()
    {
        var stdClient = await GetStandardUserClientAsync();
        var response = await stdClient.GetAsync("/api/users");

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden,
            "Standard User must not access user management endpoints");

        var body = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(body).RootElement;
        json.GetProperty("success").GetBoolean().Should().BeFalse();
        json.GetProperty("error").GetProperty("code").GetString()
            .Should().Be("ADMIN_FORBIDDEN");
    }

    [Fact(DisplayName = "AC-11: POST /api/users requires Admin role — Standard User returns 403")]
    public async Task CreateUser_StandardUser_Returns403()
    {
        var stdClient = await GetStandardUserClientAsync();
        var response = await stdClient.PostAsJsonAsync("/api/users", new
        {
            username = "newuser",
            password = "NewPassword123"
        });

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden,
            "Standard User must not create user accounts");

        var body = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(body).RootElement;
        json.GetProperty("success").GetBoolean().Should().BeFalse();
        json.GetProperty("error").GetProperty("code").GetString()
            .Should().Be("ADMIN_FORBIDDEN");
    }

    [Fact(DisplayName = "AC-11: PUT /api/users/{id}/deactivate requires Admin role — Standard User returns 403")]
    public async Task DeactivateUser_StandardUser_Returns403()
    {
        var stdClient = await GetStandardUserClientAsync();
        var userId = Guid.NewGuid(); // Arbitrary ID for testing authorization

        var response = await stdClient.PutAsync($"/api/users/{userId}/deactivate", null);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden,
            "Standard User must not deactivate users");

        var body = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(body).RootElement;
        json.GetProperty("success").GetBoolean().Should().BeFalse();
        json.GetProperty("error").GetProperty("code").GetString()
            .Should().Be("ADMIN_FORBIDDEN");
    }

    // -------------------------------------------------------------------------
    // AC-1 — GET /api/users returns all users with correct schema
    // RED:  Returns 404 (endpoint not mapped)
    // GREEN: Admin user gets all users with username, role, isActive, createdAt
    // Priority: P0
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AC-1: GET /api/users with Admin JWT returns 200 with all users")]
    public async Task GetUsers_AdminUser_ReturnsAllUsers()
    {
        var adminClient = await GetAdminClientAsync();
        var response = await adminClient.GetAsync("/api/users");

        response.StatusCode.Should().Be(HttpStatusCode.OK,
            "Admin user must access user list");

        var body = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(body).RootElement;
        json.GetProperty("success").GetBoolean().Should().BeTrue();

        var users = json.GetProperty("data").EnumerateArray().ToList();
        users.Should().NotBeEmpty("at least admin user must exist");

        // Verify schema of first user (admin)
        var adminUser = users.First();
        adminUser.GetProperty("id").GetString().Should().NotBeNullOrEmpty();
        adminUser.GetProperty("username").GetString().Should().Be(AdminUsername);
        adminUser.GetProperty("role").GetString().Should().Be("Admin");
        adminUser.GetProperty("isActive").GetBoolean().Should().BeTrue();
        adminUser.GetProperty("createdAt").GetString().Should().NotBeNullOrEmpty();

        // Verify createdAt is valid ISO 8601 format
        var createdAt = adminUser.GetProperty("createdAt").GetString();
        DateTimeOffset.TryParse(createdAt, out _).Should().BeTrue("createdAt must be valid date");
    }

    [Fact(DisplayName = "AC-1: GET /api/users returns users alphabetically by username")]
    public async Task GetUsers_AdminUser_ReturnsUsersAlphabetically()
    {
        // Arrange — seed multiple users with different usernames
        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<FishtankDbContext>();
            var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();

            // Ensure admin exists
            await Client.PostAsJsonAsync("/api/auth/setup", new { username = AdminUsername, password = AdminPassword });

            // Add users in non-alphabetical order
            var testUsernames = new[] { "zorro", "alice", "charlie", "bob" };
            foreach (var username in testUsernames)
            {
                if (!await db.Users.AnyAsync(u => u.Username == username))
                {
                    db.Users.Add(new User
                    {
                        Username = username,
                        PasswordHash = hasher.Hash("TestPassword123"),
                        Role = UserRole.StandardUser,
                        IsActive = true,
                        ForcePasswordChange = false,
                    });
                }
            }
            await db.SaveChangesAsync();
        }

        var adminClient = await GetAdminClientAsync();

        // Act
        var response = await adminClient.GetAsync("/api/users");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(body).RootElement;
        var users = json.GetProperty("data").EnumerateArray().ToList();

        // Assert — users are sorted alphabetically
        var usernames = users.Select(u => u.GetProperty("username").GetString()).ToList();
        usernames.Should().BeInAscendingOrder("users must be sorted alphabetically by username");
    }

    // -------------------------------------------------------------------------
    // AC-3 — POST /api/users creates Standard User account
    // RED:  Returns 404 (endpoint not mapped)
    // GREEN: New user created with Standard User role, ForcePasswordChange=true
    // Priority: P0
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AC-3: POST /api/users creates Standard User account with valid data")]
    public async Task CreateUser_ValidData_CreatesStandardUser()
    {
        var adminClient = await GetAdminClientAsync();

        // Act — create new user
        var newUsername = "newuser";
        var newPassword = "NewPassword123";

        var response = await adminClient.PostAsJsonAsync("/api/users", new
        {
            username = newUsername,
            password = newPassword
        });

        // Assert — 200 OK with created user
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(body).RootElement;
        json.GetProperty("success").GetBoolean().Should().BeTrue();

        var createdUser = json.GetProperty("data");
        createdUser.GetProperty("username").GetString().Should().Be(newUsername);
        createdUser.GetProperty("role").GetString().Should().Be("StandardUser",
            "new users must be Standard User by default");
        createdUser.GetProperty("isActive").GetBoolean().Should().BeTrue();

        // Verify user exists in database with ForcePasswordChange=true
        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<FishtankDbContext>();
            var user = await db.Users.FirstOrDefaultAsync(u => u.Username == newUsername);

            user.Should().NotBeNull("user must be persisted to database");
            user!.Role.Should().Be(UserRole.StandardUser);
            user.IsActive.Should().BeTrue();
            user.ForcePasswordChange.Should().BeTrue(
                "new users must be forced to change password on first login");
            user.TokenVersion.Should().Be(0, "initial token version must be 0");
        }
    }

    // -------------------------------------------------------------------------
    // AC-4 — Password validation (≥12 characters)
    // RED:  Returns 404 (endpoint not mapped) or accepts short password
    // GREEN: Returns 400 with validation error for password <12 chars
    // Priority: P1
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AC-4: POST /api/users with password <12 chars returns validation error")]
    public async Task CreateUser_ShortPassword_ReturnsValidationError()
    {
        var adminClient = await GetAdminClientAsync();

        // Act — try to create user with short password
        var response = await adminClient.PostAsJsonAsync("/api/users", new
        {
            username = "testuser",
            password = "short"
        });

        // Assert — 400 Bad Request with validation error
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest,
            "password <12 chars must be rejected");

        var body = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(body).RootElement;
        json.GetProperty("success").GetBoolean().Should().BeFalse();
        json.GetProperty("error").GetProperty("message").GetString()
            .Should().Contain("12 characters");
    }

    // -------------------------------------------------------------------------
    // AC-5 — Duplicate username returns 409 Conflict
    // RED:  Returns 404 (endpoint not mapped) or allows duplicate
    // GREEN: Returns 409 with AUTH_USERNAME_EXISTS error code
    // Priority: P1
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AC-5: POST /api/users with duplicate username returns 409 Conflict")]
    public async Task CreateUser_DuplicateUsername_Returns409()
    {
        var adminClient = await GetAdminClientAsync();

        // Act — try to create user with existing username (admin)
        var response = await adminClient.PostAsJsonAsync("/api/users", new
        {
            username = AdminUsername,
            password = "ValidPassword123"
        });

        // Assert — 409 Conflict with AUTH_USERNAME_EXISTS
        response.StatusCode.Should().Be(HttpStatusCode.Conflict,
            "duplicate username must return 409");

        var body = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(body).RootElement;
        json.GetProperty("success").GetBoolean().Should().BeFalse();
        json.GetProperty("error").GetProperty("code").GetString()
            .Should().Be("AUTH_USERNAME_EXISTS");
        json.GetProperty("error").GetProperty("message").GetString()
            .Should().Contain("already exists");
    }

    // -------------------------------------------------------------------------
    // AC-6 — PUT /api/users/{id}/deactivate sets IsActive=false, increments TokenVersion
    // RED:  Returns 404 (endpoint not mapped)
    // GREEN: User deactivated, TokenVersion incremented
    // Priority: P0
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AC-6: PUT /api/users/{id}/deactivate sets IsActive=false and increments TokenVersion")]
    public async Task DeactivateUser_ValidUserId_DeactivatesAndIncrementsTokenVersion()
    {
        // Arrange — create admin client first, then create user to deactivate
        var adminClient = await GetAdminClientAsync();

        Guid userId;
        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<FishtankDbContext>();
            var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();

            var user = new User
            {
                Username = "todeactivate",
                PasswordHash = hasher.Hash("TestPassword123"),
                Role = UserRole.StandardUser,
                IsActive = true,
                TokenVersion = 0,
                ForcePasswordChange = false,
            };
            db.Users.Add(user);
            await db.SaveChangesAsync();
            userId = user.Id;
        }

        // Act — deactivate user
        var response = await adminClient.PutAsync($"/api/users/{userId}/deactivate", null);

        // Assert — 200 OK with deactivated user
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(body).RootElement;
        json.GetProperty("success").GetBoolean().Should().BeTrue();

        var deactivatedUser = json.GetProperty("data");
        deactivatedUser.GetProperty("isActive").GetBoolean().Should().BeFalse();

        // Verify database state
        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<FishtankDbContext>();
            var user = await db.Users.FindAsync(userId);

            user.Should().NotBeNull();
            user!.IsActive.Should().BeFalse("user must be deactivated");
            user.TokenVersion.Should().Be(1,
                "TokenVersion must be incremented to invalidate existing JWTs (R-E5-001)");
        }
    }

    // -------------------------------------------------------------------------
    // AC-7 — JWT invalidation on deactivation is immediate (R-E5-001)
    // RED:  JWT middleware does not check TokenVersion yet
    // GREEN: Deactivated user's JWT rejected with 401 on next request
    // Risk: R-E5-001 (JWT invalidation race condition)
    // Priority: P0 (security critical)
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AC-7: Deactivated user's existing JWT is rejected with 401 (R-E5-001)")]
    public async Task DeactivatedUser_ExistingJWT_Returns401()
    {
        // Arrange — create a Standard User and authenticate
        var testUsername = "tokentestuser";
        var testPassword = "TestPassword123";

        Guid userId;
        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<FishtankDbContext>();
            var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();

            // Ensure admin exists first
            await Client.PostAsJsonAsync("/api/auth/setup", new { username = AdminUsername, password = AdminPassword });

            var user = new User
            {
                Username = testUsername,
                PasswordHash = hasher.Hash(testPassword),
                Role = UserRole.StandardUser,
                IsActive = true,
                TokenVersion = 0,
                ForcePasswordChange = false,
            };
            db.Users.Add(user);
            await db.SaveChangesAsync();
            userId = user.Id;
        }

        // Get authenticated client for the user (JWT in cookie)
        var userClient = await TestAuthHelper.CreateAuthenticatedClientAsync(
            Factory, testUsername, testPassword);

        // Verify user can access protected endpoint
        var verifyResponse = await userClient.GetAsync("/api/services");
        verifyResponse.StatusCode.Should().Be(HttpStatusCode.OK,
            "user JWT should work before deactivation");

        // Act — admin deactivates the user (increments TokenVersion)
        var adminClient = await GetAdminClientAsync();
        var deactivateResponse = await adminClient.PutAsync($"/api/users/{userId}/deactivate", null);
        deactivateResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        // Assert — user's existing JWT is now invalid (TokenVersion mismatch)
        var rejectedResponse = await userClient.GetAsync("/api/services");
        rejectedResponse.StatusCode.Should().Be(HttpStatusCode.Unauthorized,
            "deactivated user's JWT must be rejected immediately (R-E5-001)");
    }

    // -------------------------------------------------------------------------
    // AC-8 — Deactivated user cannot log in
    // RED:  Login endpoint does not check IsActive yet
    // GREEN: Returns 401 with AUTH_ACCOUNT_DEACTIVATED error code
    // Priority: P1
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AC-8: Deactivated user login attempt returns 401 with AUTH_ACCOUNT_DEACTIVATED")]
    public async Task Login_DeactivatedUser_Returns401()
    {
        // Arrange — create and deactivate a user
        var testUsername = "deactivatedloginuser";
        var testPassword = "TestPassword123";

        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<FishtankDbContext>();
            var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();

            // Ensure admin exists
            await Client.PostAsJsonAsync("/api/auth/setup", new { username = AdminUsername, password = AdminPassword });

            var user = new User
            {
                Username = testUsername,
                PasswordHash = hasher.Hash(testPassword),
                Role = UserRole.StandardUser,
                IsActive = false, // Already deactivated
                TokenVersion = 1,
                ForcePasswordChange = false,
            };
            db.Users.Add(user);
            await db.SaveChangesAsync();
        }

        // Act — attempt to log in with deactivated user
        var response = await Client.PostAsJsonAsync("/api/auth/login", new
        {
            username = testUsername,
            password = testPassword
        });

        // Assert — 401 Unauthorized with AUTH_ACCOUNT_DEACTIVATED
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized,
            "deactivated user must not be able to log in");

        var body = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(body).RootElement;
        json.GetProperty("success").GetBoolean().Should().BeFalse();
        json.GetProperty("error").GetProperty("code").GetString()
            .Should().Be("AUTH_ACCOUNT_DEACTIVATED");
        json.GetProperty("error").GetProperty("message").GetString()
            .Should().Contain("deactivated");
    }

    // -------------------------------------------------------------------------
    // AC-10 — Last admin guard prevents lockout
    // RED:  Guard logic does not exist
    // GREEN: Returns 409 with ADMIN_LAST_ADMIN_DEACTIVATE error code
    // Priority: P1
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AC-10: Deactivating last admin returns 409 with ADMIN_LAST_ADMIN_DEACTIVATE")]
    public async Task DeactivateUser_LastAdmin_Returns409()
    {
        // Arrange — ensure only one admin exists (the setup admin)
        await Client.PostAsJsonAsync("/api/auth/setup", new { username = AdminUsername, password = AdminPassword });

        Guid adminId;
        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<FishtankDbContext>();
            var admin = await db.Users.FirstAsync(u => u.Username == AdminUsername);
            adminId = admin.Id;
        }

        var adminClient = await GetAdminClientAsync();

        // Act — try to deactivate the only admin
        var response = await adminClient.PutAsync($"/api/users/{adminId}/deactivate", null);

        // Assert — 409 Conflict with ADMIN_LAST_ADMIN_DEACTIVATE
        response.StatusCode.Should().Be(HttpStatusCode.Conflict,
            "last admin deactivation must be blocked");

        var body = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(body).RootElement;
        json.GetProperty("success").GetBoolean().Should().BeFalse();
        json.GetProperty("error").GetProperty("code").GetString()
            .Should().Be("ADMIN_LAST_ADMIN_DEACTIVATE");
        json.GetProperty("error").GetProperty("message").GetString()
            .Should().Contain("last active administrator");
    }

    [Fact(DisplayName = "AC-10: Deactivating last admin is allowed when another active admin exists")]
    public async Task DeactivateUser_NotLastAdmin_Succeeds()
    {
        // Arrange — create two admins
        await Client.PostAsJsonAsync("/api/auth/setup", new { username = AdminUsername, password = AdminPassword });

        Guid admin1Id;
        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<FishtankDbContext>();
            var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();

            // Get original admin ID
            var admin1 = await db.Users.FirstAsync(u => u.Username == AdminUsername);
            admin1Id = admin1.Id;

            // Create second admin
            db.Users.Add(new User
            {
                Username = "admin2",
                PasswordHash = hasher.Hash("AdminPassword123"),
                Role = UserRole.Admin,
                IsActive = true,
                ForcePasswordChange = false,
            });
            await db.SaveChangesAsync();
        }

        var adminClient = await GetAdminClientAsync();

        // Act — deactivate first admin (second admin still active)
        var response = await adminClient.PutAsync($"/api/users/{admin1Id}/deactivate", null);

        // Assert — 200 OK (deactivation allowed)
        response.StatusCode.Should().Be(HttpStatusCode.OK,
            "deactivation allowed when another active admin exists");

        var body = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(body).RootElement;
        json.GetProperty("success").GetBoolean().Should().BeTrue();
        json.GetProperty("data").GetProperty("isActive").GetBoolean().Should().BeFalse();
    }

    // -------------------------------------------------------------------------
    // AC-6 — Deactivation is idempotent
    // RED:  Endpoint does not exist or throws error on re-deactivate
    // GREEN: Returns 200 success even if already deactivated
    // Priority: P2
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AC-6: Deactivating already-deactivated user is idempotent (returns success)")]
    public async Task DeactivateUser_AlreadyDeactivated_ReturnsSuccess()
    {
        // Arrange — create a deactivated user
        Guid userId;
        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<FishtankDbContext>();
            var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();

            // Ensure admin exists
            await Client.PostAsJsonAsync("/api/auth/setup", new { username = AdminUsername, password = AdminPassword });

            var user = new User
            {
                Username = "alreadydeactivated",
                PasswordHash = hasher.Hash("TestPassword123"),
                Role = UserRole.StandardUser,
                IsActive = false, // Already deactivated
                TokenVersion = 1,
                ForcePasswordChange = false,
            };
            db.Users.Add(user);
            await db.SaveChangesAsync();
            userId = user.Id;
        }

        var adminClient = await GetAdminClientAsync();

        // Act — deactivate already-deactivated user
        var response = await adminClient.PutAsync($"/api/users/{userId}/deactivate", null);

        // Assert — 200 OK (idempotent operation)
        response.StatusCode.Should().Be(HttpStatusCode.OK,
            "deactivation must be idempotent");

        var body = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(body).RootElement;
        json.GetProperty("success").GetBoolean().Should().BeTrue();

        // Verify TokenVersion not incremented again (still 1)
        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<FishtankDbContext>();
            var user = await db.Users.FindAsync(userId);
            user!.TokenVersion.Should().Be(1, "TokenVersion should not increment if already deactivated");
        }
    }
}
