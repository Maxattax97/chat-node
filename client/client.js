// CONFIGURATION
var name;
var id;

var nameTag;
var chatLog;
var chatBar;
var chatSend;
var form;

var url = 'ws://vm.codefromjames.com:8080';
var ws;

// CORE
function Message(name, id, text, type) {
    this.type = type || "message",
    this.id = id || null,
    this.name = name || randomizeName(),
    this.text = text || "",
    this.time = Date.now();
}

function randomizeName() {
    var adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    var noun = nouns[Math.round(Math.random() * nouns.length)];
    adj =   adj.charAt(0).toUpperCase() + adj.slice(1);
    noun = noun.charAt(0).toUpperCase() + noun.slice(1);
    return adj + " " + noun;
}


function initialize(nm) {
    nameTag = document.getElementById("nameTag");
    chatLog = document.getElementById("chatLog");
    chatBar = document.getElementById("chatBar");
    chatSend = document.getElementById("chatSend");
    form = document.getElementById("form");

    //chatLog.value = "";

    if (nm === undefined || nm === null) {
        var randomName = randomizeName();
        name = prompt("Enter an alias:", randomName) || randomName;
    } else
        name = nm;
    nameTag.innerHTML = name + ":";
    chatLog.value += "Connecting...";

    ws = new WebSocket(url);

    function sendMessage(name, id, text, type) {
        var msg = new Message(name, id, text, type);
        console.log(msg);
        ws.send(JSON.stringify(msg));
    }

    ws.onopen = function() {
        sendMessage(name, null, "", "join");
    }

    ws.onclose = function() {
        writeLog('Client', Date.now(), 'Connection lost.\n');
        initialize(name);
    }

    ws.onmessage = function(e) {
        var msg = JSON.parse(e.data);
        console.log(msg);
        if (msg.type === "join") {
            id = Number(msg.text);
            console.log(id);
        } else if (msg.type === "ping") {
            sendMessage(name, id, "", "ping");
        } else if (msg.type === "message") {
            writeLog(msg.name, msg.time, msg.text);
        } else if (msg.type === "command") {
            switch (msg.text) {
                case 'flash':
                    document.body.style.background = "#000000";
                    setTimeout(function() {
                        document.body.style.background = "#ffffff";
                    }, 100);
                    break;
            }
        }
    }

    function writeLog(name, time, message) {
        var timeStr = new Date(time);
        timeStr = timeStr.toLocaleTimeString();
        chatLog.value += "\n[" + name + " | " + timeStr + "] " + message;
        chatLog.scrollTop = chatLog.scrollHeight;
    };

    chatBar.onkeypress = function(e) {
        var event = e || window.event;
        var keyCode = event.which || event.keyCode;

        if (keyCode == '13') {
          submit();// Enter
        }
    }

    chatSend.onclick = function() {
        submit();
    }

    function submit() {
        if (ws.readyState == WebSocket.OPEN) {
            if (chatBar.value.trim().length > 0) {
                if (chatBar.value.charAt(0) === '/') {
                    var msg = chatBar.value.substring(1);
                    sendMessage(name, id, msg, 'command');
                } else
                    sendMessage(name, id, chatBar.value, 'message');
                chatBar.value = "";
            } else {
                chatBar.value = "";
            }
        } else {
            alert("The server is currently not responding.");
        }
        return false;
    }

    window.onbeforeunload = function() {
        ws.onclose = function () {}; // Disable onclose event
        ws.close();
    };
}
