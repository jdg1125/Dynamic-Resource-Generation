using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace MonitoringConsole.Models
{
    public class WSCreateRequest
    {
        public string BundleId { get; set; }

        public string RootSize { get; set; }
        public string UserSize { get; set; }
        public string RunMode { get; set; }
        public string Hours { get; set; }
        public string UserName { get; set;}
        public string DirectoryId { get; set; }
        
        
    }
}
