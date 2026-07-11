using Fishtank.Api.Data;
using Fishtank.Api.Data.Entities;
using Fishtank.Api.Engine;
using Fishtank.Api.Models;
using Fishtank.Api.Services;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using NSubstitute;

namespace Fishtank.Api.UnitTests.Services;

/// <summary>
/// Unit tests for <see cref="PipelineResetService"/> — validates that the reset
/// operation correctly counts and returns the number of entries cleared.
///
/// Coverage focus (MAJOR-002 fix):
///   - ResetAsync returns correct count of activity log entries cleared
///   - ResetAsync returns correct count of system events cleared (warnings+errors+info)
///   - ResetAsync sums all cleared entries correctly
///   - ResetAsync returns correct count of mappings reloaded
/// </summary>
public class PipelineResetServiceTests : IDisposable
{
    private readonly IActivityService _activityService;
    private readonly ISystemEventService _systemEventService;
    private readonly IResyncService _resyncService;
    private readonly ILogger<PipelineResetService> _logger;

    public PipelineResetServiceTests()
    {
        _activityService = Substitute.For<IActivityService>();
        _systemEventService = Substitute.For<ISystemEventService>();
        _resyncService = Substitute.For<IResyncService>();
        _logger = Substitute.For<ILogger<PipelineResetService>>();
    }

    private PipelineResetService BuildSut() =>
        new(_activityService, _systemEventService, _resyncService, _logger);

    public void Dispose()
    {
        // No resources to dispose
    }

    [Fact(DisplayName = "ResetAsync returns correct count of activity log entries cleared")]
    public async Task ResetAsync_ReturnsActivityLogCount()
    {
        // Arrange
        var sut = BuildSut();
        _activityService.ClearAsync().Returns(Task.FromResult(15));
        _systemEventService.ClearAllAsync(SystemEventGroup.WarningsErrors, Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(0));
        _systemEventService.ClearAllAsync(SystemEventGroup.Info, Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(0));
        _resyncService.ResyncAsync(Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(new ResyncResultDto(10, 5, 100, new(), new())));

        // Act
        var result = await sut.ResetAsync();

        // Assert
        result.EntriesCleared.Should().Be(15, "15 activity log entries were cleared");
        result.MappingsReloaded.Should().Be(15, "10 mappings + 5 responses = 15 total");
    }

    [Fact(DisplayName = "ResetAsync returns correct count of system events cleared")]
    public async Task ResetAsync_ReturnsSystemEventCount()
    {
        // Arrange
        var sut = BuildSut();
        _activityService.ClearAsync().Returns(Task.FromResult(0));
        _systemEventService.ClearAllAsync(SystemEventGroup.WarningsErrors, Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(7));
        _systemEventService.ClearAllAsync(SystemEventGroup.Info, Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(3));
        _resyncService.ResyncAsync(Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(new ResyncResultDto(0, 0, 100, new(), new())));

        // Act
        var result = await sut.ResetAsync();

        // Assert
        result.EntriesCleared.Should().Be(10, "7 warnings/errors + 3 info = 10 total system events");
        result.MappingsReloaded.Should().Be(0);
    }

    [Fact(DisplayName = "ResetAsync sums all cleared entries correctly")]
    public async Task ResetAsync_SumsAllClearedEntries()
    {
        // Arrange
        var sut = BuildSut();
        _activityService.ClearAsync().Returns(Task.FromResult(20));
        _systemEventService.ClearAllAsync(SystemEventGroup.WarningsErrors, Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(5));
        _systemEventService.ClearAllAsync(SystemEventGroup.Info, Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(8));
        _resyncService.ResyncAsync(Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(new ResyncResultDto(12, 3, 100, new(), new())));

        // Act
        var result = await sut.ResetAsync();

        // Assert
        result.EntriesCleared.Should().Be(33, "20 activity + 5 warnings/errors + 8 info = 33 total");
        result.MappingsReloaded.Should().Be(15, "12 mappings + 3 responses = 15 total");
    }

    [Fact(DisplayName = "ResetAsync handles zero entries correctly")]
    public async Task ResetAsync_HandlesZeroEntries()
    {
        // Arrange
        var sut = BuildSut();
        _activityService.ClearAsync().Returns(Task.FromResult(0));
        _systemEventService.ClearAllAsync(Arg.Any<SystemEventGroup>(), Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(0));
        _resyncService.ResyncAsync(Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(new ResyncResultDto(0, 0, 100, new(), new())));

        // Act
        var result = await sut.ResetAsync();

        // Assert
        result.EntriesCleared.Should().Be(0, "No entries to clear");
        result.MappingsReloaded.Should().Be(0, "No mappings to reload");
    }

    [Fact(DisplayName = "ResetAsync calls all services in correct order")]
    public async Task ResetAsync_CallsServicesInCorrectOrder()
    {
        // Arrange
        var sut = BuildSut();
        _activityService.ClearAsync().Returns(Task.FromResult(1));
        _systemEventService.ClearAllAsync(Arg.Any<SystemEventGroup>(), Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(1));
        _resyncService.ResyncAsync(Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(new ResyncResultDto(1, 1, 100, new(), new())));

        // Act
        await sut.ResetAsync();

        // Assert
        Received.InOrder(() =>
        {
            _activityService.ClearAsync();
            _systemEventService.ClearAllAsync(SystemEventGroup.WarningsErrors, Arg.Any<CancellationToken>());
            _systemEventService.ClearAllAsync(SystemEventGroup.Info, Arg.Any<CancellationToken>());
            _resyncService.ResyncAsync(Arg.Any<CancellationToken>());
        });
    }
}
