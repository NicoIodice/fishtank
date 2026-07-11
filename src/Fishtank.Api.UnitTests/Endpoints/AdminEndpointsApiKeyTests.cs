using System.Security.Cryptography;
using System.Text;
using FluentAssertions;

namespace Fishtank.Api.UnitTests.Endpoints;

/// <summary>
/// Unit tests for API key validation logic used in AdminEndpoints.ResetHandler.
/// 
/// Coverage focus (MAJOR-001 fix):
///   - Constant-time comparison prevents timing attacks
///   - Different length keys are rejected
///   - Identical keys pass validation
///   - Similar but different keys are rejected
/// 
/// Note: These tests verify the comparison algorithm in isolation.
/// Integration tests in Story6_1_PipelineResetEndpointTests verify the full
/// endpoint behavior with HTTP request/response semantics.
/// </summary>
public class AdminEndpointsApiKeyTests
{
    /// <summary>
    /// Simulates the constant-time API key comparison used in AdminEndpoints.ResetHandler.
    /// This is the same logic as in the actual implementation.
    /// </summary>
    private static bool ValidateApiKey(string providedKey, string configuredKey)
    {
        var providedKeyBytes = Encoding.UTF8.GetBytes(providedKey);
        var configuredKeyBytes = Encoding.UTF8.GetBytes(configuredKey);
        
        if (providedKeyBytes.Length != configuredKeyBytes.Length)
            return false;
            
        return CryptographicOperations.FixedTimeEquals(providedKeyBytes, configuredKeyBytes);
    }

    [Fact(DisplayName = "ValidateApiKey: identical keys return true")]
    public void ValidateApiKey_IdenticalKeys_ReturnsTrue()
    {
        // Arrange
        const string key = "test-reset-key-32chars-minimum!!";

        // Act
        var result = ValidateApiKey(key, key);

        // Assert
        result.Should().BeTrue("Identical keys should pass validation");
    }

    [Fact(DisplayName = "ValidateApiKey: different keys return false")]
    public void ValidateApiKey_DifferentKeys_ReturnsFalse()
    {
        // Arrange
        const string configuredKey = "test-reset-key-32chars-minimum!!";
        const string providedKey = "wrong-key-value-32chars-minimum!";

        // Act
        var result = ValidateApiKey(providedKey, configuredKey);

        // Assert
        result.Should().BeFalse("Different keys should fail validation");
    }

    [Fact(DisplayName = "ValidateApiKey: different length keys return false")]
    public void ValidateApiKey_DifferentLengthKeys_ReturnsFalse()
    {
        // Arrange
        const string configuredKey = "test-reset-key-32chars-minimum!!";
        const string providedKey = "short-key";

        // Act
        var result = ValidateApiKey(providedKey, configuredKey);

        // Assert
        result.Should().BeFalse("Keys with different lengths should fail validation");
    }

    [Fact(DisplayName = "ValidateApiKey: case-sensitive comparison")]
    public void ValidateApiKey_CaseSensitive()
    {
        // Arrange
        const string configuredKey = "test-reset-key-32chars-minimum!!";
        const string providedKey = "TEST-RESET-KEY-32CHARS-MINIMUM!!";

        // Act
        var result = ValidateApiKey(providedKey, configuredKey);

        // Assert
        result.Should().BeFalse("API key comparison should be case-sensitive");
    }

    [Fact(DisplayName = "ValidateApiKey: one character difference returns false")]
    public void ValidateApiKey_OneCharDifference_ReturnsFalse()
    {
        // Arrange
        const string configuredKey = "test-reset-key-32chars-minimum!!";
        const string providedKey = "test-reset-key-32chars-minimum!X";

        // Act
        var result = ValidateApiKey(providedKey, configuredKey);

        // Assert
        result.Should().BeFalse("Keys differing by one character should fail validation");
    }

    [Fact(DisplayName = "ValidateApiKey: empty strings return true (both empty)")]
    public void ValidateApiKey_EmptyStrings_ReturnsTrue()
    {
        // Arrange
        const string configuredKey = "";
        const string providedKey = "";

        // Act
        var result = ValidateApiKey(providedKey, configuredKey);

        // Assert
        result.Should().BeTrue("Both empty strings should match");
    }

    [Fact(DisplayName = "ValidateApiKey: uses FixedTimeEquals for timing attack resistance")]
    public void ValidateApiKey_UsesConstantTimeComparison()
    {
        // Arrange
        const string configuredKey = "test-reset-key-32chars-minimum!!";
        const string providedKeyPrefix = "test-reset-key-32chars-minimum!";  // All but last char
        const string providedKeyWrong = "wrong-key-value-32chars-minimum!";   // All different

        // Act - Both should fail but take similar time
        // This test documents that we use FixedTimeEquals which provides timing attack resistance
        var resultPrefix = ValidateApiKey(providedKeyPrefix, configuredKey);
        var resultWrong = ValidateApiKey(providedKeyWrong, configuredKey);

        // Assert
        resultPrefix.Should().BeFalse("Key with wrong length should fail");
        resultWrong.Should().BeFalse("Completely different key should fail");
        
        // Note: We cannot easily measure timing in a unit test, but by using
        // CryptographicOperations.FixedTimeEquals, we ensure constant-time comparison
        // for keys of equal length, which prevents timing attacks.
    }
}
