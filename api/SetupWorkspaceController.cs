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
// For more information on enabling Web API for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

namespace MonitoringConsole.api
{
    [Route("api/[controller]")]
    [ApiController]
    public class SetupWorkspaceController : ControllerBase
    {
        // POST api/<SetupWorkspaceController>
        [HttpPost]
        public async Task<string> Post([FromBody] WorkspaceCreate value)
        {
            AmazonWorkSpacesClient client = new AmazonWorkSpacesClient();
            CreateWorkspacesRequest createReq = new CreateWorkspacesRequest();
            //createReq.Workspaces = new List<WorkspaceRequest>();

            int rootSize = 80;
            Int32.TryParse(value.RootSize, out rootSize);
            int userSize = 50;
            Int32.TryParse(value.UserSize, out userSize);
            int timeout = 1;
            Int32.TryParse(value.Hours, out timeout);

            WorkspaceProperties wsProps = new WorkspaceProperties()
            {
                RootVolumeSizeGib = rootSize,
                RunningMode = new RunningMode(value.RunMode),
                UserVolumeSizeGib = userSize,
            };

            if (value.RunMode == "AUTO_STOP")
            {
                wsProps.RunningModeAutoStopTimeoutInMinutes = timeout * 60;
            }

            WorkspaceRequest wsReq = new WorkspaceRequest()
            {
                BundleId = value.BundleId,
                DirectoryId = value.DirectoryId,
                UserName = value.UserName,
                WorkspaceProperties = wsProps
            };

            createReq.Workspaces.Add(wsReq);

            CreateWorkspacesResponse createResponse = await client.CreateWorkspacesAsync(createReq);


            string wsId = "Creation Failed";
            if (createResponse != null && createResponse.PendingRequests.Count > 0)
                wsId = createResponse.PendingRequests[0].WorkspaceId;

            return wsId;
        }



    }

}
