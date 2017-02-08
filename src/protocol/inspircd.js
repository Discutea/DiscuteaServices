exports.Ircd= Ircd;

var protocol = require('./protocol');
var channel = require('../channel');
var user = require('../user');
var server = require('../server');
var bot = require('../bot');

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
        case 'SQUIT':
            this.processDestroyServer(splited, splited2);
            break;
        case 'SERVER':
            this.processIntroduceServer(splited, splited2);
            break;
        case 'JOIN':
            this.processChannelJoin(splited, splited2);
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
        case 'FTOPIC':
            this.processIntroduceTopic(splited, splited2);
            break;
        case 'FNAME':
            this.processRealname(splited, splited2);
            break;
        case 'MODE':
            this.processMode(splited, splited2);
            break;
        case 'FMODE':
            this.processFmode(splited, splited2);
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

Ircd.prototype.processTopic = function (splited, splited2) {
    u = this.findUser(splited[0]);
    c = this.findChannel(splited[2]);
    
    if ((u instanceof user) && (c instanceof channel)) {
        newTopic = splited2[2];
        this.executeTopic(c, u, newTopic);
    }
}

Ircd.prototype.processMode = function (splited, splited2) {
    u = this.findUser(splited[2]);
    
    //:52FAAAE38,MODE,52FAAAE38,:-R
    
    if (!(u instanceof user)) {
        console.log('MODE ==> ' + splited);
        return;
    }
    
    u.setMode(splited2[2]);
}

Ircd.prototype.processFmode = function (splited, splited2) {    
    c = this.findChannel(splited[2]);
    if (!(c instanceof channel)) {return;}
    
    if (splited[5] === undefined) {
        return c.setMode(splited2[2]);
    }
    
    var by = "--";
    
    s = this.findServer(splited[0]);

    if (s instanceof server) {
        by = s.name;
    } else {
        u = this.findUser(splited[0]);
        if (u instanceof user) {
            if ( (typeof u.account === 'string') && (account.length > 0) ) {
                by = u.account;
            } else {
                by = u.nick;
            }
        }
    }
    
    time = splited[3];
    modes = splited.slice(4, splited.length);
    this.parseFmode(c, by, time, modes);
}

Ircd.prototype.parseFmode = function (c, by, time, modes) {
    if ( (!(c instanceof channel)) || (!(typeof modes === 'object')) ) {return;}

    var fmodes = modes[0];
    var addmode; // intention add or del mode
    var x = 0;

    for (i in fmodes)
    {
        if (fmodes[i] === '+') {
            addmode = true;
            x++;
        } else if (fmodes[i] === '-') {
            addmode = false;
            x++;
        } else {
            pos = +i - +x + 1;
            target = modes[pos];
            
            if ( (typeof target === 'string') && (target.charAt(0) == ":") ) {
                target = target.substring(1);
            }
            
            u = this.findUser(target);
            if (u instanceof user) {
                target = u;
            }
            
            this.executeChannelMode(c, by, time, fmodes[i], target, addmode);
        }
    }
}

Ircd.prototype.processRealname = function (splited, splited2) {
    u = this.findUser(splited[0]);
    if (u instanceof user) {
        realname = splited2[2];
        this.executeRealname(u, realname);
    }
}

Ircd.prototype.processIntroduceTopic = function (splited, splited2) {
    c = this.findChannel(splited[2]);

    if (c instanceof channel) {
        topicAt = splited[3];
        topicBy = splited[4];
        topic = splited2[2];
        
        this.executeIntroduceTopic(c, topicAt, topicBy, topic);
    }
}

Ircd.prototype.processKick = function (splited, splited2) {
    u = this.findUser(splited[0]);
    target = this.findUser(splited[3]);
    c = this.findChannel(splited[2]);

    if ((u instanceof user) && (target instanceof user) && (c instanceof channel)) {
        reason = splited2[2];
        this.executeKick(u, target, c, reason);
    }
}

Ircd.prototype.processChannelPart = function (splited, splited2) {
    u = this.findUser(splited[0]);
    c = this.findChannel(splited[2]);
   
    if ((u instanceof user) && (c instanceof channel)) {
        this.executeChannelPart(c, u);
    }
}

Ircd.prototype.processNick = function (splited) {
    u = this.findUser(splited[0]);
            
    if (u instanceof user) {
        newNick = splited[2];
        this.executeNick(u, newNick);
    }
}

Ircd.prototype.processUserAway = function (splited, splited2) {
    u = this.findUser(splited[0]);
    if (u instanceof user) {
        awayMsg = splited2[2];
        this.executeUserAway(u, awayMsg);
    }
}

Ircd.prototype.processDestroyServer = function (splited, splited2) {
    s = this.findServer(splited[2]);
    
    if (s instanceof server) {
        reason = splited2[2];
        this.destroyServer(s, reason);
    }
}

Ircd.prototype.processDestroyUser = function (splited, splited2) {
    u = this.findUser(splited[0]);

    if (u instanceof user) {
        reason = splited2[2];
        this.destroyUser(u, reason);
    }
}

Ircd.prototype.processChannelJoin = function (splited, splited2) {
    var that = this;

    var c = this.findChannel(splited[2]);
    
    if (!(c instanceof channel)) {
        name = splited[2];
        uptime = splited[3];
        modes = splited[4];
    
        c = this.introduceChannel(name, uptime, modes);
    }
    
    if (splited[1] === 'JOIN') {
        u = that.findUser(splited[0]);
        if (u instanceof user) {
            that.channelJoin(u, c);
        }
    } else {
        cusers = splited2[2].split(',');
        cusers.forEach(function(arg) {
            split = arg.split(' ');
            uid = split[0];
            if (uid.length == 9) {
                u = that.findUser(uid);
                if (u instanceof user) {
                    that.channelJoin(u, c);
                }
            }
        });
    }
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

Ircd.prototype.introduceBot = function (b) {
    if (b instanceof bot) {
        b.setIrcd(this);
        this.send('UID', b.me, b.uptime, b.nick, this.host, b.vhost, b.ident, b.ip, b.uptime, b.modes, ':' + b.realname);
    }
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
            if (u instanceof user) {
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
