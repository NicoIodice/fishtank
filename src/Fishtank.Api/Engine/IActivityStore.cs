using Fishtank.Api.Models;

namespace Fishtank.Api.Engine;

public interface IActivityStore
{
    void Add(Guid serviceId, ActivityRow row);
    IReadOnlyList<ActivityRow> GetAll(Guid? serviceId = null);
    void Clear();
}
