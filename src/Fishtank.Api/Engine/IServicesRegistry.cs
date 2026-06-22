using WireMock.Server;

namespace Fishtank.Api.Engine;

public interface IServicesRegistry
{
    bool TryAdd(Guid serviceId, WireMockServer server);
    bool TryRemove(Guid serviceId, out WireMockServer? server);
    bool TryGet(Guid serviceId, out WireMockServer? server);
    IReadOnlyDictionary<Guid, WireMockServer> GetAll();
}
