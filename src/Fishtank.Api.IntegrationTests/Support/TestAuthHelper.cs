using System.Net;
using System.Net.Http.Json;

namespace Fishtank.Api.IntegrationTests.Support;

public static class TestAuthHelper
{
    private sealed record LoginRequest(string Username, string Password);

    public static string? LastJwtToken { get; private set; }

    /// <summary>
    /// Authenticates the given <paramref name="client"/> by posting to
    /// <c>/api/auth/login</c>. The server sets an httpOnly JWT cookie;
    /// <see cref="HttpClient"/> stores it automatically for subsequent calls.
    /// Also captures the JWT token value for use with SignalR.
    /// </summary>
    public static async Task LoginAsync(
        HttpClient client,
        string username = "admin",
        string password = "admin")
    {
        var response = await client.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest(username, password));

        response.EnsureSuccessStatusCode();

        // Extract JWT token from Set-Cookie header for SignalR use
        if (response.Headers.TryGetValues("Set-Cookie", out var cookies))
        {
            var authCookie = cookies.FirstOrDefault(c => c.Contains("fishtank_auth="));
            if (authCookie != null)
            {
                var tokenStart = authCookie.IndexOf("fishtank_auth=") + "fishtank_auth=".Length;
                var tokenEnd = authCookie.IndexOf(';', tokenStart);
                if (tokenEnd == -1) tokenEnd = authCookie.Length;
                LastJwtToken = authCookie.Substring(tokenStart, tokenEnd - tokenStart);
            }
        }
    }

    /// <summary>
    /// Creates a new <see cref="HttpClient"/> from <paramref name="factory"/>
    /// already authenticated as the given user.
    /// </summary>
    public static async Task<HttpClient> CreateAuthenticatedClientAsync(
        FishtankWebApplicationFactory factory,
        string username = "admin",
        string password = "admin")
    {
        var client = factory.CreateClient(new() { AllowAutoRedirect = false });
        await LoginAsync(client, username, password);
        return client;
    }
}
