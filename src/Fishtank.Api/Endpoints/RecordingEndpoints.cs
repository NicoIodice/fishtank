using Fishtank.Api.Exceptions;
using Fishtank.Api.Models;
using Fishtank.Api.Services;

namespace Fishtank.Api.Endpoints;

public static class RecordingEndpoints
{
    public static void MapRecordingEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/recording").RequireAuthorization();

        group.MapPost("/start", StartRecordingAsync);
        group.MapPost("/stop", StopRecordingAsync);
        group.MapGet("/status", GetRecordingStatusAsync);
    }

    private static async Task<IResult> StartRecordingAsync(
        IRecordingService recordingService,
        CancellationToken ct)
    {
        try
        {
            await recordingService.StartAsync(ct);
            var (isRecording, startedAt) = await recordingService.GetStatusAsync(ct);
            var response = new RecordingStatusResponse(isRecording, startedAt);
            return Results.Ok(ApiResponse.Ok(response));
        }
        catch (ConflictException ex)
        {
            return Results.Conflict(ApiResponse.Fail(ex.ErrorCode, ex.Message));
        }
    }

    private static async Task<IResult> StopRecordingAsync(
        IRecordingService recordingService,
        CancellationToken ct)
    {
        try
        {
            await recordingService.StopAsync(ct);
            var (isRecording, startedAt) = await recordingService.GetStatusAsync(ct);
            var response = new RecordingStatusResponse(isRecording, startedAt);
            return Results.Ok(ApiResponse.Ok(response));
        }
        catch (ConflictException ex)
        {
            return Results.Conflict(ApiResponse.Fail(ex.ErrorCode, ex.Message));
        }
    }

    private static async Task<IResult> GetRecordingStatusAsync(
        IRecordingService recordingService,
        CancellationToken ct)
    {
        var (isRecording, startedAt) = await recordingService.GetStatusAsync(ct);
        var response = new RecordingStatusResponse(isRecording, startedAt);
        return Results.Ok(ApiResponse.Ok(response));
    }
}

public record RecordingStatusResponse(bool IsRecording, DateTimeOffset? StartedAt);
