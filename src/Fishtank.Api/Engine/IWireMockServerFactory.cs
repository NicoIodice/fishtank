using WireMock.Server;
using WireMock.Settings;

namespace Fishtank.Api.Engine;

public interface IWireMockServerFactory
{
    WireMockServer Start(WireMockServerSettings settings);
}
