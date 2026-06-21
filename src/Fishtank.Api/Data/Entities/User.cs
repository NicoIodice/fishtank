namespace Fishtank.Api.Data.Entities;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Username { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.StandardUser;
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public int TokenVersion { get; set; } = 0;
    public bool ForcePasswordChange { get; set; } = false;
}

public enum UserRole { Admin, StandardUser }
