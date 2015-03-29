var WebSocketServer = require('ws').Server,
    wss = new WebSocketServer({ port: 80});

var users = [];
var currentId = 1;

function User(name, ws) {
    this.name = name || '';
    this.id = currentId;
    this.connected = true;
    this.ws = ws;

    currentId++;
    users.push(this);
}

function Message(name, id, text, type) {
    this.type = type || 'message',
    this.id = id || null,
    this.name = name || 'Server',
    this.text = text || '',
    this.time = Date.now();
}

function removeUser(user) {
    var i = users.indexOf(user);
    if (i > -1) {
        users.splice(i, 1);
        broadcast('Server', null, user.name + ' has disconnected.', 'message');
    }
}

function getUser(name, id, ws) {
    for (var i = 0; i < users.length; i++) {
        if (name !== undefined && id !== undefined && users[i].name === name && users[i].id === id) {
            return users[i];
        } else if (users[i].ws === ws) {
            return users[i];
        }
    }
    return null;
}

function sendMessage(ws, name, id, text, type) {
    ws.send(JSON.stringify(new Message(name, id, text, type)));
}

function userList() {
    var list = '';
    for (var i = 0; i < users.length; i++) {
        list += users[i].name;
        if (i + 1 < users.length)
            list += ', ';
    }
    return list;
}

function broadcast(name, id, text, type) {
    wss.clients.forEach(function (client) {
        sendMessage(client, name, id, text, type);
    });
}

function formatMessage(name, time, message) {
    var timeStr = new Date(time);
    timeStr = timeStr.toLocaleTimeString();
    return '[' + name + ' | ' + timeStr + '] ' + message;
};

wss.on('connection', function (ws) {
    //console.log('connection opened');
    ws.on('message', function (data) {
        var msg = JSON.parse(data);
        //console.log('recieved: ' + data);
        if (msg.type === 'join') {
            console.log('user ' + msg.name + ' has joined');
            var u = new User(msg.name, ws);
            sendMessage(ws, 'Server', null, u.id + '', 'join');
            broadcast('Server', null, u.name + ' has joined the server!', 'message');
        } else if (msg.type === 'message') {
            console.log(formatMessage(msg.name, msg.time, msg.text));
            broadcast(msg.name, msg.id, msg.text, msg.type);
        } else if (msg.type === 'ping') {
            var u = getUser(msg.name, msg.id);
            u.connected = true;
        } else if (msg.type === 'leave') {
            var u = getUser(msg.name, msg.id);
            removeUser(u);
            broadcast('Server', null, msg.name + ' has left the server.', 'message');
            console.log(msg.name + ' has left the server');
            console.log('Users online: \n' + userList());
        } else if (msg.type === 'command') {
            switch (msg.text) {
                case 'list':
                    sendMessage(ws, 'Server', null, userList());
                    break;
                case 'time':
                    var str = new Date();
                    str = str.toISOString();
                    sendMessage(ws, 'Server', null, str);
                    break;
                case 'id':
                    sendMessage(ws, 'Server', null, msg.id);
                    break;
                case 'flash':
                    broadcast('Server', null, 'flash', 'command');
                    break;
                case 'help':
                    sendMessage(ws, 'Server', null, 'Available commands: list, time, id, flash');
                    break;
                default:
                    sendMessage(ws, 'Server', null, 'Unknown command.');
            }
        }
    });

    ws.on('error', function(e) {
        console.log(e.data);
    });
});

wss.on('error', function(e) {
    console.log(e.data);
});

setInterval(function () {
    for (var i = 0; i < users.length; i++) {
        var u = users[i];
        if (u.connected === false) {
            u.ws.close();
            removeUser(u);
        }
        u.connected = false;
        sendMessage(u.ws, 'Server', null, '', 'ping');
    }
}, 5000);
