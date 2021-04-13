using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Threading.Tasks;
using MonitoringConsole.Models;
using Amazon;
using Amazon.WorkSpaces;
using Amazon.WorkSpaces.Model;
using Amazon.WorkDocs;
using Amazon.WorkDocs.Model;

namespace MonitoringConsole.Pages
{

    public class IndexModel : PageModel
    {
        private readonly AppSettings _settings;
        public List<WorkspaceBundle> Bundles { get; set; }
        public HashSet<string> Usernames { get; set; }


        private readonly ILogger<IndexModel> _logger;
        private AmazonWorkSpacesClient workspaceClient;
        private AmazonWorkDocsClient workdocsClient;

        public string DirectoryId { get; set; }


        public IndexModel(ILogger<IndexModel> logger, AppSettings settings)
        {
            _logger = logger;
            _settings = settings;
            workspaceClient = new AmazonWorkSpacesClient(_settings.AWSAccessKeyID, _settings.AWSSecretAccessKey, RegionEndpoint.GetBySystemName(_settings.AWSRegion));
            workdocsClient = new AmazonWorkDocsClient(_settings.AWSAccessKeyID, _settings.AWSSecretAccessKey, RegionEndpoint.GetBySystemName(_settings.AWSRegion));
            DirectoryId = _settings.AWSDirectoryID;
            Bundles = new List<WorkspaceBundle>();
            Usernames = new HashSet<string>();
        }

        public async Task<IActionResult> OnGetAsync()
        {
            var describeBundlesResponse = await workspaceClient.DescribeWorkspaceBundlesAsync();
            if(describeBundlesResponse != null)
                Bundles = describeBundlesResponse.Bundles;

            var describeUsersRequest = new DescribeUsersRequest();
            describeUsersRequest.OrganizationId = DirectoryId;

            var describeUsersResponse = await workdocsClient.DescribeUsersAsync(describeUsersRequest);
            foreach (var user in describeUsersResponse.Users)
                Usernames.Add(user.Username);


            var describeWorkspacesResponse = await workspaceClient.DescribeWorkspacesAsync();
            foreach (var ws in describeWorkspacesResponse.Workspaces)
                if (Usernames.Contains(ws.UserName))
                    Usernames.Remove(ws.UserName);

            return Page();
        }

    }
}
