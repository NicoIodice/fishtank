using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Fishtank.Api.Hubs;

[Authorize]
public class EventsHub : Hub
{
    // Story 2.4 wires SystemEventCreated and UnreadCountChanged broadcasts.
    // This skeleton accepts authenticated connections — no events broadcast yet.
}
