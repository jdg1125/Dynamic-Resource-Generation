using System;
using System.Collections.Generic;
namespace MonitoringConsole.Models
{
    public class Keylog
    {
        public Keylog()
        {
        }

        public SaveLogRequest AttackData { get; set; }
        public List<string> Commands { get; set; }
    }
}
