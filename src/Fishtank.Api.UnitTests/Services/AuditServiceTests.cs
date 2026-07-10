using Fishtank.Api.Data;
using Fishtank.Api.Data.Entities;
using Fishtank.Api.Services;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using NSubstitute;

namespace Fishtank.Api.UnitTests.Services;

/// <summary>
/// Unit tests for AuditService covering:
/// - LogAsync happy path — entry created and persisted
/// - LogAsync exception handling — failure logged but swallowed
/// - Null detail serialization
/// 
/// Coverage goal: 90%+ line/branch coverage for AuditService
/// </summary>
public class AuditServiceTests
{
    private readonly ILogger<AuditService> _mockLogger;
    private FishtankDbContext _db = null!;

    public AuditServiceTests()
    {
        _mockLogger = Substitute.For<ILogger<AuditService>>();
    }

    private FishtankDbContext CreateInMemoryDb()
    {
        var options = new DbContextOptionsBuilder<FishtankDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new FishtankDbContext(options);
    }

    // ────────────────────────────────────────────────────────────────────────
    // Happy Path Tests
    // ────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "LogAsync creates audit entry with all fields")]
    public async Task LogAsync_CreatesAuditEntry_WithAllFields()
    {
        // Arrange
        _db = CreateInMemoryDb();
        var sut = new AuditService(_db, _mockLogger);

        var actorId = Guid.NewGuid();
        var details = new { from = "old", to = "new" };

        // Act
        await sut.LogAsync(
            action: "TestAction",
            actorId: actorId,
            resourceType: "TestResource",
            resourceId: "resource-123",
            details: details);

        // Assert
        var entries = await _db.AuditLogs.ToListAsync();
        entries.Should().ContainSingle();

        var entry = entries[0];
        entry.Action.Should().Be("TestAction");
        entry.ActorId.Should().Be(actorId);
        entry.ResourceType.Should().Be("TestResource");
        entry.ResourceId.Should().Be("resource-123");
        entry.Details.Should().Contain("\"from\":\"old\"");
        entry.Details.Should().Contain("\"to\":\"new\"");
        entry.CreatedAt.Should().BeCloseTo(DateTimeOffset.UtcNow, TimeSpan.FromSeconds(2));
    }

    [Fact(DisplayName = "LogAsync handles null actorId (system actions)")]
    public async Task LogAsync_HandlesNullActorId()
    {
        // Arrange
        _db = CreateInMemoryDb();
        var sut = new AuditService(_db, _mockLogger);

        // Act
        await sut.LogAsync(
            action: "SystemAction",
            actorId: null,
            resourceType: "System",
            resourceId: null);

        // Assert
        var entries = await _db.AuditLogs.ToListAsync();
        entries.Should().ContainSingle();

        var entry = entries[0];
        entry.Action.Should().Be("SystemAction");
        entry.ActorId.Should().BeNull();
        entry.ResourceId.Should().BeNull();
        entry.Details.Should().BeNull();
    }

    [Fact(DisplayName = "LogAsync handles null details")]
    public async Task LogAsync_HandlesNullDetails()
    {
        // Arrange
        _db = CreateInMemoryDb();
        var sut = new AuditService(_db, _mockLogger);

        var actorId = Guid.NewGuid();

        // Act
        await sut.LogAsync(
            action: "TestAction",
            actorId: actorId,
            resourceType: "TestResource",
            resourceId: "resource-123",
            details: null);

        // Assert
        var entries = await _db.AuditLogs.ToListAsync();
        entries.Should().ContainSingle();
        entries[0].Details.Should().BeNull();
    }

    // ────────────────────────────────────────────────────────────────────────
    // Exception Handling Tests
    // ────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "LogAsync swallows exception and logs warning")]
    public async Task LogAsync_SwallowsException_AndLogsWarning()
    {
        // Arrange
        // Create a disposed DbContext to force SaveChangesAsync to throw
        _db = CreateInMemoryDb();
        _db.Dispose();

        var sut = new AuditService(_db, _mockLogger);

        // Act
        // Should NOT throw — exception must be swallowed
        await sut.LogAsync(
            action: "TestAction",
            actorId: Guid.NewGuid(),
            resourceType: "TestResource",
            resourceId: "resource-123");

        // Assert
        // Verify warning was logged
        _mockLogger.Received(1).Log(
            LogLevel.Warning,
            Arg.Any<EventId>(),
            Arg.Is<object>(o => o.ToString()!.Contains("Audit logging failed")),
            Arg.Any<Exception>(),
            Arg.Any<Func<object, Exception?, string>>());
    }

    [Fact(DisplayName = "LogAsync logs warning with action and resource details")]
    public async Task LogAsync_LogsWarning_WithActionAndResourceDetails()
    {
        // Arrange
        _db = CreateInMemoryDb();
        _db.Dispose();

        var sut = new AuditService(_db, _mockLogger);

        // Act
        await sut.LogAsync(
            action: "CriticalAction",
            actorId: Guid.NewGuid(),
            resourceType: "ImportantResource",
            resourceId: "important-123");

        // Assert
        _mockLogger.Received(1).Log(
            LogLevel.Warning,
            Arg.Any<EventId>(),
            Arg.Is<object>(o =>
                o.ToString()!.Contains("CriticalAction") &&
                o.ToString()!.Contains("ImportantResource") &&
                o.ToString()!.Contains("important-123")),
            Arg.Any<Exception>(),
            Arg.Any<Func<object, Exception?, string>>());
    }
}
