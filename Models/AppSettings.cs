using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace MonitoringConsole.Models
{
    public class AppSettings
    {
        public string DBConnectionString { get; set; }
        public string Pop3Server { get; set; }
        public int Pop3Port { get; set; }
        public string Pop3Address { get; set; }
        public string Pop3Password { get; set; }
        public string AWSAccessKeyID { get; set; }
        public string AWSSecretAccessKey { get; set; }
        public string AWSRegion { get; set; }
        public string AWSOutputFormat { get; set; }
        public string AWSDirectoryID { get; set; }
        public string AWSSESFromAddress { get; set; }
    }
}
