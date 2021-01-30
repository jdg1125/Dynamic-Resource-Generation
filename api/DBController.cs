﻿using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Text.Json;
using System.Text;
using System.IO;
using MonitoringConsole.Class_Library;
using MonitoringConsole.Services;
using static MonitoringConsole.Data.AttackData;

// For more information on enabling Web API for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

namespace MonitoringConsole.api
{
    [Route("api/[controller]")]
    [ApiController]
    public class DBController : ControllerBase
    {
        private readonly IMongoDBService _context;
        public DBController(IMongoDBService context)
        {
            _context = context;
        }

        // GET: api/<DBController>
        [HttpGet]
        public IEnumerable<string> Get()
        {
            return new string[] { "value1", "value2" };
        }

        // GET api/<DBController>/"222.111.22.11"
        [HttpGet("{id}")]
        public async Task<Attacker> Get(string id)
        {
            Attacker attacker = await _context.GetAttacker(id);
            return attacker;
        }

        // POST api/<DBController>
        [HttpPost]
        public async Task<AttackLog> Post([FromBody] AttackLog attackData)
        {
            /* attackData.KeyStrokes = CommandsEntered;

             StringBuilder fileName = new StringBuilder(Environment.CurrentDirectory);
             fileName.Append("\\log_");
             fileName.Append(DateTime.Now.ToString("yyyyMMdd_HHmmss"));
             fileName.Append(".json");

             using (FileStream createStream = System.IO.File.Create(fileName.ToString()))
             {
                 await JsonSerializer.SerializeAsync(createStream, attackData);
             }*/

            Attacker attacker = new Attacker();
            attacker.IPList.Add(new IP() 
            { 
                Address = attackData.AttackerIP 
            });
            attacker.PrevMaxThreatLevel = 300;

            await _context.AddAttacker(attacker);

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