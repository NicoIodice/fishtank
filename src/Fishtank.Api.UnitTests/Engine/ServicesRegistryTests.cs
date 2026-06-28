using Fishtank.Api.Engine;
using FluentAssertions;
using WireMock.Server;

namespace Fishtank.Api.UnitTests.Engine;

/// <summary>
/// Unit tests for ServicesRegistry -- covers the thin ConcurrentDictionary
/// wrapper that manages live WireMock server instances.
/// </summary>
public class ServicesRegistryTests
{
    private readonly ServicesRegistry _sut = new();

    [Fact(DisplayName = "TryAdd returns true and TryGet finds the added entry")]
    public void TryAdd_NewId_ReturnsTrueAndEntryIsRetrievable()
    {
        var id = Guid.NewGuid();
        using var server = WireMockServer.Start();

        var added = _sut.TryAdd(id, server);

        added.Should().BeTrue();
        _sut.TryGet(id, out var retrieved).Should().BeTrue();
        retrieved.Should().BeSameAs(server);
    }

    [Fact(DisplayName = "TryAdd returns false when the same id is added twice")]
    public void TryAdd_DuplicateId_ReturnsFalse()
    {
        var id = Guid.NewGuid();
        using var server1 = WireMockServer.Start();
        using var server2 = WireMockServer.Start();

        _sut.TryAdd(id, server1);
        var secondAdd = _sut.TryAdd(id, server2);

        secondAdd.Should().BeFalse();
    }

    [Fact(DisplayName = "TryGet returns false for an unknown id")]
    public void TryGet_UnknownId_ReturnsFalse()
    {
        var found = _sut.TryGet(Guid.NewGuid(), out var server);

        found.Should().BeFalse();
        server.Should().BeNull();
    }

    [Fact(DisplayName = "TryRemove returns true and removes the entry")]
    public void TryRemove_ExistingId_ReturnsTrueAndRemoves()
    {
        var id = Guid.NewGuid();
        using var server = WireMockServer.Start();
        _sut.TryAdd(id, server);

        var removed = _sut.TryRemove(id, out var removedServer);

        removed.Should().BeTrue();
        removedServer.Should().BeSameAs(server);
        _sut.TryGet(id, out _).Should().BeFalse();
    }

    [Fact(DisplayName = "TryRemove returns false for an unknown id")]
    public void TryRemove_UnknownId_ReturnsFalse()
    {
        var removed = _sut.TryRemove(Guid.NewGuid(), out var server);

        removed.Should().BeFalse();
        server.Should().BeNull();
    }

    [Fact(DisplayName = "GetAll returns all added entries as a read-only dictionary")]
    public void GetAll_MultipleEntries_ReturnsAll()
    {
        var id1 = Guid.NewGuid();
        var id2 = Guid.NewGuid();
        using var server1 = WireMockServer.Start();
        using var server2 = WireMockServer.Start();

        _sut.TryAdd(id1, server1);
        _sut.TryAdd(id2, server2);

        var all = _sut.GetAll();

        all.Should().HaveCount(2);
        all[id1].Should().BeSameAs(server1);
        all[id2].Should().BeSameAs(server2);
    }

    [Fact(DisplayName = "GetAll returns empty dictionary when no entries added")]
    public void GetAll_Empty_ReturnsEmpty()
    {
        _sut.GetAll().Should().BeEmpty();
    }
}