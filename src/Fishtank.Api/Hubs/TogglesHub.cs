using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Fishtank.Api.Hubs;

[Authorize]
public class TogglesHub : Hub
{
    // No client-to-server methods required in v1
    // Server broadcasts via IHubContext<TogglesHub> from FeatureToggleService
}
