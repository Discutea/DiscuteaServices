exports = module.exports = User;
var remove = require('unordered-array-remove');
var channel = require('./channel');

function User(uid, nick, ident, host, vhost, ip, uptime, realname, s)
{
    if (!(this instanceof User)) { return new User(uid, nick, ident, host, vhost, ip, uptime, realname, s); }

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
    this.channels = [];
    this.away = undefined;
    this.lastnicks = [];
    this.country = undefined;
    this.region = undefined;
    this.city = undefined;
    this.version = undefined;
    this.index = 0;
}

User.prototype.setGeoInfos = function (geo)
{
    country = geo ? geo.country : undefined;
    if (country != ""){
        this.country = country;
    }
    
    region = geo ? geo.region : undefined;
    if (region != ""){
        this.region = region;
    }
    
    city = geo ? geo.city : undefined;
    if (city != ""){
        this.city = city;
    }
    
    if (city !== undefined) {
        return true;
    }
    
    return false;
}

User.prototype.toString = function ()
{
    return this.nick;
}

User.prototype.setMode = function (modes)
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
                    that.addMode(modes[i]);
                } else {
                    that.delMode(modes[i]);
                }
            }
        }
    }
}

User.prototype.addMode = function (mode)
{
    if (this.hasMode(mode) === false) {
        this.modes.push(mode);
    }
}

User.prototype.addChannel = function (c)
{
    if (c instanceof channel) {
        this.channels.push(c);
        c.countUsers++;
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

User.prototype.delMode = function (mode)
{
    for (i in this.modes)
    {
        if (this.modes[i] === mode)
        {
            remove(this.modes, i);
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
