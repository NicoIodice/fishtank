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
        await activityService.ClearAsync();
        
        // Clear persisted SystemEvents (infrastructure/audit events)
        await systemEventService.ClearAllAsync(SystemEventGroup.WarningsErrors, ct);
        await systemEventService.ClearAllAsync(SystemEventGroup.Info, ct);
        
        // Reload all mappings from disk
        var resyncResult = await resyncService.ResyncAsync(ct);
        var mappingsReloaded = resyncResult.MappingsLoaded + resyncResult.ResponsesLoaded;

        // For entriesCleared, we return 0 for now since ClearAsync doesn't return a count
        // The actual count is verified in tests by checking the database before/after
        var entriesCleared = 0;

        logger.LogInformation(
            "Pipeline reset complete: {EntriesCleared} entries cleared, {MappingsReloaded} mappings reloaded",
            entriesCleared,
            mappingsReloaded);

        return new ResetResult(entriesCleared, mappingsReloaded);
    }
}
