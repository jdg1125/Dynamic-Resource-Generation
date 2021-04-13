using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Amazon.WorkSpaces.Model;
using Microsoft.AspNetCore.Mvc;
using MonitoringConsole.Models;
using MonitoringConsole.Services;

// For more information on enabling Web API for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

namespace MonitoringConsole.api
{
    [Route("api/[controller]")]
    public class ResourcesController : Controller
    {
        private readonly IAWSService _awsConnector;

        public ResourcesController(IAWSService awsConnector)
        {
            _awsConnector = awsConnector;
        }

        // GET api/<ResourcesController>/users
        [Route("users")]
        [HttpGet]
        public async Task<List<WorkDocsUser>> GetUsers()
        {
            return await _awsConnector.GetUsers();
        }

        // GET api/<ResourcesController>/workspace
        [Route("allWorkspaces")]
        [HttpGet]
        public async Task<List<Workspace>> GetAllWorkspaces()
        {
            return await _awsConnector.GetWorkspaces();
        }

        [Route("availWorkspaces")]
        [HttpGet]
        public async Task<List<Workspace>> GetAvailWorkspaces()
        {
            List<Workspace> workspaces = await _awsConnector.GetWorkspaces();
            IQueryable<Workspace> myQuery = workspaces.AsQueryable<Workspace>();
            return myQuery.Where(ws => ws.State.Value == "AVAILABLE").ToList();
        }

        [Route("userById/{id?}")]
        [HttpGet]
        public async Task<WorkDocsUser> GetUserById(string id)
        {
            Workspace ws = await _awsConnector.GetWorkspaceById(id);

            if (ws != null)
            {
                return new WorkDocsUser()
                {
                    Username = ws.UserName,
                    HasWorkspace = true
                };
            }

            return null;
        }

        [Route("workspaceById/{id?}")]
        [HttpGet]
        public async Task<Workspace> GetWorkspaceById(string id)
        {
            return await _awsConnector.GetWorkspaceById(id);

        }

        // GET api/<ResourcesController>/bundles
        [Route("bundles")]
        [HttpGet]
        public async Task<List<WorkspaceBundle>> GetBundles()
        {
            return await _awsConnector.GetBundles();
        }

        // GET api/<ResourcesController>/bundles
        [Route("getDeployable")]
        [HttpGet]
        public async Task<DeploymentEntry> GetDeployTableInfo()
        {
            List<WorkspaceBundle> bundles = await _awsConnector.GetBundles();
            List<Workspace> workspaces = await _awsConnector.GetWorkspaces();

            DeploymentEntry deployInfo = new DeploymentEntry();
            deployInfo.Workspaces = workspaces;

            foreach (var b in bundles)
            {
                //Bundle bundle = new Bundle(b.BundleId, b.Name);
                if (!deployInfo.Bundles.ContainsKey(b.BundleId))
                    deployInfo.Bundles.Add(b.BundleId, b.Name);
            }

            return deployInfo;
        }

        // POST api/<ResourcesController>
        [Route("Create")]
        [HttpPost]
        public async Task<Workspace> Post([FromBody] WSCreateRequest request)
        {
            CreateWorkspacesResponse response = await _awsConnector.CreateWorkspace(request);
            if (response != null && response.PendingRequests.Count > 0)
                return response.PendingRequests[0];

            return null;
        }

        // POST api/<ResourcesController>
        [Route("Start")]
        [HttpPost]
        public async Task<StartWorkspacesResponse> Post([FromBody] WSStartRequest request)
        {
            return await _awsConnector.StartWorkspaces(request);
        }

        // POST api/<ResourcesController>
        [Route("Terminate")]
        [HttpPost]
        public async Task<List<FailedWorkspaceChangeRequest>> Post([FromBody] WSTerminateRequest req)
        {
            return await _awsConnector.StopWorkspaces(req);
        }

    }
}
