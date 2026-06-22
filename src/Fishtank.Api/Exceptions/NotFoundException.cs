namespace Fishtank.Api.Exceptions;

public class NotFoundException(string errorCode, string message)
    : FishtankException(errorCode, message)
{
    public int HttpStatusCode => 404;
}
