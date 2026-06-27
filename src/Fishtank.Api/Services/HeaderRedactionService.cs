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
    public HeaderRedactionService(bool captureFullHeaders = false)
    {
        _captureFullHeaders = captureFullHeaders;
    }

    // For DI: reads CaptureFullHeaders from the singleton config cache
    public HeaderRedactionService(IServerConfigService configService)
    {
        _captureFullHeaders = configService.GetCaptureFullHeadersCached();
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
