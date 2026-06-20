using System.Net.Http.Json;

namespace Fishtank.Api.IntegrationTests.Support;

public static class TestAuthHelper
{
    private sealed record LoginRequest(string Username, string Password);

    /// <summary>
    /// Authenticates the given <paramref name="client"/> by posting to
    /// <c>/api/auth/login</c>. The server sets an httpOnly JWT cookie;
    /// <see cref="HttpClient"/> stores it automatically for subsequent calls.
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
