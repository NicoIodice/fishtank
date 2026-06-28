namespace Fishtank.Api.Engine;

/// <summary>
/// File system watcher abstraction for detecting external file modifications.
/// Implementations:
/// - TrackingFileSystemHandler: OS FileSystemWatcher wrapper for production
/// - FakeFileWatcher: synchronous test harness (no Task.Delay dependencies)
/// </summary>
public interface IFileWatcher : IDisposable
{
    event Action<string>? OnCreated;
    event Action<string>? OnChanged;
    event Action<string>? OnDeleted;
    event Action<string, string>? OnRenamed; // oldPath, newPath
    event Action<Exception>? OnError;

    void Start();
    void Stop();
}
