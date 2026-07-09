namespace Fishtank.Api.Data.Entities;

public class FeatureToggle
{
    public Guid Id { get; set; }
    public required string Name { get; set; }        // e.g., "network_activity"
    public required string DisplayName { get; set; } // e.g., "Network Activity"
    public required string Description { get; set; } // One-line description
    public bool Enabled { get; set; } = true;        // Default enabled
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
