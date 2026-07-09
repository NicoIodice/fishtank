using System;
using System.Linq;
using System.Reflection;
using FluentAssertions;
using Fishtank.Api.Engine;
using Xunit;
using Fishtank.Api.IntegrationTests.Fakes;

namespace Fishtank.Api.IntegrationTests.Engine;

/// <summary>
/// Integration tests for IFileWatcher interface and implementations.
/// Covers AC-8 (interface contract), AC-9 (TrackingFileSystemHandler properties),
/// and AC-10 (FakeFileWatcher synchronous callbacks).
/// </summary>
[Collection("Integration")]
public class FileWatcherContractTests
{
    // ─────────────────────────────────────────────────────────────────────────
    // AC-8: IFileWatcher interface defines required callbacks
    // ─────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-8: IFileWatcher interface — defines OnCreated callback")]
    public void IFileWatcher_DefinesOnCreatedEvent()
    {
        // Arrange
        var interfaceType = typeof(IFileWatcher);

        // Act
        var onCreatedEvent = interfaceType.GetEvent("OnCreated");

        // Assert
        onCreatedEvent.Should().NotBeNull("IFileWatcher must define OnCreated event");
        onCreatedEvent!.EventHandlerType.Should().Be(typeof(Action<string>),
            "OnCreated must accept Action<string> delegate");
    }

    [Fact(DisplayName = "AC-8: IFileWatcher interface — defines OnChanged callback")]
    public void IFileWatcher_DefinesOnChangedEvent()
    {
        // Arrange
        var interfaceType = typeof(IFileWatcher);

        // Act
        var onChangedEvent = interfaceType.GetEvent("OnChanged");

        // Assert
        onChangedEvent.Should().NotBeNull("IFileWatcher must define OnChanged event");
        onChangedEvent!.EventHandlerType.Should().Be(typeof(Action<string>),
            "OnChanged must accept Action<string> delegate");
    }

    [Fact(DisplayName = "AC-8: IFileWatcher interface — defines OnDeleted callback")]
    public void IFileWatcher_DefinesOnDeletedEvent()
    {
        // Arrange
        var interfaceType = typeof(IFileWatcher);

        // Act
        var onDeletedEvent = interfaceType.GetEvent("OnDeleted");

        // Assert
        onDeletedEvent.Should().NotBeNull("IFileWatcher must define OnDeleted event");
        onDeletedEvent!.EventHandlerType.Should().Be(typeof(Action<string>),
            "OnDeleted must accept Action<string> delegate");
    }

    [Fact(DisplayName = "AC-8: IFileWatcher interface — defines OnRenamed callback")]
    public void IFileWatcher_DefinesOnRenamedEvent()
    {
        // Arrange
        var interfaceType = typeof(IFileWatcher);

        // Act
        var onRenamedEvent = interfaceType.GetEvent("OnRenamed");

        // Assert
        onRenamedEvent.Should().NotBeNull("IFileWatcher must define OnRenamed event");
        onRenamedEvent!.EventHandlerType.Should().Be(typeof(Action<string, string>),
            "OnRenamed must accept Action<string, string> delegate for (oldPath, newPath)");
    }

    [Fact(DisplayName = "AC-8: IFileWatcher interface — defines OnError callback")]
    public void IFileWatcher_DefinesOnErrorEvent()
    {
        // Arrange
        var interfaceType = typeof(IFileWatcher);

        // Act
        var onErrorEvent = interfaceType.GetEvent("OnError");

        // Assert
        onErrorEvent.Should().NotBeNull("IFileWatcher must define OnError event");
        onErrorEvent!.EventHandlerType.Should().Be(typeof(Action<Exception>),
            "OnError must accept Action<Exception> delegate");
    }

    [Fact(DisplayName = "AC-8: IFileWatcher interface — defines Start method")]
    public void IFileWatcher_DefinesStartMethod()
    {
        // Arrange
        var interfaceType = typeof(IFileWatcher);

        // Act
        var startMethod = interfaceType.GetMethod("Start");

        // Assert
        startMethod.Should().NotBeNull("IFileWatcher must define Start method");
        startMethod!.ReturnType.Should().Be(typeof(void),
            "Start method must return void");
    }

    [Fact(DisplayName = "AC-8: IFileWatcher interface — defines Stop method")]
    public void IFileWatcher_DefinesStopMethod()
    {
        // Arrange
        var interfaceType = typeof(IFileWatcher);

        // Act
        var stopMethod = interfaceType.GetMethod("Stop");

        // Assert
        stopMethod.Should().NotBeNull("IFileWatcher must define Stop method");
        stopMethod!.ReturnType.Should().Be(typeof(void),
            "Stop method must return void");
    }

    [Fact(DisplayName = "AC-8: IFileWatcher interface — implements IDisposable")]
    public void IFileWatcher_ImplementsIDisposable()
    {
        // Arrange
        var interfaceType = typeof(IFileWatcher);

        // Act
        var isDisposable = typeof(IDisposable).IsAssignableFrom(interfaceType);

        // Assert
        isDisposable.Should().BeTrue(
            "IFileWatcher must implement IDisposable for resource cleanup");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AC-9: TrackingFileSystemHandler properties
    // ─────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-9: TrackingFileSystemHandler — InternalBufferSize = 65536")]
    public void TrackingFileSystemHandler_HasCorrectInternalBufferSize()
    {
        // Arrange
        var testPath = Path.Combine(Path.GetTempPath(), "fishtank-watcher-test", Guid.NewGuid().ToString());
        Directory.CreateDirectory(testPath);

        try
        {
            // Act
            using var handler = new TrackingFileSystemHandler(testPath);

            // Access private _watcher field via reflection to verify InternalBufferSize
            var handlerType = handler.GetType();
            var watcherField = handlerType.GetField("_watcher",
                BindingFlags.NonPublic | BindingFlags.Instance);

            watcherField.Should().NotBeNull("TrackingFileSystemHandler must have _watcher field");

            var watcher = watcherField!.GetValue(handler) as System.IO.FileSystemWatcher;
            watcher.Should().NotBeNull();

            // Assert
            watcher!.InternalBufferSize.Should().Be(65536,
                "InternalBufferSize must be 65536 to prevent buffer overflow on bulk operations (AC-9)");
        }
        finally
        {
            if (Directory.Exists(testPath))
                Directory.Delete(testPath, true);
        }
    }

    [Fact(DisplayName = "AC-9: TrackingFileSystemHandler — IncludeSubdirectories = true")]
    public void TrackingFileSystemHandler_IncludesSubdirectories()
    {
        // Arrange
        var testPath = Path.Combine(Path.GetTempPath(), "fishtank-watcher-test", Guid.NewGuid().ToString());
        Directory.CreateDirectory(testPath);

        try
        {
            // Act
            using var handler = new TrackingFileSystemHandler(testPath);

            // Access private _watcher field via reflection
            var handlerType = handler.GetType();
            var watcherField = handlerType.GetField("_watcher",
                BindingFlags.NonPublic | BindingFlags.Instance);

            var watcher = watcherField!.GetValue(handler) as System.IO.FileSystemWatcher;

            // Assert
            watcher!.IncludeSubdirectories.Should().BeTrue(
                "IncludeSubdirectories must be true to watch mappings/ and responses/ folders recursively");
        }
        finally
        {
            if (Directory.Exists(testPath))
                Directory.Delete(testPath, true);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AC-10: FakeFileWatcher.Simulate* fires callbacks synchronously
    // ─────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-10: FakeFileWatcher.SimulateCreated -- fires OnCreated synchronously")]
    public void FakeFileWatcher_SimulateCreated_FiresOnCreatedSynchronously()
    {
        var watcher = new FakeFileWatcher();
        string? captured = null;
        watcher.OnCreated += path => captured = path;
        watcher.SimulateCreated("/svc/mappings/new.json");
        captured.Should().Be("/svc/mappings/new.json",
            "SimulateCreated must invoke OnCreated synchronously with the given path");
    }

    [Fact(DisplayName = "AC-10: FakeFileWatcher.SimulateChanged -- fires OnChanged synchronously")]
    public void FakeFileWatcher_SimulateChanged_FiresOnChangedSynchronously()
    {
        var watcher = new FakeFileWatcher();
        string? captured = null;
        watcher.OnChanged += path => captured = path;
        watcher.SimulateChanged("/svc/mappings/modified.json");
        captured.Should().Be("/svc/mappings/modified.json",
            "SimulateChanged must invoke OnChanged synchronously with the given path");
    }

    [Fact(DisplayName = "AC-10: FakeFileWatcher.SimulateDeleted -- fires OnDeleted synchronously")]
    public void FakeFileWatcher_SimulateDeleted_FiresOnDeletedSynchronously()
    {
        var watcher = new FakeFileWatcher();
        string? captured = null;
        watcher.OnDeleted += path => captured = path;
        watcher.SimulateDeleted("/svc/mappings/gone.json");
        captured.Should().Be("/svc/mappings/gone.json",
            "SimulateDeleted must invoke OnDeleted synchronously with the given path");
    }

    [Fact(DisplayName = "AC-10: FakeFileWatcher.SimulateRenamed -- fires OnRenamed synchronously with both paths")]
    public void FakeFileWatcher_SimulateRenamed_FiresOnRenamedSynchronously()
    {
        var watcher = new FakeFileWatcher();
        string? capturedOld = null; string? capturedNew = null;
        watcher.OnRenamed += (oldPath, newPath) => { capturedOld = oldPath; capturedNew = newPath; };
        watcher.SimulateRenamed("/svc/mappings/old.json", "/svc/mappings/new.json");
        capturedOld.Should().Be("/svc/mappings/old.json", "SimulateRenamed must pass the old path");
        capturedNew.Should().Be("/svc/mappings/new.json", "SimulateRenamed must pass the new path");
    }

    [Fact(DisplayName = "AC-10: FakeFileWatcher.SimulateError -- fires OnError synchronously")]
    public void FakeFileWatcher_SimulateError_FiresOnErrorSynchronously()
    {
        var watcher = new FakeFileWatcher();
        Exception? captured = null;
        watcher.OnError += ex => captured = ex;
        var expected = new InvalidOperationException("buffer overflow");
        watcher.SimulateError(expected);
        captured.Should().BeSameAs(expected,
            "SimulateError must invoke OnError synchronously with the exact exception instance");
    }

    [Fact(DisplayName = "AC-10: FakeFileWatcher -- no callback fired when no subscriber")]
    public void FakeFileWatcher_SimulateWithNoSubscriber_DoesNotThrow()
    {
        var watcher = new FakeFileWatcher();
        Action act = () =>
        {
            watcher.SimulateCreated("/path");
            watcher.SimulateChanged("/path");
            watcher.SimulateDeleted("/path");
            watcher.SimulateRenamed("/old", "/new");
            watcher.SimulateError(new Exception("test"));
        };
        act.Should().NotThrow("Simulate methods must guard against null event delegates");
    }
}
