namespace Fishtank.Api.Models;

public record ActivityRowDto
{
    public Guid Id { get; init; }
    public DateTimeOffset Timestamp { get; init; }
    public string Method { get; init; } = string.Empty;
    public string UrlPath { get; init; } = string.Empty;
    public int StatusCode { get; init; }
    public string Type { get; init; } = string.Empty;
    public Guid ServiceId { get; init; }
    public string ServiceName { get; init; } = string.Empty;
    public int ServicePort { get; init; }
    public int DurationMs { get; init; }
    public Dictionary<string, string> RequestHeaders { get; init; } = new();
    public string? RequestBody { get; init; }
    public Dictionary<string, string> ResponseHeaders { get; init; } = new();
    public string? ResponseBody { get; init; }
}
