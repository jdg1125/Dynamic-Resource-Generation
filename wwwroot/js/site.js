//display keylogger data
var placeToInsert = document.getElementById("placeToInsert");
var rowCount = 1; //pop client message indexing starts from 1.  rowCount holds index of next message to be read
var attackData = {
    attackerIP: "",
    userName: "",
    workSpaceId: ""
};

var attacker = {
    _id: {},
    IdAsString: "",
    ipList: [],
    name: "",
    prevMaxThreatLevel: "",
    attacks: []
};

var attackId = "";
var startTime;

async function getKeyloggerData() {
    let url = '../../api/KeyEvents/' + rowCount;
    await fetch(url)
        .then(data => data.json())
        .then(data => processKeylogs(data))
        .catch(() => alert("Failure in populateDisplay()"));

    setTimeout(getKeyloggerData, 5000);
};

function processKeylogs(data) {
    if (rowCount == 1 && data[0].length > 0) {
        startTime = new Date(data[1][0]);
        lastTimeSeen = startTime.getTime() / 1000; //used by determineThreat
    }

    for (let i = 0; i < data[0].length; i++) {
        if (data[0][i] != "") {
            if (attackData.attackerIP === "")
                getAttackerInfo(data[0][i]);

            determineThreat(data[0][i], data[1][i]);

            renderTable(data[0][i], data[1][i]);
        }
    }

    rowCount += data[0].length;
    console.log("Number of emails = " + rowCount);
}

function getAttackerInfo(msg) {
    if (msg.length > 39 && msg.substring(0, 39) === "AWS Alert - possible WorkSpace attack. ") {
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
                attacker.IdAsString = data.idAsString;
                attacker.name = data.name;
                attacker.ipList = data.ipList
                attacker.prevMaxThreatLevel = data.prevMaxThreatLevel;
                attacker.attacks = data.attacks;
            })
            .then(() => initThreatScore())
            .catch(() => alert("Fetching info about attacker failed"));
    }
}

function renderTable(notification, timeStamp) {
    let row = document.createElement("tr");

    row.innerHTML = "<td>" + notification + "</td><td>" + timeStamp + "</td><td>" + attackData.userName +
        "</td><td>" + attackData.workSpaceId + "</td><td>" + attackData.attackerIP;

    placeToInsert.append(row);
}

getKeyloggerData();

//terminate
var terminate_bttn = document.getElementById("terminate");
terminate_bttn.addEventListener("click", terminateWorkspace);

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
        .then(data => alert(data));
}

//saveLog
var saveLog = document.getElementById("saveLog");
saveLog.addEventListener("click", saveAttackLog);

function saveAttackLog() {
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
            AttackerId: attacker.IdAsString,
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
            //console.log(attackId);
            return data;
        })
        .then(data => JSON.stringify(data))
        .then(data => alert(data))
        .catch(() => alert("Saving attack log failed"));

    //save attacker data - if attacker known, update threat score and increment prevEncounters. else, create new entry
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
    console.log("initThreatScore: " + threatScore);
    updateThreatLevel();
}

function determineThreat(s, t) {
    if (s.indexOf("powershell") >= 0)
        threatScore += 100;

    let sub = s;
    let indexCd, indexDir;
    let foundCd = true, foundDir = true;

    while (foundCd || foundDir) {
        foundCd = (indexCd = sub.indexOf("cd ")) >= 0;
        foundDir = (indexDir = sub.indexOf("dir")) >= 0;

        if (foundCd || foundDir) {
            let index = indexCd >= 0 && indexCd < indexDir ? indexCd : indexDir;
            threatScore += (threatScore >= 50) ? 5 : 1;
            sub = sub.substring(index + 3);
        }
    }

    var RowPoints = rowCount / 2; //1 point for every minute in the environment; Need to add row of StartTime
    threatScore += RowPoints;

    //increase threat score as time elapses
    //let currTime = new Date(t);
    //let timeElapsed = currTime.getTime() / 1000 - lastTimeSeen;
    //lastTimeSeen = currTime.getTime() / 1000;
    //threatScore += timeElapsed / 360; 

    console.log("Threat Score = " + threatScore);
    updateThreatLevel();
}

function updateThreatLevel() {
    if (threatScore < 50) {
        threatIndicator.innerHTML = " Low";
        threatIndicator.classList.add("threatLow");
    }
    else if (threatScore < 100) {
        threatIndicator.innerHTML = " Elevated";
        threatIndicator.classList.remove("threatLow");
        threatIndicator.classList.add("threatElevated");
    }
    else if (threatScore < 150) {
        threatIndicator.innerHTML = " Moderate";
        threatIndicator.classList.remove("threatLow");
        threatIndicator.classList.remove("threatElevated");
        threatIndicator.classList.add("threatModerate");
    }
    else if (threatScore < 200) {
        threatIndicator.innerHTML = " High";
        threatIndicator.classList.remove("threatLow");
        threatIndicator.classList.remove("threatElevated");
        threatIndicator.classList.remove("threatModerate");
        threatIndicator.classList.add("threatHigh");
    }
    else {
        threatIndicator.innerHTML = " Critical";
        threatIndicator.classList.remove("threatLow");
        threatIndicator.classList.remove("threatElevated");
        threatIndicator.classList.remove("threatModerate");
        threatIndicator.classList.remove("threatHigh");
        threatIndicator.classList.add("threatCritical");
    }

    console.log("threat level = " + threatIndicator.innerHTML);
}
