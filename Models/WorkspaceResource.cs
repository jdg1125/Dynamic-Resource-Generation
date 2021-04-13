using System;

namespace MonitoringConsole.Models
{
    public class WorkspaceResource
    {
        public string WorkspaceId { get; set; }
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public string BundleId { get; set; }
    }
}