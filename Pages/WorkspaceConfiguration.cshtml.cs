using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace MonitoringConsole.Pages
{
    public class WorkspaceConfigurationModel : PageModel
    {
        public string WorkspaceRole;
        public string WorkspaceEnvironments;
        public IActionResult OnPost(string WorkspaceName, string WorkspaceRole)
        {
            return Redirect("~/Pages/Index");


        }
    }
}
