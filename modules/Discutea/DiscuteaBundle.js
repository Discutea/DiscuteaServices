var bobot = require('../../src/bot');
var user = require('../../src/user');

function Discutea(ircd, conf) {
    this.ircd = ircd;
    this.conf = conf;
    this.bot = undefined;
    this.channel = '#Node.Js';
};

Discutea.prototype.init = function() {
    
    var mychan = this.conf.channel;
    var botconf = this.conf.bot;
    
    var bot = new bobot( botconf.uid, botconf.vhost, botconf.nick, botconf.ident, botconf.modes, botconf.realname );
    this.ircd.introduceBot( bot );
    bot.join(mychan);
    this.bot = bot;

};

module.exports = Discutea;
