using System.Collections.Concurrent;
using Fishtank.Api.Exceptions;
using Fishtank.Api.Models;
using Serilog;

namespace Fishtank.Api.Services;

/// <summary>
/// File CRUD operations on volume-mounted filesystem.
/// - Path sanitization rejects ../ and absolute paths outside Mocks Root
/// - File write failures create System Events (never silently ignored)
/// - _lastKnownModified tracking for conflict detection (Resync compares timestamps)
/// </summary>
public class MappingService(
    IConfiguration configuration,
    ISystemEventService systemEvents) : IMappingService
{
    private readonly string _mocksRoot = configuration["FISHTANK_MOCKS_ROOT"]
        ?? throw new InvalidOperationException("FISHTANK_MOCKS_ROOT must be set");

    // Tracks LastWriteTime for conflict detection (updated on file operations and IFileWatcher.OnChanged)
    private static readonly ConcurrentDictionary<string, DateTimeOffset> _lastKnownModified = new();

    public async Task<FolderTreeDto> GetFolderTreeAsync(CancellationToken ct = default)
    {
        if (!Directory.Exists(_mocksRoot))
            Directory.CreateDirectory(_mocksRoot);

        var root = new DirectoryInfo(_mocksRoot);
        var tree = await Task.Run(() => BuildTreeNode(root, _mocksRoot), ct);

        return new FolderTreeDto(_mocksRoot, tree.Children ?? []);
    }

    public async Task<FileContentDto> ReadFileAsync(string path, CancellationToken ct = default)
    {
        var fullPath = SanitizePath(path);

        if (!File.Exists(fullPath))
            throw new NotFoundException("MAPPING_FILE_NOT_FOUND", $"File not found: {path}");

        var content = await File.ReadAllTextAsync(fullPath, ct);
        var info = new FileInfo(fullPath);

        return new FileContentDto(
            content,
            info.Name,
            path,
            info.LastWriteTimeUtc,
            info.Length);
    }

    public async Task<FileMetadataDto> CreateFileAsync(string path, string content, CancellationToken ct = default)
    {
        var fullPath = SanitizePath(path);

        if (File.Exists(fullPath))
            throw new ValidationException("MAPPING_FILE_EXISTS", $"File already exists at path: {path}");

        try
        {
            var dir = Path.GetDirectoryName(fullPath);
            if (dir != null && !Directory.Exists(dir))
                Directory.CreateDirectory(dir);

            await File.WriteAllTextAsync(fullPath, content, ct);

            var info = new FileInfo(fullPath);
            var lastModified = info.LastWriteTimeUtc;
            _lastKnownModified[fullPath] = lastModified;

            return new FileMetadataDto(
                info.Name,
                path,
                lastModified,
                info.Length);
        }
        catch (Exception ex) when (ex is not ValidationException)
        {
            Log.Error(ex, "MAPPING_WRITE_FAILED: Failed to create file at {Path}", path);
            await systemEvents.AddAsync(
                Data.Entities.SystemEventSeverity.Error,
                $"Failed to create file '{path}': {ex.Message}",
                null, ct);
            throw new ValidationException("MAPPING_WRITE_FAILED", $"Failed to create file: {ex.Message}");
        }
    }

    public async Task<FileMetadataDto> UpdateFileAsync(
        string path,
        string content,
        DateTimeOffset? lastKnownModified = null,
        CancellationToken ct = default)
    {
        var fullPath = SanitizePath(path);

        if (!File.Exists(fullPath))
            throw new NotFoundException("MAPPING_FILE_NOT_FOUND", $"File not found: {path}");

        try
        {
            await File.WriteAllTextAsync(fullPath, content, ct);

            var info = new FileInfo(fullPath);
            var newModified = info.LastWriteTimeUtc;
            _lastKnownModified[fullPath] = newModified;

            return new FileMetadataDto(
                info.Name,
                path,
                newModified,
                info.Length);
        }
        catch (Exception ex) when (ex is not ValidationException and not NotFoundException)
        {
            Log.Error(ex, "MAPPING_WRITE_FAILED: Failed to update file at {Path}", path);
            await systemEvents.AddAsync(
                Data.Entities.SystemEventSeverity.Error,
                $"Failed to update file '{path}': {ex.Message}",
                null, ct);
            throw new ValidationException("MAPPING_WRITE_FAILED", $"Failed to update file: {ex.Message}");
        }
    }

    public async Task DeleteFileAsync(string path, CancellationToken ct = default)
    {
        var fullPath = SanitizePath(path);

        if (!File.Exists(fullPath))
            throw new NotFoundException("MAPPING_FILE_NOT_FOUND", $"File not found: {path}");

        try
        {
            await Task.Run(() => File.Delete(fullPath), ct);
            _lastKnownModified.TryRemove(fullPath, out _);
        }
        catch (Exception ex)
        {
            Log.Error(ex, "MAPPING_WRITE_FAILED: Failed to delete file at {Path}", path);
            await systemEvents.AddAsync(
                Data.Entities.SystemEventSeverity.Error,
                $"Failed to delete file '{path}': {ex.Message}",
                null, ct);
            throw new ValidationException("MAPPING_WRITE_FAILED", $"Failed to delete file: {ex.Message}");
        }
    }

    /// <summary>
    /// Path sanitization — rejects ../ sequences and absolute paths outside Mocks Root.
    /// Security: R-E4-005 (AC-13)
    /// </summary>
    private string SanitizePath(string relativePath)
    {
        // URL-decode first to prevent encoded traversal attacks (e.g., %2F..%2F..%2F)
        var decoded = Uri.UnescapeDataString(relativePath);

        // Normalize separators
        var normalized = decoded.Replace('\\', '/');

        // Reject path traversal
        if (normalized.Contains("../") || normalized.Contains("/..") || normalized.StartsWith(".."))
            throw new ValidationException("MAPPING_PATH_INVALID",
                "Invalid path — path traversal sequences are not allowed.");

        // Reject absolute paths — covers Unix (/…), UNC (//…), and Windows drive-letter
        // paths (C:/…) even when running on Linux where Path.IsPathRooted misses the latter.
        if (Path.IsPathRooted(normalized) || System.Text.RegularExpressions.Regex.IsMatch(normalized, @"^[a-zA-Z]:/"))
            throw new ValidationException("MAPPING_PATH_INVALID",
                "Invalid path — absolute paths are not allowed.");

        // Combine and verify result is under Mocks Root
        var fullPath = Path.GetFullPath(Path.Combine(_mocksRoot, normalized));
        var normalizedRoot = Path.GetFullPath(_mocksRoot).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar) + Path.DirectorySeparatorChar;

        if (!fullPath.StartsWith(normalizedRoot, StringComparison.OrdinalIgnoreCase))
            throw new ValidationException("MAPPING_PATH_INVALID",
                "Invalid path — resolves outside the Mocks Root directory.");

        return fullPath;
    }

    private static TreeNodeDto BuildTreeNode(FileSystemInfo info, string mocksRoot)
    {
        var relativePath = Path.GetRelativePath(mocksRoot, info.FullName).Replace('\\', '/');
        if (relativePath == ".") relativePath = "";

        if (info is DirectoryInfo dir)
        {
            var children = new List<TreeNodeDto>();
            try
            {
                foreach (var child in dir.EnumerateFileSystemInfos())
                {
                    children.Add(BuildTreeNode(child, mocksRoot));
                }
            }
            catch (UnauthorizedAccessException)
            {
                // Skip inaccessible folders
            }

            return new TreeNodeDto(
                dir.Name,
                "folder",
                relativePath,
                null,
                null,
                children);
        }
        else if (info is FileInfo file)
        {
            return new TreeNodeDto(
                file.Name,
                "file",
                relativePath,
                file.LastWriteTimeUtc,
                file.Length,
                null);
        }

        throw new InvalidOperationException($"Unknown FileSystemInfo type: {info.GetType()}");
    }

    /// <summary>
    /// Expose _lastKnownModified for ResyncService conflict detection.
    /// </summary>
    public static bool TryGetLastKnownModified(string fullPath, out DateTimeOffset lastModified)
    {
        return _lastKnownModified.TryGetValue(fullPath, out lastModified);
    }

    /// <summary>
    /// Update _lastKnownModified from ResyncService after reload.
    /// </summary>
    public static void UpdateLastKnownModified(string fullPath, DateTimeOffset lastModified)
    {
        _lastKnownModified[fullPath] = lastModified;
    }
}
