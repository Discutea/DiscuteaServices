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
    switch (splited[0]) {
        case 'PING':
            this.sock.write('PONG ' + splited[1]);
            this.emitter.emit('ping', data);
            break;
    }
    
    switch (splited[1]) {
        case 'EOS':
            this.emitter.emit('ircd_ready', data);
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
        this.send('SQLINE', b.nick, ':' + this.desc);
        this.send('NICK', b.nick, 1, b.uptime, b.ident, b.vhost, this.host, 0, b.modes, b.ip, ':' + b.realname);
        this.send('EOS');
    }
}

Ircd.prototype.send = function() {
    var args = Array.prototype.slice.call(arguments);
 //   args.splice(0, 0, ':' + this.sid);
    args.splice(0, 0, ':' + this.host);
    console.log(args);
    this.sock.write(args);
};