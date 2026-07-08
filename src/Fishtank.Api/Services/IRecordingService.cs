namespace Fishtank.Api.Services;

/// <summary>
/// Record mode management — global toggle for auto-capture.
/// When active, every proxied request is automatically promoted to a Mapping + Response file pair.
/// </summary>
public interface IRecordingService
{
    /// <summary>
    /// Start Record mode. Throws ConflictException if already recording.
    /// </summary>
    Task StartAsync(CancellationToken ct = default);

    /// <summary>
    /// Stop Record mode. Throws ConflictException if not currently recording.
    /// </summary>
    Task StopAsync(CancellationToken ct = default);

    /// <summary>
    /// Get current recording status.
    /// </summary>
    Task<(bool IsRecording, DateTimeOffset? StartedAt)> GetStatusAsync(CancellationToken ct = default);

    /// <summary>
    /// Auto-capture a proxied request as Mapping + Response files.
    /// Called by ActivityPollingService when IsRecording and request is Proxied.
    /// Uses the same slug/filename logic as Story 4.4.
    /// </summary>
    Task CaptureAsync(
        Guid serviceId,
        string serviceSlug,
        string method,
        string urlPath,
        int statusCode,
        string responseBody,
        CancellationToken ct = default);

    /// <summary>
    /// Check if recording is currently active (for polling hook).
    /// </summary>
    Task<bool> IsRecordingAsync();
}
