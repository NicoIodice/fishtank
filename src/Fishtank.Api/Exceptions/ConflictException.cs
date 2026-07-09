namespace Fishtank.Api.Exceptions;

public class ConflictException(string errorCode, string message)
    : FishtankException(errorCode, message)
{
    public int HttpStatusCode => 409;
}
