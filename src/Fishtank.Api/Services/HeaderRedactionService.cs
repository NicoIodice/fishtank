namespace Fishtank.Api.Services;

/// <summary>
/// Redacts sensitive HTTP headers before activity rows are stored.
/// When <c>captureFullHeaders</c> is <c>true</c>, redaction is disabled entirely.
///
/// Sensitive headers (case-insensitive):
///   • Exact match: Authorization, Cookie, Set-Cookie, X-Api-Key, X-Auth-Token
///   • Contains:    any header whose name contains "secret" or "token"
/// </summary>
public sealed class HeaderRedactionService : IHeaderRedactionService
{
    private static readonly HashSet<string> ExactMatches = new(StringComparer.OrdinalIgnoreCase)
    {
        "Authorization",
        "Cookie",
        "Set-Cookie",
        "X-Api-Key",
        "X-Auth-Token",
    };

    private readonly bool _captureFullHeaders;

    // For unit tests: new HeaderRedactionService() or new HeaderRedactionService(captureFullHeaders: true)
    // internal so the DI container's Type.GetConstructors() only sees the service constructor
    internal HeaderRedactionService(bool captureFullHeaders = false)
    {
        _captureFullHeaders = captureFullHeaders;
    }

    // For DI: checks FISHTANK_CAPTURE_FULL_HEADERS env var first, then DB setting
    public HeaderRedactionService(IServerConfigService configService, IConfiguration configuration)
    {
        var envOverride = configuration["FISHTANK_CAPTURE_FULL_HEADERS"];
        _captureFullHeaders = string.Equals(envOverride, "true", StringComparison.OrdinalIgnoreCase)
            || configService.GetCaptureFullHeadersCached();
    }

    public Dictionary<string, string> Redact(Dictionary<string, string> headers)
    {
        if (_captureFullHeaders)
            return new Dictionary<string, string>(headers, StringComparer.OrdinalIgnoreCase);

        var result = new Dictionary<string, string>(headers.Count, StringComparer.OrdinalIgnoreCase);
        foreach (var (key, value) in headers)
        {
            result[key] = IsSensitive(key) ? "[REDACTED]" : value;
        }
        return result;
    }

    private static bool IsSensitive(string headerName)
    {
        if (ExactMatches.Contains(headerName))
            return true;

        var upper = headerName.ToUpperInvariant();
        return upper.Contains("SECRET", StringComparison.Ordinal)
            || upper.Contains("TOKEN", StringComparison.Ordinal);
    }
}
