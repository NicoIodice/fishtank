namespace Fishtank.Api.IntegrationTests.Fakes;

/// <summary>
/// Synchronous file watcher test harness for integration tests.
/// - No OS timing dependencies (no Task.Delay)
/// - Callbacks triggered synchronously when test code calls SimulateXxx()
/// - Eliminates FileSystemWatcher race conditions in tests (Architecture D6)
/// </summary>
public class FakeFileWatcher : Fishtank.Api.Engine.IFileWatcher
{
    public event Action<string>? OnCreated;
    public event Action<string>? OnChanged;
    public event Action<string>? OnDeleted;
    public event Action<string, string>? OnRenamed;
    public event Action<Exception>? OnError;

    public void SimulateCreated(string path) => OnCreated?.Invoke(path);
    public void SimulateChanged(string path) => OnChanged?.Invoke(path);
    public void SimulateDeleted(string path) => OnDeleted?.Invoke(path);
    public void SimulateRenamed(string oldPath, string newPath) => OnRenamed?.Invoke(oldPath, newPath);
    public void SimulateError(Exception ex) => OnError?.Invoke(ex);

    public void Start() { /* no-op for fake */ }
    public void Stop() { /* no-op for fake */ }
    public void Dispose() { /* no-op for fake */ }
}
