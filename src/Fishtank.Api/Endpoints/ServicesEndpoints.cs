using Fishtank.Api.Exceptions;
using Fishtank.Api.Models;
using Fishtank.Api.Services;

namespace Fishtank.Api.Endpoints;

public static class ServicesEndpoints
{
    public static void MapServicesEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/services").RequireAuthorization();

        group.MapGet("", ListServicesAsync);
        group.MapPost("", CreateServiceAsync);
        group.MapGet("next-port", GetNextPortAsync);
        group.MapPut("{id:guid}", UpdateServiceAsync);
        group.MapPost("{id:guid}/stop", StopServiceAsync);
        group.MapPost("{id:guid}/start", StartServiceAsync);
    }

    private static async Task<IResult> ListServicesAsync(
        IServiceManager manager, CancellationToken ct)
    {
        var services = await manager.ListAsync(ct);
        return Results.Ok(ApiResponse.Ok(services));
    }

    private static async Task<IResult> CreateServiceAsync(
        CreateServiceRequest request,
        IServiceManager manager,
        CancellationToken ct)
    {
        try
        {
            var service = await manager.CreateAsync(request, ct);
            return Results.Created($"/api/services/{service.Id}", ApiResponse.Ok(service));
        }
        catch (ValidationException ex)
        {
            return Results.BadRequest(ApiResponse.Fail(ex.ErrorCode, ex.Message));
        }
    }

    private static async Task<IResult> UpdateServiceAsync(
        Guid id,
        UpdateServiceRequest request,
        IServiceManager manager,
        CancellationToken ct)
    {
        try
        {
            var service = await manager.UpdateAsync(id, request, ct);
            return Results.Ok(ApiResponse.Ok(service));
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

    private static async Task<IResult> StopServiceAsync(
        Guid id,
        IServiceManager manager,
        CancellationToken ct)
    {
        try
        {
            var service = await manager.StopAsync(id, ct);
            return Results.Ok(ApiResponse.Ok(service));
        }
        catch (NotFoundException ex)
        {
            return Results.NotFound(ApiResponse.Fail(ex.ErrorCode, ex.Message));
        }
    }

    private static async Task<IResult> StartServiceAsync(
        Guid id,
        IServiceManager manager,
        CancellationToken ct)
    {
        try
        {
            var service = await manager.StartAsync(id, ct);
            return Results.Ok(ApiResponse.Ok(service));
        }
        catch (NotFoundException ex)
        {
            return Results.NotFound(ApiResponse.Fail(ex.ErrorCode, ex.Message));
        }
    }

    private static async Task<IResult> GetNextPortAsync(
        IServiceManager manager,
        CancellationToken ct)
    {
        var port = await manager.GetNextPortAsync(ct);
        return Results.Ok(ApiResponse.Ok(port));
    }
}
