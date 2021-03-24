using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MonitoringConsole.Services;
using MonitoringConsole.Class_Library;
using Amazon.WorkSpaces.Model;

// For more information on enabling Web API for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

namespace MonitoringConsole.api
{
    [Route("api/[controller]")]
    [ApiController]
    public class DescribeResourcesController : ControllerBase
    {
        private readonly IAWSService _awsConnector;

        public DescribeResourcesController(IAWSService awsConnector)
        {
            _awsConnector = awsConnector;
        }

        // GET api/<DescribeResourcesController>/users
        [Route("users")]
        [HttpGet]
        public async Task<List<WorkDocsUser>> GetUsers()
        {
            return await _awsConnector.GetUsers();
        }

        // GET api/<DescribeResourcesController>/workspace
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

        // GET api/<DescribeResourcesController>/bundles
        [Route("bundles")]
        [HttpGet]
        public async Task<List<WorkspaceBundle>> GetBundles()
        {
            return await _awsConnector.GetBundles();
        }

        // GET api/<DescribeResourcesController>/bundles
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
    }
}
