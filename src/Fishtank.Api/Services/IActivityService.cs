using Fishtank.Api.Models;

namespace Fishtank.Api.Services;

public interface IActivityService
{
    Task CaptureAsync(ActivityRow row);
    Task<IReadOnlyList<ActivityRowDto>> QueryAsync(
        Guid? serviceId, string? type, string? search, int skip, int take);
    Task ClearAsync();
}
