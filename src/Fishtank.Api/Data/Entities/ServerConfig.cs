namespace Fishtank.Api.Data.Entities;

/// <summary>
/// Single-row table — BootEpoch for container-lifetime JWT invalidation (FR-24).
/// </summary>
public class ServerConfig
{
    public int Id { get; set; } = 1; // Always 1
    public Guid BootEpoch { get; set; } = Guid.NewGuid();
    public bool CaptureFullHeaders { get; set; } = false;
}
