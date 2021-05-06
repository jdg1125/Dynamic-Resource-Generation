using System;
using System.Collections.Generic;
using System.Text;
using System.IO;
//using Newtonsoft.Json;
using System.Text.Json;
using System.Threading.Tasks;
using MonitoringConsole.Models;
using static MonitoringConsole.Models.SessionData;

namespace MonitoringConsole.Library
{
    public class KeylogSaving
    {
        public static async Task<SaveLogRequest> SaveKeylogs(SaveLogRequest attackData)
        {

            if (LogFileName == "")
            {
                StringBuilder fileName = new StringBuilder(Environment.CurrentDirectory);
                fileName.Append("/Data/Keylogs/AttackID_");
                fileName.Append(attackData.Attack.Id);
                fileName.Append(".json");

                LogFileName = fileName.ToString();
            }

            var keyLog = new Keylog();
            keyLog.Commands = CommandsEntered;
            keyLog.AttackData = attackData;

            using (FileStream createStream = System.IO.File.Create(LogFileName))
            {
                await JsonSerializer.SerializeAsync(createStream, keyLog);
            }


            return attackData;
        }
    }
}
