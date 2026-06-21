namespace Fishtank.Api.Endpoints;

public static class ApiResponse
{
    public static object Ok<T>(T data) => new { success = true, data };

    public static object Fail(string code, string message, string? details = null) =>
        new { success = false, error = new { code, message, details } };
}
