namespace Fishtank.Api.Models;

public record SystemEventDto(
    Guid Id,
    string Severity,          // "info" | "warning" | "error" (lowercased)
    string Message,
    Guid? ServiceId,
    string? ServiceName,      // resolved display name, null when no service
    DateTimeOffset CreatedAt,
    bool IsRead);

public record SystemEventPageDto(
    IReadOnlyList<SystemEventDto> Items,
    int Total,                // total matching the severity filter
    bool HasMore);            // more pages available beyond Items
