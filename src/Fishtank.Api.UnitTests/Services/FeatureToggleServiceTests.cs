using Fishtank.Api.Data;
using Fishtank.Api.Data.Entities;
using Fishtank.Api.Exceptions;
using Fishtank.Api.Hubs;
using Fishtank.Api.Services;
using FluentAssertions;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using NSubstitute;

namespace Fishtank.Api.UnitTests.Services;

/// <summary>
/// Unit tests for FeatureToggleService covering:
/// - Env var override loading and parsing
/// - GetAllTogglesAsync with env var precedence and ordering
/// - SetToggleAsync validation (env-locked, not found)
/// - SignalR broadcast on toggle change
/// 
/// Coverage goal: 90%+ line/branch coverage for FeatureToggleService
/// </summary>
public class FeatureToggleServiceTests
{
    private readonly IHubContext<TogglesHub> _mockHubContext;
    private readonly IHubClients _mockClients;
    private readonly IClientProxy _mockClientProxy;
    private FishtankDbContext _db = null!;
    private IConfiguration _config = null!;

    public FeatureToggleServiceTests()
    {
        _mockHubContext = Substitute.For<IHubContext<TogglesHub>>();
        _mockClients = Substitute.For<IHubClients>();
        _mockClientProxy = Substitute.For<IClientProxy>();

        _mockHubContext.Clients.Returns(_mockClients);
        _mockClients.All.Returns(_mockClientProxy);
    }

    private FishtankDbContext CreateInMemoryDb()
    {
        var options = new DbContextOptionsBuilder<FishtankDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new FishtankDbContext(options);
    }

    private IConfiguration CreateConfig(Dictionary<string, string?>? values = null)
    {
        var configValues = values ?? new Dictionary<string, string?>();
        return new ConfigurationBuilder()
            .AddInMemoryCollection(configValues)
            .Build();
    }

    private async Task SeedTogglesAsync(FishtankDbContext db)
    {
        db.FeatureToggles.AddRange(
            new FeatureToggle
            {
                Id = Guid.NewGuid(),
                Name = "network_activity",
                DisplayName = "Network Activity",
                Description = "View network activity logs",
                Enabled = true,
                UpdatedAt = DateTimeOffset.UtcNow.AddHours(-2)
            },
            new FeatureToggle
            {
                Id = Guid.NewGuid(),
                Name = "mappings_editor",
                DisplayName = "Mappings Editor",
                Description = "Edit request/response mappings",
                Enabled = true,
                UpdatedAt = DateTimeOffset.UtcNow.AddHours(-1)
            },
            new FeatureToggle
            {
                Id = Guid.NewGuid(),
                Name = "record_mode",
                DisplayName = "Record Mode",
                Description = "Record real service responses",
                Enabled = false,
                UpdatedAt = DateTimeOffset.UtcNow
            }
        );
        await db.SaveChangesAsync();
    }

    // ────────────────────────────────────────────────────────────────────────
    // Env Var Override Loading Tests
    // ────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "Constructor loads env var overrides from configuration")]
    public async Task Constructor_LoadsEnvVarOverrides()
    {
        // Arrange
        _db = CreateInMemoryDb();
        await SeedTogglesAsync(_db);

        _config = CreateConfig(new Dictionary<string, string?>
        {
            ["FISHTANK_TOGGLE_NETWORK_ACTIVITY"] = "false",
            ["FISHTANK_TOGGLE_RECORD_MODE"] = "true"
        });

        // Act
        var service = new FeatureToggleService(_db, _mockHubContext, _config);
        var result = await service.GetAllTogglesAsync();

        // Assert
        result.Should().HaveCount(3);

        var networkActivity = result.First(t => t.Name == "network_activity");
        networkActivity.Enabled.Should().BeFalse("env var override should apply");
        networkActivity.EnvVarOverride.Should().Be(false);

        var recordMode = result.First(t => t.Name == "record_mode");
        recordMode.Enabled.Should().BeTrue("env var override should apply");
        recordMode.EnvVarOverride.Should().Be(true);
    }

    [Fact(DisplayName = "Constructor ignores malformed env var values")]
    public async Task Constructor_IgnoresMalformedEnvVarValues()
    {
        // Arrange
        _db = CreateInMemoryDb();
        await SeedTogglesAsync(_db);

        _config = CreateConfig(new Dictionary<string, string?>
        {
            ["FISHTANK_TOGGLE_NETWORK_ACTIVITY"] = "not-a-boolean",
            ["FISHTANK_TOGGLE_MAPPINGS_EDITOR"] = ""
        });

        // Act
        var service = new FeatureToggleService(_db, _mockHubContext, _config);
        var result = await service.GetAllTogglesAsync();

        // Assert
        var networkActivity = result.First(t => t.Name == "network_activity");
        networkActivity.Enabled.Should().BeTrue("malformed env var should be ignored");
        networkActivity.EnvVarOverride.Should().BeNull();

        var mappingsEditor = result.First(t => t.Name == "mappings_editor");
        mappingsEditor.Enabled.Should().BeTrue("empty env var should be ignored");
        mappingsEditor.EnvVarOverride.Should().BeNull();
    }

    [Fact(DisplayName = "Constructor handles case-insensitive toggle names in env vars")]
    public async Task Constructor_HandlesCaseInsensitiveToggleNames()
    {
        // Arrange
        _db = CreateInMemoryDb();
        await SeedTogglesAsync(_db);

        // Mix of upper and lower case in env var keys
        _config = CreateConfig(new Dictionary<string, string?>
        {
            ["FISHTANK_TOGGLE_network_activity"] = "false",  // lowercase name
            ["FISHTANK_TOGGLE_MAPPINGS_EDITOR"] = "false"     // uppercase name
        });

        // Act
        var service = new FeatureToggleService(_db, _mockHubContext, _config);
        var result = await service.GetAllTogglesAsync();

        // Assert
        var networkActivity = result.First(t => t.Name == "network_activity");
        networkActivity.Enabled.Should().BeFalse("case-insensitive match should work");
        networkActivity.EnvVarOverride.Should().Be(false);

        var mappingsEditor = result.First(t => t.Name == "mappings_editor");
        mappingsEditor.Enabled.Should().BeFalse("case-insensitive match should work");
        mappingsEditor.EnvVarOverride.Should().Be(false);
    }

    // ────────────────────────────────────────────────────────────────────────
    // GetAllTogglesAsync Tests
    // ────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "GetAllTogglesAsync returns all toggles ordered by DisplayName")]
    public async Task GetAllTogglesAsync_ReturnsTogglesOrderedByDisplayName()
    {
        // Arrange
        _db = CreateInMemoryDb();
        await SeedTogglesAsync(_db);
        _config = CreateConfig();

        var service = new FeatureToggleService(_db, _mockHubContext, _config);

        // Act
        var result = await service.GetAllTogglesAsync();

        // Assert
        result.Should().HaveCount(3);
        result.Select(t => t.DisplayName).Should().BeInAscendingOrder(
            "toggles should be ordered alphabetically by DisplayName");

        // Verify order: Mappings Editor < Network Activity < Record Mode
        result[0].DisplayName.Should().Be("Mappings Editor");
        result[1].DisplayName.Should().Be("Network Activity");
        result[2].DisplayName.Should().Be("Record Mode");
    }

    [Fact(DisplayName = "GetAllTogglesAsync applies env var override precedence")]
    public async Task GetAllTogglesAsync_AppliesEnvVarOverridePrecedence()
    {
        // Arrange
        _db = CreateInMemoryDb();
        await SeedTogglesAsync(_db);

        // DB has network_activity ENABLED, but env var overrides to DISABLED
        _config = CreateConfig(new Dictionary<string, string?>
        {
            ["FISHTANK_TOGGLE_NETWORK_ACTIVITY"] = "false"
        });

        var service = new FeatureToggleService(_db, _mockHubContext, _config);

        // Act
        var result = await service.GetAllTogglesAsync();

        // Assert
        var networkActivity = result.First(t => t.Name == "network_activity");
        networkActivity.Enabled.Should().BeFalse("env var override takes precedence over DB value");
        networkActivity.EnvVarOverride.Should().Be(false);

        var mappingsEditor = result.First(t => t.Name == "mappings_editor");
        mappingsEditor.Enabled.Should().BeTrue("no override, DB value should be used");
        mappingsEditor.EnvVarOverride.Should().BeNull();
    }

    [Fact(DisplayName = "GetAllTogglesAsync returns empty list when no toggles exist")]
    public async Task GetAllTogglesAsync_ReturnsEmptyListWhenNoToggles()
    {
        // Arrange
        _db = CreateInMemoryDb();
        _config = CreateConfig();

        var service = new FeatureToggleService(_db, _mockHubContext, _config);

        // Act
        var result = await service.GetAllTogglesAsync();

        // Assert
        result.Should().BeEmpty();
    }

    [Fact(DisplayName = "GetAllTogglesAsync includes UpdatedAt timestamp")]
    public async Task GetAllTogglesAsync_IncludesUpdatedAtTimestamp()
    {
        // Arrange
        _db = CreateInMemoryDb();
        var expectedTime = DateTimeOffset.UtcNow.AddMinutes(-30);
        _db.FeatureToggles.Add(new FeatureToggle
        {
            Id = Guid.NewGuid(),
            Name = "test_toggle",
            DisplayName = "Test Toggle",
            Description = "Test description",
            Enabled = true,
            UpdatedAt = expectedTime
        });
        await _db.SaveChangesAsync();

        _config = CreateConfig();
        var service = new FeatureToggleService(_db, _mockHubContext, _config);

        // Act
        var result = await service.GetAllTogglesAsync();

        // Assert
        result.Should().ContainSingle();
        result[0].UpdatedAt.Should().BeCloseTo(expectedTime, TimeSpan.FromSeconds(1));
    }

    // ────────────────────────────────────────────────────────────────────────
    // SetToggleAsync Tests
    // ────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "SetToggleAsync updates toggle state and persists to DB")]
    public async Task SetToggleAsync_UpdatesStateAndPersists()
    {
        // Arrange
        _db = CreateInMemoryDb();
        await SeedTogglesAsync(_db);
        _config = CreateConfig();

        var service = new FeatureToggleService(_db, _mockHubContext, _config);

        // Act
        var result = await service.SetToggleAsync("network_activity", false);

        // Assert
        result.Name.Should().Be("network_activity");
        result.Enabled.Should().BeFalse();
        result.EnvVarOverride.Should().BeNull();

        // Verify DB persistence
        var dbToggle = await _db.FeatureToggles.FirstAsync(t => t.Name == "network_activity");
        dbToggle.Enabled.Should().BeFalse("state should be persisted to DB");
    }

    [Fact(DisplayName = "SetToggleAsync updates UpdatedAt timestamp")]
    public async Task SetToggleAsync_UpdatesTimestamp()
    {
        // Arrange
        _db = CreateInMemoryDb();
        await SeedTogglesAsync(_db);
        _config = CreateConfig();

        var service = new FeatureToggleService(_db, _mockHubContext, _config);
        var beforeUpdate = DateTimeOffset.UtcNow;

        // Act
        var result = await service.SetToggleAsync("network_activity", false);

        // Assert
        result.UpdatedAt.Should().BeOnOrAfter(beforeUpdate);
        result.UpdatedAt.Should().BeCloseTo(DateTimeOffset.UtcNow, TimeSpan.FromSeconds(2));
    }

    [Fact(DisplayName = "SetToggleAsync broadcasts FeatureToggleChanged via SignalR")]
    public async Task SetToggleAsync_BroadcastsSignalREvent()
    {
        // Arrange
        _db = CreateInMemoryDb();
        await SeedTogglesAsync(_db);
        _config = CreateConfig();

        var service = new FeatureToggleService(_db, _mockHubContext, _config);

        // Act
        await service.SetToggleAsync("network_activity", false);

        // Assert
        await _mockClientProxy.Received(1).SendCoreAsync(
            "FeatureToggleChanged",
            Arg.Is<object?[]>(arr =>
                arr.Length == 1 &&
                arr[0] != null &&
                arr[0].GetType().GetProperty("name")!.GetValue(arr[0])!.Equals("network_activity") &&
                arr[0].GetType().GetProperty("enabled")!.GetValue(arr[0])!.Equals(false)),
            Arg.Any<CancellationToken>());
    }

    [Fact(DisplayName = "SetToggleAsync throws ConflictException for env-var-locked toggle")]
    public async Task SetToggleAsync_ThrowsConflictForEnvLocked()
    {
        // Arrange
        _db = CreateInMemoryDb();
        await SeedTogglesAsync(_db);

        _config = CreateConfig(new Dictionary<string, string?>
        {
            ["FISHTANK_TOGGLE_NETWORK_ACTIVITY"] = "true"  // Locked by env var
        });

        var service = new FeatureToggleService(_db, _mockHubContext, _config);

        // Act
        var act = async () => await service.SetToggleAsync("network_activity", false);

        // Assert
        await act.Should().ThrowAsync<ConflictException>()
            .Where(e => e.ErrorCode == "ADMIN_TOGGLE_ENV_LOCKED")
            .Where(e => e.Message.Contains("locked by environment variable"));

        // Verify no DB changes were made
        var dbToggle = await _db.FeatureToggles.FirstAsync(t => t.Name == "network_activity");
        dbToggle.Enabled.Should().BeTrue("DB state should not change for env-locked toggle");
    }

    [Fact(DisplayName = "SetToggleAsync throws NotFoundException for unknown toggle")]
    public async Task SetToggleAsync_ThrowsNotFoundForUnknownToggle()
    {
        // Arrange
        _db = CreateInMemoryDb();
        await SeedTogglesAsync(_db);
        _config = CreateConfig();

        var service = new FeatureToggleService(_db, _mockHubContext, _config);

        // Act
        var act = async () => await service.SetToggleAsync("unknown_toggle", true);

        // Assert
        await act.Should().ThrowAsync<NotFoundException>()
            .Where(e => e.ErrorCode == "ADMIN_TOGGLE_NOT_FOUND")
            .Where(e => e.Message.Contains("unknown_toggle"));
    }

    [Fact(DisplayName = "SetToggleAsync does not broadcast SignalR when toggle not found")]
    public async Task SetToggleAsync_DoesNotBroadcastWhenNotFound()
    {
        // Arrange
        _db = CreateInMemoryDb();
        await SeedTogglesAsync(_db);
        _config = CreateConfig();

        var service = new FeatureToggleService(_db, _mockHubContext, _config);

        // Act
        try
        {
            await service.SetToggleAsync("unknown_toggle", true);
        }
        catch (NotFoundException)
        {
            // Expected
        }

        // Assert
        await _mockClientProxy.DidNotReceive().SendCoreAsync(
            Arg.Any<string>(),
            Arg.Any<object?[]>(),
            Arg.Any<CancellationToken>());
    }

    [Fact(DisplayName = "SetToggleAsync does not broadcast SignalR when env-locked")]
    public async Task SetToggleAsync_DoesNotBroadcastWhenEnvLocked()
    {
        // Arrange
        _db = CreateInMemoryDb();
        await SeedTogglesAsync(_db);

        _config = CreateConfig(new Dictionary<string, string?>
        {
            ["FISHTANK_TOGGLE_NETWORK_ACTIVITY"] = "true"
        });

        var service = new FeatureToggleService(_db, _mockHubContext, _config);

        // Act
        try
        {
            await service.SetToggleAsync("network_activity", false);
        }
        catch (ConflictException)
        {
            // Expected
        }

        // Assert
        await _mockClientProxy.DidNotReceive().SendCoreAsync(
            Arg.Any<string>(),
            Arg.Any<object?[]>(),
            Arg.Any<CancellationToken>());
    }

    [Fact(DisplayName = "SetToggleAsync handles toggle name with mixed case")]
    public async Task SetToggleAsync_HandlesMixedCaseToggleName()
    {
        // Arrange
        _db = CreateInMemoryDb();
        await SeedTogglesAsync(_db);
        _config = CreateConfig();

        var service = new FeatureToggleService(_db, _mockHubContext, _config);

        // Act - use mixed case name that doesn't match DB exactly
        var result = await service.SetToggleAsync("network_activity", false);

        // Assert
        result.Name.Should().Be("network_activity");
        result.Enabled.Should().BeFalse();
    }

    [Fact(DisplayName = "SetToggleAsync allows enabling a disabled toggle")]
    public async Task SetToggleAsync_AllowsEnablingDisabledToggle()
    {
        // Arrange
        _db = CreateInMemoryDb();
        await SeedTogglesAsync(_db);
        _config = CreateConfig();

        var service = new FeatureToggleService(_db, _mockHubContext, _config);

        // Act
        var result = await service.SetToggleAsync("record_mode", true);

        // Assert
        result.Name.Should().Be("record_mode");
        result.Enabled.Should().BeTrue();

        var dbToggle = await _db.FeatureToggles.FirstAsync(t => t.Name == "record_mode");
        dbToggle.Enabled.Should().BeTrue();
    }

    // ────────────────────────────────────────────────────────────────────────
    // Cancellation Token Tests
    // ────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "GetAllTogglesAsync respects cancellation token")]
    public async Task GetAllTogglesAsync_RespectsCancellationToken()
    {
        // Arrange
        _db = CreateInMemoryDb();
        await SeedTogglesAsync(_db);
        _config = CreateConfig();

        var service = new FeatureToggleService(_db, _mockHubContext, _config);
        var cts = new CancellationTokenSource();
        cts.Cancel();

        // Act
        var act = async () => await service.GetAllTogglesAsync(cts.Token);

        // Assert
        await act.Should().ThrowAsync<OperationCanceledException>();
    }

    [Fact(DisplayName = "SetToggleAsync respects cancellation token")]
    public async Task SetToggleAsync_RespectsCancellationToken()
    {
        // Arrange
        _db = CreateInMemoryDb();
        await SeedTogglesAsync(_db);
        _config = CreateConfig();

        var service = new FeatureToggleService(_db, _mockHubContext, _config);
        var cts = new CancellationTokenSource();
        cts.Cancel();

        // Act
        var act = async () => await service.SetToggleAsync("network_activity", false, cts.Token);

        // Assert
        await act.Should().ThrowAsync<OperationCanceledException>();
    }
}
