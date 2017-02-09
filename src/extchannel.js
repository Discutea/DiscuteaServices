exports = module.exports = ExtChannel;

function ExtChannel(by, time, type, target)
{
    if (!(this instanceof ExtChannel)) { return new ExtChannel(by, time, type, target); }
    
    this.by = by;
    this.time = time;
    this.type = type;
    this.target = target;
    this.index = 0;
}
