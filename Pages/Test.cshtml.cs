using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using MonitoringConsole.Services;
namespace MonitoringConsole.Pages
{
    public class TestModel : PageModel
    {
        private readonly IMongoDBService _context;
        public Dictionary<string, List<string>> Schema { get; set; }
        public TestModel(IMongoDBService context)
        {
            _context = context;
        }
        public async Task<IActionResult> OnGet()
        {
            Schema = await _context.GetDatabasesAndCollections();
            return Page();
        }
    }
}
