exports = module.exports = Channel;

var remove = require('unordered-array-remove');
var extchannel = require('./extchannel');
var find = require('array-find');

function Channel(emitter, name, uptime)
{
	if (!(this instanceof Channel)) { return new Channel(emitter, name, uptime); }
    this.emitter = emitter;
    this.name = name;
    this.time = uptime;
    this.modes = [];
    this.extsModes = [];
    this.topic = "";
    this.topicBy = undefined;
    this.topicAt = undefined;
    this.countUsers = 0;
}

Channel.prototype.setTopic = function (topicBy, topic, topicAt)
{
    this.topic = topic;
    
    if (topicAt === false) {
        lastTopic = c.topic;
        this.topicBy = u.nick;
        this.topicAt = Math.floor(Date.now() / 1000);
    
        this.emitter.emit('channel_chg_topic', this, lastTopic);
    } else {
        this.topicBy = topicBy;
        this.topicAt = topicAt;
        this.emitter.emit('channel_introduce_topic', this);
    }
}

Channel.prototype.addExtMode = function (by, time, type, target)
{
    if ( (type === undefined) || (target === undefined) ) {return;}
    
    var ext = new extchannel(by, time, type, target);
    this.extsModes.push(ext);
        
    this.emitter.emit('add_ext_channel_mode', this, ext);
}

Channel.prototype.removeExtMode = function (by, time, type, target)
{
    var that = this;

    find(that.extsModes, function (search, index) {
        if (search instanceof extchannel) {
            if ( (search.type === type) && (search.target === target) ) {
                delete ext;
                remove(that.extsModes, index);
                that.emitter.emit('del_ext_channel_mode', that, type, target, by);
            }
        } else {
            remove(that.extsModes, index);
        }
    });
}

Channel.prototype.setMode = function (modes, u)
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
                    that.addMode(modes[i], u);
                } else {
                    that.delMode(modes[i], u);
                }
            }
        }
    }
}

Channel.prototype.addMode = function (mode, u)
{
    if (this.hasMode(mode) === false) {
        this.modes.push(mode);
        this.emitter.emit('channel_add_mode', u, mode, this);
    }
}

Channel.prototype.delMode = function (mode, u)
{
    for (i in this.modes)
    {
        if (this.modes[i] === mode)
        {
            remove(this.modes, i);
            this.emitter.emit('channel_del_mode', u, mode, this);
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
