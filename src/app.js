var config = require('../conf/config');
var protocol = require("./protocol/"+config.link.protocol);
var bot = require('./bot');


var ircd = new protocol.Ircd(config.link);


ircd.socket.on('connect', function () {

  //  ircd.sendServer();

   
    ircd.on('ircd_ready', function () {
        console.log('bot introduce');
        ircd.introduceBot( new bot.Bot( 'AAAAAA', 'jjj', 'NodeJs' ) );
        ircd.introduceBot( new bot.Bot( 'BBBBBB', 'jjj', 'NodeJs2' ) );
        ircd.introduceBot( new bot.Bot( 'CCCCCC', 'jjj', 'NodeJs3' ) );
    });
   
});

