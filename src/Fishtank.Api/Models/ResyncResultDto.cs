namespace Fishtank.Api.Models;

public record ResyncResultDto(
    int MappingsLoaded,
    int ResponsesLoaded,
    long ElapsedMs,
    List<ConflictDto> Conflicts,
    List<ResyncFailureDto> Failures
);

public record ConflictDto(
    string Path,
    string Reason
);

public record ResyncFailureDto(
    string Path,
    string Reason
);
