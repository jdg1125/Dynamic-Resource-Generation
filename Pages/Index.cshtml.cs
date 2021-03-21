using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Diagnostics;
using System.IO;
using MonitoringConsole.Class_Library;
using Amazon.WorkSpaces;
using Amazon.WorkSpaces.Model;
using Amazon.WorkDocs;
using Amazon.WorkDocs.Model;

namespace MonitoringConsole.Pages
{
    public class IndexModel : PageModel
    {
        public DescribeWorkspacesResponse result { get; set; }
        public Dictionary<string, string> bundle_dicts = new Dictionary<string, string>();
        public DescribeWorkspaceBundlesResponse result2 { get; set; }

        public DescribeUsersResponse  getMyUsernames { get; set; }
        public HashSet<string> Usernames { get; set; }

        private readonly ILogger<IndexModel> _logger;
       

        public string DirectoryId { get; set; }
        public IndexModel(ILogger<IndexModel> logger)
        {
            _logger = logger;
        }

        public async Task<IActionResult> OnGetAsync()
        {
            AmazonWorkSpacesClient client = new AmazonWorkSpacesClient();
            result = await client.DescribeWorkspacesAsync();
            result2 = await client.DescribeWorkspaceBundlesAsync();
            AmazonWorkDocsClient wdcs_client = new AmazonWorkDocsClient();

            DescribeUsersRequest dur = new DescribeUsersRequest();
            DirectoryId = dur.OrganizationId = "d-90676026fa";
            getMyUsernames = await wdcs_client.DescribeUsersAsync(dur);

            Usernames = new HashSet<string>();
            foreach (var user in getMyUsernames.Users)
                Usernames.Add(user.Username);

            foreach (var ws in result.Workspaces)
                if (Usernames.Contains(ws.UserName))
                    Usernames.Remove(ws.UserName);


            client.Dispose();
            return Page();
        }

      
       
    }
}
