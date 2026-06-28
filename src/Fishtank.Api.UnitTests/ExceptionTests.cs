using Fishtank.Api.Exceptions;
using FluentAssertions;

namespace Fishtank.Api.UnitTests;

/// <summary>
/// Unit tests for domain exception types — <see cref="NotFoundException"/> and
/// <see cref="ValidationException"/>. These ensure that HTTP status codes and
/// error codes surface correctly to endpoint exception handlers.
/// </summary>
public class ExceptionTests
{
    // ─── NotFoundException ────────────────────────────────────────────────────

    [Fact(DisplayName = "NotFoundException carries correct ErrorCode and Message")]
    public void NotFoundException_Ctor_SetsProperties()
    {
        var ex = new NotFoundException("SERVICE_NOT_FOUND", "Service '123' not found.");

        ex.ErrorCode.Should().Be("SERVICE_NOT_FOUND");
        ex.Message.Should().Be("Service '123' not found.");
        ex.HttpStatusCode.Should().Be(404);
    }

    [Fact(DisplayName = "NotFoundException is a FishtankException")]
    public void NotFoundException_InheritsFromFishtankException()
    {
        var ex = new NotFoundException("X", "y");

        ex.Should().BeAssignableTo<FishtankException>();
    }

    // ─── ValidationException ─────────────────────────────────────────────────

    [Fact(DisplayName = "ValidationException carries correct ErrorCode and Message")]
    public void ValidationException_Ctor_SetsProperties()
    {
        var ex = new ValidationException("SERVICE_PORT_OUT_OF_RANGE", "Port must be between 30100 and 30199.");

        ex.ErrorCode.Should().Be("SERVICE_PORT_OUT_OF_RANGE");
        ex.Message.Should().Be("Port must be between 30100 and 30199.");
        ex.HttpStatusCode.Should().Be(400);
    }

    [Fact(DisplayName = "ValidationException is a FishtankException")]
    public void ValidationException_InheritsFromFishtankException()
    {
        var ex = new ValidationException("X", "y");

        ex.Should().BeAssignableTo<FishtankException>();
    }

    // ─── FishtankException (via NotFoundException as concrete subtype) ────────

    [Fact(DisplayName = "FishtankException.ErrorCode is preserved from constructor")]
    public void FishtankException_ErrorCode_IsReadOnly()
    {
        FishtankException ex = new NotFoundException("MY_CODE", "msg");

        ex.ErrorCode.Should().Be("MY_CODE");
    }
}
