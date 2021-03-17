//function to place the buttons in the blue bar and update their position responsively
//function placeButtons() {
//    let coords = document.getElementById("topContent").getBoundingClientRect();
//    document.getElementById("buttons").style.setProperty("--left-offset", coords.left + "px");
//}

//placeButtons();
//window.addEventListener("resize", placeButtons);

var attackData = {
    attackerIP: "",
    userName: "",
    workSpaceId: ""
};

var attacker = {
    _id: {},
    idAsString: "",
    ipList: [],
    name: "",
    prevMaxThreatLevel: "",
    attacks: []
};

var attackId = "";
var startTime = null;
var isAttribCheckFinished = false;
var performingCleanup = false;

var rowCount = 1; //pop client message indexing starts from 1.  

//refresh server's "cache" of commands on refresh or on new attack

function refreshServerState() {
    let url = "../../api/KeyEvents";
    let paramObj = {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        }
    };

    fetch(url, paramObj)
        .then(() => console.log("Server state has been refreshed"))
        .catch(() => console.log("Failed to refresh server state"));
}

//main looping routine:

var getKeyloggerData = (function () {
    let count = 0;

    return function () {
        let url = '../../api/KeyEvents/';

        if (!performingCleanup) {  //stall getting more keylogs until attack context has switched
            fetch(url)
                .then(data => data.json())
                .then(data => {
                    processKeylogs(data);
                })
                .then(() => {
                    console.log("count = " + count);
                    if (isAttribCheckFinished && !(count %= 6))  //getAttackerInfo sets isAttribCheckFinished. save initially and then at every minute  
                        saveAttackLog();
                    if (isAttribCheckFinished)
                        count++;
                })
                .catch(() => alert("Failure in populateDisplay()"));
        }
        setTimeout(function () {
            getKeyloggerData();
        }, 10000);
    };
})();

refreshServerState();
getKeyloggerData();

function processKeylogs(data) {
    if (rowCount == 1 /*startTime == null*/ && data[0].length > 0) {                     //RECHECK THIS!!! rowCount var may no longer be necessary
        startTime = new Date(data[1][0]);
        lastTimeSeen = startTime.getTime() / 1000; //used by determineThreat
    }

    for (let i = 0; i < data[0].length; i++) {
        if (data[0][i] != "") {
            getAttackerInfo(data[0][i], data[1][i]);  //check every message to see if a new attack has begun. Assume only sequential attacks are possible.

            determineThreat(data[0][i], data[1][i]);

            displayKeylogs(data[0][i], data[1][i]);
        }
    }

    rowCount += data[0].length;
    console.log("rowCount = " + rowCount);
    //if (rowCount != 1) {
    //    removeSetUpWorkspace();
    //}

}



function getAttackerInfo(msg, time) {
    if (msg.length > 39 && msg.substring(0, 39) === "AWS Alert - possible WorkSpace attack. ") {
        if (attackData.attackerIP != "")  //we are inside an attack and we need to switch contexts to set up environment for another attack.
            switchAttacks(time);

        let s = msg.substring(39);

        attacker.ip = attackData.attackerIP = s.substring(0, s.indexOf(' '));

        s = s.substring(attackData.attackerIP.length + 1);
        attackData.workSpaceId = s.substring(0, s.indexOf(' '));
        s = s.substring(attackData.workSpaceId.length + 1);
        attackData.userName = s;

        displayAttackInfo();   //fill attack table 

        let url = '../../api/DB/' + attacker.ip;
        fetch(url)
            .then(data => data.json())
            .then(data => {
                attacker._id = data._id;
                attacker.idAsString = data.idAsString;
                attacker.name = data.name;
                attacker.ipList = data.ipList
                attacker.prevMaxThreatLevel = data.prevMaxThreatLevel;
                attacker.attacks = data.attacks;
            })
            .then(() => { console.log("in getAttacker " + JSON.stringify(attacker)) })
            .then(() => {
                initThreatScore();
                isAttribCheckFinished = true;
            })
            .catch(() => {
                alert("Attacker with IP address " + attacker.ip + " is unknown.");
                isAttribCheckFinished = true;
            });
    }
}

function displayKeylogs(notification, timeStamp) {
    let row = document.createElement("tr");

    row.innerHTML = "<td>" + notification + "</td><td>" + timeStamp + "</td>";
    //+ "</td><td>" + attackData.userName +
    //"</td><td>" + attackData.workSpaceId + "</td><td>" + attackData.attackerIP;

    document.getElementById("insertKeylogs").append(row);
}

function displayAttackInfo() {
    let row = document.createElement("tr");

    row.innerHTML = "<td>" + attackData.userName + "</td><td>" + attackData.workSpaceId + "</td><td>" + attackData.attackerIP + "</td>";

    document.getElementById("insertAttackInfo").append(row);
}

function switchAttacks(time) {
    performingCleanup = true;

    saveAttackLog();
    refreshServerState();

    //refresh state of attack in JS
    attackData.attackerIP = "";
    attackData.userName = "";
    attackData.workSpaceId = "";

    attacker._id = {};
    attacker.idAsString = "";
    attacker.ipList = [];
    attacker.name = "";
    attacker.prevMaxThreatLevel = "";
    attacker.attacks = [];
    attackId = "";

    startTime = time != null ? new Date(time) : null; //null if we are responding to a logoff or shutdown -L command   
    isAttribCheckFinished = false;
    rowCount = 1;

    threatScore = 0;
    //updateThermometer();
    updateThreatLevel();

    performingCleanup = false;
}


//terminate
var terminate_bttn = document.getElementById("terminate");
terminate_bttn.addEventListener("click", terminateWorkspace);
terminate_bttn.addEventListener("click", togglePopup);

function terminateWorkspace() {
    let url = '../../api/TerminateWorkspace/';
    let paramObj = {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({    //to get workpace info, call a service that runs: aws workspaces describe-workspaces --workspace-ids <workspace-id>
            DirectoryId: 'test',
            UserName: 'test',
            BundleId: 'test'
        })
    };

    fetch(url, paramObj)
        .then(data => data.json())
        .then(data => JSON.stringify(data))
        .then(data => console.log(data))
        .then(saveAttackLog);
}



//saveLog
var saveLog = document.getElementById("saveLog");
saveLog.addEventListener("click", saveAttackLog);

function saveAttackLog() {
    console.log("in SAVE LOG\n" + JSON.stringify(attacker));


    let url = '../../api/DB/';

    let endTime = new Date();
    let date = endTime.getFullYear() + '-' + (endTime.getMonth() + 1) + '-' + endTime.getDate();
    let time = endTime.getHours() + ":" + endTime.getMinutes() + ":" + endTime.getSeconds();

    endTime = new Date(date + ' ' + time);

    let paramObj = {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            Username: attackData.userName,
            AttackerIP: attackData.attackerIP,
            WorkspaceId: attackData.workSpaceId,
            PrevMaxThreatLevel: threatScore,
            AttackerId: attacker.idAsString,
            AttackId: attackId,
            StartTime: startTime,
            EndTime: endTime,
            Keystrokes: []
        })
    };

    fetch(url, paramObj)
        .then(data => data.json())
        .then((data) => {
            attackId = data.attackId;
            attacker.idAsString = data.attackerId;
            console.log("attackerId: " + attacker.idAsString);
            return data;
        })
        .then(data => JSON.stringify(data))
        .then(data => console.log(data))
        .catch(() => alert("Saving attack log failed"));

}



//setup


//var setup = document.getElementById("setup");
//setup.addEventListener("click", setupWorkspace);

//function setupWorkspace() {
//    let url = '../../api/SetupWorkspace/';
//    let paramObj = {
//        method: "POST",
//        headers: {
//            "Content-Type": "application/json"
//        },
//        body: JSON.stringify({    //later we can perform an initial GET to a service that gives us these parameters
//            DirectoryId: 'test',
//            UserName: 'test',
//            BundleId: 'test'
//        })
//    };

//    fetch(url, paramObj)
//        .then(data => data.json())
//        .then(data => JSON.stringify(data))
//        .then(data => alert(data));
//}



//threat level indicator
var threatScore = 0;
var lastTimeSeen;
var threatIndicator = document.getElementById("threatLevel");

function initThreatScore() {
    threatScore = attacker.prevMaxThreatLevel;
    console.log("in initThreatScore: " + JSON.stringify(attacker))
    console.log("initThreatScore: " + threatScore);
    //updateThermometer();
    updateThreatLevel();
}

function determineThreat(s, t) {

    var att_commands = {
        "powershell": 100,
        "mstsc": 100,
        "cd": 1,
        "dir": 1,
        "copy": 50,
        "del": 70,
        "mkdir": 50,
        "rmdir": 100,
        "move": 50,
    };


    for (var key in att_commands) {
        if (att_commands.hasOwnProperty(key)) {
            if (s.toLowerCase().indexOf(key) >= 0)
                threatScore += att_commands[key];
        }
    }

    var rowPoints = rowCount / 2; //1 point for every minute in the environment
    threatScore += rowPoints;

    //increase threat score as time elapses
    //let currTime = new Date(t);
    //let timeElapsed = currTime.getTime() / 1000 - lastTimeSeen;
    //lastTimeSeen = currTime.getTime() / 1000;
    //threatScore += timeElapsed / 360; 

    console.log("Threat Score = " + threatScore);
    //updateThermometer();
    updateThreatLevel();
}

//function updateThermometer() {
//    let level0 = document.getElementById("LowTherm");
//    let level1 = document.getElementById("ElevatedTherm");
//    let level2 = document.getElementById("ModerateTherm");
//    let level3 = document.getElementById("HighTherm");
//    let level4 = document.getElementById("CriticalTherm");

//    if (threatScore < 50) {
//        unfillTherm([level1, level2, level3, level4]);
//        fillTherm([level0]);
//        document.documentElement.style.setProperty("--thermometer-background", "#008000");
//        turnThermTextWhite([level0]);
//        turnThermTextBlack([level1, level2, level3, level4]);
//    }
//    else if (threatScore < 100) {
//        unfillTherm([level2, level3, level4]);
//        fillTherm([level0, level1]);
//        document.documentElement.style.setProperty("--thermometer-background", "gold");
//        turnThermTextBlack([level0, level1, level2, level3, level4]);
//    }
//    else if (threatScore < 150) {
//        unfillTherm([level3, level4]);
//        fillTherm([level0, level1, level2]);
//        document.documentElement.style.setProperty("--thermometer-background", "#ff8c00");
//        turnThermTextBlack([level0, level1, level2, level3, level4]);
//    }
//    else if (threatScore < 200) {
//        unfillTherm([level4]);
//        fillTherm([level0, level1, level2, level3]);
//        document.documentElement.style.setProperty("--thermometer-background", "#ff0000");
//        turnThermTextBlack([level0, level1, level2, level3, level4]);
//    }
//    else {
//        fillTherm([level0, level1, level2, level3, level4]);
//        document.documentElement.style.setProperty("--thermometer-background", "black");
//        turnThermTextWhite([level0, level1, level2, level3, level4]);
//    }
//}


//function turnThermTextBlack(levels) {
//    for (let item of levels) {
//        item.classList.remove("thermWhiteText");
//        item.classList.add("thermBlackText");
//    }
//}

//function turnThermTextWhite(levels) {
//    for (let item of levels) {
//        item.classList.remove("thermBlackText");
//        item.classList.add("thermWhiteText");
//    } 
//} 

//function fillTherm(levels) {
//    for (let item of levels)
//        item.classList.add("filled");
//}

//function unfillTherm(levels) {
//    for (let item of levels)
//        item.classList.remove("filled");
//}

// popup function (terminate)
function togglePopup() {
    document.getElementById("popup_terminate").classList.toggle("active");
}



function updateThreatLevel() {
    let threatIndicator = document.getElementById("threatIndicator");
    let threatText = document.getElementById("threatText");
    let barWidth = threatScore / 200 >= 1 ? 100 : (threatScore / 200) * 100;

    document.documentElement.style.setProperty("--progress-width", barWidth + "%");
    threatIndicator.className = "";

    if (threatScore < 50) {
        threatIndicator.classList.add("low-threat");
        threatText.innerHTML = threatScore + "   Low";
    }
    else if (threatScore < 100) {
        threatIndicator.classList.add("elevated-threat");
        threatText.innerHTML = threatScore + "   Elevated";
    }
    else if (threatScore < 150) {
        threatIndicator.classList.add("moderate-threat");
        threatText.innerHTML = threatScore + "   Moderate";
    }
    else if (threatScore < 200) {
        threatIndicator.classList.add("high-threat");
        threatText.innerHTML = threatScore + "   High";
    }
    else {
        threatIndicator.classList.add("critical-threat");
        threatText.innerHTML = threatScore + "   Critical";
    }
}

function togglePageView() {
    document.getElementById("monitorView").classList.toggle("hidden-view");
    document.getElementById("setupView").classList.toggle("hidden-view");
}

function toggleDeployMenu() {
    document.getElementById("deployResourceMenu").classList.toggle("hidden-view");
    document.getElementById("bottomContent").classList.toggle("content-bottom-double");
}

document.getElementById("setup").addEventListener("click", togglePageView);
document.getElementById("deploy").addEventListener("click", toggleDeployMenu);

//function setupWorkspace() {
//    document.getElementById("DeployResourceMenu").classList.toggle("showBlock");
//    document.getElementById("bottomContent").classList.add("content-bottom-double");
//}

//function removeSetUpWorkspace() {
//    document.getElementById("setup").innerHTML = "Set Up Workspace";
//    document.getElementById("setup").addEventListener("click", setupWorkspace);
//}


//display cost on setup page:

var roles = document.getElementsByName("role");
var prev = null;

for (let i = 0; i < roles.length; i++) {
    roles[i].addEventListener("change", function () {
        if (this != prev) {
            prev = this;
            document.getElementById("setupCost").innerHTML = "$9.75/month, plus $0.30/hour"
        }
    });
}

//toggle status on deploy menu:

function changeDeployStatus(e) {

    let sender = e.target;
    let parent = sender.parentNode.parentNode;

    let status = parent.getElementsByTagName("span")[0];
    status.innerHTML = "Starting";
    status.classList.remove("text-stopped");
    status.classList.add("text-starting");
    sender.disabled = true;

}

var costToDeploy = {
    "justin": 3,
    "jake": 3,
    "joseph": 3
}

function addCostToTotal(e) {
    let sender = e.target;
    let username = sender.getAttribute("value");

    let prevCost = parseFloat(document.getElementById("deployCost").innerHTML);
    prevCost *= 10;
    let tmp = prevCost + (sender.checked ? costToDeploy[username] : -costToDeploy[username]);
    document.getElementById("deployCost").innerHTML = tmp / 10 == 0 ? "0.0" : tmp / 10;
}

function toggleHoursSelector(e) {
    let sender = e.target;
    if (sender.getAttribute("value") === "AlwaysOn") {
        document.getElementById("hoursSelector").classList.add("hidden-view");
    }
    else {
        document.getElementById("hoursSelector").classList.remove("hidden-view");
    }
}