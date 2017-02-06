var bobot = require('../../src/bot');

function Logger(ircd) {
    this.ircd = ircd;
};

Logger.prototype.init = function() {
   var bot = new bobot.Bot( 'AAAAAA', 'jjj', 'Logger' );
   this.ircd.introduceBot( bot );
   bot.join('#Node.Js');
};

module.exports = Logger;
