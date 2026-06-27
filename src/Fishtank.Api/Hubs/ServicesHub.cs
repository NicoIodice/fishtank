using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Fishtank.Api.Hubs;

[Authorize]
public class ServicesHub : Hub
{
    // Story 2.3 wires ServiceStatusChanged broadcast.
    // This skeleton accepts connections and maintains them — no events yet.
}
