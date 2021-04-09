using System.Collections.Generic;
using System.Threading.Tasks;
namespace MonitoringConsole.Services
{
    public interface IKeylogService
    {
        public Task<List<List<string>>> GetKeylogs();
    }
}
