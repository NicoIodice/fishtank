namespace Fishtank.Api.Services;

public interface IPipelineResetService
{
    Task<ResetResult> ResetAsync(CancellationToken ct = default);
}

public record ResetResult(int EntriesCleared, int MappingsReloaded);
