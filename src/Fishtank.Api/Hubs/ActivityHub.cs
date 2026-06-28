using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Fishtank.Api.Hubs;

[Authorize]
public class ActivityHub : Hub { }
