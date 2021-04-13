let attack = {
    id: "",
    threatLevel: 0,
    attackerId: "",
    workspacesInvolved: []
}

let attacker = {
    id: "",
    ipList: [],
    name: "",
    maxThreatLevel: 0,
    attacks: []
}


let startTime = null;
let timer;
let isAttribCheckFinished = false;
let performingCleanup = false;
let rowCount = 1;  
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

// variables that hold results of async calls  
let bundles;
let workspaces;
let users;
let bundleTimeStats;


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
let directoryId = document.getElementsByName("directoryId")[0]                            //not necessary - rework code to get this automatically in IAWSService
let setupMean = document.getElementById("setupMean");
let setupMedian = document.getElementById("setupMedian");
let outerEnv = document.getElementById("outerEnv");
let outerEnvLabel = document.getElementById("outerEnvLabel");


function initBundleList() {
    return fetch('api/Resources/bundles');
}

function initWorkspaceList() {
    return fetch('api/Resources/allWorkspaces');
}

function initUserList() {
    return fetch('api/Resources/users');
}

function initMonitoringConsole() {
    let arr = [];
    arr.push(initBundleList());
    arr.push(initWorkspaceList());
    arr.push(initUserList());

    return new Promise((resolve, reject) => {
        Promise.all(arr)
            .then((data) => {
                console.log(data);

                bundles = data[0].json();
                workspaces = data[1].json();
                users = data[2].json();

                resolve(data != null);
            })
            .catch(err => reject(err));
    });
}

initMonitoringConsole()
    .then(wasSuccess => {
        return initBundleData();
    })
    .then(data => {
        bundleTimeStats = data;
        console.log("bundle time stats: " + JSON.stringify(bundleTimeStats));
    })
    .then(() => {
        refreshDeployTable();
    })
    .then(() => {
        return refreshServerState();
    })
    .then(() => {
        console.log("Server state has been refreshed")
        loopKeylogger();
    })
    .catch(err => console.error(err));


//refresh server's "cache" of commands on refresh or on new attack

function refreshServerState() {
    let url = "../../api/Keylog/";
    let paramObj = {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        }
    };

    return fetch(url, paramObj);
}

//main looping routine:

let getKeyloggerData = (function () {
    let count = 0;

    return function () {
        let url = '../../api/Keylog/';

        if (!performingCleanup) {  //stall getting more keylogs until attack context has switched
            return fetch(url)
                .then(data => data.json())
                .then(data => {
                    processKeylogs(data);
                })
                .then(() => {
                    console.log("count = " + count);

                    if (isAttribCheckFinished && !(count %= 6)) {                 //initAttackObjects sets isAttribCheckFinished. save initially and then at every minute  
                        count++;
                        return saveAttackLog()
                            .then(data => data.json())
                            .then((data) => {
                                attack = data.attack;
                                attacker = data.attacker;
                                console.log(JSON.stringify(data));
                                console.log("attacker: " + data.attacker);
                                console.log("attack: " + data.attack);

                                Promise.resolve(true);
                            })
                            .catch(() => alert("Saving attack log failed"));
                    }

                    if (isAttribCheckFinished)
                        count++;
                    Promise.resolve(true);
                })
                .catch((err) => console.error(err));
        }

    };

})();

function loopKeylogger() {
    getKeyloggerData()
        .then(complete => {
            setTimeout(loopKeylogger, 10000)
        })
        .catch(err => console.error(err));
}

function initBundleData() {

    return new Promise((resolve, reject) => {

        return bundles.then(data => {
            let url = "../../api/DB/prevAttackStats";
            let paramObj = {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(data)
            };

            return fetch(url, paramObj)
                .then(data => {
                    resolve(data.json());
                })
                .catch(err => {
                    console.error(err);
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

    for (let i = 0; i < data[0].length; /*spin until inner promise resolves*/) {
        if (data[0][i] != "") {
            initAttackObjects(data[0][i], data[1][i])                  //check every message to see if a new attack has begun. Assume only sequential attacks are possible.
                .then((data) => {
                    //console.log(data);
                    //console.log(data[0])
                    //console.log(data[1])   //promise returns original msg and time parameters
                    determineThreat(data[0], data[1]);
                    displayKeylogs(data[0], data[1]);
                })
                .catch(err => console.error(err))
                .finally(i++);
        }
        else
            i++;
    }

    rowCount += data[0].length;
    console.log("rowCount = " + rowCount);
}

function initAttackObjects(msg, time) {
    if (msg.length > 39 && msg.substring(0, 39) === "AWS Alert - possible WorkSpace attack. ") {
        if (attacker.ipList.length > 0) {                       //we are inside an attack and we need to switch contexts to set up environment for another attack.
            return switchAttacks(time) //return promise
                .then(wasSuccess => {
                    return setupNewAttack(msg, time);  //return promise containing data
                })
                .catch(err => {
                    console.error(err);
                    return Promise.reject();
                });
        }
        else {
            return setupNewAttack(msg, time);
        }
    }

    else if (msg.indexOf("New Workspace Access Alert. RDP was performed into environment:") >= 0) {
        let sub = msg.substring(msg.indexOf("\\") + 1);
        let i = msg.indexOf("\r");
        if (i >= 0) {

            sub = sub.substring(0, i).toLowerCase();     // t:"\r\nad\\jglass4\r\n'

            return new Promise((resolve, reject) => {
                workspaces.then(data => {
                    //console.log("Workspaces contains: ");
                    //console.log(JSON.stringify(data));
                    let myWorkspace = data.filter(ws => ws.userName.toLowerCase() == sub);
                    //console.log("in initAttackObjects. sub = " + sub);
                    //console.log("in initAttackObjects. myWorkspace: " + JSON.stringify(myWorkspace));


                    let checkPreExisting = attack.workspacesInvolved.find(obj => obj.workspaceId.toLowerCase() == myWorkspace);

                    if (!checkPreExisting) {
                        attack.workspacesInvolved.push({
                            workspaceId: myWorkspace[0].workspaceId,
                            startTime: time,
                            endTime: time,
                            bundleId: myWorkspace[0].bundleId
                        });
                    }
                    console.log("in initAttackObjects. ATTACK OBJECT SHOULD HAVE MULTIPLE WORKSPACES: " + JSON.stringify(attack));
                    resolve([msg, time]);
                })
                    .catch(err => {
                        console.error(err);
                        reject(null);
                    });
            });
        }
        else {
            console.log("In initAttackObjects: Error in parsing username involved in RDP attack. Incorrect string format.");
            return Promise.reject();
        }
    }

    return Promise.resolve([msg, time]);

}

function setupNewAttack(msg, time) {
    console.log("in setupNewAttack " + msg + time);

    let s = msg.substring(39);
    let tmpIP = s.substring(0, s.indexOf(' '));

    attacker.ipList.push({
        address: tmpIP,
        location: ""
    });

    s = s.substring(tmpIP.length + 1);
    let wsId = s.substring(0, s.indexOf(' '));

    let myRequests = [];

    let url = '../../api/Resources/workspaceById/' + wsId;
    myRequests.push(fetch(url));

    url = '../../api/DB/getAttacker/' + tmpIP;
    myRequests.push(fetch(url));

    return new Promise((resolve, reject) => {
        Promise.all(myRequests).then(responses => {
            console.log(responses)
            Promise.all([responses[0].json(), responses[1].json()])
                .then(data => {
                    attack.workspacesInvolved.push({
                        workspaceId: wsId,
                        startTime: startTime,
                        endTime: startTime,
                        bundleId: data[0].bundleId
                    });

                    displayAttackInfo(wsId, tmpIP, data[0].userName);

                    terminateNavBtn.addEventListener("click", displayTerminateOptions);    //duplicates are thrown out
                    terminateNavBtn.addEventListener("click", togglePopup);                //we don't want to terminate an attack until one already exists

                    attacker = data[1];
                    console.log("in getAttacker " + JSON.stringify(attacker));
                    initThreatScore(data[1]);


                    isAttribCheckFinished = true;
                    resolve([msg, time]);
                })
                .catch(err => {
                    console.error(err);
                    isAttribCheckFinished = true;
                    resolve([msg, time]);
                });
        });
    });
}

function displayKeylogs(notification, timeStamp) {
    let row = document.createElement("tr");
    row.innerHTML = "<td>" + notification + "</td><td>" + timeStamp + "</td>";
    keylogTable.append(row);
}

function displayAttackInfo(wsId, ip, username) {
    attackInfoRows[0].innerHTML = "<td>" + username + "</td>";
    attackInfoRows[1].innerHTML = "<td>" + wsId + "</td>";
    attackInfoRows[2].innerHTML = "<td>" + ip + "</td>";

}

function switchAttacks(time) {
    //clearTimeout(timer);
    performingCleanup = true;

    return new Promise((resolve, reject) => {
        saveAttackLog()
            .then(data => data.json())
            .then((data) => {
                attack = data.attack;
                attacker = data.attacker;
                console.log(JSON.stringify(data));
                console.log("attacker: " + data.attacker);
                console.log("attack: " + data.attack);
                return true;
            })
            .then(wasSuccess => {
                attack = {
                    id: "",
                    threatLevel: 0,
                    attackerId: "",
                    workspacesInvolved: []
                }

                attacker = {
                    id: "",
                    ipList: [],
                    name: "",
                    maxThreatLevel: 0,
                    attacks: []
                }

                console.log("in switch attack: globals cleared");

                startTime = time != null ? new Date(time) : null;   //null if we are responding to a logoff or shutdown -L command   
                isAttribCheckFinished = false;
                rowCount = 1;

                threatScore = 0;
                updateThreatLevel();

                return wasSuccess;
            })
            .then(() => {
                return initMonitoringConsole();
            })
            .then(wasSuccess => {
                return initBundleData();
            })
            .then(data => {
                bundleTimeStats = data;
                console.log("bundle time stats: " + JSON.stringify(bundleTimeStats));
            })
            .then(() => {
                return refreshServerState();
            })
            .then(() => {
                console.log("Server state has been refreshed");
                performingCleanup = false;
                resolve(true);
            })
            .catch(err => {
                console.error(err)
                reject(null);
            });

    });
}







//saveLog

function saveAttackLog() {
    console.log("in SAVE LOG. Attacker: \n" + JSON.stringify(attacker));
    console.log("in SAVE LOG. Attack: \n" + JSON.stringify(attack));

    let url = '../../api/DB/saveLog';

    let endTime = new Date();
    let date = endTime.getFullYear() + '-' + (endTime.getMonth() + 1) + '-' + endTime.getDate();
    let time = endTime.getHours() + ":" + endTime.getMinutes() + ":" + endTime.getSeconds();

    endTime = new Date(date + ' ' + time);

    for (let ws of attack.workspacesInvolved) {
        ws.endTime = endTime;               //we don't selectively stop a resource. As soon as it's deployed, it persists the entire attack
    }

    let paramObj = {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            Attack: attack,
            Attacker: attacker
        })
    };


    return fetch(url, paramObj);

}


//threat level indicator

function initThreatScore(data) {
    threatScore = data.maxThreatLevel;
    console.log("in initThreatScore: " + JSON.stringify(data))
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
    attack.threatLevel = threatScore;
    attacker.maxThreatLevel = threatScore;
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












//terminate

function displayTerminateOptions() {
    //console.log(workspaces);
    //console.log(JSON.stringify(workspaces))
    if (attack.workspacesInvolved.length > 0) {
        workspaces.then(data => {
            outerEnv.value = attack.workspacesInvolved[0].workspaceId;
            let outerWS = data.filter(ws => ws.workspaceId == outerEnv.value);
           
            outerEnvLabel.innerHTML = outerWS[0].userName;

            url = '../../api/Resources/availWorkspaces';
            let wsList;
            fetch(url)
                .then(data => data.json())
                .then(data => {
                    wsList = data;
                    populateTermForm(wsList); //generate checkboxes for workspaces and add them to popup
                })
                .catch(err => console.error(err));
        })
            .catch(err => console.error(err));

    }
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
        if (ws.workspaceId != outerEnv.value) {
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

    let url = '../../api/Resources/Terminate/';
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
        .then(saveAttackLog().then(data => data.json())
            .then((data) => {
                attack = data.attack;
                attacker = data.attacker;
                console.log(JSON.stringify(data));
                console.log("attacker: " + data.attacker);
                console.log("attack: " + data.attack);
            })
            .catch(() => alert("Saving attack log failed")))
        .catch(err => console.error(err));
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
    let url = '../../api/Resources/getDeployable';
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
    //bundleTimeStats.then(data => {
    //    let bundle = data.filter(b => b.bundleId === id);
    //    return bundle;
    //}).then(bundle => {
    //    if (bundle[0]) {
    //        mean.innerHTML = bundle[0].meanAttackDuration;
    //        median.innerHTML = bundle[0].medianAttackDuration;
    //    }
    //}).catch(err => console.error(err));

    if (bundleTimeStats) {
        let bundle = bundleTimeStats.filter(b => b.bundleId === id);
        if (bundle[0]) {
            mean.innerHTML = bundle[0].meanAttackDuration;
            median.innerHTML = bundle[0].medianAttackDuration;
        }
    }
}

function assignCostForWorkspace(ws, cost) {
    if (ws.workspaceProperties) {  //for newly created workspaces, this is null 
        let rootSize = ws.workspaceProperties.rootVolumeSizeGib;
        let userSize = ws.workspaceProperties.userVolumeSizeGib;
        let runningMode = ws.workspaceProperties.runningMode;

        if (!rootSize || !userSize || !runningMode) //for newly created workspaces, these can be null
            return;

        let value = workspacePricingTree[rootSize][userSize][runningMode.value];
        console.log(workspacePricingTree[rootSize][userSize][runningMode.value]);
        console.log(runningMode.value);
        if (value.length == 1) {
            cost.innerHTML = "$" + value[0] + "/month";
        }
        else {
            cost.innerHTML = "$" + value[0] + "/month + $" + value[1] + "/hour";
        }
    }
}

function toggleHoursSelector() {
    let sender = this; //e.target;
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
    let url = '../../api/Resources/Start/';
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
                setupCost.innerHTML = "$" + myWorkspacePrices[0]["monthly"] + "/month + " + "$" + myWorkspacePrices[0]["hourly"] + "/hour";
            break;
        case "volPair2":
            if (chosenRunMode.getAttribute("value") == "ALWAYS_ON")
                setupCost.innerHTML = "Monthly Pricing: " + "$" + myWorkspacePrices[1]["flat-monthly"];
            else
                setupCost.innerHTML = "$" + myWorkspacePrices[1]["monthly"] + "/month + " + "$" + myWorkspacePrices[1]["hourly"] + "/hour";
            break;
        case "volPair3":
            if (chosenRunMode.getAttribute("value") == "ALWAYS_ON")
                setupCost.innerHTML = "Monthly Pricing: " + "$" + myWorkspacePrices[2]["flat-monthly"];
            else
                setupCost.innerHTML = "$" + myWorkspacePrices[2]["monthly"] + "/month + " + "$" + myWorkspacePrices[2]["hourly"] + "/hour";
            break;
        case "volPair4":
            if (chosenRunMode.getAttribute("value") == "ALWAYS_ON")
                setupCost.innerHTML = "Monthly Pricing: " + "$" + myWorkspacePrices[3]["flat-monthly"];
            else
                setupCost.innerHTML = "$" + myWorkspacePrices[3]["monthly"] + "/month + " + "$" + myWorkspacePrices[3]["hourly"] + "/hour";
            break;
    }
}


////setup workspaces:


function setupWorkspace() {

    let bodyObj = getInputsFromForm();

    let url = '../../api/Resources/Create/';
    let paramObj = {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(bodyObj)
    };

    return fetch(url, paramObj)
        .then(data => {
            return data.json();
        })
        .catch(err => console.error(err));
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

    let obj = {
        BundleId: bundleId,
        RootSize: rootSize,
        UserSize: userSize,
        RunMode: chosenRunMode,
        Hours: hours,
        UserName: username,
        DirectoryId: directoryId.value //global
    }

    return obj;
}


function displayTimeStatsForBundle() {
    if (bundleTimeStats) {
        let bundle = bundleTimeStats.filter(b => b.bundleId === this.value);
        if (bundle[0]) {
            setupMean.innerHTML = bundle[0].meanAttackDuration ? bundle[0].meanAttackDuration + " Minutes" : "No Data";
            setupMedian.innerHTML = bundle[0].medianAttackDuration ? bundle[0].medianAttackDuration + " Minutes" : "No Data";
        }
    }
}




//Event listeners


termCompleteBtn.addEventListener("click", terminateWorkspaces);
saveLogBtn.addEventListener("click", () => {
    saveAttackLog()
        .then(data => data.json())
        .then((data) => {
            attack = data.attack;
            attacker = data.attacker;
            console.log(JSON.stringify(data));
            console.log("attacker: " + data.attacker);
            console.log("attack: " + data.attack);


        })
        .catch(() => alert("Saving attack log failed"));

});
setupNavBtn.addEventListener("click", togglePageView);


//deployNavBtn.addEventListener("click", toggleDeployMenu);

refreshDeployBtn.addEventListener("click", refreshDeployTable);

for (let i = 0; i < runningModeBtns.length; i++) {
    runningModeBtns[i].addEventListener("click", toggleHoursSelector)
}

volumeSelector.addEventListener("change", configWorkspaceCost);

generateBtn.addEventListener("click", function () {
    setupWorkspace()
        .then(data => {
            let userToRemove = Array.from(usernameOptions).filter(elem => elem.value == data.userName);
            console.log(userToRemove[0].value);
            userToRemove[0].remove();
            console.log("In eventlistener, in setupWorkspace callback. Pending request : " + JSON.stringify(data));
            initMonitoringConsole();
        })
        .catch(err => console.error(err));
});

for (let i = 0; i < roleBtnList.length; i++) {
    roleBtnList[i].addEventListener("click", displayTimeStatsForBundle);
}

