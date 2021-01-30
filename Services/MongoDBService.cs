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

        private Dictionary<string, List<string>> _databasesAndCollections;

        public MongoDBService(DatabaseSettings settings)
        {
            _client = new MongoClient(settings.ConnectionString);
        }

        public async Task AddAttacker(Attacker attacker)
        {
            IMongoDatabase db = _client.GetDatabase("DRG_DB");
            IMongoCollection<BsonDocument> collection = db.GetCollection<BsonDocument>("Attacker");
            BsonDocument value = BsonDocument.Parse(attacker.ToJson());
            await collection.InsertOneAsync(value, null);
        }

        public async Task<Attacker> GetAttacker(string address)
        {
            IMongoDatabase db = _client.GetDatabase("DRG_DB");
            IMongoCollection<BsonDocument> collection = db.GetCollection<BsonDocument>("Attacker");

            //var filter = Builders<Attacker>.Filter.AnyEq(x => x.IPList, "mongodb");

            Attacker result = null; 

            await collection.Find(new BsonDocument()).ForEachAsync(
                doc =>
                {
                    Attacker tmp = BsonSerializer.Deserialize<Attacker>(doc);
                    if (tmp.IPList.Any(ip => ip.Address == address))
                    {
                        result = tmp;
                        return;
                    }
                    
                });

            return result;


        }
    }
}
