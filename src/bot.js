exports.Bot = Bot;

function Bot(uid, host, nick)
{
    this.ircd = undefined;
	this.uid = uid;
    this.host = host;
	this.nick = nick;
    this.me = undefined;
    
    timestamp = Math.floor(Date.now() / 1000);
        
    this.uptime = timestamp;
}


Bot.prototype.setIrcd = function (ircd) {
    this.ircd = ircd;
    this.me = ircd.sid + this.uid;
    
}


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
}

    