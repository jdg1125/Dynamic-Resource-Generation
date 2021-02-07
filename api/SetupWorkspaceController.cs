using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MonitoringConsole.Class_Library;

// For more information on enabling Web API for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

namespace MonitoringConsole.api
{
    [Route("api/[controller]")]
    [ApiController]
    public class SetupWorkspaceController : ControllerBase
    {
        public static string Output { get; set; }
        private static TaskCompletionSource<bool> _readFileComplete;

        // POST api/<SetupWorkspaceController>
        [HttpPost]
        public async Task<string> Post([FromBody] WorkspaceCreate value)
        {
            _readFileComplete = new TaskCompletionSource<bool>();            
            string path = Environment.CurrentDirectory + "\\createworkspace.bat";

            ProcessStartInfo processInfo = new ProcessStartInfo(path);
            processInfo.UseShellExecute = true;

            Process batchProcess = new Process();
            batchProcess.StartInfo = processInfo;
            batchProcess.EnableRaisingEvents = true;
            batchProcess.Exited += new EventHandler(ReadTextFile);

            batchProcess.Start();

            await Task.WhenAny(_readFileComplete.Task);

            return Output;
        }
    
        public static void  ReadTextFile(object sender, EventArgs e)
        {
            string fileName = Environment.CurrentDirectory + "\\batchOutput.txt";
            StreamReader reader = new StreamReader(fileName);
            StringBuilder sb = new StringBuilder();

            string line = reader.ReadLine();
            while (line != null)
            {
                sb.Append(line);
                line = reader.ReadLine();
            }

            reader.Close();

            Output = sb.ToString();
            System.IO.File.WriteAllText(fileName, "");

            _readFileComplete.SetResult(true);
        }

    }

}

