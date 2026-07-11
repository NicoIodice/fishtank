namespace Fishtank.Api.Models;

/// <summary>
/// OpenAPI schema for successful API responses.
/// Generic wrapper type that documents the standard response envelope.
/// </summary>
/// <typeparam name="T">The data type returned in the response</typeparam>
public record ApiResponseSchema<T>(bool Success, T? Data);

/// <summary>
/// OpenAPI schema for API error responses.
/// Documents the standard error envelope with error codes and messages.
/// </summary>
public record ApiErrorResponseSchema(bool Success, ApiErrorDetail Error);

/// <summary>
/// OpenAPI schema for error details.
/// Error codes follow feature-prefixed screaming snake case:
/// - SERVICE_* — Services management errors
/// - AUTH_* — Authentication errors
/// - MAPPING_* — Mapping/Response file errors
/// - ENGINE_* — WireMock engine errors
/// - SYSTEM_* — Infrastructure/startup errors
/// - ADMIN_* — Admin Console errors
/// - ACTIVITY_* — Activity log errors
/// </summary>
public record ApiErrorDetail(string Code, string Message, string? Details = null);
