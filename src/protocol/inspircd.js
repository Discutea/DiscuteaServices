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
            client.write(':'+that.sid+'AAAAAA JOIN #test\r\n'); 
          //  client.write(':'+that.sid+'AAAAAA JOIN #equipe\r\n'); 
           // client.write(':'+config.sid+'AAAAAA PRIVMSG #equipe :Salut Moderateur je suis ton futur remplacant je vais te tartiner la ganache ahah\r\n'); 
           // client.write(':'+config.sid+'AAAAAA PRIVMSG #equipe :Mon patron me concoit actuellement grace au puissant Framework NodeJs Ton TCl etant bon a metre a la poubelle.\r\n');
          //  client.write(':'+config.sid+'AAAAAA PRIVMSG #equipe :Pour le moment je sers a rien mon concepteur veut voir si je sais répondre au ping et si mon deamon me lance bien.\r\n');   
        });

        client.addListener('data', function (data) {            
            that.dispatcher(data.toString());
        });

        client.addListener('close', function (data) {
            // Disconnected from server
        });
 
        this.client = client;
    };

    // FORMALITY HANDLERS

    ircClient.prototype.dispatcher = function (data) {
        var response = data.split('\n'),
            formatResponse,
            preparedResponse,
            sortedResponse,
            i;
            
            args = response[0].split(" ");
            
            if (args[1] == "PING")
            {
                console.log(data);
                console.log(':' + this.sid + ' PONG ' + this.sid + ' ' + args[2] + '\r\n');
                this.client.write(':' + this.sid + ' PONG ' + this.sid + ' ' + args[2] + '\r\n');
                    
            }
            
        this.emit('rawReceive', data);

    };

