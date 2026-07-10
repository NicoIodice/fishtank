using Fishtank.Api.Models;

namespace Fishtank.Api.Services;

public interface IUserManagementService
{
    Task<IEnumerable<UserDto>> GetAllUsersAsync(CancellationToken ct = default);
    Task<UserDto> CreateUserAsync(string username, string password, CancellationToken ct = default);
    Task<UserDto> DeactivateUserAsync(Guid userId, CancellationToken ct = default);
}
