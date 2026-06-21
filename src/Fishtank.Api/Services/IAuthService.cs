using Fishtank.Api.Data.Entities;

namespace Fishtank.Api.Services;

public enum SetupStatus { Success, AlreadySetup, PasswordTooShort }
public record SetupResult(SetupStatus Status, User? User = null);

public enum LoginStatus { Success, InvalidCredentials }
public record LoginResult(LoginStatus Status, User? User = null);

public enum ChangePasswordStatus { Success, PasswordTooShort }
public record ChangePasswordResult(ChangePasswordStatus Status);

public interface IAuthService
{
    Task<bool> HasAnyUserAsync();
    Task<SetupResult> SetupAsync(string username, string password);
    Task<LoginResult> LoginAsync(string username, string password);
    Task LogoutAsync(Guid userId);
    Task<ChangePasswordResult> ChangePasswordAsync(Guid userId, string newPassword);
    string IssueJwt(User user, Guid bootEpoch);
}
