using System.Diagnostics;
using Fishtank.Api.Data;
using Fishtank.Api.Exceptions;
using Fishtank.Api.Hubs;
using Fishtank.Api.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Serilog;

namespace Fishtank.Api.Services;

/// <summary>
/// Resync engine — reloads all Mapping and Response files from disk.
/// - SemaphoreSlim(1,1) guard: concurrent calls return HTTP 409 RESYNC_IN_PROGRESS
/// - Compares LastWriteTime against _lastKnownModified for conflict detection
/// - Broadcasts ResyncCompleted event via ServicesHub on completion
/// </summary>
public class ResyncService(
    IConfiguration configuration,
    FishtankDbContext db,
    IHubContext<ServicesHub> servicesHub) : IResyncService
{
    private readonly string _mocksRoot = configuration["FISHTANK_MOCKS_ROOT"]
        ?? throw new InvalidOperationException("FISHTANK_MOCKS_ROOT must be set");

    private static readonly SemaphoreSlim _resyncLock = new(1, 1);

    public async Task<ResyncResultDto> ResyncAsync(CancellationToken ct = default)
    {
        // AC-12: Concurrent Resync guard
        if (!await _resyncLock.WaitAsync(0, ct))
            throw new ValidationException("RESYNC_IN_PROGRESS",
                "A resync operation is already in progress. Please wait.");

        try
        {
            var sw = Stopwatch.StartNew();
            var mappingsLoaded = 0;
            var responsesLoaded = 0;
            var conflicts = new List<ConflictDto>();
            var failures = new List<ResyncFailureDto>();

            if (!Directory.Exists(_mocksRoot))
            {
                Log.Warning("RESYNC: Mocks root does not exist: {MocksRoot}", _mocksRoot);
                sw.Stop();
                return new ResyncResultDto(0, 0, sw.ElapsedMilliseconds, conflicts, failures);
            }

            // Get all active services
            var services = await db.Services
                .Where(s => s.DeletedAt == null)
                .ToListAsync(ct);

            foreach (var service in services)
            {
                var mappingsDir = Path.Combine(_mocksRoot, service.MocksRoot, "mappings");
                var responsesDir = Path.Combine(_mocksRoot, service.MocksRoot, "responses");

                if (Directory.Exists(mappingsDir))
                {
                    var result = await ReloadDirectoryAsync(mappingsDir, ct);
                    mappingsLoaded += result.LoadedCount;
                    conflicts.AddRange(result.Conflicts);
                    failures.AddRange(result.Failures);
                }

                if (Directory.Exists(responsesDir))
                {
                    var result = await ReloadDirectoryAsync(responsesDir, ct);
                    responsesLoaded += result.LoadedCount;
                    conflicts.AddRange(result.Conflicts);
                    failures.AddRange(result.Failures);
                }
            }

            sw.Stop();

            var dto = new ResyncResultDto(
                mappingsLoaded,
                responsesLoaded,
                sw.ElapsedMilliseconds,
                conflicts,
                failures);

            // AC-15: Broadcast ResyncCompleted event
            await servicesHub.Clients.All.SendAsync("ResyncCompleted", dto, ct);

            return dto;
        }
        finally
        {
            _resyncLock.Release();
        }
    }

    private async Task<(int LoadedCount, List<ConflictDto> Conflicts, List<ResyncFailureDto> Failures)> ReloadDirectoryAsync(
        string directory,
        CancellationToken ct)
    {
        var loadedCount = 0;
        var conflicts = new List<ConflictDto>();
        var failures = new List<ResyncFailureDto>();

        try
        {
            var files = Directory.EnumerateFiles(directory, "*.*", SearchOption.AllDirectories);

            foreach (var file in files)
            {
                ct.ThrowIfCancellationRequested();

                try
                {
                    // Read file to validate it's accessible
                    _ = await File.ReadAllTextAsync(file, ct);

                    var fileInfo = new FileInfo(file);
                    var currentModified = fileInfo.LastWriteTimeUtc;

                    // AC-11: Conflict detection
                    if (MappingService.TryGetLastKnownModified(file, out var lastKnown))
                    {
                        if (currentModified > lastKnown)
                        {
                            conflicts.Add(new ConflictDto(
                                Path.GetRelativePath(_mocksRoot, file).Replace('\\', '/'),
                                "File modified externally since last load"));
                        }
                    }

                    // Update last known modified timestamp
                    MappingService.UpdateLastKnownModified(file, currentModified);
                    loadedCount++;
                }
                catch (Exception ex)
                {
                    Log.Warning(ex, "RESYNC: Failed to load file {File}", file);
                    failures.Add(new ResyncFailureDto(
                        Path.GetRelativePath(_mocksRoot, file).Replace('\\', '/'),
                        ex.Message));
                }
            }
        }
        catch (Exception ex)
        {
            Log.Error(ex, "RESYNC: Failed to enumerate directory {Directory}", directory);
            failures.Add(new ResyncFailureDto(
                Path.GetRelativePath(_mocksRoot, directory).Replace('\\', '/'),
                $"Failed to enumerate directory: {ex.Message}"));
        }

        return (loadedCount, conflicts, failures);
    }
}
