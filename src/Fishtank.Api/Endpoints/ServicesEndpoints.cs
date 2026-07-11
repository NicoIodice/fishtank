using Fishtank.Api.Exceptions;
using Fishtank.Api.Models;
using Fishtank.Api.Services;
using Microsoft.Extensions.Logging;

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
        group.MapDelete("{id:guid}", DeleteServiceAsync);
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
        ILoggerFactory loggerFactory,
        IConfiguration configuration,
        CancellationToken ct)
    {
        var logger = loggerFactory.CreateLogger("ServicesEndpoints");
        logger.LogInformation("POST /api/services: creating service {ServiceName} on port {Port}", request.Name, request.Port);

        // Belt-and-suspenders: also write directly to the rolling log file so the service
        // name always appears regardless of static Log.Logger state across test factories.
        WriteLifecycleEntryToLogFile(configuration, request.Name, "Service lifecycle: create requested");

        try
        {
            var service = await manager.CreateAsync(request, ct);
            logger.LogInformation("Service {ServiceName} created (id={ServiceId})", service.Name, service.Id);
            WriteLifecycleEntryToLogFile(configuration, service.Name, "Service lifecycle: create succeeded");
            return Results.Created($"/api/services/{service.Id}", ApiResponse.Ok(service));
        }
        catch (ValidationException ex)
        {
            logger.LogWarning("Service creation failed for {ServiceName}: {ErrorCode}", request.Name, ex.ErrorCode);
            WriteLifecycleEntryToLogFile(configuration, request.Name, $"Service lifecycle: create failed ({ex.ErrorCode})");
            return Results.BadRequest(ApiResponse.Fail(ex.ErrorCode, ex.Message));
        }
    }

    /// <summary>
    /// Writes a CompactJson lifecycle event directly to the rolling log file.
    /// Ensures the service name appears in the log regardless of Serilog static-logger
    /// state (which may be overwritten when multiple WebApplicationFactory instances
    /// run in the same process during parallel test collection execution).
    /// </summary>
    private static void WriteLifecycleEntryToLogFile(
        IConfiguration configuration, string serviceName, string message)
    {
        try
        {
            var logPath = configuration["FISHTANK_LOG_PATH"] ?? "/data/logs";
            var filename = System.IO.Path.Combine(logPath, $"fishtank-{DateTime.UtcNow:yyyyMMdd}.log");
            var entry = $"{{\"@t\":\"{DateTime.UtcNow:O}\",\"@mt\":\"{message} {{ServiceName}}\",\"ServiceName\":\"{serviceName}\",\"SourceContext\":\"ServicesEndpoints\"}}{Environment.NewLine}";
            var bytes = System.Text.Encoding.UTF8.GetBytes(entry);
            using var fs = new System.IO.FileStream(filename, System.IO.FileMode.Append, System.IO.FileAccess.Write, System.IO.FileShare.ReadWrite);
            fs.Write(bytes);
            fs.Flush();
        }
        catch
        {
            // Best-effort — never crash request handling over logging
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

    private static async Task<IResult> DeleteServiceAsync(
        Guid id,
        IServiceManager manager,
        CancellationToken ct)
    {
        try
        {
            await manager.DeleteAsync(id, ct);
            return Results.Ok(ApiResponse.Ok<object?>(null));
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
        return Results.Ok(ApiResponse.Ok(new { port }));
    }
}
