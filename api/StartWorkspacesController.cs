using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Amazon.WorkSpaces;
using Amazon.WorkSpaces.Model;
using MonitoringConsole.Class_Library;

// For more information on enabling Web API for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

namespace MonitoringConsole.api
{
    [Route("api/[controller]")]
    [ApiController]
    public class StartWorkspacesController : ControllerBase
    {
        // GET: api/<StartWorkspacesController>
        [HttpGet]
        public IEnumerable<string> Get()
        {
            return new string[] { "value1", "value2" };
        }

        // GET api/<StartWorkspacesController>/5
        [HttpGet("{id}")]
        public string Get(int id)
        {
            return "value";
        }

        // POST api/<StartWorkspacesController>
        [HttpPost]
        public async Task<StartWorkspacesResponse> Post([FromBody]  WSStartRequest ex)
        {
            AmazonWorkSpacesClient client = new AmazonWorkSpacesClient();
            StartWorkspacesRequest swr = new StartWorkspacesRequest();
            swr.StartWorkspaceRequests = new List<StartRequest>();
            
            foreach (var item in ex.StartWorkspaceList){
                StartRequest srq = new StartRequest();
                srq.WorkspaceId = item;
                swr.StartWorkspaceRequests.Add(srq);
            }
            
            return await client.StartWorkspacesAsync(swr);
        }

        // PUT api/<StartWorkspacesController>/5
        [HttpPut("{id}")]
        public void Put(int id, [FromBody] string value)
        {
        }

        // DELETE api/<StartWorkspacesController>/5
        [HttpDelete("{id}")]
        public void Delete(int id)
        {
        }
    }
}
