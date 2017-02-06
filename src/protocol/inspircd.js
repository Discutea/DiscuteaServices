exports.Ircd= Ircd;

var events = require('events');
var user = require('../user');
var server = require('../server');
var channel = require('../channel');
var net  = require('net');
var tls  = require('tls');

function Ircd(cfg) {
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

Ircd.prototype = Object.create(events.EventEmitter.prototype);

Ircd.prototype.connect = function (port, server) {
    var that = this;
    
    s = net.createConnection(port, server);
    s.on('connect', function () {
        s.write("CAPAB START 1202\r\n");
        s.write("CAPAB CAPABILITIES :PROTOCOL=1202\r\n");
        s.write("CAPAB END\r\n");
        that.sendServer();
    });
    
    return s;
}

Ircd.prototype.sendServer = function () {
    this.socket.write('SERVER ' + this.host + ' ' + this.password + ' 0 ' + this.sid + ' :' + this.desc +'\r\n');             
    this.socket.write(':'+this.sid+' BURST '+this.uptime +'\r\n');
    this.socket.write(':'+this.sid+' ENDBURST\r\n')

    var that = this;
       
    this.socket.addListener('data', function (data) { 
        args = data.toString().split(/\n|\r/);
        args.forEach(function(arg) {
            that.dispatcher(arg);
        });
    });

};  

Ircd.prototype.introduceBot = function (bot) {
    bot.setIrcd(this);
    this.socket.write(':'+this.sid+' UID '+this.sid+bot.uid + ' '+bot.uptime+' ' + bot.nick + ' node.discutea.com nodejjj.discutea.com Discutea 127.0.0.1 '+bot.uptime+' +IWBOiows +*:99 M Service\r\n');
}
    
Ircd.prototype.dispatcher = function (data) {
    splited = data.split(' ');
    splited2 = data.split(':');
    switch (splited[1]) {
        case 'PING':
            this.socket.write(':' + this.sid + ' PONG ' + this.sid + ' ' + splited[2] + '\r\n');   
            this.emit('ping', data);
            break;
        case 'END':
            if (splited[0] == 'CAPAB') {
                this.emit('ircd_ready', data);
            }
            break;
        case 'ERROR':
            console.log(data);
            break;
        case 'MODE':
            u = this.findUser(splited[0]);
            u.setMode(splited2[2]);
            this.emit('user_mode', u, splited[2]);
            break;
        case 'UID':
            u = this.introduceUser(data, splited);
            this.emit('user_connect', u);
            break;
        case 'PRIVMSG':
            this.emit('privmsg', data);
            break;
        case 'QUIT':
            this.destroyUser(splited, data);
            break;
        case 'SERVER':
            s = this.introduceServer(data, splited);
            this.emit('server_connect', s);
            break;
        case 'FJOIN':
            c = this.findChannel(splited[2]);
            if (c === undefined) {
                this.emit('introduce_channel', c);
                c = this.introduceChannel(data, splited, splited2);
            }
            cusers = splited2[2].split(',');
            c.addUsers(cusers);            
            break;
        case 'PART':
            u = this.findUser(splited[0]);
            c = this.findChannel(splited[2]);
            if ((c !== undefined) && (u !== undefined)) {
                u.removeChannel(c);
            }

        //:52FAFS3PD PART #Node.Js :Leaving
            console.log(data);
            break;
        default:
           // console.log(data);
            break;
    }
    
};    


Ircd.prototype.introduceChannel = function (data, splited) {
    var that = this;

    var c = new channel();
    c.name = splited[2];
    c.time = splited[3];
    c.setMode(splited[4]);
    c.ircd = that;

    this.channels[c.name] = c;

    return c;
}

Ircd.prototype.introduceServer = function (data, splited) {
    var s = new server();
    s.sid = splited[5];
    s.name = splited[2];
    s.desc = data.split(':')[2];

    this.servers[s.sid] = s;
    return s;
}

Ircd.prototype.destroyServer = function (splited, data) {
    s = this.findServer(splited[0]);
    if ( s !== undefined) {
        sid = s.sid;
        name = s.name;
        reason = data.split(':')[2];
        this.emit('server_disconnect', name, reason, data);
        delete s;
        delete this.servers[sid];
    }   
}

Ircd.prototype.destroyUser = function (splited, data) {
    u = this.findUser(splited[0]);
    if ( u !== undefined) {
        uid = u.uid;
        nick = u.nick;
        reason = data.split(':')[2];
        this.emit('user_disconnect', u.nick, reason, data);
        delete u;
        delete this.users[uid];
    }   
}

Ircd.prototype.findServer = function (sid)
{
    if (sid.charAt(0) == ":") {
        sid = sid.substring(1);
    }
    
    return this.servers[sid];
};

Ircd.prototype.introduceUser = function (data, splited) {
    
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

Ircd.prototype.findChannel = function (name)
{
    if (name.charAt(0) == ":") {
        name = name.substring(1);
    }
    
    return this.channels[name];
};

Ircd.prototype.findUser = function (uid)
{
    if (uid.charAt(0) == ":") {
        uid = uid.substring(1);
    }
    
    return this.users[uid];
};

Ircd.prototype.findUserByNick = function (nick)
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

