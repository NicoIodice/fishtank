using System.Globalization;
using System.Security.Claims;
using System.Text;
using System.Threading.RateLimiting;
using Fishtank.Api.Data;
using Fishtank.Api.Data.Entities;
using Fishtank.Api.Endpoints;
using Fishtank.Api.Engine;
using Fishtank.Api.Hubs;
using Fishtank.Api.Middleware;
using Fishtank.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Policy;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using Serilog.Formatting.Compact;

var builder = WebApplication.CreateBuilder(args);

// ─── 1. Serilog ─────────────────────────────────────────────────────────────
// Must come first — needs to capture DB migration failures.
var logPath = builder.Configuration["FISHTANK_LOG_PATH"] ?? "/data/logs";
var retentionDays = 7;
if (int.TryParse(builder.Configuration["FISHTANK_LOG_RETENTION_DAYS"], out var parsedRetention))
{
    retentionDays = parsedRetention;
}

builder.Host.UseSerilog((ctx, cfg) =>
{
    cfg.ReadFrom.Configuration(ctx.Configuration)
       .Enrich.FromLogContext()
       .WriteTo.Console(new CompactJsonFormatter());

    // File sink — optional, graceful degradation if directory is unwritable
    try
    {
        Directory.CreateDirectory(logPath);
        var testFile = Path.Combine(logPath, ".write-test");
        File.WriteAllText(testFile, "");
        File.Delete(testFile);

        cfg.WriteTo.Sink(new AppendOnlyRollingFileSink(logPath, new CompactJsonFormatter(), retainedFileCount: retentionDays));
    }
    catch (Exception)
    {
        Console.WriteLine(
            $"[WRN] Unable to write to log directory '{logPath}' — file logging disabled. Stdout logging continues.");
    }
});

// ─── 2. CORS ─────────────────────────────────────────────────────────────────
var managementPort = builder.Configuration["FISHTANK_MANAGEMENT_PORT"] ?? "5000";
var allowedOrigins = new List<string> { $"http://localhost:{managementPort}" };
var extraOrigins = (builder.Configuration["FISHTANK_ALLOWED_ORIGINS"] ?? "")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
foreach (var origin in extraOrigins)
{
    if (origin == "*")
        throw new InvalidOperationException(
            "SYSTEM_CONFIG_INVALID: Wildcard CORS origin (*) is not permitted.");
    allowedOrigins.Add(origin);
}
builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins([.. allowedOrigins])
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials()));

// ─── 3. JWT authentication ────────────────────────────────────────────────────
var jwtSecret = builder.Configuration["FISHTANK_JWT_SECRET"]
    ?? throw new InvalidOperationException(
        "SYSTEM_CONFIG_INVALID: FISHTANK_JWT_SECRET must be set (minimum 32 characters).");
if (jwtSecret.Length < 32)
    throw new InvalidOperationException(
        "SYSTEM_CONFIG_INVALID: FISHTANK_JWT_SECRET must be at least 32 characters.");

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero,
        };

        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = ctx =>
            {
                // Read JWT from httpOnly cookie (not Authorization header) — NFR-16
                ctx.Token = ctx.Request.Cookies["fishtank_auth"];
                return Task.CompletedTask;
            },

            OnTokenValidated = async ctx =>
            {
                // Validate BootEpoch (container-lifetime invalidation — FR-24)
                var bootEpochClaim = ctx.Principal?.FindFirstValue("boot_epoch");
                var configService = ctx.HttpContext.RequestServices
                    .GetRequiredService<IServerConfigService>();
                var currentEpoch = await configService.GetBootEpochAsync();
                if (bootEpochClaim != currentEpoch.ToString())
                {
                    ctx.Fail("Token epoch mismatch — container restarted.");
                    return;
                }

                // Validate TokenVersion (user deactivation / forced change — AC-6)
                var userIdClaim = ctx.Principal?.FindFirstValue(ClaimTypes.NameIdentifier);
                if (Guid.TryParse(userIdClaim, out var userId))
                {
                    var db = ctx.HttpContext.RequestServices
                        .GetRequiredService<FishtankDbContext>();
                    var tokenVersionClaim = ctx.Principal?.FindFirstValue("token_version");
                    var user = await db.Users.FindAsync(userId);
                    if (user is null || !user.IsActive
                        || !int.TryParse(tokenVersionClaim, out var tv)
                        || tv != user.TokenVersion)
                    {
                        ctx.Fail("Token version mismatch or user inactive.");
                    }
                }
            },
        };
    });
builder.Services.AddAuthorization();
builder.Services.AddSingleton<IAuthorizationMiddlewareResultHandler,
    JsonAuthorizationMiddlewareResultHandler>();

// ─── 4. Rate limiter ──────────────────────────────────────────────────────────
var permitLimit = int.Parse(
    builder.Configuration["FISHTANK_LOGIN_RATE_LIMIT"] ?? "5");
var windowSecs = int.Parse(
    builder.Configuration["FISHTANK_LOGIN_RATE_WINDOW"] ?? "60");

builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("login", cfg =>
    {
        cfg.PermitLimit = permitLimit;
        cfg.Window = TimeSpan.FromSeconds(windowSecs);
        cfg.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        cfg.QueueLimit = 0;
    });
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = async (ctx, ct) =>
    {
        ctx.HttpContext.Response.Headers.RetryAfter =
            windowSecs.ToString(CultureInfo.InvariantCulture);
        ctx.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        await ctx.HttpContext.Response.WriteAsJsonAsync(new
        {
            success = false,
            error = new
            {
                code = "AUTH_RATE_LIMIT_EXCEEDED",
                message = "Too many login attempts. Please try again later.",
            },
        }, ct);
    };
});

// ─── 5. EF Core (SQLite) ──────────────────────────────────────────────────────
var dbPath = builder.Configuration["FISHTANK_DB_PATH"] ?? "/app/data/fishtank.db";
builder.Services.AddDbContext<FishtankDbContext>(opt =>
    opt.UseSqlite($"Data Source={dbPath}"));

// ─── Mocks Root — where WireMock mapping/response files live.
// Default to /mocks (the conventional volume mount documented in
// docker-compose.example.yml) so the app works out-of-the-box; deployments, CI,
// and tests override it with their own (writable) path. All consumers
// (MappingService, ResyncService, ServiceManager, EngineStartup) read this key,
// so defaulting once here keeps them consistent and avoids a hard crash when the
// variable is not explicitly provided.
builder.Configuration["FISHTANK_MOCKS_ROOT"] ??= "/mocks";

// ─── 6. Application services ──────────────────────────────────────────────────
builder.Services.AddSingleton<IServerConfigService, ServerConfigService>();
builder.Services.AddScoped<IPasswordHasher, BCryptPasswordHasher>();
builder.Services.AddScoped<IAuthService, AuthService>();

// ─── 6b. Engine + Services layer (Epic 2) ─────────────────────────────────
builder.Services.AddSignalR();
builder.Services.AddSingleton<IServicesRegistry, ServicesRegistry>();
builder.Services.AddSingleton<IWireMockServerFactory, DefaultWireMockServerFactory>();
builder.Services.AddScoped<ISystemEventService, SystemEventService>();
builder.Services.AddScoped<IServiceManager, ServiceManager>();
builder.Services.AddScoped<ICacheService, CacheService>();
builder.Services.AddSingleton<IActivityStore>(sp =>
    new ActivityStore(sp.GetRequiredService<IConfiguration>()));
builder.Services.AddScoped<IHeaderRedactionService, HeaderRedactionService>();
builder.Services.AddScoped<IActivityService, ActivityService>();
builder.Services.AddHostedService<EngineStartup>();
builder.Services.AddHostedService<ActivityPollingService>();

// ─── 6c. File management (Story 4.1) ─────────────────────────────────────
builder.Services.AddScoped<IMappingService, MappingService>();
builder.Services.AddScoped<IResyncService, ResyncService>();
// ─── 6d. Recording mode (Story 4.5) ────────────────────────────────────────
builder.Services.AddSingleton<IRecordingService, RecordingService>();
// ─── 6e. Feature toggles (Story 5.1) ───────────────────────────────────────
builder.Services.AddScoped<IFeatureToggleService, FeatureToggleService>();
// ─── 6f. User management (Story 5.2) ───────────────────────────────────────
builder.Services.AddScoped<IUserManagementService, UserManagementService>();
// ─── 6g. Audit log (Story 5.3) ─────────────────────────────────────────────
builder.Services.AddScoped<IAuditService, AuditService>();
// ─── 7. OpenAPI + Health ──────────────────────────────────────────────────────
builder.Services.AddOpenApi();
builder.Services.AddHealthChecks();

// ─────────────────────────────────────────────────────────────────────────────
var app = builder.Build();

// ─── 8. Auto-migrate + seed BootEpoch ────────────────────────────────────────
// FishtankWebApplicationFactory replaces the DbContext with in-memory SQLite
// and runs migration + seeding in ResetDatabaseAsync(), so we skip this block
// in the Testing environment to avoid a double-migrate race.
if (!app.Environment.IsEnvironment("Testing"))
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<FishtankDbContext>();
    try
    {
        await db.Database.MigrateAsync();

        if (!db.ServerConfigs.Any())
        {
            db.ServerConfigs.Add(new ServerConfig());
            await db.SaveChangesAsync();
        }
    }
    catch (Exception ex)
    {
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "Database migration failed. DbPath={DbPath}", dbPath);
        throw; // Let container exit non-zero (AC-11)
    }
}

// ─── 9. Middleware pipeline ───────────────────────────────────────────────────
// Order is CRITICAL — see architecture.md and story 1.2 dev notes.

// 9.1  IP forwarding — must be first, before rate limiter needs real client IP
app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto,
});

// 9.2  Rate limiting (before auth — protects the login endpoint per AC-7)
app.UseRateLimiter();

// 9.3  CORS
app.UseCors();

// 9.4  SPA static assets
app.UseDefaultFiles();
app.UseStaticFiles();

// 9.5  First-run gate (before auth — must intercept before JWT fails on fresh instance)
app.UseMiddleware<FirstRunMiddleware>();

// 9.6  Authentication + authorization
app.UseAuthentication();
app.UseAuthorization();

// ─── 10. Endpoints ───────────────────────────────────────────────────────────
if (app.Environment.IsDevelopment() || app.Environment.IsEnvironment("Testing"))
{
    app.MapOpenApi();
    app.MapTestEndpoints();
}

app.MapHealthChecks("/health");
app.MapAuthEndpoints();
app.MapServicesEndpoints();
app.MapMappingsEndpoints();
app.MapRecordingEndpoints();
app.MapSettingsEndpoints();
app.MapSystemEventsEndpoints();
app.MapCacheEndpoints();
app.MapActivityEndpoints();
app.MapAdminEndpoints();
app.MapUsersEndpoints();
app.MapHub<ServicesHub>("/hubs/services");
app.MapHub<EventsHub>("/hubs/events");
app.MapHub<ActivityHub>("/hubs/activity");
app.MapHub<TogglesHub>("/hubs/toggles");

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

    if (env.WebRootPath is null)
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

/// <summary>
/// Serilog sink that writes rolling daily JSON log files using an open-write-close
/// pattern on each log event. This avoids Windows exclusive file locks that prevent
/// concurrent readers (e.g., integration tests, log-tail utilities) from reading
/// the log file while the application is running.
/// </summary>
internal sealed class AppendOnlyRollingFileSink : Serilog.Core.ILogEventSink
{
    private readonly string _logDirectory;
    private readonly Serilog.Formatting.ITextFormatter _formatter;
    private readonly int _retainedFileCount;
    private readonly object _sync = new();
    private DateOnly _lastCleanupDate = DateOnly.MinValue;

    public AppendOnlyRollingFileSink(
        string logDirectory,
        Serilog.Formatting.ITextFormatter formatter,
        int retainedFileCount)
    {
        _logDirectory = logDirectory;
        _formatter = formatter;
        _retainedFileCount = retainedFileCount;
    }

    public void Emit(Serilog.Events.LogEvent logEvent)
    {
        var eventDate = DateOnly.FromDateTime(logEvent.Timestamp.UtcDateTime);
        var filename = Path.Combine(_logDirectory, $"fishtank-{eventDate:yyyyMMdd}.log");

        using var sw = new StringWriter();
        _formatter.Format(logEvent, sw);
        var entry = System.Text.Encoding.UTF8.GetBytes(sw.ToString());

        lock (_sync)
        {
            // Open-write-close: file is not held open between writes, so concurrent
            // readers using FileShare.Read can access the file between log events.
            // FileShare.ReadWrite allows readers to open the file even during a write.
            using (var fs = new FileStream(
                filename,
                FileMode.Append,
                FileAccess.Write,
                FileShare.ReadWrite))
            {
                fs.Write(entry);
                fs.Flush();
            }

            // Retention cleanup on day rollover (best-effort)
            if (eventDate > _lastCleanupDate)
            {
                _lastCleanupDate = eventDate;
                CleanupOldFiles(eventDate);
            }
        }
    }

    private void CleanupOldFiles(DateOnly currentDate)
    {
        try
        {
            var cutoffDate = currentDate.AddDays(-_retainedFileCount);
            foreach (var file in Directory.GetFiles(_logDirectory, "fishtank-*.log"))
            {
                var name = Path.GetFileNameWithoutExtension(file);
                // Expected pattern: fishtank-yyyyMMdd  (length 17: 8 + '-' + 8)
                if (name.Length == 17
                    && DateOnly.TryParseExact(
                        name.AsSpan(9), "yyyyMMdd",
                        System.Globalization.CultureInfo.InvariantCulture,
                        System.Globalization.DateTimeStyles.None,
                        out var fileDate)
                    && fileDate < cutoffDate)
                {
                    File.Delete(file);
                }
            }
        }
        catch
        {
            // Retention cleanup is best-effort; never crash logging
        }
    }
}
