using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MonitoringConsole.Class_Library;

namespace MonitoringConsole.Services
{
    public interface IMongoDBService
    {
        public Task AddAttacker(Attacker attacker);

        public Task<Attacker> GetAttacker(string address);

    }
}
