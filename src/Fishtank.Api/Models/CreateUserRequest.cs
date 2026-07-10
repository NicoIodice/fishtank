namespace Fishtank.Api.Models;

public record CreateUserRequest
{
    public required string Username { get; init; }
    public required string Password { get; init; }
}
