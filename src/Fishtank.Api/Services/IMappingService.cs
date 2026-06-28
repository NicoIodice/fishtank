using Fishtank.Api.Models;

namespace Fishtank.Api.Services;

public interface IMappingService
{
    Task<FolderTreeDto> GetFolderTreeAsync(CancellationToken ct = default);
    Task<FileMetadataDto> CreateFileAsync(string path, string content, CancellationToken ct = default);
    Task<FileMetadataDto> UpdateFileAsync(string path, string content, DateTimeOffset? lastKnownModified = null, CancellationToken ct = default);
    Task DeleteFileAsync(string path, CancellationToken ct = default);
}
