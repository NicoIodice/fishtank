using Fishtank.Api.Data;
using Fishtank.Api.Data.Entities;
using Fishtank.Api.Hubs;
using Fishtank.Api.Models;
using Fishtank.Api.Services;
using FluentAssertions;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using NSubstitute;

namespace Fishtank.Api.UnitTests.Services;

/// <summary>
/// Unit tests for <see cref="SystemEventService"/> — the service-layer broadcast
/// and query semantics that the integration suite cannot easily assert directly
/// (specifically the SignalR send/no-send behavior per severity).
///
/// Uses the EF Core InMemory provider and an NSubstitute <see cref="IHubContext{T}"/>;
/// SignalR's <c>SendAsync</c> extension dispatches to
/// <see cref="IClientProxy.SendCoreAsync(string, object?[], CancellationToken)"/>,
/// which is what we assert against.
///
/// Coverage focus (story 2.4 new code paths):
///   AC-3: SystemEventCreated + UnreadCountChanged broadcast ONLY for warning/error;
///         info NEVER broadcasts SystemEventCreated and NEVER affects the badge.
///   AC-1: ListAsync pagination boundary — hasMore=false on the last page.
///   AC-5: MarkReadAsync — unknown id returns false and broadcasts nothing;
///         already-read id is idempotent (no extra broadcast).
/// </summary>
public class SystemEventServiceTests : IDisposable
{
    private readonly FishtankDbContext _db;
    private readonly IHubContext<EventsHub> _eventsHub;
    private readonly IClientProxy _allClients;

    public SystemEventServiceTests()
    {
        _db = new FishtankDbContext(
            new DbContextOptionsBuilder<FishtankDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options);

        _eventsHub = Substitute.For<IHubContext<EventsHub>>();
        _allClients = Substitute.For<IClientProxy>();
        _eventsHub.Clients.All.Returns(_allClients);
    }

    private SystemEventService BuildSut() => new(_db, _eventsHub);

    public void Dispose() => _db.Dispose();

    // ─── AC-3: broadcast ONLY for warning/error ────────────────────────────────

    [Theory(DisplayName = "AddAsync broadcasts SystemEventCreated + UnreadCountChanged for warning/error")]
    [InlineData(SystemEventSeverity.Warning)]
    [InlineData(SystemEventSeverity.Error)]
    public async Task AddAsync_WarningOrError_BroadcastsCreatedAndCount(SystemEventSeverity severity)
    {
        var sut = BuildSut();

        await sut.AddAsync(severity, "engine failed: root cause here");

        await _allClients.Received(1).SendCoreAsync(
            "SystemEventCreated",
            Arg.Is<object?[]>(a => a.Length == 1 && a[0] is SystemEventDto),
            Arg.Any<CancellationToken>());

        await _allClients.Received(1).SendCoreAsync(
            "UnreadCountChanged",
            Arg.Any<object?[]>(),
            Arg.Any<CancellationToken>());
    }

    [Fact(DisplayName = "AddAsync(info) does NOT broadcast SystemEventCreated and does NOT affect the badge")]
    public async Task AddAsync_Info_DoesNotBroadcast()
    {
        var sut = BuildSut();

        await sut.AddAsync(SystemEventSeverity.Info, "service started");

        // Info is excluded from the bell entirely (DESIGN.md line 462 / AC-3).
        await _allClients.DidNotReceive().SendCoreAsync(
            "SystemEventCreated", Arg.Any<object?[]>(), Arg.Any<CancellationToken>());
        await _allClients.DidNotReceive().SendCoreAsync(
            "UnreadCountChanged", Arg.Any<object?[]>(), Arg.Any<CancellationToken>());

        // The row is still persisted (it surfaces on the Info tab), just not announced.
        (await _db.SystemEvents.CountAsync(e => e.Severity == SystemEventSeverity.Info))
            .Should().Be(1);
    }

    [Fact(DisplayName = "AddAsync broadcasts a SystemEventCreated DTO carrying the verbatim message + lowercased severity (AC-2/AC-3)")]
    public async Task AddAsync_BroadcastsDtoWithVerbatimMessage()
    {
        var sut = BuildSut();
        const string message = "WireMock failed to start: bind 0.0.0.0:30100 in use";

        SystemEventDto? captured = null;
        _allClients
            .When(c => c.SendCoreAsync("SystemEventCreated", Arg.Any<object?[]>(), Arg.Any<CancellationToken>()))
            .Do(call => captured = ((object?[])call[1])[0] as SystemEventDto);

        await sut.AddAsync(SystemEventSeverity.Error, message);

        await _allClients.Received(1).SendCoreAsync(
            "SystemEventCreated",
            Arg.Any<object?[]>(),
            Arg.Any<CancellationToken>());

        captured.Should().NotBeNull();
        captured!.Message.Should().Be(message);          // rendered verbatim — never reduced to "stopped"
        captured.Severity.Should().Be("error");          // lowercased contract value
        captured.IsRead.Should().BeFalse();
    }

    // ─── AC-1: pagination boundary — hasMore=false on the last page ────────────

    [Fact(DisplayName = "ListAsync reports hasMore=false once the final page is reached")]
    public async Task ListAsync_LastPage_HasMoreFalse()
    {
        var sut = BuildSut();
        for (var i = 0; i < 25; i++)
            await sut.AddAsync(SystemEventSeverity.Error, $"err-{i}");

        var firstPage = await sut.ListAsync(SystemEventGroup.WarningsErrors, skip: 0, take: 20);
        firstPage.Total.Should().Be(25);
        firstPage.Items.Should().HaveCount(20);
        firstPage.HasMore.Should().BeTrue();

        var lastPage = await sut.ListAsync(SystemEventGroup.WarningsErrors, skip: 20, take: 20);
        lastPage.Total.Should().Be(25);
        lastPage.Items.Should().HaveCount(5);            // remainder
        lastPage.HasMore.Should().BeFalse();             // boundary: nothing left beyond this page
    }

    [Fact(DisplayName = "ListAsync(Info) returns only info events with hasMore=false when all fit")]
    public async Task ListAsync_Info_FiltersAndBounds()
    {
        var sut = BuildSut();
        await sut.AddAsync(SystemEventSeverity.Info, "i1");
        await sut.AddAsync(SystemEventSeverity.Warning, "w1");
        await sut.AddAsync(SystemEventSeverity.Error, "e1");

        var page = await sut.ListAsync(SystemEventGroup.Info, skip: 0, take: 20);

        page.Total.Should().Be(1);
        page.Items.Should().ContainSingle(e => e.Severity == "info");
        page.HasMore.Should().BeFalse();
    }

    // ─── AC-5: MarkReadAsync edge cases ────────────────────────────────────────

    [Fact(DisplayName = "MarkReadAsync returns false for an unknown id and broadcasts nothing")]
    public async Task MarkReadAsync_UnknownId_ReturnsFalseNoBroadcast()
    {
        var sut = BuildSut();
        await sut.AddAsync(SystemEventSeverity.Error, "e1");
        _allClients.ClearReceivedCalls(); // ignore the create broadcast

        var result = await sut.MarkReadAsync(Guid.NewGuid());

        result.Should().BeFalse();
        await _allClients.DidNotReceive().SendCoreAsync(
            "UnreadCountChanged", Arg.Any<object?[]>(), Arg.Any<CancellationToken>());
    }

    [Fact(DisplayName = "MarkReadAsync on an already-read event is idempotent (no second UnreadCountChanged)")]
    public async Task MarkReadAsync_AlreadyRead_NoExtraBroadcast()
    {
        var sut = BuildSut();
        await sut.AddAsync(SystemEventSeverity.Error, "e1");
        var id = (await sut.ListAsync(SystemEventGroup.WarningsErrors, 0, 20)).Items[0].Id;

        (await sut.MarkReadAsync(id)).Should().BeTrue();   // first read → broadcasts
        _allClients.ClearReceivedCalls();

        (await sut.MarkReadAsync(id)).Should().BeTrue();   // already read → no-op broadcast

        await _allClients.DidNotReceive().SendCoreAsync(
            "UnreadCountChanged", Arg.Any<object?[]>(), Arg.Any<CancellationToken>());
        (await sut.GetUnreadCountAsync()).Should().Be(0);
    }

    [Fact(DisplayName = "MarkAllReadAsync marks every unread warning/error (incl. unpaginated) and zeroes the count")]
    public async Task MarkAllReadAsync_ZeroesUnreadAcrossAllPages()
    {
        var sut = BuildSut();
        for (var i = 0; i < 30; i++)
            await sut.AddAsync(SystemEventSeverity.Warning, $"w-{i}");
        await sut.AddAsync(SystemEventSeverity.Info, "i1"); // untouched by mark-all-read

        (await sut.GetUnreadCountAsync()).Should().Be(30);

        var marked = await sut.MarkAllReadAsync();

        marked.Should().Be(30);                 // covers the 10 beyond the first 20-item page
        (await sut.GetUnreadCountAsync()).Should().Be(0);
        // Info is never part of the unread/badge scope.
        (await sut.ListAsync(SystemEventGroup.Info, 0, 20)).Total.Should().Be(1);
    }
}
