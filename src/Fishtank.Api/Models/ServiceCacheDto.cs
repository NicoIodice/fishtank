namespace Fishtank.Api.Models;

public record ServiceCacheDto(
    Guid ServiceId,
    string ServiceName,
    string Slug,
    int EntryCount,
    long EstimatedBytes);
