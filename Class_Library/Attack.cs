using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace MonitoringConsole.Class_Library
{
    public class Attack
    {
        public string ID { get; set; }
        public DateTime Start_Time { get; set; }
        public DateTime End_Time { get; set; }
        public int CostScore { get; set; }
        public List<string> Workspaces_Involved { get; set; }
        public string Threat_Level { get; set; }
        public Attacker Attacker { get; set; }
    }
}
