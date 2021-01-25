﻿using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using System.Text.Json;
using System.Text.Json.Serialization;
using MonitoringConsole.Class_Library;
using static MonitoringConsole.Data.AttackData;

// For more information on enabling Web API for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

namespace MonitoringConsole.api
{
    [Route("api/[controller]")]
    [ApiController]
    public class SaveLogController : ControllerBase
    {
        // POST api/<SaveLogController>
        [HttpPost]
        public async Task<AttackLog> Post([FromBody] AttackLog attackData)
        {
            attackData.KeyStrokes = CommandsEntered;

            StringBuilder fileName = new StringBuilder(Environment.CurrentDirectory);
            fileName.Append("\\log_");
            fileName.Append(DateTime.Now.ToString("yyyyMMdd_HHmmss"));
            fileName.Append(".json");

            using (FileStream createStream = System.IO.File.Create(fileName.ToString()))
            {
                await JsonSerializer.SerializeAsync(createStream, attackData);
            }

            return attackData;
        }   
    }
}
