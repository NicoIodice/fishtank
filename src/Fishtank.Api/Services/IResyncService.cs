using Fishtank.Api.Models;

namespace Fishtank.Api.Services;

public interface IResyncService
{
    Task<ResyncResultDto> ResyncAsync(CancellationToken ct = default);
}
