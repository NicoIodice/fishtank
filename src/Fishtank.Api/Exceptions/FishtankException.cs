namespace Fishtank.Api.Exceptions;

public abstract class FishtankException(string errorCode, string message)
    : Exception(message)
{
    public string ErrorCode { get; } = errorCode;
}
