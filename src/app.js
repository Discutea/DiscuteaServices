var config = require('../conf/config');
var protocol = require("./protocol/"+config.link.protocol);
var bot = require('./bot');

var ircd = new protocol.Ircd(config.link);

ircd.socket.on('connect', function () {
    ircd.on('ircd_ready', function () {
        var nodeBot = new bot.Bot( 'AAAAAA', 'jjj', 'NodeJs' );
        ircd.introduceBot( nodeBot );
        nodeBot.join('#Node.Js');
    });
});
