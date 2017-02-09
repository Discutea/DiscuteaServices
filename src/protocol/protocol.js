exports.Protocol = Protocol;

var events = require('events');
var user = require('../user');
var server = require('../server');
var channel = require('../channel');
var extchannel = require('../extchannel');
var xline = require('../xline');
var net  = require('net');
var tls  = require('tls');
var find = require('array-find');
var remove = require('unordered-array-remove');
var geoip = require('geoip-lite');

function Protocol(cfg) {
    this.users = [];
    this.servers = [];
    this.xlines = [];
    this.channels = [];
    this.extsChannel = [];
    this.socket = this.connect(cfg.link.port, cfg.link.server);
    this.sid = cfg.link.sid;
    this.host = cfg.link.host;
    this.password = cfg.link.password;
    this.desc = cfg.link.desc;
    this.uptime = Math.floor(Date.now() / 1000);
    this.cfg = cfg;
    events.EventEmitter.call(this);
}

Protocol.prototype = Object.create(events.EventEmitter.prototype);

Protocol.prototype.connect = function (port, server) {
    s = net.createConnection(port, server);
    return s;
}

Protocol.prototype.write = function(args) { 
    if (typeof args !== 'object') {
        var args = Array.prototype.slice.call(arguments);
    }

    this.socket.write(args.join(' ') + '\r\n');
};

Protocol.prototype.destroyUser = function (u, reason) {
    if (!(u instanceof user)) {return;}
    
    nick = u.nick;
    index = u.index;
    
    u.channels.forEach(function(c) {        
        c.countUsers--;
    });

    delete u;
    remove(this.users, index);
    this.emit('user_destroy', nick, reason);
}

Protocol.prototype.destroyServer = function (s, reason) {
    if (!(s instanceof server)) {return;}
    
    name = s.name;
    index = s.index;

    delete s;
    remove(this.servers, index);
    this.emit('server_destroy', name, reason);
}

Protocol.prototype.emitMode = function (u, modes, t, intention) {
    var that = this;
    if ( (!(u instanceof user)) || (typeof modes !== 'object') )  {return;}
    
    if (modes.del) {
        modes.del.forEach(function(mode) {
            if ((t instanceof channel) || (t instanceof user)) {
                that.emit(intention + '_del_mode', u, mode, t);
            } 
        });
    }

    if (modes.add) {
        modes.add.forEach(function(mode) {
            if ((t instanceof channel) || (t instanceof user)) {
                that.emit(intention + '_add_mode', u, mode, t);
            }
        });
    }
}

Protocol.prototype.introduceServer = function (sid, name, desc) {
    var s = new server(sid, name, desc);
    this.emit('server_introduce', s);
    this.servers.push(s);

    return s;
}

Protocol.prototype.introduceUser = function (uid, nick, ident, host, vhost, ip, uptime, realname, s, modes) {
    var u = new user(uid, nick, ident, host, vhost, ip, uptime, realname, s);
    var change = u.setMode(modes);
    this.users.push(u);
    this.emit('user_introduce', u);

    isGeo = u.setGeoInfos( geoip.lookup(ip) );

    if (isGeo) {
        this.emit('user_has_geoinfos', u);
    }
    
    this.verifyRealname(u, realname);
}

Protocol.prototype.findBy = function (array, criteria, target)
{
    
    if ( (typeof target === 'string') && (target.charAt(0) == ":") ) {
        target = target.substring(1);
    }

    return find(array, function (search, index) {
        if (search[criteria] === target)
        {
            search.index = index;
            return search;
        }
    });
};

Protocol.prototype.introduceXline = function (type, addr, addby, addat, expireat, reason) {
    var x = new xline(type, addr, addby, addat, expireat, reason);
    index = this.xlines.push(x);
    x.index = index;

    this.emit('add_xline', x);
};

Protocol.prototype.destroyXline = function (delby, type, line) {
    x = this.findXline(type, line);
    if (x instanceof xline) {
        name = x.name();
        remove(this.xlines, x.index);
        delete x;
        this.emit('del_xline', delby, type, line, name);
    }
};

Protocol.prototype.findXline = function (type, line) {
    return find(this.xlines, function (x) {
        if ( (x.type === type) && (x.addr == line) )
        {
            return x;
        }
    });
};

Protocol.prototype.executeChannelMode = function (c, by, time, type, target, add) {
    if (add) {
        var ext = new extchannel(by, time, type, target, add);
        index = c.extsModes.push(ext);
        ext.index = index;
        
        this.emit('add_ext_channel_mode', c, ext);
    } else {
        var that = this;
        c.extsModes.forEach(function(ext) {
            if ( (ext.target === target) && (ext.type === type) ) {
                id = ext.index;
                remove(c.extsModes, id);
                delete ext;
                that.emit('del_ext_channel_mode', c, type, target, by);
            }
        });
    }
}

Protocol.prototype.executeRealname = function (u, realname) {
    if (!(u instanceof user)) {return;}
    
    lastreal = u.realname;
    u.realname = realname;
    this.emit('user_change_realname', u, lastreal);
    this.verifyRealname(u, realname);
}

Protocol.prototype.verifyRealname = function (u, realname) {
    if (!(u instanceof user)) {return;}
    
    if (realname !== undefined) {
        age = realname.split(' ');
        age = parseInt(age[0]);
        if ( (!isNaN(age)) && (age < 99) && (age > 9) ) {
            u.age = age;
            if (age <= 19) {
                this.emit('user_is_mineur', u);
            }
        }
    }

    var regex = /^[0-9-]{2}[\s][mMHhfFwWCcX][\s][\x20-\x7E]{2,47}$/;
    if (!regex.test(realname)) {
        this.emit('user_has_badreal', u, realname);
    }
}

Protocol.prototype.executeChannelPart = function (c, u, partMsg) {
    if ( (!(u instanceof user)) || (!(c instanceof channel)) ) {return;}
    
    u.removeChannel(c);
    this.emit('user_part', u, c, partMsg);
    
    if (c.countUsers <= 0)
    {
        this.destroyChannel(c);
    }
}

Protocol.prototype.executeIntroduceTopic = function (c, topicAt, topicBy, topic) {
    if (!(c instanceof channel)) {return;}
    
    c.topic = topic;
    c.topicBy = topicBy;
    c.topicAt = topicAt;
    
    this.emit('channel_introduce_topic', c);
}

Protocol.prototype.executeKick = function (u, target, c, reason) {
    if ( (!(target instanceof user)) || (!(u instanceof user)) || (!(c instanceof channel)) ) {return;}
    
    target.removeChannel(c);
    this.emit('user_kick', u, target, c, reason);
    
    if (c.countUsers <= 0)
    {
        this.destroyChannel(c);
    }
}



Protocol.prototype.destroyChannel = function (c) {
    if (!(c instanceof channel)) {return;}
    
    c.extsModes.forEach(function(ext) {
        id = ext.index; 
        remove(c.extsModes, id);
        delete ext;
    });
    
    index = c.index;
    name = c.name;
    
    delete c;
    remove(this.channels, index);
    this.emit('channel_destroy', name);
}

Protocol.prototype.executeNick = function (u, newNick) {
    if (!(u instanceof user)) {return;}
    
    lastNick = u.nick;
    u.nick = newNick;
    this.emit('user_nick', u, lastNick);
}

Protocol.prototype.executeTopic = function (c, u, newTopic) {
    if ( (!(u instanceof user)) || (!(c instanceof channel)) ) {return;}
    
    lastTopic = c.topic;
    c.topic = newTopic;
    c.topicBy = u.nick;
    c.topicAt = Math.floor(Date.now() / 1000);
    
    this.emit('channel_chg_topic', c, u, lastTopic);
}

Protocol.prototype.executeOpertype = function (u, type) {
    if (!(u instanceof user)) {return;}
    
    u.opertype = type;
    this.emit('user_opertype', u, type);
}

Protocol.prototype.emitOperquit = function (u, type, reason) {
    if (!(u instanceof user)) {return;}
    this.emit('user_operquit', u, type, reason);
}

Protocol.prototype.executeFhost = function (u, vhost) {
    if (!(u instanceof user)) {return;}
    
    u.vhost = vhost;
    this.emit('user_chg_vhost', u, vhost);
}

Protocol.prototype.executeServerVersion = function (s, version) {
    if (!(s instanceof server)) {return;}
    
    s.version = version;
    this.emit('server_version', s, version);
}

Protocol.prototype.executeUserAway = function (u, awayMsg) {
    if (!(u instanceof user)) {return;}
    
    u.away = awayMsg;
    if (awayMsg === undefined) {
        this.emit('user_away_off', u);
    } else {
        this.emit('user_away_on', u, awayMsg);
    }
}

Protocol.prototype.channelJoin = function (u, c) {
    
    if ( (!(u instanceof user)) || (!(c instanceof channel)) ) {return;}
    
    u.addChannel(c);
    this.emit('user_join', u, c);
}

Protocol.prototype.introduceChannel = function (name, uptime, modes) {
    var c = new channel(name, uptime);
    c.setMode(modes);

    this.channels.push(c);
    this.emit('channel_introduce', c);
    
    return c;
}

Protocol.prototype.processIRCv3AccountName = function (u, account) {
    if (!(u instanceof user)) {return;}

    if (account.length > 0) {
        u.account = account;
        u.registered = true;
        this.emit('user_accountname', u, account);

        role = this.cfg.opers[account];
        if (role !== undefined) {
            u.role = role;
            this.emit('user_has_role', u, role);
        }
    } else {
        u.account = undefined;
        u.registered = false;
        u.role = false;
        this.emit('user_accountname_off', u); 
    }
}
