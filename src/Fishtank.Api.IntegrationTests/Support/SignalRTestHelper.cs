using Microsoft.AspNetCore.SignalR.Client;

namespace Fishtank.Api.IntegrationTests.Support;

/// <summary>
/// Helper for testing SignalR hub connections in integration tests.
/// </summary>
public static class SignalRTestHelper
{
    /// <summary>
    /// Creates and starts a SignalR connection to the ServicesHub.
    /// </summary>
    public static async Task<HubConnection> ConnectToServicesHubAsync(
        FishtankWebApplicationFactory factory,
        string? accessToken = null)
    {
        var hubConnection = new HubConnectionBuilder()
            .WithUrl(
                factory.Server.BaseAddress + "hubs/services",
                options =>
                {
                    options.HttpMessageHandlerFactory = _ => factory.Server.CreateHandler();
                    if (!string.IsNullOrEmpty(accessToken))
                    {
                        options.AccessTokenProvider = () => Task.FromResult<string?>(accessToken);
                    }
                })
            .Build();

        await hubConnection.StartAsync();
        return hubConnection;
    }

    /// <summary>
    /// Creates and starts a SignalR connection to the EventsHub.
    /// </summary>
    public static async Task<HubConnection> ConnectToEventsHubAsync(
        FishtankWebApplicationFactory factory,
        string? accessToken = null)
    {
        var hubConnection = new HubConnectionBuilder()
            .WithUrl(
                factory.Server.BaseAddress + "hubs/events",
                options =>
                {
                    options.HttpMessageHandlerFactory = _ => factory.Server.CreateHandler();
                    if (!string.IsNullOrEmpty(accessToken))
                    {
                        options.AccessTokenProvider = () => Task.FromResult<string?>(accessToken);
                    }
                })
            .Build();

        await hubConnection.StartAsync();
        return hubConnection;
    }

    /// <summary>
    /// Creates and starts a SignalR connection to the ActivityHub.
    /// </summary>
    public static async Task<HubConnection> ConnectToActivityHubAsync(
        FishtankWebApplicationFactory factory,
        string? accessToken = null)
    {
        var hubConnection = new HubConnectionBuilder()
            .WithUrl(
                factory.Server.BaseAddress + "hubs/activity",
                options =>
                {
                    options.HttpMessageHandlerFactory = _ => factory.Server.CreateHandler();
                    if (!string.IsNullOrEmpty(accessToken))
                    {
                        options.AccessTokenProvider = () => Task.FromResult<string?>(accessToken);
                    }
                })
            .Build();

        await hubConnection.StartAsync();
        return hubConnection;
    }
}
