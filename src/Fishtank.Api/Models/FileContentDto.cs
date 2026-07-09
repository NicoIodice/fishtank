namespace Fishtank.Api.Models;

public record FileContentDto(
    string Content,
    string Name,
    string Path,
    DateTimeOffset LastModified,
    long SizeBytes);
