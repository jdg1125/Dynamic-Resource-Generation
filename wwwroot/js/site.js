
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
    let infoTBody = document.getElementById("insertAttackInfo");
    let rows = infoTBody.getElementsByTagName("tr");

    let url = '../../api/DescribeResources/userById/' + attackData.workSpaceId;
    fetch(url)
        .then(data => data.json())
        .then(data => {
            attackData.userName = data.username;
            rows[0].innerHTML = "<td>" + attackData.userName + "</td>";
            rows[1].innerHTML = "<td>" + attackData.workSpaceId + "</td>";
            rows[2].innerHTML = "<td>" + attackData.attackerIP + "</td>";
        });
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
    updateThreatLevel();

    performingCleanup = false;
}


//terminate
var terminateNavBtn = document.getElementById("terminate");
terminateNavBtn.addEventListener("click", displayTerminateOptions);
terminateNavBtn.addEventListener("click", togglePopup);
var termCompleteBtn = document.getElementById("termComplete");
termCompleteBtn.addEventListener("click", terminateWorkspaces);

function displayTerminateOptions() {
    let url = '../../api/DescribeResources/userById/' + attackData.workSpaceId;
    fetch(url)
        .then(data => data.json())
        .then(data => {
            document.getElementById("outerEnv").setAttribute("value", attackData.workSpaceId);
            document.getElementById("outerEnvLabel").innerHTML = data.username;
        })
        .catch(() => {
            alert("To do: disable button until attack begins");
        });


    url = '../../api/DescribeResources/availWorkspaces';
    let wsList;
    fetch(url)
        .then(data => data.json())
        .then(data => {
            wsList = data;
            populateTermForm(wsList); //generate checkboxes for workspaces and add them to popup
        });
}

function populateTermForm(workspaces) {
    let prevBoxes = document.getElementsByClassName("checkbox-clone");  //underlying collection resizes when removeChild is called - therefore, iterate backwards

    for (let i = prevBoxes.length - 1; i >= 0; i--) {
        prevBoxes[i].parentElement.removeChild(prevBoxes[i]);  //clear previous entries
    }

    let baseDiv = document.getElementById("checkbox-template");
    let template = baseDiv.cloneNode(true);
    template.removeAttribute("id");
    template.classList.toggle("hidden-view");
    template.classList.toggle("checkbox-clone");

    let container = document.getElementById("terminateForm");

    for (let ws of workspaces) {
        if (ws.workspaceId != attackData.workSpaceId) {
            let clone = template.cloneNode(true);
            clone.getElementsByTagName("input")[0].setAttribute("value", ws.workspaceId);
            clone.getElementsByTagName("label")[0].innerHTML = ws.userName;
            container.appendChild(clone);
        }
    }
}

function terminateWorkspaces() {
    let checkboxes = document.getElementsByName("wsToTerm");
    let wsList = [];

    for (let elem of checkboxes) {
        if (elem.checked)
            wsList.push(elem.getAttribute("value"));
    }

    let url = '../../api/TerminateWorkspace/';
    let paramObj = {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            Workspaces: wsList
        })
    };

    fetch(url, paramObj)
        .then(data => data.json())
        .then(data => {
            let termResult = document.getElementById("termResult");
            if (data.length != 0) {
                termResult.innerHTML = "Failed terminate requests: " + "<br />"
                for (let i = 0; i < data.length; i++)
                    termResult.innerHTML += data[i].workspaceId + "<br />";
            }
            else {
                termResult.innerHTML = "All terminate requests succeeded";
            }

        })
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
    if (!document.getElementById("setupView").classList.toggle("hidden-view"))
        getTimeStatsForBundle();
}

function toggleDeployMenu() {
    document.getElementById("bottomContent").classList.toggle("content-bottom-double");
    if (!document.getElementById("deployResourceMenu").classList.toggle("hidden-view"))
        refreshDeployTable();
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


//toggle status on deploy menu:

//function changeDeployStatus(e) {

//    let sender = e.target;
//    let parent = sender.parentNode.parentNode;

//    let status = parent.getElementsByTagName("span")[0];
//    status.innerHTML = "Starting";
//    status.classList.remove("text-stopped");
//    status.classList.add("text-starting");
//    sender.disabled = true;

//}


function addCostToTotal() {
    let sender = event.target;
    //let username = sender.getAttribute("value");
    let prevCost = parseFloat(document.getElementById("deployCost").innerHTML);
    prevCost *= 10;
    let tmp = prevCost + (sender.checked ? 3 /*costToDeploy[username]*/ : -3/*costToDeploy[username]*/);
    document.getElementById("deployCost").innerHTML = tmp / 10 == 0 ? "0.0" : tmp / 10;
}

var refreshDeployBtn = document.getElementById("refreshDeployBtn");
refreshDeployBtn.addEventListener("click", refreshDeployTable);

function refreshDeployTable() {
    let url = '../../api/DescribeResources/getDeployable';
    fetch(url)
        .then(data => data.json())
        .then(data => makeDeployTable(data));
}

function makeDeployTable(data) {
    let deployTable = document.getElementById("deployTable");
    deployTable.innerHTML = "";
    let stateDict = {
        "STOPPED": "text-stopped",
        "PENDING": "text-pending",
        "AVAILABLE": "text-available",
        "STARTING": "text-running",
        "TERMINATING": "text-terminating"
    };

    let wsList = data.workspaces;
    //console.log(wsList[0]);
    let bDict = data.bundles;
    //console.log(bDict[0]);
    for (let i = 0; i < wsList.length; i++) {
        let ws = wsList[i];

        let row = document.createElement("tr");
        let role = document.createElement("td");
        let username = document.createElement("td");
        let status = document.createElement("td");
        let ckbox = document.createElement("td");

        role.innerHTML = bDict[ws.bundleId] === undefined ? "" : bDict[ws.bundleId];
        username.innerHTML = ws.userName;

        let stateSpan = document.createElement("span");
        let spanClass = stateDict[ws.state.value] === undefined ? "text-black" : stateDict[ws.state.value];
        stateSpan.classList.add(spanClass);
        stateSpan.innerHTML = ws.state.value;

        status.appendChild(stateSpan);

        let inputTag = document.createElement("input");
        inputTag.setAttribute("type", "checkbox");
        inputTag.classList.add("starting_ws");
        inputTag.setAttribute("value", ws.workspaceId);

        if (ws.workspaceProperties.runningMode.value != "AUTO_STOP" || ws.state.value != "STOPPED") {
            inputTag.disabled = true;
        }
        else {
            inputTag.addEventListener("click", addCostToTotal);
        }

        ckbox.appendChild(inputTag);
        row.appendChild(role);
        row.appendChild(username);
        row.appendChild(status);
        row.appendChild(ckbox);

        deployTable.appendChild(row);
    }
}

function toggleHoursSelector(e) {
    let sender = e.target;
    if (sender.getAttribute("value") === "ALWAYS_ON") {
        document.getElementById("hoursSelector").classList.add("hidden-view");
    }
    else {
        document.getElementById("hoursSelector").classList.remove("hidden-view");
    }

    ConfigWorkspaceCost();
}




//var ds = getElementById('deployBtn');
//ds.addEventListener("click", DeploySelected);
var ws_cname = document.getElementsByClassName('starting_ws');

function DeploySelected() {
    var myList = []
    for (var i = 0; i < ws_cname.length; i++) {
        if (ws_cname[i].checked != false) {
            myList.push(ws_cname[i].getAttribute("value"));
        }
    }
    let url = '../../api/StartWorkspaces/';
    let paramObj = {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({    //later we can perform an initial GET to a service that gives us these parameters
            StartWorkspaceList: myList
        })
    };

    fetch(url, paramObj)
        .then(data => data.json())
        .then(data => {
            console.log("in deploySelected: " + JSON.stringify(data));
        })
        
}


var RunningModeRadio = document.getElementsByClassName("runningMode");
//var VolumePair = document.getElementsByClassName("volPair");

var VolumeChoice = document.getElementById("volume_choices");

for (var int = 0; int < RunningModeRadio.length; int++) {
    RunningModeRadio[int].addEventListener("click", ConfigWorkspaceCost);
}

VolumeChoice.addEventListener("change", ConfigWorkspaceCost);


var run_mode = document.getElementsByClassName("runningMode");
var vol_pair = document.getElementsByClassName("volPair");
var myWorkspacePrices =
    [
        { "monthly": 7.25, "hourly": .3, "flat-monthly": 33 },
        { "monthly": 9.75, "hourly": .3, "flat-monthly": 35 },
        { "monthly": 13, "hourly": .3, "flat-monthly": 38 },
        { "monthly": 19, "hourly": .3, "flat-monthly": 44 }
    ];

function ConfigWorkspaceCost() {
    var hold_run_mode = "";
    for (var int = 0; int < run_mode.length; int++) {
        if (run_mode[int].checked)
            hold_run_mode = run_mode[int];
    }

    var hold_vol_pair = "";
    for (var int = 0; int < vol_pair.length; int++) {
        if (vol_pair[int].selected)
            hold_vol_pair = vol_pair[int];
    }
    switch (hold_vol_pair.getAttribute("id")) {
        case "volPair1":
            if (hold_run_mode.getAttribute("value") == "ALWAYS_ON")
                document.getElementById("setupCost").innerHTML = "Monthly Pricing: " + "$" + myWorkspacePrices[0]["flat-monthly"];
            else
                document.getElementById("setupCost").innerHTML = "$" + myWorkspacePrices[0]["monthly"] + " per month and " + "$" + myWorkspacePrices[0]["hourly"] + " hourly";
            break;
        case "volPair2":
            if (hold_run_mode.getAttribute("value") == "ALWAYS_ON")
                document.getElementById("setupCost").innerHTML = "Monthly Pricing: " + "$" + myWorkspacePrices[1]["flat-monthly"];
            else
                document.getElementById("setupCost").innerHTML = "$" + myWorkspacePrices[1]["monthly"] + " per month and " + "$" + myWorkspacePrices[1]["hourly"] + " hourly";
            break;
        case "volPair3":
            if (hold_run_mode.getAttribute("value") == "ALWAYS_ON")
                document.getElementById("setupCost").innerHTML = "Monthly Pricing: " + "$" + myWorkspacePrices[2]["flat-monthly"];
            else
                document.getElementById("setupCost").innerHTML = "$" + myWorkspacePrices[2]["monthly"] + " per month and " + "$" + myWorkspacePrices[2]["hourly"] + " hourly";
            break;
        case "volPair4":
            if (hold_run_mode.getAttribute("value") == "ALWAYS_ON")
                document.getElementById("setupCost").innerHTML = "Monthly Pricing: " + "$" + myWorkspacePrices[3]["flat-monthly"];
            else
                document.getElementById("setupCost").innerHTML = "$" + myWorkspacePrices[3]["monthly"] + " per month and " + "$" + myWorkspacePrices[3]["hourly"] + " hourly";
            break;
    }
}


//setup workspaces:

var setup = document.getElementById("configBtn");
setup.addEventListener("click", setupWorkspace);

function setupWorkspace() {

    let bodyObj = getInputsFromForm();


    let url = '../../api/SetupWorkspace/';
    let paramObj = {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(bodyObj)
    };

    fetch(url, paramObj)
        .then(data => console.log(data));
}

function getInputsFromForm() {
    //get bundleid
    let bundleId;
    let bundleList = document.getElementsByName("role");
    for (let i = 0; i < bundleList.length; i++) {
        if (bundleList[i].checked)
            bundleId = bundleList[i].getAttribute("value");
    }

    //get volume sizes
    let hold_vol_pair = "";
    for (let int = 0; int < vol_pair.length; int++) {
        if (vol_pair[int].selected)
            hold_vol_pair = vol_pair[int].getAttribute("value");
    }

    let sizes = hold_vol_pair.split(",");

    let rootSize = sizes[0];
    let userSize = sizes[1];

    //get running mode
    var hold_run_mode = "";
    for (let int = 0; int < run_mode.length; int++) {
        if (run_mode[int].checked)
            hold_run_mode = run_mode[int].getAttribute("value");
    }

    let hours = "";
    if (hold_run_mode === "AUTO_STOP") {
        let hoursChoices = document.getElementsByClassName("hours");
        for (let i = 0; i < hoursChoices.length; i++) {
            if (hoursChoices[i].selected)
                hours = hoursChoices[i].getAttribute("value");
        }
    }

    //get username
    let username = "";
    let usernameOptions = document.getElementsByClassName("username");
    for (let i = 0; i < usernameOptions.length; i++) {
        if (usernameOptions[i].selected)
            username = usernameOptions[i].getAttribute("value");
    }

    let directoryId = document.getElementsByName("directoryId")[0].getAttribute("value");

    let obj = {
        BundleId: bundleId,
        RootSize: rootSize,
        UserSize: userSize,
        RunMode: hold_run_mode,
        Hours: hours,
        UserName: username,
        DirectoryId: directoryId
    }

    return obj;
}

var bundleTimeStats = {

};

function getTimeStatsForBundle() {
    let bundleBtns = document.getElementsByName("role");
    for (let i = 0; i < bundleBtns.length; i++) {
        //alert(bundleBtns[i].getAttribute("value"))
        let url = "../../api/DB/attacksByBundleId/" + bundleBtns[i].getAttribute("value");
        fetch(url)
            .then(data => data.json())
            .then(data => {
                bundleTimeStats[bundleBtns[i].getAttribute("value")] = data;
            });
    }
}

function displayTimeStatsForBundle(e) {
    let bundleId = e.target.getAttribute("value");
    document.getElementById("meanTime").innerHTML = bundleTimeStats[bundleId][0];
    document.getElementById("medianTime").innerHTML = bundleTimeStats[bundleId][1];
}