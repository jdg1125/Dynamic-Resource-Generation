using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MongoDB.Driver;
using MongoDB.Bson;
using MonitoringConsole.Models;
using MongoDB.Bson.Serialization;

namespace MonitoringConsole.Services
{
    public class MongoDBService : IMongoDBService
    {
        private readonly MongoClient _client;
        private readonly IMongoDatabase _db;

        public MongoDBService(AppSettings settings)
        {
            _client = new MongoClient(settings.DBConnectionString);
            _db = _client.GetDatabase("DRG_Test");   //Change back to DRG_DB; make sure to change connection string as well 
        }

        public async Task<ObjectId> AddAttacker(Attacker attacker)
        {
            IMongoCollection<BsonDocument> collection = _db.GetCollection<BsonDocument>("Attacker");
            BsonDocument value = BsonDocument.Parse(attacker.ToJson());
            await collection.InsertOneAsync(value);

            return (ObjectId)value.GetValue(0);
        }

        public async Task<Attacker> GetAttacker(string address)
        {
            IMongoCollection<BsonDocument> collection = _db.GetCollection<BsonDocument>("Attacker");

            Attacker result = null;

            var filter = Builders<BsonDocument>.Filter.ElemMatch<BsonValue>(
                "IPList", new BsonDocument { { "Address", address } }
                );

            var resultList = await (await collection.FindAsync(filter)).ToListAsync();

            if (resultList != null && resultList.Count >= 1)
            {
                result = BsonSerializer.Deserialize<Attacker>(resultList[0]);
            }
            return result;
        }

        public async Task UpdateAttacker(SaveLogRequest request)  //List of attacks get updated by LinkAttackToAttacker
        {
            IMongoCollection<BsonDocument> collection = _db.GetCollection<BsonDocument>("Attacker");
            var filter = Builders<BsonDocument>.Filter.Eq("_id", new ObjectId(request.Attacker.Id));
            var update = Builders<BsonDocument>.Update.Set("MaxThreatLevel", request.Attacker.MaxThreatLevel);
            await collection.UpdateOneAsync(filter, update);
        }

        public async Task<ObjectId> AddAttack(Attack attack)
        {
            IMongoCollection<BsonDocument> collection = _db.GetCollection<BsonDocument>("Attack");
            BsonDocument value = BsonDocument.Parse(attack.ToJson());
            await collection.InsertOneAsync(value);

            return (ObjectId)value.GetValue(0);
        }

        public async Task UpdateAttack(SaveLogRequest request)
        {
            IMongoCollection<BsonDocument> collection = _db.GetCollection<BsonDocument>("Attack");
            var filter = Builders<BsonDocument>.Filter.Eq("_id", new ObjectId(request.Attack.Id));
            var update = Builders<BsonDocument>.Update.Set("WorkspacesInvolved", request.Attack.WorkspacesInvolved)
            .Set("ThreatLevel", request.Attack.ThreatLevel);
            var result = await collection.UpdateOneAsync(filter, update);
        }

        public async Task LinkAttackToAttacker(SaveLogRequest request)
        {
            IMongoCollection<BsonDocument> collection = _db.GetCollection<BsonDocument>("Attacker");
            var filter = Builders<BsonDocument>.Filter.Eq("_id", new ObjectId(request.Attacker.Id));
            var update = Builders<BsonDocument>.Update.Push("Attacks", new ObjectId(request.Attack.Id));
            await collection.UpdateOneAsync(filter, update);
        }

        //public async Task<List<Attack>> GetAttackByBundleId(string bundleId)
        //{
        //    IMongoCollection<BsonDocument> collection = _db.GetCollection<BsonDocument>("Attack");

        //    var filter = Builders<BsonDocument>.Filter.Eq("BundleId", bundleId);

        //    var resultList = await (await collection.FindAsync(filter)).ToListAsync();
        //    List<Attack> attacks = new List<Attack>();

        //    if (resultList != null && resultList.Count >= 1)
        //    {
        //        foreach (var result in resultList)
        //        {
        //            Attack att = BsonSerializer.Deserialize<Attack>(result);
        //            attacks.Add(att);
        //        }
        //    }
        //    return attacks;
        //}

        public async Task<List<Attack>> GetAllAttacks()
        {
            IMongoCollection<BsonDocument> collection = _db.GetCollection<BsonDocument>("Attack");
            var resultList = await collection.Find(Builders<BsonDocument>.Filter.Empty).ToListAsync();
            List<Attack> attacks = new List<Attack>();

            if (resultList != null && resultList.Count >= 1)
            {
                foreach (var result in resultList)
                {
                    Attack att = BsonSerializer.Deserialize<Attack>(result);
                    attacks.Add(att);
                }
            }
            return attacks;
        }

    }
}
