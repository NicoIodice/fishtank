using System.Collections.Concurrent;
using Fishtank.Api.Models;
using Microsoft.Extensions.Configuration;

namespace Fishtank.Api.Engine;

/// <summary>
/// Thread-safe singleton in-memory store for WireMock request/response activity.
/// Maintains a per-service FIFO queue capped at <see cref="_maxRowsPerService"/> rows.
/// Activity data is held in memory only and is cleared when the container restarts.
/// </summary>
public sealed class ActivityStore : IActivityStore
{
    private readonly int _maxRowsPerService;
    private readonly ConcurrentDictionary<Guid, ConcurrentQueue<ActivityRow>> _queues = new();

    // For unit tests: new ActivityStore() or new ActivityStore(maxRowsPerService: N)
    public ActivityStore(int maxRowsPerService = 5000)
    {
        _maxRowsPerService = maxRowsPerService;
    }

    // For DI: reads FISHTANK_ACTIVITY_LOG_MAX_ROWS env var / config key
    public ActivityStore(IConfiguration configuration)
    {
        var raw = configuration["FISHTANK_ACTIVITY_LOG_MAX_ROWS"];
        _maxRowsPerService = int.TryParse(raw, out var n) && n > 0 ? n : 5000;
    }

    public void Add(Guid serviceId, ActivityRow row)
    {
        var queue = _queues.GetOrAdd(serviceId, _ => new ConcurrentQueue<ActivityRow>());
        queue.Enqueue(row);
        // FIFO eviction: drop oldest entries until under cap
        while (queue.Count > _maxRowsPerService)
            queue.TryDequeue(out _);
    }

    public IReadOnlyList<ActivityRow> GetAll(Guid? serviceId = null)
    {
        if (serviceId.HasValue)
        {
            if (!_queues.TryGetValue(serviceId.Value, out var q))
                return Array.Empty<ActivityRow>();
            return q.OrderByDescending(r => r.Timestamp).ToList().AsReadOnly();
        }

        return _queues.Values
            .SelectMany(q => q)
            .OrderByDescending(r => r.Timestamp)
            .ToList()
            .AsReadOnly();
    }

    public void Clear()
    {
        foreach (var queue in _queues.Values)
            while (queue.TryDequeue(out _)) { }
    }
}
