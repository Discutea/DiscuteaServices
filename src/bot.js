exports.Bot = Bot;
var ip = require("ip");

function Bot(uid, vhost, nick, ident, modes, realname)
{
    this.ip = ip.address();
    this.ident = ident;
    this.realname = realname;
    this.ircd = undefined;
    this.uid = uid;
    this.vhost = vhost;
    this.nick = nick;
    this.modes = modes;
    this.me = undefined;
    this.uptime = Math.floor(Date.now() / 1000);
};

Bot.prototype.setIrcd = function (ircd) {
    this.ircd = ircd;
    this.me = ircd.sid + this.uid;
};

Bot.prototype.send = function(command) {
    var args = Array.prototype.slice.call(arguments);
    args.splice(0, 0, ':' + this.me);

    if (args[args.length - 1].match(/\s/) || args[args.length - 1].match(/^:/) || args[args.length - 1] === '') {
        args[args.length - 1] = ':' + args[args.length - 1];
    }

    this.ircd.socket.write(args.join(' ') + '\r\n');
};

Bot.prototype.join = function(channel) {
    this.send('JOIN', channel);
};

Bot.prototype.msg = function(target, message) {
    this.send('PRIVMSG', target, message);
};