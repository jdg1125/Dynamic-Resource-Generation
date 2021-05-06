using Amazon.WorkDocs;
using Amazon.WorkDocs.Model;
using Amazon.WorkSpaces;
using Amazon.WorkSpaces.Model;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MonitoringConsole.Models;
using Amazon;

namespace MonitoringConsole.Services
{
    public class AWSService : IAWSService
    {
        private AmazonWorkSpacesClient _workspaceClient;
        private AmazonWorkDocsClient _workdocsClient;
        private static String _directoryId;

        public AWSService(AppSettings settings)
        {
            _workspaceClient = new AmazonWorkSpacesClient(settings.AWSAccessKeyID, settings.AWSSecretAccessKey, RegionEndpoint.GetBySystemName(settings.AWSRegion)); 
            _workdocsClient = new AmazonWorkDocsClient(settings.AWSAccessKeyID, settings.AWSSecretAccessKey, RegionEndpoint.GetBySystemName(settings.AWSRegion));
        }
        public async Task<List<Workspace>> GetWorkspaces()
        {
            DescribeWorkspacesResponse response = await _workspaceClient.DescribeWorkspacesAsync();
            return response.Workspaces;
        }
        public async Task<List<WorkspaceBundle>> GetBundles()
        {
            DescribeWorkspaceBundlesResponse response = await _workspaceClient.DescribeWorkspaceBundlesAsync();
            return response.Bundles;
        }
        public async Task<List<WorkDocsUser>> GetUsers()
        {
            if (_directoryId == null)
            {
                DescribeWorkspaceDirectoriesResponse response = await _workspaceClient.DescribeWorkspaceDirectoriesAsync();
                if (response.Directories.Count == 0)
                    return null;
                _directoryId = response.Directories[0].DirectoryId;
            }

            DescribeUsersRequest request = new DescribeUsersRequest();
            request.OrganizationId = _directoryId;   //fix this not to be hardcoded - use static variable
            DescribeUsersResponse userResponse = await _workdocsClient.DescribeUsersAsync(request);

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
            DescribeWorkspacesResponse response = await _workspaceClient.DescribeWorkspacesAsync(request);

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

            StopWorkspacesResponse response = await _workspaceClient.StopWorkspacesAsync(request);
            return response.FailedRequests;
        }

        public async Task<CreateWorkspacesResponse> CreateWorkspace(WSCreateRequest payload)
        {
            CreateWorkspacesRequest createReq = new CreateWorkspacesRequest();

            int rootSize = 80;
            Int32.TryParse(payload.RootSize, out rootSize);
            int userSize = 50;
            Int32.TryParse(payload.UserSize, out userSize);
            int timeout = 1;
            Int32.TryParse(payload.Hours, out timeout);

            WorkspaceProperties wsProps = new WorkspaceProperties()
            {
                RootVolumeSizeGib = rootSize,
                RunningMode = new RunningMode(payload.RunMode),
                UserVolumeSizeGib = userSize,
            };

            if (payload.RunMode == "AUTO_STOP")
            {
                wsProps.RunningModeAutoStopTimeoutInMinutes = timeout * 60;
            }

            WorkspaceRequest wsReq = new WorkspaceRequest()
            {
                BundleId = payload.BundleId,
                DirectoryId = payload.DirectoryId,
                UserName = payload.UserName,
                WorkspaceProperties = wsProps
            };

            createReq.Workspaces.Add(wsReq);

            return await _workspaceClient.CreateWorkspacesAsync(createReq);
        }

        public async Task<StartWorkspacesResponse> StartWorkspaces(WSStartRequest payload)
        { 
            var startWorkspacesRequest = new StartWorkspacesRequest();
            startWorkspacesRequest.StartWorkspaceRequests = new List<StartRequest>();

            foreach (var item in payload.StartWorkspaceList)
            {
                var startRequest = new StartRequest();
                startRequest.WorkspaceId = item;
                startWorkspacesRequest.StartWorkspaceRequests.Add(startRequest);
            }

            return await _workspaceClient.StartWorkspacesAsync(startWorkspacesRequest);
        }

    }
}
