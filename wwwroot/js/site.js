let attackData = {
    attackerIP: "",
    userName: "",
    workSpaceId: ""
};

let attacker = {
    _id: {},
    idAsString: "",
    ipList: [],
    name: "",
    prevMaxThreatLevel: "",
    attacks: []
};

let attackId = "";
let startTime = null;
let isAttribCheckFinished = false;
let performingCleanup = false;
let rowCount = 1; //pop client message indexing starts from 1.  
let bundleTimeStats;
let threatScore = 0;
let lastTimeSeen;

let cmdCommands = {
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

let stateDict = {
    "STOPPED": "text-stopped",
    "PENDING": "text-pending",
    "AVAILABLE": "text-available",
    "STARTING": "text-running",
    "TERMINATING": "text-terminating"
};

let myWorkspacePrices =
    [
        { "monthly": 7.25, "hourly": .3, "flat-monthly": 33 },
        { "monthly": 9.75, "hourly": .3, "flat-monthly": 35 },
        { "monthly": 13, "hourly": .3, "flat-monthly": 38 },
        { "monthly": 19, "hourly": .3, "flat-monthly": 44 }
    ];

let workspacePricingTree = {
    80: {
        10: {
            "AUTO_STOP": [7.25, 0.26],
            "ALWAYS_ON": [29]
        },
        50: {
            "AUTO_STOP": [9.75, 0.26],
            "ALWAYS_ON": [31]
        },
        100: {
            "AUTO_STOP": [13, 0.26],
            "ALWAYS_ON": [34]
        }
    },
    175: {
        100: {
            "AUTO_STOP": [19, 0.26],
            "ALWAYS_ON": [40]
        }
    }
}



// DOM elements
let keylogTable = document.getElementById("insertKeylogs");
let attackInfoRows = document.getElementById("insertAttackInfo").getElementsByTagName("tr");
let terminateNavBtn = document.getElementById("terminate");
let termCompleteBtn = document.getElementById("termComplete");
let saveLogBtn = document.getElementById("saveLog");
let threatIndicator = document.getElementById("threatLevel");
let popup = document.getElementById("popup_terminate");
let monitorView = document.getElementById("monitorView");
let setupView = document.getElementById("setupView");
let bottomContent = document.getElementById("bottomContent");
let deployMenu = document.getElementById("deployResourceMenu");
let setupNavBtn = document.getElementById("setup");
let deployNavBtn = document.getElementById("deploy");
let refreshDeployBtn = document.getElementById("refreshDeployBtn");
let deployTable = document.getElementById("deployTable");
let hoursSelector = document.getElementById("hoursSelector");
let deployable = document.getElementsByClassName('starting_ws');
let runningModeBtns = document.getElementsByClassName("runningMode");
let volumeSelector = document.getElementById("volume_choices");
let runningModes = document.getElementsByClassName("runningMode");
let volumePair = document.getElementsByClassName("volPair");
let setupCost = document.getElementById("setupCost");
let generateBtn = document.getElementById("generateBtn");
let roleBtnList = document.getElementsByName("role");
let hoursChoices = document.getElementsByClassName("hours");
let usernameOptions = document.getElementsByClassName("username");
let directoryId = document.getElementsByName("directoryId")                            //not necessary - rework code to get this automatically in IAWSService
let setupMean = document.getElementById("setupMean");
let setupMedian = document.getElementById("setupMedian");
let deployMean = document.getElementById("deployMean");
let deployMedian = document.getElementById("deployMedian");

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

let getKeyloggerData = (function () {
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
bundleTimeStats = initBundleData(); /*.then(data => {
    console.log(data)
});*/

function initBundleData() {
    let url = "../../api/DescribeResources/bundles";

    return new Promise((resolve, reject) => {
        fetch(url)
            .then(data => {
                return data.json();
            })
            .then(json => {
                let url = "../../api/DB/prevAttackStats";
                //console.log(json);

                let bundles = [];
                for (let item of json) {
                    bundles.push({
                        BundleId: item.bundleId,
                        Name: item.name,

                    });
                }

                let paramObj = {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(bundles)
                };


                fetch(url, paramObj)
                    //.then(data => {
                    //    return data.json()
                    //})
                    .then(bundles => {
                        //bundleTimeStats = bundles;
                        //console.log("bundle time stats are: ");
                        //console.log(bundleTimeStats);
                        //console.log(bundles.json());
                        resolve(bundles.json());
                    })
                    .catch(err => {
                        console.error(err)
                        reject(() => {
                            return null;
                        })
                    });
            })
            .catch(err => {
                console.error(err);
                reject(() => {
                    return null;
                })
            });
    });

}


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
    keylogTable.append(row);
}

function displayAttackInfo() {
    let url = '../../api/DescribeResources/userById/' + attackData.workSpaceId;
    fetch(url)
        .then(data => data.json())
        .then(data => {
            attackData.userName = data.username;
            attackInfoRows[0].innerHTML = "<td>" + attackData.userName + "</td>";
            attackInfoRows[1].innerHTML = "<td>" + attackData.workSpaceId + "</td>";
            attackInfoRows[2].innerHTML = "<td>" + attackData.attackerIP + "</td>";
        });
}

function switchAttacks(time) {
    performingCleanup = true;

    saveAttackLog();
    refreshServerState();
    bundleTimeStats = initBundleData();

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

function initThreatScore() {
    threatScore = attacker.prevMaxThreatLevel;
    console.log("in initThreatScore: " + JSON.stringify(attacker))
    console.log("initThreatScore: " + threatScore);
    updateThreatLevel();
}

function determineThreat(s, t) {
    for (var key in cmdCommands) {
        if (cmdCommands.hasOwnProperty(key)) {
            if (s.toLowerCase().indexOf(key) >= 0)
                threatScore += cmdCommands[key];
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
    popup.classList.toggle("active");
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
    monitorView.classList.toggle("hidden-view");
    setupView.classList.toggle("hidden-view");
}


function toggleDeployMenu() {
    bottomContent.classList.toggle("content-bottom-double");
    if (!deployMenu.classList.toggle("hidden-view"))
        refreshDeployTable();
}





function refreshDeployTable() {
    let url = '../../api/DescribeResources/getDeployable';
    fetch(url)
        .then(data => data.json())
        .then(data => makeDeployTable(data))
        .catch(err => console.error(err));
}

function makeDeployTable(data) {
    deployTable.innerHTML = "";    //clear previous markup

    let wsList = data.workspaces;
    let bDict = data.bundles;

    for (let i = 0; i < wsList.length; i++) {
        let ws = wsList[i];

        let row = document.createElement("tr");
        let role = document.createElement("td");
        let username = document.createElement("td");
        let status = document.createElement("td");
        let mean = document.createElement("td");
        let median = document.createElement("td");
        let cost = document.createElement("td");
        let ckbox = document.createElement("td");

        role.innerHTML = bDict[ws.bundleId] === undefined ? "" : bDict[ws.bundleId];
        username.innerHTML = ws.userName;

        let stateSpan = document.createElement("span");
        let spanClass = stateDict[ws.state.value] === undefined ? "text-black" : stateDict[ws.state.value];
        stateSpan.classList.add(spanClass);
        stateSpan.innerHTML = ws.state.value;
        status.appendChild(stateSpan);

        assignBundleTimeStats(ws.bundleId, mean, median);
        assignCostForWorkspace(ws, cost);

        let inputTag = document.createElement("input");
        inputTag.setAttribute("type", "checkbox");

        //inputTag.setAttribute("id", ws.workspaceId);
        inputTag.setAttribute("value", ws.workspaceId);

        if (ws.workspaceProperties.runningMode.value != "AUTO_STOP" || ws.state.value != "STOPPED") {
            inputTag.disabled = true;
        }
        else {
            inputTag.classList.add("starting_ws");
            //inputTag.addEventListener("click", displayTimeStatsForBundle);
        }

        ckbox.appendChild(inputTag);
        row.appendChild(role);
        row.appendChild(username);
        row.appendChild(status);
        row.appendChild(mean);
        row.appendChild(median);
        row.appendChild(cost);
        row.appendChild(ckbox);

        deployTable.appendChild(row);
    }
}

function assignBundleTimeStats(id, mean, median) {
    bundleTimeStats.then(data => {
        let bundle = data.filter(b => b.bundleId === id);
        return bundle;
    }).then(bundle => {
        if (bundle[0]) {
            mean.innerHTML = bundle[0].meanAttackDuration;
            median.innerHTML = bundle[0].medianAttackDuration;
        }
    }).catch(err => console.error(err));
}

function assignCostForWorkspace(ws, cost) {
    let rootSize = ws.workspaceProperties.rootVolumeSizeGib;
    let userSize = ws.workspaceProperties.userVolumeSizeGib;
    let runningMode = ws.workspaceProperties.runningMode;
    let value = workspacePricingTree[rootSize][userSize][runningMode.value];
    console.log(workspacePricingTree[rootSize][userSize][runningMode.value]);
    console.log(runningMode.value);
    if (value.length == 1) {
        cost.innerHTML = "$" + value[0] + " monthly (already incurred)";
    }
    else {
        cost.innerHTML = "$" + value[0] + " monthly (already incurred), plus $" + value[1] + " per hour";
    }
}

function toggleHoursSelector(e) {
    let sender = e.target;
    if (sender.getAttribute("value") === "ALWAYS_ON") {
        hoursSelector.classList.add("hidden-view");
    }
    else {
        hoursSelector.classList.remove("hidden-view");
    }

    configWorkspaceCost();
}


function deploySelected() {
    var myList = [];
    console.log(deployable)
    for (let i = 0; i < deployable.length; i++) {
        if (deployable[i].checked) {
            myList.push(deployable[i].getAttribute("value"));
        }
    }
    let url = '../../api/StartWorkspaces/';
    let paramObj = {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            StartWorkspaceList: myList
        })
    };

    fetch(url, paramObj)
        .then(data => data.json())
        .then(data => {
            console.log("in deploySelected: " + JSON.stringify(data));
        })
        .catch(err => console.error(err));

}


function configWorkspaceCost() {
    let chosenRunMode;

    for (let i = 0; i < runningModes.length; i++) {
        if (runningModes[i].checked)
            chosenRunMode = runningModes[i];
    }

    var chosenVolumes = "";
    for (var int = 0; int < volumePair.length; int++) {
        if (volumePair[int].selected)
            chosenVolumes = volumePair[int];
    }
    switch (chosenVolumes.getAttribute("id")) {
        case "volPair1":
            if (chosenRunMode.getAttribute("value") == "ALWAYS_ON")
                setupCost.innerHTML = "Monthly Pricing: " + "$" + myWorkspacePrices[0]["flat-monthly"];
            else
                setupCost.innerHTML = "$" + myWorkspacePrices[0]["monthly"] + " per month and " + "$" + myWorkspacePrices[0]["hourly"] + " hourly";
            break;
        case "volPair2":
            if (chosenRunMode.getAttribute("value") == "ALWAYS_ON")
                setupCost.innerHTML = "Monthly Pricing: " + "$" + myWorkspacePrices[1]["flat-monthly"];
            else
                setupCost.innerHTML = "$" + myWorkspacePrices[1]["monthly"] + " per month and " + "$" + myWorkspacePrices[1]["hourly"] + " hourly";
            break;
        case "volPair3":
            if (chosenRunMode.getAttribute("value") == "ALWAYS_ON")
                setupCost.innerHTML = "Monthly Pricing: " + "$" + myWorkspacePrices[2]["flat-monthly"];
            else
                setupCost.innerHTML = "$" + myWorkspacePrices[2]["monthly"] + " per month and " + "$" + myWorkspacePrices[2]["hourly"] + " hourly";
            break;
        case "volPair4":
            if (chosenRunMode.getAttribute("value") == "ALWAYS_ON")
                setupCost.innerHTML = "Monthly Pricing: " + "$" + myWorkspacePrices[3]["flat-monthly"];
            else
                setupCost.innerHTML = "$" + myWorkspacePrices[3]["monthly"] + " per month and " + "$" + myWorkspacePrices[3]["hourly"] + " hourly";
            break;
    }
}


//setup workspaces:


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
    let bundleId;

    for (let i = 0; i < roleBtnList.length; i++) {
        if (roleBtnList[i].checked)
            bundleId = roleBtnList[i].getAttribute("value");
    }

    let chosenVolumes;
    for (let i = 0; i < volumePair.length; i++) {
        if (volumePair[i].selected)
            chosenVolumes = volumePair[i].getAttribute("value");
    }

    let sizes = chosenVolumes.split(",");

    let rootSize = sizes[0];
    let userSize = sizes[1];

    let chosenRunMode;
    for (let i = 0; i < runningModes.length; i++) {
        if (runningModes[i].checked)
            chosenRunMode = runningModes[i].getAttribute("value");
    }

    let hours;
    if (chosenRunMode === "AUTO_STOP") {
        for (let i = 0; i < hoursChoices.length; i++) {
            if (hoursChoices[i].selected)
                hours = hoursChoices[i].getAttribute("value");
        }
    }

    //get username
    let username;
    for (let i = 0; i < usernameOptions.length; i++) {
        if (usernameOptions[i].selected)
            username = usernameOptions[i].getAttribute("value");
    }

    directoryId[0].getAttribute("value");

    let obj = {
        BundleId: bundleId,
        RootSize: rootSize,
        UserSize: userSize,
        RunMode: chosenRunMode,
        Hours: hours,
        UserName: username,
        DirectoryId: directoryId
    }

    return obj;
}


function displayTimeStatsForBundle() {
    bundleTimeStats.then(data => {
        let bundle = data.filter(b => b.bundleId === this.value);
        return bundle;
    }).then(bundle => {
        if (bundle[0]) {
            setupMean.innerHTML = bundle[0].meanAttackDuration;
            setupMedian.innerHTML = bundle[0].medianAttackDuration;
        }
    }).catch(err => console.error(err));
}




//Event listeners

terminateNavBtn.addEventListener("click", displayTerminateOptions);
terminateNavBtn.addEventListener("click", togglePopup);
termCompleteBtn.addEventListener("click", terminateWorkspaces);
saveLogBtn.addEventListener("click", saveAttackLog);
setupNavBtn.addEventListener("click", togglePageView);
deployNavBtn.addEventListener("click", toggleDeployMenu);
refreshDeployBtn.addEventListener("click", refreshDeployTable);

for (let i = 0; i < runningModeBtns.length; i++) {
    runningModeBtns[i].addEventListener("click", configWorkspaceCost);
}

volumeSelector.addEventListener("change", configWorkspaceCost);
generateBtn.addEventListener("click", setupWorkspace);

for (let i = 0; i < roleBtnList.length; i++) {
    roleBtnList[i].addEventListener("click", displayTimeStatsForBundle);
}

