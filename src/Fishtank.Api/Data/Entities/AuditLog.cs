namespace Fishtank.Api.Data.Entities;

public class AuditLog
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Action type, e.g., TOGGLE_CHANGED, USER_CREATED, USER_DEACTIVATED</summary>
    public required string Action { get; set; }

    /// <summary>The user who initiated the action (null for system-generated entries)</summary>
    public Guid? ActorId { get; set; }
    public User? Actor { get; set; }

    /// <summary>Type of the resource affected (e.g., Toggle, User, Service)</summary>
    public required string ResourceType { get; set; }

    /// <summary>Identifier of the affected resource (toggle name, user GUID, service GUID)</summary>
    public string? ResourceId { get; set; }

    /// <summary>Additional context as JSON (e.g., {"from": false, "to": true})</summary>
    public string? Details { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
