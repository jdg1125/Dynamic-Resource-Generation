using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Text.Json;
using System.Text;
using System.IO;
using MonitoringConsole.Class_Library;
using static MonitoringConsole.Data.AttackData;

// For more information on enabling Web API for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

namespace MonitoringConsole.api
{
    [Route("api/[controller]")]
    [ApiController]
    public class DBController : ControllerBase
    {
        // GET: api/<DBController>
        [HttpGet]
        public IEnumerable<string> Get()
        {
            return new string[] { "value1", "value2" };
        }

        // GET api/<DBController>/"222.111.22.11"
        [HttpGet("{id}")]
        public Attacker Get(string id)
        {
            Attacker attacker = new Attacker(id);
            attacker.Name = "Justin";
            attacker.Location = "Georgia, USA";
            attacker.PrevEncounters = 1;
            attacker.PrevMaxThreatLevel = 220;
            attacker.Activities = new List<string>()
            {
                "Steal research documents"
            };

            return attacker;
        }

        // POST api/<DBController>
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

        // PUT api/<DBController>/5
        [HttpPut("{id}")]
        public void Put(int id, [FromBody] string value)
        {
        }

        // DELETE api/<DBController>/5
        [HttpDelete("{id}")]
        public void Delete(int id)
        {
        }
    }
}
