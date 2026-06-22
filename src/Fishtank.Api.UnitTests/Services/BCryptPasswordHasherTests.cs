using Fishtank.Api.Services;
using Fishtank.Api.UnitTests.Support;
using FluentAssertions;

namespace Fishtank.Api.UnitTests.Services;

public class BCryptPasswordHasherTests : UnitTestBase
{
    private readonly BCryptPasswordHasher _sut = new();

    [Fact]
    public void Hash_ReturnsNonEmptyString()
    {
        var result = _sut.Hash("strongpassword12");
        result.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public void Hash_ProducesBCryptFormat()
    {
        var result = _sut.Hash("strongpassword12");
        // BCrypt hashes start with $2a$ (or $2b$)
        result.Should().MatchRegex(@"^\$2[ab]\$");
    }

    [Fact]
    public void Hash_UsesWorkFactor12()
    {
        var result = _sut.Hash("strongpassword12");
        // BCrypt format: $2a$WW$... where WW is work factor
        result.Should().Contain("$12$");
    }

    [Fact]
    public void Hash_ReturnsDifferentHashEachCall()
    {
        var hash1 = _sut.Hash("samepassword1234");
        var hash2 = _sut.Hash("samepassword1234");
        // BCrypt generates different salts each time
        hash1.Should().NotBe(hash2);
    }

    [Fact]
    public void Verify_ReturnsTrueForMatchingPassword()
    {
        var hash = _sut.Hash("correctpassword12");
        _sut.Verify("correctpassword12", hash).Should().BeTrue();
    }

    [Fact]
    public void Verify_ReturnsFalseForWrongPassword()
    {
        var hash = _sut.Hash("correctpassword12");
        _sut.Verify("wrongpassword123", hash).Should().BeFalse();
    }

    [Fact]
    public void Verify_ReturnsFalseForInvalidHash()
    {
        _sut.Verify("anypassword12345", "$2a$12$invalid.hash.for.timing.safety.1234567890")
            .Should().BeFalse();
    }

    [Fact]
    public void Verify_ReturnsFalseForEmptyPassword()
    {
        var hash = _sut.Hash("realpassword12345");
        _sut.Verify("", hash).Should().BeFalse();
    }
}
