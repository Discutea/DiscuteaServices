var bobot = require('../../src/bot');
var user = require('../../src/user');
var request = require('request');

function Secure(ircd, conf) {
    this.ircd = ircd;
    this.conf = conf;
    this.bot = undefined;
    this.channel = '#Node.Js';
};

Secure.prototype.init = function() {
    
    var mychan = this.conf.channel;
    var botconf = this.conf.bot;

    var bot = new bobot( botconf.uid, botconf.vhost, botconf.nick, botconf.ident, botconf.modes, botconf.realname );
    this.ircd.introduceBot( bot );
    bot.join(mychan);
    this.bot = bot;

    var that = this;
    this.ircd.emitter.on('user_has_geoinfos', function (u) {
        that.checkBadGeoode(u);    
    });
    
    this.ircd.emitter.on('user_introduce', function (u) {
        request('https://api.stopforumspam.org/api?f=json&ip=' + u.ip, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var info = JSON.parse(body);
                if (info.ip.appears) {
                    that.bot.kline('*@' + u.host, 900, 'Vôtre adresse ip est listé sur StopForumSpam.');
                }
            }
        });
    });
};

Secure.prototype.checkBadGeoode = function(u) {
    global = this.conf.badgeocode.global;
    
    if ( (typeof global.target === 'object') && (global.target.indexOf(u.country) >= 0) )  {
        this.bot.msg(this.channel, '\00304(\002BadGeocode\002)\00314 ' + u.nick + ' matched in global config ' + u.country + '\003 ');
        this.bot.kline('*@' + u.host, 900,  control.reason);
    }
    
    if ( (!u.server) || (!u.server.name) )  {return;}
    userv = u.server.name;

    if (typeof this.conf.badgeocode.byservers[userv] === 'object') {
        control = this.conf.badgeocode.byservers[userv];
    
        if ( (typeof control.target === 'object') && (control.target.indexOf(u.country) >= 0) )  {
            this.bot.msg(this.channel, '\00304(\002BadGeocode\002)\00314 ' + u.nick + ' matched in ' + userv + ' config ' + u.country + '\003 ');
            this.bot.kline('*@' + u.host, 900, control.reason);
        }
    }
}

module.exports = Secure;
