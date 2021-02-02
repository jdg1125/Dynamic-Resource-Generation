using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace MonitoringConsole.Class_Library
{
    public class Attacker
    {
        [BsonId]
        public ObjectId _id { get; set; }
        public string IdAsString { get; set; }
        public List<IP> IPList { get; set; }
        public string Name { get; set; }
        public double PrevMaxThreatLevel { get; set; }        
        public List<ObjectId> Attacks { get; set; }

        public Attacker()
        {
            IPList = new List<IP>();
            Attacks = new List<ObjectId>();
        }

    }
}
