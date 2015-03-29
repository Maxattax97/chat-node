var WebSocketServer = require('ws').Server,
    wss = new WebSocketServer({ port: 8080});

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
        users[i] = null;
        users.splice(i, 1);
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
    if (users.length === 0)
        list = 'None';
    return list;
}

function broadcast(name, id, text, type) {
    users.forEach(function (client) {
        sendMessage(client.ws, name, id, text, type);
    });
}

function disconnect(user) {
    var name = user.name;
    try {
        user.ws.close();
    } catch (e) {
        console.error('[ERROR]: ' + e);
    }
    removeUser(user);
    broadcast('Server', null, name + ' has disconnected.', 'message');
    console.log('User ' + name + ' has disconnected.');
    console.log('Users online: ' + userList() + '.');
}

function formatMessage(name, time, message) {
    var timeStr = new Date(time);
    timeStr = timeStr.toLocaleTimeString();
    return '[' + name + ' | ' + timeStr + '] ' + message;
};

wss.on('connection', function (ws) {
    var scopeUser;

    ws.on('message', function (data) {
        var msg = JSON.parse(data);
        if (msg.type === 'join') {
            console.log('User ' + msg.name + ' has joined.');
            var u = new User(msg.name, ws);
            scopeUser = u;
            sendMessage(ws, 'Server', null, u.id + '', 'join');
            broadcast('Server', null, u.name + ' has joined the server!', 'message');
        } else if (msg.type === 'message') {
            console.log(formatMessage(msg.name, msg.time, msg.text));
            broadcast(msg.name, msg.id, msg.text, msg.type);
        } else if (msg.type === 'ping') {
            scopeUser.connected = true;
        } else if (msg.type === 'command') {
            console.log('User ' + msg.name + ' attempted to use the command /' + msg.text + '.');
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
        console.error('[ERROR]: ' + e);
    });

    ws.on('close', function(e) {
        if (getUser(scopeUser.name, scopeUser.id) !== null)
            disconnect(scopeUser);
    });
});

wss.on('error', function(e) {
    console.error('[ERROR]: ' + e);
});

setInterval(function () {
    for (var i = 0; i < users.length; i++) {
        var u = users[i];
        if (u.connected === false) {
            disconnect(u);
        } else {
            u.connected = false;
            sendMessage(u.ws, 'Server', null, '', 'ping');
        }
    }
}, 1000);
