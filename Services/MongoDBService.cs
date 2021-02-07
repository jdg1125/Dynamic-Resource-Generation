using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MongoDB.Driver;
using MongoDB.Bson;
using MonitoringConsole.Class_Library;
using MongoDB.Bson.Serialization;

namespace MonitoringConsole.Services
{
    public class MongoDBService : IMongoDBService
    {
        private readonly MongoClient _client;
        private readonly IMongoDatabase _db;

        public MongoDBService(DatabaseSettings settings)
        {
            _client = new MongoClient(settings.ConnectionString);     
            _db = _client.GetDatabase("DRG_DB");

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
                "IPList", new BsonDocument { {"Address", address} }
                );

            var resultList = await (await collection.FindAsync(filter)).ToListAsync();

            if (resultList != null && resultList.Count >= 1)
            {
                result = BsonSerializer.Deserialize<Attacker>(resultList[0]);
                result.IdAsString = result._id.ToString();
            }
            return result;
        }
    
        public async Task UpdateAttacker(ObjectId id, double threatLevel)
        {
            IMongoCollection<BsonDocument> collection = _db.GetCollection<BsonDocument>("Attacker");
            var filter = Builders<BsonDocument>.Filter.Eq("_id", id);
            var update = Builders<BsonDocument>.Update.Set("PrevMaxThreatLevel", threatLevel);
            await collection.UpdateOneAsync(filter, update);
        }

        public async Task<ObjectId> AddAttack(Attack attack)
        {
            IMongoCollection<BsonDocument> collection = _db.GetCollection<BsonDocument>("Attack");
            BsonDocument value = BsonDocument.Parse(attack.ToJson());
            await collection.InsertOneAsync(value);

            return (ObjectId)value.GetValue(0);

        }

        public async Task UpdateAttack(State attacklog)
        {
            IMongoCollection<BsonDocument> collection = _db.GetCollection<BsonDocument>("Attack");
            var filter = Builders<BsonDocument>.Filter.Eq("_id", new ObjectId(attacklog.AttackId));
            var update = Builders<BsonDocument>.Update.Set("End_Time", attacklog.EndTime)
            .Set("Threat_Level", attacklog.PrevMaxThreatLevel);
            await collection.UpdateOneAsync(filter, update);
        }

        public async Task LinkAttack(State attacklog)
        {
            IMongoCollection<BsonDocument> collection = _db.GetCollection<BsonDocument>("Attacker");
            var filter = Builders<BsonDocument>.Filter.Eq("_id", new ObjectId(attacklog.AttackerId));
            var update = Builders<BsonDocument>.Update.Push("Attacks", new ObjectId(attacklog.AttackId));
            await collection.UpdateOneAsync(filter, update);

        }
    }
}
