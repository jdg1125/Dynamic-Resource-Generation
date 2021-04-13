using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Amazon.WorkSpaces.Model;
using MonitoringConsole.Models;

namespace MonitoringConsole.Services
{
    public interface IAWSService
    {
        public Task<List<WorkspaceBundle>> GetBundles();
        public Task<List<Workspace>> GetWorkspaces();

        public Task<List<WorkDocsUser>> GetUsers();

        public Task<Workspace> GetWorkspaceById(string id);

        public Task<List<FailedWorkspaceChangeRequest>> StopWorkspaces(WSTerminateRequest payload);

        public Task<CreateWorkspacesResponse> CreateWorkspace(WSCreateRequest payload);

        public Task<StartWorkspacesResponse> StartWorkspaces(WSStartRequest payload);
    }
}
