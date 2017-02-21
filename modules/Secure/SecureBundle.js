var robot = require('../../src/bot');
var user = require('../../src/user');
var request = require('request');

function Secure(ircd, conf, bot, sql) {
    if (!(bot instanceof robot)) {return;}
    
    this.ircd = ircd;
    this.conf = conf;
    this.bot = bot;
    this.sql = sql;
    this.channel = conf.channel;
};

Secure.prototype.init = function() {
    var that = this;
    this.bot.join(this.channel);
    this.bot.send('MODE', this.channel, '+h', this.bot.nick, ':');

    this.ircd.emitter.on('kick'+that.bot.me+'', function (splited, data) {
        that.bot.join(splited[2]);
    });
    
    this.ircd.emitter.on('notice'+this.bot.me+'', function (u, splited, splited2, data) {
        if (splited[3].substring(1,10) === '\1VERSION') {
            version = splited.slice(4, splited.length).join(' ');
            version = version.substring(0, version.length - 1);
            u.version = version;
            that.bot.msg(that.channel, '\00304(Version)\00314 ' + u.nick + ' :' + version + '\003');
        }
    });
    // END OF CTCP VERSION
    
    this.ircd.emitter.on('user_has_geoinfos', function (u) {
        that.checkBadGeoode(u);    
    });
    
    this.ircd.emitter.on('user_introduce', function (u) {
        if (that.conf.ctcpversion) {
            that.bot.msg(u.nick, '\1VERSION\1');
        }

        that.sql.execute('SELECT ip FROM `proxies` WHERE ip = ?', [u.ip] , function (err, results) {
            if ( (results) && (results.length > 0) )  {
                console.log(results);
                that.bot.msg(that.channel, '\00304(\002Proxy\002)\00314 ' + u.nick + ' matché dans la base de discutea ' + u.ip + '\003 ');
                that.bot.gline('*@' + u.host, 36000, 'Votre adresse ip est listé sur la blackliste de discutea.');
                return;
            }
        });
        
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
