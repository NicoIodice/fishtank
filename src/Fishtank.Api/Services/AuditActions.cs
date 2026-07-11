namespace Fishtank.Api.Services;

/// <summary>
/// Audit action constants for the AuditLog.Action field.
/// </summary>
public static class AuditActions
{
    public const string ToggleChanged = "TOGGLE_CHANGED";
    public const string UserCreated = "USER_CREATED";
    public const string UserDeactivated = "USER_DEACTIVATED";
    public const string ServiceCreated = "SERVICE_CREATED";
    public const string ServiceEdited = "SERVICE_EDITED";
    public const string ServiceStarted = "SERVICE_STARTED";
    public const string ServiceStopped = "SERVICE_STOPPED";
}
