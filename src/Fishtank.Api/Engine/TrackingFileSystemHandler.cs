using Serilog;

namespace Fishtank.Api.Engine;

/// <summary>
/// OS FileSystemWatcher wrapper for detecting external file modifications.
/// - InternalBufferSize = 65536 to prevent buffer overflow on bulk operations
/// - Watches mappings/ and responses/ folders per service
/// - Error handler logs ENGINE_FSW_BUFFER_OVERFLOW warning
/// </summary>
public class TrackingFileSystemHandler : IFileWatcher
{
    private readonly FileSystemWatcher _watcher;
    private readonly string _watchPath;

    public event Action<string>? OnCreated;
    public event Action<string>? OnChanged;
    public event Action<string>? OnDeleted;
    public event Action<string, string>? OnRenamed;
    public event Action<Exception>? OnError;

    public TrackingFileSystemHandler(string watchPath)
    {
        _watchPath = watchPath;
        _watcher = new FileSystemWatcher(watchPath)
        {
            IncludeSubdirectories = true,
            NotifyFilter = NotifyFilters.FileName | NotifyFilters.LastWrite | NotifyFilters.CreationTime,
            InternalBufferSize = 65536, // AC-9: prevent buffer overflow
        };

        _watcher.Created += (s, e) => OnCreated?.Invoke(e.FullPath);
        _watcher.Changed += (s, e) => OnChanged?.Invoke(e.FullPath);
        _watcher.Deleted += (s, e) => OnDeleted?.Invoke(e.FullPath);
        _watcher.Renamed += (s, e) => OnRenamed?.Invoke(e.OldFullPath, e.FullPath);
        _watcher.Error += (s, e) =>
        {
            var ex = e.GetException();
            Log.Warning(ex, "ENGINE_FSW_BUFFER_OVERFLOW: FileSystemWatcher buffer overflow or error on {WatchPath}", _watchPath);
            OnError?.Invoke(ex);
        };
    }

    public void Start() => _watcher.EnableRaisingEvents = true;
    public void Stop() => _watcher.EnableRaisingEvents = false;

    public void Dispose()
    {
        _watcher.Dispose();
        GC.SuppressFinalize(this);
    }
}
