using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using static MonitoringConsole.Models.SessionData;
using MonitoringConsole.Services;

namespace CreateWorkspaceDemo.api
{
    [Route("api/[controller]")]
    [ApiController]
    public class KeylogController : ControllerBase
    {
        private readonly IKeylogService _keylogService;

        public KeylogController(IKeylogService keylogService)
        {
            _keylogService = keylogService;
        }


        // GET: api/<KeyEventsController>
        [HttpGet]
        public async Task<List<List<string>>> Get()
        {
            return await _keylogService.GetKeylogs();  
        }

        // PUT api/<KeyEventsController>
        [HttpPut]
        public void Put()  //empty buffer and keylog "cache" when browser refreshes
        {
            Overflow = "";
            CommandsEntered.Clear();
            LogFileName = "";
            HttpContext.Response.StatusCode = 204;
        }

    }
}
