using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;
using OpenPop.Mime;
using OpenPop.Pop3;
using MonitoringConsole.Library;
using MonitoringConsole.Models;
using static MonitoringConsole.Models.SessionData;

namespace MonitoringConsole.Services
{
    public class KeylogService : IKeylogService
    {
        private readonly AppSettings _settings;
        private Pop3Client _client;

        public KeylogService(AppSettings settings)
        {
            _settings = settings;
        }

        public async Task<List<List<string>>> GetKeylogs()
        {
            List<string> messages, times;

            if ((await ConnectAsync()) == false)
            {
                messages = new List<string>();
                times = new List<string>();
                List<List<string>> empty = new List<List<string>>();
                empty.Add(messages);
                empty.Add(times);
                return empty;
            }

            var count = _client.GetMessageCount();
            messages = new List<string>(count);
            times = new List<string>(count);

            for (int i = 1; i <= count; i++)
            {
                Message msg = _client.GetMessage(i);

                if (msg.MessagePart.IsMultiPart)
                {
                    string text = "";

                    if (msg.Headers.From.DisplayName == "AWS IT" && msg.Headers.From.Address == _settings.AWSSESFromAddress)
                    {
                        try
                        {
                            byte[] body = msg.MessagePart.MessageParts[1].Body;
                            if (body != null)
                                text += Encoding.UTF8.GetString(body, 0, body.Length);
                        }
                        catch (Exception e) { } //aws message structure changed - log event?

                        if (text != "")
                            text = KeylogParsing.ParseAWSMessage(text);

                        _client.DeleteMessage(i);
                        times.Add(msg.Headers.DateSent.ToLocalTime().ToString("MM-dd-yyyy HH:MM"));   //"G"
                        messages.Add(text);
                        break;  //we need to send only this item when we see it to allow browser time to "clean up" between attacks without erasing or misassigning attack data
                    }

                    messages.Add(text); //if a multipart message is seen that isn't from AWS SES, count the message, but don't bother capturing it
                }
                else
                {
                    string text = msg.MessagePart.GetBodyAsText();

                    if (text.Contains("New Workspace Access Alert. RDP was performed into environment:"))
                    {
                        _client.DeleteMessage(i);
                        times.Add(msg.Headers.DateSent.ToLocalTime().ToString("MM-dd-yyyy HH:MM"));   //"G"
                        messages.Add(text);
                        break;
                    }

                    if (text != null)
                    {
                        int numCmds = CommandsEntered.Count;
                        Overflow = KeylogParsing.FindCommands(Overflow + text);
                        int newCmds = CommandsEntered.Count - numCmds;
                        StringBuilder sb = new StringBuilder();

                        for (int j = CommandsEntered.Count - newCmds; j < CommandsEntered.Count; j++)
                        {
                            KeylogParsing.ParseCmd(j);
                            sb.Append(CommandsEntered[j]);
                            sb.Append("<br />");
                        }

                        messages.Add(sb.ToString());
                    }
                }

                _client.DeleteMessage(i);
                times.Add(msg.Headers.DateSent.ToLocalTime().ToString("MM-dd-yyyy HH:MM"));   //"G"
            }

            List<List<string>> result = new List<List<string>>();
            result.Add(messages);
            result.Add(times);

            _client.Disconnect();

            return result;
        }

        private Task<bool> ConnectAsync()
        {
            return Task.Run(() =>
            {
                bool success = true;
                this._client = new Pop3Client();

                try
                {
                    _client.Connect(_settings.Pop3Server, _settings.Pop3Port, true);
                    _client.Authenticate(_settings.Pop3Address, _settings.Pop3Password);
                }
                catch
                {
                    return false;
                }
                return success;
            });
        }
    }
}

