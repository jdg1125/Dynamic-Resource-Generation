

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

var placeToInsert = document.getElementById("placeToInsert");
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
        .then(() => alert("Server state has been refreshed"))
        .catch(() => alert("Failed to refresh server state"));
}




//main looping routine:

var getKeyloggerData = (function () {
    let count = 0;

    return async function () {
        let url = '../../api/KeyEvents/';

        if (!performingCleanup) {  //stall getting more keylogs until attack context has switched
            await fetch(url)
                .then(data => data.json())
                .then(data => {
                    processKeylogs(data);
                })
                .then(() => {
                    console.log(count);
                    if (isAttribCheckFinished && !(count %= 6))  //getAttackerInfo sets isAttribCheckFinished. save initially and then at every minute  
                        saveAttackLog();
                    if (isAttribCheckFinished)
                        count++;
                })
                .catch(() => alert("Failure in populateDisplay()"));
        }
        setTimeout(getKeyloggerData, 10000);
    };
})();

refreshServerState();
getKeyloggerData();

//main();


function processKeylogs(data) {
    if (rowCount == 1 /*startTime == null*/ && data[0].length > 0) {                     //RECHECK THIS!!! rowCount var may no longer be necessary
        startTime = new Date(data[1][0]);
        lastTimeSeen = startTime.getTime() / 1000; //used by determineThreat
    }

    for (let i = 0; i < data[0].length; i++) {
        if (data[0][i] != "") {
            getAttackerInfo(data[0][i], data[1][i]);  //check every message to see if a new attack has begun. Assume only sequential attacks are possible.

            determineThreat(data[0][i], data[1][i]);

            renderTable(data[0][i], data[1][i]);
        }
    }

    rowCount += data[0].length;
    console.log("Number of emails = " + rowCount);
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

function renderTable(notification, timeStamp) {
    let row = document.createElement("tr");

    row.innerHTML = "<td>" + notification + "</td><td>" + timeStamp + "</td><td>" + attackData.userName +
        "</td><td>" + attackData.workSpaceId + "</td><td>" + attackData.attackerIP;

    placeToInsert.append(row);
}

function switchAttacks(time) {
    performingCleanup = true;

    saveAttackLog();
    refreshServerState();

    //refresh state of attack in JS
    attackData.attackerIP = "";
    attackData.userName = "";
    attackData.workSpaceId = "";

    attacker._id = { };
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
        .then(data => alert(data))
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
            alert(attacker.idAsString);
            return data;
        })
        .then(data => JSON.stringify(data))
        .then(data => alert(data))
        .catch(() => alert("Saving attack log failed"));

}



//setup
var setup = document.getElementById("setup");
setup.addEventListener("click", setupWorkspace);

function setupWorkspace() {
    let url = '../../api/SetupWorkspace/';
    let paramObj = {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({    //later we can perform an initial GET to a service that gives us these parameters
            DirectoryId: 'test',
            UserName: 'test',
            BundleId: 'test'
        })
    };

    fetch(url, paramObj)
        .then(data => data.json())
        .then(data => JSON.stringify(data))
        .then(data => alert(data));
}



//threat level indicator
var threatScore = 0;
var lastTimeSeen;
var threatIndicator = document.getElementById("threatLevel");

function initThreatScore() {
    threatScore = attacker.prevMaxThreatLevel;
    console.log("in initThreatScore: " + JSON.stringify(attacker))
    console.log("initThreatScore: " + threatScore);
    updateThreatLevel();
}

function determineThreat(s, t) {
    if (s.indexOf("logoff") >= 0 || s.indexOf("shutdown -L") >= 0) { //attacker has exited the environment - signal the end of an attack and cleanup for next one
        switchAttacks(null);
        return;
    }

    //if (s.indexOf("powershell") >= 0)
    //    threatScore += 100;

    //if (s.indexOf("mstsc"))
    //    threatScore += 100;

    //let sub = s;
    //let indexCd, indexDir;
    //let foundCd = true, foundDir = true;

    //while (foundCd || foundDir) {
    //    foundCd = (indexCd = sub.indexOf("cd ")) >= 0;
    //    foundDir = (indexDir = sub.indexOf("dir")) >= 0;

    //    if (foundCd || foundDir) {
    //        let index = indexCd >= 0 && indexCd < indexDir ? indexCd : indexDir;
    //        threatScore += (threatScore >= 50) ? 5 : 1;
    //        sub = sub.substring(index + 3);
    //    }
    //}
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
    //updateThreatLevel();
    updateThermometer();
    
}

//function updateThreatLevel() {
//    if (threatScore < 50) {
//        threatIndicator.innerHTML = " Low";
//        threatIndicator.classList.add("threatLow");
//    }
//    else if (threatScore < 100) {
//        threatIndicator.innerHTML = " Elevated";
//        threatIndicator.classList.remove("threatLow");
//        threatIndicator.classList.add("threatElevated");
//    }
//    else if (threatScore < 150) {
//        threatIndicator.innerHTML = " Moderate";
//        threatIndicator.classList.remove("threatLow");
//        threatIndicator.classList.remove("threatElevated");
//        threatIndicator.classList.add("threatModerate");
//    }
//    else if (threatScore < 200) {
//        threatIndicator.innerHTML = " High";
//        threatIndicator.classList.remove("threatLow");
//        threatIndicator.classList.remove("threatElevated");
//        threatIndicator.classList.remove("threatModerate");
//        threatIndicator.classList.add("threatHigh");
//    }
//    else {
//        threatIndicator.innerHTML = " Critical";
//        threatIndicator.classList.remove("threatLow");
//        threatIndicator.classList.remove("threatElevated");
//        threatIndicator.classList.remove("threatModerate");
//        threatIndicator.classList.remove("threatHigh");
//        threatIndicator.classList.add("threatCritical");
//    }

//    console.log("threat level = " + threatIndicator.innerHTML);
//}

function updateThermometer() {
    let level0 = document.getElementById("LowTherm");
    let level1 = document.getElementById("ElevatedTherm");
    let level2 = document.getElementById("ModerateTherm");
    let level3 = document.getElementById("HighTherm");
    let level4 = document.getElementById("CriticalTherm");

    if (threatScore < 50) {
        level1.classList.remove("loaded");
        level2.classList.remove("loaded");
        level3.classList.remove("loaded");
        level4.classList.remove("loaded");
        level0.classList.add("loaded");
    }
    else if (threatScore < 100) {
        level2.classList.remove("loaded");
        level3.classList.remove("loaded");
        level4.classList.remove("loaded");
        level1.classList.add("loaded");
    }
    else if (threatScore < 150) {
        level3.classList.remove("loaded");
        level4.classList.remove("loaded");
        level2.classList.add("loaded");
    }
    else if (threatScore < 200) {
        level4.classList.remove("loaded");
        level3.classList.add("loaded");
    }
    else {
        level4.classList.add("loaded");
    }
}



// popup function (terminate)
function togglePopup() {
    document.getElementById("popup_terminate").classList.toggle("active");
}