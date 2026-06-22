namespace Fishtank.Api.Models;

public record CreateServiceRequest(
    string Name,
    string? Description,
    string ExternalUrl,
    int Port,
    string[]? Tags
);
