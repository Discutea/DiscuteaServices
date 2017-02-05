exports.Ircd= Ircd;

var events = require('events');
var user = require('../user');
var net  = require('net');
var tls  = require('tls');

function Ircd(cfg) {
    this.users = [];
    this.socket = this.connect(cfg.port, cfg.server);
    this.sid = cfg.sid;
    this.host = cfg.host;
    this.password = cfg.password;
    this.desc = cfg.desc;
    this.uptime = Math.floor(Date.now() / 1000);
    events.EventEmitter.call(this);
}

Ircd.prototype = Object.create(events.EventEmitter.prototype);

Ircd.prototype.connect = function (port, server) {
    var that = this;
    
    s = net.createConnection(port, server);
    s.on('connect', function () {
        s.write("CAPAB START 1202\r\n");
        s.write("CAPAB CAPABILITIES :PROTOCOL=1202\r\n");
        s.write("CAPAB END\r\n");
        that.sendServer();
    });
    
    return s;
}

Ircd.prototype.sendServer = function () {
    this.socket.write('SERVER ' + this.host + ' ' + this.password + ' 0 ' + this.sid + ' :' + this.desc +'\r\n');             
    this.socket.write(':'+this.sid+' BURST '+this.uptime +'\r\n');
    this.socket.write(':'+this.sid+' ENDBURST\r\n')

    var that = this;
       
    this.socket.addListener('data', function (data) { 
        args = data.toString().split(/\n|\r/);
        args.forEach(function(arg) {
            that.dispatcher(arg);
        });
    });

};  

Ircd.prototype.introduceBot = function (bot) {
    bot.setIrcd(this);
    this.socket.write(':'+this.sid+' UID '+this.sid+bot.uid + ' '+bot.uptime+' ' + bot.nick + ' node.discutea.com nodejjj.discutea.com Discutea 127.0.0.1 '+bot.uptime+' +IWBOiows +*:99 M Service\r\n');
    bot.join('#Node.Js');
}
    
Ircd.prototype.dispatcher = function (data) {
    splited = data.split(' ');
 //   console.log(data);
    
    switch (splited[1]) {
        case 'PING':
            this.socket.write(':' + this.sid + ' PONG ' + this.sid + ' ' + splited[2] + '\r\n');   
            this.emit('ping', data);
            break;
        case 'END':
            if (splited[0] == 'CAPAB') {
                this.emit('ircd_ready', data);
            }
            break;
        case 'ERROR':
            console.log(data);
            break;
        case 'UID':
            u = this.introduceUser(data, splited);
            this.emit('user_connect', u);
            break;
        case 'PRIVMSG':
            this.emit('privmsg', data);
            break;
        case 'QUIT':
            this.destroyUser(splited, data);
            break;
        default:
           // console.log(data);
            break;
    }
    
};    

Ircd.prototype.destroyUser = function (splited, data) {
            u = this.findUser(splited[0]);
            if ( u !== undefined) {
                uid = u.uid;
               reason = data.split(':')[2];
               this.emit('user_disconnect', u.nick, reason, data);
               delete u;
               delete this.users[uid];
               console.log(uid);
               console.log('U ' + u);
               console.log('THIS ' + this.users[uid]);
            } else {
                return false;
            }
            
            
    
            
}

Ircd.prototype.introduceUser = function (data, splited) {
    realname = data.split(':')[2];
    
    var u = new user();
    u.uid = splited[2];
    u.time = parseInt(splited[3]);
    u.nick = splited[4];
    u.host = splited[5];
    u.vhost = splited[6];
    u.ident = splited[7];
    u.ip = splited[8];
  //  console.log('mode => ' + splited[10]);
    u.realname = realname;
    
    uid = splited[2];
    
    if ( this.users[uid] !== undefined) {
        delete this.users[uid];
    }
    
    this.users[u.uid] = u;
    
    return u;

}

Ircd.prototype.findUser = function (uid)
{
    if (uid.charAt(0) == ":") {
        uid = uid.substring(1);
    }
    
    return this.users[uid];
};

/*
    client.addListener('close', function (data) {
        // Disconnected from server
    });
    
    this.client = client;
};




Ircd.prototype.findUser = function (nick)
{
    for (i in this.users)
    {
        if (this.users[i].nick == nick)
        {
            return this.users[i];
        }
    }
};
*/
