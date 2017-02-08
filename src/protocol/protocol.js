exports.Protocol = Protocol;

var events = require('events');
var user = require('../user');
var server = require('../server');
var channel = require('../channel');
var extchannel = require('../extchannel');
var net  = require('net');
var tls  = require('tls');
var find = require('array-find');
var remove = require('unordered-array-remove');
var geoip = require('geoip-lite');

function Protocol(cfg) {
    this.users = [];
    this.servers = [];
    this.channels = [];
    this.extsChannel = [];
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

/* INTRODUCE OBJECT (channel, server, user ...) */

Protocol.prototype.introduceServer = function (sid, name, desc) {
    var s = new server(sid, name, desc);
    this.emit('server_introduce', s);
    this.servers.push(s);

    return s;
}

Protocol.prototype.introduceUser = function (uid, nick, ident, host, vhost, ip, uptime, realname, s, modes) {
    var u = new user(uid, nick, ident, host, vhost, ip, uptime, realname, s);
    u.setMode(modes);
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
    
    var regex = /^[0-9-]{2}[[:space:]][mMHhfFwWCcX][[:space:]][[:print:]]{2,47}$/;
    if (regex.test(realname)) {
        this.emit('user_has_badreal', u, realname);
    }
}

Protocol.prototype.executeChannelPart = function (c, u) {
    if ( (!(u instanceof user)) || (!(c instanceof channel)) ) {return;}
    
    u.removeChannel(c);
    this.emit('user_part', u, c);
    
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
    } else {
        u.account = undefined;
        u.registered = false;
        this.emit('user_accountname_off', u); 
    }
}
