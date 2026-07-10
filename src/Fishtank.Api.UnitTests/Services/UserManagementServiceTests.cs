using Fishtank.Api.Data;
using Fishtank.Api.Data.Entities;
using Fishtank.Api.Exceptions;
using Fishtank.Api.Services;
using Fishtank.Api.UnitTests.Support;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace Fishtank.Api.UnitTests.Services;

/// <summary>
/// Unit tests for UserManagementService
/// Story 5-2: User Management — Create, View & Deactivate
///
/// Coverage:
/// - GetAllUsersAsync: returns users sorted alphabetically
/// - CreateUserAsync: creates Standard User with ForcePasswordChange=true
/// - CreateUserAsync: validates password length (≥12 chars)
/// - CreateUserAsync: throws on duplicate username (409)
/// - DeactivateUserAsync: sets IsActive=false and increments TokenVersion
/// - DeactivateUserAsync: idempotent (no TokenVersion increment if already deactivated)
/// - DeactivateUserAsync: last admin guard prevents lockout
/// - DeactivateUserAsync: allows deactivation of non-last admin
/// </summary>
public class UserManagementServiceTests : UnitTestBase, IDisposable
{
    private readonly FishtankDbContext _db;
    private readonly FakePasswordHasher _hasher;
    private readonly UserManagementService _sut;

    public UserManagementServiceTests()
    {
        var options = new DbContextOptionsBuilder<FishtankDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new FishtankDbContext(options);
        _hasher = new FakePasswordHasher();
        _sut = new UserManagementService(_db, _hasher);
    }

    public void Dispose()
    {
        _db.Dispose();
    }

    // ── GetAllUsersAsync ───────────────────────────────────────────────

    [Fact]
    public async Task GetAllUsersAsync_ReturnsEmptyList_WhenNoUsers()
    {
        var result = await _sut.GetAllUsersAsync();
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task GetAllUsersAsync_ReturnsSortedUsers_AlphabeticallyByUsername()
    {
        // Arrange: insert users in non-alphabetical order
        _db.Users.AddRange(
            new User
            {
                Username = "charlie",
                PasswordHash = "hash1",
                Role = UserRole.StandardUser,
            },
            new User
            {
                Username = "alice",
                PasswordHash = "hash2",
                Role = UserRole.Admin,
            },
            new User
            {
                Username = "bob",
                PasswordHash = "hash3",
                Role = UserRole.StandardUser,
            }
        );
        await _db.SaveChangesAsync();

        // Act
        var result = await _sut.GetAllUsersAsync();

        // Assert: should be returned alphabetically (alice, bob, charlie)
        var usernames = result.Select(u => u.Username).ToList();
        usernames.Should().Equal("alice", "bob", "charlie");
    }

    [Fact]
    public async Task GetAllUsersAsync_ReturnsAllFields_CorrectlyMapped()
    {
        // Arrange
        var testUser = new User
        {
            Username = "testuser",
            PasswordHash = "hash",
            Role = UserRole.Admin,
            IsActive = false,
            CreatedAt = DateTimeOffset.UtcNow,
        };
        _db.Users.Add(testUser);
        await _db.SaveChangesAsync();

        // Act
        var result = await _sut.GetAllUsersAsync();

        // Assert
        var dto = result.Single();
        dto.Id.Should().Be(testUser.Id);
        dto.Username.Should().Be("testuser");
        dto.Role.Should().Be("Admin");
        dto.IsActive.Should().BeFalse();
        dto.CreatedAt.Should().Be(testUser.CreatedAt);
    }

    // ── CreateUserAsync ────────────────────────────────────────────────

    [Fact]
    public async Task CreateUserAsync_CreatesStandardUser_WithForcePasswordChangeTrue()
    {
        // Act
        var result = await _sut.CreateUserAsync("newuser", "securePassword123");

        // Assert
        result.Username.Should().Be("newuser");
        result.Role.Should().Be("StandardUser");
        result.IsActive.Should().BeTrue();

        var dbUser = await _db.Users.SingleAsync();
        dbUser.Username.Should().Be("newuser");
        dbUser.Role.Should().Be(UserRole.StandardUser);
        dbUser.ForcePasswordChange.Should().BeTrue(); // AC-3
        dbUser.TokenVersion.Should().Be(0);
        dbUser.IsActive.Should().BeTrue();
    }

    [Fact]
    public async Task CreateUserAsync_HashesPassword_UsingPasswordHasher()
    {
        // Act
        await _sut.CreateUserAsync("newuser", "securePassword123");

        // Assert
        _hasher.HashCalls.Should().Contain("securePassword123");

        var dbUser = await _db.Users.SingleAsync();
        dbUser.PasswordHash.Should().Be("hashed:securePassword123");
    }

    [Theory]
    [InlineData("short")]
    [InlineData("11charpassw")] // exactly 11 chars
    [InlineData("")]
    public async Task CreateUserAsync_ThrowsValidationException_WhenPasswordUnder12Chars(string password)
    {
        // Act & Assert
        var act = async () => await _sut.CreateUserAsync("newuser", password);
        await act.Should().ThrowAsync<ValidationException>()
            .WithMessage("Password must be at least 12 characters.");
    }

    [Fact]
    public async Task CreateUserAsync_ThrowsConflictException_WhenUsernameAlreadyExists()
    {
        // Arrange: create existing user
        _db.Users.Add(new User
        {
            Username = "existinguser",
            PasswordHash = "hash",
            Role = UserRole.Admin,
        });
        await _db.SaveChangesAsync();

        // Act & Assert
        var act = async () => await _sut.CreateUserAsync("existinguser", "securePassword123");
        await act.Should().ThrowAsync<ConflictException>()
            .Where(ex => ex.ErrorCode == "AUTH_USERNAME_EXISTS")
            .WithMessage("A user with this username already exists.");
    }

    // ── DeactivateUserAsync ────────────────────────────────────────────

    [Fact]
    public async Task DeactivateUserAsync_SetsIsActiveFalse_AndIncrementsTokenVersion()
    {
        // Arrange
        var user = new User
        {
            Username = "activeuser",
            PasswordHash = "hash",
            Role = UserRole.StandardUser,
            IsActive = true,
            TokenVersion = 0,
        };
        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        // Act
        var result = await _sut.DeactivateUserAsync(user.Id);

        // Assert
        result.IsActive.Should().BeFalse();

        var dbUser = await _db.Users.FindAsync(user.Id);
        dbUser!.IsActive.Should().BeFalse();
        dbUser.TokenVersion.Should().Be(1); // AC-7: JWT invalidation
    }

    [Fact]
    public async Task DeactivateUserAsync_IsIdempotent_DoesNotIncrementTokenVersionIfAlreadyDeactivated()
    {
        // Arrange
        var user = new User
        {
            Username = "deactivateduser",
            PasswordHash = "hash",
            Role = UserRole.StandardUser,
            IsActive = false,
            TokenVersion = 5,
        };
        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        // Act
        var result = await _sut.DeactivateUserAsync(user.Id);

        // Assert
        result.IsActive.Should().BeFalse();

        var dbUser = await _db.Users.FindAsync(user.Id);
        dbUser!.TokenVersion.Should().Be(5); // Not incremented
    }

    [Fact]
    public async Task DeactivateUserAsync_ThrowsNotFoundException_WhenUserDoesNotExist()
    {
        // Act & Assert
        var act = async () => await _sut.DeactivateUserAsync(Guid.NewGuid());
        await act.Should().ThrowAsync<NotFoundException>()
            .Where(ex => ex.ErrorCode == "USER_NOT_FOUND")
            .WithMessage("User not found.");
    }

    [Fact]
    public async Task DeactivateUserAsync_ThrowsConflictException_WhenDeactivatingLastActiveAdmin()
    {
        // Arrange: only one active admin
        var lastAdmin = new User
        {
            Username = "lastadmin",
            PasswordHash = "hash",
            Role = UserRole.Admin,
            IsActive = true,
        };
        _db.Users.Add(lastAdmin);

        // Add some deactivated admins and standard users (should not affect the guard)
        _db.Users.AddRange(
            new User
            {
                Username = "deactivatedadmin",
                PasswordHash = "hash",
                Role = UserRole.Admin,
                IsActive = false,
            },
            new User
            {
                Username = "standarduser",
                PasswordHash = "hash",
                Role = UserRole.StandardUser,
                IsActive = true,
            }
        );
        await _db.SaveChangesAsync();

        // Act & Assert: AC-10 last admin guard
        var act = async () => await _sut.DeactivateUserAsync(lastAdmin.Id);
        await act.Should().ThrowAsync<ConflictException>()
            .Where(ex => ex.ErrorCode == "ADMIN_LAST_ADMIN_DEACTIVATE")
            .WithMessage("Cannot deactivate the last active administrator.");

        // Verify user is still active
        var dbUser = await _db.Users.FindAsync(lastAdmin.Id);
        dbUser!.IsActive.Should().BeTrue();
    }

    [Fact]
    public async Task DeactivateUserAsync_AllowsDeactivation_WhenMultipleActiveAdminsExist()
    {
        // Arrange: two active admins
        var admin1 = new User
        {
            Username = "admin1",
            PasswordHash = "hash",
            Role = UserRole.Admin,
            IsActive = true,
        };
        var admin2 = new User
        {
            Username = "admin2",
            PasswordHash = "hash",
            Role = UserRole.Admin,
            IsActive = true,
        };
        _db.Users.AddRange(admin1, admin2);
        await _db.SaveChangesAsync();

        // Act: deactivate one admin (should succeed)
        var result = await _sut.DeactivateUserAsync(admin1.Id);

        // Assert
        result.IsActive.Should().BeFalse();

        var dbUser = await _db.Users.FindAsync(admin1.Id);
        dbUser!.IsActive.Should().BeFalse();
        dbUser.TokenVersion.Should().Be(1);
    }

    [Fact]
    public async Task DeactivateUserAsync_AllowsDeactivation_OfStandardUser_EvenIfOnlyOneAdmin()
    {
        // Arrange
        var admin = new User
        {
            Username = "admin",
            PasswordHash = "hash",
            Role = UserRole.Admin,
            IsActive = true,
        };
        var standardUser = new User
        {
            Username = "standarduser",
            PasswordHash = "hash",
            Role = UserRole.StandardUser,
            IsActive = true,
        };
        _db.Users.AddRange(admin, standardUser);
        await _db.SaveChangesAsync();

        // Act: deactivate Standard User (should always succeed regardless of admin count)
        var result = await _sut.DeactivateUserAsync(standardUser.Id);

        // Assert
        result.IsActive.Should().BeFalse();

        var dbUser = await _db.Users.FindAsync(standardUser.Id);
        dbUser!.IsActive.Should().BeFalse();
    }
}
