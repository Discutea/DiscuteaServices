exports.Protocol = Protocol;

var user = require('../user');
var server = require('../server');
var channel = require('../channel');
var xline = require('../xline');
var filter = require('../filter');
var find = require('array-find');
var remove = require('unordered-array-remove');
var socket = require('../socket');

function Protocol(sock, emitter, cfg) {
    this.channels = []; 
    this.users = [];
    this.xlines = [];
    this.filters = [];
    this.servers = [];
    this.sock = sock;
    this.emitter = emitter;
    this.sid = cfg.link.sid;
    this.host = cfg.link.host;
    this.password = cfg.link.password;
    this.desc = cfg.link.desc;
    this.uptime = Math.floor(Date.now() / 1000);
    this.cfg = cfg;
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
    this.emitter.emit('channel_destroy', name);
}

Protocol.prototype.introduceChannel = function (name, uptime, modes) {
    var c = new channel(this.emitter, name, uptime);
    c.setMode(modes, undefined);

    this.channels.push(c);
    this.emitter.emit('channel_introduce', c);
    
    return c;
}

Protocol.prototype.destroyServer = function (s, reason) {
    if (!(s instanceof server)) {return;}
    
    name = s.name;
    index = s.index;

    delete s;
    remove(this.servers, index);
    this.emitter.emit('server_destroy', name, reason);
}

Protocol.prototype.introduceServer = function (sid, name, desc) {
    var s = new server(this.emitter, sid, name, desc);
    index = this.servers.push(s);
    s.index = index;
    return s;
}

Protocol.prototype.destroyUser = function (u, reason) {
    if (!(u instanceof user)) {return;}
    
    nick = u.nick;
    index = u.index;
    
    u.channels.forEach(function(c) {        
        c.countUsers--;
    });

    delete u;
    remove(this.users, index);
    this.emitter.emit('user_destroy', nick, reason);
}

Protocol.prototype.introduceUser = function (uid, nick, ident, host, vhost, ip, uptime, realname, s, modes) {
    var u = new user(this.emitter, uid, nick, ident, host, vhost, ip, uptime, realname, s);
    u.setMode(modes, undefined);
    this.users.push(u);
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

    this.emitter.emit('add_xline', x);
};

Protocol.prototype.destroyXline = function (delby, type, line) {
    x = this.findXline(type, line);
    if (x instanceof xline) {
        name = x.name();
        remove(this.xlines, x.index);
        delete x;
        this.emitter.emit('del_xline', delby, type, line, name);
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

Protocol.prototype.executeChannelPart = function (c, u, partMsg) {
    if (u instanceof user) {
        if (!u.channelPart(c, partMsg)) {
            this.destroyChannel(c);
        }
    }
}

Protocol.prototype.executeKick = function (u, target, c, reason) {
    if ( (!(target instanceof user)) || (!(u instanceof user)) || (!(c instanceof channel)) ) {return;}
    
    target.removeChannel(c);
    this.emitter.emit('user_kick', u, target, c, reason);
    
    if (c.countUsers <= 0)
    {
        this.destroyChannel(c);
    }
}

Protocol.prototype.introduceFilter = function (action, flags, regex, addby, duration, reason) {
    var f = new filter(action, flags, regex, addby, duration, reason);
    this.emitter.emit('filter_introduce', f);
    f.index = this.filters.push(f);

    return f;
}

Protocol.prototype.destroyFilter = function (f, by) {
    if (!(f instanceof filter)) {return;}

    regex = f.regex;
    index = f.index;
    
    delete f;
    remove(this.filters, index);
    
    this.emitter.emit('filter_destroy', regex, by);
}

Protocol.prototype.processIRCv3AccountName = function (u, account) {
    if (!(u instanceof user)) {return;}

    if (account.length > 0) {
        u.account = account;
        u.registered = true;
        this.emitter.emit('user_accountname', u, account);

        role = this.cfg.opers[account];

        if (role !== undefined) {
            u.role = role;
            this.emitter.emit('user_has_role', u, role);
        }
    } else {
        u.account = undefined;
        u.registered = false;
        u.role = false;
        this.emitter.emit('user_accountname_off', u); 
    }
}

Protocol.prototype.processIRCv3Filter = function (splited) {
    action = splited[5];
    flags = splited[6];
    regex = splited[4];
    if ( (typeof regex === 'string') && (regex.charAt(0) == ":") ) {
        regex = regex.substring(1);
    }
    duration = splited[7];
    reason = splited.slice(8, +splited.length);
    
    if (typeof reason === 'object') {
        reason = reason.join(' ');
    }
    
    if ( (typeof reason === 'string') && (reason.charAt(0) == ":") ) {
        reason = reason.substring(1);
    }
    
    this.introduceFilter(action, flags, regex, undefined, duration, reason);
}
