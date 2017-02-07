exports.Protocol = Protocol;

var events = require('events');
var user = require('../user');
var server = require('../server');
var channel = require('../channel');
var net  = require('net');
var tls  = require('tls');
var find = require('array-find');
var remove = require('unordered-array-remove');
var geoip = require('geoip-lite');

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

Protocol.prototype.write = function(args) { 
    if (typeof args !== 'object') {
        var args = Array.prototype.slice.call(arguments);
    }

    this.socket.write(args.join(' ') + '\r\n');
};

Protocol.prototype.destroyUser = function (u, reason) {
    nick = u.nick;
    index = u.index;
    
    u.channels.forEach(function(c) {        
        c.countUsers--;
    });

    delete u;
    remove(this.users, index);
    this.emit('user_destroy', u, reason);
}

Protocol.prototype.findBy = function (array, criteria, target)
{
    if (target.charAt(0) == ":") {
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

    u.setGeoInfos( geoip.lookup(ip) );

    this.users.push(u);
    this.emit('user_introduce', u);
    
    if (realname !== undefined) {
        age = realname.split(' ');
        age = parseInt(age[0]);
        if ( (!isNaN(age)) && (age < 99) && (age > 9) ) {
            console.log(age);
            u.age = age;
            if (age <= 19) {
                this.emit('user_is_mineur', u);
            }
        }
    }

}

Protocol.prototype.executeChannelPart = function (c, u) {
    u.removeChannel(c);
    this.emit('user_part', u, c);
    
    if (c.countUsers <= 0)
    {
        this.destroyChannel(c);
    }
}

Protocol.prototype.executeKick = function (u, target, c, reason) {

    target.removeChannel(c);
    this.emit('user_kick', u, target, c, reason);
    
    if (c.countUsers <= 0)
    {
        this.destroyChannel(c);
    }
}

Protocol.prototype.destroyChannel = function (c) {
    index = c.index;
    name = c.name;
    
    delete c;
    remove(this.channels, index);
    this.emit('channel_destroy', name);
}

Protocol.prototype.executeNick = function (u, newNick) {
    lastNick = u.nick;
    u.nick = newNick;
    this.emit('user_nick', u, lastNick);
}

Protocol.prototype.executeTopic = function (c, u, newTopic) {
    lastTopic = c.topic;
    c.topic = newTopic;
    this.emit('channel_chg_topic', c, u, lastTopic);
}

Protocol.prototype.executeUserAway = function (u, awayMsg) {
    u.away = awayMsg;
    if (awayMsg === undefined) {
        this.emit('user_away_off', u);
    } else {
        this.emit('user_away_on', u, awayMsg);
    }
}

Protocol.prototype.channelJoin = function (u, c) {
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
