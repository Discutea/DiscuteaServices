var config = require('../conf/config');
var protocol = require("./protocol/"+config.link.protocol);
var Finder = require('fs-finder');


var ircd = new protocol.Ircd(config.link);
ircd.socket.on('connect', function () {
    ircd.on('ircd_ready', function () {
        mods = config.modules.loader;
        mods.forEach(function(moduleName) {
            path = __dirname + '/../modules/' + moduleName;
            var files = Finder.from(path).findFiles('*Bundle.js');
            if (files.length === 1) {
                mod = require(files[0]);
                m = new mod(ircd);
                m.init();
            }
        });
    });
});

