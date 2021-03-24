using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Diagnostics;
using System.IO;
using System.Text;
using MonitoringConsole.Class_Library;
using MonitoringConsole.Services;
using Amazon.WorkSpaces.Model;

// For more information on enabling Web API for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

namespace MonitoringConsole.api
{
    [Route("api/[controller]")]
    [ApiController]
    public class TerminateWorkspaceController : ControllerBase
    {
        private readonly IAWSService _awsConnector;
        public TerminateWorkspaceController(IAWSService awsConnector)
        {
            _awsConnector = awsConnector;
        }

        // POST api/<TerminateWorkspaceController>
        [HttpPost]
        public async Task<List<FailedWorkspaceChangeRequest>> Post([FromBody] WSTerminateRequest req)
        {
            return await _awsConnector.StopWorkspaces(req);
        }

    }
}
