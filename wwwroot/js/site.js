//display attack data
var placeToInsert = document.getElementById("placeToInsert");
var rowCount = 1; //pop client message indexing starts from 1.  rowCount holds index of next message to be read
var attackData = {
    attackerIP: "",
    userName: "",
    workSpaceId: ""
};

var populateDisplay = async function () {
    let url = '../../api/KeyEvents/' + rowCount; //rowCount;
    await fetch(url)
        .then(data => data.json())
        .then(data => renderTable(data))
        .catch(handleNull);

    setTimeout(populateDisplay, 5000);
};

var renderTable = function (data) {
    let keystrokes = data[0];
    let times = data[1];
    for (let i = 0; i < data[0].length; i++) {
        if (data[0][i] != "") {
            let row = document.createElement("tr");
            if (attackData.attackerIP === "")
                parseMessage(data[0][i]);

            determineThreat(data[0][i]);

            row.innerHTML = "<td>" + data[0][i] + "</td><td>" + data[1][i] + "</td><td>" + attackData.userName +
                "</td><td>" + attackData.workSpaceId + "</td><td>" + attackData.attackerIP;
            placeToInsert.append(row);
        }
    }
    rowCount += data[0].length;
    console.log(rowCount);
}

var parseMessage = function (msg) {
    if (msg.length > 39 && msg.substring(0, 39) === "AWS Alert - possible WorkSpace attack. ") {
        let s = msg.substring(39);
        attackData.attackerIP = s.substring(0, s.indexOf(' '));
        s = s.substring(attackData.attackerIP.length + 1); //check this

        attackData.workSpaceId = s.substring(0, s.indexOf(' '));
        s = s.substring(attackData.workSpaceId.length + 1);

        attackData.userName = s;
    }
}

var handleNull = function () {
    alert("Unable to connect to Pop3 server. Check server authentication permissions.");
}

populateDisplay();

//terminate
var terminate_bttn = document.getElementById("terminate");
terminate_bttn.addEventListener("click", terminateWorkspace);

function showPopup() {
    alert("The workspace has been terminated.");
}

function terminateWorkspace() {
    let url = '../../api/TerminateWorkspace/';
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

//saveLog
var saveLog = document.getElementById("saveLog");
saveLog.addEventListener("click", saveAttackData);

function saveAttackData() {
    let url = '../../api/SaveLog/';
    let paramObj = {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({    //later we can perform an initial GET to a service that gives us these parameters
            Username: attackData.userName,
            AttackerIP: attackData.attackerIP,
            WorkspaceId: attackData.workSpaceId, 
            Keystrokes: []
        })
    };

    fetch(url, paramObj)
        .then(data => data.json())
        .then(data => JSON.stringify(data))
        .then(data => alert(data))
        .catch(() => alert("something wrong"));
        
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
var threatIndicator = document.getElementById("threatLevel");

var determineThreat = function (s) {
    if (threatScore < 100) {
        if (s.indexOf("powershell") >= 0)
            threatScore += 100;

        let sub = s;
        let index;

        while (threatScore < 200 && ((index = sub.indexOf("cd ") >= 0 || sub.indexOf("dir") >= 0))) {
            threatScore += (threatScore >= 50) ? 5 : 1;
            sub = sub.substring(index + 3);
        }

        console.log(threatScore);
        updateThreatLevel();
    }
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

    console.log(threatIndicator.innerHTML);
}
