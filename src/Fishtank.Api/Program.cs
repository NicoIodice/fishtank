var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddHealthChecks();

var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

if (app.Environment.IsDevelopment() || app.Environment.IsEnvironment("Testing"))
{
    app.MapOpenApi();
}

app.MapHealthChecks("/health");

// SPA fallback: serve index.html for all non-API routes.
// Routes matching /api/*, /hubs/*, /health, /openapi are excluded.
app.MapFallback(async (HttpContext ctx, IWebHostEnvironment env) =>
{
    var path = ctx.Request.Path.Value ?? string.Empty;
    if (path.StartsWith("/api/", StringComparison.OrdinalIgnoreCase)
        || path.Equals("/api", StringComparison.OrdinalIgnoreCase)
        || path.StartsWith("/hubs/", StringComparison.OrdinalIgnoreCase)
        || path.Equals("/hubs", StringComparison.OrdinalIgnoreCase)
        || path.Equals("/health", StringComparison.OrdinalIgnoreCase)
        || path.StartsWith("/openapi", StringComparison.OrdinalIgnoreCase))
    {
        ctx.Response.StatusCode = StatusCodes.Status404NotFound;
        return;
    }

    ctx.Response.ContentType = "text/html; charset=utf-8";
    await ctx.Response.SendFileAsync(
        Path.Combine(env.WebRootPath, "index.html"),
        ctx.RequestAborted);
});

app.Run();

// Exposes Program for WebApplicationFactory<Program> in integration tests.
public partial class Program;
