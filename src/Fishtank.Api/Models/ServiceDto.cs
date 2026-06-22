namespace Fishtank.Api.Models;

public record ServiceDto(
    Guid Id,
    string Name,
    string Slug,
    string? Description,
    string ExternalUrl,
    int Port,
    string MocksRoot,
    string Status,
    bool IsActive,
    string[] Tags,
    DateTimeOffset CreatedAt,
    bool? MocksRootChanged = null
);
