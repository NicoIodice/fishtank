using Fishtank.Api.Data;
using Fishtank.Api.Data.Entities;
using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace Fishtank.Api.Services;

public interface IAuditService
{
    Task LogAsync(string action, Guid? actorId, string resourceType, string? resourceId, object? details = null, CancellationToken ct = default);
}

public class AuditService : IAuditService
{
    private readonly FishtankDbContext _db;
    private readonly ILogger<AuditService> _logger;

    public AuditService(FishtankDbContext db, ILogger<AuditService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task LogAsync(
        string action,
        Guid? actorId,
        string resourceType,
        string? resourceId,
        object? details = null,
        CancellationToken ct = default)
    {
        try
        {
            var entry = new AuditLog
            {
                Action = action,
                ActorId = actorId,
                ResourceType = resourceType,
                ResourceId = resourceId,
                Details = details != null ? JsonSerializer.Serialize(details) : null,
                CreatedAt = DateTimeOffset.UtcNow
            };

            _db.AuditLogs.Add(entry);
            await _db.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            // Audit logging must not fail the main operation — log the failure to stdout
            _logger.LogWarning(ex,
                "Audit logging failed for action {Action} on {ResourceType}/{ResourceId}. " +
                "The primary operation succeeded; this is an observability gap only.",
                action, resourceType, resourceId);
        }
    }
}
