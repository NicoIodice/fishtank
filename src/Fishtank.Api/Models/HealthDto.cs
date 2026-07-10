namespace Fishtank.Api.Models;

public record HealthDto(
    int ActiveServicesCount,
    int TotalRequestCount,
    string DatabaseStatus,
    int UptimeSeconds);
