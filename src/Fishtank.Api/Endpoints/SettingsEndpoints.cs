using Microsoft.Extensions.Configuration;

namespace Fishtank.Api.Endpoints;

public static class SettingsEndpoints
{
    public static void MapSettingsEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/settings", GetSettingsAsync).RequireAuthorization();
        app.MapPut("/api/settings/capture-headers", PutCaptureHeadersAsync).RequireAuthorization();
    }

    private static async Task<IResult> GetSettingsAsync(
        IConfiguration configuration,
        Services.IServerConfigService configService)
    {
        var mocksHostPath = configuration["FISHTANK_MOCKS_HOST_PATH"] ?? "mocks";
        var captureFullHeaders = await configService.GetCaptureFullHeadersAsync();
        return Results.Ok(ApiResponse.Ok(new { mocksHostPath, captureFullHeaders }));
    }

    private static async Task<IResult> PutCaptureHeadersAsync(
        Services.IServerConfigService configService,
        CaptureHeadersRequest body)
    {
        await configService.SetCaptureFullHeadersAsync(body.Enabled);
        return Results.Ok(ApiResponse.Ok(new { captureFullHeaders = body.Enabled }));
    }

    private record CaptureHeadersRequest(bool Enabled);
}

