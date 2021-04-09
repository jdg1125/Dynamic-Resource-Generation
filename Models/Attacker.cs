using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using MongoDB.Bson.Serialization.IdGenerators;
using Newtonsoft.Json;

namespace MonitoringConsole.Models
{
    public class Attacker
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        [JsonProperty("id")]
        public string Id { get; set; }
        public List<IP> IPList { get; set; }
        public string Name { get; set; }
        public double MaxThreatLevel { get; set; }

        [BsonRepresentation(BsonType.ObjectId)]
        [JsonProperty("attacks")]
        public List<string> Attacks { get; set; }

    }
}
