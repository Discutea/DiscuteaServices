exports = module.exports = Server;

function Server()
{
	if (!(this instanceof Server)) { return new Server(); }

	this.sid = undefined;
	this.name = undefined;
	this.desc = undefined;
}

Server.prototype.toString = function ()
{
	return this.name;
}
