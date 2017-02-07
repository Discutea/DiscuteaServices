exports = module.exports = Server;

function Server(sid, name, desc)
{
	if (!(this instanceof Server)) { return new Server(sid, name, desc); }

	this.sid = sid;
	this.name = name;
	this.desc = desc;
    this.index = 0;
}

Server.prototype.toString = function ()
{
	return this.name;
}
