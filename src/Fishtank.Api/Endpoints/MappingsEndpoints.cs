using Fishtank.Api.Exceptions;
using Fishtank.Api.Models;
using Fishtank.Api.Services;

namespace Fishtank.Api.Endpoints;

public static class MappingsEndpoints
{
    public static void MapMappingsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/mappings")
            .RequireAuthorization()
            .WithTags("Mappings");

        group.MapGet("", GetFolderTreeAsync)
            .WithSummary("Get the WireMock mappings folder tree");
        group.MapGet("{**path}", GetFileContentAsync)
            .WithSummary("Read a mapping or response file");
        group.MapPost("", CreateMappingAsync)
            .WithSummary("Create a new mapping or response file");
        group.MapPut("{**path}", UpdateMappingAsync)
            .WithSummary("Update an existing mapping or response file");
        group.MapDelete("{**path}", DeleteMappingAsync)
            .WithSummary("Delete a mapping or response file");

        // Resync endpoint
        app.MapPost("/api/resync", ResyncAsync)
            .RequireAuthorization()
            .WithTags("Mappings")
            .WithSummary("Reload all mappings from disk and sync to WireMock engines");
    }

    private static async Task<IResult> GetFolderTreeAsync(
        IMappingService mappingService,
        CancellationToken ct)
    {
        var tree = await mappingService.GetFolderTreeAsync(ct);
        return Results.Ok(ApiResponse.Ok(tree));
    }

    private static async Task<IResult> GetFileContentAsync(
        string path,
        IMappingService mappingService,
        CancellationToken ct)
    {
        try
        {
            var content = await mappingService.ReadFileAsync(path, ct);
            return Results.Ok(ApiResponse.Ok(content));
        }
        catch (ValidationException ex)
        {
            return Results.BadRequest(ApiResponse.Fail(ex.ErrorCode, ex.Message));
        }
        catch (NotFoundException ex)
        {
            return Results.NotFound(ApiResponse.Fail(ex.ErrorCode, ex.Message));
        }
    }

    private static async Task<IResult> CreateMappingAsync(
        CreateMappingRequest request,
        IMappingService mappingService,
        CancellationToken ct)
    {
        try
        {
            var metadata = await mappingService.CreateFileAsync(request.Path, request.Content, ct);
            return Results.Created($"/api/mappings/{request.Path}", ApiResponse.Ok(metadata));
        }
        catch (ValidationException ex)
        {
            return ex.ErrorCode == "MAPPING_FILE_EXISTS"
                ? Results.Conflict(ApiResponse.Fail(ex.ErrorCode, ex.Message))
                : Results.BadRequest(ApiResponse.Fail(ex.ErrorCode, ex.Message));
        }
    }

    private static async Task<IResult> UpdateMappingAsync(
        string path,
        UpdateMappingRequest request,
        IMappingService mappingService,
        CancellationToken ct)
    {
        try
        {
            var metadata = await mappingService.UpdateFileAsync(
                path,
                request.Content,
                request.LastKnownModified,
                ct);
            return Results.Ok(ApiResponse.Ok(metadata));
        }
        catch (ValidationException ex)
        {
            return Results.BadRequest(ApiResponse.Fail(ex.ErrorCode, ex.Message));
        }
        catch (NotFoundException ex)
        {
            return Results.NotFound(ApiResponse.Fail(ex.ErrorCode, ex.Message));
        }
    }

    private static async Task<IResult> DeleteMappingAsync(
        string path,
        IMappingService mappingService,
        CancellationToken ct)
    {
        try
        {
            await mappingService.DeleteFileAsync(path, ct);
            return Results.Ok(ApiResponse.Ok<object?>(null));
        }
        catch (ValidationException ex)
        {
            return Results.BadRequest(ApiResponse.Fail(ex.ErrorCode, ex.Message));
        }
        catch (NotFoundException ex)
        {
            return Results.NotFound(ApiResponse.Fail(ex.ErrorCode, ex.Message));
        }
    }

    private static async Task<IResult> ResyncAsync(
        IResyncService resyncService,
        CancellationToken ct)
    {
        try
        {
            var result = await resyncService.ResyncAsync(ct);
            return Results.Ok(ApiResponse.Ok(result));
        }
        catch (ValidationException ex)
        {
            return Results.Conflict(ApiResponse.Fail(ex.ErrorCode, ex.Message));
        }
    }
}
