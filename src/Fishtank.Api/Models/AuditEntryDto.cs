namespace Fishtank.Api.Models;

public record AuditEntryDto(
    Guid Id,
    string Action,
    string? ActorUsername,
    string ResourceType,
    string? ResourceId,
    object? Details,
    DateTimeOffset CreatedAt);
