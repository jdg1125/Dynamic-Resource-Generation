using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace MonitoringConsole.Models
{
    public class Bundle
    {
        //public Bundle(string bundleId, string name)
        //{
        //    BundleId = bundleId;
        //    Name = name;
        //}

        public string BundleId { get; set; }
        public string Name { get; set; }

        public string MeanAttackDuration { get; set; }
        public string MedianAttackDuration { get; set; }
    }
}
