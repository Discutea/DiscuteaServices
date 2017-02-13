exports.Ircd= Ircd;

var protocol = require('./protocol');
var channel = require('../channel');
var user = require('../user');
var server = require('../server');
var bot = require('../bot');
var filter = require('../filter');

function Ircd(sock, emitter, cfg) {

    var that = this;
    protocol.Protocol.call(this, sock, emitter, cfg);

    that.run();

}

Ircd.prototype = Object.create(protocol.Protocol.prototype);

Ircd.prototype.run = function () {
    var that = this;
    that.sock.write("CAPAB START 1202");
    that.sock.write("CAPAB CAPABILITIES :PROTOCOL=1202");
    that.sock.write("CAPAB END");
    that.sock.write("SERVER", this.host, this.password, '0', this.sid, ":" + this.desc);
    that.send('BURST', this.uptime);
    that.send('ENDBURST');

    that.sock.conn.on('data', function (data) {
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
            this.emitter.emit('ping', data);
            break;
        case 'END':
            if (splited[0] == 'CAPAB') {
                this.emitter.emit('ircd_ready', data);
            }
            break;
        case 'ERROR':
            this.emitter.emit('error', data);
            console.log(data);
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
        case 'FHOST':
            this.processFhost(splited, splited2);
            break;
        case 'FILTER':
            this.processDestroyFilter(splited);
            break;
        case 'METADATA':
            this.processIRCv3(splited, splited2, data);
            break;
        case 'OPERQUIT':
            this.processOperquit(splited, splited2);
            break;
        case 'OPERTYPE':
            this.processOpertype(splited);
            break;
        case 'VERSION':
            this.processVersion(splited, splited2);
            break;
        case 'SVSHOLD':
            this.emitter.emit('SVSHOLD', data);
            break;
        case 'SNOTICE':
            this.emitter.emit('SNOTICE', data);
            break;
        case 'SNONOTICE':
            this.emitter.emit('SNONOTICE', data);
            break;
        case 'NOTICE':
            this.emitter.emit('NOTICE', data);
            break;
        case 'PRIVMSG':
            this.emitter.emit('privmsg', data);
            break;
        case 'ADDLINE':
            this.processAddline(splited, splited2);
            break;
        case 'DELLINE':
            this.processDelline(splited, splited2);
            break;
        default:
           // console.log(data);
            break;
    }    
};

Ircd.prototype.processDelline = function (splited, splited2) {
    delby = '--';
    u = this.findUser(splited[0]);
    if (u instanceof user) { 
        delby = u.nick; 
    } else {
        s = this.findServer(splited[0]);
        if (s instanceof server) { 
            delby = s.name; 
        }
    }
    
    type = splited[2];
    line = splited[3];
    this.destroyXline(delby, type, line);
}

Ircd.prototype.processAddline = function (splited, splited2) {

    addby = splited[4];
    u = this.findUser(splited[0]);
    
    if (u instanceof user) { 
        if (u.account) {
            addby = u.account;
        } else {
           addby = u.nick; 
        }
    }

    type = splited[2];
    addr = splited[3];
    addat = splited[5];
    expireat = splited[6];
    reason = splited2[2];
    
    this.introduceXline(type, addr, addby, addat, expireat, reason);
}

Ircd.prototype.processVersion = function (splited, splited2) {
    s = this.findServer(splited[0]);
    if (s instanceof server) {
        version = splited[2];
        
        if ( (typeof version === 'string') && (version.charAt(0) == ":") ) {
            version = version.substring(1);
        }
        s.setVersion(version);
    }
}

Ircd.prototype.processOpertype = function (splited) {
    u = this.findUser(splited[0]);

    if (u instanceof user) {
        type = splited[2];
        u.setOperType(type);
    }
}

Ircd.prototype.processOperquit = function (splited, splited2) {
    u = this.findUser(splited[0]);

    if (u instanceof user) {
        type = splited2[2];
        reason = splited2[3];
        this.emitter.emit('user_operquit', u, type, reason);
    }
}

Ircd.prototype.processTopic = function (splited, splited2) {
    u = this.findUser(splited[0]);
    c = this.findChannel(splited[2]);
    
    if ((u instanceof user) && (c instanceof channel)) {
        newTopic = splited2[2];
        c.setTopic(u.nick, newTopic, false);
    }
}

Ircd.prototype.processMode = function (splited, splited2) {
    u = this.findUser(splited[2]);
    if (!(u instanceof user)) {return;}
    t = this.findUser(splited[0]);
    u.setMode(splited2[2], t);
}

Ircd.prototype.processFhost = function (splited, splited2) {    
    u = this.findUser(splited[0]);
    if (!(u instanceof user)) {return;}
    vhost = splited2[2];
    u.setVhost(vhost);
}

Ircd.prototype.processFmode = function (splited, splited2) {    
    c = this.findChannel(splited[2]);
    if (!(c instanceof channel)) {return;}
    
    if (splited[5] === undefined) {
        u = this.findUser(splited[0]);
        change = c.setMode(splited2[2], u);
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
            
            if (addmode) {
                c.addExtMode(by, time, fmodes[i], target);
            } else {
                c.removeExtMode(by, time, fmodes[i], target);
            }
        }
    }
}

Ircd.prototype.processRealname = function (splited, splited2) {
    u = this.findUser(splited[0]);    
    if (u instanceof user) {
        realname = splited.splice(2, splited.length).join(' ');
    
        if ( (typeof realname === 'string') && (realname.charAt(0) == ":") ) {
            realname = realname.substring(1);
        }
        this.executeRealname(u, realname);
    }
}

Ircd.prototype.processIntroduceTopic = function (splited, splited2) {
    c = this.findChannel(splited[2]);

    if (c instanceof channel) {
        topicAt = splited[3];
        topicBy = splited[4];
        topic = splited2[2];
        c.setTopic(topicBy, topic, topicAt);
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
        partMsg = splited2[2];
        this.executeChannelPart(c, u, partMsg);
    }
}

Ircd.prototype.processNick = function (splited) {
    u = this.findUser(splited[0]);
            
    if (u instanceof user) {
        newNick = splited[2];
        u.setNick(newNick);
    }
}

Ircd.prototype.processUserAway = function (splited, splited2) {
    u = this.findUser(splited[0]);
    if (u instanceof user) {
        awayMsg = splited2[2];
        u.setAway(awayMsg);
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
            u.addChannel(c);
        }
    } else {
        cusers = splited2[2].split(',');
        cusers.forEach(function(arg) {
            split = arg.split(' ');
            uid = split[0];
            if (uid.length == 9) {
                u = that.findUser(uid);
                if (u instanceof user) {
                    u.addChannel(c);
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
    modes = splited[10];
    // /!\ Ipv6 on split (:)
    realname = splited.splice(10, splited.length).join(' ');
    realname = realname.split(':')[1];

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
    this.sock.write(args);
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
            this.processIRCv3Filter(splited);
            break;
        default:
           // console.log(data);
            break;
    }
}

Ircd.prototype.processDestroyFilter = function (splited) {
    regex = splited[2];
        
    var by = '-';
    u = this.findUser(splited[0]);
    if (u instanceof user) {
        by = u.nick;
    } else {
        s = this.findServer(splited[0]);
        if (s instanceof server) {
            by = s.name;
        }
    }

    if (splited[3] === undefined) {

        f = this.findBy(this.filters, 'regex', regex);
        if (!(f instanceof filter)) {return;};

        this.destroyFilter(f, by);
    } else {
        action = splited[3];
        flags = splited[4];
        duration = splited[5];
        reason = splited.slice(6, +splited.length);
    
        if (typeof reason === 'object') {
            reason = reason.join(' ');
        }
    
        if ( (typeof reason === 'string') && (reason.charAt(0) == ":") ) {
            reason = reason.substring(1);
        }

        this.introduceFilter(action, flags, regex, by, duration, reason);
    }
}
