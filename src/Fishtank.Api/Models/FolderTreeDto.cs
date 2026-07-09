namespace Fishtank.Api.Models;

public record FolderTreeDto(
    string MocksRoot,
    List<TreeNodeDto> Children
);

public record TreeNodeDto(
    string Name,
    string Type,        // "folder" or "file"
    string Path,        // relative to MocksRoot
    DateTimeOffset? LastModified,
    long? SizeBytes,
    List<TreeNodeDto>? Children
);
