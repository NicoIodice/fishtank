using FluentAssertions;
using Fishtank.Api.Services;
using Fishtank.Api.UnitTests.Support;
using Microsoft.Extensions.Configuration;
using NSubstitute;

namespace Fishtank.Api.UnitTests.Services;

/* ─── RED-phase stub removed — implementation now exists ─────────────────────
   Fishtank.Api.Services.HeaderRedactionService is the real implementation.
   ─────────────────────────────────────────────────────────────────────────── */

/// <summary>
/// Unit tests for <see cref="HeaderRedactionService"/> (Story 3-1).
///
/// ACs covered:
///   AC-2 — Sensitive headers are redacted at storage time (exact + contains matches).
///   AC-3 — Full header capture opt-in disables redaction entirely.
/// </summary>
public class HeaderRedactionServiceTests : UnitTestBase
{
    // ─── AC-2: exact-match sensitive headers are redacted ───────────────────

    [Theory(DisplayName = "AC-2: exact-match sensitive headers are replaced with [REDACTED]")]
    [InlineData("Authorization", "Bearer abc123")]
    [InlineData("Cookie", "session=xyz")]
    [InlineData("Set-Cookie", "token=abc; HttpOnly")]
    [InlineData("X-Api-Key", "secret-key-value")]
    [InlineData("X-Auth-Token", "some-token")]
    public void Redact_ExactMatchSensitiveHeader_ReplacesValueWithRedacted(
        string headerName, string headerValue)
    {
        var sut = new HeaderRedactionService(captureFullHeaders: false);
        var headers = new Dictionary<string, string> { [headerName] = headerValue };

        var result = sut.Redact(headers);

        result[headerName].Should().Be("[REDACTED]");
    }

    [Theory(DisplayName = "AC-2: exact-match redaction is case-insensitive on header name")]
    [InlineData("authorization", "Bearer abc123")]
    [InlineData("AUTHORIZATION", "Bearer abc123")]
    [InlineData("cookie", "session=xyz")]
    [InlineData("COOKIE", "session=xyz")]
    [InlineData("x-api-key", "secret-key-value")]
    [InlineData("X-API-KEY", "secret-key-value")]
    public void Redact_ExactMatchIsCaseInsensitive_ReplacesValueWithRedacted(
        string headerName, string headerValue)
    {
        var sut = new HeaderRedactionService(captureFullHeaders: false);
        var headers = new Dictionary<string, string> { [headerName] = headerValue };

        var result = sut.Redact(headers);

        result[headerName].Should().Be("[REDACTED]");
    }

    // ─── AC-2: contains-match — header name containing 'secret' is redacted ─

    [Theory(DisplayName = "AC-2: header name containing 'secret' (case-insensitive) is redacted")]
    [InlineData("X-My-Secret-Key", "some-value")]
    [InlineData("X-SECRET-VALUE", "some-value")]
    [InlineData("my-secret-header", "some-value")]
    [InlineData("APP-SECRET", "some-value")]
    public void Redact_HeaderContainsSecret_ReplacesValueWithRedacted(
        string headerName, string headerValue)
    {
        var sut = new HeaderRedactionService(captureFullHeaders: false);
        var headers = new Dictionary<string, string> { [headerName] = headerValue };

        var result = sut.Redact(headers);

        result[headerName].Should().Be("[REDACTED]");
    }

    // ─── AC-2: contains-match — header name containing 'token' is redacted ──

    [Theory(DisplayName = "AC-2: header name containing 'token' (case-insensitive) is redacted")]
    [InlineData("CSRF-Token", "abc")]
    [InlineData("x-refresh-token", "foo")]
    [InlineData("X-TOKEN-DATA", "value")]
    [InlineData("access-token", "eyJhbGc")]
    public void Redact_HeaderContainsToken_ReplacesValueWithRedacted(
        string headerName, string headerValue)
    {
        var sut = new HeaderRedactionService(captureFullHeaders: false);
        var headers = new Dictionary<string, string> { [headerName] = headerValue };

        var result = sut.Redact(headers);

        result[headerName].Should().Be("[REDACTED]");
    }

    // ─── AC-2: safe headers pass through unchanged ───────────────────────────

    [Theory(DisplayName = "AC-2: safe headers are NOT redacted and pass through unchanged")]
    [InlineData("Content-Type", "application/json")]
    [InlineData("Accept", "text/html")]
    [InlineData("X-Request-Id", "abc-123")]
    [InlineData("User-Agent", "Mozilla/5.0")]
    [InlineData("Cache-Control", "no-cache")]
    public void Redact_SafeHeader_PassesThroughUnchanged(
        string headerName, string headerValue)
    {
        var sut = new HeaderRedactionService(captureFullHeaders: false);
        var headers = new Dictionary<string, string> { [headerName] = headerValue };

        var result = sut.Redact(headers);

        result[headerName].Should().Be(headerValue);
    }

    // ─── AC-2: mixed header set — only sensitive entries are redacted ────────

    [Fact(DisplayName = "AC-2: mixed headers — sensitive redacted, safe headers unchanged")]
    public void Redact_MixedHeaders_RedactsOnlySensitiveKeys()
    {
        var sut = new HeaderRedactionService(captureFullHeaders: false);
        var headers = new Dictionary<string, string>
        {
            ["Authorization"] = "Bearer abc123",
            ["Content-Type"] = "application/json",
            ["X-My-Secret-Key"] = "do-not-expose",
            ["Accept"] = "text/html",
            ["CSRF-Token"] = "csrf-value",
            ["X-Request-Id"] = "req-001",
        };

        var result = sut.Redact(headers);

        result["Authorization"].Should().Be("[REDACTED]");
        result["Content-Type"].Should().Be("application/json");
        result["X-My-Secret-Key"].Should().Be("[REDACTED]");
        result["Accept"].Should().Be("text/html");
        result["CSRF-Token"].Should().Be("[REDACTED]");
        result["X-Request-Id"].Should().Be("req-001");
    }

    // ─── AC-3: captureFullHeaders=true disables all redaction ───────────────

    [Theory(DisplayName = "AC-3: captureFullHeaders=true — sensitive headers pass through unchanged")]
    [InlineData("Authorization", "Bearer abc123")]
    [InlineData("Cookie", "session=xyz")]
    [InlineData("X-My-Secret-Key", "some-value")]
    [InlineData("CSRF-Token", "csrf-val")]
    [InlineData("X-Auth-Token", "tok")]
    public void Redact_WhenCaptureFullHeadersEnabled_ReturnsOriginalValues(
        string headerName, string headerValue)
    {
        var sut = new HeaderRedactionService(captureFullHeaders: true);
        var headers = new Dictionary<string, string> { [headerName] = headerValue };

        var result = sut.Redact(headers);

        result[headerName].Should().Be(headerValue);
    }

    // ─── AC-2: empty headers → empty result ─────────────────────────────────

    [Fact(DisplayName = "AC-2: empty header dictionary returns empty dictionary")]
    public void Redact_EmptyDictionary_ReturnsEmptyDictionary()
    {
        var sut = new HeaderRedactionService(captureFullHeaders: false);
        var headers = new Dictionary<string, string>();

        var result = sut.Redact(headers);

        result.Should().BeEmpty();
    }

    // ─── AC-3/AC-4: DI constructor — env var / DB setting control ────────────

    [Fact(DisplayName = "AC-3/AC-4: DI constructor — FISHTANK_CAPTURE_FULL_HEADERS=true disables redaction")]
    public void Constructor_EnvVarTrue_EnablesFullCapture()
    {
        var configService = Substitute.For<IServerConfigService>();
        configService.GetCaptureFullHeadersCached().Returns(false);

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection([new KeyValuePair<string, string?>("FISHTANK_CAPTURE_FULL_HEADERS", "true")])
            .Build();

        var sut = new HeaderRedactionService(configService, configuration);
        var headers = new Dictionary<string, string> { ["Authorization"] = "Bearer secret" };

        var result = sut.Redact(headers);

        result["Authorization"].Should().Be("Bearer secret",
            "env var=true enables full capture so no redaction should occur");
    }

    [Fact(DisplayName = "AC-3/AC-4: DI constructor — DB setting=true disables redaction")]
    public void Constructor_DBSettingTrue_EnablesFullCapture()
    {
        var configService = Substitute.For<IServerConfigService>();
        configService.GetCaptureFullHeadersCached().Returns(true);

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(Array.Empty<KeyValuePair<string, string?>>())
            .Build();

        var sut = new HeaderRedactionService(configService, configuration);
        var headers = new Dictionary<string, string> { ["Authorization"] = "Bearer secret" };

        var result = sut.Redact(headers);

        result["Authorization"].Should().Be("Bearer secret",
            "DB setting=true enables full capture so no redaction should occur");
    }

    [Fact(DisplayName = "AC-2: DI constructor — env var=false and DB setting=false enables redaction")]
    public void Constructor_EnvVarFalse_DBFalse_RedactionEnabled()
    {
        var configService = Substitute.For<IServerConfigService>();
        configService.GetCaptureFullHeadersCached().Returns(false);

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection([new KeyValuePair<string, string?>("FISHTANK_CAPTURE_FULL_HEADERS", "false")])
            .Build();

        var sut = new HeaderRedactionService(configService, configuration);
        var headers = new Dictionary<string, string> { ["Authorization"] = "Bearer secret" };

        var result = sut.Redact(headers);

        result["Authorization"].Should().Be("[REDACTED]",
            "both env var=false and DB=false means redaction must be active");
    }
}
