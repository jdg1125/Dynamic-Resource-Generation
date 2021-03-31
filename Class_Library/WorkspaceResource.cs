using System;

namespace MonitoringConsole.Class_Library
{
    public class WorkspaceResource
    {
        public string WorkspaceId { get; set; }
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public string BundleId { get; set; }
    }
}