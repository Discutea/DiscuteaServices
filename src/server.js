exports = module.exports = Server;

function Server(emitter, sid, name, desc)
{
    if (!(this instanceof Server)) { return new Server(emitter, sid, name, desc); }
    this.emitter = emitter;
    this.sid = sid;
    this.name = name;
    this.desc = desc;
    this.version = undefined;
    this.emitter.emit('server_introduce', this);
}

Server.prototype.toString = function ()
{
    return this.name;
}

Server.prototype.setVersion = function (version)
{
    this.version = version;
    this.emitter.emit('server_version', this, version);
    return version;
}
