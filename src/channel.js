exports = module.exports = Channel;

function Channel()
{
	if (!(this instanceof Channel)) { return new Channel(); }
    this.name = undefined;
    this.time = undefined;
    this.modes = [];
    this.ircd = undefined;
}

Channel.prototype.toString = function ()
{
	return this.name;
}

Channel.prototype.addUsers = function (cusers) {
    var that = this;
    
    cusers.forEach(function(arg) {
        split = arg.split(' ');
        uid = split[0];
        
        if (uid.length == 9) {
            u = that.ircd.users[uid];
            if (u !== undefined) {
                u.addChannel(that);
            }
        }
    });
}

Channel.prototype.getUsers = function (cusers) {
    var that = this;
    users = this.ircd.users;
    cusers = [];
    
    for (i in users)
    {
        if (users[i].channels[that.name] !== undefined)
        {
            cusers.push(users[i]);
        }
    }

    return cusers;
}

Channel.prototype.setMode = function (modes)
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

Channel.prototype.addMode = function (mode)
{
    if (this.hasMode(mode) === false) {
        this.modes.push(mode);
    }
}

Channel.prototype.delMode = function (mode)
{
    for (i in this.modes)
    {
        if (this.modes[i] == mode)
        {
            this.modes.splice(i, 1);
        }
    }
}

Channel.prototype.hasMode = function(mode) {
    for (i in this.modes)
    {
        if (this.modes[i] == mode)
        {
            return true;
        }
    }
    
    return false;
}