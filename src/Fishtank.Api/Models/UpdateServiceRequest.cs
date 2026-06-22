namespace Fishtank.Api.Models;

public record UpdateServiceRequest(
    string Name,
    string? Description,
    string ExternalUrl,
    int Port,
    string[]? Tags
);
