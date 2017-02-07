exports.Protocol = Protocol;

var events = require('events');
var user = require('../user');
var server = require('../server');
var channel = require('../channel');
var net  = require('net');
var tls  = require('tls');

function Protocol(cfg) {
    this.users = [];
    this.servers = [];
    this.channels = [];
    this.socket = this.connect(cfg.port, cfg.server);
    this.sid = cfg.sid;
    this.host = cfg.host;
    this.password = cfg.password;
    this.desc = cfg.desc;
    this.uptime = Math.floor(Date.now() / 1000);
    events.EventEmitter.call(this);
}

Protocol.prototype = Object.create(events.EventEmitter.prototype);

Protocol.prototype.connect = function (port, server) {
    s = net.createConnection(port, server);
    return s;
}

Protocol.prototype.introduceChannel = function (data, splited) {
    var that = this;
    var c = new channel();
    c.name = splited[2];
    c.time = splited[3];
    c.setMode(splited[4]);
    c.ircd = that;

    this.channels[c.name] = c;

    return c;
}

Protocol.prototype.write = function(args) { 
    if (typeof args !== 'object') {
        var args = Array.prototype.slice.call(arguments);
    }

    this.socket.write(args.join(' ') + '\r\n');
};

Protocol.prototype.introduceServer = function (data, splited) {
    var s = new server();
    s.sid = splited[5];
    s.name = splited[2];
    s.desc = data.split(':')[2];

    this.servers[s.sid] = s;
    return s;
}

Protocol.prototype.destroyServer = function (splited, data) {
    s = this.findServer(splited[0]);
    if ( s !== undefined) {
        sid = s.sid;
        name = s.name;
        reason = data.split(':')[2];
        this.emit('server_destroy', name, reason, data);
        delete s;
        delete this.servers[sid];
    }   
}

Protocol.prototype.destroyChannel = function (c) {
    if ( c !== undefined) {
        delete this.channels[c.name];
        delete c;
    }   
}

Protocol.prototype.destroyUser = function (splited, data) {
    u = this.findUser(splited[0]);
    if (u) {
        uid = u.uid;
        nick = u.nick;
        reason = data.split(':')[2];
        this.emit('user_destroy', u.nick, reason, data);
        delete u;
        delete this.users[uid];
    }   
}

Protocol.prototype.findServer = function (sid)
{
    if (sid.charAt(0) == ":") {
        sid = sid.substring(1);
    }
    
    return this.servers[sid];
};

Protocol.prototype.introduceUser = function (data, splited) {
    
    s = this.findServer(splited[0]);
    
    uid = splited[2];
    
    if ( this.users[uid] !== undefined) {
        delete this.users[uid];
    }
    
    realname = data.split(':')[2];
    
    var u = new user();
    u.uid = splited[2];
    u.time = parseInt(splited[3]);
    u.nick = splited[4];
    u.host = splited[5];
    u.vhost = splited[6];
    u.ident = splited[7];
    u.ip = splited[8];
    u.setMode(splited[10]);
    u.realname = realname;
    u.server = s;
    
    this.users[uid] = u;
    
    return u;

}

Protocol.prototype.findChannel = function (name)
{
    if (name.charAt(0) == ":") {
        name = name.substring(1);
    }

    if (this.channels[name] instanceof channel) {
        return this.channels[name];  
    }
    
    return false;
};

Protocol.prototype.findUser = function (uid)
{
    
    if (uid.charAt(0) == ":") {
        uid = uid.substring(1);
    }
    
    return this.findUserByUid(uid);
};

Protocol.prototype.findUserByUid = function (uid)
{    
    for (i in this.users)
    {
        if ((this.users[i].uid == uid) && (this.users[i] instanceof user))
        {
            return this.users[i];
        }
    }

    return false;
};



Protocol.prototype.findUserByNick = function (nick)
{    
    for (i in this.users)
    {
        if (this.users[i].nick == nick)
        {
            return this.users[i];
        }
    }

    return undefined;
};

