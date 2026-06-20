using System.Net;
using FluentAssertions;
using Fishtank.Api.IntegrationTests.Support;

namespace Fishtank.Api.IntegrationTests.Api;

/// <summary>
/// Health-check integration tests.
///
/// Demonstrates:
///  - Given/When/Then structure
///  - WebApplicationFactory + HttpClient usage
///  - FluentAssertions for readable assertions
/// </summary>
public class HealthTests : IntegrationTestBase, IClassFixture<FishtankWebApplicationFactory>
{
    public HealthTests(FishtankWebApplicationFactory factory) : base(factory) { }

    [Fact]
    public async Task GET_health_returns_200()
    {
        // Given the API is running

        // When
        var response = await Client.GetAsync("/health");

        // Then
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GET_openapi_spec_returns_200_in_development()
    {
        // Given the API is running in the Testing environment

        // When
        var response = await Client.GetAsync("/openapi/v1.json");

        // Then — OpenAPI is served without the response envelope (plain JSON)
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        response.Content.Headers.ContentType?.MediaType.Should().Be("application/json");
    }
}
