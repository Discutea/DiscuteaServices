var config = require('../conf/config');
var protocol = require("./protocol/"+config.link.protocol);
var Finder = require('fs-finder');

var ircd = new protocol.Ircd(config.link);
ircd.socket.on('connect', function () {
    ircd.on('ircd_ready', function () {
        modules = config.modules.loader;
        modules.forEach(function(moduleName) {
            var files = Finder.from('./modules/' + moduleName).findFiles('*Bundle.js');
            if (files.length === 1) {
                moduleFile = moduleName + '/' + moduleName + 'Bundle';
                mod = require('../modules/' + moduleFile);
                m = new mod(ircd);
                m.init();
            }  
        });
    });
});

