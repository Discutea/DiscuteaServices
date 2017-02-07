exports = module.exports = User;

var remove = require('unordered-array-remove');

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
    
    this.modes = [];
    this.channels = [];
    this.away = undefined;
    this.lastnicks = [];
    
    this.index = 0;
}

User.prototype.toString = function ()
{
    return this.nick;
}

User.prototype.setMode = function (modes)
{
    if ((typeof modes == 'string') && (modes.length >= 1)) {
        var that = this;
        addModes = modes.split('+')[1];
        delModes = modes.split('-')[1];

        if (addModes !== undefined){
            for (var i = 0; i < addModes.length; i++) {
                that.addMode(addModes[i]);
            }
        }

        if (delModes !== undefined){
            for (var i = 0; i < delModes.length; i++) {
                that.delMode(delModes[i]);
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
    if (this.channels[c.name] === undefined) {
        this.channels.push(c);
        c.countUsers++;
    }
}

User.prototype.removeChannel = function (c)
{
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

User.prototype.delMode = function (mode)
{
    for (i in this.modes)
    {
        if (this.modes[i] == mode)
        {
            this.modes.splice(i, 1);
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
