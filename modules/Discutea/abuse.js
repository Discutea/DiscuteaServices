exports = module.exports = Abuse;

function Abuse(uid, channel, target, time)
{
    if (!(this instanceof Abuse)) { return new Abuse(uid, channel, target, time); }
    this.uid = uid;
    this.channel = channel;
    this.target = target;
    this.time = time;
    this.retry = 0;
}
