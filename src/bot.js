exports = module.exports = Bot;

var ip = require("ip");
var config = require('../conf/config');

function Bot(uid, vhost, nick, ident, modes, realname)
{
    if (!(this instanceof Bot)) { return new Bot(uid, vhost, nick, ident, modes, realname); }
    
    this.ip = ip.address();
    this.ident = ident;
    this.realname = realname;
    this.ircd = undefined;
    this.uid = uid;
    this.vhost = vhost;
    this.nick = nick;
    if (config.link.protocol === 'inspircd') {
        this.modes = modes;
    } else {
        this.modes = modes.split(' ')[0];
    }
    
    
    this.me = undefined;
    this.uptime = Math.floor(Date.now() / 1000);
    this.protocol = config.link.protocol;
};

Bot.prototype.setIrcd = function (ircd) {
    this.ircd = ircd;
    this.me = ircd.sid + this.uid;
};

Bot.prototype.send = function(command) {
    var args = Array.prototype.slice.call(arguments);
    if (this.protocol === 'inspircd') {
        args.splice(0, 0, ':' + this.me);
    } else {
        args.splice(0, 0, ':' + this.nick);
    }

    if (args[args.length - 1].match(/\s/) || args[args.length - 1].match(/^:/) || args[args.length - 1] === '') {
        args[args.length - 1] = ':' + args[args.length - 1];
    }

    this.ircd.sock.conn.write(args.join(' ') + '\r\n');
    };

Bot.prototype.join = function(channel) {
    this.send('JOIN', channel);
};

Bot.prototype.msg = function(target, message) {
    this.send('PRIVMSG', target, message);
};

Bot.prototype.notice = function(target, message) {
    this.send('NOTICE', target, message);
};

Bot.prototype.kline = function(target, duration, reason) {
    time = Math.floor(Date.now() / 1000);
    this.send('ADDLINE', 'K', target, this.nick, time, duration, reason);
};
