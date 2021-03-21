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
        private readonly ILogger<IndexModel> _logger;
        private TaskCompletionSource<bool> _readFileComplete;
        public IndexModel(ILogger<IndexModel> logger)
        {
            _logger = logger;
        }

        public async Task<IActionResult> OnGetAsync()
        {
            //await GetDeployInfo();
            AmazonWorkSpacesClient client = new AmazonWorkSpacesClient();
            result = await client.DescribeWorkspacesAsync();
            result2 = await client.DescribeWorkspaceBundlesAsync();
            AmazonWorkDocsClient wdcs_client = new AmazonWorkDocsClient();

            DescribeUsersRequest dur = new DescribeUsersRequest();
            dur.OrganizationId = "d-90676026fa";
            getMyUsernames = await wdcs_client.DescribeUsersAsync(dur);
            return Page();
        }

        public async Task GetDeployInfo ()
        {
            //command to run: aws workspaces describe-workspaces > MyJson.json
            _readFileComplete = new TaskCompletionSource<bool>();
            string path = Environment.CurrentDirectory + "\\getdeployinfo.bat";

            ProcessStartInfo processInfo = new ProcessStartInfo(path);
            processInfo.UseShellExecute = true;

            Process batchProcess = new Process();
            batchProcess.StartInfo = processInfo;
            batchProcess.EnableRaisingEvents = true;
            //batchProcess.Exited += new EventHandler(ReadTextFile);

            batchProcess.Start();

            await Task.WhenAny(_readFileComplete.Task);

            //return Output;

            
        }

       
    }
}
