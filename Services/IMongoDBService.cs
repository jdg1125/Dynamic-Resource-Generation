using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MonitoringConsole.Models;
using MongoDB.Bson;

namespace MonitoringConsole.Services
{
    public interface IMongoDBService
    {
        public Task<ObjectId> AddAttacker(Attacker attacker);

        public Task<Attacker> GetAttacker(string address);

        //public Task UpdateAttacker(ObjectId id, double threatLevel);

        public Task UpdateAttacker(SaveLogRequest request);

        public Task<ObjectId> AddAttack(Attack attack);

        public Task UpdateAttack(SaveLogRequest request);

        public Task LinkAttackToAttacker(SaveLogRequest request);
       // public Task<List<Attack>> GetAttackByBundleId(string bundleId);

        public Task<List<Attack>> GetAllAttacks();
    }
}
