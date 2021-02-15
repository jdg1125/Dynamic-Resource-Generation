using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace MonitoringConsole.Data
{
    public static class AttackData
    {
        public static List<string> CommandsEntered = new List<string>();
        public static string Overflow = "";
        public static int CurrLine = 0;
        public static string LogFileName = "";
        public static HashSet<string> IgnoredKeys = new HashSet<string>()
        {
            "[ALT]", "[RIGHT_ALT]", "[CTRL]", "[RIGHT_CTRL]", "[SHIFT]", "[PAUSE]", "[RIGHT_SHIFT]",
            "[LEFT_WINDOWS]", "[RIGHT_WINDOWS]", "[CAPS_LOCK]", "[TAB]", "[ESC]", "[LEFT_SHIFT]",
            "[F1]", "[F2]", "[F3]", "[F4]", "[F5]", "[F6]", "[F7]", "[F8]", "[F9]", "[F10]", "[F11]", "[F12]",
            "[LEFT_ALT]", "[RIGHT_MENU]", "[LEFT_CTRL]", "[LEFT_ALT]", "[RIGHT_MENU]", "[LEFT_CTRL]"
        };
        public static HashSet<string> SpecialKeys = new HashSet<string>()
        {
            "[UP]", "[LEFT]", "[DOWN]", "[RIGHT]", "[BACKSPACE]", "[DELETE]"
        };

    }
 
}
