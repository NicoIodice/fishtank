namespace Fishtank.Api.Services;

public interface IServerConfigService
{
    Task<Guid> GetBootEpochAsync();
    bool GetCaptureFullHeadersCached();
    Task<bool> GetCaptureFullHeadersAsync();
    Task SetCaptureFullHeadersAsync(bool value);
    void ClearCache();
}
