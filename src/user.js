exports = module.exports = User;
var remove = require('unordered-array-remove');
var channel = require('./channel');
var user = require('./user');
var fips = require('fips');
var config = require('../conf/config');
var geoip = require('geoip-lite');

function User(emitter, uid, nick, ident, host, vhost, ip, uptime, realname, s)
{
    if (!(this instanceof User)) { return new User(emitter, uid, nick, ident, host, vhost, ip, uptime, realname, s); }
    
    this.emitter = emitter;
    this.uid = uid;
    this.nick = nick;
    this.ident = ident;
    this.host = host;
    this.vhost = vhost;
    this.ip = ip;
    this.time = uptime;
    this.realname = realname;
    this.server = s;
    this.account = undefined;
    this.registered = false;
    this.age = undefined;
    this.modes = [];
    this.stocks = []; // stocks for developers
    this.channels = [];
    this.away = undefined;
    this.lastnicks = [];
    this.country = undefined;
    this.region = undefined;
    this.city = undefined;
    this.version = undefined;
    this.opertype = undefined;
    this.role = false;
    this.index = 0;
    
    this.iptype = '';
    if (/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(ip)) {
        this.iptype = 'ipv4';
    } else {
        this.iptype = 'ipv6';
    }
    this.emitter.emit('user_introduce', this);
    this.setGeoInfos( geoip.lookup(ip) );
    this.setRealname(realname, false);
}

User.prototype.setGeoInfos = function (geo)
{
    country = geo ? geo.country : undefined;
    if (country != ""){
        this.country = country;
    }
    
    region = geo ? geo.region : undefined;
    if (region != ""){
        if (country != ""){
            region = fips.longform(country+region);
        }
        this.region = region;
    }
    
    city = geo ? geo.city : undefined;
    if (city != ""){
        this.city = city;
    }
    
    if (country !== undefined) {
        this.emitter.emit('user_has_geoinfos', this);
    }

}

User.prototype.setRealname = function (realname, emit = true)
{
    lastreal = this.realname;
    this.realname = realname;
    if(emit) {
        this.emitter.emit('user_change_realname', this, lastreal);
    }
    
    if (realname !== undefined) {
        if (config.realname.matchminor === true) {
            age = realname.split(' ');
            age = parseInt(age[0]);
            if ( (!isNaN(age)) && (age < 99) && (age > 9) ) {
                this.age = age;
                if (age <= parseInt(config.realname.minorage)) {
                    this.emitter.emit('user_is_mineur', this);
                }
            }
        }
    }
    
    if (config.realname.matchbadreal === true) {
        if (!config.realname.regex.test(realname)) {
            this.emitter.emit('user_has_badreal', this, realname);
        }
    }
}

User.prototype.setVhost = function (vhost)
{
    this.vhost = vhost;
    this.emitter.emit('user_chg_vhost', this, vhost);

    return this;
}

User.prototype.setOperType = function (type)
{
    this.opertype = type;
    this.emitter.emit('user_opertype', this, type);
}

User.prototype.setNick = function (newNick)
{
    lastNick = this.nick;
    this.nick = newNick;
    this.emitter.emit('user_nick', this, lastNick);
    
    return this;
}

User.prototype.setAway = function (awayMsg)
{
    this.away = awayMsg;
    if (awayMsg === undefined) {
        this.emitter.emit('user_away_off', this);
    } else {
        this.emitter.emit('user_away_on', this, awayMsg);
    }
    
    return this;
}

User.prototype.setMode = function (modes, t)
{    
    if ((typeof modes == 'string') && (modes.length >= 1)) {
        var that = this;
        var addmode = true;
        
        for (i in modes) {
            if (modes[i] === '+') {
                addmode = true;
            } else if (modes[i] === '-') {
                addmode = false;
            } else {
                if (addmode) {
                    that.addMode(modes[i], t);
                } else {
                    that.delMode(modes[i], t);
                }
            }
        }
    }
}

User.prototype.addMode = function (mode, t = undefined)
{
    if (this.hasMode(mode) === false) {
        this.modes.push(mode);
        this.emitter.emit('user_add_mode', this, modes, t);
    }
}

User.prototype.addChannel = function (c)
{
    if (c instanceof channel) {
        this.channels.push(c);
        c.countUsers++;
        this.emitter.emit('user_join', this, c);
        this.emitter.emit('user_join' + c.name, this, c);
    }
}

User.prototype.removeChannel = function (c)
{
    if (c instanceof channel) {
        var that = this;
    
        for (i in that.channels)
        {
            if (that.channels[i] === c)
            {
                remove(that.channels, i);
                c.countUsers--;
            }
        }
    }
}

User.prototype.delMode = function (mode, t = undefined)
{
    for (i in this.modes)
    {
        if (this.modes[i] === mode)
        {
            remove(this.modes, i);
            this.emitter.emit('user_del_mode', this, mode, t);
        }
    }
}

User.prototype.hasMode = function(mode) {
    for (i in this.modes)
    {
        if (this.modes[i] == mode)
        {
            return true;
        }
    }
    return false;
}

User.prototype.channelPart = function(c, partMsg) {
    if (c instanceof channel) {
        this.removeChannel(c);
        this.emitter.emit('user_part', this, c, partMsg);
    
        return c.countUsers;
    };
    return false;
}

User.prototype.isRoot = function() {
    if (this.role === 'ROOT') {
        return true;
    }
    return false;
}

User.prototype.isAdmin = function() {
    if (!this.role) {return false;}
    
    if ((this.role === 'ADMIN') || (this.role === 'ROOT')) {
        return true;
    }
    
    return false;
}

User.prototype.isOperator = function() {
    if (!this.role) {return false;}
    
    if ((this.role === 'OPERATOR') || (this.role === 'ADMIN') || (this.role === 'ROOT')) {
        return true;
    }
    
    return false;
}

User.prototype.isModerator = function() {
    if (!this.role) {return false;}
    
    if ((this.role === 'MODERATOR') || (this.role === 'OPERATOR')) {
        return true;
    }
    
    if ((this.role === 'ADMIN') || (this.role === 'ROOT')) {
        return true;
    }
    
    return false;
}

User.prototype.isHelper = function() {
    if (!this.role) {return false;}
    
    if ((this.role === 'HELPEUR') || (this.role === 'MODERATOR') || (this.role === 'OPERATOR')) {
        return true;
    }
    
    if ((this.role === 'ADMIN') || (this.role === 'ROOT')) {
        return true;
    }
    
    return false;
}
