exports.Ircd= Ircd;

var protocol = require('./protocol');
var channel = require('../channel');

function Ircd(cfg) {
    var that = this;
    protocol.Protocol.call(this, cfg);
    this.socket.on('connect', function () {
        that.run();
    });
}

Ircd.prototype = Object.create(protocol.Protocol.prototype);

Ircd.prototype.run = function () {
    var that = this;
    that.write("CAPAB START 1202");
    that.write("CAPAB CAPABILITIES :PROTOCOL=1202");
    that.write("CAPAB END");
    that.write('SERVER', this.host, this.password, '0', this.sid, ':' + this.desc);
    that.send('BURST', this.uptime);
    that.send('ENDBURST');

    that.socket.on('data', function (data) {
        args = data.toString().split(/\n|\r/);
        args.forEach(function(arg) {
            that.dispatcher(arg);
        });
    });
}

Ircd.prototype.dispatcher = function (data) {
    splited = data.split(' ');
    splited2 = data.split(':');
 //   console.log(data);
    switch (splited[1]) {
        case 'PING':
            this.send('PONG', this.sid, splited[2]);
            this.emit('ping', data);
            break;
        case 'END':
            if (splited[0] == 'CAPAB') {
                this.emit('ircd_ready', data);
            }
            break;
        case 'ERROR':
            this.emit('error', data);
            console.log(data);
            break;
        case 'UID':
            u = this.introduceUser(data, splited);
            this.emit('user_introduce', u);
            break;
        case 'PRIVMSG':
            this.emit('privmsg', data);
            break;
        case 'QUIT':
            this.destroyUser(splited, data);
            break;
        case 'SERVER':
            s = this.introduceServer(data, splited);
            this.emit('server_introduce', s);
            break;
        case 'FJOIN':
            c = this.findChannel(splited[2]);
            if (!c) {
                c = this.introduceChannel(data, splited, splited2);
                this.emit('channel_introduce', c);
            }
            cusers = splited2[2].split(',');
            c.addUsers(cusers);
            break;
        case 'AWAY':
            u = this.findUser(splited[0]);
            if (!u) {break;}
            u.away = splited2[2];
            if (splited2[2] === undefined) {
                this.emit('user_away_off', u);
            } else {
                this.emit('user_away_on', u, splited2[2]);
            }
            break;
        case 'TOPIC':
            u = this.findUser(splited[0]);
            c = this.findChannel(splited[2]);
            if ((!u) || (!c)) {break;}
            lastTopic = c.topic;
            c.topic = splited2[2];
            this.emit('channel_chg_topic', c, u, lastTopic);
            break;
        case 'NICK':
            u = this.findUser(splited[0]);
            if (!u) {break;}
            lastnick = u.nick;
            u.lastnicks.push(lastnick);
            u.nick = splited[2];
            this.emit('user_nick', u, lastnick);
            break;
        case 'PART':
            u = this.findUser(splited[0]);
            c = this.findChannel(splited[2]);
            if ((!u) || (!c)) {break;}
            u.removeChannel(c);
            this.emit('user_part', u, c);
            if (c.getUsers().length <= 0)
            {
                this.destroyChannel(c);
                this.emit('channel_destroy', c.name);
            }
            break;
        default:
           // console.log(data);
            break;
    }
    
};

Ircd.prototype.introduceBot = function (bot) {
    bot.setIrcd(this);
    console.log(bot.modes);
    this.send('UID', bot.me, bot.uptime, bot.nick, this.host, bot.vhost, bot.ident, bot.ip, bot.uptime, bot.modes, ':' + bot.realname);
}

Ircd.prototype.send = function() {
    var args = Array.prototype.slice.call(arguments);
    args.splice(0, 0, ':' + this.sid);
    this.write(args);
};
