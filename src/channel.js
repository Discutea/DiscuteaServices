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
            remove(this.modes, i);
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
