namespace Fishtank.Api.Models;

public record FileMetadataDto(
    string Name,
    string Path,        // relative to MocksRoot
    DateTimeOffset LastModified,
    long SizeBytes
);
