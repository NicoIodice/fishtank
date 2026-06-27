namespace Fishtank.Api.Services;

public interface IHeaderRedactionService
{
    Dictionary<string, string> Redact(Dictionary<string, string> headers);
}
