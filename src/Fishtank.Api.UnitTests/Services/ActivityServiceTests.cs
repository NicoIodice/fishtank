using Fishtank.Api.Engine;
using Fishtank.Api.Hubs;
using Fishtank.Api.Models;
using Fishtank.Api.Services;
using Fishtank.Api.UnitTests.Support;
using FluentAssertions;
using Microsoft.AspNetCore.SignalR;
using NSubstitute;

namespace Fishtank.Api.UnitTests.Services;

/// <summary>
/// Unit tests for <see cref="ActivityService"/> (Story 3-1).
///
/// Uses NSubstitute mocks for <see cref="IActivityStore"/> and
/// <see cref="IHubContext{ActivityHub}"/>; no real I/O or DB.
///
/// ACs covered:
///   AC-1 — CaptureAsync stores the row in the activity store.
///   AC-6 — CaptureAsync broadcasts ActivityRowAdded to all SignalR clients.
///   AC-7 — QueryAsync applies serviceId, type, search, skip, and take filters.
///   AC-8 — ClearAsync delegates to store.Clear().
/// </summary>
public class ActivityServiceTests : UnitTestBase
{
    private readonly IActivityStore _store;
    private readonly IHubContext<ActivityHub> _hub;
    private readonly IClientProxy _allClients;

    public ActivityServiceTests()
    {
        _store = Substitute.For<IActivityStore>();
        _hub = Substitute.For<IHubContext<ActivityHub>>();
        _allClients = Substitute.For<IClientProxy>();
        _hub.Clients.All.Returns(_allClients);
    }

    private ActivityService BuildSut() => new(_store, _hub);

    private static ActivityRow BuildRow(
        Guid? serviceId = null,
        string urlPath = "/api/test",
        ActivityType type = ActivityType.Mocked,
        string method = "GET") => new()
    {
        Method = method,
        UrlPath = urlPath,
        StatusCode = 200,
        Type = type,
        ServiceId = serviceId ?? Guid.NewGuid(),
        ServiceName = "TestService",
        ServicePort = 9001,
        DurationMs = 15,
    };

    // ─── AC-1: CaptureAsync stores row ───────────────────────────────────────

    [Fact(DisplayName = "AC-1: CaptureAsync calls store.Add with the row's serviceId and row")]
    public async Task CaptureAsync_StoresRowInActivityStore()
    {
        var sut = BuildSut();
        var row = BuildRow();

        await sut.CaptureAsync(row);

        _store.Received(1).Add(row.ServiceId, row);
    }

    // ─── AC-6: CaptureAsync broadcasts via SignalR ────────────────────────────

    [Fact(DisplayName = "AC-6: CaptureAsync broadcasts ActivityRowAdded to all SignalR clients")]
    public async Task CaptureAsync_BroadcastsViaSignalR()
    {
        var sut = BuildSut();
        var row = BuildRow();

        await sut.CaptureAsync(row);

        // SendAsync is an extension over SendCoreAsync — assert the core call.
        await _allClients.Received(1).SendCoreAsync(
            "ActivityRowAdded",
            Arg.Is<object?[]>(a => a.Length == 1),
            Arg.Any<CancellationToken>());
    }

    // ─── AC-7: QueryAsync — serviceId filtering ───────────────────────────────

    [Fact(DisplayName = "AC-7: QueryAsync passes serviceId filter through to store.GetAll")]
    public async Task QueryAsync_FiltersByServiceId()
    {
        var sut = BuildSut();
        var serviceId = Guid.NewGuid();
        _store.GetAll(Arg.Any<Guid?>()).Returns(Array.Empty<ActivityRow>());

        await sut.QueryAsync(serviceId, null, null, 0, 50);

        _store.Received(1).GetAll(serviceId);
    }

    // ─── AC-7: QueryAsync — type filtering ────────────────────────────────────

    [Fact(DisplayName = "AC-7: QueryAsync with type=Mocked returns only Mocked rows")]
    public async Task QueryAsync_FiltersByType_ReturnsMockedOnly()
    {
        var sut = BuildSut();
        var mockedRow = BuildRow(type: ActivityType.Mocked);
        var proxiedRow = BuildRow(type: ActivityType.Proxied);
        _store.GetAll(Arg.Any<Guid?>()).Returns(new[] { mockedRow, proxiedRow });

        var result = await sut.QueryAsync(null, "Mocked", null, 0, 50);

        result.Should().ContainSingle()
            .Which.Type.Should().Be("Mocked");
    }

    [Fact(DisplayName = "AC-7: QueryAsync with type=Proxied returns only Proxied rows")]
    public async Task QueryAsync_FiltersByType_ReturnsProxiedOnly()
    {
        var sut = BuildSut();
        var mockedRow = BuildRow(type: ActivityType.Mocked);
        var proxiedRow = BuildRow(type: ActivityType.Proxied);
        _store.GetAll(Arg.Any<Guid?>()).Returns(new[] { mockedRow, proxiedRow });

        var result = await sut.QueryAsync(null, "Proxied", null, 0, 50);

        result.Should().ContainSingle()
            .Which.Type.Should().Be("Proxied");
    }

    // ─── AC-7: QueryAsync — search filtering ─────────────────────────────────

    [Fact(DisplayName = "AC-7: QueryAsync with search filters rows by URL path (case-insensitive)")]
    public async Task QueryAsync_FiltersBySearchOnPath()
    {
        var sut = BuildSut();
        var targetRow = BuildRow(urlPath: "/api/users");
        var otherRow  = BuildRow(urlPath: "/api/orders");
        _store.GetAll(Arg.Any<Guid?>()).Returns(new[] { targetRow, otherRow });

        var result = await sut.QueryAsync(null, null, "users", 0, 50);

        result.Should().ContainSingle()
            .Which.UrlPath.Should().Be("/api/users");
    }

    // ─── AC-7: QueryAsync — pagination ───────────────────────────────────────

    [Fact(DisplayName = "AC-7: QueryAsync applies skip and take for pagination")]
    public async Task QueryAsync_PaginationSkipTake()
    {
        var sut = BuildSut();
        var rows = Enumerable.Range(0, 10)
            .Select(i => BuildRow(urlPath: $"/api/item/{i}"))
            .ToArray();
        _store.GetAll(Arg.Any<Guid?>()).Returns(rows);

        var result = await sut.QueryAsync(null, null, null, skip: 3, take: 4);

        result.Should().HaveCount(4);
    }

    // ─── AC-8: ClearAsync ────────────────────────────────────────────────────

    [Fact(DisplayName = "AC-8: ClearAsync delegates to store.Clear")]
    public async Task ClearAsync_CallsActivityStoreClear()
    {
        var sut = BuildSut();

        await sut.ClearAsync();

        _store.Received(1).Clear();
    }
}
