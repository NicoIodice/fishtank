namespace Fishtank.Api.Models;

public record UserDto
{
    public required Guid Id { get; init; }
    public required string Username { get; init; }
    public required string Role { get; init; }
    public required bool IsActive { get; init; }
    public required DateTimeOffset CreatedAt { get; init; }
}
