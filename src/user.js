exports = module.exports = User;

function User()
{
	if (!(this instanceof User)) { return new User(); }

	this.uid = undefined;
    this.time = undefined;
	this.nick = undefined;
	this.host = undefined;
	this.vhost = undefined;
	this.ident = undefined;
    this.ip = undefined;
    this.mode = [];
	this.realname = undefined;
}

User.prototype.toString = function ()
{
	return "User(" + this.nick + ")";
}
/*
User.prototype.__defineGetter__("uid", function ()
{
	return this.uid;
});

User.prototype.__defineGetter__("time", function ()
{
	return this.time;
});

User.prototype.__defineGetter__("nick", function ()
{
	return this.nick;
});

User.prototype.__defineGetter__("host", function ()
{
	return this.host;
});

User.prototype.__defineGetter__("vhost", function ()
{
	return this.vhost;
});

User.prototype.__defineGetter__("ident", function ()
{
	return this.ident;
});

User.prototype.__defineGetter__("ip", function ()
{
	return this.ip;
});

User.prototype.__defineGetter__("realname", function ()
{
	return this.realname;
});
*/