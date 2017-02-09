exports = module.exports = Channel;
var remove = require('unordered-array-remove');
var events = require('events');

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
    events.EventEmitter.call(this);
}

Channel.prototype = Object.create(events.EventEmitter.prototype);

Channel.prototype.toString = function ()
{
	return this.name;
}

Channel.prototype.setMode = function (modes)
{
    if ((typeof modes == 'string') && (modes.length >= 1)) {
        var add = [];
        var del = [];
        var that = this;
        var addmode = true;
        for (i in modes) {
            if (modes[i] === '+') {
                addmode = true;
            } else if (modes[i] === '-') {
                addmode = false;
            } else {
                if (addmode) {
                    a = that.addMode(modes[i]);
                    if (a) {
                        add.push(a);
                    }
                } else {
                    d = that.delMode(modes[i]);
                    if (d) {
                        del.push(d);
                    }
                }
            }
        }
        return {add: add, del: del};
    }
    return false;
}

Channel.prototype.addMode = function (mode)
{
    if (this.hasMode(mode) === false) {
        this.modes.push(mode);
        return mode;
    }
    return false;
}

Channel.prototype.delMode = function (mode)
{
    for (i in this.modes)
    {
        if (this.modes[i] === mode)
        {
            remove(this.modes, i);
            return mode;
        }
    }
    return false;
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
