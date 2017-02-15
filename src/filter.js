exports = module.exports = Filter;

function Filter(action, flags, regex, addby, duration, reason)
{
    if (!(this instanceof Filter)) { 
        return new Filter(action, flags, regex, addby, duration, reason); 
    }
    
    this.action = action;
    this.flags = flags;
    this.regex = regex;
    this.addby = addby;
    this.duration = duration;
    this.reason = reason;
}
