exports.ircClient = ircClient;

var config = require('../../conf/config');
var net  = require('net');
var events = require('events');

function ircClient() {
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
        client.write(':'+that.sid+'AAAAAA JOIN #equipe\r\n'); 
    });

    client.addListener('data', function (data) { 
        args = data.toString().split('\n');
        args.forEach(function(arg) {
            that.dispatcher(arg);
        });
    });

    client.addListener('close', function (data) {
        // Disconnected from server
    });
    
    this.client = client;
};

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
        default:
          //  console.log(data);
            break;
    }
};
