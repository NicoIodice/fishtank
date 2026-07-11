using Fishtank.Api.Data;
using Fishtank.Api.Engine;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Fishtank.Api.Services;

/// <summary>
/// Pipeline reset service — clears activity log and reloads all WireMock mappings from disk.
/// Used by CI/CD pipelines to reset Fishtank to a clean state between test runs
/// without restarting the container.
/// </summary>
public class PipelineResetService(
    IActivityService activityService,
    ISystemEventService systemEventService,
    IResyncService resyncService,
    ILogger<PipelineResetService> logger) : IPipelineResetService
{
    public async Task<ResetResult> ResetAsync(CancellationToken ct = default)
    {
        logger.LogInformation("Pipeline reset initiated");

        // Clear in-memory activity log (request/response capture data)
        var activityCleared = await activityService.ClearAsync();

        // Clear persisted SystemEvents (infrastructure/audit events)
        var warningsErrorsCleared = await systemEventService.ClearAllAsync(SystemEventGroup.WarningsErrors, ct);
        var infoCleared = await systemEventService.ClearAllAsync(SystemEventGroup.Info, ct);

        // Reload all mappings from disk
        var resyncResult = await resyncService.ResyncAsync(ct);
        var mappingsReloaded = resyncResult.MappingsLoaded + resyncResult.ResponsesLoaded;

        // Sum all cleared entries: activity log + warnings/errors + info events
        var entriesCleared = activityCleared + warningsErrorsCleared + infoCleared;

        logger.LogInformation(
            "Pipeline reset complete: {EntriesCleared} entries cleared, {MappingsReloaded} mappings reloaded",
            entriesCleared,
            mappingsReloaded);

        return new ResetResult(entriesCleared, mappingsReloaded);
    }
}
