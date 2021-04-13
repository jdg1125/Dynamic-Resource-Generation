using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MongoDB.Bson;

namespace MonitoringConsole.Models
{
    public class SaveLogRequest
    {
        public Attack Attack { get; set; }
        public Attacker Attacker { get; set; }

        //public string Username { get; set; }
        //public string AttackerIP { get; set; }
        //public string WorkspaceId { get; set; }

        //public DateTime StartTime { get; set; }
        //public DateTime EndTime { get; set; }

        //public string AttackerId { get; set; }
        //public string AttackId { get; set; }

        //public double PrevMaxThreatLevel { get; set; }
        
    }
}
