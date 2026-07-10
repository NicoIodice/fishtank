using Fishtank.Api.Models;

namespace Fishtank.Api.Services;

public interface IUserManagementService
{
    Task<IEnumerable<UserDto>> GetAllUsersAsync(CancellationToken ct = default);
    Task<UserDto> CreateUserAsync(string username, string password, Guid? actorId, CancellationToken ct = default, bool forcePasswordChange = true);
    Task<UserDto> DeactivateUserAsync(Guid userId, Guid actorId, CancellationToken ct = default);
}

