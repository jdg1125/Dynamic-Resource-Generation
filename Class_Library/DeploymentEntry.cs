using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Amazon.WorkSpaces.Model;

namespace MonitoringConsole.Class_Library
{
    public class DeploymentEntry
    {
        public List<Workspace> Workspaces { get; set; }
        public Dictionary<string, string> Bundles { get; set; }

        public DeploymentEntry()
        {
            Bundles = new Dictionary<string, string>();
        }
    }
}
