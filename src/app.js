var config = require('../conf/config');
var protocol = require("./protocol/"+config.link.protocol);
var Finder = require('fs-finder');
var fs = require('fs');
var socket = require('./socket');

var s = new socket.Socket(config.link.server, config.link.port, config.link.ssl);

s.conn.once('connect', function () {

    var ircd = new protocol.Ircd(s, config);
    
    ircd.once('ircd_ready', function () {
        mods = config.modules.loader;
        mods.forEach(function(moduleName) {
            path = __dirname + '/../modules/' + moduleName;
            var files = Finder.from(path).findFiles('*Bundle.js');
            if (files.length === 1) {
                modconf = config.modules.config[moduleName];
                mod = require(files[0]);
                m = new mod(ircd, modconf);
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
    var tmp = __dirname + '/../tmp.txt';

    if (fs.existsSync(tmp)) {
        fs.readFile(tmp, 'utf8', function (err,data) {
            if (!err) {
                if ( (typeof data === 'string') && (data.length > 10) ) {
                    ircd.sock.write(':'+config.link.sid+' PRIVMSG ' + data);
                };
            };
            fs.unlinkSync(tmp);
        });
    };
});
