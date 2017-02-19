var config = require('../conf/config');

switch (config.link.protocol) {
    case 'inspircd':
        var protocol = require("./protocol/insp/inspircd");
        break;
    case 'unrealircd':
        var protocol = require("./protocol/unreal/unrealircd");
        break;
    default:
        console.log('We do not know the protocol ' + config.link.protocol);
}

var Finder = require('fs-finder'),
    fs = require('fs'),
    socket = require('./socket'),
    bot = require('./bot');

const EventEmitter = require('events');
class Emitter extends EventEmitter {}
const emitter = new Emitter();


var s = new socket.Socket(config.link.server, config.link.port, config.link.ssl);

s.conn.once('connect', function () {

    var ircd = new protocol.Ircd(s, emitter, config);
    
    ircd.emitter.once('ircd_ready', function () {
        mods = config.modules.loader;
        mods.forEach(function(moduleName) {
            path = __dirname + '/../modules/' + moduleName;
            var files = Finder.from(path).findFiles('*Bundle.js');
            if (files.length === 1) {
                modconf = config.modules.config[moduleName];
                if (modconf.bot) {
                    b = new bot( modconf.bot );
                    ircd.introduceBot( b );
                }
                mod = require(files[0]);
                m = new mod(ircd, modconf, b);
                m.init();
            }
        });        
    });
});

process.on('SIGUSR1', function() {
    ircd.cfg = undefined;
    ircd.cfg = require('../conf/config');
});

process.on('SIGUSR2', function() {
    var tmp = __dirname + '/../tmp/tmp.txt';
    if (fs.existsSync(tmp)) {
        fs.readFile(tmp, 'utf8', function (err,data) {
            if (!err) {
                if ( (typeof data === 'string') && (data.length > 10) ) {
                    s.write(':'+config.link.sid+' PRIVMSG ' + data);
                };
            } else {
                console.log(err);
            }
            fs.unlinkSync(tmp);
        });
    };
});

