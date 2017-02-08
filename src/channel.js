exports = module.exports = Channel;
var remove = require('unordered-array-remove');

function Channel(name, uptime)
{
	if (!(this instanceof Channel)) { return new Channel(name, uptime); }
    this.name = name;
    this.time = uptime;
    
    this.modes = [];
    this.extsModes = [];
    this.topic = "";
    this.topicBy = undefined;
    this.topicAt = undefined;
    this.index = 0;
    this.countUsers = 0;
}

Channel.prototype.toString = function ()
{
	return this.name;
}

Channel.prototype.setMode = function (modes)
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
        if (this.modes[i] === mode)
        {
            remove(this.modes, i);
        }
    }
}

Channel.prototype.hasMode = function(mode) {
    for (i in this.modes)
    {
        if (this.modes[i] === mode)
        {
            return true;
        }
    }
    
    return false;
}
