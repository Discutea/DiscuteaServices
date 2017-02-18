var bobot = require('../../src/bot');
var user = require('../../src/user');
var mysql = require('mysql2');

function Badserv(ircd, conf) {
    this.ircd = ircd;
    this.conf = conf;
    this.bot = undefined;
    this.channel = '#Opers';
    this.sql = mysql.createConnection(conf.sql);
    this.badnicks = [];
};

Badserv.prototype.init = function() {
    var botconf = this.conf.bot;
    var bot = new bobot( botconf.uid, botconf.vhost, botconf.nick, botconf.ident, botconf.modes, botconf.realname );
    this.ircd.introduceBot( bot );
    bot.join('#Opers');
    bot.send('MODE', this.channel, '+h', bot.nick, ':');
    this.bot = bot;
    this.updateBadnicks();
    var that = this;

    this.ircd.emitter.on('privmsg'+bot.me+'', function (u, splited, splited2, data) {
        if (!(u instanceof user)) {return;}
    
        if (!u.isModerator()) {
            that.bot.notice(u.nick, '\00304Permission denied!');
            return;
        }
        
        req = splited[3];
        if ( (typeof req === 'string') && (req.charAt(0) == ":") ) {
            req = req.substring(1);
        }
        data = splited.slice(4,splited.length);
        switch (req.toUpperCase()) {
          case 'BADNICK':
            that.cmdBadNick(u, data);
            break;
          case 'BADNICKLIST':
            that.cmdBadNickList(u);
            break;
        }
    });

    this.ircd.emitter.on('user_nick', function (u, last) {
        that.verifyBadnick(u);
    });
    this.ircd.emitter.on('user_introduce', function (u) {
        that.verifyBadnick(u);
    });
    
    setInterval(function() { // check auto unban
        that.updateBadnicks();
    }, 3 * 60000);
};

Badserv.prototype.updateBadnicks = function() {
    var that = this;
    that.badnicks = [];
    that.sql.query('SELECT nick, addby FROM `anope_badnick` WHERE 1', function (err, results) {
        if (err) { console.log(err); }
        results.forEach(function(res) {
            that.pushBadnick(res.nick, res.addby);
        });
    });
}

Badserv.prototype.verifyBadnick = function(u) {
    if (!(u instanceof user)) {return;}

    isBad = this.isBadnick(u.nick);
    if ( isBad !== false) {
        rand = Math.floor(Date.now() / 1000).toString().substring(4);
        newnick = 'Pseudo_' + rand;
        this.bot.send('SANICK', u.nick, newnick, ':');
        this.bot.msg(this.channel, '\00304(BadNick)\003 \00314'+u.nick+' matché sur ' + isBad.origin + ' changé en ' + newnick);
        this.bot.msg('#Equipe', '\00304(BadNick)\003 \00314'+u.nick+' matché sur ' + isBad.origin + ' (' + isBad.addby + ') changé en ' + newnick);
    } else if (this.verifyCaps(u.nick)) {
        newnick = u.nick.toLowerCase();
        newnick = newnick.charAt(0).toUpperCase() + newnick.slice(1);
        this.bot.send('SANICK', u.nick, newnick, ':');
    }
}

Badserv.prototype.cmdBadNickList = function(u) {
    var that = this;
    i = 1;
    this.badnicks.forEach(function(badnick) {
        if (typeof badnick === 'object') {
            that.bot.msg(u.nick, '\00314['+i+'] \00302'+badnick.origin+' ajouté par: ' + badnick.addby);
            i++;
        }
    });
    that.bot.msg(u.nick, '***');
}

Badserv.prototype.cmdBadNick = function(u, data) {

    if ( (!data) || (!data[0]) ) {
        this.bot.notice(u.nick, '\00314[BADNICK] \00302Change un pseudo incorrect et l\'enregistre dans la base de donnée.');
        this.bot.notice(u.nick, '\00314[UTILISATION] \00302!inco pseudo ou !badnick pseudo');
        return;
    }
    
    target = this.ircd.findBy(this.ircd.users, 'nick', data[0]);
    if (!(target instanceof user)) {
        this.bot.notice(u.nick, '\00304 Désolé je ne trouve pas ' + data[0]);
        return;
    }

    rand = Math.floor(Date.now() / 1000).toString().substring(4);
    newnick = 'Pseudo_' + rand;
    this.insertBadnick(target.nick, u.account);
    this.bot.send('SANICK', target.nick, newnick, ':');
    this.bot.msg('#Equipe', '\00304(BadNick)\003 \00314'+u.nick+' change ' + target.nick + ' en ' + newnick);
}

Badserv.prototype.insertBadnick = function(nick, addby) {
    var that = this;
    if (this.isBadnick(nick) !== false) {
        return false;
    }
    
    this.sql.execute('INSERT INTO `anope_badnick` (nick, addby) VALUES (?,?)', [nick, addby], function (err, results, fields) {
        if (err) {
            return false;
        } else {
            that.pushBadnick(nick, addby);
        }
    });
    
    return true;
}

Badserv.prototype.pushBadnick = function(nick, addby) {
    if ( (typeof nick !== 'string') || (typeof addby !== 'string') ) {return;}
    bad = nick.replace(/\*/g, '\\\w*');
    regex = new RegExp(bad, 'gi');
    this.badnicks.push( {regex: regex, origin: nick, addby: addby} );
}

Badserv.prototype.verifyCaps = function(nick) {
    
    if (typeof nick === 'string') {
      if (nick === nick.toUpperCase()) {
        return true;
      }
    }
    
    return false;
}

Badserv.prototype.isBadnick = function(nick) {
    matched = false;
    
    if (typeof nick === 'string') {
      this.badnicks.forEach(function(badnick) {
        if (nick.match(badnick.regex)) {
          matched = badnick;
          return;
        }
      });
    }

    return matched;
}

module.exports = Badserv;
