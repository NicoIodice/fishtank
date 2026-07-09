namespace Fishtank.Api.Models;

public record UpdateMappingRequest(
    string Content,
    DateTimeOffset? LastKnownModified = null
);
