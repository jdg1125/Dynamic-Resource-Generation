using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using Newtonsoft.Json;

namespace MonitoringConsole.Models
{
    public class Attack
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        [JsonProperty("id")]
        public string Id { get; set; }

        public double ThreatLevel { get; set; }

        [BsonRepresentation(BsonType.ObjectId)]
        [JsonProperty("attackerId")]
        public string AttackerId { get; set; }

        public List<WorkspaceResource> WorkspacesInvolved { get; set; }
    }
}
