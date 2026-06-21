namespace Fishtank.Api.Services;

public interface IServerConfigService
{
    Task<Guid> GetBootEpochAsync();
    void ClearCache();
}
