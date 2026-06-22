using System.Collections.Concurrent;
using WireMock.Server;

namespace Fishtank.Api.Engine;

public class ServicesRegistry : IServicesRegistry
{
    private readonly ConcurrentDictionary<Guid, WireMockServer> _servers = new();

    public bool TryAdd(Guid serviceId, WireMockServer server) =>
        _servers.TryAdd(serviceId, server);

    public bool TryRemove(Guid serviceId, out WireMockServer? server) =>
        _servers.TryRemove(serviceId, out server);

    public bool TryGet(Guid serviceId, out WireMockServer? server) =>
        _servers.TryGetValue(serviceId, out server);

    public IReadOnlyDictionary<Guid, WireMockServer> GetAll() => _servers;
}
