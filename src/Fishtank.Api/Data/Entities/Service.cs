using System.Text.Json;

namespace Fishtank.Api.Data.Entities;

public class Service
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string ExternalUrl { get; set; } = string.Empty;
    public int Port { get; set; }
    public string MocksRoot { get; set; } = string.Empty;
    public ServiceStatus Status { get; set; } = ServiceStatus.Live;
    public bool IsActive { get; set; } = true;
    public DateTimeOffset? DeletedAt { get; set; }
    public string TagsJson { get; set; } = "[]";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    [System.ComponentModel.DataAnnotations.Schema.NotMapped]
    public string[] Tags
    {
        get
        {
            try { return JsonSerializer.Deserialize<string[]>(TagsJson) ?? []; }
            catch (System.Text.Json.JsonException) { return []; }
        }
        set => TagsJson = JsonSerializer.Serialize(value);
    }
}

public enum ServiceStatus { Live, Stopped }
