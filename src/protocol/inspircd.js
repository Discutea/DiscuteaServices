exports.ircClient = ircClient;

var config = require('../../conf/config');
var net  = require('net');
var events = require('events');
var user = require('../user');

function ircClient() {
    this.users = [];
    this.server = config.server;
    this.port = config.port;
    this.sid = config.sid;
    this.host = config.host;
    this.password = config.password;
    this.desc = config.desc;
    events.EventEmitter.call(this);
    return this;
}

ircClient.prototype = Object.create(events.EventEmitter.prototype);

ircClient.prototype.connect = function () {
    var that = this,
        client = net.createConnection(that.port, that.server);

    client.addListener('connect', function () {
        timestamp = Math.floor(Date.now() / 1000);
        client.write("CAPAB START 1202\r\n");
        client.write("CAPAB CAPABILITIES :PROTOCOL=1202\r\n");
        client.write("CAPAB END\r\n");
        client.write('SERVER ' + that.host + ' ' + that.password + ' 0 ' + that.sid + ' :' + that.desc +'\r\n');             
        client.write(':'+that.sid+' BURST '+timestamp +'\r\n');
        client.write(':'+that.sid+' ENDBURST\r\n')
        client.write(':'+that.sid+' UID '+that.sid+'AAAAAA '+timestamp+' NodeJs node.discutea.com node.discutea.com Discutea 127.0.0.1 '+timestamp+' +IWBOiows +*:99 M Service\r\n');
        client.write(':'+that.sid+'AAAAAA JOIN #Node.Js\r\n'); 
    });

    client.addListener('data', function (data) { 
        args = data.toString().split(/\n|\r/);
        args.forEach(function(arg) {
            that.dispatcher(arg);
        });
    });

    client.addListener('close', function (data) {
        // Disconnected from server
    });
    
    this.client = client;
};

ircClient.prototype.introduceUser = function (data, splited) {
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
    
    this.users.push(u);
    
    return u;

}

ircClient.prototype.dispatcher = function (data) {
    splited = data.split(' ');

    switch (splited[1]) {
        case 'PING':
            this.client.write(':' + this.sid + ' PONG ' + this.sid + ' ' + splited[2] + '\r\n');   
            this.emit('ping', data);
            break;
        case 'ERROR':
            console.log(data);
            break;
        case 'UID':
            u = this.introduceUser(data, splited);
            this.emit('user_connect', u);
            break;
        default:
           // console.log(data);
            break;
    }
    
};
