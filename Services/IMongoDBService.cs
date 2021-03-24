using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MonitoringConsole.Class_Library;
using MongoDB.Bson;

namespace MonitoringConsole.Services
{
    public interface IMongoDBService
    {
        public Task<ObjectId> AddAttacker(Attacker attacker);

        public Task<Attacker> GetAttacker(string address);

        public Task UpdateAttacker(ObjectId id, double threatLevel);

        public Task<ObjectId> AddAttack(Attack attack);

        public Task UpdateAttack(State attacklog);

        public Task LinkAttack(State attacklog);
        public Task<List<Attack>> GetAttackByBundleId(string bundleId);
    }
}
