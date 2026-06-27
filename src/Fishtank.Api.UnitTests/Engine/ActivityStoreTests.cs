using FluentAssertions;
using Fishtank.Api.Engine;
using Fishtank.Api.Models;
using Fishtank.Api.UnitTests.Support;

namespace Fishtank.Api.UnitTests.Engine;

/* ─── RED-phase stubs removed — implementations now exist ─────────────────────
   Fishtank.Api.Engine.ActivityStore, Fishtank.Api.Models.ActivityRow,
   and Fishtank.Api.Models.ActivityType are the real implementations.
   ─────────────────────────────────────────────────────────────────────────── */

/// <summary>
/// ATDD red-phase unit tests for <see cref="ActivityStore"/> (Story 3-1).
///
/// All tests in this class are in the RED phase — they compile cleanly but
/// fail at runtime because the real implementation does not exist yet.
///
/// Once <c>Fishtank.Api.Engine.ActivityStore</c> is implemented:
///   1. Remove the RED-phase stubs (<c>ActivityRow</c>, <c>ActivityType</c>,
///      <c>ActivityStore</c>) from this file.
///   2. Add the appropriate <c>using</c> directives.
///   3. All tests should turn GREEN with no other changes.
///
/// ACs covered:
///   AC-1 — Request captured to in-memory store; retrievable via GetAll.
///   AC-5 — Per-service row cap with FIFO eviction when limit reached.
///          Clear() removes all entries.
/// </summary>
public class ActivityStoreTests : UnitTestBase
{
    private static ActivityRow BuildRow(Guid serviceId, string urlPath = "/api/test")
        => new()
        {
            Method = "GET",
            UrlPath = urlPath,
            StatusCode = 200,
            Type = ActivityType.Mocked,
            ServiceId = serviceId,
            ServiceName = "TestService",
            ServicePort = 9001,
            DurationMs = 12,
        };

    // ─── AC-1: add → retrievable via GetAll ─────────────────────────────────

    [Fact(DisplayName = "AC-1: Add then GetAll returns the added row")]
    public void Add_SingleRow_IsReturnedByGetAll()
    {
        var sut = new ActivityStore();
        var serviceId = Guid.NewGuid();
        var row = BuildRow(serviceId);

        sut.Add(serviceId, row);
        var result = sut.GetAll();

        result.Should().ContainSingle()
            .Which.Id.Should().Be(row.Id);
    }

    [Fact(DisplayName = "AC-1: GetAll with serviceId filter returns only rows for that service")]
    public void GetAll_WithServiceIdFilter_ReturnsOnlyMatchingRows()
    {
        var sut = new ActivityStore();
        var serviceA = Guid.NewGuid();
        var serviceB = Guid.NewGuid();
        var rowA = BuildRow(serviceA, "/api/a");
        var rowB = BuildRow(serviceB, "/api/b");

        sut.Add(serviceA, rowA);
        sut.Add(serviceB, rowB);

        var result = sut.GetAll(serviceId: serviceA);

        result.Should().ContainSingle()
            .Which.Id.Should().Be(rowA.Id);
    }

    [Fact(DisplayName = "AC-1: GetAll without filter returns rows from all services")]
    public void GetAll_NoFilter_ReturnsAllRows()
    {
        var sut = new ActivityStore();
        var serviceA = Guid.NewGuid();
        var serviceB = Guid.NewGuid();

        sut.Add(serviceA, BuildRow(serviceA, "/api/a"));
        sut.Add(serviceB, BuildRow(serviceB, "/api/b"));
        sut.Add(serviceA, BuildRow(serviceA, "/api/c"));

        var result = sut.GetAll();

        result.Should().HaveCount(3);
    }

    // ─── AC-5: per-service row cap with FIFO eviction ───────────────────────

    [Fact(DisplayName = "AC-5: FIFO eviction — oldest row removed when cap reached")]
    public void Add_BeyondCap_EvidesOldestRowFirst()
    {
        const int cap = 3;
        var sut = new ActivityStore(maxRowsPerService: cap);
        var serviceId = Guid.NewGuid();

        var first = BuildRow(serviceId, "/first");
        var second = BuildRow(serviceId, "/second");
        var third = BuildRow(serviceId, "/third");
        var fourth = BuildRow(serviceId, "/fourth"); // causes eviction of 'first'

        sut.Add(serviceId, first);
        sut.Add(serviceId, second);
        sut.Add(serviceId, third);
        sut.Add(serviceId, fourth); // cap=3: first should be evicted

        var result = sut.GetAll(serviceId: serviceId);

        result.Should().HaveCount(cap);
        result.Should().NotContain(r => r.Id == first.Id,
            "the oldest row must be evicted when the cap is reached");
        result.Should().Contain(r => r.Id == fourth.Id,
            "the newest row must be present after eviction");
    }

    [Fact(DisplayName = "AC-5: FIFO eviction is per-service — other services unaffected")]
    public void Add_BeyondCap_EvictionDoesNotAffectOtherServices()
    {
        const int cap = 2;
        var sut = new ActivityStore(maxRowsPerService: cap);
        var serviceA = Guid.NewGuid();
        var serviceB = Guid.NewGuid();

        // Fill service A to cap, then overflow
        sut.Add(serviceA, BuildRow(serviceA, "/a1"));
        sut.Add(serviceA, BuildRow(serviceA, "/a2"));
        sut.Add(serviceA, BuildRow(serviceA, "/a3")); // evicts /a1

        // Service B has only one row
        var rowB = BuildRow(serviceB, "/b1");
        sut.Add(serviceB, rowB);

        var resultB = sut.GetAll(serviceId: serviceB);

        resultB.Should().ContainSingle()
            .Which.Id.Should().Be(rowB.Id,
                "service B's single row must be unaffected by service A's eviction");
    }

    // ─── AC-5: Clear removes all entries ────────────────────────────────────

    [Fact(DisplayName = "AC-5: Clear removes all entries from all services")]
    public void Clear_RemovesAllEntries()
    {
        var sut = new ActivityStore();
        var serviceA = Guid.NewGuid();
        var serviceB = Guid.NewGuid();

        sut.Add(serviceA, BuildRow(serviceA));
        sut.Add(serviceB, BuildRow(serviceB));
        sut.Add(serviceA, BuildRow(serviceA));

        sut.Clear();

        sut.GetAll().Should().BeEmpty();
    }

    [Fact(DisplayName = "AC-5: GetAll after Clear returns empty regardless of serviceId filter")]
    public void Clear_ThenGetAllWithFilter_ReturnsEmpty()
    {
        var sut = new ActivityStore();
        var serviceId = Guid.NewGuid();

        sut.Add(serviceId, BuildRow(serviceId));
        sut.Clear();

        sut.GetAll(serviceId: serviceId).Should().BeEmpty();
    }
}
