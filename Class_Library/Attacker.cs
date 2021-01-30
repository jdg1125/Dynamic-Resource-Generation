using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MongoDB.Bson;

namespace MonitoringConsole.Class_Library
{
    public class Attacker
    {
        public ObjectId _id { get; set; }
        public List<IP> IPList { get; set; }
        public string Name { get; set; }
        public int PrevMaxThreatLevel { get; set; }        
        public List<Attack> Attacks { get; set; }

        public Attacker()
        {
            IPList = new List<IP>();
            Attacks = new List<Attack>();
        }

    }
}
