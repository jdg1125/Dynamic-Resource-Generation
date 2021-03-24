using Amazon.WorkDocs;
using Amazon.WorkDocs.Model;
using Amazon.WorkSpaces;
using Amazon.WorkSpaces.Model;
using MonitoringConsole.Class_Library;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace MonitoringConsole.Services
{
    public class AWSService : IAWSService
    {
        private AmazonWorkSpacesClient _wSpaceClient;
        private AmazonWorkDocsClient _wDocsClient;
        private static String _directoryId;

        public AWSService()
        {
            _wSpaceClient = new AmazonWorkSpacesClient();
            _wDocsClient = new AmazonWorkDocsClient();
        }
        public async Task<List<Workspace>> GetWorkspaces()
        {
            DescribeWorkspacesResponse response = await _wSpaceClient.DescribeWorkspacesAsync();
            return response.Workspaces;
        }
        public async Task<List<WorkspaceBundle>> GetBundles()
        {
            DescribeWorkspaceBundlesResponse response = await _wSpaceClient.DescribeWorkspaceBundlesAsync();
            return response.Bundles;
        }
        public async Task<List<WorkDocsUser>> GetUsers()
        {
            if (_directoryId == null)
            {
                DescribeWorkspaceDirectoriesResponse response = await _wSpaceClient.DescribeWorkspaceDirectoriesAsync();
                if (response.Directories.Count == 0)
                    return null;
                _directoryId = response.Directories[0].DirectoryId;
            }

            DescribeUsersRequest request = new DescribeUsersRequest();
            request.OrganizationId = _directoryId;   //fix this not to be hardcoded - use static variable
            DescribeUsersResponse userResponse = await _wDocsClient.DescribeUsersAsync(request);

            List<Workspace> wsResponse = await GetWorkspaces();

            HashSet<WorkDocsUser> myUsers = new HashSet<WorkDocsUser>();

            foreach (var ws in wsResponse)
            {
                myUsers.Add(new WorkDocsUser()
                {
                    HasWorkspace = true,
                    Username = ws.UserName
                });
            }

            foreach (var user in userResponse.Users)
            {
                myUsers.Add(new WorkDocsUser()
                {
                    HasWorkspace = false,
                    Username = user.Username
                });
            }

            return myUsers.ToList();
        }

        public async Task<Workspace> GetWorkspaceById(string id)
        {
            DescribeWorkspacesRequest request = new DescribeWorkspacesRequest();
            request.WorkspaceIds.Add(id);
            DescribeWorkspacesResponse response = await _wSpaceClient.DescribeWorkspacesAsync(request);

            if (response.Workspaces.Count > 0)
                return response.Workspaces[0];

            return null;
        }

        public async Task<List<FailedWorkspaceChangeRequest>> StopWorkspaces(WSTerminateRequest payload)
        {
            StopWorkspacesRequest request = new StopWorkspacesRequest();
            foreach (var ws in payload.Workspaces)
            {
                StopRequest sReq = new StopRequest()
                {
                    WorkspaceId = ws
                };
                request.StopWorkspaceRequests.Add(sReq);
            }

            StopWorkspacesResponse response = await _wSpaceClient.StopWorkspacesAsync(request);
            return response.FailedRequests;
        }

    }
}
