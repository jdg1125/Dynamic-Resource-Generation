using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace MonitoringConsole.Class_Library
{
    public class Attack
    {
        [BsonId]
        public ObjectId _id { get; set; }
        public string IdAsString { get; set; }

        public DateTime Start_Time { get; set; }
        public DateTime End_Time { get; set; }

        public decimal CostScore { get; set; }

        public List<string> Workspaces_Involved { get; set; }

        public double Threat_Level { get; set; }

        public ObjectId AttackerId { get; set; }
        public string BundleId { get; set; }

        public Attack()
        {
            Workspaces_Involved = new List<string>();
        }
    }
}
