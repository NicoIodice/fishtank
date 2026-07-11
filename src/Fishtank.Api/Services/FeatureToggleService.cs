using Fishtank.Api.Data;
using Fishtank.Api.Data.Entities;
using Fishtank.Api.Exceptions;
using Fishtank.Api.Hubs;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace Fishtank.Api.Services;

public interface IFeatureToggleService
{
    Task<List<FeatureToggleDto>> GetAllTogglesAsync(CancellationToken ct = default);
    Task<FeatureToggleDto> SetToggleAsync(string name, bool enabled, Guid actorId, CancellationToken ct = default);
}

public record FeatureToggleDto(
    string Name,
    string DisplayName,
    string Description,
    bool Enabled,
    DateTimeOffset UpdatedAt,
    bool? EnvVarOverride);

public class FeatureToggleService : IFeatureToggleService
{
    private readonly FishtankDbContext _db;
    private readonly IHubContext<TogglesHub> _hubContext;
    private readonly IAuditService _auditService;
    private readonly Dictionary<string, bool> _envVarOverrides;

    public FeatureToggleService(
        FishtankDbContext db,
        IHubContext<TogglesHub> hubContext,
        IAuditService auditService,
        IConfiguration configuration)
    {
        _db = db;
        _hubContext = hubContext;
        _auditService = auditService;
        _envVarOverrides = LoadEnvVarOverrides(configuration);
    }

    private static Dictionary<string, bool> LoadEnvVarOverrides(IConfiguration configuration)
    {
        var overrides = new Dictionary<string, bool>(StringComparer.OrdinalIgnoreCase);

        // auto_registration uses its own env var name (no _TOGGLE_ segment)
        var knownToggles = new Dictionary<string, string>
        {
            ["network_activity"]    = "FISHTANK_TOGGLE_NETWORK_ACTIVITY",
            ["mappings_editor"]     = "FISHTANK_TOGGLE_MAPPINGS_EDITOR",
            ["record_mode"]         = "FISHTANK_TOGGLE_RECORD_MODE",
            ["system_events"]       = "FISHTANK_TOGGLE_SYSTEM_EVENTS",
            ["services_management"] = "FISHTANK_TOGGLE_SERVICES_MANAGEMENT",
            ["auto_registration"]   = "FISHTANK_AUTO_REGISTRATION",
        };

        foreach (var (toggle, envKey) in knownToggles)
        {
            var envValue = configuration[envKey];

            if (!string.IsNullOrWhiteSpace(envValue) && bool.TryParse(envValue, out var value))
            {
                overrides[toggle] = value;
            }
        }

        return overrides;
    }

    public async Task<List<FeatureToggleDto>> GetAllTogglesAsync(CancellationToken ct = default)
    {
        var toggles = await _db.FeatureToggles.ToListAsync(ct);

        return toggles
            .Select(t => new FeatureToggleDto(
                t.Name,
                t.DisplayName,
                t.Description,
                // Apply env var override if it exists
                _envVarOverrides.TryGetValue(t.Name, out var envValue) ? envValue : t.Enabled,
                t.UpdatedAt,
                _envVarOverrides.TryGetValue(t.Name, out var envOverride) ? envOverride : null))
            .OrderBy(t => t.DisplayName)
            .ToList();
    }

    public async Task<FeatureToggleDto> SetToggleAsync(string name, bool enabled, Guid actorId, CancellationToken ct = default)
    {
        // AC-10: Env-var-locked toggle PUT returns 409
        if (_envVarOverrides.ContainsKey(name))
        {
            throw new ConflictException(
                "ADMIN_TOGGLE_ENV_LOCKED",
                $"Toggle '{name}' is locked by environment variable FISHTANK_TOGGLE_{name.ToUpperInvariant()} and cannot be changed at runtime.");
        }

        // AC-11: Unknown toggle name returns 404
        var toggle = await _db.FeatureToggles.FirstOrDefaultAsync(t => t.Name == name, ct);
        if (toggle == null)
        {
            throw new NotFoundException("ADMIN_TOGGLE_NOT_FOUND", $"Toggle '{name}' not found.");
        }

        var oldValue = toggle.Enabled;
        toggle.Enabled = enabled;
        toggle.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);

        // AC-8: Log audit entry
        await _auditService.LogAsync(
            AuditActions.ToggleChanged,
            actorId,
            "Toggle",
            toggle.Name,
            new { from = oldValue, to = enabled },
            ct);

        // AC-8: Broadcast via SignalR to all sessions
        await _hubContext.Clients.All.SendAsync("FeatureToggleChanged", new
        {
            name = toggle.Name,
            enabled = toggle.Enabled
        }, ct);

        return new FeatureToggleDto(
            toggle.Name,
            toggle.DisplayName,
            toggle.Description,
            toggle.Enabled,
            toggle.UpdatedAt,
            null);
    }
}
