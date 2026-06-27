using Microsoft.Extensions.Configuration;

namespace Fishtank.Api.Endpoints;

public static class SettingsEndpoints
{
    public static void MapSettingsEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/settings", GetSettingsAsync).RequireAuthorization();
    }

    private static IResult GetSettingsAsync(IConfiguration configuration)
    {
        var mocksHostPath = configuration["FISHTANK_MOCKS_HOST_PATH"] ?? "mocks";
        return Results.Ok(ApiResponse.Ok(new { mocksHostPath }));
    }
}
