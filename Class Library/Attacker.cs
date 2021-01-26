using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace MonitoringConsole.Class_Library
{
    public class Attacker
    {
        public string IP { get; set; }
        public string Name { get; set; }
        public string Location { get; set; }
        public int PrevEncounters { get; set; }

        public int PrevMaxThreatLevel { get; set; }
        public List<string> Activities { get; set; }


        public Attacker(string ip)
        {
            IP = ip;
        }

    }
}
