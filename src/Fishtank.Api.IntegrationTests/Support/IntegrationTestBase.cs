using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Fishtank.Api.IntegrationTests.Support;

/// <summary>
/// Base class for all integration tests.
///
/// Provides:
///  - A shared <see cref="FishtankWebApplicationFactory"/> via xUnit's
///    ICollectionFixture, so the host starts once per collection.
///  - A per-test <see cref="HttpClient"/> with redirects disabled.
///  - Shared <see cref="JsonOptions"/> for deserialising response envelopes.
///  - A Respawn hook (stubbed) for per-test database reset.
/// </summary>
[Collection("Integration")]
public abstract class IntegrationTestBase : IAsyncLifetime
{
    protected readonly FishtankWebApplicationFactory Factory;
    protected readonly HttpClient Client;

    protected static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    protected IntegrationTestBase(FishtankWebApplicationFactory factory)
    {
        Factory = factory;
        Client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false,
        });
    }

    /// <summary>Override to add per-test setup logic.</summary>
    public virtual Task InitializeAsync() => Task.CompletedTask;

    public virtual async Task DisposeAsync()
    {
        Client.Dispose();

        // TODO: Reset DB state via Respawn checkpoint once DbContext is configured.
        // await _respawner.ResetAsync(_dbConnection);

        await Task.CompletedTask;
    }
}

/// <summary>
/// Marks the shared collection fixture so xUnit creates one
/// FishtankWebApplicationFactory for all tests in this collection.
/// </summary>
[CollectionDefinition("Integration")]
public class IntegrationTestCollection : ICollectionFixture<FishtankWebApplicationFactory>;
