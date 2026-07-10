using Fishtank.Api.Data;
using Fishtank.Api.Data.Entities;
using Fishtank.Api.Exceptions;
using Fishtank.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Fishtank.Api.Services;

public class UserManagementService : IUserManagementService
{
    private readonly FishtankDbContext _db;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IAuditService _auditService;

    public UserManagementService(FishtankDbContext db, IPasswordHasher passwordHasher, IAuditService auditService)
    {
        _db = db;
        _passwordHasher = passwordHasher;
        _auditService = auditService;
    }

    public async Task<IEnumerable<UserDto>> GetAllUsersAsync(CancellationToken ct = default)
    {
        var users = await _db.Users
            .OrderBy(u => u.Username)
            .ToListAsync(ct);

        return users.Select(MapToDto);
    }

    public async Task<UserDto> CreateUserAsync(string username, string password, Guid? actorId, CancellationToken ct = default, bool forcePasswordChange = true)
    {
        // Validate password length
        if (password.Length < 12)
        {
            throw new ValidationException("VALIDATION_ERROR",
                "Password must be at least 12 characters.");
        }

        // Check username uniqueness
        if (await _db.Users.AnyAsync(u => u.Username == username, ct))
        {
            throw new ConflictException("AUTH_USERNAME_EXISTS",
                "A user with this username already exists.");
        }

        // Create new Standard User
        var user = new User
        {
            Username = username,
            PasswordHash = _passwordHasher.Hash(password),
            Role = UserRole.StandardUser,
            IsActive = true,
            TokenVersion = 0,
            ForcePasswordChange = forcePasswordChange,
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync(ct);

        // AC-8: Log audit entry
        await _auditService.LogAsync(
            AuditActions.UserCreated,
            actorId,
            "User",
            user.Id.ToString(),
            new { username = user.Username },
            ct);

        return MapToDto(user);
    }

    public async Task<UserDto> DeactivateUserAsync(Guid userId, Guid actorId, CancellationToken ct = default)
    {
        var user = await _db.Users.FindAsync(new object[] { userId }, ct);
        if (user is null)
        {
            throw new NotFoundException("USER_NOT_FOUND", "User not found.");
        }

        // Idempotent — if already deactivated, return success
        if (!user.IsActive)
        {
            return MapToDto(user);
        }

        // Last admin guard — prevent lockout
        if (user.Role == UserRole.Admin)
        {
            var activeAdminCount = await _db.Users
                .CountAsync(u => u.Role == UserRole.Admin && u.IsActive, ct);

            if (activeAdminCount <= 1)
            {
                throw new ConflictException("ADMIN_LAST_ADMIN_DEACTIVATE",
                    "Cannot deactivate the last active administrator.");
            }
        }

        // Deactivate user and increment TokenVersion (invalidates all existing JWTs)
        user.IsActive = false;
        user.TokenVersion++;

        await _db.SaveChangesAsync(ct);

        // AC-8: Log audit entry
        await _auditService.LogAsync(
            AuditActions.UserDeactivated,
            actorId,
            "User",
            user.Id.ToString(),
            new { username = user.Username },
            ct);

        return MapToDto(user);
    }

    private static UserDto MapToDto(User user) => new()
    {
        Id = user.Id,
        Username = user.Username,
        Role = user.Role.ToString(),
        IsActive = user.IsActive,
        CreatedAt = user.CreatedAt,
    };
}
