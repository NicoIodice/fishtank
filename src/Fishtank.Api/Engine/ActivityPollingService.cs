using System.Collections.Concurrent;
using Fishtank.Api.Data;
using Fishtank.Api.Models;
using Fishtank.Api.Services;
using Serilog;
using WireMock.Logging;
using WireMock.Types;

namespace Fishtank.Api.Engine;

/// <summary>
/// Background hosted service that polls WireMock <see cref="ILogEntry"/> queues
/// at 250ms intervals and feeds new entries into <see cref="IActivityService"/>.
/// </summary>
public class ActivityPollingService(
    IServicesRegistry registry,
    IServiceScopeFactory scopeFactory) : IHostedService
{
    private Timer? _timer;
    private int _isPolling; // 0=idle, 1=running — prevents re-entrant polling
    private readonly ConcurrentDictionary<Guid, int> _logOffsets = new();
    private readonly ConcurrentDictionary<Guid, (string Name, int Port)> _serviceInfo = new();

    public Task StartAsync(CancellationToken cancellationToken)
    {
        _timer = new Timer(
            _ => _ = PollLogEntriesAsync(),
            null,
            TimeSpan.FromMilliseconds(250),
            TimeSpan.FromMilliseconds(250));
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        _timer?.Dispose();
        return Task.CompletedTask;
    }

    private async Task PollLogEntriesAsync()
    {
        if (Interlocked.CompareExchange(ref _isPolling, 1, 0) != 0)
            return;

        try
        {
            foreach (var (serviceId, server) in registry.GetAll())
            {
                var entries = server.LogEntries.ToList();
                var offset = _logOffsets.GetOrAdd(serviceId, 0);
                var newCount = entries.Count - offset;
                if (newCount <= 0) continue;

                _logOffsets[serviceId] = entries.Count;

                foreach (var entry in entries.Skip(offset))
                    await ProcessLogEntryAsync(serviceId, entry);
            }
        }
        finally
        {
            _isPolling = 0;
        }
    }

    private async Task ProcessLogEntryAsync(Guid serviceId, ILogEntry entry)
    {
        try
        {
            if (!_serviceInfo.TryGetValue(serviceId, out var info))
            {
                info = await FetchServiceInfoAsync(serviceId);
                if (info == default)
                    return;
                _serviceInfo.TryAdd(serviceId, info);
            }

            var req = entry.RequestMessage;
            var resp = entry.ResponseMessage;

            if (req is null) return;

            var durationMs = resp is not null
                ? Math.Max(0, (int)(resp.DateTime - req.DateTime).TotalMilliseconds)
                : 0;

            var type = entry.MappingGuid.HasValue ? ActivityType.Mocked : ActivityType.Proxied;

            var statusCode = resp?.StatusCode is int sc
                ? sc
                : int.TryParse(resp?.StatusCode?.ToString(), out var scn) ? scn : 0;

            var row = new ActivityRow
            {
                Timestamp = new DateTimeOffset(req.DateTime, TimeSpan.Zero),
                Method = req.Method ?? "UNKNOWN",
                UrlPath = req.AbsolutePath ?? "/",
                StatusCode = statusCode,
                Type = type,
                ServiceId = serviceId,
                ServiceName = info.Name,
                ServicePort = info.Port,
                DurationMs = durationMs,
                RequestHeaders = FlattenHeaders(req.Headers),
                RequestBody = req.Body,
                ResponseHeaders = FlattenHeaders(resp?.Headers),
                ResponseBody = resp?.BodyOriginal,
            };

            using var scope = scopeFactory.CreateScope();
            var headerRedaction = scope.ServiceProvider.GetRequiredService<IHeaderRedactionService>();
            var activityService = scope.ServiceProvider.GetRequiredService<IActivityService>();

            row = row with
            {
                RequestHeaders = headerRedaction.Redact(row.RequestHeaders),
                ResponseHeaders = headerRedaction.Redact(row.ResponseHeaders),
            };

            await activityService.CaptureAsync(row);
        }
        catch (Exception ex)
        {
            Log.Warning(ex, "Error processing WireMock log entry for service {ServiceId}", serviceId);
        }
    }

    private async Task<(string Name, int Port)> FetchServiceInfoAsync(Guid serviceId)
    {
        try
        {
            using var scope = scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<FishtankDbContext>();
            var svc = await db.Services.FindAsync(serviceId);
            return svc is null ? default : (svc.Name, svc.Port);
        }
        catch (Exception ex)
        {
            Log.Warning(ex, "Failed to fetch service info for {ServiceId}", serviceId);
            return default;
        }
    }

    private static Dictionary<string, string> FlattenHeaders(
        IDictionary<string, WireMockList<string>>? headers)
    {
        if (headers is null) return new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        return headers.ToDictionary(
            kvp => kvp.Key,
            kvp => string.Join(", ", kvp.Value),
            StringComparer.OrdinalIgnoreCase);
    }
}
