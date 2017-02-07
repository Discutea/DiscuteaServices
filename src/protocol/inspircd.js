exports.Ircd= Ircd;

var protocol = require('./protocol');
var channel = require('../channel');

function Ircd(cfg) {
    var that = this;
    protocol.Protocol.call(this, cfg);
    this.socket.on('connect', function () {
        that.run();
    });
}

Ircd.prototype = Object.create(protocol.Protocol.prototype);

Ircd.prototype.run = function () {
    var that = this;
    that.write("CAPAB START 1202");
    that.write("CAPAB CAPABILITIES :PROTOCOL=1202");
    that.write("CAPAB END");
    that.write('SERVER', this.host, this.password, '0', this.sid, ':' + this.desc);
    that.send('BURST', this.uptime);
    that.send('ENDBURST');

    that.socket.on('data', function (data) {
        args = data.toString().split(/\n|\r/);
        args.forEach(function(arg) {
            that.dispatcher(arg);
        });
    });
}

Ircd.prototype.dispatcher = function (data) {
    splited = data.split(' ');
    splited2 = data.split(':');

    switch (splited[1]) {
        case 'PING':
            this.send('PONG', this.sid, splited[2]);
            this.emit('ping', data);
            break;
        case 'UID':
            this.processIntroduceUser(splited, splited2);
            break;
        case 'QUIT':
            this.processDestroyUser(splited, splited2);
            break;
        case 'SERVER':
            this.processIntroduceServer(splited, splited2);
            break;
        case 'FJOIN':
            this.processChannelJoin(splited, splited2);
            break;
        case 'AWAY':
            this.processUserAway(splited, splited2);
            break;
        case 'TOPIC':
            this.processTopic(splited, splited2);
            break;
        case 'NICK':
            this.processNick(splited);
            break;
        case 'PART':
            this.processChannelPart(splited, splited2);
            break;
        case 'KICK':
            this.processKick(splited, splited2);
            break;
        case 'END':
            if (splited[0] == 'CAPAB') {
                this.emit('ircd_ready', data);
            }
            break;
        case 'ERROR':
            this.emit('error', data);
            console.log(data);
            break;
        case 'METADATA':
            this.processIRCv3(splited, splited2, data);
            break;
        case 'PRIVMSG':
            this.emit('privmsg', data);
            break;
        default:
           // console.log(data);
            break;
    }
    
};

Ircd.prototype.processKick = function (splited, splited2) {
    u = this.findUser(splited[0]);
    target = this.findUser(splited[3]);
    c = this.findChannel(splited[2]);
    reason = splited2[2];
    
    if ((u !== undefined) && (target !== undefined) && (c !== undefined)) {
        this.executeKick(u, target, c, reason);
    }
}

Ircd.prototype.processChannelPart = function (splited, splited2) {
    u = this.findUser(splited[0]);
    c = this.findChannel(splited[2]);
   
    if ((u !== undefined) && (c !== undefined)) {
        this.executeChannelPart(c, u);
    }
}

Ircd.prototype.processNick = function (splited) {
    u = this.findUser(splited[0]);
            
    if (u !== undefined) {
        newNick = splited[2];
        this.executeNick(u, newNick);
    }
}

Ircd.prototype.processTopic = function (splited, splited2) {
    u = this.findUser(splited[0]);
    c = this.findChannel(splited[2]);
    if ((u !== undefined) && (c !== undefined)) {
        newTopic = splited2[2];
        this.executeTopic(c, u, newTopic);
    }
}

Ircd.prototype.processUserAway = function (splited, splited2) {
    u = this.findUser(splited[0]);
    if (u !== undefined) {
        awayMsg = splited2[2];
        this.executeUserAway(u, awayMsg);
    }
}

Ircd.prototype.processDestroyUser = function (splited, splited2) {
    u = this.findUser(splited[0]);
    reason = splited2[2];

    if (u !== undefined) {
        this.destroyUser(u, reason);
    }
}

Ircd.prototype.processChannelJoin = function (splited, splited2) {
    var that = this;
    var c = this.findChannel(splited[2]);
    
    if (!c) {
        name = splited[2];
        uptime = splited[3];
        modes = splited[4];
    
        c = this.introduceChannel(name, uptime, modes);
    }
    
    cusers = splited2[2].split(',');

    cusers.forEach(function(arg) {
        split = arg.split(' ');
        uid = split[0];
        if (uid.length == 9) {
            u = that.findUser(uid);
            if (u !== undefined) {
                that.channelJoin(u, c);
            }
        }
    });
}

Ircd.prototype.processIntroduceServer = function (splited, splited2) {
    sid = splited[5];
    name = splited[2];
    desc = splited2[2];
    
    this.introduceServer(sid, name, desc);
}

Ircd.prototype.processIntroduceUser = function (splited, splited2) {
    s = this.findServer(splited[0]);
    uid = splited[2];
    nick = splited[4];
    ident = splited[7];
    host = splited[5];
    vhost = splited[6];
    ip = splited[8];
    uptime = parseInt(splited[3]);
    realname = splited2[2];
    modes = splited[10];
    
    this.introduceUser(uid, nick, ident, host, vhost, ip, uptime, realname, s, modes);
}

Ircd.prototype.introduceBot = function (bot) {
    bot.setIrcd(this);
    this.send('UID', bot.me, bot.uptime, bot.nick, this.host, bot.vhost, bot.ident, bot.ip, bot.uptime, bot.modes, ':' + bot.realname);
}

Ircd.prototype.send = function() {
    var args = Array.prototype.slice.call(arguments);
    args.splice(0, 0, ':' + this.sid);
    this.write(args);
};

Ircd.prototype.findUser = function (uid)
{      
    return this.findBy(this.users, 'uid', uid);
};

Ircd.prototype.findServer = function (sid)
{      
    return this.findBy(this.servers, 'sid', sid);
};

Ircd.prototype.findChannel = function (name)
{      
    return this.findBy(this.channels, 'name', name);
};

Ircd.prototype.processIRCv3 = function (splited, splited2, data) {
    switch (splited[3]) {
        case 'accountname':
            u = this.findUser(splited[2]);
            if (u !== undefined) {
                account = splited2[2];
                this.processIRCv3AccountName(u, account);
            }
            break;
        case 'filter':
            break;
        default:
           // console.log(data);
            break;
    }
}
