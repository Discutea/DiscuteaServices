exports.Ircd= Ircd;

var protocol = require('../protocol');
var channel = require('../../channel');
var user = require('../../user');
var server = require('../../server');
var bot = require('../../bot');
var filter = require('../../filter');

function Ircd(sock, emitter, cfg) {
    var that = this;
    protocol.Protocol.call(this, sock, emitter, cfg);
    that.run();
}

Ircd.prototype = Object.create(protocol.Protocol.prototype);

Ircd.prototype.run = function () {
    var that = this;
//		putdcc $lea(idx) ":$lea(link) SQLINE $lea(pseudo) :$lea(info)"
//		putdcc $lea(idx) ":$lea(link) NICK $lea(pseudo) 1 [unixtime] $lea(ident) $lea(host) $lea(link) 0 +oqS $lea(host) :$lea(real)"
//		putdcc $lea(idx) ":$lea(link) EOS"
//		putdcc $lea(idx) ":$lea(pseudo) JOIN $lea(salon)"
//		putdcc $lea(idx) ":[lea:umode] MODE $lea(salon) +$lea(smode)"
    
    that.sock.write("PROTOCTL NICKv2 SJOIN2 UMODE2 NOQUIT VL TKLEXT");
    that.sock.write("PASS", this.password);
    that.sock.write("SERVER", this.host, 1, ":" + this.desc);


    that.sock.conn.on('data', function (data) {
        args = data.toString().split(/\n|\r/);
        args.forEach(function(arg) {
            that.dispatcher(arg);
        });
    });
   
}

Ircd.prototype.dispatcher = function (data) {
    console.log(data);
    splited = data.split(' ');
    splited2 = data.split(':');
    switch (splited[1]) {
        case 'PING':
    //    putdcc $lea(idx) "PONG [lindex $arg 1]"
            this.send('PONG', splited2[1]);
            this.emitter.emit('ping', data);
            break;
        case 'EOS':
        console.log('ready');
          //  this.emitter.emit('ircd_ready', data);
            break;
        case 'ERROR':
            this.emitter.emit('error', data);
            console.log(data);
            break;
        default:
           // console.log(data);
            break;
    }    
};

Ircd.prototype.introduceBot = function (b) {
    if (b instanceof bot) {
        b.setIrcd(this);
        this.send('UID', b.me, b.uptime, b.nick, this.host, b.vhost, b.ident, b.ip, b.uptime, b.modes, ':' + b.realname);
    }
}

Ircd.prototype.send = function() {
    var args = Array.prototype.slice.call(arguments);
 //   args.splice(0, 0, ':' + this.sid);
    args.splice(0, 0, + this.host);
    console.log(args);
    this.sock.write(args);
};