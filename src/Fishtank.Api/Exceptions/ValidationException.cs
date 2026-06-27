namespace Fishtank.Api.Exceptions;

public class ValidationException(string errorCode, string message)
    : FishtankException(errorCode, message)
{
    public int HttpStatusCode => 400;
}
