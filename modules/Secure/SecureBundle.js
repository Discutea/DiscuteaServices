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
    

    this.ircd.emitter.on('notice'+bot.me+'', function (u, splited, splited2, data) {
        if (splited[3].substring(1,10) === '\1VERSION') {
            version = splited.slice(4, splited.length).join(' ');
            version = version.substring(0, version.length - 1);
            u.version = version;
            bot.msg(mychan, '\00304(Version)\00314 ' + u.nick + ' :' + version + '\003');
        }
    });
    // END OF CTCP VERSION
    
    this.ircd.emitter.on('user_has_geoinfos', function (u) {
        that.checkBadGeoode(u);    
    });
    
    this.ircd.emitter.on('user_introduce', function (u) {
        if (that.conf.ctcpversion) {
            that.bot.msg(u.nick, '\1VERSION\1');
            if (that.conf.bannoctcpreply) {
                setTimeout(function() { 
                    that.getIfVersion(u.nick);
                }, 4000);
            }
        }
        
        if (!that.conf.stopforumspam) {return;}
        
        request('https://api.stopforumspam.org/api?f=json&ip=' + u.ip, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var info = JSON.parse(body);
                if (info.ip.appears) {
                    that.bot.gline('*@' + u.host, 1800, 'Votre adresse ip est listé sur StopForumSpam.');
                }
            }
        });
    });
};

Secure.prototype.getIfVersion = function(nick) {
    u = this.ircd.findBy(this.ircd.users, 'nick', nick);
    if ( (u instanceof user) && (!u.version) && (!u.account) ) {
        this.bot.gline('*@' + u.host, 1800, 'Votre client IRC ne répond pas à nos demandes de CTCP version merci de le configurer correctement.');
        this.bot.msg(this.channel, '\00304(\002NoReply\002)\00314 ' + u.nick + ' no CTCP version'); 
    }
}

Secure.prototype.checkBadGeoode = function(u) {
    global = this.conf.badgeocode.global;
    
    if ( (typeof global.target === 'object') && (global.target.indexOf(u.country) >= 0) )  {
        if ( (u.country === 'DE') && (u.host.match(/\*dyn\.telefonica\.de/g)) ) {return;}
        
        this.bot.msg(this.channel, '\00304(\002BadGeocode\002)\00314 ' + u.nick + ' matched in global config ' + u.country + '\003 ');
        this.bot.gline('*@' + u.host, 900,  control.reason);
    }
    
    if ( (!u.server) || (!u.server.name) )  {return;}
    userv = u.server.name;

    if (typeof this.conf.badgeocode.byservers[userv] === 'object') {
        control = this.conf.badgeocode.byservers[userv];
    
        if ( (typeof control.target === 'object') && (control.target.indexOf(u.country) >= 0) )  {
            this.bot.msg(this.channel, '\00304(\002BadGeocode\002)\00314 ' + u.nick + ' matched in ' + userv + ' config ' + u.country + '\003 ');
            this.bot.gline('*@' + u.host, 900, control.reason);
        }
    }
}

module.exports = Secure;
