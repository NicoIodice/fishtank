namespace Fishtank.Api.Models;

public record AuditPageDto(
    List<AuditEntryDto> Items,
    int Total,
    int Page,
    int PageSize);
