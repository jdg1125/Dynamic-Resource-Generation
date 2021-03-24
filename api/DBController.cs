using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Text.Json;
using System.Text;
using System.IO;
using MonitoringConsole.Class_Library;
using MonitoringConsole.Services;
using MongoDB.Bson;
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

        // GET api/<DBController>/"222.111.22.11"
        [HttpGet("{id}")]
        public async Task<Attacker> Get(string id)
        {
            Attacker attacker = await _context.GetAttacker(id);
            return attacker;
        }

        // POST api/<DBController>
        [HttpPost]
        public async Task<State> Post([FromBody] State attackData)
        {
            if (attackData.AttackerId == null || attackData.AttackerId == "")
            {
                Attacker attacker = new Attacker();
                attacker.IPList.Add(new IP()
                {
                    Address = attackData.AttackerIP
                });
                attacker.PrevMaxThreatLevel = attackData.PrevMaxThreatLevel;

                attacker._id = await _context.AddAttacker(attacker);
                attackData.AttackerId = attacker._id.ToString();
            }
            else
            {
                await _context.UpdateAttacker(new ObjectId(attackData.AttackerId), attackData.PrevMaxThreatLevel);
            }

            if (attackData.AttackId == null || attackData.AttackId == "")
            {
                Attack attack = new Attack()
                {
                    Start_Time = attackData.StartTime,
                    End_Time = attackData.EndTime,
                    CostScore = 1.0m,
                    Threat_Level = attackData.PrevMaxThreatLevel,
                    AttackerId = new ObjectId(attackData.AttackerId)

                };
                attack.Workspaces_Involved.Add(attackData.WorkspaceId);
                attack._id = await _context.AddAttack(attack);
                attackData.AttackId = attack._id.ToString();

                await _context.LinkAttack(attackData);
            }
            else
            {
                await _context.UpdateAttack(attackData);
            }

            return await SaveKeylogs(attackData); //saves keylogs to json file on disk and populates attackData.KeyStrokes;
        }

        private async Task<State> SaveKeylogs(State attackData)
        {
            List<string> CmdsSinceLastSave = new List<string>();

            if (CurrLine < CommandsEntered.Count) //CurrLine holds the spot of the next command to be saved in the keylog json file
            {
                CmdsSinceLastSave = CommandsEntered.GetRange(CurrLine, CommandsEntered.Count - CurrLine);
                CurrLine = CommandsEntered.Count;
            }

            if (CmdsSinceLastSave.Count > 0)
            {
                if (LogFileName == "")
                {
                    StringBuilder fileName = new StringBuilder(Environment.CurrentDirectory);
                    fileName.Append("\\Data\\Keylogs\\log_");
                    fileName.Append(DateTime.Now.ToString("yyyyMMdd_HHmmss"));
                    fileName.Append(".json");

                    LogFileName = fileName.ToString();
                    attackData.KeyStrokes = CmdsSinceLastSave;

                    using (FileStream createStream = System.IO.File.Create(LogFileName))
                    {
                        await JsonSerializer.SerializeAsync(createStream, attackData);
                    }
                }
                else //we only need to update the current log
                {
                    StringBuilder jsonString = new StringBuilder();
                    string buffer = "";
                    StreamReader reader = new StreamReader(LogFileName);

                    while ((buffer = reader.ReadLine()) != null)
                        jsonString.Append(buffer);

                    reader.Close();

                    State prevState = JsonSerializer.Deserialize<State>(jsonString.ToString());
                    prevState.KeyStrokes.AddRange(CmdsSinceLastSave);
                    prevState.EndTime = attackData.EndTime;
                    prevState.PrevMaxThreatLevel = attackData.PrevMaxThreatLevel;

                    using (FileStream updateStream = System.IO.File.Create(LogFileName))
                    {
                        await JsonSerializer.SerializeAsync(updateStream, prevState);
                    }
                    attackData = prevState;
                }
            }

            return attackData;
        }

        // GET: api/<DBController>
        [Route("attacksByBundleId/{id?}")]
        [HttpGet]
        public async Task<List<string>> GetAttacksByBundleId(string id)
        {
            List<Attack> result = await _context.GetAttackByBundleId(id);
            TimeSpan mean = new TimeSpan(0, 0, 0);
            TimeSpan median;
            TimeSpan[] sortedDurations = new TimeSpan[result.Count];
            
            for(int i=0; i< result.Count; i++)
            {
                TimeSpan duration = result[i].End_Time - result[i].Start_Time;
                sortedDurations[i]=duration;
                mean += duration;
            }

            Array.Sort(sortedDurations);
            mean /= sortedDurations.Length;
            median = sortedDurations[sortedDurations.Length / 2];

            return new List<string>() { mean.TotalMinutes.ToString(), median.TotalMinutes.ToString() };
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
