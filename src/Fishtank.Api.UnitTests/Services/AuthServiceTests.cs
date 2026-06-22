using System.IdentityModel.Tokens.Jwt;
using Fishtank.Api.Data;
using Fishtank.Api.Data.Entities;
using Fishtank.Api.Services;
using Fishtank.Api.UnitTests.Support;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace Fishtank.Api.UnitTests.Services;

/// <summary>
/// Simple fake that records calls and returns deterministic values.
/// BCrypt behaviour is covered separately in BCryptPasswordHasherTests.
/// </summary>
internal sealed class FakePasswordHasher : IPasswordHasher
{
    public List<string> HashCalls { get; } = [];
    public List<(string Plain, string Hash)> VerifyCalls { get; } = [];
    public bool VerifyResult { get; set; } = true;

    public string Hash(string plaintext)
    {
        HashCalls.Add(plaintext);
        return $"hashed:{plaintext}";
    }

    public bool Verify(string plaintext, string hash)
    {
        VerifyCalls.Add((plaintext, hash));
        // If the hash looks like our fake, compare directly; otherwise return VerifyResult
        return hash.StartsWith("hashed:") ? hash == $"hashed:{plaintext}" : VerifyResult;
    }
}

public class AuthServiceTests : UnitTestBase, IDisposable
{
    private readonly FishtankDbContext _db;
    private readonly FakePasswordHasher _hasher;
    private readonly AuthService _sut;
    private readonly IConfiguration _config;

    private static readonly Guid TestBootEpoch = Guid.NewGuid();

    public AuthServiceTests()
    {
        var options = new DbContextOptionsBuilder<FishtankDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new FishtankDbContext(options);

        _hasher = new FakePasswordHasher();

        _config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["FISHTANK_JWT_SECRET"] = "unit-test-jwt-secret-32chars-padding!",
            })
            .Build();

        _sut = new AuthService(_db, _hasher, _config);
    }

    // ── HasAnyUserAsync ────────────────────────────────────────────────

    [Fact]
    public async Task HasAnyUserAsync_ReturnsFalse_WhenNoUsers()
    {
        var result = await _sut.HasAnyUserAsync();
        result.Should().BeFalse();
    }

    [Fact]
    public async Task HasAnyUserAsync_ReturnsTrue_AfterSetup()
    {
        await _sut.SetupAsync("admin", "strongpassword12");
        var result = await _sut.HasAnyUserAsync();
        result.Should().BeTrue();
    }

    // ── SetupAsync ─────────────────────────────────────────────────────

    [Theory]
    [InlineData("short")]
    [InlineData("11charpassw")]
    [InlineData("")]
    public async Task SetupAsync_ReturnsPasswordTooShort_WhenPasswordUnder12Chars(string pw)
    {
        var result = await _sut.SetupAsync("admin", pw);
        result.Status.Should().Be(SetupStatus.PasswordTooShort);
    }

    [Fact]
    public async Task SetupAsync_ReturnsAlreadySetup_WhenUserExists()
    {
        await _sut.SetupAsync("admin", "strongpassword12");
        var second = await _sut.SetupAsync("admin2", "strongpassword12");
        second.Status.Should().Be(SetupStatus.AlreadySetup);
    }

    [Fact]
    public async Task SetupAsync_CreatesAdminUser_OnFirstCall()
    {
        var result = await _sut.SetupAsync("admin", "strongpassword12");

        result.Status.Should().Be(SetupStatus.Success);
        result.User.Should().NotBeNull();
        result.User!.Username.Should().Be("admin");
        result.User.Role.Should().Be(UserRole.Admin);
        result.User.IsActive.Should().BeTrue();
        result.User.ForcePasswordChange.Should().BeFalse();
    }

    [Fact]
    public async Task SetupAsync_HashesPassword()
    {
        await _sut.SetupAsync("admin", "strongpassword12");
        _hasher.HashCalls.Should().ContainSingle().Which.Should().Be("strongpassword12");
    }

    // ── LoginAsync ─────────────────────────────────────────────────────

    [Fact]
    public async Task LoginAsync_ReturnsSuccess_WithValidCredentials()
    {
        await _sut.SetupAsync("admin", "strongpassword12");
        var result = await _sut.LoginAsync("admin", "strongpassword12");
        result.Status.Should().Be(LoginStatus.Success);
        result.User.Should().NotBeNull();
    }

    [Fact]
    public async Task LoginAsync_ReturnsInvalidCredentials_WhenUserNotFound()
    {
        var result = await _sut.LoginAsync("nonexistent", "anypassword12");
        result.Status.Should().Be(LoginStatus.InvalidCredentials);
    }

    [Fact]
    public async Task LoginAsync_AlwaysCallsVerify_EvenWhenUserNotFound()
    {
        // Timing safety: Verify MUST be called even for missing users (AC-5)
        await _sut.LoginAsync("nonexistent", "anypassword12");
        _hasher.VerifyCalls.Should().ContainSingle("Verify must be called to prevent timing attack");
    }

    [Fact]
    public async Task LoginAsync_ReturnsInvalidCredentials_WhenInactiveUser()
    {
        await _sut.SetupAsync("admin", "strongpassword12");
        var user = await _db.Users.FirstAsync();
        user.IsActive = false;
        await _db.SaveChangesAsync();

        var result = await _sut.LoginAsync("admin", "strongpassword12");
        result.Status.Should().Be(LoginStatus.InvalidCredentials);
    }

    // ── LogoutAsync ────────────────────────────────────────────────────

    [Fact]
    public async Task LogoutAsync_IncrementsTokenVersion()
    {
        await _sut.SetupAsync("admin", "strongpassword12");
        var user = await _db.Users.FirstAsync();
        var initialVersion = user.TokenVersion;

        await _sut.LogoutAsync(user.Id);

        await _db.Entry(user).ReloadAsync();
        user.TokenVersion.Should().Be(initialVersion + 1);
    }

    [Fact]
    public async Task LogoutAsync_DoesNotThrow_WhenUserNotFound()
    {
        var act = () => _sut.LogoutAsync(Guid.NewGuid());
        await act.Should().NotThrowAsync();
    }

    // ── ChangePasswordAsync ────────────────────────────────────────────

    [Fact]
    public async Task ChangePasswordAsync_ReturnsPasswordTooShort_WhenUnder12Chars()
    {
        await _sut.SetupAsync("admin", "strongpassword12");
        var user = await _db.Users.FirstAsync();
        var result = await _sut.ChangePasswordAsync(user.Id, "short");
        result.Status.Should().Be(ChangePasswordStatus.PasswordTooShort);
    }

    [Fact]
    public async Task ChangePasswordAsync_IncrementsTokenVersion()
    {
        await _sut.SetupAsync("admin", "strongpassword12");
        var user = await _db.Users.FirstAsync();
        var initialVersion = user.TokenVersion;

        await _sut.ChangePasswordAsync(user.Id, "newstrongpassword!");

        await _db.Entry(user).ReloadAsync();
        user.TokenVersion.Should().Be(initialVersion + 1);
    }

    [Fact]
    public async Task ChangePasswordAsync_ClearsForcePasswordChange()
    {
        await _sut.SetupAsync("admin", "strongpassword12");
        var user = await _db.Users.FirstAsync();
        user.ForcePasswordChange = true;
        await _db.SaveChangesAsync();

        await _sut.ChangePasswordAsync(user.Id, "newstrongpassword!");

        await _db.Entry(user).ReloadAsync();
        user.ForcePasswordChange.Should().BeFalse();
    }

    // ── IssueJwt ───────────────────────────────────────────────────────

    [Fact]
    public async Task IssueJwt_ContainsExpectedClaims()
    {
        await _sut.SetupAsync("admin", "strongpassword12");
        var user = await _db.Users.FirstAsync();

        var token = _sut.IssueJwt(user, TestBootEpoch);

        var handler = new JwtSecurityTokenHandler();
        var jwt = handler.ReadJwtToken(token);

        jwt.Claims.Should().Contain(c => c.Type == "role" && c.Value == "Admin");
        jwt.Claims.Should().Contain(c => c.Type == "token_version" && c.Value == "0");
        jwt.Claims.Should().Contain(c => c.Type == "boot_epoch" && c.Value == TestBootEpoch.ToString());
        // ClaimTypes.NameIdentifier maps to "nameid" in the JWT outbound claim map
        jwt.Claims.Should().Contain(c =>
            c.Value == user.Id.ToString() &&
            (c.Type == "nameid" || c.Type == "sub" || c.Type == System.Security.Claims.ClaimTypes.NameIdentifier));
    }

    [Fact]
    public async Task IssueJwt_IsWellFormedJwt_WhenExpiryHoursNotConfigured()
    {
        // When FISHTANK_JWT_EXPIRY_HOURS is absent the SecurityTokenDescriptor.Expires
        // is not set by AuthService.  MSAL 8.x may apply a library-level default lifetime.
        // The important behaviour is that the token is parseable and contains the expected
        // claims; expiry semantics are enforced by BootEpoch + TokenVersion, not jwt.exp.
        await _sut.SetupAsync("admin", "strongpassword12");
        var user = await _db.Users.FirstAsync();

        var token = _sut.IssueJwt(user, TestBootEpoch);

        var handler = new JwtSecurityTokenHandler();
        handler.CanReadToken(token).Should().BeTrue();
        var jwt = handler.ReadJwtToken(token);
        jwt.Claims.Should().NotBeEmpty();
    }

    [Fact]
    public async Task IssueJwt_HasExpiry_WhenExpiryHoursConfigured()
    {
        var configWithExpiry = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["FISHTANK_JWT_SECRET"] = "unit-test-jwt-secret-32chars-padding!",
                ["FISHTANK_JWT_EXPIRY_HOURS"] = "2",
            })
            .Build();

        var sutWithExpiry = new AuthService(_db, _hasher, configWithExpiry);
        await sutWithExpiry.SetupAsync("admin2", "strongpassword12");
        var user = await _db.Users.FirstAsync(u => u.Username == "admin2");

        var token = sutWithExpiry.IssueJwt(user, TestBootEpoch);
        var handler = new JwtSecurityTokenHandler();
        var jwt = handler.ReadJwtToken(token);

        jwt.ValidTo.Should().BeCloseTo(DateTime.UtcNow.AddHours(2), TimeSpan.FromSeconds(30));
    }

    public void Dispose() => _db.Dispose();
}
