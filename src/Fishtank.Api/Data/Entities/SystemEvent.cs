namespace Fishtank.Api.Data.Entities;

public class SystemEvent
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public SystemEventSeverity Severity { get; set; }
    public string Message { get; set; } = string.Empty;
    public Guid? ServiceId { get; set; }
    public Service? Service { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public bool IsRead { get; set; } = false;
}

public enum SystemEventSeverity { Info, Warning, Error }
