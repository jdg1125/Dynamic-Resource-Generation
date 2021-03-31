using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MonitoringConsole.Class_Library;
using Amazon.WorkSpaces.Model;
using Amazon.WorkSpaces;
using System.Runtime.Serialization;
using MonitoringConsole.Services;
// For more information on enabling Web API for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

namespace MonitoringConsole.api
{
    [Route("api/[controller]")]
    [ApiController]
    public class SetupWorkspaceController : ControllerBase
    {
        private IAWSService _awsConnector;
        public SetupWorkspaceController(IAWSService awsConnector)
        {
            _awsConnector = awsConnector;
        }

        // POST api/<SetupWorkspaceController>
        [HttpPost]
        public async Task<Workspace> Post([FromBody] WSCreateRequest request)
        {
            CreateWorkspacesResponse response = await _awsConnector.CreateWorkspace(request);
            if (response != null && response.PendingRequests.Count > 0)
                return response.PendingRequests[0];

            return null;
        }

    }

}
