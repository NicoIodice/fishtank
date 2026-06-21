using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Fishtank.Api.Data;
using Fishtank.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace Fishtank.Api.Services;

public class AuthService(
    FishtankDbContext db,
    IPasswordHasher hasher,
    IConfiguration config) : IAuthService
{
    private const int MinPasswordLength = 12;
    private const string DummyHash = "$2a$12$invalid.hash.for.timing.safety.1234567890";

    private string JwtSecret => config["FISHTANK_JWT_SECRET"]!;

    private int? ExpiryHours =>
        int.TryParse(config["FISHTANK_JWT_EXPIRY_HOURS"], out var h) ? h : null;

    public async Task<bool> HasAnyUserAsync() =>
        await db.Users.AnyAsync();

    public async Task<SetupResult> SetupAsync(string username, string password)
    {
        if (password.Length < MinPasswordLength)
            return new SetupResult(SetupStatus.PasswordTooShort);

        if (await db.Users.AnyAsync())
            return new SetupResult(SetupStatus.AlreadySetup);

        var user = new User
        {
            Username = username,
            PasswordHash = hasher.Hash(password),
            Role = UserRole.Admin,
            IsActive = true,
            ForcePasswordChange = false,
        };

        db.Users.Add(user);
        await db.SaveChangesAsync();
        return new SetupResult(SetupStatus.Success, user);
    }

    public async Task<LoginResult> LoginAsync(string username, string password)
    {
        var user = await db.Users
            .FirstOrDefaultAsync(u => u.Username == username);

        // Always verify to prevent timing-based username enumeration (AC-5)
        var hashToVerify = user?.PasswordHash ?? DummyHash;
        var valid = hasher.Verify(password, hashToVerify);

        if (!valid || user is null || !user.IsActive)
            return new LoginResult(LoginStatus.InvalidCredentials);

        return new LoginResult(LoginStatus.Success, user);
    }

    public async Task LogoutAsync(Guid userId)
    {
        // Increment token version to invalidate all existing JWTs on logout
        var user = await db.Users.FindAsync(userId);
        if (user is null) return;
        user.TokenVersion++;
        await db.SaveChangesAsync();
    }

    public async Task<ChangePasswordResult> ChangePasswordAsync(Guid userId, string newPassword)
    {
        if (newPassword.Length < MinPasswordLength)
            return new ChangePasswordResult(ChangePasswordStatus.PasswordTooShort);

        var user = await db.Users.FindAsync(userId);
        if (user is null) return new ChangePasswordResult(ChangePasswordStatus.PasswordTooShort);

        user.PasswordHash = hasher.Hash(newPassword);
        user.ForcePasswordChange = false;
        user.TokenVersion++; // Invalidate all existing tokens immediately
        await db.SaveChangesAsync();

        return new ChangePasswordResult(ChangePasswordStatus.Success);
    }

    public string IssueJwt(User user, Guid bootEpoch)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(JwtSecret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new("role", user.Role.ToString()),
            new("token_version", user.TokenVersion.ToString()),
            new("boot_epoch", bootEpoch.ToString()),
        };

        var descriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            SigningCredentials = creds,
        };

        if (ExpiryHours.HasValue)
            descriptor.Expires = DateTime.UtcNow.AddHours(ExpiryHours.Value);

        var handler = new JwtSecurityTokenHandler();
        return handler.WriteToken(handler.CreateToken(descriptor));
    }
}
