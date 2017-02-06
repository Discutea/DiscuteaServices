exports = module.exports = User;

function User()
{
	if (!(this instanceof User)) { return new User(); }

	this.uid = undefined;
    this.time = undefined;
	this.nick = undefined;
	this.host = undefined;
	this.vhost = undefined;
	this.ident = undefined;
    this.ip = undefined;
    this.modes = [];
	this.realname = undefined;
    this.server = undefined;
    this.channels = [];
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
        this.channels[c.name] = c;
    }
}

User.prototype.removeChannel = function (c)
{
    var that = this;
    if (that.channels[c.name] === undefined) {
        return;
    }
    
    for (i in that.channels)
    {
        if (that.channels[i] === c)
        {
            that.channels.splice(i, 1);
        }
    }
    
    return true;
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