using System.Text;
using System.Text.Json;
using Fishtank.Api.Exceptions;
using Serilog;

namespace Fishtank.Api.Services;

/// <summary>
/// Record mode implementation — global auto-capture of proxied requests.
/// Thread-safe via lock on _lock object.
/// Delegates file writes to MappingService (same logic as Story 4.4 single-click save).
/// Uses IServiceScopeFactory to access scoped services from singleton context.
/// </summary>
public class RecordingService(IServiceScopeFactory scopeFactory) : IRecordingService
{
    private readonly object _lock = new();
    private bool _isRecording;
    private DateTimeOffset? _startedAt;

    public Task StartAsync(CancellationToken ct = default)
    {
        lock (_lock)
        {
            if (_isRecording)
                throw new ConflictException("RECORDING_ALREADY_ACTIVE", "Recording is already active.");

            _isRecording = true;
            _startedAt = DateTimeOffset.UtcNow;
        }

        Log.Information("[RecordingService] Recording started");
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken ct = default)
    {
        lock (_lock)
        {
            if (!_isRecording)
                throw new ConflictException("RECORDING_NOT_ACTIVE", "Recording is not currently active.");

            _isRecording = false;
            _startedAt = null;
        }

        Log.Information("[RecordingService] Recording stopped");
        return Task.CompletedTask;
    }

    public Task<(bool IsRecording, DateTimeOffset? StartedAt)> GetStatusAsync(CancellationToken ct = default)
    {
        lock (_lock)
        {
            return Task.FromResult((_isRecording, _startedAt));
        }
    }

    public Task<bool> IsRecordingAsync()
    {
        lock (_lock)
        {
            return Task.FromResult(_isRecording);
        }
    }

    public async Task CaptureAsync(
        Guid serviceId,
        string serviceSlug,
        string method,
        string urlPath,
        int statusCode,
        string responseBody,
        CancellationToken ct = default)
    {
        // Slugification logic — identical to Story 4.4
        var pathSlug = SlugifyPath(urlPath);
        var methodUpper = method.ToUpperInvariant();

        var baseName = $"{methodUpper}_{pathSlug}_{statusCode}";
        var mappingPath = $"{serviceSlug}/mappings/{baseName}.json";
        var responsePath = $"{serviceSlug}/responses/{baseName}_body.json";
        var relativeResponsePath = $"../responses/{baseName}_body.json";

        // Build Mapping JSON
        var mappingJson = new
        {
            Request = new
            {
                Methods = new[] { methodUpper },
                Path = urlPath
            },
            Response = new
            {
                Status = statusCode,
                BodyAsFile = relativeResponsePath
            }
        };

        var mappingContent = JsonSerializer.Serialize(mappingJson, new JsonSerializerOptions
        {
            WriteIndented = true
        });

        // Create scope to access scoped services from singleton context
        using var scope = scopeFactory.CreateScope();
        var mappingService = scope.ServiceProvider.GetRequiredService<IMappingService>();
        var systemEvents = scope.ServiceProvider.GetRequiredService<ISystemEventService>();

        // Write Mapping file (with numeric suffix if exists)
        try
        {
            var finalMappingPath = await GetUniquePathAsync(mappingService, mappingPath, ct);
            await mappingService.CreateFileAsync(finalMappingPath, mappingContent, ct);
        }
        catch (Exception ex) when (ex is not ValidationException)
        {
            Log.Error(ex, "[RecordingService] CaptureAsync failed to write Mapping file: {Path}", mappingPath);
            await systemEvents.AddAsync(
                Data.Entities.SystemEventSeverity.Error,
                $"Recording failed to save Mapping file '{mappingPath}': {ex.Message}",
                null, ct);
            return; // Stop here — don't write Response file if Mapping failed
        }

        // Write Response file (with numeric suffix if exists)
        try
        {
            var finalResponsePath = await GetUniquePathAsync(mappingService, responsePath, ct);
            await mappingService.CreateFileAsync(finalResponsePath, responseBody, ct);
        }
        catch (Exception ex) when (ex is not ValidationException)
        {
            Log.Error(ex, "[RecordingService] CaptureAsync failed to write Response file: {Path}", responsePath);
            await systemEvents.AddAsync(
                Data.Entities.SystemEventSeverity.Error,
                $"Recording failed to save Response file '{responsePath}': {ex.Message}",
                null, ct);
        }
    }

    /// <summary>
    /// Slugify URL path: lowercase, / → _, leading _ removed, non-alphanumeric removed, max 64 chars.
    /// Identical to Story 4.4 logic.
    /// </summary>
    private static string SlugifyPath(string urlPath)
    {
        var slug = urlPath
            .ToLowerInvariant()
            .Replace("/", "_")
            .TrimStart('_');

        var sb = new StringBuilder();
        foreach (var c in slug)
        {
            if (char.IsLetterOrDigit(c) || c == '_')
                sb.Append(c);
        }

        var result = sb.ToString();
        return result.Length > 64 ? result[..64] : result;
    }

    /// <summary>
    /// Generate unique file path by appending numeric suffix (_2, _3, ...) if file exists.
    /// </summary>
    private static async Task<string> GetUniquePathAsync(IMappingService mappingService, string basePath, CancellationToken ct)
    {
        // Check if base path is available
        try
        {
            // Try reading — if not found, path is available
            await mappingService.ReadFileAsync(basePath, ct);
        }
        catch (NotFoundException)
        {
            // File doesn't exist — use base path
            return basePath;
        }

        // File exists — generate numeric suffix
        var extension = Path.GetExtension(basePath);
        var baseWithoutExt = basePath[..^extension.Length];

        for (var i = 2; i <= 999; i++)
        {
            var candidate = $"{baseWithoutExt}_{i}{extension}";
            try
            {
                await mappingService.ReadFileAsync(candidate, ct);
            }
            catch (NotFoundException)
            {
                // This path is available
                return candidate;
            }
        }

        // Fallback: use timestamp suffix (extremely unlikely to reach here)
        return $"{baseWithoutExt}_{DateTimeOffset.UtcNow.Ticks}{extension}";
    }
}
