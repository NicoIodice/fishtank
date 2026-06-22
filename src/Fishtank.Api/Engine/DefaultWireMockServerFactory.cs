using WireMock.Server;
using WireMock.Settings;

namespace Fishtank.Api.Engine;

public sealed class DefaultWireMockServerFactory : IWireMockServerFactory
{
    public WireMockServer Start(WireMockServerSettings settings) => WireMockServer.Start(settings);
}
