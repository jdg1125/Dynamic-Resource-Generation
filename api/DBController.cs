using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Text;
using System.IO;
using MonitoringConsole.Models;
using MonitoringConsole.Services;
using MongoDB.Bson;
using Newtonsoft.Json;
using static MonitoringConsole.Models.SessionData;
using System.Net.Http;
using MonitoringConsole.Library;

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

        // GET api/<DBController>/getAttacker/"222.111.22.11"
        [HttpGet("{id}")]
        [Route("getAttacker/{id}")]
        public async Task<Attacker> GetAttacker(string id)
        {
            Attacker attacker = await _context.GetAttacker(id);
            if (attacker == null)
            {
                attacker = new Attacker()
                {
                    Id = "",
                    IPList = new List<IP>(),
                    Name = "",
                    MaxThreatLevel = 0,
                    Attacks = new List<string>()
                };

                attacker.IPList.Add(new IP()
                {
                    Address = id,
                    Location = ""
                });
            }
            return attacker;
        }

        // POST api/<DBController>/saveLog
        [HttpPost]
        [Route("saveLog")]
        public async Task<SaveLogRequest> SaveLog([FromBody] object json)
        {
            SaveLogRequest request = JsonConvert.DeserializeObject<SaveLogRequest>(json.ToString());

            if (request.Attacker.Id == "")
            {
                request.Attacker.Id = ObjectId.Empty.ToString();
                request.Attacker.Id = (await _context.AddAttacker(request.Attacker)).ToString();
            }
            else
            {
                await _context.UpdateAttacker(request);
            }

            if (request.Attack.Id == "")
            {
                request.Attack.Id = ObjectId.Empty.ToString();
                request.Attack.AttackerId = request.Attacker.Id;
                request.Attack.Id = (await _context.AddAttack(request.Attack)).ToString();
                request.Attacker.Attacks.Add(request.Attack.Id);
                await _context.LinkAttackToAttacker(request);
            }
            else
            {
                await _context.UpdateAttack(request);
            }

            //return request;


            return await KeylogSaving.SaveKeylogs(request); //saves keylogs to json file on disk 
        }

        

        // GET: api/<DBController>
        [Route("prevAttackStats/{bundles?}")]
        [HttpPost]
        public async Task<List<Bundle>> GetPrevAttackStats([FromBody] List<Bundle> bundles)
        {
            if (bundles.Count == 0)
                return bundles;

            Dictionary<string, List<TimeSpan>> timeStats = new Dictionary<string, List<TimeSpan>>();
            foreach (var b in bundles)
            {
                timeStats.Add(b.BundleId, new List<TimeSpan>());
            }

            List<Attack> attacks = await _context.GetAllAttacks();
            foreach (var att in attacks)
            {
                foreach (var ws in att.WorkspacesInvolved)
                {
                    if (timeStats.ContainsKey(ws.BundleId))
                    {
                        TimeSpan interval = ws.EndTime - ws.StartTime;
                        timeStats[ws.BundleId].Add(interval);
                    }
                }
            }

            foreach (var b in bundles)
            {
                TimeSpan mean = TimeSpan.Zero, median = TimeSpan.Zero;
                timeStats[b.BundleId].Sort();

                foreach (var time in timeStats[b.BundleId])
                {
                    mean += time;

                }
                if (timeStats[b.BundleId].Count != 0)
                {
                    mean /= timeStats[b.BundleId].Count;
                    median = timeStats[b.BundleId][timeStats[b.BundleId].Count / 2];

                    b.MeanAttackDuration = mean.Minutes.ToString();
                    b.MedianAttackDuration = median.Minutes.ToString();
                }
            }

            return bundles;
        }



    }
}
